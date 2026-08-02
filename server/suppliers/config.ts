// Leitura das credenciais e tunables dos fornecedores.
//
// Segue o padrão preguiçoso de server/ai-pricing.ts: nada é lido no import,
// só quando o adapter realmente vai rodar. Assim o servidor sobe normalmente
// mesmo sem credencial cadastrada, e a tela consegue mostrar
// "credenciais ausentes" em vez de derrubar o boot.

import { SupplierConfigError, type SupplierKey } from "./types";

function num(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new SupplierConfigError(
      `Variável de ambiente ${name} não configurada — cadastre no .env / Dokploy`,
    );
  }
  return value;
}

// Config e credenciais são separadas de propósito: descobrir categorias é uma
// leitura de página pública, então a tela consegue listar categorias antes
// mesmo de as credenciais estarem cadastradas. Só o login exige segredo.

export interface TambasaConfig {
  baseUrl: string;
  delayMs: number;
  maxPages: number;
  perPage: number;
  engine: "axios" | "playwright";
}

export interface SupplierCredentials {
  user: string;
  password: string;
}

/** Nunca lança: só tunables e URL. */
export function getTambasaConfig(): TambasaConfig {
  const engine = (process.env.TAMBASA_ENGINE ?? "axios").trim();
  return {
    baseUrl: (process.env.TAMBASA_BASE_URL ?? "https://tambasa.com").replace(/\/+$/, ""),
    delayMs: num(process.env.TAMBASA_DELAY_MS, 1500),
    maxPages: num(process.env.TAMBASA_MAX_PAGES, 50),
    perPage: num(process.env.TAMBASA_PER_PAGE, 100),
    engine: engine === "playwright" ? "playwright" : "axios",
  };
}

/** Lança SupplierConfigError se faltar credencial. */
export function getTambasaCredentials(): SupplierCredentials {
  return {
    user: required("TAMBASA_USER"),
    password: required("TAMBASA_PASSWORD"),
  };
}

export interface BartofilConfig {
  supabaseUrl: string;
  /** Pública por design (vem no bundle do site), mas rotaciona — por isso em env. */
  anonKey: string;
  delayMs: number;
  pageSize: number;
}

/** Lança apenas se a anon key faltar: sem ela nem a listagem pública funciona. */
export function getBartofilConfig(): BartofilConfig {
  return {
    supabaseUrl: (
      process.env.BARTOFIL_SUPABASE_URL ?? "https://yadsszhyfgiyuqwvaydp.supabase.co"
    ).replace(/\/+$/, ""),
    anonKey: required("BARTOFIL_SUPABASE_ANON_KEY"),
    delayMs: num(process.env.BARTOFIL_DELAY_MS, 300),
    pageSize: num(process.env.BARTOFIL_PAGE_SIZE, 100),
  };
}

export interface BartofilCredentials {
  /** CNPJ só com dígitos. O adapter resolve o e-mail a partir dele. */
  cnpj: string;
  /** Atalho opcional: se informado, pula o lookup CNPJ → e-mail. */
  email?: string;
  password: string;
}

export function getBartofilCredentials(): BartofilCredentials {
  const email = process.env.BARTOFIL_EMAIL?.trim();
  const cnpj = (process.env.BARTOFIL_CNPJ ?? "").replace(/\D/g, "");

  if (!cnpj && !email) {
    throw new SupplierConfigError(
      "Configure BARTOFIL_CNPJ (recomendado) ou BARTOFIL_EMAIL — nenhum dos dois está definido",
    );
  }

  return { cnpj, email: email || undefined, password: required("BARTOFIL_PASSWORD") };
}

/**
 * Diz se as credenciais de um fornecedor estão presentes — sem revelar valor.
 * É o que a rota GET /api/suppliers devolve.
 */
export function areCredentialsConfigured(key: SupplierKey): boolean {
  try {
    if (key === "tambasa") getTambasaCredentials();
    else {
      getBartofilConfig();
      getBartofilCredentials();
    }
    return true;
  } catch {
    return false;
  }
}

export function isSupplierSyncEnabled(): boolean {
  return process.env.SUPPLIER_SYNC_ENABLED !== "false";
}

export function getSupplierSyncCron(): string {
  return process.env.SUPPLIER_SYNC_CRON?.trim() || "0 7 * * *";
}
