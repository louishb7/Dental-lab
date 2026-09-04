# Cadisk — Governança de Agentes

Este arquivo define as regras de trabalho para agentes que inspecionem ou alterem este repositório.

Instruções explícitas do usuário têm precedência. Fora disso, estas regras devem ser respeitadas.

## Bootstrap obrigatório

Antes de inspecionar, alterar arquivos ou executar comandos:

1. Leia este `AGENTS.md` por completo.
2. Verifique `git status --short`.
3. Entenda o escopo solicitado antes de propor alterações.

Não substitua a leitura deste arquivo por memória de sessões anteriores.

## Estado do projeto

Cadisk é uma aplicação full stack para gerenciamento e rastreamento de trabalhos odontológicos de laboratórios de prótese.

Stack vigente:

* Frontend: React + Vite.
* Backend: TypeScript + NestJS.
* ORM: Prisma.
* Banco: PostgreSQL.
* Contrato entre frontend e backend: HTTP + JSON.

Estrutura principal:

* `frontend/`: SPA React.
* `backend-nest/`: API NestJS e persistência.

A migração arquitetural para essa stack está encerrada.

Não reintroduza implementações históricas, backends paralelos ou tecnologias antigas sem pedido explícito do usuário.

## Nomenclatura

O nome do produto é **Cadisk**.

Use `Cadisk` em documentação, interface e descrições técnicas novas.

Diferencie:

* **Cadisk**: produto;
* **cadista**: profissional/público-alvo.

Não faça varreduras globais apenas para corrigir nomenclatura sem relação com a tarefa.

## Arquitetura e responsabilidades

O frontend e o backend são aplicações independentes.

Regras:

* O frontend consome a API via HTTP + JSON.
* O frontend não acessa diretamente banco de dados ou internals do backend.
* O backend não renderiza o frontend.
* Regras de negócio, persistência, autenticação, autorização e ownership pertencem ao backend.
* Chamadas HTTP do frontend devem permanecer centralizadas em `frontend/src/services/api.js`.
* `PrismaService` deve continuar centralizando o acesso Prisma.
* Alterações estruturais de banco exigem Prisma migration.

Não mude arquitetura, contratos ou responsabilidades entre camadas sem necessidade concreta.

## Multiusuário e ownership

Cadisk é multiusuário.

Regras obrigatórias:

* Endpoints de domínio devem exigir autenticação.
* O usuário autenticado deve ser obtido pelo JWT.
* Não aceitar `user_id` fornecido pelo cliente como fonte de autorização.
* Doutores, casos, itens e demais recursos pertencentes a usuários devem respeitar ownership.
* Consultas e mutações devem impedir acesso cruzado entre usuários.
* Um recurso pertencente a outro usuário deve se comportar como recurso inexistente.
* Novos recursos de domínio devem possuir proprietário quando aplicável.
* Mudanças em regras de ownership devem possuir testes de isolamento adequados.

Não enfraqueça essas garantias para simplificar implementação.

## Dados e regras de domínio

Preserve as invariantes existentes do domínio.

Para valores financeiros:

* PostgreSQL deve preservar precisão decimal adequada.
* Prisma deve usar `Decimal` onde aplicável.
* Evite `number` para cálculos monetários críticos quando isso introduzir perda de precisão.

Não altere regras de cálculo, estados de casos, histórico, entrega ou integridade sem necessidade explícita da tarefa.

## Controle de escopo

Resolva a tarefa com a menor mudança segura possível.

Não faça automaticamente:

* refatorações não relacionadas;
* renomeações globais;
* reorganização de diretórios;
* troca de bibliotecas;
* alteração de arquitetura;
* alteração de modelo de dados;
* redesign;
* criação de features adicionais;
* abstrações preventivas;
* limpeza puramente estética fora do escopo.

Se algo funciona, é coerente e não prejudica segurança, manutenção, apresentação ou entendimento, deixe como está.

Melhorias encontradas fora do escopo devem ser relatadas como recomendação, não implementadas.

## Qualidade

Ao alterar código:

* prefira padrões já usados no repositório;
* mantenha código simples e legível;
* não introduza dependências sem necessidade concreta;
* preserve contratos existentes salvo mudança explicitamente solicitada;
* atualize testes quando comportamento ou regra de negócio mudar;
* não crie funcionalidades apenas visuais sem suporte real do domínio/API;
* não silencie erros críticos com fallbacks que escondam a causa.

## Validação

Execute apenas validações compatíveis com o escopo da alteração.

Frontend:

```bash
cd frontend
npm run build
```

Backend:

```bash
cd backend-nest
npm run lint
npm run build
npm run test
```

Quando a mudança atingir persistência, integração entre módulos, autenticação, ownership ou contrato HTTP, considere também:

```bash
npm run test:integration
npm run test:e2e
```

Não execute testes que dependam de banco sem antes confirmar que o ambiente de teste está configurado corretamente.

Sempre que possível, execute também:

```bash
git diff --check
git status --short
```

Não declare uma validação como bem-sucedida se ela não foi executada.

## Segurança e arquivos sensíveis

Nunca versione:

* `.env`;
* credenciais;
* tokens;
* secrets;
* URLs privadas contendo credenciais;
* dumps contendo dados sensíveis.

Use `.env.example` apenas com valores seguros de exemplo.

Mudanças em autenticação, autorização, ownership, dados sensíveis ou migrations destrutivas exigem atenção adicional e não devem ser tratadas como refatoração rotineira.

## Commits

Após qualquer tarefa que altere arquivos:

* sugira uma mensagem curta de commit em inglês;
* prefira Conventional Commits;
* a mensagem deve refletir apenas o escopo efetivamente concluído;
* não execute `git commit` automaticamente, salvo pedido explícito do usuário.

## Modo Diagnóstico Estrito

Ative somente quando o usuário pedir explicitamente diagnóstico em fases ou quando solicitar que nenhuma correção seja feita antes da causa ser comprovada.

Nesse modo:

1. Primeiro inspecione e reúna evidências sem alterar arquivos.
2. Apresente as hipóteses e como confirmá-las.
3. Não corrija até haver evidência suficiente da causa raiz.
4. Corrija apenas o problema comprovado.
5. Valide o resultado objetivamente.
6. Se surgir um problema independente e fora do escopo, reporte-o antes de corrigi-lo.

Não use esse protocolo para tarefas normais de implementação ou manutenção.

## Modo Aula

Ative somente quando solicitado explicitamente.

Ao ativar, explique:

1. contexto e problema;
2. como a causa ou solução foi identificada;
3. solução passo a passo;
4. conceitos técnicos envolvidos;
5. principais aprendizados reutilizáveis.

Fora desse modo, mantenha as respostas técnicas diretas e proporcionais à tarefa.

## Encerramento da tarefa

Ao finalizar:

* informe o que foi alterado;
* informe quais validações foram realmente executadas e seus resultados;
* destaque riscos ou pendências reais, se houver;
* não invente trabalho adicional apenas para ampliar o escopo;
* se arquivos foram alterados, sugira a mensagem de commit.

Nunca execute o commit automaticamente sem autorização explícita.
