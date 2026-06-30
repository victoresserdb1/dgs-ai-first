# Tasks - Pratica 3 (Escopo Copilot-Only)

## Regra de Escopo
Este plano contem apenas tarefas explicitamente marcadas com uso do GitHub Copilot no cenario da Pratica 3.

## Tarefas

### T-31-01 - Criar schema Zod de structured output
- Origem: Exercicio 3.1, item 1 (Copilot)
- Arquivo alvo principal: src/services/response-validator.ts
- Dependencias: nenhuma

Passos:
1. Definir ResponseSchema com campos answer, source_document, confidence_score.
2. Aplicar constraints minimas:
- answer: string nao vazia
- source_document: string nao vazia
- confidence_score: number entre 0 e 1
3. Exportar tipo inferido pelo Zod para uso no validador.

Criterios de conclusao:
- Schema compila em TypeScript.
- Campos exigidos estao presentes com validacoes coerentes.

Evidencia esperada:
- Trecho do schema no arquivo alvo.

---

### T-31-02 - Implementar response-validator com guardrails deterministas
- Origem: Exercicio 3.1, item 2 (Copilot)
- Arquivo alvo principal: src/services/response-validator.ts
- Dependencias: T-31-01

Passos:
1. Criar funcao de validacao que usa ResponseSchema (safeParse/parse).
2. Em falha de schema, registrar motivo em log e retornar fallback seguro.
3. Implementar guardrail G1:
- se source_document ausente/invalido -> bloquear + log + fallback.
4. Implementar guardrail G2:
- detectar contexto de "carga perigosa" + "devolucao" na resposta.
- se houver afirmacao de possibilidade de devolucao no processo padrao -> bloquear + log + fallback.
5. Garantir retorno de resposta aprovada somente quando schema e guardrails passarem.

Criterios de conclusao:
- Guardrails bloqueiam de fato (nao apenas registram log).
- Todo caminho de falha retorna fallback seguro.
- Motivo tecnico de bloqueio/rejeicao e registrado em log.

Evidencia esperada:
- Implementacao do validador e funcoes auxiliares no arquivo alvo.

---

### T-32-01 - Reescrever feedback handler em conformidade com AGENTS.md
- Origem: Exercicio 3.2, item 3 (Copilot)
- Arquivo alvo principal: src/functions/feedback/handler.ts
- Dependencias: nenhuma

Passos:
1. Remover parsing inseguro (as any) e introduzir schema Zod de entrada.
2. Validar body com Zod antes de montar objeto de persistencia.
3. Substituir console.log por logger pino.
4. Garantir que logs nao incluam attendantEmail (nem outros PII).
5. Substituir require dinamico por import estatico de CosmosClient.
6. Persistir somente dados validados.
7. Padronizar retorno HTTP de sucesso/erro.

Criterios de conclusao:
- Sem as any nao validado.
- Sem console.log.
- Sem require dinamico.
- Sem log de dado pessoal.
- Com validacao Zod e logging pino.

Evidencia esperada:
- Versao reescrita do handler com imports estaticos e validacao.

## Ordem Recomendada de Execucao
1. T-31-01
2. T-31-02
3. T-32-01

## Checklist Final de Conformidade
- [x] Somente tarefas Copilot explicitas foram incluidas.
- [x] Exercicio 3.1 item 1 coberto.
- [x] Exercicio 3.1 item 2 coberto.
- [x] Exercicio 3.2 item 3 coberto.
- [x] Nenhuma tarefa de Claude/revisao humana foi incorporada no escopo.
