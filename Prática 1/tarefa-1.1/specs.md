# Specs — Tarefa 1.1: Análise de Viabilidade Técnica com Fundamentos de LLM e Engenharia de Contexto

## Objetivo

Produzir uma análise técnica de viabilidade do assistente de IA da NovaTech, considerando as características das fontes de documentação e o impacto do gerenciamento de contexto na arquitetura do sistema.

---

## Contexto do Projeto

**Empresa:** NovaTech — empresa de médio porte, setor de logística, 1.200 funcionários.

**Problema:** A equipe de atendimento (45 pessoas) gasta em média 12 minutos por chamado buscando informações em documentação interna. O objetivo é reduzir para menos de 2 minutos.

**Fontes de documentação existentes:**

| Fonte | Volume | Formato |
|-------|--------|---------|
| SharePoint corporativo | ~800 documentos | PDFs e Word |
| Wiki Confluence | ~400 páginas | Páginas wiki com macros |
| Pasta de rede | ~50 planilhas | Excel, atualizado mensalmente |

**Características técnicas específicas confirmadas:**
- PDFs do SharePoint incluem documentos com **tabelas complexas** (15+ colunas), **fluxogramas embutidos como imagens**, e **documentos escaneados** (necessitam OCR).
- Wiki do Confluence tem **links internos entre páginas** e usa **macros customizadas**.
- Planilhas contêm **fórmulas interdependentes**.

---

## Escopo da Análise

A análise técnica deve cobrir exatamente os quatro itens abaixo, nesta ordem.

### Item 1 — Análise por tipo de fonte

Para cada um dos quatro tipos de conteúdo listados abaixo, a análise deve cobrir três pontos:
1. **Desafio para o pipeline de RAG**: o que dificulta a extração e chunking desse tipo de conteúdo.
2. **Impacto na qualidade das respostas**: o que acontece com a resposta do assistente se o desafio não for tratado.
3. **Estratégia de tratamento**: abordagem técnica concreta para mitigar o problema.

Tipos de conteúdo a analisar:
- **PDFs com tabelas complexas** (ex: tabelas de frete com 15+ colunas)
- **PDFs escaneados** (requerem OCR antes do processamento)
- **Wiki com links internos e macros customizadas** (Confluence)
- **Planilhas com fórmulas interdependentes** (Excel)

### Item 2 — Estimativa de tamanho da base em tokens

Calcular a estimativa usando **exatamente** os parâmetros abaixo:

| Fonte | Quantidade | Tamanho médio |
|-------|-----------|---------------|
| PDFs | ~800 documentos | Média de 10 páginas cada |
| Wiki | ~400 páginas | Média de 1.500 palavras cada |
| Planilhas | ~50 arquivos | (estimativa justificada pelo participante) |

**Regra de conversão obrigatória:** ~0,75 palavras por token (ou seja, 1 palavra ≈ 1,33 tokens).

O participante deve:
- Estimar o total de palavras de cada fonte.
- Converter para tokens usando a regra acima.
- Apresentar o total consolidado da base.
- Incluir referência de quantas páginas de texto equivalem a ~500 tokens (para calibrar a estratégia de chunking).

### Item 3 — Análise de orçamento de contexto

Calcular usando **exatamente** os parâmetros abaixo:

- Modelo alvo: **GPT-4o**
- Janela de contexto: **128K tokens**
- Consumo do system prompt + instruções: **~2K tokens**
- Tamanho de chunk referência: **~500 tokens**

O participante deve responder:
1. Quantos chunks de ~500 tokens cabem em cada query, descontando o consumo do system prompt e reservando espaço para a resposta?
2. Como esse limite afeta a estratégia de chunking e retrieval (não é ilimitado)?
3. O que acontece se o contexto ultrapassar o orçamento — o que é descartado?

### Item 4 — Recomendação de estratégia de chunking

A recomendação deve ser:
- **Justificada pelo tipo de pergunta** que o atendente fará (consultas sobre prazos, regras de frete, SLAs, procedimentos de devolução).
- **Justificada pelo conceito de *lost in the middle***: informação posicionada no meio de contextos longos tende a ser "esquecida" pelo modelo.
- **Concreta**: especificar tamanho de chunk sugerido, critério de divisão (semântico, por seção, fixo por tokens, etc.), e como lidar com tabelas e listas que não podem ser cortadas ao meio.

---

## Processo de Iteração com Claude

A análise deve passar por **duas rodadas**:

**Rodada 1 — Geração inicial:**
- Usar o Claude (chat) para produzir o rascunho da análise técnica cobrindo os quatro itens acima.

**Rodada 2 — Revisão crítica:**
- Fornecer ao Claude o documento gerado na Rodada 1.
- Solicitar que o Claude identifique: pontos fracos, estimativas excessivamente otimistas, e riscos não considerados.
- Incorporar o feedback na versão final.

O entregável deve incluir **ambas as versões** (rascunho e final) e o histórico de iteração (o que o Claude apontou na revisão e o que foi alterado).

---

## Critérios de Avaliação

1. A análise demonstra que diferentes tipos de conteúdo exigem diferentes estratégias de extração e chunking (não trata tudo como texto plano).
2. A estimativa de tokens é razoável e mostra compreensão prática do conceito (não é apenas um número — deve incluir o raciocínio).
3. A análise de orçamento de contexto demonstra que context window é um recurso limitado que precisa ser gerenciado — a análise NÃO deve tratar contexto como ilimitado ou "quanto maior melhor".
4. A estratégia de chunking é justificada pelo tipo de pergunta esperado e considera o efeito *lost in the middle*.
5. A iteração com o Claude melhorou o documento de forma verificável — deve ser possível comparar as versões e ver o que mudou.

---

## Entregável

Arquivo único (ou conjunto de arquivos) contendo:
1. A análise técnica final (versão iterada).
2. O rascunho inicial (versão pré-revisão do Claude).
3. O feedback recebido do Claude na Rodada 2.
4. Registro das alterações incorporadas.
