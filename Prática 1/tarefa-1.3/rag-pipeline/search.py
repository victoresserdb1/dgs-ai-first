#!/usr/bin/env python3
"""
Módulo de Busca — Pipeline RAG NovaTech
========================================

Responsável por:
  1. Receber uma pergunta como string
  2. Gerar o embedding da pergunta com all-MiniLM-L6-v2
  3. Buscar os N chunks mais similares no ChromaDB (cosine similarity)
  4. Retornar lista estruturada com texto, fonte e score de similaridade

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DECISÃO SOBRE N (número de chunks a retornar)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Padrão: N = 5

Justificativa:
  - 5 chunks × ~375 tokens = ~1.875 tokens de contexto por query
  - Soma com system prompt (~450 tokens) e pergunta (~50 tokens):
    total ~2.375 tokens → cabe facilmente na janela de 128K do GPT-4o
  - Para perguntas com documentos conflitantes (PROC-042 v1 vs v2),
    N=5 garante que ambas as versões apareçam, permitindo que o LLM
    aplique as disposições transitórias corretamente
  - N=3 seria restritivo demais para perguntas multi-domínio
  - N=10 polui o contexto com chunks de baixa relevância (ruído)
  - Valor é configurável por parâmetro para cenários específicos

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONVERSÃO DISTÂNCIA → SIMILARIDADE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ChromaDB com hnsw:space=cosine retorna cosine distance:
  distance = 1 - cosine_similarity

Portanto:
  similarity_score = 1.0 - distance

  distance = 0.0 → similarity = 1.0 (vetores idênticos)
  distance = 1.0 → similarity = 0.0 (ortogonais, sem correlação)
  distance = 2.0 → similarity = -1.0 (opostos — raro em prática)

Score normalizado com max(0.0, 1.0 - distance) para evitar valores
negativos em casos de ortogonalidade perfeita.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EVIDÊNCIA GITHUB COPILOT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[COPILOT-05] A função search_chunks foi gerada pelo Copilot a partir
  do comentário "# search ChromaDB for N most similar chunks to the
  query embedding and return structured results". Copilot gerou o
  esqueleto com query_embeddings, n_results e include params.

[COPILOT-06] A conversão distance → similarity_score foi sugerida
  pelo Copilot ao escrever "# convert cosine distance to similarity".
  Copilot propôs: similarity = 1 - distance (correto para cosine).

[COPILOT-07] O bloco de zip(documents, metadatas, distances) foi
  completado automaticamente pelo Copilot ao iniciar o loop for.
"""

from pathlib import Path
from typing import Dict, List, Optional

import chromadb
from sentence_transformers import SentenceTransformer

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURAÇÕES (devem coincidir com ingest.py)
# ─────────────────────────────────────────────────────────────────────────────

CHROMA_DIR = Path(__file__).parent / "chroma_db"
COLLECTION_NAME = "novatech_docs"
EMBEDDING_MODEL = "all-MiniLM-L6-v2"
DEFAULT_N_RESULTS = 5


# ─────────────────────────────────────────────────────────────────────────────
# FUNÇÕES DE BUSCA
# ─────────────────────────────────────────────────────────────────────────────

def load_collection() -> chromadb.Collection:
    """
    Conecta ao ChromaDB persistente e retorna a coleção NovaTech.

    Lança ValueError se a coleção não existir (ingest.py ainda não rodou).
    # [COPILOT-05] Copilot completou PersistentClient e get_collection.
    """
    if not CHROMA_DIR.exists():
        raise FileNotFoundError(
            f"ChromaDB não encontrado em '{CHROMA_DIR}'.\n"
            "Execute 'python ingest.py' antes de usar o módulo de busca."
        )
    client = chromadb.PersistentClient(path=str(CHROMA_DIR))
    return client.get_collection(name=COLLECTION_NAME)


def search_chunks(
    question: str,
    n_results: int = DEFAULT_N_RESULTS,
    model: Optional[SentenceTransformer] = None,
    collection: Optional[chromadb.Collection] = None,
) -> List[Dict]:
    """
    Busca os N chunks mais similares à pergunta no ChromaDB.

    Args:
        question   : Pergunta do atendente em linguagem natural
        n_results  : Número de chunks a retornar (padrão: 5)
        model      : Modelo pré-carregado (reutilizar entre chamadas)
        collection : Coleção ChromaDB pré-carregada (reutilizar entre chamadas)

    Returns:
        Lista de dicts com os campos:
          - text             : texto completo do chunk
          - source           : nome do documento de origem
          - section          : título da seção do chunk
          - similarity_score : float 0.0–1.0 (maior = mais similar)
          - distance         : cosine distance original (menor = mais similar)
          - rank             : posição no ranking (1 = mais similar)

    # [COPILOT-05] Copilot gerou o esqueleto desta função.
    # [COPILOT-06] Conversão de distância sugerida pelo Copilot.
    # [COPILOT-07] Loop de zip sugerido pelo Copilot.
    """
    if model is None:
        model = SentenceTransformer(EMBEDDING_MODEL)
    if collection is None:
        collection = load_collection()

    # Gerar embedding da pergunta (mesmo modelo usado na ingestão)
    query_embedding = model.encode([question], convert_to_numpy=True)[0].tolist()

    # Buscar no ChromaDB — include garante que recebemos texto + metadados + distâncias
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=n_results,
        include=["documents", "metadatas", "distances"],
    )

    # [COPILOT-07] Copilot completou o zip loop ao iniciar "for rank, ("
    structured: List[Dict] = []
    if results["documents"] and results["documents"][0]:
        for rank, (doc, meta, dist) in enumerate(
            zip(
                results["documents"][0],
                results["metadatas"][0],
                results["distances"][0],
            ),
            start=1,
        ):
            # [COPILOT-06] Conversão: cosine distance → similarity score
            similarity_score = max(0.0, 1.0 - dist)
            structured.append(
                {
                    "text": doc,
                    "source": meta.get("source", "desconhecido"),
                    "section": meta.get("section", ""),
                    "similarity_score": round(similarity_score, 4),
                    "distance": round(dist, 4),
                    "rank": rank,
                }
            )

    return structured


def print_search_results(question: str, results: List[Dict]) -> None:
    """
    Exibe os resultados de busca em formato legível para diagnóstico.
    Útil durante testes e validação do pipeline.

    # Copilot: gerou o formato de impressão ao comentar
    # "# pretty print search results with rank, score, source, text preview"
    """
    print(f"\n{'=' * 60}")
    print(f"PERGUNTA: {question}")
    print(f"{'=' * 60}")
    for r in results:
        print(
            f"\n[Rank {r['rank']}] "
            f"Score: {r['similarity_score']:.4f} | "
            f"Fonte: {r['source']} | "
            f"Seção: {r['section'][:55]}"
        )
        print(f"  {r['text'][:280]}...")
        print("  " + "─" * 38)


if __name__ == "__main__":
    import sys

    q = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else "Qual o prazo de devolução?"
    print(f"Carregando recursos para consulta: '{q}'")
    _model = SentenceTransformer(EMBEDDING_MODEL)
    _collection = load_collection()
    _results = search_chunks(q, n_results=5, model=_model, collection=_collection)
    print_search_results(q, _results)
