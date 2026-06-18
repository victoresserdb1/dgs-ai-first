# Create ADR — NovaTech Assistant

> **Herda de:** `project-structure.md`  
> **Frase-ativação:** "Documente esta decisão arquitetural seguindo o template ADR do projeto"  
> **Criado por:** **Tech Lead** | **Consumido por:** Dev Sênior + Claude + Delivery Manager | **Frequência:** Por nova decisão arquitetural

---

## Contexto

ADRs (Architecture Decision Records) documentam decisões que afetam a arquitetura, o stack ou os padrões do projeto. Devem ser criados quando uma decisão: não é óbvia, tem alternativas consideradas, ou tem consequências de longo prazo.

O Delivery Manager consome ADRs para rastreabilidade de decisões — por isso devem ser compreensíveis para público não-técnico na seção de Consequências.

---

## Nomenclatura e Localização

```
docs/adr/NNNN-titulo-da-decisao-em-kebab.md
```

Exemplos:
- `0001-escolha-azure-openai.md`
- `0002-context-budget-strategy.md`
- `0003-tratamento-documentos-contraditorios.md`

---

## Template Obrigatório

```markdown
# ADR-NNNN: [Título da Decisão]

**Data:** YYYY-MM-DD  
**Status:** Proposta | Aceita | Substituída por ADR-XXXX  
**Autores:** [Papel: nome]

---

## Contexto

[Por que esta decisão precisou ser tomada? Qual problema estávamos resolvendo?
Escrever em linguagem acessível — o Delivery Manager lerá esta seção.]

## Decisão

[O que foi decidido? Escrever como declaração ativa: "Adotamos X" ou "Usaremos Y".]

## Consequências

### Positivas
- [Benefícios esperados]

### Negativas / Trade-offs
- [Custos, limitações, riscos aceitos]

## Alternativas Consideradas

| Alternativa | Por que foi descartada |
|---|---|
| [Opção A] | [Razão] |
| [Opção B] | [Razão] |

## Referências

- [Links para documentação, tickets, benchmarks]
```

---

## Regras

- ADRs são **imutáveis** após aprovação — para reverter, criar novo ADR com `Substitui: ADR-XXXX`
- `Status: Substituída` ao invés de deletar ou editar
- Seção de Consequências deve ser compreensível para Delivery Manager (sem jargão técnico desnecessário)
- Mínimo 2 alternativas consideradas — demonstra que a decisão foi refletida

---

## Checklist

- [ ] Número sequencial correto (verificar último ADR em `docs/adr/`)
- [ ] Seção Contexto explica o problema de negócio (não só técnico)
- [ ] Seção Decisão usa declaração ativa
- [ ] Pelo menos 2 alternativas documentadas com justificativa de descarte
- [ ] Status definido como `Proposta` inicialmente
