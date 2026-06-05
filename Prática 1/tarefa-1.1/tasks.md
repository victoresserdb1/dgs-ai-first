# Tasks — Tarefa 1.1: Análise de Viabilidade Técnica

## Pré-requisitos

- Acesso ao Claude (chat)
- Leitura completa do cenário do projeto NovaTech (exercicio-fase-1-entendimento.md)
- Leitura do Anexo A (documentação simulada da NovaTech)
- Leitura do Anexo B (chunks de referência do pipeline de RAG)

---

## Lista de Tarefas

### T1 — Preparar o prompt inicial para o Claude

- [ ] Copiar o texto completo do cenário NovaTech (seção "O Cenário" e "Informações adicionais fornecidas pela NovaTech").
- [ ] Copiar o trecho de informações técnicas adicionais: PDFs com tabelas de 15+ colunas, fluxogramas como imagens, documentos escaneados, wiki com links internos e macros customizadas, planilhas com fórmulas interdependentes.
- [ ] Copiar o conceito de context engineering aplicado a RAG (trecho sobre janela de contexto, qualidade dos chunks, orçamento de atenção, efeito *lost in the middle*).
- [ ] Formular instrução clara para o Claude solicitando a análise técnica com os quatro itens especificados nas specs.

---

### T2 — Gerar a análise técnica (Rodada 1)

- [ ] Abrir uma conversa nova no Claude e colar o prompt preparado na T1.
- [ ] Solicitar que o Claude produza a análise cobrindo:
  - Análise por tipo de fonte: PDFs com tabelas, PDFs escaneados, wiki com links/macros, planilhas com fórmulas.
  - Estimativa de tokens da base completa (800 PDFs × 10 páginas, 400 páginas wiki × 1.500 palavras, 50 planilhas), usando a regra de 0,75 palavras por token.
  - Análise de orçamento de contexto para GPT-4o (128K tokens, ~2K para system prompt, chunks de ~500 tokens).
  - Recomendação de estratégia de chunking justificada pelo tipo de pergunta e pelo efeito *lost in the middle*.
- [ ] Salvar a resposta completa como **rascunho v1**.

---

### T3 — Verificar cobertura do rascunho v1

- [ ] Confirmar que o rascunho v1 cobre todos os quatro tipos de fonte (PDFs com tabelas, PDFs escaneados, wiki, planilhas).
- [ ] Confirmar que cada tipo de fonte tem os três pontos: desafio, impacto na qualidade, estratégia de tratamento.
- [ ] Confirmar que a estimativa de tokens usa os parâmetros exatos especificados (800 PDFs, 400 páginas wiki, 50 planilhas, regra 0,75 palavras/token).
- [ ] Confirmar que a análise inclui referência explícita de quantas páginas de texto equivalem a ~500 tokens (calibração da estratégia de chunking).
- [ ] Confirmar que a análise de orçamento de contexto usa os parâmetros exatos (128K tokens, 2K para system prompt, chunks de 500 tokens).
- [ ] Confirmar que a estratégia de chunking menciona explicitamente o efeito *lost in the middle*.
- [ ] Se algum item estiver faltando, ajustar o prompt e regenerar antes de prosseguir para T4.

---

### T4 — Solicitar revisão crítica ao Claude (Rodada 2)

- [ ] Abrir nova mensagem na mesma conversa (ou nova conversa com o rascunho como contexto).
- [ ] Fornecer o rascunho v1 completo ao Claude.
- [ ] Solicitar que o Claude identifique:
  - Pontos fracos na análise.
  - Estimativas excessivamente otimistas.
  - Riscos não considerados.
- [ ] Salvar a resposta do Claude como **feedback da revisão**.

---

### T5 — Incorporar o feedback e gerar a versão final

- [ ] Ler o feedback recebido na T4.
- [ ] Para cada ponto levantado pelo Claude, decidir: incorporar, refutar com justificativa, ou registrar como item fora de escopo.
- [ ] Reescrever as seções do rascunho v1 que precisam de correção ou complemento.
- [ ] Gerar a **análise técnica final (v2)**.

---

### T6 — Documentar o histórico de iteração

- [ ] Criar registro documentando:
  - O que o Claude apontou na revisão (resumo dos pontos do feedback).
  - O que foi alterado entre v1 e v2 (listar as mudanças concretas).
  - O que não foi incorporado e por quê (se houver).

---

### T7 — Validar o entregável final

- [ ] Confirmar que o entregável contém: rascunho v1, feedback do Claude, análise final v2, e o registro de alterações.
- [ ] Verificar que a análise final cobre integralmente os quatro itens das specs.
- [ ] Verificar que os critérios de avaliação das specs são atendidos:
  - [ ] Diferentes fontes → diferentes estratégias.
  - [ ] Estimativa de tokens com raciocínio explícito.
  - [ ] Orçamento de contexto tratado como recurso limitado.
  - [ ] Chunking justificado por tipo de pergunta e efeito *lost in the middle*.
  - [ ] Comparação entre v1 e v2 mostra melhoria verificável.
