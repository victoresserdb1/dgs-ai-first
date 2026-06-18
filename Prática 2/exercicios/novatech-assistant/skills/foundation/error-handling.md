# Error Handling — NovaTech Assistant

> **Herda de:** `typescript-conventions.md`  
> **Escopo:** Todo código em `src/` que faz chamadas a APIs externas ou recebe input de usuário.  
> **Criado por:** Dev Sênior | **Consumido por:** Dev Pleno + Dev Sênior + Copilot

---

## Contexto

Padrões obrigatórios de tratamento de erros no projeto NovaTech Assistant. Sem esta skill, o Copilot gera error handling genérico que: expõe detalhes internos em respostas HTTP, usa `catch (e: any)` sem type narrowing, e mistura erros de validação com erros de infraestrutura.

---

## Hierarquia de Erros Customizados

```
NovaTechError (base — src/shared/errors.ts)
├── ValidationError      — input inválido do usuário (sempre HTTP 400)
├── AzureSearchError     — falha no Azure AI Search (HTTP 500)
└── AzureOpenAIError     — falha no Azure OpenAI (HTTP 500)
```

**Regra:** Todo erro de negócio deve ser uma instância de `NovaTechError`. Erros desconhecidos (`unknown`) são convertidos para `NovaTechError` antes de propagar.

---

## Regras Prescritivas

### 1. Distinção HTTP 400 vs HTTP 500

| Tipo de Erro | Status HTTP | Inclui detalhes na resposta? |
|---|---|---|
| `ZodError` (input inválido) | **400** | Sim — `error.issues` formatados (sem stack trace) |
| `ValidationError` | **400** | Sim — `issues` do ValidationError |
| `AzureSearchError`, `AzureOpenAIError` | **500** | **Não** — apenas `{ error: 'internal_error', requestId }` |
| Qualquer outra exceção | **500** | **Não** — apenas `{ error: 'internal_error', requestId }` |

**NUNCA expor stack trace em respostas de produção.**

### 2. Padrão para Handlers Azure Functions v4

```typescript
export async function myHandler(req: HttpRequest): Promise<HttpResponseInit> {
  const requestId = crypto.randomUUID();

  // 1. Validação de input — ZodError → HTTP 400
  try {
    const body = await req.json() as unknown;
    const input = MyInputSchema.parse(body);
    // ...
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return {
        status: 400,
        jsonBody: {
          error: 'validation_error',
          details: error.issues.map(i => ({ path: i.path.join('.'), message: i.message })),
          requestId
        }
      };
    }
    // JSON malformado ou outro erro de parse
    return { status: 400, jsonBody: { error: 'invalid_request', requestId } };
  }

  // 2. Lógica de negócio — qualquer exceção → HTTP 500
  try {
    // ... chamadas ao Azure, processamento
    return { status: 200, jsonBody: output };
  } catch (error: unknown) {
    logger.error({
      requestId,
      errorCode: (error instanceof NovaTechError) ? error.code : 'unknown_error',
      errorName: (error instanceof Error) ? error.name : 'UnknownError'
    }, 'handler_error');

    return {
      status: 500,
      jsonBody: { error: 'internal_error', requestId }
    };
  }
}
```

### 3. Padrão para Erros de Validação Zod

```typescript
// ✅ DO: extrair issues e formatar como array legível
const details = error.issues.map(i => ({
  path: i.path.join('.'),
  message: i.message
}));
return { status: 400, jsonBody: { error: 'validation_error', details, requestId } };

// ❌ DON'T: retornar o ZodError bruto (inclui stack trace)
return { status: 400, jsonBody: { error: error } };

// ❌ DON'T: retornar apenas a mensagem string
return { status: 400, jsonBody: { error: error.message } };
```

### 4. Padrão para Erros de API Azure

```typescript
// ✅ DO: converter erro do SDK para NovaTechError antes de propagar
try {
  return await azureClient.search(query);
} catch (error: unknown) {
  if (error instanceof AzureSearchError) throw error; // já convertido, propagar

  const httpError = error as { statusCode?: number; message?: string };
  throw new AzureSearchError(
    `Falha na busca vetorial: ${httpError.message ?? 'erro desconhecido'}`,
    httpError.statusCode
  );
}

// ❌ DON'T: propagar erro do SDK diretamente para o handler
throw error;  // handler não sabe que tipo é, perde o statusCode para decisão de retry
```

### 5. Regra: Nunca Expor Stack Trace

```typescript
// ❌ DON'T: expor detalhes internos
return {
  status: 500,
  jsonBody: {
    error: error.message,     // pode conter URL interna do Azure
    stack: error.stack        // expõe estrutura do código
  }
};

// ✅ DO: apenas requestId para correlação com logs
return {
  status: 500,
  jsonBody: { error: 'internal_error', requestId }
};
// O requestId permite ao time de ops correlacionar com os logs do Application Insights
```

---

## Exemplos DO/DON'T

### DO ✓ — Error handling completo em handler

```typescript
import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions';
import { ZodError } from 'zod';
import { logger } from '@/shared/logger';
import { NovaTechError } from '@/shared/errors';
import { FeedbackInputSchema } from './validator';

async function feedbackHandler(req: HttpRequest): Promise<HttpResponseInit> {
  const requestId = crypto.randomUUID();

  let input;
  try {
    input = FeedbackInputSchema.parse(await req.json() as unknown);
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return {
        status: 400,
        jsonBody: {
          error: 'validation_error',
          details: error.issues.map(i => ({ path: i.path.join('.'), message: i.message })),
          requestId
        }
      };
    }
    return { status: 400, jsonBody: { error: 'invalid_request', requestId } };
  }

  try {
    await saveFeedback(input);
    return { status: 201, jsonBody: { success: true, requestId } };
  } catch (error: unknown) {
    logger.error({
      requestId,
      errorCode: (error instanceof NovaTechError) ? error.code : 'unknown_error'
    }, 'feedback_save_error');
    return { status: 500, jsonBody: { error: 'internal_error', requestId } };
  }
}
```

### DON'T ✗ — Padrões que o Copilot gera sem esta skill

```typescript
// ❌ 1. Expõe detalhes de erro internos
return { status: 500, jsonBody: { error: e.message } };  // pode vazar URL do Azure

// ❌ 2. catch (e: any) sem type narrowing
} catch (e: any) {
  if (e.code === 'ECONNREFUSED') { ... }  // e.code pode ser undefined — falha silenciosa
}

// ❌ 3. ZodError bruta na resposta (inclui stack e paths internos)
return { status: 400, jsonBody: { error: zodError } };

// ❌ 4. Mistura de erros de validação e infraestrutura no mesmo catch
try {
  const input = Schema.parse(body);
  await callAzure(input);
} catch (e) {
  return { status: 400, jsonBody: { error: e.message } };
  // Erros do Azure (503) retornam 400 — tipo errado
}
```
