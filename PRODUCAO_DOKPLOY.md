# Subir o ambiente de PRODUÇÃO no Dokploy

Roteiro para criar a aplicação de produção ao lado da de teste, que já roda.
Escrito em 2026-08-07, com os dados apurados do projeto nesta data.

**Decisões que este guia assume:**

| Item | Decisão |
|---|---|
| Banco | Postgres **novo**, com cópia dos dados do teste |
| Branch | `main` (teste continua em `Teste`) |
| Login Microsoft 365 | **fora de escopo agora** — só login local por e-mail/senha |

**O ambiente de teste continua existindo e intocado.** Nada aqui desliga ou
altera o que já está no ar.

---

## O que já foi verificado (não precisa refazer)

- `npm run build` passa: `dist/index.js` (343 kb) + client (1,15 MB).
- O servidor escuta em `0.0.0.0` e respeita `PORT` (padrão 5003).
- Em `NODE_ENV=production` ele serve os estáticos sozinho, sem Vite.
- **Playwright não é importado em runtime** — só aparece como string de
  configuração. O `Dockerfile` slim não precisa de Chromium.
- `.env`, `cookies.txt`, `fresh_session.txt` e os dumps `database_*.sql`
  estão todos no `.gitignore`. Nada sensível vai para o GitHub.
- `main` é ancestral de `Teste`: o merge é fast-forward, sem conflito.

Banco de teste hoje: `216.128.168.129:15433`, **PostgreSQL 17.10**, 20 MB.
Maiores tabelas: `price_monitoring_history` (47.432 linhas), `products`
(10.863), `price_history` (4.416).

---

## Parte 1 — Publicar `main` no GitHub

O merge local já foi feito: `main` está igual a `Teste`, com os 23 commits de
desenvolvimento. Falta enviar.

```bash
git push origin main
```

Repositório: `git@github.com:VelloreCode/chupakbra.git`

Envie também a branch de teste, que está 4 commits à frente do remoto:

```bash
git push origin Teste
```

---

## Parte 2 — Criar o banco de produção

**Não crie um serviço Postgres novo.** A convenção desta infra é uma instância
Postgres por ambiente, com um banco e uma role por aplicação dentro dela. No
ambiente de teste:

| Banco | Dono |
|---|---|
| `chupakbra` | `chupakbra` |
| `hubrcateste` | `hubrcateste` |
| `iallore` | `iallore` |
| `vellore_teste` | `vellore_teste` (superusuário da instância) |

Produção já tem a instância equivalente, no projeto **Apps Vellore - Produção**:

| | |
|---|---|
| Serviço | `PostgreSQL Apps Prod` |
| Internal Host | `apps-vellore-postgresqlapps-prod-o9mfxa` |
| Imagem | `pgvector/pgvector:pg17` — **PostgreSQL 17**, mesma major do teste |
| Superusuário | `vellore` |

O ChupaKbra usa apenas a extensão `plpgsql`; pgvector não é necessário, só vem
junto na imagem.

**Passos** — em `PostgreSQL Apps Prod → Open Terminal`:

```bash
psql -U vellore -d vellore
```

```sql
CREATE ROLE chupakbra LOGIN PASSWORD 'SENHA_FORTE';
CREATE DATABASE chupakbra OWNER chupakbra;
```

Confira com `\l` e saia com `\q`. A `DATABASE_URL` da Parte 5 fica:

```
postgres://chupakbra:SENHA_FORTE@apps-vellore-postgresqlapps-prod-o9mfxa:5432/chupakbra
```

Use o **Internal Host**, não o IP externo: o tráfego fica na rede do Docker.

---

## Parte 3 — Copiar os dados do teste para produção

Feita **por SSH no servidor do Dokploy**, com `docker exec`. Assim o
`pg_dump` tem exatamente a versão do servidor e você não instala nada na sua
máquina (seu Windows não tem `pg_dump`, e o cliente precisaria ser ≥ 17).

**1. Descobrir os nomes dos containers:**

```bash
docker ps --format '{{.Names}}' | grep -i postgres
```

**2. Fazer um dump do teste (guarde o arquivo — é seu ponto de retorno):**

```bash
docker exec -t <container-teste> pg_dump -U chupakbra -d chupakbra --no-owner --no-acl > /root/chupakbra-teste-$(date +%F).sql
```

**3. Conferir que o dump não saiu vazio antes de seguir:**

```bash
ls -lh /root/chupakbra-teste-*.sql && head -5 /root/chupakbra-teste-*.sql
```

Deve ter alguns MB. Se vier com poucos bytes, pare e investigue.

**4. Restaurar no banco de produção:**

```bash
cat /root/chupakbra-teste-*.sql | docker exec -i <container-prod> psql -U <usuario-prod> -d <banco-prod>
```

**5. Reajustar as sequências — passo obrigatório:**

Copie o conteúdo de [`sql/fix-sequences.sql`](sql/fix-sequences.sql) e rode no
banco de produção. Um `pg_dump` completo normalmente já restaura as sequências
via `setval`, mas este script é idempotente e barato, e existe no projeto
justamente porque o problema já apareceu antes. Sem ele, o sintoma é enganoso:

```
duplicate key value violates unique constraint "<tabela>_pkey"
```

Parece bug de código gravando duas vezes, mas é o contador do banco atrasado.

**6. Conferir que os dados chegaram:**

```sql
SELECT relname, n_live_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC LIMIT 10;
```

Compare com os números da tabela lá em cima.

---

## Parte 4 — Criar a aplicação no Dokploy

1. **Projeto → Create Application**.
2. **Source**: Git Provider → GitHub, via SSH (a mesma Deploy Key já usada pela
   aplicação de teste serve — é o mesmo repositório).
3. **Repositório**: `VelloreCode/chupakbra`, branch **`main`**.
4. **Build type**: Dockerfile (já está na raiz, build em duas etapas).
5. **Porta interna**: `5003`.
6. **Domínio**: `cpk.grupovellore.com.br`, com HTTPS (Let's Encrypt).

### Antes: liberar o domínio, que hoje é do teste

`cpk.grupovellore.com.br` aponta para o **Chupa Kbra - Teste**. Um hostname só
pode pertencer a um serviço por vez — é o Traefik que roteia por ele. A ordem
abaixo evita deixar o teste fora do ar antes de produção existir:

1. Crie o DNS de `cpk-teste.grupovellore.com.br` apontando para
   `216.128.168.129`. **Antes de mexer no Dokploy** — o Let's Encrypt só emite
   certificado para domínio que já resolve.
2. Confirme que o novo nome resolve.
3. No Dokploy, troque o domínio do **Chupa Kbra - Teste** para `cpk-teste...`
   e deixe emitir o certificado.
4. Confirme que o teste abre no endereço novo.
5. Só então cadastre `cpk.grupovellore.com.br` na aplicação de produção.

---

## Parte 5 — Variáveis de ambiente

```bash
NODE_ENV=production
PORT=5003
DATABASE_URL=<connection string do Postgres de produção, da Parte 2>
SESSION_SECRET=<GERE UM NOVO — veja abaixo>
CRON_SECRET=<gere um novo>
OPENAI_API_KEY=<a mesma chave já em uso>

SUPPLIER_USER_AGENT=ChupaKbra-PriceSync/1.0 (+monitoramento de precos B2B)

TAMBASA_BASE_URL=https://tambasa.com
TAMBASA_USER=<mesmo do teste>
TAMBASA_PASSWORD=<mesmo do teste>
TAMBASA_DELAY_MS=1500
TAMBASA_MAX_PAGES=50
TAMBASA_PER_PAGE=100
TAMBASA_ENGINE=axios

BARTOFIL_SUPABASE_URL=https://yadsszhyfgiyuqwvaydp.supabase.co
BARTOFIL_SUPABASE_ANON_KEY=<mesma do teste>
BARTOFIL_CNPJ=<mesmo do teste>
BARTOFIL_PASSWORD=<mesmo do teste>
BARTOFIL_DELAY_MS=300
BARTOFIL_PAGE_SIZE=100

SUPPLIER_SYNC_ENABLED=true
SUPPLIER_SYNC_CRON=0 7 * * *
```

**`SESSION_SECRET` tem que ser diferente do teste.** Se os dois ambientes
compartilharem o segredo, um cookie de sessão emitido em um vale no outro.
Gere com:

```bash
openssl rand -base64 32
```

**Não defina** `REPLIT_DOMAINS`, `REPL_ID` nem `AUTH_HUB_*`. O app sobe
normalmente sem elas.

Em particular, deixe `AUTH_HUB_ENABLED` de fora (ou `false`): sem ela o
servidor nem registra as rotas `/api/auth/sso/*` e a tela de login não desenha
o botão do Microsoft 365. É o comportamento que você quer agora.

---

## Parte 6 — Deploy e verificação

1. **Deploy**. A primeira build demora (instala tudo do zero).
2. Acompanhe os logs. O boot bem-sucedido imprime:
   ```
   [CRON] Daily price update scheduled for 07:00 AM (America/Sao_Paulo)
   [express] serving on port 5003
   ```
3. Abra o domínio: deve carregar a landing page.
4. Vá em `/login` e entre com um usuário existente (os cadastros vieram na
   cópia). Se o login devolver **500**, quase sempre é `DATABASE_URL` errada —
   confira nos logs.
5. Confira uma tela com dados (Produtos) para validar que a cópia funcionou.

---

## Pontos de atenção

### 1. Os dois ambientes vão raspar os fornecedores no mesmo horário

Com `SUPPLIER_SYNC_ENABLED=true` nos dois, **teste e produção vão sincronizar
às 07:00 usando as mesmas credenciais B2B**, dobrando as requisições aos
portais. O `.env.example` registra que a Tambasa fica atrás de Cloudflare e
devolve 429 para tráfego suspeito — dobrar o volume é pedir bloqueio.

Assim que produção assumir, desligue a sincronização no ambiente de teste:

```bash
SUPPLIER_SYNC_ENABLED=false
```

O mesmo vale para o cron diário de preços, que sobe junto com o servidor nos
dois ambientes.

### 2. O botão "Entrar com Microsoft 365" — resolvido

O SSO agora é **opt-in por ambiente**, via `AUTH_HUB_ENABLED`. Com a variável
ausente ou `false`:

- o servidor não registra `/api/auth/sso/login` nem `/callback`, então quem
  digitar a URL cai no catch-all do SPA e recebe a própria página — nenhum
  redirect para o hub acontece;
- a tela de login não desenha o botão nem o separador "ou entre com e-mail".

O padrão é desligado de propósito: esquecer a variável falha para o lado
seguro. Quando quiser ligar o SSO em produção, o caminho é liberar o
`redirect_uri` do domínio de produção no Auth Hub **e só então** definir
`AUTH_HUB_ENABLED=true`.

O ambiente de teste precisa da variável definida como `true` no painel do
Dokploy para manter o botão.

### 3. A senha local usa SHA-256 sem salt

O login local hoje compara `sha256(senha)` (`server/routes.ts`). Isso já é uma
melhora grande sobre o que existia — até o commit `783f879` a rota **aceitava
qualquer senha** para usuário existente. Mas SHA-256 puro é fraco para senha:
sem salt, é vulnerável a rainbow table se o banco vazar. Como produção fica
exposta na internet, vale trocar por bcrypt ou argon2 num passo próprio.

### 4. Rollback

Enquanto o ambiente de teste seguir de pé com seu próprio banco, o retorno é
simples: aponte o DNS de volta ou derrube a aplicação de produção. Guarde o
dump da Parte 3 — ele é o retrato exato do que foi para produção.

### 5. `MIGRACAO_DOKPLOY.md` está desatualizado

Aquele documento é da migração Replit → Dokploy. Dois pontos dele já não
valem: o repositório mudou de `hitkoch/Chupakbravellore` para
`VelloreCode/chupakbra`, e o aviso "login local aceita qualquer senha" foi
corrigido. Use este arquivo para produção.
