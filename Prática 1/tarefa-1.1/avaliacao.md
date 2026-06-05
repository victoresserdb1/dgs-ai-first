

## Avaliação do Exercício 1.1

### Resumo
O entregável é tecnicamente robusto, específico ao contexto NovaTech e cobre integralmente os quatro blocos exigidos (fontes, tokens, orçamento de contexto e chunking). A versão v2 melhora de forma verificável em relação à v1, principalmente ao tratar risco de versões conflitantes, custo/latência de OCR e refinamento de estratégia contra lost in the middle. O principal ponto de atenção é a evidência de uso da ferramenta pedida (Claude), que aparece de forma indireta, sem transcrição clara da interação.

### Scores por Dimensão

| Dimensão | Score | Justificativa |
|----------|-------|---------------|
| D1 — Domínio Conceitual | 3 | Demonstra domínio avançado e aplicado: diferencia desafios por tipo de fonte, trata contexto como recurso escasso, discute trade-offs de retrieval e explicita impacto do lost in the middle com estratégia de posicionamento. |
| D2 — Uso de Ferramentas | 2 | Há iteração v1 → revisão crítica → v2 com melhorias concretas, mas a evidência de que essa revisão foi de fato conduzida no Claude não está forte no histórico anexado (predomina histórico de Copilot e logs de execução). |
| D3 — Qualidade do Entregável | 3 | Entregável completo, estruturado, acionável e com cálculos consistentes. Inclui estimativas, critérios operacionais, mecanismos de descarte e governança de ciclo de vida, permitindo uso direto por engenharia/arquitetura. |
| D4 — Pensamento Crítico | 3 | Não há aceitação acrítica: o participante identifica riscos sistêmicos (conflito de versões, degradação silenciosa, latência de ingestão), revisa premissas e ajusta números com justificativa técnica. |
| D5 — Aplicabilidade ao Projeto | 3 | Altamente conectado ao domínio NovaTech: referências a PROC-042 v1/v2, rotina mensal de planilhas, uso do stack Azure já existente e impactos operacionais de atendimento. |

**Score do exercício: 2.8**

### Verificação de Armadilhas
- Armadilha intencional específica do exercício 1.1: nenhuma armadilha formal foi definida na skill (diferente do 1.2).
- Red flags do checklist 1.1:
1. Converter tudo para texto: não ocorreu (há estratégias específicas por fonte).
2. Estimativa sem cálculo/erro grosseiro: não ocorreu (cálculo detalhado por fonte).
3. Usar todo contexto sem gestão: não ocorreu (orçamento explícito e limite prático de chunks).
4. Chunking fixo sem justificativa: não ocorreu (estratégia híbrida por tipo de conteúdo).
5. Sem iteração: não ocorreu (v1, revisão e v2 presentes).

### Pontos Fortes
- Excelente especificidade por fonte, com impacto direto na qualidade de resposta e estratégia técnica correspondente.
- Boa maturidade de engenharia de contexto: separa limite teórico da janela e orçamento operacional real.
- Iteração substantiva e rastreável no conteúdo, com alterações relevantes entre v1 e v2.

### Pontos de Melhoria
- Fortalecer evidência de ferramenta: anexar trechos objetivos da conversa com Claude (prompt, críticas recebidas e resposta incorporada).
- Tornar a estimativa ainda mais auditável: incluir cenário otimista/base/pessimista em todos os blocos de volume (não só em planilhas).
- Incluir critérios de aceite quantitativos para qualidade de retrieval em produção (exemplo: top-k hit rate por tipo de pergunta).

### Classificação
Aprovado com distinção (2.5-3.0)

### Tópicos da Trilha para Reforço
Não aplicável, pois o score ficou acima de 2.5.