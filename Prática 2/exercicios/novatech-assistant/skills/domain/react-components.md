# React Components — NovaTech Assistant

> **Herda de:** `typescript-conventions.md`  
> **Escopo:** Componentes React em `src/web/src/components/`.  
> **Criado por:** Dev Pleno | **Consumido por:** Dev Pleno + Copilot | **Frequência:** Por novo componente UI

---

## Contexto

Padrões para componentes React no painel web do assistente NovaTech. Sem esta skill, o Copilot gera componentes com PropTypes (legado), usa `any` em props, e omite acessibilidade.

---

## Template de Componente

```typescript
// ✅ Props tipadas com interface — nunca PropTypes
interface ResponseCardProps {
  answer: string;
  sources: SourceDocument[];
  conversationId: string;
  className?: string;
}

// ✅ Componente funcional com desestruturação de props
export function ResponseCard({ answer, sources, conversationId, className }: ResponseCardProps) {
  return (
    <article
      aria-label="Resposta do assistente"
      className={`response-card ${className ?? ''}`}
      data-conversation-id={conversationId}
    >
      <div className="response-card__answer">{answer}</div>
      <SourceList sources={sources} />
    </article>
  );
}
```

---

## Regras

- Componentes exportados como **named exports** (não default)
- Props sempre tipadas com `interface` — nunca `any` ou `PropTypes`
- Acessibilidade: `aria-label` ou `aria-labelledby` em componentes interativos
- `className` opcional com `className?: string` para composição
- Evitar estado local desnecessário — preferir props + callbacks
- `data-testid` em elementos que precisam de seletor em testes E2E
