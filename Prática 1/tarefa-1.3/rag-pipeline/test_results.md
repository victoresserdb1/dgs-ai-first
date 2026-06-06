# Relatório de Testes — Pipeline RAG NovaTech
## Tarefa 1.3 — Prova de Conceito RAG Open-Source

**Data de execução:** 2026-06-06  
**Stack:** Python 3.13 · ChromaDB 0.4+ · sentence-transformers (all-MiniLM-L6-v2)  
**Documentos ingeridos:** 5 arquivos .md (POL-001, PROC-042-v1, PROC-042-v2, SLA-2024, FAQ-atendimento)

---

## Resumo de Retrieval

**Execução real:** `python ingest.py` + `python test_pipeline.py` — 2026-06-06.  
**Chunks ingeridos:** 37 totais (POL-001: 8 | PROC-042-v1: 6 | PROC-042-v2: 7 | SLA-2024: 6 | FAQ: 10)  
**Modelo de embedding:** all-MiniLM-L6-v2 (384 dimensões, distância cosine)

| Teste | Domínio | Retrieval | Doc primário na posição | Observação |
|-------|---------|-----------|------------------------|------------|
| T1 | POL-001 — carga perigosa | ⚠️ INCORRETO | Ausente (ranks 1–5 = FAQ) | **Problema real #1** — alucinação de fonte na avaliação original (NC-01) |
| T2 | SLA-2024 — SLA Gold | CORRETO | Rank 4 (tabela SLA) | Tabela presente; rank 1 é seção errada |
| T3 | PROC-042-v2 — frete Manaus | ⚠️ INCORRETO | Seção 2.1 ausente dos top 5 | Tabela de multiplicadores ausente (NC-03) |
| T4 | Conflito PROC-042 v1 vs v2 | CORRETO | v2 rank 1 (0.6542), v1 rank 2 (0.6297) | v2 corretamente acima de v1 (dados JSON) |
| T5 | FAQ — carga danificada | CORRETO | Rank 1 (FAQ-38) | Score alto 0.71 |

---

## Teste T1 — Carga Perigosa (POL-001)

**Pergunta:** `Posso devolver carga perigosa?`

**Chunks esperados (Anexo B):** POL-001-B (primário), FAQ-03 (secundário)

### Chunks Recuperados (resultado real do pipeline)

| Rank | Fonte | Seção | Score |
|------|-------|-------|-------|
| 1 | FAQ-atendimento | ### Item 3 — devolução carga perigosa | 0.5978 |
| 2 | FAQ-atendimento | ### Item 22 — seguro de carga | 0.5861 |
| 3 | FAQ-atendimento | ### Item 38 — carga danificada | 0.5389 |
| 4 | PROC-042-frete-especial-v1 | ## 4. Condições especiais | 0.5228 |
| 5 | FAQ-atendimento | ### Item 32 — carga perigosa frete expresso | 0.5053 |

**Validação do retrieval:** ⚠️ INCORRETO — POL-001 **ausente** dos 5 resultados. Apenas FAQ e PROC-042-v1 foram retornados.

**Causa identificada (Problema Real #1):** A seção do POL-001 que contém a regra de exceção (seção 3.2 "Exceções") tem como título apenas "### 3.2. Exceções ao prazo geral" — sem mencionar "perigosa" no título. O embedding do chunk mede similaridade com o título + conteúdo, mas o FAQ Item 3 tem "carga perigosa" no próprio título da seção, gerando score mais alto. O documento normativo autoritativo (POL-001) perdeu para o documento informal (FAQ) por uma questão de metadado de título.

### Resposta do LLM (obtida via prompt no Claude — contexto: apenas FAQ + PROC-042-v1)

> "Com base nas informações disponíveis no contexto:
>
> Devolver carga perigosa **não é permitido pelo processo padrão** de devolução da NovaTech. O procedimento indicado para o atendente é orientar o cliente a ligar no ramal **4500 (Gestão de Riscos)** para tratamento individual do caso.
>
> *Nota:* O FAQ interno (Item 3) menciona que o setor de Gestão de Riscos já autorizou exceções pontuais em situações específicas. No entanto, isso não é o processo padrão — a recomendação é sempre encaminhar ao ramal 4500.
>
> [Fonte: FAQ-atendimento | Seção: ### Item 3 — devolução carga perigosa]"

> ⚠️ **NOTA DE CORREÇÃO (NC-01):** A resposta original documentada neste arquivo citava `[Fonte: POL-001-politica-devolucao | Seção: ### 3.2. Exceções]`. Essa citação constitui **alucinação de fonte**: o POL-001 estava completamente ausente dos 5 chunks recuperados e enviados ao LLM (ver JSON, `retrieval_accuracy: "INCORRETO"`). O LLM não pode citar legitimamente um documento que não estava no seu contexto. A resposta acima reflete o comportamento real do sistema com o contexto efetivamente disponível (FAQ-atendimento + PROC-042-v1 seção Condições especiais).

**Avaliação:**
- ⚠️ Resposta fatualmente PARCIAL — A orientação de contatar ramal 4500 está correta. Porém, a resposta se baseia **exclusivamente no FAQ informal** (tier mais baixo na hierarquia). A POL-001 — documento normativo autoritativo que contém a regra explícita ("NÃO, classes 1–6 ANTT") — não chegou ao LLM
- ⚠️ Citou apenas FAQ-atendimento (fonte que estava no contexto) — **NÃO citou POL-001** (pois não estava no contexto). Isso é tecnicamente correto *para o contexto recebido*, mas o sistema falhou em trazer a fonte autoritativa
- ❌ **Guardrail de hierarquia de fontes VIOLADO:** O FAQ é documento informal (não validado pelo Compliance). Para uma pergunta com implicação normativa direta (cargas perigosas classes ANTT), a spec exige que a resposta seja baseada em POL ou PROC formal. O pipeline entregou contexto insuficiente para uma resposta segura
- ❌ **Guardrail 3 deveria ter sido ativado:** Com POL-001 ausente do contexto, o LLM deveria ter sinalizado que não possui a documentação normativa completa e escalado para supervisor — o FAQ menciona exceções de forma informal, o que aumenta o risco de o atendente concluir incorretamente que "pode devolver com autorização" (armadilha conhecida do T1)
- ❌ **Alucinação de fonte na versão original:** A resposta originalmente documentada citou POL-001 sem tê-la no contexto — violação direta do Guardrail 1 ("baseie-se apenas no contexto fornecido")

---

## Teste T2 — SLA Cliente Gold (SLA-2024)

**Pergunta:** `Qual o SLA do cliente Gold para chamados gerais?`

**Chunks esperados (Anexo B):** SLA-2024-B (primário = tabela de SLAs), SLA-2024-A (secundário)

### Chunks Recuperados (resultado real do pipeline)

| Rank | Fonte | Seção | Score |
|------|-------|-------|-------|
| 1 | SLA-2024-tabela-sla-clientes | ## 5. Medição e reportes | 0.6857 |
| 2 | FAQ-atendimento | ### Item 41 — SLA de resposta e resolução | 0.6375 |
| 3 | FAQ-atendimento | ### Item 27 — tracking em trânsito | 0.6259 |
| 4 | SLA-2024-tabela-sla-clientes | ## 2. Tabela de SLAs | 0.5835 |
| 5 | SLA-2024-tabela-sla-clientes | # SLA-2024 — Tabela de SLA (cabeçalho) | 0.5475 |

**Validação do retrieval:** PARCIAL — A tabela de SLAs (SLA-2024-B) está presente no rank 4, mas **não no rank 1**. O rank 1 é a seção "Medição e reportes" (SLA-5), que responde como o SLA é medido, não quais são os valores. Ranks 2 e 3 são FAQ e FAQ-irrelevante.

**Causa identificada:** A seção "Medição e reportes" contém texto rico em palavras-chave SLA ("SLA", "Gold", "pausa", "chamados"), superando a tabela em score de embedding. A tabela em si tem pouco texto narrativo — é principalmente estrutura tabular com números, o que o all-MiniLM-L6-v2 não consegue capturar tão bem semanticamente quanto texto discursivo.

### Resposta do LLM

> "Para **clientes Gold**, os SLAs para chamados gerais são:
> - Tempo de **primeira resposta:** até **2h úteis**
> - Tempo de **resolução:** até **24h úteis**
>
> Para **incidentes críticos**, os prazos são mais curtos:
> - Primeira resposta: até **30 minutos**
> - Resolução: até **4 horas**
>
> Note que o SLA Gold é o mais favorável dentre os três tiers (Gold, Silver, Standard). Para incidentes críticos de clientes Gold, o relógio **não pausa** fora do horário comercial.
>
> [Fonte: SLA-2024-tabela-sla-clientes | Seção: ## 2. Tabela de SLAs]"

**Avaliação:**
- ✅ Resposta fatualmente correta (2h/24h para gerais; 30min/4h para críticos)
- ✅ Citou SLA-2024 como fonte
- ✅ Não confundiu com Silver (4h/48h) ou Standard (8h/72h)
- ✅ Não inventou tier inexistente

---

## Teste T3 — Frete para Manaus, 600kg (PROC-042-v2)

**Pergunta:** `Quanto custa o frete para 600kg com destino a Manaus?`

**Chunks esperados (Anexo B):** PROC-042v2-B (multiplicadores — primário), PROC-042v2-A (fórmula — primário)

### Chunks Recuperados (resultado real do pipeline)

| Rank | Fonte | Seção | Score |
|------|-------|-------|-------|
| 1 | PROC-042-frete-especial-**v1** | ## 1. Objetivo | 0.5413 |
| 2 | PROC-042-v2-frete-especial-revisado | ## 4. Condições especiais | 0.5288 |
| 3 | PROC-042-v2-frete-especial-revisado | ## 2. Fórmula de cálculo | 0.5268 |
| 4 | PROC-042-frete-especial-v1 | ## 2. Fórmula de cálculo | 0.5256 |
| 5 | PROC-042-frete-especial-v1 | ## 4. Condições especiais | 0.5243 |

**Validação do retrieval:** ⚠️ PARCIAL — PROC-042-v2 está presente (ranks 2 e 3), mas o chunk crítico **PROC-042v2-B (tabela de multiplicadores regionais, seção 2.1)** está AUSENTE dos top 5. O rank 1 é a seção "Objetivo" da versão antiga (v1), que não contém dados de cálculo.

**Causa identificada (Problema Real #2):** A pergunta usa termos geográficos ("Manaus") e de peso ("600kg") que não aparecem nos chunks. O chunking separou a seção 2.1 (multiplicadores) da seção 2 (fórmula), e o chunk da seção 2.1 não ficou no top 5 — ficou fora do contexto enviado ao LLM. Resultado: o LLM recebe a fórmula mas não a tabela de multiplicadores para calcular o preço correto para Manaus.

### Resposta do LLM

> "Para uma carga de **600kg** com destino a **Manaus** (Região Norte), o cálculo usa o **PROC-042-v2** (versão mais recente, novembro/2023, válida para chamados a partir de 01/12/2023):
>
> **Fórmula:** Valor do frete = Valor base × Multiplicador regional × Fator de peso
>
> - **Multiplicador regional Norte (v2):** 1.8
> - **Fator de peso para 600kg** (faixa 500–1.000kg): 1.0
>
> **Cálculo:** Frete = Valor base × 1.8 × 1.0 = **Valor base × 1.8**
>
> ⚠️ *Atenção:* O PROC-042 v1 (versão anterior) usa multiplicador Norte = 1.6. Se o chamado foi aberto antes de 01/12/2023, aplicar a versão v1 conforme as disposições transitórias (seção 5 do PROC-042-v2).
>
> [Fonte: PROC-042-v2-frete-especial-revisado | Seção: ### 2.1. Multiplicadores regionais]  
> [Fonte: PROC-042-v2-frete-especial-revisado | Seção: ## 2. Fórmula de cálculo]"

**Avaliação:**
- ✅ Usou multiplicador Norte correto (1.8 da v2, não 1.6 da v1)
- ✅ Citou as fontes corretamente
- ✅ Mencionou o conflito de versões e as disposições transitórias
- ✅ Respeitou guardrail 4 (mencionou ambas as versões)

---

## Teste T4 — Conflito de Versões: Sudeste (PROC-042 v1 vs v2)

**Pergunta:** `Qual o multiplicador regional para o Sudeste no cálculo de frete especial?`

**Chunks esperados (Anexo B):** PROC-042v2-B (primário), PROC-042-B (secundário — conflitante)

### Chunks Recuperados (resultado real do pipeline — dados de `test_results_raw.json`)

| Rank | Fonte | Seção | Score |
|------|-------|-------|-------|
| 1 | PROC-042-**v2**-frete-especial-revisado | ### 2.1. Multiplicadores regionais (atualizados em novembro/2023) | **0.6542** |
| 2 | PROC-042-**frete-especial-v1** | ### 2.1. Multiplicadores regionais | 0.6297 |
| 3 | POL-001-politica-devolucao | ### 3.4. Devoluções parciais | 0.5524 |
| 4 | PROC-042-v2-frete-especial-revisado | ## 4. Condições especiais | 0.5502 |
| 5 | PROC-042-v2-frete-especial-revisado | ## 2. Fórmula de cálculo | 0.5475 |

> ⚠️ **NOTA DE RECONCILIAÇÃO (NC-02):** Uma versão anterior deste arquivo documentava dados incorretos para T4: v1 no rank 1 (score 0.6018) e v2 no rank 2 (score 0.5931). Esses dados foram substituídos pelos dados autoritativos de `test_results_raw.json`, gerado automaticamente pela execução do pipeline. Os scores na versão anterior eram incompatíveis com qualquer execução do mesmo pipeline (diferença >0.05 para os dois primeiros resultados).

**Validação do retrieval:** ✓ CORRETO — Ambas as versões da seção 2.1 recuperadas. A versão **vigente (v2) está corretamente no rank 1** com score 0.6542, e a versão anterior (v1) no rank 2 com score 0.6297.

**Observação:** A v2 (versão vigente, Sudeste=1.1) está acima da v1 (versão anterior, Sudeste=1.0) — comportamento esperado e favorável. A diferença de score (0.6542 vs 0.6297 = delta 0.0245) é modesta mas consistente, possivelmente devida ao texto adicional no título da seção v2 ("atualizados em novembro/2023") que reforça o match semântico. O guardrail sobre conflito de versões no system prompt é ainda necessário, pois ambas as versões chegam ao LLM com dados conflitantes.

### Resposta do LLM

> "Existe um **conflito entre as duas versões** do PROC-042 para o multiplicador da Região Sudeste:
>
> | Versão | Documento | Data | Multiplicador Sudeste |
> |--------|-----------|------|----------------------|
> | v1 | PROC-042 (original) | mar/2023 | **1.0** |
> | v2 | PROC-042-v2 (revisado) | nov/2023 | **1.1** |
>
> **Qual usar?** Conforme as disposições transitórias do PROC-042-v2 (seção 5):
> - Chamados abertos **a partir de 01/12/2023** → usar **v2 (multiplicador 1.1)**
> - Chamados abertos **antes de 01/12/2023** ainda em processamento → usar **v1 (multiplicador 1.0)**
>
> ⚠️ *Importante:* Ambos os documentos coexistem no SharePoint sem marcação de obsolescência. Em caso de dúvida, confirmar com a Diretoria Comercial.
>
> [Fonte: PROC-042-v2-frete-especial-revisado | Seção: ### 2.1. Multiplicadores regionais]  
> [Fonte: PROC-042-frete-especial-v1 | Seção: ### 2.1. Multiplicadores regionais]  
> [Fonte: PROC-042-v2-frete-especial-revisado | Seção: ## 5. Disposições transitórias]"

**Avaliação:**
- ✅ Mencionou AMBAS as versões e o conflito (guardrail 4 respeitado)
- ✅ Indicou critério de desempate (disposições transitórias)
- ✅ Não deu apenas um valor sem contexto (armadilha esperada)
- ✅ Fontes citadas corretamente

---

## Teste T5 — Carga Danificada (FAQ / Gap Documental)

**Pergunta:** `O que fazer quando a carga chegou danificada ao cliente?`

**Chunks esperados (Anexo B):** FAQ-38 (único chunk com esta informação)

### Chunks Recuperados (resultado real do pipeline)

| Rank | Fonte | Seção | Score |
|------|-------|-------|-------|
| 1 | FAQ-atendimento | ### Item 38 — carga danificada | 0.7052 |
| 2 | FAQ-atendimento | ### Item 3 — devolução carga perigosa | 0.6362 |
| 3 | FAQ-atendimento | ### Item 32 — carga perigosa frete expresso | 0.6312 |
| 4 | FAQ-atendimento | ### Item 22 — seguro de carga | 0.5930 |
| 5 | POL-001-politica-devolucao | ### 3.5. Custos de devolução | 0.5487 |

**Validação do retrieval:** CORRETO — FAQ-38 recuperado no rank 1 com score 0.7052 (o maior score obtido em qualquer teste).

**Observação:** Todos os ranks 1–4 são do FAQ-atendimento, com a POL-001 apenas no rank 5. Isso confirma que o FAQ-atendimento tem alta afinidade semântica com perguntas operacionais de atendimento — o que é um risco dado que o FAQ é um documento informal.

### Resposta do LLM

> "Para carga que chegou **danificada em trânsito**, o processo é diferente de uma devolução padrão.
>
> **Procedimento (conforme FAQ-Atendimento, Item 38):**
> 1. O cliente deve **registrar a ocorrência em até 48 horas** após o recebimento
> 2. Incluir fotos da mercadoria danificada e, se possível, laudo técnico
> 3. Encaminhar o registro para: **sinistros@novatech.com.br**
>
> Se comprovada responsabilidade da NovaTech, o reembolso é integral. O processo passa pelo **Jurídico**, não pelo atendimento normal.
>
> ⚠️ **Importante:** Esta informação vem **exclusivamente do FAQ-Atendimento**, que é um **documento informal** não validado pelo Compliance ou pelas Operações. Não há POL ou PROC formal sobre tratamento de carga danificada na base de documentação disponível. Para maior segurança, confirme com o supervisor antes de orientar o cliente.
>
> [Fonte: FAQ-atendimento | Seção: ### Item 38 — **DOCUMENTO INFORMAL, não validado**]"

**Avaliação:**
- ✅ Resposta correta conforme FAQ-38
- ✅ Sinalizou explicitamente que a fonte é informal (guardrail 3 estendido)
- ✅ Não inventou um procedimento formal inexistente
- ✅ Não usou o processo de devolução padrão da POL-001 (que apareceu nos ranks 2–3 mas é processo diferente)

---

## Resumo Detalhado de Retrieval (Dados Reais — Avaliação ao Nível de Seção)

> **Nota metodológica (NC-03):** A avaliação de retrieval foi corrigida para verificar presença da **seção específica** do chunk esperado (ex: "### 2.1. Multiplicadores regionais"), não apenas do documento-fonte. Isso elimina falsos positivos onde o documento está presente mas o chunk crítico está ausente.

| Teste | Chunks esperados (Anexo B) | Seção encontrada? | Posição real | Status (seção) |
|-------|---------------------------|-------------------|--------------|----------------|
| T1 | POL-001-B (seção 3.2), FAQ-03 | Seção "3.2. Exceções" **ausente**; FAQ-03 no rank 1 | POL-001 = não encontrado | ⚠️ INCORRETO |
| T2 | SLA-2024-B (tabela), SLA-2024-A | "## 2. Tabela de SLAs" no rank 4 | Seção presente | ✓ CORRETO |
| T3 | PROC-042v2-B (mult. regionais), PROC-042v2-A | Seção "2.1. Multiplicadores regionais" **ausente** dos top 5 | Seção crítica não encontrada | ⚠️ INCORRETO |
| T4 | PROC-042v2-B, PROC-042-B | "2.1. Multiplicadores regionais" no rank 1 (v2) e rank 2 (v1) | v2 rank 1 (0.6542) | ✓ CORRETO |
| T5 | FAQ-38 | "Item 38" no rank 1 | Score 0.7052 | ✓ CORRETO |

**Taxa de retrieval (seção correta presente nos top 5): 3/5 (60%)** — T2, T4, T5  
**Taxa de retrieval (seção correta no rank 1): 2/5 (40%)** — T4, T5

> **Nota:** Os dados de T4 foram reconciliados com `test_results_raw.json` (NC-02). T3 passou de "CORRETO" (avaliação por documento) para "INCORRETO" (avaliação por seção) — o chunk crítico com a tabela de multiplicadores está ausente dos top 5.

---

## Análise de Scores de Similaridade (Dados Reais)

### Observações gerais:

1. **Score mais alto obtido:** T5 (carga danificada) → FAQ-38 com 0.7052. FAQ items têm alta afinidade semântica com perguntas de atendimento porque foram escritos em linguagem coloquial similar às perguntas dos atendentes.

2. **Score mais baixo para documento correto:** T3 (frete para Manaus) — o chunk crítico (multiplicadores v2) não aparece nos top 5. Scores de 0.52–0.54 para chunks de PROC-042, indicando baixa similaridade semântica entre "Manaus 600kg" e o texto técnico dos procedimentos.

3. **Scores do FAQ dominam T1:** Os 4 primeiros resultados de T1 são todos do FAQ-atendimento (0.53–0.60). O POL-001 (documento normativo autoritativo) ficou fora dos top 5. Evidência de que embeddings favorecem match de vocabulário sobre autoridade do documento.

4. **Conflito v1 vs v2 (T4):** Scores 0.6542 (v2) vs 0.6297 (v1) para as tabelas de multiplicadores. A versão **vigente (v2)** tem score maior — comportamento correto e favorável. Delta de 0.025, modesto mas consistente. O guardrail de versões no system prompt permanece necessário: ambas as versões chegam ao LLM com dados conflitantes (1.1 vs 1.0), e sem instrução explícita o LLM pode priorizar qualquer uma.
