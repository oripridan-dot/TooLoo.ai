# TooLoo.ai Legacy File Audit Report

Generated: 2025-11-27

## Summary

**Total HTML Files**: 80+  
**Total JS Files**: 15+ (non-node_modules, non-dist)  
**Status**: Extensive duplication detected - should consolidate to React/TypeScript

---

## Critical Files (In Active Use)

### Main Chat Interface
- **`chat-pro-v2.html`** ✅ - **ACTIVE** (v2.1.369, latest version with API_BASE fix)
- `chat-pro.html` - **LEGACY** (older version, replaced by v2)

### Primary Control Room
- **`control-room.html`** ✅ - **ACTIVE** (primary dashboard)
- `control-room-modern.html` - **LEGACY**
- `control-room-awareness.html` - **LEGACY**

### System Dashboards (Active)
- **`system-awareness.html`** ✅ - **ACTIVE**
- **`intelligence-dashboard.html`** ✅ - **ACTIVE**
- **`smart-intelligence-analytics-dashboard.html`** ✅ - **ACTIVE**

---

## Legacy HTML Files (Candidates for Archival)

### In `_legacy/` Directory (32 files)
These are already isolated and can be deleted:
```
_legacy/brain-tester.html
_legacy/control-room-clarity.html
_legacy/control-room-home.html
_legacy/control-room-minimal.html
_legacy/control-room-redesigned.html
_legacy/control-room-smart.html
_legacy/conversation-tester.html
_legacy/demo.html
_legacy/design-demo.html
_legacy/formatter-test.html
_legacy/index-modern.html
_legacy/layout-test.html
_legacy/product-page-demo.html
_legacy/response-formatter-demo.html
_legacy/response-formatter-test.html
_legacy/segmentation-demo.html
_legacy/smart-intelligence-chat-demo.html
_legacy/test-design-studio.html
_legacy/tooloo-hub.html
_legacy/tooloo-interface.html
_legacy/tooloo-showcase.html
_legacy/tooloo-unified.html
_legacy/visualization-demo.html
_legacy/workspace.html
_legacy/workspace-old.html
_legacy/workstation-v2.html
```
**RECOMMENDATION**: Delete all files in `_legacy/` directory

### Root-Level Duplicates (Should Be Archival Candidates)
```
analytics-dashboard.html (replaced by smart-intelligence-analytics-dashboard.html)
asap-mastery.html (legacy)
capabilities-dashboard.html (legacy)
capability-activation.html (modern replacement exists)
chat-pro.html (replaced by chat-pro-v2.html) ⚠️
coding-ide.html (single instance, purpose unclear)
command-center.html (redundant with control-room.html)
control-dashboard.html (redundant with control-room.html)
control-room-modern.html (redundant with control-room.html) ⚠️
conversation.html (legacy)
dashboard.html (redundant with control-room.html)
debug-urls.html (debug utility)
design-analytics-dashboard.html (singular, legacy)
design-applier.html (legacy)
design-placeholder.html (legacy)
design-studio.html (legacy)
design-suite.html (legacy)
feedback.html (legacy feature)
format-converter.html (standalone tool)
formatter-redirect.html (utility)
hyper-speed-control.html (legacy)
knowledge.html (legacy)
live-genius-dashboard.html (legacy)
outcomes-dashboard.html (legacy)
phase3-control-center.html (legacy/phase 3)
postcss.config.js ⚠️ (NOT HTML, config file - keep)
projects.html (legacy)
provider-cup-scoreboard.html (legacy)
provider-performance-dashboard.html (legacy)
providers-arena-v2.html (legacy)
providers-conference.html (legacy)
referral.html (single instance)
response-formatter-enhanced.html (legacy)
response-formatter-final.html (legacy)
smart-intelligence-display.html (replaced by analytics dashboard)
tailwind.config.js ⚠️ (NOT HTML, config file - keep)
trace-viewer.html (debug/diagnostics)
validation-dashboard.html (testing/validation)
visuals.html (visualization component)
workbench.html (legacy/testing)
workflow-control-room.html (redundant with control-room.html)
workstation.html (legacy workstation)
```

---

## JavaScript Files (Should Be TypeScript)

### Core Files (in `/js/`)
```
activity-tracker.js - Should migrate to TS or remove if in Cortex
color-palette.js - Config (consider moving to CSS/Tailwind)
format-converter.js - Should be TypeScript service
gemini-core.js - **CRITICAL** - Should be in src/precog/providers/
markdown-renderer.js - Should be TypeScript utility
perf-monitor.js - Should be TypeScript service
prompt-coach.js - Should be TypeScript service
smart-intelligence-integration.js - Should be TypeScript
story-board.js - Legacy, unclear purpose
tooloo-heartbeat.js - Should be TypeScript service
version-sync.js - Should be TypeScript utility
visual-feedback-engine.js - Should be TypeScript service
workbench-app.js - Should be React component
workstation-ui.js - Should be React component
```

### Scanner Files (in `/scanner/`)
```
chat-parser.js - Should be TypeScript
prompt-analyzer.js - Should be TypeScript
refinery-engine.js - Should be TypeScript
refinery-integration-example.js - Example, safe to delete
refinery-ui.js - Should be React component
scanner-refinery-integration.js - Unclear, likely legacy
```

---

## Distribution Analysis

| Category | Count | Status | Action |
|----------|-------|--------|--------|
| Active HTML Files | 8-10 | ✅ Keep | Review only |
| Legacy HTML Files | 70+ | ❌ Obsolete | Archive/Delete |
| Config Files | 2 | ✅ Keep | Keep as-is |
| JavaScript (legacy) | 15+ | ❌ Should be TS | Migrate/Delete |
| React/TypeScript | 39+ | ✅ Keep | In use |

---

## Recommended Actions

### Phase 1: Immediate (Safe)
1. Delete entire `_legacy/` directory (32 files, already archived)
2. Document backup location for recovery

### Phase 2: Short-term (With Testing)
1. Verify which HTML dashboards are actually used
2. Move unused dashboards to archive
3. Consolidate duplicate control room files (keep only control-room.html)
4. Consolidate duplicate chat interfaces (keep only chat-pro-v2.html)

### Phase 3: Medium-term (TypeScript Migration)
1. Migrate `js/gemini-core.js` → integrate into LLMProvider
2. Migrate `js/` utilities → `src/services/` (TypeScript)
3. Migrate scanner files → `src/cortex/` or remove
4. Convert remaining `.js` config files to proper modules

### Phase 4: Long-term (Full v2.1+ Compliance)
1. Migrate remaining React components to `src/web-app/src/`
2. Delete all standalone HTML files (replace with Vite-built React)
3. Remove all direct JavaScript dependencies from HTML

---

## Files by Certainty Level

### GREEN (Safe to Delete)
- All files in `_legacy/` directory
- `response-formatter-*.html` (replaced by services)
- `phase3-control-center.html` (phase 3 archive)
- Test/demo files in scanner (`*-example.html`, `*-test.html`)

### YELLOW (Review Before Deleting)
- `chat-pro.html` - Ensure `chat-pro-v2.html` is complete
- `control-room-*.html` variants - Keep primary, archive others
- Dashboard variants - Consolidate to single active version
- `gemini-core.js` - Ensure functionality moved to TypeScript

### RED (Keep)
- `postcss.config.js`, `tailwind.config.js` - Build configuration
- Active dashboards with unique functionality
- `index.html` - Entry point
- React component files in `src/web-app/src/`

---

## Configuration

Current Config:
- **Version**: 2.1.375+ (using Synapsys architecture)
- **Provider Models**: Gemini 3 Pro, Nano; OpenAI GPT-4, DALL-E, Codex; Anthropic Haiku 4.5, Opus 4.5
- **Build Tool**: Vite (for frontend)
- **Style**: Tailwind CSS + PostCSS
- **Architecture**: TypeScript-first with React components

---

## Next Steps

1. **Backup**: Create snapshot of current state
2. **Audit**:  Get user confirmation on which UIs are actually used
3. **Test**: Verify all active interfaces after cleanup
4. **Migrate**: Convert JavaScript to TypeScript modules
5. **Document**: Update README with active UI files

---

*This audit identifies significant code duplication and opportunities for consolidation that align with the Synapsys 2.1+ architecture requirement for TypeScript-only codebase.*
