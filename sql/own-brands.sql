-- Marcas próprias e a nova regra de concorrência.
--
-- Antes: `products.is_competitor` significava "pertence a um cliente que não é
-- a Vellore". Agora significa "a marca do produto não é uma marca nossa".
--
-- A diferença é material: Tambasa e Bartofil revendem Foxlux e Famastil, e
-- esses produtos deixam de ser concorrentes — são os nossos, num outro
-- vendedor. São ~975 linhas mudando de valor.
--
-- Aditivo e idempotente. Não apaga nada.

CREATE TABLE IF NOT EXISTS "own_brands" (
  "id"              serial PRIMARY KEY NOT NULL,
  "name"            varchar(255) NOT NULL,       -- como se exibe: "Foxlux"
  "normalized_name" varchar(255) NOT NULL,       -- forma canônica: "foxlux"
  "active"          boolean NOT NULL DEFAULT true,
  "created_at"      timestamp DEFAULT now(),
  "updated_at"      timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "own_brands_normalized_uq"
  ON "own_brands" ("normalized_name");

-- Marcas próprias iniciais. ON CONFLICT deixa o script seguro para rodar de novo.
INSERT INTO "own_brands" ("name", "normalized_name")
VALUES ('Foxlux', 'foxlux'), ('Famastil', 'famastil')
ON CONFLICT ("normalized_name") DO NOTHING;

-- Índice funcional casando a normalização usada na regra.
--
-- Sem ele, tanto o recomputo em massa quanto qualquer filtro por marca própria
-- fazem seq scan em products (10k+ linhas hoje, e a tabela só cresce).
-- A expressão precisa ser idêntica à das consultas para o planner usar o índice.
CREATE INDEX IF NOT EXISTS "products_manufacturer_normalized_idx"
  ON "products" (
    (regexp_replace(lower(btrim(COALESCE("manufacturer", ''))), '^marca:\s*', ''))
  );

-- Recomputa is_competitor para todo o catálogo a partir das marcas ativas.
--
-- O WHERE final evita reescrever linha que já está com o valor certo — sem ele,
-- toda execução tocaria updated_at de 10 mil produtos e poluiria o histórico.
UPDATE "products" p
   SET "is_competitor" = NOT EXISTS (
         SELECT 1 FROM "own_brands" b
          WHERE b."active"
            AND b."normalized_name" =
                regexp_replace(lower(btrim(COALESCE(p."manufacturer", ''))), '^marca:\s*', '')
       ),
       "updated_at" = now()
 WHERE p."is_competitor" IS DISTINCT FROM NOT EXISTS (
         SELECT 1 FROM "own_brands" b
          WHERE b."active"
            AND b."normalized_name" =
                regexp_replace(lower(btrim(COALESCE(p."manufacturer", ''))), '^marca:\s*', '')
       );

-- Conferência.
SELECT
  COUNT(*) FILTER (WHERE NOT is_competitor)::int AS marca_propria,
  COUNT(*) FILTER (WHERE is_competitor)::int     AS concorrente,
  COUNT(*)::int                                  AS total
FROM "products";
