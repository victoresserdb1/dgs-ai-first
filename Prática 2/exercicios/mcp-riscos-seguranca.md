# Riscos de Segurança — Uso de MCP Servers no NovaTech Assistant
## Entregável da TAREFA-04

> **Escopo:** Riscos específicos ao uso de MCP servers no contexto do projeto NovaTech Assistant, considerando que agentes de IA (Claude Desktop, GitHub Copilot) operam na máquina do desenvolvedor com acesso aos servers configurados em `.mcp/mcp.json`.

---

## RISCO-01: Vazamento de Documentação Confidencial da NovaTech via Modelo Cloud Externo

### Classificação
- **Severidade:** Alta
- **Probabilidade:** Média (depende de consciência do usuário)
- **Server afetado:** MCP-05 (Confluence NovaTech)

### Cenário de Risco
O MCP server do Confluence expõe documentação sensível da NovaTech, incluindo:
- `SLA-2024`: tabela de SLAs com valores contratuais por tier de cliente
- `PROC-042`: multiplicadores de frete negociados por região
- `POL-001`: limites de responsabilidade e políticas de indenização

**Vetor de ataque:** Um desenvolvedor usa Claude Desktop (rodando localmente) com o MCP do Confluence ativo. Claude busca uma página via `search_pages` e o conteúdo retornado (com dados de SLA de clientes corporativos) é automaticamente incluído no contexto enviado ao servidor cloud da Anthropic. Esse conteúdo trafega por servidores externos sem que a NovaTech tenha controle sobre o processamento ou retenção desses dados.

**Por que é específico ao NovaTech:** Os documentos do Confluence contêm dados que identificam clientes por tier (Gold/Silver/Standard), valores contratuais específicos e multiplicadores regionais que são informações comercialmente sensíveis. Esses dados expostos ao modelo cloud podem ser retidos nos logs da Anthropic ou usados para fine-tuning futuro, violando acordos de confidencialidade com clientes NovaTech.

### Mitigações Técnicas (acionáveis)

1. **Documentar restrição no `AGENTS.md`:** Adicionar seção explícita proibindo o uso do MCP do Confluence em sessões com modelos cloud (Claude.ai, ChatGPT). O agente deve recusar incluir conteúdo do Confluence em contextos enviados a endpoints externos.

2. **Adicionar label `[CONFIDENTIAL]` nos logs do server:** O MCP custom do Confluence deve logar `[CONFIDENTIAL] content fetched from space NOVATECH` para cada chamada, permitindo auditoria.

3. **Filtro de conteúdo no server custom:** Se o server Confluence for construído internamente, implementar um middleware que remova campos com padrão `R$ [0-9]+` (valores monetários) antes de retornar o conteúdo ao agente.

4. **Limitação de acesso por ambiente:** O MCP do Confluence deve estar ativo apenas em máquinas com token Confluence configurado e deve ser explicitamente desativado em ambientes de CI/CD (onde não há razão para consultar documentação).

```json
// .mcp/mcp.json — desativar Confluence em CI via variável de ambiente
"confluence": {
  // ... configuração ...
  "disabled": "${CI}"
}
```

---

## RISCO-02: Exposição de Tokens e Secrets em Logs e Outputs de Agente

### Classificação
- **Severidade:** Alta  
- **Probabilidade:** Alta (ocorre frequentemente sem medidas preventivas)
- **Servers afetados:** Todos os 5 (especialmente GitHub, Azure AI Search, Azure DevOps)

### Cenário de Risco
As variáveis `${GITHUB_TOKEN}`, `${AZURE_SEARCH_API_KEY}` e `${AZURE_DEVOPS_PAT}` são injetadas no processo do server MCP via variáveis de ambiente. Dois vetores de exposição:

**Vetor 1 — Logs de erro de dependências:** Quando o `@modelcontextprotocol/server-github` falha na autenticação (ex: token expirado), algumas versões da biblioteca incluem o valor do token no log de erro para debugging. O log `Invalid token: ghp_xxxx...` expõe o secret.

**Vetor 2 — Output do agente ao descrever configuração:** Se um desenvolvedor perguntar ao Claude "quais são as configurações do MCP server do GitHub?", o agente pode incluir o valor da variável de ambiente na resposta por estar no contexto da ferramenta. Exemplo de output problemático:
```
O server está configurado com GITHUB_PERSONAL_ACCESS_TOKEN=ghp_abc123xyz789
```

**Por que é específico ao NovaTech:** O PAT do Azure DevOps dá acesso de escrita ao board de tasks do sprint — se vazado, um atacante pode modificar status de tasks, comentários e roadmap do projeto sem acesso ao repositório. O token do GitHub dá escrita em branches de feature, permitindo injeção de código malicioso em PRs.

### Mitigações Técnicas (acionáveis)

1. **`.gitignore` preventivo antes de qualquer arquivo de credencial:**
```gitignore
# Adicionar ANTES de criar qualquer arquivo .env
.env
.env.local
.env.*.local
*.secrets
mcp-servers/**/.env
```

2. **Sanitização nos wrappers custom (Azure AI Search, Azure OpenAI):** Implementar middleware que intercepta logs de erro e mascara valores que correspondam a padrões de credenciais:
```typescript
function sanitizeForLog(message: string): string {
  return message
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/g, 'Bearer [REDACTED]')
    .replace(/api-key:\s*[A-Za-z0-9]{20,}/gi, 'api-key: [REDACTED]')
    .replace(/ghp_[A-Za-z0-9]{36}/g, 'ghp_[REDACTED]');
}
```

3. **Instrução no `AGENTS.md`:** Adicionar regra explícita proibindo agentes de exibir, logar ou referenciar valores de variáveis de ambiente:
```markdown
## Regra de Segurança — Secrets
NUNCA exiba, cite ou inclua em outputs o valor de variáveis de ambiente.
Se perguntado sobre configurações, cite APENAS o nome da variável (ex: `GITHUB_TOKEN`),
nunca o valor. Se detectar um secret em contexto, não o repita na resposta.
```

4. **Validação pós-inicialização:** Adicionar um health-check script que verifica se o arquivo `mcp.json` não contém valores hardcoded:
```bash
# scripts/validate-mcp-config.sh (executado no pre-commit hook)
grep -E '"[A-Z_]+"\s*:\s*"[^${\}]{10,}"' .mcp/mcp.json && \
  echo "ERRO: Valores hardcoded detectados no mcp.json" && exit 1
```

---

## Referência Cruzada com AGENTS.md

Ambos os riscos requerem entradas no `AGENTS.md` do projeto. Texto recomendado:

```markdown
## Restrições de Segurança para Agentes

### MCP e Dados Confidenciais
- O MCP server do Confluence é para uso EXCLUSIVO em sessões locais.
- Conteúdo retornado pelo MCP do Confluence NÃO deve ser enviado a modelos fora do ambiente Azure da NovaTech.
- Documentos com dados de SLA, valores contratuais ou multiplicadores de frete são [CONFIDENTIAL].

### Secrets e Variáveis de Ambiente
- NUNCA exiba o valor de variáveis de ambiente em respostas ou logs.
- Se detectar um secret em contexto, não o repita. Notifique o desenvolvedor para rotacionar a credencial.
- Em caso de erro de autenticação, cite apenas o NOME da variável (ex: "verifique GITHUB_TOKEN"), não o valor.
```
