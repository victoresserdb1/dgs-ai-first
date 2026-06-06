#!/usr/bin/env python3
"""
Módulo de Montagem de Prompt — Pipeline RAG NovaTech
=====================================================

Responsável por:
  1. Receber os chunks recuperados e a pergunta do atendente
  2. Montar o prompt completo: [System Prompt] + [Contexto] + [Pergunta]
  3. Retornar a string pronta para colar no chat do Claude

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ESTRUTURA DE CONTEXTO: ESTÁTICO vs DINÂMICO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ESTÁTICO (vai em TODAS as queries — não muda, ~450 tokens):
  - Identidade e papel do assistente
  - Guardrails (6 regras obrigatórias)
  - Prioridade de fontes quando houver conflito
  - Formato de resposta esperado

DINÂMICO (muda a cada query):
  - Chunks recuperados: N × ~375 tokens  (varia por N e por chunk)
  - Pergunta do atendente: ~15–50 tokens

Orçamento de contexto estimado (GPT-4o 128K):
  - System prompt:        ~450  tokens  (estático)
  - 5 chunks × 375 tok: ~1.875 tokens  (dinâmico)
  - Pergunta:              ~50  tokens  (dinâmico)
  - TOTAL POR QUERY:    ~2.375 tokens  → ≪ 128K → margem enorme

Isso significa que o sistema escala bem mesmo aumentando N para 10–15
chunks sem risco de overflow. O gargalo real é a qualidade do retrieval,
não o tamanho da janela de contexto neste protótipo.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EVIDÊNCIA GITHUB COPILOT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[COPILOT-08] O rascunho inicial do SYSTEM_PROMPT foi gerado pelo
  Copilot a partir do comentário
  "# system prompt for NovaTech internal customer service assistant
  # with RAG; must enforce source citation and no hallucination".
  Copilot produziu a estrutura de seções (Identidade, Regras, Formato).
  Conteúdo foi iterado manualmente para incorporar os guardrails
  definidos nas specs da Tarefa 1.2.

[COPILOT-09] A função format_chunks_section foi completada pelo
  Copilot ao digitar o início do loop "for chunk in chunks:".
  Copilot sugeriu a formatação com Rank, Fonte, Seção e Relevância
  a partir do padrão estabelecido no primeiro item do loop.

[COPILOT-10] O Copilot sugeriu a função estimate_prompt_tokens com
  a heurística de 4 chars/token ao comentar "# estimate token count
  using character approximation for Portuguese text".
"""

from typing import Dict, List

# ─────────────────────────────────────────────────────────────────────────────
# SYSTEM PROMPT — PARTE ESTÁTICA (~450 tokens)
# ─────────────────────────────────────────────────────────────────────────────

# [COPILOT-08] Rascunho inicial gerado pelo Copilot; iterado manualmente.
SYSTEM_PROMPT = """\
Você é o Assistente de Atendimento Interno da NovaTech — um assistente de IA \
especializado em responder dúvidas da equipe de atendimento com base na \
documentação oficial da empresa.

## Identidade
- Você auxilia ATENDENTES INTERNOS, não clientes finais.
- Você responde em português formal, mas acessível.
- Você NÃO tem memória de conversas anteriores — cada consulta é independente.

## Regras Obrigatórias

1. BASEIE-SE APENAS NO CONTEXTO FORNECIDO. Responda somente com base nos \
trechos de documentação abaixo. Não invente prazos, valores, regras ou \
procedimentos que não estejam explicitamente nesses trechos.

2. SEMPRE CITE A FONTE. Para cada informação, indique o documento de origem \
no formato: [Fonte: NOME_DO_DOCUMENTO | Seção: NOME_DA_SEÇÃO]. Se a resposta \
usar múltiplos chunks, cite todas as fontes.

3. QUANDO NÃO ENCONTRAR RESPOSTA, diga exatamente:
   "Não encontrei essa informação na documentação disponível. Recomendo \
escalar para o supervisor ou consultar diretamente a área responsável."
   Nunca invente uma resposta para preencher uma lacuna.

4. QUANDO HOUVER DOCUMENTOS CONFLITANTES (ex: PROC-042 v1 e v2 com valores \
diferentes), mencione AMBAS as versões e indique qual deve ser usada com base \
nas disposições transitórias (chamados a partir de 01/12/2023 usam a v2).

5. NÃO EXTRAPOLE. Se um chunk diz "prazo de 7 dias úteis", não infira \
"aproximadamente 1 semana e meia". Cite o valor exato do documento.

6. NÃO DÊ PARECERES JURÍDICOS OU DE COMPLIANCE. Para cargas perigosas, \
regulamentações ANTT ou situações envolvendo Jurídico, encaminhe sempre para \
Gestão de Riscos (ramal 4500) ou sinistros@novatech.com.br.

## Prioridade de Fontes (em caso de conflito)
1. POL e PROC versão mais recente > versão antiga
2. SLA-2024 é a fonte oficial para tiers e SLAs de cliente
3. FAQ-Atendimento é fonte INFORMAL — sinalizar quando usada

## Formato de Resposta
- Resposta direta (máximo 4 parágrafos)
- Citação de fonte após cada informação relevante
- Se aplicável: próximos passos para o atendente
- Se requer escalação: indicar explicitamente para onde e como\
"""


# ─────────────────────────────────────────────────────────────────────────────
# FUNÇÕES DE MONTAGEM
# ─────────────────────────────────────────────────────────────────────────────

def format_chunks_section(chunks: List[Dict]) -> str:
    """
    Formata a lista de chunks em uma seção de contexto estruturada.

    Cada chunk é apresentado com número sequencial (rank), documento
    de origem, seção e texto completo. O rank permite que o LLM
    referencie o chunk pelo número na resposta se necessário.

    # [COPILOT-09] Copilot completou o loop ao digitar o primeiro item.
    """
    if not chunks:
        return "*(Nenhum trecho relevante recuperado para esta consulta.)*\n"

    lines: List[str] = [
        "## Documentação Recuperada",
        f"*{len(chunks)} trecho(s) relevante(s) da base de documentos NovaTech:*\n",
    ]

    for chunk in chunks:
        score = chunk.get("similarity_score", 0.0)
        rank = chunk.get("rank", "?")
        source = chunk.get("source", "desconhecido")
        section = chunk.get("section", "N/A")[:80]
        text = chunk.get("text", "")

        # [COPILOT-09] Copilot sugeriu adicionar o score de relevância
        # como informação de metadado para o LLM avaliar confiabilidade.
        lines.append(f"---")
        lines.append(f"**[Trecho {rank}]** Fonte: `{source}` | Seção: `{section}` | Relevância: {score:.0%}")
        lines.append("")
        lines.append(text)
        lines.append("")

    return "\n".join(lines)


def assemble_prompt(
    question: str,
    chunks: List[Dict],
    system_prompt: str = SYSTEM_PROMPT,
) -> str:
    """
    Monta o prompt completo para envio ao Claude.

    Estrutura:
      1. [ESTÁTICO]  System prompt — identidade, guardrails, formato
      2. [DINÂMICO]  Seção de contexto — chunks com fonte e relevância
      3. [DINÂMICO]  Pergunta do atendente

    Args:
        question      : Pergunta do atendente em linguagem natural
        chunks        : Lista de chunks do módulo search.py
        system_prompt : System prompt (padrão: SYSTEM_PROMPT acima)

    Returns:
        String com o prompt completo, pronto para colar no Claude.

    # [COPILOT-09] Copilot sugeriu separadores "---" entre seções para
    # clareza visual e semântica para o LLM.
    """
    context_section = format_chunks_section(chunks)

    prompt = (
        f"{system_prompt}\n\n"
        f"---\n\n"
        f"{context_section}\n"
        f"---\n\n"
        f"## Pergunta do Atendente\n\n"
        f"{question}\n\n"
        f"---\n\n"
        f"*Responda com base exclusivamente nos trechos acima. Cite as fontes.*"
    )
    return prompt


def estimate_prompt_tokens(prompt: str) -> int:
    """
    Estimativa de tokens: ~4 caracteres por token (heurística para português).
    Útil para verificar se o prompt cabe na janela de contexto.

    # [COPILOT-10] Copilot sugeriu esta heurística ao comentar o objetivo.
    """
    return len(prompt) // 4


def print_prompt_summary(prompt: str, question: str, n_chunks: int) -> None:
    """Resumo diagnóstico do prompt montado."""
    tok = estimate_prompt_tokens(prompt)
    print(f"\n{'=' * 60}")
    print(f"PROMPT MONTADO")
    print(f"{'=' * 60}")
    print(f"Pergunta       : {question}")
    print(f"Chunks         : {n_chunks}")
    print(f"Tamanho        : {len(prompt):,} caracteres")
    print(f"Tokens (~est.) : ~{tok:,} tokens")
    print(f"128K window    : {'OK' if tok < 120_000 else 'REVISAR — próximo do limite'}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    # Teste rápido com chunk simulado
    test_chunks = [
        {
            "text": (
                "[### 3.1. Prazo geral]\n"
                "O cliente pode solicitar a devolução de mercadorias em até "
                "7 (sete) dias úteis após a data de recebimento confirmada no "
                "sistema de tracking."
            ),
            "source": "POL-001-politica-devolucao",
            "section": "### 3.1. Prazo geral",
            "similarity_score": 0.92,
            "rank": 1,
        }
    ]
    prompt = assemble_prompt("Qual o prazo de devolução?", test_chunks)
    print(prompt)
    print_prompt_summary(prompt, "Qual o prazo de devolução?", len(test_chunks))
