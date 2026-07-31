# 🚀 PROMPT COMPLETO PARA REMIX - Chupa K Bra (Sistema de Monitoramento de Preços)

## 📋 CONTEXTO E OBJETIVO

Você está recebendo um arquivo ZIP contendo uma aplicação completa de monitoramento de preços chamada "Chupa K Bra", desenvolvida para o Grupo Vellore. Esta é uma plataforma de inteligência de preços que monitora e compara preços de produtos em diversos marketplaces e fornecedores em tempo real.

**Objetivo**: Deixar a aplicação 100% funcional após a importação, incluindo restauração do banco de dados com todos os registros existentes.

---

## 🏗️ ARQUITETURA TÉCNICA

### Stack Frontend
- **React 18** com TypeScript
- **Vite** como build tool
- **Shadcn/ui** (Radix UI primitives) para componentes
- **Tailwind CSS** para estilização
- **TanStack Query** para gerenciamento de estado do servidor
- **Wouter** para roteamento
- **React Hook Form + Zod** para validação de formulários

### Stack Backend
- **Node.js com Express**
- **TypeScript (ESM modules)**
- **PostgreSQL** com **Drizzle ORM**
- **Replit Auth** para autenticação com sessões
- **node-cron** para tarefas agendadas
- **Cheerio + Axios** para web scraping

---

## 🗃️ ESTRUTURA DO BANCO DE DADOS

### Tabelas Principais (12 tabelas)

```sql
-- 1. sessions (Replit Auth)
CREATE TABLE sessions (
  sid VARCHAR PRIMARY KEY,
  sess JSONB NOT NULL,
  expire TIMESTAMP NOT NULL
);

-- 2. users (Usuários do sistema)
CREATE TABLE users (
  id VARCHAR PRIMARY KEY,
  email VARCHAR UNIQUE,
  first_name VARCHAR,
  last_name VARCHAR,
  profile_image_url VARCHAR,
  role VARCHAR DEFAULT 'visitante', -- 'administrador', 'editor', 'visitante'
  password_hash VARCHAR,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. categories (Categorias de produtos)
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. clients (Clientes/Fornecedores)
CREATE TABLE clients (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  status VARCHAR(20) DEFAULT 'active',
  api_key VARCHAR(255),
  is_master BOOLEAN DEFAULT FALSE, -- Cliente master (dono dos produtos)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. competitors (Concorrentes)
CREATE TABLE competitors (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  website VARCHAR(500),
  description TEXT,
  market_position VARCHAR(50), -- 'premium', 'mid-market', 'budget'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 6. products (Produtos) - TABELA PRINCIPAL
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  sku VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  manufacturer TEXT, -- Marca/Fabricante
  category_id INTEGER REFERENCES categories(id),
  client_id INTEGER REFERENCES clients(id),
  competitor_id INTEGER REFERENCES competitors(id),
  is_competitor BOOLEAN DEFAULT FALSE,
  source_type VARCHAR(20) DEFAULT 'client', -- 'client' ou 'competitor'
  base_price DECIMAL(10,2) NOT NULL,
  image_url VARCHAR(500),
  status VARCHAR(20) DEFAULT 'active',
  match_group VARCHAR(100), -- Grupo de produtos equivalentes
  brand_sku VARCHAR(100), -- SKU da marca
  source_url VARCHAR(1000), -- URL de origem (para scraping)
  is_master BOOLEAN DEFAULT FALSE, -- Produto master ou de monitoramento
  master_product_id INTEGER REFERENCES products(id), -- Referência ao produto master
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 7. prices (Preços atuais)
CREATE TABLE prices (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id),
  client_id INTEGER REFERENCES clients(id),
  competitor_id INTEGER REFERENCES competitors(id),
  source_type VARCHAR(20) DEFAULT 'client',
  price DECIMAL(10,2) NOT NULL,
  discount DECIMAL(5,2) DEFAULT 0,
  is_available BOOLEAN DEFAULT TRUE,
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 8. price_history (Histórico de preços por cliente)
CREATE TABLE price_history (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  old_price DECIMAL(10,2),
  new_price DECIMAL(10,2) NOT NULL,
  change_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 9. price_monitoring_history (Histórico de monitoramento via URL)
CREATE TABLE price_monitoring_history (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  price_old DECIMAL(10,2),
  price_new DECIMAL(10,2) NOT NULL,
  date_checked TIMESTAMP DEFAULT NOW() NOT NULL,
  source TEXT DEFAULT 'url_monitoring',
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 10. upload_history (Histórico de uploads de Excel)
CREATE TABLE upload_history (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  records_processed INTEGER NOT NULL,
  records_success INTEGER NOT NULL,
  records_error INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL,
  error_details JSONB,
  user_id VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 11. api_keys (Chaves de API)
CREATE TABLE api_keys (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(255) NOT NULL UNIQUE,
  user_id VARCHAR REFERENCES users(id),
  last_used TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 12. reports_history (Histórico de relatórios gerados)
CREATE TABLE reports_history (
  id SERIAL PRIMARY KEY,
  report_type VARCHAR(100) NOT NULL,
  report_title VARCHAR(255) NOT NULL,
  generated_by VARCHAR REFERENCES users(id),
  parameters JSONB,
  record_count INTEGER DEFAULT 0,
  file_format VARCHAR(20) DEFAULT 'json',
  file_path VARCHAR(500),
  generated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Contagem de Registros Exportados
- **products**: 2.578 registros
- **users**: 8 registros
- **clients**: 6 registros
- **price_history**: 1.516 registros
- **price_monitoring_history**: 109 registros
- **prices**: 26 registros
- **upload_history**: 7 registros
- **reports_history**: 13 registros
- **categories**: 0 registros
- **competitors**: 0 registros
- **api_keys**: 0 registros

**Total**: 4.263 registros

---

## 🔌 APIs DISPONÍVEIS

### Autenticação
- `POST /api/auth/login` - Login com email/senha
- `GET /api/auth/user` - Obter usuário logado
- `GET /api/login` - Replit Auth login
- `GET /api/logout` - Logout

### Dashboard
- `GET /api/dashboard/stats` - Estatísticas gerais
- `GET /api/dashboard/best-prices` - Melhores preços
- `GET /api/dashboard/recent-products` - Produtos recentes

### Produtos
- `GET /api/products` - Listar produtos (com filtros)
- `GET /api/products/:id` - Obter produto
- `POST /api/products` - Criar produto
- `PUT /api/products/:id` - Atualizar produto
- `DELETE /api/products/:id` - Deletar produto
- `GET /api/products/:id/history` - Histórico de preços
- `GET /api/products/:id/comparison` - Comparação de preços
- `GET /api/products/:id/match-group` - Produtos equivalentes
- `GET /api/products/:id/competitors` - Concorrentes do produto
- `GET /api/products/masters-with-competitors` - Produtos master com concorrentes
- `GET /api/products/recent-price-updates` - Atualizações recentes
- `POST /api/products/scrape-preview` - Preview de scraping
- `POST /api/products/scrape-master` - Criar produto master via URL
- `POST /api/products/scrape-competitors` - Adicionar concorrentes via URL
- `POST /api/products/update-prices` - Atualizar preços via cron

### Categorias
- `GET /api/categories` - Listar categorias
- `POST /api/categories` - Criar categoria
- `PUT /api/categories/:id` - Atualizar categoria
- `DELETE /api/categories/:id` - Deletar categoria

### Clientes
- `GET /api/clients` - Listar clientes
- `GET /api/clients/master` - Obter cliente master
- `POST /api/clients` - Criar cliente
- `PUT /api/clients/:id` - Atualizar cliente
- `DELETE /api/clients/:id` - Deletar cliente
- `POST /api/clients/:id/set-master` - Definir cliente master
- `POST /api/clients/:id/generate-api-key` - Gerar API key

### Concorrentes
- `GET /api/competitors` - Listar concorrentes
- `POST /api/competitors` - Criar concorrente
- `PUT /api/competitors/:id` - Atualizar concorrente
- `DELETE /api/competitors/:id` - Deletar concorrente

### Preços
- `GET /api/prices` - Listar preços
- `POST /api/prices` - Criar preço
- `PUT /api/prices/:id` - Atualizar preço
- `DELETE /api/prices/:id` - Deletar preço
- `POST /api/prices/bulk` - Importação em massa

### Upload de Excel
- `POST /api/upload/excel` - Upload de planilha
- `POST /api/upload/template/download` - Baixar template
- `GET /api/upload/history` - Histórico de uploads

### Relatórios (6 tipos dinâmicos)
- `GET /api/reports/price-comparison` - Relatório de comparação de preços
- `GET /api/reports/savings-analysis` - Análise de economia
- `GET /api/reports/client-performance` - Performance de clientes
- `GET /api/reports/product-trends` - Tendências de produtos
- `GET /api/reports/category-analysis` - Análise por categoria
- `GET /api/reports/monthly-summary` - Resumo mensal
- `GET /api/reports/export` - Exportar relatório (JSON/Excel)
- `GET /api/reports/history` - Histórico de relatórios

### IA e Análise
- `POST /api/ai/pricing-analysis` - Análise de preços com IA (OpenAI)
- `GET /api/analytics/benchmark` - Benchmark de mercado

### Monitoramento
- `GET /api/price-monitoring/history` - Histórico de monitoramento
- `GET /api/scraping/stats` - Estatísticas de scraping
- `POST /api/cron/test-daily-update` - Testar atualização manual

### Limpeza de Dados
- `GET /api/cleanup/stats` - Estatísticas de limpeza
- `GET /api/cleanup/duplicates` - Produtos duplicados
- `GET /api/cleanup/orphaned-prices` - Preços órfãos
- `POST /api/cleanup/perform` - Executar limpeza

### Usuários (Admin)
- `GET /api/users` - Listar usuários
- `POST /api/users` - Criar usuário
- `PUT /api/users/:id` - Atualizar usuário
- `DELETE /api/users/:id` - Deletar usuário

---

## ⏰ CRON JOBS AGENDADOS

### Atualização Diária de Preços
- **Horário**: 07:00 AM (America/Sao_Paulo)
- **Arquivo**: `server/cron.ts`
- **Função**: `startCronJobs()`
- **Ação**: Executa scraping de todos os produtos com `sourceUrl` definida e atualiza os preços no banco de dados
- **Endpoint de teste manual**: `POST /api/cron/test-daily-update` (requer autenticação)

```typescript
// Configuração do Cron (server/cron.ts)
cron.schedule('0 7 * * *', async () => {
  await storage.updateProductPricesFromUrl();
}, {
  timezone: "America/Sao_Paulo"
});
```

---

## 🔧 SISTEMA DE WEB SCRAPING

### Arquivo: `server/scraper-v2.ts`

**Características**:
- Parser de preços brasileiros (R$ X.XXX,XX) - formato com ponto como separador de milhares
- Cache em memória (1 hora de expiração)
- Retries automáticos (3 tentativas com backoff progressivo)
- Suporte a múltiplos sites de e-commerce
- Extração via JSON-LD (Schema.org) e seletores HTML específicos

**Sites Suportados**:
- Amazon Brasil
- Mercado Livre
- Magazine Luiza
- Americanas
- Submarino
- Shopee
- Casas Bahia
- Ponto Frio
- Kabum
- E outros e-commerces brasileiros

**Importante sobre Parser de Preços Brasileiro**:
```typescript
// Formato brasileiro: R$ 1.160,70 (ponto = milhares, vírgula = decimal)
// O parser converte para: 1160.70
```

---

## 📁 ESTRUTURA DE ARQUIVOS IMPORTANTE

```
├── client/
│   └── src/
│       ├── App.tsx           # Rotas principais
│       ├── pages/            # Páginas da aplicação
│       │   ├── home.tsx              # Dashboard principal
│       │   ├── products.tsx          # Gestão de produtos
│       │   ├── products-url.tsx      # Cadastro via URL
│       │   ├── price-monitoring.tsx  # Monitoramento de preços
│       │   ├── price-comparison.tsx  # Comparação de preços
│       │   ├── reports.tsx           # Relatórios dinâmicos
│       │   ├── clients.tsx           # Gestão de clientes
│       │   ├── categories.tsx        # Gestão de categorias
│       │   ├── users.tsx             # Gestão de usuários
│       │   ├── upload.tsx            # Upload de Excel
│       │   ├── data-cleanup.tsx      # Limpeza de dados
│       │   └── ...
│       ├── components/       # Componentes reutilizáveis
│       │   ├── ui/           # Componentes Shadcn
│       │   ├── widgets/      # Widgets (IA, benchmark)
│       │   └── wizard/       # Wizards de cadastro
│       └── lib/              # Utilitários
├── server/
│   ├── index.ts              # Entry point do servidor
│   ├── routes.ts             # Todas as rotas da API (~2500 linhas)
│   ├── storage.ts            # Interface de storage PostgreSQL (~2300 linhas)
│   ├── db.ts                 # Conexão com banco de dados
│   ├── cron.ts               # Jobs agendados
│   ├── scraper-v2.ts         # Sistema de web scraping (~700 linhas)
│   ├── scraping-queue.ts     # Fila de scraping
│   ├── replitAuth.ts         # Autenticação Replit
│   └── ai-pricing.ts         # Análise com IA (OpenAI)
├── shared/
│   └── schema.ts             # Schema do banco de dados (Drizzle)
├── reports/                  # Relatórios gerados
├── database_full_backup.sql  # Backup completo SQL
├── database_schema.sql       # Apenas schema SQL
├── database_data.sql         # Apenas dados SQL
└── database_export_complete.json # Export JSON de todas as tabelas
```

---

## 🚀 PASSOS PARA RESTAURAR A APLICAÇÃO

### 1. Após importar o ZIP no Replit:

```bash
# Instalar dependências
npm install
```

### 2. Criar banco de dados PostgreSQL:
- Use a ferramenta de criação de banco do Replit
- O DATABASE_URL será configurado automaticamente

### 3. Criar a estrutura do banco:
```bash
npm run db:push
```

### 4. Importar os dados existentes:

**Opção A - Via SQL (recomendado para dados completos):**
```bash
# Desabilitar triggers temporariamente para evitar problemas de FK circular
psql $DATABASE_URL -c "SET session_replication_role = 'replica';"
psql $DATABASE_URL < database_data.sql
psql $DATABASE_URL -c "SET session_replication_role = 'origin';"
```

**Opção B - Via JSON (para dados seletivos):**
Use o script `import_from_json.ts` que será criado

### 5. Configurar variáveis de ambiente:
- `DATABASE_URL` - URL do PostgreSQL (automática no Replit)
- `SESSION_SECRET` - Gere uma chave aleatória: `openssl rand -base64 32`
- `OPENAI_API_KEY` - (Opcional) Para análise com IA

### 6. Iniciar a aplicação:
```bash
npm run dev
```

---

## 📦 DEPENDÊNCIAS PRINCIPAIS (package.json)

```json
{
  "@neondatabase/serverless": "PostgreSQL driver",
  "drizzle-orm": "ORM type-safe",
  "drizzle-kit": "Migrations",
  "express": "Servidor HTTP",
  "express-session": "Sessões",
  "axios": "Requisições HTTP",
  "cheerio": "Parser HTML",
  "node-cron": "Tarefas agendadas",
  "openai": "IA (opcional)",
  "passport": "Autenticação",
  "openid-client": "Replit Auth OIDC",
  "@tanstack/react-query": "Estado do servidor",
  "react-hook-form": "Formulários",
  "zod": "Validação",
  "xlsx": "Manipulação de Excel",
  "multer": "Upload de arquivos"
}
```

---

## ⚠️ PONTOS CRÍTICOS DE ATENÇÃO

### 1. Parser de Preços Brasileiros
O sistema usa formato brasileiro (R$ 1.160,70) com:
- **Ponto (.)** = separador de milhares
- **Vírgula (,)** = separador decimal

### 2. Timezone do Cron
Configurado para **America/Sao_Paulo** (UTC-3). O cron roda às 07:00 AM horário de Brasília.

### 3. Autenticação Dual
Suporta **Replit Auth** E **login local** com email/senha.

### 4. Roles de Usuário
- `administrador` - Acesso total
- `editor` - Pode editar produtos/preços
- `visitante` - Apenas visualização

### 5. Cliente Master
Um cliente pode ser marcado como "master" (dono dos produtos de referência).

### 6. Produtos Master vs Concorrentes
- **Produtos Master** (`is_master=true`): Produtos de referência para comparação
- **Produtos Concorrentes** (`master_product_id`): Vinculados a um master para comparação

### 7. Auto-referência na tabela Products
A tabela `products` tem uma FK circular (`master_product_id` referencia `products.id`). Use `--disable-triggers` na restauração.

---

## 🔐 USUÁRIOS PADRÃO EXPORTADOS

| Email | Role | Observação |
|-------|------|------------|
| Verifique no JSON/SQL | administrador | Usuário admin principal |
| ... | editor/visitante | Outros usuários |

---

## 📊 ARQUIVOS DE BACKUP INCLUÍDOS

1. **database_full_backup.sql** - Backup completo (schema + dados) - 5.165 linhas
2. **database_schema.sql** - Apenas estrutura das tabelas - 733 linhas
3. **database_data.sql** - Apenas os dados (INSERT statements) - 4.434 linhas
4. **database_export_complete.json** - Export JSON de todas as tabelas - 4.263 registros

---

## 🎯 FUNCIONALIDADES PRINCIPAIS

1. **Dashboard Interativo** - Estatísticas em tempo real
2. **Cadastro de Produtos via URL** - Web scraping automático
3. **Monitoramento de Preços** - Atualização diária automática
4. **Comparação de Preços** - Entre produtos equivalentes
5. **6 Tipos de Relatórios Dinâmicos** - Com export Excel/JSON
6. **Upload de Excel** - Importação em massa
7. **Análise com IA** - Estratégias de pricing (OpenAI)
8. **Gestão de Usuários** - Roles e permissões
9. **Histórico Completo** - Preços e monitoramento
10. **Limpeza de Dados** - Remoção de duplicados/órfãos

---

## ✅ CHECKLIST DE VALIDAÇÃO PÓS-RESTAURAÇÃO

- [ ] Aplicação inicia sem erros (`npm run dev`)
- [ ] Login funciona (email/senha ou Replit Auth)
- [ ] Dashboard carrega estatísticas
- [ ] Lista de produtos mostra 2.578 registros
- [ ] Scraping de URL funciona (testar com produto Amazon)
- [ ] Relatórios são gerados corretamente
- [ ] Histórico de preços aparece para produtos
- [ ] Cron está ativo (verificar logs: `[CRON] Cron task active: YES`)
- [ ] Export Excel/JSON funciona

---

**Versão do Export**: 2025-11-12
**Total de Registros**: 4.263
**Arquivos incluídos**: 4 (SQL schema, SQL data, SQL full, JSON)
