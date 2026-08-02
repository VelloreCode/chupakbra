// Factory dos clientes HTTP dos adapters.
//
// Centraliza duas coisas que nenhum adapter pode esquecer:
//   1. redação de segredos antes de qualquer log;
//   2. backoff em 403/429 (rate limit dos portais).

import axios, { type AxiosInstance, type AxiosRequestConfig, AxiosError } from "axios";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";
import { sleepJitter } from "./util";

// User-Agent honesto, e isto NÃO é preciosismo — é o que funciona.
//
// A Tambasa fica atrás de Cloudflare. Medido em 02/2026: toda requisição com
// User-Agent de Chrome levou 429, porque o UA não bate com a impressão digital
// TLS/HTTP2 do Node e o Cloudflare trata a divergência como bot disfarçado.
// Com UA honesto (ou nenhum), a mesma URL responde 200 com o conteúdo íntegro.
// Ou seja: fingir ser navegador é justamente o que quebra. Não troque isto por
// uma string de Chrome "para parecer mais real".
const DEFAULT_UA = "ChupaKbra-PriceSync/1.0 (+monitoramento de precos B2B)";

export function getUserAgent(): string {
  return process.env.SUPPLIER_USER_AGENT?.trim() || DEFAULT_UA;
}

/** Headers padrão dos adapters: identificação honesta, sem teatro de browser. */
export const BASE_HEADERS: Record<string, string> = {
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.5",
};

const SENSITIVE_HEADERS = ["authorization", "cookie", "set-cookie", "apikey", "x-api-key"];
const SENSITIVE_URL = /\/entrar|\/auth\/v1\/token|\/login/i;

/**
 * Devolve uma versão do request segura para log.
 * Nunca imprima `config` cru — ele carrega cookie, Bearer e o corpo do login.
 */
export function redactForLog(config: AxiosRequestConfig): Record<string, unknown> {
  const headers: Record<string, unknown> = {};
  const raw = (config.headers ?? {}) as Record<string, unknown>;

  for (const [key, value] of Object.entries(raw)) {
    headers[key] = SENSITIVE_HEADERS.includes(key.toLowerCase()) ? "***" : value;
  }

  const url = config.url ?? "";
  return {
    method: config.method,
    url,
    headers,
    // O corpo do login carrega a senha em claro; nunca sai daqui.
    data: SENSITIVE_URL.test(url) ? "***" : redactValue(config.data),
  };
}

function redactValue(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    out[key] = /password|senha|access_token|refresh_token|apikey|token/i.test(key)
      ? "***"
      : val;
  }
  return out;
}

export interface HttpClientOptions {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
  /** Mantém sessão por cookie (necessário para a Tambasa). */
  withCookieJar?: boolean;
  /** Prefixo de log, ex.: "[SUPPLIER:tambasa]". */
  logPrefix: string;
}

export interface HttpClient {
  instance: AxiosInstance;
  jar?: CookieJar;
}

export function createHttpClient(options: HttpClientOptions): HttpClient {
  const jar = options.withCookieJar ? new CookieJar() : undefined;

  const base = axios.create({
    baseURL: options.baseURL,
    timeout: options.timeout ?? 30_000,
    headers: { "User-Agent": getUserAgent(), ...BASE_HEADERS, ...options.headers },
    maxRedirects: 5,
    ...(jar ? { jar, withCredentials: true } : {}),
  });

  const instance = jar ? wrapper(base) : base;

  instance.interceptors.response.use(
    (response) => response,
    (error: unknown) => {
      if (error instanceof AxiosError && error.config) {
        const status = error.response?.status;
        // O corpo da resposta é onde APIs dizem o que está errado de verdade
        // (PostgREST devolve o nome exato da coluna inválida, por exemplo).
        const body = error.response?.data;
        const bodyText =
          typeof body === "string" ? body.slice(0, 300) : JSON.stringify(body)?.slice(0, 300);
        console.error(
          `${options.logPrefix} HTTP ${status ?? "ERR"} —`,
          JSON.stringify(redactForLog(error.config)),
          bodyText ? `| resposta: ${bodyText}` : "",
        );
      }
      return Promise.reject(error);
    },
  );

  return { instance, jar };
}

/** Status que valem uma nova tentativa com espera. */
export function isRateLimited(error: unknown): boolean {
  return (
    error instanceof AxiosError &&
    [403, 429, 503].includes(error.response?.status ?? 0)
  );
}

/**
 * Executa `fn` com backoff exponencial em 403/429/503.
 * Esgotadas as tentativas, relança — quem chama decide se aborta o fornecedor.
 */
export async function withBackoff<T>(
  fn: () => Promise<T>,
  opts: { attempts?: number; logPrefix: string; onRetry?: (waitMs: number) => void },
): Promise<T> {
  const attempts = opts.attempts ?? 3;
  const waits = [2_000, 8_000, 30_000];
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isRateLimited(error) || attempt === attempts - 1) throw error;

      const waitMs = waits[Math.min(attempt, waits.length - 1)];
      console.warn(
        `${opts.logPrefix} rate limit — aguardando ${waitMs}ms (tentativa ${attempt + 1}/${attempts})`,
      );
      opts.onRetry?.(waitMs);
      await sleepJitter(waitMs);
    }
  }

  throw lastError;
}
