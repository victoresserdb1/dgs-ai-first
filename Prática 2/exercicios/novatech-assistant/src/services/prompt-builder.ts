import { config } from '@/shared/config';
import { logger } from '@/shared/logger';
import { type ChatMessage, type SourceDocument } from '@/shared/types';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ─── Constantes de budget (ADR-0002) ─────────────────────────────────────────

const CHUNKS_BUDGET_TOKENS = 8000;
const HISTORY_MAX_TURNS = 3;
const MAX_CHUNKS = 5;

// ─── Tipos públicos ───────────────────────────────────────────────────────────

export interface BuildPromptResult {
  messages: ChatMessage[];
  estimatedTokens: number;
}

// ─── Estimador de tokens ──────────────────────────────────────────────────────

/**
 * Estimativa de tokens por heurística de caracteres.
 * Ratio ~4 chars/token para conteúdo em português/inglês.
 *
 * Para produção com tiktoken:
 *   import { get_encoding } from 'tiktoken';
 *   const enc = get_encoding('cl100k_base');
 *   return enc.encode(text).length;
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// ─── Leitura do system prompt ─────────────────────────────────────────────────

function loadSystemPrompt(): string {
  try {
    const promptPath = resolve(config.SYSTEM_PROMPT_PATH);
    return readFileSync(promptPath, 'utf-8');
  } catch (error: unknown) {
    const err = error as { message?: string };
    logger.warn({ error: err.message, path: config.SYSTEM_PROMPT_PATH }, 'system_prompt_read_error');
    throw new Error(
      `Falha ao ler system prompt em "${config.SYSTEM_PROMPT_PATH}": ${err.message ?? 'arquivo não encontrado'}`
    );
  }
}

// ─── Montagem do prompt com budget ───────────────────────────────────────────

export function buildPrompt(
  question: string,
  chunks: SourceDocument[],
  history: Array<{ role: 'user' | 'assistant'; content: string }> = []
): BuildPromptResult {
  const systemPromptBase = loadSystemPrompt();

  // 1. Filtrar chunks obsoletos (isObsolete: true nunca entram no contexto)
  const validChunks = chunks.filter(c => !c.isObsolete);

  // 2. Ordenar por score descendente e limitar a MAX_CHUNKS
  const sortedChunks = [...validChunks]
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_CHUNKS);

  // 3. Aplicar budget de tokens para chunks
  const includedChunks: SourceDocument[] = [];
  let chunksTokensUsed = 0;
  let chunksDropped = 0;

  for (const chunk of sortedChunks) {
    const chunkText = formatChunk(chunk);
    const chunkTokens = estimateTokens(chunkText);

    if (chunksTokensUsed + chunkTokens <= CHUNKS_BUDGET_TOKENS) {
      includedChunks.push(chunk);
      chunksTokensUsed += chunkTokens;
    } else {
      chunksDropped++;
    }
  }

  if (chunksDropped > 0) {
    logger.warn({ event: 'budget_overflow', chunksDropped }, 'prompt_builder_budget_overflow');
  }

  // 4. Montar seção de contexto documental
  const contextSection =
    includedChunks.length > 0
      ? includedChunks.map(c => formatChunk(c)).join('\n\n---\n\n')
      : '(Nenhum documento relevante foi encontrado para esta pergunta.)';

  // O system prompt inclui a instrução de documentos contraditórios embutida.
  // Ela deve estar presente em TODAS as chamadas, não condicionalmente.
  const fullSystemPrompt =
    `${systemPromptBase}\n\n## Documentação Recuperada\n\n${contextSection}`;

  // 5. Truncar histórico para os últimos HISTORY_MAX_TURNS turnos
  const truncatedHistory = history.slice(-HISTORY_MAX_TURNS);

  // 6. Montar array de mensagens
  const messages: ChatMessage[] = [
    { role: 'system', content: fullSystemPrompt },
    ...truncatedHistory.map(turn => ({
      role: turn.role as 'user' | 'assistant',
      content: turn.content
    })),
    { role: 'user', content: question }
  ];

  // 7. Calcular estimativa total de tokens
  const estimatedTokens =
    estimateTokens(fullSystemPrompt) +
    truncatedHistory.reduce((sum, t) => sum + estimateTokens(t.content), 0) +
    estimateTokens(question);

  logger.info({
    chunksIncluded: includedChunks.length,
    chunksDropped,
    historyTurns: truncatedHistory.length,
    estimatedTokens
  }, 'prompt_built');

  return { messages, estimatedTokens };
}

function formatChunk(chunk: SourceDocument): string {
  const typeLabel = chunk.documentType === 'normative' ? '[NORMATIVO]' : `[${chunk.documentType.toUpperCase()}]`;
  return `${typeLabel} ${chunk.documentId} v${chunk.version} (chunk: ${chunk.chunkId})\n${chunk.snippet}`;
}
