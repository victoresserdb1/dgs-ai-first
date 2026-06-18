# Revisão Crítica — Código Gerado pelo Copilot
## Entregável da TAREFA-15

> **Metodologia:** Durante a implementação das TAREFA-06 a TAREFA-11, o Copilot gerou sugestões de código que foram aceitas parcialmente. Esta revisão documenta os problemas reais identificados antes da versão final, com trechos "antes" (gerado pelo Copilot) e "depois" (corrigido).

---

## Problema #1: `as any` para contornar tipagem do SDK `@azure/search-documents`

### Risco
O Copilot gerou `as any` na leitura do resultado da busca vetorial porque não conhecia os tipos genéricos do SDK `@azure/search-documents`. Isso remove a proteção de tipos em tempo de compilação para um dos pontos mais críticos do sistema: a leitura dos chunks do índice. Um campo renomeado no índice Azure passaria despercebido até runtime.

### Código original (gerado pelo Copilot)
```typescript
// ❌ Copilot usa 'as any' para evitar erros de tipo do SDK
const response = await client.search('*', vectorOptions);

for await (const result of response.results) {
  const doc = result.document as any;  // perde tipagem aqui
  accumulated.push({
    documentId: doc.documentId,        // nenhuma proteção se o campo não existir
    content: doc.content,
    score: result.score ?? 0
  });
}
```

### Código corrigido
```typescript
// ✅ Tipo genérico explícito — o compilador valida todos os acessos de campo
interface NovaTechDocumentIndex {
  id: string;
  documentId: string;
  chunkId: string;
  title: string;
  content: string;
  version: string;
  vigencia_inicio?: string;
  vigencia_fim?: string;
  documentType: 'normative' | 'faq' | 'procedure' | 'sla';
  contentVector: number[];
}

const client = new SearchClient<NovaTechDocumentIndex>(
  config.AZURE_SEARCH_ENDPOINT,
  config.AZURE_SEARCH_INDEX_NAME,
  new AzureKeyCredential(config.AZURE_SEARCH_API_KEY)
);

for await (const result of response.results) {
  // result.document agora é do tipo NovaTechDocumentIndex — TypeScript valida tudo
  accumulated.push({
    documentId: result.document.documentId,  // erro de compilação se o campo não existir
    content: result.document.content,
    score: result.score ?? 0
  });
}
```

### Por que é um problema real
Com `as any`, se o índice Azure AI Search tiver um campo renomeado de `documentId` para `doc_id`, o código compilará sem erros mas falhará silenciosamente em runtime — retornando `undefined` em vez de um erro detectável. Em produção, isso geraria respostas do assistente sem `sources`, violando o critério `sources nunca vazio`.

---

## Problema #2: `console.log` em vez de logger estruturado (pino)

### Risco
O Copilot inseriu `console.log` e `console.error` em múltiplos pontos do handler e dos serviços. Em Azure Functions, logs via `console.log` aparecem no Application Insights sem contexto estruturado (sem `conversationId`, sem `requestId`), tornando a correlação de logs entre requisições praticamente impossível em produção.

### Código original (gerado pelo Copilot)
```typescript
// ❌ console.log sem estrutura — inútil para debugging em produção
export async function queryHandler(req: HttpRequest): Promise<HttpResponseInit> {
  console.log('Recebendo request:', req.method);  // sem conversationId, sem requestId

  try {
    const body = await req.json();
    console.log('Body recebido:', body);           // RISCO: loga a question completa (PII)
    
    // ...
  } catch (e: any) {                              // PROBLEMA EXTRA: e: any sem type guard
    console.error('Erro:', e.message);             // sem requestId para correlação
    return { status: 500, jsonBody: { error: e.message } };  // CRÍTICO: expõe detalhes internos
  }
}
```

### Código corrigido
```typescript
// ✅ logger pino com campos estruturados para correlação
export async function queryHandler(req: HttpRequest): Promise<HttpResponseInit> {
  const requestId = crypto.randomUUID();

  logger.info({ requestId, method: req.method }, 'query_request_received');

  try {
    const body = await req.json() as unknown;
    const input = QueryInputSchema.parse(body);

    // Log de entrada SEM a question completa (evitar PII em logs de info)
    logger.info({
      requestId,
      questionLength: input.question.length,  // apenas o tamanho, não o conteúdo
      hasHistory: (input.history?.length ?? 0) > 0
    }, 'query_input_validated');

    // ...
  } catch (error: unknown) {             // ✅ error: unknown + type guard
    logger.error({
      requestId,
      errorName: (error instanceof Error) ? error.name : 'UnknownError',
      errorCode: (error instanceof NovaTechError) ? error.code : 'unknown_error'
    }, 'query_request_error');

    // Resposta HTTP sem detalhes internos
    return {
      status: 500,
      jsonBody: { error: 'internal_error', requestId }
    };
  }
}
```

### Por que é um problema real
Dois problemas combinados no mesmo trecho:
1. **`console.log('Body recebido:', body)`** loga a `question` completa do usuário em texto plano no Application Insights — potencial PII (dados do atendente e pergunta sobre cliente específico).
2. **`return { error: e.message }`** expõe a mensagem de erro interna (ex: `"Connection refused to https://..."`) diretamente na resposta HTTP, revelando detalhes da infraestrutura Azure para o cliente — vulnerabilidade OWASP A05:2021 (Security Misconfiguration).

---

## Problema #3: Ausência de retry em chamadas ao Azure

### Risco
O Copilot não adicionou lógica de retry nas chamadas ao Azure AI Search e Azure OpenAI. Azure tem SLA de 99,9%, o que significa ~8h de downtime/ano distribuídos em falhas momentâneas de 503/429. Sem retry, qualquer falha transient resulta em HTTP 500 para o atendente.

### Código original (gerado pelo Copilot)
```typescript
// ❌ Sem retry — qualquer falha transient do Azure resulta em erro imediato
export async function createEmbedding(text: string): Promise<number[]> {
  const client = new OpenAIClient(endpoint, new AzureKeyCredential(apiKey));
  const result = await client.getEmbeddings(deployment, [text]); // se falhar, propaga diretamente
  return result.data[0].embedding;
}
```

### Código corrigido
```typescript
// ✅ Retry com backoff exponencial: 1s → 2s → 4s (máx 3 tentativas)
async function withExponentialBackoff<T>(
  operation: () => Promise<T>,
  maxAttempts = 3
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error: unknown) {
      lastError = error;
      const httpError = error as { status?: number };
      const status = httpError.status;

      // Falha rápida em 400, 401, 403, 404 — sem retry
      if (status !== undefined && [400, 401, 403, 404].includes(status)) {
        throw error;
      }

      if (attempt < maxAttempts) {
        const delayMs = Math.pow(2, attempt - 1) * 1000;
        logger.warn({ attempt, delayMs, status }, 'azure_openai_retry');
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastError;
}

export async function createEmbedding(text: string): Promise<number[]> {
  const client = new OpenAIClient(endpoint, new AzureKeyCredential(apiKey));
  const result = await withExponentialBackoff(() =>
    client.getEmbeddings(deployment, [text])
  );
  return result.data[0].embedding;
}
```

### Por que é um problema real
O critério de aceite TAREFA-10 exige explicitamente: *"Testes com mock: simular 2 falhas (503) seguidas de sucesso — validar que 3ª tentativa completa"*. Sem retry, esse critério nunca seria satisfeito. Na prática, throttling de Azure OpenAI (429) é frequente em períodos de alto uso — sem retry, o assistente falharia durante picos de atendimento.

---

## Resumo dos Problemas

| # | Problema | Arquivo | Tipo de Risco | Corrigido? |
|---|----------|---------|---------------|------------|
| 1 | `as any` na resposta do SDK Azure AI Search | `search.ts` | Perda de tipagem, falha silenciosa em runtime | ✅ Sim |
| 2 | `console.log` + exposição de detalhes de erro | `handler.ts` | PII em logs, OWASP A05 | ✅ Sim |
| 3 | Ausência de retry em chamadas ao Azure | `completion.ts`, `search.ts` | Disponibilidade (SLA) | ✅ Sim |
