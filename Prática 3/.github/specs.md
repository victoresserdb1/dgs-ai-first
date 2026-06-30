# Specs - Pratica 3 (Escopo Copilot-Only)

## Objetivo
Definir especificacoes executaveis somente para as atividades explicitamente marcadas com "Usando o GitHub Copilot" no cenario da Pratica 3.

## Escopo Incluido (somente Copilot explicito)
1. Exercicio 3.1 - Definir schema Zod de structured output com campos:
- answer
- source_document
- confidence_score

2. Exercicio 3.1 - Implementar src/services/response-validator.ts para:
- validar payload contra schema Zod
- aplicar guardrail 1: resposta sem source_document deve ser rejeitada
- aplicar guardrail 2: se houver mencao a carga perigosa + devolucao e a resposta afirmar possibilidade de devolucao, bloquear
- em qualquer falha, registrar motivo em log e retornar resposta padrao segura

3. Exercicio 3.2 - Reescrever src/functions/feedback/handler.ts conforme AGENTS.md (resumo do cenario):
- TypeScript strict mode
- validacao de input com Zod
- logging com pino (nunca console.log)
- nao logar dado pessoal (email/nome)
- imports estaticos no topo (nunca require dinamico)

## Escopo Excluido
- Revisao com Claude no Exercicio 3.1
- Revisao inicial humana e comparacao humano vs Claude no Exercicio 3.2
- Qualquer atividade nao marcada explicitamente com uso do GitHub Copilot

## Requisitos Funcionais

### RF-31-01 - Structured Output Schema
Deve existir schema Zod para formato fixo de resposta:
- answer: string nao vazia
- source_document: string nao vazia
- confidence_score: numero entre 0 e 1

### RF-31-02 - Validacao deterministica no response validator
O modulo src/services/response-validator.ts deve:
- validar schema antes de verificar conteudo
- rejeitar respostas invalidas de formato
- avaliar guardrails deterministicos apos schema valido
- devolver resposta padrao segura quando houver falha
- registrar em log motivo tecnico da rejeicao/bloqueio

### RF-31-03 - Guardrail de fonte obrigatoria
Resposta sem source_document valido deve:
- ser bloqueada
- nao seguir para resposta final ao usuario
- retornar fallback seguro

### RF-31-04 - Guardrail de carga perigosa + devolucao
Quando a resposta tratar devolucao de carga perigosa:
- deve conter negativa da devolucao no processo padrao
- se afirmar devolucao como possivel no processo padrao, bloquear
- retornar fallback seguro

### RF-32-01 - Reescrita segura do handler de feedback
O modulo src/functions/feedback/handler.ts reescrito deve:
- remover uso de as any sem validacao
- validar body com Zod
- usar logger pino
- nao logar attendantEmail ou outros dados pessoais
- usar import estatico para CosmosClient
- persistir feedback validado
- retornar codigos HTTP consistentes (sucesso/erro)

## Requisitos Nao Funcionais
- RNF-01: Conformidade com AGENTS.md (resumo do cenario)
- RNF-02: Rastreabilidade de falha por logs sem expor PII
- RNF-03: Comportamento deterministico de bloqueio (nao apenas aviso)
- RNF-04: Estrutura preparada para testes unitarios de validacao

## Criterios de Aceite (Copilot-Only)
1. Schema Zod implementado com os 3 campos exigidos e validacoes de tipo/faixa.
2. response-validator implementado com:
- validacao de schema
- bloqueio do guardrail de source_document ausente
- bloqueio do guardrail de afirmacao indevida para devolucao de carga perigosa
- fallback seguro em qualquer falha
- logging do motivo de bloqueio/rejeicao
3. feedback handler reescrito sem:
- as any nao validado
- console.log
- require dinamico
- log de email do atendente
4. feedback handler reescrito com:
- Zod para input
- pino para logs
- imports estaticos
- persistencia Cosmos com dado validado

## Mapeamento de Arquivos Alvo
- src/services/response-validator.ts
- src/functions/feedback/handler.ts

## Definicao de Pronto
- Todos os criterios de aceite acima atendidos.
- Nenhum item fora do escopo Copilot explicito foi adicionado.
