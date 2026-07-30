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
- `SECRET_KEY`: chave de assinatura JWT, minimo 32 caracteres
- `ALGORITHM`: algoritmo JWT aceito (`HS256`, `HS384` ou `HS512`)
- `ACCESS_TOKEN_EXPIRE_MINUTES`: expiracao do JWT em minutos
- `BCRYPT_ROUNDS`: custo do bcrypt
- `LOGIN_MAX_ATTEMPTS`: limite de falhas antes do lockout da conta
- `LOGIN_LOCKOUT_MINUTES`: duracao do lockout temporario
- `LOGIN_RATE_LIMIT_ATTEMPTS`: limite de tentativas por cliente na janela deslizante
- `LOGIN_RATE_LIMIT_WINDOW_SECONDS`: tamanho da janela deslizante do login
- `CORS_ORIGINS`: origens HTTP permitidas, separadas por virgula
- `CORS_ORIGIN_REGEX`: regex opcional para origens locais dinamicas em desenvolvimento/teste; proibida em producao
- `TRUSTED_HOSTS`: hosts aceitos no header `Host`, separados por virgula

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

O schema Prisma ja modela as tabelas legadas `users`, `doctors`, `cases` e `case_items`.
As constraints que Prisma nao representa diretamente ficam em SQL customizado dentro da
migration inicial, incluindo checks de status/cobranca/valores e indices unicos funcionais
para `lower(email)` e `lower(username)`.

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

Endpoints de auth ja migrados nesta fase:

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`

Endpoints de doctor ja migrados na Fase 4:

- `POST /doctors/`
- `GET /doctors/`
- `GET /doctors/{doctor_id}`
- `PUT /doctors/{doctor_id}`
- `DELETE /doctors/{doctor_id}`

Endpoints de case ja migrados na Fase 5:

- `POST /cases/`
- `GET /cases/`
- `GET /cases/{case_id}`
- `POST /cases/bulk-deliver`
- `PUT /cases/{case_id}`
- `DELETE /cases/{case_id}`

Endpoints de case-item ja migrados na Fase 6:

- `GET /cases/{case_id}/items/`
- `POST /cases/{case_id}/items/`
- `GET /cases/{case_id}/items/{item_id}`
- `PUT /cases/{case_id}/items/{item_id}`
- `DELETE /cases/{case_id}/items/{item_id}`

Endpoint de dashboard ja migrado na Fase 7:

- `GET /dashboard/overview`

Seguranca global migrada na Fase 8:

- Headers globais de seguranca e cache
- CORS local equivalente ao FastAPI
- Trusted Hosts sem wildcard
- Validacoes de ambiente para producao
- Rotas de docs/OpenAPI nao configuradas no Nest

## Validacao

```bash
npm run lint
npm run build
npm run test
npm run test:integration
npm run test:e2e
```

Os testes de integracao/e2e usam PostgreSQL real. Eles recusam rodar fora de `NODE_ENV=test` ou se `DATABASE_URL` nao apontar para um banco com nome terminado em `_test`.
