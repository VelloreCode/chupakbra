import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  serial,
  decimal,
  boolean,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default("visualizador"), // "administrador", "editor", "visualizador"
  passwordHash: varchar("password_hash"), // Para usuários criados manualmente
  // "sub" do usuário no Auth Hub (Microsoft Entra ID). Guardado para reencontrar
  // a pessoa mesmo que o e-mail dela mude no AD.
  authHubId: varchar("auth_hub_id").unique(),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Categories table
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Clients table
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  apiKey: varchar("api_key", { length: 255 }),
  isMaster: boolean("is_master").notNull().default(false), // Marca o cliente master (dono dos produtos)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Competitors table
export const competitors = pgTable("competitors", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  website: varchar("website", { length: 500 }),
  description: text("description"),
  marketPosition: varchar("market_position", { length: 50 }), // premium, mid-market, budget
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Products table
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  sku: varchar("sku", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  manufacturer: text("manufacturer"), // Novo campo para marca/fabricante
  categoryId: integer("category_id").references(() => categories.id),
  clientId: integer("client_id").references(() => clients.id), // Cliente associado ao produto
  competitorId: integer("competitor_id").references(() => competitors.id), // Concorrente associado ao produto
  isCompetitor: boolean("is_competitor").notNull().default(false), // Checkbox para concorrente
  sourceType: varchar("source_type", { length: 20 }).notNull().default("client"), // "client" ou "competitor"
  basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull(),
  imageUrl: varchar("image_url", { length: 500 }),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  matchGroup: varchar("match_group", { length: 100 }), // Grupo de produtos equivalentes
  brandSku: varchar("brand_sku", { length: 100 }), // SKU da sua marca
  sourceUrl: varchar("source_url", { length: 1000 }), // URL de origem do produto
  // Código de barras. É o sinal mais forte de equivalência entre produtos de
  // vendedores diferentes: EAN igual é o mesmo item físico, sem ambiguidade.
  // Martins e Bartofil já devolvem esse dado nas APIs.
  ean: varchar("ean", { length: 20 }),
  isMaster: boolean("is_master").notNull().default(false), // Produto master ou de monitoramento
  masterProductId: integer("master_product_id").references((): any => products.id), // Referência ao produto master
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Prices table
export const prices = pgTable("prices", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id),
  clientId: integer("client_id").references(() => clients.id),
  competitorId: integer("competitor_id").references(() => competitors.id),
  sourceType: varchar("source_type", { length: 20 }).notNull().default("client"), // "client" ou "competitor"
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 5, scale: 2 }).default("0"),
  isAvailable: boolean("is_available").default(true),
  lastUpdated: timestamp("last_updated").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Upload history table
export const uploadHistory = pgTable("upload_history", {
  id: serial("id").primaryKey(),
  filename: varchar("filename", { length: 255 }).notNull(),
  recordsProcessed: integer("records_processed").notNull(),
  recordsSuccess: integer("records_success").notNull(),
  recordsError: integer("records_error").notNull(),
  status: varchar("status", { length: 20 }).notNull(),
  errorDetails: jsonb("error_details"),
  userId: varchar("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// API Keys table
export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  keyHash: varchar("key_hash", { length: 255 }).notNull().unique(),
  userId: varchar("user_id").references(() => users.id),
  lastUsed: timestamp("last_used"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Price History table
export const priceHistory = pgTable("price_history", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  clientId: integer("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  oldPrice: decimal("old_price", { precision: 10, scale: 2 }),
  newPrice: decimal("new_price", { precision: 10, scale: 2 }).notNull(),
  changeReason: text("change_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Price Monitoring History table
export const priceMonitoringHistory = pgTable("price_monitoring_history", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  priceOld: decimal("price_old", { precision: 10, scale: 2 }),
  priceNew: decimal("price_new", { precision: 10, scale: 2 }).notNull(),
  dateChecked: timestamp("date_checked").defaultNow().notNull(),
  source: text("source").default("url_monitoring"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Reports History table
export const reportsHistory = pgTable("reports_history", {
  id: serial("id").primaryKey(),
  reportType: varchar("report_type", { length: 100 }).notNull(), // "price-comparison", "savings-analysis", etc.
  reportTitle: varchar("report_title", { length: 255 }).notNull(),
  generatedBy: varchar("generated_by").notNull().references(() => users.id),
  parameters: jsonb("parameters"), // Filtros e parâmetros usados
  recordCount: integer("record_count").default(0), // Quantidade de registros no relatório
  fileFormat: varchar("file_format", { length: 20 }).default("json"), // "json", "excel", "pdf"
  filePath: varchar("file_path", { length: 500 }), // Caminho do arquivo gerado (se aplicável)
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Product Match Candidates table
//
// Fila de revisão do motor de match. O motor NUNCA aplica correspondência
// sozinho quando há dúvida: ele grava o candidato com a pontuação e o motivo,
// e uma pessoa decide.
//
// Existe porque os falsos positivos medidos na base atual vieram justamente
// de match aplicado sem verificação — grupos com cortadores de 115cm e 120cm
// juntos, variando de R$ 1,41 a R$ 1.290.
export const productMatchCandidates = pgTable("product_match_candidates", {
  id: serial("id").primaryKey(),
  masterProductId: integer("master_product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  candidateProductId: integer("candidate_product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  // 0 a 100. Acima do limiar de aceite vira sugestão forte; na faixa do meio,
  // revisão obrigatória; abaixo, descartado e nem gravado.
  score: integer("score").notNull(),
  // Como o motor chegou nesse número: quais atributos bateram, quais não.
  evidence: jsonb("evidence"),
  // pending | approved | rejected
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Um par só entra uma vez; reprocessar atualiza em vez de duplicar.
  uniqueIndex("product_match_candidates_par_uq").on(table.masterProductId, table.candidateProductId),
  index("product_match_candidates_status_idx").on(table.status),
]);

// Supplier Sessions table
//
// Sessão autenticada de fornecedor que não permite login programático.
// O caso é o Martins: o login tem 2FA por SMS, então a pessoa autentica no
// próprio navegador e cola aqui o que foi capturado.
//
// Guarda também o corpo da requisição inteiro (bodyTemplate). Não é excesso:
// a API do Martins recusa (403) um payload remontado — ele carrega 37 campos
// de contexto do cadastro (região de preço, filial, cidade de entrega), e é
// justamente isso que faz o preço ser o da conta e da região certas.
export const supplierSessions = pgTable("supplier_sessions", {
  id: serial("id").primaryKey(),
  supplier: varchar("supplier", { length: 30 }).notNull(),
  // Token de sessão. Sensível: nunca deve sair em resposta de API.
  accessToken: text("access_token").notNull(),
  // Identificador público da aplicação, não é segredo.
  clientId: varchar("client_id", { length: 255 }),
  bodyTemplate: jsonb("body_template"),
  capturedAt: timestamp("captured_at").defaultNow().notNull(),
  // Marcam a saúde da sessão: a UI usa para dizer "expirou, capture de novo".
  lastOkAt: timestamp("last_ok_at"),
  lastFailedAt: timestamp("last_failed_at"),
  lastFailureReason: text("last_failure_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Uma sessão viva por fornecedor; capturar de novo substitui a anterior.
  uniqueIndex("supplier_sessions_supplier_uq").on(table.supplier),
]);

// Own Brands table
//
// Marcas próprias do grupo (Foxlux, Famastil). É o que separa "produto nosso"
// de "produto concorrente": produto cuja marca está aqui NÃO é concorrente;
// qualquer outra marca é.
//
// Tabela em vez de constante no código para a regra crescer sem deploy — o
// pedido era justamente incluir novas marcas sem refatoração.
export const ownBrands = pgTable("own_brands", {
  id: serial("id").primaryKey(),
  // Como a marca é exibida.
  name: varchar("name", { length: 255 }).notNull(),
  // Forma canônica usada na comparação: minúscula, sem espaço nas pontas e sem
  // o prefixo "Marca: " que alguns scrapers gravaram junto. É o que permite
  // "FOXLUX", "Foxlux" e "Marca: FOXLUX" caírem no mesmo lugar.
  normalizedName: varchar("normalized_name", { length: 255 }).notNull(),
  // Desativar em vez de apagar preserva o histórico da regra.
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("own_brands_normalized_uq").on(table.normalizedName),
]);

// Supplier Categories table
// Categorias dos portais dos fornecedores (Tambasa, Bartofil) que o usuário marca
// para monitorar. `enabled` nasce false: a seleção é opt-in pela tela.
export const supplierCategories = pgTable("supplier_categories", {
  id: serial("id").primaryKey(),
  supplier: varchar("supplier", { length: 30 }).notNull(), // "tambasa" | "bartofil"
  // tambasa: path do slug ("material-de-construcao/carpintaria/fresas")
  // bartofil: categoria.id do Supabase
  externalId: varchar("external_id", { length: 500 }).notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  parentExternalId: varchar("parent_external_id", { length: 500 }),
  enabled: boolean("enabled").notNull().default(false),
  lastSyncedAt: timestamp("last_synced_at"),
  // Guarda quantos produtos a última varredura viu. Serve de detector de quebra:
  // categoria que trazia >0 e passa a trazer 0 indica mudança de layout/API.
  lastProductCount: integer("last_product_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("supplier_categories_supplier_external_uq").on(
    table.supplier,
    table.externalId,
  ),
]);

// Supplier Sync Runs table
// Histórico das execuções de sincronização. Existe no banco porque o estado da
// execução vive em memória e não sobrevive a restart.
export const supplierSyncRuns = pgTable("supplier_sync_runs", {
  id: serial("id").primaryKey(),
  supplier: varchar("supplier", { length: 30 }).notNull(),
  status: varchar("status", { length: 20 }).notNull(), // running, success, partial, failed
  trigger: varchar("trigger", { length: 20 }).notNull(), // cron, manual
  dryRun: boolean("dry_run").notNull().default(false),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  finishedAt: timestamp("finished_at"),
  categoriesProcessed: integer("categories_processed").default(0),
  productsSeen: integer("products_seen").default(0),
  productsMatched: integer("products_matched").default(0),
  pricesUpdated: integer("prices_updated").default(0),
  productsSkipped: integer("products_skipped").default(0),
  unmatchedCodes: jsonb("unmatched_codes"), // { total: number, sample: string[] }
  errorDetails: jsonb("error_details"),
});

// Relations
export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  client: one(clients, {
    fields: [products.clientId],
    references: [clients.id],
  }),
  competitor: one(competitors, {
    fields: [products.competitorId],
    references: [competitors.id],
  }),
  prices: many(prices),
  priceHistory: many(priceHistory),
  priceMonitoringHistory: many(priceMonitoringHistory),
}));

export const clientsRelations = relations(clients, ({ many }) => ({
  products: many(products),
  prices: many(prices),
  apiKeys: many(apiKeys),
}));

export const competitorsRelations = relations(competitors, ({ many }) => ({
  products: many(products),
  prices: many(prices),
}));

export const pricesRelations = relations(prices, ({ one }) => ({
  product: one(products, {
    fields: [prices.productId],
    references: [products.id],
  }),
  client: one(clients, {
    fields: [prices.clientId],
    references: [clients.id],
  }),
  competitor: one(competitors, {
    fields: [prices.competitorId],
    references: [competitors.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  uploadHistory: many(uploadHistory),
  apiKeys: many(apiKeys),
  reportsHistory: many(reportsHistory),
}));

export const uploadHistoryRelations = relations(uploadHistory, ({ one }) => ({
  user: one(users, {
    fields: [uploadHistory.userId],
    references: [users.id],
  }),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  user: one(users, {
    fields: [apiKeys.userId],
    references: [users.id],
  }),
}));

export const priceHistoryRelations = relations(priceHistory, ({ one }) => ({
  product: one(products, {
    fields: [priceHistory.productId],
    references: [products.id],
  }),
  client: one(clients, {
    fields: [priceHistory.clientId],
    references: [clients.id],
  }),
}));

export const priceMonitoringHistoryRelations = relations(priceMonitoringHistory, ({ one }) => ({
  product: one(products, {
    fields: [priceMonitoringHistory.productId],
    references: [products.id],
  }),
}));

export const reportsHistoryRelations = relations(reportsHistory, ({ one }) => ({
  user: one(users, {
    fields: [reportsHistory.generatedBy],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  apiKey: true,
});

export const insertCompetitorSchema = createInsertSchema(competitors).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  manufacturer: z.string().optional(),
  categoryId: z.number().nullable().optional(),
  clientId: z.number().nullable().optional(),
  competitorId: z.number().nullable().optional(),
  isCompetitor: z.boolean().default(false),
  basePrice: z.string().min(1, "Preço base é obrigatório"),
  sourceType: z.enum(["client", "competitor"]).default("client"),
});

export const insertPriceSchema = createInsertSchema(prices).omit({
  id: true,
  createdAt: true,
  lastUpdated: true,
}).extend({
  price: z.string().min(1, "Preço é obrigatório"),
  sourceType: z.enum(["client", "competitor"]).default("client"),
});

export const insertUploadHistorySchema = createInsertSchema(uploadHistory).omit({
  id: true,
  createdAt: true,
});

export const insertApiKeySchema = createInsertSchema(apiKeys).omit({
  id: true,
  createdAt: true,
  lastUsed: true,
  keyHash: true,
});

export const insertPriceHistorySchema = createInsertSchema(priceHistory).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPriceMonitoringHistorySchema = createInsertSchema(priceMonitoringHistory).omit({
  id: true,
  createdAt: true,
});

export const insertReportsHistorySchema = createInsertSchema(reportsHistory).omit({
  id: true,
  generatedAt: true,
  createdAt: true,
});

export const insertSupplierCategorySchema = createInsertSchema(supplierCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  supplier: z.enum(["tambasa", "bartofil", "martins"]),
});

export const insertSupplierSessionSchema = createInsertSchema(supplierSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  capturedAt: true,
});

export const insertOwnBrandSchema = createInsertSchema(ownBrands).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  normalizedName: true, // derivado de `name` no storage, nunca informado pelo cliente
}).extend({
  name: z.string().min(1, "Nome da marca é obrigatório"),
});

export const insertSupplierSyncRunSchema = createInsertSchema(supplierSyncRuns).omit({
  id: true,
  startedAt: true,
}).extend({
  supplier: z.enum(["tambasa", "bartofil", "martins"]),
  status: z.enum(["running", "success", "partial", "failed"]),
  trigger: z.enum(["cron", "manual"]),
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

export type InsertCompetitor = z.infer<typeof insertCompetitorSchema>;
export type Competitor = typeof competitors.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;
export type InsertPrice = z.infer<typeof insertPriceSchema>;
export type Price = typeof prices.$inferSelect;
export type InsertUploadHistory = z.infer<typeof insertUploadHistorySchema>;
export type UploadHistory = typeof uploadHistory.$inferSelect;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertPriceHistory = z.infer<typeof insertPriceHistorySchema>;
export type PriceHistory = typeof priceHistory.$inferSelect;
export type InsertPriceMonitoringHistory = z.infer<typeof insertPriceMonitoringHistorySchema>;
export type PriceMonitoringHistory = typeof priceMonitoringHistory.$inferSelect;
export type InsertReportsHistory = z.infer<typeof insertReportsHistorySchema>;
export type ReportsHistory = typeof reportsHistory.$inferSelect;
export type InsertSupplierCategory = z.infer<typeof insertSupplierCategorySchema>;
export type SupplierCategory = typeof supplierCategories.$inferSelect;
export type InsertSupplierSyncRun = z.infer<typeof insertSupplierSyncRunSchema>;
export type SupplierSyncRun = typeof supplierSyncRuns.$inferSelect;
export type InsertOwnBrand = z.infer<typeof insertOwnBrandSchema>;
export type OwnBrand = typeof ownBrands.$inferSelect;
export type InsertSupplierSession = z.infer<typeof insertSupplierSessionSchema>;
export type SupplierSession = typeof supplierSessions.$inferSelect;
export type ProductMatchCandidate = typeof productMatchCandidates.$inferSelect;

/**
 * Forma canônica de uma marca, usada para decidir se é marca própria.
 *
 * Os dados reais trazem "Foxlux", "FOXLUX" e "Marca: FOXLUX" para a mesma
 * marca — comparar literalmente classificaria errado centenas de produtos.
 *
 * ATENÇÃO: há uma versão equivalente em SQL dentro de
 * `recomputeCompetitorFlags` (server/storage.ts), porque o recomputo em massa
 * roda no banco. Se mudar a regra aqui, mude lá também.
 */
export function normalizeBrand(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .trim()
    .toLowerCase()
    .replace(/^marca:\s*/, "")
    .trim();
}
