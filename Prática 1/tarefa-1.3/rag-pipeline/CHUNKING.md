# Estratégia de Chunking — Pipeline RAG NovaTech

## Resumo da Decisão

**Abordagem:** Chunking híbrido por seção markdown + parágrafo, com preservação de tabelas e overlap de 150 caracteres.

**Não usada:** Chunking fixo por tokens (ex: "512 tokens" sem critério adicional).

---

## Por que chunking por seção e não por tamanho fixo?

Os atendentes da NovaTech fazem perguntas de domínio específico:

- *"Qual o prazo de devolução?"* → seção 3.1 da POL-001
- *"Qual o SLA do cliente Gold?"* → seção 2 da SLA-2024
- *"Quanto custa frete para 600kg para Manaus?"* → seção 2.1 da PROC-042-v2

Cada seção dos documentos corresponde a um **tópico bem delimitado**. Dividir por seção preserva essa coerência semântica, tornando o embedding de cada chunk mais representativo do tópico e o retrieval mais preciso.

Com chunking por tamanho fixo (ex: 512 tokens), uma única seção seria cortada em pedaços que perdem contexto do título e da estrutura. O chunk que contém a tabela de multiplicadores regionais, por exemplo, ficaria sem o cabeçalho da seção que identifica o documento e a versão.

---

## Parâmetros adotados

| Parâmetro | Valor | Justificativa |
|-----------|-------|---------------|
| `MAX_CHUNK_SIZE` | 1.500 caracteres (~300–375 tokens) | Granular o suficiente para respostas específicas; contexto suficiente para o LLM |
| `CHUNK_OVERLAP` | 150 caracteres | Evita perda de contexto em fronteiras de parágrafos |
| Critério de divisão primário | Header markdown `##` e `###` | Coincide com fronteiras semânticas dos documentos NovaTech |
| Critério de divisão secundário | `\n\n` (parágrafo) | Quando seção excede MAX_CHUNK_SIZE, dividir por parágrafo |
| Tratamento de tabelas | Manter tabela intacta (sem divisão) | Ver seção abaixo |

---

## Tratamento de Tabelas

As tabelas nos documentos NovaTech são **dados estruturados críticos**:

- **Tabela de SLA** (SLA-2024, seção 2): 7 métricas × 3 tiers → 21 valores. Cortar ao meio tornaria a tabela ilegível e o LLM inferiria valores incorretos.
- **Tabela de multiplicadores** (PROC-042-v2, seção 2.1): 5 regiões × 1 multiplicador. Perder uma linha significa dar multiplicador errado para uma região.

**Solução implementada:** Se uma seção contém uma tabela markdown (detectado por ≥ 2 linhas começando com `|`), ela é mantida como chunk único, mesmo que exceda `MAX_CHUNK_SIZE`.

**Trade-off:** Chunks com tabela grandes (~2.000–3.000 chars) cabem bem dentro da janela de contexto do Claude (128K tokens), então não há perda funcional.

---

## Tratamento de Listas Numeradas

Listas numeradas (ex: procedimentos passo a passo na POL-001, seção 3.3) são preservadas por dois mecanismos:

1. O critério de divisão por `\n\n` preserva a lista inteira se ela couber em um único parágrafo (o que ocorre para a maioria dos procedimentos da NovaTech).
2. O overlap de 150 caracteres garante que, se houver divisão entre parágrafos consecutivos, o início do próximo chunk inclua o final do anterior — mantendo continuidade entre passos.

---

## Por que MAX_CHUNK_SIZE = 1.500 caracteres?

**Orçamento de contexto por query:**

```
System prompt:      ~450 tokens (estático)
5 chunks × 375 tok: ~1.875 tokens (dinâmico)
Pergunta do atend:  ~50 tokens
─────────────────────────────────────────
TOTAL:              ~2.375 tokens (<<< 128K)
```

Com 1.500 chars por chunk:
- Cada chunk tem ~375 tokens (a ~4 chars/token para português)
- 5 chunks = ~1.875 tokens de contexto
- Margem enorme na janela de 128K tokens

Isso permite aumentar N para 10–15 chunks sem qualquer problema. O gargalo real é a **qualidade do retrieval**, não o tamanho da janela.

---

## Relação com o efeito "Lost in the Middle"

Estudos em LLMs mostram que modelos atendem melhor a informações posicionadas **no início e no final** do contexto. Informações no meio de contextos muito longos são parcialmente ignoradas.

A estratégia de chunking adota dois mitigadores:

1. **Chunks pequenos e focados**: Em vez de um único bloco de 5.000 tokens contendo todos os documentos, cada chunk de ~375 tokens é um tópico específico. No prompt, o LLM recebe apenas 5 chunks relevantes — todos "próximos" do início ou fim do contexto.

2. **Posicionamento dos chunks mais relevantes primeiro**: O módulo de busca retorna chunks ordenados por score de similaridade (maior primeiro). O `format_chunks_section` os apresenta nessa ordem, garantindo que o chunk mais relevante apareça no início da seção de contexto.

---

## Justificativa das Decisões de Implementação

### Por que `re.split(r"\n\n+")` em vez de `split("\n\n")`?

Documentos markdown frequentemente têm 2 ou mais linhas em branco consecutivas entre seções. O padrão `\n\n+` captura todos esses casos, evitando chunks "vazios" com apenas espaços em branco.

### Por que usar o título da seção como prefixo de cada chunk?

Cada chunk começa com `[# Título da Seção]`. Isso serve dois propósitos:
1. O embedding do chunk inclui a semântica do título (ex: "multiplicadores regionais") além do conteúdo.
2. O LLM recebe o contexto de onde a informação está no documento, facilitando a citação correta de fonte.

### Por que o overlap é de 150 chars (não de tokens)?

Implementação mais simples e suficiente para o protótipo. Em produção, seria mais preciso usar tokenizer para garantir overlap consistente entre modelos diferentes.
