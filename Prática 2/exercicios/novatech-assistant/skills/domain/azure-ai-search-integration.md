# Azure AI Search Integration — NovaTech Assistant

> **Herda de:** `typescript-conventions.md` + `error-handling.md`  
> **Escopo:** Todo módulo que interage com o índice `novatech-docs-v1`.  
> **Criado por:** Dev Sênior | **Consumido por:** Dev Pleno + Copilot | **Frequência:** Por módulo de busca

---

## Contexto

Padrões para integração com Azure AI Search no projeto NovaTech. Sem esta skill, o Copilot usa a API REST direta em vez do SDK, usa `as any` na leitura de resultados, e não implementa a lógica de deduplicação de versões de documentos (CONF-01).

---

## Padrão de Implementação

### Tipo genérico do índice

Sempre declarar interface que descreve o schema do índice:

```typescript
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
```

### Criação do cliente

```typescript
import { SearchClient, AzureKeyCredential } from '@azure/search-documents';
import { config } from '@/shared/config';

const client = new SearchClient<NovaTechDocumentIndex>(
  config.AZURE_SEARCH_ENDPOINT,
  config.AZURE_SEARCH_INDEX_NAME,
  new AzureKeyCredential(config.AZURE_SEARCH_API_KEY)
);
```

### Busca vetorial (`top=5` padrão)

```typescript
const response = await client.search('*', {
  vectorSearchOptions: {
    queries: [{
      kind: 'vector',
      vector: embeddingVector,
      kNearestNeighborsCount: 5,
      fields: ['contentVector']
    }]
  },
  select: ['id', 'documentId', 'chunkId', 'title', 'content', 'version', 'documentType'],
  top: 5
});

for await (const result of response.results) {
  // result.document é NovaTechDocumentIndex — totalmente tipado
  process(result.document, result.score ?? 0);
}
```

---

## Lógica de Deduplicação de Versões (CONF-01)

**Obrigatória** sempre que o índice puder retornar PROC-042 v1 e v2 simultaneamente.

```typescript
const V2_EFFECTIVE_DATE = '2023-12-01';

function resolveProc042Version(
  chunks: NovaTechDocumentIndex[],
  chamadoDataAbertura?: string
): { resolved: NovaTechDocumentIndex[]; versionWarning: boolean } {
  const hasV1 = chunks.some(c => c.documentId === 'PROC-042');
  const hasV2 = chunks.some(c => c.documentId === 'PROC-042-v2');

  if (!(hasV1 && hasV2)) return { resolved: chunks, versionWarning: false };

  const useV2 = !chamadoDataAbertura || chamadoDataAbertura >= V2_EFFECTIVE_DATE;
  const versionWarning = !chamadoDataAbertura;

  return {
    resolved: chunks.filter(c => {
      if (c.documentId === 'PROC-042') return !useV2;     // v1: incluir apenas se useV2=false
      if (c.documentId === 'PROC-042-v2') return useV2;   // v2: incluir apenas se useV2=true
      return true;                                          // outros documentos: sempre incluir
    }),
    versionWarning
  };
}
```

---

## Checklist de Implementação

- [ ] `SearchClient<NovaTechDocumentIndex>` com tipo genérico explícito
- [ ] `top=5` como padrão (nunca `top > 8` sem revisão de budget ADR-0002)
- [ ] Retry com backoff exponencial em erros 5xx e 429
- [ ] Sem retry em erros 400, 401, 403, 404
- [ ] Lógica de deduplicação PROC-042 v1/v2 quando relevante
- [ ] Log pino: `{ query_length, top_k, result_count, latency_ms }`
- [ ] `AzureKeyCredential` — nunca hardcoded, sempre de `config`
