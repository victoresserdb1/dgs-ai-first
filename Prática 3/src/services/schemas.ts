import { z } from 'zod';

export const AssistantResponseSchema = z
  .object({
    answer: z.string().trim().min(1, 'answer is required'),
    source_document: z.string().trim().min(1, 'source_document is required'),
    confidence_score: z.number().min(0).max(1),
  })
  .strict();

export type AssistantResponse = z.infer<typeof AssistantResponseSchema>;
