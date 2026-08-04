# Checklist De Migração

Documento vivo e conciso do estado da migração do Cadisk para NestJS + Prisma + PostgreSQL.

## Estado Atual

- [x] Frontend React/Vite consome o backend NestJS por padrão em `http://localhost:3001`.
- [x] Backend NestJS implementa autenticação, dentistas, casos, itens, dashboard, financeiro e histórico persistente.
- [x] Prisma é o schema principal do backend NestJS.
- [x] PostgreSQL é o banco alvo do backend NestJS.
- [x] Histórico persistente de casos existe via `case_history_events`.
- [x] Retorno controlado de status existe para `delivered -> completed` e `completed -> pending`.
- [x] Financeiro usa o estado atual dos casos `delivered`, não eventos históricos como receita independente.
- [x] Sessão pode ser persistente com `ACCESS_TOKEN_EXPIRE_MINUTES=0`.
- [ ] Cutover/deploy final do backend NestJS ainda precisa ser formalizado.
- [ ] Remoção definitiva do backend FastAPI legado ainda precisa de decisão explícita.

## Backend Atual

O backend utilizado pela aplicação atual é `backend-nest/`.

Evidências:

- `frontend/src/services/api.js` usa `http://localhost:3001` como fallback.
- `frontend/.env.example` aponta `VITE_API_BASE_URL=http://localhost:3001`.
- `backend-nest/` contém os módulos ativos de domínio, testes Jest, Prisma schema e migrations.

## Backend Legado

`backend/`, `tests/`, `alembic.ini`, `pyproject.toml` e `requirements.txt` permanecem porque ainda representam o backend FastAPI legado usado como referência histórica e validação de paridade.

Eles não são o caminho principal de execução da SPA atual.

Não remover sem uma decisão explícita de cutover final.

## Decisões E Notas

- O contrato entre frontend e backend é HTTP + JSON.
- Multiusuário significa contas independentes com ownership estrito, sem equipes, organizações, convites ou colaboração em tempo real.
- Cada endpoint de domínio deve filtrar por usuário autenticado e tratar recurso alheio como inexistente.
- `pending`, `completed` e `delivered` continuam sendo os status de negócio.
- `delivered` representa entrega e recebimento; por isso o Financeiro considera apenas casos atualmente entregues e seu `deliveredAt`.
- Eventos históricos registram criação, avanço e retorno de status, mas não substituem o estado atual para cálculo financeiro.
- `status_revert_reason` é legado; a fonte de verdade do motivo de retorno é o evento de histórico correspondente.
- Histórico permite exclusão individual ou em lote de registros de arquivo por ação explícita do usuário.
- A página Histórico usa listagem paginada no backend e não carrega timelines completas antecipadamente.
- A página Casos permanece focada em operação de casos ativos.
- A página Bancada permanece focada em prazos e fluxo diário/semanal de trabalho.
- A documentação oficial do repositório foi consolidada em `README.md`, `AGENTS.md` e este arquivo.
- Documentação duplicada do NestJS e notas internas antigas foram removidas na limpeza conservadora do repositório.

## Validação Recomendada

Frontend:

```bash
cd frontend
npm install
npm run build
```

Backend NestJS:

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

Backend FastAPI legado:

```bash
pip install -r requirements.txt
pytest
```
