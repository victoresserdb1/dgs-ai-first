# Specs — Tarefa 1.3: Construção de Pipeline de RAG com Ferramentas Open-Source

## Objetivo

Implementar um pipeline de RAG funcional utilizando ferramentas gratuitas e open-source, ingerindo os documentos da NovaTech, criando embeddings, armazenando em vector store, buscando chunks relevantes por similaridade, e montando prompts para envio ao LLM.

---

## Contexto do Projeto

**Ferramentas a utilizar:**
- **GitHub Copilot** — para assistência na implementação do código.
- **Claude (chat)** — para geração das respostas finais (via paste manual do prompt montado).

**Stack obrigatória (gratuita/open-source):**

| Componente | Tecnologia | Instalação |
|-----------|-----------|-----------|
| Linguagem | Python | — |
| Vector store | ChromaDB | `pip install chromadb` |
| Embeddings | sentence-transformers, modelo `all-MiniLM-L6-v2` | `pip install sentence-transformers` |
| Orquestração | LangChain ou código manual | `pip install langchain` (opcional) |
| Geração | Claude (chat manual) ou modelo local via Ollama | — |

> Alternativas aceitas: FAISS em vez de ChromaDB, Ollama para embeddings locais, outra stack gratuita. O critério é que funcione e seja gratuito. Qualquer alteração na stack deve ser justificada.

**Documentos de entrada para ingestão:**

Os cinco arquivos individuais disponíveis na workspace:
- `POL-001-politica-devolucao.md`
- `PROC-042-frete-especial-v1.md`
- `PROC-042-v2-frete-especial-revisado.md`
- `SLA-2024-tabela-sla-clientes.md`
- `FAQ-atendimento.md`

**Gabarito de validação:** Chunks do Anexo B — usar o mapa de cobertura para verificar se o pipeline recupera os chunks corretos.

---

## Escopo do Pipeline

O pipeline deve ser implementado em três módulos separados:

### Módulo 1 — Ingestão (`ingest.py` ou equivalente)

**Responsabilidade:** Ler os documentos, dividir em chunks, gerar embeddings, armazenar no ChromaDB.

**Requisitos:**
- Ler os 5 arquivos `.md` como texto.
- Aplicar uma estratégia de chunking **definida e justificada pelo participante**. A justificativa deve explicar:
  - O tamanho de chunk escolhido (ex: 300, 500, 700 tokens).
  - O critério de divisão (fixo por tokens, por seção, por parágrafo, etc.).
  - Como evitar cortar tabelas ou listas no meio.
- Gerar embeddings usando `sentence-transformers` com o modelo `all-MiniLM-L6-v2`.
- Armazenar os chunks e seus embeddings no ChromaDB com **metadados mínimos**: nome do documento fonte e identificador de seção (quando disponível).
- O script deve ser executável de forma isolada (`python ingest.py`).

### Módulo 2 — Busca (`search.py` ou equivalente)

**Responsabilidade:** Receber uma pergunta, gerar embedding, buscar os N chunks mais similares no ChromaDB, retornar os resultados.

**Requisitos:**
- Receber a pergunta como parâmetro de entrada.
- Gerar o embedding da pergunta usando o mesmo modelo da ingestão.
- Buscar os **N chunks mais similares** no ChromaDB (N deve ser um parâmetro configurável).
- Retornar uma lista com: texto do chunk, nome do documento fonte, e **score de similaridade**.

### Módulo 3 — Montagem de Prompt (`assemble_prompt.py` ou equivalente)

**Responsabilidade:** Montar o prompt completo pronto para envio ao LLM.

**Requisitos:**
- Receber como entrada: lista de chunks recuperados (com metadados) e a pergunta do atendente.
- Montar o prompt na estrutura: system prompt + chunks formatados com identificação de fonte + pergunta.
- O system prompt usado aqui deve ser o mesmo desenvolvido na Tarefa 1.2 (ou versão compatível).
- Retornar o prompt montado como string.

---

## Testes de Validação

### Seleção das perguntas de teste

Selecionar **ao menos 5 perguntas** do mapa de cobertura do Anexo B. As perguntas devem ser distribuídas entre diferentes documentos (não todas do mesmo documento).

### Formato do registro de cada teste

Para cada pergunta testada, documentar:

| Campo | Conteúdo |
|-------|---------|
| Pergunta | Texto exato da pergunta |
| Chunks recuperados | Lista dos N chunks retornados pelo módulo de busca |
| Chunks esperados (gabarito) | Chunks correspondentes no Anexo B |
| Chunks corretos? | Sim / Parcialmente / Não — com justificativa |
| Score de similaridade | Score de cada chunk retornado |
| Prompt montado | O prompt completo gerado pelo módulo de montagem |
| Resposta do LLM | Resposta obtida ao colar o prompt no Claude |
| Resposta correta? | Avaliação contra o Anexo A |

### Avaliação da resposta do LLM

Para cada resposta obtida no Claude:
- A resposta está correta conforme o Anexo A?
- Citou a fonte?
- Respeitou os guardrails definidos na Tarefa 1.2?

---

## Identificação de Problemas e Propostas de Correção

O participante deve identificar **ao menos 2 problemas concretos** encontrados durante os testes. Exemplos de problemas válidos:
- Chunk errado recuperado no topo dos resultados.
- Documento irrelevante com score de similaridade mais alto que o documento correto.
- Chunking que cortou uma tabela ao meio, perdendo dados críticos.
- Ambas as versões da PROC-042 (v1 e v2) sendo recuperadas ao mesmo tempo sem critério de prioridade.
- Score de similaridade baixo para perguntas que deveriam ter resposta clara.

Para cada problema identificado, documentar:
1. Descrição do problema (o que aconteceu).
2. Causa provável (por que aconteceu).
3. Proposta de correção concreta (o que mudar no pipeline).

---

## Critérios de Avaliação

1. O pipeline é **funcional**: os três módulos executam sem erros e retornam resultados (não precisa ser perfeito).
2. A estratégia de chunking é **justificada** — não pode ser apenas "512 tokens fixos" sem explicação do critério.
3. Os testes usam **perguntas realistas do domínio** e são comparados com o gabarito do Anexo B.
4. Os problemas identificados são **reais** (encontrados durante os testes, não hipotéticos) e as propostas de correção são concretas e implementáveis.
5. O participante demonstra que entende **RAG como sistema de engenharia de dados**: a qualidade do retrieval depende da qualidade da ingestão e do chunking, não apenas da chamada ao LLM.
6. Há **evidência do uso do GitHub Copilot** na implementação (ex: comentários no código indicando sugestões aceitas, screenshots, ou relato do processo).

---

## Entregável

1. Código-fonte dos três módulos (`ingest.py`, `search.py`, `assemble_prompt.py` ou equivalentes).
2. Evidência do uso do GitHub Copilot na implementação.
3. Registro dos 5 testes com todos os campos documentados (tabela ou formato equivalente).
4. Análise dos problemas encontrados com propostas de correção.
