#!/usr/bin/env python3
"""
Script de Testes de Validação — Pipeline RAG NovaTech
======================================================

Executa 5 testes de validação do pipeline completo, cobrindo:
  - T1: POL-001  — devolução de carga perigosa (exceção crítica)
  - T2: SLA-2024 — SLA do cliente Gold
  - T3: PROC-042-v2 — frete para 600 kg para Manaus (Região Norte)
  - T4: Conflito PROC-042-v1 vs v2 — multiplicador Sudeste
  - T5: FAQ / gap documental — carga danificada em trânsito

Distribuição intencional dos 5 casos:
  - Cobre 4 dos 5 documentos (POL, SLA, PROC-v2, FAQ)
  - Inclui 1 caso com exceção crítica que inverte a regra geral (T1)
  - Inclui 1 caso com conflito de versão documentado (T4)
  - Inclui 1 caso sem cobertura em documentos formais (T5)
  - Inclui 1 caso com cálculo numérico + região específica (T3)

Uso:
  1. python ingest.py           # popular o ChromaDB (executar primeiro)
  2. python test_pipeline.py    # rodar os 5 testes e gerar prompts
  3. Copiar cada prompt gerado e colar no Claude para obter resposta
  4. Preencher as respostas no arquivo test_results_raw.json gerado

O script salva test_results_raw.json com todos os campos preenchíveis,
inclusive placeholders para a resposta do Claude (inserida manualmente).
"""

import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List

from sentence_transformers import SentenceTransformer

# Garantir que o diretório do script está no path
sys.path.insert(0, str(Path(__file__).parent))

from assemble_prompt import assemble_prompt, estimate_prompt_tokens
from search import EMBEDDING_MODEL, load_collection, search_chunks

# ─────────────────────────────────────────────────────────────────────────────
# DEFINIÇÃO DOS 5 TESTES
# ─────────────────────────────────────────────────────────────────────────────

# Gabarito baseado no Anexo B — mapa de cobertura: pergunta → chunks esperados
TESTS: List[Dict] = [
    {
        "id": "T1",
        "document_domain": "POL-001",
        "question": "Posso devolver carga perigosa?",
        "expected_sources": [
            "POL-001-politica-devolucao",  # chunk POL-001-B (regra de exceção)
        ],
        "secondary_sources": [
            "FAQ-atendimento",             # chunk FAQ-03 (contexto informal)
        ],
        # Seções específicas dos chunks esperados (Anexo B) — usadas por evaluate_retrieval()
        "expected_sections": [
            "3.2. Exceções",               # seção da POL-001-B (chunk primário)
        ],
        "correct_answer_summary": (
            "NÃO. Cargas perigosas (classes 1–6 ANTT) NÃO são elegíveis para "
            "devolução pelo processo padrão (POL-001, seção 3.2). O cliente deve "
            "contatar Gestão de Riscos no ramal 4500 para tratamento individual."
        ),
        "guardrail_test": "Não inverter a regra: deve dizer NÃO, não 'pode com exceções'.",
        "pitfall": "Confundir a exceção com a regra: dizer que pode devolver 'com autorização'.",
        "anexo_b_chunks": ["POL-001-B", "FAQ-03"],
    },
    {
        "id": "T2",
        "document_domain": "SLA-2024",
        "question": "Qual o SLA do cliente Gold para chamados gerais?",
        "expected_sources": [
            "SLA-2024-tabela-sla-clientes",  # chunks SLA-2024-B e SLA-2024-A
        ],
        "secondary_sources": [],
        # Seção primária: tabela de SLAs (SLA-2024-B) — avaliação ao nível de chunk
        "expected_sections": [
            "## 2. Tabela de SLAs",         # seção da SLA-2024-B (chunk primário)
        ],
        "correct_answer_summary": (
            "Cliente Gold: resposta em até 2h úteis, resolução em até 24h úteis "
            "(chamados gerais). Incidentes críticos: resposta 30min, resolução 4h. "
            "[Fonte: SLA-2024, Seção 2]"
        ),
        "guardrail_test": "Citar SLA-2024 como fonte; não inventar outros tiers.",
        "pitfall": "Confundir com SLA Silver (4h/48h) ou Standard (8h/72h).",
        "anexo_b_chunks": ["SLA-2024-B", "SLA-2024-A"],
    },
    {
        "id": "T3",
        "document_domain": "PROC-042-v2",
        "question": "Quanto custa o frete para 600kg com destino a Manaus?",
        "expected_sources": [
            "PROC-042-v2-frete-especial-revisado",  # chunks PROC-042v2-A e PROC-042v2-B
        ],
        "secondary_sources": [
            "PROC-042-frete-especial-v1",            # chunk PROC-042-B (versão antiga — risco)
        ],
        # Seção crítica: tabela de multiplicadores regionais v2 (PROC-042v2-B)
        # AUSENTE nos top-5 da execução real — diagnóstico do Problema 2
        "expected_sections": [
            "2.1. Multiplicadores regionais",        # presente em v1 e v2; ausente no retrieval de T3
        ],
        "correct_answer_summary": (
            "Frete especial (>500kg). Manaus = Região Norte, multiplicador 1.8 (PROC-042-v2). "
            "Fator de peso para 600kg (500–1.000kg faixa) = 1.0. "
            "Frete = Valor base × 1.8 × 1.0. Usar PROC-042-v2 para chamados a partir de 01/12/2023."
        ),
        "guardrail_test": "Usar multiplicador Norte da v2 (1.8), não da v1 (1.6). Citar versão.",
        "pitfall": "Usar multiplicador Norte da v1 (1.6) em vez do v2 (1.8).",
        "anexo_b_chunks": ["PROC-042v2-B", "PROC-042v2-A"],
    },
    {
        "id": "T4",
        "document_domain": "PROC-042 (conflito v1 vs v2)",
        "question": "Qual o multiplicador regional para o Sudeste no cálculo de frete especial?",
        "expected_sources": [
            "PROC-042-v2-frete-especial-revisado",  # PROC-042v2-B: Sudeste = 1.1
            "PROC-042-frete-especial-v1",            # PROC-042-B:   Sudeste = 1.0
        ],
        "secondary_sources": [],
        # Ambas as versões da seção 2.1 devem ser recuperadas para o teste de conflito
        "expected_sections": [
            "2.1. Multiplicadores regionais",        # presente em v1 (rank 2) e v2 (rank 1)
        ],
        "correct_answer_summary": (
            "Há conflito entre versões: PROC-042 v1 (mar/2023) diz 1.0; "
            "PROC-042-v2 (nov/2023) diz 1.1. Para chamados a partir de 01/12/2023, "
            "usar 1.1 (PROC-042-v2). AVISO: ambos coexistem no SharePoint sem "
            "marcação de obsolescência."
        ),
        "guardrail_test": "Deve mencionar AMBAS as versões e o conflito; não dar apenas um valor.",
        "pitfall": "Dar apenas um valor (1.0 ou 1.1) sem mencionar o conflito entre versões.",
        "anexo_b_chunks": ["PROC-042v2-B", "PROC-042-B"],
    },
    {
        "id": "T5",
        "document_domain": "FAQ (gap documental)",
        "question": "O que fazer quando a carga chegou danificada ao cliente?",
        "expected_sources": [
            "FAQ-atendimento",  # chunk FAQ-38 — único documento com esta info
        ],
        "secondary_sources": [],
        # Chunk específico: Item 38 do FAQ (FAQ-38 no Anexo B)
        "expected_sections": [
            "Item 38",                              # seção do FAQ-38 (único chunk com esta info)
        ],
        "correct_answer_summary": (
            "Registrar ocorrência em até 48h com fotos e laudo. "
            "Encaminhar para sinistros@novatech.com.br. "
            "IMPORTANTE: só existe cobertura no FAQ informal. "
            "Não há POL ou PROC formal sobre carga danificada."
        ),
        "guardrail_test": "Sinalizar que a fonte é informal (FAQ). Não usar como se fosse normativo.",
        "pitfall": "Responder com alta confiança usando FAQ como se fosse documento normativo.",
        "anexo_b_chunks": ["FAQ-38"],
    },
]


# ─────────────────────────────────────────────────────────────────────────────
# EXECUÇÃO DOS TESTES
# ─────────────────────────────────────────────────────────────────────────────

def evaluate_retrieval(retrieved_chunks: List[Dict], expected_sections: List[str]) -> str:
    """
    Avalia se os chunks corretos foram recuperados, ao nível de seção.

    Verifica se as substrings de seção esperadas (ex: '2.1. Multiplicadores regionais')
    estão presentes nos títulos de seção dos chunks recuperados — avaliação ao nível
    de chunk, não apenas de documento-fonte.

    Correção de NC-03: a versão anterior verificava apenas o nome do arquivo-fonte,
    gerando falsos positivos em T2 e T3 (documento presente, mas chunk crítico ausente).

    Retorna: "CORRETO", "PARCIAL" ou "INCORRETO"
    """
    retrieved_sections = [c["section"] for c in retrieved_chunks]
    found = [
        s for s in expected_sections
        if any(s in r_sec for r_sec in retrieved_sections)
    ]
    if len(found) == len(expected_sections):
        return "CORRETO"
    elif found:
        return "PARCIAL"
    return "INCORRETO"


def run_tests() -> None:
    """Executa os 5 testes de validação e exibe os prompts para uso manual."""

    print("=" * 70)
    print("TESTES DE VALIDAÇÃO — Pipeline RAG NovaTech")
    print(f"Data/hora: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)

    # Carregar recursos uma vez para todos os testes
    print("\nCarregando recursos...")
    try:
        model = SentenceTransformer(EMBEDDING_MODEL)
        collection = load_collection()
        print(f"  Modelo carregado: {EMBEDDING_MODEL}")
        print(f"  Coleção carregada: {collection.count()} chunks no ChromaDB")
    except FileNotFoundError as e:
        print(f"\n⚠️  {e}")
        return

    results_log: List[Dict] = []

    for test in TESTS:
        print(f"\n{'=' * 70}")
        print(f"TESTE {test['id']} — {test['document_domain']}")
        print(f"Pergunta: {test['question']}")
        print("=" * 70)

        # ── Módulo de Busca ────────────────────────────────────────────────
        chunks = search_chunks(
            test["question"],
            n_results=5,
            model=model,
            collection=collection,
        )

        print(f"\n[RETRIEVAL] {len(chunks)} chunks recuperados:")
        retrieved_sources = []
        for chunk in chunks:
            print(
                f"  #{chunk['rank']} score={chunk['similarity_score']:.4f} "
                f"| {chunk['source']} "
                f"| {chunk['section'][:55]}"
            )
            retrieved_sources.append(chunk["source"])

        # ── Validação do retrieval ─────────────────────────────────────────
        print(f"\n[VALIDAÇÃO DO RETRIEVAL]")
        accuracy = evaluate_retrieval(chunks, test["expected_sections"])
        expected_sections = test["expected_sections"]
        retrieved_sections = [c["section"] for c in chunks]
        found_sections = [
            s for s in expected_sections
            if any(s in r for r in retrieved_sections)
        ]
        missing_sections = [
            s for s in expected_sections
            if not any(s in r for r in retrieved_sections)
        ]

        print(f"  Seções esperadas (primárias) : {expected_sections}")
        print(f"  Seções encontradas           : {found_sections}")
        if missing_sections:
            print(f"  ⚠️  Seções ausentes          : {missing_sections}")
        print(f"  Resultado                    : {accuracy}")

        # ── Módulo de Montagem de Prompt ───────────────────────────────────
        prompt = assemble_prompt(test["question"], chunks)
        tok = estimate_prompt_tokens(prompt)

        print(f"\n[PROMPT] ~{tok} tokens | {len(prompt)} chars")
        print("\n" + "─" * 70)
        print("PROMPT COMPLETO (copie e cole no Claude):")
        print("─" * 70)
        print(prompt)
        print("─" * 70)

        # ── Registro do teste ──────────────────────────────────────────────
        results_log.append(
            {
                "test_id": test["id"],
                "document_domain": test["document_domain"],
                "question": test["question"],
                "retrieved_chunks": [
                    {
                        "rank": c["rank"],
                        "source": c["source"],
                        "section": c["section"],
                        "score": c["similarity_score"],
                        "text_preview": c["text"][:250] + "...",
                    }
                    for c in chunks
                ],
                "expected_primary_sources": test["expected_sources"],
                "expected_sections": test["expected_sections"],
                "anexo_b_reference_chunks": test["anexo_b_chunks"],
                "retrieval_accuracy": accuracy,
                "missing_sections": missing_sections,
                "prompt_chars": len(prompt),
                "prompt_tokens_estimate": tok,
                "correct_answer_summary": test["correct_answer_summary"],
                "guardrail_test": test["guardrail_test"],
                "known_pitfall": test["pitfall"],
                # ↓ Preencher manualmente após colar o prompt no Claude
                "llm_response": "[INSERIR: resposta obtida ao colar o prompt no Claude]",
                "response_factually_correct": "[SIM / NÃO / PARCIAL — avaliar contra Anexo A]",
                "cited_sources": "[SIM / NÃO — o Claude citou as fontes dos chunks?]",
                "guardrails_respected": "[SIM / NÃO — o Claude respeitou todos os guardrails?]",
                "notes": "[Observações adicionais sobre a resposta]",
            }
        )

    # ── Salvar log ─────────────────────────────────────────────────────────
    out_path = Path(__file__).parent / "test_results_raw.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(results_log, f, ensure_ascii=False, indent=2)
    print(f"\n\nLog de resultados salvo em: {out_path}")
    print("Preencha os campos 'llm_response', 'response_factually_correct',")
    print("'cited_sources' e 'guardrails_respected' após executar no Claude.")

    # ── Resumo final ───────────────────────────────────────────────────────
    print("\n" + "=" * 70)
    print("RESUMO DE RETRIEVAL")
    print("=" * 70)
    for r in results_log:
        status = r["retrieval_accuracy"]
        icon = "✓" if status == "CORRETO" else ("△" if status == "PARCIAL" else "✗")
        print(f"  [{icon}] {r['test_id']}: {r['question'][:55]:<55} → {status}")


if __name__ == "__main__":
    run_tests()
