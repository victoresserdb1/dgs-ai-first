# Project Structure — NovaTech Assistant

> **Herda de:** (nenhuma — é skill Foundation base de estrutura)  
> **Escopo:** Estrutura de diretórios, nomenclatura, organização do repositório `db1/novatech-assistant`.  
> **Criado por:** Tech Lead | **Consumido por:** Dev Pleno + Dev Sênior + Copilot

---

## Contexto

Quando criar um novo módulo, arquivo ou pasta, seguir esta estrutura. O Tech Lead definiu a organização do repositório baseada em separação de responsabilidades: funções HTTP, serviços de negócio, compartilhados e testes separados.

---

## Estrutura de Diretórios (simplificada com anotações)

```
db1/novatech-assistant/
│
├── .mcp/mcp.json              ← Configuração de MCP servers (nunca comitar secrets)
├── AGENTS.md                  ← Constitution do projeto para agentes de IA
│
├── docs/adr/                  ← ADRs: NNNN-titulo-da-decisao.md
├── specs/                     ← SDD por módulo: requirements.md → plan.md → tasks.md
│   └── query-endpoint/        ← Slug do módulo em kebab-case
│
├── prompts/                   ← System prompts versionados via Git
│   └── system-prompt.md       ← Prompt principal (sempre versionar mudanças)
│
├── skills/                    ← Skills do projeto (Foundation → Domain → Artifact)
│   ├── foundation/            ← Convenções globais (herança base)
│   ├── domain/                ← Padrões por camada técnica
│   └── artifact/              ← Receitas de geração de artefatos completos
│
├── src/
│   ├── functions/             ← Azure Functions HTTP triggers
│   │   └── query/             ← Uma pasta por endpoint
│   │       ├── handler.ts     ← HTTP trigger + registro app.http(...)
│   │       ├── validator.ts   ← Schemas Zod de input/output
│   │       └── response-builder.ts  ← Montagem da resposta
│   │
│   ├── services/              ← Lógica de negócio (não acessa req/res)
│   │   ├── search.ts          ← Azure AI Search
│   │   ├── completion.ts      ← Azure OpenAI (embeddings + completions)
│   │   └── prompt-builder.ts  ← Montagem do prompt com budget
│   │
│   └── shared/                ← Código compartilhado entre módulos
│       ├── types.ts           ← Schemas Zod + tipos TypeScript do domínio
│       ├── config.ts          ← Validação de env vars com Zod
│       ├── logger.ts          ← Instância pino (única no projeto)
│       └── errors.ts          ← Hierarquia de custom errors
│
└── tests/
    ├── unit/                  ← Sem chamadas externas (tudo mockado)
    ├── integration/           ← APIs externas mockadas com msw
    ├── e2e/                   ← Fluxo completo (uso criterioso — consome tokens)
    └── fixtures/              ← Dados compartilhados entre testes
        └── chunks.ts          ← Chunks simulados do pipeline RAG
```

---

## Regras de Nomenclatura

| Artefato | Convenção | Exemplo |
|---|---|---|
| Pastas de módulo | kebab-case | `query-endpoint/`, `pipeline-ingestao/` |
| Arquivos TypeScript | camelCase | `promptBuilder.ts` (exceto convenções da camada) |
| Arquivos de handler/validator/service | kebab-case do módulo | `handler.ts`, `validator.ts`, `search.ts` |
| Interfaces/Tipos TypeScript | PascalCase | `QueryInput`, `SourceDocument` |
| Constantes | UPPER_SNAKE_CASE | `MAX_CHUNKS`, `V2_EFFECTIVE_DATE` |
| Skills | kebab-case | `typescript-conventions.md` |
| ADRs | `NNNN-titulo-kebab.md` | `0001-escolha-azure-openai.md` |
| Specs | slug do módulo | `specs/query-endpoint/` |

---

## Quando Criar Pasta vs Arquivo Único

| Situação | Decisão |
|---|---|
| Novo endpoint HTTP | Sempre pasta em `src/functions/[endpoint-name]/` com `handler.ts` + `validator.ts` |
| Novo serviço com > 1 responsabilidade | Pasta em `src/services/[service-name]/` |
| Utilitário único compartilhado | Arquivo em `src/shared/[nome].ts` |
| Mais de 3 arquivos relacionados | Criar pasta |
| Único arquivo sem perspectiva de crescimento | Arquivo único |

---

## Padrão SDD em `/specs/`

Todo módulo segue três artefatos em ordem:

```
specs/[módulo-slug]/
├── requirements.md   ← Product Specialist escreve; Tech Lead aprova
├── plan.md           ← Tech Lead escreve a partir do requirements; PS e Dev Sênior aprovam
└── tasks.md          ← Dev gera com Copilot a partir do plan; Tech Lead aprova
```

**Regra:** O `tasks.md` só pode ser escrito **depois** que o `plan.md` está aprovado. Nunca começar implementation sem `tasks.md` aprovado.

---

## Hierarquia de Skills em `/skills/`

```
skills/
├── foundation/   ← Convenções globais — herança base de tudo
├── domain/       ← Padrões por camada — herda de foundation
└── artifact/     ← Receitas de geração — herda de domain + foundation
```

**Regra de herança:** Todo skill file deve declarar `> Herda de: [lista]` no topo. Se herda de foundation apenas, não precisa listar domain.

---

## ADRs em `/docs/adr/`

Nomenclatura: `NNNN-titulo-da-decisao.md`  
Seções obrigatórias:
1. **Contexto** — por que esta decisão precisou ser tomada
2. **Decisão** — o que foi decidido
3. **Consequências** — impactos positivos e negativos
4. **Alternativas Consideradas** — o que foi descartado e por quê

ADRs são imutáveis após aprovação. Para reverter uma decisão, crie um novo ADR referenciando o anterior.

---

## Convenção de Path Alias `@/`

O path alias `@/` aponta para `src/`. Sempre usar em imports internos:

```typescript
// ✅ DO
import { logger } from '@/shared/logger';
import { QueryInputSchema } from '@/functions/query/validator';

// ❌ DON'T (path relativo frágil)
import { logger } from '../../../shared/logger';
```
