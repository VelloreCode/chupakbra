// Normalização de texto para comparação de produtos.
//
// Nada aqui é exibido — é tudo forma canônica interna, para que
// "Cortador de Piso/Azulejo 120Cm" e "CORTADOR PISO AZULEJO 120 CM" produzam
// os mesmos tokens.

/** Remove acentos preservando a letra base. */
export function removerAcentos(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/**
 * Sinônimos de unidade. A chave é a forma escrita, o valor é a canônica.
 *
 * Sem isto, "120cm", "120 cm" e "120 centimetros" seriam três tokens
 * diferentes e o match por dimensão nunca fecharia.
 */
const UNIDADES: Record<string, string> = {
  milimetro: "mm", milimetros: "mm", mm: "mm",
  centimetro: "cm", centimetros: "cm", cm: "cm",
  metro: "m", metros: "m", mt: "m", mts: "m", m: "m",
  polegada: "pol", polegadas: "pol", pol: "pol",
  quilo: "kg", quilos: "kg", kg: "kg",
  grama: "g", gramas: "g", g: "g",
  litro: "l", litros: "l", lt: "l", l: "l",
  mililitro: "ml", mililitros: "ml", ml: "ml",
  watts: "w", watt: "w", w: "w",
  volts: "v", volt: "v", v: "v",
  amperes: "a", ampere: "a", amper: "a", a: "a",
  unidade: "un", unidades: "un", un: "un", und: "un", uni: "un",
  peca: "pc", pecas: "pc", pc: "pc", pcs: "pc",
  caixa: "cx", caixas: "cx", cx: "cx",
  pacote: "pct", pacotes: "pct", pct: "pct",
};

/**
 * Palavras que não distinguem um produto de outro. Removê-las evita que
 * dois produtos diferentes pareçam similares só por compartilharem
 * preposições e palavras de embalagem.
 */
const STOP_WORDS = new Set([
  "de", "da", "do", "das", "dos", "e", "em", "no", "na", "nos", "nas",
  "com", "sem", "para", "por", "a", "o", "as", "os", "ao", "aos",
  "the", "of", "um", "uma", "uns", "umas",
  // Ruído comercial: aparecem em quase tudo e não identificam nada.
  "produto", "item", "ref", "cod", "codigo", "modelo", "tipo", "linha",
  "embalagem", "emb", "contendo", "contem",
]);

/**
 * Texto em forma canônica: sem acento, minúsculo, sem pontuação, com unidades
 * coladas ao número ("120 cm" -> "120cm") para virar um token só.
 */
export function normalizarTexto(texto: string | null | undefined): string {
  if (!texto) return "";

  let t = removerAcentos(texto.toLowerCase());

  // Pontuação vira espaço; a barra também, porque "piso/azulejo" são dois
  // conceitos e devem tokenizar separados.
  t = t.replace(/[^\w\s.,]/g, " ");
  // Decimal com vírgula vira ponto, para "1,5mm" e "1.5mm" coincidirem.
  t = t.replace(/(\d),(\d)/g, "$1.$2");
  t = t.replace(/[,]/g, " ");
  t = t.replace(/\s+/g, " ").trim();

  // Cola número e unidade quando separados: "120 cm" -> "120cm".
  t = t.replace(/(\d+(?:\.\d+)?)\s+([a-z]+)/g, (todo, num, palavra) => {
    const canonica = UNIDADES[palavra];
    return canonica ? `${num}${canonica}` : todo;
  });

  // Canonicaliza a unidade já colada: "120centimetros" -> "120cm".
  t = t.replace(/(\d+(?:\.\d+)?)([a-z]+)/g, (todo, num, palavra) => {
    const canonica = UNIDADES[palavra];
    return canonica ? `${num}${canonica}` : todo;
  });

  return t;
}

/**
 * Tokens significativos: normalizados, sem stop words e sem fragmentos.
 *
 * `marca` é removida do texto quando informada, e isso é essencial para o
 * caso de uso. Os fornecedores escrevem a marca dentro do nome ("Pistola
 * Aplicadora Silicone Thompson"), então comparar produtos equivalentes de
 * marcas diferentes penalizava justamente o token que deveria ser ignorado —
 * a marca já é um campo à parte, com peso próprio na pontuação.
 */
export function tokenizar(texto: string | null | undefined, marca?: string | null): string[] {
  const tokensMarca = marca
    ? new Set(normalizarTexto(marca).split(" ").filter(Boolean))
    : new Set<string>();

  return normalizarTexto(texto)
    .split(" ")
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t) && !tokensMarca.has(t));
}

/**
 * Similaridade de Jaccard entre conjuntos de tokens: interseção sobre união.
 *
 * Escolhida em vez de distância de edição porque a ordem das palavras varia
 * muito entre fornecedores ("Cortador Piso Cortag" x "Cortag Cortador de
 * Piso") e Jaccard é indiferente à ordem.
 */
export function similaridadeTokens(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const sa = new Set(a);
  const sb = new Set(b);
  let intersecao = 0;
  // Array.from em vez de iterar o Set direto: o target do tsconfig é anterior
  // a ES2015 e não permite for..of sobre Set.
  for (const t of Array.from(sa)) if (sb.has(t)) intersecao++;
  const uniao = sa.size + sb.size - intersecao;
  return uniao === 0 ? 0 : intersecao / uniao;
}

/** EAN só com dígitos. Vazio quando não há código utilizável. */
export function normalizarEan(ean: string | null | undefined): string {
  if (!ean) return "";
  const digitos = String(ean).replace(/\D/g, "");
  // EAN válido tem 8, 12, 13 ou 14 dígitos. Fora disso é lixo de cadastro.
  return [8, 12, 13, 14].includes(digitos.length) ? digitos : "";
}
