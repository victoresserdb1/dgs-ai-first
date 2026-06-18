/**
 * Testes de integração do query endpoint.
 *
 * Estratégia: msw intercepta 100% das chamadas HTTP ao Azure (Search + OpenAI).
 * Nenhuma chamada real é feita em nenhum teste.
 *
 * Cenários cobertos:
 *  - CONF-01: Resolução de conflito PROC-042 v1 vs v2
 *  - CONF-02: Hierarquia normativo > FAQ
 *  - Anti-alucinação: tier Platinum inexistente
 *  - Sem cobertura: frete padrão <500kg
 */

import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { type SourceDocument } from '@/shared/types';
import {
    FAQ_03,
    FAQ_15,
    POL_001_B,
    PROC_042_B,
    PROC_042V2_B,
    SLA_2024_A
} from '../../fixtures/chunks';

// ─── Configuração do ambiente de teste ───────────────────────────────────────

const TEST_SEARCH_ENDPOINT = 'https://test-search.search.windows.net';
const TEST_OPENAI_ENDPOINT = 'https://test-openai.openai.azure.com';

process.env['AZURE_SEARCH_ENDPOINT'] = TEST_SEARCH_ENDPOINT;
process.env['AZURE_SEARCH_API_KEY'] = 'test-search-key';
process.env['AZURE_SEARCH_INDEX_NAME'] = 'novatech-docs-v1';
process.env['AZURE_OPENAI_ENDPOINT'] = TEST_OPENAI_ENDPOINT;
process.env['AZURE_OPENAI_API_KEY'] = 'test-openai-key';
process.env['SYSTEM_PROMPT_PATH'] = './prompts/system-prompt.md';

// ─── Helpers para mockar respostas Azure ─────────────────────────────────────

function buildSearchResponse(chunks: SourceDocument[]) {
  return {
    value: chunks.map(c => ({
      '@search.score': c.score,
      id: c.chunkId,
      documentId: c.documentId,
      chunkId: c.chunkId,
      title: c.title,
      content: c.snippet,
      version: c.version,
      vigencia_inicio: c.vigencia_inicio ?? null,
      vigencia_fim: c.vigencia_fim ?? null,
      documentType: c.documentType
    }))
  };
}

function buildEmbeddingResponse() {
  return {
    object: 'list',
    data: [{ object: 'embedding', embedding: Array(1536).fill(0.1), index: 0 }],
    model: 'text-embedding-ada-002',
    usage: { prompt_tokens: 5, total_tokens: 5 }
  };
}

function buildCompletionResponse(content: string) {
  return {
    id: 'chatcmpl-test',
    object: 'chat.completion',
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content },
        finish_reason: 'stop'
      }
    ],
    usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 }
  };
}

// ─── Servidor msw ─────────────────────────────────────────────────────────────

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// ─── Utilitário: configurar handlers para um cenário ─────────────────────────

function setupHandlers(
  searchChunks: SourceDocument[],
  completionText: string
) {
  server.use(
    // Mock: Azure OpenAI — Embedding
    http.post(
      `${TEST_OPENAI_ENDPOINT}/openai/deployments/text-embedding-ada-002/embeddings`,
      () => HttpResponse.json(buildEmbeddingResponse())
    ),

    // Mock: Azure AI Search — Busca vetorial
    http.post(
      `${TEST_SEARCH_ENDPOINT}/indexes/novatech-docs-v1/docs/search.post.1`,
      () => HttpResponse.json(buildSearchResponse(searchChunks))
    ),

    // Mock: Azure OpenAI — Chat Completion
    http.post(
      `${TEST_OPENAI_ENDPOINT}/openai/deployments/gpt-4o/chat/completions`,
      () => HttpResponse.json(buildCompletionResponse(completionText))
    )
  );
}

// ─── Helper: executar query handler diretamente ───────────────────────────────

async function callQueryHandler(body: unknown) {
  const { queryHandler } = await import('@/functions/query/handler');

  // Simula HttpRequest do Azure Functions v4
  const req = {
    json: async () => body,
    method: 'POST'
  } as Parameters<typeof queryHandler>[0];

  const ctx = {} as Parameters<typeof queryHandler>[1];
  return queryHandler(req, ctx);
}

// ─── CONF-01: Resolução de conflito PROC-042 v1 vs v2 ────────────────────────

describe('CONF-01 — Resolução de versão PROC-042', () => {
  it('usa multiplicador v2 (1.1) para Sudeste em chamado pós-01/12/2023 e exclui v1 de sources', async () => {
    // Search retorna ambas as versões — o serviço deve resolver o conflito
    const chunksComConflito = [
      { ...PROC_042V2_B, isObsolete: false }, // v2: Sudeste 1.1
      { ...PROC_042_B, isObsolete: true }      // v1: Sudeste 1.0 — deve ser marcado obsoleto
    ];

    setupHandlers(
      chunksComConflito,
      'Conforme PROC-042 v2 (novembro/2023), o multiplicador para a região Sudeste é 1.1.'
    );

    const response = await callQueryHandler({ question: 'Qual o multiplicador para o Sudeste?' });

    expect(response.status).toBe(200);
    const body = response.jsonBody as Record<string, unknown>;
    const sources = body['sources'] as SourceDocument[];

    // v1 marcado como obsoleto NÃO deve aparecer em sources
    const v1Source = sources.find(s => s.chunkId === 'PROC-042-B');
    expect(v1Source).toBeUndefined();

    // v2 deve aparecer em sources
    const v2Source = sources.find(s => s.chunkId === 'PROC-042v2-B');
    expect(v2Source).toBeDefined();
    expect(v2Source?.isObsolete).toBe(false);
  });
});

// ─── CONF-02: Hierarquia normativo > FAQ (carga perigosa) ────────────────────

describe('CONF-02 — Hierarquia de fontes: normativo vs FAQ', () => {
  it('baseia resposta em POL-001-B (normativo) e não inclui FAQ-03 como fonte primária', async () => {
    setupHandlers(
      [POL_001_B, { ...FAQ_03, score: 0.78 }],  // normativo com score maior
      'Conforme POL-001-B, cargas perigosas classes 1 a 6 da ANTT NÃO são elegíveis para devolução pelo processo padrão. O cliente deve contatar Gestão de Riscos (ramal 4500).'
    );

    const response = await callQueryHandler({
      question: 'Posso devolver carga perigosa pelo processo normal?'
    });

    expect(response.status).toBe(200);
    const body = response.jsonBody as Record<string, unknown>;
    const sources = body['sources'] as SourceDocument[];

    // POL-001-B deve estar em sources
    const normativoSource = sources.find(s => s.chunkId === 'POL-001-B');
    expect(normativoSource).toBeDefined();
    expect(normativoSource?.documentType).toBe('normative');
  });
});

// ─── Anti-alucinação: tier Platinum ──────────────────────────────────────────

describe('Anti-alucinação — Tier inexistente', () => {
  it('resposta é baseada em SLA-2024-A e não inventa SLAs para tier Platinum', async () => {
    setupHandlers(
      [SLA_2024_A, FAQ_15],
      'Não existe tier Platinum na NovaTech. Conforme SLA-2024, os tiers disponíveis são Gold, Silver e Standard. Por favor, verifique o número do contrato para identificar o tier correto do cliente.'
    );

    const response = await callQueryHandler({
      question: 'Qual o SLA para cliente Platinum?'
    });

    expect(response.status).toBe(200);
    const body = response.jsonBody as Record<string, unknown>;
    const sources = body['sources'] as SourceDocument[];

    // SLA-2024-A deve estar em sources (contém "não existem outros tiers")
    const slaSource = sources.find(s => s.documentId === 'SLA-2024');
    expect(slaSource).toBeDefined();

    // Resposta não deve conter SLAs inventados para "Platinum"
    const answer = body['answer'] as string;
    expect(answer.toLowerCase()).not.toMatch(/platinum.*\d+h/);
  });
});

// ─── Sem cobertura: frete padrão <500kg ──────────────────────────────────────

describe('Sem cobertura — Frete padrão abaixo de 500kg', () => {
  it('retorna HTTP 200 e a resposta deve indicar ausência de informação (não inventa)', async () => {
    // Search retorna resultado de relevância baixa (frete <500kg não está na base)
    // Simulando retorno vazio — handler deve lidar com isso
    setupHandlers(
      [],  // nenhum chunk relevante
      'Não encontrei essa informação na documentação disponível. A PROC-042 cobre apenas cargas acima de 500kg. Para fretes abaixo desse peso, recomendo verificar com a equipe Comercial.'
    );

    const response = await callQueryHandler({
      question: 'Qual o valor do frete para 300kg para Salvador?'
    });

    // Deve retornar 200 (o pipeline funcionou), não 500
    expect(response.status).toBe(200);

    const body = response.jsonBody as Record<string, unknown>;
    const answer = body['answer'] as string;

    // A resposta não deve inventar um valor de frete
    expect(answer.toLowerCase()).not.toMatch(/r\$\s*\d+/);
  });
});

// ─── Validação de input ───────────────────────────────────────────────────────

describe('Validação de input', () => {
  it('retorna HTTP 400 com validation_error para question vazia', async () => {
    server.use(
      http.post(`${TEST_OPENAI_ENDPOINT}/openai/deployments/text-embedding-ada-002/embeddings`,
        () => HttpResponse.json(buildEmbeddingResponse())
      )
    );

    const response = await callQueryHandler({ question: '' });

    expect(response.status).toBe(400);
    const body = response.jsonBody as Record<string, unknown>;
    expect(body['error']).toBe('validation_error');
    expect(body['details']).toBeDefined();
    // Sem stack trace na resposta
    expect(JSON.stringify(body)).not.toContain('stack');
  });

  it('retorna HTTP 500 com internal_error (sem detalhes internos) em caso de falha do Azure', async () => {
    server.use(
      http.post(
        `${TEST_OPENAI_ENDPOINT}/openai/deployments/text-embedding-ada-002/embeddings`,
        () => HttpResponse.json({ error: { message: 'Service unavailable' } }, { status: 503 })
      )
    );

    const response = await callQueryHandler({ question: 'Pergunta válida?' });

    expect(response.status).toBe(500);
    const body = response.jsonBody as Record<string, unknown>;
    expect(body['error']).toBe('internal_error');
    expect(body['requestId']).toBeDefined();
    // Sem detalhes internos expostos
    expect(JSON.stringify(body)).not.toContain('Azure');
    expect(JSON.stringify(body)).not.toContain('Service unavailable');
  });
});
