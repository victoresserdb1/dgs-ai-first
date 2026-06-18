# Azure Functions Endpoint — NovaTech Assistant

> **Herda de:** `typescript-conventions.md` + `error-handling.md`  
> **Escopo:** Todo novo endpoint HTTP em `src/functions/`.  
> **Criado por:** Dev Sênior | **Consumido por:** Dev Pleno + Copilot | **Frequência:** Por novo endpoint

---

## Contexto

Padrão para criar Azure Functions HTTP triggers v4 no projeto NovaTech. O Copilot sem esta skill gera código Azure Functions v3 (model antigo), usa `context.res = {}` em vez do return pattern v4, e não registra o handler com `app.http(...)`.

---

## Estrutura de Arquivos por Endpoint

```
src/functions/[endpoint-name]/
├── handler.ts          ← HTTP trigger + registro app.http()
├── validator.ts        ← Schemas Zod (QueryInputSchema, QueryOutputSchema)
└── response-builder.ts ← Montagem do output (separado do handler)
```

---

## Template do Handler (Azure Functions v4)

```typescript
import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions';
import { ZodError } from 'zod';
import { logger } from '@/shared/logger';
import { NovaTechError } from '@/shared/errors';
import { MyInputSchema, type MyInput } from './validator';

// 1. Declarar handler como função nomeada exportada
export async function myEndpointHandler(
  req: HttpRequest,
  _context: InvocationContext
): Promise<HttpResponseInit> {
  const requestId = crypto.randomUUID();

  // 2. Validação de input (sempre separada da lógica de negócio)
  let input: MyInput;
  try {
    input = MyInputSchema.parse(await req.json() as unknown);
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

  // 3. Log de entrada (sem dados sensíveis)
  logger.info({ requestId, /* campos relevantes sem PII */ }, 'endpoint_start');

  // 4. Lógica de negócio com error handling separado
  try {
    const output = await processMyEndpoint(input);
    logger.info({ requestId, statusCode: 200 }, 'endpoint_complete');
    return { status: 200, jsonBody: output };
  } catch (error: unknown) {
    logger.error({
      requestId,
      errorCode: (error instanceof NovaTechError) ? error.code : 'unknown_error'
    }, 'endpoint_error');
    return { status: 500, jsonBody: { error: 'internal_error', requestId } };
  }
}

// 5. Registro no final do arquivo (fora da função)
app.http('my-endpoint', {
  methods: ['POST'],  // ou ['GET'] conforme o caso
  authLevel: 'anonymous',
  handler: myEndpointHandler
});
```

---

## Regras para Validators (`validator.ts`)

```typescript
import { z } from 'zod';
import { SourceDocumentSchema, TokenUsageSchema } from '@/shared/types';  // tipos compartilhados

// Sempre derivar tipos via z.infer — nunca duplicar interfaces
export const MyInputSchema = z.object({
  field: z.string().min(1).max(2000),
  optionalId: z.string().uuid().optional()
});
export type MyInput = z.infer<typeof MyInputSchema>;

export const MyOutputSchema = z.object({
  result: z.string(),
  requestId: z.string().uuid()
});
export type MyOutput = z.infer<typeof MyOutputSchema>;
```

---

## Checklist de Criação de Endpoint

- [ ] Handler registrado com `app.http(...)` (Azure Functions v4 — não `app.httpTrigger`)
- [ ] Validação de input usa Zod com `safeParse` ou `parse` em try/catch
- [ ] HTTP 400 para ZodError com `error.issues` formatados
- [ ] HTTP 500 para erros internos com apenas `{ error: 'internal_error', requestId }`
- [ ] Log de entrada sem dados sensíveis do usuário
- [ ] Log de saída com `statusCode`, `duration_ms` e IDs de rastreio
- [ ] Tipos exportados via `z.infer<typeof Schema>` — sem interfaces duplicadas
