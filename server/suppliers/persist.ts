// Gravação dos preços coletados.
//
// É o ÚNICO ponto do módulo que fala com `storage`. O dry-run mora todo aqui:
// espalhar `if (dryRun)` pelos adapters é como uma escrita acaba vazando.

import { storage } from "../storage";
import type { MatchStrategy, SupplierKey, SupplierProduct, SyncCounters } from "./types";
import { normalizeCode } from "./util";

/** Preço acima disso é quase certamente erro de parsing, não reajuste. */
const MAX_PLAUSIBLE_PRICE = 1_000_000;
/** Salto maior que este fator em relação ao preço anterior é suspeito. */
const MAX_PRICE_JUMP_FACTOR = 10;
/** Quantos códigos não casados guardar como amostra no resumo. */
const UNMATCHED_SAMPLE_SIZE = 50;

export type WriteOutcome = "updated" | "unchanged" | "unmatched" | "skipped" | "created";

export interface SupplierWriterOptions {
  supplier: SupplierKey;
  /**
   * Linha de `clients` do fornecedor. Tambasa e Bartofil são concorrentes no
   * sentido do negócio, mas no banco isso vive em `products.is_competitor` +
   * `client_id` — a tabela `competitors` nunca foi usada.
   */
  clientId: number;
  matchStrategy: MatchStrategy;
  dryRun: boolean;
  logPrefix: string;
  /**
   * Cadastrar produto que ainda não existe. Falso por padrão — a regra geral é
   * só atualizar o que já está no catálogo. Verdadeiro para fornecedor que
   * entrou sem catálogo nenhum (Martins), onde "só atualizar" não casaria nada
   * e a coleta terminaria vazia parecendo falha.
   */
  allowProductCreation?: boolean;
  onSkip?: (code: string, reason: string) => void;
}

export class SupplierWriter {
  readonly counters: SyncCounters = {
    seen: 0,
    matched: 0,
    updated: 0,
    unchanged: 0,
    skipped: 0,
    errors: 0,
  };

  private readonly unmatchedSample: string[] = [];
  private unmatchedTotal = 0;
  /**
   * Cache local: uma página de Tambasa traz ~100 produtos da mesma categoria,
   * e getOrCreateCategoryByName é uma consulta ao banco. Sem cache seriam ~100
   * lookups desnecessários por página.
   */
  private readonly categoryIdCache = new Map<string, number>();

  constructor(private readonly options: SupplierWriterOptions) {}

  get unmatched(): { total: number; sample: string[] } {
    return { total: this.unmatchedTotal, sample: [...this.unmatchedSample] };
  }

  async write(item: SupplierProduct): Promise<WriteOutcome> {
    this.counters.seen++;

    const code = normalizeCode(item.externalCode);
    if (!code) {
      this.counters.skipped++;
      return "skipped";
    }

    let product = await storage.findProductBySupplierCode(
      this.options.clientId,
      code,
      this.options.matchStrategy,
    );

    if (!product) {
      // Fornecedor autorizado a criar (catálogo vazio) cadastra o produto;
      // os demais só reportam, para a pessoa decidir importar pelo XLSX.
      if (this.options.allowProductCreation && item.price !== null && item.price > 0) {
        if (this.options.dryRun) {
          this.counters.matched++;
          this.counters.updated++;
          return "created";
        }
        product = await this.criarProduto(item, code);
        this.counters.matched++;
        this.counters.updated++;
        return "created";
      }

      this.counters.skipped++;
      this.unmatchedTotal++;
      if (this.unmatchedSample.length < UNMATCHED_SAMPLE_SIZE) {
        this.unmatchedSample.push(code);
      }
      return "unmatched";
    }

    this.counters.matched++;

    // Categorização: independente do resultado do preço, se o produto já casou
    // e o portal informou a categoria, aproveita para preencher category_id
    // quando estiver vazio. Não sobrescreve categorização manual.
    if (!this.options.dryRun && item.categoryLabel && product.categoryId == null) {
      await this.applyCategoryIfEmpty(product.id, item.categoryLabel);
    }

    // EAN só é preenchido quando está vazio. Sobrescrever seria arriscado: o
    // valor existente pode ter vindo de cadastro manual conferido, e o EAN é
    // o sinal mais forte do motor de match — um errado contamina muito.
    if (!this.options.dryRun && item.ean && !product.ean) {
      await storage.setProductEanIfEmpty(product.id, item.ean);
    }

    const newPrice = item.price;
    if (newPrice === null || newPrice === undefined) {
      this.counters.skipped++;
      this.options.onSkip?.(code, "sem preço na listagem");
      return "skipped";
    }

    const oldPrice = parseFloat(product.basePrice ?? "0");

    if (!this.isPlausible(newPrice, oldPrice, code)) {
      this.counters.skipped++;
      return "skipped";
    }

    const changed = Math.abs(newPrice - oldPrice) > 0.01;

    if (this.options.dryRun) {
      if (changed) this.counters.updated++;
      else this.counters.unchanged++;
      return changed ? "updated" : "unchanged";
    }

    // Histórico de verificação é gravado sempre — inclusive quando o preço não
    // mudou —, espelhando updateProductPricesFromUrl. É o que faz a tela de
    // monitoramento mostrar que a checagem aconteceu.
    await storage.createPriceMonitoringHistory({
      productId: product.id,
      priceOld: oldPrice > 0 ? oldPrice.toFixed(2) : undefined,
      priceNew: newPrice.toFixed(2),
      dateChecked: new Date(),
      source: `supplier_${this.options.supplier}`,
    });

    if (!changed) {
      this.counters.unchanged++;
      return "unchanged";
    }

    await storage.updateProduct(product.id, { basePrice: newPrice.toFixed(2) });

    await storage.upsertSupplierPrice({
      productId: product.id,
      clientId: this.options.clientId,
      price: newPrice.toFixed(2),
      isAvailable: item.isAvailable ?? true,
    });

    await storage.createPriceHistory({
      productId: product.id,
      clientId: this.options.clientId,
      oldPrice: oldPrice > 0 ? oldPrice.toFixed(2) : null,
      newPrice: newPrice.toFixed(2),
      changeReason: `supplier_${this.options.supplier}`,
    });

    this.counters.updated++;
    return "updated";
  }

  /**
   * Cadastra produto novo do fornecedor.
   *
   * isCompetitor não é informado: storage.createProduct deriva da marca, que é
   * a regra única. Passar aqui abriria espaço para divergir dela.
   */
  private async criarProduto(item: SupplierProduct, code: string) {
    const categoryId = item.categoryLabel
      ? (await storage.getOrCreateCategoryByName(item.categoryLabel)).id
      : null;

    return await storage.createProduct({
      sku: code,
      name: item.name,
      manufacturer: item.manufacturer,
      ean: item.ean ?? null,
      clientId: this.options.clientId,
      categoryId,
      basePrice: (item.price ?? 0).toFixed(2),
      imageUrl: item.imageUrl ?? "",
      sourceUrl: item.productUrl ?? "",
      status: "active",
      sourceType: "client",
      isMaster: false,
    } as any);
  }

  private async applyCategoryIfEmpty(productId: number, label: string): Promise<void> {
    const key = label.trim().toLowerCase();
    if (!key) return;

    let categoryId = this.categoryIdCache.get(key);
    if (categoryId === undefined) {
      const category = await storage.getOrCreateCategoryByName(label);
      categoryId = category.id;
      this.categoryIdCache.set(key, categoryId);
    }
    // storage.setProductCategoryIfEmpty devolve false quando já havia
    // categoria — comportamento intencional, é aí que a regra "não sobrescreve"
    // acontece. Nada a logar nesse caso.
    await storage.setProductCategoryIfEmpty(productId, categoryId);
  }

  /**
   * Portão de sanidade. Um bug de parsing não pode envenenar os relatórios de
   * comparação, então preço implausível é descartado em vez de gravado.
   */
  private isPlausible(newPrice: number, oldPrice: number, code: string): boolean {
    let reason: string | null = null;

    if (!Number.isFinite(newPrice) || newPrice <= 0) {
      reason = `preço inválido (${newPrice})`;
    } else if (newPrice > MAX_PLAUSIBLE_PRICE) {
      reason = `preço acima do teto (${newPrice})`;
    } else if (oldPrice > 0 && newPrice > oldPrice * MAX_PRICE_JUMP_FACTOR) {
      reason = `salto de ${oldPrice} para ${newPrice} (>${MAX_PRICE_JUMP_FACTOR}x)`;
    }

    if (reason) {
      console.warn(`${this.options.logPrefix} PRICE_OUT_OF_BOUNDS código ${code}: ${reason}`);
      this.options.onSkip?.(code, reason);
      return false;
    }

    return true;
  }
}
