// Orquestrador da sincronização de preços dos fornecedores.
//
// Roda FORA da ScrapingQueue: aquela fila é feita para "uma URL, um produto,
// stateless", e executeJob chama scrapeProductData antes mesmo de olhar o tipo
// do job. Aqui é uma sessão autenticada longa varrendo milhares de URLs, onde
// reaproveitar cookie/JWT é justamente o ponto.

import { storage } from "../storage";
import { getAdapter, SUPPLIER_META } from "./registry";
import { SupplierWriter } from "./persist";
import { sleepJitter, errorMessage } from "./util";
import { getTambasaConfig } from "./config";
import {
  SupplierAuthError,
  SupplierConfigError,
  SyncAlreadyRunningError,
  type SupplierCategoryRef,
  type SupplierKey,
  type SyncCounters,
  type SyncError,
  type SyncErrorCode,
  type SyncOptions,
  type SyncSummary,
} from "./types";

export interface SupplierSyncState {
  running: boolean;
  runId: number | null;
  supplier: SupplierKey | null;
  startedAt: Date | null;
  current: { supplier: SupplierKey; category: string; page: number } | null;
  counters: SyncCounters;
  errors: SyncError[];
  lastRuns: SyncSummary[];
}

function emptyCounters(): SyncCounters {
  return { seen: 0, matched: 0, updated: 0, unchanged: 0, skipped: 0, errors: 0 };
}

const state: SupplierSyncState = {
  running: false,
  runId: null,
  supplier: null,
  startedAt: null,
  current: null,
  counters: emptyCounters(),
  errors: [],
  lastRuns: [],
};

export function getSupplierSyncState(): SupplierSyncState {
  return {
    ...state,
    counters: { ...state.counters },
    errors: [...state.errors],
    lastRuns: [...state.lastRuns],
  };
}

/**
 * Executa a sincronização dos fornecedores pedidos.
 * Lança SyncAlreadyRunningError se já houver uma execução em andamento.
 */
export async function runSupplierSync(options: SyncOptions = {}): Promise<SyncSummary[]> {
  if (state.running) throw new SyncAlreadyRunningError();

  const suppliers = options.suppliers?.length ? options.suppliers : (["tambasa", "bartofil"] as SupplierKey[]);
  const dryRun = options.dryRun ?? false;
  const trigger = options.trigger ?? "manual";

  state.running = true;
  state.startedAt = new Date();
  state.counters = emptyCounters();
  state.errors = [];
  state.current = null;

  const summaries: SyncSummary[] = [];

  try {
    for (const supplier of suppliers) {
      state.supplier = supplier;
      const summary = await runOneSupplier(supplier, { ...options, dryRun, trigger });
      summaries.push(summary);
    }
  } finally {
    state.running = false;
    state.supplier = null;
    state.current = null;
    state.runId = null;
    state.lastRuns = summaries;
  }

  return summaries;
}

async function runOneSupplier(
  supplier: SupplierKey,
  options: SyncOptions & { dryRun: boolean; trigger: "cron" | "manual" },
): Promise<SyncSummary> {
  const logPrefix = `[SUPPLIER:${supplier}]`;
  const startedAt = new Date();
  const errors: SyncError[] = [];
  const meta = SUPPLIER_META[supplier];

  const pushError = (code: SyncErrorCode, message: string, category?: string) => {
    const error: SyncError = { code, supplier, category, message, at: new Date() };
    errors.push(error);
    state.errors.push(error);
    state.counters.errors++;
    console.error(`${logPrefix} ${code}${category ? ` [${category}]` : ""}: ${message}`);
  };

  let runId: number | null = null;
  let categoriesProcessed = 0;
  let writer: SupplierWriter | null = null;
  let status: SyncSummary["status"] = "success";

  try {
    const run = await storage.createSupplierSyncRun({
      supplier,
      status: "running",
      trigger: options.trigger,
      dryRun: options.dryRun,
    });
    runId = run.id;
    state.runId = runId;

    // Não criamos o cliente se faltar: criar uma linha nova só produziria um
    // fornecedor sem nenhum produto vinculado, e a varredura inteira acabaria
    // como "0 casados" sem explicar o porquê.
    const supplierClient = await storage.getClientByName(meta.clientName);
    if (!supplierClient) {
      throw new Error(
        `Cliente "${meta.clientName}" não existe em clients — cadastre-o antes de sincronizar`,
      );
    }

    let categories = await storage.getSupplierCategories(supplier, true);
    if (options.categoryExternalIds?.length) {
      const wanted = new Set(options.categoryExternalIds);
      categories = categories.filter((c) => wanted.has(c.externalId));
    }

    if (categories.length === 0) {
      console.log(`${logPrefix} nenhuma categoria habilitada — nada a fazer`);
      const summary = buildSummary(supplier, runId, "success", options.dryRun, startedAt, 0, emptyCounters(), { total: 0, sample: [] }, errors);
      await finishRun(runId, summary);
      return summary;
    }

    const adapter = await getAdapter(supplier);

    writer = new SupplierWriter({
      supplier,
      clientId: supplierClient.id,
      matchStrategy: adapter.matchStrategy,
      dryRun: options.dryRun,
      logPrefix,
    });

    const maxPages = options.maxPagesPerCategory ?? defaultMaxPages(supplier);
    const delayMs = supplier === "tambasa" ? safeTambasaDelay() : 300;

    console.log(
      `${logPrefix} iniciando — ${categories.length} categoria(s), dryRun=${options.dryRun}`,
    );

    try {
      let categoriesWithProducts = 0;

      for (const category of categories) {
        const ref: SupplierCategoryRef = {
          externalId: category.externalId,
          label: category.label,
          parentExternalId: category.parentExternalId,
        };

        try {
          const seenInCategory = await syncCategory({
            adapter,
            ref,
            writer,
            maxPages,
            delayMs,
            supplier,
            logPrefix,
            pushError,
          });

          categoriesProcessed++;
          if (seenInCategory > 0) categoriesWithProducts++;

          // Detector de quebra silenciosa: categoria que trazia produtos e passa
          // a trazer zero indica mudança de layout/API. Registra e segue — nunca
          // zera preço nem inativa produto.
          if (seenInCategory === 0 && (category.lastProductCount ?? 0) > 0) {
            pushError(
              "SELECTOR_DRIFT",
              `categoria trazia ${category.lastProductCount} produtos e agora trouxe 0`,
              category.label,
            );
            status = "partial";
          } else if (!options.dryRun) {
            await storage.markSupplierCategorySynced(category.id, seenInCategory);
          }
        } catch (error) {
          if (error instanceof SupplierAuthError) throw error;
          pushError("UNEXPECTED", errorMessage(error), category.label);
          status = "partial";
        }
      }

      if (categoriesWithProducts === 0 && categories.length > 0) {
        pushError("TOTAL_DRIFT", "nenhuma categoria retornou produtos");
        status = "failed";
      }
    } finally {
      await adapter.close().catch(() => undefined);
    }
  } catch (error) {
    if (error instanceof SupplierConfigError) {
      // Credencial ausente ou malformada não é recusa do portal: separar os
      // dois evita procurar problema de senha quando é variável de ambiente.
      pushError("CONFIG_INVALID", errorMessage(error));
    } else if (error instanceof SupplierAuthError) {
      pushError("AUTH_FAILED", errorMessage(error));
    } else {
      pushError("UNEXPECTED", errorMessage(error));
    }
    status = "failed";
  }

  const counters = writer?.counters ?? emptyCounters();
  const unmatched = writer?.unmatched ?? { total: 0, sample: [] };
  const summary = buildSummary(
    supplier,
    runId,
    status,
    options.dryRun,
    startedAt,
    categoriesProcessed,
    counters,
    unmatched,
    errors,
  );

  console.log(
    `${logPrefix} fim — vistos ${counters.seen}, casados ${counters.matched}, ` +
      `atualizados ${counters.updated}, pulados ${counters.skipped}, erros ${errors.length}`,
  );

  if (runId !== null) await finishRun(runId, summary);
  return summary;
}

interface SyncCategoryArgs {
  adapter: Awaited<ReturnType<typeof getAdapter>>;
  ref: SupplierCategoryRef;
  writer: SupplierWriter;
  maxPages: number;
  delayMs: number;
  supplier: SupplierKey;
  logPrefix: string;
  pushError: (code: SyncErrorCode, message: string, category?: string) => void;
}

/** Percorre uma categoria. Falha de página não derruba a categoria. */
async function syncCategory(args: SyncCategoryArgs): Promise<number> {
  const { adapter, ref, writer, maxPages, delayMs, supplier, logPrefix, pushError } = args;
  let seen = 0;
  let page = 0;

  const iterator = adapter.iterateProducts(ref, {
    maxPages,
    onPage: (pageNumber, itemCount) => {
      state.current = { supplier, category: ref.label, page: pageNumber };
      console.log(`${logPrefix} ${ref.label} — página ${pageNumber}: ${itemCount} item(ns)`);
    },
    onError: (code, message) => pushError(code, message, ref.label),
  });

  for await (const batch of iterator) {
    page++;
    for (const item of batch) {
      try {
        await writer.write(item);
        seen++;
      } catch (error) {
        pushError("PERSIST_FAILED", `${item.externalCode}: ${errorMessage(error)}`, ref.label);
      }
    }
    state.counters = { ...writer.counters };
    if (delayMs > 0) await sleepJitter(delayMs);
  }

  return seen;
}

function buildSummary(
  supplier: SupplierKey,
  runId: number | null,
  status: SyncSummary["status"],
  dryRun: boolean,
  startedAt: Date,
  categoriesProcessed: number,
  counters: SyncCounters,
  unmatched: { total: number; sample: string[] },
  errors: SyncError[],
): SyncSummary {
  return {
    runId,
    supplier,
    status,
    dryRun,
    startedAt,
    finishedAt: new Date(),
    categoriesProcessed,
    counters: { ...counters },
    unmatched,
    errors: [...errors],
  };
}

async function finishRun(runId: number, summary: SyncSummary): Promise<void> {
  try {
    await storage.finishSupplierSyncRun(runId, {
      status: summary.status,
      finishedAt: summary.finishedAt,
      categoriesProcessed: summary.categoriesProcessed,
      productsSeen: summary.counters.seen,
      productsMatched: summary.counters.matched,
      pricesUpdated: summary.counters.updated,
      productsSkipped: summary.counters.skipped,
      unmatchedCodes: summary.unmatched,
      errorDetails: summary.errors.length > 0 ? summary.errors : null,
    });
  } catch (error) {
    console.error(`[SUPPLIER] falha ao gravar o resumo da execução ${runId}:`, errorMessage(error));
  }
}

function defaultMaxPages(supplier: SupplierKey): number {
  if (supplier !== "tambasa") return 200;
  try {
    return getTambasaConfig().maxPages;
  } catch {
    return 50;
  }
}

function safeTambasaDelay(): number {
  try {
    return getTambasaConfig().delayMs;
  } catch {
    return 1500;
  }
}
