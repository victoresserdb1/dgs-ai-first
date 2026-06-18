# Histórico de Conversa — Mapeamento de MCP Servers (NovaTech Assistant)

**Data:** 2026-06-18  
**Projeto:** `db1/novatech-assistant`  
**Exercício:** Cenário-Âncora 2 — Fase de Estruturação, Exercício 2.1

---

## Interação 1 — Mapeamento de MCP Servers

**Prompt:**
> Mapeie quais MCP servers o projeto precisa. Para cada server, defina: o que expõe (tools, resources, prompts), quem consome (quais papéis/ferramentas), e se já existe como server público ou precisaria ser construído.

**Resposta:**

### Server 1: GitHub

**O que expõe:**
- **Tools:** criar/editar arquivos no repositório, abrir PRs, comentar em issues, listar commits, criar branches
- **Resources:** conteúdo de arquivos (specs, skills, código, ADRs), histórico de commits, estado de PRs
- **Prompts:** —

**Quem consome:** todos os papéis via Claude; Devs e Tech Lead via Copilot

**Existe publicamente?** ✅ Sim — `@modelcontextprotocol/server-github` (oficial Anthropic)

**Permissões mínimas:** `repo` scope restrito a `db1/novatech-assistant`; sem acesso a outros repos da org

---

### Server 2: Filesystem (repositório local)

**O que expõe:**
- **Tools:** leitura/escrita de arquivos locais
- **Resources:** arquivos do workspace — `/specs/`, `/skills/`, `/prompts/`, `/src/`, `/docs/`
- **Prompts:** —

**Quem consome:** Devs e Tech Lead via Copilot/Claude Code

**Existe publicamente?** ✅ Sim — `@modelcontextprotocol/server-filesystem` (oficial Anthropic)

**Permissões mínimas:** paths explicitamente listados (`./src`, `./specs`, `./skills`, `./prompts`, `./docs`); excluir `./infra` e `./.github` do escopo do agente

---

### Server 3: Azure AI Search

**O que expõe:**
- **Tools:** buscar chunks por similaridade semântica (`search`), listar documentos indexados, obter metadados de documento
- **Resources:** índice vetorial dos 847 documentos da NovaTech
- **Prompts:** template de query de busca

**Quem consome:** Devs (testes de retrieval, debug do pipeline), QA (validação de chunks recuperados), Tech Lead (review de arquitetura)

**Existe publicamente?** ⚠️ Parcialmente — existe `@azure/mcp` mas a integração com AI Search específica do projeto precisaria de configuração customizada ou wrapper sobre o SDK `@azure/search-documents`

**Permissões mínimas:** role `Search Index Data Reader` em produção; `Search Index Data Contributor` apenas em dev/staging

---

### Server 4: Azure OpenAI

**O que expõe:**
- **Tools:** `generate_completion` (GPT-4o), `generate_embedding` (text-embedding-3-large)
- **Resources:** lista de deployments disponíveis
- **Prompts:** templates para testar variações do system prompt

**Quem consome:** Devs (debug de geração, testes de prompt), QA (rodadas de eval com `golden-queries.json`), Tech Lead (avaliação de context budget)

**Existe publicamente?** ⚠️ Parcial — o `@azure/mcp` cobre recursos Azure genéricos; para chamadas diretas aos deployments seria necessário wrapper customizado ou `@openai/mcp` apontado para endpoint Azure

**Permissões mínimas:** role `Cognitive Services OpenAI User` — sem acesso a configurar deployments

---

### Server 5: Azure DevOps

**O que expõe:**
- **Tools:** criar/listar/atualizar work items (tasks, bugs, user stories), associar commits a work items
- **Resources:** backlog atual, sprint em curso, histórico de tasks por módulo
- **Prompts:** template para criar task a partir de spec

**Quem consome:** Delivery Manager (acompanhamento de progresso), Tech Lead (associar PRs a tasks), Product Specialist (rastrear specs em desenvolvimento)

**Existe publicamente?** ❌ Não existe server MCP oficial confiável da Microsoft para DevOps. Recomendado construir um server leve sobre a REST API do Azure DevOps

**Permissões mínimas:** PAT com `Work Items (Read & Write)` e `Code (Read)`; sem `Build`, `Release` ou permissões administrativas

---

### Server 6: Confluence (NovaTech) — read-only

**O que expõe:**
- **Tools:** buscar páginas por texto, obter conteúdo de página por ID
- **Resources:** espaços de documentação da NovaTech (políticas, processos, SLAs)
- **Prompts:** —

**Quem consome:** Devs (consulta de requisitos de negócio durante implementação), QA (verificação de cobertura de testes contra documentação oficial), Product Specialist (escrita de specs alinhada ao domínio)

**Existe publicamente?** ✅ Sim — Atlassian Remote MCP Server (lançado em 2025). Usar modo estritamente read-only.

**Permissões mínimas:** API token com `read:confluence-content.all` e `read:confluence-space.summary`; sem `write` de nenhum tipo

---

### Resumo executivo

| Server | Existe publicamente? | Esforço |
|--------|---------------------|---------|
| GitHub | ✅ Oficial | Zero — só configurar |
| Filesystem | ✅ Oficial | Zero — só listar paths |
| Azure AI Search | ⚠️ Parcial (`@azure/mcp`) | Baixo — configurar índice existente |
| Azure OpenAI | ⚠️ Parcial | Baixo — apontar endpoint Azure |
| Azure DevOps | ❌ Não oficial confiável | Médio — construir wrapper REST (~1 dia) |
| Confluence | ✅ Atlassian/community | Baixo — configurar token + read-only |

---

## Interação 2 — Permissões Mínimas (Least Privilege)

**Prompt:**
> Para cada MCP server, defina as permissões mínimas necessárias (princípio de least privilege).

**Resposta:**

### Server 1: GitHub

| Contexto | Permissão | Justificativa |
|----------|-----------|---------------|
| Leitura de código/specs/skills | `contents: read` | Agente consulta arquivos para contexto |
| Criação de arquivos via agente | `contents: write` | Apenas no repositório `db1/novatech-assistant` |
| PRs e issues | `pull_requests: write` | Abrir PR é o fluxo de entrega — nunca merge direto |
| CI/CD workflows | **nenhuma** | Agente não deve tocar em `.github/workflows/` |
| Configurações da org/repo | **nenhuma** | Branch protection, webhooks, secrets — fora do escopo |

**Restrição adicional crítica:** usar **Fine-Grained PAT** com escopo restrito a `db1/novatech-assistant`. Um PAT clássico com `repo` scope daria acesso a todos os repos da DB1 — inaceitável.

---

### Server 2: Filesystem

| Path permitido | Acesso | Justificativa |
|---------------|--------|---------------|
| `./src/` | read/write | Dev implementa código |
| `./specs/` | read/write | Dev gera e edita tasks.md |
| `./skills/` | read/write | Dev cria skills |
| `./prompts/` | read/write | Dev evolui system prompt |
| `./docs/` | read/write | Dev escreve ADRs |
| `./tests/` | read/write | Dev escreve testes |
| `./infra/` | **read-only** | Agente consulta, mas Bicep não é gerado por agente |
| `./.github/` | **nenhum** | Pipelines de CI/CD são exclusivos do Tech Lead |
| `./.mcp/` | **nenhum** | Agente não edita sua própria configuração |
| `.env`, `*.secret` | **nenhum** | Credenciais não ficam em disco |

---

### Server 3: Azure AI Search

| Role Azure | Atribuído a | Negado a |
|-----------|-------------|----------|
| `Search Index Data Reader` | Agentes em produção e staging | — |
| `Search Index Data Contributor` | Agentes em dev (pipeline de ingestão) | Ambientes staging/prod |
| `Search Service Contributor` | **nenhum agente** | Gestão de índices é IaC (Bicep) |
| `Owner` / `Contributor` | **nenhum agente** | Nunca |

**Segmentação por ambiente:** MCP server deve ser configurado com endpoints distintos por ambiente. Agente do dev local **nunca** aponta para o índice de produção.

---

### Server 4: Azure OpenAI

| Role Azure | Atribuído a | Negado a |
|-----------|-------------|----------|
| `Cognitive Services OpenAI User` | Todos os agentes | — |
| `Cognitive Services OpenAI Contributor` | **nenhum agente** | Gerenciar deployments é IaC |
| `Cognitive Services Contributor` | **nenhum agente** | Criar/excluir recursos Azure |

**Restrição adicional:** endpoint configurado deve ser o do Azure (`https://<recurso>.openai.azure.com/`) — nunca `api.openai.com`. Garante que dados trafegam dentro do ambiente gerenciado da NovaTech.

**Cotas:** configurar `max_tokens` e rate limits por deployment para evitar consumo acidental em loops de agente.

---

### Server 5: Azure DevOps

| Escopo do PAT | Acesso | Justificativa |
|--------------|--------|---------------|
| `Work Items` | Read & Write | Criar tasks, atualizar status |
| `Code` | Read | Associar commits a work items |
| `Build` | **nenhum** | Agente não dispara pipelines |
| `Release` | **nenhum** | Deploy é gate humano |
| `Project and Team` | **nenhum** | Gestão de membros fora do escopo |
| `Graph` (usuários/grupos) | **nenhum** | Agente não gerencia permissões |

**PAT com expiração:** validade de 90 dias com rotação obrigatória. Sem PATs sem expiração para agentes.

---

### Server 6: Confluence (NovaTech)

| Permissão Atlassian | Acesso | Justificativa |
|--------------------|--------|---------------|
| `read:confluence-content.all` | ✅ | Buscar e ler páginas |
| `read:confluence-space.summary` | ✅ | Listar espaços disponíveis |
| `write:confluence-content` | ❌ **nunca** | Read-only absoluto |
| `manage:confluence-*` | ❌ **nunca** | Fora de escopo |

**Restrição de espaço:** token criado por usuário com acesso **somente ao espaço do projeto** no Confluence da NovaTech.

**Nota de compliance:** validar com o contrato da NovaTech se há cláusula sobre envio de documentação interna a modelos de terceiros. Documentar no ADR correspondente.

---

### Princípios transversais aplicados

- **Separação por ambiente:** cada ambiente (dev/staging/prod) tem seu próprio conjunto de credenciais. Credencial de dev jamais funciona em prod.
- **Sem credenciais hardcoded:** todas as credenciais são injetadas via variáveis de ambiente (`${GITHUB_TOKEN}`, `${AZURE_SEARCH_KEY}`) — nunca em `.mcp/mcp.json` commitado.
- **Identidades separadas por papel:** o agente do Dev não usa o mesmo token do agente do Delivery Manager. Permite revogar acesso por papel sem afetar os outros.
- **Auditoria:** todos os MCP servers que acessam dados do cliente (Azure AI Search, Confluence) devem ter logging de chamadas ativado — quem perguntou o quê e quando.
