# Create RAG Endpoint — NovaTech Assistant

> **Herda de:** `azure-functions-endpoint.md` + `azure-ai-search-integration.md` + `typescript-conventions.md`  
> **Frase-ativação:** "Crie um endpoint RAG completo: embedding + busca + completion + resposta com fonte"  
> **Criado por:** Dev Sênior | **Consumido por:** Dev Pleno + Copilot | **Frequência:** Por endpoint RAG novo

---

## O que esta skill produz

Ao ativar, gera os seguintes arquivos:
- `src/functions/[endpoint]/handler.ts`
- `src/functions/[endpoint]/validator.ts`
- `src/functions/[endpoint]/response-builder.ts`
- Extensões necessárias em `src/services/` (se não existirem)

---

## Fluxo RAG Padrão

```
POST /api/[endpoint]
  │
  ├─ 1. Validar input (Zod) → HTTP 400 se inválido
  ├─ 2. Gerar embedding (Azure OpenAI ada-002)
  ├─ 3. Buscar top-5 chunks (Azure AI Search)
  │       └─ Aplicar deduplicação de versões (CONF-01)
  ├─ 4. Montar prompt (system + chunks + histórico + pergunta)
  │       └─ Respeitar budget: ~4K system + ~8K chunks (ADR-0002)
  ├─ 5. Gerar completion (Azure OpenAI gpt-4o)
  └─ 6. Retornar QueryOutput com sources (apenas chunks não-obsoletos)
```

---

## Decisões Mandatórias (não modificar sem novo ADR)

| Decisão | Valor | ADR |
|---|---|---|
| Context budget chunks | ~8K tokens máx | ADR-0002 |
| Máximo de chunks | top=5 | ADR-0002 |
| Prioridade de versão de documento | Mais recente (pós 01/12/2023) | ADR-0003 |
| Chunks obsoletos | `isObsolete: true`, nunca incluir em sources | ADR-0003 |
| Modelo de embedding | `text-embedding-ada-002` | ADR-0001 |
| Modelo de completion | `gpt-4o` | ADR-0001 |

---

## Checklist de Conclusão

- [ ] Handler usa Azure Functions v4 (`app.http(...)`)
- [ ] Retry exponencial em todas as chamadas Azure
- [ ] Chunks `isObsolete: true` filtrados de `sources` na resposta
- [ ] `sources` nunca vazio (mínimo 1 chunk)
- [ ] Log estruturado com `conversationId` em todas as operações
- [ ] HTTP 500 sem detalhes internos
- [ ] Testes unitários para validator + prompt-builder
- [ ] Testes de integração com msw (incluindo CONF-01 e CONF-02)
