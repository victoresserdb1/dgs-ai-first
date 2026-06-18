import { QueryInputSchema } from '@/functions/query/validator';
import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';

describe('QueryInputSchema', () => {
  // ── Casos de erro ───────────────────────────────────────────────────────────

  it('deve lançar ZodError com mensagem correta quando question está vazia', () => {
    const result = QueryInputSchema.safeParse({ question: '' });

    expect(result.success).toBe(false);
    if (!result.success) {
      const questionError = result.error.issues.find(i => i.path.includes('question'));
      expect(questionError).toBeDefined();
      expect(questionError?.message).toBe('Pergunta não pode estar vazia');
    }
  });

  it('deve lançar ZodError quando question excede 2000 caracteres', () => {
    const longQuestion = 'a'.repeat(2001);
    const result = QueryInputSchema.safeParse({ question: longQuestion });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.path.includes('question'))).toBe(true);
    }
  });

  it('deve lançar ZodError quando conversationId não é UUID válido', () => {
    const result = QueryInputSchema.safeParse({
      question: 'Qual o SLA Gold?',
      conversationId: 'nao-e-uuid'
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const idError = result.error.issues.find(i => i.path.includes('conversationId'));
      expect(idError).toBeDefined();
      expect(idError?.message).toContain('UUID');
    }
  });

  it('deve lançar ZodError quando history tem mais de 3 turnos', () => {
    const result = QueryInputSchema.safeParse({
      question: 'Qual o SLA Gold?',
      history: [
        { role: 'user', content: 'Pergunta 1' },
        { role: 'assistant', content: 'Resposta 1' },
        { role: 'user', content: 'Pergunta 2' },
        { role: 'assistant', content: 'Resposta 2 — este é o 4º turno, excede o limite' }
      ]
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.path.includes('history'))).toBe(true);
    }
  });

  it('deve rejeitar body completamente vazio (sem question)', () => {
    expect(() => QueryInputSchema.parse({})).toThrow(ZodError);
  });

  // ── Casos de sucesso ────────────────────────────────────────────────────────

  it('deve parsear body válido com apenas question', () => {
    const result = QueryInputSchema.safeParse({ question: 'Qual o SLA Gold?' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.question).toBe('Qual o SLA Gold?');
      expect(result.data.conversationId).toBeUndefined();
      expect(result.data.history).toBeUndefined();
    }
  });

  it('deve parsear body completo com conversationId UUID válido e history dentro do limite', () => {
    const result = QueryInputSchema.safeParse({
      question: 'Qual o prazo de devolução para cliente Gold?',
      conversationId: '550e8400-e29b-41d4-a716-446655440000',
      history: [
        { role: 'user', content: 'Qual o SLA Gold?' },
        { role: 'assistant', content: 'O SLA Gold para chamados gerais é resposta em até 2h úteis.' },
        { role: 'user', content: 'E para incidentes críticos?' }
      ]
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.conversationId).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(result.data.history).toHaveLength(3);
    }
  });
});
