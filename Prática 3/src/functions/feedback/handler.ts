// feedback-handler.ts — reescrito com GitHub Copilot após code review (Exercício 3.2 / Step 3)
import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';
import { z } from 'zod';
import pino from 'pino';

const logger = pino({ name: 'feedback-handler' });

const COSMOS_CONNECTION_STRING = process.env.COSMOS_CONNECTION_STRING;
if (!COSMOS_CONNECTION_STRING) {
  throw new Error('COSMOS_CONNECTION_STRING environment variable is not set');
}

const client = new CosmosClient(COSMOS_CONNECTION_STRING);
const container = client.database('novatech').container('feedbacks');

const FeedbackSchema = z.object({
  queryId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
  attendantEmail: z.string().email(),
});

type FeedbackInput = z.infer<typeof FeedbackSchema>;

interface FeedbackRecord extends FeedbackInput {
  timestamp: string;
}

export async function feedbackHandler(
  request: HttpRequest
): Promise<HttpResponseInit> {
  let raw: unknown;

  try {
    raw = await request.json();
  } catch {
    logger.warn({ reason: 'invalid_json' }, 'Request body is not valid JSON');
    return { status: 400, body: 'Invalid request body' };
  }

  const parsed = FeedbackSchema.safeParse(raw);
  if (!parsed.success) {
    logger.warn(
      { reason: 'schema_invalid', issues: parsed.error.issues },
      'Feedback payload rejected by schema validation'
    );
    return { status: 400, body: 'Invalid feedback payload' };
  }

  const record: FeedbackRecord = {
    ...parsed.data,
    timestamp: new Date().toISOString(),
  };

  // Log feedback receipt omitting personal data (attendantEmail is PII — AGENTS.md)
  logger.info(
    { queryId: record.queryId, rating: record.rating, timestamp: record.timestamp },
    'Feedback recebido'
  );

  try {
    await container.items.create(record);
  } catch (err) {
    logger.error({ reason: 'cosmos_write_error', err }, 'Failed to persist feedback to CosmosDB');
    return { status: 500, body: 'Internal server error' };
  }

  return { status: 200, body: 'OK' };
}

app.http('feedback', {
  methods: ['POST'],
  handler: feedbackHandler,
});
