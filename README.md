# TooLoo.ai – Synapsys Architecture

**TooLoo.ai** is a self-improving, multi-provider AI development platform powered by the **Synapsys Architecture**.

## 🧠 Synapsys Architecture (v2.2)

The system is composed of three core modules working in unison:

1.  **Cortex (Cognitive Core)**
    - **Orchestrator**: Manages autonomous loops and task execution.
    - **Persona**: Enforces system identity and prevents hallucinations.
    - **Memory (Hippocampus)**: Manages short-term and long-term context.
    - **Planning (Prefrontal)**: Breaks down complex goals into actionable steps.

2.  **Precog (Predictive Intelligence)**
    - **Synthesizer**: Aggregates and synthesizes responses from multiple AI providers (Gemini, Claude, OpenAI).
    - **Oracle**: Manages budget and provider selection.

3.  **Nexus (Interface Layer)**
    - **API Gateway**: Exposes system capabilities via REST API (Port 4000).
    - **Web App**: Serves the Control Room and Chat UI.
    - **Event Bus**: Handles internal communication between modules.

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18
- npm

### Start the System

```bash
npm start
```

This will launch the **Synapsys** system on **Port 4000**.

### Access Points

- **Chat Pro**: `http://127.0.0.1:4000/chat-pro-v2.html` (Primary Interface)
- **Control Room**: `http://127.0.0.1:4000/`
- **Trace Viewer**: `http://127.0.0.1:4000/trace-viewer.html`
- **Health Check**: `http://127.0.0.1:4000/health`
- **System Status**: `http://127.0.0.1:4000/api/v1/system/status`

## 👁️ Cognitive Observability

Synapsys v2.2 introduces advanced observability features:

- **Thought Bubbles**: Real-time visualization of the agent's internal thought process (Planning, Tool Execution, Reflection) directly in the Chat UI.
- **Trace Viewer**: Deep dive into system traces, event logs, and performance metrics.

## ✋ Intervention Mode

The system supports a **Human-in-the-Loop** workflow:

- **Autonomous Mode** (Default): The agent executes plans automatically.
- **Intervention Mode**: The agent pauses before executing each step, allowing the user to:
  - **Review** the proposed action.
  - **Approve** execution.
  - **Pause/Resume** the entire plan.

Toggle this mode in the **Chat Pro** sidebar.

## 🛠️ Development

### Scripts

- `npm start`: Start the full system (Production mode).
- `npm run dev`: Start with hot-reloading (Development mode).
- `npm test`: Run the test suite.
- `npm run lint`: Lint the codebase.
- `npm run format`: Format the codebase.

### Directory Structure

```
src/
├── main.ts           # Entry point
├── core/             # Shared utilities (EventBus, Logger)
├── cortex/           # Cognitive Core (Orchestrator, Memory, Planning)
├── precog/           # Predictive Intelligence (Synthesizer, Providers)
├── nexus/            # Interface Layer (Express Server, Routes)
└── web-app/          # Frontend Assets (HTML, CSS, JS)
```

## 🤖 AI Providers

TooLoo.ai supports multiple AI providers:

- **Gemini** (Google)
- **Claude** (Anthropic)
- **OpenAI** (GPT-4)

Configuration is handled via `.env` and the **Precog** module.

## 📝 License

Private / Proprietary
