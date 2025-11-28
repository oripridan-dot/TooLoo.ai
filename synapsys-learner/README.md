# Synapsys Learner

This module implements the **Semantic Learning** pillar of the Synapsys architecture. It allows the system to ingest knowledge from the web and answer questions based on that knowledge.

## Setup

1.  **Environment Variables:**
    The module expects a `.env` file in this directory with your `OPENAI_API_KEY`.
    (This has been copied from your project root automatically).

2.  **Dependencies:**
    Dependencies are installed in the project's virtual environment.

## Usage

Use the `run.sh` script to interact with the learner.

### 1. Learn (Ingest)

Scrape a webpage and store it in the vector memory.

```bash
./run.sh learn --url "https://example.com"
```

### 2. Ask (Query)

Ask a question based on the ingested knowledge.

```bash
./run.sh ask --query "What is the domain used for?"
```

## Architecture

- **Ingestion:** `ingestion/scraper.py` (Requests + BeautifulSoup)
- **Memory:** `memory/vector_store.py` (ChromaDB + HuggingFace Embeddings)
- **Cortex:** `cortex/rag_engine.py` (LangChain + Anthropic Claude)

## Configuration

The system is currently configured to use:

- **LLM:** `claude-3-5-haiku-20241022` (via `ANTHROPIC_API_KEY`)
- **Embeddings:** `all-MiniLM-L6-v2` (Local HuggingFace model)
