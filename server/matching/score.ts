// Pontuação de correspondência entre produtos.
//
// Princípio, seguindo a prioridade definida: precisão acima de quantidade.
// É preferível deixar produto sem par a criar par errado — por isso existem
// bloqueios que anulam o match por mais parecido que o texto seja.

import { normalizarEan, similaridadeTokens, tokenizar } from "./normalize";
import {
  atributoCompativel,
  dimensoesCompativeis,
  extrairAtributos,
  type AtributosProduto,
} from "./attributes";

export interface ProdutoParaMatch {
  id: number;
  name: string;
  manufacturer?: string | null;
  ean?: string | null;
  sku?: string | null;
  brandSku?: string | null;
}

export interface ResultadoMatch {
  score: number;
  decisao: "aceitar" | "revisar" | "rejeitar";
  motivo: string;
  evidencia: {
    eanIgual?: boolean;
    codigoFabricanteIgual?: boolean;
    similaridadeNome: number;
    marcaIgual?: boolean | null;
    dimensoes?: boolean | null;
    potencia?: boolean | null;
    voltagem?: boolean | null;
    kelvin?: boolean | null;
    quantidade?: boolean | null;
    bloqueios: string[];
  };
}

/** Acima disso o motor sugere com confiança. */
export const LIMIAR_ACEITE = 80;
/** Abaixo disso nem entra na fila — é ruído. */
export const LIMIAR_REVISAO = 55;

/**
 * Atributos cuja divergência ANULA o match, mesmo com texto quase idêntico.
 *
 * É o que teria evitado o pior caso da base atual: cortadores de piso de
 * 115cm e 120cm agrupados juntos, variando de R$ 1,41 a R$ 1.290. Os nomes
 * são quase iguais; o que os separa é a dimensão.
 */
function calcularBloqueios(a: AtributosProduto, b: AtributosProduto): string[] {
  const bloqueios: string[] = [];

  if (dimensoesCompativeis(a.dimensoes, b.dimensoes) === false) {
    bloqueios.push(`dimensão divergente (${a.dimensoes.join("/")}mm x ${b.dimensoes.join("/")}mm)`);
  }
  if (atributoCompativel(a.potencia, b.potencia) === false) {
    bloqueios.push(`potência divergente (${a.potencia}W x ${b.potencia}W)`);
  }
  // Bivolt é compatível com qualquer voltagem; só bloqueia 127 contra 220.
  if (!a.bivolt && !b.bivolt && atributoCompativel(a.voltagem, b.voltagem) === false) {
    bloqueios.push(`voltagem divergente (${a.voltagem}V x ${b.voltagem}V)`);
  }
  if (atributoCompativel(a.kelvin, b.kelvin) === false) {
    bloqueios.push(`temperatura de cor divergente (${a.kelvin}K x ${b.kelvin}K)`);
  }
  if (atributoCompativel(a.quantidade, b.quantidade) === false) {
    bloqueios.push(`quantidade da embalagem divergente (${a.quantidade} x ${b.quantidade})`);
  }

  return bloqueios;
}

export function pontuarMatch(a: ProdutoParaMatch, b: ProdutoParaMatch): ResultadoMatch {
  const eanA = normalizarEan(a.ean);
  const eanB = normalizarEan(b.ean);

  const tokensA = tokenizar(a.name, a.manufacturer);
  const tokensB = tokenizar(b.name, b.manufacturer);
  const simNome = similaridadeTokens(tokensA, tokensB);

  const attrA = extrairAtributos(a.name);
  const attrB = extrairAtributos(b.name);
  const bloqueios = calcularBloqueios(attrA, attrB);

  const evidencia: ResultadoMatch["evidencia"] = {
    similaridadeNome: Math.round(simNome * 100) / 100,
    dimensoes: dimensoesCompativeis(attrA.dimensoes, attrB.dimensoes),
    potencia: atributoCompativel(attrA.potencia, attrB.potencia),
    voltagem: a.name && b.name ? atributoCompativel(attrA.voltagem, attrB.voltagem) : null,
    kelvin: atributoCompativel(attrA.kelvin, attrB.kelvin),
    quantidade: atributoCompativel(attrA.quantidade, attrB.quantidade),
    bloqueios,
  };

  // 1. EAN igual encerra a conversa: é o mesmo item físico.
  if (eanA && eanB) {
    evidencia.eanIgual = eanA === eanB;
    if (eanA === eanB) {
      return { score: 100, decisao: "aceitar", motivo: "EAN idêntico", evidencia };
    }
    // EAN diferente nos dois lados é prova de que NÃO são o mesmo item.
    return {
      score: 0,
      decisao: "rejeitar",
      motivo: "EAN diferente — produtos distintos",
      evidencia,
    };
  }

  // 2. Código do fabricante igual, com marca compatível.
  const codA = (a.brandSku || "").trim().toLowerCase();
  const codB = (b.brandSku || "").trim().toLowerCase();
  if (codA && codB && codA === codB) {
    evidencia.codigoFabricanteIgual = true;
    if (bloqueios.length === 0) {
      return { score: 95, decisao: "aceitar", motivo: "código do fabricante idêntico", evidencia };
    }
  }

  // 3. Bloqueio manda mais que semelhança de texto.
  if (bloqueios.length > 0) {
    return {
      score: 0,
      decisao: "rejeitar",
      motivo: bloqueios.join("; "),
      evidencia,
    };
  }

  // 4. Pontuação composta.
  //
  // Peso 70 no nome, calibrado contra a base real: com 60, dois produtos de
  // nome idêntico, mesma marca e mesma dimensão somavam 78 e caíam em revisão
  // — conservador a ponto de ser inútil. Com 70 eles chegam a 88 e são
  // aceitos, enquanto "Cortador 115cm Super" x "Cortador 115cm Master"
  // (linhas diferentes, similaridade 0,71) fica em 68 e continua indo para
  // revisão, que é o comportamento correto.
  //
  // O nome sozinho não basta: mesmo com similaridade 1,0 o score para em 70,
  // abaixo do limiar. É sempre preciso ter marca ou atributo técnico junto.
  let score = simNome * 70;

  const marcaA = (a.manufacturer || "").trim().toLowerCase();
  const marcaB = (b.manufacturer || "").trim().toLowerCase();
  if (marcaA && marcaB) {
    evidencia.marcaIgual = marcaA === marcaB;
    // Marca igual reforça; marca diferente é esperado (comparamos concorrentes),
    // então não penaliza.
    if (marcaA === marcaB) score += 10;
  }

  // Cada atributo técnico confirmado soma. São eles que distinguem
  // "quase o mesmo produto" de "o mesmo produto".
  const confirmados = [
    evidencia.dimensoes, evidencia.potencia, evidencia.kelvin,
    evidencia.quantidade,
  ].filter((v) => v === true).length;
  score += confirmados * 8;

  if (attrA.cor && attrB.cor && attrA.cor === attrB.cor) score += 4;
  if (attrA.material && attrB.material && attrA.material === attrB.material) score += 4;

  score = Math.min(100, Math.round(score));

  const decisao: ResultadoMatch["decisao"] =
    score >= LIMIAR_ACEITE ? "aceitar" : score >= LIMIAR_REVISAO ? "revisar" : "rejeitar";

  return {
    score,
    decisao,
    motivo:
      decisao === "aceitar"
        ? `similaridade ${Math.round(simNome * 100)}% com ${confirmados} atributo(s) confirmado(s)`
        : decisao === "revisar"
          ? "similaridade média — requer conferência"
          : "similaridade insuficiente",
    evidencia,
  };
}

/**
 * Quando vários candidatos empatam, nenhum é aceito automaticamente.
 *
 * Empate significa que o motor não sabe qual é o certo — escolher o de maior
 * pontuação seria decidir no ruído. Todos vão para revisão.
 */
export function resolverAmbiguidade<T extends { resultado: ResultadoMatch }>(
  candidatos: T[],
  margemMinima = 10,
): { aceito: T | null; paraRevisar: T[] } {
  const aceitaveis = candidatos
    .filter((c) => c.resultado.decisao === "aceitar")
    .sort((x, y) => y.resultado.score - x.resultado.score);

  const revisaveis = candidatos.filter((c) => c.resultado.decisao === "revisar");

  if (aceitaveis.length === 0) return { aceito: null, paraRevisar: revisaveis };

  if (aceitaveis.length === 1) return { aceito: aceitaveis[0], paraRevisar: revisaveis };

  const [primeiro, segundo] = aceitaveis;
  if (primeiro.resultado.score - segundo.resultado.score >= margemMinima) {
    return { aceito: primeiro, paraRevisar: [...aceitaveis.slice(1), ...revisaveis] };
  }

  // Empate técnico: ninguém é aceito.
  return { aceito: null, paraRevisar: [...aceitaveis, ...revisaveis] };
}
