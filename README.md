# Cadisk

Cadisk é uma aplicação web para cadistas controlarem trabalhos recebidos de dentistas. O sistema organiza casos por prazo, acompanha o fluxo de produção, preserva histórico operacional e apresenta uma visão financeira baseada nas entregas recebidas.

Aplicação publicada: https://cadisk.vercel.app/

## Funcionalidades

- Autenticação com isolamento de dados por usuário.
- Recuperação de senha por e-mail, com tokens de uso único e revogação de sessões anteriores.
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

## Autenticação e recuperação de senha

O username mantém o contrato existente: 5 a 80 caracteres, somente letras ASCII e
números, com ao menos uma letra. Espaços nas extremidades são removidos e a
unicidade ignora maiúsculas/minúsculas. O requisito mínimo aparece apenas como
erro após tentar cadastrar.

Cadastro e redefinição exigem **5 ou mais letras e 1 ou mais números**, com suporte
Unicode (`L` e dígitos decimais `Nd`). Não exigem símbolos, maiúsculas nem oito
caracteres. O bcrypt permanece; novas senhas acima de 72 bytes UTF-8 são rejeitadas
para evitar truncamento. Login exige somente senha não vazia e compara o hash,
inclusive para credenciais anteriores à política. O olho alterna a visibilidade
nos três formulários. A lista dinâmica aparece somente no cadastro e no reset.

`POST /auth/forgot-password` recebe `{ "email": "usuario@example.com" }` e responde
200 com `detail`: “Se existir uma conta com esse e-mail, enviaremos as instruções
para redefinir a senha.” A resposta também vale para endereço desconhecido e
solicitações suprimidas. Existe um piso comum de 5,5 segundos para reduzir a
diferença de tempo causada pelo envio (timeout de 5 segundos). O schema atual não
possui estado de conta inativa; bloqueios de login não impedem recuperar o acesso.

O link é `${FRONTEND_URL}/reset-password#token=<token>`. O navegador captura o
fragmento no estado da tela e imediatamente substitui a URL. O reset não aceita
token em query string nem o persiste em storage/cookies. Recarregar exige reabrir
o link. A rota é pública mesmo com sessão existente; a Vercel aplica `no-store`
e `no-referrer`, além do rewrite da SPA em `frontend/vercel.json`.

`POST /auth/reset-password` recebe `{ "token": "<token>", "password": "abcde1" }`.
O token possui 32 bytes aleatórios, somente SHA-256 é persistido, expira em 30
minutos e só o último link gerado permanece válido. A transação bloqueia a linha
do usuário, atualiza o hash bcrypt, consome os resets pendentes e incrementa
`authVersion`. A estratégia JWT consulta essa versão em cada requisição. JWTs
anteriores à migration são tratados como versão zero e também são revogados no
primeiro reset. Após sucesso, o frontend limpa a sessão local e oferece login.

Proteções contra abuso:

- Login mantém 10 tentativas/IP/minuto e bloqueio da conta por 15 minutos após
  5 falhas. Reset tem limite separado de 10 tentativas/IP/minuto.
- Solicitação de recuperação: 5/IP/15 minutos e 3/e-mail normalizado/15 minutos,
  em memória por instância, com chaves de e-mail em hash.
- PostgreSQL: 1 geração/2 minutos, 3/hora e 5/24 horas por conta; 50/24 horas global.
  Um advisory lock transacional serializa a reserva global, e a linha do usuário
  serializa geração/reset/login. O histórico usado/expirado permanece contado.
- Falhas de envio mantêm a reserva de quota e invalidam o link; não há retries
  automáticos. Sem fila, uma interrupção entre persistir e enviar pode exigir
  nova solicitação após o cooldown. Logs registram apenas mensagens genéricas.

Configuração externa necessária, **somente no backend/Render**:

```env
FRONTEND_URL=https://<URL_PUBLICA_REAL_DO_CADISK>
RESEND_API_KEY=<SECRET_DO_RESEND>
EMAIL_FROM="Cadisk <acesso@mail.henriquefreitas.tech>"
```

O remetente é lido de `EMAIL_FROM`, nunca fixado no código. Use a chave de envio
do Resend e o domínio verificado `mail.henriquefreitas.tech`. O adapter usa a
[API de envio do Resend](https://resend.com/docs/api-reference/emails/send-email)
por HTTP, atrás de `EmailService`, sem nova dependência. Não configure essas
variáveis com prefixo `VITE_`. Sem configuração, o envio não funciona; a resposta
pública permanece genérica e o backend registra a falha sem dados sensíveis.
Não foram feitas alterações externas nem envio real durante os testes.

A migration aditiva `20260922120000_password_reset_auth_version` cria
`password_resets` com FK/índices e adiciona `users.auth_version` com default zero.
**É necessário executar `prisma migrate deploy` em produção antes de servir o
novo backend.** O Docker/Render atual já faz isso automaticamente no startup,
usando `DIRECT_URL`. Para execução manual com o `.env` do ambiente configurado:

```bash
cd backend-nest
npm run prisma:generate
npm run prisma:migrate:deploy
npm run build
```

Publique também o frontend com `frontend` como Root Directory para que a Vercel
carregue o arquivo de headers e rewrite. As configurações externas e a entrega
real do e-mail devem ser verificadas pelo responsável pelo deploy.

## Testes

Frontend:

```bash
cd frontend
npm install
npm run build
```

Há também uma verificação de autenticação em navegador real, sem instalar uma
stack de testes. Requer Node 22+ e Chromium/Chrome/Brave local com DevTools aberto
em `127.0.0.1:9339`, usando um perfil temporário exclusivo. Inicie Vite com
`npm run dev -- --host 127.0.0.1 --port 5178 --strictPort` e execute
`npm run test:auth`. O script usa somente APIs nativas do Node, intercepta HTTP
de autenticação com respostas simuladas e testa formulários, fragmento, loading,
reenvio, erros e sessão. As URLs podem ser ajustadas por `AUTH_TEST_APP_URL` e
`AUTH_TEST_BROWSER_URL`; somente hosts locais são aceitos. Frontend não possui
scripts de lint, typecheck ou format check configurados.

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
