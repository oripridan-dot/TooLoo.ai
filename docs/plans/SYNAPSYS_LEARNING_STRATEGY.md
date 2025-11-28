# Synapsys Learning Strategy: The Cognitive Cycle

## Overview

This document defines the unified learning strategy for the Synapsys architecture. It consolidates existing optimization plans with new knowledge acquisition capabilities to form a complete "Cognitive Cycle."

The cycle consists of three distinct pillars:

1.  **Meta-Learning (Optimization):** Learning _how_ to think better.
2.  **Episodic Learning (Internal Memory):** Learning from _past interactions_.
3.  **Semantic Learning (External Knowledge):** Learning from _the world_.

---

## Pillar 1: Meta-Learning (Optimization)

**Goal:** Optimize system performance, cost, and accuracy by analyzing provider behavior.

- **Source:** `src/precog/provider-scorecard.ts`
- **Mechanism:**
  - Track latency, error rates, and user acceptance for each provider (OpenAI, Anthropic, etc.).
  - Dynamically adjust the `RouterAgent` weights based on this performance data.
- **Status:** Active.

## Pillar 2: Episodic Learning (Internal Memory)

**Goal:** Retain context and user preferences across sessions to build a personalized "Theory of Mind" for the user.

- **Source:** User Chat History & Decisions (`data/chat-history.json`, `data/decisions.json`).
- **Mechanism:**
  - **Extraction:** Parse interactions to extract `(Subject)-[PREDICATE]->(Object)` triples.
  - **Storage:** Neo4j Knowledge Graph (or structured JSON as interim).
  - **Recall:** `ContextManager` retrieves relevant past episodes based on current intent.
- **Status:** Planned (Architecture Phase D).

## Pillar 3: Semantic Learning (External Knowledge)

**Goal:** Autonomously acquire new information from the web to answer questions beyond the model's training cutoff.

- **Source:** The Web (URLs, Documentation, Articles).
- **Mechanism:** **The Synapsys Learner (Python RAG Module)**.
  - **Ingestion:** A robust web scraper (`synapsys-learner/ingestion`) fetches and cleans HTML.
  - **Memory:** A Vector Database (ChromaDB) stores chunked embeddings of the content.
  - **Cortex:** A RAG (Retrieval-Augmented Generation) engine retrieves relevant chunks to answer queries.
- **Status:** Implementation Started (See `synapsys-learner/`).

---

## Implementation Plan: Synapsys Learner (Python)

This module serves as the implementation of **Pillar 3**.

### Phase 1: Skeleton & Config

- [ ] Create `synapsys-learner/` directory.
- [ ] Define `requirements.txt` (LangChain, Chroma, BS4).
- [ ] Create `config.py` for environment management.

### Phase 2: The Scraper (Ingestion)

- [ ] Implement `WebScraper` class to fetch and clean URLs.
- [ ] Handle User-Agent rotation and error resilience.

### Phase 3: The Vector Store (Memory)

- [ ] Implement `KnowledgeBase` class using ChromaDB.
- [ ] Set up `RecursiveCharacterTextSplitter` and `OpenAIEmbeddings`.

### Phase 4: The RAG Brain (Cortex)

- [ ] Implement `RAGBrain` to connect retrieval with generation.
- [ ] Construct context-aware prompts for the LLM.

### Phase 5: Orchestration

- [ ] Build `main.py` CLI for `learn` and `ask` commands.
- [ ] Integrate with the main TypeScript application via CLI calls.
