# Especificações Técnicas — Exercício 2: Fase de Estruturação do Trabalho

**Projeto:** NovaTech Assistant  
**Papel:** Desenvolvedor  
**Fase:** Estruturação do Trabalho  
**Sub-exercícios cobertos:** 2.1 (MCP Servers), 2.2 (SDD Query Endpoint), 2.3 (Skills)  
**Budget de contexto:** ~12K tokens (≈4K system prompt + ≈8K chunks + pergunta + histórico 3 turnos)  
**Stack:** TypeScript strict, Azure Functions v4, Azure AI Search, Azure OpenAI, React, Bicep  
**Repositório:** `db1/novatech-assistant`

---

## Índice

1. [ES-01 — Arquitetura de MCP Servers (Ex. 2.1)](#es-01)
2. [ES-02 — Query Endpoint via Spec Driven Development (Ex. 2.2)](#es-02)
3. [ES-03 — Hierarquia de Skills do Projeto (Ex. 2.3)](#es-03)
4. [Conflitos Documentais Identificados](#conflitos)
5. [Decisões Arquiteturais de Referência](#decisoes)
6. [Restrições Técnicas Globais](#restricoes)

---

## ES-01 — Arquitetura de MCP Servers (Exercício 2.1)

### Contexto

O time usa Claude e GitHub Copilot como agentes de IA. Para que operem com autonomia sobre o projeto, precisam de acesso a recursos externos via MCP (Model Context Protocol). O MCP padroniza essa conexão expondo três primitivas: **Tools** (ações que o agente pode executar), **Resources** (dados read-only que o agente pode consultar) e **Prompts** (templates reutilizáveis).

O arquivo de configuração reside em `.mcp/mcp.json`, seguindo a estrutura definida no Anexo C. O exemplo mínimo do Anexo C (GitHub + filesystem) é o ponto de partida — o projeto precisa de 5 servers no total.

---

### MCP-01: GitHub (`db1/novatech-assistant`)

| Atributo | Valor |
|----------|-------|
| Servidor público | `@modelcontextprotocol/server-github` |
| Tipo de transporte | stdio |
| Consumidores | Dev Pleno + Dev Sênior (Copilot, Claude); Tech Lead (Claude) |
| Precisa ser construído? | Não — servidor público disponível |

**Tools expostas:**
- `get_file_contents` — ler código, specs e artefatos do repositório
- `create_or_update_file` — criar/modificar arquivos em branches de trabalho
- `create_pull_request` — abrir PRs para revisão de código
- `search_code` — localizar padrões e convenções já implementados
- `list_commits` — rastrear histórico de mudanças

**Resources:**
- Repositório `db1/novatech-assistant` com conteúdo de arquivos (read)

**Permissões mínimas (least privilege):**
- Scope `repo:read` — leitura de código, issues e metadados
- Scope `repo:write` — commit/push restrito a branches de feature (não `main`, não `release/*`)
- Sem `org:*` — nenhum acesso a configurações de organização
- Token com validade máxima de 90 dias, rotação automática via CI

---

### MCP-02: Azure AI Search

| Atributo | Valor |
|----------|-------|
| Servidor público | Não existe consolidado — custom ou `@azure/mcp` (preview) |
| Tipo de transporte | stdio |
| Consumidores | Dev (ao gerar testes com fixtures reais); Claude (ao simular pipeline RAG) |
| Precisa ser construído? | Sim (wrapper leve sobre SDK Azure) |

**Tools expostas:**
- `search_documents` — busca vetorial por similaridade com parâmetros `query`, `top`, `filter`
- `get_document` — recuperar documento específico por ID
- `list_indexes` — listar índices disponíveis (apenas nome e contagem de documentos)

**Resources (read-only):**
- Índice `novatech-docs-v1` com documentação NovaTech

**Permissões mínimas:**
- API Key com role `Search Index Data Reader` apenas (sem `Contributor`, sem `Owner`)
- Acesso restrito ao índice `novatech-docs-v1` (não a outros índices do recurso)
- Sem permissão de indexação ou gerenciamento de schema

**Nota de otimização de contexto (budget ~12K):**
O server deve suportar o parâmetro `top=5` como padrão. Cada chunk é ~1.500 tokens; 5 chunks = ~7.500 tokens, dentro do budget de ~8K para chunks (ADR-0002). Nunca configurar `top > 8` sem revisão de budget.

---

### MCP-03: Azure OpenAI

| Atributo | Valor |
|----------|-------|
| Servidor público | `@azure/mcp` (preview) ou custom |
| Tipo de transporte | stdio |
| Consumidores | Dev (gerar embeddings em testes); Claude (simular completions em avaliação de prompt) |
| Precisa ser construído? | Parcialmente — wrapper sobre SDK Azure OpenAI |

**Tools expostas:**
- `create_embedding` — gerar vetor float[] a partir de texto (deployment `text-embedding-ada-002`)
- `create_completion` — enviar prompt e receber resposta (deployment `gpt-4o`)

**Permissões mínimas:**
- API Key com acesso apenas aos deployments `text-embedding-ada-002` e `gpt-4o`
- Sem permissão de fine-tuning, gerenciamento de modelos ou configurações do recurso Azure
- Sem acesso ao Azure OpenAI Studio ou APIs de management

---

### MCP-04: Azure DevOps

| Atributo | Valor |
|----------|-------|
| Servidor público | `@microsoft/azure-devops-mcp` ou custom |
| Tipo de transporte | stdio |
| Consumidores | Dev (atualizar status de tasks); Delivery Manager (Claude Cowork) |
| Precisa ser construído? | Depende da maturidade do server público |

**Tools expostas:**
- `get_work_item` — ler detalhes de task/US (ID, estado, responsável, comentários)
- `update_work_item` — atualizar estado e adicionar comentários
- `list_work_items` — listar tasks do sprint atual filtradas por assignee

**Resources:**
- Board do projeto `NovaTech Assistant` (leitura)

**Permissões mínimas:**
- PAT com scope `Work Items (read, write)` restrito ao projeto `novatech-assistant`
- Sem acesso a pipelines (`Build`), releases, repositórios ou configurações de organização
- PAT com validade de 30 dias, renovado manualmente

---

### MCP-05: Confluence NovaTech

| Atributo | Valor |
|----------|-------|
| Servidor público | `@atlassian/mcp-confluence` ou custom |
| Tipo de transporte | stdio ou HTTP |
| Consumidores | Dev (consultar docs de negócio); Product Specialist (Claude Design) |
| Precisa ser construído? | Depende da disponibilidade do server Atlassian oficial |

**Tools expostas:**
- `search_pages` — busca full-text no espaço `NOVATECH`
- `get_page` — ler conteúdo completo de uma página específica por ID

**Resources (read-only):**
- Espaço `NOVATECH` no Confluence da NovaTech

**Permissões mínimas:**
- Token com scope `read:confluence-content.all` apenas
- **Sem qualquer escrita** (`write:*` explicitamente negado) — documentação de negócio não pode ser modificada por agentes
- Sem acesso a espaços administrativos ou configurações de instância

---

### Arquivo `.mcp/mcp.json`

Segue o formato do Anexo C. O arquivo de configuração expande o exemplo mínimo com os 5 servers mapeados:

```json
{
  "mcpServers": {
    "github": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      }
    },
    "filesystem": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "./src", "./specs", "./skills"]
    },
    "azure-ai-search": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@azure/mcp-azure-ai-search"],
      "env": {
        "AZURE_SEARCH_ENDPOINT": "${AZURE_SEARCH_ENDPOINT}",
        "AZURE_SEARCH_API_KEY": "${AZURE_SEARCH_API_KEY}",
        "AZURE_SEARCH_INDEX": "novatech-docs-v1"
      }
    },
    "azure-devops": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@microsoft/azure-devops-mcp"],
      "env": {
        "AZURE_DEVOPS_ORG": "${AZURE_DEVOPS_ORG}",
        "AZURE_DEVOPS_PAT": "${AZURE_DEVOPS_PAT}",
        "AZURE_DEVOPS_PROJECT": "novatech-assistant"
      }
    },
    "confluence": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@atlassian/mcp-confluence"],
      "env": {
        "CONFLUENCE_URL": "${CONFLUENCE_URL}",
        "CONFLUENCE_TOKEN": "${CONFLUENCE_TOKEN}",
        "CONFLUENCE_SPACE": "NOVATECH"
      }
    }
  }
}
```

**Critérios de aceitação do arquivo:**
- Parseável por `JSON.parse()` sem erros
- Todos os secrets referenciados via `${VAR}` — nenhum valor hardcoded
- Path do arquivo: `.mcp/mcp.json` (conforme Anexo C)
- Cada server usa apenas as permissões documentadas nas seções acima

---

### Riscos de Segurança MCP (ES-01-SEC)

**RISCO-01: Vazamento de dados NovaTech via modelo cloud externo**

- **Cenário:** O MCP server do Confluence expõe documentação de negócio da NovaTech (políticas com dados de SLA de clientes, procedimentos com valores contratuais). Se um agente local (ex: Claude Desktop rodando na máquina do dev) busca uma página via MCP e inclui esse conteúdo no contexto enviado a um modelo cloud sem contrato de confidencialidade adequado, dados sensíveis de clientes podem vazar para servidores externos.
- **Mitigação técnica:**
  1. Documentar no `AGENTS.md`: MCP do Confluence é para uso exclusivo em sessões locais; conteúdo retornado não deve ser incluído em prompts enviados a modelos fora do ambiente Azure da NovaTech.
  2. Configurar o server Confluence para retornar metadados (título, ID, URL) por padrão; conteúdo completo apenas sob ferramenta explícita `get_page` (não em `search_pages`).
  3. Adicionar label `[CONFIDENTIAL]` nos logs do MCP server para páginas com dados de SLA.

**RISCO-02: Exposição de tokens em logs e outputs de agente**

- **Cenário:** As variáveis `${GITHUB_TOKEN}`, `${AZURE_SEARCH_API_KEY}` e `${AZURE_DEVOPS_PAT}` podem ser logadas por dependências MCP ao descrever erros de autenticação, ou o próprio agente pode incluir o valor do token ao descrever a configuração do server para o usuário.
- **Mitigação técnica:**
  1. Adicionar `.env` e `*.local` ao `.gitignore` antes de criar qualquer arquivo de credencial.
  2. Configurar regra no CI (GitHub Actions) para detectar padrões de token (`[A-Za-z0-9+/]{40,}`) em diffs de commits — bloquear merge se detectado.
  3. Em produção e staging: usar Azure Key Vault para injeção de secrets via Managed Identity (não variáveis de ambiente em arquivo).
  4. No `AGENTS.md`: instruir agentes a nunca exibir ou logar valores de variáveis de ambiente.

---

## ES-02 — Query Endpoint via Spec Driven Development (Exercício 2.2)

### Contexto

O `plan.md` do query endpoint está definido (fornecido como input do exercício). Esta spec detalha como converter esse plan em tasks atômicas e implementar a primeira task. O query endpoint é a peça central do assistente NovaTech: recebe perguntas de atendentes, busca os chunks mais relevantes no Azure AI Search, monta o prompt com o budget correto e retorna a resposta do GPT-4o com rastreabilidade de fontes.

Esta spec incorpora decisões do Cenário 1: o protótipo open-source (ChromaDB + sentence-transformers) validou a abordagem RAG e identificou problemas de chunking em tabelas (ADR-0004). O código aqui é de produção — Azure, padrões de projeto, sem atalhos.

---

### Fluxo de Dados

```
POST /api/query
  │
  ├─ [1] Validação de input ──────────── src/functions/query/validator.ts
  │       Zod: question, conversationId?, history?
  │       Retorna 400 em falha (mensagem legível, sem stack trace)
  │
  ├─ [2] Geração de embedding ────────── src/services/completion.ts
  │       Azure OpenAI ada-002
  │       Trunca input em 8.192 tokens antes de enviar
  │       Retry: 3 tentativas, backoff exponencial (1s → 2s → 4s)
  │
  ├─ [3] Busca vetorial ──────────────── src/services/search.ts
  │       Azure AI Search, top=5 chunks
  │       Metadado: vigencia_inicio, document_type, version
  │       Filtro de conflito: PROC-042 v1 descartada se v2 disponível
  │       Retry: 3 tentativas, backoff exponencial
  │
  ├─ [4] Montagem de prompt ──────────── src/services/prompt-builder.ts
  │       System prompt: lido de /prompts/system-prompt.md (~4K tokens)
  │       Chunks: top-5 ordenados por score, máx ~8K tokens total
  │       Overflow: descarta chunk de menor score (nunca o system prompt)
  │       Histórico: máx 3 turnos (~600 tokens)
  │       Pergunta atual: ~200 tokens
  │       Total estimado: ~12.300 tokens
  │
  ├─ [5] Completion ──────────────────── src/services/completion.ts
  │       Azure OpenAI GPT-4o (128K ctx)
  │       Retry: 3 tentativas, backoff (1s → 2s → 4s)
  │       Sem retry em 4xx (exceto 429 rate limit)
  │
  └─ [6] Construção da resposta ──────── src/functions/query/response-builder.ts
          { answer, sources[], conversationId, tokenUsage }
          Resposta HTTP 200 com QueryOutputSchema válido
          Log estruturado: conversationId, sourceCount, tokenUsage, latência
```

---

### Schemas Zod (boundary de validação)

**Input — `src/functions/query/validator.ts`:**

```typescript
const QueryInputSchema = z.object({
  question: z.string().min(1, 'Pergunta não pode estar vazia').max(2000),
  conversationId: z.string().uuid().optional(),
  history: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string().max(1000)
    })
  ).max(3).optional()
});

type QueryInput = z.infer<typeof QueryInputSchema>;
```

**Documento fonte — `src/shared/types.ts`:**

```typescript
const SourceDocumentSchema = z.object({
  documentId: z.string(),
  title: z.string(),
  chunk: z.string(),
  score: z.number().min(0).max(1),
  version: z.string().optional(),       // ex: "2.0", "3.1"
  documentType: z.enum(['normative', 'procedure', 'faq', 'sla']),
  isObsolete: z.boolean()               // true quando há versão mais recente indexada
});
```

**Output — `src/functions/query/validator.ts`:**

```typescript
const QueryOutputSchema = z.object({
  answer: z.string(),
  sources: z.array(SourceDocumentSchema).min(1).max(5),
  conversationId: z.string().uuid(),
  tokenUsage: z.object({
    promptTokens: z.number().int().positive(),
    completionTokens: z.number().int().positive()
  })
});

type QueryOutput = z.infer<typeof QueryOutputSchema>;
```

---

### Gestão do Context Budget (ADR-0002)

| Componente | Tokens reservados | Fonte |
|------------|-------------------|-------|
| System prompt | ~4.000 | `/prompts/system-prompt.md` |
| Chunks (máx 5 × ~1.500) | ~7.500 | Azure AI Search top-5 |
| Histórico (3 turnos × ~200) | ~600 | `history` no input |
| Pergunta atual | ~200 | `question` no input |
| **Total** | **~12.300** | — |

**Regra de overflow do `prompt-builder.ts`:**
1. Calcular tokens de cada chunk via `tiktoken` (encoding `cl100k_base`)
2. Ordenar chunks por score descendente
3. Acumular chunks até atingir ~8.000 tokens
4. Descartar chunks excedentes (os de menor score)
5. Nunca sacrificar o system prompt para dar espaço a chunks
6. Log de warning quando budget atingido: `{ event: 'budget_overflow', chunksDropped: N }`

---

### Tratamento de Documentos Contraditórios (ADR-0003)

O pipeline indexa todos os documentos com metadados `vigencia_inicio` e `document_type`. O `search.ts` aplica a lógica de deduplicação antes de retornar chunks para o prompt builder:

1. Agrupar chunks por `documentId` base (ex: `PROC-042`)
2. Se existirem versões múltiplas: retornar apenas a com maior `version` para chamados pós-vigência
3. Marcar chunks de versões antigas com `isObsolete: true` — nunca incluí-los no contexto enviado ao LLM
4. O system prompt inclui instrução: *"Quando houver duas versões do mesmo documento, use sempre a mais recente. Cite a versão do documento em sua resposta."*
5. Tratamento específico para PROC-042: ver [CONF-01](#conf-01) na seção de Conflitos

---

### Caminhos de Arquivos (Anexo C)

| Responsabilidade | Path no repositório |
|-----------------|---------------------|
| HTTP trigger (handler) | `src/functions/query/handler.ts` |
| Validação Zod (input/output) | `src/functions/query/validator.ts` |
| Montagem da resposta | `src/functions/query/response-builder.ts` |
| Busca vetorial (Azure AI Search) | `src/services/search.ts` |
| Embeddings + Completion (Azure OpenAI) | `src/services/completion.ts` |
| Montagem do prompt com budget | `src/services/prompt-builder.ts` |
| Tipos TypeScript do domínio | `src/shared/types.ts` |
| Configuração de ambiente | `src/shared/config.ts` |
| Logger (pino) | `src/shared/logger.ts` |
| Custom errors | `src/shared/errors.ts` |
| Testes unitários | `tests/unit/functions/query/` |
| Testes de integração | `tests/integration/query/` |
| Fixtures (chunks, queries) | `tests/fixtures/chunks.ts` |

---

### Critérios de Aceitação do Endpoint

- `POST /api/query` com `{ "question": "" }` → HTTP 400 com mensagem de erro legível (não stack trace)
- `POST /api/query` com `question` válida → HTTP 200 com `QueryOutputSchema` válido
- `sources` nunca vazio (mínimo 1 chunk citado)
- Chunks com `isObsolete: true` não aparecem em `sources` (são filtrados pelo `search.ts`)
- Log estruturado (pino) a cada chamada: `conversationId`, `tokenUsage`, `duration`, `sourceCount`
- Retry funciona: 2 falhas consecutivas no Azure seguidas de sucesso → request completa com sucesso
- Erros internos não expostos: HTTP 500 retorna `{ error: "internal_error", requestId: "..." }`
- Resposta em P95 < 10 segundos

---

### Revisão Crítica do Código Gerado pelo Copilot

O Copilot tem padrões de geração previsíveis que precisam de revisão antes de um code review real. Problemas esperados e como corrigir:

| Problema típico | Por que é real | Correção |
|-----------------|---------------|----------|
| `as any` em resposta do SDK Azure | Copilot não sabe os tipos exatos do `@azure/search-documents` v12+ | Usar tipos do SDK: `SearchResult<NovaTechDocument>` |
| `console.log` para debugging | Hábito de projetos simples — Copilot não sabe que o projeto usa pino | Substituir por `logger.info({ ... }, 'description')` |
| Ausência de retry | Copilot não adiciona retry por padrão em chamadas externas | Implementar `withRetry()` utilitário com backoff |
| `conversationId` sem validação de UUID | Copilot frequentemente aceita qualquer string | Zod: `z.string().uuid()` com fallback para `crypto.randomUUID()` |
| Error handling genérico (`catch (e)`) | Copilot usa `catch (e: any)` — perde tipagem do erro | Usar `catch (error: unknown)` + type guard |

---

## ES-03 — Hierarquia de Skills do Projeto (Exercício 2.3)

### Contexto

Skills são arquivos `.md` que encapsulam como gerar tipos específicos de outputs. A hierarquia do projeto NovaTech segue o Anexo C:

- `skills/foundation/` — convenções globais que todas as skills superiores herdam
- `skills/domain/` — padrões por camada técnica (endpoints, testes, componentes React)
- `skills/artifact/` — receitas de geração específicas ("como criar um endpoint RAG completo do zero")

A skill Foundation mais crítica é `typescript-conventions.md` — sem ela, o Copilot gera código inconsistente em todos os módulos.

---

### Árvore de Skills

#### Foundation (3 skills obrigatórias)

| Skill | Arquivo | Frase-ativação | Cria | Consome | Frequência |
|-------|---------|----------------|------|---------|-----------|
| TypeScript Conventions | `foundation/typescript-conventions.md` | "Gere código TypeScript seguindo as convenções do projeto NovaTech" | Dev Sênior | Dev Pleno + Dev Sênior + Copilot + Claude | Toda geração de código |
| Error Handling | `foundation/error-handling.md` | "Adicione tratamento de erro padronizado a este módulo" | Dev Sênior | Dev Pleno + Dev Sênior + Copilot | Toda função com chamadas externas |
| Project Structure | `foundation/project-structure.md` | "Crie um novo módulo seguindo a estrutura do repositório NovaTech" | Tech Lead | Dev Pleno + Dev Sênior + Copilot | Criação de novos módulos |

#### Domain (4 skills por camada técnica)

| Skill | Arquivo | Frase-ativação | Cria | Consome | Frequência |
|-------|---------|----------------|------|---------|-----------|
| Azure Functions Endpoint | `domain/azure-functions-endpoint.md` | "Crie um Azure Function HTTP trigger seguindo os padrões do projeto" | Dev Sênior | Dev Pleno + Copilot | Por novo endpoint |
| Azure AI Search Integration | `domain/azure-ai-search-integration.md` | "Implemente busca vetorial usando Azure AI Search neste serviço" | Dev Sênior | Dev Pleno + Copilot | Por módulo que use o índice |
| React Components | `domain/react-components.md` | "Crie um componente React seguindo os padrões do painel web" | Dev Pleno | Dev Pleno + Copilot | Por novo componente |
| Testing Patterns | `domain/testing-patterns.md` | "Escreva testes para este módulo seguindo os padrões do projeto" | **QA** | Dev Pleno + Dev Sênior + Copilot | Por módulo com testes |

#### Artifact (5 skills de receitas de geração)

| Skill | Arquivo | Frase-ativação | Cria | Consome | Frequência |
|-------|---------|----------------|------|---------|-----------|
| Create RAG Endpoint | `artifact/create-rag-endpoint.md` | "Crie um endpoint RAG completo: embedding + busca + completion + resposta com fonte" | Dev Sênior | Dev Pleno + Copilot | Por endpoint RAG novo |
| Create Integration Test | `artifact/create-integration-test.md` | "Crie testes de integração para este endpoint Azure Function usando msw" | **QA** | Dev Pleno + Dev Sênior + Copilot | Por endpoint a testar |
| Create React Card | `artifact/create-react-card.md` | "Crie um Adaptive Card React para exibir resposta do assistente no painel web" | Dev Pleno | Dev Pleno + Copilot | Por card de UI |
| Create SDD Spec | `artifact/create-sdd-spec.md` | "Converta este requirements.md em um plan.md seguindo o padrão SDD do projeto" | **Product Specialist** | Tech Lead + Claude | Por novo módulo especificado |
| Create ADR | `artifact/create-adr.md` | "Documente esta decisão arquitetural seguindo o template ADR do projeto" | **Tech Lead** | Dev Sênior + Claude | Por nova decisão arquitetural |

---

### Matriz de Criação/Consumo por Papel

| Papel | Skills que cria | Skills que consome |
|-------|----------------|-------------------|
| Tech Lead | `project-structure.md`, `create-adr.md` | Todas as Foundation |
| Dev Sênior | `typescript-conventions.md`, `error-handling.md`, `azure-functions-endpoint.md`, `azure-ai-search-integration.md`, `create-rag-endpoint.md` | Foundation + Domain relevantes + Artifact RAG |
| Dev Pleno | `react-components.md`, `create-react-card.md` | Foundation + Domain + Artifact (consumidor principal) |
| QA | `testing-patterns.md`, `create-integration-test.md` | Foundation + `testing-patterns.md` |
| Product Specialist | `create-sdd-spec.md` | Nenhuma skill técnica (domínio de produto) |
| Delivery Manager | (nenhuma skill técnica) | `create-adr.md` (para leitura e rastreabilidade) |

**Nota:** Product Specialist e QA criam skills — isso garante que padrões de spec e teste não fiquem concentrados apenas em devs.

---

### Conteúdo da Foundation Skill Mais Crítica: `typescript-conventions.md`

Esta skill é a base de todas as outras. Sem ela, o Copilot gera código inconsistente com o projeto. O arquivo deve ter a seguinte estrutura:

```markdown
# TypeScript Conventions — NovaTech Assistant

## Contexto
Convenções TypeScript obrigatórias para `db1/novatech-assistant`.
Aplica-se a todo código em `src/`. Toda skill de Domain e Artifact herda estas regras.
tsconfig.json tem `strict: true` — isso não é negociável.

## Regras Prescritivas

### 1. Tipagem
- NUNCA use `as any` — use type guards ou `as unknown as T` com justificativa
- Prefira tipos explícitos em parâmetros de função (evite inferência em assinaturas públicas)
- Use `z.infer<typeof Schema>` para derivar tipos de schemas Zod (não duplique tipos)
- Custom errors estendem `NovaTechError` de `@/shared/errors`

### 2. Imports
- Imports nomeados sobre default exports em módulos de serviço
- Ordem: módulos Node built-in → terceiros → internos com `@/`
- Path alias `@/` configurado para `src/` no tsconfig

### 3. Async/Await
- Sempre `async/await` — nunca `.then()/.catch()` encadeado
- `try/catch` obrigatório em funções que chamam APIs externas
- `catch (error: unknown)` com type guard — nunca `catch (e: any)`

### 4. Logging
- Use `logger` de `@/shared/logger` (pino) — NUNCA `console.log` ou `console.error`
- Log de entrada: parâmetros relevantes SEM dados sensíveis (não logar `question` completa em produção)
- Log de saída: duração em ms, resultado (sucesso/erro), IDs de rastreio

## Exemplos

### DO ✓
\`\`\`typescript
import { logger } from '@/shared/logger';
import { type QueryInput } from './validator';

export async function processQuery(input: QueryInput): Promise<QueryOutput> {
  const start = Date.now();
  logger.info({ conversationId: input.conversationId }, 'processQuery.start');

  try {
    const result = await searchDocuments(input.question);
    logger.info({ duration: Date.now() - start, sourceCount: result.sources.length }, 'processQuery.end');
    return result;
  } catch (error: unknown) {
    logger.error({ error, conversationId: input.conversationId }, 'processQuery.error');
    throw new AzureSearchError('Falha na busca de documentos', { cause: error });
  }
}
\`\`\`

### DON'T ✗
\`\`\`typescript
// ❌ console.log em vez de logger estruturado
console.log('processando query', input);

// ❌ as any para contornar tipagem do SDK Azure
const result = await azureClient.search(query) as any;

// ❌ .then() encadeado sem tratamento de erro
azureClient.search(query)
  .then(res => buildResponse(res))
  .then(res => sendResponse(res));

// ❌ catch genérico sem type narrowing
try { ... } catch (e: any) { console.error(e.message); }
\`\`\`

## Anti-Padrões (o que o Copilot gera sem esta skill)

1. **`require()` dinâmico:** Copilot gera `const mod = require(path)` em vez de import estático TypeScript — quebra tree-shaking e tipagem.
2. **`console.log` para debugging:** Copilot insere `console.log('response:', data)` — deve ser `logger.info({ data }, 'description')`.
3. **`as any` em respostas do SDK Azure:** SDK responses têm tipos complexos; Copilot usa `as any` para evitar erros de tipo.
4. **Callbacks em SDK Azure:** Versões antigas do SDK usavam callbacks — Copilot às vezes os gera mesmo para SDK v12+.
5. **Ausência de retry:** Copilot não adiciona retry em chamadas Azure por padrão — obrigatório no projeto.
6. **`catch (e: any)`:** Copilot não usa `error: unknown` com type guard — perde a segurança de tipo do TypeScript strict.
```

**Critérios de aceitação da skill Foundation:**
- Arquivo em `skills/foundation/typescript-conventions.md`
- Seções obrigatórias: Contexto, Regras Prescritivas, Exemplos DO/DON'T com código TypeScript real, Anti-Padrões
- Ao menos 5 anti-padrões específicos (não abstrações genéricas)
- Exemplos de código usam as bibliotecas reais do projeto (pino, Zod, `@/` aliases)
- Gerado com evidência do Copilot (sessão documentada no entregável)

---

## Conflitos Documentais Identificados

### CONF-01: PROC-042 v1 vs PROC-042-v2 (Frete Especial) {#conf-01}

Este é o conflito mais crítico para o assistente. Ambos os documentos coexistem no SharePoint da NovaTech sem hierarquia formal. Se o pipeline retornar chunks de ambas as versões, o assistente pode misturar multiplicadores antigos e novos na mesma resposta — gerando cálculos errados.

| Atributo | PROC-042 v1 (mar/2023) | PROC-042-v2 (nov/2023) |
|----------|------------------------|------------------------|
| Fator peso 1.001–3.000kg | **1.2** | **1.15** |
| Fator peso acima de 3.000kg | **1.5** | **1.4** |
| Multiplicador Sul | **1.2** | **1.3** |
| Multiplicador Sudeste | **1.0** | **1.1** |
| Multiplicador Centro-Oeste | **1.3** | **1.4** |
| Multiplicador Nordeste | **1.4** | **1.5** |
| Multiplicador Norte | **1.6** | **1.8** |
| Prazo adicional frete especial | **+2 dias úteis** | **+3 dias úteis** |
| Status formal | Sem indicação de obsolescência | Sem indicação de que substitui v1 |

**Interpretação adotada:** Aplicar v2 para chamados abertos a partir de 01/12/2023 (conforme disposição transitória no Chunk PROC-042v2-E). Chamados abertos antes dessa data, ainda em processamento, usam v1.

**Impacto no pipeline:**
1. Indexar ambos os documentos com metadado `vigencia_inicio: "2023-12-01"` na v2 e `vigencia_fim: "2023-11-30"` na v1
2. O `search.ts` filtra por data do chamado: se `chamado.dataAbertura >= "2023-12-01"` → retornar apenas chunks da v2
3. Se data não informada: usar v2 e incluir aviso na resposta: *"Usando os multiplicadores atualizados (v2, nov/2023). Se o chamado foi aberto antes de dezembro de 2023, os valores podem diferir."*
4. Nunca retornar chunks de v1 e v2 simultaneamente no mesmo contexto do LLM

**Pendência com Compliance:** O FAQ-08 menciona que contratos antigos podem ainda usar a tabela v1. Isso não está formalizado na PROC-042-v2. Documentar como lacuna no ADR-0003 e solicitar clarificação ao Compliance da NovaTech.

---

### CONF-02: FAQ-03 vs POL-001-B (Devolução de Carga Perigosa)

| Fonte | Hierarquia | Conteúdo |
|-------|-----------|----------|
| POL-001-B | Normativo (obrigatório) | Cargas perigosas classes 1-6 da ANTT **NÃO** são elegíveis para devolução pelo processo padrão |
| FAQ-03 | Informal (suporte) | "Já tiveram casos em que o pessoal de Riscos autorizou exceção. Não diga que é impossível — diga que precisa de tratamento especial." |

**Problema:** O FAQ-03 cria a impressão de que há uma brecha na política. O assistente não pode tratar o FAQ como fonte de mesmo peso que a política normativa.

**Interpretação adotada:** O FAQ tem caráter de suporte informal à equipe de atendimento e não substitui documentos normativos. O system prompt deve instruir: *"Documentos normativos (POL-*, PROC-*, SLA-*) têm precedência sobre FAQs. Quando FAQ contradisser normativo, siga o normativo. FAQs são contexto de suporte operacional, não fonte de regras."*

**Impacto no pipeline:** Adicionar metadado `document_type` no índice: `"normative"` para POL-001, `"faq"` para FAQ-Atendimento. O `prompt-builder.ts` deve ordenar os chunks no contexto colocando `normative` antes de `faq` quando ambos cobrirem o mesmo tema.

---

### CONF-03: FAQ-08 — Instrução Informal sobre Dupla Vigência do PROC-042

**Problema:** O FAQ-08 instrui atendentes a "usar a v2 na dúvida, mas que o contrato antigo pode estar na tabela v1". Essa é uma regra de negócio crítica não formalizada em nenhum documento normativo.

**Interpretação adotada:** O assistente deve perguntar a data de abertura do chamado quando o tema for frete especial. A disposição transitória do Chunk PROC-042v2-E (01/12/2023) é a única referência formal e deve ser usada. Documentar o risco de contratos com tabela negociada individualmente no ADR-0003.

---

## Decisões Arquiteturais de Referência

| ADR | Decisão tomada | Impacto nos exercícios desta fase |
|-----|---------------|-----------------------------------|
| ADR-0001 | Azure OpenAI (GPT-4o) — integração com ecossistema Microsoft | MCP-03 usa Azure OpenAI, não OpenAI.com; MCP-02 é Azure AI Search |
| ADR-0002 | Context budget: ~4K system + ~8K chunks + pergunta + 3 turnos | ES-02 aplica esse budget rigorosamente no `prompt-builder.ts` |
| ADR-0003 | Metadado de vigência no pipeline; prompt instrui priorizar versão recente; obsoletos marcados, não excluídos | CONF-01 e CONF-02 dependem deste ADR para resolução; chunks `isObsolete: true` existem no índice |
| ADR-0004 | Azure AI Search substitui ChromaDB do protótipo; problema de chunking em tabelas identificado | MCP-02 é Azure AI Search; tabelas do SLA-2024 e PROC-042 exigem chunking especial (não quebrar no meio de uma tabela) |

---

## Restrições Técnicas Globais

| Restrição | Detalhe |
|-----------|---------|
| TypeScript `strict: true` | Sem exceções — qualquer `as any` precisa de justificativa em comentário |
| Validação com Zod em todas as boundaries | Input HTTP, output de serviços externos (Azure SDK), dados lidos do índice |
| Logging com pino | Estruturado, sem `console.*`; campos: `level`, `msg`, `timestamp`, correlationId |
| Azure Functions v4 | Breaking change na API de handlers em relação à v3 — usar `app.http()` não `@azure/functions` decorators da v3 |
| Retry com exponential backoff | Obrigatório em todas as chamadas Azure (AI Search, OpenAI); máx 3 tentativas; sem retry em 4xx (exceto 429) |
| Secrets via variáveis de ambiente | Nunca hardcoded; `.env` no `.gitignore`; Azure Key Vault em staging/produção |
| Context budget respeitado | Nunca exceder ~12K tokens; `tiktoken` para cálculo; log de warning em overflow |
| Chunks de tabelas sem quebra mid-row | ADR-0004: chunker deve detectar markdown tables e não quebrar no meio de uma linha |
| System prompt versionado | Lido de `/prompts/system-prompt.md`; mudanças registradas em `/prompts/prompt-changelog.md` |
