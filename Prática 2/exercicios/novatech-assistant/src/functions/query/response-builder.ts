import { type SourceDocument, type TokenUsage } from '@/shared/types';
import { type QueryOutput } from './validator';

export interface BuildResponseParams {
  answer: string;
  chunks: SourceDocument[];
  conversationId: string;
  tokenUsage: TokenUsage;
  versionWarning: boolean;
  startTime: number;
}

export function buildResponse(params: BuildResponseParams): QueryOutput {
  const { answer, chunks, conversationId, tokenUsage, versionWarning, startTime } = params;

  // Apenas chunks não-obsoletos aparecem em sources
  const sources = chunks
    .filter(c => !c.isObsolete)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return {
    answer,
    sources,
    conversationId,
    tokenUsage,
    metadata: {
      duration_ms: Date.now() - startTime,
      versionWarning: versionWarning || undefined
    }
  };
}
