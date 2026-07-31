# Migração: Replit → Dokploy (Chupa K Bra)

Guia para tirar o app do Replit e rodar em um servidor com Dokploy, banco PostgreSQL próprio e deploy via GitHub com SSH.

## O que eu já ajustei no código

O projeto usava o driver `@neondatabase/serverless`, que só funciona com o Neon (conexão via WebSocket/HTTP). Um Postgres comum, como o que o Dokploy sobe, não é compatível com esse driver. Troquei:

- `server/db.ts`: agora usa `pg` + `drizzle-orm/node-postgres`, funciona com qualquer Postgres.
- `package.json`: adicionei `pg`/`@types/pg`, removi `@neondatabase/serverless`.
- `server/replitAuth.ts`: esse arquivo derrubava o servidor na inicialização se as variáveis `REPLIT_DOMAINS`/`REPL_ID` não existissem (elas só existem dentro do Replit). Agora, se não estiverem definidas, o app sobe normalmente e só desativa o botão "Login com Replit" — o login local por e-mail/senha (`/api/auth/login`), que já é o método usado, continua funcionando igual.
- Criei `Dockerfile` e `.dockerignore` (build em duas etapas: `vite build` + `esbuild`, depois `node dist/index.js`, igual ao que já rodava no Replit).
- Criei `.env.example` com todas as variáveis que o servidor lê.
- Atualizei `.gitignore` para não versionar `.env` nem a pasta `.local` (metadados do Replit).

Nenhuma dessas mudanças foi enviada ao GitHub ainda — isso é a Parte 1 abaixo.

## Pré-requisitos

- Acesso SSH ao servidor onde o Dokploy está instalado.
- Acesso de administrador ao repositório `hitkoch/Chupakbravellore` no GitHub.
- As chaves atuais (`OPENAI_API_KEY`, etc.) que estavam configuradas nos Secrets do Replit.

---

## Parte 1 — GitHub com login SSH

O repositório hoje aponta para `https://github.com/hitkoch/Chupakbravellore` (HTTPS). Para usar SSH:

**1. Gerar uma chave SSH** (no seu computador, ou no servidor Dokploy — veja nota abaixo):

```bash
ssh-keygen -t ed25519 -C "deploy-chupakbra" -f ~/.ssh/chupakbra_deploy
```

Não coloque senha (Enter direto) se for usar como *deploy key* automatizada.

**2. Adicionar a chave pública ao GitHub**

Copie o conteúdo de `~/.ssh/chupakbra_deploy.pub` e cadastre em:
- **Se for a mesma chave que você usa para dar `push` manualmente**: GitHub → Settings → SSH and GPG keys → New SSH key.
- **Se for só para o servidor puxar o código (recomendado)**: no repositório → Settings → Deploy keys → Add deploy key (marque "Allow write access" só se o servidor também vai dar push, o que normalmente não é necessário).

**3. Trocar o remote local de HTTPS para SSH**

No seu ambiente de desenvolvimento atual:

```bash
git remote set-url origin git@github.com:hitkoch/Chupakbravellore.git
```

**4. Commitar as mudanças feitas e subir pro GitHub**

O repositório está com 75 commits locais à frente do `origin` e várias alterações não commitadas (incluindo as que eu fiz agora: `Dockerfile`, `.dockerignore`, `.env.example`, `server/db.ts`, `server/replitAuth.ts`, `package.json`, `.gitignore`). Revise, commite e envie:

```bash
git add -A
git commit -m "Preparar app para deploy no Dokploy (Postgres próprio + Docker)"
git push origin main
```

**Sobre a chave no servidor Dokploy**: o Dokploy também precisa conseguir clonar o repositório via SSH. A forma mais simples é gerar a chave *dentro* da própria interface do Dokploy ao cadastrar o Git Provider (ele mostra a chave pública para você colar como Deploy Key no GitHub) — veja Parte 4.

---

## Parte 2 — Banco PostgreSQL no Dokploy

1. No painel do Dokploy, crie um novo **Database → PostgreSQL** dentro do seu projeto.
2. Defina nome do banco, usuário e senha (o Dokploy gera uma `DATABASE_URL` interna automaticamente, algo como `postgres://usuario:senha@nome-do-servico:5432/banco`).
3. Anote essa connection string — ela vai virar a variável `DATABASE_URL` da aplicação (Parte 4).
4. Se quiser acessar esse Postgres do seu computador para restaurar os dados (Parte 3), habilite o "External Port" / porta pública do banco nas configurações do serviço no Dokploy, ou faça a restauração rodando os comandos por SSH direto no servidor.

---

## Parte 3 — Migrar os dados do Neon para o novo Postgres

Boas notícias: o projeto já tem os arquivos de export/restore prontos (`database_schema.sql`, `database_data.sql`, `restore_database.sh`), criados durante o desenvolvimento no Replit.

1. Exporte um backup atualizado do Neon (garante que você está migrando os dados mais recentes, não os do backup antigo):

```bash
pg_dump "$DATABASE_URL_NEON_ATUAL" --no-owner --no-acl > database_data_novo.sql
```

(troque `DATABASE_URL_NEON_ATUAL` pela connection string do Neon que está hoje nos Secrets do Replit)

2. Aponte `DATABASE_URL` temporariamente para o **novo** Postgres do Dokploy e rode a estrutura + dados:

```bash
export DATABASE_URL="postgres://usuario:senha@host-do-dokploy:5432/banco"
npm run db:push          # cria as tabelas a partir do shared/schema.ts
psql "$DATABASE_URL" < database_data_novo.sql   # importa os dados
```

Ou simplesmente use o script já existente `restore_database.sh` (ele faz `db:push` + importa `database_data.sql` + confere as contagens de registro por tabela):

```bash
DATABASE_URL="postgres://usuario:senha@host-do-dokploy:5432/banco" ./restore_database.sh
```

Se preferir migrar de dentro do próprio servidor (sem baixar/subir 2MB de dump pela sua máquina), rode os mesmos comandos via SSH no servidor Dokploy, com `psql`/`node`/`npm` instalados ali.

---

## Parte 4 — Criar a aplicação no Dokploy

1. **Projeto → Create Application**.
2. **Source**: Git Provider → GitHub, autenticando via SSH. O Dokploy vai gerar (ou permitir colar) uma chave SSH pública — copie ela e cadastre como **Deploy Key** no repositório GitHub (Settings → Deploy keys), como na Parte 1.
3. **Repositório**: `VelloreCode/chupakbra`, branch `Teste` (ambiente de teste; a branch `main` é a de produção).
4. **Build type**: Dockerfile (o `Dockerfile` que criei na raiz do projeto já faz `npm ci` + `npm run build` + `node dist/index.js`).
5. **Porta interna**: `5003` (é a porta que o Express escuta nesta branch — já configurada no `Dockerfile` com `EXPOSE 5003`). Pode ser sobrescrita pela variável `PORT`.
6. **Variáveis de ambiente** (Environment): copie o conteúdo de `.env.example` e preencha com os valores reais:
   - `DATABASE_URL` → a connection string do Postgres criado na Parte 2
   - `SESSION_SECRET` → gere com `openssl rand -base64 32`
   - `OPENAI_API_KEY` → a mesma chave usada no Replit
   - `CRON_SECRET` → defina um valor (usado para proteger a rota de cron)
   - `NODE_ENV=production`
   - **Não** defina `REPLIT_DOMAINS`/`REPL_ID` — deixe de fora, o app funciona sem elas.
7. **Domínio**: cadastre o domínio/subdomínio desejado em Domains, e ative "HTTPS" (o Dokploy emite certificado Let's Encrypt automaticamente).
8. **Deploy**: clique em Deploy. Acompanhe os logs de build — a primeira build tende a demorar (instala todas as dependências).

---

## Parte 5 — Verificação pós-deploy

- Acesse o domínio configurado e confirme que a página carrega.
- Teste o login local (`/api/auth/login`) com um usuário existente.
- Confira nos logs do Dokploy se não há erros de conexão com o banco (`DATABASE_URL` incorreta é o erro mais comum).
- Rode a contagem de registros do `restore_database.sh` novamente (etapa 6 do script) e compare com o que existia no Neon, para confirmar que os dados batem.
- Configure o **cron** (`server/cron.ts`) — confirme que ele está de fato rodando dentro do container (ele inicia junto com o `server/index.ts`, não precisa de configuração extra no Dokploy).

## Pontos de atenção

- **Login "Sign in with Replit"**: como o app roda fora do Replit, esse método de login fica desativado (retorna 404). O login por e-mail/senha continua funcional e parece ser o usado no dia a dia.
- **Login local aceita qualquer senha**: em `server/routes.ts`, a rota `/api/auth/login` hoje comenta explicitamente "For demo purposes, accept any password". Vale revisar isso antes de expor o app publicamente fora do ambiente controlado do Replit.
- **Backup do Neon**: só desative/exclua o banco Neon depois de confirmar que o Postgres no Dokploy está com todos os dados e a aplicação estável por alguns dias.
- **Rollback**: enquanto o Neon não for desligado, é possível reverter apontando `DATABASE_URL` de volta para ele e rodando o app novamente no Replit como plano B.
