import { config } from '@/shared/config';
import { AzureOpenAIError } from '@/shared/errors';
import { logger } from '@/shared/logger';
import { type ChatMessage, type TokenUsage } from '@/shared/types';
import { AzureKeyCredential, OpenAIClient } from '@azure/openai';

// ─── Tipos públicos ───────────────────────────────────────────────────────────

export interface CompletionResult {
  content: string;
  tokenUsage: TokenUsage;
  model: string;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

// Limite de tokens do text-embedding-ada-002
const ADA_002_MAX_TOKENS = 8192;

// ─── Utilitários ─────────────────────────────────────────────────────────────

/**
 * Estimativa de tokens por contagem de caracteres.
 * ~4 chars/token para conteúdo em português/inglês.
 * Em produção, substituir por: get_encoding('cl100k_base').encode(text).length
 */
function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

function truncateToMaxTokens(text: string, maxTokens: number): string {
  const estimated = estimateTokenCount(text);
  if (estimated <= maxTokens) return text;
  const ratio = maxTokens / estimated;
  return text.substring(0, Math.floor(text.length * ratio));
}

// ─── Retry com backoff exponencial ───────────────────────────────────────────

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
      const httpError = error as { status?: number; statusCode?: number };
      const status = httpError.status ?? httpError.statusCode;

      // Falha rápida em 400, 401, 403, 404 — sem retry
      if (status !== undefined && [400, 401, 403, 404].includes(status)) {
        throw error;
      }

      if (attempt < maxAttempts) {
        const delayMs = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
        logger.warn({ attempt, delayMs, status }, 'azure_openai_retry');
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
}

// ─── TAREFA-08: Geração de embeddings ────────────────────────────────────────

export async function createEmbedding(text: string): Promise<number[]> {
  const startTime = Date.now();
  const truncatedText = truncateToMaxTokens(text, ADA_002_MAX_TOKENS);

  const client = new OpenAIClient(
    config.AZURE_OPENAI_ENDPOINT,
    new AzureKeyCredential(config.AZURE_OPENAI_API_KEY)
  );

  try {
    const result = await withExponentialBackoff(() =>
      client.getEmbeddings(config.AZURE_OPENAI_EMBEDDING_DEPLOYMENT, [truncatedText])
    );

    const vector = result.data[0].embedding;

    logger.info({
      input_length: truncatedText.length,
      vector_dimensions: vector.length,
      latency_ms: Date.now() - startTime
    }, 'create_embedding_complete');

    return vector;
  } catch (error: unknown) {
    if (error instanceof AzureOpenAIError) throw error;
    const httpError = error as { status?: number; message?: string };
    throw new AzureOpenAIError(
      `Falha ao gerar embedding: ${httpError.message ?? 'erro desconhecido'}`,
      httpError.status
    );
  }
}

// ─── TAREFA-10: Geração de completion ────────────────────────────────────────

export async function createCompletion(messages: ChatMessage[]): Promise<CompletionResult> {
  const startTime = Date.now();

  const client = new OpenAIClient(
    config.AZURE_OPENAI_ENDPOINT,
    new AzureKeyCredential(config.AZURE_OPENAI_API_KEY)
  );

  try {
    const result = await withExponentialBackoff(() =>
      client.getChatCompletions(config.AZURE_OPENAI_COMPLETION_DEPLOYMENT, messages)
    );

    const content = result.choices[0].message?.content ?? '';
    const usage = result.usage;

    const tokenUsage: TokenUsage = {
      promptTokens: usage?.promptTokens ?? 0,
      completionTokens: usage?.completionTokens ?? 0,
      totalTokens: usage?.totalTokens ?? 0
    };

    logger.info({
      promptTokens: tokenUsage.promptTokens,
      completionTokens: tokenUsage.completionTokens,
      model: config.AZURE_OPENAI_COMPLETION_DEPLOYMENT,
      latency_ms: Date.now() - startTime
    }, 'create_completion_complete');

    return {
      content,
      tokenUsage,
      model: config.AZURE_OPENAI_COMPLETION_DEPLOYMENT
    };
  } catch (error: unknown) {
    if (error instanceof AzureOpenAIError) throw error;
    const httpError = error as { status?: number; message?: string };
    throw new AzureOpenAIError(
      `Falha ao gerar completion: ${httpError.message ?? 'erro desconhecido'}`,
      httpError.status
    );
  }
}
