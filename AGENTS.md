# Cadisk - Governança de Agentes

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

O nome atual do produto na interface é **Cadisk**.

Neste repositório, use `Cadisk` como nome padrão em documentação pública, mensagens de interface, comentários e descrições técnicas novas.

Evite variantes como `Cadista`, `Kadista`, `K-dista` ou outras grafias inconsistentes, especialmente em arquivos novos, mensagens de interface e documentação.

Quando encontrar uma grafia incorreta no mesmo arquivo ou escopo da tarefa atual, corrija se isso for seguro e não gerar refatoração ampla. Não faça varreduras globais apenas para renomear termos, a menos que a tarefa peça explicitamente.

Observação: “cadista” também é o nome da profissão/público-alvo. Portanto, diferencie quando necessário:

- **Cadisk**: nome atual do produto;
- **cadista**: profissional que utiliza o sistema.

---

## Arquitetura Desacoplada e Migração

O repositório é dividido estritamente em aplicações independentes:

- `backend-nest/`: API atual em TypeScript/NestJS + Prisma + PostgreSQL.
- `frontend/`: SPA React autônoma, responsável pela experiência de usuário e pelo consumo da API via HTTP.

Backends não devem renderizar HTML, templates ou assets do frontend.

O frontend não deve acessar banco de dados, arquivos internos do backend ou regras de persistência diretamente.

O contrato entre as camadas é HTTP + JSON.

---

## Migração

A migração para NestJS foi encerrada. O repositório atual deve representar somente a aplicação vigente em React, NestJS, Prisma e PostgreSQL.

Regras obrigatórias:

- Não reintroduzir outro backend, rollback histórico ou implementação paralela sem decisão explícita do usuário.
- Divergências intencionais relevantes devem ser registradas em `MIGRATION_CHECKLIST.md`, na seção "Decisões e Notas".
- O backend NestJS é a fonte atual de regras de negócio, contrato HTTP, persistência e testes.

---

## Multiusuário e Ownership

O Cadisk é oficialmente um sistema multiusuário.

Regras obrigatórias:

- Todos os endpoints de domínio devem exigir autenticação.
- O usuário autenticado deve ser obtido pelo token JWT, nunca por `user_id` recebido no body, query string ou parâmetros públicos.
- Cada usuário possui seus próprios doutores, casos e itens.
- Um usuário nunca pode visualizar, alterar, excluir ou agregar dados de outro usuário.
- Todas as consultas e mutações de domínio devem incluir ownership no filtro, mesmo quando o cliente fornece IDs.
- Recursos de outro usuário devem se comportar como inexistentes, retornando o mesmo resultado usado para recursos não encontrados.
- Testes de isolamento entre pelo menos dois usuários são obrigatórios em cada módulo de domínio relevante.
- Registros novos criados pela aplicação devem ter proprietário obrigatório.

---

## Padrão Backend NestJS

O backend em `backend-nest/` deve seguir NestJS, TypeScript estrito, Prisma e PostgreSQL.

Regras obrigatórias:

- Controllers recebem requisições, aplicam guards/pipes, chamam services e retornam JSON.
- Services injetáveis concentram regras de negócio e persistência via Prisma.
- DTOs usam `class-validator` e `class-transformer` quando houver validação de entrada.
- `PrismaService` centraliza conexão e ciclo de vida do Prisma.
- Toda alteração estrutural de banco deve possuir Prisma migration.
- Quando Prisma não representar uma constraint diretamente, usar SQL customizado na migration e documentar a razão.
- Dados financeiros devem preservar precisão: banco com `Numeric(10, 2)`/`Decimal`, Prisma `Decimal`, domínio sem `number` para cálculos monetários críticos, serialização compatível com a API atual.
- TypeScript deve permanecer estrito; não desativar verificações para fazer o projeto compilar.
- Não criar controllers/services de domínio fictícios.

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
- Não avançar fases de uma tarefa automaticamente quando o usuário exigir pausas explícitas; cada fase começa apenas após validação e confirmação do usuário.

---

## Validação

O agente deve validar as mudanças sempre que possível.

Validações comuns:

Backend NestJS:

```bash
cd backend-nest
npm run lint
npm run build
npm run test
npm run test:integration
npm run test:e2e
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
- Ao final de cada alteração de arquivos, a resposta final deve incluir uma mensagem de commit sugerida para revisão do usuário.

## Modo Diagnóstico Estrito — v2

## Quando ativar

Use este modo somente quando o usuário ativar explicitamente com frases como:

* "ative o modo diagnóstico"
* "debug em fases"
* "pare de corrigir por suspeita"
* "primeiro diagnostique, depois corrija"
* "o problema resistiu aos prompts normais"

Este modo existe para problemas grandes, persistentes ou mascarados por múltiplas causas. Exemplos:

* API não sobe em produção
* erro local diferente de produção
* autenticação quebrada sem causa clara
* banco / migrations / schema divergentes
* CORS mascarando erro real
* build falhando sem mensagem clara
* bug que reaparece após várias correções
* comportamento visual quebrado por múltiplos componentes

---

## Regra central

Neste modo, o agente **não corrige nada antes de provar a causa com evidência.**

Correção sem evidência é proibida.

O trabalho é separado em fases. Cada fase só começa após a anterior ser concluída e autorizada.

---

## Fase 1 — Diagnóstico

O objetivo desta fase é responder: **qual é a causa comprovada do problema?**

A fase tem duas etapas internas obrigatórias.

### 1a — Leitura passiva

Nesta etapa, o agente apenas lê. Não executa comandos, não altera arquivos, não abre conexões.

O que fazer:

* ler logs já disponíveis no contexto
* inspecionar arquivos de configuração, variáveis de ambiente, schemas
* mapear a arquitetura relevante para o problema
* listar hipóteses iniciais com base no que foi lido

O que não fazer:

* executar qualquer comando
* modificar qualquer arquivo
* corrigir nada encontrado no caminho
* refatorar oportunisticamente

Ao final da etapa 1a, o agente deve entregar:

1. **Mapa do sistema relevante** — quais arquivos e componentes estão envolvidos e qual o papel de cada um
2. **Hipóteses iniciais** — lista ordenada do mais ao menos provável, com justificativa baseada na leitura
3. **Plano de diagnóstico ativo** — quais comandos precisam ser executados para confirmar ou descartar cada hipótese

O agente deve parar aqui e aguardar autorização para a etapa 1b.

---

### 1b — Diagnóstico ativo

Só iniciar após autorização explícita do usuário.

Nesta etapa, o agente executa os comandos definidos no plano da etapa 1a para confirmar a causa raiz.

Regras:

* executar apenas os comandos planejados
* registrar cada comando executado e sua saída completa
* não desviar do plano sem reportar primeiro
* se surgir evidência que invalida todas as hipóteses, parar e propor novo plano antes de continuar

O relatório final da Fase 1 deve conter obrigatoriamente:

1. **Causa raiz em uma frase**
   Exemplo: "A API falha no boot porque `DATABASE_URL` não está definida no ambiente de produção."

2. **Evidência**
   Traceback, log, saída de comando, resposta HTTP, diferença entre ambientes — qualquer coisa que prove a causa de forma objetiva. Sem evidência, a causa não está confirmada.

3. **Hipóteses descartadas**
   O que foi testado e não era a causa. Uma hipótese só pode ser descartada com evidência — não por intuição.

4. **Arquivos envolvidos**
   Lista dos arquivos relevantes com o papel de cada um no problema.

5. **Categoria da falha**

   | Categoria | Sub-protocolo de validação |
   |---|---|
   | `boot` | processo sobe sem crash, healthcheck responde |
   | `configuração` | variável presente e com valor correto |
   | `banco` | conexão responde, schema correto, query real funciona |
   | `migration / schema` | migration aplicada, tabela e colunas existem |
   | `autenticação` | login retorna token, token acessa rota protegida |
   | `CORS` | preflight retorna headers corretos, request real passa |
   | `frontend` | build passa, tela carrega, console sem erro |
   | `contrato API / frontend` | request retorna shape esperado, UI renderiza dado |
   | `build` | comando de build finaliza sem erro, artefato gerado |
   | `ambiente / deploy` | variáveis presentes, start command executa, healthcheck público ok |
   | `UI / estado / componente` | fluxo manual testado, estado correto, sem regressão visual |

6. **Pronto para correção**
   Responder obrigatoriamente `sim` ou `não`.
   * `sim` → a causa está comprovada por evidência, pode avançar para a Fase 2
   * `não` → ainda falta evidência; o agente deve propor o próximo passo de investigação e aguardar

---

## Fase 2 — Correção

Só iniciar após:

* Fase 1 concluída com `pronto para correção: sim`
* Autorização explícita do usuário

Nesta fase, corrigir apenas o que foi comprovado na Fase 1.

Regras:

* não corrigir problemas que não foram diagnosticados
* não fazer refatoração oportunista
* não alterar arquitetura sem necessidade direta
* cada alteração deve ter justificativa clara ligada à causa raiz diagnosticada
* não mascarar erro com fallback silencioso
* erros críticos devem falhar com mensagem legível

### O que qualifica como "novo problema"

Um novo problema que aciona a parada obrigatória é qualquer situação que:

* impede a validação binária da Fase 3
* está fora do escopo diagnosticado na Fase 1
* introduz risco de regressão em área não relacionada

Não qualificam como novo problema:

* warnings esperados do ambiente (lint, deprecation notices)
* ajuste de tipagem menor diretamente relacionado à correção em curso
* renomeação óbvia de variável que estava errada por causa do bug diagnosticado

O relatório da Fase 2 deve conter:

1. O que foi alterado
2. Por que foi alterado (ligado diretamente à causa raiz)
3. Arquivos modificados
4. Risco da alteração
5. Como reverter, se necessário

---

## Fase 3 — Validação Binária

A tarefa só termina quando houver validação objetiva. Não aceitar "parece funcionar", "deve resolver", "o código está correto" ou "provavelmente era isso".

O sub-protocolo de validação é determinado pela **categoria** registrada na Fase 1.

### Sub-protocolos por categoria

**boot / ambiente / deploy:**
* start command executa sem crash
* healthcheck público responde `status: ok`
* logs não mostram exceção no boot
* variáveis obrigatórias presentes e corretas

**banco / migration / schema:**
* `SELECT 1` funciona
* migration aplicada (`\dt` ou equivalente confirma tabela)
* coluna existe (`\d tabela` ou equivalente)
* query real retorna dado esperado
* ambiente limpo consegue subir até o schema atual

**autenticação:**
* login retorna token válido
* token acessa rota protegida e retorna 200
* token expirado / inválido retorna 401 (não 200, não 500)

**CORS:**
* preflight (`OPTIONS`) retorna `Access-Control-Allow-Origin` correto
* request real com credenciais passa sem erro no console do browser

**frontend / UI / estado / componente:**
* `npm run build` (ou equivalente) passa sem erro
* tela específica carrega sem erro de console
* fluxo manual testado do início ao fim
* request retorna status esperado

**contrato API / frontend:**
* endpoint retorna o shape esperado pelo frontend
* frontend renderiza o dado sem erro
* nenhum campo obrigatório ausente ou com tipo errado

**build:**
* comando de build finaliza com código 0
* artefato gerado está no path esperado
* nenhum import quebrado no artefato final

---

### Resultado da Fase 3

**Se o critério for atendido:**

```
VALIDAÇÃO FINAL:
- Comando / teste executado:
- Resultado observado:
- Critério binário atendido: sim
- Tarefa concluída.
```

**Se o critério não for atendido:**

```
VALIDAÇÃO FINAL:
- Comando / teste executado:
- Resultado observado:
- Critério binário atendido: não
- Divergência entre esperado e obtido: [descrever]
- Ação: retorno à Fase 2 com escopo restrito ao critério que falhou.
  Não reabre diagnóstico completo — apenas corrige o que impediu a validação.
```

O retorno à Fase 2 após falha na Fase 3 é automático e não requer nova autorização. O escopo é restrito ao critério que falhou.

---

## Regra de parada obrigatória

Se durante qualquer fase surgir um problema que qualifique como "novo problema" (ver definição na Fase 2), o agente deve parar imediatamente e reportar.

```
NOVO PROBLEMA ENCONTRADO

Problema:
Evidência:
Impacto no fluxo atual:
Qualifica como novo problema porque: [impede validação / fora do escopo / risco de regressão]
Recomendação:

Continuar exige nova autorização.
```

O agente não pode corrigir o novo problema silenciosamente, mesmo que pareça óbvio ou trivial.

---

## Comportamento em ambiguidade

Se o problema descrito pelo usuário for vago ou puder ter múltiplas interpretações, o agente deve, antes da Fase 1:

1. Listar as interpretações possíveis
2. Indicar qual parece mais provável e por quê
3. Perguntar ao usuário qual está correta

Não começar o diagnóstico com base em suposição.

---

## Contexto de ambiente

Antes de iniciar a Fase 1, se o ambiente não estiver claro no contexto, perguntar:

* `local` ou `produção` (ou ambos)?
* sistema operacional / runtime relevante?
* qual o último estado funcional conhecido?

Diagnóstico sem contexto de ambiente produz hipóteses erradas.

---

## Frase de ativação recomendada

> "Ative o Modo Diagnóstico Estrito para este problema."

O agente deve seguir este protocolo até o fim, em ordem, sem pular fases.

---

## Prompt reutilizável

```
Ative o Modo Diagnóstico Estrito.

O problema é:
[descreva o problema com o máximo de contexto disponível]

Ambiente:
- local / produção / ambos:
- sistema / runtime relevante:
- último estado funcional conhecido:

Regras:
1. Comece pela Fase 1a (leitura passiva). Não execute nenhum comando ainda.
2. Ao final da 1a, entregue: mapa do sistema, hipóteses iniciais e plano de diagnóstico ativo.
3. Aguarde minha autorização para iniciar a Fase 1b.
4. A Fase 1 termina com: causa raiz em uma frase, evidência, hipóteses descartadas, arquivos envolvidos, categoria da falha, pronto para correção: sim/não.
5. Só depois da minha autorização, inicie a Fase 2.
6. Na Fase 2, altere apenas o que foi provado. Se encontrar novo problema (que impeça a validação ou esteja fora do escopo), pare e relate antes de continuar.
7. A tarefa termina com validação binária conforme o sub-protocolo da categoria diagnosticada.
8. Se a validação falhar, retorne à Fase 2 com escopo restrito — sem reabrir diagnóstico completo.
```
