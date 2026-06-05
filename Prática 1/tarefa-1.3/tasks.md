# Tasks — Tarefa 1.3: Construção de Pipeline de RAG com Ferramentas Open-Source

## Pré-requisitos

- Python instalado (3.9+)
- GitHub Copilot ativo no editor
- Acesso ao Claude (chat)
- Arquivos dos 5 documentos individuais disponíveis localmente
- Leitura do Anexo B (gabarito de chunks para validação)
- Leitura do Anexo A (fonte de verdade para avaliação das respostas)

---

## Lista de Tarefas

### T1 — Configurar o ambiente

- [ ] Criar uma pasta para o projeto do pipeline (ex: `rag-pipeline/`).
- [ ] Criar e ativar um ambiente virtual Python (`python -m venv venv`).
- [ ] Instalar as dependências obrigatórias:
  - `pip install chromadb`
  - `pip install sentence-transformers`
  - `pip install langchain` (opcional, somente se usar LangChain na orquestração)
- [ ] Verificar que os 5 arquivos `.md` de documentos da NovaTech estão acessíveis no projeto:
  - `POL-001-politica-devolucao.md`
  - `PROC-042-frete-especial-v1.md`
  - `PROC-042-v2-frete-especial-revisado.md`
  - `SLA-2024-tabela-sla-clientes.md`
  - `FAQ-atendimento.md`
- [ ] Criar o arquivo `requirements.txt` com as dependências instaladas.

---

### T2 — Definir e documentar a estratégia de chunking

Antes de escrever código, definir em um comentário no topo do script de ingestão ou em um arquivo `CHUNKING.md`:
- [ ] Tamanho de chunk escolhido (em tokens ou caracteres).
- [ ] Critério de divisão (fixo, por seção, por parágrafo, etc.).
- [ ] Como o chunking lida com tabelas (ex: tabelas de frete, tabelas de SLA) para não cortar no meio.
- [ ] Como o chunking lida com listas numeradas (ex: procedimentos passo a passo).
- [ ] Justificativa da escolha em relação ao tipo de pergunta esperado do atendente.

---

### T3 — Implementar o Módulo 1: Ingestão (`ingest.py`)

Usar o GitHub Copilot durante a implementação. Registrar onde o Copilot foi usado.

- [ ] Implementar função para **ler os arquivos `.md`** como texto a partir de um diretório configurável.
- [ ] Implementar função de **chunking** seguindo a estratégia definida na T2.
  - Incluir metadados em cada chunk: nome do arquivo fonte e identificador de posição/seção.
- [ ] Implementar função para **gerar embeddings** usando `sentence-transformers` com o modelo `all-MiniLM-L6-v2`.
- [ ] Implementar função para **armazenar no ChromaDB**:
  - Criar ou conectar à coleção ChromaDB.
  - Inserir chunks com embeddings e metadados (nome do documento, chunk id).
- [ ] Garantir que o script pode ser executado de forma isolada: `python ingest.py`.
- [ ] Testar a execução: verificar que os 5 documentos são processados e armazenados sem erros.
- [ ] Registrar quantos chunks foram gerados por documento após a execução.

---

### T4 — Implementar o Módulo 2: Busca (`search.py`)

Usar o GitHub Copilot durante a implementação. Registrar onde o Copilot foi usado.

- [ ] Implementar função que recebe uma **pergunta como string** e um parâmetro **N** (número de chunks a retornar).
- [ ] Gerar o **embedding da pergunta** usando o mesmo modelo `all-MiniLM-L6-v2`.
- [ ] Executar a **busca por similaridade** no ChromaDB.
- [ ] Retornar lista com:
  - Texto do chunk.
  - Nome do documento fonte (do metadado).
  - Score de similaridade.
- [ ] Testar a função com ao menos uma pergunta manual para verificar que retorna resultados.

---

### T5 — Implementar o Módulo 3: Montagem de Prompt (`assemble_prompt.py`)

Usar o GitHub Copilot durante a implementação. Registrar onde o Copilot foi usado.

- [ ] Definir o **system prompt** a ser usado (pode ser o desenvolvido na Tarefa 1.2 ou versão adaptada).
- [ ] Implementar função que recebe: lista de chunks (com metadados) e a pergunta do atendente.
- [ ] Montar o prompt na estrutura:
  - System prompt (estático).
  - Seção de contexto: chunks formatados com identificação do documento fonte para cada chunk.
  - Pergunta do atendente.
- [ ] Retornar o prompt como string.
- [ ] Testar a função com uma lista de chunks simulada para verificar a formatação.

---

### T6 — Selecionar as 5 perguntas de teste

- [ ] Consultar o mapa de cobertura do Anexo B.
- [ ] Selecionar **5 perguntas** distribuídas entre documentos diferentes (não todas da POL-001 ou todas da SLA).
- [ ] Registrar, para cada pergunta, quais são os **chunks esperados** conforme o gabarito do Anexo B.

Sugestão de distribuição:
- 1 pergunta sobre devolução (POL-001)
- 1 pergunta sobre SLA (SLA-2024)
- 1 pergunta sobre frete especial / multiplicadores (PROC-042-v1 ou v2)
- 1 pergunta sobre conflito de versões (PROC-042-v1 vs v2)
- 1 pergunta que deve acionar o FAQ ou um documento secundário

---

### T7 — Executar os 5 testes e registrar resultados

Para cada uma das 5 perguntas:

- [ ] Chamar o módulo de busca (`search.py`) com a pergunta e registrar os chunks retornados e seus scores.
- [ ] Comparar os chunks retornados com o gabarito do Anexo B:
  - Os chunks corretos estão entre os retornados?
  - Estão nas posições de maior similaridade?
  - Algum chunk irrelevante aparece no topo?
- [ ] Chamar o módulo de montagem (`assemble_prompt.py`) com os chunks retornados e a pergunta.
- [ ] Copiar o prompt montado e **colar no Claude** para obter a resposta.
- [ ] Copiar a resposta do Claude.
- [ ] Avaliar a resposta: correta segundo o Anexo A? Citou fonte? Respeitou guardrails?
- [ ] Registrar todos os campos da tabela de resultados definida nas specs.

---

### T8 — Identificar e documentar os problemas encontrados

- [ ] Listar ao menos **2 problemas reais** encontrados durante os testes da T7 (não hipotéticos).
- [ ] Verificar que a análise de ao menos 1 problema conecta a causa raiz à qualidade da ingestão ou do chunking — não apenas ao comportamento do LLM (ex: chunk cortado no meio de uma tabela, metadado de versão ausente, fragmentação de lista numerada).
- [ ] Para cada problema:
  - Descrever o que aconteceu (ex: "chunk da PROC-042-v1 foi retornado com score mais alto que o da v2 para a pergunta sobre multiplicador Norte").
  - Identificar a causa provável (ex: "ambos os documentos têm texto muito similar na seção de multiplicadores regionais").
  - Propor uma correção concreta e implementável (ex: "adicionar metadado de prioridade de versão e filtrar no retrieval", ou "ajustar o chunking para incluir o número da versão no início de cada chunk").

---

### T9 — Registrar evidência do uso do GitHub Copilot

- [ ] Para cada módulo implementado, registrar ao menos um exemplo de onde o Copilot foi utilizado:
  - Sugestão de código aceita (descrever o que foi sugerido).
  - Geração de função a partir de comentário descritivo.
  - Autocompletar de estrutura de dados ou chamada de API.
- [ ] Incluir esse registro no entregável (pode ser em um arquivo `COPILOT-LOG.md` ou como comentários no código).

---

### T10 — Consolidar e validar o entregável

- [ ] Confirmar que os três scripts estão presentes e executam sem erros.
- [ ] Confirmar que o `requirements.txt` está atualizado.
- [ ] Confirmar que o registro dos 5 testes está completo (todos os campos da tabela preenchidos).
- [ ] Confirmar que ao menos 2 problemas estão documentados com causa e proposta de correção.
- [ ] Confirmar que ao menos 1 problema tem causa raiz conectada à ingestão ou ao chunking (não apenas ao LLM) — comprovando entendimento de RAG como sistema de engenharia de dados.
- [ ] Confirmar que a evidência do Copilot está registrada.
- [ ] Confirmar que a estratégia de chunking está justificada (não apenas um número sem raciocínio).
