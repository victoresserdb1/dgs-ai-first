import { config } from '@/shared/config';
import { AzureSearchError } from '@/shared/errors';
import { logger } from '@/shared/logger';
import { type SourceDocument } from '@/shared/types';
import { AzureKeyCredential, SearchClient } from '@azure/search-documents';

// ─── Tipos internos (schema do índice novatech-docs-v1) ──────────────────────

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

// ─── Tipos públicos ───────────────────────────────────────────────────────────

export interface SearchOptions {
  top?: number;
  chamadoDataAbertura?: string;
}

export interface DocumentSearchResult {
  chunks: SourceDocument[];
  versionWarning: boolean;
}

// ─── Constantes de negócio ────────────────────────────────────────────────────

const PROC_042_BASE = 'PROC-042';
const V2_EFFECTIVE_DATE = '2023-12-01';
const MAX_RETRIES = 3;

// ─── Retry com backoff exponencial ───────────────────────────────────────────

async function withExponentialBackoff<T>(
  operation: () => Promise<T>,
  maxAttempts = MAX_RETRIES
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error: unknown) {
      lastError = error;
      const httpError = error as { statusCode?: number };
      const status = httpError.statusCode;

      // Sem retry em erros 4xx, exceto 429 (rate limit)
      if (status !== undefined && status >= 400 && status < 500 && status !== 429) {
        throw error;
      }

      if (attempt < maxAttempts) {
        const delayMs = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
        logger.warn({ attempt, delayMs, statusCode: status }, 'azure_search_retry');
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
}

// ─── Lógica de deduplicação de versões (CONF-01: PROC-042 v1 vs v2) ──────────

function isProc042V2(documentId: string): boolean {
  const normalized = documentId.toLowerCase();
  return normalized.includes('-v2') || normalized.endsWith('v2');
}

interface TaggedDocument extends NovaTechDocumentIndex {
  score: number;
  isObsolete: boolean;
}

function deduplicateProc042(
  rawDocs: Array<NovaTechDocumentIndex & { score: number }>,
  chamadoDataAbertura?: string
): { docs: TaggedDocument[]; versionWarning: boolean } {
  const proc042Docs = rawDocs.filter(d => d.documentId.startsWith(PROC_042_BASE));
  const otherDocs = rawDocs.filter(d => !d.documentId.startsWith(PROC_042_BASE));

  if (proc042Docs.length === 0) {
    return {
      docs: otherDocs.map(d => ({ ...d, isObsolete: false })),
      versionWarning: false
    };
  }

  const hasV1 = proc042Docs.some(d => !isProc042V2(d.documentId));
  const hasV2 = proc042Docs.some(d => isProc042V2(d.documentId));

  // Sem conflito de versão: retornar como estão
  if (!(hasV1 && hasV2)) {
    return {
      docs: [...otherDocs, ...proc042Docs].map(d => ({ ...d, isObsolete: false })),
      versionWarning: false
    };
  }

  // Conflito detectado: determinar qual versão usar
  let useV2: boolean;
  let versionWarning = false;

  if (!chamadoDataAbertura) {
    // Sem data → usar v2 com aviso
    useV2 = true;
    versionWarning = true;
  } else {
    // Chamados a partir de 01/12/2023 → v2; anteriores → v1
    useV2 = chamadoDataAbertura >= V2_EFFECTIVE_DATE;
  }

  logger.info({
    hasV1,
    hasV2,
    useV2,
    chamadoDataAbertura: chamadoDataAbertura ?? 'não informada',
    versionWarning
  }, 'proc042_version_resolved');

  const taggedProc042: TaggedDocument[] = proc042Docs.map(d => ({
    ...d,
    isObsolete: isProc042V2(d.documentId) ? !useV2 : useV2
  }));

  return {
    docs: [
      ...otherDocs.map(d => ({ ...d, isObsolete: false })),
      ...taggedProc042
    ],
    versionWarning
  };
}

// ─── Função pública ───────────────────────────────────────────────────────────

export async function searchDocuments(
  vector: number[],
  options: SearchOptions = {}
): Promise<DocumentSearchResult> {
  const top = options.top ?? 5;
  const startTime = Date.now();

  const client = new SearchClient<NovaTechDocumentIndex>(
    config.AZURE_SEARCH_ENDPOINT,
    config.AZURE_SEARCH_INDEX_NAME,
    new AzureKeyCredential(config.AZURE_SEARCH_API_KEY)
  );

  try {
    const rawDocs = await withExponentialBackoff(async () => {
      const accumulated: Array<NovaTechDocumentIndex & { score: number }> = [];

      const response = await client.search('*', {
        vectorSearchOptions: {
          queries: [
            {
              kind: 'vector',
              vector,
              kNearestNeighborsCount: top,
              fields: ['contentVector']
            }
          ]
        },
        select: [
          'id', 'documentId', 'chunkId', 'title', 'content',
          'version', 'vigencia_inicio', 'vigencia_fim', 'documentType'
        ],
        top
      });

      for await (const result of response.results) {
        accumulated.push({
          ...result.document,
          score: result.score ?? 0
        });
      }

      return accumulated;
    });

    const { docs, versionWarning } = deduplicateProc042(rawDocs, options.chamadoDataAbertura);

    const chunks: SourceDocument[] = docs.map(doc => ({
      documentId: doc.documentId,
      title: doc.title,
      chunkId: doc.chunkId,
      snippet: doc.content.substring(0, 500),
      score: doc.score,
      version: doc.version,
      vigencia_inicio: doc.vigencia_inicio,
      vigencia_fim: doc.vigencia_fim,
      documentType: doc.documentType,
      isObsolete: doc.isObsolete
    }));

    logger.info({
      query_length: vector.length,
      top_k: top,
      result_count: chunks.length,
      obsolete_count: chunks.filter(c => c.isObsolete).length,
      latency_ms: Date.now() - startTime
    }, 'search_documents_complete');

    return { chunks, versionWarning };
  } catch (error: unknown) {
    if (error instanceof AzureSearchError) {
      throw error;
    }
    const httpError = error as { statusCode?: number; message?: string };
    throw new AzureSearchError(
      `Falha na busca vetorial: ${httpError.message ?? 'erro desconhecido'}`,
      httpError.statusCode
    );
  }
}
