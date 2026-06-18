# Create Integration Test — NovaTech Assistant

> **Herda de:** `testing-patterns.md` + `typescript-conventions.md`  
> **Frase-ativação:** "Crie testes de integração para este endpoint Azure Function usando msw"  
> **Criado por:** **QA** | **Consumido por:** Dev Pleno + Dev Sênior + Copilot | **Frequência:** Por endpoint a testar

---

## O que esta skill produz

Gera `tests/integration/[endpoint]/[endpoint].test.ts` com:
- Setup completo do servidor msw
- Cenários de happy path
- Cenários de conflito documental (CONF-01, CONF-02 quando aplicável)
- Cenários de erro (400, 500)
- Cenários de anti-alucinação quando relevante

---

## Template de Arquivo de Integração

```typescript
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { /* chunks relevantes */ } from '../../fixtures/chunks';

const TEST_SEARCH_ENDPOINT = 'https://test-search.search.windows.net';
const TEST_OPENAI_ENDPOINT = 'https://test-openai.openai.azure.com';

// Configurar env vars ANTES de importar o handler
process.env['AZURE_SEARCH_ENDPOINT'] = TEST_SEARCH_ENDPOINT;
// ... demais vars

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());  // estado fresh entre testes
afterAll(() => server.close());

// Helper: configurar handlers para um cenário
function setupHandlers(searchChunks, completionText) {
  server.use(
    http.post(`${TEST_OPENAI_ENDPOINT}/openai/deployments/text-embedding-ada-002/embeddings`,
      () => HttpResponse.json(buildEmbeddingResponse())
    ),
    http.post(`${TEST_SEARCH_ENDPOINT}/indexes/novatech-docs-v1/docs/search.post.1`,
      () => HttpResponse.json(buildSearchResponse(searchChunks))
    ),
    http.post(`${TEST_OPENAI_ENDPOINT}/openai/deployments/gpt-4o/chat/completions`,
      () => HttpResponse.json(buildCompletionResponse(completionText))
    )
  );
}
```

---

## Cenários Obrigatórios para Endpoint RAG

1. **Happy path** — pergunta válida → HTTP 200 com `sources` não vazio
2. **CONF-01** — chunks v1 e v2 presentes → v1 marcado `isObsolete`, não aparece em `sources`
3. **CONF-02** — normativo + FAQ cobrem o mesmo assunto → normativo aparece em `sources`
4. **Input inválido** — HTTP 400 sem stack trace
5. **Falha Azure** — HTTP 500 com `internal_error` sem detalhes

---

## Regras msw

- `onUnhandledRequest: 'error'` — qualquer chamada não interceptada falha o teste
- `afterEach(() => server.resetHandlers())` — nunca compartilhar estado entre testes
- Chunks de mock devem vir de `tests/fixtures/chunks.ts` — nunca inline
