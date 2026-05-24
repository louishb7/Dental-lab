# Cadista - Agents Guide

## Contexto do produto
Cadista é um sistema web simples de rastreamento de pedidos para um cadista independente, um técnico em prótese dentária que trabalha sozinho.

O problema que o produto resolve é operacional e direto: permitir que o usuário saiba, a qualquer momento, quais casos estão em aberto, o que precisa ser entregue, o que já foi concluído e quanto foi entregue no mês.

O sistema não é um ERP. Não há multiusuário, estoque, portal do dentista, integrações externas nem automações complexas no MVP. O foco é organização pessoal, persistência em banco de dados e acesso via navegador.

## Problema real
Fluxo atual esperado do usuário:

1. O pedido chega, normalmente por WhatsApp.
2. O cadista anota ou memoriza.
3. O trabalho é executado.
4. O pedido é entregue fisicamente ou devolvido ao doutor.
5. Não existe histórico confiável de pendências, entregas ou faturamento mensal.

Cadista existe para registrar esse fluxo com o mínimo de fricção e com dados consistentes.

## Entidades do domínio

### Doctor
Dentista que envia pedidos.

Campos principais:

- `id`
- `name`
- `clinic_name` opcional
- `phone` opcional
- `notes` opcional

Regras:

- Doutor com casos pendentes ou em andamento não pode ser excluído sem confirmação explícita.

### Case
Entidade principal do sistema. Representa um pedido recebido de um doutor.

Campos principais:

- `id`
- `doctor_id`
- `patient_ref`
- `deadline` opcional
- `priority`: `normal` ou `urgent`
- `status`: `pending | completed | delivered`
- `total_value` opcional
- `notes`
- `created_at`
- `delivered_at`
- `deleted_at` para soft delete quando aplicável

### CaseItem
Detalhe técnico do que precisa ser feito dentro de um caso.

Campos principais:

- `id`
- `case_id`
- `tooth`
- `service_type`
- `material`
- `color`
- `notes`

O campo `tooth` deve aceitar notação FDI entre `11` e `48`, mas também precisa aceitar texto livre para situações como prótese total.

## Ciclo de status

Fluxo permitido:

`pending -> completed -> delivered`

Significado:

- `pending`: caso recebido, ainda em execução
- `completed`: trabalho pronto, aguardando entrega
- `delivered`: entregue ao doutor e contabilizado no financeiro

Regras importantes:

- Mudança para `delivered` preenche `delivered_at` automaticamente com a data atual.
- Caso em `delivered` não deve voltar de status sem motivo registrado.
- Casos vencidos com status diferente de `delivered` devem aparecer no dashboard.

## Regras de negócio

1. Casos com `deadline` vencido e `status != delivered` devem ser identificados no dashboard.
2. Ao mudar o status para `delivered`, o sistema registra `delivered_at` automaticamente.
3. Um caso em `delivered` não pode retornar de status sem um campo de motivo preenchido.
4. Exclusão de `Case` só é permitida se `status = pending` e `total_value` for nulo.
5. Se a exclusão de `Case` não for permitida, a API deve retornar erro claro para o frontend pedir confirmação do usuário.
6. Exclusão de `Doctor` é bloqueada se houver casos `pending` ou `completed` associados.
7. O frontend é responsável por exibir confirmações destrutivas quando necessário, mas o backend também deve proteger as regras.
8. Toda alteração de schema deve ser acompanhada por migration via Alembic.
9. Testes são obrigatórios para todas as regras de negócio acima.

## Funcionalidades do MVP

### Dashboard

- Contagem de casos por status
- Lista de casos vencidos e ainda não entregues
- Lista de casos urgentes em aberto
- Total financeiro entregue no mês atual

### Casos

- Criar, editar e visualizar
- Alterar status
- Listar com filtros por status e por doutor
- Ver histórico básico de criação e entrega

### CaseItems

- Adicionar, editar e remover itens vinculados ao caso
- Listagem dentro da página do caso

### Doutores

- Cadastrar e editar
- Visualizar histórico de casos por doutor

### Financeiro básico

- Listagem de casos entregues com valor
- Total por período, principalmente por mês

### Autenticação

- Login com usuário e senha
- Sessão simples de um único usuário

## Stack técnica

### Backend

- Python 3.12+
- FastAPI
- SQLAlchemy 2.x com suporte assíncrono quando o projeto evoluir nessa direção
- Alembic para migrations
- PostgreSQL
- Pydantic v2
- python-jose + passlib para autenticação
- Pytest para testes

### Frontend do MVP

- HTML, CSS e JavaScript puro
- Consome a API via `fetch()`
- Sem framework de frontend no MVP

### Infraestrutura

- Deploy em Railway
- Gerenciador de dependências: `uv`
- Linter/formatter: Ruff
- Dockerfile básico desde o início

## Estrutura de diretórios

```text
cadista/
├── backend/
│   ├── main.py
│   ├── database/
│   │   └── connection.py
│   ├── models/
│   ├── schemas/
│   ├── routes/
│   ├── services/
│   └── alembic/
├── frontend/
│   ├── index.html
│   ├── css/
│   └── js/
├── tests/
├── alembic.ini
├── Dockerfile
├── pyproject.toml
└── agents.md
```

### Responsabilidade de cada camada

- `routes/`: apenas recebe requisição, valida entrada, chama service e devolve resposta JSON.
- `services/`: contém lógica de negócio e regras de persistência.
- `models/`: mapeamento ORM das tabelas.
- `schemas/`: validação e serialização de entrada e saída.
- `database/`: conexão, sessão e base declarativa.
- `tests/`: cobre regras de negócio, endpoints e comportamento crítico.

## Convenções obrigatórias

- Rotas não devem conter regra de negócio.
- Toda alteração estrutural no banco deve vir de migration Alembic.
- Não alterar tabela manualmente.
- Não introduzir módulos não previstos no MVP sem validação explícita.
- Soft delete deve ser usado para `Case` quando apropriado, principalmente fora de `pending`.
- O backend deve servir estritamente JSON.
- O frontend deve consumir a API, não renderizar lógica de domínio.
- Toda regra descrita aqui precisa de teste automatizado.

## Protocolo obrigatório de resposta do agent

Sempre que trabalhar neste projeto, o agent deve seguir estas regras de comunicação e entrega:

1. O output final deve ser detalhado, nunca resumido de forma excessiva quando houver alteração de código, estrutura ou decisão técnica relevante.
2. A resposta deve explicar claramente:
   - o que foi feito;
   - por que foi feito;
   - o que levou a essa decisão;
   - qual linha de raciocínio foi seguida;
   - quais tradeoffs foram considerados.
3. Quando houver mudança de arquivo, refatoração ou reorganização, o agent deve citar os arquivos afetados de forma objetiva.
4. Quando houver decisão técnica importante, o agent deve explicar a motivação e o impacto prático para o projeto.
5. Quando a entrega envolver alteração no repositório, a resposta final deve incluir uma sugestão de commit no formato natural, curta e específica.
6. Se algo não puder ser feito, o agent deve explicar o bloqueio, a causa e o próximo passo necessário.
7. O agent não deve omitir o contexto do trabalho executado nem esconder limitações relevantes.
8. A resposta deve priorizar clareza operacional acima de síntese agressiva.

## Formato esperado da resposta final

Ao concluir uma tarefa neste projeto, a resposta final deve seguir esta ordem lógica:

1. Resultado direto do que foi entregue.
2. Explicação do que mudou.
3. Motivo da mudança.
4. Raciocínio técnico adotado.
5. Impactos e observações relevantes.
6. Sugestão de commit.

## Ordem de implementação sugerida

1. Padronizar a base técnica do projeto: `pyproject.toml`, dependências, lint e ambiente.
2. Ajustar a camada de banco: configuração, models e Alembic.
3. Implementar autenticação simples de um usuário.
4. Implementar CRUD de `Doctor` com validações de exclusão.
5. Implementar CRUD de `Case` com status, `delivered_at`, soft delete e filtros.
6. Implementar CRUD de `CaseItem` vinculado ao caso.
7. Implementar dashboard com totais e alertas de prazo.
8. Implementar financeiro básico por período.
9. Criar frontend simples consumindo a API via `fetch()`.
10. Cobrir tudo com testes de unidade e integração.

## Observações de alinhamento

- O projeto deve ser conduzido com foco em simplicidade operacional.
- A cada decisão de modelagem, priorizar o uso real do cadista independente.
- Se surgir uma funcionalidade fora do escopo, ela deve ser tratada como futura e não como parte do MVP.
