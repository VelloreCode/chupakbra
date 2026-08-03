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

/**
 * Limpa e valida um JWT vindo de variável de ambiente.
 *
 * A anon key tem ~200 caracteres e costuma ser colada em campo de texto de
 * painel, onde acaba quebrada em duas linhas. Um \n no meio do valor vira
 * "Invalid character in header content" na primeira requisição — mensagem que
 * não diz nada sobre a causa. JWT não contém espaço em branco nenhum, então
 * remover tudo é seguro e conserta o caso comum.
 */
function jwtFromEnv(name: string): string {
  const raw = required(name);

  // Remove tudo que não pertence ao alfabeto de um JWT (base64url + ponto).
  // Cobre quebra de linha, espaço comum, NBSP e — o caso que \s NÃO pega —
  // caracteres de largura zero, que copiar-e-colar de página renderizada
  // costuma trazer junto e são invisíveis em qualquer inspeção visual.
  const cleaned = raw.replace(/[^A-Za-z0-9._-]/g, "");
  const parts = cleaned.split(".").length;

  if (parts !== 3) {
    // O diagnóstico traz tamanho e número de partes, nunca o valor: é o que
    // permite distinguir "veio truncado" de "veio grudado com a linha seguinte"
    // sem precisar de acesso ao painel.
    throw new SupplierConfigError(
      `${name} não parece um JWT válido: encontrei ${parts} parte(s) separadas por ponto, ` +
        `esperado 3. Após limpeza sobraram ${cleaned.length} caracteres ` +
        `(o valor bruto tinha ${raw.length}). ` +
        `Uma anon key do Supabase tem por volta de 200. ` +
        `Muito menos indica valor cortado; muito mais indica que a linha seguinte ` +
        `do painel foi absorvida junto.`,
    );
  }

  return cleaned;
}

/** Lança apenas se a anon key faltar: sem ela nem a listagem pública funciona. */
export function getBartofilConfig(): BartofilConfig {
  return {
    supabaseUrl: (
      process.env.BARTOFIL_SUPABASE_URL ?? "https://yadsszhyfgiyuqwvaydp.supabase.co"
    ).replace(/\/+$/, ""),
    anonKey: jwtFromEnv("BARTOFIL_SUPABASE_ANON_KEY"),
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
 * Diz se as credenciais de um fornecedor estão presentes e, quando não estão,
 * QUAL é o problema — sem nunca revelar valor.
 *
 * Devolver só um booleano obrigava a abrir log de servidor para descobrir se
 * faltava a senha, o CNPJ ou a anon key. A mensagem já nomeia a variável.
 */
export function checkCredentials(key: SupplierKey): { ok: boolean; issue: string | null } {
  try {
    if (key === "tambasa") {
      getTambasaCredentials();
    } else if (key === "martins") {
      // O Martins não tem credencial em ambiente: a sessão é capturada à mão
      // (2FA por SMS) e vive em supplier_sessions. Quem responde por ela é a
      // rota /api/suppliers/:key/session, não esta checagem.
      return { ok: true, issue: null };
    } else {
      getBartofilConfig();
      getBartofilCredentials();
    }
    return { ok: true, issue: null };
  } catch (error) {
    return {
      ok: false,
      issue: error instanceof Error ? error.message : "credenciais indisponíveis",
    };
  }
}

export function areCredentialsConfigured(key: SupplierKey): boolean {
  return checkCredentials(key).ok;
}

export function isSupplierSyncEnabled(): boolean {
  return process.env.SUPPLIER_SYNC_ENABLED !== "false";
}

export function getSupplierSyncCron(): string {
  return process.env.SUPPLIER_SYNC_CRON?.trim() || "0 7 * * *";
}
