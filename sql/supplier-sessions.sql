-- Sessões autenticadas de fornecedor (caso Martins).
--
-- O Martins tem 2FA por SMS no login, então não dá para autenticar
-- programaticamente. A pessoa loga no navegador e cola a sessão capturada.
--
-- body_template guarda o corpo inteiro da requisição de preço: a API recusa
-- (403) um payload remontado, porque ele carrega 37 campos de contexto do
-- cadastro. É também o que faz o preço vir da região e conta certas.
--
-- Aditivo e idempotente.

CREATE TABLE IF NOT EXISTS "supplier_sessions" (
  "id"                  serial PRIMARY KEY NOT NULL,
  "supplier"            varchar(30) NOT NULL,
  "access_token"        text        NOT NULL,   -- SENSÍVEL: nunca expor em API
  "client_id"           varchar(255),           -- público, identifica a aplicação
  "body_template"       jsonb,
  "captured_at"         timestamp   NOT NULL DEFAULT now(),
  "last_ok_at"          timestamp,
  "last_failed_at"      timestamp,
  "last_failure_reason" text,
  "created_at"          timestamp DEFAULT now(),
  "updated_at"          timestamp DEFAULT now()
);

-- Uma sessão viva por fornecedor: capturar de novo substitui a anterior.
CREATE UNIQUE INDEX IF NOT EXISTS "supplier_sessions_supplier_uq"
  ON "supplier_sessions" ("supplier");

-- Cliente Martins. Sem ele o sync aborta: o adapter resolve o fornecedor por
-- nome em `clients` (mesma convenção de Tambasa e Bartofil).
INSERT INTO "clients" ("name", "status")
SELECT 'Martins', 'active'
 WHERE NOT EXISTS (SELECT 1 FROM "clients" WHERE lower("name") = 'martins');

SELECT id, name FROM "clients" WHERE lower("name") = 'martins';
