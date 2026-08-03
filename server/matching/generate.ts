// Geração de candidatos a correspondência.
//
// Compara cada produto master (marca própria da Vellore) contra os produtos
// dos concorrentes e grava na fila de revisão o que passar do limiar.
//
// Nunca aplica vínculo sozinho: mesmo score 100 entra como candidato. Quem
// aprova é uma pessoa, na tela de revisão. Foi a prioridade declarada —
// precisão acima de quantidade.

import { and, eq, ne, isNotNull } from "drizzle-orm";
import { db } from "../db";
import { products } from "@shared/schema";
import { storage } from "../storage";
import { LIMIAR_REVISAO, pontuarMatch, resolverAmbiguidade, type ProdutoParaMatch } from "./score";
import { tokenizar } from "./normalize";

export interface ResumoGeracao {
  masters: number;
  concorrentes: number;
  comparacoes: number;
  candidatosGravados: number;
  aceitaveis: number;
  paraRevisar: number;
  ambiguidadesBloqueadas: number;
}

/**
 * Índice invertido por token, para não comparar todo master contra todo
 * concorrente. Sem isso seriam 578 x 9.500 = 5,5 milhões de comparações a
 * cada execução; com ele só entram pares que dividem ao menos um token
 * significativo.
 */
function construirIndice(itens: Array<ProdutoParaMatch>): Map<string, number[]> {
  const indice = new Map<string, number[]>();
  itens.forEach((item, i) => {
    for (const token of tokenizar(item.name, item.manufacturer)) {
      if (!indice.has(token)) indice.set(token, []);
      indice.get(token)!.push(i);
    }
  });
  return indice;
}

export async function gerarCandidatos(opts: { dryRun?: boolean } = {}): Promise<ResumoGeracao> {
  const dryRun = opts.dryRun ?? false;

  const masters = (await db
    .select({
      id: products.id, name: products.name, manufacturer: products.manufacturer,
      ean: products.ean, sku: products.sku, brandSku: products.brandSku,
    })
    .from(products)
    .where(and(eq(products.isMaster, true), eq(products.status, "active")))) as ProdutoParaMatch[];

  const concorrentes = (await db
    .select({
      id: products.id, name: products.name, manufacturer: products.manufacturer,
      ean: products.ean, sku: products.sku, brandSku: products.brandSku,
    })
    .from(products)
    .where(and(
      eq(products.isMaster, false),
      eq(products.status, "active"),
      isNotNull(products.name),
    ))) as ProdutoParaMatch[];

  const resumo: ResumoGeracao = {
    masters: masters.length,
    concorrentes: concorrentes.length,
    comparacoes: 0,
    candidatosGravados: 0,
    aceitaveis: 0,
    paraRevisar: 0,
    ambiguidadesBloqueadas: 0,
  };

  const indice = construirIndice(concorrentes);

  for (const master of masters) {
    const tokens = tokenizar(master.name, master.manufacturer);
    if (tokens.length === 0) continue;

    // Candidatos = quem compartilha algum token. Ordena por quantos tokens em
    // comum e corta a cauda, que é ruído.
    const contagem = new Map<number, number>();
    for (const t of tokens) {
      for (const idx of indice.get(t) ?? []) {
        contagem.set(idx, (contagem.get(idx) ?? 0) + 1);
      }
    }

    const promissores = Array.from(contagem.entries())
      .filter(([, n]) => n >= 2) // ao menos dois tokens em comum
      .sort((a, b) => b[1] - a[1])
      .slice(0, 40)
      .map(([idx]) => concorrentes[idx]);

    const avaliados = promissores.map((c) => {
      resumo.comparacoes++;
      return { produto: c, resultado: pontuarMatch(master, c) };
    });

    const { aceito, paraRevisar } = resolverAmbiguidade(avaliados);

    if (aceito) resumo.aceitaveis++;
    else if (avaliados.some((a) => a.resultado.decisao === "aceitar")) {
      // Havia aceitáveis mas o desempate bloqueou: registra o caso.
      resumo.ambiguidadesBloqueadas++;
    }

    // Aceito entra na fila também. O motor sugere; a aprovação é humana.
    const gravar = [...(aceito ? [aceito] : []), ...paraRevisar].filter(
      (c) => c.resultado.score >= LIMIAR_REVISAO,
    );

    for (const c of gravar) {
      resumo.paraRevisar++;
      if (!dryRun) {
        await storage.upsertMatchCandidate({
          masterProductId: master.id,
          candidateProductId: c.produto.id,
          score: c.resultado.score,
          evidence: { motivo: c.resultado.motivo, ...c.resultado.evidencia },
        });
        resumo.candidatosGravados++;
      }
    }
  }

  return resumo;
}
