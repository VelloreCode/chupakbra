// Audita os match_group existentes com o motor de correspondência.
//
//   npx tsx --env-file=.env auditar-matches.ts
//
// NÃO desfaz nada. Só relata quais grupos contêm pares que o motor reprova,
// para revisão humana — o pedido foi explicitamente manter os grupos atuais e
// apenas sinalizar os suspeitos.

import { sql } from "drizzle-orm";
import { db } from "./server/db";
import { products } from "./shared/schema";
import { pontuarMatch, type ProdutoParaMatch } from "./server/matching/score";

interface Linha extends ProdutoParaMatch {
  matchGroup: string | null;
  basePrice: string;
  clientId: number | null;
}

async function main() {
  const todos = (await db
    .select({
      id: products.id, name: products.name, manufacturer: products.manufacturer,
      ean: products.ean, sku: products.sku, brandSku: products.brandSku,
      matchGroup: products.matchGroup, basePrice: products.basePrice, clientId: products.clientId,
    })
    .from(products)
    .where(sql`${products.matchGroup} IS NOT NULL AND ${products.matchGroup} <> ''`)) as Linha[];

  const grupos = new Map<string, Linha[]>();
  for (const p of todos) {
    const g = p.matchGroup!;
    if (!grupos.has(g)) grupos.set(g, []);
    grupos.get(g)!.push(p);
  }

  console.log(`${grupos.size} grupos, ${todos.length} produtos\n`);

  // A distinção abaixo é o ponto central do relatório.
  //
  // Bloqueio técnico (potência 7W x 5W, dimensão 115cm x 120cm) é PROVA de que
  // o agrupamento está errado — são produtos comprovadamente diferentes.
  //
  // "Similaridade insuficiente" é outra coisa: significa que o motor não
  // conseguiu confirmar pelo texto. Pode ser agrupamento correto que o texto
  // não deixa provar, como pistolas de silicone de fabricantes distintos.
  // Tratar os dois como o mesmo problema inflaria o alarme.
  const contraditos: Array<{ grupo: string; n: number; qtd: number; total: number; exemplo: string }> = [];
  const naoConfirmados: Array<{ grupo: string; n: number; qtd: number; total: number }> = [];
  let paresOk = 0, paresBloqueio = 0, paresRevisar = 0, paresFracos = 0;

  for (const [grupo, itens] of grupos) {
    if (itens.length < 2) continue;
    let bloqueios = 0, fracos = 0, total = 0;
    let exemplo = "";

    for (let i = 0; i < itens.length; i++) {
      for (let j = i + 1; j < itens.length; j++) {
        const r = pontuarMatch(itens[i], itens[j]);
        total++;
        const temBloqueio = r.evidencia.bloqueios.length > 0 || r.motivo.includes("EAN diferente");

        if (r.decisao === "rejeitar" && temBloqueio) {
          bloqueios++; paresBloqueio++;
          if (!exemplo) exemplo = r.motivo.slice(0, 72);
        } else if (r.decisao === "rejeitar") {
          fracos++; paresFracos++;
        } else if (r.decisao === "revisar") paresRevisar++;
        else paresOk++;
      }
    }

    if (bloqueios > 0) contraditos.push({ grupo, n: itens.length, qtd: bloqueios, total, exemplo });
    else if (fracos > 0) naoConfirmados.push({ grupo, n: itens.length, qtd: fracos, total });
  }

  console.log("=== pares dentro dos grupos existentes ===");
  console.log(`   confirmados pelo motor:        ${paresOk}`);
  console.log(`   plausíveis (revisão):          ${paresRevisar}`);
  console.log(`   CONTRADITOS (atributo diverge): ${paresBloqueio}   <- provável erro`);
  console.log(`   não confirmados pelo texto:    ${paresFracos}   <- inconclusivo`);

  contraditos.sort((a, b) => b.qtd / b.total - a.qtd / a.total);

  console.log(`\n=== ${contraditos.length} grupos com PROVA de erro (atributo técnico divergente) ===\n`);
  for (const s of contraditos.slice(0, 15)) {
    const pct = Math.round((s.qtd / s.total) * 100);
    console.log(`   ${s.grupo.padEnd(14)} ${s.n} produtos | ${s.qtd}/${s.total} pares (${pct}%)`);
    console.log(`        ${s.exemplo}`);
  }

  console.log(`\n${naoConfirmados.length} grupos ficaram inconclusivos — o motor não contradiz, só não confirma.`);
  console.log("Nenhum grupo foi alterado.");
  process.exit(0);
}

main().catch((e) => {
  console.error("falhou:", e);
  process.exit(1);
});
