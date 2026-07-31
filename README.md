# 🎯 Chupa K Bra - Plataforma de Monitoramento e Comparação de Preços

<div align="center">

![Grupo Vellore](https://img.shields.io/badge/Grupo%20Vellore-Price%20Intelligence-orange?style=for-the-badge)
![React](https://img.shields.io/badge/React-18.0-blue?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)
![Node.js](https://img.shields.io/badge/Node.js-20.0-green?style=for-the-badge&logo=node.js)

**Plataforma especializada para indústrias e distribuidores que precisam monitorar competitividade, analisar mercado e otimizar estratégias de precificação em tempo real.**

</div>

---

## 📋 Índice

- [Visão Geral](#-visão-geral)
- [Funcionalidades Principais](#-funcionalidades-principais)
- [Tecnologias Utilizadas](#-tecnologias-utilizadas)
- [Pré-requisitos](#-pré-requisitos)
- [Instalação](#-instalação)
- [Configuração](#-configuração)
- [Como Usar](#-como-usar)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [API Endpoints](#-api-endpoints)
- [Monitoramento Automatizado](#-monitoramento-automatizado)
- [Integração com IA](#-integração-com-ia)
- [Segurança](#-segurança)
- [Deploy](#-deploy)
- [Contribuição](#-contribuição)
- [Suporte](#-suporte)

---

## 🚀 Visão Geral

A **Chupa K Bra** é uma plataforma completa de inteligência de preços desenvolvida para o **Grupo Vellore**, permitindo monitoramento em tempo real de preços de produtos em diferentes marketplaces e sites de e-commerce, análise competitiva avançada e otimização de estratégias de precificação.

### 🎯 Público-Alvo
- **Indústrias** que precisam monitorar a presença de seus produtos no mercado
- **Distribuidores** que querem manter competitividade de preços
- **Gestores comerciais** que necessitam de dados para tomada de decisão
- **Equipes de pricing** que buscam automação e insights de mercado

---

## ✨ Funcionalidades Principais

### 📊 **Dashboard Executivo**
- **Visão 360°** do portfólio de produtos
- **Métricas em tempo real**: total de produtos, clientes ativos, atualizações diárias
- **Gráficos interativos** com histórico de preços
- **Alertas inteligentes** para variações significativas de preço

### 🔍 **Monitoramento Inteligente**
- **Captura automática** de dados de produtos via URL
- **Scraping avançado** com IA para extração de informações
- **Atualização programada** com cron jobs personalizáveis
- **Detecção de mudanças** em preços, disponibilidade e especificações

### 🏆 **Análise Competitiva**
- **Comparação lado a lado** de produtos similares
- **Identificação do melhor preço** por categoria
- **Análise de posicionamento** no mercado
- **Relatórios de competitividade** com insights acionáveis

### 🎯 **Cadastro Inteligente por URL**
- **Extração automática** de dados do produto
- **Preview antes do cadastro** com validação
- **Associação automática** de produtos concorrentes
- **Detecção de duplicatas** e produtos similares

### 📈 **Relatórios e Analytics**
- **Histórico completo** de variações de preço
- **Análise de tendências** de mercado
- **Relatórios personalizáveis** por período
- **Exportação** em múltiplos formatos (Excel, PDF, CSV)

### 🤖 **Inteligência Artificial**
- **Análise de sentimento** de descrições de produtos
- **Sugestões de precificação** baseadas em dados
- **Detecção de padrões** de comportamento de preços
- **Benchmarking automático** com concorrentes

### 👥 **Gestão Multi-Cliente**
- **Controle de acesso** baseado em funções
- **Gestão de clientes** e concorrentes
- **API keys personalizadas** para integrações
- **Auditoria completa** de ações dos usuários

### 🔐 **Segurança e Controle**
- **Autenticação robusta** com Replit Auth
- **Controle granular** de permissões
- **Logs detalhados** de todas as operações
- **Backup automático** de dados críticos

---

## 🛠 Tecnologias Utilizadas

### **Frontend**
- **React 18** - Interface moderna e responsiva
- **TypeScript** - Tipagem estática para maior robustez
- **Tailwind CSS** - Estilização utilitária e responsiva
- **shadcn/ui** - Componentes de alta qualidade
- **Wouter** - Roteamento leve e eficiente
- **TanStack Query** - Gerenciamento de estado server-side
- **React Hook Form** - Formulários performáticos
- **Recharts** - Gráficos interativos
- **Framer Motion** - Animações fluidas

### **Backend**
- **Node.js** - Runtime JavaScript server-side
- **Express.js** - Framework web minimalista
- **TypeScript** - Desenvolvimento type-safe
- **Drizzle ORM** - ORM moderno e type-safe
- **PostgreSQL** - Banco de dados relacional robusto
- **Passport.js** - Autenticação flexível
- **node-cron** - Agendamento de tarefas
- **Cheerio** - Scraping de dados web
- **OpenAI API** - Inteligência artificial

### **Ferramentas e DevOps**
- **Vite** - Build tool e dev server ultrarrápido
- **ESBuild** - Bundling e minificação
- **Replit** - Ambiente de desenvolvimento e deploy
- **Git** - Controle de versão

---

## 📋 Pré-requisitos

- **Node.js** >= 18.0.0
- **PostgreSQL** >= 14.0
- **Git** para controle de versão
- **Conta OpenAI** (opcional, para funcionalidades de IA)

---

## 🚀 Instalação

### 1. **Clone o Repositório**
```bash
git clone https://github.com/seu-usuario/chupa-k-bra.git
cd chupa-k-bra
```

### 2. **Instale as Dependências**
```bash
npm install
```

### 3. **Configure o Banco de Dados**
```bash
# Configure a variável de ambiente DATABASE_URL
# Exemplo: postgresql://usuario:senha@localhost:5432/chupa_k_bra

# Execute as migrações
npm run db:push
```

### 4. **Inicie o Servidor de Desenvolvimento**
```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:5000`

---

## ⚙️ Configuração

### **Variáveis de Ambiente**
Crie um arquivo `.env` na raiz do projeto:

```env
# Banco de Dados
DATABASE_URL=postgresql://usuario:senha@localhost:5432/chupa_k_bra

# OpenAI (Opcional)
OPENAI_API_KEY=sua_chave_openai_aqui

# Configurações de Sessão
SESSION_SECRET=sua_chave_secreta_aqui

# Ambiente
NODE_ENV=development
```

### **Configuração do Banco**
```bash
# Push do schema para o banco
npm run db:push

# Visualizar o banco (Drizzle Studio)
npm run db:studio
```

---

## 📖 Como Usar

### **1. Primeiro Acesso**
1. Acesse a plataforma
2. Clique em "**Veja como funciona**" para tutorial interativo
3. Faça login ou registre-se
4. Complete o onboarding guiado

### **2. Cadastro de Produtos**
```typescript
// Via URL - Extração automática
POST /api/products/from-url
{
  "url": "https://loja.com/produto",
  "isMaster": true
}

// Manual - Dados completos
POST /api/products
{
  "name": "Nome do Produto",
  "sku": "SKU123",
  "basePrice": "199.90",
  "category": "Eletrônicos"
}
```

### **3. Monitoramento de Concorrentes**
1. Cadastre produto **mestre** (seu produto)
2. Adicione **concorrentes** via URL
3. Configure **alertas** de preço
4. Monitore **comparações** automáticas

### **4. Análise de Dados**
- Acesse **Dashboard** para visão geral
- Use **Comparações** para análise detalhada
- Gere **Relatórios** personalizados
- Configure **Alertas** por email/SMS

---

## 📁 Estrutura do Projeto

```
chupa-k-bra/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── components/     # Componentes reutilizáveis
│   │   │   ├── ui/        # Componentes base (shadcn)
│   │   │   ├── layout/    # Layout da aplicação
│   │   │   ├── forms/     # Formulários especializados
│   │   │   ├── charts/    # Gráficos e visualizações
│   │   │   └── wizard/    # Tutorial interativo
│   │   ├── pages/         # Páginas da aplicação
│   │   ├── lib/           # Utilitários e configurações
│   │   └── hooks/         # Hooks customizados
├── server/                # Backend Express
│   ├── routes.ts          # Definição das rotas da API
│   ├── storage.ts         # Interface de armazenamento
│   ├── scraper.ts         # Sistema de scraping
│   ├── ai-pricing.ts      # Integração com IA
│   ├── cron.ts            # Tarefas agendadas
│   └── replitAuth.ts      # Autenticação
├── shared/                # Código compartilhado
│   └── schema.ts          # Esquemas do banco de dados
└── docs/                  # Documentação adicional
```

---

## 🔌 API Endpoints

### **Autenticação**
```http
GET  /api/auth/user        # Dados do usuário atual
POST /api/login            # Login na plataforma
GET  /api/logout           # Logout da sessão
```

### **Produtos**
```http
GET    /api/products                    # Listar produtos
POST   /api/products                    # Criar produto
GET    /api/products/:id                # Obter produto específico
PUT    /api/products/:id                # Atualizar produto
DELETE /api/products/:id                # Remover produto
POST   /api/products/from-url           # Criar via URL
POST   /api/products/preview-from-url   # Preview antes de criar
```

### **Clientes e Concorrentes**
```http
GET    /api/clients                # Listar clientes
POST   /api/clients                # Criar cliente
PUT    /api/clients/:id            # Atualizar cliente
DELETE /api/clients/:id            # Remover cliente

GET    /api/competitors            # Listar concorrentes
POST   /api/competitors            # Criar concorrente
```

### **Análises e Relatórios**
```http
GET /api/dashboard/stats              # Estatísticas gerais
GET /api/dashboard/recent-products    # Produtos recém atualizados  
GET /api/dashboard/best-prices        # Melhores preços
GET /api/prices/comparison/:productId # Comparação de preços
GET /api/products/match-group/:group  # Produtos por grupo
```

### **Upload e Histórico**
```http
POST /api/upload/excel             # Upload de planilha Excel
GET  /api/upload/history           # Histórico de uploads
GET  /api/products/:id/history     # Histórico de preços
```

---

## ⏰ Monitoramento Automatizado

### **Cron Jobs**
O sistema executa tarefas automatizadas:

```typescript
// Atualização de preços (a cada 6 horas)
0 */6 * * * - updateProductPricesFromUrl()

// Limpeza de logs antigos (diariamente às 2h)  
0 2 * * * - cleanupOldLogs()

// Backup de dados (semanalmente)
0 3 * * 0 - backupDatabase()
```

### **Alertas Inteligentes**
- **Variação de preço** > 10%
- **Produto fora de estoque**
- **Novo concorrente** detectado
- **Preço abaixo do custo**

---

## 🤖 Integração com IA

### **Funcionalidades de IA Implementadas**

#### **1. Análise de Precificação**
```typescript
// Geração de estratégia de pricing
const strategy = await generatePricingStrategy({
  product: productData,
  competitors: competitorPrices,
  market: marketAnalysis
});
```

#### **2. Benchmark Inteligente**
```typescript
// Análise de benchmark automática
const analysis = await generateBenchmarkAnalysis([
  { product, prices, bestPrice, savings }
]);
```

#### **3. Extração de Dados**
- **OCR** para imagens de produtos
- **NLP** para descrições e especificações
- **Classificação automática** de categorias

---

## 🔐 Segurança

### **Autenticação e Autorização**
- **Replit Auth** integrado
- **Sessões seguras** com express-session
- **Middleware de autenticação** em todas as rotas
- **Controle de acesso** baseado em roles

### **Proteção de Dados**
- **Validação** de entrada com Zod
- **Sanitização** de dados do scraping
- **Rate limiting** nas APIs
- **Logs de auditoria** completos

### **API Security**
- **API Keys** com hash seguro
- **CORS** configurado adequadamente
- **Helmet.js** para headers de segurança
- **Input validation** em todos os endpoints

---

## 🚀 Deploy

### **Replit Deploy**
```bash
# A aplicação está configurada para deploy automático no Replit
# Clique em "Deploy" no painel do Replit
```

### **Deploy Manual**
```bash
# Build da aplicação
npm run build

# Configurar variáveis de ambiente de produção
export NODE_ENV=production
export DATABASE_URL=sua_database_url_producao

# Iniciar servidor
npm start
```

### **Docker (Opcional)**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

---

## 🤝 Contribuição

### **Como Contribuir**
1. **Fork** o repositório
2. Crie uma **branch** para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. **Commit** suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. **Push** para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um **Pull Request**

### **Padrões de Código**
- **ESLint** e **Prettier** configurados
- **Commits semânticos** (feat, fix, docs, etc.)
- **Testes unitários** para novas funcionalidades
- **Documentação** atualizada

### **Roadmap**
- [ ] **Integração WhatsApp** para alertas
- [ ] **Machine Learning** para previsão de preços
- [ ] **API GraphQL** para consultas complexas
- [ ] **Mobile App** React Native
- [ ] **Webhook** para integrações externas

---

## 📞 Suporte

### **Contato Técnico**
- **Email**: contato@grupovellore.com.br
- **Telefone**: (41) 98847-0604
- **GitHub Issues**: Para bugs e sugestões

### **Documentação Adicional**
- [Guia de Instalação Detalhado](docs/INSTALL.md)
- [API Reference Completa](docs/API.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [FAQ](docs/FAQ.md)

---

## 📜 Licença

Este projeto é propriedade do **Grupo Vellore** e está licenciado sob os termos de uso internos da empresa.

---

<div align="center">

**Desenvolvido com ❤️ pelo Grupo Vellore**

![Grupo Vellore](https://img.shields.io/badge/2025-Grupo%20Vellore-orange?style=for-the-badge)

</div>