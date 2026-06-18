# Árvore de Skills — NovaTech Assistant
## Entregável das TAREFA-16, TAREFA-17 e TAREFA-18

> **Metodologia:** Hierarquia definida com Claude (chat), analisando os artefatos produzidos repetidamente no projeto (endpoints, testes, componentes React, ADRs, specs SDD) e mapeando pela hierarquia Foundation → Domain → Artifact do Anexo C.

---

## Foundation — Convenções Globais (3 skills obrigatórias)

Toda skill Domain e Artifact herda as regras Foundation. São as menos frequentes de criar, mas as mais importantes — um erro aqui propaga para todos os outros artefatos.

| Skill | Arquivo | Frase-Ativação | Criada por | Consumida por | Frequência |
|---|---|---|---|---|---|
| TypeScript Conventions | `foundation/typescript-conventions.md` | "Gere código TypeScript seguindo as convenções do projeto NovaTech" | **Dev Sênior** | Dev Pleno + Dev Sênior + Copilot + Claude | Toda geração de código `.ts` |
| Error Handling | `foundation/error-handling.md` | "Adicione tratamento de erro padronizado a este módulo" | **Dev Sênior** | Dev Pleno + Dev Sênior + Copilot | Toda função com chamadas externas |
| Project Structure | `foundation/project-structure.md` | "Crie um novo módulo seguindo a estrutura do repositório NovaTech" | **Tech Lead** | Dev Pleno + Dev Sênior + Copilot | Criação de novos módulos |

**Regra de herança:** Skills Domain e Artifact devem iniciar com `> Herda de: [lista de foundation skills]`. O agente deve carregar as foundation skills relevantes antes de executar qualquer artifact skill.

---

## Domain — Padrões por Camada Técnica (4 skills)

Skills Domain encapsulam como cada camada é implementada. São mais específicas que Foundation — uma skill Domain pode ser ativada sem que a artifact correspondente exista ainda.

| Skill | Arquivo | Frase-Ativação | Criada por | Consumida por | Frequência |
|---|---|---|---|---|---|
| Azure Functions Endpoint | `domain/azure-functions-endpoint.md` | "Crie um Azure Function HTTP trigger seguindo os padrões do projeto" | **Dev Sênior** | Dev Pleno + Copilot | Por novo endpoint |
| Azure AI Search Integration | `domain/azure-ai-search-integration.md` | "Implemente busca vetorial usando Azure AI Search neste serviço" | **Dev Sênior** | Dev Pleno + Copilot | Por módulo que use o índice |
| React Components | `domain/react-components.md` | "Crie um componente React seguindo os padrões do painel web" | **Dev Pleno** | Dev Pleno + Copilot | Por novo componente UI |
| Testing Patterns | `domain/testing-patterns.md` | "Escreva testes para este módulo seguindo os padrões do projeto" | **QA** | Dev Pleno + Dev Sênior + Copilot | Por módulo com testes |

**Observação crítica sobre `testing-patterns.md`:** Esta skill é criada pelo **QA**, não por dev. Isso garante que os padrões de teste não reflitam apenas conveniência do desenvolvedor, mas os critérios de qualidade definidos pelo QA. Dev Pleno e Dev Sênior *consomem* — não criam.

**Herança declarada:**
- `azure-functions-endpoint.md` herda: `typescript-conventions.md` + `error-handling.md`
- `azure-ai-search-integration.md` herda: `typescript-conventions.md` + `error-handling.md`
- `react-components.md` herda: `typescript-conventions.md`
- `testing-patterns.md` herda: `typescript-conventions.md`

---

## Artifact — Receitas de Geração Específicas (5 skills)

Skills Artifact são as mais concretas: encapsulam como gerar um artefato completo do zero. São ativadas com uma única instrução e produzem múltiplos arquivos.

| Skill | Arquivo | Frase-Ativação | Criada por | Consumida por | Frequência |
|---|---|---|---|---|---|
| Create RAG Endpoint | `artifact/create-rag-endpoint.md` | "Crie um endpoint RAG completo: embedding + busca + completion + resposta com fonte" | **Dev Sênior** | Dev Pleno + Copilot | Por endpoint RAG novo |
| Create Integration Test | `artifact/create-integration-test.md` | "Crie testes de integração para este endpoint Azure Function usando msw" | **QA** | Dev Pleno + Dev Sênior + Copilot | Por endpoint a testar |
| Create React Card | `artifact/create-react-card.md` | "Crie um Adaptive Card React para exibir resposta do assistente no painel web" | **Dev Pleno** | Dev Pleno + Copilot | Por card de UI |
| Create SDD Spec | `artifact/create-sdd-spec.md` | "Converta este requirements.md em um plan.md seguindo o padrão SDD do projeto" | **Product Specialist** | Tech Lead + Claude | Por novo módulo especificado |
| Create ADR | `artifact/create-adr.md` | "Documente esta decisão arquitetural seguindo o template ADR do projeto" | **Tech Lead** | Dev Sênior + Claude + Delivery Manager | Por nova decisão arquitetural |

**Observação crítica sobre `create-sdd-spec.md`:** Criada pelo **Product Specialist** — não por dev. O PS define a spec de produto; o dev implementa. Concentrar a criação desta skill no PS garante que o template SDD reflita a perspectiva de produto, não apenas viabilidade técnica.

**Herança declarada:**
- `create-rag-endpoint.md` usa: `azure-functions-endpoint.md` + `azure-ai-search-integration.md` + `typescript-conventions.md`
- `create-integration-test.md` usa: `testing-patterns.md` + `typescript-conventions.md`
- `create-react-card.md` usa: `react-components.md`
- `create-sdd-spec.md` usa: (sem herança técnica — domínio de produto)
- `create-adr.md` usa: `project-structure.md`

---

## Critérios de Aceitação por Skill

| Critério | Foundation | Domain | Artifact |
|---|---|---|---|
| Frase-ativação que o agente reconheceria | ✅ obrigatório | ✅ obrigatório | ✅ obrigatório |
| Responsável de criação por papel específico | ✅ mapeado | ✅ mapeado | ✅ mapeado |
| Consumidores listados por papel + ferramenta | ✅ mapeado | ✅ mapeado | ✅ mapeado |
| Herança de skills superiores declarada | — | ✅ obrigatório | ✅ obrigatório |
| Frequência de uso estimada | ✅ sim | ✅ sim | ✅ sim |
| Criação não concentrada apenas em devs | PS cria `create-sdd-spec.md`, QA cria `testing-patterns.md` + `create-integration-test.md` | ✅ |
