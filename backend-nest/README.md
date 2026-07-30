# Cadista NestJS Backend

Backend alvo da migracao do Cadista para TypeScript/NestJS + Prisma + PostgreSQL.

O backend FastAPI em `../backend/` continua sendo a implementacao de referencia ate o cutover. Este projeto roda em porta separada, por padrao `3001`, para permitir execucao paralela com o FastAPI na porta atual.

## Requisitos

- Node.js 20+
- npm
- Docker e Docker Compose

## Ambiente

Crie um `.env` local a partir de `.env.example` quando precisar rodar a aplicacao:

```bash
cp .env.example .env
```

Variaveis obrigatorias nesta fase:

- `NODE_ENV`: `development`, `test` ou `production`
- `PORT`: porta HTTP do NestJS, padrao recomendado `3001`
- `DATABASE_URL`: URL PostgreSQL usada pelo Prisma

Variaveis de autenticacao ja estao documentadas no exemplo, mas o modulo de auth ainda nao foi implementado nesta fase.

## Banco local

Suba o PostgreSQL local:

```bash
docker compose up -d postgres
```

O Compose expoe PostgreSQL em `localhost:5433`, cria o banco de desenvolvimento `cadista_nest` e prepara tambem `cadista_nest_test` para testes.

## Prisma

Gerar o client:

```bash
npm run prisma:generate
```

Durante a Fase 1, `prisma/schema.prisma` contem apenas um model tecnico `PrismaClientBootstrap`.
Ele existe somente para materializar o Prisma Client antes da modelagem de dominio, nao possui
migration nesta fase e nao e usado pelo runtime. A Fase 2 deve remover/substituir esse placeholder
antes da migration inicial real.

Quando existirem migrations:

```bash
npm run prisma:migrate:dev
npm run prisma:migrate:test
```

Constraints que Prisma nao expressar diretamente devem entrar como SQL customizado nas migrations.

## Desenvolvimento

```bash
npm install
docker compose up -d postgres
npm run prisma:generate
NODE_ENV=development PORT=3001 DATABASE_URL=postgresql://cadista:cadista_dev_password@localhost:5433/cadista_nest npm run start:dev
```

Healthchecks:

```bash
curl http://localhost:3001/health
curl http://localhost:3001/health/database
```

## Validacao

```bash
npm run lint
npm run build
npm run test
npm run test:integration
npm run test:e2e
```

Os testes de integracao/e2e usam PostgreSQL real. Eles recusam rodar fora de `NODE_ENV=test` ou se `DATABASE_URL` nao apontar para um banco com nome terminado em `_test`.
