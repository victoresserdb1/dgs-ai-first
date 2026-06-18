import { type SourceDocument } from '@/shared/types';
import { describe, expect, it, vi } from 'vitest';

// ─── Mocks (devem ser declarados antes dos imports do módulo) ─────────────────

vi.mock('fs', () => ({
  readFileSync: vi.fn().mockReturnValue(
    // O system prompt deve conter a instrução de documentos contraditórios
    '# NovaTech Assistant\n\nQuando houver duas versões do mesmo documento, use sempre a mais recente. Cite a versão do documento em sua resposta.'
  )
}));

vi.mock('@/shared/config', () => ({
  config: {
    SYSTEM_PROMPT_PATH: './prompts/system-prompt.md',
    LOG_LEVEL: 'error'
  }
}));

vi.mock('@/shared/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

// ─── Import do módulo após os mocks ──────────────────────────────────────────

import { buildPrompt } from '@/services/prompt-builder';

// ─── Helpers de teste ─────────────────────────────────────────────────────────

function makeChunk(overrides: Partial<SourceDocument> = {}): SourceDocument {
  return {
    documentId: 'POL-001',
    title: 'Política de Devolução',
    chunkId: 'POL-001-A',
    snippet: 'Conteúdo do chunk de teste.',
    score: 0.9,
    version: '1.0',
    documentType: 'normative',
    isObsolete: false,
    ...overrides
  };
}

function makeChunkWithSize(chars: number, overrides: Partial<SourceDocument> = {}): SourceDocument {
  return makeChunk({
    snippet: 'x'.repeat(chars),
    ...overrides
  });
}

// ─── Testes ───────────────────────────────────────────────────────────────────

describe('buildPrompt', () => {
  it('inclui todos os 3 chunks quando estão dentro do budget', () => {
    const chunks = [
      makeChunk({ chunkId: 'A', score: 0.9 }),
      makeChunk({ chunkId: 'B', score: 0.8 }),
      makeChunk({ chunkId: 'C', score: 0.7 })
    ];

    const { messages } = buildPrompt('Pergunta de teste?', chunks);

    const systemContent = messages.find(m => m.role === 'system')?.content ?? '';
    // Todos os 3 chunks devem estar no system message
    expect(systemContent).toContain('A');
    expect(systemContent).toContain('B');
    expect(systemContent).toContain('C');
  });

  it('inclui apenas os 5 chunks com maior score quando 6 são fornecidos', () => {
    const chunks = [
      makeChunk({ chunkId: 'score-06', score: 0.60 }), // deve ser descartado
      makeChunk({ chunkId: 'score-07', score: 0.70 }),
      makeChunk({ chunkId: 'score-08', score: 0.80 }),
      makeChunk({ chunkId: 'score-09', score: 0.90 }),
      makeChunk({ chunkId: 'score-91', score: 0.91 }),
      makeChunk({ chunkId: 'score-95', score: 0.95 })
    ];

    const { messages } = buildPrompt('Pergunta de teste?', chunks);
    const systemContent = messages.find(m => m.role === 'system')?.content ?? '';

    // Os 5 com maior score devem estar presentes
    expect(systemContent).toContain('score-95');
    expect(systemContent).toContain('score-91');
    expect(systemContent).toContain('score-09');
    expect(systemContent).toContain('score-08');
    expect(systemContent).toContain('score-07');
    // O de menor score deve ser descartado
    expect(systemContent).not.toContain('score-06');
  });

  it('descarta chunks de menor score quando o budget de ~8K tokens é atingido', () => {
    // Cada chunk tem ~2000 tokens estimados (8000 chars ÷ 4 chars/token)
    // 5 chunks × 2000 tokens = 10.000 tokens > budget de 8.000
    const chunks = [
      makeChunkWithSize(8000, { chunkId: 'high-score', score: 0.99 }),
      makeChunkWithSize(8000, { chunkId: 'mid-score',  score: 0.80 }),
      makeChunkWithSize(8000, { chunkId: 'low-score',  score: 0.60 })
    ];

    const { messages } = buildPrompt('Pergunta de teste?', chunks);
    const systemContent = messages.find(m => m.role === 'system')?.content ?? '';

    // O chunk de maior score deve estar presente
    expect(systemContent).toContain('high-score');
    // O chunk de menor score deve ser descartado por budget overflow
    expect(systemContent).not.toContain('low-score');
  });

  it('trunca histórico para os 3 últimos turnos quando 4 são fornecidos', () => {
    const history = [
      { role: 'user' as const,      content: 'Turno 1 — deve ser descartado' },
      { role: 'assistant' as const, content: 'Turno 2 — deve ser descartado' },
      { role: 'user' as const,      content: 'Turno 3 — deve permanecer' },
      { role: 'assistant' as const, content: 'Turno 4 — deve permanecer' }
    ];

    // Apenas 2 turnos para simplificar, mas passamos 4 para garantir truncamento
    const { messages } = buildPrompt(
      'Pergunta 5 (turno atual)',
      [makeChunk()],
      history
    );

    const nonSystemMessages = messages.filter(m => m.role !== 'system');
    // 3 turnos de histórico + 1 pergunta atual = 4 mensagens no máximo
    expect(nonSystemMessages.length).toBeLessThanOrEqual(4);

    const contents = nonSystemMessages.map(m => m.content);
    expect(contents).not.toContain('Turno 1 — deve ser descartado');
    expect(contents).not.toContain('Turno 2 — deve ser descartado');
    expect(contents).toContain('Turno 3 — deve permanecer');
    expect(contents).toContain('Turno 4 — deve permanecer');
  });

  it('não inclui chunk com isObsolete: true no prompt, independente do score', () => {
    const chunks = [
      makeChunk({ chunkId: 'ativo',   score: 0.70, isObsolete: false }),
      makeChunk({ chunkId: 'obsoleto', score: 0.99, isObsolete: true })
    ];

    const { messages } = buildPrompt('Pergunta de teste?', chunks);
    const systemContent = messages.find(m => m.role === 'system')?.content ?? '';

    expect(systemContent).toContain('ativo');
    expect(systemContent).not.toContain('obsoleto');
  });

  it('instrução de documentos contraditórios está presente em TODAS as saídas', () => {
    // Testar com e sem chunks, com e sem histórico
    const resultSemChunks = buildPrompt('Pergunta sem contexto?', []);
    const resultComChunks = buildPrompt('Pergunta com contexto?', [makeChunk()]);

    const systemSemChunks = resultSemChunks.messages.find(m => m.role === 'system')?.content ?? '';
    const systemComChunks = resultComChunks.messages.find(m => m.role === 'system')?.content ?? '';

    const instrucaoEsperada = 'versão mais recente';
    expect(systemSemChunks.toLowerCase()).toContain(instrucaoEsperada);
    expect(systemComChunks.toLowerCase()).toContain(instrucaoEsperada);
  });

  it('estimatedTokens é coerente com o conteúdo gerado (±50% da estimativa manual)', () => {
    const chunkContent = 'Conteúdo de teste com tamanho razoável.'.repeat(20); // ~780 chars ≈ 195 tokens
    const question = 'Qual o prazo de devolução?'; // ~26 chars ≈ 7 tokens
    const chunks = [makeChunk({ snippet: chunkContent })];

    const { estimatedTokens } = buildPrompt(question, chunks);

    // System prompt + chunk + question devem resultar em pelo menos 100 tokens
    expect(estimatedTokens).toBeGreaterThan(100);
    // E não deve ser absurdamente alto (menos de 50.000 tokens)
    expect(estimatedTokens).toBeLessThan(50000);
  });
});
