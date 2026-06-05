# Análise de Viabilidade Técnica — Assistente de IA NovaTech
## Tarefa 1.1 | Desenvolvedor Sênior

---

# PARTE 1 — RASCUNHO INICIAL (v1)

> Gerado na Rodada 1 antes da revisão crítica.

---

## 1. Análise por Tipo de Fonte

### 1.1 PDFs com Tabelas Complexas (15+ colunas)

**Desafio para o pipeline de RAG**

Parsers de PDF convencionais (PyPDF2, pdfplumber, Apache Tika) extraem texto de tabelas de forma sequencial, linha por linha. Uma tabela de frete com 15+ colunas (ex: região × faixa de peso × tipo de carga × multiplicadores × prazo) perde completamente sua estrutura relacional quando serializada em texto plano. O chunker, ao dividir por tamanho fixo de tokens, pode cortar a tabela no meio, separando cabeçalhos das linhas de dados, ou misturar linhas de tabelas diferentes.

Exemplo real do problema: a tabela de multiplicadores regionais da PROC-042 tem apenas 5 linhas × 2 colunas — já problemática. Escale para 15+ colunas e o texto extraído se torna ininteligível sem referenciar o cabeçalho original.

**Impacto na qualidade das respostas**

O modelo recebe um chunk com dados numéricos sem contexto de coluna. Resultado: o assistente ou confunde colunas ("multiplicador Sul = 1.3" vira "Sul: prazo 1.3 dias"), ou alucina valores ao tentar reconstruir a estrutura que não está explícita no texto. Em um sistema de atendimento logístico onde o atendente precisa do valor exato de frete, esse tipo de erro tem impacto direto em cobranças incorretas.

**Estratégia de tratamento**

1. **Extração estruturada via tabela-para-markdown**: usar biblioteca como `pdfplumber` com detecção de bordas de célula para converter tabelas em markdown (`| coluna1 | coluna2 |`). O formato markdown preserva o relacionamento cabeçalho-dado e é compreendido nativamente pelo GPT-4o.
2. **Chunking de tabela como unidade atômica**: tabelas não devem ser cortadas. Criar um chunk dedicado por tabela, independente do limite de tokens. Se a tabela exceder 500 tokens, mantê-la intacta (tabelas de até ~2K tokens ainda cabem no orçamento de contexto).
3. **Metadado de estrutura**: enriquecer o chunk com metadado indicando `tipo: tabela`, `documento: PROC-042`, `seção: multiplicadores_regionais` para melhorar o retrieval por filtro de metadata.

---

### 1.2 PDFs Escaneados (OCR necessário)

**Desafio para o pipeline de RAG**

PDFs escaneados não contêm camada de texto — são essencialmente imagens. Parsers de PDF retornam vazio ou extraem apenas metadados do arquivo. O pré-processamento obrigatório é OCR (Optical Character Recognition), que adiciona complexidade, latência no pipeline de ingestão e risco de erros de reconhecimento. Fontes problemáticas: qualidade de scan baixa, documentos em duas colunas (OCR lê linha por linha sem respeitar colunas), carimbos e assinaturas sobre texto, tabelas embutidas na imagem.

No caso NovaTech, fluxogramas embutidos como imagens dentro de PDFs representam uma segunda camada do mesmo problema: fluxogramas contêm texto crítico (condições de decisão, estados do processo) que simplesmente não existirá na base vetorial se não houver tratamento.

**Impacto na qualidade das respostas**

Documentos escaneados sem OCR: o documento é invisível ao sistema — o atendente pergunta sobre um procedimento que existe no PDF escaneado e o assistente responde "não encontrei informação sobre isso". Pior do que uma resposta ruim porque não há fallback. Para fluxogramas: a lógica de decisão ("se carga perigosa → escalar para Gestão de Riscos") fica perdida, e o assistente não consegue guiar o atendente pelos passos do procedimento.

**Estratégia de tratamento**

1. **OCR na pipeline de ingestão**: Azure AI Document Intelligence (antigo Form Recognizer) oferece OCR com detecção de layout, capaz de lidar com documentos de duas colunas, tabelas em imagem e texto rotacionado. É a opção natural dado que a NovaTech já tem Azure.
2. **Extração de fluxogramas via modelos multimodais**: GPT-4o Vision pode receber a imagem do fluxograma e produzir uma descrição textual estruturada dos passos e condições. Esse texto gerado é então indexado como chunk adicional, com metadado `tipo: fluxograma_extraído`.
3. **Score de qualidade OCR**: implementar verificação pós-OCR (ex: proporção de caracteres reconhecíveis vs total) para flagger documentos com qualidade de extração baixa, direcionando-os para revisão manual antes da ingestão.
4. **Catalogar quais PDFs são escaneados**: na prática, convém fazer uma varredura prévia da base para separar PDFs nativos (com camada de texto) de PDFs-imagem, pois o pipeline de ingestão para cada tipo é diferente.

---

### 1.3 Wiki com Links Internos e Macros Customizadas (Confluence)

**Desafio para o pipeline de RAG**

A wiki do Confluence usa macros customizadas (ex: `{status}`, `{jira}`, `{expand}`, painéis condicionais) que, quando exportadas via API ou como HTML/PDF, se transformam em texto quebrado, placeholders vazios ou HTML sem semântica. Além disso, links internos entre páginas criam dependências de conteúdo: uma página pode ser apenas um resumo que aponta para outra página com o detalhe. Se cada página é indexada isoladamente, o chunk do resumo não contém a informação — ele contém apenas um link morto após a exportação.

**Impacto na qualidade das respostas**

O assistente recupera o chunk da página de resumo, que diz "ver detalhes em: [link]", mas o conteúdo desse link não está no contexto. A resposta gerada é incompleta ou vaga. Macros de status (`{status:Em vigor|color=Green}`) viram lixo textual que polui o chunk com tokens sem valor semântico, degradando a qualidade do embedding e do retrieval.

**Estratégia de tratamento**

1. **Exportação via API Confluence**: usar a API REST do Confluence para exportar o conteúdo como JSON/storage format, não como PDF. O storage format preserva a estrutura de macros e links de forma processável.
2. **Resolução de links internos**: ao processar cada página, seguir os links internos e criar um chunk composto que inclui o conteúdo das páginas linkadas relevantes. Ou, alternativamente, criar um grafo de dependências e garantir que páginas interdependentes sejam recuperadas juntas no retrieval (recuperar a página pai e os links filhos).
3. **Remoção de macros e limpeza de HTML**: usar um parser específico (ex: `beautifulsoup4` + regex para macros Confluence) para remover tags de macro, expandir o conteúdo renderizado onde possível, e normalizar o texto antes da indexação.
4. **Preservação de metadados de versão**: o Confluence tem versionamento nativo. Indexar apenas a versão atual de cada página e incluir `última_atualização` e `autor` como metadados do chunk.

---

### 1.4 Planilhas com Fórmulas Interdependentes (Excel)

**Desafio para o pipeline de RAG**

Planilhas Excel não são documentos de texto — são modelos de cálculo. Uma célula com `=C5*VLOOKUP(B5,$A$1:$D$50,3,FALSE)` não tem valor semântico por si só. O valor calculado depende de outras células que podem estar em outras abas, em outros arquivos (referências externas) ou ser dinâmico (atualizado mensalmente, como as tabelas de frete base da NovaTech). Parsers de Excel como `openpyxl` por padrão extraem as fórmulas, não os valores calculados — a menos que o arquivo tenha sido salvo com cache de valores.

Adicionalmente, planilhas frequentemente têm estrutura não-linear: abas de configuração, abas de dados brutos, abas de output. O conteúdo relevante para o atendente pode estar em uma aba de output que depende de 3 abas de configuração.

**Impacto na qualidade das respostas**

O modelo recebe um chunk com fórmulas em vez de valores. Resultado: o assistente não consegue informar o preço do frete, o prazo calculado ou a regra de SLA — exatamente a informação que o atendente precisa. No melhor caso, o assistente descreve a fórmula sem resolvê-la; no pior, tenta calcular e erra.

**Estratégia de tratamento**

1. **Snapshot de valores calculados**: ao processar o Excel, extrair os valores das células (não as fórmulas). Com `openpyxl`, usar `data_only=True` para ler os valores em cache. O arquivo deve ser salvo com valores calculados previamente — o que requer abrir e salvar o arquivo no Excel ou usar `xlwings` (que instancia o Excel).
2. **Converter tabelas de dados em markdown estruturado**: identificar tabelas nas abas (blocos retangulares de dados com cabeçalho) e serializar em markdown, preservando cabeçalhos de linha e coluna.
3. **Reindexação mensal automatizada**: dado que as planilhas são atualizadas mensalmente, o pipeline de ingestão deve ter um gatilho de reindexação agendado. Manter versões anteriores com metadado de vigência para evitar que dados desatualizados coexistam com dados novos sem distinção.
4. **Documentar o que a planilha representa**: criar um chunk de "contexto da planilha" que descreve o propósito do arquivo, as abas relevantes e o período de vigência dos dados. Esse chunk age como índice e melhora o retrieval.

---

## 2. Estimativa de Tamanho da Base em Tokens

### 2.1 Referência de calibração

Antes de calcular, estabelecer a referência prática:
- 1 página A4 com texto contínuo ≈ 300 a 400 palavras
- Usando 350 palavras/página como média prática
- **~500 tokens ≈ 375 palavras ≈ ~1 página de texto contínuo**

Isso calibra a estratégia de chunking: um chunk de 500 tokens representa aproximadamente 1 página de documento.

### 2.2 Estimativa por fonte

**Fonte 1 — PDFs do SharePoint**

| Parâmetro | Valor |
|-----------|-------|
| Quantidade | 800 documentos |
| Páginas por documento | 10 páginas (média) |
| Total de páginas | 8.000 páginas |
| Palavras por página | 350 palavras (média) |
| Total de palavras | 2.800.000 palavras |
| Conversão para tokens (÷ 0,75) | **~3.733.000 tokens** |

*Nota: a regra de 0,75 palavras/token significa que 1 token ≈ 0,75 palavras, logo tokens = palavras ÷ 0,75.*

**Fonte 2 — Wiki do Confluence**

| Parâmetro | Valor |
|-----------|-------|
| Quantidade | 400 páginas |
| Palavras por página | 1.500 palavras (dado) |
| Total de palavras | 600.000 palavras |
| Conversão para tokens (÷ 0,75) | **~800.000 tokens** |

**Fonte 3 — Planilhas Excel**

Suposição baseada em experiência: planilhas de referência logística (tabelas de frete, SLAs, cronogramas) têm em média 200 linhas × 10 colunas de dados relevantes por aba, com 2–3 abas úteis por arquivo. Após conversão para texto estruturado (markdown), isso equivale a aproximadamente 1.500 a 2.000 palavras por planilha.

| Parâmetro | Valor |
|-----------|-------|
| Quantidade | 50 arquivos |
| Palavras por arquivo (estimada) | 1.750 palavras (média entre 1.500 e 2.000) |
| Total de palavras | 87.500 palavras |
| Conversão para tokens (÷ 0,75) | **~116.700 tokens** |

### 2.3 Consolidado

| Fonte | Tokens estimados | % do total |
|-------|-----------------|-----------|
| PDFs (SharePoint) | 3.733.000 | 81,5% |
| Wiki (Confluence) | 800.000 | 17,5% |
| Planilhas (Excel) | 116.700 | 2,5% |
| **TOTAL** | **~4.650.000 tokens** | 100% |

**Interpretação prática**: a base completa indexada equivale a aproximadamente **4,6 milhões de tokens** — que é cerca de 36 vezes a janela de contexto do GPT-4o (128K tokens). Isso confirma que não é viável injetar toda a base no contexto de uma query: o retrieval seletivo via embeddings é obrigatório, não opcional.

---

## 3. Análise de Orçamento de Contexto

### 3.1 Parâmetros do modelo alvo

| Parâmetro | Valor |
|-----------|-------|
| Modelo | GPT-4o |
| Janela de contexto total | 128.000 tokens |
| System prompt + instruções | ~2.000 tokens |
| Tamanho de chunk referência | ~500 tokens |

### 3.2 Capacidade de chunks por query

Cálculo do espaço disponível para contexto dinâmico:

```
Espaço disponível = Janela total − System prompt − Reserva para resposta
Espaço disponível = 128.000 − 2.000 − 1.000 (reserva resposta) = 125.000 tokens

Máx. de chunks = 125.000 ÷ 500 = 250 chunks por query
```

Contudo, injetar 250 chunks por query **não é uma estratégia viável** pelos seguintes motivos:

1. **Custo**: cada query consumiria 125K tokens de input — a custo de ~$0,0025/1K tokens (GPT-4o input), são ~$0,31 por query. Com 192 queries/dia (320 chamados × 60%), o custo mensal seria ~$1.800 só em tokens de input.
2. **Efeito *lost in the middle***: estudos mostram que modelos LLM têm desempenho degradado para informações posicionadas no meio do contexto. Com 250 chunks, a maior parte do conteúdo relevante estaria no meio — exatamente onde a atenção do modelo é mais fraca.
3. **Ruído**: chunks não relevantes competem com os relevantes pela atenção do modelo, degradando a precisão da resposta.

### 3.3 Estratégia prática de orçamento

A prática recomendada na literatura e em sistemas de produção é usar **3 a 10 chunks** por query, selecionados pelo retrieval com score de similaridade mínimo:

```
Orçamento recomendado por query:
  System prompt:        2.000 tokens
  Chunks (top-5):       2.500 tokens  (5 × 500)
  Pergunta do usuário:    200 tokens
  Histórico conversa:   1.000 tokens  (últimas 2 trocas)
  Reserva para resposta: 1.500 tokens
  ─────────────────────────────────────
  TOTAL:                7.200 tokens  (5,6% da janela)
```

Isso significa que 94% da janela de contexto do GPT-4o fica **ociosa** — o que parece desperdício, mas é o trade-off correto. O objetivo não é usar o máximo de contexto disponível; é usar o contexto mínimo necessário para responder com precisão.

### 3.4 O que acontece quando o contexto ultrapassa o orçamento

Se o sistema (por bug ou por design equivocado) tentar enviar mais tokens do que a janela suporta, o comportamento varia:

- **Truncagem automática** (comportamento padrão das APIs): os tokens excedentes são descartados. Dependendo da implementação, a truncagem ocorre no início (histórico de conversa descartado primeiro) ou no final (últimos chunks descartados). Em ambos os casos, informação potencialmente crítica é silenciosamente perdida.
- **Erro de API**: algumas implementações retornam erro 400 com `context_length_exceeded`, interrompendo a query.
- **Degradação de qualidade**: mesmo antes de atingir o limite absoluto, sobrecarregar o contexto com chunks pouco relevantes faz o modelo "diluir" sua atenção, resultando em respostas vagas ou que ignoram o trecho mais relevante.

O sistema deve implementar um **orçamento de contexto explícito** no código: calcular o total de tokens antes de enviar à API e fazer fallback (reduzir número de chunks ou encurtar histórico) se o orçamento for excedido.

---

## 4. Estratégia de Chunking Recomendada

### 4.1 Tipo de pergunta esperado

Antes de definir o tamanho do chunk, é necessário entender o padrão de query. No contexto de atendimento da NovaTech, as perguntas são predominantemente:

- **Pontuais e específicas**: "Qual o prazo de devolução para cliente Gold?" — resposta em 1–2 frases.
- **De regra de negócio**: "Como calculo o frete especial para carga de 2 toneladas para o Norte?" — requer fórmula + tabela de multiplicadores.
- **De procedimento**: "Quais documentos o cliente precisa enviar para abertura de chamado de devolução?" — requer lista de passos.
- **Comparativas entre versões**: "Qual a regra atual de frete especial?" — requer identificar a versão vigente.

Nenhuma dessas perguntas requer um contexto muito amplo. A resposta geralmente está em **1 a 3 parágrafos contíguos** do documento fonte.

### 4.2 Estratégia de chunking proposta

**Tamanho base: 400–500 tokens por chunk** com sobreposição (*overlap*) de 50–100 tokens entre chunks consecutivos.

**Critério de divisão: híbrido semântico-estrutural**

| Tipo de conteúdo | Critério de divisão |
|-----------------|---------------------|
| Texto narrativo (políticas, procedimentos) | Por seção/subseção do documento (divisão semântica respeitando o H2/H3 do documento) |
| Tabelas | Chunk atômico por tabela completa, sem corte; incluir cabeçalho da seção acima da tabela no mesmo chunk |
| Listas de passos (procedimentos) | Manter a lista completa em um único chunk; se exceder 600 tokens, dividir apenas em fronteiras de item numerado |
| Fluxogramas (extraídos via Vision) | Chunk único com a transcrição completa do fluxo + metadado `tipo: fluxograma` |

### 4.3 Justificativa pelo efeito *lost in the middle*

O efeito *lost in the middle* (Liu et al., 2023) demonstra empiricamente que LLMs têm desempenho superior quando a informação relevante está no início ou no final do contexto, não no meio. Em um contexto com 10 chunks, o modelo "presta mais atenção" no chunk 1 e no chunk 10 do que nos chunks 4 a 7.

**Implicações práticas para a NovaTech:**

1. **Chunks menores e mais precisos são preferíveis a chunks grandes**: com 400–500 tokens por chunk e apenas top-5 chunks no contexto, o conteúdo relevante tem maior probabilidade de estar nas posições iniciais ou finais.
2. **Reranking pós-retrieval**: após o retrieval inicial por similaridade semântica, aplicar um segundo passo de reranking (ex: Cohere Rerank, cross-encoder) para ordenar os chunks pelo score de relevância contextual, garantindo que o chunk mais relevante seja colocado **no início do contexto** (posição 1), não no meio.
3. **Posicionamento estratégico no prompt**: a estrutura do prompt deve colocar o chunk mais relevante imediatamente antes da pergunta (posição de maior atenção), não no topo de uma lista longa de chunks.

### 4.4 Tratamento especial para tabelas e listas

Como mencionado na seção 4.2, tabelas e listas são unidades atômicas. A regra prática:

- **Tabela cabe em menos de 800 tokens**: chunk único contendo cabeçalho da seção + tabela.
- **Tabela excede 800 tokens**: avaliar se a tabela pode ser particionada **por dimensão significativa** (ex: uma tabela de multiplicadores por região pode gerar um chunk por grupo de regiões), mas **nunca cortar no meio de uma linha**.
- **Lista de passos**: nunca separar passos 1–4 em um chunk e 5–8 em outro se pertencerem ao mesmo procedimento. Se necessário, o chunk pode exceder 500 tokens para manter a integridade da lista.

### 4.5 Metadados essenciais por chunk

Para viabilizar filtros no retrieval e rastreabilidade da fonte:

```json
{
  "chunk_id": "POL-001-A",
  "documento": "POL-001",
  "titulo_documento": "Política de Devolução de Mercadorias",
  "secao": "3.1 Prazo Geral",
  "versao": "3.1",
  "data_vigencia": "2024-01-15",
  "tipo_conteudo": "texto_normativo",
  "tokens_estimados": 487
}
```

---

# PARTE 2 — FEEDBACK DA REVISÃO CRÍTICA (Rodada 2)

> Feedback gerado pela revisão crítica da v1. Pontos identificados como fracos, estimativas otimistas e riscos não considerados.

---

## Pontos levantados na revisão crítica

### Ponto 1 — Estimativa de PDFs subestima densidade variável

**Crítica:** A estimativa usou 350 palavras/página de forma uniforme para todos os 800 PDFs. Na prática, PDFs de logística incluem documentos muito densos (manuais técnicos de 50+ páginas) e documentos esparsos (formulários, capas, índices). A variância é alta. Usar uma média única sem distribuição subestima o risco de que ~20% dos documentos mais densos representem 50%+ dos tokens.

**Avaliação:** Válido. A estimativa é uma proxy razoável para planejamento de capacidade, mas o risco real é que documentos densos criem chunks problemáticos se não houver tamanho máximo de chunk forçado.

**Ação:** Incorporar na v2.

---

### Ponto 2 — Planilhas: suposição de "200 linhas × 10 colunas" pode ser subestimada

**Crítica:** A NovaTech atualiza planilhas mensalmente para 3 áreas (Operações, Compliance, Comercial). Planilhas de tabela de frete base — referenciadas nos documentos como `frete-base-AAAAMM.xlsx` — podem ser muito maiores: combinações de origem × destino × tipo de carga facilmente geram milhares de linhas. A estimativa de 1.750 palavras/planilha pode estar subestimada por fator de 5–10x para planilhas de tarifa.

**Avaliação:** Válido e importante. A planilha de frete base mencionada no PROC-042 é exatamente o tipo de arquivo que poderia ter 10.000+ linhas.

**Ação:** Incorporar na v2 com estimativa revisada e recomendação de tratamento específico para planilhas de grande volume.

---

### Ponto 3 — Custo de OCR não foi quantificado

**Crítica:** A estratégia de OCR via Azure AI Document Intelligence foi recomendada sem mencionar custos. O serviço cobra por página processada (~$0,01/página para o tier Standard). Se 30% dos 8.000 páginas de PDF forem escaneadas (~2.400 páginas), o custo de ingestão inicial é ~$24 — baixo. Mas reindexações frequentes e processamento de novos documentos ao longo de 3 meses de projeto podem elevar esse número. Além disso, a latência de OCR (segundos por página) impacta o tempo de ingestão total.

**Avaliação:** Válido. O custo pontual é pequeno, mas a latência de ingestão pode ser um gargalo no go-live se não for considerada no cronograma.

**Ação:** Incorporar na v2.

---

### Ponto 4 — Conflito de versões de documento não foi tratado como risco de sistema

**Crítica:** A análise menciona o Confluence com versionamento, mas não aborda o problema central identificado no cenário: documentos que se contradizem entre versões (PROC-042 v1 vs v2 coexistindo na base). O pipeline de RAG, se ingerir ambas as versões sem distinção, vai recuperar chunks conflitantes e passar para o modelo informações contraditórias. O modelo pode sintetizar uma resposta "média" que não corresponde a nenhuma das versões reais.

**Avaliação:** Este é provavelmente o risco mais crítico para a qualidade do sistema e foi subestimado na v1. O FAQ-Atendimento da própria NovaTech já documenta esse problema ("Cuidado: existem duas versões da PROC-042").

**Ação:** Incorporar como risco crítico na v2 com estratégia de mitigação.

---

### Ponto 5 — Estratégia de reindexação mensal não foi detalhada

**Crítica:** A v1 menciona "reindexação mensal automatizada" para planilhas, mas não aborda o que acontece com chunks antigos: eles são deletados? Mantidos com flag de "obsoleto"? A coexistência de chunks de versões diferentes na mesma base vetorial é um vetor de degradação silenciosa da qualidade ao longo do tempo.

**Avaliação:** Válido. Gestão de ciclo de vida de documentos na base vetorial é frequentemente negligenciada em projetos de RAG e causa problemas sérios após o go-live.

**Ação:** Incorporar na v2.

---

### Ponto 6 — Efeito *lost in the middle*: aplicação prática insuficientemente detalhada

**Crítica:** A v1 menciona o efeito e cita o paper de Liu et al. (2023), mas a recomendação de "colocar o chunk mais relevante no início do contexto" não é suficientemente detalhada. Em um sistema com múltiplos chunks, qual é a ordem ideal? A evidência empírica sugere: chunk mais relevante no início, segundo mais relevante no final, demais no meio — não apenas "primeiro".

**Avaliação:** Válido. A recomendação de posicionamento pode ser mais específica.

**Ação:** Incorporar na v2.

---

# PARTE 3 — ANÁLISE TÉCNICA FINAL (v2)

> Versão revisada incorporando o feedback da Rodada 2.

---

## 1. Análise por Tipo de Fonte (v2)

### 1.1 PDFs com Tabelas Complexas

**Desafio para o pipeline de RAG**

Parsers de PDF convencionais serializam tabelas sequencialmente, destruindo a estrutura relacional cabeçalho-dado. Uma tabela de frete com 15+ colunas (combinações de região × faixa de peso × tipo de carga × multiplicadores × prazo) é irreconhecível após extração texto plano. O chunker por tamanho fixo agravar o problema cortando tabelas no meio.

**Impacto na qualidade das respostas**

Dados numéricos sem contexto de coluna levam a confusão de colunas ou alucinação ao reconstruir a estrutura. Em logística, valores de frete ou prazo incorretos têm impacto financeiro direto (cobranças erradas, expectativas incorretas ao cliente).

**Estratégia de tratamento**

1. **Extração estruturada**: usar `pdfplumber` com detecção de bordas para converter tabelas em markdown. Testar com uma amostra de 10–20 PDFs antes de escalar — a qualidade de extração varia por documento.
2. **Tabela como unidade atômica**: nunca cortar tabelas no meio. Chunk dedicado por tabela, mesmo que exceda 500 tokens (tabelas de até 2K tokens ainda viáveis no orçamento de contexto).
3. **Metadados estruturados** por chunk: `tipo`, `documento`, `seção`, `data_vigência`.
4. **⚠️ Atenção à variância de densidade**: documentos com tabelas muito densas (50+ linhas) requerem estratégia de particionamento por dimensão significativa. Definir tamanho máximo de chunk de 1.500 tokens como limite absoluto para evitar chunks que monopolizem o orçamento de contexto.

---

### 1.2 PDFs Escaneados

**Desafio para o pipeline de RAG**

PDFs-imagem não têm camada de texto. Fluxogramas embutidos representam lógica de decisão crítica (desvios de processo, condições de exceção) que é invisível ao sistema sem tratamento específico. O pipeline de ingestão precisa de duas etapas antes do chunking: OCR para texto e Vision para fluxogramas.

**Impacto na qualidade das respostas**

Documentos escaneados não tratados são invisíveis à base vetorial — o pior resultado possível porque não há fallback: o assistente simplesmente "não sabe" o que está nesses documentos.

**Estratégia de tratamento**

1. **Azure AI Document Intelligence** para OCR com detecção de layout (nativo no stack Microsoft da NovaTech).
2. **GPT-4o Vision** para transcrição de fluxogramas em texto estruturado, indexado com metadado `tipo: fluxograma_extraído`.
3. **Score de qualidade pós-OCR**: flagger documentos com < 85% de confiança para revisão manual.
4. **Catalogação prévia**: varredura da base para separar PDFs nativos de PDFs-imagem antes do pipeline.
5. **⚠️ Consideração de custo e latência**: Azure AI Document Intelligence cobra ~$0,01/página (tier Standard). Para ~2.400 páginas escaneadas estimadas (30% de 8.000), custo de ingestão inicial ≈ **$24**. Reindexações mensais de novos documentos escaneados estimam custo incremental de $5–15/mês. O impacto principal não é custo mas **latência de ingestão**: OCR de 2.400 páginas pode levar horas, devendo ser processado em batch off-line, não no momento da query.

---

### 1.3 Wiki com Links Internos e Macros (Confluence)

**Desafio para o pipeline de RAG**

Macros customizadas geram texto quebrado ou placeholders na exportação. Links internos criam dependências de conteúdo: o chunk da página de resumo aponta para conteúdo que está em outro chunk não recuperado.

**Impacto na qualidade das respostas**

Respostas incompletas ou vagas quando o conteúdo está fragmentado entre páginas interdependentes. Macros de status/formatação poluem os chunks com tokens sem valor semântico.

**Estratégia de tratamento**

1. **Exportação via API REST Confluence** (storage format JSON).
2. **Resolução de links internos**: criar grafo de dependências entre páginas e garantir que a recuperação de uma página puxe as páginas diretamente linkadas (retrieval aumentado por grafo).
3. **Parser de macros**: remover macros e normalizar conteúdo antes da indexação.
4. **Metadados de versão** e data de última atualização por chunk.

---

### 1.4 Planilhas com Fórmulas Interdependentes

**Desafio para o pipeline de RAG**

Planilhas são modelos de cálculo, não documentos de texto. Fórmulas sem valores calculados são inúteis para o assistente. Planilhas de tarifa (como a `frete-base-AAAAMM.xlsx` referenciada no PROC-042) podem ter **milhares de linhas** — muito além da estimativa inicial.

**Impacto na qualidade das respostas**

Fórmulas em vez de valores: o assistente não consegue informar preços, prazos ou regras calculadas — exatamente o core value do sistema.

**Estratégia de tratamento**

1. **Snapshot de valores calculados**: `openpyxl` com `data_only=True` ou `xlwings` para forçar recálculo.
2. **Conversão de tabelas para markdown estruturado** com cabeçalhos de linha e coluna.
3. **⚠️ Planilhas de grande volume** (ex: tabelas de tarifa com 1.000+ linhas): não indexar linha a linha — criar chunks por agrupamento lógico (ex: por região, por faixa de peso). Uma planilha de tarifa completa pode ter 50.000–100.000 tokens após conversão, tornando inviável indexar como documento único.
4. **Reindexação mensal automatizada com gestão de ciclo de vida** (ver seção 5 — Gestão de Ciclo de Vida).

---

## 2. Estimativa de Tamanho da Base em Tokens (v2)

### 2.1 Referência de calibração

**~500 tokens ≈ 375 palavras ≈ ~1 página de texto contínuo** (usando 350 palavras/página como média)

### 2.2 Estimativa revisada por fonte

**PDFs do SharePoint — Estimativa com distribuição**

| Segmento | Qtd | Páginas médias | Palavras/página | Total palavras |
|----------|-----|---------------|----------------|----------------|
| Documentos esparsos (formulários, capas) | ~200 (25%) | 3 páginas | 200 palavras | 120.000 |
| Documentos padrão (políticas, procedimentos) | ~480 (60%) | 10 páginas | 350 palavras | 1.680.000 |
| Documentos densos (manuais técnicos) | ~120 (15%) | 20 páginas | 450 palavras | 1.080.000 |
| **Total PDFs** | **800** | | | **2.880.000 palavras** |
| **Tokens (÷ 0,75)** | | | | **~3.840.000 tokens** |

*Nota: A estimativa original de 2.800.000 palavras (3.733.000 tokens) permanece similar — a distribuição mais realista aumenta marginalmente o total devido aos documentos densos. O ponto crítico é que os 120 documentos densos representam ~37% dos tokens totais dos PDFs.*

**Wiki do Confluence**

| Parâmetro | Valor |
|-----------|-------|
| 400 páginas × 1.500 palavras | 600.000 palavras |
| **Tokens** | **~800.000 tokens** |

**Planilhas Excel — Estimativa revisada com dois segmentos**

| Segmento | Qtd | Palavras estimadas | Total |
|----------|-----|-------------------|-------|
| Planilhas de configuração/referência (SLAs, parâmetros) | ~40 arquivos | 1.750 palavras/arquivo | 70.000 palavras |
| Planilhas de tarifa (frete base, grandes volumes) | ~10 arquivos | **15.000 palavras/arquivo** | 150.000 palavras |
| **Total planilhas** | **50** | | **220.000 palavras** |
| **Tokens (÷ 0,75)** | | | **~293.000 tokens** |

*A estimativa original (116.700 tokens) pode estar subestimada em ~2,5x se houver planilhas de tarifa de grande volume. A estimativa revisada de ~293.000 tokens é o cenário mais provável.*

### 2.3 Consolidado revisado

| Fonte | Tokens (v1) | Tokens (v2) | Variação |
|-------|------------|------------|---------|
| PDFs | 3.733.000 | 3.840.000 | +3% |
| Wiki | 800.000 | 800.000 | 0% |
| Planilhas | 116.700 | 293.000 | +151% |
| **TOTAL** | **~4.650.000** | **~4.930.000** | **+6%** |

**O total revisado é ~4,9 milhões de tokens** — ligeiramente maior, mas na mesma ordem de grandeza. A conclusão principal se mantém: a base é ~38x a janela de contexto do GPT-4o, tornando o retrieval seletivo obrigatório.

---

## 3. Análise de Orçamento de Contexto (v2)

### 3.1 Parâmetros

| Parâmetro | Valor |
|-----------|-------|
| Modelo | GPT-4o |
| Janela total | 128.000 tokens |
| System prompt + instruções | ~2.000 tokens |
| Chunk referência | ~500 tokens |

### 3.2 Orçamento prático por query

```
Orçamento recomendado por query:
  System prompt:           2.000 tokens
  Chunks recuperados (top-5): 2.500 tokens
  Pergunta do usuário:       200 tokens
  Histórico de conversa:   1.000 tokens  (últimas 2 trocas)
  Reserva para resposta:   1.500 tokens
  ─────────────────────────────────────────
  TOTAL CONSUMIDO:         7.200 tokens  (5,6% da janela)
  JANELA OCIOSA:         120.800 tokens  (94,4%)
```

**Por que não usar mais da janela?** Porque o objetivo não é maximizar o contexto — é maximizar a precisão. Mais chunks = mais ruído = mais risco de *lost in the middle*. O limite prático de 5–10 chunks é uma decisão arquitetural, não uma limitação técnica.

### 3.3 Capacidade máxima teórica vs prática

| Cenário | Chunks | Tokens usados | Problema |
|---------|--------|--------------|---------|
| Teórico máximo | 250 chunks | ~125.000 | Custo alto + *lost in the middle* severo |
| Operacional (produção) | 5–10 chunks | 2.500–5.000 | **Recomendado** |
| Mínimo viável | 3 chunks | 1.500 | Pode perder contexto necessário |

### 3.4 Mecanismo de descarte quando o orçamento é ultrapassado

Ordem de descarte (da menos para a mais crítica):

1. **Histórico de conversa antigo**: descartar trocas mais antigas primeiro, mantendo sempre a pergunta atual e a troca imediatamente anterior.
2. **Chunks com score de similaridade mais baixo**: se 10 chunks foram recuperados mas apenas 5 cabem no orçamento, descartar os 5 de menor score.
3. **Partes verbose do system prompt**: manter regras críticas (guardrails), descartar exemplos ilustrativos.
4. **Nunca descartar**: a pergunta atual do usuário e o chunk de maior relevância.

---

## 4. Estratégia de Chunking Recomendada (v2)

### 4.1 Padrão de query do atendente NovaTech

As queries são pontuais, factuais e específicas. A resposta geralmente está em 1–3 parágrafos contíguos. Isso favorece **chunks pequenos e precisos** em vez de grandes blocos de contexto.

### 4.2 Estratégia híbrida semântico-estrutural

**Tamanho base**: 400–500 tokens, com overlap de 50–100 tokens.

| Tipo de conteúdo | Critério de divisão | Tratamento especial |
|-----------------|---------------------|---------------------|
| Texto narrativo | Por seção (H2/H3) | — |
| Tabelas | Chunk atômico por tabela | Máx. 1.500 tokens; incluir cabeçalho da seção |
| Listas de passos | Manter lista completa | Dividir apenas em fronteiras de item numerado |
| Fluxogramas | Chunk único da transcrição | Metadado `tipo: fluxograma` |

### 4.3 Posicionamento otimizado contra o efeito *lost in the middle* (revisado)

O efeito *lost in the middle* não é apenas sobre "colocar o relevante primeiro". A evidência empírica indica que a atenção do modelo segue uma curva em U: alta nas posições iniciais e finais, baixa no meio.

**Estratégia de posicionamento otimizada** (para top-5 chunks):

```
[Posição 1] — Chunk de maior relevância (score mais alto)
[Posição 2] — Chunk de contexto/definição (ex: definição de tier do cliente)
[Posição 3] — Chunk de menor relevância dos recuperados
[Posição 4] — Chunk complementar de média relevância
[Posição 5] — Chunk de segunda maior relevância (score 2º mais alto)
```

Ou seja: os dois chunks mais relevantes vão nas posições 1 e 5 (início e fim), não ambos no início.

**Reranking pós-retrieval**: após recuperação por similaridade semântica (ANN search), aplicar um passo de cross-encoder reranking (ex: Azure AI Search Semantic Ranker ou Cohere Rerank) para refinar a ordenação antes do posicionamento no prompt.

### 4.4 Tratamento especial para tabelas e listas

- **Tabela ≤ 800 tokens**: chunk único (cabeçalho da seção + tabela).
- **Tabela 800–1.500 tokens**: avaliar particionamento por dimensão lógica (ex: por grupo de regiões), nunca cortando no meio de uma linha.
- **Tabela > 1.500 tokens** (planilhas de grande volume): criar sumário da tabela como chunk de metadado + chunks por segmento lógico.
- **Lista de passos**: preservar integridade da lista; se exceder 600 tokens, dividir apenas entre itens numerados.

### 4.5 Metadados essenciais por chunk

```json
{
  "chunk_id": "POL-001-sec3.1-v3.1",
  "documento": "POL-001",
  "titulo_documento": "Política de Devolução de Mercadorias",
  "secao": "3.1 Prazo Geral",
  "versao_documento": "3.1",
  "data_vigencia_inicio": "2024-01-15",
  "data_vigencia_fim": null,
  "status": "vigente",
  "tipo_conteudo": "texto_normativo",
  "tokens_estimados": 487
}
```

---

## 5. Gestão de Ciclo de Vida de Documentos na Base Vetorial (novo — incorporado do feedback)

Este item foi identificado na revisão crítica como ausente na v1 e representa um risco operacional significativo pós-go-live.

### 5.1 O problema de versões conflitantes

A NovaTech já tem documentos conflitantes coexistindo (PROC-042 v1 e v2). Sem gestão de ciclo de vida, o pipeline de RAG vai indexar ambas as versões, e o retrieval vai recuperar chunks das duas — passando informação contraditória para o modelo. O modelo pode:
- Sintetizar uma "resposta média" que não corresponde a nenhuma versão real.
- Escolher arbitrariamente uma versão (sem critério claro).
- Citar ambas as versões criando confusão para o atendente.

### 5.2 Estratégia de gestão de ciclo de vida

1. **Campo `status` obrigatório em todos os chunks**: `vigente`, `obsoleto`, `transitório` (para o período de transição como o da PROC-042-v2 seção 5).
2. **Filtro por status no retrieval**: queries por padrão só recuperam chunks com `status: vigente`. Chunks obsoletos são mantidos na base mas filtrados.
3. **Pipeline de atualização**: quando um novo documento é ingerido como substituto de uma versão anterior, o pipeline deve:
   - Marcar chunks da versão anterior como `obsoleto` (não deletar — manter para auditoria).
   - Ingerir a nova versão com `status: vigente`.
   - Para casos de vigência transitória (como PROC-042), criar chunks com `data_vigencia_inicio` e `data_vigencia_fim` e lógica de filtro por data no retrieval.
4. **Log de mudanças**: manter registro de quando cada versão foi supersedida, por qual documento, e qual área é responsável.

### 5.3 Reindexação mensal

Para as planilhas atualizadas mensalmente:
- Trigger automático (Azure Logic Apps ou Power Automate, nativo no stack da NovaTech) ao detectar novo arquivo na pasta de rede.
- Pipeline de reindexação: extrair valores → converter para markdown → gerar chunks → marcar versão anterior como `obsoleto` → indexar nova versão.
- **Tempo estimado de reindexação** para 50 planilhas: 15–30 minutos em batch, dependendo do tamanho.

---

# PARTE 4 — REGISTRO DE ALTERAÇÕES (v1 → v2)

| # | Seção | Tipo de alteração | O que mudou |
|---|-------|-------------------|-------------|
| 1 | §2.2 PDFs | Aprofundamento | Adicionada distribuição de densidade (esparsos/padrão/densos) com estimativa segmentada. Resultado: total de tokens dos PDFs levemente maior (~3% a mais). |
| 2 | §2.2 Planilhas | Correção significativa | Estimativa revisada de 116.700 para 293.000 tokens (+151%) ao reconhecer que planilhas de tarifa de grande volume (ex: frete base mensal) podem ter 10.000–15.000 palavras cada. |
| 3 | §1.2 PDFs Escaneados | Aprofundamento | Adicionada quantificação de custo OCR (~$24 ingestão inicial, $5–15/mês incremental) e nota sobre latência de ingestão como gargalo operacional. |
| 4 | §1.4 Planilhas | Aprofundamento | Adicionada estratégia específica para planilhas de grande volume (chunking por agrupamento lógico, não linha a linha). |
| 5 | §4.3 Chunking | Correção | Estratégia de posicionamento *lost in the middle* aprofundada: não apenas "relevante no início", mas esquema explícito de distribuição nos 5 slots (posições 1 e 5 para os dois mais relevantes). |
| 6 | §5 (novo) | Adição de seção | Seção inteiramente nova sobre Gestão de Ciclo de Vida, abordando o risco crítico de versões conflitantes na base vetorial (PROC-042 v1 vs v2 como exemplo concreto). |
| 7 | Estimativa total | Revisão | Total consolidado revisado de 4,65M para 4,93M tokens — mesma ordem de grandeza, mas com maior confiança na estimativa de planilhas. |

**O que não foi incorporado:**

- Sugestão de aumentar o número de chunks padrão por query além de 5: não incorporado porque o trade-off custo/qualidade favorece manter entre 3–10 chunks. A janela de 128K é um recurso disponível mas não deve ser usada maximamente.

---

*Análise elaborada em 04/06/2026 | Tarefa 1.1 — Prática 1 | NovaTech AI Assistant*
