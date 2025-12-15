# TooLoo.ai Skills OS - Copilot Instructions

> **Version:** 1.1.0.0 | **Codename:** Genesis | **Updated:** December 15, 2025

## 🧠 What is Skills OS?

**TooLoo.ai Skills OS** is a pure skill-based execution platform. Everything is a **Skill**.

- The UI doesn't know what "Chat" is - it asks the Kernel "What can I do?"
- The API doesn't have hardcoded routes - it routes requests to Skills
- New capabilities are added by creating YAML skill definitions

## 🤖 LLM Providers (V1.1)

Skills OS supports **4 LLM providers** - configure via environment variables:

| Provider | Env Variable | Default Model |
|----------|--------------|---------------|
| DeepSeek | `DEEPSEEK_API_KEY` | deepseek-chat |
| Anthropic | `ANTHROPIC_API_KEY` | claude-sonnet-4-20250514 |
| OpenAI | `OPENAI_API_KEY` | gpt-4o |
| Gemini | `GOOGLE_API_KEY` | gemini-2.0-flash |

---

## ⚠️ CRITICAL: Codespace Safety

**NEVER run `pkill -f "node"` in a GitHub Codespace** - it kills the VS Code connection.

```bash
# ✅ SAFE commands:
pnpm stop                           # Stop all TooLoo services
pkill -f "tsx"                      # Kill TypeScript runners
pkill -f "vite"                     # Kill Vite dev server

# ❌ DANGEROUS - NEVER USE:
# pkill -f "node"                   # Kills Codespace!
# killall node                      # Kills Codespace!
```

---

## 📁 Project Structure (Skills OS V1.1)

```
TooLoo.ai/
├── skills/                    # 📦 YAML Skill Definitions (THE SOURCE OF TRUTH)
│   ├── coding-assistant.yaml
│   ├── architect.yaml
│   ├── research-analyst.yaml
│   ├── learning.yaml          # NEW: Q-learning & feedback
│   ├── memory.yaml            # NEW: Vector storage
│   ├── experimentation.yaml   # NEW: A/B testing
│   ├── emergence.yaml         # NEW: Creative synthesis
│   ├── self-awareness.yaml    # NEW: Introspection
│   └── ...                    # 20+ skills total
│
├── src/kernel/                # 🧠 The Kernel (Skill Execution Engine)
│   ├── boot.ts                # Entry point: pnpm boot
│   ├── kernel.ts              # Core execution logic
│   ├── registry.ts            # Skill registry
│   ├── router.ts              # Intent → Skill routing
│   └── types.ts               # TypeScript types
│
├── apps/
│   ├── api/                   # 🌐 API Server (Port 4001)
│   │   └── src/
│   │       ├── index.ts       # Express + Socket.IO
│   │       └── routes/        # REST endpoints
│   │
│   └── web/                   # 🖥️ Skills Shell UI (Port 5173)
│       └── src/
│           ├── AppV2.jsx      # Dynamic skill-based UI
│           └── components/    # UI components
│
├── packages/                  # 📚 Shared packages (@tooloo/*)
│   ├── core/                  # Types, EventBus
│   ├── skills/                # Skill loader, validator
│   ├── providers/             # LLM adapters
│   └── memory/                # Event store
│
├── version.json               # 📊 Auto-incrementing version
├── SKILLS_OS.md               # 📖 System documentation
└── package.json               # 📦 Scripts and dependencies
```

---

## 🚀 Quick Commands

```bash
# Start Skills OS (API + Web + Kernel)
pnpm dev

# Stop all services
pnpm stop

# Boot just the Kernel
pnpm boot

# List registered skills
pnpm skills:list

# Run tests
pnpm test

# Check system health
pnpm health
```

---

## 🔌 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v2/health` | GET | System health |
| `/api/v2/skills` | GET | List all skills |
| `/api/v2/skills/:id` | GET | Get skill details |
| `/api/v2/execute` | POST | Execute a skill |
| `/api/v2/route` | POST | Route intent to skill |

### Execute a Skill

```bash
curl -X POST http://localhost:4001/api/v2/execute \
  -H "Content-Type: application/json" \
  -d '{
    "skillId": "coding-assistant",
    "input": {
      "task": "Write a TypeScript function to merge arrays"
    }
  }'
```

---

## 📝 Creating Skills

Skills are defined in YAML files in the `skills/` directory:

```yaml
# skills/my-skill.yaml
id: my-skill
name: My Custom Skill
version: 1.0.0
description: What this skill does

# Routing keywords (for intent matching)
keywords:
  - keyword1
  - keyword2

# Input schema (Zod-compatible)
schema:
  type: object
  properties:
    task:
      type: string
      description: The task to perform
  required:
    - task

# LLM instructions
instructions: |
  You are an expert at...
  
  ## Guidelines
  - Always do X
  - Never do Y

# Tools this skill can use
tools:
  - file_read
  - file_write
  - terminal_run
```

---

## 🎯 Code Guidelines

1. **Everything is a Skill** - No hardcoded features
2. **YAML First** - Skills are defined in YAML, not code
3. **TypeScript Strict** - All code must be type-safe
4. **Version Headers** - Update `@version` when modifying files
5. **Import .js** - ESM requires `.js` extensions

### File Header Template

```typescript
/**
 * @file Description of what this file does
 * @version 1.0.0
 * @skill-os true
 */
```

---

## 🔄 Kernel Events

```typescript
import { kernel } from './kernel.js';

// Execute a skill
const result = await kernel.execute({
  skillId: 'coding-assistant',
  input: { task: 'Write a function' }
});

// Listen to events
kernel.on('skill:executing', ({ skillId }) => {
  console.log(`Executing: ${skillId}`);
});

kernel.on('skill:executed', ({ skillId, result }) => {
  console.log(`Completed: ${skillId}`, result);
});
```

---

## 📊 Version Management

The system auto-increments version on each significant change:

```json
// version.json
{
  "name": "TooLoo.ai Skills OS",
  "version": "1.0.0",
  "codename": "Genesis",
  "build": 1,
  "autoIncrement": true
}
```

Bump version: `pnpm version:bump`

---

## 🧪 Testing Skills

```typescript
// tests/skills/coding-assistant.test.ts
import { describe, it, expect } from 'vitest';
import { kernel } from '../../src/kernel/kernel.js';

describe('coding-assistant skill', () => {
  it('should generate TypeScript code', async () => {
    const result = await kernel.execute({
      skillId: 'coding-assistant',
      input: { task: 'Write a hello world function' }
    });
    
    expect(result.success).toBe(true);
    expect(result.data).toContain('function');
  });
});
```

---

## 📚 Key Files Reference

| File | Purpose |
|------|---------|
| [src/kernel/boot.ts](../src/kernel/boot.ts) | System entry point |
| [src/kernel/kernel.ts](../src/kernel/kernel.ts) | Skill execution engine |
| [src/kernel/registry.ts](../src/kernel/registry.ts) | Skill registry |
| [apps/web/src/AppV2.jsx](../apps/web/src/AppV2.jsx) | Skills Shell UI |
| [skills/*.yaml](../skills/) | Skill definitions |
| [version.json](../version.json) | System version |
| [SKILLS_OS.md](../SKILLS_OS.md) | System documentation |

---

*Skills OS V1 - Everything is a Skill*
