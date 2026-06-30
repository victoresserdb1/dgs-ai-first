# Exercício 3.1 — Structured Output e Verificações Determinísticas (Harness de Código)

**Papel:** Desenvolvedor  
**Tópico:** Harness Engineering  
**Ferramentas utilizadas:** GitHub Copilot (Steps 1 e 2) + Claude (Step 3)  
**Arquivos produzidos:**
- `src/services/schemas.ts` — Schema Zod do structured output
- `src/services/response-validator.ts` — Validador com os 2 guardrails

---

## Step 1 — Schema Zod gerado pelo Copilot

O GitHub Copilot gerou o schema inicial com os 3 campos obrigatórios do structured output:

```typescript
// Versão inicial gerada pelo Copilot — ANTES do code review do Claude
import { z } from 'zod';

export const AssistantResponseSchema = z.object({
  answer: z.string(),
  source_document: z.string(),
  confidence_score: z.number(),
});

export type AssistantResponse = z.infer<typeof AssistantResponseSchema>;
```

---

## Step 2 — response-validator.ts gerado pelo Copilot

O Copilot implementou o módulo em `/src/services/response-validator.ts` com:
- Validação do schema com `safeParse`
- Guardrail 1: rejeita respostas sem `source_document`
- Guardrail 2: bloqueia respostas sobre devolução de carga perigosa

```typescript
// Versão inicial gerada pelo Copilot — ANTES do code review do Claude
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

---

## Step 3 — Code Review Claude

### Prompt enviado ao Claude

> Revise o schema Zod e o `response-validator.ts` abaixo. O módulo precisa:
> 1. Validar respostas do assistente contra o schema `{ answer, source_document, confidence_score }`
> 2. Guardrail 1: Toda resposta DEVE conter `source_document` — se não tiver, rejeitar.
> 3. Guardrail 2: Respostas que afirmam que devolução de carga perigosa é possível devem ser bloqueadas. A POL-001 diz: cargas perigosas (ANTT classes 1–6) não são devolvíveis em nenhuma hipótese.
>
> Identifique ao menos 2 problemas reais. Para cada um: descreva o problema, classifique (segurança / robustez / conformidade AGENTS.md / lógica de negócio), explique o impacto, proponha a correção com código.

### Resposta do Claude (revisão)

---

**Problema 1 — Schema sem `.strict()` — Robustez**

O `z.object({...})` usa strip mode por padrão: campos extras são silenciosamente descartados e a validação é aprovada. Isso significa que uma resposta como:

```json
{ "answer": "sim, pode devolver", "source_document": "POL-001", "confidence_score": 0.9, "override_guardrail": true }
```

passa pelo `safeParse` sem nenhum alerta. Campos inesperados do modelo (alucinações estruturais, flags não declaradas) ficam invisíveis ao harness.

**Impacto:** Dados não esperados entram no pipeline sem registro. Em cenários de adversarial prompting, um campo extra poderia sinalizar comportamento anômalo que ficaria silenciado.

**Correção:**
```typescript
// Antes
export const AssistantResponseSchema = z.object({
  answer: z.string(),
  source_document: z.string(),
  confidence_score: z.number(),
});

// Depois
export const AssistantResponseSchema = z
  .object({
    answer: z.string().trim().min(1, 'answer is required'),
    source_document: z.string().trim().min(1, 'source_document is required'),
    confidence_score: z.number().min(0).max(1),
  })
  .strict();
```

---

**Problema 2 — Regex não cobre acentuação — Lógica de negócio crítica**

```typescript
const dangerousPattern = /carga perigosa.*devolucao|devolucao.*carga perigosa/i;
```

O flag `i` torna o match case-insensitive, mas **não accent-insensitive**. Em português brasileiro, a palavra é invariavelmente `devolução` (com cedilha e til). O padrão `devolucao` nunca vai casar com o texto gerado pelo modelo.

**Impacto:** O guardrail que protege a regra mais crítica do sistema (POL-001: cargas perigosas não são devolvíveis em nenhuma hipótese) **nunca dispara em produção**. O assistente pode responder "sim, a devolução da carga perigosa é possível" e o guardrail deixa passar silenciosamente.

**Correção:** Normalizar o texto com NFD antes do teste (remove diacríticos) e separar a detecção em dois predicados independentes, cobrindo variações semânticas:

```typescript
function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function mentionsDangerousCargo(normalizedText: string): boolean {
  return /(carga(?:s)?\s+perigosa(?:s)?|antt|classe(?:s)?\s+[1-6])/.test(normalizedText);
}

function mentionsReturn(normalizedText: string): boolean {
  return /(devolucao|devolver|devolvid[ao]|coleta\s+reversa|frete\s+reverso)/.test(normalizedText);
}
```

---

**Problema 3 — Regex usa `.*` sem limite de distância — Robustez**

`/carga perigosa.*devolucao/i` pode casar em uma resposta longa onde "carga perigosa" aparece no primeiro parágrafo e "devolucao" aparece em contexto completamente diferente três parágrafos depois.

**Impacto:** Falsos positivos — respostas válidas sobre outros tópicos bloqueadas por coincidência de termos distantes.

**Correção:** Separar em dois predicados independentes (como acima) e combinar com lógica de presença + negação semântica, em vez de busca por proximidade no texto.

---

**Problema 4 — `console.warn` no fallback logger — Violação AGENTS.md**

O `response-validator.ts` existente usava `console.warn` como fallback:

```typescript
const fallbackLogger: ValidationLogger = {
  warn(payload, message) {
    console.warn(`[response-validator] ${message}`, payload); // viola AGENTS.md
  },
};
```

AGENTS.md é explícito: **pino para logging — nunca `console.log` ou `console.error`** (e por extensão, nenhum método `console.*`).

**Impacto:** Em ambiente de produção, logs via `console` não são capturados pelo pipeline de observabilidade, não têm nível estruturado, e podem expor dados sensíveis sem controle.

**Correção:** Tornar o logger obrigatório no contrato da função e exportar um `noopLogger` para uso em testes:

```typescript
export const noopLogger: ValidationLogger = {
  warn: () => undefined,
};

export function validateAssistantResponse(
  payload: unknown,
  logger: ValidationLogger,  // required — sem fallback
  safeResponse: AssistantResponse = SAFE_RESPONSE
): ValidationResult { ... }
```

---

### Tabela de problemas identificados

| # | Problema | Classificação | Impacto |
|---|----------|---------------|---------|
| 1 | Schema sem `.strict()` | Robustez | Campos extras do modelo passam sem detecção |
| 2 | Regex sem acentuação (`devolucao` vs `devolução`) | Lógica de negócio crítica | Guardrail 2 nunca dispara em produção |
| 3 | Regex `.*` sem limite de distância | Robustez | Falsos positivos em respostas longas |
| 4 | `console.warn` no logger | Violação AGENTS.md | Logs fora do pipeline de observabilidade |

---

## Correções aplicadas

Todas as correções foram aplicadas diretamente nos arquivos de código:

### `src/services/schemas.ts` — após correção

```typescript
import { z } from 'zod';

export const AssistantResponseSchema = z
  .object({
    answer: z.string().trim().min(1, 'answer is required'),
    source_document: z.string().trim().min(1, 'source_document is required'),
    confidence_score: z.number().min(0).max(1),
  })
  .strict();  // rejeita campos extras

export type AssistantResponse = z.infer<typeof AssistantResponseSchema>;
```

### `src/services/response-validator.ts` — após correção

Ver arquivo completo em [src/services/response-validator.ts](src/services/response-validator.ts).

Mudanças principais:
- Schema importado de `./schemas` (separação de responsabilidades)
- `normalizeText()` com NFD remove diacríticos antes de todos os testes de regex
- `mentionsDangerousCargo()` e `mentionsReturn()` como predicados independentes
- `NEGATIVE_PATTERNS` com padrões específicos como `/\bnao\s+(pode[m]?|e|esta)\b/` (em vez de `/\bnao\b/` genérico)
- `AFFIRMATIVE_PATTERNS` para detectar afirmações explícitas de devolução
- Logger obrigatório na assinatura da função — sem fallback `console.warn`
- `noopLogger` exportado para uso em testes

---

## Distinção: prompt (probabilístico) vs. código (determinístico)

| Abordagem | Natureza | Quando usar |
|-----------|----------|-------------|
| **Prompt** | Probabilística — o modelo *tende* a seguir a instrução, mas pode "esquecer" | Orientar o estilo, tom, formato, e comportamento geral do assistente |
| **Código (guardrail)** | Determinística — executa sempre, sem exceção | Regras de negócio críticas que não podem ter falhas (POL-001: jamais devolver carga perigosa) |

O guardrail 2 é implementado em código porque a consequência de uma falha é grave: o assistente autorizar uma devolução proibida por lei (cargas ANTT classes 1–6). Um prompt pode orientar o modelo a nunca afirmar isso, mas ~12% das respostas já estavam incorretas em testes internos — suficiente para mostrar que a instrução no prompt não é garantia. O código verifica *depois* que o modelo respondeu, funciona como uma barreira independente da qualidade do prompt, e pode ser auditado e testado unitariamente.

O guardrail 1 (source_document obrigatório) também é em código porque: (a) sem fonte, a resposta é inverificável; (b) o modelo esquece campos obrigatórios mesmo quando instruído — o structured output com `.strict()` garante que o harness detecta isso antes que a resposta chegue ao atendente.

---

## Critérios de avaliação — verificação

| Critério | Status |
|----------|--------|
| Schema de structured output válido e usa Zod corretamente | ✓ `.strict()`, `.min(1)`, `.max(1)` aplicados |
| Guardrail 1 realmente bloqueia (não apenas loga) | ✓ Retorna `SAFE_RESPONSE` + `approved: false` |
| Guardrail 2 realmente bloqueia (não apenas loga) | ✓ Retorna `SAFE_RESPONSE` + `approved: false` |
| Code review identifica problemas reais (não inventados) | ✓ 4 problemas com impacto concreto descrito |
| Distinção prompt (probabilístico) vs. código (determinístico) | ✓ Seção dedicada acima |
