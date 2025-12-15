# TooLoo.ai Skills OS

> **Version:** 1.0.0 | **Codename:** Genesis | **Status:** Production Ready

## 🧠 The Philosophy

**Everything is a Skill.**

TooLoo.ai Skills OS is not a chatbot with plugins. It's an operating system where:

- The **UI** doesn't know what "Chat" is - it asks the Kernel "What can I do?"
- The **API** doesn't have hardcoded routes - it routes requests to Skills
- **New capabilities** are added by creating YAML files, not writing code

---

## 🚀 Quick Start

```bash
# Start Skills OS
pnpm dev

# Stop Skills OS
pnpm stop

# Check health
pnpm health
```

**URLs:**
- Skills Shell (UI): http://localhost:5173
- API Server: http://localhost:4001/api/v2
- Kernel: http://localhost:4002/synapsys

---

## 📁 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        SKILLS SHELL (UI)                        │
│                     apps/web - Port 5173                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  "What skills do I have?" → Render dynamic UI            │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API SERVER                               │
│                    apps/api - Port 4001                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  /api/v2/skills    → List available skills               │  │
│  │  /api/v2/execute   → Execute a skill                     │  │
│  │  /api/v2/route     → Route intent to skill               │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         KERNEL                                  │
│                   src/kernel - Port 4002                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Registry: Load skills from YAML                         │  │
│  │  Router: Match intent → skill                            │  │
│  │  Executor: Run skill with validated input                │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SKILL DEFINITIONS                           │
│                        skills/*.yaml                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  coding-assistant.yaml   → Code generation               │  │
│  │  architect.yaml          → System design                 │  │
│  │  research-analyst.yaml   → Research & analysis           │  │
│  │  ...                                                     │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 Available Skills

| Skill ID | Name | Description |
|----------|------|-------------|
| `coding-assistant` | Coding Assistant | TypeScript/Node.js expert |
| `architect` | System Architect | Design patterns & architecture |
| `research-analyst` | Research Analyst | Research & analysis |
| `documentation-writer` | Doc Writer | Technical documentation |
| `test-generator` | Test Generator | Unit & integration tests |
| `refactoring-expert` | Refactoring Expert | Code optimization |
| `code-reviewer` | Code Reviewer | Code review & feedback |

---

## 🔌 API Reference

### List Skills
```bash
GET /api/v2/skills

# Response
{
  "data": [
    { "id": "coding-assistant", "name": "Coding Assistant", ... },
    ...
  ]
}
```

### Execute Skill
```bash
POST /api/v2/execute
Content-Type: application/json

{
  "skillId": "coding-assistant",
  "input": {
    "task": "Write a function to merge two sorted arrays"
  }
}

# Response
{
  "success": true,
  "data": "function mergeSortedArrays(a, b) { ... }",
  "meta": {
    "skillId": "coding-assistant",
    "duration": 1234
  }
}
```

### Route Intent
```bash
POST /api/v2/route
Content-Type: application/json

{
  "text": "Help me design a microservices architecture"
}

# Response
{
  "skillId": "architect",
  "confidence": 0.92,
  "keywords": ["design", "architecture", "microservices"]
}
```

---

## 📝 Creating a Skill

Create a YAML file in `skills/`:

```yaml
# skills/my-skill.yaml
id: my-skill
name: My Custom Skill
version: 1.0.0
description: What this skill does

# Keywords for intent routing
keywords:
  - keyword1
  - keyword2

# Input validation schema
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

# Available tools
tools:
  - file_read
  - file_write
  - terminal_run
```

---

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Test specific skill
pnpm test -- tests/skills/coding-assistant.test.ts

# Validate skill YAML files
pnpm skills:validate
```

---

## 📊 Version Management

Skills OS uses auto-incrementing versions in `version.json`:

```json
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

## ⚠️ Codespace Safety

**NEVER run `pkill -f "node"` in GitHub Codespaces!**

It kills the VS Code connection. Use:
```bash
pnpm stop                  # Safe stop
pkill -f "tsx"             # Kill TypeScript runners
pkill -f "vite"            # Kill Vite
```

---

## 📚 Key Files

| File | Purpose |
|------|---------|
| `skills/*.yaml` | Skill definitions (THE SOURCE OF TRUTH) |
| `src/kernel/boot.ts` | Kernel entry point |
| `src/kernel/kernel.ts` | Skill execution engine |
| `src/kernel/registry.ts` | Skill registry |
| `src/kernel/router.ts` | Intent → Skill routing |
| `apps/web/src/AppV2.jsx` | Skills Shell UI |
| `apps/api/src/index.ts` | API server |
| `version.json` | System version |

---

## 🗂️ Directory Structure

```
TooLoo.ai/
├── skills/                    # 📦 YAML Skill Definitions
├── src/kernel/                # 🧠 The Kernel
├── apps/
│   ├── api/                   # 🌐 API Server
│   └── web/                   # 🖥️ Skills Shell
├── packages/                  # 📚 Shared packages
├── scripts/                   # 🔧 Dev scripts
├── version.json               # 📊 Version info
├── SKILLS_OS.md               # 📖 This file
└── package.json               # 📦 Dependencies
```

---

*Skills OS V1 - Genesis*
*Everything is a Skill*
