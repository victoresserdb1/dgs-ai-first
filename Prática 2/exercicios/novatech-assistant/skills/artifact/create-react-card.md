# Create React Card — NovaTech Assistant

> **Herda de:** `react-components.md`  
> **Frase-ativação:** "Crie um Adaptive Card React para exibir resposta do assistente no painel web"  
> **Criado por:** Dev Pleno | **Consumido por:** Dev Pleno + Copilot | **Frequência:** Por card de UI

---

## O que esta skill produz

Gera componente React em `src/web/src/components/[nome-do-card]/`:
- `[NomeDoCard].tsx` — componente principal
- `[NomeDoCard].module.css` — estilos escopados
- `[NomeDoCard].test.tsx` — testes unitários com React Testing Library

---

## Template de Response Card

```typescript
import type { SourceDocument } from '@/shared/types';

interface ResponseCardProps {
  answer: string;
  sources: SourceDocument[];
  conversationId: string;
  isLoading?: boolean;
}

export function ResponseCard({ answer, sources, conversationId, isLoading = false }: ResponseCardProps) {
  if (isLoading) {
    return <div aria-busy="true" aria-label="Carregando resposta...">...</div>;
  }

  return (
    <article aria-label="Resposta do assistente" data-testid="response-card">
      <div className="answer">{answer}</div>
      {sources.length > 0 && (
        <section aria-label="Fontes consultadas">
          {sources.map(source => (
            <span key={source.chunkId}>
              {source.documentId} v{source.version}
            </span>
          ))}
        </section>
      )}
    </article>
  );
}
```

---

## Checklist

- [ ] Props tipadas com `interface` — sem `any`
- [ ] `aria-label` em elementos interativos
- [ ] `data-testid` nos elementos principais para testes
- [ ] Estado de loading tratado
- [ ] Fontes (`sources`) listadas com `documentId` + `version`
- [ ] CSS modules para estilos (não inline styles)
