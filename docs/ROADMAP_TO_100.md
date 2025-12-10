# TooLoo.ai Roadmap: 60% → 100%

> **Current Status**: 60% Complete (as of January 2025)
> **Target**: Production-ready autonomous development platform

---

## 📊 Current State Overview

### ✅ What's REAL (Phase 1 + 2a-c Complete)

| System | Status | Evidence |
|--------|--------|----------|
| 🧠 **Orchestrator** | 100% | `src/cortex/orchestrator.ts` - handles task routing |
| 📊 **DAG Builder** | 100% | `src/cortex/agent/system-hub.ts` - task decomposition |
| 💾 **Artifact Ledger** | 100% | `src/cortex/agent/artifact-manager.ts` - version tracking |
| 🔀 **LLM Routing** | 100% | `src/precog/providers/` - multi-provider support |
| 🌐 **API Server** | 100% | Express + Socket.IO on port 4000 |
| 📋 **Contract Enforcement** | 100% | 271 Zod schemas enforced at runtime |
| 👁️ **Vision Service** | 80% | `src/cortex/vision/screen-capture-service.ts` |
| 🛡️ **QA Guardian** | 100% | Autonomous fixing with contract awareness |

### ❌ What's MISSING (Phase 2d-e)

| System | Status | Gap |
|--------|--------|-----|
| 🖥️ **Workstation UI** | 0% | Need 4-panel layout |
| 🤖 **Repo Auto-Org** | 0% | Auto branch/commit/scope detection |
| 🔗 **Vision→Orchestrator** | Not wired | Service exists but unused |

---

## 🗺️ Roadmap to 100%

### Phase A: Give it Sight (Week 1-2) 
**Goal**: Connect ScreenCaptureService to Orchestrator

**Current State**:
- ✅ `ScreenCaptureService` exists at `src/cortex/vision/screen-capture-service.ts`
- ✅ REST API exposed at `/api/v1/vision/*`
- ❌ Orchestrator doesn't use vision for context

**Action Items**:
1. Add `vision:context_request` event handler in orchestrator
2. Before complex tasks, orchestrator requests screen context
3. OCR results feed into prompt construction
4. Emit `vision:context_used` events for telemetry

**Files to Modify**:
```
src/cortex/orchestrator.ts     # Add vision integration
src/main.ts                     # Initialize vision service
```

**Success Criteria**:
- [ ] Orchestrator can request current screen context
- [ ] Vision results appear in task logs
- [ ] OCR text included in LLM prompts for code review tasks

---

### Phase B: Give it a Face (Week 3-4)
**Goal**: Build the Workstation UI with 4 panels

**Required Panels**:

1. **Task Board Panel** (DAG Visualization)
   - Show current task decomposition tree
   - Status indicators (pending/running/complete)
   - Estimated time remaining
   
2. **Chat Panel** (Intent Bus Interface)
   - Natural language input
   - Shows model responses
   - Command palette integration
   
3. **Context Panel** (Vision Display)
   - Current screen capture preview
   - OCR extracted text
   - Highlighted regions of interest
   
4. **Artifacts Panel** (Ledger Browser)
   - File tree of generated artifacts
   - Version history timeline
   - Diff viewer

**Files to Create**:
```
src/web-app/src/components/Workstation/
├── Workstation.tsx           # Main 4-panel layout
├── TaskBoard.tsx             # DAG visualization
├── ChatPanel.tsx             # Upgraded chat
├── ContextPanel.tsx          # Vision context display
├── ArtifactsPanel.tsx        # Artifact ledger viewer
└── index.ts
```

**Success Criteria**:
- [ ] Single unified view for daily work
- [ ] Real-time DAG updates via Socket.IO
- [ ] Vision context visible in UI
- [ ] Artifact history browsable

---

### Phase C: Give it Hands (Week 5-6)
**Goal**: Enable autonomous repository operations

**Capabilities Needed**:

1. **Scope Detection**
   - Analyze file changes to determine affected modules
   - Auto-categorize as feature/fix/refactor
   
2. **Branch Management**
   - Auto-create feature branches
   - Naming convention: `feature/tooloo-{task-id}`
   
3. **Commit Automation**
   - Generate commit messages from DAG context
   - Group related changes
   - Conventional commits format

4. **PR Preparation**
   - Auto-generate PR description
   - Link to task DAG
   - Include test coverage report

**Files to Create**:
```
src/cortex/motor/repo-auto-org.ts     # Repository automation
src/cortex/motor/git-operations.ts    # Git primitives
src/cortex/motor/scope-detector.ts    # Change analysis
```

**Success Criteria**:
- [ ] Can create branches from task context
- [ ] Generates meaningful commit messages
- [ ] Prepares PR descriptions automatically

---

## 📈 Progress Tracking

| Phase | Milestone | Status | ETA |
|-------|-----------|--------|-----|
| A.1 | Vision event handlers in orchestrator | ⬜ Not Started | Week 1 |
| A.2 | Vision results in task logs | ⬜ Not Started | Week 1 |
| A.3 | OCR in LLM prompts | ⬜ Not Started | Week 2 |
| B.1 | Workstation layout skeleton | ⬜ Not Started | Week 3 |
| B.2 | TaskBoard with DAG viz | ⬜ Not Started | Week 3 |
| B.3 | ChatPanel upgrade | ⬜ Not Started | Week 4 |
| B.4 | ContextPanel with vision | ⬜ Not Started | Week 4 |
| B.5 | ArtifactsPanel with history | ⬜ Not Started | Week 4 |
| C.1 | Scope detector | ⬜ Not Started | Week 5 |
| C.2 | Branch automation | ⬜ Not Started | Week 5 |
| C.3 | Commit automation | ⬜ Not Started | Week 6 |
| C.4 | PR preparation | ⬜ Not Started | Week 6 |

---

## 🎯 Definition of 100% Complete

The system is "100% Real" when:

1. **Autonomous Task Execution**: Can receive a natural language request, break it into steps, execute them with vision context, and produce artifacts—all without human intervention
2. **Full Self-Service UI**: A developer can use TooLoo.ai daily through the Workstation UI without CLI
3. **Repository Integration**: Changes are automatically organized into branches, commits, and PRs
4. **Feedback Loop**: QA Guardian monitors all operations and proposes improvements

---

*Last Updated: January 20, 2025*
