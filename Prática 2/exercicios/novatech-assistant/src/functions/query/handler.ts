import { createCompletion, createEmbedding } from '@/services/completion';
import { buildPrompt } from '@/services/prompt-builder';
import { searchDocuments } from '@/services/search';
import { NovaTechError } from '@/shared/errors';
import { logger } from '@/shared/logger';
import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions';
import { ZodError } from 'zod';
import { buildResponse } from './response-builder';
import { QueryInputSchema, type QueryInput } from './validator';

// ─── Handler principal ────────────────────────────────────────────────────────

export async function queryHandler(
  req: HttpRequest,
  _context: InvocationContext
): Promise<HttpResponseInit> {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  let input: QueryInput | undefined;

  // ── Validação de input ──────────────────────────────────────────────────────

  try {
    const body = await req.json() as unknown;
    input = QueryInputSchema.parse(body);
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      logger.info({
        requestId,
        issues: error.issues.map(i => ({ path: i.path.join('.'), message: i.message }))
      }, 'query_validation_error');

      return {
        status: 400,
        jsonBody: {
          error: 'validation_error',
          details: error.issues.map(i => ({
            path: i.path.join('.'),
            message: i.message
          })),
          requestId
        }
      };
    }

    logger.warn({ requestId, error: (error as Error).message }, 'query_parse_error');
    return {
      status: 400,
      jsonBody: { error: 'invalid_request', requestId }
    };
  }

  // ── Geração da resposta ─────────────────────────────────────────────────────

  const conversationId = input.conversationId ?? crypto.randomUUID();

  // Log de entrada: sem logar a question completa em produção (dados do usuário)
  logger.info({
    conversationId,
    requestId,
    questionLength: input.question.length,
    hasHistory: (input.history?.length ?? 0) > 0
  }, 'query_request_start');

  try {
    // Passo 1: Gerar embedding da pergunta
    const vector = await createEmbedding(input.question);

    // Passo 2: Buscar chunks relevantes no Azure AI Search
    const { chunks, versionWarning } = await searchDocuments(vector, { top: 5 });

    // Passo 3: Montar prompt com budget de contexto
    const { messages } = buildPrompt(input.question, chunks, input.history);

    // Passo 4: Gerar resposta com GPT-4o
    const completionResult = await createCompletion(messages);

    // Passo 5: Montar output validado
    const output = buildResponse({
      answer: completionResult.content,
      chunks,
      conversationId,
      tokenUsage: completionResult.tokenUsage,
      versionWarning,
      startTime
    });

    logger.info({
      conversationId,
      requestId,
      statusCode: 200,
      sourceCount: output.sources.length,
      totalTokens: output.tokenUsage.totalTokens,
      duration_ms: Date.now() - startTime
    }, 'query_request_complete');

    return { status: 200, jsonBody: output };
  } catch (error: unknown) {
    // Erros internos NUNCA expõem detalhes ao cliente
    logger.error({
      conversationId,
      requestId,
      errorName: (error instanceof Error) ? error.name : 'UnknownError',
      errorCode: (error instanceof NovaTechError) ? error.code : 'unknown_error',
      duration_ms: Date.now() - startTime
    }, 'query_request_error');

    return {
      status: 500,
      jsonBody: { error: 'internal_error', requestId }
    };
  }
}

// ─── Registro da Azure Function v4 ───────────────────────────────────────────

app.http('query', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: queryHandler
});
