// Utilitários compartilhados pelos adapters.

/**
 * Converte texto de preço brasileiro em número.
 *
 * A lógica de detecção de formato é uma cópia enxuta de
 * `HybridScraper.extractPrice` (server/scraper-v2.ts:568-609). Duplicar é
 * intencional: lá é método privado de uma classe grande usada por três caminhos
 * vivos, e extrair sairia bem mais caro que estas ~25 linhas.
 *
 * Retorna null quando não há número reconhecível.
 */
export function parseBrlPrice(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === "number") return Number.isFinite(input) ? input : null;

  // Fica só com dígitos, vírgula e ponto (derruba "R$", NBSP, "a partir de", etc.)
  const cleaned = input.replace(/[^\d.,]/g, "").trim();
  if (!cleaned) return null;

  let parsed: number;

  if (cleaned.includes(",") && cleaned.includes(".")) {
    // 1.234,56 (BR) vs 1,234.56 (US): vence quem aparece por último
    parsed =
      cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")
        ? parseFloat(cleaned.replace(/\./g, "").replace(",", "."))
        : parseFloat(cleaned.replace(/,/g, ""));
  } else if (cleaned.includes(",")) {
    const parts = cleaned.split(",");
    parsed =
      parts.length === 2 && parts[1].length <= 2
        ? parseFloat(cleaned.replace(",", "."))
        : parseFloat(cleaned.replace(/,/g, ""));
  } else if (cleaned.includes(".")) {
    const parts = cleaned.split(".");
    parsed =
      parts.length === 2 && parts[1].length <= 2
        ? parseFloat(cleaned)
        : parseFloat(cleaned.replace(/\./g, ""));
  } else {
    parsed = parseFloat(cleaned);
  }

  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Normaliza código de produto para casar entre portal e banco.
 * A Tambasa exibe com zeros à esquerda ("017571"), a Bartofil não ("17571").
 */
export function normalizeCode(code: string | number | null | undefined): string {
  if (code === null || code === undefined) return "";
  return String(code).trim();
}

export function absoluteUrl(href: string | undefined, baseUrl: string): string | undefined {
  if (!href) return undefined;
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return undefined;
  }
}

/** Sleep com jitter de ±20%, para não bater no portal num ritmo perfeitamente regular. */
export function sleepJitter(ms: number): Promise<void> {
  const jitter = ms * (0.8 + Math.random() * 0.4);
  return new Promise((resolve) => setTimeout(resolve, Math.round(jitter)));
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
