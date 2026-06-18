# Create SDD Spec — NovaTech Assistant

> **Herda de:** (nenhuma skill técnica — domínio de produto)  
> **Frase-ativação:** "Converta este requirements.md em um plan.md seguindo o padrão SDD do projeto"  
> **Criado por:** **Product Specialist** | **Consumido por:** Tech Lead + Claude | **Frequência:** Por novo módulo especificado

---

## Contexto

Esta skill é criada e mantida pelo Product Specialist — não por desenvolvedor. O PS define como specs de produto se transformam em planos técnicos dentro do padrão SDD do projeto.

---

## Fluxo SDD

```
requirements.md  (PS escreve)
      ↓ Tech Lead converte com esta skill
plan.md          (Tech Lead escreve, PS aprova)
      ↓ Dev converte com Copilot
tasks.md         (Dev gera, Tech Lead aprova)
```

---

## Template: `plan.md`

```markdown
# Plan — [Nome do Módulo]

## Approach
[Descrição técnica de alto nível: arquitetura, componentes, decisões-chave]

## Technical Decisions
- [Stack, frameworks, patterns]
- [Integrações Azure]

## Prior Decisions (do histórico de ADRs)
- [ADRs relevantes que afetam este módulo]

## File Structure
[Arquivos a criar conforme Anexo C / project-structure.md]

## Dependencies
- [Pré-requisitos de infraestrutura]
- [Outros módulos que devem estar prontos]

## Out of Scope
[O que NÃO será implementado neste módulo]
```

---

## Checklist de Qualidade do `plan.md`

- [ ] Approach explica o "como" (não só o "o quê" — isso é o requirements)
- [ ] Technical Decisions referencia ADRs existentes quando relevante
- [ ] File Structure segue a estrutura do Anexo C
- [ ] Dependencies lista infraestrutura E outros módulos
- [ ] Out of Scope previne scope creep durante implementação
