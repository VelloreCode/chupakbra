-- Tabelas da extração automática de preços (Tambasa / Bartofil).
--
-- Equivalente ao que `npm run db:push` geraria a partir de shared/schema.ts,
-- escrito à mão porque o drizzle-kit não está disponível dentro do container de
-- runtime (npm ci --omit=dev) e o Postgres do Dokploy só é acessível de dentro
-- da rede interna.
--
-- É puramente aditivo: só cria. Não altera nem remove nada existente, e é
-- idempotente (IF NOT EXISTS), então rodar duas vezes não faz mal.
--
-- Aplicar no banco de teste e, no futuro, também no de produção.

CREATE TABLE IF NOT EXISTS "supplier_categories" (
  "id"                 serial PRIMARY KEY NOT NULL,
  "supplier"           varchar(30)  NOT NULL,           -- 'tambasa' | 'bartofil'
  "external_id"        varchar(500) NOT NULL,           -- slug (Tambasa) | id_categoria (Bartofil)
  "label"              varchar(255) NOT NULL,
  "parent_external_id" varchar(500),
  "enabled"            boolean      NOT NULL DEFAULT false,
  "last_synced_at"     timestamp,
  "last_product_count" integer      DEFAULT 0,
  "created_at"         timestamp    DEFAULT now(),
  "updated_at"         timestamp    DEFAULT now()
);

-- O upsert de descoberta de categorias depende deste índice.
CREATE UNIQUE INDEX IF NOT EXISTS "supplier_categories_supplier_external_uq"
  ON "supplier_categories" ("supplier", "external_id");

CREATE TABLE IF NOT EXISTS "supplier_sync_runs" (
  "id"                   serial PRIMARY KEY NOT NULL,
  "supplier"             varchar(30) NOT NULL,
  "status"               varchar(20) NOT NULL,          -- running | success | partial | failed
  "trigger"              varchar(20) NOT NULL,          -- cron | manual
  "dry_run"              boolean     NOT NULL DEFAULT false,
  "started_at"           timestamp   NOT NULL DEFAULT now(),
  "finished_at"          timestamp,
  "categories_processed" integer     DEFAULT 0,
  "products_seen"        integer     DEFAULT 0,
  "products_matched"     integer     DEFAULT 0,
  "prices_updated"       integer     DEFAULT 0,
  "products_skipped"     integer     DEFAULT 0,
  "unmatched_codes"      jsonb,                         -- { total, sample[] }
  "error_details"        jsonb
);

-- Conferência rápida depois de aplicar:
--   SELECT table_name FROM information_schema.tables
--    WHERE table_name IN ('supplier_categories', 'supplier_sync_runs');
-- Devem voltar as duas linhas.
