# Análise de Problemas — Pipeline RAG NovaTech

> **Nota:** Os problemas abaixo são **reais**, identificados durante a execução de `test_pipeline.py` em 2026-06-06 com o pipeline funcional. Não são hipotéticos.

---

## Problema 1 — POL-001 ausente do retrieval para perguntas sobre carga perigosa (T1)

### Descrição
No Teste T1 (`"Posso devolver carga perigosa?"`), o documento normativo e autoritativo **POL-001** (Política de Devolução) ficou completamente ausente dos 5 chunks retornados. Os 4 primeiros resultados foram todos do FAQ-atendimento (documentão informal).

**Resultado real do pipeline:**
```
#1 0.5978 | FAQ-atendimento          | Item 3  — devolução carga perigosa
#2 0.5861 | FAQ-atendimento          | Item 22 — seguro de carga
#3 0.5389 | FAQ-atendimento          | Item 38 — carga danificada
#4 0.5228 | PROC-042-frete-especial-v1 | Condições especiais
#5 0.5053 | FAQ-atendimento          | Item 32 — carga perigosa expresso
```
**POL-001 = não encontrado nos top 5.**

### Localização
**Etapa:** Ingestão (chunking + criação dos chunks da POL-001).

### Causa provável
A seção do POL-001 que contém a regra relevante é a **seção 3.2**, cujo título no markdown é:

```markdown
### 3.2. Exceções ao prazo geral
```

O chunking criou um chunk com prefixo `[### 3.2. Exceções ao prazo geral]`. A palavra "perigosa" aparece no **corpo** do chunk, mas não no título que é prefixado no texto.

O FAQ-Item-3, por outro lado, tem no próprio título:

```markdown
### Item 3 — "Cliente perguntou se pode devolver carga perigosa. O que respondo?"
```

O embedding captura "carga perigosa" diretamente no título do chunk FAQ, gerando score maior. O embedding do POL-001-B precisa "procurar" a informação dentro do corpo do texto, resultando em score menor.

**Em termos de engenharia:** O modelo all-MiniLM-L6-v2 é sensível à posição das palavras-chave. Títulos de seção técnicos ("Exceções ao prazo geral") não mapeiam bem para perguntas em linguagem coloquial ("Posso devolver carga perigosa?").

### Proposta de Correção

**Correção A — Enriquecimento de metadado do título na ingestão (`ingest.py`):**

Adicionar palavras-chave do conteúdo ao prefixo do chunk, além do título da seção:

```python
# Em split_section_into_chunks: ao criar o chunk da POL-001-B,
# o prefixo seria gerado como:
chunk_prefix = f"[{section_title}] — Temas: devolução, carga perigosa, exceções"
```

Isso exigiria uma etapa de extração de palavras-chave automática (ex: frequência de termos no corpo da seção) ou manual para documentos críticos.

**Correção B — Perguntas sintéticas (HyDE - Hypothetical Document Embeddings):**

Gerar 3–5 perguntas sintéticas para cada chunk durante a ingestão e armazenar os embeddings dessas perguntas junto com o chunk:

```python
# Para o chunk POL-001-B, gerar e armazenar embeddings de:
# "Posso devolver carga perigosa?"
# "Qual a regra para devolução de explosivos?"
# "Carga ANTT pode ser devolvida?"
# O retrieval usa os embeddings das perguntas sintéticas como pontos de busca
```

Esta é a técnica mais eficaz para o problema — documenta que RAG não é só gerar embeddings do texto, mas projetar **como as perguntas do usuário se mapearão para os chunks**.

**Recomendação imediata:** Incluir o tipo do documento e palavras-chave domínio no texto de cada chunk (Correção A simplificada).

---

## Problema 2 — Tabela de multiplicadores regionais ausente no contexto para perguntas de cálculo de frete (T3)

### Descrição
No Teste T3 (`"Quanto custa o frete para 600kg com destino a Manaus?"`), a **tabela de multiplicadores regionais da PROC-042-v2** (seção 2.1 — o chunk que contém o valor Norte=1.8) ficou **ausente dos top 5 resultados**. O rank 1 foi a seção "Objetivo" da versão antiga (PROC-042-v1), que não contém nenhum dado de cálculo.

**Resultado real do pipeline:**
```
#1 0.5413 | PROC-042-frete-especial-v1 | ## 1. Objetivo    ← IRRELEVANTE
#2 0.5288 | PROC-042-v2               | ## 4. Cond. especiais
#3 0.5268 | PROC-042-v2               | ## 2. Fórmula de cálculo
#4 0.5256 | PROC-042-frete-especial-v1 | ## 2. Fórmula de cálculo
#5 0.5243 | PROC-042-frete-especial-v1 | ## 4. Cond. especiais
```
**Tabela de multiplicadores PROC-042-v2 seção 2.1 = ausente. Scores muito próximos (0.52–0.54) e todos sem a informação crítica.**

### Localização
**Etapa:** Chunking (estratégia de divisão por seção) + Embeddings.

### Causa provável
A pergunta usa termos geográficos ("Manaus") e de peso ("600kg") que **não aparecem nos chunks dos documentos**. O PROC-042 usa "Região Norte" e "cargas acima de 500kg" — terminologia diferente. O embedding não consegue conectar "Manaus" com "Região Norte" (isso requer conhecimento geográfico externo ao modelo de embedding).

Além disso, o chunking separou corretamente as seções 2 (fórmula) e 2.1 (tabela de multiplicadores). A fórmula ficou no rank 3–4, mas a tabela 2.1 não entrou. O problema é que **a seção "Objetivo" da v1 tem score maior** (0.54) do que os chunks realmente úteis — o texto de "Objetivo" menciona "frete especial", "500kg", termos que aparecem na pergunta indiretamente.

### Proposta de Correção

**Correção A — Chunking conjunto de seções pai-filho (`ingest.py`):**

Em vez de separar seção 2 (fórmula) de seção 2.1 (tabela), criar um chunk que contenha a seção pai mais suas subseções:

```python
# Ao detectar que uma seção ## tem subseções ###,
# criar um chunk composto que inclua o conteúdo do ## + todos os ### filhos.
# Isso garante que a fórmula e a tabela de multiplicadores ficam no mesmo chunk.
# Aceita exceder MAX_CHUNK_SIZE para seções que têm tabelas em subseções.
```

**Correção B — Expansão geográfica na reescrita da pergunta (`search.py`):**

Antes de gerar o embedding da pergunta, expandir termos geográficos para regiões do IBGE:

```python
GEO_MAP = {
    "manaus": "região norte", "belém": "região norte",
    "são paulo": "região sudeste", "rio": "região sudeste",
    "curitiba": "região sul", "porto alegre": "região sul",
    # ...
}

def expand_query(question: str) -> str:
    """Adiciona contexto regional à pergunta antes de gerar embedding."""
    q = question.lower()
    for city, region in GEO_MAP.items():
        if city in q:
            return f"{question} ({region}, frete especial, multiplicador regional)"
    return question
```

**Recomendação:** Implementar **Correção A** (chunking conjunto pai-filho) pois é uma melhoria na ingestão que resolve o problema estruturalmente. Correção B é um paliativo que requer manutenção do mapa geográfico.

---

## Problema 3 (bônus) — Ausência de documento formal para carga danificada

### Descrição
No Teste T5, a única cobertura para "carga danificada em trânsito" é o FAQ-38 (documento informal). O pipeline recuperou corretamente o FAQ-38 no rank 1, mas o sistema não tem como automaticamente escalar a confiança para "baixa" apenas porque a fonte é o FAQ.

O LLM foi instruído pelo system prompt a sinalizar fontes informais, o que funcionou. Mas se o system prompt não tivesse essa instrução, o LLM responderia com a mesma confiança que usa para documentos normativos.

### Localização
**Etapa:** Ingestão (metadados de confiabilidade).  
**Causa primária:** O metadado `source` guarda apenas o nome do arquivo. Não há metadado de `document_type` (normativo vs. informal) nem de `validation_status` (validado por Compliance vs. não validado).

### Proposta de Correção

Adicionar metadado `doc_type` na ingestão:

```python
DOCUMENT_TYPES = {
    "POL-001-politica-devolucao": "normativo",
    "PROC-042-frete-especial-v1": "normativo",
    "PROC-042-v2-frete-especial-revisado": "normativo",
    "SLA-2024-tabela-sla-clientes": "contratual",
    "FAQ-atendimento": "informal",
}

chunk["doc_type"] = DOCUMENT_TYPES.get(doc_name, "desconhecido")
```

Em `format_chunks_section` no `assemble_prompt.py`, incluir o tipo de documento na apresentação do chunk:

```
[Trecho 1] Fonte: FAQ-atendimento | Tipo: INFORMAL | Seção: ... | Relevância: 73%
```

O LLM recebe o sinal de que o documento é informal diretamente no contexto, sem depender de instruções abstratas no system prompt.

---

## Síntese: Qual problema é mais crítico?

**Problema 1 > Problema 2 > Problema 3**

O Problema 1 é o mais crítico porque **o documento normativo mais importante (POL-001) simplesmente não foi retornado** para a pergunta mais sensível do domínio. Um atendente usando o sistema receberia apenas informações do FAQ informal sobre carga perigosa, sem acesso à regra formal da POL-001. Isso poderia levar a orientações incorretas ou incompletas para o cliente.

O Problema 2 é crítico operacionalmente: um atendente que pergunta sobre frete para Manaus recebe a fórmula mas não a tabela de multiplicadores regionais. O LLM não tem como calcular o valor correto para a Região Norte sem o multiplicador 1.8.

O Problema 3 é um risco de confiança: a versão desatualizada do PROC-042 sendo rankeada acima da vigente pode gerar erros financeiros silenciosos (usar multiplicador 1.0 em vez de 1.1 para o Sudeste).

---

## Conexão com Engenharia de Dados (não apenas chamada de API)

Todos os três problemas têm **causa raiz na ingestão** (não no LLM):

| Problema | Causa no LLM? | Causa na Ingestão/Chunking? |
|----------|--------------|-----------------------------|
| 1. POL-001 ausente | Não | **Sim** — título de seção sem palavras-chave da pergunta |
| 2. Tabela multiplicadores ausente | Não | **Sim** — chunking separou fórmula da tabela; pergunta não mapeia semanticamente |
| 3. Versão desatualizada no rank 1 | Não | **Sim** — falta metadado de prioridade de versão |

A qualidade do RAG é determinada **antes** que qualquer chamada ao LLM seja feita. Um pipeline de ingestão mal projetado gera uma base de chunks de baixa qualidade que nenhum LLM consegue compensar — o LLM sempre estará limitado pela qualidade do contexto que recebe.

O Teste T1 demonstra isso claramente: o sistema está usando um FAQ informal como única fonte para uma regra normativa crítica, não porque o LLM falhou, mas porque a ingestão não garantiu que o chunk relevante da POL-001 fosse encontrável pelo retrieval.
