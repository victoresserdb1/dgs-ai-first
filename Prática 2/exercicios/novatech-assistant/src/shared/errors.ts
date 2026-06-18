/**
 * Hierarquia de errors customizados do NovaTech Assistant.
 *
 * NovaTechError (base)
 *   ├── ValidationError      — input inválido (HTTP 400)
 *   ├── AzureSearchError     — falha no Azure AI Search (HTTP 500)
 *   └── AzureOpenAIError     — falha no Azure OpenAI (HTTP 500)
 */

export class NovaTechError extends Error {
  public readonly code: string;
  public readonly requestId: string | undefined;

  constructor(message: string, code: string, requestId?: string) {
    super(message);
    this.name = 'NovaTechError';
    this.code = code;
    this.requestId = requestId;
    // Garante que instanceof funciona corretamente com herança em TypeScript
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends NovaTechError {
  public readonly issues: unknown[];

  constructor(message: string, issues: unknown[], requestId?: string) {
    super(message, 'validation_error', requestId);
    this.name = 'ValidationError';
    this.issues = issues;
  }
}

export class AzureSearchError extends NovaTechError {
  public readonly statusCode: number | undefined;

  constructor(message: string, statusCode?: number, requestId?: string) {
    super(message, 'azure_search_error', requestId);
    this.name = 'AzureSearchError';
    this.statusCode = statusCode;
  }
}

export class AzureOpenAIError extends NovaTechError {
  public readonly statusCode: number | undefined;

  constructor(message: string, statusCode?: number, requestId?: string) {
    super(message, 'azure_openai_error', requestId);
    this.name = 'AzureOpenAIError';
    this.statusCode = statusCode;
  }
}
