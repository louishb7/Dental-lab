# Cadisk

Cadisk é uma aplicação web para cadistas controlarem trabalhos recebidos de dentistas. O sistema organiza casos por prazo, acompanha o fluxo de produção, preserva histórico operacional e apresenta uma visão financeira baseada nas entregas recebidas.

## Funcionalidades

- Autenticação com isolamento de dados por usuário.
- Cadastro e gerenciamento de dentistas.
- Criação de casos com cobrança por valor fixo ou por itens de serviço.
- Bancada semanal para planejamento e execução do trabalho.
- Página Casos para localizar casos ativos, editar detalhes e avançar status.
- Página Histórico com paginação, filtros e timeline persistente por caso.
- Retorno controlado de status com motivo registrado.
- Financeiro com receita entregue no mês, tendência dos últimos 6 meses, ranking e entregas recentes.
- Temas claro e escuro baseados em tokens CSS.

## Stack

- Frontend: React + Vite + Tailwind CSS v4.
- Backend: NestJS + Prisma.
- Banco de dados: PostgreSQL.
- Autenticação: JWT, bcrypt e rate limit de login.
- Testes backend: Jest unitário, integração e E2E.

## Arquitetura

```text
frontend/      SPA React/Vite
backend-nest/  API NestJS, Prisma, PostgreSQL e testes
```

O contrato entre frontend e backend é HTTP + JSON. O frontend consome a API pelo cliente centralizado em `frontend/src/services/api.js`.

## Instalação

Requisitos:

- Node.js 20 ou superior.
- npm.
- PostgreSQL acessível localmente ou via Docker Compose.

### Banco Com Docker Compose

```bash
cd backend-nest
npm run db:up:docker
```

O compose sobe PostgreSQL na porta `5433` por padrão e cria também o banco de teste.

### Backend

```bash
cd backend-nest
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate:deploy
npm run dev
```

Por padrão a API roda em `http://localhost:3001`.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Por padrão o frontend usa `VITE_API_BASE_URL=http://localhost:3001`.

## Variáveis

Backend (`backend-nest/.env`):

```env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://cadisk_dev:cadisk_dev_password@localhost:5433/cadisk_nest?schema=public
TEST_DATABASE_URL=postgresql://cadisk_dev:cadisk_dev_password@localhost:5433/cadisk_nest_test?schema=public
SECRET_KEY=replace-with-at-least-32-characters
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=0
BCRYPT_ROUNDS=12
LOGIN_MAX_ATTEMPTS=5
LOGIN_LOCKOUT_MINUTES=15
LOGIN_RATE_LIMIT_ATTEMPTS=10
LOGIN_RATE_LIMIT_WINDOW_SECONDS=60
APP_TIME_ZONE=America/Sao_Paulo
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
TRUSTED_HOSTS=localhost,127.0.0.1
```

Frontend (`frontend/.env`):

```env
VITE_API_BASE_URL=http://localhost:3001
```

`ACCESS_TOKEN_EXPIRE_MINUTES=0` mantém a sessão persistente até logout manual, troca de segredo ou invalidação operacional relevante. Se precisar expirar o JWT, ajuste esse valor.

## Migrações Manuais (Manual Migrations)

Caso precise adicionar alterações no banco que não podem ser resolvidas com os modelos Prisma (por exemplo, data copy, check constraints específicas), crie uma migração manual:

1. Gere um timestamp e crie a pasta em `backend-nest/prisma/migrations/<timestamp>_nome_da_migracao`.
2. Adicione seu SQL dentro de `migration.sql`.
3. Ajuste o `schema.prisma` caso as alterações reflitam em modelos.
4. Rode `npx prisma validate` e `npx prisma format` apenas.
5. Para aplicar localmente: `npm run prisma:migrate:dev`. Não use `prisma migrate dev --create-only` sem cuidado, pois o SQL que você adicionar manualmente precisará ser verificado.

## Testes

Frontend:

```bash
cd frontend
npm install
npm run build
```

Backend:

```bash
cd backend-nest
npm install
npm run lint
npx tsc --noEmit
npm run build
npm run test
npm run test:integration
npm run test:e2e
npm run prisma:generate
npx prisma validate --schema=prisma/schema.prisma
npm run prisma:migrate:test
```

## Estrutura

```text
AGENTS.md                 Governança de agentes
MIGRATION_CHECKLIST.md    Histórico completo da migração encerrada
README.md                 Apresentação pública do projeto
backend-nest/             Backend atual
frontend/                 Interface web atual
```
