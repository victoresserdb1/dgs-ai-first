Com base na leitura completa dos artefatos, aqui está a avaliação:

---

## Avaliação do Exercício 1.3

### Resumo
O participante entregou um pipeline RAG funcional e bem documentado, com os três módulos obrigatórios, 5 testes reais com comparação ao gabarito (3/5 corretos por seção), 3 problemas identificados com propostas concretas, e 10 interações com o Copilot documentadas em detalhe. O principal gap de pensamento crítico é que a alucinação de fonte identificada e corrigida em T1 (NC-01) ocorre novamente em T3 — o LLM cita `[Seção: ### 2.1. Multiplicadores regionais]` como fonte, mas essa seção estava explicitamente ausente dos top 5 recuperados — e o participante avaliou como "✅ Citou as fontes corretamente".

### Scores por Dimensão

| Dimensão | Score | Justificativa |
|----------|-------|---------------|
| D1 — Domínio Conceitual | 3 | Chunking híbrido justificado com trade-offs específicos (tabelas, overlap, budget de contexto calculado: 450 + 5×375 = 2.375 tokens << 128K). Identifica limitações do all-MiniLM-L6-v2 (não resolve sinonímia geográfica "Manaus" → "Região Norte"). Propõe HyDE como correção — técnica avançada que demonstra leitura além do básico. Conexão explícita de todos os problemas à etapa de ingestão, não ao LLM. |
| D2 — Uso de Ferramentas | 3 | 10 interações documentadas no COPILOT-LOG com: comentário-prompt usado, código gerado pelo Copilot, ajustes manuais. Claude usado em todos os 5 testes com respostas reais. Iteração visível: NC-01 corrigiu resposta fabricada; NC-03 reformulou a função `evaluate_retrieval()` após identificar que avaliava documento em vez de seção. |
| D3 — Qualidade do Entregável | 3 | Três módulos funcionais. Taxa de retrieval por seção: 3/5 (T2, T4, T5 — exatamente no limiar). 3 problemas identificados (2 obrigatórios + 1 bônus), todos derivados de testes reais com causas-raiz na ingestão. CHUNKING.md dedicado. Rastreabilidade completa entre `test_results_raw.json` e test_results.md. |
| D4 — Pensamento Crítico | 2 | Catches sofisticados: NC-01 (alucinação de fonte em T1), NC-02 (divergência JSON vs markdown), NC-03 (função de avaliação permissiva demais — meta-análise do próprio sistema de avaliação). Porém, o mesmo padrão de alucinação de fonte ocorre em T3 (seção 2.1 citada pelo LLM mas ausente dos top 5) e foi classificado como "✅ Citou as fontes corretamente" — gap não-trivial dado que source hallucination é o modo de falha mais perigoso de RAG. |
| D5 — Aplicabilidade ao Projeto | 3 | Todas as 5 perguntas de teste são do domínio NovaTech. Hierarquia de documentos (normativo POL/PROC > contratual SLA > informal FAQ) tratada nos guardrails e na proposta de metadado `doc_type`. Referências a dados específicos: ramal 4500, multiplicador Norte 1.8 vs 1.6, disposições transitórias PROC-042-v2 seção 5, tier Gold 2h/24h. |

**Score do exercício: 2.8**

### Verificação de Armadilhas

O exercício 1.3 não lista armadilhas formais (ao contrário do 1.2). O único elemento próximo de armadilha é o T1 (carga perigosa → POL-001 deveria ser retornado, não só FAQ): o participante identificou o problema e documentou que o guardrail 3 deveria ter sido ativado — caught.

### Pontos Fortes

1. **Análise de causa-raiz nos problemas:** Não fica em "o chunk errado foi retornado" — explica mecanicamente *por que* (embedding sensível à posição de palavras-chave no título vs corpo, all-MiniLM-L6-v2 sem conhecimento geográfico externo). Propõe HyDE como correção estrutural, demonstrando conhecimento além da trilha básica.
2. **NC-03 — Meta-análise do sistema de avaliação:** Identificar que `evaluate_retrieval()` retornava CORRETO quando o documento estava presente mas a seção crítica estava ausente é uma análise fora do comum — o participante auditou a própria ferramenta de medição, não apenas o pipeline.
3. **Documentação de rastreabilidade:** O ciclo JSON (fonte autoritativa) → markdown (visão legível) foi mantido consistente após as correções. A reconciliação NC-02 mostra disciplina de engenharia.

### Pontos de Melhoria

1. **T3 — Alucinação de fonte não identificada:** A resposta do LLM em T3 cita `[Seção: ### 2.1. Multiplicadores regionais]` como fonte, mas o próprio relatório documenta que essa seção estava ausente dos top 5. O mesmo raciocínio aplicado em NC-01 ("o LLM não pode citar legitimamente um documento que não estava no seu contexto") se aplica aqui. A avaliação deveria ter marcado `guardrails_respected: NÃO` em T3 também, ou ao menos `PARCIAL`.
2. **Proposta de correção para Problema 1 — Correção B (HyDE):** A proposta está correta conceitualmente, mas teria se beneficiado de uma estimativa de impacto no volume de embeddings (37 chunks × 5 perguntas sintéticas = ~185 embeddings adicionais) e no tempo de ingestão — conectando a solução às restrições reais de uma PoC antes de licenças Azure.
3. **Sistema prompt — Guardrail de hierarquia sem threshold numérico:** O guardrail de prioridade de fontes instrui o LLM a priorizar POL > PROC > SLA > FAQ, mas sem definir quando escalar (ex: "se nenhuma POL/PROC estiver no contexto para pergunta normativa, escalar ao supervisor"). O T1 demonstra que a ausência desse threshold tem consequências reais.

### Classificação

**Aprovado com distinção** (score 2.8, faixa 2.5–3.0)

### Tópicos da Trilha para Reforço

Score acima de 2.5 — nenhum reforço obrigatório. Tema opcional para aprofundamento: **avaliação de fidelidade de RAG** (RAGAS ou critérios equivalentes: faithfulness — a resposta se baseia apenas no contexto? answer relevance? context recall?). O gap no T3 sugere que sistematizar a avaliação de faithfulness como métrica automática — não apenas revisão manual — reduziria o risco de inconsistências entre testes.