## Avaliação do Exercício 3.1

### Resumo
O entregável está completo, tecnicamente consistente e alinhado ao objetivo de harness determinístico do cenário 3. O participante implementou structured output com validação Zod, aplicou os dois guardrails com bloqueio efetivo e apresentou revisão crítica com problemas reais e correções concretas. A distinção entre instrução via prompt (probabilística) e bloqueio em código (determinístico) foi explicada de forma clara e aplicada ao contexto NovaTech.

### Scores por Dimensão

| Dimensão | Score | Justificativa |
|----------|-------|---------------|
| D1 — Domínio Conceitual | 3 | Demonstra entendimento sólido de structured outputs e guardrails determinísticos. Explica corretamente por que validação de schema e regras de bloqueio em código complementam, e não substituem, o prompt. |
| D2 — Uso de Ferramentas | 3 | Há evidência explícita de uso do Copilot para geração inicial (schema e validador) e do Claude para revisão crítica posterior, com prompt de revisão registrado, comparação prática e aplicação de correções no código. |
| D3 — Qualidade do Entregável | 3 | Entregável completo com schema Zod válido, validação antes de conteúdo, guardrail 1 e guardrail 2 com bloqueio real e fallback seguro. Não apenas registra log: rejeita e substitui resposta em falhas. |
| D4 — Pensamento Crítico | 3 | A revisão identifica problemas reais e relevantes (strict do schema, fragilidade de regex, acentuação, risco de falso positivo). As correções propostas e aplicadas mostram julgamento técnico próprio, sem aceitação acrítica. |
| D5 — Aplicabilidade ao Projeto | 3 | Solução está contextualizada no caso NovaTech, com referência à POL-001 e ao comportamento esperado do assistente em produção. O guardrail cobre risco de negócio crítico e a justificativa conecta diretamente ao cenário. |

**Score do exercício: 3.0**

### Verificação de Armadilhas
- Armadilha: schema permissivo com campos extras (sem strict). Status: identificada e corrigida com strict no schema.
- Armadilha: regra de carga perigosa e devolução vulnerável a variações linguísticas (acentuação e formulações). Status: identificada e corrigida com normalização e padrões mais robustos.
- Armadilha: implementação que só loga e não bloqueia. Status: não ocorreu na versão final; o código bloqueia e retorna resposta segura.
- Armadilha: confundir prompt com garantia de regra de negócio. Status: identificada e tratada corretamente, com enforcement determinístico em código.

### Pontos Fortes
- Implementação objetiva de harness: valida contrato, aplica regras críticas e define fallback seguro.
- Boa qualidade de revisão técnica, com problemas concretos e impacto bem explicado.
- Excelente alinhamento ao contexto de risco do domínio (devolução de carga perigosa).

### Pontos de Melhoria
- Incluir testes unitários explícitos para casos limite de linguagem (sinônimos, negações ambíguas, frases longas).
- Acrescentar verificação de regressão para reduzir chance de falso positivo e falso negativo ao evoluir regex/padrões.
- Documentar contrato de logging esperado no chamador para garantir padronização operacional em todos os fluxos.

### Classificação
Aprovado com distinção (2.5-3.0)

### Tópicos da Trilha para Reforço
Não aplicável. Score >= 2.5.
