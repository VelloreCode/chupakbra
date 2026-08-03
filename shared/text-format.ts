// Padronização de texto exibido: nomes de produto e marcas.
//
// Fica em shared/ porque as mesmas regras precisam valer na escrita (servidor)
// e na exibição (cliente) — duas implementações divergiriam com o tempo.

/**
 * Siglas e unidades que devem permanecer em caixa alta.
 *
 * A lista é explícita de propósito: qualquer heurística genérica ("token curto
 * em maiúscula fica maiúsculo") transformaria palavras comuns abreviadas em
 * sigla e vice-versa. Preferi errar para o lado de listar.
 */
const SIGLAS = new Set([
  // Tecnologia e material
  "LED", "COB", "SMD", "RGB", "USB", "LCD", "TV", "DVD", "CD", "GPS", "USB-C",
  "PVC", "CPVC", "PPR", "ABS", "PP", "PE", "PU", "PET", "EVA", "MDF", "PS",
  "INOX", "GALV", "UV", "IR",
  // Elétrica
  "AC", "DC", "NBR", "DPS", "DR", "IDR", "QDC", "TUE", "TUG",
  // Comercial
  "REF", "COD", "EAN", "SKU", "NCM", "IPI", "UN", "CX", "PC", "KIT", "PCT",
  // Bases de lâmpada e especificações
  "E27", "E40", "E14", "G9", "GU10", "T5", "T8", "T10", "PAR20", "PAR30", "PAR38",
  "HO", "HF", "AFP",
]);

/** Conectivos que ficam em minúscula, exceto na primeira posição. */
const CONECTIVOS = new Set([
  "de", "da", "do", "das", "dos", "e", "em", "no", "na", "nos", "nas",
  "com", "sem", "para", "por", "a", "o", "as", "os", "ao", "aos", "à", "às",
]);

/** Unidades de medida que a convenção escreve em minúscula. */
const UNIDADES_MINUSCULAS = ["mm", "cm", "m", "km", "kg", "g", "mg", "ml", "l", "pol"];

function ehSigla(token: string): boolean {
  return SIGLAS.has(token.toUpperCase());
}

/**
 * Token com dígito é especificação técnica: 127V, 6500K, 20W, CR2025, A55,
 * IP65, 1CV, 15mm. Preserva o conteúdo e só ajusta a caixa das unidades que
 * a convenção escreve em minúscula (15MM -> 15mm), mantendo as elétricas em
 * maiúscula (127v -> 127V).
 */
function formatarTokenComDigito(token: string): string {
  const m = token.match(/^([\d.,]+)([A-Za-zÀ-ÿ]+)$/);
  if (m) {
    const [, numero, unidade] = m;
    const lower = unidade.toLowerCase();
    if (UNIDADES_MINUSCULAS.includes(lower)) return `${numero}${lower}`;
    return `${numero}${unidade.toUpperCase()}`;
  }
  // Código de modelo (CR2025, A55, IP65, D16461) fica como veio, em maiúscula.
  return token.toUpperCase();
}

function formatarToken(token: string, primeiro: boolean, palavraSolta: boolean): string {
  if (!token) return token;

  if (/\d/.test(token)) return formatarTokenComDigito(token);
  if (ehSigla(token)) return token.toUpperCase();

  const lower = token.toLowerCase();
  // Só rebaixa conectivo que é palavra inteira. Sem isto, o "A" de "S/A" cai
  // na regra e vira "S/a" — o mesmo valeria para "P/A", "C/D".
  if (!primeiro && palavraSolta && CONECTIVOS.has(lower)) return lower;

  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/**
 * Converte texto em CAIXA ALTA para formato legível.
 *
 * Só age quando o texto está inteiramente em maiúsculas — texto já misto é
 * devolvido intacto, para não estragar capitalização feita por uma pessoa.
 */
export function formatarTextoLegivel(texto: string | null | undefined): string {
  if (!texto) return "";
  const limpo = texto.trim().replace(/\s+/g, " ");
  if (!limpo) return "";

  // Sem nenhuma minúscula e com pelo menos uma sequência de letras = caixa alta.
  const ehCaixaAlta = limpo === limpo.toUpperCase() && /[A-ZÀ-Ý]{2,}/.test(limpo);
  if (!ehCaixaAlta) return limpo;

  // Separadores (/, -, ,) são preservados: quebram palavras mas fazem parte de
  // medidas e códigos, como "115X20MM" ou "PISO/AZULEJO".
  return limpo
    .split(" ")
    .map((palavra, i) => {
      const partes = palavra.split(/([/\-,])/);
      const palavraSolta = partes.length === 1;
      return partes
        .map((parte, j) =>
          /^[/\-,]$/.test(parte) ? parte : formatarToken(parte, i === 0 && j === 0, palavraSolta),
        )
        .join("");
    })
    .join(" ");
}

/**
 * Grafia canônica das marcas que o grupo controla. A chave é a forma
 * normalizada (minúscula) e o valor é como deve aparecer.
 */
const GRAFIA_CANONICA: Record<string, string> = {
  foxlux: "Foxlux",
  famastil: "Famastil",
};

/**
 * Forma canônica de exibição de uma marca.
 *
 * DELIBERADAMENTE conservadora: corrige só o prefixo "Marca: " (sujeira de
 * scraper) e a grafia das marcas conhecidas. Marca de terceiro é devolvida
 * como veio.
 *
 * O motivo é concreto: aplicar title case em tudo converteria siglas legítimas
 * — "DNI" viraria "Dni", "ELG" viraria "Elg". Sem uma lista de siglas de marca
 * (que não temos), o title case genérico erra mais do que acerta. Marca de
 * fornecedor em caixa alta é feia, mas correta; "Dni" é errada.
 *
 * Não confundir com normalizeBrand (schema.ts), que produz a chave de
 * COMPARAÇÃO em minúscula. Esta produz o texto EXIBIDO.
 */
export function formatarMarca(marca: string | null | undefined): string {
  if (!marca) return "";

  const semPrefixo = marca.trim().replace(/^marca:\s*/i, "").trim();
  if (!semPrefixo) return "";

  return GRAFIA_CANONICA[semPrefixo.toLowerCase()] ?? semPrefixo;
}
