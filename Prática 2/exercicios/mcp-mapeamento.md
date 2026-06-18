# Mapeamento de MCP Servers — NovaTech Assistant
## Entregável das TAREFA-01 e TAREFA-02

> **Metodologia:** Levantamento realizado com Claude (chat) analisando as ferramentas e serviços listados no enunciado do Exercício 2.1, cruzado com as primitivas MCP (Tools, Resources, Prompts) e o exemplo mínimo do Anexo C.

---

## Resumo Consolidado dos 5 Servers

| # | Server | Pacote | Construir? | Consumidores |
|---|--------|--------|-----------|--------------|
| 1 | GitHub | `@modelcontextprotocol/server-github` | **Não** (público) | Dev Pleno, Dev Sênior, Tech Lead |
| 2 | Azure AI Search | Custom (wrapper SDK) | **Sim** | Dev Pleno, Dev Sênior |
| 3 | Azure OpenAI | `@azure/mcp` (preview) ou custom | **Parcialmente** | Dev Pleno, Dev Sênior |
| 4 | Azure DevOps | `@microsoft/azure-devops-mcp` | **Avaliar** maturidade | Dev (todos), Delivery Manager |
| 5 | Confluence NovaTech | `@atlassian/mcp-confluence` | **Avaliar** disponibilidade | Dev (todos), Product Specialist |

---

## MCP-01: GitHub (`db1/novatech-assistant`)

### Visão Geral
| Atributo | Valor |
|---|---|
| Servidor público | `@modelcontextprotocol/server-github` |
| Tipo de transporte | `stdio` |
| Precisa ser construído? | **Não** — servidor público estável no npm |

### Consumidores por Papel e Ferramenta
| Papel | Ferramenta | Operações Típicas |
|---|---|---|
| Dev Pleno | GitHub Copilot | Leitura de código, criação de arquivos em branches de feature |
| Dev Sênior | GitHub Copilot, Claude | Revisão de PRs, busca de padrões implementados, rastreamento de histórico |
| Tech Lead | Claude | Revisão arquitetural, rastreabilidade de commits |

### Tools Expostas
- `get_file_contents` — ler código, specs e artefatos do repositório
- `create_or_update_file` — criar/modificar arquivos em branches de trabalho
- `create_pull_request` — abrir PRs para revisão de código
- `search_code` — localizar padrões e convenções já implementados
- `list_commits` — rastrear histórico de mudanças

### Resources
- Repositório `db1/novatech-assistant` com conteúdo de arquivos (somente leitura)

### Permissões Mínimas — Least Privilege (TAREFA-02)
| Permissão | Justificativa | O que NÃO conceder |
|---|---|---|
| `repo:read` | Necessário para leitura de código, issues e metadados durante desenvolvimento | Sem `org:*` — nenhum acesso a configurações de organização |
| `repo:write` restrito a `feature/*` e `fix/*` | Necessário para commit/push em branches de feature; fluxo de trabalho exige criar arquivos via MCP | **Sem escrita em `main` ou `release/*`** — proteção obrigatória de branch |

> **Validade:** Token com expiração máxima de 90 dias; rotação automática via CI pipeline (`.github/workflows/ci.yml`).

---

## MCP-02: Azure AI Search

### Visão Geral
| Atributo | Valor |
|---|---|
| Servidor público | Não existe consolidado |
| Tipo de transporte | `stdio` |
| Precisa ser construído? | **Sim** — wrapper leve sobre `@azure/search-documents` v12+ |

> **Justificativa de construção:** Nenhum servidor MCP público para Azure AI Search atende aos requisitos de busca vetorial com filtros de metadados específicos do projeto. O wrapper deve ser um módulo Node.js mínimo (~200 LOC) expondo as 3 tools necessárias.

### Consumidores por Papel e Ferramenta
| Papel | Ferramenta | Operações Típicas |
|---|---|---|
| Dev Pleno | GitHub Copilot | Geração de testes com fixtures reais do índice |
| Dev Sênior | GitHub Copilot, Claude | Simulação do pipeline RAG completo; validação de relevância de chunks |

### Tools Expostas
- `search_documents` — busca vetorial por similaridade (parâmetros: `query: string`, `top: number = 5`, `filter?: string`)
- `get_document` — recuperar documento específico por `documentId`
- `list_indexes` — listar índices disponíveis (apenas nome e contagem de documentos)

### Resources
- Índice `novatech-docs-v1` com documentação NovaTech (somente leitura)

### Permissões Mínimas — Least Privilege (TAREFA-02)
| Permissão | Justificativa | O que NÃO conceder |
|---|---|---|
| Role `Search Index Data Reader` | Necessário para executar consultas de busca vetorial no índice | Sem `Search Index Data Contributor` — impede modificação de documentos |
| Acesso restrito ao índice `novatech-docs-v1` | Isola acesso do agente ao contexto do projeto | Sem acesso a outros índices do recurso Azure AI Search |

> **Parâmetro padrão de segurança:** `top=5` (5 chunks × ~1.500 tokens = ~7.500 tokens, dentro do budget de ~8K definido no ADR-0002). **Nunca configurar `top > 8` sem revisão de budget.**

---

## MCP-03: Azure OpenAI

### Visão Geral
| Atributo | Valor |
|---|---|
| Servidor público | `@azure/mcp` (preview) — estabilidade a avaliar |
| Tipo de transporte | `stdio` |
| Precisa ser construído? | **Parcialmente** — wrapper sobre `@azure/openai` se `@azure/mcp` for instável |

### Consumidores por Papel e Ferramenta
| Papel | Ferramenta | Operações Típicas |
|---|---|---|
| Dev Pleno | GitHub Copilot | Geração de embeddings para testes de retrieval |
| Dev Sênior | GitHub Copilot, Claude | Simulação de completions em sessões de avaliação de prompt |

### Tools Expostas
- `create_embedding` — gerar vetor `float[]` a partir de texto (deployment `text-embedding-ada-002`)
- `create_completion` — enviar mensagens e receber resposta (deployment `gpt-4o`)

### Resources
- Nenhum resource read-only; operações são request/response síncronos

### Permissões Mínimas — Least Privilege (TAREFA-02)
| Permissão | Justificativa | O que NÃO conceder |
|---|---|---|
| API Key com acesso ao deployment `text-embedding-ada-002` | Necessário para geração de vetores de busca | Sem acesso a outros deployments ou fine-tuning |
| API Key com acesso ao deployment `gpt-4o` | Necessário para geração de respostas do assistente | Sem acesso ao Azure OpenAI Studio, APIs de management ou criação de recursos |

---

## MCP-04: Azure DevOps

### Visão Geral
| Atributo | Valor |
|---|---|
| Servidor público | `@microsoft/azure-devops-mcp` (verificar maturidade) |
| Tipo de transporte | `stdio` |
| Precisa ser construído? | **Depende** da maturidade do server público — avaliar antes de construir custom |

### Consumidores por Papel e Ferramenta
| Papel | Ferramenta | Operações Típicas |
|---|---|---|
| Dev Pleno | GitHub Copilot | Atualizar status de task após implementar; ler detalhes da task ativa |
| Dev Sênior | GitHub Copilot | Atualizar tasks, consultar dependências do sprint |
| Delivery Manager | Claude Cowork | Acompanhar board, gerar relatórios de progresso |

### Tools Expostas
- `get_work_item` — ler detalhes de task/US (ID, estado, responsável, comentários)
- `update_work_item` — atualizar estado e adicionar comentários de progresso
- `list_work_items` — listar tasks do sprint atual filtradas por assignee

### Resources
- Board do projeto `NovaTech Assistant` (somente leitura)

### Permissões Mínimas — Least Privilege (TAREFA-02)
| Permissão | Justificativa | O que NÃO conceder |
|---|---|---|
| PAT scope `Work Items (read, write)` | Necessário para ler e atualizar tasks do sprint | Sem acesso a `Build`, releases, repositórios ou configurações de organização |
| Escopo restrito ao projeto `novatech-assistant` | Isola acesso ao projeto; sem exposição de outros projetos da organização DevOps | Sem escopo de organização (`org-level`) |

> **Validade:** PAT com validade de **30 dias**, renovado manualmente (duração curta compensa o risco de acesso a board com dados de planejamento).

---

## MCP-05: Confluence NovaTech

### Visão Geral
| Atributo | Valor |
|---|---|
| Servidor público | `@atlassian/mcp-confluence` (verificar disponibilidade) |
| Tipo de transporte | `stdio` ou `HTTP` |
| Precisa ser construído? | **Depende** da disponibilidade do server Atlassian oficial |

### Consumidores por Papel e Ferramenta
| Papel | Ferramenta | Operações Típicas |
|---|---|---|
| Dev Pleno | GitHub Copilot, Claude | Consultar políticas e procedimentos ao implementar validações de negócio |
| Dev Sênior | GitHub Copilot, Claude | Consultar documentação de domínio ao projetar APIs |
| Product Specialist | Claude Design | Consultar documentação existente ao criar specs de produto |

### Tools Expostas
- `search_pages` — busca full-text no espaço `NOVATECH`
- `get_page` — ler conteúdo completo de uma página específica por ID

### Resources
- Espaço `NOVATECH` no Confluence da NovaTech (**somente leitura**)

### Permissões Mínimas — Least Privilege (TAREFA-02)
| Permissão | Justificativa | O que NÃO conceder |
|---|---|---|
| `read:confluence-content.all` | Necessário para busca e leitura de páginas no espaço NOVATECH | **`write:*` explicitamente NEGADO** — documentação de negócio NÃO pode ser modificada por agentes |
| Acesso restrito ao espaço `NOVATECH` | Isola acesso à documentação do projeto | Sem acesso a espaços administrativos ou configurações de instância Confluence |

> **Nota crítica de segurança:** Este server deve ser usado EXCLUSIVAMENTE em sessões locais. Conteúdo retornado pelo Confluence **não deve ser incluído em prompts enviados a modelos fora do ambiente Azure da NovaTech** (ver `mcp-riscos-seguranca.md`, RISCO-01).

---

## Referência Cruzada: Primitivas por Server

| Server | Tools | Resources | Prompts |
|---|---|---|---|
| GitHub | 5 (get_file, create_file, create_pr, search_code, list_commits) | 1 (repositório db1/novatech-assistant) | — |
| Azure AI Search | 3 (search_documents, get_document, list_indexes) | 1 (índice novatech-docs-v1) | — |
| Azure OpenAI | 2 (create_embedding, create_completion) | — | — |
| Azure DevOps | 3 (get_work_item, update_work_item, list_work_items) | 1 (board NovaTech Assistant) | — |
| Confluence | 2 (search_pages, get_page) | 1 (espaço NOVATECH) | — |

> **Nota sobre Prompts MCP:** Nenhum dos 5 servers requer Prompts MCP nesta fase. Templates de prompt do assistente são gerenciados via `/prompts/system-prompt.md` no repositório (conforme Anexo C) — não como primitiva MCP.
