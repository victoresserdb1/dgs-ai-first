#!/usr/bin/env python3
"""
Módulo de Ingestão — Pipeline RAG NovaTech
==========================================

Responsável por:
  1. Ler os 5 documentos .md da NovaTech como texto
  2. Dividir em chunks usando estratégia híbrida por seção/parágrafo
  3. Gerar embeddings com sentence-transformers (all-MiniLM-L6-v2)
  4. Armazenar chunks + embeddings + metadados no ChromaDB

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ESTRATÉGIA DE CHUNKING — Justificativa
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Escolha: Chunking híbrido por seção markdown + parágrafo, com preservação
         de tabelas e sobreposição (overlap) de 150 caracteres.

Por que esta abordagem para atendentes da NovaTech:

  1. Atendentes fazem perguntas específicas de domínio (ex: "qual o SLA
     Gold?", "posso devolver carga perigosa?") que mapeiam diretamente
     para seções dos documentos. Dividir por seções (## e ###) preserva
     a coerência semântica: cada chunk corresponde a um tópico definido,
     tornando o retrieval mais preciso do que chunks por tamanho fixo.

  2. Tabelas (tabela de SLA, multiplicadores de frete) DEVEM permanecer
     intactas dentro do chunk da seção. Cortar tabelas no meio tornaria
     os dados numéricos ilegíveis e levaria o LLM a alucinar valores.
     → Solução: seções com tabelas são mantidas como chunk único, mesmo
       que excedam o limite de MAX_CHUNK_SIZE.

  3. Limite de 1.500 caracteres por chunk (~300–375 tokens, a ~4 chars
     por token). Esse tamanho:
     - É granular o suficiente para responder perguntas específicas
     - Mantém contexto suficiente para o LLM interpretar sem referências
       externas
     - Permite incluir 5 chunks no prompt sem explodir a janela de 128K
       (5 × 375 tokens = 1.875 tokens de contexto, bem dentro do limite)

  4. Overlap de 150 caracteres entre sub-chunks da mesma seção:
     Uma exceção ou complemento pode estar no final de um parágrafo e
     ser crítica para interpretar o próximo. O overlap garante que essa
     informação não se perca na fronteira entre chunks.

Por que NÃO chunking fixo por tokens:
  - Quebraria tabelas no meio de uma linha
  - Quebraria listas de procedimentos entre passos
  - Ignoraria a estrutura semântica dos documentos
  - Geraria chunks sem identidade de tópico, dificultando o retrieval

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EVIDÊNCIA GITHUB COPILOT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[COPILOT-01] A função split_section_into_chunks foi scaffolded pelo
  Copilot a partir do comentário descritivo "# Split section text into
  chunks preserving tables. If section has table, keep intact."
  O Copilot gerou o esqueleto com os três casos (tabela, tamanho ok,
  split por parágrafo). Ajustes manuais: lógica de overlap e prefixo
  de seção no texto de cada sub-chunk.

[COPILOT-02] O regex r"^(#{1,3})\\s+(.+)$" para capturar headers
  markdown foi sugerido pelo Copilot ao digitar o comentário
  "# regex to match markdown headers level 1, 2 and 3".

[COPILOT-03] O loop de batch insert no ChromaDB foi completado
  automaticamente pelo Copilot ao escrever collection.add(. O
  Copilot sugeriu os parâmetros ids=, embeddings=, documents=,
  metadatas= na ordem correta da API.

[COPILOT-04] Copilot sugeriu converter has_table para string no
  metadado (ChromaDB não aceita bool nativo em metadados) ao detectar
  o tipo bool na construção do dict de metadata.
"""

import hashlib
import re
from collections import Counter
from pathlib import Path
from typing import Dict, List, Tuple

import chromadb
from sentence_transformers import SentenceTransformer

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURAÇÕES
# ─────────────────────────────────────────────────────────────────────────────

# Documentos estão dois níveis acima da pasta do pipeline:
#   rag-pipeline/ → tarefa-1.3/ → Prática 1/   (3 levels from this file)
DOCS_DIR = Path(__file__).parent.parent.parent

DOCUMENT_FILES = [
    "POL-001-politica-devolucao.md",
    "PROC-042-frete-especial-v1.md",
    "PROC-042-v2-frete-especial-revisado.md",
    "SLA-2024-tabela-sla-clientes.md",
    "FAQ-atendimento.md",
]

CHROMA_DIR = Path(__file__).parent / "chroma_db"
COLLECTION_NAME = "novatech_docs"
EMBEDDING_MODEL = "all-MiniLM-L6-v2"

MAX_CHUNK_SIZE = 1500   # caracteres (~300–375 tokens)
CHUNK_OVERLAP = 150     # sobreposição entre sub-chunks consecutivos


# ─────────────────────────────────────────────────────────────────────────────
# FUNÇÕES DE CHUNKING
# ─────────────────────────────────────────────────────────────────────────────

def load_document(file_path: Path) -> str:
    """Lê um arquivo .md e retorna o conteúdo como string UTF-8."""
    with open(file_path, "r", encoding="utf-8") as f:
        return f.read()


def has_table(text: str) -> bool:
    """
    Detecta se um bloco de texto contém uma tabela markdown.
    Critério: pelo menos 2 linhas começando com '|' (cabeçalho + separador).
    """
    # [COPILOT-02 relacionado] Copilot sugeriu filtrar por startswith("|")
    table_lines = [ln for ln in text.split("\n") if ln.strip().startswith("|")]
    return len(table_lines) >= 2


def split_section_into_chunks(
    section_text: str,
    section_title: str,
    doc_name: str,
    max_size: int = MAX_CHUNK_SIZE,
    overlap: int = CHUNK_OVERLAP,
) -> List[Dict]:
    """
    Divide o texto de uma seção em chunks respeitando a estrutura do conteúdo.

    Lógica de decisão:
      1. Seção com tabela  → manter intacta (nunca dividir tabelas)
      2. Seção ≤ max_size  → chunk único
      3. Seção longa       → dividir por parágrafos (\n\n) com overlap

    Cada chunk retornado inclui o título da seção como prefixo para
    fornecer contexto ao modelo de embedding e ao LLM.

    # [COPILOT-01] Copilot gerou o esqueleto desta função a partir do
    # comentário descritivo no início do arquivo.
    """
    chunks: List[Dict] = []
    text = section_text.strip()
    if not text:
        return chunks

    # Caso 1: seção contém tabela → preservar intacta
    if has_table(text):
        chunks.append({
            "text": f"[{section_title}]\n{text}",
            "section": section_title,
            "source": doc_name,
            "has_table": True,
        })
        return chunks

    # Caso 2: seção pequena → chunk único
    if len(text) <= max_size:
        chunks.append({
            "text": f"[{section_title}]\n{text}",
            "section": section_title,
            "source": doc_name,
            "has_table": False,
        })
        return chunks

    # Caso 3: seção longa → dividir por parágrafos com overlap
    # [COPILOT-01] Copilot sugeriu re.split para manter parágrafos completos
    paragraphs = re.split(r"\n\n+", text)
    current = f"[{section_title}]\n"

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue

        header_prefix = f"[{section_title}]\n"
        would_exceed = len(current) + len(para) + 2 > max_size
        has_content = len(current) > len(header_prefix)

        if would_exceed and has_content:
            chunks.append({
                "text": current.strip(),
                "section": section_title,
                "source": doc_name,
                "has_table": False,
            })
            # Overlap: iniciar novo sub-chunk com tail do anterior
            tail = current[-overlap:] if len(current) > overlap else current
            current = f"[{section_title}] (cont.)\n{tail}\n{para}\n\n"
        else:
            current += para + "\n\n"

    # Salvar o último sub-chunk
    if current.strip() not in ("", f"[{section_title}]"):
        chunks.append({
            "text": current.strip(),
            "section": section_title,
            "source": doc_name,
            "has_table": False,
        })

    return chunks


def parse_markdown_sections(content: str, doc_name: str) -> List[Dict]:
    """
    Parseia um documento markdown e retorna lista de chunks por seção.

    Estratégia:
    - Headers ##  (nível 2) e ### (nível 3) delimitam seções
    - Conteúdo antes do primeiro header é tratado como preâmbulo/metadados
    - Cada seção tem seu texto processado por split_section_into_chunks

    # [COPILOT-02] Regex para capturar headers sugerido pelo Copilot
    """
    # [COPILOT-02] r"^(#{1,3})\s+(.+)$" sugerido pelo Copilot
    header_re = re.compile(r"^(#{1,3})\s+(.+)$", re.MULTILINE)
    matches = list(header_re.finditer(content))

    if not matches:
        # Documento sem headers — tratar como seção única
        return split_section_into_chunks(content, doc_name, doc_name)

    all_chunks: List[Dict] = []

    # Preâmbulo (conteúdo antes do primeiro header — metadados do doc)
    preamble = content[: matches[0].start()].strip()
    if preamble:
        all_chunks.extend(
            split_section_into_chunks(preamble, f"{doc_name} — Metadados", doc_name)
        )

    # Processar cada seção identificada
    for i, match in enumerate(matches):
        level = len(match.group(1))
        title = match.group(2).strip()
        section_title = f"{'#' * level} {title}"

        start = match.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(content)
        section_content = content[start:end].strip()

        if section_content:
            chunks = split_section_into_chunks(section_content, section_title, doc_name)
            all_chunks.extend(chunks)

    return all_chunks


def chunk_document(file_path: Path) -> List[Dict]:
    """
    Lê e chunka um documento .md completo.
    Adiciona chunk_id único (hash MD5 parcial do conteúdo) a cada chunk.
    """
    doc_name = file_path.stem
    content = load_document(file_path)
    chunks = parse_markdown_sections(content, doc_name)

    for idx, chunk in enumerate(chunks):
        content_hash = hashlib.md5(chunk["text"].encode()).hexdigest()[:8]
        chunk["chunk_id"] = f"{doc_name}_{idx:03d}_{content_hash}"

    return chunks


# ─────────────────────────────────────────────────────────────────────────────
# GERAÇÃO DE EMBEDDINGS
# ─────────────────────────────────────────────────────────────────────────────

def load_embedding_model() -> SentenceTransformer:
    """
    Carrega o modelo all-MiniLM-L6-v2.

    Por que este modelo:
    - Gratuito e open-source (Apache 2.0 license)
    - 384 dimensões — bom equilíbrio entre qualidade e velocidade
    - Treinado para similaridade semântica de frases curtas a médias
    - Excelente para RAG: captura semântica de domínio específico
    - Roda localmente sem necessidade de API key
    """
    print(f"  Carregando modelo de embeddings: {EMBEDDING_MODEL}")
    return SentenceTransformer(EMBEDDING_MODEL)


def generate_embeddings(
    texts: List[str], model: SentenceTransformer
) -> List[List[float]]:
    """
    Gera embeddings para uma lista de textos.
    Retorna lista de vetores (listas de float) prontos para o ChromaDB.

    # Copilot sugeriu show_progress_bar=True para feedback visual durante
    # ingestão de muitos documentos.
    """
    embeddings = model.encode(texts, show_progress_bar=True, convert_to_numpy=True)
    return embeddings.tolist()


# ─────────────────────────────────────────────────────────────────────────────
# ARMAZENAMENTO NO CHROMADB
# ─────────────────────────────────────────────────────────────────────────────

def setup_chromadb() -> Tuple[chromadb.PersistentClient, chromadb.Collection]:
    """
    Inicializa o ChromaDB com persistência local.

    Configuração de distância: cosine
    - sentence-transformers produz vetores normalizados → cosine é ideal
    - ChromaDB retorna cosine distance (0 = idêntico, 2 = oposto)
    - Em search.py: similarity_score = 1 - distance (normalizado 0–1)

    A coleção é re-criada a cada ingestão para garantir dados frescos.
    Em produção, usar lógica de upsert para atualizações incrementais.

    # [COPILOT-03] Copilot completou chromadb.PersistentClient ao
    # digitar "client = chromadb.Per"
    """
    print(f"  ChromaDB path: {CHROMA_DIR}")
    CHROMA_DIR.mkdir(parents=True, exist_ok=True)

    client = chromadb.PersistentClient(path=str(CHROMA_DIR))

    # Limpar coleção existente para re-ingestão limpa
    try:
        client.delete_collection(COLLECTION_NAME)
        print(f"  Coleção anterior '{COLLECTION_NAME}' removida.")
    except Exception:
        pass

    collection = client.create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )
    print(f"  Coleção '{COLLECTION_NAME}' criada (distância: cosine).")
    return client, collection


def store_chunks(
    collection: chromadb.Collection,
    chunks: List[Dict],
    embeddings: List[List[float]],
) -> None:
    """
    Armazena chunks com embeddings e metadados no ChromaDB.

    Metadados por chunk:
    - source     : nome do arquivo de origem (sem extensão)
    - section    : título da seção markdown (ex: "### 3.2. Exceções")
    - has_table  : "True"/"False" — se o chunk contém tabela
    - chunk_id   : identificador único

    Nota: ChromaDB não aceita bool em metadados — has_table é string.
    # [COPILOT-04] Copilot sugeriu str(bool) ao detectar tipo incompatível.
    # [COPILOT-03] Copilot completou o bloco collection.add() com todos
    # os parâmetros corretos da API.
    """
    ids = [c["chunk_id"] for c in chunks]
    documents = [c["text"] for c in chunks]
    metadatas = [
        {
            "source": c["source"],
            "section": c["section"],
            "has_table": str(c.get("has_table", False)),
            "chunk_id": c["chunk_id"],
        }
        for c in chunks
    ]

    collection.add(
        ids=ids,
        embeddings=embeddings,
        documents=documents,
        metadatas=metadatas,
    )
    print(f"  → {len(chunks)} chunks armazenados.")


# ─────────────────────────────────────────────────────────────────────────────
# PIPELINE PRINCIPAL
# ─────────────────────────────────────────────────────────────────────────────

def run_ingestion() -> None:
    """
    Executa o pipeline de ingestão completo:
      [1] Chunking de todos os documentos
      [2] Geração de embeddings
      [3] Armazenamento no ChromaDB
    """
    print("=" * 60)
    print("PIPELINE DE INGESTÃO — NovaTech RAG")
    print("=" * 60)

    # Verificar existência dos documentos
    missing = [str(DOCS_DIR / f) for f in DOCUMENT_FILES if not (DOCS_DIR / f).exists()]
    if missing:
        print("\n⚠️  Documentos não encontrados:")
        for m in missing:
            print(f"   {m}")
        print(f"\nCertifique-se de que os docs estão em: {DOCS_DIR}")
        return

    # ── Etapa 1: Chunking ──────────────────────────────────────────────────
    print("\n[1/3] Chunking dos documentos...")
    all_chunks: List[Dict] = []
    for doc_file in DOCUMENT_FILES:
        path = DOCS_DIR / doc_file
        chunks = chunk_document(path)
        with_table = sum(1 for c in chunks if c.get("has_table"))
        print(f"  {doc_file}: {len(chunks)} chunks ({with_table} com tabela)")
        all_chunks.extend(chunks)

    print(f"\n  Total de chunks: {len(all_chunks)}")

    # Garantir IDs únicos (hash de posição absoluta como fallback)
    ids = [c["chunk_id"] for c in all_chunks]
    if len(ids) != len(set(ids)):
        print("  ⚠️  IDs duplicados detectados — regenerando com índice global...")
        for idx, chunk in enumerate(all_chunks):
            h = hashlib.md5(chunk["text"].encode()).hexdigest()[:8]
            chunk["chunk_id"] = f"chunk_{idx:04d}_{h}"

    # ── Etapa 2: Embeddings ────────────────────────────────────────────────
    print("\n[2/3] Gerando embeddings...")
    model = load_embedding_model()
    texts = [c["text"] for c in all_chunks]
    embeddings = generate_embeddings(texts, model)
    print(f"  Vetores: {len(embeddings)} × {len(embeddings[0])} dimensões")

    # ── Etapa 3: ChromaDB ──────────────────────────────────────────────────
    print("\n[3/3] Armazenando no ChromaDB...")
    _, collection = setup_chromadb()
    store_chunks(collection, all_chunks, embeddings)

    # ── Resumo ─────────────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("INGESTÃO CONCLUÍDA")
    print(f"Total de chunks na coleção: {collection.count()}")
    print("=" * 60)
    print("\nResumo por documento:")
    counts = Counter(c["source"] for c in all_chunks)
    for source, count in sorted(counts.items()):
        print(f"  {source}: {count} chunks")


if __name__ == "__main__":
    run_ingestion()
