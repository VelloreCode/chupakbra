# Ambientes no Dokploy — produção e teste

Produção subiu em **2026-08-10**. Este documento registra como foi feito e o
que deu errado no caminho, para servir de guia se um terceiro ambiente for
criado.

## Estado atual

| | Produção | Teste |
|---|---|---|
| Endereço | `cpk.grupovellore.com.br` | `testecpk.grupovellore.com.br` |
| Projeto Dokploy | Apps Vellore - Produção | Apps Vellore - Teste |
| Branch | `main` | `Teste` |
| Instância Postgres | `apps-vellore-postgresqlapps-prod-o9mfxa` | `apps-vellore-postgresqlapps-teste-dpmvc1` |
| Banco / role | `chupakbra` / `chupakbra` | `chupakbra` / `chupakbra` |
| Porta externa do Postgres | 15432 | 15433 |
| Login Microsoft 365 | desligado | ligado |

Ambos com HTTPS via Let's Encrypt e DNS apontando para `216.128.168.129`
(registros A `cpk` e `testecpk`, gerenciados no admin do Microsoft 365 — os
nameservers do domínio são `ns1..ns4.bdm.microsoftonline.com`).

O fluxo de trabalho é: desenvolver em `Teste`, validar em
`testecpk.grupovellore.com.br`, promover para `main` quando estiver pronto.
Produção só muda quando `main` muda.

---

# As quatro armadilhas

Estas custaram tempo real. Se for criar outro ambiente, leia antes.

## 1. A tabela `sessions` não é criada sozinha

`server/replitAuth.ts` configura o `connect-pg-simple` com
**`createTableIfMissing: false`**. Se a tabela `sessions` não existir no banco,
a aplicação sobe normalmente e **ninguém consegue logar**.

Ela está declarada no `shared/schema.ts`, então o `drizzle-kit push` a cria —
mas se você montar o schema por outro caminho, confira explicitamente.

## 2. Dois índices não estão no `schema.ts`

O motor de correspondência depende de dois índices criados pelos scripts em
`sql/`, que **não existem no `shared/schema.ts`** e portanto não vêm no
`drizzle-kit push`:

- `products_manufacturer_normalized_idx` — índice funcional sobre
  `regexp_replace(lower(btrim(coalesce(manufacturer,''))), '^marca:\s*', '')`
- `products_ean_idx` — índice parcial sobre `ean`, com `WHERE ean IS NOT NULL`

Sem eles a aplicação funciona, mas as consultas de match ficam lentas. A
conferência é simples: contar `pg_indexes` nos dois ambientes e comparar. Em
2026-08-10 o número correto era **29**.

## 3. Colunas `jsonb` corrompem numa cópia via driver `pg`

Ao copiar dados de um banco para outro com `node-postgres`, valores de colunas
`json`/`jsonb` que voltam como **array JavaScript** são convertidos pelo driver
para a sintaxe de array do Postgres (`{...}`), que não é JSON válido. O erro é
`invalid input syntax for type json`.

A correção é aplicar `JSON.stringify` explícito nos valores destinados a essas
colunas. As colunas afetadas hoje:

```
product_match_candidates.evidence     supplier_sync_runs.unmatched_codes
reports_history.parameters            supplier_sync_runs.error_details
sessions.sess                         upload_history.error_details
supplier_sessions.body_template
```

Usar `pg_dump`/`psql` em vez de um script evita o problema por completo.

## 4. Senha com caractere especial quebra a connection string

Aconteceu **duas vezes**, em lugares diferentes. Uma senha contendo `$`, `&`,
`+` ou `@` precisa ser percent-encoded (`%24`, `%26`, `%2B`, `%40`) dentro de
uma URL `postgres://`. Sem isso o parser corta a string no lugar errado e o
erro que aparece é genérico: `password authentication failed` ou um host
inexistente.

**Use senha só com letras e números** para as roles de banco. O ganho de
entropia dos símbolos não compensa a classe de bug que eles introduzem.

Sintoma real observado em produção:

```
getaddrinfo ENOTFOUND apps-vellVell0re2026ore-postgresqlapps-prod-o9mfxa
                                └── a senha foi parar dentro do hostname
```

A aplicação subia normalmente (a variável existia), `/api/auth/user` respondia
401 — e só o login dava 500, porque é a primeira rota que consulta o banco.
**Ao diagnosticar, teste `/api/auth/login`, não a home.**

---

# O procedimento

## Parte 1 — Publicar a branch

```bash
git push origin main
```

Repositório: `git@github.com:VelloreCode/chupakbra.git`

## Parte 2 — Criar banco e role

A convenção da infra é **uma instância Postgres por ambiente, com um banco e
uma role por aplicação dentro dela** — `chupakbra`, `hubrcateste` e `iallore`
convivem na mesma instância. Não crie um serviço Postgres novo.

Em `PostgreSQL Apps Prod → Open Terminal`, um comando por vez:

```bash
psql -U vellore -d vellore -c "CREATE ROLE chupakbra LOGIN PASSWORD 'SoLetrasENumeros';"
```

```bash
psql -U vellore -d vellore -c "CREATE DATABASE chupakbra OWNER chupakbra;"
```

> O Docker Terminal do Dokploy **trunca linhas longas e não preserva variáveis
> entre comandos**. Prefira comandos curtos de uma linha, ou use SSH.

## Parte 3 — Schema e dados

O caminho mais simples é `pg_dump` de um container para o outro. Ambos os
Postgres têm porta externa, então o terminal do ambiente de origem alcança o
de destino:

```bash
pg_dump -U chupakbra -d chupakbra --no-owner --no-acl > /tmp/cpk.sql
```

```bash
export PGPASSWORD='senha_do_destino'
```

```bash
psql -h 216.128.168.129 -p 15432 -U chupakbra -d chupakbra < /tmp/cpk.sql
```

Confira o tamanho do dump antes de restaurar (`ls -lh /tmp/cpk.sql`) — se vier
em bytes, você dumpou o banco errado. O `SELECT count(*) FROM products` é a
verificação definitiva de que você está no container certo.

**Depois de qualquer restauração**, rode `sql/fix-sequences.sql`. Sem isso o
primeiro cadastro novo falha com `duplicate key`, e o sintoma engana: parece
bug de código gravando duas vezes, quando é o contador do banco atrasado.

## Parte 4 — Criar a aplicação

**Create Service → Application**, e depois, por aba:

| Aba | Campo | Valor |
|---|---|---|
| General | Provider | GitHub (a conta conectada — **selecione**, não herda) |
| General | Repositório / Branch | `VelloreCode/chupakbra` / `main` |
| General | Build Type | Dockerfile (deixe os três campos abaixo vazios) |
| Domains | Host / Port | `cpk.grupovellore.com.br` / `5003` |
| Domains | HTTPS | ligado, `letsencrypt` |

Os campos de Dockerfile ficam vazios de propósito: o arquivo está na raiz com
o nome padrão, o contexto é `.`, e o `Docker Build Stage` vazio faz o Docker
construir a última etapa — que é o `runner`. Preencher `production` ali dá
erro, porque não existe etapa com esse nome.

> Se o deploy falhar em **0 segundos** com `Github Provider not found`, é o
> provider não selecionado na aba General. Criar a aplicação não herda a
> conexão do outro serviço.

## Parte 5 — Variáveis de ambiente

```bash
NODE_ENV=production
PORT=5003
DATABASE_URL=postgres://chupakbra:SENHA@apps-vellore-postgresqlapps-prod-o9mfxa:5432/chupakbra
SESSION_SECRET=<novo, openssl rand -base64 32>
CRON_SECRET=<novo>
OPENAI_API_KEY=<a mesma do teste>

SUPPLIER_USER_AGENT=ChupaKbra-PriceSync/1.0 (+monitoramento de precos B2B)
TAMBASA_BASE_URL=https://tambasa.com
TAMBASA_USER=      TAMBASA_PASSWORD=
TAMBASA_DELAY_MS=1500   TAMBASA_MAX_PAGES=50
TAMBASA_PER_PAGE=100    TAMBASA_ENGINE=axios

BARTOFIL_SUPABASE_URL=https://yadsszhyfgiyuqwvaydp.supabase.co
BARTOFIL_SUPABASE_ANON_KEY=   BARTOFIL_CNPJ=   BARTOFIL_PASSWORD=
BARTOFIL_DELAY_MS=300   BARTOFIL_PAGE_SIZE=100

SUPPLIER_SYNC_ENABLED=true
SUPPLIER_SYNC_CRON=0 7 * * *
```

- A `DATABASE_URL` usa o **Internal Host** e a porta **5432** — não o IP
  externo com 15432.
- **`SESSION_SECRET` tem que ser diferente por ambiente.** Se repetir, um
  cookie emitido num ambiente vale no outro.
- **Não defina `AUTH_HUB_ENABLED`** se o SSO não estiver liberado para o
  domínio: sem ela o servidor não registra `/api/auth/sso/*` e o botão do
  Microsoft 365 não aparece. O padrão é desligado de propósito.
- Não defina `REPLIT_DOMAINS` nem `REPL_ID`.

## Parte 6 — Verificação

Não confie na tela: teste de fora.

```bash
curl -s -o /dev/null -w "%{http_code} cert=%{ssl_verify_result}\n" https://cpk.grupovellore.com.br/
curl -s https://cpk.grupovellore.com.br/api/auth/sso/status
curl -s -X POST https://cpk.grupovellore.com.br/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"inexistente@exemplo.invalid","password":"x"}'
```

O que esperar: `200 cert=0`, `{"enabled":false}`, e **401 "Credenciais
inválidas"**. Um **500** no login significa que a aplicação não está
alcançando o banco — vá direto para a aba Logs.

Um 404 vindo do Traefik (com certificado válido) significa que nenhum serviço
reivindica aquele hostname: falta cadastrar o domínio na aba Domains.

---

# Pontos de atenção permanentes

**Sincronização de fornecedores duplicada.** Com `SUPPLIER_SYNC_ENABLED=true`
nos dois ambientes, ambos raspam os portais às 07:00 com as **mesmas
credenciais B2B**. A Tambasa fica atrás de Cloudflare e responde 429 a tráfego
suspeito. Mantenha ligado **só em produção**.

**Senha do banco de produção.** Deve ser rotacionada — ela ficou registrada nos
logs do Dokploy durante o incidente do hostname corrompido, e a porta 15432 é
acessível pela internet. Trocar exige três lugares: `ALTER ROLE` no banco,
`DATABASE_URL` no Dokploy, e `PROD_DATABASE_URL` no `.env` local de quem
administra.

**Hash de senha fraco.** O login local usa SHA-256 sem salt
(`server/routes.ts`). Já é uma melhora sobre o que existia — até o commit
`783f879` a rota aceitava qualquer senha para usuário existente — mas com
produção exposta na internet vale migrar para bcrypt ou argon2.

**DNS no Microsoft 365.** O painel só aceita subdomínios de nível único de
forma confiável; `teste.cpk.grupovellore.com.br` (terceiro nível) não resolveu.
Use nomes como `cpk` e `testecpk`. E o `nslookup` do Windows omite o endereço
nessa zona mesmo quando o registro está correto — confirme com `curl` e o
campo `%{remote_ip}`, não com o `nslookup`.

**`MIGRACAO_DOKPLOY.md`** é o documento anterior, da migração Replit → Dokploy.
Está desatualizado (repositório antigo, aviso sobre senha já corrigido). Use
este.
