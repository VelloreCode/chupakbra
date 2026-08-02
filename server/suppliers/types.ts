// Contratos compartilhados pelos adapters de fornecedor (Tambasa, Bartofil).

export const SUPPLIER_KEYS = ["tambasa", "bartofil"] as const;
export type SupplierKey = (typeof SUPPLIER_KEYS)[number];

export interface SupplierCategoryRef {
  /** tambasa: path do slug. bartofil: categoria.id do Supabase. */
  externalId: string;
  label: string;
  parentExternalId?: string | null;
}

export interface SupplierProduct {
  /** "Código:" da Tambasa / codproduto da Bartofil. */
  externalCode: string;
  name: string;
  manufacturer?: string;
  /** null = veio sem preço (sessão caiu, "sob consulta", indisponível). */
  price: number | null;
  /** "preço de" / preço cheio, quando o portal informa. */
  listPrice?: number | null;
  isAvailable?: boolean;
  imageUrl?: string;
  productUrl?: string;
}

export type SyncErrorCode =
  | "AUTH_FAILED"
  | "SESSION_EXPIRED"
  | "RATE_LIMITED"
  | "SELECTOR_DRIFT"
  | "TOTAL_DRIFT"
  | "PRICE_OUT_OF_BOUNDS"
  | "PAGE_CAP_HIT"
  | "PERSIST_FAILED"
  | "UNEXPECTED";

export interface SyncError {
  code: SyncErrorCode;
  supplier: SupplierKey;
  category?: string;
  message: string;
  at: Date;
}

/** Erro de autenticação: aborta o fornecedor, sem retry (risco de bloqueio de conta). */
export class SupplierAuthError extends Error {
  readonly code = "AUTH_FAILED" as const;
  constructor(
    readonly supplier: SupplierKey,
    message: string,
  ) {
    super(message);
    this.name = "SupplierAuthError";
  }
}

/** Credencial ausente no ambiente. */
export class SupplierConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SupplierConfigError";
  }
}

export class SyncAlreadyRunningError extends Error {
  constructor() {
    super("Já existe uma sincronização de fornecedor em andamento");
    this.name = "SyncAlreadyRunningError";
  }
}

export interface SyncCtx {
  /** Teto de páginas por categoria; protege contra paginação infinita. */
  maxPages: number;
  /** Chamado a cada página coletada, para progresso ao vivo. */
  onPage?: (page: number, itemCount: number) => void;
  /** Registra um erro não fatal e segue. */
  onError?: (code: SyncErrorCode, message: string) => void;
}

export interface SupplierAdapter {
  readonly key: SupplierKey;
  readonly displayName: string;
  /** Descobre a árvore de categorias do portal (para a tela de seleção). */
  listCategories(): Promise<SupplierCategoryRef[]>;
  /**
   * Itera os produtos de uma categoria, **uma página por yield**.
   * Em ambos os portais o preço vem junto da listagem, então não há um
   * `fetchPrices` separado.
   */
  iterateProducts(cat: SupplierCategoryRef, ctx: SyncCtx): AsyncGenerator<SupplierProduct[]>;
  close(): Promise<void>;
}

export interface SyncCounters {
  seen: number;
  matched: number;
  updated: number;
  unchanged: number;
  skipped: number;
  errors: number;
}

export interface SyncSummary {
  runId: number | null;
  supplier: SupplierKey;
  status: "success" | "partial" | "failed";
  dryRun: boolean;
  startedAt: Date;
  finishedAt: Date;
  categoriesProcessed: number;
  counters: SyncCounters;
  unmatched: { total: number; sample: string[] };
  errors: SyncError[];
}

export interface SyncOptions {
  suppliers?: SupplierKey[];
  dryRun?: boolean;
  trigger?: "cron" | "manual";
  /** Restringe a categorias específicas (externalId). Vazio = todas as habilitadas. */
  categoryExternalIds?: string[];
  maxPagesPerCategory?: number;
}

export function isSupplierKey(value: unknown): value is SupplierKey {
  return typeof value === "string" && (SUPPLIER_KEYS as readonly string[]).includes(value);
}
