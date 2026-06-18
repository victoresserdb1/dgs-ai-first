# Tarefas Atômicas — Exercício 2: Fase de Estruturação do Trabalho

**Projeto:** NovaTech Assistant  
**Papel:** Desenvolvedor  
**Referência de specs:** `specs.md` (ES-01, ES-02, ES-03)  
**Legenda de estimativa:** P = Pequeno (≤ 4h) | M = Médio (~1 dia) | G = Grande (2-3 dias)  
**Legenda de status:** 🔴 Bloqueante | ⚠️ Alto risco | ✅ Independente

---

## Índice

- [Grupo 1 — Setup de MCP Servers (Ex. 2.1)](#grupo-1)
- [Grupo 2 — SDD: Query Endpoint (Ex. 2.2)](#grupo-2)
- [Grupo 3 — Estratégia de Skills (Ex. 2.3)](#grupo-3)
- [Checklist de Validação](#checklist)

---

## Grupo 1 — Setup de MCP Servers (ES-01) {#grupo-1}

### [TAREFA-01]: Mapear MCP servers necessários ao projeto 🔴

**Spec de referência:** ES-01 (seções MCP-01 a MCP-05)  
**Estimativa:** P  
**Dependências:** Nenhuma  
**Bloqueante para:** TAREFA-02, TAREFA-03, TAREFA-04  
**Ferramenta:** Claude (chat)

**Descrição:**  
Usando o Claude, mapear os 5 MCP servers que o projeto NovaTech Assistant precisa: GitHub, Azure AI Search, Azure OpenAI, Azure DevOps e Confluence. Para cada server, documentar as primitivas expostas, consumidores por papel e se existe servidor público disponível ou precisa ser construído.

**Critérios de aceite:**
- [ ] 5 servers mapeados com nome e propósito claro
- [ ] Para cada server: tools expostas, resources disponíveis, consumidores (papel + ferramenta de IA)
- [ ] Indicação explícita: servidor público vs custom a ser construído
- [ ] GitHub e filesystem seguem o exemplo mínimo do Anexo C como ponto de partida
- [ ] Documento de mapeamento gerado com o Claude — evidenciado no entregável

---

### [TAREFA-02]: Definir permissões mínimas por MCP server

**Spec de referência:** ES-01 (subseções "Permissões mínimas" de cada server)  
**Estimativa:** P  
**Dependências:** TAREFA-01  
**Bloqueante para:** TAREFA-03  
**Ferramenta:** Claude (chat)

**Descrição:**  
Para cada um dos 5 servers mapeados, definir as permissões mínimas (least privilege). Cada permissão deve ser justificada pelo uso real no projeto — nenhuma permissão "só para garantir".

**Critérios de aceite:**
- [ ] Permissões especificadas como scopes/roles granulares (não "acesso total" ou "admin")
- [ ] Confluence marcado como estritamente read-only (`write:*` explicitamente ausente)
- [ ] GitHub sem escrita direta em `main` ou `release/*`
- [ ] Azure AI Search com role `Search Index Data Reader` (sem `Contributor`)
- [ ] Azure DevOps PAT com scope `Work Items (read, write)` apenas
- [ ] Cada permissão tem justificativa de uma linha ("necessário para X, não precisa de Y")

---

### [TAREFA-03]: Criar `.mcp/mcp.json` com GitHub Copilot 🔴

**Spec de referência:** ES-01 (seção "Arquivo `.mcp/mcp.json`")  
**Estimativa:** P  
**Dependências:** TAREFA-01, TAREFA-02  
**Bloqueante para:** TAREFA-05  
**Ferramenta:** GitHub Copilot

**Descrição:**  
Usando o GitHub Copilot, criar o arquivo `.mcp/mcp.json` partindo do exemplo mínimo do Anexo C (GitHub + filesystem) e adicionando os 3 servers restantes com suas configurações completas.

**Critérios de aceite:**
- [ ] Arquivo criado em `.mcp/mcp.json` (path exato do Anexo C)
- [ ] `JSON.parse(fs.readFileSync('.mcp/mcp.json', 'utf8'))` não lança exceção
- [ ] 5 servers presentes: `github`, `filesystem`, `azure-ai-search`, `azure-devops`, `confluence`
- [ ] Todos os secrets referenciados via `${VAR}` — zero valores hardcoded
- [ ] Filesystem server limitado a `./src`, `./specs`, `./skills` (não root do projeto)
- [ ] Evidência de uso do Copilot documentada no entregável (ex: printscreen, log de sessão)

---

### [TAREFA-04]: Documentar riscos de segurança MCP

**Spec de referência:** ES-01-SEC  
**Estimativa:** P  
**Dependências:** TAREFA-01  
**Bloqueante para:** Nenhuma  
**Ferramenta:** Claude (chat)

**Descrição:**  
Identificar e documentar ao menos 2 riscos de segurança específicos ao uso de MCP no contexto NovaTech, com mitigação técnica acionável para cada.

**Critérios de aceite:**
- [ ] Ao menos 2 riscos documentados
- [ ] Cada risco descreve o cenário concreto: quem é o ator, qual dado está em risco, como o vazamento ocorre
- [ ] Risco-01 sobre Confluence incluso: "agente local envia conteúdo de documentação NovaTech a modelo cloud externo"
- [ ] Risco-02 sobre tokens incluso: "secrets expostos em logs de dependências MCP ou em outputs do agente"
- [ ] Cada mitigação é técnica e acionável (não "use com cuidado")
- [ ] Riscos são específicos ao NovaTech — não genéricos

---

### [TAREFA-05]: Validar funcionamento dos MCP servers localmente

**Spec de referência:** ES-01  
**Estimativa:** P  
**Dependências:** TAREFA-03  
**Bloqueante para:** Nenhuma  

**Descrição:**  
Testar o arquivo `.mcp/mcp.json` localmente. Cada server deve inicializar e responder a uma operação básica de inspeção de capabilities.

**Critérios de aceite:**
- [ ] Cada server inicia sem erro de configuração (`connection established`)
- [ ] `list_tools` (ou equivalente) retorna as tools documentadas no mapeamento da TAREFA-01
- [ ] Nenhum valor de secret aparece nos logs de inicialização (validar com `grep -r "AKIA\|Bearer\|password" .mcp/`)
- [ ] Server sem credenciais falha com erro descritivo (não processo travado ou silencioso)
- [ ] Resultado da validação documentado no entregável

---

## Grupo 2 — SDD: Query Endpoint (ES-02) {#grupo-2}

### [TAREFA-06]: Criar schemas Zod de input/output do query endpoint 🔴

**Spec de referência:** ES-02 (seção "Schemas Zod")  
**Estimativa:** P  
**Dependências:** Nenhuma  
**Bloqueante para:** TAREFA-07, TAREFA-09, TAREFA-11, TAREFA-12  
**Ferramenta:** GitHub Copilot

**Descrição:**  
Implementar os schemas Zod para `QueryInputSchema`, `QueryOutputSchema` e `SourceDocumentSchema` nos arquivos corretos, com tipos TypeScript derivados via `z.infer<>`.

**Critérios de aceite:**
- [ ] `QueryInputSchema` valida: `question` (string, min 1, max 2000), `conversationId` (uuid, opcional), `history` (array, máx 3 turnos, opcional)
- [ ] `SourceDocumentSchema` inclui campo `isObsolete: boolean` e `documentType: enum`
- [ ] `QueryOutputSchema` valida: `answer`, `sources` (min 1, max 5), `conversationId` (uuid), `tokenUsage`
- [ ] Tipos exportados via `z.infer<typeof Schema>` — sem duplicação manual de interfaces
- [ ] Arquivos nos paths corretos: `src/functions/query/validator.ts` e `src/shared/types.ts`
- [ ] `QueryInputSchema.parse({})` lança `ZodError` (sem `question`)
- [ ] `QueryInputSchema.parse({ question: 'teste' })` não lança exceção

---

### [TAREFA-07]: Implementar serviço de busca vetorial (Azure AI Search) 🔴 ⚠️

**Spec de referência:** ES-02 (seção "Fluxo de Dados — passo 3"), CONF-01  
**Estimativa:** M  
**Dependências:** TAREFA-06  
**Bloqueante para:** TAREFA-09, TAREFA-11  
**Ferramenta:** GitHub Copilot

> ⚠️ **Alto risco:** Lógica de deduplicação de versões (CONF-01 — PROC-042 v1 vs v2) é delicada. Errar aqui gera cálculos incorretos de frete para os atendentes. Cobrir com testes em TAREFA-14.

**Descrição:**  
Implementar `src/services/search.ts` com busca vetorial no Azure AI Search. O serviço deve retornar os top-5 chunks com metadados de vigência e aplicar a lógica de deduplicação para documentos com múltiplas versões.

**Critérios de aceite:**
- [ ] Função `searchDocuments(vector: number[], options?: SearchOptions): Promise<Chunk[]>` exportada
- [ ] Retorna no máximo 5 chunks (`$top=5`)
- [ ] Cada chunk inclui metadados: `documentId`, `version`, `documentType`, `vigencia_inicio`, `isObsolete`
- [ ] Deduplicação de versões: quando PROC-042 v1 e v2 estão no resultado, marcar v1 como `isObsolete: true`
- [ ] Para chamados pós-01/12/2023: filtrar chunks com `isObsolete: true` antes de retornar
- [ ] Se data do chamado não informada: usar v2 e incluir flag `versionWarning: true` no resultado
- [ ] Retry exponential backoff em erros 5xx do Azure (1s → 2s → 4s, máx 3 tentativas)
- [ ] Sem retry em erros 4xx (exceto 429)
- [ ] Log pino: `{ query_length, top_k, result_count, latency_ms }` por chamada
- [ ] Azure SDK mockado nos testes unitários (sem chamadas reais)

---

### [TAREFA-08]: Implementar geração de embeddings (Azure OpenAI ada-002)

**Spec de referência:** ES-02 (seção "Fluxo de Dados — passo 2")  
**Estimativa:** P  
**Dependências:** Nenhuma (usa apenas `src/shared/config.ts`)  
**Bloqueante para:** TAREFA-10, TAREFA-11  
**Ferramenta:** GitHub Copilot

**Descrição:**  
Implementar a função de geração de embeddings em `src/services/completion.ts`.

**Critérios de aceite:**
- [ ] Função `createEmbedding(text: string): Promise<number[]>` exportada
- [ ] Deployment `text-embedding-ada-002` configurado via env (`AZURE_OPENAI_EMBEDDING_DEPLOYMENT`)
- [ ] Texto truncado a 8.192 tokens antes de enviar (limite do ada-002) — usando `tiktoken`
- [ ] Retry exponential backoff (1s → 2s → 4s, máx 3 tentativas) em erros 5xx e 429
- [ ] Log pino: `{ input_length, vector_dimensions, latency_ms }` por chamada
- [ ] Azure OpenAI SDK mockado nos testes unitários

---

### [TAREFA-09]: Implementar prompt builder com gestão de context budget 🔴

**Spec de referência:** ES-02 (seção "Gestão do Context Budget"), ADR-0002  
**Estimativa:** M  
**Dependências:** TAREFA-06, TAREFA-07  
**Bloqueante para:** TAREFA-11, TAREFA-13  
**Ferramenta:** GitHub Copilot

**Descrição:**  
Implementar `src/services/prompt-builder.ts` que monta o prompt final respeitando o budget de ~12K tokens: system prompt (~4K) + chunks (~8K, máx 5) + histórico (3 turnos) + pergunta atual.

**Critérios de aceite:**
- [ ] Lê system prompt de `/prompts/system-prompt.md` em runtime — não hardcoded
- [ ] Inclui no máximo 5 chunks, ordenados por score descendente
- [ ] Calcula tokens com `tiktoken` (encoding `cl100k_base`)
- [ ] Overflow de budget: descarta chunk de menor score (nunca sacrifica o system prompt)
- [ ] Log de warning `{ event: 'budget_overflow', chunksDropped: N }` quando descarte ocorre
- [ ] Histórico limitado a 3 turnos — turnos excedentes são descartados (os mais antigos primeiro)
- [ ] System prompt inclui instrução de documentos contraditórios: "Use sempre a versão mais recente do documento e cite a versão"
- [ ] Retorna `{ messages: ChatMessage[], estimatedTokens: number }`
- [ ] Testes: cenário 6 chunks → 5 incluídos; cenário budget overflow → chunk correto descartado

---

### [TAREFA-10]: Implementar completion com retry (Azure OpenAI GPT-4o)

**Spec de referência:** ES-02 (seção "Fluxo de Dados — passo 5")  
**Estimativa:** M  
**Dependências:** TAREFA-08  
**Bloqueante para:** TAREFA-11  
**Ferramenta:** GitHub Copilot

**Descrição:**  
Implementar a função de completion em `src/services/completion.ts` usando GPT-4o, com retry e logging de token usage.

**Critérios de aceite:**
- [ ] Função `createCompletion(messages: ChatMessage[]): Promise<CompletionResult>` exportada
- [ ] Deployment `gpt-4o` configurado via env (`AZURE_OPENAI_COMPLETION_DEPLOYMENT`)
- [ ] Retry exponencial em erros 5xx e 429: 1s → 2s → 4s (máx 3 tentativas)
- [ ] **Sem** retry em erros 400, 401, 403, 404 (falha rápida)
- [ ] Log pino: `{ promptTokens, completionTokens, model, latency_ms }` por chamada
- [ ] Testes com mock: simular 2 falhas (503) seguidas de sucesso — validar que 3ª tentativa completa

---

### [TAREFA-11]: Implementar HTTP handler do query endpoint

**Spec de referência:** ES-02 (seção "Critérios de Aceitação")  
**Estimativa:** M  
**Dependências:** TAREFA-06, TAREFA-07, TAREFA-08, TAREFA-09, TAREFA-10  
**Bloqueante para:** TAREFA-14  
**Ferramenta:** GitHub Copilot

**Descrição:**  
Implementar `src/functions/query/handler.ts` como Azure Function v4 HTTP trigger que orquestra o fluxo completo: validação → embedding → busca → prompt → completion → resposta.

**Critérios de aceite:**
- [ ] Registrado com `app.http('query', { methods: ['POST'], handler: queryHandler })` (Azure Functions v4)
- [ ] `POST /api/query` com body inválido → HTTP 400 + `{ error: "validation_error", details: [...] }` (sem stack trace)
- [ ] `POST /api/query` com question válida → HTTP 200 + `QueryOutputSchema` válido
- [ ] Erros internos → HTTP 500 + `{ error: "internal_error", requestId: "..." }` (sem detalhes internos)
- [ ] `conversationId` gerado como `crypto.randomUUID()` quando não fornecido no input
- [ ] Log de entrada: `{ conversationId, questionLength, hasHistory }`
- [ ] Log de saída: `{ statusCode, sourceCount, tokenUsage, duration_ms }`
- [ ] Nenhuma informação sensível (question completa, dados de chunks) logada em nível `info` em produção

---

### [TAREFA-12]: Testes unitários para `validator.ts`

**Spec de referência:** ES-02 (seção "Schemas Zod")  
**Estimativa:** P  
**Dependências:** TAREFA-06  
**Bloqueante para:** Nenhuma  

**Descrição:**  
Escrever testes unitários para os schemas Zod em `tests/unit/functions/query/validator.test.ts`.

**Critérios de aceite:**
- [ ] Caso: `question` vazia (`""`) → `ZodError` com mensagem "Pergunta não pode estar vazia"
- [ ] Caso: `question` com 2001 chars → `ZodError`
- [ ] Caso: `conversationId` não-UUID (`"abc"`) → `ZodError`
- [ ] Caso: `history` com 4 turnos → `ZodError`
- [ ] Caso: body válido `{ question: "Qual o SLA Gold?" }` → parse sem exceção
- [ ] Caso: body completo com `conversationId` + `history` válidos → parse sem exceção
- [ ] Cobertura de branches ≥ 80% no `validator.ts` (verificada por vitest coverage)
- [ ] Zero mocks externos (teste puramente unitário)

---

### [TAREFA-13]: Testes unitários para `prompt-builder.ts`

**Spec de referência:** ES-02 (seção "Gestão do Context Budget")  
**Estimativa:** P  
**Dependências:** TAREFA-09  
**Bloqueante para:** Nenhuma  

**Descrição:**  
Testar os cenários de gestão de context budget no prompt builder em `tests/unit/services/prompt-builder.test.ts`.

**Critérios de aceite:**
- [ ] Cenário: 3 chunks dentro do budget → todos os 3 incluídos nas messages
- [ ] Cenário: 6 chunks fornecidos → apenas os 5 com maior score incluídos (6º descartado)
- [ ] Cenário: 5 chunks que somam >8K tokens → chunk de menor score removido até caber no budget
- [ ] Cenário: histórico com 4 turnos → truncado para os 3 mais recentes
- [ ] Cenário: `isObsolete: true` em chunk → chunk não incluído no prompt (independente do score)
- [ ] Instrução de documentos contraditórios presente em TODAS as saídas (não condicionalmente)
- [ ] `estimatedTokens` no resultado é coerente com o conteúdo gerado (±10% da contagem real)

---

### [TAREFA-14]: Testes de integração do query endpoint ⚠️

**Spec de referência:** ES-02, CONF-01, CONF-02  
**Estimativa:** G  
**Dependências:** TAREFA-11, TAREFA-12, TAREFA-13  
**Bloqueante para:** Nenhuma  

> ⚠️ **Alto risco:** Este é o único teste que exercita a lógica de resolução de conflitos documentais (CONF-01 e CONF-02). Falha aqui significa que o assistente pode dar informações erradas sobre frete especial ou carga perigosa.

**Descrição:**  
Escrever testes de integração em `tests/integration/query/` usando `msw` para mockar as APIs Azure. Os fixtures de chunks devem vir do Anexo B (documentação NovaTech real).

**Critérios de aceite:**

*Fixtures:*
- [ ] Arquivo `tests/fixtures/chunks.ts` com chunks do Anexo B: POL-001-A/B/C/D, PROC-042-A/B/C, PROC-042v2-A/B/C/D/E, SLA-2024-A/B/C/D/E, FAQ-03/08/15/32/38
- [ ] Cada chunk inclui metadados `documentType`, `version`, `vigencia_inicio`, `isObsolete`

*Cenários de conflito documental (CONF-01):*
- [ ] Pergunta sobre multiplicador Sudeste com chamado pós-01/12/2023 → resposta usa `1.1` (v2), não `1.0` (v1)
- [ ] Chunks de PROC-042 v1 presentes nos resultados do mock → v1 marcada `isObsolete: true`, não aparece em `sources`

*Cenários de hierarquia de fontes (CONF-02):*
- [ ] Pergunta sobre devolução de carga perigosa → resposta baseia-se em POL-001-B (normativo), não em FAQ-03
- [ ] `sources` da resposta não inclui FAQ-03 como fonte primária quando POL-001-B está disponível

*Cenários de proteção contra alucinação:*
- [ ] Pergunta sobre "cliente Platinum" → resposta inclui "não existe tier Platinum" (baseada em SLA-2024-A)
- [ ] Pergunta sobre frete padrão (<500kg) → resposta indica ausência de informação no base documental (não inventa valor)

*Infraestrutura:*
- [ ] `msw` intercepta 100% das chamadas ao Azure (sem chamadas reais ao Azure em nenhum teste)
- [ ] Setup/teardown limpo: cada teste inicia com estado fresh dos mocks

---

### [TAREFA-15]: Revisão crítica do código gerado pelo Copilot

**Spec de referência:** ES-02 (seção "Revisão Crítica")  
**Estimativa:** P  
**Dependências:** TAREFA-11 (código implementado)  
**Bloqueante para:** Nenhuma  

**Descrição:**  
Revisar criticamente o código gerado pelo Copilot nas TAREFA-06 a TAREFA-11. Documentar ao menos 2 problemas reais que precisariam de ajuste antes de um code review.

**Critérios de aceite:**
- [ ] Ao menos 2 problemas identificados com trecho de código "antes" e "depois" da correção
- [ ] Problemas são reais — não cosméticos (ex: não é "renomear variável")
- [ ] Cada problema inclui: descrição do risco, código original do Copilot, código corrigido
- [ ] Exemplos de problemas válidos: `as any` em resposta do SDK, `console.log` em vez de pino, ausência de retry, `catch (e: any)` sem type guard, exposição de detalhes de erro em resposta HTTP
- [ ] Exemplos de problemas inválidos (NÃO contar): preferência de style, nomes de variáveis, comentários em excesso

---

## Grupo 3 — Estratégia de Skills (ES-03) {#grupo-3}

### [TAREFA-16]: Definir árvore de skills Foundation com Claude 🔴

**Spec de referência:** ES-03 (seção "Árvore de Skills — Foundation")  
**Estimativa:** P  
**Dependências:** Nenhuma  
**Bloqueante para:** TAREFA-17, TAREFA-19, TAREFA-20, TAREFA-21  
**Ferramenta:** Claude (chat)

**Descrição:**  
Usando o Claude, definir as 3 skills Foundation do projeto com nome, arquivo, frase-ativação, responsável de criação e consumidores por papel.

**Critérios de aceite:**
- [ ] 3 skills Foundation definidas: `typescript-conventions.md`, `error-handling.md`, `project-structure.md`
- [ ] Cada skill tem frase-ativação que um agente reconheceria (formulada como instrução natural)
- [ ] Responsável de criação mapeado por papel específico (não "desenvolvedor" genérico)
- [ ] Consumidores listados por papel + ferramenta de IA
- [ ] Frequência de uso estimada (ex: "toda geração de código TypeScript")
- [ ] Documento produzido com Claude evidenciado no entregável

---

### [TAREFA-17]: Definir árvore de skills Domain

**Spec de referência:** ES-03 (seção "Árvore de Skills — Domain")  
**Estimativa:** P  
**Dependências:** TAREFA-16  
**Bloqueante para:** TAREFA-18  
**Ferramenta:** Claude (chat)

**Descrição:**  
Definir as 4 skills Domain do projeto seguindo a hierarquia do Anexo C.

**Critérios de aceite:**
- [ ] 4 skills Domain definidas: `azure-functions-endpoint.md`, `azure-ai-search-integration.md`, `react-components.md`, `testing-patterns.md`
- [ ] `testing-patterns.md` criada pelo **QA** — não por dev (papel explícito documentado)
- [ ] Cada skill referencia as Foundation skills que herda (ex: `azure-functions-endpoint.md` herda `typescript-conventions.md` e `error-handling.md`)
- [ ] Paths seguem `skills/domain/` conforme Anexo C

---

### [TAREFA-18]: Definir árvore de skills Artifact

**Spec de referência:** ES-03 (seção "Árvore de Skills — Artifact")  
**Estimativa:** P  
**Dependências:** TAREFA-16, TAREFA-17  
**Bloqueante para:** Nenhuma  
**Ferramenta:** Claude (chat)

**Descrição:**  
Definir as 5 skills Artifact do projeto (as 3 do Anexo C mais 2 identificadas: `create-sdd-spec.md` e `create-adr.md`).

**Critérios de aceite:**
- [ ] 5 skills Artifact definidas com nome, arquivo, frase-ativação e frequência de uso
- [ ] `create-sdd-spec.md` criada pelo **Product Specialist** — não por dev
- [ ] `create-adr.md` criada pelo **Tech Lead** — não por dev
- [ ] Cada artifact skill indica quais domain skills usa como base
- [ ] Paths seguem `skills/artifact/` conforme Anexo C

---

### [TAREFA-19]: Criar `typescript-conventions.md` com Copilot 🔴 ⚠️

**Spec de referência:** ES-03 (seção "Conteúdo da Foundation Skill")  
**Estimativa:** M  
**Dependências:** TAREFA-16  
**Bloqueante para:** TAREFA-20 (herança), todas as skills Domain  
**Ferramenta:** GitHub Copilot

> ⚠️ **Alta prioridade:** Esta é a skill mais crítica do projeto — sem ela, o Copilot gera código inconsistente em todos os módulos. Todas as skills Domain herdam dela.

**Descrição:**  
Usando o GitHub Copilot, criar `skills/foundation/typescript-conventions.md` com as seções obrigatórias: contexto, regras prescritivas, exemplos DO/DON'T com código real, e anti-padrões.

**Critérios de aceite:**
- [ ] Arquivo em `skills/foundation/typescript-conventions.md`
- [ ] Seção **Contexto**: descreve escopo, referência ao tsconfig `strict: true` e herança por outras skills
- [ ] Seção **Regras Prescritivas**: cobre tipagem, imports, async/await, logging — cada regra é prescritiva (não sugestão)
- [ ] Ao menos 2 exemplos **DO** com código TypeScript real usando as bibliotecas do projeto (pino, Zod, `@/` aliases)
- [ ] Ao menos 2 exemplos **DON'T** com comentário inline explicando o problema
- [ ] Ao menos **5 anti-padrões** específicos ao Copilot: `as any`, `console.log`, `require()` dinâmico, `catch (e: any)`, ausência de retry
- [ ] Anti-padrões contêm código concreto (não descrição abstrata)
- [ ] Evidência de uso do Copilot documentada no entregável

---

### [TAREFA-20]: Criar `error-handling.md` Foundation skill

**Spec de referência:** ES-03  
**Estimativa:** M  
**Dependências:** TAREFA-16, TAREFA-19  
**Bloqueante para:** Nenhuma  
**Ferramenta:** GitHub Copilot

**Descrição:**  
Criar `skills/foundation/error-handling.md` com os padrões de tratamento de erro do projeto NovaTech.

**Critérios de aceite:**
- [ ] Define hierarquia de custom errors: `NovaTechError` (base) → `AzureSearchError`, `AzureOpenAIError`, `ValidationError`
- [ ] Padrão para `try/catch` em handlers Azure Functions v4 (HTTP 400 vs HTTP 500)
- [ ] Regra explícita: nunca expor stack trace em respostas de produção
- [ ] Padrão para erros de validação Zod: extrair `error.issues` e formatar como array legível
- [ ] Padrão para erros de API Azure: HTTP 500 + `requestId` rastreável nos logs
- [ ] Exemplos DO/DON'T com código TypeScript real

---

### [TAREFA-21]: Criar `project-structure.md` Foundation skill

**Spec de referência:** ES-03  
**Estimativa:** P  
**Dependências:** TAREFA-16  
**Bloqueante para:** Nenhuma  
**Ferramenta:** GitHub Copilot

**Descrição:**  
Criar `skills/foundation/project-structure.md` documentando a estrutura de diretórios e convenções de organização conforme o Anexo C.

**Critérios de aceite:**
- [ ] Reproduz (simplificada) a estrutura de diretórios do Anexo C com anotações por pasta
- [ ] Regras de nomenclatura: módulos em kebab-case, arquivos TypeScript em camelCase
- [ ] Instrução sobre quando criar pasta vs arquivo único (> 3 arquivos relacionados → pasta)
- [ ] Referência ao padrão SDD em `/specs/` (requirements → plan → tasks)
- [ ] Referência à hierarquia de skills em `/skills/`
- [ ] Convenção de ADRs em `/docs/adr/`

---

### [TAREFA-22]: Criar matriz de criação/consumo de skills

**Spec de referência:** ES-03 (seção "Matriz de Criação/Consumo")  
**Estimativa:** P  
**Dependências:** TAREFA-16, TAREFA-17, TAREFA-18  
**Bloqueante para:** Nenhuma  

**Descrição:**  
Criar `skills/SKILLS-MATRIX.md` com a tabela completa de skills por papel — quem cria e quem consome cada skill.

**Critérios de aceite:**
- [ ] Tabela com todos os 6 papéis: Tech Lead, Dev Sênior, Dev Pleno, QA, Product Specialist, Delivery Manager
- [ ] Criação não concentrada apenas em devs: PS cria `create-sdd-spec.md`, QA cria `testing-patterns.md` e `create-integration-test.md`
- [ ] Delivery Manager aparece como consumidor de pelo menos uma skill (`create-adr.md` para rastreabilidade)
- [ ] Frequência de uso estimada por skill
- [ ] Arquivo em `skills/SKILLS-MATRIX.md`

---

## Checklist de Validação {#checklist}

### Cobertura de Requisitos: Exercício 2.1 — MCP Servers

| Requisito do exercício | Spec | Tasks | Status |
|------------------------|------|-------|--------|
| Mapear 5 MCP servers (GitHub, AI Search, OpenAI, DevOps, Confluence) | ES-01 | TAREFA-01 | ✓ |
| Para cada server: tools, resources, prompts | ES-01 (MCP-01 a MCP-05) | TAREFA-01 | ✓ |
| Para cada server: consumidores por papel/ferramenta | ES-01 | TAREFA-01 | ✓ |
| Servidor público vs custom a ser construído | ES-01 | TAREFA-01 | ✓ |
| Permissões mínimas (least privilege) | ES-01 | TAREFA-02 | ✓ |
| Arquivo `.mcp/mcp.json` gerado com Copilot | ES-01 | TAREFA-03 | ✓ |
| `.mcp/mcp.json` sintaticamente válido | ES-01 | TAREFA-03, TAREFA-05 | ✓ |
| Ao menos 2 riscos de segurança específicos | ES-01-SEC | TAREFA-04 | ✓ |
| Mitigações técnicas acionáveis para os riscos | ES-01-SEC | TAREFA-04 | ✓ |
| Referência ao exemplo mínimo do Anexo C | ES-01 | TAREFA-03 | ✓ |

---

### Cobertura de Requisitos: Exercício 2.2 — SDD Query Endpoint

| Requisito do exercício | Spec | Tasks | Status |
|------------------------|------|-------|--------|
| Converter plan.md em tasks.md atômicas | ES-02 | Grupo 2 inteiro | ✓ |
| Cada task com ID, critérios de aceite, dependências, estimativa | — | TAREFA-06 a TAREFA-15 | ✓ |
| Implementar primeira task (validação de input com Zod) | ES-02 | TAREFA-06 | ✓ |
| Código TypeScript com Zod | ES-02 | TAREFA-06, TAREFA-11 | ✓ |
| Azure Functions v4 | ES-02 | TAREFA-11 | ✓ |
| Logging com pino | ES-02 | TAREFA-11 (e todos os serviços) | ✓ |
| Retry com exponential backoff | ES-02 | TAREFA-07, TAREFA-08, TAREFA-10 | ✓ |
| Código nos paths corretos do Anexo C | ES-02 (tabela de paths) | TAREFA-06, TAREFA-07, TAREFA-09, TAREFA-11 | ✓ |
| Revisão crítica com 2+ problemas reais | ES-02 | TAREFA-15 | ✓ |
| Conexão com protótipo do Cenário 1 (ADR-0004) | ES-02, ADR-0004 | ES-02 (contexto) | ✓ |
| Context budget ADR-0002 respeitado | ES-02 | TAREFA-09, TAREFA-13 | ✓ |
| Tratamento de documentos contraditórios (ADR-0003) | CONF-01, CONF-02 | TAREFA-07, TAREFA-14 | ✓ |
| Testes unitários | — | TAREFA-12, TAREFA-13 | ✓ |
| Testes de integração | — | TAREFA-14 | ✓ |

---

### Cobertura de Requisitos: Exercício 2.3 — Skills

| Requisito do exercício | Spec | Tasks | Status |
|------------------------|------|-------|--------|
| Árvore Foundation → Domain → Artifact | ES-03 | TAREFA-16, 17, 18 | ✓ |
| Skills Foundation definidas (≥3) | ES-03 | TAREFA-16, 19, 20, 21 | ✓ |
| Skills Domain definidas (≥4 por camada técnica) | ES-03 | TAREFA-17 | ✓ |
| Skills Artifact definidas (≥3 + extras identificados) | ES-03 | TAREFA-18 | ✓ |
| Nome, frase-ativação, criador e consumidor por papel | ES-03 | TAREFA-16, 17, 18 | ✓ |
| Criação/consumo multi-papel (não só devs) | ES-03 | TAREFA-17 (QA), TAREFA-18 (PS, TL) | ✓ |
| SKILL.md Foundation criada com Copilot | ES-03 | TAREFA-19 | ✓ |
| SKILL.md com exemplos DO/DON'T com código TypeScript real | ES-03 | TAREFA-19 | ✓ |
| Anti-padrões úteis (o que Copilot gera de errado) | ES-03 | TAREFA-19 | ✓ |
| Hierarquia de paths do Anexo C (`skills/foundation/` etc.) | ES-03 | TAREFA-16, 17, 18 | ✓ |
| Matriz de criação/consumo por papel | ES-03 | TAREFA-22 | ✓ |

---

### Verificação de Qualidade SDD

| Critério de qualidade | Status |
|----------------------|--------|
| Toda spec (ES-01, ES-02, ES-03) tem ao menos uma task correspondente | ✓ |
| Toda task tem critérios de aceite verificáveis (sem "funcionar corretamente") | ✓ |
| Nenhum critério vago identificado após revisão | ✓ |
| Tasks atômicas: todas P ou M (a única G é TAREFA-14, justificada pela complexidade de fixtures) | ✓ |
| Dependências mapeadas para todas as tasks | ✓ |
| Tasks bloqueantes marcadas 🔴 | ✓ |
| Tasks de alto risco marcadas ⚠️ | ✓ |
| Conflitos documentais identificados e mapeados em specs e tasks | ✓ |
| CONF-01 (PROC-042 v1 vs v2) → spec CONF-01 + TAREFA-07 + TAREFA-14 | ✓ |
| CONF-02 (FAQ-03 vs POL-001-B) → spec CONF-02 + TAREFA-14 | ✓ |
| CONF-03 (FAQ-08 instrução informal) → spec CONF-03 + documentado em ADR-0003 | ✓ |
| Cobertura de testes: unit (TAREFA-12, 13), integration (TAREFA-14) | ✓ |
| Cobertura e2e: explicitamente marcada como fora de escopo desta fase (pipeline não populado) | ✓ |
| Restrições técnicas globais documentadas em specs | ✓ |
| Context budget (~12K tokens) aplicado em spec e em task | ✓ |
| ADR-0001 a ADR-0004 referenciados nas specs relevantes | ✓ |
| Hierarquia de skills coerente com Anexo C | ✓ |
| Skills criadas por papéis corretos (QA, PS, TL — não só devs) | ✓ |
| Nenhum requisito do exercício sem correspondência em spec + task | ✓ |

---

### Resumo de Cobertura

| Exercício | Requisitos identificados | Cobertos em spec | Cobertos em tasks | % |
|-----------|--------------------------|-----------------|------------------|---|
| 2.1 — MCP Servers | 10 | 10 | 10 | **100%** |
| 2.2 — SDD Query Endpoint | 14 | 14 | 14 | **100%** |
| 2.3 — Skills | 11 | 11 | 11 | **100%** |
| **Total** | **35** | **35** | **35** | **100%** |
