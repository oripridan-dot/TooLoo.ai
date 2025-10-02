# 🧠 TooLoo.ai PROJECT BRAIN
*Living Memory System - Last Updated: 2025-10-02*

---

## 🎯 PROJECT IDENTITY

**Name**: TooLoo.ai - Personal AI Development Assistant  
**Purpose**: Single-user AI toolkit that transforms ideas into working applications without coding  
**Owner**: Non-coder developer building professional applications through AI partnership  
**Vision**: Self-improving Meta-AI system that recursively enhances its own capabilities

---

## 📐 ARCHITECTURE DECISIONS

### Core Stack
- **Backend**: Node.js with `simple-api-server.js` (lightweight, reliable)
- **Frontend**: React-based web interface (`/web-app`)
- **AI Providers**: Multi-provider orchestration (DeepSeek, Claude, OpenAI, Gemini, Hugging Face)
- **Execution**: Sandboxed code execution with VM2
- **Storage**: Local-first, filesystem-based persistence

**Rationale**: Monorepo structure allows modular development while maintaining single-user simplicity.

### Key Architectural Patterns
1. **Self-Awareness System**: TooLoo can read/modify its own code via `self-awareness-manager.js`
2. **Filesystem Manager**: Direct file creation/manipulation capabilities
3. **Multi-Provider Routing**: Intelligent AI model selection per task type
4. **Learning Weights**: Tracks which AI models perform best for specific tasks

---

## 🔧 YOUR CODING PREFERENCES

### What Works Well
- **Iterative Development**: Build one perfect component before moving to next
- **AI-Augmented Workflow**: Heavy reliance on AI for code generation
- **Clear Documentation**: Extensive comments and README files
- **Modular Structure**: Separate concerns, avoid monolithic files
- **Safety-First**: Sandboxed execution, graceful error handling

### What You Avoid
- Complex abstractions (prefer clarity over cleverness)
- Over-engineering (build what's needed now, not what might be needed)
- Writing code manually (use AI to generate, you direct and refine)
- Paid services when free alternatives exist (e.g., Hugging Face over paid APIs when possible)

### Your Development Style
- **Non-traditional coder**: Systems thinker who directs AI rather than writes code
- **Quality-conscious**: Professional standards maintained throughout
- **Meta-focused**: Interested in building tools that build tools
- **Validation-driven**: Real metrics and measurable improvements required

---

## 🚫 ANTI-PATTERNS (Don't Suggest These)

### Known Failures
1. **Simulations over Real Implementations**: Always build real working code, not mock/placeholder solutions
2. **Browser-based AI limitations**: Rate limits, context loss, no code execution - that's why TooLoo exists
3. **Over-complicated API gateways**: Simple API server works better than complex routing layers
4. **Forgetting project context**: The core problem we're solving - AI must retain memory between sessions

### Common Copilot Mistakes to Reject
- Suggesting complex dependency injection when simple imports work
- Over-using TypeScript types when JavaScript clarity suffices
- Recommending microservices for single-user applications
- Adding authentication layers (single-user system)

---

## 🎪 ACTIVE MODULES & STATUS

### ✅ Completed & Working
- `simple-api-server.js` - Main backend (PORT 3001)
- `self-awareness-manager.js` - Code introspection system
- `filesystem-manager.js` - File operations
- Web interface with real-time chat
- Multi-provider AI orchestration
- Basic learning weights system

### 🚧 In Development
- **Project Memory System** (THIS FILE) - Implementing now
- Pattern Library for reusable solutions
- Decision logging system
- Enhanced self-improvement loop

### 📋 Planned
- Ollama integration for local AI models
- Advanced learning accumulator
- Automated pattern extraction from successful code
- Performance metrics tracking dashboard

---

## 🧩 COMMON PATTERNS (Your Solutions)

### AI Provider Selection Strategy
```javascript
// Use this decision tree:
- Quick code generation → DeepSeek (cost-effective)
- Complex reasoning → Claude (best for architecture)
- General purpose → GPT-4 (reliable baseline)
- Creative solutions → Gemini
- Free tier testing → Hugging Face
```

### File Structure Pattern
```
ProjectName/
├── index.html          # Main entry point
├── app.js              # Core logic
├── styles.css          # Styling (if needed)
├── README.md           # Documentation
└── test.html           # Testing interface (optional)
```

### Error Handling Pattern
```javascript
// Always wrap AI calls and file operations:
try {
  const result = await riskyOperation();
  return { success: true, data: result };
} catch (error) {
  console.error('Context:', error.message);
  return { 
    success: false, 
    error: error.message,
    fallback: 'safe default behavior'
  };
}
```

---

## 🔍 CURRENT CHALLENGES

### Active Issues
1. **Context Loss**: Copilot forgets project between sessions → Solving with this memory system
2. **TooLoo Self-Improvement**: System can't learn from past successes → Building learning accumulator
3. **Repetitive Problems**: Same bugs recurring → Creating anti-pattern library
4. **Time/Budget Waste**: Re-explaining project context → Implementing auto-briefing system

### Blockers & Solutions
- **Blocker**: GitHub Copilot has no project memory
  - **Solution**: Create `.github/copilot-instructions.md` that auto-loads this brain

- **Blocker**: TooLoo generates code but doesn't learn from outcomes
  - **Solution**: Implement feedback loop with performance metrics file

---

## 📊 PERFORMANCE METRICS

### Current Baseline (to improve upon)
- **Context Re-explanation Time**: ~15 min per session
- **Repeat Problem Rate**: ~30% of issues are recurring
- **First-Try Success Rate**: ~40% of generated code works immediately
- **Time to Working Prototype**: ~2-4 hours per feature

### Target Improvements (30 days)
- Context loading: < 2 minutes
- Repeat problems: < 10%
- First-try success: > 70%
- Time to prototype: < 1 hour

---

## 🎓 LEARNING LOG

### Successful Patterns Discovered
*Updated as new patterns prove effective*

1. **Date**: 2025-10-02
   - **Pattern**: Using PROJECT_BRAIN.md as persistent context
   - **Result**: Should reduce context-loading time significantly
   - **Application**: All future AI sessions start by reading this file

### Failed Experiments
*Document what didn't work so AI doesn't suggest it again*

1. **Date**: [Previous attempts]
   - **What Failed**: [Specific approach]
   - **Why**: [Root cause]
   - **Lesson**: [What to do instead]

---

## 🚀 QUICK START INSTRUCTIONS (For AI)

### When Starting Any Session:
1. **READ THIS FILE FIRST** - You now have full project context
2. Check DECISIONS.log for recent changes
3. Review /patterns directory for proven solutions
4. Consult DONT_DO_THIS.md before suggesting solutions
5. Update this file with new learnings before ending session

### Context Package Template:
```
PROJECT: TooLoo.ai
GOAL: [What you're building now]
RECENT CHANGES: [Last 3 commits or sessions]
CURRENT BLOCKER: [The specific issue]
ATTEMPTED: [What's already been tried]
RELEVANT PATTERNS: [Link to /patterns/*.md if applicable]
```

---

## 🔗 RELATED DOCUMENTATION

- `DECISIONS.log` - Chronological decision history
- `/patterns/*.md` - Reusable code solutions
- `DONT_DO_THIS.md` - Anti-patterns and failed approaches
- `.github/copilot-instructions.md` - Copilot auto-load instructions
- `DAILY_FOCUS.md` - Current session goals

---

## 📝 NOTES & REMINDERS

### For AI Assistants:
- This is a **single-user system** - no auth, no multi-tenancy
- Owner is **non-coder** - explain technical concepts clearly
- Focus on **working solutions** over theoretical perfection
- Always **measure and validate** - no placeholder code
- This file is **living documentation** - update it as project evolves

### For Future You:
- Trust this system - it prevents repeating solved problems
- Update logs immediately after discoveries
- Quality over speed - perfect one thing before moving on
- The goal is building tools that build tools (Meta-AI vision)

---

**This is your project's persistent memory. Keep it updated, and every future session starts with full context.**
