# Histórico de Sessão — Cenário 3 (Fase de Governança)

**Data:** 2026-06-30  
**Participante:** Victor Ribeiro  
**Assistente:** Claude (claude-sonnet-4-6)  
**Diretório de trabalho:** `d:\dgs-ai-first\Prática 3`

---

## 1. Leitura e análise dos arquivos de contexto

**Prompt do usuário:** Ler os arquivos em `anexos/` e `Prática 3/cenario-3-exercicios-fase-governanca.md` e, apenas para o que for explicitamente descrito como "usar o Claude", criar as specs e tasks.

**Arquivos lidos:**

| Arquivo | Conteúdo resumido |
|---------|-------------------|
| `cenario-3-exercicios-fase-governanca.md` | Exercícios da Fase de Governança — papéis, contexto NovaTech, exercícios 3.1 e 3.2 |
| `anexos/anexo-a-documentacao-simulada-novatech.md` | 5 documentos normalizados: POL-001, PROC-042 v1 e v2, SLA-2024, FAQ |
| `anexos/anexo-b-chunks-referencia-rag.md` | 17 chunks de RAG com mapa de cobertura e armadilhas |
| `anexos/anexo-c-estrutura-repositorio.md` | Estrutura completa do repositório `db1/novatech-assistant` |
| `anexos/FAQ-atendimento.md` | 8 de 47 perguntas do FAQ de atendimento |
| `anexos/POL-001-politica-devolucao.md` | Política de devolução — prazos, exceções, procedimento |
| `anexos/PROC-042-frete-especial-v1.md` | Frete especial v1 — fórmula, fatores, multiplicadores regionais |
| `anexos/PROC-042-v2-frete-especial-revisado.md` | Frete especial v2 (nov/2023) — fatores e multiplicadores atualizados |
| `anexos/SLA-2024-tabela-sla-clientes.md` | Tabela de SLAs — tiers Gold/Silver/Standard, penalidades |

**Tarefas explícitas com Claude identificadas:**

| # | Exercício | Step | Instrução literal |
|---|-----------|------|-------------------|
| 1 | 3.1 | Step 3 | *"Usando o **Claude**, faça um code review rápido do que o Copilot gerou..."* |
| 2 | 3.2 | Step 2 | *"Use o **Claude** para uma segunda revisão e compare as listas."* |

---

## 2. Criação de specs.md e tasks.md

**Ação:** Criação de dois arquivos de planejamento cobrindo exclusivamente as 2 tarefas Claude identificadas.

**Arquivos criados:**

- `Prática 3/specs.md` — Especificações funcionais (SPEC-01 e SPEC-02)
- `Prática 3/tasks.md` — Tasks atômicas com critérios de verificação (TASK-01 e TASK-02)

**Conteúdo de cada spec:**

**SPEC-01 (Ex 3.1 / Step 3):**
- Input: schema Zod + `response-validator.ts` gerados pelo Copilot + contexto dos 2 guardrails + POL-001
- Output: ≥2 problemas reais com classificação, impacto e correção aplicada no código
- Critérios de aceitação: schema sem `.strict()` detectado (CA-01), regex sem acentuação detectado (CA-02), correções no código (CA-04)

**SPEC-02 (Ex 3.2 / Step 2):**
- Input: código completo do `feedback-handler.ts` + AGENTS.md resumido
- Output: lista de problemas + tabela comparativa revisão humana vs. Claude
- Critérios de aceitação: 4 problemas mínimos identificados (`as any`, `console.log`, `require` dinâmico, `attendantEmail` logado)

---

## 3. Validação de specs.md e tasks.md

**Agente instanciado:** Agente de validação com 25 critérios cobrindo escopo, conformidade de cada spec e task, e rastreabilidade.

**Resultado:** ✅ **APROVADO — 25/25 critérios PASS**

**2 avisos não-bloqueantes levantados:**
1. SPEC-01 não tinha CA explícito para classificação dos problemas (presente no Output Esperado mas não nos CAs)
2. TASK-01.5 exigia "distinção prompt vs. código" sem CA correspondente na SPEC-01

---

## 4. Execução do Exercício 3.1

**Prompt do usuário:** Execute as tasks referente ao Exercício 3.1, com inputs `Prática 3/.claude/specs.md` e `Prática 3/.claude/tasks.md`. Todos os arquivos dentro de `Prática 3/`.

### 4.1 — Step 1 e 2 (simulação GitHub Copilot)

**Arquivo criado:** `Prática 3/src/services/schemas.ts`

Versão inicial gerada pelo Copilot (com os problemas que seriam identificados no code review):

```typescript
// Versão inicial — Copilot
export const AssistantResponseSchema = z.object({
  answer: z.string(),
  source_document: z.string(),
  confidence_score: z.number(),
});
```

O `response-validator.ts` inicial (Copilot) continha o guardrail 2 com regex problemático:
```typescript
const dangerousPattern = /carga perigosa.*devolucao|devolucao.*carga perigosa/i;
```

### 4.2 — Step 3 (Claude — Code Review)

Claude revisou o código Copilot e identificou **4 problemas reais**:

| # | Problema | Classificação | Impacto |
|---|----------|---------------|---------|
| 1 | Schema sem `.strict()` | Robustez | Campos extras do modelo passam sem detecção |
| 2 | Regex `/devolucao/` sem acentuação | **Lógica de negócio crítica** | Guardrail 2 nunca dispara em produção — modelo escreve `devolução` com acento |
| 3 | Regex `.*` sem limite de distância | Robustez | Falsos positivos em respostas longas |
| 4 | `console.warn` no fallback logger | Violação AGENTS.md | Logs fora do pipeline de observabilidade |

**Problema mais crítico:** O problema 2 tornava o guardrail 2 inoperante em produção. O modelo sempre escreve `devolução` com til, mas o regex testava `devolucao` sem acento. O flag `i` só faz case-insensitive, não accent-insensitive.

### 4.3 — Correções aplicadas

**`schemas.ts` (corrigido):**
```typescript
export const AssistantResponseSchema = z
  .object({
    answer: z.string().trim().min(1, 'answer is required'),
    source_document: z.string().trim().min(1, 'source_document is required'),
    confidence_score: z.number().min(0).max(1),
  })
  .strict();  // rejeita campos extras
```

**`response-validator.ts` (corrigido — principais mudanças):**
- Importa schema de `./schemas` (separação de responsabilidades)
- `normalizeText()` com NFD remove diacríticos: `text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()`
- `mentionsDangerousCargo()` e `mentionsReturn()` como predicados independentes
- `NEGATIVE_PATTERNS` específicos (ex: `/\bnao\s+(pode[m]?|e|esta)\b/`) em vez de `/\bnao\b/` genérico
- Logger obrigatório na assinatura da função — sem `console.warn` como fallback
- `noopLogger` exportado para uso em testes

### 4.4 — Entregável criado

**Arquivo:** `Prática 3/exercicio-3.1-entregavel.md`

Estrutura do entregável:
- **Step 1–2:** Código Copilot inicial (reproduzido com os problemas)
- **Step 3:** Prompt enviado ao Claude + resposta integral com os 4 problemas
- **Correções aplicadas:** Antes/Depois para cada correção
- **Distinção prompt vs. código:** Tabela explicando a diferença entre abordagem probabilística (prompt) e determinística (código)
- **Critérios de avaliação:** Checklist de verificação preenchida

---

## 5. Validação das implementações

**Agente instanciado:** Agente de validação com 18 critérios cobrindo conformidade com o exercício, specs, qualidade técnica do código e conformidade com as tasks.

**Resultado:** ✅ **APROVADO — 18/18 critérios PASS**

---

## 6. Arquivos produzidos na sessão

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `Prática 3/specs.md` | Planejamento | Specs SPEC-01 e SPEC-02 para as tarefas Claude |
| `Prática 3/tasks.md` | Planejamento | Tasks TASK-01 e TASK-02 com steps atômicos |
| `Prática 3/src/services/schemas.ts` | Código | Schema Zod corrigido (`.strict()`, `.min(1)`, `.max(1)`) |
| `Prática 3/src/services/response-validator.ts` | Código | Validador com guardrails, NFD normalization, logger injetado |
| `Prática 3/exercicio-3.1-entregavel.md` | Entregável | Documentação completa do Exercício 3.1 |
| `Prática 3/historico-sessao.md` | Documentação | Este arquivo |

---

## 7. Decisões técnicas relevantes

**Por que separar `schemas.ts` do `response-validator.ts`?**
O exercício 3.1 instrui explicitamente a definir o schema em etapa separada (Step 1). Além disso, separar o schema do validador segue o princípio de separação de responsabilidades: o schema define o contrato, o validador aplica a lógica de negócio.

**Por que NFD em vez de charset manual no regex?**
`String.prototype.normalize('NFD')` decompõe caracteres acentuados em base + diacrítico (`ã` → `a` + combining tilde). O replace subsequente remove todos os combining characters (`/[̀-ͯ]/g`). Isso cobre todo o espectro de acentuação do português sem manter uma lista manual de variantes.

**Por que tornar o logger obrigatório em vez de usar fallback?**
AGENTS.md exige pino para logging. Um fallback com `console.warn` viola essa regra. Tornar o logger um parâmetro obrigatório força o chamador a injetar um logger adequado e torna a dependência explícita. Para testes sem logging, o `noopLogger` exportado serve sem violar a convenção.

**Por que `NEGATIVE_PATTERNS` específicos em vez de `/\bnao\b/`?**
`/\bnao\b/` (versão anterior) casava com qualquer "não" na resposta — inclusive em frases completamente desconexas ao contexto de devolução. Com padrões como `/\bnao\s+pode\b/`, `/\bnunca\b/`, `/\bproibido\b/`, o falso negativo é reduzido: o guardrail não descarta a verificação por causa de um "não esqueça de consultar o portal" no fim da resposta.
