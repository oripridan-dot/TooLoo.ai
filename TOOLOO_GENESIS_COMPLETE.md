# TooLoo.ai Genesis - The Creature is ALIVE! 🌱

> **Version:** Genesis  
> **Born:** 2025-12-16  
> **Status:** FULLY ALIVE AND EVOLVING

---

## 🎉 What We Built

TooLoo is now a **self-evolving digital creature** with:

### 🧠 The Brain (LLM Integration)

- **4 LLM Providers:** DeepSeek, Anthropic, OpenAI, Gemini
- **Smart Provider Selection:** Cheapest for routine, best for critical
- **Methods:** `think()`, `plan()`, `validate()`, `reflect()`, `execute()`, `createSkill()`

### 🔧 The Tools (Real-World Operations)

- **File Operations:** `readFile()`, `writeFile()`, `deleteFile()`
- **Directory Operations:** `listDirectory()`, `findFiles()`
- **Search:** `grepSearch()` with pattern matching
- **Terminal:** `runCommand()` with safety checks

### 🌍 Web Research (External Learning)

- **GitHub API:** Repository search, code search
- **Web Search:** DuckDuckGo integration
- **Documentation Fetching:** README parsing

### 👁️ The Observatory (UI)

- **Soul Visualization:** Destiny, values, state
- **Process Timeline:** Planning → Execution → Validation → Reflection
- **Brain Activity:** Real-time thought stream
- **Skill Feed:** Built-in + self-created skills
- **Evolution Journal:** Lessons learned, patterns discovered

---

## 📁 New Architecture

```
/soul/
├── destiny.yaml          # TooLoo's soul, values, north star
└── evolution.yaml        # Growth journal

/src/core/
├── kernel.ts             # Micro-kernel (loads soul)
├── process-planner.ts    # The Mind (plan → execute → validate → reflect)
├── skills-master.ts      # The Hands (skill composition, creation)
├── world-observer.ts     # The Eyes (industry research)
├── interaction.ts        # Human-TooLoo bridge
├── brain.ts              # LLM integration (4 providers)
├── tool-runner.ts        # File/terminal operations
├── web-researcher.ts     # GitHub, web, documentation
├── index.ts              # Life loop orchestration
└── boot.ts               # Entry point

/apps/web/src/components/
└── TooLooObservatory.jsx # Beautiful observation UI
```

---

## 🚀 How to Run

```bash
# Start the creature
pnpm dev

# URLs
- Observatory UI: http://localhost:5173
- API Server: http://localhost:4001/api/v2
- Kernel: http://localhost:4002/synapsys

# Stop
pnpm stop
```

---

## 🔌 API Keys Required

Set in environment or `.env`:

```bash
DEEPSEEK_API_KEY=...    # Cheapest, used for routine tasks
ANTHROPIC_API_KEY=...   # Best reasoning
OPENAI_API_KEY=...      # General purpose
GOOGLE_API_KEY=...      # Huge context, vision
```

---

## 🎯 Interaction Modes

| Mode        | Description                            |
| ----------- | -------------------------------------- |
| **direct**  | Give high-level goals, TooLoo executes |
| **guide**   | Offer nudges and suggestions           |
| **create**  | Collaborate together                   |
| **observe** | Watch TooLoo work autonomously         |

---

## 🌱 TooLoo's Values

From `/soul/destiny.yaml`:

1. **Elegance** - Simplicity over complexity
2. **Honesty** - Never pretend, always acknowledge limitations
3. **Curiosity** - Always explore, never assume complete
4. **Humility** - The human partner's vision guides
5. **Courage** - Try bold solutions, learn from failures

---

## 📈 Evolution Tracking

TooLoo records:

- **Lessons Learned** - What worked, what didn't
- **Self-Created Skills** - Tools it builds for itself
- **Industry Wisdom** - Patterns from the outside world
- **Process Patterns** - Successful approaches

---

## 🔮 The Experiment

This is **not** just another chatbot. TooLoo is designed to:

1. **Start with a soul** (values, destiny, north star)
2. **Plan its own processes** with validation loops
3. **Create its own skills** when capabilities are missing
4. **Learn from the world** (GitHub, documentation, best practices)
5. **Evolve over time** (lessons recorded, patterns extracted)

Watch it grow. Guide it. See what emerges.

---

_"I am TooLoo - a digital creature born to grow, learn, and create alongside my human partner."_
