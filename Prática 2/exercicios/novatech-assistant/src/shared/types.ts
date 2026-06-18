import { z } from 'zod';

// ─── Enumerações de domínio ────────────────────────────────────────────────────

export const DocumentTypeSchema = z.enum(['normative', 'faq', 'procedure', 'sla']);
export type DocumentType = z.infer<typeof DocumentTypeSchema>;

// ─── Documento fonte (chunk recuperado do Azure AI Search) ────────────────────

export const SourceDocumentSchema = z.object({
  documentId: z.string(),
  title: z.string(),
  chunkId: z.string(),
  snippet: z.string(),
  score: z.number().min(0).max(1),
  version: z.string(),
  vigencia_inicio: z.string().optional(),
  vigencia_fim: z.string().optional(),
  documentType: DocumentTypeSchema,
  isObsolete: z.boolean()
});

export type SourceDocument = z.infer<typeof SourceDocumentSchema>;

// ─── Mensagem de chat ─────────────────────────────────────────────────────────

export const ChatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string()
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

// ─── Uso de tokens ────────────────────────────────────────────────────────────

export const TokenUsageSchema = z.object({
  promptTokens: z.number().int().nonnegative(),
  completionTokens: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative()
});

export type TokenUsage = z.infer<typeof TokenUsageSchema>;
