# Cadista Migration Checklist

Documento vivo para acompanhar a migracao fiel do Cadista de Python/FastAPI para TypeScript/NestJS + Prisma + PostgreSQL.

Esta migracao e de paridade. O backend FastAPI em `backend/` e seus testes Python continuam sendo a fonte de verdade comportamental ate o cutover. O backend NestJS deve ficar em pasta separada, atualmente `backend-nest/`, para que FastAPI e NestJS possam rodar em paralelo.

## Principios Obrigatorios

- [ ] Cadista e oficialmente multiusuario.
- [ ] Todos os endpoints de dominio exigem autenticacao.
- [ ] O usuario autenticado vem do JWT, nunca de `user_id` no body, query string ou path publico.
- [ ] Cada usuario possui seus proprios doutores, casos e itens.
- [ ] Consultas, mutacoes e agregacoes de dominio sempre filtram por ownership.
- [ ] IDs enviados pelo cliente nunca bastam para autorizar acesso.
- [ ] Recursos de outro usuario se comportam como inexistentes, sem vazamento de informacao.
- [ ] Testes multiusuario com pelo menos dois usuarios sao obrigatorios em cada modulo de dominio.
- [ ] Registros novos criados pela aplicacao devem ter proprietario obrigatorio.
- [ ] `Doctor.user_id` nulo no legado deve ser tratado apenas como compatibilidade/migracao de dados, nunca como regra normal da nova aplicacao.
- [ ] FastAPI permanece disponivel como implementacao de referencia ate o cutover.
- [ ] Frontend React/Vite permanece sem repontamento ate a Fase 9.
- [ ] Nenhuma divergencia intencional deve ser implementada sem registro previo em `Decisoes e Notas`.
- [ ] Ao final de cada alteracao, fornecer uma mensagem de commit sugerida para revisao do usuario.

## Inventario de Paridade Validado

- [ ] Preservar entidades `User`, `Doctor`, `DentalCase`/`Case` e `CaseItem`.
- [ ] Preservar tabelas fisicas atuais: `users`, `doctors`, `cases`, `case_items`.
- [ ] Preservar `User`: `id`, `email`, `username`, `password_hash`, `failed_login_attempts`, `locked_until`, `last_failed_login_at`, `last_login_at`, `created_at`, `updated_at`.
- [ ] Preservar unicidade case-insensitive de `email` e `username`, equivalente aos indices unicos em `lower(email)` e `lower(username)`.
- [ ] Preservar normalizacao de usuario: email salvo em lowercase, username com `trim`, buscas de email/username/identifier case-insensitive.
- [ ] Preservar validacao de cadastro: email com padrao basico, username minimo de 5 caracteres, apenas alfanumerico, nao apenas numeros; senha minima de 6 caracteres e ao menos 1 numero.
- [ ] Preservar login por `identifier`, aceitando username ou email, alem dos aliases atuais `username` e `email` no payload.
- [ ] Preservar JWT com `sub` igual ao username, `iat`, `exp`, algoritmo configuravel e `token_type: "bearer"`.
- [ ] Preservar lockout de conta em `User`: falhas incrementam `failed_login_attempts`, definem `last_failed_login_at`, bloqueiam em `locked_until` ao atingir `LOGIN_MAX_ATTEMPTS`, e login valido limpa o estado.
- [ ] Preservar detalhe real do lockout: ao atingir o limite, `locked_until` e definido e `failed_login_attempts` volta para `0`; lock expirado limpa `locked_until`, `failed_login_attempts` e `last_failed_login_at`.
- [ ] Preservar rate limit de login por `client_id` em janela deslizante com timestamps, retorno `429`, mensagem atual e header `Retry-After`.
- [ ] Preservar `client_id` atual do rate limit de login como `request.client.host`, com fallback `"unknown"`; headers de proxy nao sao considerados no comportamento atual.
- [ ] Preservar que `POST /auth/login` registra tentativa no rate limit antes de autenticar; login bem-sucedido nao chama reset da janela por `client_id`.
- [ ] Preservar `Doctor`: `id`, `user_id`, `name`, `clinic_name`, `phone`, `notes`, `created_at`, `deleted_at`.
- [ ] Preservar FK `doctors.user_id -> users.id` com `ON DELETE CASCADE`; no Nest, ownership e obrigatorio para criacao e operacao.
- [ ] Preservar soft delete de doctor por `deleted_at`, listagens/buscas retornando apenas ativos.
- [ ] Preservar `cases_count` em respostas de doctor como contagem de casos ativos (`cases.deleted_at IS NULL`).
- [ ] Preservar regra real de exclusao de doctor: bloquear soft delete somente se houver caso ativo com status `pending` ou `completed`; permitir soft delete quando os casos ativos vinculados estiverem entregues.
- [ ] Preservar normalizacao de telefone BR: aceita vazio como `null`, aceita `(xx)xxxx-xxxx`/`(xx)xxxxx-xxxx`, ou 10/11 digitos e formata.
- [ ] Preservar `DentalCase`: `id`, `doctor_id`, `patient_ref`, `pricing_mode`, `deadline`, `priority`, `status`, `total_value`, `notes`, `created_at`, `delivered_at`, `deleted_at`, `status_revert_reason`.
- [ ] Preservar FK `cases.doctor_id -> doctors.id` com `ON DELETE RESTRICT`.
- [ ] Preservar constraints de case: `priority IN ('normal', 'urgent')`, `status IN ('pending', 'completed', 'delivered')`, `pricing_mode IN ('fixed', 'services')`, `total_value IS NULL OR total_value >= 0`.
- [ ] Preservar soft delete de case por `deleted_at`; delete retorna o case removido e listagens/buscas retornam apenas ativos.
- [ ] Preservar filtros de listagem de cases: `skip`, `limit`, `doctor_id`, query alias `status`.
- [ ] Preservar ordenacao de cases por `id DESC` e itens por `id DESC`.
- [ ] Preservar `items_count` em respostas de case como contagem de linhas `CaseItem`, nao soma de `quantity`.
- [ ] Preservar carregamento de `items` na resposta de case.
- [ ] Preservar resolucao de `pricing_mode` na criacao: modo informado vence; sem modo, inferir `fixed` se `total_value` veio preenchido, senao `services`.
- [ ] Preservar criacao de case sempre com `status = "pending"`; qualquer `status` aceito pelo schema base no payload de criacao e ignorado pelo service atual.
- [ ] Preservar regra de `fixed`: `total_value` obrigatorio e mantido independente dos itens.
- [ ] Preservar regra de `services`: se o payload informa `pricing_mode: "services"`, `total_value` nao e aceito diretamente; o total inicial e `null` e depois e recalculado pelos itens.
- [ ] Preservar normalizacao monetaria backend para `total_value` e `unit_value`: aceita `Decimal`, numero, string, `R$`, espacos, milhar com ponto e decimal com virgula.
- [ ] Preservar fluxo linear de status: `pending -> completed -> delivered`.
- [ ] Permitir permanecer no status atual conforme o contrato atual.
- [ ] Bloquear pular etapas.
- [ ] Bloquear qualquer retorno de status.
- [ ] Garantir que tentativa invalida de status preserve status e demais dados anteriores.
- [ ] Preservar `delivered_at`: definido automaticamente ao mudar para `delivered` somente se ainda estiver vazio.
- [ ] Nao implementar reversao de status.
- [ ] Nao criar regra nova baseada em `status_revert_reason`.
- [ ] Tratar `status_revert_reason` como campo legado atualmente ignorado pelo service; manter apenas se necessario para compatibilidade de contrato.
- [ ] Preservar `CaseUpdate` atual sem `pricing_mode`; qualquer alteracao deve ser decisao separada.
- [ ] Preservar `bulk-deliver` com diferenca real entre payload vazio e payload com IDs.
- [ ] `bulk-deliver` sem `case_ids` ou com lista vazia: selecionar somente casos `completed`, respeitar filtro opcional por doctor e ownership do usuario.
- [ ] `bulk-deliver` com IDs: remover duplicados, buscar apenas dentro do ownership, validar que todos foram encontrados, falhar com `409` se algum faltar, promover `pending` para `completed` e depois `delivered`, entregar `completed`, usar mesmo instante de operacao, preservar `delivered_at` existente, retornar por `id ASC`.
- [ ] Preservar detalhe real de `bulk-deliver` com IDs: casos ja `delivered` selecionados explicitamente tambem sao retornados, permanecem `delivered` e preservam `delivered_at`.
- [ ] `bulk-deliver` deve ser transacional: nenhuma atualizacao parcial se a validacao falhar.
- [ ] Preservar `CaseItem`: `id`, `case_id`, `tooth`, `service_type`, `quantity`, `unit_value`, `material`, `color`, `notes`.
- [ ] Preservar FK `case_items.case_id -> cases.id` com `ON DELETE CASCADE`.
- [ ] Preservar constraints de item: `quantity >= 1`, `unit_value IS NULL OR unit_value >= 0`.
- [ ] Preservar validacao de `tooth`: trim, nao vazio; se numerico, entre 11 e 48; descricao livre nao numerica e aceita.
- [ ] Preservar regra de item em case `services`: `unit_value` obrigatorio na criacao e nao pode ser atualizado para `null`.
- [ ] Preservar permissao de `unit_value = null` em case `fixed`.
- [ ] Preservar recalc de `total_value` quando item e criado, editado ou removido em case `services`, usando soma de `quantity * unit_value`.
- [ ] Preservar comportamento atual da soma: sem valores somaveis, `total_value` fica `null`.
- [ ] Preservar dashboard `GET /dashboard/overview`: `generated_at`, `status_counts`, `overdue_cases`, `urgent_open_cases`, `delivered_cases_month`, `delivered_total_month`, `delivered_count_month`.
- [ ] Preservar dashboard por usuario autenticado, excluindo cases soft-deletados.
- [ ] Preservar `status_counts` sempre com chaves `pending`, `completed`, `delivered`, mesmo com zero.
- [ ] Preservar overdue: status diferente de `delivered`, deadline nao nulo, data do deadline menor que hoje, ordenado por deadline ASC e id DESC.
- [ ] Preservar urgentes em aberto: `priority = urgent`, status diferente de `delivered`, ordenado por deadline ASC com nulos por ultimo e id DESC.
- [ ] Preservar entregues do mes: status `delivered`, `delivered_at` dentro do mes corrente, `total_value` nao nulo, ordenado por `delivered_at DESC` e id DESC.
- [ ] Preservar headers globais: `Cache-Control: no-store`, `Pragma: no-cache`, `Expires: 0`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-site`.
- [ ] Preservar `Cache-Control: no-store` forcado em rotas `/auth/*`.
- [ ] Preservar CORS atual: origens locais padrao 3000/5173, regex local dinamico em desenvolvimento, sem credentials, metodos `GET, POST, PUT, DELETE, OPTIONS`, headers `Authorization, Content-Type, Accept, Origin`.
- [ ] Preservar Trusted Hosts sem wildcard.
- [ ] Preservar regras de producao: `DATABASE_URL` e `SECRET_KEY` obrigatorios; `SECRET_KEY` minimo 32; CORS e Trusted Hosts explicitos em producao; CORS de producao deve ser HTTPS e nao local; `CORS_ORIGIN_REGEX` proibido em producao.
- [ ] Preservar docs OpenAPI desabilitados em producao ou documentar equivalente no Nest.
- [ ] Preservar endpoint raiz `GET /` retornando mensagem operacional equivalente.
- [ ] Preservar frontend React/Vite existente como consumidor HTTP + JSON.
- [ ] Preservar cliente frontend em `frontend/src/services/api.js`, `VITE_API_BASE_URL`, fallback FastAPI `http://localhost:8000`, token em `localStorage` (`cadista_token`) e usuario em `cadista_user`.
- [ ] Preservar tratamento frontend de resposta: parse JSON, 204 como `null`, `detail` string ou lista de validacao, limpeza de sessao em falha de carga autenticada.
- [ ] Preservar defaults reais de banco/modelo: `users.failed_login_attempts = 0`, `cases.priority = "normal"`, `cases.status = "pending"`, `cases.pricing_mode = "services"`, `case_items.quantity = 1`.

## Constraints e SQL Customizado no Prisma

- [x] Preservar constraints unicas legadas case-sensitive `uq_users_email` e `uq_users_username`, alem dos indices unicos funcionais em `lower(email)` e `lower(username)`, salvo decisao explicita em contrario.
- [x] Criar migration SQL customizada para indice unico `uq_users_email_lower` em `lower(email)`.
- [x] Criar migration SQL customizada para indice unico `uq_users_username_lower` em `lower(username)`.
- [x] Criar SQL customizado para checks de `cases.priority`, `cases.status`, `cases.pricing_mode` e `cases.total_value >= 0`.
- [x] Criar SQL customizado para checks de `case_items.quantity >= 1` e `case_items.unit_value >= 0`.
- [x] Preservar `ON DELETE CASCADE` de `doctors.user_id`.
- [x] Preservar `ON DELETE RESTRICT` de `cases.doctor_id`.
- [x] Preservar `ON DELETE CASCADE` de `case_items.case_id`.
- [x] Preservar indices usados por filtros e ownership: `doctors.user_id`, `doctors.deleted_at`, `doctors.name`, `cases.doctor_id`, `cases.patient_ref`, `cases.priority`, `cases.status`, `cases.deleted_at`, `case_items.case_id`.
- [x] Resolver na Fase 2 a divergencia auditada de indice: `backend/models/case.py` declara `pricing_mode` com `index=True`, mas a migration Alembic `0005_case_billing_modes` nao cria indice para `cases.pricing_mode`.
- [x] Documentar em cada migration o que foi expresso via Prisma e o que exigiu SQL manual.

## Matriz de Paridade por Endpoint

| Modulo | Metodo e rota | Autenticacao | Ownership | Entrada | Resposta | Status HTTP | Regra de negocio | Teste Python de referencia | Teste Nest equivalente | Situacao |
| ------ | ------------- | ------------ | --------- | ------- | -------- | ----------- | ---------------- | -------------------------- | ---------------------- | -------- |
| Root | `GET /` | Nao | N/A | Nenhuma | `{ "message": "API Cadista operante!" }` ou equivalente documentado | `200` | Healthcheck operacional legado | `test_security_headers.py`, `test_database_health.py` | Pendente | Pendente |
| Auth | `POST /auth/register` | Nao | Cria usuario | `email`, `username`, `password` | token bearer, username, email | `201`, `409`, `422`, `503` | Normalizacao, validacao, hash, duplicidade, token imediato | `test_auth.py` | `test/e2e/auth.e2e-spec.ts`, `test/integration/auth-user.integration-spec.ts` | Concluido na Fase 3 |
| Auth | `POST /auth/login` | Nao | Usuario por identifier | `identifier`/`username`/`email`, `password` | token bearer, username, email | `200`, `401`, `423`, `429`, `422`, `503` | Login case-insensitive, lockout, sliding window rate limit | `test_auth.py` | `test/e2e/auth.e2e-spec.ts`, `test/integration/auth-user.integration-spec.ts`, `src/auth/login-rate-limit.service.spec.ts` | Concluido na Fase 3 |
| Auth | `GET /auth/me` | Sim | Usuario do JWT | Bearer token | `id`, `username`, `email` | `200`, `401` | Token valido e usuario existente | `test_auth.py` | `test/e2e/auth.e2e-spec.ts` | Concluido na Fase 3 |
| Doctor | `POST /doctors/` | Sim | Cria com usuario do JWT | `DoctorCreate` | `DoctorResponse` com `cases_count` | `201`, `401`, `422` | Normaliza telefone, ownership obrigatorio | `test_doctor.py`, `test_authorization.py` | `test/e2e/doctor.e2e-spec.ts`, `test/integration/doctor.integration-spec.ts`, `src/doctor/doctor-phone.spec.ts` | Concluido na Fase 4 |
| Doctor | `GET /doctors/` | Sim | Filtra por usuario | `skip`, `limit` | Lista de `DoctorResponse` | `200`, `401` | Apenas ativos, `cases_count`, lista vazia | `test_auth.py`, `test_doctor.py`, `test_authorization.py`, `test_dashboard.py` | `test/e2e/doctor.e2e-spec.ts`, `test/integration/doctor.integration-spec.ts` | Concluido na Fase 4 |
| Doctor | `GET /doctors/{doctor_id}` | Sim | Filtra por usuario | `doctor_id` | `DoctorResponse` | `200`, `401`, `404` | Outro usuario retorna nao encontrado | `test_authorization.py` | `test/e2e/doctor.e2e-spec.ts`, `test/integration/doctor.integration-spec.ts` | Concluido na Fase 4 |
| Doctor | `PUT /doctors/{doctor_id}` | Sim | Filtra por usuario | `DoctorUpdate` | `DoctorResponse` | `200`, `401`, `404`, `422` | Atualizacao parcial e telefone | `test_doctor.py`, `test_authorization.py` | `test/e2e/doctor.e2e-spec.ts`, `test/integration/doctor.integration-spec.ts` | Concluido na Fase 4 |
| Doctor | `DELETE /doctors/{doctor_id}` | Sim | Filtra por usuario | `doctor_id` | Corpo vazio | `204`, `401`, `404`, `409` | Soft delete, bloqueio por casos ativos pending/completed | `test_doctor.py` | `test/e2e/doctor.e2e-spec.ts`, `test/integration/doctor.integration-spec.ts` | Concluido na Fase 4 |
| Case | `POST /cases/` | Sim | Doctor deve pertencer ao usuario | `CaseCreate` | `CaseResponse` | `201`, `401`, `404`, `422` | Pricing mode, valor fixo/servicos, status inicial pending | `test_case.py`, `test_authorization.py` | `test/e2e/case.e2e-spec.ts`, `test/integration/case.integration-spec.ts`, `src/case/case-rules.spec.ts` | Concluido na Fase 5 |
| Case | `GET /cases/` | Sim | Filtra por usuario | `skip`, `limit`, `doctor_id`, `status` | Lista de `CaseResponse` | `200`, `401` | Apenas ativos, filtros, `id DESC`, items e `items_count` | `test_auth.py`, `test_dashboard.py`, `test_authorization.py` | `test/e2e/case.e2e-spec.ts`, `test/integration/case.integration-spec.ts` | Concluido na Fase 5 |
| Case | `GET /cases/{case_id}` | Sim | Filtra por usuario | `case_id` | `CaseResponse` | `200`, `401`, `404` | Outro usuario retorna nao encontrado | `test_authorization.py` | `test/e2e/case.e2e-spec.ts`, `test/integration/case.integration-spec.ts` | Concluido na Fase 5 |
| Case | `POST /cases/bulk-deliver` | Sim | Filtra por usuario e doctor | `case_ids`, `doctor_id` | Lista de `CaseResponse` | `200`, `401`, `409`, `422` | Com IDs vs sem IDs, dedupe, transacao, `id ASC` | `test_case.py`, `test_authorization.py` | `test/e2e/case.e2e-spec.ts`, `test/integration/case.integration-spec.ts` | Concluido na Fase 5 |
| Case | `PUT /cases/{case_id}` | Sim | Filtra por usuario | `CaseUpdate` | `CaseResponse` | `200`, `401`, `404`, `409`, `422` | Status linear, pricing atual, doctor ativo, sem reversao | `test_case.py`, `test_authorization.py` | `test/e2e/case.e2e-spec.ts`, `test/integration/case.integration-spec.ts`, `src/case/case-rules.spec.ts` | Concluido na Fase 5 |
| Case | `DELETE /cases/{case_id}` | Sim | Filtra por usuario | `case_id` | `CaseResponse` soft-deletado | `200`, `401`, `404`, `409` | Soft delete | `test_case.py`, `test_authorization.py` | `test/e2e/case.e2e-spec.ts`, `test/integration/case.integration-spec.ts` | Concluido na Fase 5 |
| CaseItem | `GET /cases/{case_id}/items/` | Sim | Case deve pertencer ao usuario | `case_id` | Lista de `CaseItemResponse` | `200`, `401`, `404` | `id DESC`, case deletado/externo como nao encontrado | `test_case_item.py`, `test_authorization.py` | Pendente | Pendente |
| CaseItem | `POST /cases/{case_id}/items/` | Sim | Case deve pertencer ao usuario | `CaseItemCreate` | `CaseItemResponse` | `201`, `401`, `404`, `422`; `ValueError` de `unit_value` em case `services` nao e convertido pela rota atual e deve ser confirmado antes da Fase 6 | Tooth, quantity, unit_value em services, recalc | `test_case_item.py`, `test_case.py` | Pendente | Pendente |
| CaseItem | `GET /cases/{case_id}/items/{item_id}` | Sim | Case/item devem pertencer ao usuario | IDs | `CaseItemResponse` | `200`, `401`, `404` | Outro usuario retorna nao encontrado | `test_authorization.py` | Pendente | Pendente |
| CaseItem | `PUT /cases/{case_id}/items/{item_id}` | Sim | Case/item devem pertencer ao usuario | `CaseItemUpdate` | `CaseItemResponse` | `200`, `401`, `404`, `422`; `ValueError` de `unit_value` em case `services` nao e convertido pela rota atual e deve ser confirmado antes da Fase 6 | Atualizacao parcial, validacoes, recalc | `test_case_item.py`, `test_authorization.py` | Pendente | Pendente |
| CaseItem | `DELETE /cases/{case_id}/items/{item_id}` | Sim | Case/item devem pertencer ao usuario | IDs | Corpo vazio | `204`, `401`, `404` | Delete fisico de item, recalc se services | `test_case_item.py`, `test_authorization.py` | Pendente | Pendente |
| Dashboard | `GET /dashboard/overview` | Sim | Agrega apenas usuario | Nenhuma | `DashboardSummaryResponse` | `200`, `401` | Status counts, atrasados, urgentes, entregues do mes | `test_dashboard.py`, `test_authorization.py` | Pendente | Pendente |

## Testes de Paridade

### Unitarios Jest

- [x] Configuracao valida e invalida.
- [ ] Validadores puros de DTO/utilitarios quando cada modulo for migrado.
- [x] Algoritmo manual de sliding window do login quando auth for migrado.
- [ ] Regras puras de pricing, status e normalizacao monetaria quando os modulos forem migrados.

### Integracao Prisma/PostgreSQL

- [x] Conexao real com PostgreSQL; nao usar SQLite como substituto.
- [x] Banco isolado para testes destrutivos, diferente do banco de desenvolvimento.
- [x] Healthcheck de banco com `SELECT 1`.
- [x] Constraints SQL customizadas comprovadas por testes conforme forem criadas.
- [x] Transacoes de casos e bulk-deliver comprovadas por testes.

### E2E Supertest

- [x] Healthcheck da aplicacao.
- [ ] Contrato HTTP, status codes, `detail`, trailing slash e serializacao.
- [ ] Rotas protegidas e isolamento multiusuario em cada modulo relevante.
- [ ] Equivalencia aos Pytests: `test_auth`, `test_authorization`, `test_case`, `test_case_item`, `test_dashboard`, `test_doctor`, `test_security_headers`, `test_database_health`, `test_production_settings`.

## Ordem de Execucao

### Fase 1 - Setup do Projeto

- [x] Criar aplicacao NestJS/TypeScript em `backend-nest/` sem alterar o backend FastAPI funcional.
- [x] Configurar TypeScript estrito com `strict`, `noImplicitAny`, `strictNullChecks`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `forceConsistentCasingInFileNames`.
- [x] Configurar estrutura inicial sem controllers/services ficticios de dominio.
- [x] Adicionar `ConfigModule` e validacao de `NODE_ENV`, `PORT`, `DATABASE_URL`.
- [x] Documentar variaveis futuras de auth no `.env.example` sem implementar auth.
- [x] Configurar Prisma.
- [x] Criar `PrismaService` e ciclo de conexao.
- [x] Configurar PostgreSQL local via Docker Compose com volume persistente e healthcheck.
- [x] Definir estrategia separada para banco de testes e protecao contra uso acidental do banco de desenvolvimento.
- [x] Criar healthcheck basico da aplicacao.
- [x] Criar healthcheck de banco.
- [x] Configurar lint e format.
- [x] Configurar testes unitarios Jest.
- [x] Configurar testes de integracao com Prisma/PostgreSQL.
- [x] Configurar testes e2e com Supertest.
- [x] Implementar teste unitario minimo de bootstrap/configuracao.
- [x] Implementar teste e2e do healthcheck da aplicacao.
- [x] Implementar teste de integracao do healthcheck/conexao com PostgreSQL.
- [x] Implementar teste de falha de configuracao quando `DATABASE_URL` estiver ausente ou invalida.
- [x] Documentar comandos de desenvolvimento, testes e migrations.
- [x] Garantir portas distintas: FastAPI na porta atual e NestJS em outra porta configuravel.
- [x] Executar instalacao de dependencias.
- [x] Executar lint.
- [x] Executar build.
- [x] Executar testes unitarios.
- [x] Executar testes de integracao.
- [x] Executar testes e2e.
- [ ] Inicializar PostgreSQL pelo Docker Compose. Bloqueado neste ambiente porque `docker` e `podman` nao estao instalados.
- [x] Inicializar PostgreSQL local via binarios do sistema em `/tmp/cadista-nest-postgres`, porta `5433`, para concluir validacoes locais sem Docker.
- [x] Inicializar NestJS com banco disponivel.
- [x] Validar healthcheck da aplicacao por HTTP com a aplicacao conectada ao banco.
- [x] Validar healthcheck do banco por HTTP com a aplicacao conectada ao banco.
- [x] Confirmar que nao ha implementacao prematura de dominio.
- [x] Confirmar que o backend FastAPI nao foi alterado.
- [x] Registrar evidencias reais da fase em `Decisoes e Notas`.
- [x] Registrar resumo textual da fase.

### Fase 2 - Schema Prisma e Migration Inicial

- [x] Modelar `User` no `schema.prisma` com campos, defaults, timestamps e indices necessarios.
- [x] Modelar `Doctor` no `schema.prisma` com ownership, soft delete e relacao com cases.
- [x] Modelar `DentalCase`/`Case` no `schema.prisma` apontando para tabela `cases`.
- [x] Modelar `CaseItem` no `schema.prisma`.
- [x] Implementar enums ou validacoes equivalentes para `pricing_mode`, `priority` e `status`.
- [x] Implementar constraints financeiras e de quantidade equivalentes.
- [x] Implementar unicidade case-insensitive de email/username no PostgreSQL via SQL customizado.
- [x] Gerar migration inicial Prisma.
- [x] Validar `prisma migrate` em banco limpo.
- [x] Validar introspeccao minima das tabelas e `SELECT 1`.
- [x] Registrar resumo textual da fase.

### Fase 3 - Auth e User

- [x] Criar modulo `auth`.
- [x] Criar modulo/service/repository de `user`.
- [x] Documentar algoritmo Python atual do rate limit antes de implementar.
- [x] Implementar DTOs de register/login/me com validacoes equivalentes.
- [x] Implementar hashing bcrypt com rounds configuraveis.
- [x] Implementar `POST /auth/register` com normalizacao, duplicidade e retorno de token.
- [x] Implementar `POST /auth/login` com `identifier`, aliases equivalentes, JWT e erros equivalentes.
- [x] Implementar lockout de conta separado do rate limit por client_id.
- [x] Implementar rate limit de login por janela deslizante manual ou provar equivalencia por testes.
- [x] Implementar JWT strategy/guard e `GET /auth/me`.
- [x] Cobrir auth com testes unitarios e e2e equivalentes a `test_auth.py`.
- [x] Cobrir rotas protegidas sem token e com token.
- [x] Registrar resumo textual da fase.

### Fase 4 - Doctor

- [x] Criar modulo `doctor`.
- [x] Implementar DTOs de create/update/response.
- [x] Implementar CRUD com ownership obrigatorio por usuario autenticado.
- [x] Implementar normalizacao e validacao de telefone BR.
- [x] Implementar soft delete por `deleted_at`.
- [x] Implementar bloqueio de exclusao quando houver cases ativos `pending` ou `completed`.
- [x] Implementar `cases_count` em respostas.
- [x] Preservar status HTTP e mensagens de erro principais.
- [x] Cobrir com testes unitarios, integracao e e2e equivalentes a `test_doctor.py` e partes de `test_authorization.py`.
- [x] Cobrir isolamento multiusuario.
- [x] Registrar resumo textual da fase.

### Fase 5 - Case

- [x] Criar modulo `case`.
- [x] Implementar DTOs de create/update/bulk-deliver/response.
- [x] Implementar CRUD com ownership via doctor do usuario autenticado.
- [x] Implementar resolucao de `pricing_mode` na criacao.
- [x] Implementar regras de `fixed` e `services`.
- [x] Implementar normalizacao monetaria de `total_value`.
- [x] Implementar filtros `skip`, `limit`, `doctor_id` e `status`.
- [x] Implementar ordenacao por `id DESC`.
- [x] Implementar fluxo linear de status sem reversao.
- [x] Preservar `status_revert_reason` como campo legado ignorado, se ainda necessario no DTO de compatibilidade.
- [x] Implementar bulk-deliver dedicado com comportamento real completo.
- [x] Implementar delete por soft delete e retorno do case.
- [x] Implementar `items_count` e `items` em respostas.
- [x] Cobrir bulk-deliver: lista vazia, IDs duplicados, IDs inexistentes, ID de outro usuario, mistura pending/completed, filtro por doctor, rollback integral em erro.
- [x] Cobrir com testes unitarios, integracao e e2e equivalentes a `test_case.py` e partes de `test_authorization.py`.
- [x] Cobrir isolamento multiusuario.
- [x] Registrar resumo textual da fase.

### Fase 6 - CaseItem

- [ ] Criar modulo `case-item`.
- [ ] Implementar DTOs de create/update/response.
- [ ] Implementar CRUD aninhado em `/cases/{case_id}/items`.
- [ ] Implementar validacao de `tooth`.
- [ ] Implementar validacao de `quantity >= 1`.
- [ ] Implementar normalizacao monetaria de `unit_value`.
- [ ] Implementar regra de `unit_value` obrigatorio para cases `services`.
- [ ] Implementar permissao de `unit_value = null` para cases `fixed`.
- [ ] Recalcular `total_value` do case pai em create/update/delete quando `pricing_mode = services`.
- [ ] Preservar ordenacao de listagem por `id DESC`.
- [ ] Cobrir com testes unitarios, integracao e e2e equivalentes a `test_case_item.py` e partes de `test_authorization.py`.
- [ ] Cobrir isolamento multiusuario.
- [ ] Registrar resumo textual da fase.

### Fase 7 - Dashboard

- [ ] Criar modulo `dashboard`.
- [ ] Implementar `GET /dashboard/overview`.
- [ ] Implementar `status_counts` com zeros default.
- [ ] Implementar overdue cases com criterio de data e status equivalente.
- [ ] Implementar urgent open cases com criterio e ordenacao equivalente.
- [ ] Implementar delivered cases do mes com janela mensal equivalente.
- [ ] Implementar soma e contagem financeira mensal.
- [ ] Implementar `doctor_name` nas respostas compactas.
- [ ] Criar testes de limites de dia, mes e timezone.
- [ ] Cobrir com testes unitarios, integracao e e2e equivalentes a `test_dashboard.py` e partes de `test_authorization.py`.
- [ ] Cobrir isolamento multiusuario nas agregacoes.
- [ ] Registrar resumo textual da fase.

### Fase 8 - Seguranca Global

- [ ] Implementar middleware global de headers de seguranca equivalente.
- [ ] Implementar `Cache-Control: no-store` global e reforco em `/auth/*`.
- [ ] Configurar CORS equivalente em desenvolvimento.
- [ ] Configurar validacoes de CORS e Trusted Hosts para producao.
- [ ] Configurar Trusted Hosts sem wildcard.
- [ ] Desabilitar docs em producao ou documentar alternativa Nest equivalente.
- [ ] Avaliar rate limit global sem alterar comportamento critico do login.
- [ ] Cobrir com testes e2e equivalentes a `test_security_headers.py`.
- [ ] Cobrir configuracoes de producao equivalente a `test_production_settings.py`.
- [ ] Registrar resumo textual da fase.

### Fase 9 - Frontend

- [ ] Confirmar nova URL base local do Nest.
- [ ] Repontar `frontend/src/services/api.js` via `VITE_API_BASE_URL` ou fallback controlado.
- [ ] Manter React/Vite existente sem migrar para Tailwind.
- [ ] Validar login, cadastro, dashboard, doctors, cases, case items e finance consumindo a API Nest.
- [ ] Validar tratamento de loading, sucesso, erro, lista vazia, falha de rede e validacao 422.
- [ ] Executar build do frontend.
- [ ] Registrar resumo textual da fase.

### Fase 10 - Deploy

- [ ] Escolher PostgreSQL gerenciado: Railway, Neon ou Supabase.
- [ ] Definir backend Nest em Render ou Railway.
- [ ] Configurar variaveis de ambiente de producao.
- [ ] Executar migrations Prisma em producao.
- [ ] Configurar CORS e Trusted Hosts reais.
- [ ] Resolver estrategia de cold start.
- [ ] Validar healthcheck publico.
- [ ] Validar fluxo autenticado em producao.
- [ ] Registrar resumo textual da fase.

## Definition of Done por Modulo

- [ ] Regras de negocio relevantes implementadas, nao apenas CRUD basico.
- [ ] Testes unitarios Jest quando houver regra pura ou configuracao testavel.
- [ ] Testes de integracao com Prisma/PostgreSQL para persistencia, constraints e transacoes.
- [ ] Testes e2e Supertest para contrato HTTP.
- [ ] Testes multiusuario cobrindo isolamento de dados em cada modulo relevante.
- [ ] Contrato de endpoint equivalente ao original.
- [ ] Qualquer mudanca intencional documentada em `Decisoes e Notas`.
- [ ] Resumo textual escrito ao final do modulo com o que foi traduzido e por que.
- [ ] Validacao objetiva executada e registrada.
- [ ] Mensagem de commit sugerida entregue ao usuario no fechamento da alteracao.

## Decisoes e Notas

- Fase 5 concluida: criado `CaseModule` no NestJS com endpoints `POST/GET/GET by id/POST bulk-deliver/PUT/DELETE /cases`, todos protegidos por JWT. Ownership e aplicado via `doctor.user_id` em todas as consultas e mutacoes; doctors de outro usuario ou soft-deletados retornam o mesmo erro de "Doutor/Caso nao encontrado" usado para recurso inexistente.
- Fase 5 regras traduzidas: criacao sempre salva `status = "pending"`; `pricing_mode` e inferido como `fixed` quando `total_value` vem preenchido e como `services` caso contrario; modo `fixed` exige valor; modo `services` recusa valor combinado explicito e recalcula `total_value` a partir de `case_items`; `CaseUpdate` nao aceita troca publica de `pricing_mode`; `status_revert_reason` permanece aceito no DTO de update e ignorado pelo service, sem habilitar reversao.
- Fase 5 bulk-deliver: sem IDs ou com lista vazia entrega apenas casos `completed`, respeitando filtro opcional por doctor; com IDs remove duplicados, valida todos dentro do ownership, entrega `pending` e `completed`, preserva `delivered_at` existente, retorna em `id ASC` e evita atualizacao parcial quando ha ID inexistente/de outro usuario.
- Fase 5 testes: `case_items` foram criados diretamente via Prisma nos testes de Case apenas para validar `items`, `items_count` e recalc de total de casos `services`, sem implementar endpoints de CaseItem antes da Fase 6.
- Fase 5 validacoes: `npm run format`, `npm run lint`, `npm run build`, `npm run test`, `npm run test:integration` e `npm run test:e2e` executados com sucesso em `backend-nest/`.
- Fase 4 concluida: criado `DoctorModule` no NestJS com endpoints `POST/GET/GET by id/PUT/DELETE /doctors/`, todos protegidos por JWT. A criacao sempre usa `user.id` do token para `doctors.user_id`, sem aceitar `user_id` publico; consultas, updates e deletes filtram por `id`, `user_id` e `deleted_at IS NULL`, fazendo recursos de outro usuario retornarem como nao encontrados.
- Fase 4 regras traduzidas: telefone BR preserva regex/formato legado e fallback para 10/11 digitos; string vazia vira `null`; `cases_count` conta apenas casos com `deleted_at IS NULL`; delete aplica soft delete em `deleted_at`; delete e bloqueado com `409` e detail legado quando existe caso ativo `pending` ou `completed`; casos `delivered` nao bloqueiam.
- Fase 4 testes: casos de `cases_count` e bloqueio de delete criam registros em `cases` diretamente via Prisma nos testes, sem implementar controller/service de Case antes da Fase 5.
- Fase 4 validacoes: `npm run format`, `npm run lint`, `npm run build`, `npm run test`, `npm run test:integration` e `npm run test:e2e` executados com sucesso em `backend-nest/`.
- Fase 3/auth: algoritmo legado de rate limit de login documentado antes da traducao. O FastAPI usa um `dict[str, deque[float]]` em memoria protegido por `Lock`; a chave e `request.client.host` com fallback `"unknown"`; em cada `POST /auth/login`, a tentativa e registrada antes da autenticacao; timestamps mais antigos que `LOGIN_RATE_LIMIT_WINDOW_SECONDS` sao removidos; se a fila ainda tiver `LOGIN_RATE_LIMIT_ATTEMPTS` ou mais entradas, a requisicao falha com `429`, detail `"Muitas tentativas. Tente novamente mais tarde."` e header `Retry-After = max(1, ceil(window - (now - primeira_tentativa)))`; login bem-sucedido nao limpa a janela. Esse mecanismo e separado do lockout persistido em `users`.
- Fase 3 concluida: criados `AuthModule` e `UserModule` no NestJS preservando cadastro com token imediato, normalizacao case-insensitive de email/username, login por `identifier` e aliases `username`/`email`, JWT com `sub=username`, bcrypt configuravel, lockout persistido em `users`, rate limit manual por janela deslizante em memoria e `GET /auth/me` protegido por bearer token.
- Fase 3 decisao de teste: scripts `test:integration` e `test:e2e` fixam valores de seguranca (`BCRYPT_ROUNDS=4`, `LOGIN_MAX_ATTEMPTS=3`, janela de rate limit) para reproduzir os cenarios de lockout/rate limit de forma deterministica, sem depender de variaveis externas do shell.
- Fase 3 validacoes: `npm run format`, `npm run lint`, `npm run build`, `npm run test`, `npm run test:integration`, `npm run test:e2e`, `pg_isready -h localhost -p 5433 -U cadista`, `psql ... -c "SELECT 1 AS ok"`, start do NestJS em `PORT=3002` fora do sandbox e `curl -i http://127.0.0.1:3002/health`, `curl -i http://127.0.0.1:3002/health/database` executados com sucesso.
- Fase 3 observacao de ambiente: tentativas de iniciar/curl o NestJS dentro do sandbox falharam ao acessar `localhost`; a validacao real de runtime foi repetida fora do sandbox com permissao aprovada e passou.
- Processo: ao final de cada alteracao, o agente deve fornecer uma mensagem de commit sugerida para facilitar a revisao e o registro das etapas da migracao.
- `status_revert_reason` e campo legado: existe no modelo/schema de resposta FastAPI, mas o service atual ignora o valor recebido em update e nao permite reversao de status. A migracao deve preservar o fluxo linear sem criar regra nova baseada nesse campo.
- FastAPI em `backend/` deve permanecer disponivel como referencia ate o cutover; o NestJS sera criado em `backend-nest/` e rodara em porta configuravel diferente da porta atual do FastAPI.
- Fase 1 criou `backend-nest/` com NestJS, ConfigModule, PrismaService, healthchecks, Docker Compose PostgreSQL, lint/format, Jest unitario, teste de integracao Prisma/PostgreSQL e e2e Supertest. Nao foram criados modulos de dominio.
- Prisma foi fixado em `6.19.3`. A tentativa com Prisma `7.9.1` exigiu o novo fluxo de `prisma.config.ts` e mudaria mais infraestrutura do que o necessario nesta fase.
- `prisma/schema.prisma` contem `PrismaClientBootstrap`, um model tecnico temporario para permitir `prisma generate` antes da Fase 2. Ele nao possui migration nesta fase, nao e usado pelo runtime, e deve ser removido/substituido antes da migration inicial real de dominio.
- Validacoes comprovadas em Fase 1: `npm install`, `npm run prisma:generate`, `npx prisma validate --schema=prisma/schema.prisma`, `npm run format`, `npm run lint`, `npm run build`, `npm run test`, `env -u DATABASE_URL NODE_ENV=development PORT=3001 npm run start:dev`.
- Validacoes antes bloqueadas foram concluidas com PostgreSQL 16 local iniciado por binarios do sistema: `initdb -D /tmp/cadista-nest-postgres -U cadista --auth=trust`, `pg_ctl -D /tmp/cadista-nest-postgres -l /tmp/cadista-nest-postgres.log -o "-p 5433 -h localhost -k /tmp" start`, criacao dos bancos `cadista_nest` e `cadista_nest_test`, `npm run test:integration`, `npm run test:e2e`, start do NestJS na porta `3001`, `curl -i http://localhost:3001/health` e `curl -i http://localhost:3001/health/database`.
- Docker Compose permanece configurado, mas nao foi validado neste ambiente porque `docker` e `podman` nao estao instalados. A validacao local usou PostgreSQL real, nao SQLite.
- Auditoria FastAPI antes da Fase 2: checklist atualizado com detalhes reais de rate limit/lockout, defaults, criacao de case com status sempre `pending`, comportamento de `bulk-deliver` com casos ja `delivered`, constraints unicas legadas de `users`, divergencia de indice `cases.pricing_mode` entre modelo e Alembic, e gap de contrato HTTP nas rotas `case-item` para `ValueError` de `unit_value`.
- Validacao da auditoria FastAPI antes da Fase 2: `npm run lint`, `npm run build`, `npm run test`, `npm run test:integration` e `npm run test:e2e` passaram no `backend-nest/`. `pytest` legado foi executado com `DATABASE_URL=sqlite:////tmp/cadista_test.db`; a suite completa nao retornou resumo final neste ambiente, e a selecao `tests/test_authorization.py tests/test_doctor.py tests/test_case_item.py tests/test_database_health.py tests/test_security_headers.py tests/test_production_settings.py` atingiu `timeout 180s` apos exibir oito testes passados, sem falha de assertion registrada.
- Fase 2 decisao de schema: `pricing_mode`, `priority` e `status` permanecem como `String`/`varchar` com check constraints SQL customizadas, em vez de enums PostgreSQL, para preservar a forma fisica do banco legado.
- Fase 2 decisao de ownership: `doctors.user_id` permanece nullable no banco para compatibilidade/migracao de dados legados, mas deve ser obrigatorio nas operacoes novas da aplicacao Nest.
- Fase 2 decisao de indice: nao criar indice em `cases.pricing_mode` na migration inicial Prisma, porque a migration Alembic real nao cria esse indice e nenhum endpoint atual filtra por esse campo. A anotacao `index=True` no modelo SQLAlchemy fica registrada como divergencia auditada.
- Fase 2 concluida: `PrismaClientBootstrap` foi removido e substituido pelos models `User`, `Doctor`, `DentalCase` e `CaseItem`, preservando nomes fisicos das tabelas legadas, mapeamento snake_case, `Decimal(10, 2)`, timestamps com timezone, defaults, soft delete, FKs e indices auditados.
- Fase 2 migration: `20260730152630_initial_domain_schema` foi gerada pelo Prisma e ajustada com SQL customizado para constraints unicas legadas, indices `uq_users_email_lower`/`uq_users_username_lower`, checks de `cases` e checks de `case_items`.
- Fase 2 validacoes: `npx prisma format`, `npx prisma validate`, `npx prisma migrate dev`, `npm run prisma:migrate:test`, `npx prisma migrate status`, introspeccao SQL de tabelas/constraints/indices, `SELECT 1`, `npm run format`, `npm run lint`, `npm run build`, `npm run test`, `npm run test:integration`, `npm run test:e2e` e selecao Pytest curta (`tests/test_database_health.py`, `tests/test_doctor.py`, `test_case_item_quantity_must_be_positive`) executados com sucesso.
