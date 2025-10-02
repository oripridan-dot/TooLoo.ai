# 🚫 ANTI-PATTERNS & FAILED APPROACHES
*Solutions that seemed good but didn't work - so AI doesn't suggest them again*

---

## Purpose
This document prevents wasting time on approaches that have already failed. When AI suggests something listed here, it should be immediately rejected with reference to why it failed.

---

## ❌ ARCHITECTURE ANTI-PATTERNS

### Don't: Complex API Gateway Layer
**What it looks like**: Multiple routing layers, complex middleware chains, over-abstracted request handlers

**Why it fails**: 
- TooLoo is single-user - complexity adds no value
- Debugging becomes nightmare
- simple-api-server.js works perfectly for our needs

**Do instead**: Keep using the simple, direct API server pattern

---

### Don't: Over-Engineering for Scale
**What it looks like**: Load balancers, database sharding, microservices, container orchestration

**Why it fails**:
- Single user = no scale requirements
- Adds maintenance burden
- Distracts from core functionality

**Do instead**: Build for current needs, not hypothetical future scale

---

### Don't: Complex State Management
**What it looks like**: Redux, MobX, or similar state libraries for simple UIs

**Why it fails**:
- Overkill for single-user application
- Adds learning curve and boilerplate
- React's built-in state handles everything we need

**Do instead**: Use React useState/useContext for state management

---

## ❌ AI PROVIDER ANTI-PATTERNS

### Don't: Rely on Single Provider
**What it looks like**: All requests going to one AI service

**Why it fails**:
- Rate limits block development
- Single point of failure
- Not optimizing cost/quality per task

**Do instead**: Use multi-provider routing with task-specific selection

---

### Don't: Ignore Free Tier Options
**What it looks like**: Always defaulting to paid APIs

**Why it fails**:
- Unnecessary costs for testing/iteration
- Hugging Face works great for many tasks
- Budget waste

**Do instead**: Default to free tier (Hugging Face), upgrade only when needed

---

### Don't: Send Full Context Every Time
**What it looks like**: Passing entire project files with every API request

**Why it fails**:
- Token waste = cost waste
- Slower responses
- Hits context limits quickly

**Do instead**: Use summarized context + relevant code snippets only

---

## ❌ CODE GENERATION ANTI-PATTERNS

### Don't: Generate Without Execution
**What it looks like**: AI writes code but doesn't test it

**Why it fails**:
- 60%+ of generated code has bugs on first try
- Wastes time debugging later
- Breaks trust in AI suggestions

**Do instead**: Always execute and validate generated code immediately

---

### Don't: Ignore Performance Metrics
**What it looks like**: Not measuring execution time, memory usage, or complexity

**Why it fails**:
- Can't track if TooLoo is improving
- No data to guide learning system
- Accepting "works" instead of "works well"

**Do instead**: Capture metrics on every code execution, feed into learning system

---

### Don't: Accept Placeholder Code
**What it looks like**: Comments like `// TODO: implement this` or `// API call goes here`

**Why it fails**:
- Not real working code
- Defeats purpose of AI code generation
- User is non-coder - can't fill in placeholders

**Do instead**: Demand complete, executable implementations

---

## ❌ LEARNING SYSTEM ANTI-PATTERNS

### Don't: Simulate Improvements
**What it looks like**: Mock data showing "82% improvement" without real code generation

**Why it fails**:
- Doesn't prove the concept actually works
- No real learning happens
- Wastes time on fake results

**Do instead**: Always use real AI APIs and real code execution to measure improvements

---

### Don't: Forget Past Learnings
**What it looks like**: Each session starting from zero context

**Why it fails**:
- Repeats same mistakes
- Wastes time re-explaining
- No cumulative improvement

**Do instead**: Persistent memory system (PROJECT_BRAIN.md, DECISIONS.log, this file)

---

### Don't: Ignore Pattern Recognition
**What it looks like**: Solving same problem differently each time

**Why it fails**:
- Doesn't leverage proven solutions
- Reinventing the wheel constantly
- No efficiency gains

**Do instead**: Extract successful patterns to `/patterns` directory

---

## ❌ WORKFLOW ANTI-PATTERNS

### Don't: Manual Context Loading
**What it looks like**: Typing project description into AI chat every session

**Why it fails**:
- 15+ minutes wasted per session
- Inconsistent context
- High error rate from manual entry

**Do instead**: Auto-load context from PROJECT_BRAIN.md at session start

---

### Don't: Treat AI as Search Engine
**What it looks like**: Asking AI to find documentation or explain basic concepts

**Why it fails**:
- AI already knows this stuff
- Wastes API calls
- Slower than reading docs directly

**Do instead**: Use AI for code generation, architecture decisions, problem-solving

---

### Don't: Ignore Tool Specialization
**What it looks like**: Using same tool (Copilot) for every task type

**Why it fails**:
- Some AIs better at certain tasks
- Copilot bad at architecture, great at inline code
- Missing optimization opportunities

**Do instead**: Follow Tier 3 delegation strategy - right tool for right job

---

## ❌ DEVELOPMENT PRACTICE ANTI-PATTERNS

### Don't: Build Without Testing
**What it looks like**: Generating multiple features before testing any

**Why it fails**:
- Compounds errors
- Hard to isolate bugs
- Violates "one perfect component before next" principle

**Do instead**: Build → Test → Validate → Next component

---

### Don't: Skip Documentation
**What it looks like**: Code without comments, README, or inline explanations

**Why it fails**:
- Future you can't understand it
- AI can't learn from it
- Makes debugging impossible

**Do instead**: AI should generate documentation alongside code

---

### Don't: Ignore Error Messages
**What it looks like**: Trying random solutions without reading actual error

**Why it fails**:
- Wastes time on wrong problems
- Misses root cause
- Creates technical debt

**Do instead**: Always read full error, understand it, then solve systematically

---

## ❌ GITHUB COPILOT SPECIFIC

### Don't: Accept First Suggestion Blindly
**What it looks like**: Hitting Tab on every Copilot suggestion without review

**Why it fails**:
- Often suggests anti-patterns listed in this file
- Doesn't know project-specific context
- Can introduce security issues

**Do instead**: Review suggestion against PROJECT_BRAIN.md and this file first

---

### Don't: Ask Copilot for Architecture
**What it looks like**: "design my entire application structure"

**Why it fails**:
- Copilot is code completion, not architect
- Gives generic, often wrong, structure
- Misses project-specific requirements

**Do instead**: Use Claude or GPT-4 for architecture, Copilot for code completion

---

## 🎯 COMMON COPILOT SUGGESTIONS TO REJECT

| Suggestion | Why It's Wrong | Do This Instead |
|------------|----------------|-----------------|
| Add TypeScript | Unnecessary complexity | Keep JavaScript with JSDoc |
| Use Express Router | Overkill for simple server | Direct route handlers |
| Add JWT auth | Single user, no need | No authentication |
| Use MongoDB | Filesystem works fine | Local JSON/file storage |
| Add Docker | Complicates development | Run natively |
| Use Webpack | Modern bundlers simpler | Vite or native ESM |
| Add testing framework | Good idea but... | Only after core works |

---

## 📝 HOW TO USE THIS DOCUMENT

### For AI Assistants:
1. Check this file BEFORE suggesting solutions
2. If your suggestion matches an anti-pattern, propose the alternative instead
3. Add new anti-patterns as they're discovered

### For Development Sessions:
1. When stuck, check if the problem is from an anti-pattern
2. When AI suggests something that feels wrong, check this file
3. Update this file when discovering new anti-patterns

### For Code Review:
1. Does the code match any anti-patterns?
2. Is there a "do instead" alternative that fits?
3. Document new anti-patterns discovered during review

---

## 🔄 MAINTENANCE

**Update this file when**:
- A suggested approach fails after trying it
- Common mistakes emerge from sessions
- AI repeatedly suggests something inappropriate
- You waste time on same wrong path multiple times

**Keep it actionable**: 
- Specific anti-pattern description
- Clear reason why it fails
- Concrete alternative solution

---

**Remember: Mistakes are valuable IF we don't repeat them. This file is how we remember.**
