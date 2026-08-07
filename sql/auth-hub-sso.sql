-- Login pelo Auth Hub (Microsoft 365 / AD) — migração de banco.
--
-- Autocontido: não depende de `drizzle-kit push` ter rodado antes. Aditivo e
-- idempotente, pode ser reaplicado. Não apaga nem renomeia nada.
--
-- Aplicado no banco de desenvolvimento em 2026-08-07.

BEGIN;

-- "sub" do usuário no Auth Hub. Nullable de propósito: todo cadastro que já
-- existe entra com NULL e só é preenchido no primeiro login pelo hub.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "auth_hub_id" varchar;

-- Único, mas nullable: o Postgres trata NULLs como distintos entre si, então
-- os cadastros ainda não vinculados convivem sem conflito.
CREATE UNIQUE INDEX IF NOT EXISTS "users_auth_hub_id_uq"
  ON "users" ("auth_hub_id");

-- Havia duas grafias do mesmo papel: o banco gravava 'visitante' e o front só
-- reconhece 'visualizador' (client/src/hooks/useUserRole.ts). Na prática essas
-- pessoas caíam no default de permissão, mas a tela de Usuários exibia o papel
-- em branco.
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'visualizador';

UPDATE "users"
   SET "role" = 'visualizador',
       "updated_at" = now()
 WHERE "role" = 'visitante';

COMMIT;

-- Conferência. No banco de dev este UPDATE casou zero linhas (só havia
-- 'administrador' e 'editor'); em produção o resultado pode ser diferente.
SELECT "role", COUNT(*)::int AS usuarios
  FROM "users"
 GROUP BY "role"
 ORDER BY "role";
