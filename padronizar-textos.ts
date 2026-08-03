// Padroniza marca e nome dos produtos já cadastrados.
//
//   npx tsx --env-file=.env padronizar-textos.ts            (simulação)
//   npx tsx --env-file=.env padronizar-textos.ts --aplicar  (grava)
//
// Usa as mesmas funções de shared/text-format.ts que os caminhos de escrita
// usam. Reimplementar as regras em SQL faria as duas versões divergirem na
// primeira mudança.

import { sql } from "drizzle-orm";
import { db } from "./server/db";
import { products } from "./shared/schema";
import { formatarMarca, formatarTextoLegivel } from "./shared/text-format";

const aplicar = process.argv.includes("--aplicar");

async function main() {
  const todos = await db
    .select({ id: products.id, name: products.name, manufacturer: products.manufacturer })
    .from(products);

  console.log(`${todos.length} produtos analisados${aplicar ? "" : " (SIMULAÇÃO — nada será gravado)"}\n`);

  const mudancas: Array<{ id: number; campo: string; de: string; para: string }> = [];

  for (const p of todos) {
    const marcaNova = p.manufacturer ? formatarMarca(p.manufacturer) : null;
    if (marcaNova && marcaNova !== p.manufacturer) {
      mudancas.push({ id: p.id, campo: "marca", de: p.manufacturer!, para: marcaNova });
    }

    const nomeNovo = formatarTextoLegivel(p.name);
    if (nomeNovo && nomeNovo !== p.name) {
      mudancas.push({ id: p.id, campo: "nome", de: p.name, para: nomeNovo });
    }
  }

  const porCampo = { marca: 0, nome: 0 };
  for (const m of mudancas) porCampo[m.campo as "marca" | "nome"]++;

  console.log(`alterações: ${porCampo.marca} marcas, ${porCampo.nome} nomes\n`);

  console.log("amostra (até 12):");
  for (const m of mudancas.slice(0, 12)) {
    console.log(`   [${m.campo}] "${m.de.slice(0, 45)}"`);
    console.log(`        -> "${m.para.slice(0, 45)}"`);
  }

  if (!aplicar) {
    console.log("\nRode com --aplicar para gravar.");
    process.exit(0);
  }

  // Agrupa por valor para reduzir o número de UPDATEs: "FOXLUX" -> "Foxlux"
  // afeta dezenas de linhas com a mesma transformação.
  let gravadas = 0;
  for (const m of mudancas) {
    const campo = m.campo === "marca" ? products.manufacturer : products.name;
    await db
      .update(products)
      .set({ [m.campo === "marca" ? "manufacturer" : "name"]: m.para, updatedAt: new Date() })
      .where(sql`${products.id} = ${m.id}`);
    gravadas++;
  }

  console.log(`\n${gravadas} alteração(ões) gravada(s).`);
  process.exit(0);
}

main().catch((e) => {
  console.error("falhou:", e);
  process.exit(1);
});
