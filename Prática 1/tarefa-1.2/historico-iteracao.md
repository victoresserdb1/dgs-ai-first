User: # Role
Você é um tech lead sênior de IA responsável por prototipar e validar o system prompt de um assistente corporativo. Sua expertise é arquitetar contexto—definindo o que é estático, o que é dinâmico, e como a sequência das informações impacta a qualidade das respostas.

# Task
Executar pessoalmente todo o ciclo de prototipagem: arquitetar o system prompt v1, testá-lo contra cenários reais, analisar falhas, iterar para v2, re-testar e documentar decisões arquiteturais. O entregável final é um system prompt operacional pronto para integração + documentação completa das decisões de design.

# Context
A NovaTech é uma empresa de logística com 1.200 funcionários. Sua equipe de atendimento (45 pessoas) processa ~192 chamados/dia envolvendo consultas a documentação. Hoje gastam 12 minutos em média buscando respostas em três fontes fragmentadas: SharePoint (800 documentos), Confluence (400 páginas) e planilhas de rede. O assistente deve reduzir esse tempo para menos de 2 minutos por chamado, fornecendo respostas fundamentadas com indicação de fonte.

A documentação é atualizada mensalmente por três áreas diferentes sem processo unificado, gerando contradições que hoje são resolvidas informalmente. A integração será no ambiente Microsoft (Teams + SharePoint).

# Instructions

## Integrar Contexto dos Arquivos
Leia completamente os arquivos fornecidos:
- `specs.md`: requisitos, guardrails não-negociáveis, estrutura obrigatória do prompt, e três chunks de teste (POL-001, SLA-2024, PROC-042-v2)
- `tasks.md`: processo estruturado de prototipagem, mapeamento de contexto dinâmico vs estático, e três perguntas de teste específicas

Use essas informações para fundamentar todas as decisões arquiteturais que você tomar.

## Arquitetar o Contexto
Documente o **Context Mapping** completo: classifique cada elemento do prompt como **Estático** (identidade, regras, estrutura) ou **Dinâmico** (chunks de documentação, dados do cliente, histórico da conversa). Inclua estimativas realistas de tokens para cada categoria. Justifique a ordem de apresentação das seções—por que cada uma aparece nessa sequência e como isso afeta a qualidade das respostas.

## Prototipar o System Prompt v1
Crie o prompt com quatro seções obrigatórias:

1. **Identidade**: Define o papel do assistente como suporte ao cliente da NovaTech para atendentes.
2. **Regras**: Traduza os quatro guardrails não-negociáveis:
   - Sempre cite a fonte do documento consultado
   - Nunca invente informações (prazos, valores, condições não explicitamente documentadas)
   - Declare explicitamente quando a informação não está disponível e sugira escalada para supervisor
   - Responda em português formal mas acessível
3. **Formato de Resposta**: Estrutura objetiva, citação de fonte ao final, escalação quando aplicável.
4. **Instruções para Uso dos Chunks**: Detalhe como o assistente deve buscar, validar e citar informações dos chunks dinâmicos. Especifique explicitamente a ordem de prioridade (normativos como POL e PROC têm prioridade sobre SLA; todos têm prioridade sobre FAQ informal). Defina como tratar contradições entre documentos.

**Comportamento crítico**: Recuse responder qualquer coisa não explicitamente documentada. Se a informação não estiver nos documentos de referência, indique que não tem essa informação disponível. Nunca invente respostas.

## Testar com Cenários Reais
Aplique o prompt v1 aos três cenários de teste descritos em `tasks.md`:
- "Qual o prazo de devolução para carga perigosa?"
- "Meu cliente é Gold, qual o SLA de resolução?"
- "Quanto custa o frete para 600kg para Manaus?"

Para cada teste, apresente:
- A pergunta exata
- A resposta gerada pelo prompt v1
- Crítica detalhada: qualidade, coerência, acurácia e citação de fonte
- Identificação de erros ou desvios dos guardrails

Use os chunks fornecidos em `specs.md` (POL-001, SLA-2024, PROC-042-v2) como referência. Valide especificamente: carga perigosa não é elegível para devolução padrão; SLA Gold é 24h; frete para Manaus requer valor base + multiplicador 1.8 da região Norte (sem inventar totais).

## Analisar Falhas e Iterar para v2
Baseado nos testes, identifique:
- Quais respostas falharam ou se desviaram dos guardrails
- Quais mudanças no prompt v1 corrigiriam essas falhas
- Quais trade-offs existem entre as mudanças

Documente as alterações feitas e gere o **System Prompt v2**.

## Re-testar e Comparar
Execute os três mesmos cenários com o prompt v2. Compare resultados:
- Quais problemas foram corrigidos?
- Houve regressões?
- O prompt v2 está pronto para operação?

Documente a comparação v1 vs v2.

## Documentar Decisões Arquiteturais
Explique:
- Por que cada seção do prompt aparece nessa ordem
- Como o mapeamento estático vs dinâmico de contexto foi estruturado
- Por que a ordem de prioridade de fontes foi escolhida
- Como o prompt trata contradições entre documentos

## Critérios de Sucesso
- O prompt v2 é operacional e pronto para integração
- Decisões arquiteturais sobre estrutura de contexto estão documentadas e justificadas
- Testes com os três cenários demonstram respostas rápidas, precisas e com citação de fonte
- O prompt trata contradições de documentos de forma clara
- A solução reflete as restrições reais (atualização mensal desorganizada, três áreas diferentes, ambiente Microsoft)
- O assistente recusa inventar informações e escala para humanos quando apropriado

GitHub Copilot: Read [](file:///d%3A/dgs-ai-first/Pr%C3%A1tica%201/anexo-a-documentacao-simulada-novatech.md#1-1), lines 1 to 80

Read [](file:///d%3A/dgs-ai-first/Pr%C3%A1tica%201/anexo-b-chunks-referencia-rag.md#1-1), lines 1 to 80

Created 5 todos

Created [](file:///d%3A/dgs-ai-first/Pr%C3%A1tica%201/tarefa-1.2/entregavel-tarefa-1.2.md)

Completed: *Criar System Prompt v1 + Context Mapping* (1/5)

Entregável criado em [Prática 1/tarefa-1.2/entregavel-tarefa-1.2.md](Prática 1/tarefa-1.2/entregavel-tarefa-1.2.md).

---

Claude:
## Resumo do que foi produzido

### Decisão arquitetural central: Estático vs. Dinâmico

| Camada | Tokens | Estratégia |
|--------|--------|-----------|
| Estático (identidade + regras + formato + instruções de chunks) | ~580 | Compilado uma vez, reutilizado em toda query |
| Dinâmico (chunks + dados do cliente + histórico + pergunta) | ~770 | Montado pelo pipeline por requisição |

### A única falha crítica: Pergunta 1 (carga perigosa)

O **System Prompt v1** seguia a ordem linear do chunk — apresentava a regra geral de 7 dias úteis primeiro e mencionava a exceção depois, com linguagem condicional ("verifique se se enquadra"). Para um atendente lendo rapidamente, isso criava risco real de comunicar "7 dias" ao cliente errado.

**Causa raiz:** As instruções de uso dos chunks não diziam explicitamente que exceções documentadas devem aparecer no primeiro parágrafo da resposta.

**Correção no v2:** Três mudanças pontuais — (1) parágrafo explícito "exceções têm prioridade sobre regras gerais", (2) exemplo negativo concreto na Regra 2, (3) Etapa 1 do formato de resposta como verificação obrigatória de exceções antes de formular qualquer resposta.

### Perguntas 2 e 3: sem falhas de prompt

A imprecisão em P2 ("24h" sem "úteis") é uma limitação do chunk de teste, não do system prompt — deve ser corrigida na etapa de extração/chunking do pipeline. P3 funcionou corretamente em ambas as rodadas: multiplicador Norte 1.8 aplicado, valor base não inventado.

Made changes.