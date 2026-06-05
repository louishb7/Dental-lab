# Cadista - Governança de Agentes

Este arquivo define regras obrigatórias para qualquer agente que altere, revise ou gere código neste repositório.

Antes de executar uma tarefa, o agente deve considerar estas regras como parte do contrato da tarefa. Em caso de conflito entre uma sugestão genérica do agente e este arquivo, este arquivo prevalece, exceto quando o usuário der uma instrução explícita em contrário.

## Bootstrap Obrigatório

Antes de qualquer outra ação em uma tarefa neste repositório, o agente deve abrir e ler este arquivo por completo.

Regras obrigatórias:

- Nenhuma busca, inspeção de código, edição ou execução de comando deve acontecer antes da leitura integral deste arquivo.
- Em cada tarefa nova, a leitura deste arquivo deve acontecer novamente, mesmo que a conversa anterior já tenha tratado do projeto.
- Se a leitura não estiver explicitamente evidente na sessão corrente, o agente deve parar e ler este arquivo antes de prosseguir.
- O agente não deve confiar apenas em memória, contexto anterior ou instruções genéricas do sistema para substituir esta leitura.
- Esta regra vale para toda interação no repositório, inclusive revisões, correções rápidas e ajustes pontuais.

---

## Modo Aula

Quando o usuário escrever algo como "codex, torne tudo em uma aula", "me dá uma aula disso", "explica o que aconteceu", "resumo didático" ou qualquer variante que peça uma explicação pedagógica do que foi feito, ative o Modo Aula.

No Modo Aula, reuna todas as informações, decisões e alterações feitas nessa sessão e estruture a resposta assim:

**1. Contexto e problema**
O que estava quebrado, qual era o sintoma visível e qual era a causa raiz real.

**2. Raciocínio diagnóstico**
Como o problema foi identificado. Quais pistas levaram à causa raiz. O que foi descartado e por quê.

**3. A solução passo a passo**
O que foi feito, em que ordem e por quê cada passo era necessário. Se algo não funcionou antes de funcionar, explica o motivo.

**4. Conceitos envolvidos**
Explica cada tecnologia, ferramenta ou conceito que apareceu na solução como se o usuário nunca tivesse visto antes. Sem assumir conhecimento prévio.

**5. O que eu devo lembrar**
Os aprendizados principais dessa tarefa em forma de regras práticas aplicáveis no futuro.

Tom: engenheiro sênior revisando o trabalho com um júnior — direto, sem enrolação, mas sem pular etapas importantes.

O Modo Aula só é ativado quando explicitamente solicitado. Em todas as outras situações, siga o comportamento padrão.


## Nomenclatura do Projeto

O nome de trabalho atual do produto é **Cadista**.

Neste repositório, use `Cadista` como nome padrão em documentação, mensagens de interface, comentários e descrições técnicas enquanto não houver decisão formal de renomeação.

Evite variantes como `Kadista`, `K-dista` ou outras grafias inconsistentes, especialmente em arquivos novos, mensagens de interface e documentação.

Quando encontrar uma grafia incorreta no mesmo arquivo ou escopo da tarefa atual, corrija se isso for seguro e não gerar refatoração ampla. Não faça varreduras globais apenas para renomear termos, a menos que a tarefa peça explicitamente.

Observação: “cadista” também é o nome da profissão/público-alvo. Portanto, diferencie quando necessário:

- **Cadista**: nome de trabalho do produto;
- **cadista**: profissional que utiliza o sistema.

---

## Arquitetura Desacoplada

O repositório é dividido estritamente em duas aplicações independentes:

- `backend/`: API FastAPI funcional, responsável por regras de negócio, persistência e tráfego exclusivamente em JSON.
- `frontend/`: SPA React autônoma, responsável pela experiência de usuário e pelo consumo da API via HTTP.

O backend não deve renderizar HTML, templates ou assets do frontend.

O frontend não deve acessar banco de dados, arquivos internos do backend ou regras de persistência diretamente.

O contrato entre as camadas é HTTP + JSON.

---

## Padrão Backend

O backend deve seguir FastAPI, SQLAlchemy, Pydantic e Alembic.

Regras obrigatórias:

- Rotas em `backend/routes/` recebem requisições, validam dependências, chamam services e retornam JSON.
- Persistência CRUD deve permanecer procedural em `backend/services/`, usando funções explícitas para criar, listar, atualizar e excluir entidades.
- Modelos ORM ficam em `backend/models/` e devem manter relacionamentos simétricos com `relationship(..., back_populates=...)`.
- Schemas Pydantic ficam em `backend/schemas/` e definem entrada e saída da API.
- Toda alteração estrutural de banco deve possuir migration Alembic.
- Dados financeiros devem usar `Decimal` no domínio Python/Pydantic e `Numeric(10, 2)` no SQLAlchemy.
- Funções públicas, services, handlers relevantes e utilitários reutilizáveis devem possuir docstrings objetivas.
- Funções internas triviais podem dispensar docstring se o nome e o contexto forem autoexplicativos.

---

## Padrão Frontend

O frontend oficial é React gerenciado por Vite.

Regras obrigatórias:

- `frontend/src/main.jsx` é o ponto de entrada da SPA.
- `frontend/src/App.jsx` contém o container principal da interface ou delega para componentes menores quando o módulo crescer.
- Chamadas HTTP devem ficar isoladas em services, com cliente centralizado em `frontend/src/services/api.js`.
- Componentes React devem ser funcionais, com estado explícito via hooks e efeitos controlados por `useEffect`.
- Funções JavaScript exportadas, handlers relevantes e utilitários devem ter JSDoc objetivo.
- A interface deve consumir JSON da API.
- Dados de domínio não devem ser duplicados como fonte de verdade no frontend.

---

## Direção de UX/UI

O frontend deve priorizar uma experiência de ferramenta operacional para cadistas/laboratórios.

O sistema é uma segunda ferramenta de trabalho. A ferramenta principal do usuário tende a ser o software de modelagem 3D.

A interface deve ser:

- objetiva;
- sóbria;
- rápida de consultar;
- focada em casos, prazos, dentistas, serviços e entregas;
- adequada para uso diário como painel operacional.

Evitar:

- aparência de landing page odontológica;
- excesso de gráficos;
- widgets decorativos;
- linguagem genérica de template;
- elementos visuais que desviem atenção da operação principal.

A tabela de casos é uma das áreas centrais do produto.

---

## Contrato Entre Camadas

O contrato entre frontend e backend é HTTP + JSON.

O frontend deve tratar:

- carregamento;
- sucesso;
- erro;
- listas vazias;
- falhas de rede;
- mensagens de validação.

O backend deve retornar status HTTP e mensagens de erro claras para permitir que a SPA apresente feedback consistente ao usuário.

---

## Controle de Escopo

O agente deve resolver a tarefa solicitada com a menor mudança segura possível.

Não deve realizar refatorações amplas, renomeações globais, troca de bibliotecas, alteração de arquitetura ou mudanças de modelo de dados sem necessidade direta para a tarefa atual.

Melhorias oportunistas são permitidas apenas dentro do mesmo arquivo ou escopo imediato da tarefa, desde que não aumentem risco nem dificultem revisão.

Quando uma melhoria relevante estiver fora do escopo, o agente deve registrá-la como recomendação, não implementá-la automaticamente.

---

## Qualidade Obrigatória

- Manter código simples, legível e modular.
- Preferir padrões já existentes no repositório.
- Não introduzir dependências sem necessidade técnica clara.
- Não misturar responsabilidades entre camadas.
- Garantir testes automatizados para regras de negócio críticas.
- Não quebrar compatibilidade de rotas sem atualizar o frontend e os testes.
- Não remover funcionalidades existentes sem substituição equivalente ou justificativa clara.
- Não criar funcionalidade falsa apenas visualmente se a API ou o domínio ainda não suportarem.

---

## Validação

O agente deve validar as mudanças sempre que possível.

Validações comuns:

Backend:

```bash
pytest
```

---

## Formato Da Resposta Final

Ao concluir qualquer tarefa, o agente deve encerrar a resposta com a explicação final do que foi feito.

Regras obrigatórias:

- A resposta final deve começar pelo resultado objetivo da tarefa.
- A explicação, o resumo das mudanças e os comentários finais devem aparecer somente no final da resposta.
- O último bloco não vazio da resposta deve ser sempre a explicação final; não encerrar com uma resposta curta sem esse fechamento.
- Não iniciar a resposta final com metacomentários, saudações ou justificativas genéricas.
- Se houver validação, os resultados devem aparecer antes da explicação final.
- Em tarefas com múltiplos passos, a conclusão deve sempre terminar com o resumo explicativo, nunca antes.
