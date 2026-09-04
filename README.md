# Cadisk

Cadisk é uma aplicação web para cadistas controlarem trabalhos recebidos de dentistas. O sistema organiza casos por prazo, acompanha o fluxo de produção, preserva histórico operacional e apresenta uma visão financeira baseada nas entregas recebidas.

Aplicação publicada: https://cadisk.vercel.app/

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

- Node.js 20.19+ ou 22.12+.
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
DATABASE_URL=postgresql://cadisk_dev:cadisk_dev_password@localhost:5433/cadisk_nest?schema=public
DIRECT_URL=postgresql://cadisk_dev:cadisk_dev_password@localhost:5433/cadisk_nest?schema=public
SECRET_KEY=replace-with-at-least-32-characters
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# Opcional localmente. Render injeta PORT automaticamente.
PORT=3001

# Usada pelos comandos de teste.
TEST_DATABASE_URL=postgresql://cadisk_dev:cadisk_dev_password@localhost:5433/cadisk_nest_test?schema=public
```

Frontend (`frontend/.env`):

```env
VITE_API_BASE_URL=http://localhost:3001
```

Em produção, o backend precisa essencialmente de `DATABASE_URL`, `DIRECT_URL`,
`SECRET_KEY` e `CORS_ORIGINS`. `DATABASE_URL` deve ser a conexão pooled do Neon
usada pela aplicação. `DIRECT_URL` deve ser a conexão direct do Neon usada
somente pelas migrations no startup do container. `PORT` possui fallback local e
normalmente é injetada pela plataforma. Algoritmo JWT, bcrypt, lockout e rate
limit são regras internas do Cadisk, não variáveis de deploy.

## Deploy

Backend no Render:

```text
Root Directory: backend-nest
Environment: Docker
Dockerfile Path: Dockerfile
Docker Context Directory: .
Health Check Path: /health
```

Variáveis no Render:

```env
DATABASE_URL=<NEON_POOLED_DATABASE_URL>
DIRECT_URL=<NEON_DIRECT_DATABASE_URL>
SECRET_KEY=<SECRET_KEY_COM_PELO_MENOS_32_CARACTERES>
CORS_ORIGINS=https://<VERCEL_APP_URL>
```

O container executa `prisma migrate deploy` automaticamente com `DIRECT_URL`
antes de iniciar a API. A aplicação NestJS/Prisma Client continua usando
`DATABASE_URL`. Se uma migration falhar, a aplicação não inicia.

Frontend na Vercel:

```text
Root Directory: frontend
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
```

Variável na Vercel:

```env
VITE_API_BASE_URL=https://<RENDER_SERVICE_URL>
```

Não adicione sufixo de path em `VITE_API_BASE_URL`; a SPA monta os paths da API
internamente.

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
npm run prisma:generate
npx prisma validate --schema=prisma/schema.prisma
npm run prisma:migrate:test
npm run lint
npx tsc --noEmit
npm run build
npm run test
npm run test:integration
npm run test:e2e
```

## Estrutura

```text
README.md                 Apresentação pública do projeto
backend-nest/             Backend atual
frontend/                 Interface web atual
```
