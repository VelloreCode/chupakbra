// Harness de desenvolvimento dos adapters.
//
//   npx tsx server/suppliers/cli.ts categorias tambasa
//   npx tsx server/suppliers/cli.ts listar tambasa material-de-construcao/carpintaria/fresas
//   npx tsx server/suppliers/cli.ts sync tambasa --dry-run
//
// `categorias` e `listar` NÃO tocam no banco — servem para validar login e
// parsing antes de qualquer escrita. `sync` roda o orquestrador de verdade
// (com --dry-run continua sem gravar).

import { getAdapter } from "./registry";
import { isSupplierKey, type SupplierKey } from "./types";
import { errorMessage } from "./util";

// `sync` é importado sob demanda: ele puxa storage → db, e exigir DATABASE_URL
// para apenas listar categorias tornaria o loop de dev bem mais chato.

function usage(): never {
  console.log(`
Uso:
  npx tsx server/suppliers/cli.ts categorias <tambasa|bartofil>
  npx tsx server/suppliers/cli.ts listar <tambasa|bartofil> <externalId> [--max-pages N] [--debug]
  npx tsx server/suppliers/cli.ts sync <tambasa|bartofil> [--dry-run] [--max-pages N]
`);
  process.exit(1);
}

function flagNumber(args: string[], name: string, fallback: number): number {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  const parsed = Number(args[index + 1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function main(): Promise<void> {
  const [command, supplierArg, ...rest] = process.argv.slice(2);
  if (!command || !supplierArg) usage();
  if (!isSupplierKey(supplierArg)) {
    console.error(`Fornecedor inválido: ${supplierArg}`);
    usage();
  }

  const supplier: SupplierKey = supplierArg;
  const maxPages = flagNumber(rest, "--max-pages", 1);

  if (command === "categorias") {
    const adapter = await getAdapter(supplier);
    try {
      const categories = await adapter.listCategories();
      console.log(`${categories.length} categoria(s) encontradas. Primeiras 30:\n`);
      for (const cat of categories.slice(0, 30)) {
        console.log(`  ${cat.externalId}  —  ${cat.label}`);
      }
    } finally {
      await adapter.close();
    }
    return;
  }

  if (command === "listar") {
    const externalId = rest[0];
    if (!externalId || externalId.startsWith("--")) usage();

    // --debug mostra todos os valores encontrados dentro do card. Serve para
    // flagrar limite de card errado: se um card lista o preço do vizinho, é
    // aqui que aparece.
    if (rest.includes("--debug")) process.env.SUPPLIER_DEBUG_CARDS = "1";

    const adapter = await getAdapter(supplier);
    try {
      let total = 0;
      let withPrice = 0;

      for await (const batch of adapter.iterateProducts(
        { externalId, label: externalId, parentExternalId: null },
        {
          maxPages,
          onPage: (page, count) => console.log(`\n--- página ${page}: ${count} item(ns) ---`),
          onError: (code, message) => console.warn(`[${code}] ${message}`),
        },
      )) {
        for (const item of batch) {
          total++;
          if (item.price !== null) withPrice++;
          if (total <= 15) {
            console.log(
              `  ${item.externalCode.padEnd(10)} ${
                item.price !== null ? `R$ ${item.price.toFixed(2)}`.padEnd(14) : "sem preço".padEnd(14)
              } ${item.name.slice(0, 70)}`,
            );
          }
        }
      }

      const pct = total > 0 ? Math.round((withPrice / total) * 100) : 0;
      console.log(`\nTotal: ${total} produto(s), ${withPrice} com preço (${pct}%).`);

      // Item sem preço é normal ("sob consulta"). O que denuncia sessão caída é
      // a categoria inteira vir sem preço.
      if (total > 0 && withPrice === 0) {
        console.warn(
          "AVISO: nenhum item veio com preço — provável sessão não autenticada.",
        );
      } else if (total > 0 && pct < 50) {
        console.warn(
          `AVISO: só ${pct}% dos itens têm preço — confira se é 'sob consulta' mesmo.`,
        );
      }
    } finally {
      await adapter.close();
    }
    return;
  }

  if (command === "sync") {
    const { runSupplierSync } = await import("./sync");
    const dryRun = rest.includes("--dry-run");
    const summaries = await runSupplierSync({
      suppliers: [supplier],
      dryRun,
      trigger: "manual",
      maxPagesPerCategory: flagNumber(rest, "--max-pages", 50),
    });
    console.log(`\n${JSON.stringify(summaries, null, 2)}`);
    return;
  }

  usage();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(`\nFalhou: ${errorMessage(error)}`);
    process.exit(1);
  });
