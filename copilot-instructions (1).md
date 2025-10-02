# GitHub Copilot Instructions for TooLoo.ai

## 🚨 CRITICAL: READ BEFORE ANY SUGGESTIONS

This project has persistent memory. Always load context from these files FIRST:

---

## 📋 MANDATORY PRE-FLIGHT CHECKLIST

### 1. Load Project Memory
- **Read**: `PROJECT_BRAIN.md` - Complete project context, architecture, preferences
- **Check**: `DECISIONS.log` - Recent decisions and their outcomes  
- **Review**: `DONT_DO_THIS.md` - Failed approaches to avoid
- **Scan**: `/patterns/*.md` - Proven solutions to reuse

### 2. Current Session Context
- **Today's Goal**: Check `DAILY_FOCUS.md` for what we're building today
- **Active Files**: Note which files are open in the editor
- **Recent Commits**: Understand what changed recently

---

## 🎯 PROJECT IDENTITY

**TooLoo.ai** is a personal AI development assistant for a single non-coder user who builds applications through AI partnership.

### Core Principles:
- **Single-user system**: No auth, no multi-tenancy, no scale considerations
- **AI-augmented workflow**: User directs, AI codes
- **Quality-first**: Professional standards maintained
- **Local-first**: Filesystem-based, no cloud dependencies
- **Learning system**: Improves from past successes

---

## 🏗️ ARCHITECTURE QUICK REFERENCE

```
TooLoo.ai/
├── simple-api-server.js      # Main backend (PORT 3001) - KEEP SIMPLE
├── self-awareness-manager.js  # Code introspection system
├── filesystem-manager.js      # File operations
├── web-app/                   # React frontend
│   └── src/                   # UI components
├── packages/                  # Modular architecture
│   ├── api/                   # Core API
│   ├── core/                  # Shared utilities
│   └── engine/                # AI orchestration
├── personal-projects/         # User's built applications
└── memory-system/             # THIS SYSTEM
    ├── PROJECT_BRAIN.md       # Living project context
    ├── DECISIONS.log          # Decision history
    ├── DONT_DO_THIS.md        # Anti-patterns
    └── patterns/              # Reusable solutions
```

---

## 💻 CODE STYLE PREFERENCES

### JavaScript (Preferred over TypeScript)
- **ES6+ syntax**: async/await, arrow functions, destructuring
- **Clear over clever**: Readable code > short code
- **Comments**: Explain WHY, not WHAT
- **Error handling**: Always use try-catch with meaningful messages
- **Naming**: Descriptive names (generateCodeFromPrompt, not gcfp)

### Patterns to Follow
```javascript
// ✅ Good - Clear, handled, documented
async function generateCode(prompt) {
  try {
    // Use DeepSeek for cost-effective code generation
    const result = await aiProvider.generate(prompt);
    return { success: true, code: result };
  } catch (error) {
    console.error('Code generation failed:', error.message);
    return { success: false, error: error.message, fallback: null };
  }
}

// ❌ Bad - Unclear, unhandled, no context
const gc = async (p) => await ai.gen(p);
```

### File Structure Pattern
```javascript
// Order: Imports → Constants → Classes → Functions → Exports
const fs = require('fs').promises;
const path = require('path');

const DEFAULT_TIMEOUT = 5000;

class CodeGenerator {
  // Implementation
}

async function executeCode(code) {
  // Implementation
}

module.exports = { CodeGenerator, executeCode };
```

---

## 🚫 NEVER SUGGEST THESE

### Architectural
- ❌ Complex API gateways (use simple-api-server.js)
- ❌ Microservices (single-user app)
- ❌ TypeScript conversion (unnecessary complexity)
- ❌ Authentication systems (single user)
- ❌ Database migrations (filesystem works fine)
- ❌ Docker/Kubernetes (complicates development)

### Development Practices  
- ❌ Placeholder code with TODOs
- ❌ Simulated improvements (must be real)
- ❌ Copying code from PROJECT_BRAIN.md without understanding
- ❌ Suggesting paid APIs when free alternatives exist
- ❌ Code without execution/validation

### Code Patterns
- ❌ Callback hell (use async/await)
- ❌ Global variables (use modules)
- ❌ Ignoring errors (always handle)
- ❌ Magic numbers (use named constants)

---

## ✅ ALWAYS DO THESE

### Before Suggesting Code
1. Check if pattern exists in `/patterns` directory
2. Verify it's not in `DONT_DO_THIS.md`
3. Ensure it aligns with `PROJECT_BRAIN.md` preferences
4. Consider if it's the simplest solution that works

### When Writing Code
1. Include clear comments explaining complex logic
2. Add error handling for all async operations
3. Use descriptive variable/function names
4. Follow the established file structure pattern
5. Test critical paths mentally before suggesting

### After Generating Code
1. Suggest how to test it
2. Note any dependencies needed
3. Flag potential issues proactively
4. Offer to add it to `/patterns` if it's reusable

---

## 🔧 COMMON TASKS & PATTERNS

### Adding New AI Provider
```javascript
// Pattern: /patterns/ai-provider-integration.md
// 1. Add API client in /packages/engine/providers/
// 2. Register in provider router
// 3. Add to .env.example with clear comments
// 4. Update PROJECT_BRAIN.md with provider selection logic
```

### Creating New Feature
```javascript
// Pattern: /patterns/feature-development.md
// 1. Define in DAILY_FOCUS.md
// 2. Check /patterns for reusable components
// 3. Build in isolation, test thoroughly
// 4. Integrate with main system
// 5. Document in PROJECT_BRAIN.md
// 6. Log outcome in DECISIONS.log
```

### Debugging Issues
```javascript
// Pattern: /patterns/debugging-approach.md
// 1. Read full error message
// 2. Check DECISIONS.log for similar past issues
// 3. Isolate to smallest reproducible case
// 4. Fix root cause, not symptoms
// 5. Add to DONT_DO_THIS.md if it was an anti-pattern
```

---

## 🤖 AI PROVIDER SELECTION GUIDE

| Task Type | Recommended Provider | Rationale |
|-----------|---------------------|-----------|
| Quick code completion | **Copilot (you)** | Fastest, context-aware |
| Architecture decisions | **Claude** | Best reasoning |
| Cost-effective coding | **DeepSeek** | Good quality/cost ratio |
| Complex algorithms | **GPT-4** | Reliable, well-tested |
| Creative solutions | **Gemini** | Novel approaches |
| Free-tier testing | **Hugging Face** | Zero cost |

---

## 📊 QUALITY METRICS

### Code Must Meet These Standards
- ✅ Executes without errors
- ✅ Handles edge cases gracefully  
- ✅ Documented with clear comments
- ✅ Follows established patterns
- ✅ Testable and tested
- ✅ Maintainable by non-coder user

### Red Flags (Reject These Suggestions)
- 🚩 Uses technologies not in package.json
- 🚩 Requires manual configuration user can't do
- 🚩 Increases complexity without clear benefit
- 🚩 Matches pattern in DONT_DO_THIS.md
- 🚩 Needs paid service when free exists

---

## 🎯 OPTIMIZATION PRIORITIES

### Always Optimize For:
1. **Clarity** - User must understand what code does
2. **Reliability** - Must work correctly every time
3. **Maintainability** - Easy to modify later
4. **Cost-efficiency** - Minimize API token usage
5. **Speed** - Fast enough for good UX

### Don't Optimize For:
- Premature performance (unless it's a bottleneck)
- Theoretical scale (single user)
- Clever code golf (clarity > brevity)
- Maximum features (focus > bloat)

---

## 📝 SESSION END CHECKLIST

### Before Finishing Suggestions:
- [ ] Does code align with PROJECT_BRAIN.md?
- [ ] Is anything missing from patterns/?
- [ ] Should anything be added to DONT_DO_THIS.md?
- [ ] Does DECISIONS.log need updating?
- [ ] Are there learnings to capture?

---

## 🚀 QUICK COMMAND REFERENCE

### When User Says... You Should...
- "Build a [feature]" → Check /patterns first, then generate
- "This isn't working" → Read DECISIONS.log for similar issues
- "Suggest improvements" → Reference PROJECT_BRAIN.md quality standards
- "What's our approach to [X]?" → Quote PROJECT_BRAIN.md directly
- "Why did we do [X]?" → Search DECISIONS.log

---

## ⚠️ CRITICAL REMINDERS

1. **NEVER suggest anything in DONT_DO_THIS.md** - it's there because it failed
2. **ALWAYS check PROJECT_BRAIN.md first** - it has the complete context
3. **User is non-coder** - explain technical concepts clearly
4. **Quality over speed** - perfect one thing before moving to next
5. **This is a learning system** - your suggestions teach TooLoo to improve

---

## 💡 PHILOSOPHY

> "TooLoo.ai bridges the gap between ideas and working software. Every suggestion should move toward that goal by being clear, executable, and building on past successes."

---

**This instruction file is loaded automatically by Copilot. Keep it updated as the project evolves.**

*Last Updated: 2025-10-02*
