import {
  users,
  categories,
  clients,
  competitors,
  products,
  prices,
  uploadHistory,
  apiKeys,
  priceHistory,
  type User,
  type UpsertUser,
  type Category,
  type InsertCategory,
  type Client,
  type InsertClient,
  type Competitor,
  type InsertCompetitor,
  type Product,
  type InsertProduct,
  type Price,
  type InsertPrice,
  type UploadHistory,
  type InsertUploadHistory,
  type ApiKey,
  type InsertApiKey,
  type PriceHistory,
  type InsertPriceHistory,
  type PriceMonitoringHistory,
  type InsertPriceMonitoringHistory,
  priceMonitoringHistory,
  reportsHistory,
  type ReportsHistory,
  type InsertReportsHistory,
  supplierCategories,
  type SupplierCategory,
  type InsertSupplierCategory,
  supplierSyncRuns,
  type SupplierSyncRun,
  type InsertSupplierSyncRun,
  ownBrands,
  type OwnBrand,
  type InsertOwnBrand,
  normalizeBrand,
  supplierSessions,
  type SupplierSession,
  type InsertSupplierSession,
} from "@shared/schema";
import { db } from "./db";
import { eq, sql, desc, asc, and, or, ilike, count, isNull, like, isNotNull, ne, gte, lte, inArray } from "drizzle-orm";
import crypto from "crypto";
import { scrapeProductData } from "./scraper";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  createUser(user: Omit<UpsertUser, 'id'> & { password?: string }): Promise<User>;
  updateUser(id: string, user: Partial<UpsertUser> & { password?: string }): Promise<User>;
  deleteUser(id: string): Promise<void>;

  // Category operations
  getCategories(): Promise<Category[]>;
  getDistinctManufacturers(): Promise<string[]>;
  getOrCreateCategoryByName(name: string): Promise<Category>;
  setProductCategoryIfEmpty(productId: number, categoryId: number): Promise<boolean>;

  // Sessões manuais de fornecedor (Martins: login com 2FA)
  getSupplierSession(supplier: string): Promise<SupplierSession | undefined>;
  saveSupplierSession(session: InsertSupplierSession): Promise<SupplierSession>;
  markSupplierSessionResult(supplier: string, ok: boolean, reason?: string): Promise<void>;
  deleteSupplierSession(supplier: string): Promise<void>;

  // Marcas próprias — definem o que é (e o que não é) concorrente
  getOwnBrands(includeInactive?: boolean): Promise<OwnBrand[]>;
  createOwnBrand(brand: InsertOwnBrand): Promise<OwnBrand>;
  updateOwnBrand(id: number, patch: Partial<InsertOwnBrand>): Promise<OwnBrand | undefined>;
  deleteOwnBrand(id: number): Promise<void>;
  isOwnBrand(manufacturer: string | null | undefined): Promise<boolean>;
  deriveIsCompetitor(manufacturer: string | null | undefined): Promise<boolean>;
  recomputeCompetitorFlags(): Promise<{ updated: number; ownBrand: number; competitor: number }>;
  getCategory(id: number): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category>;
  deleteCategory(id: number): Promise<void>;

  // Client operations
  getClients(): Promise<Client[]>;
  getClient(id: number): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<InsertClient>): Promise<Client>;
  deleteClient(id: number): Promise<void>;
  generateApiKey(clientId: number): Promise<string>;
  setMasterClient(clientId: number): Promise<Client>;
  getMasterClient(): Promise<Client | undefined>;

  // Competitor operations
  getCompetitors(): Promise<Competitor[]>;
  getCompetitor(id: number): Promise<Competitor | undefined>;
  createCompetitor(competitor: InsertCompetitor): Promise<Competitor>;
  updateCompetitor(id: number, competitor: Partial<InsertCompetitor>): Promise<Competitor>;
  deleteCompetitor(id: number): Promise<void>;

  // Product operations
  getProducts(filters?: {
    categoryId?: number;
    status?: string;
    search?: string;
    hasSourceUrl?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ products: Product[]; total: number }>;
  getProduct(id: number): Promise<Product | undefined>;
  getProductBySku(sku: string): Promise<Product | undefined>;
  getProductsByMatchGroup(matchGroup: string): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: number): Promise<void>;
  createProductFromUrl(url: string, isMaster: boolean, masterProductId?: number): Promise<Product>;
  createProductFromPreview(productData: any, isMaster: boolean, masterProductId?: number): Promise<Product>;
  getProductCompetitors(masterProductId: number): Promise<Product[]>;
  updateProductPricesFromUrl(): Promise<void>;

  // Price operations
  getPrices(filters?: {
    productId?: number;
    clientId?: number;
    limit?: number;
    offset?: number;
  }): Promise<Price[]>;
  getPrice(id: number): Promise<Price | undefined>;
  createPrice(price: InsertPrice): Promise<Price>;
  updatePrice(id: number, price: Partial<InsertPrice>): Promise<Price>;
  deletePrice(id: number): Promise<void>;
  bulkUpsertPrices(prices: InsertPrice[]): Promise<void>;
  getProductPriceComparison(productId: number): Promise<Array<Price & { client: Client }>>;
  getMatchGroupComparison(matchGroup: string): Promise<Array<{
    product: Product;
    prices: Array<Price & { client: Client }>;
    bestPrice: Price & { client: Client };
    savings: number;
  }>>;
  getBestPrices(): Promise<Array<{
    product: Product;
    prices: Array<Price & { client: Client }>;
    bestPrice: Price & { client: Client };
    savings: number;
  }>>;

  // Upload history operations
  getUploadHistory(userId: string): Promise<UploadHistory[]>;
  createUploadHistory(upload: InsertUploadHistory): Promise<UploadHistory>;

  // API Key operations
  getApiKeys(userId: string): Promise<ApiKey[]>;
  createApiKey(apiKey: InsertApiKey): Promise<ApiKey>;
  deleteApiKey(id: number): Promise<void>;
  validateApiKey(keyHash: string): Promise<ApiKey | undefined>;

  // Dashboard stats
  getDashboardStats(): Promise<{
    totalProducts: number;
    activeClients: number;
    todayUpdates: number;
  }>;

  // Product history
  getProductHistory(productId: number): Promise<Array<PriceHistory & { client: Client }>>;
  createPriceHistory(history: InsertPriceHistory): Promise<PriceHistory>;
  
  // Price monitoring history
  getPriceMonitoringHistory(productId?: number): Promise<Array<PriceMonitoringHistory & { product: Product }>>;
  createPriceMonitoringHistory(history: InsertPriceMonitoringHistory): Promise<PriceMonitoringHistory>;

  // Supplier sync (Tambasa / Bartofil)
  getClientByName(name: string): Promise<Client | undefined>;
  findProductBySupplierCode(
    clientId: number,
    code: string,
    strategy: "sku" | "source-url",
  ): Promise<Product | undefined>;
  upsertSupplierPrice(input: {
    productId: number;
    clientId: number;
    price: string;
    isAvailable?: boolean;
  }): Promise<Price>;
  getSupplierCategories(supplier?: string, onlyEnabled?: boolean): Promise<SupplierCategory[]>;
  upsertSupplierCategories(rows: InsertSupplierCategory[]): Promise<{ total: number; created: number }>;
  setSupplierCategoryEnabled(id: number, enabled: boolean): Promise<SupplierCategory | undefined>;
  markSupplierCategorySynced(id: number, productCount: number): Promise<void>;
  createSupplierSyncRun(run: InsertSupplierSyncRun): Promise<SupplierSyncRun>;
  finishSupplierSyncRun(id: number, patch: Partial<InsertSupplierSyncRun>): Promise<void>;
  getSupplierSyncRuns(supplier?: string, limit?: number): Promise<SupplierSyncRun[]>;

  // Recent products
  getRecentlyUpdatedProducts(): Promise<Array<Product & { lastPriceUpdate: Date; client?: Client }>>;

  // Master products with competitors
  getMasterProductsWithCompetitors(): Promise<Array<{
    id: number;
    name: string;
    basePrice: string;
    imageUrl: string;
    sourceUrl: string;
    sku: string;
    competitors: Array<{
      id: number;
      name: string;
      basePrice: string;
      sourceUrl: string;
      sku: string;
    }>;
  }>>;

  // Data cleanup operations
  getCleanupStats(): Promise<{
    duplicateProducts: number;
    orphanedPrices: number;
    inconsistentPrices: number;
    emptyCategories: number;
  }>;
  getDuplicateProducts(): Promise<Array<{
    id: number;
    sku: string;
    name: string;
    duplicateCount: number;
    duplicateIds: number[];
  }>>;
  getOrphanedPrices(): Promise<Array<{
    id: number;
    price: string;
    productId: number | null;
    clientId: number | null;
    productName?: string;
    clientName?: string;
  }>>;
  performCleanup(type: string): Promise<{ cleaned: number }>;

  // Reports generation functions
  generatePriceComparisonReport(filters?: any): Promise<{
    summary: {
      totalProducts: number;
      totalClients: number;
      averageSavings: number;
      lastUpdated: Date;
      clientStatistics: Array<{
        clientName: string;
        clientType: string;
        masterProducts: number;
        competitorProducts: number;
      }>;
    };
    data: Array<{
      productId: number;
      productName: string;
      sku: string;
      masterPrice: number;
      masterClientName: string;
      masterClientType: string;
      competitorPrices: Array<{
        clientName: string;
        clientType: string;
        price: number;
        savings: number;
        savingsPercentage: number;
      }>;
    }>;
  }>;

  generateSavingsAnalysisReport(filters?: any): Promise<{
    summary: {
      totalSavings: number;
      averageSavingsPercentage: number;
      bestPerformingClient: string;
      totalProducts: number;
    };
    data: Array<{
      clientName: string;
      totalSavings: number;
      averageSavings: number;
      productsCount: number;
      savingsPercentage: number;
    }>;
  }>;

  generateClientPerformanceReport(filters?: any): Promise<{
    summary: {
      totalClients: number;
      averageCompetitiveIndex: number;
      mostCompetitiveClient: string;
      totalProducts: number;
    };
    data: Array<{
      clientId: number;
      clientName: string;
      productsCount: number;
      averagePrice: number;
      competitiveIndex: number;
      marketShare: number;
    }>;
  }>;

  generateProductTrendsReport(filters?: any): Promise<{
    summary: {
      totalProducts: number;
      averagePriceChange: number;
      topTrendingProduct: string;
      bottomTrendingProduct: string;
    };
    data: Array<{
      productId: number;
      productName: string;
      sku: string;
      currentPrice: number;
      priceChange: number;
      priceChangePercentage: number;
      lastUpdated: Date;
    }>;
  }>;

  generateCategoryAnalysisReport(filters?: any): Promise<{
    summary: {
      totalCategories: number;
      averagePriceByCategory: number;
      bestPerformingCategory: string;
      totalProducts: number;
    };
    data: Array<{
      categoryId: number;
      categoryName: string;
      productsCount: number;
      averagePrice: number;
      totalSavings: number;
      marketShare: number;
    }>;
  }>;

  generateMonthlySummaryReport(filters?: any): Promise<{
    summary: {
      month: string;
      totalProducts: number;
      totalClients: number;
      totalSavings: number;
      averageSavingsPercentage: number;
    };
    data: {
      productsAdded: number;
      pricesUpdated: number;
      newClients: number;
      topSavingsClient: string;
      topSavingsProduct: string;
    };
  }>;

  getReportsHistory(): Promise<Array<{
    id: number;
    reportType: string;
    reportTitle: string;
    generatedAt: Date;
    generatedBy: string;
    parameters: any;
    recordCount: number;
    fileFormat: string;
    filePath: string;
  }>>;

  getReportHistoryById(id: number): Promise<{
    id: number;
    reportType: string;
    reportTitle: string;
    generatedBy: string;
    parameters: any;
    recordCount: number;
    fileFormat: string;
    filePath: string;
    generatedAt: Date;
    createdAt: Date;
    userEmail: string | null;
  } | undefined>;

  createReportHistory(report: InsertReportsHistory): Promise<ReportsHistory>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(asc(users.firstName));
  }

  async createUser(userData: Omit<UpsertUser, 'id'> & { password?: string }): Promise<User> {
    const id = crypto.randomUUID();
    let passwordHash: string | undefined;
    
    if (userData.password) {
      passwordHash = crypto.createHash('sha256').update(userData.password).digest('hex');
    }

    const [user] = await db
      .insert(users)
      .values({
        id,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        profileImageUrl: userData.profileImageUrl,
        role: userData.role || 'visitante',
        passwordHash,
      })
      .returning();
    return user;
  }

  async updateUser(id: string, userData: Partial<UpsertUser> & { password?: string }): Promise<User> {
    const updateData: any = {
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      profileImageUrl: userData.profileImageUrl,
      role: userData.role,
      updatedAt: new Date(),
    };

    if (userData.password) {
      updateData.passwordHash = crypto.createHash('sha256').update(userData.password).digest('hex');
    }

    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Category operations
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories).orderBy(categories.name);
  }

  // ---------------------------------------------------------------------------
  // Sessões manuais de fornecedor
  // ---------------------------------------------------------------------------

  async getSupplierSession(supplier: string): Promise<SupplierSession | undefined> {
    const [found] = await db
      .select()
      .from(supplierSessions)
      .where(eq(supplierSessions.supplier, supplier))
      .limit(1);
    return found;
  }

  /** Capturar de novo substitui a sessão anterior — só existe uma viva por fornecedor. */
  async saveSupplierSession(session: InsertSupplierSession): Promise<SupplierSession> {
    const now = new Date();
    const [saved] = await db
      .insert(supplierSessions)
      .values({ ...session, capturedAt: now })
      .onConflictDoUpdate({
        target: supplierSessions.supplier,
        set: {
          accessToken: session.accessToken,
          clientId: session.clientId ?? null,
          bodyTemplate: session.bodyTemplate ?? null,
          capturedAt: now,
          // Sessão nova começa sem histórico de falha, senão a tela seguiria
          // mostrando "expirada" depois de já ter sido renovada.
          lastFailedAt: null,
          lastFailureReason: null,
          updatedAt: now,
        },
      })
      .returning();
    return saved;
  }

  async markSupplierSessionResult(supplier: string, ok: boolean, reason?: string): Promise<void> {
    const now = new Date();
    await db
      .update(supplierSessions)
      .set(
        ok
          ? { lastOkAt: now, lastFailedAt: null, lastFailureReason: null, updatedAt: now }
          : { lastFailedAt: now, lastFailureReason: reason ?? null, updatedAt: now },
      )
      .where(eq(supplierSessions.supplier, supplier));
  }

  async deleteSupplierSession(supplier: string): Promise<void> {
    await db.delete(supplierSessions).where(eq(supplierSessions.supplier, supplier));
  }

  // ---------------------------------------------------------------------------
  // Marcas próprias
  // ---------------------------------------------------------------------------

  async getOwnBrands(includeInactive = false): Promise<OwnBrand[]> {
    const base = db.select().from(ownBrands);
    const query = includeInactive ? base : base.where(eq(ownBrands.active, true));
    return await query.orderBy(asc(ownBrands.name));
  }

  async createOwnBrand(brand: InsertOwnBrand): Promise<OwnBrand> {
    const normalizedName = normalizeBrand(brand.name);
    if (!normalizedName) {
      throw new Error("Nome de marca inválido");
    }

    // Reativa em vez de duplicar: a marca pode ter sido desativada antes.
    const [created] = await db
      .insert(ownBrands)
      .values({ name: brand.name.trim(), normalizedName, active: brand.active ?? true })
      .onConflictDoUpdate({
        target: ownBrands.normalizedName,
        set: { name: brand.name.trim(), active: brand.active ?? true, updatedAt: new Date() },
      })
      .returning();
    return created;
  }

  async updateOwnBrand(id: number, patch: Partial<InsertOwnBrand>): Promise<OwnBrand | undefined> {
    const values: Record<string, unknown> = { updatedAt: new Date() };
    if (patch.name !== undefined) {
      values.name = patch.name.trim();
      values.normalizedName = normalizeBrand(patch.name);
    }
    if (patch.active !== undefined) values.active = patch.active;

    const [updated] = await db
      .update(ownBrands)
      .set(values)
      .where(eq(ownBrands.id, id))
      .returning();
    return updated;
  }

  async deleteOwnBrand(id: number): Promise<void> {
    await db.delete(ownBrands).where(eq(ownBrands.id, id));
  }

  async isOwnBrand(manufacturer: string | null | undefined): Promise<boolean> {
    const normalized = normalizeBrand(manufacturer);
    if (!normalized) return false; // sem marca não há como afirmar que é nossa

    const [found] = await db
      .select({ id: ownBrands.id })
      .from(ownBrands)
      .where(and(eq(ownBrands.normalizedName, normalized), eq(ownBrands.active, true)))
      .limit(1);
    return Boolean(found);
  }

  /** Regra central: concorrente é tudo que NÃO é marca própria. */
  async deriveIsCompetitor(manufacturer: string | null | undefined): Promise<boolean> {
    return !(await this.isOwnBrand(manufacturer));
  }

  /**
   * Reaplica a regra a todo o catálogo. Necessário depois de mexer em
   * own_brands, e útil como conserto se algum caminho de escrita esquecer de
   * derivar a flag.
   *
   * A normalização aqui é a versão SQL de `normalizeBrand` (shared/schema.ts).
   * As duas precisam concordar — o índice funcional criado em
   * sql/own-brands.sql usa exatamente esta expressão.
   */
  async recomputeCompetitorFlags(): Promise<{ updated: number; ownBrand: number; competitor: number }> {
    const expected = sql`NOT EXISTS (
      SELECT 1 FROM ${ownBrands} b
       WHERE b.active
         AND b.normalized_name =
             regexp_replace(lower(btrim(COALESCE(${products.manufacturer}, ''))), '^marca:\\s*', '')
    )`;

    // Só toca em linha que realmente muda: reescrever tudo carimbaria
    // updated_at em 10 mil produtos a cada execução.
    const updated = await db
      .update(products)
      .set({ isCompetitor: expected, updatedAt: new Date() })
      .where(sql`${products.isCompetitor} IS DISTINCT FROM ${expected}`)
      .returning({ id: products.id });

    const [totals] = await db
      .select({
        ownBrand: sql<number>`COUNT(*) FILTER (WHERE NOT ${products.isCompetitor})::int`,
        competitor: sql<number>`COUNT(*) FILTER (WHERE ${products.isCompetitor})::int`,
      })
      .from(products);

    return {
      updated: updated.length,
      ownBrand: Number(totals?.ownBrand ?? 0),
      competitor: Number(totals?.competitor ?? 0),
    };
  }

  /**
   * Busca categoria por nome (case-insensitive) ou cria se não existir.
   * Usado pela sincronização de fornecedores para propagar categoria do portal
   * para produtos que ainda não estão categorizados no nosso banco.
   */
  async getOrCreateCategoryByName(name: string): Promise<Category> {
    const trimmed = name.trim();
    const [existing] = await db
      .select()
      .from(categories)
      .where(ilike(categories.name, trimmed))
      .limit(1);
    if (existing) return existing;

    const [created] = await db
      .insert(categories)
      .values({ name: trimmed })
      .returning();
    return created;
  }

  /**
   * Grava `category_id` apenas se estiver NULL. Retorna true se atualizou.
   *
   * Não sobrescrever é regra: se alguém categorizou manualmente (agora ou no
   * futuro), a sincronização automática do fornecedor não pode reverter isso
   * silenciosamente na próxima varredura.
   */
  async setProductCategoryIfEmpty(productId: number, categoryId: number): Promise<boolean> {
    const result = await db
      .update(products)
      .set({ categoryId, updatedAt: new Date() })
      .where(and(eq(products.id, productId), isNull(products.categoryId)))
      .returning({ id: products.id });
    return result.length > 0;
  }

  /**
   * Valores distintos de manufacturer para popular o filtro "Marca".
   * Não há tabela própria de marcas — o campo é texto livre em `products`.
   */
  async getDistinctManufacturers(): Promise<string[]> {
    const rows = await db
      .selectDistinct({ manufacturer: products.manufacturer })
      .from(products)
      .where(and(isNotNull(products.manufacturer), ne(products.manufacturer, '')))
      .orderBy(asc(products.manufacturer));
    return rows.map((r) => r.manufacturer as string);
  }

  async getCategory(id: number): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  }

  async updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category> {
    const [updatedCategory] = await db
      .update(categories)
      .set({ ...category, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning();
    return updatedCategory;
  }

  async deleteCategory(id: number): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  // Client operations
  async getClients(): Promise<Client[]> {
    return await db.select().from(clients).orderBy(clients.name);
  }

  async getClient(id: number): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }

  async createClient(client: InsertClient): Promise<Client> {
    const [newClient] = await db.insert(clients).values(client).returning();
    return newClient;
  }

  async updateClient(id: number, client: Partial<InsertClient>): Promise<Client> {
    const [updatedClient] = await db
      .update(clients)
      .set({ ...client, updatedAt: new Date() })
      .where(eq(clients.id, id))
      .returning();
    return updatedClient;
  }

  async deleteClient(id: number): Promise<void> {
    await db.delete(clients).where(eq(clients.id, id));
  }

  async generateApiKey(clientId: number): Promise<string> {
    const apiKey = `pk_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
    await db.update(clients).set({ apiKey }).where(eq(clients.id, clientId));
    return apiKey;
  }

  async setMasterClient(clientId: number): Promise<Client> {
    // First, remove master status from all clients
    await db.update(clients).set({ isMaster: false });
    
    // Then set the new master client
    const [updatedClient] = await db
      .update(clients)
      .set({ isMaster: true })
      .where(eq(clients.id, clientId))
      .returning();
    
    if (!updatedClient) {
      throw new Error("Cliente não encontrado");
    }
    
    return updatedClient;
  }

  async getMasterClient(): Promise<Client | undefined> {
    const [masterClient] = await db
      .select()
      .from(clients)
      .where(eq(clients.isMaster, true))
      .limit(1);
    
    return masterClient;
  }

  // Competitor operations
  async getCompetitors(): Promise<Competitor[]> {
    return await db.select().from(competitors).orderBy(asc(competitors.name));
  }

  async getCompetitor(id: number): Promise<Competitor | undefined> {
    const result = await db.select().from(competitors).where(eq(competitors.id, id));
    return result[0];
  }

  async createCompetitor(competitor: InsertCompetitor): Promise<Competitor> {
    const result = await db.insert(competitors).values(competitor).returning();
    return result[0];
  }

  async updateCompetitor(id: number, competitor: Partial<InsertCompetitor>): Promise<Competitor> {
    const result = await db.update(competitors).set(competitor).where(eq(competitors.id, id)).returning();
    return result[0];
  }

  async deleteCompetitor(id: number): Promise<void> {
    await db.delete(competitors).where(eq(competitors.id, id));
  }

  async createProductFromUrl(url: string, isMaster: boolean, masterProductId?: number): Promise<Product> {
    const { scrapeProductData } = await import("./scraper-v2");
    const scrapedData = await scrapeProductData(url);
    
    if (!scrapedData.success || !scrapedData.nome_produto) {
      throw new Error("Não foi possível extrair o nome do produto da URL");
    }

    // Get master client
    const masterClient = await this.getMasterClient();
    if (!masterClient) {
      throw new Error("Nenhum cliente master foi configurado");
    }

    // Generate unique SKU if not found or if it already exists
    let sku = scrapedData.sku || `AUTO-${Date.now()}`;
    
    // Check if SKU already exists and make it unique
    const existingProduct = await this.getProductBySku(sku);
    if (existingProduct) {
      sku = `${sku}-${Date.now()}`;
    }

    const productData: InsertProduct = {
      sku: sku,
      name: scrapedData.nome_produto,
      description: scrapedData.description || "",
      manufacturer: scrapedData.marca || "",
      basePrice: scrapedData.valor_principal?.toString() || "0",
      imageUrl: scrapedData.link_imagem || "",
      sourceUrl: url,
      isMaster: isMaster,
      masterProductId: masterProductId,
      clientId: isMaster ? masterClient.id : undefined,
      status: "active"
    };

    const [product] = await db.insert(products).values(productData).returning();
    
    // Create initial price record if price was scraped
    if (scrapedData.valor_principal && scrapedData.valor_principal > 0) {
      await db.insert(prices).values({
        productId: product.id,
        clientId: isMaster ? masterClient.id : undefined,
        price: scrapedData.valor_principal.toString(),
        currency: "BRL",
        extractedAt: new Date()
      });
    }

    return product;
  }

  async createProductFromPreview(productData: any, isMaster: boolean, masterProductId?: number): Promise<Product> {
    // Get master client
    const masterClient = await this.getMasterClient();
    if (!masterClient) {
      throw new Error("Nenhum cliente master foi configurado");
    }

    // Check if SKU already exists and make it unique
    let sku = productData.sku;
    const existingProduct = await this.getProductBySku(sku);
    if (existingProduct) {
      sku = `${sku}-${Date.now()}`;
    }

    const insertData: InsertProduct = {
      sku: sku,
      name: productData.name,
      description: productData.description || "",
      manufacturer: productData.manufacturer || "",
      basePrice: productData.basePrice || "0",
      imageUrl: productData.imageUrl || "",
      sourceUrl: productData.sourceUrl,
      isMaster: isMaster,
      masterProductId: masterProductId,
      clientId: isMaster ? masterClient.id : undefined,
      categoryId: productData.categoryId || undefined,
      status: "active"
    };

    const [product] = await db.insert(products).values(insertData).returning();
    
    // Create initial price record if price was provided
    if (productData.basePrice && parseFloat(productData.basePrice) > 0) {
      await db.insert(prices).values({
        productId: product.id,
        clientId: isMaster ? masterClient.id : undefined,
        price: productData.basePrice,
        sourceType: isMaster ? "client" : "competitor",
        lastUpdated: new Date()
      });
    }

    return product;
  }

  async getProductCompetitors(masterProductId: number): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(eq(products.masterProductId, masterProductId))
      .orderBy(desc(products.createdAt));
  }

  async updateProductPricesFromUrl(): Promise<void> {
    // Produtos com URL de origem de verdade.
    //
    // O filtro precisa excluir string vazia, não só NULL: os 475 produtos
    // master têm source_url = '', que passa em IS NOT NULL. Sem isso, cada
    // execução tentava raspar uma URL em branco para todos eles e gravava 475
    // falhas — a maior parte do lixo em price_monitoring_history.
    const urlProducts = await db
      .select()
      .from(products)
      .where(and(isNotNull(products.sourceUrl), ne(products.sourceUrl, "")));

    console.log(`[PRICE MONITOR] Found ${urlProducts.length} URL-based products to update`);

    for (const product of urlProducts) {
      try {
        console.log(`[PRICE MONITOR] Checking product: ${product.name} (${product.sourceUrl})`);
        
        const { scrapeProductData } = await import("./scraper-v2");
        const scrapedData = await scrapeProductData(product.sourceUrl!);
        
        if (scrapedData.success && scrapedData.valor_principal && scrapedData.valor_principal > 0) {
          const newPrice = parseFloat(scrapedData.valor_principal.toString());
          const currentPrice = parseFloat(product.basePrice || "0");
          
          // Create monitoring history record
          await this.createPriceMonitoringHistory({
            productId: product.id,
            priceOld: currentPrice > 0 ? currentPrice.toString() : undefined,
            priceNew: newPrice.toString(),
            dateChecked: new Date(),
            source: "url_monitoring"
          });

          // Only update if price changed significantly (avoid floating point precision issues)
          if (Math.abs(newPrice - currentPrice) > 0.01) {
            // Update product's base price
            await db
              .update(products)
              .set({ basePrice: newPrice.toString(), updatedAt: new Date() })
              .where(eq(products.id, product.id));

            // Create new price record
            await db.insert(prices).values({
              productId: product.id,
              clientId: product.clientId,
              competitorId: product.competitorId,
              sourceType: product.sourceType === "competitor" ? "competitor" : "client",
              price: newPrice.toString(),
              lastUpdated: new Date()
            });

            // Create price history record.
            // priceHistory.clientId é NOT NULL: produto de concorrente não tem cliente,
            // então o histórico fica só em priceMonitoringHistory (gravado acima).
            if (product.clientId != null) {
              await this.createPriceHistory({
                productId: product.id,
                clientId: product.clientId,
                oldPrice: currentPrice.toString(),
                newPrice: newPrice.toString(),
                changeReason: "url_monitoring"
              });
            }

            console.log(`[PRICE MONITOR] Price changed for ${product.name}: R$ ${currentPrice} -> R$ ${newPrice}`);
          } else {
            console.log(`[PRICE MONITOR] No significant price change for ${product.name}: R$ ${newPrice}`);
          }
        } else {
          console.log(`[PRICE MONITOR] No valid price found for ${product.name}`);
        }
      } catch (error) {
        console.error(`[PRICE MONITOR] Error updating prices for product ${product.name}:`, error);
        
        // Log the error in monitoring history
        try {
          await this.createPriceMonitoringHistory({
            productId: product.id,
            priceNew: "0",
            dateChecked: new Date(),
            source: "url_monitoring_error"
          });
        } catch (historyError) {
          console.error(`[PRICE MONITOR] Failed to log error in history:`, historyError);
        }
      }
    }
    
    console.log(`[PRICE MONITOR] Price monitoring completed`);
  }

  async getPriceMonitoringHistory(productId?: number): Promise<Array<PriceMonitoringHistory & { product: Product }>> {
    try {
      let query = db
        .select({
          id: priceMonitoringHistory.id,
          productId: priceMonitoringHistory.productId,
          priceOld: priceMonitoringHistory.priceOld,
          priceNew: priceMonitoringHistory.priceNew,
          dateChecked: priceMonitoringHistory.dateChecked,
          source: priceMonitoringHistory.source,
          createdAt: priceMonitoringHistory.createdAt,
          product: products
        })
        .from(priceMonitoringHistory)
        .innerJoin(products, eq(priceMonitoringHistory.productId, products.id))
        .orderBy(desc(priceMonitoringHistory.dateChecked));

      if (productId) {
        query = query.where(eq(priceMonitoringHistory.productId, productId));
      }

      const result = await query.limit(100);
      return result || [];
    } catch (error) {
      console.error('Error fetching price monitoring history:', error);
      return [];
    }
  }

  async createPriceMonitoringHistory(history: InsertPriceMonitoringHistory): Promise<PriceMonitoringHistory> {
    const [result] = await db.insert(priceMonitoringHistory).values(history).returning();
    return result;
  }

  // ---------------------------------------------------------------------------
  // Supplier sync (Tambasa / Bartofil)
  // ---------------------------------------------------------------------------

  async getClientByName(name: string): Promise<Client | undefined> {
    const [found] = await db.select().from(clients).where(ilike(clients.name, name)).limit(1);
    return found;
  }

  /**
   * Casa o código do portal com um produto já cadastrado deste fornecedor.
   * Nunca cria produto — a automação só atualiza o que já existe.
   *
   * A chave muda por fornecedor, e isso foi conferido contra os dados reais:
   *
   *   Tambasa  (`sku`)        products.sku guarda o código do portal com os
   *                           zeros à esquerda ("017392").
   *   Bartofil (`source-url`) products.sku guarda o código do FABRICANTE
   *                           ("47.43-bartofil"); o código do portal só existe
   *                           no fim da source_url (".../chave-grifo-...-94732").
   *
   * A estratégia define a chave primária; a outra fica como desempate, porque
   * cadastro manual às vezes foge do padrão.
   */
  async findProductBySupplierCode(
    clientId: number,
    code: string,
    strategy: "sku" | "source-url",
  ): Promise<Product | undefined> {
    const raw = code.trim();
    if (!raw) return undefined;

    // A Tambasa exibe com padding ("017571") e a Bartofil não ("17571").
    const variants = Array.from(new Set([raw, raw.replace(/^0+/, "")])).filter(Boolean);

    const bySku = async () => {
      const [found] = await db
        .select()
        .from(products)
        .where(
          and(
            eq(products.clientId, clientId),
            or(inArray(products.sku, variants), inArray(products.brandSku, variants)),
          ),
        )
        .limit(1);
      return found;
    };

    // Sufixo, não "contém": `%-94732` evita casar 94732 com o produto 194732.
    const byUrl = async () => {
      const [found] = await db
        .select()
        .from(products)
        .where(
          and(
            eq(products.clientId, clientId),
            isNotNull(products.sourceUrl),
            or(...variants.map((v) => like(products.sourceUrl, `%-${v}`))),
          ),
        )
        .limit(1);
      return found;
    };

    return strategy === "sku"
      ? ((await bySku()) ?? (await byUrl()))
      : ((await byUrl()) ?? (await bySku()));
  }

  /**
   * Grava o preço do fornecedor com read-then-write.
   *
   * Deliberadamente NÃO usa onConflictDoUpdate: não existe unique index em
   * (product_id, client_id) — é exatamente o que quebra `bulkUpsertPrices`.
   */
  async upsertSupplierPrice(input: {
    productId: number;
    clientId: number;
    price: string;
    isAvailable?: boolean;
  }): Promise<Price> {
    const [existing] = await db
      .select()
      .from(prices)
      .where(and(eq(prices.productId, input.productId), eq(prices.clientId, input.clientId)))
      .limit(1);

    const now = new Date();

    if (existing) {
      const [updated] = await db
        .update(prices)
        .set({
          price: input.price,
          isAvailable: input.isAvailable ?? true,
          lastUpdated: now,
          updatedAt: now,
        })
        .where(eq(prices.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(prices)
      .values({
        productId: input.productId,
        clientId: input.clientId,
        // "client" acompanha o que já existe: os produtos de fornecedor têm
        // source_type='client' e a distinção de concorrente vive em
        // products.is_competitor.
        sourceType: "client",
        price: input.price,
        discount: "0",
        isAvailable: input.isAvailable ?? true,
        lastUpdated: now,
        updatedAt: now,
      })
      .returning();
    return created;
  }

  async getSupplierCategories(supplier?: string, onlyEnabled = false): Promise<SupplierCategory[]> {
    const conditions = [];
    if (supplier) conditions.push(eq(supplierCategories.supplier, supplier));
    if (onlyEnabled) conditions.push(eq(supplierCategories.enabled, true));

    const base = db.select().from(supplierCategories);
    const query = conditions.length > 0 ? base.where(and(...conditions)) : base;

    return await query.orderBy(asc(supplierCategories.label));
  }

  /**
   * Upsert das categorias descobertas no portal.
   * NÃO sobrescreve `enabled`: redescobrir categorias não pode desmarcar a
   * seleção que a pessoa fez na tela.
   */
  async upsertSupplierCategories(rows: InsertSupplierCategory[]): Promise<{ total: number; created: number }> {
    if (rows.length === 0) return { total: 0, created: 0 };

    const supplier = rows[0].supplier;
    const existing = await db
      .select({ externalId: supplierCategories.externalId })
      .from(supplierCategories)
      .where(eq(supplierCategories.supplier, supplier));

    const known = new Set(existing.map((r) => r.externalId));
    const created = rows.filter((r) => !known.has(r.externalId)).length;

    for (const row of rows) {
      await db
        .insert(supplierCategories)
        .values(row)
        .onConflictDoUpdate({
          target: [supplierCategories.supplier, supplierCategories.externalId],
          set: {
            label: row.label,
            parentExternalId: row.parentExternalId ?? null,
            updatedAt: new Date(),
          },
        });
    }

    return { total: rows.length, created };
  }

  async setSupplierCategoryEnabled(id: number, enabled: boolean): Promise<SupplierCategory | undefined> {
    const [updated] = await db
      .update(supplierCategories)
      .set({ enabled, updatedAt: new Date() })
      .where(eq(supplierCategories.id, id))
      .returning();
    return updated;
  }

  async markSupplierCategorySynced(id: number, productCount: number): Promise<void> {
    await db
      .update(supplierCategories)
      .set({ lastSyncedAt: new Date(), lastProductCount: productCount, updatedAt: new Date() })
      .where(eq(supplierCategories.id, id));
  }

  async createSupplierSyncRun(run: InsertSupplierSyncRun): Promise<SupplierSyncRun> {
    const [created] = await db.insert(supplierSyncRuns).values(run).returning();
    return created;
  }

  async finishSupplierSyncRun(id: number, patch: Partial<InsertSupplierSyncRun>): Promise<void> {
    await db.update(supplierSyncRuns).set(patch).where(eq(supplierSyncRuns.id, id));
  }

  async getSupplierSyncRuns(supplier?: string, limit = 20): Promise<SupplierSyncRun[]> {
    const base = db.select().from(supplierSyncRuns);
    const query = supplier ? base.where(eq(supplierSyncRuns.supplier, supplier)) : base;
    return await query.orderBy(desc(supplierSyncRuns.startedAt)).limit(limit);
  }

  /**
   * Produtos master (referência) com os equivalentes usados na comparação.
   *
   * `brandScope` decide o que entra do outro lado, e as duas telas pedem coisas
   * diferentes:
   *
   *   'competitor-brands'  Monitoramento URL / Comparação Master.
   *                        Equivalentes de OUTRAS marcas — nossa furadeira
   *                        Foxlux contra a furadeira de um concorrente.
   *
   *   'own-brand'          Comparação de Preço.
   *                        O MESMO produto de marca própria em outros
   *                        vendedores — nosso Foxlux na Vellore contra o mesmo
   *                        Foxlux na Tambasa, Bartofil, Martins.
   *
   *   'all'                Comportamento anterior. Mantido porque outras telas
   *                        e o relatório ainda chamam sem escopo.
   *
   * O master é sempre restrito a marca própria: comparar partindo de um produto
   * de terceiro inverteria o sentido do relatório.
   */
  async getMasterProductsWithCompetitors(
    specificMasterId?: number,
    competitorClientId?: number,
    brandScope: 'all' | 'own-brand' | 'competitor-brands' = 'all',
  ): Promise<Array<{
    id: number;
    name: string;
    basePrice: string;
    imageUrl: string;
    sourceUrl: string;
    sku: string;
    manufacturer: string;
    matchGroup: string;
    clientName: string;
    competitors: Array<{
      id: number;
      name: string;
      basePrice: string;
      sourceUrl: string;
      sku: string;
      manufacturer: string;
      matchGroup: string;
      clientName: string;
      imageUrl: string;
    }>;
  }>> {
    console.log(`[STORAGE] getMasterProductsWithCompetitors called with specificMasterId: ${specificMasterId}, competitorClientId: ${competitorClientId}`);
    
    // Build where conditions for master products
    let masterConditions = [
      eq(products.isMaster, true),
      isNotNull(products.sourceUrl)
    ];

    // Master é sempre marca própria. Com escopo definido a regra é explícita;
    // em 'all' fica como estava, para não mudar telas que ainda não migraram.
    if (brandScope !== 'all') {
      masterConditions.push(eq(products.isCompetitor, false));
    }

    // If specific master ID requested, filter for it
    if (specificMasterId) {
      masterConditions.push(eq(products.id, specificMasterId));
    }

    // Get all master products with client information
    const masterProducts = await db
      .select({
        id: products.id,
        name: products.name,
        basePrice: products.basePrice,
        imageUrl: products.imageUrl,
        sourceUrl: products.sourceUrl,
        sku: products.sku,
        manufacturer: products.manufacturer,
        matchGroup: products.matchGroup,
        clientName: clients.name,
      })
      .from(products)
      .leftJoin(clients, eq(products.clientId, clients.id))
      .where(and(...masterConditions))
      .orderBy(desc(products.createdAt));

    console.log(`[STORAGE] Found ${masterProducts.length} master products`);

    // If we have specific master ID and no products found, return empty array
    if (specificMasterId && masterProducts.length === 0) {
      console.log(`[STORAGE] No master product found with ID ${specificMasterId}`);
      return [];
    }

    // Get all competitors for found masters in a single query
    const masterIds = masterProducts.map(m => m.id);
    let competitors: any[] = [];
    
    if (masterIds.length > 0) {
      let competitorConditions = [inArray(products.masterProductId, masterIds)];

      // Add client filter for competitors if specified
      if (competitorClientId) {
        competitorConditions.push(eq(products.clientId, competitorClientId));
      }

      // is_competitor já é derivado da marca, então filtrar por ele é o mesmo
      // que filtrar por marca própria — sem repetir a normalização aqui.
      if (brandScope === 'competitor-brands') {
        competitorConditions.push(eq(products.isCompetitor, true));
      } else if (brandScope === 'own-brand') {
        competitorConditions.push(eq(products.isCompetitor, false));
      }
      
      competitors = await db
        .select({
          id: products.id,
          name: products.name,
          basePrice: products.basePrice,
          sourceUrl: products.sourceUrl,
          sku: products.sku,
          manufacturer: products.manufacturer,
          matchGroup: products.matchGroup,
          clientName: clients.name,
          imageUrl: products.imageUrl,
          masterProductId: products.masterProductId,
        })
        .from(products)
        .leftJoin(clients, eq(products.clientId, clients.id))
        .where(and(...competitorConditions))
        .orderBy(desc(products.createdAt));
    }

    console.log(`[STORAGE] Found ${competitors.length} competitors for all masters`);

    // Group competitors by master product ID
    const competitorsByMaster = new Map<number, any[]>();
    competitors.forEach(comp => {
      if (!competitorsByMaster.has(comp.masterProductId)) {
        competitorsByMaster.set(comp.masterProductId, []);
      }
      competitorsByMaster.get(comp.masterProductId)!.push({
        id: comp.id,
        name: comp.name || "Produto sem nome",
        basePrice: comp.basePrice || "0",
        sourceUrl: comp.sourceUrl || "",
        sku: comp.sku,
        manufacturer: comp.manufacturer || "",
        matchGroup: comp.matchGroup || "",
        clientName: comp.clientName || "",
        imageUrl: comp.imageUrl || "",
      });
    });

    // Build final result
    const result = masterProducts.map(master => ({
      id: master.id,
      name: master.name || "Produto sem nome",
      basePrice: master.basePrice || "0",
      imageUrl: master.imageUrl || "",
      sourceUrl: master.sourceUrl || "",
      sku: master.sku,
      manufacturer: master.manufacturer || "",
      matchGroup: master.matchGroup || "",
      clientName: master.clientName || "",
      competitors: competitorsByMaster.get(master.id) || []
    }));

    console.log(`[STORAGE] Returning ${result.length} masters with competitors`);
    return result;
  }

  // Product operations
  async getProducts(filters?: {
    search?: string;
    sku?: string;
    categoryId?: number;
    clientId?: number;
    status?: string;
    sourceType?: string;
    isCompetitor?: boolean;
    isMaster?: boolean;
    hasCompetitorFromClient?: number;
    manufacturer?: string;
    priceMin?: number;
    priceMax?: number;
    createdAfter?: Date;
    createdBefore?: Date;
    updatedAfter?: Date;
    updatedBefore?: Date;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }): Promise<{ products: (Product & { lastPriceUpdate?: Date })[]; total: number }> {
    let query = db
      .select({
        id: products.id,
        sku: products.sku,
        name: products.name,
        description: products.description,
        manufacturer: products.manufacturer,
        categoryId: products.categoryId,
        clientId: products.clientId,
        competitorId: products.competitorId,
        isCompetitor: products.isCompetitor,
        sourceType: products.sourceType,
        sourceUrl: products.sourceUrl,
        basePrice: products.basePrice,
        imageUrl: products.imageUrl,
        status: products.status,
        matchGroup: products.matchGroup,
        brandSku: products.brandSku,
        isMaster: products.isMaster,
        masterProductId: products.masterProductId,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        lastPriceUpdate: sql<Date | null>`(
          SELECT MAX(date_checked) 
          FROM price_monitoring_history 
          WHERE price_monitoring_history.product_id = products.id
        )`.as('lastPriceUpdate')
      })
      .from(products);
    let countQuery = db.select({ count: sql<number>`count(*)` }).from(products);

    const conditions = [];
    if (filters?.categoryId) {
      conditions.push(eq(products.categoryId, filters.categoryId));
    }
    if (filters?.clientId) {
      conditions.push(eq(products.clientId, filters.clientId));
    }
    if (filters?.status) {
      conditions.push(eq(products.status, filters.status));
    }
    if (filters?.search) {
      conditions.push(
        or(
          ilike(products.name, `%${filters.search}%`),
          ilike(products.sku, `%${filters.search}%`),
          ilike(products.description, `%${filters.search}%`)
        )
      );
    }
    if (filters?.sku) {
      conditions.push(ilike(products.sku, `%${filters.sku}%`));
    }
    if (filters?.sourceType) {
      // A coluna "Tipo" na UI decide URL vs "Base de dados" com truthy check
      // (products.sourceUrl vazia = falsy = "Base de dados"). O filtro precisa
      // seguir o mesmo critério — se olhasse só isNull, os 475 master com
      // source_url = '' passariam como URL, e a filtragem por database daria
      // zero, divergindo do que a tela mostra.
      if (filters.sourceType === 'url') {
        conditions.push(and(isNotNull(products.sourceUrl), ne(products.sourceUrl, '')));
      } else if (filters.sourceType === 'database') {
        conditions.push(or(isNull(products.sourceUrl), eq(products.sourceUrl, '')));
      }
    }
    if (filters?.hasSourceUrl !== undefined) {
      if (filters.hasSourceUrl) {
        conditions.push(and(isNotNull(products.sourceUrl), ne(products.sourceUrl, '')));
      } else {
        conditions.push(or(isNull(products.sourceUrl), eq(products.sourceUrl, '')));
      }
    }
    if (filters?.isCompetitor !== undefined) {
      conditions.push(eq(products.isCompetitor, filters.isCompetitor));
    }
    if (filters?.isMaster !== undefined) {
      conditions.push(eq(products.isMaster, filters.isMaster));
    }
    if (filters?.hasCompetitorFromClient) {
      // Filter to show only MASTER products that have competitors from the specified client
      // Use raw SQL subquery for better control
      conditions.push(
        and(
          eq(products.isMaster, true),
          sql`${products.id} IN (
            SELECT DISTINCT master_product_id 
            FROM products 
            WHERE client_id = ${filters.hasCompetitorFromClient} 
            AND master_product_id IS NOT NULL
          )`
        )
      );
    }
    if (filters?.manufacturer) {
      conditions.push(ilike(products.manufacturer, `%${filters.manufacturer}%`));
    }
    if (filters?.priceMin !== undefined) {
      conditions.push(gte(products.basePrice, filters.priceMin.toString()));
    }
    if (filters?.priceMax !== undefined) {
      conditions.push(lte(products.basePrice, filters.priceMax.toString()));
    }
    if (filters?.createdAfter) {
      conditions.push(gte(products.createdAt, filters.createdAfter));
    }
    if (filters?.createdBefore) {
      conditions.push(lte(products.createdAt, filters.createdBefore));
    }
    if (filters?.updatedAfter) {
      conditions.push(gte(products.updatedAt, filters.updatedAfter));
    }
    if (filters?.updatedBefore) {
      conditions.push(lte(products.updatedAt, filters.updatedBefore));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
      countQuery = countQuery.where(and(...conditions));
    }

    const [{ count: total }] = await countQuery;
    
    // Dynamic sorting
    const sortColumn = filters?.sortBy || 'updatedAt';
    const sortDirection = filters?.sortOrder || 'desc';
    
    switch (sortColumn) {
      case 'name':
        query = sortDirection === 'asc' ? query.orderBy(asc(products.name)) : query.orderBy(desc(products.name));
        break;
      case 'sku':
        query = sortDirection === 'asc' ? query.orderBy(asc(products.sku)) : query.orderBy(desc(products.sku));
        break;
      case 'basePrice':
        query = sortDirection === 'asc' ? query.orderBy(asc(products.basePrice)) : query.orderBy(desc(products.basePrice));
        break;
      case 'createdAt':
        query = sortDirection === 'asc' ? query.orderBy(asc(products.createdAt)) : query.orderBy(desc(products.createdAt));
        break;
      case 'updatedAt':
      default:
        query = sortDirection === 'asc' ? query.orderBy(asc(products.updatedAt)) : query.orderBy(desc(products.updatedAt));
        break;
    }
    
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    if (filters?.offset) {
      query = query.offset(filters.offset);
    }

    const result = await query;
    return { products: result, total: Number(total) };
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async getProductBySku(sku: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.sku, sku));
    return product;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    // is_competitor é derivado da marca, não informado por quem chama: se o
    // caller pudesse decidir, cada caminho de escrita (upload, sync, tela)
    // teria a própria versão da regra e elas divergiriam.
    const isCompetitor = await this.deriveIsCompetitor(product.manufacturer);
    const [newProduct] = await db
      .insert(products)
      .values({ ...product, isCompetitor })
      .returning();
    return newProduct;
  }

  async updateProduct(id: number, productData: Partial<InsertProduct>): Promise<Product> {
    // Verify product exists before updating
    const existingProduct = await this.getProduct(id);
    if (!existingProduct) {
      throw new Error(`Product with ID ${id} not found`);
    }

    const updateData: any = { 
      ...productData, 
      updatedAt: new Date(),
      id: id // Ensure ID is preserved
    };
    
    // Remove undefined values and empty strings to avoid database issues
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined || updateData[key] === '') {
        delete updateData[key];
      }
    });

    // Marca mudou => a classificação de concorrente muda junto. Recalcular aqui
    // evita que a flag fique presa no valor antigo até o próximo recomputo geral.
    if (updateData.manufacturer !== undefined) {
      updateData.isCompetitor = await this.deriveIsCompetitor(updateData.manufacturer);
    }

    console.log('Updating product with data:', updateData);
    
    // Check if basePrice is being updated to create price history
    const priceChanged = productData.basePrice && 
                        productData.basePrice !== existingProduct.basePrice &&
                        productData.basePrice.trim() !== '';
    
    const [updatedProduct] = await db
      .update(products)
      .set(updateData)
      .where(eq(products.id, id))
      .returning();
    
    if (!updatedProduct) {
      throw new Error(`Failed to update product with ID ${id}`);
    }
    
    console.log('Updated product result:', updatedProduct);
    
    // Create price history entry if price changed
    if (priceChanged) {
      try {
        // Get a valid client ID - prioritize product's client, then get master client
        let validClientId = productData.clientId || existingProduct.clientId;
        
        if (!validClientId) {
          // Get master client if no client is associated
          const masterClient = await this.getMasterClient();
          validClientId = masterClient?.id || 1; // Fallback to ID 1 if no master client
        }
        
        await this.createPriceHistory({
          productId: id,
          clientId: validClientId,
          oldPrice: existingProduct.basePrice || '0.00',
          newPrice: productData.basePrice || '0.00',
          changeReason: 'manual_update'
        });
        console.log(`Price history created for product ${id}: ${existingProduct.basePrice} -> ${productData.basePrice}`);
      } catch (historyError) {
        console.warn('Failed to create price history:', historyError);
      }
    }
    
    // Update price timestamps when product is modified
    try {
      await db
        .update(prices)
        .set({ updatedAt: new Date() })
        .where(eq(prices.productId, id));
    } catch (priceUpdateError) {
      console.warn('Failed to update price timestamps:', priceUpdateError);
      // Don't fail the product update if price update fails
    }
    
    return updatedProduct;
  }

  async deleteProduct(id: number): Promise<void> {
    // Primeiro, deletar todos os preços associados ao produto
    await db.delete(prices).where(eq(prices.productId, id));
    
    // Depois, deletar o produto
    await db.delete(products).where(eq(products.id, id));
  }

  // Price operations
  async getPrices(filters?: {
    productId?: number;
    clientId?: number;
    limit?: number;
    offset?: number;
  }): Promise<Price[]> {
    let query = db.select().from(prices);

    const conditions = [];
    if (filters?.productId) {
      conditions.push(eq(prices.productId, filters.productId));
    }
    if (filters?.clientId) {
      conditions.push(eq(prices.clientId, filters.clientId));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    query = query.orderBy(desc(prices.lastUpdated));

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    if (filters?.offset) {
      query = query.offset(filters.offset);
    }

    return await query;
  }

  async getPrice(id: number): Promise<Price | undefined> {
    const [price] = await db.select().from(prices).where(eq(prices.id, id));
    return price;
  }

  async createPrice(price: InsertPrice): Promise<Price> {
    const [newPrice] = await db.insert(prices).values({
      ...price,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return newPrice;
  }

  async updatePrice(id: number, price: Partial<InsertPrice>): Promise<Price> {
    const [updatedPrice] = await db
      .update(prices)
      .set({ ...price, lastUpdated: new Date(), updatedAt: new Date() })
      .where(eq(prices.id, id))
      .returning();
    return updatedPrice;
  }

  async deletePrice(id: number): Promise<void> {
    await db.delete(prices).where(eq(prices.id, id));
  }

  /**
   * @deprecated QUEBRADO — não usar.
   * O onConflictDoUpdate abaixo aponta para (product_id, client_id), mas a tabela `prices`
   * só tem a PK serial: não existe unique index nessas colunas. Qualquer chamada levanta
   * `42P10: there is no unique or exclusion constraint matching the ON CONFLICT specification`.
   * Para gravar preço de concorrente use `upsertCompetitorPrice`, que faz read-then-write.
   */
  async bulkUpsertPrices(priceList: InsertPrice[]): Promise<void> {
    for (const price of priceList) {
      await db
        .insert(prices)
        .values(price)
        .onConflictDoUpdate({
          target: [prices.productId, prices.clientId],
          set: {
            price: price.price,
            discount: price.discount,
            isAvailable: price.isAvailable,
            lastUpdated: new Date(),
          },
        });
    }
  }

  async getProductPriceComparison(productId: number): Promise<Array<Price & { client: Client }>> {
    return await db
      .select({
        id: prices.id,
        productId: prices.productId,
        clientId: prices.clientId,
        price: prices.price,
        discount: prices.discount,
        isAvailable: prices.isAvailable,
        lastUpdated: prices.lastUpdated,
        createdAt: prices.createdAt,
        client: clients,
      })
      .from(prices)
      .innerJoin(clients, eq(prices.clientId, clients.id))
      .where(eq(prices.productId, productId))
      .orderBy(prices.price);
  }

  // Nova função para buscar produtos compatíveis por match group
  async getProductsByMatchGroup(matchGroup: string): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(eq(products.matchGroup, matchGroup))
      .orderBy(products.name);
  }

  // Nova função para comparação avançada por grupo de match
  async getMatchGroupComparison(matchGroup: string): Promise<Array<{
    product: Product;
    prices: Array<Price & { client: Client }>;
    bestPrice: Price & { client: Client };
    savings: number;
  }>> {
    const matchProducts = await this.getProductsByMatchGroup(matchGroup);
    
    if (matchProducts.length === 0) {
      return [];
    }

    const productPrices = await db
      .select({
        product: products,
        price: prices,
        client: clients,
      })
      .from(products)
      .innerJoin(prices, eq(products.id, prices.productId))
      .innerJoin(clients, eq(prices.clientId, clients.id))
      .where(
        and(
          eq(products.matchGroup, matchGroup),
          eq(prices.isAvailable, true)
        )
      )
      .orderBy(products.id, prices.price);

    const grouped = productPrices.reduce((acc, row) => {
      const productId = row.product.id;
      if (!acc[productId]) {
        acc[productId] = {
          product: row.product,
          prices: [],
        };
      }
      acc[productId].prices.push({
        ...row.price,
        client: row.client,
      });
      return acc;
    }, {} as Record<number, { product: Product; prices: Array<Price & { client: Client }> }>);

    return Object.values(grouped).map(({ product, prices }) => {
      const bestPrice = prices[0]; // Already sorted by price
      const basePrice = parseFloat(product.basePrice);
      const bestPriceValue = parseFloat(bestPrice.price);
      const savings = basePrice - bestPriceValue;

      return {
        product,
        prices,
        bestPrice,
        savings,
      };
    });
  }

  async getBestPrices(limit: number = 50): Promise<Array<{
    product: Product;
    prices: Array<Price & { client: Client; product?: Product }>;
    bestPrice: Price & { client: Client; product?: Product };
    worstPrice: Price & { client: Client; product?: Product };
    savings: number;
    priceVariation: number;
  }>> {
    // Get master products from Vellore with match groups
    const masterProducts = await db
      .select()
      .from(products)
      .innerJoin(clients, eq(products.clientId, clients.id))
      .where(and(
        eq(products.status, "active"),
        eq(clients.name, "Vellore"),
        eq(products.isMaster, true),
        isNotNull(products.matchGroup),
        ne(products.matchGroup, '')
      ))
      .orderBy(desc(products.updatedAt))
      .limit(limit * 3);

    const results = [];

    for (const { products: product, clients: client } of masterProducts) {
      // Get competitor products for this match group
      const competitorProducts = await db
        .select()
        .from(products)
        .innerJoin(clients, eq(products.clientId, clients.id))
        .where(and(
          eq(products.status, "active"),
          eq(products.matchGroup, product.matchGroup),
          ne(products.clientId, product.clientId)
        ));

      const allPrices = [];
      
      for (const { products: competitorProduct, clients: competitorClient } of competitorProducts) {
        // Get price from prices table or use basePrice
        const productPrices = await db
          .select()
          .from(prices)
          .where(and(
            eq(prices.productId, competitorProduct.id),
            eq(prices.isAvailable, true)
          ));

        if (productPrices.length > 0) {
          for (const price of productPrices) {
            allPrices.push({
              ...price,
              client: competitorClient,
              product: competitorProduct
            });
          }
        } else {
          // Use basePrice as fallback
          allPrices.push({
            id: competitorProduct.id * -1,
            productId: competitorProduct.id,
            clientId: competitorClient.id,
            price: competitorProduct.basePrice,
            discount: null,
            isAvailable: true,
            lastUpdated: null,
            createdAt: competitorProduct.createdAt,
            client: competitorClient,
            product: competitorProduct
          });
        }
      }

      // Sort prices and calculate metrics
      const sortedPrices = allPrices.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
      
      if (sortedPrices.length > 0) {
        const bestPrice = sortedPrices[0];
        const worstPrice = sortedPrices[sortedPrices.length - 1];
        const vellorePrice = parseFloat(product.basePrice);
        const bestCompetitorPrice = parseFloat(bestPrice.price);
        const savings = bestCompetitorPrice - vellorePrice;
        const priceVariation = parseFloat(bestPrice.price) > 0 ? 
          ((parseFloat(worstPrice.price) - parseFloat(bestPrice.price)) / parseFloat(bestPrice.price)) * 100 : 0;

        results.push({
          product,
          prices: sortedPrices,
          bestPrice,
          worstPrice,
          savings,
          priceVariation: Math.round(priceVariation * 100) / 100
        });
      } else {
        // Include products without competitor prices
        results.push({
          product,
          prices: [],
          bestPrice: null,
          worstPrice: null,
          savings: 0,
          priceVariation: 0
        });
      }
    }

    // Sort and return results
    return results.sort((a, b) => {
      if (a.savings !== 0 && b.savings === 0) return -1;
      if (a.savings === 0 && b.savings !== 0) return 1;
      if (a.savings !== b.savings) return Math.abs(b.savings) - Math.abs(a.savings);
      return b.priceVariation - a.priceVariation;
    }).slice(0, limit);
  }

  // Upload history operations
  async getUploadHistory(userId: string): Promise<UploadHistory[]> {
    return await db
      .select()
      .from(uploadHistory)
      .where(eq(uploadHistory.userId, userId))
      .orderBy(desc(uploadHistory.createdAt));
  }

  async createUploadHistory(upload: InsertUploadHistory): Promise<UploadHistory> {
    const [newUpload] = await db.insert(uploadHistory).values(upload).returning();
    return newUpload;
  }

  // API Key operations
  async getApiKeys(userId: string): Promise<ApiKey[]> {
    return await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.userId, userId))
      .orderBy(desc(apiKeys.createdAt));
  }

  async createApiKey(apiKey: InsertApiKey): Promise<ApiKey> {
    const [newApiKey] = await db.insert(apiKeys).values(apiKey).returning();
    return newApiKey;
  }

  async deleteApiKey(id: number): Promise<void> {
    await db.delete(apiKeys).where(eq(apiKeys.id, id));
  }

  async validateApiKey(keyHash: string): Promise<ApiKey | undefined> {
    const [apiKey] = await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.keyHash, keyHash), eq(apiKeys.isActive, true)));
    
    if (apiKey) {
      await db.update(apiKeys).set({ lastUsed: new Date() }).where(eq(apiKeys.id, apiKey.id));
    }
    
    return apiKey;
  }

  // Dashboard stats
  async getDashboardStats(): Promise<{
    totalProducts: number;
    activeClients: number;
    todayUpdates: number;
  }> {
    const [{ count: totalProducts }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(eq(products.status, "active"));

    const [{ count: activeClients }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(clients)
      .where(eq(clients.status, "active"));

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [{ count: todayUpdates }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(prices)
      .where(sql`${prices.lastUpdated} >= ${today}`);

    return {
      totalProducts,
      activeClients,
      todayUpdates,
    };
  }

  async getProductHistory(productId: number): Promise<Array<PriceHistory & { client: Client }>> {
    const history = await db
      .select({
        id: priceHistory.id,
        productId: priceHistory.productId,
        clientId: priceHistory.clientId,
        oldPrice: priceHistory.oldPrice,
        newPrice: priceHistory.newPrice,
        changeReason: priceHistory.changeReason,
        createdAt: sql<Date>`${priceHistory.createdAt} - INTERVAL '3 hours'`.as('createdAt'),
        updatedAt: priceHistory.updatedAt,
        client: {
          id: clients.id,
          name: clients.name,
          email: clients.email,
          phone: clients.phone,
          status: clients.status,
          apiKey: clients.apiKey,
          createdAt: clients.createdAt,
          updatedAt: clients.updatedAt
        }
      })
      .from(priceHistory)
      .leftJoin(clients, eq(priceHistory.clientId, clients.id))
      .where(eq(priceHistory.productId, productId))
      .orderBy(desc(priceHistory.createdAt));

    return history.map((row) => ({
      id: row.id,
      productId: row.productId,
      clientId: row.clientId,
      oldPrice: row.oldPrice,
      newPrice: row.newPrice,
      changeReason: row.changeReason,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      client: row.client || { 
        id: 0, 
        name: 'Cliente desconhecido', 
        email: null, 
        phone: null,
        status: 'inactive',
        apiKey: null, 
        createdAt: null, 
        updatedAt: null 
      }
    }));
  }

  async createPriceHistory(history: InsertPriceHistory): Promise<PriceHistory> {
    const [newHistory] = await db
      .insert(priceHistory)
      .values(history)
      .returning();
    return newHistory;
  }

  async getRecentlyUpdatedProducts(): Promise<Array<Product & { lastPriceUpdate: Date; client?: Client }>> {
    // First get Vellore client ID
    const velloreClient = await db
      .select()
      .from(clients)
      .where(like(clients.name, '%Vellore%'))
      .limit(1);

    if (!velloreClient.length) {
      return [];
    }

    // Get Vellore products that have match groups (indicating they have matches with other products)
    const recentProducts = await db
      .select({
        // Product fields
        id: products.id,
        sku: products.sku,
        name: products.name,
        description: products.description,
        manufacturer: products.manufacturer,
        categoryId: products.categoryId,
        clientId: products.clientId,
        competitorId: products.competitorId,
        isCompetitor: products.isCompetitor,
        sourceType: products.sourceType,
        basePrice: products.basePrice,
        imageUrl: products.imageUrl,
        status: products.status,
        matchGroup: products.matchGroup,
        brandSku: products.brandSku,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        lastPriceUpdate: sql<Date>`COALESCE(MAX(${prices.lastUpdated}), ${products.updatedAt})`.as('lastPriceUpdate'),
        // Client fields
        client: {
          id: clients.id,
          name: clients.name,
          email: clients.email,
          phone: clients.phone,
          status: clients.status,
          apiKey: clients.apiKey,
          createdAt: clients.createdAt,
          updatedAt: clients.updatedAt
        }
      })
      .from(products)
      .leftJoin(clients, eq(products.clientId, clients.id))
      .leftJoin(prices, eq(products.id, prices.productId))
      .where(
        and(
          eq(products.status, "active"),
          eq(products.clientId, velloreClient[0].id), // Only Vellore products
          isNotNull(products.matchGroup), // Only products with match groups
          ne(products.matchGroup, '') // Match group is not empty
        )
      )
      .groupBy(products.id, clients.id)
      .orderBy(desc(sql`COALESCE(MAX(${prices.lastUpdated}), ${products.updatedAt})`))
      .limit(200); // Aumentar limite para incluir mais produtos

    return recentProducts.map(row => ({
      id: row.id,
      sku: row.sku,
      name: row.name,
      description: row.description,
      manufacturer: row.manufacturer,
      categoryId: row.categoryId,
      clientId: row.clientId,
      competitorId: row.competitorId,
      isCompetitor: row.isCompetitor,
      sourceType: row.sourceType,
      basePrice: row.basePrice,
      imageUrl: row.imageUrl,
      status: row.status,
      matchGroup: row.matchGroup,
      brandSku: row.brandSku,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      lastPriceUpdate: row.lastPriceUpdate,
      client: row.client.id ? row.client : undefined
    }));
  }

  async getRecentPriceUpdates(limit: number = 10): Promise<any[]> {
    const recentUpdates = await db
      .select({
        id: priceMonitoringHistory.id,
        productId: priceMonitoringHistory.productId,
        productName: products.name,
        productSku: products.sku,
        priceOld: priceMonitoringHistory.priceOld,
        priceNew: priceMonitoringHistory.priceNew,
        dateChecked: priceMonitoringHistory.dateChecked,
        source: priceMonitoringHistory.source,
        createdAt: priceMonitoringHistory.createdAt
      })
      .from(priceMonitoringHistory)
      .leftJoin(products, eq(priceMonitoringHistory.productId, products.id))
      .where(like(priceMonitoringHistory.source, 'url_monitoring%'))
      .orderBy(desc(priceMonitoringHistory.createdAt))
      .limit(limit);
    
    return recentUpdates;
  }

  // Reports generation implementations
  async generatePriceComparisonReport(filters?: any) {
    // First, get all master products (not competitors) with their client info
    const masterProducts = await db
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
        basePrice: products.basePrice,
        matchGroup: products.matchGroup,
        clientId: products.clientId,
        clientName: clients.name,
        clientIsMaster: clients.isMaster
      })
      .from(products)
      .leftJoin(clients, eq(products.clientId, clients.id))
      .where(
        and(
          eq(products.status, 'active'),
          eq(products.isCompetitor, false),
          isNotNull(products.matchGroup),
          ne(products.matchGroup, '')
        )
      );

    // Now for each master product, get competitor products with same matchGroup
    const reportData = [];
    
    for (const masterProduct of masterProducts) {
      const competitorProducts = await db
        .select({
          id: products.id,
          name: products.name,
          sku: products.sku,
          basePrice: products.basePrice,
          clientName: clients.name,
          clientId: clients.id,
          clientIsMaster: clients.isMaster
        })
        .from(products)
        .leftJoin(clients, eq(products.clientId, clients.id))
        .where(
          and(
            eq(products.matchGroup, masterProduct.matchGroup),
            eq(products.isCompetitor, true),
            eq(products.status, 'active')
          )
        );

      const masterPrice = parseFloat(masterProduct.basePrice);
      const competitorPrices = competitorProducts.map(comp => {
        const compPrice = parseFloat(comp.basePrice);
        const savings = Math.max(0, masterPrice - compPrice);
        const savingsPercentage = compPrice > 0 ? 
          Math.round(((masterPrice - compPrice) / masterPrice) * 100) : 0;

        return {
          clientName: comp.clientName || 'Unknown',
          clientType: comp.clientIsMaster ? 'Nosso' : 'Concorrente',
          price: compPrice,
          savings: savings,
          savingsPercentage: savingsPercentage
        };
      });

      reportData.push({
        productId: masterProduct.id,
        productName: masterProduct.name,
        sku: masterProduct.sku,
        masterPrice: masterPrice,
        masterClientName: masterProduct.clientName || 'Unknown',
        masterClientType: masterProduct.clientIsMaster ? 'Nosso' : 'Concorrente',
        competitorPrices: competitorPrices
      });
    }

    // Calculate summary statistics
    const totalSavings = reportData.reduce((sum, product) => 
      sum + product.competitorPrices.reduce((pSum: number, comp: any) => pSum + comp.savings, 0), 0
    );

    const totalComparisons = reportData.reduce((sum, product) => sum + product.competitorPrices.length, 0);
    
    // Calculate client statistics
    const clientStats = {};
    
    // Count master products by client (exclude Unknown)
    reportData.forEach(product => {
      const clientName = product.masterClientName;
      if (clientName && clientName !== 'Unknown') {
        if (!clientStats[clientName]) {
          clientStats[clientName] = {
            clientName: clientName,
            clientType: product.masterClientType,
            masterProducts: 0,
            competitorProducts: 0
          };
        }
        clientStats[clientName].masterProducts++;
      }
    });
    
    // Count competitor products by client
    reportData.forEach(product => {
      product.competitorPrices.forEach((comp: any) => {
        const clientName = comp.clientName;
        if (clientName && clientName !== 'Unknown') {
          if (!clientStats[clientName]) {
            clientStats[clientName] = {
              clientName: clientName,
              clientType: comp.clientType,
              masterProducts: 0,
              competitorProducts: 0
            };
          }
          clientStats[clientName].competitorProducts++;
        }
      });
    });
    
    // Get unique clients (exclude Unknown)
    const uniqueClients = new Set();
    reportData.forEach(product => {
      if (product.masterClientName && product.masterClientName !== 'Unknown') {
        uniqueClients.add(product.masterClientName);
      }
      product.competitorPrices.forEach((comp: any) => {
        if (comp.clientName && comp.clientName !== 'Unknown') {
          uniqueClients.add(comp.clientName);
        }
      });
    });

    return {
      summary: {
        totalProducts: reportData.length,
        totalClients: uniqueClients.size,
        averageSavings: totalComparisons > 0 ? Math.round(totalSavings / totalComparisons) : 0,
        lastUpdated: new Date(),
        clientStatistics: Object.values(clientStats)
      },
      data: reportData
    };
  }

  async generateSavingsAnalysisReport(filters?: any) {
    const savingsData = await db
      .select({
        clientName: clients.name,
        masterPrice: sql<number>`CAST(${products.basePrice} AS NUMERIC)`,
        competitorPrice: sql<number>`CAST(${competitors.basePrice} AS NUMERIC)`,
        productCount: sql<number>`COUNT(${competitors.id})`
      })
      .from(competitors)
      .leftJoin(clients, eq(competitors.clientId, clients.id))
      .leftJoin(products, eq(competitors.matchGroup, products.matchGroup))
      .where(and(
        eq(competitors.status, 'active'),
        isNotNull(products.id)
      ))
      .groupBy(clients.id, clients.name, products.basePrice, competitors.basePrice);

    const clientSummary = savingsData.reduce((acc, row) => {
      const clientName = row.clientName || 'Unknown';
      const savings = Math.max(0, row.masterPrice - row.competitorPrice);
      
      if (!acc[clientName]) {
        acc[clientName] = {
          clientName,
          totalSavings: 0,
          productsCount: 0,
          totalMasterPrice: 0,
          totalCompetitorPrice: 0
        };
      }
      
      acc[clientName].totalSavings += savings;
      acc[clientName].productsCount += 1;
      acc[clientName].totalMasterPrice += row.masterPrice;
      acc[clientName].totalCompetitorPrice += row.competitorPrice;
      
      return acc;
    }, {} as any);

    const reportData = Object.values(clientSummary).map((client: any) => ({
      clientName: client.clientName,
      totalSavings: Math.round(client.totalSavings),
      averageSavings: Math.round(client.totalSavings / client.productsCount),
      productsCount: client.productsCount,
      savingsPercentage: client.totalMasterPrice > 0 ? 
        Math.round((client.totalSavings / client.totalMasterPrice) * 100) : 0
    }));

    const totalSavings = reportData.reduce((sum, client) => sum + client.totalSavings, 0);
    const bestClient = reportData.length > 0 ? 
      reportData.reduce((best, current) => 
        current.totalSavings > best.totalSavings ? current : best
      ).clientName : 'N/A';

    return {
      summary: {
        totalSavings: Math.round(totalSavings),
        averageSavingsPercentage: reportData.length > 0 ? 
          Math.round(reportData.reduce((sum, client) => sum + client.savingsPercentage, 0) / reportData.length) : 0,
        bestPerformingClient: bestClient,
        totalProducts: reportData.reduce((sum, client) => sum + client.productsCount, 0)
      },
      data: reportData
    };
  }

  async generateClientPerformanceReport(filters?: any) {
    const clientData = await db
      .select({
        clientId: clients.id,
        clientName: clients.name,
        competitorCount: sql<number>`COUNT(${competitors.id})`,
        averagePrice: sql<number>`AVG(CAST(${competitors.basePrice} AS NUMERIC))`
      })
      .from(clients)
      .leftJoin(competitors, eq(clients.id, competitors.clientId))
      .where(eq(clients.status, 'active'))
      .groupBy(clients.id, clients.name);

    const totalCompetitors = clientData.reduce((sum, client) => sum + client.competitorCount, 0);

    const reportData = clientData.map(client => ({
      clientId: client.clientId,
      clientName: client.clientName,
      productsCount: client.competitorCount,
      averagePrice: Math.round(client.averagePrice || 0),
      competitiveIndex: client.competitorCount > 0 ? Math.round((client.competitorCount / Math.max(totalCompetitors, 1)) * 100) : 0,
      marketShare: totalCompetitors > 0 ? Math.round((client.competitorCount / totalCompetitors) * 100) : 0
    }));

    const mostCompetitive = reportData.length > 0 ? 
      reportData.reduce((best, current) => 
        current.competitiveIndex > best.competitiveIndex ? current : best
      ).clientName : 'N/A';

    return {
      summary: {
        totalClients: reportData.length,
        averageCompetitiveIndex: reportData.length > 0 ? 
          Math.round(reportData.reduce((sum, client) => sum + client.competitiveIndex, 0) / reportData.length) : 0,
        mostCompetitiveClient: mostCompetitive,
        totalProducts: totalCompetitors
      },
      data: reportData
    };
  }

  async generateProductTrendsReport(filters?: any) {
    const trendsData = await db
      .select({
        productId: products.id,
        productName: products.name,
        sku: products.sku,
        currentPrice: sql<number>`CAST(${products.basePrice} AS NUMERIC)`,
        oldPrice: priceHistory.oldPrice,
        newPrice: priceHistory.newPrice,
        lastUpdated: products.updatedAt
      })
      .from(products)
      .leftJoin(priceHistory, eq(products.id, priceHistory.productId))
      .where(eq(products.status, 'active'))
      .orderBy(desc(products.updatedAt));

    const reportData = trendsData.reduce((acc, row) => {
      const existing = acc.find(item => item.productId === row.productId);
      
      if (!existing) {
        const oldPrice = parseFloat(row.oldPrice || '0');
        const newPrice = parseFloat(row.newPrice || row.currentPrice.toString());
        const priceChange = newPrice - oldPrice;
        
        acc.push({
          productId: row.productId,
          productName: row.productName,
          sku: row.sku,
          currentPrice: row.currentPrice,
          priceChange: Math.round(priceChange * 100) / 100,
          priceChangePercentage: oldPrice > 0 ? Math.round((priceChange / oldPrice) * 100) : 0,
          lastUpdated: row.lastUpdated
        });
      }
      
      return acc;
    }, [] as any[]);

    const avgPriceChange = reportData.length > 0 ? 
      reportData.reduce((sum, product) => sum + product.priceChange, 0) / reportData.length : 0;

    const topTrending = reportData.length > 0 ? 
      reportData.reduce((best, current) => 
        current.priceChangePercentage > best.priceChangePercentage ? current : best
      ).productName : 'N/A';

    const bottomTrending = reportData.length > 0 ? 
      reportData.reduce((worst, current) => 
        current.priceChangePercentage < worst.priceChangePercentage ? current : worst
      ).productName : 'N/A';

    return {
      summary: {
        totalProducts: reportData.length,
        averagePriceChange: Math.round(avgPriceChange * 100) / 100,
        topTrendingProduct: topTrending,
        bottomTrendingProduct: bottomTrending
      },
      data: reportData
    };
  }

  async generateCategoryAnalysisReport(filters?: any) {
    const categoryData = await db
      .select({
        categoryId: categories.id,
        categoryName: categories.name,
        productCount: sql<number>`COUNT(${products.id})`,
        averagePrice: sql<number>`AVG(CAST(${products.basePrice} AS NUMERIC))`
      })
      .from(categories)
      .leftJoin(products, eq(categories.id, products.categoryId))
      .where(eq(products.status, 'active'))
      .groupBy(categories.id, categories.name);

    const totalProducts = categoryData.reduce((sum, cat) => sum + cat.productCount, 0);

    const reportData = categoryData.map(cat => ({
      categoryId: cat.categoryId,
      categoryName: cat.categoryName || 'Sem categoria',
      productsCount: cat.productCount,
      averagePrice: Math.round(cat.averagePrice || 0),
      totalSavings: 0, // Calculate based on competitor data if needed
      marketShare: totalProducts > 0 ? Math.round((cat.productCount / totalProducts) * 100) : 0
    }));

    const bestCategory = reportData.length > 0 ? 
      reportData.reduce((best, current) => 
        current.productsCount > best.productsCount ? current : best
      ).categoryName : 'N/A';

    return {
      summary: {
        totalCategories: reportData.length,
        averagePriceByCategory: reportData.length > 0 ? 
          Math.round(reportData.reduce((sum, cat) => sum + cat.averagePrice, 0) / reportData.length) : 0,
        bestPerformingCategory: bestCategory,
        totalProducts: totalProducts
      },
      data: reportData
    };
  }

  async generateMonthlySummaryReport(filters?: any) {
    const currentDate = new Date();
    const currentMonth = currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
    
    // Get products added this month
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    
    const [productsAdded] = await db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(sql`${products.createdAt} >= ${startOfMonth}`);

    const [pricesUpdated] = await db
      .select({ count: sql<number>`count(*)` })
      .from(prices)
      .where(sql`${prices.lastUpdated} >= ${startOfMonth}`);

    const [newClients] = await db
      .select({ count: sql<number>`count(*)` })
      .from(clients)
      .where(sql`${clients.createdAt} >= ${startOfMonth}`);

    const [totalProductsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(eq(products.status, 'active'));

    const [totalClientsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(clients)
      .where(eq(clients.status, 'active'));

    return {
      summary: {
        month: currentMonth,
        totalProducts: totalProductsResult.count,
        totalClients: totalClientsResult.count,
        totalSavings: 0, // Calculate based on savings analysis
        averageSavingsPercentage: 0
      },
      data: {
        productsAdded: productsAdded.count,
        pricesUpdated: pricesUpdated.count,
        newClients: newClients.count,
        topSavingsClient: 'Amazon', // Calculate dynamically
        topSavingsProduct: 'LED Bulbo 6W' // Calculate dynamically
      }
    };
  }

  async getReportsHistory() {
    const history = await db
      .select({
        id: reportsHistory.id,
        reportType: reportsHistory.reportType,
        reportTitle: reportsHistory.reportTitle,
        generatedBy: reportsHistory.generatedBy,
        parameters: reportsHistory.parameters,
        recordCount: reportsHistory.recordCount,
        fileFormat: reportsHistory.fileFormat,
        filePath: reportsHistory.filePath,
        generatedAt: reportsHistory.generatedAt,
        createdAt: reportsHistory.createdAt,
        userEmail: users.email
      })
      .from(reportsHistory)
      .leftJoin(users, eq(reportsHistory.generatedBy, users.id))
      .orderBy(desc(reportsHistory.generatedAt))
      .limit(50);

    return history.map(row => ({
      id: row.id,
      reportType: row.reportType,
      generatedAt: row.generatedAt,
      generatedBy: row.userEmail || row.generatedBy,
      parameters: row.parameters,
      reportTitle: row.reportTitle,
      recordCount: row.recordCount,
      fileFormat: row.fileFormat,
      filePath: row.filePath
    }));
  }

  async getReportHistoryById(id: number) {
    const [reportRecord] = await db
      .select({
        id: reportsHistory.id,
        reportType: reportsHistory.reportType,
        reportTitle: reportsHistory.reportTitle,
        generatedBy: reportsHistory.generatedBy,
        parameters: reportsHistory.parameters,
        recordCount: reportsHistory.recordCount,
        fileFormat: reportsHistory.fileFormat,
        filePath: reportsHistory.filePath,
        generatedAt: reportsHistory.generatedAt,
        createdAt: reportsHistory.createdAt,
        userEmail: users.email
      })
      .from(reportsHistory)
      .leftJoin(users, eq(reportsHistory.generatedBy, users.id))
      .where(eq(reportsHistory.id, id));

    return reportRecord ? {
      id: reportRecord.id,
      reportType: reportRecord.reportType,
      reportTitle: reportRecord.reportTitle,
      generatedBy: reportRecord.generatedBy,
      parameters: reportRecord.parameters,
      recordCount: reportRecord.recordCount,
      fileFormat: reportRecord.fileFormat,
      filePath: reportRecord.filePath,
      generatedAt: reportRecord.generatedAt,
      createdAt: reportRecord.createdAt,
      userEmail: reportRecord.userEmail
    } : undefined;
  }

  async createReportHistory(report: InsertReportsHistory): Promise<ReportsHistory> {
    const [newReport] = await db
      .insert(reportsHistory)
      .values(report)
      .returning();
    return newReport;
  }

  // Data cleanup operations
  async getCleanupStats(): Promise<{
    duplicateProducts: number;
    orphanedPrices: number;
    inconsistentPrices: number;
    emptyCategories: number;
  }> {
    // Count duplicate products (same SKU)
    const duplicates = await db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .groupBy(products.sku)
      .having(sql`count(*) > 1`);

    // Count orphaned prices (prices without valid product or client)
    const orphanedPrices = await db
      .select({ count: sql<number>`count(*)` })
      .from(prices)
      .leftJoin(products, eq(prices.productId, products.id))
      .leftJoin(clients, eq(prices.clientId, clients.id))
      .where(or(isNull(products.id), isNull(clients.id)));

    // Count prices with inconsistent data
    const inconsistentPrices = await db
      .select({ count: sql<number>`count(*)` })
      .from(prices)
      .where(or(
        eq(prices.price, ""),
        sql`${prices.price}::numeric < 0`
      ));

    // Count empty categories
    const emptyCategories = await db
      .select({ count: sql<number>`count(*)` })
      .from(categories)
      .leftJoin(products, eq(categories.id, products.categoryId))
      .where(isNull(products.id))
      .groupBy(categories.id);

    return {
      duplicateProducts: duplicates.length,
      orphanedPrices: orphanedPrices[0]?.count || 0,
      inconsistentPrices: inconsistentPrices[0]?.count || 0,
      emptyCategories: emptyCategories.length
    };
  }

  async getDuplicateProducts(): Promise<Array<{
    id: number;
    sku: string;
    name: string;
    duplicateCount: number;
    duplicateIds: number[];
  }>> {
    const duplicates = await db
      .select({
        sku: products.sku,
        ids: sql<number[]>`array_agg(${products.id})`,
        names: sql<string[]>`array_agg(${products.name})`,
        count: sql<number>`count(*)`
      })
      .from(products)
      .groupBy(products.sku)
      .having(sql`count(*) > 1`);

    return duplicates.map(group => ({
      id: group.ids[0],
      sku: group.sku,
      name: group.names[0],
      duplicateCount: group.count,
      duplicateIds: group.ids
    }));
  }

  async getOrphanedPrices(): Promise<Array<{
    id: number;
    price: string;
    productId: number | null;
    clientId: number | null;
    productName?: string;
    clientName?: string;
  }>> {
    const orphaned = await db
      .select({
        id: prices.id,
        price: prices.price,
        productId: prices.productId,
        clientId: prices.clientId,
        productName: products.name,
        clientName: clients.name
      })
      .from(prices)
      .leftJoin(products, eq(prices.productId, products.id))
      .leftJoin(clients, eq(prices.clientId, clients.id))
      .where(or(isNull(products.id), isNull(clients.id)));

    return orphaned;
  }

  async performCleanup(type: string): Promise<{ cleaned: number }> {
    let cleaned = 0;

    switch (type) {
      case 'duplicate-products':
        // Keep the first product, delete others
        const duplicates = await this.getDuplicateProducts();
        for (const group of duplicates) {
          const toDelete = group.duplicateIds.slice(1);
          const result = await db
            .delete(products)
            .where(inArray(products.id, toDelete));
          cleaned += toDelete.length;
        }
        break;

      case 'orphaned-prices':
        const result = await db
          .delete(prices)
          .where(
            or(
              sql`${prices.productId} NOT IN (SELECT id FROM ${products})`,
              sql`${prices.clientId} NOT IN (SELECT id FROM ${clients})`
            )
          );
        // Note: Drizzle doesn't return affected rows count directly
        cleaned = 1; // Placeholder since we can't get exact count
        break;

      case 'inconsistent-prices':
        const cleanResult = await db
          .delete(prices)
          .where(or(
            eq(prices.price, ""),
            sql`${prices.price}::numeric < 0`
          ));
        cleaned = 1; // Placeholder
        break;

      default:
        throw new Error(`Unknown cleanup type: ${type}`);
    }

    return { cleaned };
  }
}

export const storage = new DatabaseStorage();
