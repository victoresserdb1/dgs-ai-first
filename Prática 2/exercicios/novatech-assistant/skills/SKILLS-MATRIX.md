# Skills Matrix — NovaTech Assistant
## Arquivo: `skills/SKILLS-MATRIX.md`

> Mapeamento completo de quem cria e quem consome cada skill no projeto.
> Criação **não** está concentrada apenas em desenvolvedores — PS e QA têm responsabilidade ativa.

---

## Visão Geral por Nível

| Nível | Skills | Responsáveis de Criação |
|---|---|---|
| Foundation | `typescript-conventions`, `error-handling`, `project-structure` | Dev Sênior (2), Tech Lead (1) |
| Domain | `azure-functions-endpoint`, `azure-ai-search-integration`, `react-components`, `testing-patterns` | Dev Sênior (2), Dev Pleno (1), **QA (1)** |
| Artifact | `create-rag-endpoint`, `create-integration-test`, `create-react-card`, `create-sdd-spec`, `create-adr` | Dev Sênior (1), Dev Pleno (1), **QA (1)**, **Product Specialist (1)**, Tech Lead (1) |

---

## Matriz Completa

| Skill | Nível | Cria | Consome | Frequência |
|---|---|---|---|---|
| `typescript-conventions.md` | Foundation | **Dev Sênior** | Dev Pleno, Dev Sênior, Copilot, Claude | Toda geração de código `.ts` |
| `error-handling.md` | Foundation | **Dev Sênior** | Dev Pleno, Dev Sênior, Copilot | Toda função com chamadas externas |
| `project-structure.md` | Foundation | **Tech Lead** | Dev Pleno, Dev Sênior, Copilot | Criação de novos módulos |
| `azure-functions-endpoint.md` | Domain | **Dev Sênior** | Dev Pleno, Copilot | Por novo endpoint HTTP |
| `azure-ai-search-integration.md` | Domain | **Dev Sênior** | Dev Pleno, Copilot | Por módulo que use o índice |
| `react-components.md` | Domain | **Dev Pleno** | Dev Pleno, Copilot | Por novo componente React |
| `testing-patterns.md` | Domain | **QA** | Dev Pleno, Dev Sênior, Copilot | Por módulo com testes |
| `create-rag-endpoint.md` | Artifact | **Dev Sênior** | Dev Pleno, Copilot | Por endpoint RAG novo |
| `create-integration-test.md` | Artifact | **QA** | Dev Pleno, Dev Sênior, Copilot | Por endpoint a testar |
| `create-react-card.md` | Artifact | **Dev Pleno** | Dev Pleno, Copilot | Por card de UI |
| `create-sdd-spec.md` | Artifact | **Product Specialist** | Tech Lead, Claude | Por novo módulo especificado |
| `create-adr.md` | Artifact | **Tech Lead** | Dev Sênior, Claude, **Delivery Manager** | Por nova decisão arquitetural |

---

## Distribuição de Criação por Papel

| Papel | Skills que cria | Observação |
|---|---|---|
| **Tech Lead** | `project-structure.md`, `create-adr.md` | Define estrutura e rastreabilidade arquitetural |
| **Dev Sênior** | `typescript-conventions.md`, `error-handling.md`, `azure-functions-endpoint.md`, `azure-ai-search-integration.md`, `create-rag-endpoint.md` | Padrões técnicos de produção |
| **Dev Pleno** | `react-components.md`, `create-react-card.md` | Padrões de UI/frontend |
| **QA** | `testing-patterns.md`, `create-integration-test.md` | Padrões e receitas de qualidade |
| **Product Specialist** | `create-sdd-spec.md` | Template de especificação de produto |
| **Delivery Manager** | (nenhuma) | Consome `create-adr.md` para rastreabilidade de decisões |

---

## Rastreabilidade: Delivery Manager

O Delivery Manager **consome** a skill `create-adr.md` para leitura e rastreabilidade. Toda decisão arquitetural documentada em `docs/adr/` deve ser compreensível para o DM — a seção "Consequências" dos ADRs é escrita pensando nessa audiência.

---

## Herança de Skills

```
Foundation
├── typescript-conventions ─────────────────────────────────────┐
│                                                                │
├── error-handling ──────────────────────────────────────────┐  │
│                                                             │  │
└── project-structure ─────────────────────────┐             │  │
                                               │             │  │
Domain                                         │             │  │
├── azure-functions-endpoint ←──────────────────────────── (↑)(↑)
├── azure-ai-search-integration ←───────────────────────── (↑)(↑)
├── react-components ←────────────────────────────────────── (↑)
└── testing-patterns ←─────────────────────────────────────── (↑)
                                               │
Artifact                                       │
├── create-rag-endpoint ← (azure-functions + azure-ai-search + typescript)
├── create-integration-test ← (testing-patterns + typescript)
├── create-react-card ← (react-components)
├── create-sdd-spec ← (project-structure ↑)
└── create-adr ← (project-structure ↑)
```
