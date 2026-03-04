# 🎉 Planejador de Festa Junina

Aplicativo React Native (Expo) para iPhone que ajuda a organizar uma festa junina, com backend Cloudflare Workers + D1.

## Funcionalidades

- **Lista de Convidados** — Adicione convidados e marque como Confirmado, Pago ou Não Vem
- **Lista de Compras e Contratações** — Registre itens com preço e categoria
- **Gastos e Recebimentos** — Resumo financeiro com saldo líquido
- **Assistente IA** — Chatbot Gemini para consultas sobre a festa

## Estrutura

```
party-planner/
├── App.tsx                    # Navegação principal
├── src/
│   ├── screens/
│   │   ├── GuestListScreen.tsx
│   │   ├── ShoppingListScreen.tsx
│   │   ├── FinancesScreen.tsx
│   │   └── ChatbotScreen.tsx
│   ├── services/
│   │   ├── api.ts             # Comunicação com Cloudflare Worker
│   │   └── gemini.ts          # Integração Gemini AI
│   └── types/
│       └── index.ts
└── worker/                    # Backend Cloudflare
    ├── src/index.ts           # Worker API
    ├── schema.sql             # Schema do banco D1
    ├── wrangler.toml          # Config Cloudflare
    └── package.json
```

---

## Configuração

### 1. App React Native (Frontend)

```bash
cd party-planner
npm install
npx expo start
```

Para testar no iPhone, instale o app **Expo Go** na App Store e escaneie o QR code.

### 2. Backend Cloudflare Workers

#### Pré-requisitos
- Conta Cloudflare (gratuita): https://dash.cloudflare.com/sign-up
- Node.js instalado

#### Passos

```bash
# Entre na pasta do worker
cd party-planner/worker

# Instale dependências
npm install

# Faça login na Cloudflare
npx wrangler login

# Crie o banco de dados D1
npx wrangler d1 create party-planner-db
```

Após criar o banco, copie o `database_id` exibido no terminal e substitua em `worker/wrangler.toml`:

```toml
database_id = "COLE_O_ID_AQUI"
```

```bash
# Crie as tabelas no banco remoto
npm run db:init:remote

# Faça deploy do Worker
npm run deploy
```

Após o deploy, você receberá uma URL como:
```
https://party-planner-api.SEU_SUBDOMINIO.workers.dev
```

#### 3. Conectar o App ao Backend

Abra `src/services/api.ts` e altere a constante `API_BASE_URL`:

```typescript
const API_BASE_URL = 'https://party-planner-api.SEU_SUBDOMINIO.workers.dev';
```

---

## Desenvolvimento Local

Para testar o worker localmente:

```bash
cd worker
npm run db:init      # Criar tabelas local
npm run dev          # Inicia o worker em http://localhost:8787
```

E no `api.ts`, use:
```typescript
const API_BASE_URL = 'http://localhost:8787';
```

---

## Tecnologias

| Componente | Tecnologia |
|---|---|
| Frontend | React Native + Expo (TypeScript) |
| Navegação | React Navigation (Bottom Tabs) |
| Backend | Cloudflare Workers |
| Banco de Dados | Cloudflare D1 (SQLite) |
| IA / Chatbot | Google Gemini 2.0 Flash |
| Ícones | @expo/vector-icons (Ionicons) |
