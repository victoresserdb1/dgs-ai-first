import { AssistantResponseSchema, AssistantResponse } from './schemas';

export type ValidationReason =
  | 'invalid_schema'
  | 'missing_source_document'
  | 'dangerous_cargo_return_violation';

export interface ValidationLogger {
  warn(payload: Record<string, unknown>, message: string): void;
}

export const noopLogger: ValidationLogger = {
  warn: () => undefined,
};

export interface ValidationResult {
  approved: boolean;
  response: AssistantResponse;
  reason?: ValidationReason;
}

export const SAFE_RESPONSE: AssistantResponse = {
  answer:
    'Não posso confirmar essa solicitação. Para cargas perigosas, acione a Gestão de Riscos no ramal 4500.',
  source_document: 'POL-001-politica-devolucao.md',
  confidence_score: 0,
};

// NFD normalization removes diacritics so patterns work on both accented and unaccented text.
function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function mentionsDangerousCargo(normalizedText: string): boolean {
  return /(carga(?:s)?\s+perigosa(?:s)?|antt|classe(?:s)?\s+[1-6])/.test(normalizedText);
}

function mentionsReturn(normalizedText: string): boolean {
  return /(devolucao|devolver|devolvid[ao]|coleta\s+reversa|frete\s+reverso)/.test(
    normalizedText
  );
}

// Phrases that unambiguously deny a return — must include the denial verb to avoid false negatives.
const NEGATIVE_PATTERNS: RegExp[] = [
  /\bnao\s+(pode[m]?|e|esta|sao|foram)\b/,
  /\bnao\s+(?:e\s+)?(?:permitid[ao]|autorizad[ao]|elegivel)\b/,
  /\bproibid[ao]\b/,
  /\bvedad[ao]\b/,
  /\bnunca\b/,
  /\bimpossivel\b/,
];

// Phrases that explicitly affirm a return is possible.
const AFFIRMATIVE_PATTERNS: RegExp[] = [
  /\bpode(?:m)?\s+ser\s+devolvid[ao]s?\b/,
  /\be\s+(?:sim\s+)?possivel\s+devolver\b/,
  /\bdevolucao\s+(?:e|esta)\s+(?:possivel|permitida|autorizada)\b/,
  /\belegivel\s+para\s+devolucao\b/,
];

export function violatesDangerousCargoRule(answer: string): boolean {
  const normalized = normalizeText(answer);

  if (!mentionsDangerousCargo(normalized) || !mentionsReturn(normalized)) {
    return false;
  }

  const hasNegative = NEGATIVE_PATTERNS.some((p) => p.test(normalized));
  const hasAffirmative = AFFIRMATIVE_PATTERNS.some((p) => p.test(normalized));

  // Violation when the answer explicitly affirms OR when it lacks any denial.
  return hasAffirmative || !hasNegative;
}

export function validateAssistantResponse(
  payload: unknown,
  logger: ValidationLogger,
  safeResponse: AssistantResponse = SAFE_RESPONSE
): ValidationResult {
  const parsed = AssistantResponseSchema.safeParse(payload);

  if (!parsed.success) {
    logger.warn(
      {
        reason: 'invalid_schema',
        issues: parsed.error.issues.map((i: { path: (string | number)[]; message: string }) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      },
      'Response rejected by schema validation.'
    );
    return { approved: false, reason: 'invalid_schema', response: safeResponse };
  }

  const response = parsed.data;

  if (!response.source_document.trim()) {
    logger.warn(
      { reason: 'missing_source_document' },
      'Response blocked: source_document missing.'
    );
    return { approved: false, reason: 'missing_source_document', response: safeResponse };
  }

  if (violatesDangerousCargoRule(response.answer)) {
    logger.warn(
      {
        reason: 'dangerous_cargo_return_violation',
        source_document: response.source_document,
      },
      'Response blocked by dangerous cargo return guardrail.'
    );
    return {
      approved: false,
      reason: 'dangerous_cargo_return_violation',
      response: safeResponse,
    };
  }

  return { approved: true, response };
}
