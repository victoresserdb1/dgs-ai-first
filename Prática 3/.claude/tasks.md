# Tasks — Tarefas com Claude (Cenário 3 — Fase de Governança)

> Escopo: apenas as etapas dos exercícios 3.1 e 3.2 que pedem **explicitamente** o uso do Claude.
> Cada task referencia a spec correspondente e detalha os steps atômicos de execução.

---

## TASK-01 — Code Review Claude: response-validator.ts

**Ref:** [SPEC-01](specs.md#spec-01--code-review-claude-response-validatorts)
**Exercício:** 3.1 — Step 3
**Ferramenta:** Claude (chat)
**Pré-condição:** Steps 1 e 2 do exercício 3.1 concluídos — o Copilot já gerou o schema Zod e o `response-validator.ts`

---

### Steps

#### TASK-01.1 — Montar o prompt para o Claude

Construir o prompt completo que será enviado ao Claude, contendo:

- [ ] O schema Zod gerado pelo Copilot (campo `answer`, `source_document`, `confidence_score`)
- [ ] O código do `response-validator.ts` completo gerado pelo Copilot
- [ ] O contexto dos 2 guardrails (texto exato das regras de negócio)
- [ ] A regra POL-001 relevante: cargas perigosas (ANTT classes 1–6) não são devolvíveis em nenhuma hipótese
- [ ] A instrução explícita ao Claude: *"Faça um code review deste código. Identifique ao menos 2 problemas reais — não genéricos. Para cada problema: descreva o problema, classifique (segurança / robustez / conformidade AGENTS.md / lógica de negócio), explique o impacto, e proponha a correção com código."*

**Critério de verificação:** O prompt está completo antes de submeter — não faltam partes do código nem contexto de negócio.

---

#### TASK-01.2 — Submeter ao Claude e registrar resposta

- [ ] Submeter o prompt ao Claude (chat)
- [ ] Copiar a resposta completa do Claude sem editar
- [ ] Registrar a resposta no entregável do exercício (documento de resposta ou seção dedicada)

**Critério de verificação:** A resposta do Claude está registrada integralmente — não resumida nem parafraseada.

---

#### TASK-01.3 — Verificar se os problemas são reais

Para cada problema listado pelo Claude:

- [ ] Confirmar que o problema existe no código apresentado (não é fabricado)
- [ ] Confirmar que o problema tem impacto real se não corrigido
- [ ] Se o Claude listou um "problema" que não é real, registrar como falso positivo na comparação

**Critério de verificação mínimo (conforme SPEC-01 CA-01 e CA-02):**
- [ ] Claude identificou que o schema Zod não usa `.strict()` (campos extras passam sem detecção)
- [ ] Claude identificou que o regex não cobre acentuação (`devolução` com til) e/ou variações semânticas equivalentes

---

#### TASK-01.4 — Aplicar correções ao código

Para cada problema confirmado como real:

- [ ] Aplicar a correção no arquivo `response-validator.ts`
- [ ] Documentar cada correção com o padrão: `Problema → Impacto → Código antes → Código depois`

Exemplo de documentação de correção:
```
Problema: schema sem .strict()
Impacto: campos extras na resposta passam pela validação silenciosamente
Antes:  z.object({ answer: z.string(), ... })
Depois: z.object({ answer: z.string(), ... }).strict()
```

**Critério de verificação:** Cada correção está no código — não apenas no texto do entregável.

---

#### TASK-01.5 — Documentar o entregável final

Estrutura obrigatória do entregável (conforme critérios do exercício 3.1):

```
## Code Review — Claude (Exercício 3.1 / Step 3)

### Problemas identificados
| # | Problema | Classificação | Impacto |
|---|----------|---------------|---------|
| 1 | ...      | ...           | ...     |
| 2 | ...      | ...           | ...     |

### Correções aplicadas
[Código corrigido para cada problema]

### Distinção prompt vs. código
[Breve nota explicando por que este guardrail é implementado em código (determinístico) 
e não apenas no prompt (probabilístico)]
```

**Critério de verificação:** O entregável cobre os critérios de avaliação do exercício: schema válido, guardrails que realmente bloqueiam (não apenas logam), problemas reais (não inventados), distinção prompt vs. código.

---

## TASK-02 — Segunda Revisão Claude: feedback-handler.ts

**Ref:** [SPEC-02](specs.md#spec-02--segunda-revisão-claude-feedback-handlerts)
**Exercício:** 3.2 — Step 2
**Ferramenta:** Claude (chat)
**Pré-condição:** Step 1 do exercício 3.2 concluído — o desenvolvedor já fez sua própria revisão e tem uma lista com problemas classificados

---

### Steps

#### TASK-02.1 — Confirmar que a revisão humana foi concluída

- [ ] A revisão humana (Step 1) está documentada com problemas classificados
- [ ] A lista humana inclui ao menos os 4 problemas mínimos exigidos pelo exercício (ou registra que alguns não foram encontrados)

**Critério de verificação:** Não avançar para TASK-02.2 sem a revisão humana documentada — a comparação só é válida se ambas as revisões foram feitas de forma independente.

---

#### TASK-02.2 — Montar o prompt para o Claude

Construir o prompt completo contendo:

- [ ] O código completo do `feedback-handler.ts` (exatamente como fornecido no exercício, sem edições)
- [ ] O AGENTS.md resumido com as 5 convenções do projeto:
  - TypeScript strict mode — sem `as any`
  - Zod para validação de input
  - `pino` para logging (nunca `console.log`)
  - Nunca logar dados pessoais (e-mail, nome, CPF, telefone)
  - Imports estáticos no topo (nunca `require()` dinâmico)
- [ ] A instrução ao Claude: *"Faça uma revisão de código. Para cada problema encontrado, informe: a linha ou trecho afetado, a descrição do problema, a classificação (violação AGENTS.md / problema de segurança / bug potencial), e o impacto se não corrigido."*

**Critério de verificação:** O prompt não inclui a lista da revisão humana — o Claude deve revisar de forma independente.

---

#### TASK-02.3 — Submeter ao Claude e registrar resposta

- [ ] Submeter o prompt ao Claude (chat)
- [ ] Copiar a resposta completa do Claude sem editar
- [ ] Registrar a resposta no entregável do exercício

**Critério de verificação:** A resposta do Claude está registrada integralmente.

---

#### TASK-02.4 — Verificar cobertura mínima obrigatória

Confirmar que a resposta do Claude cobriu os 4 problemas mínimos exigidos pelo exercício:

| Problema mínimo | Linha no código | Claude identificou? |
|----------------|-----------------|---------------------|
| `as any` sem validação Zod | `const body = await request.json() as any` | ✓/✗ |
| `console.log` em vez de pino | `console.log('Feedback recebido:', ...)` | ✓/✗ |
| `require` dinâmico | `const { CosmosClient } = require('@azure/cosmos')` | ✓/✗ |
| `attendantEmail` logado (dado pessoal) | Dentro do `console.log` com `JSON.stringify(feedback)` | ✓/✗ |

Se algum dos 4 não foi identificado pelo Claude, registrar como lacuna na comparação.

---

#### TASK-02.5 — Criar tabela comparativa

Construir a tabela comparando revisão humana vs. revisão Claude:

```markdown
| Problema | Encontrado pelo humano | Encontrado pelo Claude |
|----------|------------------------|------------------------|
| `as any` sem validação Zod | ✓/✗ | ✓/✗ |
| `console.log` em vez de pino | ✓/✗ | ✓/✗ |
| `require` dinâmico | ✓/✗ | ✓/✗ |
| `attendantEmail` logado (dado pessoal) | ✓/✗ | ✓/✗ |
| [Outros problemas adicionais] | ✓/✗ | ✓/✗ |
```

Acrescentar ao final da tabela uma nota de análise honesta:
- O que a revisão humana capturou que o Claude não capturou (se houver)
- O que o Claude capturou que a revisão humana não capturou (se houver)
- Conclusão: em que tipo de problema cada abordagem foi mais eficaz

**Critério de verificação:** A tabela cobre os 4 problemas mínimos e inclui a nota de análise. Divergências são registradas — não omitidas para parecer que ambas chegaram ao mesmo resultado.

---

#### TASK-02.6 — Documentar o entregável final

Estrutura obrigatória do entregável (conforme critérios do exercício 3.2):

```
## Revisão Claude — feedback-handler.ts (Exercício 3.2 / Step 2)

### Resposta do Claude (completa)
[Resposta integral copiada do Claude]

### Tabela comparativa: humano vs. Claude
[Tabela TASK-02.5]

### Análise da comparação
[Nota honesta sobre divergências e aprendizados]
```

**Critério de verificação:** O entregável cobre os critérios de avaliação do exercício: 4 problemas mínimos identificados, comparação honesta, análise das diferenças.

---

## Resumo de Rastreabilidade

| Task | Ref Spec | Exercício | Step | Ferramenta |
|------|----------|-----------|------|------------|
| TASK-01 | SPEC-01 | 3.1 | Step 3 | Claude (chat) |
| TASK-02 | SPEC-02 | 3.2 | Step 2 | Claude (chat) |
