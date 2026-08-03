// Extração de atributos técnicos a partir do nome do produto.
//
// Necessária porque a base não tem esses dados estruturados: o campo
// `description` está vazio nos 10.863 produtos e não existem colunas de
// dimensão, potência ou voltagem. Tudo está embutido no nome, em texto livre.

import { normalizarTexto } from "./normalize";

export interface AtributosProduto {
  /** Dimensões em milímetros, ordenadas. Ex.: "115cm" -> [1150] */
  dimensoes: number[];
  /** Potência em watts. */
  potencia: number | null;
  /** Voltagem: 127, 220 ou 0 para bivolt. */
  voltagem: number | null;
  bivolt: boolean;
  /** Temperatura de cor em kelvin (iluminação). */
  kelvin: number | null;
  /** Quantidade da embalagem: "C/10", "com 12 unidades" -> 10, 12 */
  quantidade: number | null;
  /** Amperagem. */
  amperagem: number | null;
  cor: string | null;
  material: string | null;
}

const CORES = [
  "branco", "branca", "preto", "preta", "azul", "vermelho", "vermelha",
  "verde", "amarelo", "amarela", "cinza", "marrom", "bege", "laranja",
  "rosa", "roxo", "dourado", "prata", "transparente", "cristal", "fume",
];

const MATERIAIS = [
  "aco", "inox", "aluminio", "plastico", "nylon", "pvc", "cpvc", "borracha",
  "madeira", "vidro", "ceramica", "porcelana", "cobre", "latao", "ferro",
  "zinco", "abs", "pp", "silicone", "couro", "algodao", "poliester",
];

/** Converte uma medida para milímetros, para comparar unidades diferentes. */
function paraMilimetros(valor: number, unidade: string): number | null {
  switch (unidade) {
    case "mm": return valor;
    case "cm": return valor * 10;
    case "m": return valor * 1000;
    case "pol": return valor * 25.4;
    default: return null;
  }
}

export function extrairAtributos(nome: string | null | undefined): AtributosProduto {
  const t = normalizarTexto(nome);

  const attrs: AtributosProduto = {
    dimensoes: [], potencia: null, voltagem: null, bivolt: false,
    kelvin: null, quantidade: null, amperagem: null, cor: null, material: null,
  };

  if (!t) return attrs;

  // Dimensões. Captura tanto "180mm" quanto "115x20mm" (a unidade do último
  // termo vale para todos, que é como as descrições escrevem).
  const dims = new Set<number>();
  // Array.from pelo mesmo motivo de normalize.ts: target antigo no tsconfig.
  for (const m of Array.from(t.matchAll(/(\d+(?:\.\d+)?)(?:x(\d+(?:\.\d+)?))?(mm|cm|pol)\b/g))) {
    const unidade = m[3];
    for (const bruto of [m[1], m[2]]) {
      if (!bruto) continue;
      const mm = paraMilimetros(parseFloat(bruto), unidade);
      if (mm !== null) dims.add(Math.round(mm * 10) / 10);
    }
  }
  // "m" isolado é ambíguo (metro x "M" de tamanho), então só entra quando
  // acompanhado de decimal ou valor plausível de comprimento.
  for (const m of Array.from(t.matchAll(/(\d+(?:\.\d+)?)m\b/g))) {
    const v = parseFloat(m[1]);
    if (v > 0 && v <= 100) dims.add(v * 1000);
  }
  attrs.dimensoes = Array.from(dims).sort((a, b) => a - b);

  const pot = t.match(/(\d+(?:\.\d+)?)w\b/);
  if (pot) attrs.potencia = parseFloat(pot[1]);

  if (/\bbivolt\b|\bautovolt\b|127.*220|220.*127/.test(t)) {
    attrs.bivolt = true;
    attrs.voltagem = 0;
  } else {
    const volt = t.match(/\b(127|110|220|380|12|24)v\b/);
    if (volt) attrs.voltagem = parseInt(volt[1]);
  }

  const kel = t.match(/(\d{4})k\b/);
  if (kel) attrs.kelvin = parseInt(kel[1]);

  const amp = t.match(/(\d+(?:\.\d+)?)a\b/);
  if (amp) attrs.amperagem = parseFloat(amp[1]);

  // Quantidade de embalagem: "c/10", "c 100", "com 12 un", "pacote 25".
  const qtd =
    t.match(/\bc\s*(\d+)\b/) ||
    t.match(/\bcom\s+(\d+)\s*(?:un|pc|pecas?)\b/) ||
    t.match(/\b(?:pct|cx|pacote|caixa)\s*(\d+)\b/);
  if (qtd) attrs.quantidade = parseInt(qtd[1]);

  attrs.cor = CORES.find((c) => new RegExp(`\\b${c}\\b`).test(t)) ?? null;
  attrs.material = MATERIAIS.find((m) => new RegExp(`\\b${m}\\b`).test(t)) ?? null;

  return attrs;
}

/** Duas listas de dimensão são compatíveis se compartilham alguma medida. */
export function dimensoesCompativeis(a: number[], b: number[]): boolean | null {
  if (a.length === 0 || b.length === 0) return null; // sem informação
  const tolerancia = 0.02; // 2%, para arredondamento de polegada
  for (const x of a) {
    for (const y of b) {
      if (Math.abs(x - y) / Math.max(x, y) <= tolerancia) return true;
    }
  }
  return false;
}

/**
 * Compara um atributo numérico. Devolve null quando falta dado nos dois lados
 * — ausência de informação não pode contar nem a favor nem contra.
 */
export function atributoCompativel(
  a: number | null,
  b: number | null,
  tolerancia = 0,
): boolean | null {
  if (a === null || b === null) return null;
  if (tolerancia === 0) return a === b;
  return Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b), 1) <= tolerancia;
}
