# Matriz de Rastreabilidade — Prática 1
## Tarefas 1.1, 1.2 e 1.3

**Fonte dos requisitos:** `exercicio-fase-1-entendimento.md` (seções "Exercício 1.1", "Exercício 1.2", "Exercício 1.3")  
**Artefatos analisados:** `tarefa-1.1/specs.md`, `tarefa-1.1/tasks.md`, `tarefa-1.2/specs.md`, `tarefa-1.2/tasks.md`, `tarefa-1.3/specs.md`, `tarefa-1.3/tasks.md`  
**Data de análise:** 2026-06-04

---

## Legenda de Status

| Status | Critério |
|--------|----------|
| **Coberto** | O requisito está completamente endereçado em specs.md (seção existe, parâmetros corretos) **e** em tasks.md (task explícita com checklist verificável). |
| **Parcialmente Coberto** | O requisito aparece em pelo menos um dos artefatos (specs ou tasks), mas o outro não o cobre de forma explícita — ou o cobre de forma implícita/incompleta. |
| **Não Coberto** | O requisito não aparece nem em specs.md nem em tasks.md. |

---

## Seção 1.1 — Análise de Viabilidade Técnica com Fundamentos de LLM e Engenharia de Contexto

| ID | Requisito (do exercício original) | Seção em `specs.md` | Task(s) em `tasks.md` | Edge Cases / Cenários Mencionados | Cobertura |
|----|----------------------------------|---------------------|-----------------------|-----------------------------------|-----------|
| REQ-1.1.1 | Análise por tipo de fonte para **4 tipos** (PDFs com tabelas complexas; PDFs escaneados; Wiki Confluence com links internos e macros; Planilhas com fórmulas interdependentes), cobrindo 3 pontos por tipo: (a) desafio para o pipeline de RAG, (b) impacto na qualidade das respostas, (c) estratégia de tratamento. | **Item 1 — Análise por tipo de fonte** — lista exatamente os 4 tipos e exige os 3 pontos para cada um. | **T2** — checklist inclui os 4 tipos com os 3 pontos explicitamente; **T3** — verifica, para cada tipo, se todos os 3 pontos estão presentes antes de prosseguir para T4. | PDFs com fluxogramas embutidos como imagens (mencionado no contexto do specs, mas não listado como 5º tipo separado — corretamente tratado como sub-caso de PDFs); documentos escaneados com qualidade de OCR variável (contraste, rotação, resolução). | **Coberto** |
| REQ-1.1.2 | Estimativa do tamanho da base em tokens com **parâmetros exatos**: 800 PDFs × 10 páginas, 400 páginas wiki × 1.500 palavras, 50 planilhas (estimativa justificada); regra de conversão 0,75 palavras/token; incluir referência de quantas páginas de texto equivalem a ~500 tokens (para calibrar chunking). | **Item 2 — Estimativa de tamanho da base em tokens** — tabela com os parâmetros exatos, regra de conversão obrigatória e 4 sub-requisitos incluindo o item de calibração "~500 tokens = X páginas". | **T2** — solicita estimativa com os parâmetros exatos; **T3** — verifica os parâmetros gerais, **mas não tem checklist explícita para o sub-item "páginas equivalentes a ~500 tokens"**. | Planilhas Excel com fórmulas: volume de texto extraível pode diferir muito do volume visual da planilha (células com fórmulas vs. valores calculados); variação de densidade de texto entre páginas de PDFs distintos. | ⚠️ **Parcialmente Coberto** — `specs.md` cobre o sub-requisito de calibração (~500 tokens = X páginas) na seção Item 2. `tasks.md` (T3) verifica apenas os parâmetros de volume (800/400/50 e regra 0,75), sem checklist explícita para o item de calibração. **Lacuna:** T3 deveria incluir: "Confirmar que a análise inclui referência de quantas páginas de texto equivalem a ~500 tokens." |
| REQ-1.1.3 | Análise de orçamento de contexto com **parâmetros exatos**: modelo GPT-4o, janela 128K tokens, ~2K tokens para system prompt + instruções, chunk de referência ~500 tokens. Deve responder: (a) quantos chunks de 500 tokens cabem por query, (b) como esse limite afeta chunking e retrieval, (c) o que acontece se o contexto ultrapassar o orçamento. | **Item 3 — Análise de orçamento de contexto** — parâmetros exatos na tabela de escopo, 3 perguntas obrigatórias a responder. Critério explícito: contexto **não** pode ser tratado como ilimitado. | **T2** — lista os parâmetros exatos (128K, 2K, 500 tokens); **T3** — verifica que os parâmetros são usados e que a análise não trata contexto como ilimitado. | Histórico de conversa de múltiplos turns competindo com chunks por espaço no contexto; system prompt crescendo progressivamente com adição de guardrails e exemplos (few-shot). | **Coberto** |
| REQ-1.1.4 | Recomendação de **estratégia de chunking** concreta, justificada por: (a) tipo de pergunta do atendente (prazos, regras de frete, SLAs, procedimentos de devolução); (b) efeito *lost in the middle*; especificando: tamanho do chunk, critério de divisão, e como lidar com tabelas e listas que não podem ser cortadas. | **Item 4 — Recomendação de estratégia de chunking** — 3 sub-requisitos explícitos (tipo de pergunta, *lost in the middle*, especificação concreta com tamanho + critério + tratamento de tabelas/listas). | **T2** — solicita a recomendação com critério de justificativa; **T3** — verifica que a estratégia menciona explicitamente o efeito *lost in the middle*. | Tabelas de frete com 15+ colunas: o conteúdo perde sentido se a linha de cabeçalho e as linhas de dados ficam em chunks separados; listas de procedimentos numerados (passo-a-passo) que perdem coerência se fragmentadas no meio. | **Coberto** |
| REQ-1.1.5 | **Iteração com Claude**: (a) fornecer o rascunho ao Claude e solicitar revisão crítica identificando pontos fracos, estimativas otimistas e riscos não considerados; (b) incorporar o feedback na versão final; (c) manter ambas as versões (v1 e v2) e o histórico de alterações. | **Processo de Iteração com Claude** — Rodada 1 (geração inicial) e Rodada 2 (revisão crítica) descritas com procedimento explícito. | **T1** (preparar prompt inicial) → **T2** (gerar v1) → **T4** (revisão crítica do Claude) → **T5** (incorporar feedback e gerar v2) → **T6** (documentar histórico de iteração). | Feedback do Claude pode contradizer parcialmente a análise original, exigindo decisão documentada de incorporar ou refutar; pontos levantados pelo Claude podem estar fora do escopo definido nas specs. | **Coberto** |
| REQ-1.1.6 | **Entregável** composto por: análise técnica final (v2 iterada); rascunho inicial (v1 pré-revisão); feedback recebido do Claude na Rodada 2; registro das alterações incorporadas. | **Entregável** — lista 4 itens na ordem exata correspondente ao exercício. | **T7** — checklist com 5 itens: confirma presença de todos os componentes do entregável e verifica cobertura dos 4 itens das specs e 5 critérios de avaliação. | Divergência não documentada entre v1 e v2 (melhoria não verificável); ausência de rascunho v1 dificultando comprovação de que a iteração melhorou o documento. | **Coberto** |

### Critérios de Avaliação — Tarefa 1.1

| ID | Critério (do exercício original) | Seção em `specs.md` | Task(s) em `tasks.md` | Cobertura |
|----|----------------------------------|---------------------|-----------------------|-----------|
| CRIT-1.1.A | Diferentes tipos de conteúdo exigem diferentes estratégias (não trata tudo como texto plano). | Critério 1 em "Critérios de Avaliação"; reforçado no Item 1. | T3 (checklist verifica cobertura diferenciada por tipo). | **Coberto** |
| CRIT-1.1.B | Estimativa de tokens é razoável e inclui o raciocínio (não apenas um número). | Critério 2 em "Critérios de Avaliação"; Item 2 exige raciocínio explícito. | T2 (solicita raciocínio) + T3 (verifica raciocínio vs. parâmetros). | **Coberto** |
| CRIT-1.1.C | Orçamento de contexto tratado como recurso limitado — análise não trata contexto como ilimitado. | Critério 3 em "Critérios de Avaliação"; Item 3 exige resposta às 3 perguntas. | T3 (checklist verifica essa premissa explicitamente). | **Coberto** |
| CRIT-1.1.D | Chunking justificado por tipo de pergunta e pelo efeito *lost in the middle*. | Critério 4; Item 4 especifica ambos os fundamentos. | T3 (verifica menção explícita ao *lost in the middle*). | **Coberto** |
| CRIT-1.1.E | Iteração com Claude melhorou o documento de forma verificável — deve ser possível comparar v1 e v2. | Critério 5; Processo de Iteração exige ambas as versões. | T6 (documenta mudanças concretas entre v1 e v2) + T7 (valida comparabilidade). | **Coberto** |

---

## Seção 1.2 — Prototipação de Prompt com Engenharia de Contexto

| ID | Requisito (do exercício original) | Seção em `specs.md` | Task(s) em `tasks.md` | Edge Cases / Cenários Mencionados | Cobertura |
|----|----------------------------------|---------------------|-----------------------|-----------------------------------|-----------|
| REQ-1.2.1 | **System prompt v1** estruturado em 4 seções obrigatórias: (1) Identidade — quem é o assistente, contexto NovaTech, público (atendentes); (2) Regras — os 4 guardrails traduzidos em instruções diretas; (3) Formato de resposta — estrutura esperada; (4) Instruções para uso dos chunks — como usar, o que fazer em conflito, **ordem de prioridade explícita** entre fontes. | **Parte 1 — System Prompt v1** — lista as 4 seções com seus conteúdos obrigatórios; exige ordem de prioridade explícita com justificativa (PROC-042 v1 vs v2; FAQ informal vs documentos normativos). | **T1** — 4 sub-itens correspondentes às 4 seções, incluindo tradução dos 4 guardrails em instruções ao modelo e definição de prioridade: documentos normativos POL/PROC/SLA > FAQ informal. | Conflito entre PROC-042 v1 e PROC-042 v2 (versões com multiplicadores diferentes); FAQ-Atendimento sem validação de Compliance sendo tratado como fonte autoritativa; chunk ausente (nenhum dos 3 chunks responde a pergunta). | **Coberto** |
| REQ-1.2.2 | **Mapeamento de contexto estático/dinâmico**: para cada elemento do prompt (identidade, regras, formato, instruções de chunks, chunks recuperados, dados do cliente, histórico da conversa, pergunta do atendente) — classificar como estático ou dinâmico e estimar tamanho em tokens. | **Parte 2 — Mapeamento de Contexto Estático/Dinâmico** — tabela com os 8 elementos exatos, 3 colunas (elemento, tipo, tokens). | **T2** — 4 sub-itens: listar elementos, classificar, estimar tokens (usando regra 0,75 p/token), calcular total estático e espaço remanescente para dinâmicos. | Histórico de conversa com crescimento por turn (janela de tokens esgota progressivamente); dados do cliente com volume variável por tier (Gold vs Standard podem ter histórico diferente). | **Coberto** |
| REQ-1.2.3 | **Testes Rodada 1** no Claude: nova conversa, colar system prompt v1 + chunks A, B e C como contexto; fazer as **3 perguntas na sequência exata**: P1 — "Qual o prazo de devolução para carga perigosa?"; P2 — "Meu cliente é Gold, qual o SLA de resolução?"; P3 — "Quanto custa o frete para 600kg para Manaus?". | **Parte 3 — Testes no Claude (Rodada 1)** — procedimento obrigatório de 4 passos; as 3 perguntas estão explicitadas com texto exato. | **T3** (abrir nova conversa, formatar input com chunks posicionados conforme system prompt) + **T4** (executar as 3 perguntas na ordem, copiar resposta completa de cada uma). | Claude interpreta "carga perigosa" como caso padrão e responde "7 dias úteis" sem mencionar a exceção — falha crítica esperada na Rodada 1; Claude calcula valor de frete inventando o valor base não fornecido (hallucination). | **Coberto** |
| REQ-1.2.4 | **Análise crítica das respostas da Rodada 1**: para cada resposta — (a) está correta contra a fonte de verdade (Anexo A)? (b) citou a fonte (Guardrail 1)? (c) respeitou os 4 guardrails? (d) onde errou ou foi impreciso? — com **atenção especial** à P1 (carga perigosa NÃO é elegível — resposta "7 dias úteis" é falha crítica) e P3 (valor base ausente → não pode calcular valor final). | **Parte 4 — Análise Crítica das Respostas (Rodada 1)** — 4 pontos por resposta; seções "Atenção especial" para P1 e P3 explicitam o que constitui falha crítica. | **T5** — análise detalhada por pergunta: P1 com 4 verificações (exceção carga perigosa, citação fonte POL-001 seção 3.2, ramal 4500, guardrail não inventar); P2 com 3 verificações; P3 com 4 verificações (multiplicador Norte 1.8, valor base necessário, citação PROC-042-v2, não inventar valor final). | Resposta parcialmente correta na P1: menciona exceção mas dá prazo incorreto; citação de fonte com referência genérica ao documento sem mencionar seção; P3 com assistente apresentando fórmula sem o valor base como passo intermediário aceitável vs. hallucination de valor final. | **Coberto** |
| REQ-1.2.5 | **Iteração do system prompt**: reescrever seções que geraram falhas (documentando o que mudou e por quê), gerar system prompt v2; testar novamente com as mesmas 3 perguntas em **nova conversa** (Rodada 2); comparar respostas R1 vs R2. | **Parte 5 — System Prompt v2** (reescrita com registro de alterações) + **Parte 6 — Testes no Claude (Rodada 2)** (nova conversa, mesmas 3 perguntas, documentação de melhorias). | **T6** (identificar seções problemáticas, reescrever, registrar: o que mudou + por quê + qual falha da R1 motivou) + **T7** (nova conversa, mesmo processo da R1) + **T8** (comparação lado a lado R1 vs R2, falhas corrigidas, regressões surgidas). | Regressão: correção da P1 introduz ambiguidade nova na P2 ou P3; melhoria não verificável se R1 não foi documentada com as respostas originais completas. | **Coberto** |
| REQ-1.2.6 | **Entregável** contendo, na ordem: system prompt v1 com mapeamento estático/dinâmico; respostas da Rodada 1 (cópias reais do Claude, não parafraseadas); análise crítica; system prompt v2 com registro de alterações; respostas da Rodada 2; comparação entre R1 e R2. | **Entregável** — 6 itens na ordem exata, correspondendo ao exercício. | **T9** — 3 verificações finais: estrutura completa na ordem correta; respostas como cópias reais (não resumidas); análise da P1 menciona explicitamente a exceção de carga perigosa. | Respostas resumidas ou parafraseadas em vez de copiadas do Claude (inviabiliza comprovação de uso do Claude como ambiente real de teste). | **Coberto** |

### Guardrails — Rastreabilidade Específica (Tarefa 1.2)

Os 4 guardrails definidos pelo Product Specialist são requisitos não-negociáveis que devem aparecer na seção "Regras" do system prompt e ser verificados na análise crítica.

| Guardrail | Definição (exercício original) | Cobertura em `specs.md` | Cobertura em `tasks.md` | Status |
|-----------|-------------------------------|--------------------------|--------------------------|--------|
| G1 | O assistente deve sempre citar a fonte do documento utilizado. | Parte 1 (seção Regras) + Parte 4 (verificação "Citou a fonte?") | T1 (regra explícita no system prompt) + T5 (verificação em cada pergunta) | **Coberto** |
| G2 | O assistente nunca deve inventar prazos ou valores que não estejam explícitos na documentação. | Parte 1 (seção Regras) + Parte 4 (verificação de hallucination) | T1 + T5 (verificação explícita em P3: não inventar valor final sem valor base) | **Coberto** |
| G3 | Quando não encontrar resposta, dizer explicitamente e sugerir escalar para o supervisor. | Parte 1 (seção Regras) + Parte 3 (instruções para uso dos chunks: o que fazer quando não há resposta) | T1 (regra explícita) + T5 (verificação implícita no contexto da análise de falhas) | **Coberto** |
| G4 | Responder em português formal, mas acessível. | Parte 1 (seção Regras) + Parte 4 (verificação de formato) | T1 (regra explícita) + T5 (verificação em P2: "a resposta é em português formal?") | **Coberto** |

### Critérios de Avaliação — Tarefa 1.2

| ID | Critério (do exercício original) | Seção em `specs.md` | Task(s) em `tasks.md` | Cobertura |
|----|----------------------------------|---------------------|-----------------------|-----------|
| CRIT-1.2.A | System prompt é específico ao domínio NovaTech — não é genérico. | Critério 1; Parte 1 exige seção Identidade com contexto NovaTech/atendimento. | T1 (identidade com contexto específico). | **Coberto** |
| CRIT-1.2.B | Mapeamento estático/dinâmico demonstra compreensão real de engenharia de contexto. | Critério 2; Parte 2 exige classificação e estimativa de tokens por elemento. | T2 (classificação + cálculo de espaço remanescente). | **Coberto** |
| CRIT-1.2.C | Análise de falhas demonstra pensamento crítico — especialmente P1 (carga perigosa NÃO pode devolver). | Critério 3; Parte 4 tem seção "Atenção especial à Pergunta 1" explicitando o critério de falha crítica. | T5 (verificação explícita: "resposta correta NÃO é 7 dias úteis"). | **Coberto** |
| CRIT-1.2.D | Iteração mostra melhoria concreta e verificável entre v1 e v2. | Critério 4; Partes 5 e 6 exigem documentação de alterações e comparação. | T6 (registro de alterações) + T8 (comparação lado a lado). | **Coberto** |
| CRIT-1.2.E | Participante demonstra uso do Claude como ambiente de teste real (respostas copiadas, não inventadas). | Critério 5; Partes 3 e 6 exigem respostas copiadas diretamente. | T4/T7 (instrução: "copiar a resposta completa do Claude") + T9 (verificação: "respostas são cópias reais"). | **Coberto** |

---

## Seção 1.3 — Construção de Pipeline de RAG com Ferramentas Open-Source

| ID | Requisito (do exercício original) | Seção em `specs.md` | Task(s) em `tasks.md` | Edge Cases / Cenários Mencionados | Cobertura |
|----|----------------------------------|---------------------|-----------------------|-----------------------------------|-----------|
| REQ-1.3.1 | **Módulo de ingestão** (`ingest.py` ou equivalente): ler os 5 arquivos `.md` da NovaTech; dividir em chunks com **estratégia definida e justificada** (tamanho, critério de divisão, tratamento de tabelas e listas); gerar embeddings com `sentence-transformers` modelo `all-MiniLM-L6-v2`; armazenar no ChromaDB com metadados mínimos (nome do documento fonte, identificador de seção); executável de forma isolada (`python ingest.py`). | **Módulo 1 — Ingestão** — lista todos os requisitos com exatidão, incluindo os metadados mínimos e o critério de executabilidade isolada. | **T1** (setup do ambiente, instalação de dependências, verificação dos 5 arquivos) + **T2** (definir e documentar estratégia de chunking *antes* de codificar, 5 sub-itens) + **T3** (implementação com 6 sub-itens incluindo metadados, execução isolada e contagem de chunks por documento). | Ambas versões da PROC-042 (v1 e v2) ingeridas sem distinção de versão nos metadados (chunks conflitantes sem marcação de prioridade); tabelas de SLA e frete cortadas ao meio pelo chunking fixo; planilhas Excel convertidas para `.md` com perda de estrutura de fórmulas. | **Coberto** |
| REQ-1.3.2 | **Módulo de busca** (`search.py` ou equivalente): receber pergunta como parâmetro; gerar embedding com o mesmo modelo da ingestão; buscar os **N chunks mais similares** no ChromaDB (N configurável); retornar lista com texto do chunk, nome do documento fonte e score de similaridade. | **Módulo 2 — Busca** — todos os requisitos listados com especificação de que N deve ser parâmetro configurável. | **T4** — 5 sub-itens: receber pergunta + N, gerar embedding com `all-MiniLM-L6-v2`, executar busca por similaridade, retornar estrutura com os 3 campos (texto, fonte, score), teste manual com uma pergunta. | N muito grande levando a contexto que excede o orçamento na montagem de prompt; empate de score entre chunks de PROC-042-v1 e PROC-042-v2 para a mesma pergunta (sem critério de desempate por versão). | **Coberto** |
| REQ-1.3.3 | **Módulo de montagem de prompt** (`assemble_prompt.py` ou equivalente): receber chunks com metadados e a pergunta do atendente; montar prompt na estrutura: system prompt + chunks formatados com identificação de fonte + pergunta; retornar como string. O system prompt deve ser o desenvolvido na Tarefa 1.2 (ou versão compatível). | **Módulo 3 — Montagem de Prompt** — todos os requisitos listados; vinculação explícita ao system prompt da Tarefa 1.2. | **T5** — 5 sub-itens: definir system prompt (referência ao da T1.2), implementar função de montagem, formatar chunks com identificação de fonte, retornar como string, teste com chunks simulados. | Chunks concatenados excedendo o orçamento de contexto (128K) — módulo não verifica o total de tokens antes de montar; formatação inconsistente da identificação de fonte entre chunk A, B e C. | **Coberto** |
| REQ-1.3.4 | **Testes de validação** com **≥ 5 perguntas** do mapa de cobertura do Anexo B, distribuídas por documentos diferentes; para cada pergunta documentar: pergunta, chunks recuperados, chunks esperados (gabarito Anexo B), avaliação (Sim/Parcialmente/Não + justificativa), score de similaridade, prompt montado, resposta do LLM (colada do Claude), avaliação da resposta (correto? citou fonte? respeitou guardrails?). | **Testes de Validação** — tabela com 8 campos obrigatórios + sub-seção "Avaliação da resposta do LLM" com 3 perguntas de avaliação. Critério de distribuição: não todas do mesmo documento. | **T6** (selecionar 5 perguntas com sugestão de distribuição: POL-001, SLA-2024, PROC-042, conflito v1 vs v2, FAQ) + **T7** (executar testes registrando todos os 8 campos + avaliar resposta do Claude). | Pergunta sobre conflito de versão PROC-042 v1 vs v2 (gabarito indica v2, mas v1 pode ter score mais alto); pergunta que deveria acionar o FAQ (documento informal sem validação de Compliance); pergunta cujos chunks corretos têm score de similaridade muito próximo de chunks irrelevantes. | **Coberto** |
| REQ-1.3.5 | **Identificar ≥ 2 problemas reais** (não hipotéticos) encontrados durante os testes, com: (1) descrição do que aconteceu; (2) causa provável; (3) proposta de correção concreta e implementável. | **Identificação de Problemas e Propostas de Correção** — lista de exemplos de problemas válidos; exige 3 pontos por problema; distingue "problemas reais encontrados" de "hipotéticos". | **T8** — 2 sub-tarefas: listar ≥2 problemas reais (não hipotéticos); para cada um, documentar os 3 pontos (descrição, causa provável, proposta concreta). | Falso positivo de problema: retrieval retorna chunk correto mas avaliação do participante está equivocada (não corresponde ao gabarito); proposta de correção que exige reescrever o módulo de ingestão inteiro (deve ser específica e implementável). | **Coberto** |
| REQ-1.3.6 | **Evidência do uso do GitHub Copilot** na implementação dos três módulos. | Critério de Avaliação #6 + **Entregável item 2** ("Evidência do uso do GitHub Copilot na implementação"). | **T3/T4/T5** — cada task instrui "Usar o GitHub Copilot durante a implementação. Registrar onde o Copilot foi usado." + **T9** — consolidar evidência em `COPILOT-LOG.md` ou comentários no código, com ≥1 exemplo por módulo. | Evidência insuficiente: menção genérica "usei o Copilot" sem descrever o que foi sugerido ou aceito (não comprova uso real). | **Coberto** |
| REQ-1.3.7 | Demonstrar compreensão de que **RAG é um sistema de engenharia de dados**: qualidade do retrieval depende da ingestão e do chunking, não apenas da chamada ao LLM. | Critério de Avaliação #5 — "O participante demonstra que entende RAG como sistema de engenharia de dados: a qualidade do retrieval depende da qualidade da ingestão e do chunking, não apenas da chamada ao LLM." Não há seção de entregável dedicada a isso. | **Implícito em T2** (justificativa de chunking como determinante da qualidade do retrieval) e **T8** (análise de problemas relacionados a ingestão/chunking, não apenas ao LLM). **Não há task explícita** solicitando documentação dessa compreensão conceitual. | Análise de problemas (T8) focada exclusivamente no comportamento do LLM, sem mencionar ingestão ou chunking como causa raiz (comprometeria a demonstração do critério). | ⚠️ **Parcialmente Coberto** — `specs.md` define como critério de avaliação (Critério #5), mas não há seção de entregável dedicada. `tasks.md` não tem task explícita para demonstrar essa compreensão. A cobertura é implícita via T2 e T8. **Lacuna:** tasks.md deveria ter em T8 ou T10 um item explícito como: "Verificar que a análise de problemas conecta falhas de retrieval a causas na ingestão/chunking, não apenas ao LLM." |

### Critérios de Avaliação — Tarefa 1.3

| ID | Critério (do exercício original) | Seção em `specs.md` | Task(s) em `tasks.md` | Cobertura |
|----|----------------------------------|---------------------|-----------------------|-----------|
| CRIT-1.3.A | Pipeline funcional: os 3 módulos executam sem erros e retornam resultados. | Critério 1 ("funcional: não precisa ser perfeito, mas precisa rodar"). | T3/T4/T5 (cada módulo tem sub-item de teste de execução) + T10 (confirma que os 3 scripts executam sem erros). | **Coberto** |
| CRIT-1.3.B | Estratégia de chunking é justificada — não pode ser "512 tokens fixos" sem motivo. | Critério 2; Módulo 1 exige justificativa com 3 sub-pontos. | T2 (documentar estratégia *antes* de codificar, com 5 sub-itens de justificativa). | **Coberto** |
| CRIT-1.3.C | Testes usam perguntas realistas do domínio e são comparados com o gabarito do Anexo B. | Critério 3; Testes de Validação exigem uso do mapa de cobertura do Anexo B como gabarito. | T6 (selecionar do Anexo B) + T7 (comparar com gabarito). | **Coberto** |
| CRIT-1.3.D | Problemas identificados são reais (não hipotéticos) e propostas são concretas. | Critério 4; Identificação de Problemas distingue "real" de "hipotético" explicitamente. | T8 (instrução: "2 problemas reais encontrados durante os testes da T7 — não hipotéticos"). | **Coberto** |
| CRIT-1.3.E | RAG entendido como sistema de engenharia de dados (qualidade depende de ingestão + chunking). | Critério 5 (mencionado apenas como critério, sem seção de entregável dedicada). | T2 (justificativa de chunking) + T8 (item explícito adicionado: verifica causa raiz na ingestão/chunking) + T10 (verificação final explícita adicionada). | **Coberto** |
| CRIT-1.3.F | Evidência do uso do GitHub Copilot. | Critério 6 + Entregável item 2. | T3/T4/T5 (instruções durante implementação) + T9 (consolidação da evidência) + T10 (verificação final). | **Coberto** |

---

## Sumário de Lacunas Identificadas

### Lacuna L1 — REQ-1.1.2: Sub-requisito de calibração de tokens ausente em `tasks.md` — **CORRIGIDA**

| Atributo | Detalhe |
|----------|---------|
| **Localização** | `tarefa-1.1/tasks.md` — Task T3 |
| **Requisito afetado** | REQ-1.1.2: “Incluir referência de quantas páginas de texto equivalem a ~500 tokens (para calibrar a estratégia de chunking)” |
| **Correção aplicada** | Adicionado item explícito em T3: `“Confirmar que a análise inclui referência explícita de quantas páginas de texto equivalem a ~500 tokens (calibração da estratégia de chunking).”` |
| **Severidade original** | Baixa |

---

### Lacuna L2 — REQ-1.3.7 / CRIT-1.3.E: Compreensão de RAG como engenharia de dados sem task explícita em `tasks.md`

| Atributo | Detalhe |
|----------|---------|
| **Localização** | `tarefa-1.3/tasks.md` |
| **Requisito afetado** | REQ-1.3.7 / CRIT-1.3.E: "O participante demonstra que entende RAG como sistema de engenharia de dados: a qualidade do retrieval depende da qualidade da ingestão e do chunking, não apenas da chamada ao LLM." |
| **O que existe** | `specs.md` declara como Critério de Avaliação #5. `tasks.md` cobre implicitamente via T2 (justificativa de chunking) e T8 (análise de problemas de ingestão/retrieval). Não há task explícita nem checklist de verificação. |
| **O que falta** | Um item em T8 ou T10 como: `"Verificar que a análise de ≥1 problema conecta a causa raiz à qualidade da ingestão ou do chunking (não apenas ao comportamento do LLM)."` |
| **Severidade** | Média — é um critério de avaliação que pode ser subavaliado se a análise de T8 se concentrar apenas nos erros do LLM. Sem checklist explícita, o avaliador pode divergir do participante sobre se o critério foi demonstrado. |

---

## Visão Consolidada de Cobertura

| Tarefa | Total de Requisitos | Cobertos | Parcialmente Cobertos | Não Cobertos |
|--------|--------------------:|:--------:|:---------------------:|:------------:|
| 1.1 | 6 requisitos + 5 critérios = **11** | 11 | 0 | 0 |
| 1.2 | 6 requisitos + 4 guardrails + 5 critérios = **15** | 15 | 0 | 0 |
| 1.3 | 7 requisitos + 6 critérios = **13** | 13 | 0 | 0 |
| **Total** | **39** | **39** | **0** | **0** |

> **Nota:** As lacunas L1 e L2 foram corrigidas em 2026-06-04 com adição de itens explícitos de verificação em `tarefa-1.1/tasks.md` (T3) e `tarefa-1.3/tasks.md` (T8 e T10).

---

## Observações Finais

1. **Cobertura global é alta.** Nenhum requisito explícito do exercício original ficou completamente descoberto. As lacunas identificadas (L1 e L2) são de granularidade baixa (sub-requisito e critério de avaliação) e não comprometem a entrega.

2. **Consistência entre specs e tasks é elevada.** Os parâmetros numéricos críticos (128K tokens, 2K system prompt, 500 tokens/chunk, 0,75 palavras/token, N configurável) aparecem de forma idêntica nos dois artefatos para todas as tarefas.

3. **As lacunas L1 e L2 foram corrigidas.** Os itens de verificação explícitos foram adicionados diretamente nos arquivos `tasks.md` afetados, fechando os dois gaps de rastreabilidade identificados.

4. **A rastreabilidade exercício → specs → tasks está completa** para os 4 guardrails da Tarefa 1.2, para os 3 módulos de código da Tarefa 1.3, e para os 4 tipos de fonte da Tarefa 1.1.
