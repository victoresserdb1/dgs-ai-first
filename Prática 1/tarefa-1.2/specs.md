# Specs — Tarefa 1.2: Prototipação de Prompt com Engenharia de Contexto

## Objetivo

Escrever o system prompt do assistente de IA da NovaTech, documentar a estrutura de contexto estático e dinâmico, testar com perguntas reais usando o Claude como ambiente de execução, analisar as respostas criticamente, e iterar o prompt com base nos resultados.

---

## Contexto do Projeto

**Ferramenta de teste:** Claude (chat) — o próprio Claude é usado como ambiente de execução do prompt.

**Guardrails definidos pelo Product Specialist (não-negociáveis):**

| # | Guardrail |
|---|-----------|
| 1 | O assistente deve **sempre citar a fonte** do documento utilizado. |
| 2 | O assistente **nunca deve inventar** prazos ou valores que não estejam explícitos na documentação fornecida. |
| 3 | Quando **não encontrar resposta** nos chunks disponíveis, deve dizer explicitamente que não encontrou e sugerir escalar para o supervisor. |
| 4 | Respostas em **português formal, mas acessível**. |

**Chunks disponíveis para os testes (exatamente os três listados abaixo):**

- **Chunk A** — POL-001, seção 3.2: *"Mercadorias podem ser devolvidas em até 7 dias úteis após o recebimento, exceto cargas classificadas como perigosas (classes 1 a 6 da ANTT). O cliente deve abrir chamado no portal e anexar fotos da mercadoria."*
- **Chunk B** — SLA-2024: *"Cliente Gold — resposta em até 2h, resolução em até 24h. Cliente Silver — resposta em até 4h, resolução em até 48h. Cliente Standard — resposta em até 8h, resolução em até 72h."*
- **Chunk C** — PROC-042-v2, seção 2: *"Frete especial para cargas acima de 500kg: valor base × multiplicador regional. Região Sul: 1.3. Região Sudeste: 1.1. Região Norte: 1.8. Região Nordeste: 1.5. Região Centro-Oeste: 1.4."*

**Conceito de contexto estático vs dinâmico:**
> Em um prompt de produção, algumas partes são **estáticas** (system prompt, guardrails — raramente mudam) e outras são **dinâmicas** (chunks recuperados, dados do cliente, histórico da conversa — mudam a cada query). A engenharia de contexto decide como essas partes se compõem: em que ordem, com que prioridade, e o que fazer quando o contexto total ultrapassa o orçamento.

---

## Escopo do Entregável

### Parte 1 — System Prompt v1

O system prompt deve ser estruturado em **quatro seções obrigatórias**:

1. **Identidade**: quem é o assistente, para qual contexto foi criado, para quem responde.
2. **Regras**: os quatro guardrails definidos pelo Product Specialist, traduzidos em instruções diretas ao modelo.
3. **Formato de resposta**: como a resposta deve ser estruturada (ex: resposta objetiva, citação da fonte, instrução de escalada quando aplicável).
4. **Instruções para uso dos chunks**: como o modelo deve usar as informações dos chunks fornecidos no contexto dinâmico, o que fazer quando um chunk contradiz outro, e a **ordem de prioridade** quando houver conflito entre fontes.

A ordem de prioridade entre fontes deve ser **explicitamente definida** (ex: documentos normativos > FAQ informal), pois a documentação da NovaTech possui versões conflitantes (PROC-042 v1 vs v2) e documentos de status informais (FAQ-Atendimento sem validação de Compliance).

### Parte 2 — Mapeamento de Contexto Estático/Dinâmico

Documento que identifica, para cada elemento do prompt:

| Elemento | Tipo (Estático/Dinâmico) | Estimativa de tamanho em tokens |
|----------|--------------------------|--------------------------------|
| Identidade | Estático | (estimado pelo participante) |
| Regras/Guardrails | Estático | (estimado pelo participante) |
| Instruções de formato | Estático | (estimado pelo participante) |
| Instruções de uso dos chunks | Estático | (estimado pelo participante) |
| Chunks recuperados | Dinâmico | (estimado pelo participante) |
| Dados do cliente (tier, histórico) | Dinâmico | (estimado pelo participante) |
| Histórico de conversa | Dinâmico | (estimado pelo participante) |
| Pergunta do atendente | Dinâmico | (estimado pelo participante) |

### Parte 3 — Testes no Claude (Rodada 1)

**Procedimento obrigatório:**
1. Abrir uma conversa nova no Claude.
2. Colar o system prompt v1 como instrução inicial.
3. Colar os três chunks (A, B e C) como contexto disponível.
4. Fazer as três perguntas abaixo **na sequência exata**, como se fosse o atendente:

**Pergunta 1:** "Qual o prazo de devolução para carga perigosa?"

**Pergunta 2:** "Meu cliente é Gold, qual o SLA de resolução?"

**Pergunta 3:** "Quanto custa o frete para 600kg para Manaus?"

### Parte 4 — Análise Crítica das Respostas (Rodada 1)

Para cada uma das três respostas obtidas, documentar:

1. **A resposta está correta?** — Verificar contra a fonte de verdade (Anexo A).
2. **Citou a fonte?** — Guardrail 1 foi respeitado?
3. **Respeitou os guardrails?** — Verificar cada um dos 4 guardrails.
4. **Onde errou ou foi impreciso?** — Análise crítica.

**Atenção especial à Pergunta 1:** A resposta correta, conforme POL-001 seção 3.2, é que cargas perigosas **NÃO são elegíveis** para devolução pelo processo padrão. Se o assistente responder "7 dias úteis" sem mencionar a exceção, isso é uma falha crítica.

**Atenção especial à Pergunta 3:** Manaus fica na Região Norte. O Chunk C informa multiplicador regional Norte = 1.8. A pergunta é sobre 600kg (faixa 500–1.000kg, fator de peso 1.0 na PROC-042-v2). O assistente não tem o valor base no contexto, portanto não pode calcular o valor final — deve informar que precisa do valor base e citar a fórmula.

### Parte 5 — System Prompt v2 (Iterado)

Com base na análise crítica da Parte 4:
- Reescrever as seções do system prompt que geraram respostas inadequadas.
- Documentar **o que foi alterado** e **por quê**.

### Parte 6 — Testes no Claude (Rodada 2)

- Repetir o mesmo procedimento da Parte 3 com o system prompt v2.
- Fazer as mesmas três perguntas.
- Documentar as respostas da Rodada 2.
- Comparar com as respostas da Rodada 1 e registrar as melhorias.

---

## Critérios de Avaliação

1. O system prompt é **específico** ao domínio NovaTech — não é genérico como "você é um assistente útil".
2. O mapeamento estático/dinâmico demonstra compreensão real de engenharia de contexto — não é apenas "o prompt completo".
3. A análise das falhas demonstra **pensamento crítico** — especialmente para a Pergunta 1, onde a resposta correta é que carga perigosa NÃO pode ser devolvida pelo processo padrão.
4. A iteração mostra **melhoria concreta** entre v1 e v2 — deve ser possível comparar e ver o que mudou.
5. O participante demonstra que **usou o Claude como ambiente de teste real** (respostas copiadas da conversa, não inventadas).

---

## Entregável

Documento contendo, na ordem:
1. System prompt v1 (com mapeamento estático/dinâmico).
2. Respostas obtidas na Rodada 1 (copiadas diretamente do Claude).
3. Análise crítica das respostas da Rodada 1.
4. System prompt v2 com registro das alterações.
5. Respostas obtidas na Rodada 2 (copiadas diretamente do Claude).
6. Comparação entre Rodada 1 e Rodada 2.
