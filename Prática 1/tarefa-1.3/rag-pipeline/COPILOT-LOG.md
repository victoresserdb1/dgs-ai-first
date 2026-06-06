# Log de Evidências — GitHub Copilot

Registro do uso do GitHub Copilot em cada módulo do pipeline RAG NovaTech.

---

## Módulo: `ingest.py`

### [COPILOT-01] — Esqueleto de `split_section_into_chunks`

**Como foi usado:** Digitei o comentário descritivo no topo da função:

```python
# Split section text into chunks preserving tables.
# If section has table, keep intact. If small, single chunk.
# If large, split by paragraphs with overlap.
```

O Copilot gerou automaticamente o esqueleto com os três casos de decisão (tabela, tamanho ok, split por parágrafo), incluindo a estrutura `if/elif/else` correta.

**Ajustes manuais:** Adicionei a lógica de prefixo de seção no texto de cada sub-chunk (`[{section_title}]`) e o cálculo do overlap com `current[-overlap:]`.

---

### [COPILOT-02] — Regex para headers markdown

**Como foi usado:** Ao digitar o comentário:

```python
# regex to match markdown headers level 1, 2 and 3 with re.MULTILINE
```

O Copilot completou com:

```python
header_re = re.compile(r"^(#{1,3})\s+(.+)$", re.MULTILINE)
```

Exatamente o padrão necessário. Aceito sem modificação.

---

### [COPILOT-03] — Bloco `collection.add()` no ChromaDB

**Como foi usado:** Ao digitar `collection.add(`, o Copilot completou os parâmetros da API:

```python
collection.add(
    ids=ids,
    embeddings=embeddings,
    documents=documents,
    metadatas=metadatas,
)
```

Sugeriu os 4 parâmetros na ordem correta da API do ChromaDB v0.4+. Aceito sem modificação.

---

### [COPILOT-04] — Conversão de `has_table` para string

**Como foi usado:** Ao construir o dict de metadados, o Copilot detectou que `has_table` era um `bool` e sugeriu automaticamente `str(c.get("has_table", False))`. Isso corrigiu uma incompatibilidade com a API do ChromaDB, que não aceita `bool` em metadados.

---

## Módulo: `search.py`

### [COPILOT-05] — Esqueleto de `search_chunks`

**Como foi usado:** Digitei o comentário:

```python
# search ChromaDB for N most similar chunks to the query embedding
# and return structured results with text, source, section, score
```

O Copilot gerou o esqueleto da função com `model.encode()`, `collection.query()` com os parâmetros `include=["documents", "metadatas", "distances"]`, e o loop de parsing.

**Ajustes manuais:** Adicionei o parâmetro `Optional` para `model` e `collection` (para reutilização entre chamadas), e a verificação de `results["documents"]`.

---

### [COPILOT-06] — Conversão distância → similaridade

**Como foi usado:** Ao digitar o comentário:

```python
# convert cosine distance to similarity score (0 to 1)
```

O Copilot completou com:

```python
similarity_score = max(0.0, 1.0 - dist)
```

Correto para cosine distance do ChromaDB. O `max(0.0, ...)` foi sugestão do Copilot para tratar casos extremos de ortogonalidade perfeita. Aceito sem modificação.

---

### [COPILOT-07] — Loop de zip para parsing de resultados

**Como foi usado:** Ao iniciar `for rank, (`:

O Copilot completou automaticamente com:

```python
for rank, (doc, meta, dist) in enumerate(
    zip(
        results["documents"][0],
        results["metadatas"][0],
        results["distances"][0],
    ),
    start=1,
):
```

Incluindo o `enumerate(..., start=1)` para o rank começar em 1. Aceito sem modificação.

---

## Módulo: `assemble_prompt.py`

### [COPILOT-08] — Rascunho inicial do System Prompt

**Como foi usado:** Digitei o comentário:

```python
# system prompt for NovaTech internal customer service assistant with RAG
# must enforce source citation, no hallucination, conflict resolution
```

O Copilot gerou um rascunho do system prompt com seções de Identidade, Regras e Formato. Estrutura foi aproveitada; conteúdo foi reescrito manualmente para incorporar os 6 guardrails definidos nas specs da Tarefa 1.2 e a política de prioridade de fontes.

---

### [COPILOT-09] — Função `format_chunks_section`

**Como foi usado:** Ao digitar o início do loop:

```python
for chunk in chunks:
    score = chunk.get("similarity_score", 0.0)
```

O Copilot completou com a formatação do bloco completo do chunk (rank, fonte, seção, relevância, texto). Sugeriu também incluir o score de relevância como porcentagem (`{score:.0%}`) para facilitar leitura pelo LLM.

---

### [COPILOT-10] — Função `estimate_prompt_tokens`

**Como foi usado:** Ao digitar o comentário:

```python
# estimate token count using character approximation for Portuguese text
```

O Copilot completou com:

```python
return len(prompt) // 4
```

Heurística de 4 chars/token, padrão amplamente usado como estimativa rápida. Aceito diretamente.

---

## Módulo: `test_pipeline.py`

### [COPILOT-11] — Função `evaluate_retrieval`

**Como foi usado:** Ao digitar a assinatura da função com o comentário:

```python
# evaluate retrieval accuracy: CORRETO, PARCIAL or INCORRETO
```

O Copilot gerou a lógica de comparação com `found` e `missing`, e as três condições de retorno. Aceito sem modificação.

---

### [COPILOT-12] — Bloco de log JSON

**Como foi usado:** Ao digitar:

```python
results_log.append({
    "test_id": test["id"],
```

O Copilot completou automaticamente todos os campos do dicionário de log, incluindo os placeholders `"[INSERIR: ...]"` para os campos que precisam de preenchimento manual (resposta do Claude). Ajuste manual: adicionei `"guardrail_test"` e `"known_pitfall"` para documentar os critérios de avaliação.

---

## Resumo

| ID | Módulo | Tipo de contribuição | Impacto |
|----|--------|----------------------|---------|
| COPILOT-01 | ingest.py | Esqueleto de função complexa | Alto — economizou ~30 min de design |
| COPILOT-02 | ingest.py | Regex exato | Médio — erro provável sem sugestão |
| COPILOT-03 | ingest.py | API call com parâmetros corretos | Alto — API do ChromaDB tem parâmetros específicos |
| COPILOT-04 | ingest.py | Bug fix preventivo (bool→str) | Alto — teria causado erro em runtime |
| COPILOT-05 | search.py | Esqueleto de função | Alto — estrutura completa gerada |
| COPILOT-06 | search.py | Fórmula de conversão | Médio — lógica matemática correta |
| COPILOT-07 | search.py | Loop com zip+enumerate | Baixo — conveniência de autocomplete |
| COPILOT-08 | assemble_prompt.py | Rascunho de system prompt | Médio — estrutura aproveitada |
| COPILOT-09 | assemble_prompt.py | Formatação de chunks | Médio — economizou formatação manual |
| COPILOT-10 | assemble_prompt.py | Heurística de tokens | Baixo — uma linha |
| COPILOT-11 | test_pipeline.py | Função de avaliação | Médio — lógica correta gerada |
| COPILOT-12 | test_pipeline.py | Estrutura de log | Baixo — autocomplete de dict |
