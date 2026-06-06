# Setup do Ambiente — Pipeline RAG NovaTech

## Pré-requisitos

- Python 3.11+ (testado em 3.13)
- pip atualizado

## Criação do ambiente virtual (NC-06)

```bash
# Criar venv (diretório venv/ é excluído do repositório por .gitignore)
python -m venv venv

# Ativar (Windows)
venv\Scripts\activate

# Ativar (Linux / macOS)
source venv/bin/activate

# Instalar dependências com versões fixadas
pip install -r requirements.txt
```

## Execução do pipeline

```bash
# 1. Ingerir os 5 documentos no ChromaDB (executar apenas uma vez, ou após limpar chroma_db/)
python ingest.py

# 2. Testar busca manual (opcional)
python search.py "Posso devolver carga perigosa?"

# 3. Executar os 5 testes de validação e gerar prompts
python test_pipeline.py
```

## Atualizar requirements.txt

Após instalar novos pacotes no venv ativo:

```bash
pip freeze > requirements.txt
```

## Observação sobre o diretório `venv/`

O diretório `venv/` não é versionado (adicionar ao `.gitignore` se usar git):

```
venv/
chroma_db/
__pycache__/
*.pyc
```
