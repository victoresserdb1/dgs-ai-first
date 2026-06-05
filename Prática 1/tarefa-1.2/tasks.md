# Tasks — Tarefa 1.2: Prototipação de Prompt com Engenharia de Contexto

## Pré-requisitos

- Acesso ao Claude (chat)
- Leitura completa do cenário NovaTech e dos guardrails definidos pelo Product Specialist
- Leitura do Anexo A (fonte de verdade para validação das respostas)
- Leitura do Anexo B (chunks de referência)
- Os três chunks de teste (A, B, C) devem estar em mãos antes de iniciar

---

## Lista de Tarefas

### T1 — Escrever o System Prompt v1

- [ ] Criar a seção **Identidade**: definir quem é o assistente, para qual contexto foi criado (atendimento NovaTech), e para quem responde (atendentes da equipe de suporte ao cliente).
- [ ] Criar a seção **Regras**: traduzir os quatro guardrails em instruções diretas ao modelo:
  - Regra para sempre citar a fonte do documento.
  - Regra para nunca inventar prazos ou valores não presentes na documentação.
  - Regra para dizer explicitamente que não encontrou resposta e sugerir escalar ao supervisor.
  - Regra para responder em português formal, mas acessível.
- [ ] Criar a seção **Formato de resposta**: especificar estrutura esperada (resposta objetiva, citação de fonte ao final, instrução de escalada quando aplicável).
- [ ] Criar a seção **Instruções para uso dos chunks**: especificar como o modelo usa os chunks do contexto dinâmico, o que fazer quando dois chunks se contradizem, e a **ordem de prioridade** entre fontes (documentos normativos POL/PROC/SLA têm prioridade sobre FAQ informal).

---

### T2 — Documentar o Mapeamento de Contexto Estático/Dinâmico

- [ ] Listar cada elemento do prompt (identidade, regras, formato, instruções de chunks, chunks recuperados, dados do cliente, histórico, pergunta).
- [ ] Classificar cada elemento como **Estático** (presente em toda query) ou **Dinâmico** (muda por query).
- [ ] Estimar o tamanho em tokens de cada elemento (usar a regra ~0,75 palavras por token).
- [ ] Calcular o total estimado de tokens estáticos e o espaço restante para elementos dinâmicos.

---

### T3 — Preparar o ambiente de teste no Claude

- [ ] Abrir uma **conversa nova** no Claude (não reutilizar conversas anteriores).
- [ ] Formatar o input inicial com: system prompt v1 + os três chunks (A, B e C) identificados por label.
- [ ] Verificar que os chunks estão posicionados conforme as instruções do system prompt (ex: após as instruções, antes da pergunta).

---

### T4 — Executar os testes — Rodada 1

- [ ] Enviar a **Pergunta 1**: "Qual o prazo de devolução para carga perigosa?"
  - Copiar a resposta completa do Claude.
- [ ] Enviar a **Pergunta 2**: "Meu cliente é Gold, qual o SLA de resolução?"
  - Copiar a resposta completa do Claude.
- [ ] Enviar a **Pergunta 3**: "Quanto custa o frete para 600kg para Manaus?"
  - Copiar a resposta completa do Claude.

---

### T5 — Analisar criticamente as respostas da Rodada 1

Para cada uma das três respostas:

- [ ] **Pergunta 1 — Carga perigosa:**
  - Verificar se a resposta indica que carga perigosa NÃO é elegível para devolução pelo processo padrão (conforme POL-001 seção 3.2). Resposta correta NÃO é "7 dias úteis".
  - Verificar se citou a fonte (POL-001, seção 3.2).
  - Verificar se mencionou o encaminhamento para Gestão de Riscos (ramal 4500), caso presente no chunk.
  - Registrar se o guardrail de não inventar informações foi respeitado.

- [ ] **Pergunta 2 — SLA Gold:**
  - Verificar se a resposta informa resolução em até 24h úteis.
  - Verificar se citou a fonte (SLA-2024).
  - Verificar se a resposta é em português formal.

- [ ] **Pergunta 3 — Frete 600kg Manaus:**
  - Verificar se a resposta aplica o multiplicador da Região Norte (1.8 conforme PROC-042-v2).
  - Verificar se a resposta indica que o valor base é necessário para calcular o total (não está no chunk fornecido).
  - Verificar se citou a fonte (PROC-042-v2).
  - Verificar se o assistente não inventou um valor final sem ter o valor base.

- [ ] Documentar cada falha encontrada com indicação de qual guardrail foi violado ou qual informação está incorreta.

---

### T6 — Iterar o System Prompt — Gerar v2

- [ ] Com base na análise da T5, identificar quais seções do system prompt causaram as falhas.
- [ ] Reescrever as seções problemáticas.
- [ ] Registrar para cada alteração: o que foi mudado, por que foi mudado, e qual falha da Rodada 1 motivou a mudança.
- [ ] Gerar o **System Prompt v2** consolidado.

---

### T7 — Executar os testes — Rodada 2

- [ ] Abrir uma **nova conversa** no Claude (não continuar a conversa da Rodada 1).
- [ ] Colar o system prompt v2 + os mesmos três chunks (A, B e C).
- [ ] Enviar as mesmas três perguntas na mesma ordem:
  - "Qual o prazo de devolução para carga perigosa?"
  - "Meu cliente é Gold, qual o SLA de resolução?"
  - "Quanto custa o frete para 600kg para Manaus?"
- [ ] Copiar as respostas completas da Rodada 2.

---

### T8 — Comparar Rodada 1 e Rodada 2

- [ ] Para cada pergunta, colocar lado a lado a resposta da Rodada 1 e da Rodada 2.
- [ ] Registrar quais falhas da Rodada 1 foram corrigidas na Rodada 2.
- [ ] Registrar se surgiram novas falhas na Rodada 2 (regressões).

---

### T9 — Consolidar o entregável

- [ ] Confirmar que o entregável contém, na ordem: system prompt v1, mapeamento estático/dinâmico, respostas da Rodada 1, análise crítica, system prompt v2 com registro de alterações, respostas da Rodada 2, comparação final.
- [ ] Confirmar que todas as respostas são cópias reais do Claude (não resumidas ou parafraseadas).
- [ ] Confirmar que a análise da Pergunta 1 menciona explicitamente a exceção de carga perigosa (resposta correta = não elegível para processo padrão).
