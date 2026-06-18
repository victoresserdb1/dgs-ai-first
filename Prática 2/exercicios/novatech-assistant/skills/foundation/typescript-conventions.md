# TypeScript Conventions — NovaTech Assistant

> **Herança:** Esta é a skill base. Todas as skills Domain e Artifact herdam estas regras.  
> **Escopo:** Todo código em `src/`. Aplica-se a arquivos `.ts` e `.tsx`.  
> **Criado por:** Dev Sênior | **Consumido por:** Dev Pleno + Dev Sênior + Copilot + Claude

---

## Contexto

Convenções TypeScript obrigatórias para o repositório `db1/novatech-assistant`.

O `tsconfig.json` tem `strict: true` — isso **não é negociável**. Qualquer código que não compile em modo strict é rejeitado no CI.

O projeto usa:
- **Zod** para validação de schemas e derivação de tipos (não duplicar interfaces manualmente)
- **Pino** para logging estruturado (nunca `console.log`)
- **`@/`** como path alias para `src/` (configurado no `tsconfig.json`)
- **Azure Functions v4** para endpoints HTTP
- **`@azure/search-documents`** e **`@azure/openai`** para integrações Azure

Esta skill é carregada implicitamente por todas as outras skills do projeto.

---

## Regras Prescritivas

### 1. Tipagem — Regras de Ouro

**NUNCA use `as any`.** Alternativas:
- Se o tipo é conhecido: use o tipo genérico correto (ex: `SearchClient<NovaTechDocumentIndex>`)
- Se o tipo é `unknown` por design: use `as unknown as T` **com comentário justificando**
- Se a API externa não tem tipos: crie uma interface que descreva o contrato

**Prefira tipos explícitos em assinaturas públicas.** Deixe inferência para implementações internas.

**Derive tipos de schemas Zod:**
```typescript
// ✅ DO: derivar tipo do schema
export const QueryInputSchema = z.object({ question: z.string() });
export type QueryInput = z.infer<typeof QueryInputSchema>;

// ❌ DON'T: duplicar interface manualmente
export interface QueryInput { question: string; }  // vai desincronizar do schema
```

**Custom errors estendem `NovaTechError` de `@/shared/errors`.**

### 2. Imports

Ordem obrigatória (eslint enforça):
1. Módulos built-in do Node (`fs`, `path`, `crypto`)
2. Pacotes de terceiros (`@azure/functions`, `zod`, `pino`)
3. Imports internos com `@/` alias

```typescript
// ✅ DO
import { readFileSync } from 'fs';                           // 1. built-in
import { z } from 'zod';                                     // 2. terceiros
import { logger } from '@/shared/logger';                    // 3. internos
import { type QueryInput } from './validator';               // 3. internos (relativo)
```

**Prefira imports nomeados a default exports em módulos de serviço.**

### 3. Async/Await

- **Sempre `async/await`** — nunca `.then()/.catch()` encadeado
- **`try/catch` obrigatório** em toda função que faz chamada a API externa
- **`catch (error: unknown)` com type guard** — nunca `catch (e: any)`

```typescript
// ✅ DO
try {
  const result = await client.search(query);
} catch (error: unknown) {
  const httpError = error as { statusCode?: number; message?: string };
  if (httpError.statusCode === 404) { /* tratamento específico */ }
  throw new AzureSearchError(httpError.message ?? 'erro desconhecido', httpError.statusCode);
}

// ❌ DON'T
try { ... } catch (e: any) { console.error(e.message); }  // perde type safety
```

### 4. Logging

- **Use `logger`** de `@/shared/logger` (pino) em **todo** código de produção
- **NUNCA `console.log`, `console.error`, `console.warn`** — violação de CI
- **Log de entrada:** parâmetros relevantes **sem dados sensíveis**. Não logar `question` completa em `info` — apenas `questionLength`.
- **Log de saída:** duração em ms, resultado (sucesso/erro), IDs de rastreio

```typescript
// ✅ DO
logger.info({ conversationId, questionLength: input.question.length }, 'query_start');
logger.error({ requestId, errorCode: error.code }, 'query_failed');

// ❌ DON'T
console.log('processando query:', input);      // sem estrutura, sem requestId
console.error('erro:', error.message);         // não aparece no Application Insights
```

### 5. Estilo e Organização

- **Funções exportadas no fim do arquivo** — declarações de tipo e helpers locais no topo
- **Módulos kebab-case:** `azure-functions-endpoint.md`, `prompt-builder.ts`
- **Classes e interfaces PascalCase:** `NovaTechError`, `QueryInputSchema`
- **Constantes UPPER_SNAKE_CASE:** `MAX_CHUNKS`, `V2_EFFECTIVE_DATE`

---

## Exemplos

### DO ✓ — Handler com tipagem correta, logger e error handling

```typescript
import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions';
import { ZodError } from 'zod';
import { logger } from '@/shared/logger';
import { NovaTechError } from '@/shared/errors';
import { QueryInputSchema } from './validator';

export async function queryHandler(
  req: HttpRequest,
  _context: InvocationContext
): Promise<HttpResponseInit> {
  const requestId = crypto.randomUUID();

  try {
    const body = await req.json() as unknown;
    const input = QueryInputSchema.parse(body);

    logger.info({ requestId, questionLength: input.question.length }, 'query_start');

    // ... lógica de negócio

    return { status: 200, jsonBody: output };
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return { status: 400, jsonBody: { error: 'validation_error', details: error.issues } };
    }
    logger.error({
      requestId,
      errorCode: (error instanceof NovaTechError) ? error.code : 'unknown'
    }, 'query_error');
    return { status: 500, jsonBody: { error: 'internal_error', requestId } };
  }
}

app.http('query', { methods: ['POST'], authLevel: 'anonymous', handler: queryHandler });
```

### DO ✓ — Serviço com retry e tipagem do SDK Azure

```typescript
import { SearchClient, AzureKeyCredential } from '@azure/search-documents';
import { config } from '@/shared/config';
import { logger } from '@/shared/logger';

interface NovaTechDocumentIndex {
  documentId: string;
  content: string;
  version: string;
  documentType: 'normative' | 'faq' | 'procedure' | 'sla';
}

export async function searchDocuments(vector: number[]): Promise<NovaTechDocumentIndex[]> {
  const client = new SearchClient<NovaTechDocumentIndex>(   // ✅ tipo genérico explícito
    config.AZURE_SEARCH_ENDPOINT,
    config.AZURE_SEARCH_INDEX_NAME,
    new AzureKeyCredential(config.AZURE_SEARCH_API_KEY)
  );

  const results: NovaTechDocumentIndex[] = [];

  for await (const result of (await client.search('*', { top: 5 })).results) {
    results.push(result.document);  // ✅ tipado — TypeScript valida acessos
  }

  return results;
}
```

### DON'T ✗ — Anti-padrões comuns do Copilot

```typescript
// ❌ 1. console.log em vez de logger estruturado
console.log('processando query', input);

// ❌ 2. as any para contornar tipagem do SDK Azure
const result = await azureClient.search(query) as any;

// ❌ 3. .then() encadeado sem tratamento de erro adequado
azureClient.search(query)
  .then(res => buildResponse(res))
  .then(res => sendResponse(res));  // sem .catch() — erros silenciados

// ❌ 4. catch genérico sem type narrowing
try { ... } catch (e: any) { console.error(e.message); }

// ❌ 5. require() dinâmico em vez de import estático
const pino = require('pino');  // quebra tree-shaking e tipagem TypeScript
```

---

## Anti-Padrões — O que o Copilot Gera Sem Esta Skill

### 1. `require()` Dinâmico
**O que gera:** `const pino = require('pino')` ou `const { logger } = require('./logger')`  
**Por que é errado:** Quebra tree-shaking, impede o compilador TypeScript de resolver tipos automaticamente, e é inconsistente com o resto do codebase que usa ES modules.  
**Correção:** `import pino from 'pino'` ou `import { logger } from '@/shared/logger'`

### 2. `console.log` para Debugging
**O que gera:** `console.log('response:', data)` ou `console.error('failed:', err)`  
**Por que é errado:** Sem contexto estruturado (`conversationId`, `requestId`), não aparece corretamente no Application Insights, e pode logar dados sensíveis acidentalmente.  
**Correção:** `logger.info({ data }, 'description')` ou `logger.error({ error: err.code }, 'description')`

### 3. `as any` em Respostas do SDK Azure
**O que gera:** `const doc = result.document as any; doc.documentId`  
**Por que é errado:** SDK responses têm tipos genéricos. `as any` remove toda proteção do compilador. Um campo renomeado no índice Azure passa despercebido até runtime.  
**Correção:** `new SearchClient<NovaTechDocumentIndex>(...)` — o compilador valida todos os acessos.

### 4. Callbacks ou `.then()` Encadeado
**O que gera:** `azureClient.search(q).then(r => process(r)).catch(e => console.error(e))`  
**Por que é errado:** Dificulta error handling granular (retry, type narrowing), mistura níveis de abstração, e `.catch()` no final não captura erros em múltiplos `.then()` anteriores.  
**Correção:** `const result = await withRetry(() => azureClient.search(q))`

### 5. Ausência de Retry em Chamadas Azure
**O que gera:** `return await client.getEmbeddings(deployment, [text])` — sem retry  
**Por que é errado:** Azure tem falhas transitórias (503, 429). Sem retry, qualquer pico de carga no Azure OpenAI resulta em HTTP 500 para o atendente NovaTech.  
**Correção:** Envolver com `withExponentialBackoff(() => client.getEmbeddings(...))` — 1s → 2s → 4s, sem retry em 400/401/403/404.

### 6. `catch (e: any)` Sem Type Guard
**O que gera:** `catch (e: any) { logger.error(e.message) }`  
**Por que é errado:** `e: any` desativa `strict` para o bloco catch. Se `e` não for `Error` (ex: uma string lançada), `e.message` será `undefined` — erro mascarado.  
**Correção:** `catch (error: unknown)` + `const err = error as { message?: string }` + verificação antes de usar.
