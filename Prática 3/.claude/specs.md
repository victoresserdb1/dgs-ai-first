# Specs — Tarefas com Claude (Cenário 3 — Fase de Governança)

> Escopo: apenas as etapas dos exercícios 3.1 e 3.2 que pedem **explicitamente** o uso do Claude.
> Etapas que usam o GitHub Copilot, revisão humana, ou reescrita de código não estão cobertas aqui.

---

## SPEC-01 — Code Review Claude: response-validator.ts

**Exercício de origem:** 3.1 — Structured output e verificações determinísticas (Step 3)
**Ferramenta:** Claude (chat)
**Instrução literal do exercício:** *"Usando o Claude, faça um code review rápido do que o Copilot gerou: identifique ao menos 2 problemas (ex: o schema aceita campos extras? o regex de 'carga perigosa + devolução' cobre variações?) e corrija."*

### Contexto

O GitHub Copilot foi usado para gerar:
1. Um schema Zod com os campos `answer`, `source_document` e `confidence_score`
2. O módulo `response-validator.ts` em `/src/services/response-validator.ts` que:
   - Valida a resposta do assistente contra o schema Zod
   - Aplica guardrail 1: rejeita respostas sem `source_document`
   - Aplica guardrail 2: bloqueia respostas que afirmem que devolução de carga perigosa é possível

Antes de mergear, o Claude faz um code review para identificar problemas que o Copilot pode ter introduzido.

### Input fornecido ao Claude

O prompt deve incluir:

1. **Schema Zod gerado pelo Copilot** (exemplo representativo):
```typescript
import { z } from 'zod';

export const AssistantResponseSchema = z.object({
  answer: z.string(),
  source_document: z.string(),
  confidence_score: z.number(),
});

export type AssistantResponse = z.infer<typeof AssistantResponseSchema>;
```

2. **Código response-validator.ts gerado pelo Copilot** (exemplo representativo):
```typescript
import { AssistantResponseSchema, AssistantResponse } from './schemas';
import { logger } from '../shared/logger';

const SAFE_RESPONSE: AssistantResponse = {
  answer: 'Não foi possível processar sua solicitação. Por favor, entre em contato com o suporte.',
  source_document: 'sistema',
  confidence_score: 0,
};

export function validateResponse(raw: unknown): AssistantResponse {
  const parsed = AssistantResponseSchema.safeParse(raw);
  if (!parsed.success) {
    logger.warn({ reason: 'schema_invalid', errors: parsed.error.issues }, 'Resposta rejeitada');
    return SAFE_RESPONSE;
  }

  const response = parsed.data;

  if (!response.source_document || response.source_document.trim() === '') {
    logger.warn({ reason: 'missing_source_document' }, 'Resposta rejeitada');
    return SAFE_RESPONSE;
  }

  const dangerousPattern = /carga perigosa.*devolucao|devolucao.*carga perigosa/i;
  if (dangerousPattern.test(response.answer)) {
    logger.warn({ reason: 'dangerous_cargo_return_blocked' }, 'Resposta bloqueada');
    return SAFE_RESPONSE;
  }

  return response;
}
```

3. **Contexto dos guardrails** (fornecido ao Claude):
   - Guardrail 1: *"Toda resposta DEVE conter o campo `source_document` — se não tiver, a resposta é rejeitada e substituída por mensagem padrão."*
   - Guardrail 2: *"Respostas que mencionam 'carga perigosa' junto com 'devolução' DEVEM conter a negativa — se afirmarem que a devolução é possível, a resposta é bloqueada."*
   - Regra de negócio (POL-001): cargas perigosas (classes ANTT 1–6) não são devolvíveis em nenhuma hipótese.

4. **Instrução ao Claude:** revisar o código acima e identificar ≥2 problemas reais, com impacto e correção.

### Output Esperado

- Lista de **≥2 problemas reais** identificados pelo Claude, cada um com:
  - Descrição clara do problema
  - Classificação: `segurança` | `robustez` | `conformidade AGENTS.md` | `lógica de negócio`
  - Impacto se não corrigido
  - Correção proposta (trecho de código corrigido)
- Versão final corrigida do `response-validator.ts` incorporando as correções

### Critérios de Aceitação

- [ ] **CA-01:** Claude identificou que o schema Zod não usa `.strict()`, permitindo campos extras na resposta — isso representa risco de dados não esperados passarem pela validação sem serem detectados
- [ ] **CA-02:** Claude identificou que o regex `/carga perigosa.*devolucao/i` não cobre acentuação (`devolução` com til), variações de ordem diferentes das previstas, ou outras construções semânticas equivalentes (ex: "devolver carga perigosa", "carga perigosa pode ser devolvida")
- [ ] **CA-03:** Cada problema tem impacto descrito — não apenas listado como "problema"
- [ ] **CA-04:** As correções são aplicadas no código, não apenas sugeridas em texto
- [ ] **CA-05:** Nenhum "problema" fabricado — os problemas identificados correspondem a riscos reais no código apresentado

---

## SPEC-02 — Segunda Revisão Claude: feedback-handler.ts

**Exercício de origem:** 3.2 — Revisão crítica de código gerado por IA (Step 2)
**Ferramenta:** Claude (chat)
**Instrução literal do exercício:** *"Use o Claude para uma segunda revisão e compare as listas."*

**Pré-condição:** O desenvolvedor já completou sua própria revisão (Step 1 do exercício 3.2) antes de acionar o Claude.

### Contexto

O GitHub Copilot gerou o módulo `feedback-handler.ts` para `/src/functions/feedback/handler.ts`. O Tech Lead solicitou revisão antes do merge. O desenvolvedor fez uma revisão manual. Agora o Claude faz uma segunda revisão **independente**, e as listas são comparadas.

### Input fornecido ao Claude

O prompt deve incluir:

1. **Código completo do feedback-handler.ts gerado pelo Copilot:**
```typescript
// feedback-handler.ts — gerado pelo Copilot
import { app, HttpRequest, HttpResponseInit } from '@azure/functions';

export async function feedbackHandler(
  request: HttpRequest
): Promise<HttpResponseInit> {
  const body = await request.json() as any;

  const feedback = {
    queryId: body.queryId,
    rating: body.rating,
    comment: body.comment,
    attendantEmail: body.attendantEmail,
    timestamp: new Date().toISOString()
  };

  console.log('Feedback recebido:', JSON.stringify(feedback));

  const { CosmosClient } = require('@azure/cosmos');
  const client = new CosmosClient(process.env.COSMOS_CONNECTION_STRING);
  const database = client.database('novatech');
  const container = database.container('feedbacks');

  await container.items.create(feedback);

  return { status: 200, body: 'OK' };
}

app.http('feedback', {
  methods: ['POST'],
  handler: feedbackHandler
});
```

2. **AGENTS.md resumido** (fornecido ao Claude como contexto de convenções do projeto):
   - TypeScript strict mode — sem `as any`, tipos explícitos obrigatórios
   - Zod para validação de input em todos os endpoints
   - `pino` para logging — nunca `console.log` ou `console.error`
   - Nunca logar dados pessoais: e-mail, nome, CPF, telefone
   - Imports estáticos no topo do arquivo — nunca `require()` dinâmico dentro de funções

3. **Instrução ao Claude:** revisar o código e retornar uma lista de problemas classificados como: `violação AGENTS.md` | `problema de segurança` | `bug potencial`.

### Output Esperado

- Lista de problemas encontrados pelo Claude, cada um com:
  - Linha(s) afetada(s) no código
  - Descrição do problema
  - Classificação: `violação AGENTS.md` | `problema de segurança` | `bug potencial`
  - Justificativa de impacto
- Tabela comparativa entre revisão humana (Step 1) e revisão Claude (Step 2):

| Problema | Encontrado pelo humano | Encontrado pelo Claude |
|----------|------------------------|------------------------|
| `as any` sem validação Zod | ✓/✗ | ✓/✗ |
| `console.log` em vez de pino | ✓/✗ | ✓/✗ |
| `require` dinâmico | ✓/✗ | ✓/✗ |
| `attendantEmail` logado (dado pessoal) | ✓/✗ | ✓/✗ |
| [Outros problemas encontrados] | ✓/✗ | ✓/✗ |

### Critérios de Aceitação

- [ ] **CA-01:** Claude identificou `as any` na linha `const body = await request.json() as any` — classificado como violação AGENTS.md e bug potencial (ausência de validação de schema)
- [ ] **CA-02:** Claude identificou `console.log` na linha de log — classificado como violação AGENTS.md (deve usar pino)
- [ ] **CA-03:** Claude identificou `require('@azure/cosmos')` dinâmico dentro da função — classificado como violação AGENTS.md (imports estáticos no topo)
- [ ] **CA-04:** Claude identificou `attendantEmail` sendo serializado e logado — classificado como violação AGENTS.md e problema de segurança (dado pessoal exposto em log)
- [ ] **CA-05:** A tabela comparativa é preenchida honestamente — divergências entre humano e Claude são registradas, não omitidas
- [ ] **CA-06:** A comparação inclui ao menos uma observação sobre o que cada abordagem (humana vs Claude) capturou melhor ou pior
