# Cadisk

Cadisk é uma aplicação web para cadistas controlarem trabalhos recebidos de dentistas: cadastro de dentistas, criação de casos, organização por prazo, acompanhamento de status, histórico permanente e visão financeira de entregas recebidas.

## Funcionalidades

- Autenticação com isolamento de dados por usuário.
- Cadastro e gerenciamento de dentistas.
- Criação de casos com cobrança por valor fixo ou por itens de serviço.
- Bancada operacional por semana de produção.
- Página Casos para trabalhos ativos e ações de status.
- Página Histórico para consulta paginada de casos e eventos persistentes.
- Retorno controlado de status com motivo registrado em histórico.
- Financeiro baseado em casos atualmente entregues, com tendência de receita dos últimos meses.
- Temas claro e escuro via tokens CSS.

## Stack Atual

- Frontend: React + Vite + Tailwind CSS v4.
- Backend atual: NestJS + Prisma + PostgreSQL.
- Autenticação: JWT, bcrypt e rate limit de login.
- Testes backend: Jest unitário, integração e E2E.
- Backend legado: FastAPI + SQLAlchemy + Alembic permanece no repositório como referência histórica da migração e para testes de paridade, mas o frontend atual consome o NestJS por padrão.

## Arquitetura

```text
frontend/      SPA React/Vite
backend-nest/  API principal NestJS/Prisma/PostgreSQL
backend/       API FastAPI legada mantida como referência de migração
tests/         testes Python do backend legado
```

O contrato entre frontend e backend é HTTP + JSON. O frontend não acessa banco de dados diretamente.

## Como Executar

### Backend NestJS

```bash
cd backend-nest
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate:deploy
npm run dev
```

Por padrão a API sobe em `http://localhost:3001`.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Por padrão o Vite usa `VITE_API_BASE_URL=http://localhost:3001`.

## Variáveis De Ambiente

Principais variáveis do backend NestJS:

```env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://cadista_user:cadista777@localhost:5432/cadista_db?schema=cadista_nest
TEST_DATABASE_URL=postgresql://cadista_user:cadista777@localhost:5432/cadista_db?schema=cadista_nest_test
SECRET_KEY=replace-with-at-least-32-characters
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=0
BCRYPT_ROUNDS=12
LOGIN_MAX_ATTEMPTS=5
LOGIN_LOCKOUT_MINUTES=15
LOGIN_RATE_LIMIT_ATTEMPTS=10
LOGIN_RATE_LIMIT_WINDOW_SECONDS=60
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
TRUSTED_HOSTS=localhost,127.0.0.1
```

Principais variáveis do frontend:

```env
VITE_API_BASE_URL=http://localhost:3001
```

`ACCESS_TOKEN_EXPIRE_MINUTES=0` mantém a sessão persistente até logout manual, troca de segredo ou invalidação operacional relevante.

## Como Testar

### Frontend

```bash
cd frontend
npm install
npm run build
```

O frontend não possui scripts dedicados de lint ou teste automatizado neste momento.

### Backend NestJS

```bash
cd backend-nest
npm install
npm run lint
npm run build
npm run test
npm run test:integration
npm run test:e2e
npm run prisma:generate
npx prisma validate --schema=prisma/schema.prisma
```

### Backend FastAPI Legado

```bash
pip install -r requirements.txt
pytest
```

Use este backend apenas para validação de paridade ou consulta histórica da migração.
