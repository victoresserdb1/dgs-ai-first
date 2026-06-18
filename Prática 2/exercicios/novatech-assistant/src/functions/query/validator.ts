import { SourceDocumentSchema, TokenUsageSchema } from '@/shared/types';
import { z } from 'zod';

// ─── Turno de histórico de conversa ──────────────────────────────────────────

const HistoryTurnSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(2000)
});

// ─── Input do endpoint POST /api/query ───────────────────────────────────────

export const QueryInputSchema = z.object({
  question: z
    .string()
    .min(1, 'Pergunta não pode estar vazia')
    .max(2000, 'Pergunta não pode exceder 2000 caracteres'),
  conversationId: z
    .string()
    .uuid('conversationId deve ser um UUID válido')
    .optional(),
  history: z
    .array(HistoryTurnSchema)
    .max(3, 'Histórico não pode exceder 3 turnos')
    .optional()
});

export type QueryInput = z.infer<typeof QueryInputSchema>;

// ─── Output do endpoint POST /api/query ──────────────────────────────────────

export const QueryOutputSchema = z.object({
  answer: z.string(),
  sources: z
    .array(SourceDocumentSchema)
    .min(1, 'Resposta deve referenciar ao menos 1 fonte')
    .max(5),
  conversationId: z.string().uuid(),
  tokenUsage: TokenUsageSchema,
  metadata: z.object({
    duration_ms: z.number().nonnegative(),
    versionWarning: z.boolean().optional()
  })
});

export type QueryOutput = z.infer<typeof QueryOutputSchema>;
