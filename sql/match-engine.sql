-- Motor de correspondência de produtos.
--
-- Aditivo e idempotente.

-- EAN: o sinal mais forte de equivalência. Martins e Bartofil já devolvem
-- esse dado nas APIs; a coluna existe para capturá-lo nas sincronizações.
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "ean" varchar(20);

CREATE INDEX IF NOT EXISTS "products_ean_idx" ON "products" ("ean")
  WHERE "ean" IS NOT NULL AND "ean" <> '';

-- Fila de revisão. O motor não aplica correspondência quando há dúvida:
-- grava o candidato com pontuação e evidência, e uma pessoa decide.
CREATE TABLE IF NOT EXISTS "product_match_candidates" (
  "id"                   serial PRIMARY KEY NOT NULL,
  "master_product_id"    integer NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  "candidate_product_id" integer NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  "score"                integer NOT NULL,
  "evidence"             jsonb,
  "status"               varchar(20) NOT NULL DEFAULT 'pending',
  "reviewed_by"          varchar REFERENCES "users"("id"),
  "reviewed_at"          timestamp,
  "created_at"           timestamp DEFAULT now(),
  "updated_at"           timestamp DEFAULT now()
);

-- Um par entra uma vez; reprocessar atualiza em vez de duplicar.
CREATE UNIQUE INDEX IF NOT EXISTS "product_match_candidates_par_uq"
  ON "product_match_candidates" ("master_product_id", "candidate_product_id");

CREATE INDEX IF NOT EXISTS "product_match_candidates_status_idx"
  ON "product_match_candidates" ("status");

SELECT
  (SELECT COUNT(*)::int FROM information_schema.columns
    WHERE table_name='products' AND column_name='ean') AS coluna_ean,
  (SELECT COUNT(*)::int FROM information_schema.tables
    WHERE table_name='product_match_candidates') AS tabela_candidatos;
