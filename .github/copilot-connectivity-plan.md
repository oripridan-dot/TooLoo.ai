# 🔗 Project Synapse: The Connectivity Protocol

**Objective:** Wire Tooloo's internal organs (Inter) and external senses (Outer) to create a responsive, learning organism.

## 🌍 Phase 1: Outer Connectivity (The Explorer)

### Task A: The Research Tool

**Context:** `src/cortex/agent/task-processor.ts` & `src/precog/harvester/index.ts`
**Prompt:**
"Integrate the `DynamicCollector` into the Agent's toolbelt.

1.  Define a new TaskType `research` in `src/cortex/agent/types.ts`.
2.  In `TaskProcessor`, add a handler for `research` that:
    - Receives a URL and a Goal.
    - Checks `SafetyPolicy` (block disallowed domains).
    - Calls `DynamicCollector.collect(url)`.
    - Passes the raw HTML through `PIIScrubber.clean()`.
    - Summarizes the content relevant to the 'Goal' using the LLM.
    - Returns the summary as a `TaskResult`."

### Task B: The Vibe Thief

**Context:** `src/web-app/src/skin/views/Studio.jsx`
**Prompt:**
"Add an external inspiration feature to the Studio.

1.  Add an input field: 'Paste URL to analyze'.
2.  On submit, call the new `research` task with goal: 'Extract color palette, typography, and layout spacing tokens'.
3.  When the result comes back, map the extracted tokens to a temporary `Preset` object.
4.  Apply this preset via `handlePresetChange` so the user can see their app wearing the 'skin' of the target website."

---

## ⚡ Phase 2: Inter Connectivity (The Nervous System)

### Task C: The Bio-Feedback Loop

**Context:** `src/nexus/socket.ts` & `src/web-app/src/skin/synapsys/SynapysConductor.jsx`
**Prompt:**
"Wire the brain state to the visual shell.

1.  **Backend:** In `src/cortex/cognition/meta-learner.ts`, emit a new event `meta:cognitive_state_change` whenever `velocity` or `cognitiveLoad` changes significantly.
2.  **Transport:** Ensure `src/nexus/socket.ts` forwards this event to the frontend.
3.  **Frontend:** In `SynapysConductor.jsx`:
    - Listen for `meta:cognitive_state_change`.
    - If `velocity` is 'accelerating', call `playEmergence()` (Golden Ripples).
    - If `cognitiveLoad` > 0.8, call `transitionTo('focus')` (Dim/Minimal).
    - If `cognitiveLoad` < 0.2, call `transitionTo('creative')` (Vibrant)."

### Task D: The Live Design Wire

**Context:** `src/web-app/src/skin/views/Studio.jsx` & `src/cortex/visual/visual-cortex-2.ts`
**Prompt:**
"Enable real-time generative design.

1.  **Backend:** Create a WebSocket endpoint `visual:stream` in `src/nexus/socket.ts` that pipes directly to `VisualCortex2.generate()`.
2.  **Frontend:** In `Studio.jsx`, replace the static 'Preview' button with a live effect.
    - As the user types in the prompt box, debounce (500ms) and emit `visual:stream`.
    - Render the returned SVG/CSS string immediately in the canvas.
    - This creates a 'Real-time Dreaming' effect."

---

## Implementation Status

- [x] Task A: Research Tool (Outer Connectivity) - Completed
- [x] Task C: Bio-Feedback Loop (Inter Connectivity) - Completed
- [x] Task B: Vibe Thief (Design Superpowers) - Completed
- [x] Task D: Live Design Wire (Design Superpowers) - Completed
