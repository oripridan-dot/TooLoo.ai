# TooLoo.ai Skills OS

> **Version:** 1.0.0 | **Codename:** Genesis  
> *Everything is a Skill*

A pure skill-based AI execution platform where the UI doesn't know what "Chat" is - it asks the Kernel "What can I do?"

## 🧠 The Philosophy

| Traditional Approach | Skills OS |
|---------------------|-----------|
| Hardcoded menu items | Dynamic UI from skill registry |
| Routes for each feature | Single execute endpoint |
| Add code for new features | Add YAML for new skills |
| Tightly coupled | Loosely coupled |

## 🚀 Quick Start

```bash
# Start Skills OS
pnpm dev

# Stop Skills OS  
pnpm stop

# Check health
pnpm health

# List skills
pnpm skills:list
```

**URLs:**
- 🖥️ Skills Shell: http://localhost:5173
- 🔌 API Server: http://localhost:4001/api/v2
- 🧠 Kernel: http://localhost:4002/synapsys

## 📁 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     SKILLS SHELL (UI)                           │
│                   apps/web - Port 5173                          │
│         "What skills do I have?" → Render dynamic UI            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API SERVER                               │
│                    apps/api - Port 4001                         │
│  /api/v2/skills  |  /api/v2/execute  |  /api/v2/route          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                          KERNEL                                 │
│                    src/kernel - Port 4002                       │
│       Registry → Router → Executor → Result                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SKILL DEFINITIONS                            │
│                      skills/*.yaml                              │
│  coding-assistant | architect | research-analyst | ...          │
└─────────────────────────────────────────────────────────────────┘
```

## 📦 Available Skills

| Skill | Description |
|-------|-------------|
| `coding-assistant` | TypeScript/Node.js expert |
| `architect` | System design & patterns |
| `research-analyst` | Research & analysis |
| `documentation-writer` | Technical docs |
| `test-generator` | Unit & integration tests |
| `refactoring-expert` | Code optimization |
| `code-reviewer` | Code review |

## 🔌 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v2/health` | GET | System health |
| `/api/v2/skills` | GET | List all skills |
| `/api/v2/execute` | POST | Execute a skill |
| `/api/v2/route` | POST | Route intent to skill |
| `/api/v2/chat` | POST | Chat (uses skills) |

## 📝 Creating Skills

Create a YAML file in `skills/`:

```yaml
# skills/my-skill.yaml
id: my-skill
name: My Custom Skill
version: 1.0.0
description: What this skill does

keywords:
  - keyword1
  - keyword2

schema:
  type: object
  properties:
    task:
      type: string
  required: [task]

instructions: |
  You are an expert at...
```

## 🧪 Testing

```bash
pnpm test                    # All tests
pnpm skills:validate         # Validate YAML files
```

## 📁 Project Structure

```
TooLoo.ai/
├── skills/              # 📦 YAML Skill Definitions (SOURCE OF TRUTH)
├── src/kernel/          # 🧠 The Kernel
├── apps/
│   ├── api/             # 🌐 API Server (port 4001)
│   └── web/             # 🖥️ Skills Shell (port 5173)
├── packages/            # 📚 @tooloo/* packages
├── version.json         # 📊 Auto-incrementing version
└── SKILLS_OS.md         # 📖 Full documentation
```

## ⚠️ Codespace Safety

**NEVER run `pkill -f "node"` in Codespaces!** Use `pnpm stop` instead.

## 📚 Documentation

- [SKILLS_OS.md](SKILLS_OS.md) - Full system documentation
- [.github/copilot-instructions.md](.github/copilot-instructions.md) - AI assistant guide

---

*Skills OS V1 - Genesis*  
*Everything is a Skill*
