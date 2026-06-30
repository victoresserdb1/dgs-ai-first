## Avaliação do Exercício 3.2

### Resumo
O entregável está completo, bem estruturado e demonstra revisão crítica real antes do uso de IA. O participante identificou todas as armadilhas obrigatórias na análise humana e apresentou comparação honesta com a revisão do Claude. A reescrita do módulo em [Prática 3/src/functions/feedback/handler.ts](Prática%203/src/functions/feedback/handler.ts) corrige as violações principais do AGENTS.md e melhora a robustez operacional.

### Scores por Dimensão

| Dimensão | Score | Justificativa |
|----------|-------|---------------|
| D1 — Domínio Conceitual | 3 | Demonstra entendimento sólido de Revisão Crítica de Outputs de IA: classifica cada problema por tipo (violação de regra, segurança, bug potencial), explica impacto e diferencia achados óbvios de achados por análise de fluxo. |
| D2 — Uso de Ferramentas | 3 | Há evidência clara de uso sequencial e crítico das ferramentas: revisão humana primeiro, prompt explícito para Claude, comparação estruturada, e reescrita final com suporte do Copilot. Não houve aceitação acrítica. |
| D3 — Qualidade do Entregável | 3 | Entregável completo e acionável: revisão própria, revisão IA, comparação e código reescrito funcional. O código final usa Zod, pino, import estático, evita log de PII e adiciona tratamento de erros, atendendo ao objetivo do exercício. |
| D4 — Pensamento Crítico | 3 | Exercício humano-primeiro foi cumprido com substância: os 4 problemas mandatórios foram identificados antes do Claude, com impacto técnico concreto. A comparação é honesta ao reconhecer itens que só o Claude encontrou. |
| D5 — Aplicabilidade ao Projeto | 3 | O conteúdo está fortemente conectado ao contexto NovaTech e ao AGENTS.md do cenário 2, incluindo implicações de observabilidade, privacidade e operação em Azure Functions/CosmosDB. |

**Score do exercício: 3.0**

### Verificação de Armadilhas
- Armadilha 1: uso de as any sem validação Zod: Identificada na revisão humana e na revisão do Claude.
- Armadilha 2: uso de console.log em vez de pino: Identificada na revisão humana e na revisão do Claude.
- Armadilha 3: require dinâmico dentro da função: Identificada na revisão humana e na revisão do Claude.
- Armadilha 4: attendantEmail (PII) sendo logado: Identificada na revisão humana e na revisão do Claude.

### Pontos Fortes
- Revisão humana inicial robusta, com classificação clara por tipo de risco e impacto.
- Comparação humano vs Claude transparente, sem forçar equivalência artificial entre as análises.
- Reescrita técnica consistente com AGENTS.md e com melhorias adicionais de robustez (env var e try/catch).

### Pontos de Melhoria
- Endurecer o schema Zod com política explícita para campos extras (por exemplo, rejeitar ou sanitizar propriedades não previstas).
- Definir política para retenção/minimização de PII persistida (não apenas em logs), especialmente para attendantEmail.
- Incluir teste automatizado cobrindo os 4 problemas obrigatórios para evitar regressão futura no handler.

### Classificação
Aprovado com distinção (2.5-3.0)

### Tópicos da Trilha para Reforço
Não aplicável (score >= 2.5).