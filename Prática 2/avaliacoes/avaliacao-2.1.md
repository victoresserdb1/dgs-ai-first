## Avaliação do Exercício 2.1

### Resumo
O entregável atende bem ao objetivo do exercício: mapeia os servidores MCP, define permissões mínimas com boa granularidade e traz riscos de segurança contextualizados ao cenário NovaTech. Com as novas evidências anexadas, há comprovação de uso de Claude e Copilot no processo. O principal ponto que impede nota máxima é a incoerência entre o mapeamento declarado e a configuração final do arquivo MCP.

### Scores por Dimensão

| Dimensão | Score | Justificativa |
|----------|-------|---------------|
| D1 — Domínio Conceitual | 3 | Demonstra domínio claro de MCP (Tools, Resources, Prompts), separação entre servidores públicos e custom, e least privilege por serviço. Isso aparece de forma consistente em mcp-mapeamento.md e historico-conversa-mcp-servers.md. |
| D2 — Uso de Ferramentas | 2 | Há evidência real de uso de ferramentas: interações com Claude para mapeamento/permissões em historico-conversa-mcp-servers.md e geração de artefatos com Copilot em historico-iteracao-execucao-tarefas.md. Porém, falta evidência mais forte de refinamento iterativo do próprio mcp.json (versão inicial, crítica e ajuste). |
| D3 — Qualidade do Entregável | 2 | O arquivo de configuração é machine-readable e sintaticamente válido em mcp.json, e os artefatos pedidos foram entregues. Entretanto, há inconsistência entre o mapeamento e a config final: o mapeamento enfatiza Azure OpenAI em mcp-mapeamento.md, mas o mcp.json final inclui filesystem e não inclui Azure OpenAI. |
| D4 — Pensamento Crítico | 3 | A análise de riscos é concreta e acionável, com vetores específicos e mitigações técnicas (política, sanitização, escopo, desativação por ambiente), não genéricas, em mcp-riscos-seguranca.md. |
| D5 — Aplicabilidade ao Projeto | 3 | O conteúdo está fortemente conectado ao contexto NovaTech (Confluence, Azure DevOps, AI Search, sensibilidade de dados de negócio) e referencia decisões de cenário anterior, incluindo budget/contexto em mcp-mapeamento.md. |

**Score do exercício: 2.6**

### Verificação de Artefatos Machine-Readable
Para este exercício, o artefato central machine-readable é o arquivo MCP, e ele está adequado no formato JSON em mcp.json.  
Pontos bons: estrutura válida, uso de variáveis de ambiente, sem segredos hardcoded.  
Ponto a ajustar: coerência semântica entre o mapeamento funcional e os servidores efetivamente declarados no arquivo final.

### Pontos Fortes
- Mapeamento abrangente com foco prático de adoção (usar público quando possível, customizar quando necessário).
- Least privilege bem detalhado por servidor, com decisões de escopo e restrições úteis para operação segura.
- Riscos de segurança específicos ao domínio NovaTech, com mitigação técnica executável.

### Pontos de Melhoria
- Alinhar 1:1 mapeamento e configuração final do MCP para evitar divergência de arquitetura.
- Registrar iteração explícita do Copilot para o mcp.json (v1, avaliação crítica, v2 corrigida).
- Consolidar uma matriz final de rastreabilidade requisito → evidência para facilitar auditoria da avaliação.

### Classificação
Aprovado com distinção

### Tópicos da Trilha para Reforço
Não se aplica, pois o score ficou igual ou acima de 2.5.