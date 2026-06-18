import { z } from 'zod';

const ConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  AZURE_SEARCH_ENDPOINT: z.string().url(),
  AZURE_SEARCH_API_KEY: z.string().min(1),
  AZURE_SEARCH_INDEX_NAME: z.string().default('novatech-docs-v1'),
  AZURE_OPENAI_ENDPOINT: z.string().url(),
  AZURE_OPENAI_API_KEY: z.string().min(1),
  AZURE_OPENAI_EMBEDDING_DEPLOYMENT: z.string().default('text-embedding-ada-002'),
  AZURE_OPENAI_COMPLETION_DEPLOYMENT: z.string().default('gpt-4o'),
  SYSTEM_PROMPT_PATH: z.string().default('./prompts/system-prompt.md')
});

const result = ConfigSchema.safeParse(process.env);

if (!result.success) {
  const issues = result.error.issues
    .map(i => `  ${i.path.join('.')}: ${i.message}`)
    .join('\n');
  throw new Error(`Configuração de ambiente inválida:\n${issues}`);
}

export const config = result.data;
export type Config = typeof config;
