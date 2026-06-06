## Avaliação do Exercício 1.2

### Resumo
O entregável é tecnicamente sólido, bem estruturado e correto em conteúdo — system prompt específico, mapeamento estático/dinâmico completo com estimativas de tokens, iteração v1→v2 com mudanças concretas e documentadas. No entanto, o histórico de iteração revela que o participante enviou um único prompt abrangente ao GitHub Copilot (Claude) solicitando que ele executasse **todo** o ciclo de prototipagem, incluindo as "rodadas de teste" — que portanto foram simuladas pelo próprio modelo gerador, não realizadas em sessões separadas do Claude como exigido. Isso compromete a autenticidade da iteração e da análise crítica.

---

### Scores por Dimensão

| Dimensão | Score | Justificativa |
|----------|-------|---------------|
| D1 — Domínio Conceitual | 3 | Conceitos aplicados corretamente e com nuance ao domínio NovaTech: *lost in the middle*, orçamento de contexto (128K), posicionamento de chunks mais relevantes no início/fim, hierarquia de fontes com justificativa baseada na cadeia de autoridade da NovaTech, qualificadores de chunk ("úteis" vs "corridos") como risco de pipeline. |
| D2 — Uso de Ferramentas | 2 | Ferramenta usada com evidência (histórico presente). A iteração v1→v2 tem diferenças concretas e verificáveis (4 alterações documentadas com causa raiz), afastando a regra de corte. Porém o exercício esperava Claude (chat) como ambiente de teste separado — não GitHub Copilot gerando o deliverable inteiro. As Rodadas 1 e 2 foram simuladas dentro da mesma geração, não em sessões independentes, o que impede classificar o ciclo gerar→avaliar→iterar como genuíno. |
| D3 — Qualidade do Entregável | 3 | Artefato completo, correto e utilizável: system prompts v1 e v2 com 4 seções cada, mapeamento com estimativas de tokens e justificativas, 3 perguntas testadas com respostas documentadas, análise tabular por critério, registro formal de alterações, 4 decisões arquiteturais justificadas. Outro membro do time poderia usar sem pedir esclarecimentos. |
| D4 — Pensamento Crítico | 2 | A armadilha da carga perigosa foi identificada e a causa raiz foi articulada corretamente ("modelo seguiu ordem linear do chunk sem verificar exceções"). Isso evita o corte automático ≤1. Porém a análise foi inteiramente gerada pelo modelo em one-shot: não há evidência de raciocínio humano anterior ao uso da IA. O participante demonstrou competência em prompting (o prompt enviado ao Copilot é sofisticado), mas não demonstrou análise própria sobre os outputs. |
| D5 — Aplicabilidade ao Projeto | 3 | Referencia especificamente: 45 atendentes, Microsoft Teams + SharePoint, três áreas sem processo unificado de revisão, contradições PROC-042 v1 vs v2, multiplicadores regionais, hierarquia POL/PROC/SLA/FAQ com rastreabilidade à cadeia de autoridade NovaTech. |

**Score do exercício: 2.6**

---

### Verificação de Armadilhas

| Armadilha | Identificada? |
|-----------|---------------|
| "Prazo de devolução para carga perigosa" → resposta correta é NÃO é elegível (POL-001, seção 3.2), não "7 dias úteis com ressalva" | ✅ Identificada — o participante a classifica como "falha crítica" e documenta a causa raiz no prompt v1, corrigindo na v2 com linguagem direta ("NÃO são elegíveis") e verificação obrigatória de exceções como Etapa 1 do formato |

---

### Pontos Fortes

1. **Mapeamento estático/dinâmico com profundidade real:** A nota arquitetural sobre "degradação por excesso de chunks irrelevantes" e a estratégia de limitar a 3–5 chunks posicionando os mais relevantes nas bordas demonstra compreensão além do básico do exercício.
2. **Registro de alterações v1→v2 rastreável:** Cada mudança tem número, seção alterada, o que mudou, por que mudou e a falha que motivou — formato que seria utilizável em um log de versionamento real.
3. **Tratamento correto de dados ausentes (P3):** O prompt v1 já funcionava corretamente para o frete de Manaus — não inventou valor base, aplicou o multiplicador correto, orientou o próximo passo. Isso demonstra que o guardrail de não inventar foi internalizado no design.

---

### Pontos de Melhoria

1. **Separar o teste real da geração do deliverable:** O exercício pede que o Claude seja o *ambiente de teste* do system prompt, não o *gerador* do deliverable. Na próxima iteração: escrever o system prompt manualmente, abrir uma sessão separada do Claude, testar com os chunks reais, capturar as respostas, e só então documentar. A diferença é detectável pelo avaliador quando as "respostas do assistente" são formalmente perfeitas demais para uma sessão de chat real.
2. **Incluir evidência verificável do teste:** Prints ou exports da sessão de teste (timestamp, interface visível, histórico da conversa) tornam a evidência robusta. Um log de texto afirma que o teste aconteceu; um print prova.
3. **Endereçar a imprecisão de "úteis" na análise de P2:** O participante identificou a limitação do chunk mas a descartou como "problema do chunk, não do prompt". Uma melhoria concreta seria adicionar ao system prompt uma instrução do tipo "quando o chunk omitir qualificadores de prazo (úteis/corridos), declare a ambiguidade ao atendente" — isso demonstraria que o exercício de análise gerou ação no prompt, não apenas uma nota.

---

### Classificação

**Aprovado com distinção (2.6)**

---

### Tópicos da Trilha para Reforço

Score acima de 2.5 — nenhum reforço obrigatório. Recomendação opcional: revisitar a seção de **Engenharia de Contexto** com foco no princípio de "humano como árbitro do output da IA" — não para uso de ferramenta em si, mas para desenvolver o hábito de exercer julgamento próprio antes e depois de cada geração.