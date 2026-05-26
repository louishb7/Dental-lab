# Cadista - Governanca de Agentes

## Nomenclatura Oficial

O nome oficial e unico do produto e **Cadista**.

E proibido usar qualquer variante com `K` em codigo, documentacao, comentarios,
 mensagens de interface, commits, nomes de modulos ou descricoes tecnicas.
Quando um agente encontrar a grafia incorreta, deve corrigi-la no mesmo escopo
da tarefa, desde que isso nao gere refatoracao ampla fora do objetivo atual.

## Arquitetura Desacoplada

O repositorio e dividido estritamente em duas aplicacoes independentes:

- `backend/`: API FastAPI funcional, responsavel por regras de negocio,
  persistencia e trafego exclusivamente em JSON.
- `frontend/`: SPA React autonoma, responsavel pela experiencia de usuario e
  pelo consumo da API via HTTP.

O backend nao deve renderizar HTML, templates ou assets do frontend. O frontend
nao deve acessar banco de dados, arquivos internos do backend ou regras de
persistencia diretamente.

## Padrao Backend

O backend deve seguir FastAPI, SQLAlchemy, Pydantic e Alembic.

Regras obrigatorias:

- Rotas em `backend/routes/` recebem requisicoes, validam dependencias, chamam
  services e retornam JSON.
- Persistencia CRUD deve permanecer procedural em `backend/services/`, usando
  funcoes explicitas para criar, listar, atualizar e excluir entidades.
- Modelos ORM ficam em `backend/models/` e devem manter relacionamentos
  simetricos com `relationship(..., back_populates=...)`.
- Schemas Pydantic ficam em `backend/schemas/` e definem entrada e saida da API.
- Toda alteracao estrutural de banco deve possuir migration Alembic.
- Dados financeiros devem usar `Decimal` no dominio Python/Pydantic e
  `Numeric(10, 2)` no SQLAlchemy.
- Todas as funcoes publicas ou auxiliares relevantes devem possuir docstrings
  explicando objetivo, argumentos, retorno e excecoes quando aplicavel.

## Padrao Frontend

O frontend oficial e React gerenciado por Vite.

Regras obrigatorias:

- `frontend/src/main.jsx` e o ponto de entrada da SPA.
- `frontend/src/App.jsx` contem o container principal da interface ou delega
  para componentes menores quando o modulo crescer.
- Chamadas HTTP devem ficar isoladas em services, com cliente centralizado em
  `frontend/src/services/api.js`.
- Componentes React devem ser funcionais, com estado explicito via hooks e
  efeitos controlados por `useEffect`.
- Funcoes JavaScript exportadas, handlers relevantes e utilitarios devem ter
  JSDoc objetivo.
- A interface deve consumir JSON da API; dados de dominio nao devem ser
  duplicados como fonte de verdade no frontend.

## Contrato Entre Camadas

O contrato entre frontend e backend e HTTP + JSON.

O frontend deve tratar estados de carregamento, sucesso, erro e listas vazias.
O backend deve retornar status HTTP e mensagens de erro claras para permitir que
a SPA apresente feedback consistente ao usuario.

## Qualidade Obrigatoria

- Manter codigo simples, legivel e modular.
- Preferir padroes ja existentes no repositorio.
- Nao introduzir dependencias sem necessidade tecnica clara.
- Nao misturar responsabilidades entre camadas.
- Garantir testes automatizados para regras de negocio criticas.
- Nao quebrar compatibilidade de rotas sem atualizar o frontend e os testes.

## Protocolo Permanente de Resposta e Revisao

Esta secao e permanente e nao deve ser removida por agentes futuros.

Sempre que executar qualquer tarefa neste repositorio, o agente deve entregar
uma revisao completa e detalhada da tarefa executada. A resposta final deve
explicar, de forma objetiva e rastreavel:

- qual foi o erro encontrado, quando a tarefa for uma correcao de erro;
- o que foi feito, quando a tarefa nao for uma correcao de erro;
- por que a mudanca foi feita;
- por que a decisao tecnica adotada foi escolhida;
- qual linha de raciocinio levou a solucao implementada;
- quais consideracoes importantes, impactos, limitacoes ou riscos permanecem;
- quais arquivos foram alterados, quando houver mudanca no repositorio;
- quais comandos de validacao foram executados e seus resultados;
- o que nao pode ser validado, quando alguma verificacao nao for possivel.

O objetivo desta regra e impedir respostas finais excessivamente resumidas.
Mesmo em tarefas simples, o agente deve registrar o raciocinio tecnico essencial
e deixar claro se a tarefa tratava um defeito, uma evolucao funcional, uma
mudanca de documentacao ou uma decisao arquitetural.

Ao final de tarefas com alteracao de codigo, estrutura ou governanca, o agente
deve sugerir uma mensagem de commit curta, natural e especifica que represente o
conjunto das mudancas realizadas.
