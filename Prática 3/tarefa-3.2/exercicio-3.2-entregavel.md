# Exercício 3.2 — Revisão Crítica de Código Gerado por IA

**Papel:** Desenvolvedor  
**Tópico:** Revisão Crítica de Outputs de IA  
**Ferramentas utilizadas:** Revisão humana (Step 1) + Claude (Step 2) + GitHub Copilot (Step 3)  
**Arquivo produzido:** `src/functions/feedback/handler.ts`

---

## Step 1 — Revisão Humana (ANTES do Claude)

> Revisão feita manualmente antes de qualquer uso do Claude. Os problemas foram identificados com base nas convenções do AGENTS.md e no conhecimento do domínio do projeto.

### AGENTS.md — Convenções do projeto (referência)

| # | Regra |
|---|-------|
| 1 | TypeScript strict mode — sem `as any`, tipos explícitos obrigatórios |
| 2 | Zod para validação de input em todos os endpoints |
| 3 | `pino` para logging — nunca `console.log` ou `console.error` |
| 4 | Nunca logar dados pessoais: e-mail, nome, CPF, telefone |
| 5 | Imports estáticos no topo do arquivo — nunca `require()` dinâmico dentro de funções |

### Código analisado

```typescript
// feedback-handler.ts — gerado pelo Copilot
import { app, HttpRequest, HttpResponseInit } from '@azure/functions';

export async function feedbackHandler(
  request: HttpRequest
): Promise<HttpResponseInit> {
  const body = await request.json() as any;             // linha 8

  const feedback = {
    queryId: body.queryId,
    rating: body.rating,
    comment: body.comment,
    attendantEmail: body.attendantEmail,
    timestamp: new Date().toISOString()
  };

  console.log('Feedback recebido:', JSON.stringify(feedback));  // linha 14

  const { CosmosClient } = require('@azure/cosmos');            // linha 16
  const client = new CosmosClient(process.env.COSMOS_CONNECTION_STRING);
  const database = client.database('novatech');
  const container = database.container('feedbacks');

  await container.items.create(feedback);

  return { status: 200, body: 'OK' };
}

app.http('feedback', {
  methods: ['POST'],
  handler: feedbackHandler
});
```

### Problemas identificados na revisão humana

| # | Linha(s) | Trecho afetado | Descrição | Classificação | Impacto |
|---|----------|----------------|-----------|---------------|---------|
| 1 | 8 | `const body = await request.json() as any` | `as any` bypassa o type-checker e nenhum schema Zod valida o payload de entrada | Violação AGENTS.md + bug potencial | Qualquer payload malformado (campos ausentes, tipos errados) chega ao CosmosDB sem rejeição; campos como `rating` podem ser string em vez de number sem que o sistema perceba |
| 2 | 14 | `console.log('Feedback recebido:', JSON.stringify(feedback))` | Uso de `console.log` em vez de `pino` | Violação AGENTS.md | Logs não são capturados pelo pipeline de observabilidade da NovaTech; não há nível estruturado (info/warn/error), dificultando alertas e rastreabilidade |
| 3 | 16 | `const { CosmosClient } = require('@azure/cosmos')` | Import dinâmico com `require()` dentro da função em vez de import estático no topo | Violação AGENTS.md | O módulo é importado a cada requisição (overhead de performance e resolução de módulo por chamada); viola a convenção de organização e dificulta análise estática e tree-shaking |
| 4 | 9–14 | Objeto `feedback` com `attendantEmail` serializado em `JSON.stringify` | O campo `attendantEmail` (dado pessoal — e-mail do atendente) é serializado e logado integralmente no `console.log` | Violação AGENTS.md + problema de segurança | E-mail de funcionário exposto em logs; em ambientes com agregação de logs (ex: Application Insights, Splunk), dado pessoal fica indexado e potencialmente acessível por qualquer pessoa com acesso aos logs |

---

## Step 2 — Revisão Claude (independente)

### Prompt enviado ao Claude

> Faça uma revisão de código do módulo `feedback-handler.ts` abaixo, gerado pelo GitHub Copilot. O contexto é um endpoint Azure Functions para receber feedback de atendentes sobre respostas do assistente de IA da NovaTech.
>
> **AGENTS.md do projeto (convenções obrigatórias):**
> - TypeScript strict mode — sem `as any`, tipos explícitos obrigatórios
> - Zod para validação de input em todos os endpoints
> - `pino` para logging — nunca `console.log` ou `console.error`
> - Nunca logar dados pessoais: e-mail, nome, CPF, telefone
> - Imports estáticos no topo do arquivo — nunca `require()` dinâmico dentro de funções
>
> Para cada problema encontrado, informe: a linha ou trecho afetado, a descrição do problema, a classificação (`violação AGENTS.md` / `problema de segurança` / `bug potencial`), e o impacto se não corrigido.
>
> ```typescript
> // feedback-handler.ts — gerado pelo Copilot
> import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
>
> export async function feedbackHandler(
>   request: HttpRequest
> ): Promise<HttpResponseInit> {
>   const body = await request.json() as any;
>
>   const feedback = {
>     queryId: body.queryId,
>     rating: body.rating,
>     comment: body.comment,
>     attendantEmail: body.attendantEmail,
>     timestamp: new Date().toISOString()
>   };
>
>   console.log('Feedback recebido:', JSON.stringify(feedback));
>
>   const { CosmosClient } = require('@azure/cosmos');
>   const client = new CosmosClient(process.env.COSMOS_CONNECTION_STRING);
>   const database = client.database('novatech');
>   const container = database.container('feedbacks');
>
>   await container.items.create(feedback);
>
>   return { status: 200, body: 'OK' };
> }
>
> app.http('feedback', {
>   methods: ['POST'],
>   handler: feedbackHandler
> });
> ```

---

### Resposta do Claude (completa)

Revisão do `feedback-handler.ts` gerado pelo Copilot, classificando os problemas por linha e categoria:

---

**Problema 1 — `as any` sem validação Zod**
**Linha:** 8 — `const body = await request.json() as any`
**Classificação:** Violação AGENTS.md + bug potencial
**Descrição:** O cast `as any` desabilita completamente a verificação de tipos para o `body`. Além da violação ao TypeScript strict mode, nenhum schema Zod está sendo aplicado para validar o payload recebido. Isso significa que campos obrigatórios como `queryId` ou `rating` podem estar ausentes, ter tipos incorretos (ex: `rating` como string `"5"` em vez de número `5`), ou mesmo conter valores maliciosos — e o código não detecta nem rejeita.

**Impacto se não corrigido:** Payloads inválidos chegam intactos ao CosmosDB, causando inconsistência nos dados; não há retorno de erro 400 para o cliente — a função silenciosamente aceita e persiste dados corrompidos.

---

**Problema 2 — `console.log` em vez de `pino`**
**Linha:** 14 — `console.log('Feedback recebido:', JSON.stringify(feedback))`
**Classificação:** Violação AGENTS.md
**Descrição:** O AGENTS.md é explícito: `pino` para logging, nunca `console.log` ou `console.error`. O `console.log` não produz logs estruturados (JSON com `level`, `time`, `name`), não integra com o pipeline de observabilidade do projeto, e não suporta níveis semânticos diferenciados (info vs warn vs error).

**Impacto se não corrigido:** Logs invisíveis ao sistema de alertas; em produção, eventos relevantes passam despercebidos; rastreabilidade comprometida em incidentes.

---

**Problema 3 — `require()` dinâmico dentro da função**
**Linha:** 16 — `const { CosmosClient } = require('@azure/cosmos')`
**Classificação:** Violação AGENTS.md
**Descrição:** O import do `@azure/cosmos` é feito com `require()` dinâmico dentro do corpo da função, sendo executado a cada requisição HTTP. O AGENTS.md exige imports estáticos no topo do arquivo. Além da violação da convenção, o `require()` dinâmico:
- Cria overhead por execução (resolução de módulo repetida, embora o Node.js faça cache)
- Impede análise estática e tree-shaking
- Dificulta detecção de dependências ausentes na inicialização — um erro de módulo só aparece em tempo de execução

**Impacto se não corrigido:** Violação silenciosa de convenção; erros de dependência só aparecem em runtime, não em startup; instância do `CosmosClient` criada por requisição em vez de uma vez no módulo.

---

**Problema 4 — `attendantEmail` serializado e logado (dado pessoal)**
**Linha:** 9–14 (objeto `feedback`) + 14 (log)
**Classificação:** Violação AGENTS.md + problema de segurança
**Descrição:** O objeto `feedback` inclui `attendantEmail` (e-mail do atendente — dado pessoal). O `JSON.stringify(feedback)` no `console.log` serializa o objeto inteiro, incluindo o e-mail. O AGENTS.md proíbe explicitamente logar dados pessoais (e-mail, nome, CPF, telefone).

**Impacto se não corrigido:** E-mails de funcionários ficam indexados nos logs; em pipelines com retenção de longo prazo (Application Insights, Splunk) isso viola políticas internas de privacidade e pode conflitar com LGPD (Lei 13.709/2018), que exige controle sobre o registro de dados pessoais.

---

**Problema 5 — `process.env.COSMOS_CONNECTION_STRING` não validado**
**Linha:** 17 — `new CosmosClient(process.env.COSMOS_CONNECTION_STRING)`
**Classificação:** Bug potencial
**Descrição:** `process.env.COSMOS_CONNECTION_STRING` retorna `string | undefined`. O TypeScript com strict mode deveria apontar isso como erro, mas o `as any` da linha 8 pode ter suprimido parte da atenção a erros de tipo no arquivo. Se a variável de ambiente não estiver configurada, o `CosmosClient` recebe `undefined` (coercionado para string `"undefined"`), causando falha em runtime durante a conexão com o banco — não na inicialização do módulo.

**Impacto se não corrigido:** Erros de conexão ao CosmosDB apenas na primeira tentativa de escrita, não na inicialização da função; diagnóstico mais difícil em produção.

---

**Problema 6 — Ausência de tratamento de erro nas operações assíncronas**
**Linha:** 22 — `await container.items.create(feedback)` + 6 — `await request.json() as any`
**Classificação:** Bug potencial
**Descrição:** Nenhum dos dois `await` está envolto em `try/catch`. Um erro no CosmosDB (ex: timeout, quota excedida, conflito de documento) ou um JSON malformado na requisição vão lançar uma exceção não capturada, que o Azure Functions converte em resposta 500 sem nenhum log estruturado ou mensagem controlada ao cliente.

**Impacto se não corrigido:** Erros de infraestrutura chegam ao cliente como 500 genérico sem corpo; nenhum log de erro é emitido pelo código (apenas o runtime do Azure Functions loga a exceção bruta); rastreabilidade comprometida.

---

### Tabela comparativa: humano vs. Claude

| Problema | Linha | Encontrado pelo humano | Encontrado pelo Claude |
|----------|-------|------------------------|------------------------|
| `as any` sem validação Zod | 8 | ✓ | ✓ |
| `console.log` em vez de pino | 14 | ✓ | ✓ |
| `require` dinâmico | 16 | ✓ | ✓ |
| `attendantEmail` logado (dado pessoal) | 9–14 | ✓ | ✓ |
| `COSMOS_CONNECTION_STRING` não validado | 17 | ✗ | ✓ |
| Ausência de `try/catch` nas operações assíncronas | 6, 22 | ✗ | ✓ |

### Análise da comparação

**O que a revisão humana capturou e o Claude também:**
Os 4 problemas mínimos exigidos pelo exercício foram identificados por ambas as abordagens com descrições equivalentes. Não houve divergência nos problemas mais óbvios — os marcadores no AGENTS.md (`as any`, `console.log`, `require`, dado pessoal) são conspícuos o suficiente para serem capturados manualmente.

**O que o Claude capturou que a revisão humana não capturou:**
- **`COSMOS_CONNECTION_STRING` não validado (Problema 5):** A revisão humana focou nos problemas mais visíveis relacionados ao AGENTS.md. A ausência de validação da variável de ambiente é um problema de robustez que exige atenção ao tipo de retorno de `process.env` — algo que o Claude capturou por analisar o fluxo de dados sistematicamente.
- **Ausência de `try/catch` (Problema 6):** A revisão humana não listou ausência de tratamento de erro como problema explícito. O Claude identificou que ambos os `await` podem lançar exceções não controladas, caracterizando um bug potencial em produção.

**O que a revisão humana capturou que o Claude não capturou:**
Nenhum problema exclusivo da revisão humana neste caso. Todos os 4 problemas da revisão manual foram confirmados pelo Claude.

**Conclusão — em que tipo de problema cada abordagem foi mais eficaz:**

| Abordagem | Melhor em |
|-----------|-----------|
| **Revisão humana** | Problemas com marcadores explícitos no AGENTS.md; captura rápida de violações de convenção quando as regras são conhecidas; suficiente para os 4 problemas mínimos |
| **Claude** | Análise sistemática de fluxo de dados (variáveis de ambiente, propagação de tipos, caminhos de erro); identifica bugs potenciais que não estão no checklist explícito; cobertura mais ampla em menos tempo |

A revisão humana é mais rápida quando o revisor conhece bem o AGENTS.md. O Claude agrega valor nos problemas que exigem rastreamento de fluxo ou que estão fora do checklist consciente do revisor — como validação de env vars e ausência de error handling.

---

## Step 3 — Código Reescrito

Ver arquivo completo em [src/functions/feedback/handler.ts](src/functions/feedback/handler.ts).

### Correções aplicadas

| # | Problema | Antes | Depois |
|---|----------|-------|--------|
| 1 | `as any` sem Zod | `const body = await request.json() as any` | `FeedbackSchema.safeParse(raw)` com schema Zod tipado |
| 2 | `console.log` | `console.log('Feedback recebido:', ...)` | `logger.info({ queryId, rating, timestamp }, ...)` com pino |
| 3 | `require` dinâmico | `const { CosmosClient } = require('@azure/cosmos')` | `import { CosmosClient } from '@azure/cosmos'` no topo |
| 4 | Dado pessoal logado | `JSON.stringify(feedback)` (inclui `attendantEmail`) | Log com campos selecionados: apenas `queryId`, `rating`, `timestamp` |
| 5 | Env var não validada | `new CosmosClient(process.env.COSMOS_CONNECTION_STRING)` | Validação explícita com `throw` se undefined; `client` instanciado uma vez no módulo |
| 6 | Sem tratamento de erro | `await request.json() as any` e `await container.items.create(...)` sem try/catch | Ambos envoltos em `try/catch` com `logger.error` e resposta HTTP controlada |

### Código antes vs. depois

**Antes (Copilot — com problemas):**

```typescript
// feedback-handler.ts — gerado pelo Copilot
import { app, HttpRequest, HttpResponseInit } from '@azure/functions';

export async function feedbackHandler(
  request: HttpRequest
): Promise<HttpResponseInit> {
  const body = await request.json() as any;

  const feedback = {
    queryId: body.queryId,
    rating: body.rating,
    comment: body.comment,
    attendantEmail: body.attendantEmail,
    timestamp: new Date().toISOString()
  };

  console.log('Feedback recebido:', JSON.stringify(feedback));

  const { CosmosClient } = require('@azure/cosmos');
  const client = new CosmosClient(process.env.COSMOS_CONNECTION_STRING);
  const database = client.database('novatech');
  const container = database.container('feedbacks');

  await container.items.create(feedback);

  return { status: 200, body: 'OK' };
}

app.http('feedback', {
  methods: ['POST'],
  handler: feedbackHandler
});
```

**Depois (reescrito — conforme AGENTS.md):**

```typescript
// feedback-handler.ts — reescrito com GitHub Copilot após code review (Exercício 3.2 / Step 3)
import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';
import { z } from 'zod';
import pino from 'pino';

const logger = pino({ name: 'feedback-handler' });

const COSMOS_CONNECTION_STRING = process.env.COSMOS_CONNECTION_STRING;
if (!COSMOS_CONNECTION_STRING) {
  throw new Error('COSMOS_CONNECTION_STRING environment variable is not set');
}

const client = new CosmosClient(COSMOS_CONNECTION_STRING);
const container = client.database('novatech').container('feedbacks');

const FeedbackSchema = z.object({
  queryId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
  attendantEmail: z.string().email(),
});

type FeedbackInput = z.infer<typeof FeedbackSchema>;

interface FeedbackRecord extends FeedbackInput {
  timestamp: string;
}

export async function feedbackHandler(
  request: HttpRequest
): Promise<HttpResponseInit> {
  let raw: unknown;

  try {
    raw = await request.json();
  } catch {
    logger.warn({ reason: 'invalid_json' }, 'Request body is not valid JSON');
    return { status: 400, body: 'Invalid request body' };
  }

  const parsed = FeedbackSchema.safeParse(raw);
  if (!parsed.success) {
    logger.warn(
      { reason: 'schema_invalid', issues: parsed.error.issues },
      'Feedback payload rejected by schema validation'
    );
    return { status: 400, body: 'Invalid feedback payload' };
  }

  const record: FeedbackRecord = {
    ...parsed.data,
    timestamp: new Date().toISOString(),
  };

  // Log feedback receipt omitting personal data (attendantEmail is PII — AGENTS.md)
  logger.info(
    { queryId: record.queryId, rating: record.rating, timestamp: record.timestamp },
    'Feedback recebido'
  );

  try {
    await container.items.create(record);
  } catch (err) {
    logger.error({ reason: 'cosmos_write_error', err }, 'Failed to persist feedback to CosmosDB');
    return { status: 500, body: 'Internal server error' };
  }

  return { status: 200, body: 'OK' };
}

app.http('feedback', {
  methods: ['POST'],
  handler: feedbackHandler,
});
```

---

## Critérios de avaliação — verificação

| Critério | Status | Evidência |
|----------|--------|-----------|
| Identificado: `as any` sem validação Zod | ✓ | Revisão humana (Prob. 1) + Claude (Prob. 1) — ambos com classificação e impacto |
| Identificado: `console.log` em vez de pino | ✓ | Revisão humana (Prob. 2) + Claude (Prob. 2) |
| Identificado: `require` dinâmico | ✓ | Revisão humana (Prob. 3) + Claude (Prob. 3) |
| Identificado: `attendantEmail` (dado pessoal) logado | ✓ | Revisão humana (Prob. 4) + Claude (Prob. 4) |
| Comparação humano vs. Claude é honesta | ✓ | Tabela comparativa registra 2 problemas capturados apenas pelo Claude; não omite divergências |
| Código reescrito resolve os problemas e segue o AGENTS.md | ✓ | `src/functions/feedback/handler.ts` — Zod, pino, import estático, sem dado pessoal em log, try/catch |
