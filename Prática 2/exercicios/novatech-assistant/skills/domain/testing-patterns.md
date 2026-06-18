# Testing Patterns — NovaTech Assistant

> **Herda de:** `typescript-conventions.md`  
> **Escopo:** Todo arquivo de teste em `tests/`.  
> **Criado por:** **QA** | **Consumido por:** Dev Pleno + Dev Sênior + Copilot | **Frequência:** Por módulo com testes

---

## Contexto

Padrões de teste definidos pelo QA para o projeto NovaTech. Sem esta skill, devs geram testes que: não testam casos negativos, usam mocks incompletos que deixam chamadas reais ao Azure, e não cobrem os cenários de conflito documental (CONF-01, CONF-02).

---

## Estrutura dos Testes

```
tests/
├── unit/           ← Zero chamadas externas. Mocks para tudo.
├── integration/    ← msw intercepta 100% das chamadas Azure.
├── e2e/            ← Fluxo completo. Uso criterioso (consome tokens).
└── fixtures/       ← Dados compartilhados (chunks.ts, queries.ts)
```

---

## Padrão de Teste Unitário (vitest)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks ANTES dos imports do módulo testado
vi.mock('@/shared/config', () => ({ config: { /* ... */ } }));
vi.mock('@/shared/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { functionUnderTest } from '@/services/my-service';

describe('functionUnderTest', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('deve [comportamento esperado] quando [condição]', () => {
    // Arrange
    const input = /* ... */;

    // Act
    const result = functionUnderTest(input);

    // Assert
    expect(result).toEqual(/* ... */);
  });
});
```

---

## Padrão de Teste de Integração com msw

```typescript
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());  // estado fresh por teste
afterAll(() => server.close());

it('cenário X', async () => {
  server.use(
    http.post('https://test-search.search.windows.net/...', () =>
      HttpResponse.json(buildSearchResponse(specificChunks))
    )
  );
  // ... assertions
});
```

---

## Cenários Obrigatórios por Tipo de Módulo

### Para endpoints query:
- [ ] Input vazio → HTTP 400 com `validation_error`
- [ ] CONF-01: v1 marcada `isObsolete` quando v2 disponível
- [ ] CONF-02: normativo (POL-*) tem precedência sobre FAQ
- [ ] Tier inexistente (Platinum) → resposta baseada em SLA-2024-A
- [ ] Pergunta sem cobertura → resposta sem valores inventados

### Para serviços de busca:
- [ ] Retry: 2 falhas (503) + 1 sucesso → completa corretamente
- [ ] Sem retry em 400/401/403/404
- [ ] `isObsolete: true` em chunks de versão obsoleta

### Para validators Zod:
- [ ] Cada campo inválido → ZodError com mensagem específica
- [ ] Body válido completo → parse sem exceção
- [ ] Zero mocks externos (teste puramente unitário)

---

## Fixtures

Usar `tests/fixtures/chunks.ts` para todos os chunks de teste — nunca criar chunks inline em arquivos de teste. Isso garante consistência e facilita a atualização quando o schema do índice mudar.

```typescript
import { POL_001_B, FAQ_03, FRETE_SUDESTE_POST_DEC_2023 } from '../../fixtures/chunks';
```
