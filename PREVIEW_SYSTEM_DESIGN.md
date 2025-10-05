# 🎨 Preview System Design

## The Problem
- Changes are too extreme and immediate
- No way to see what will happen before implementation
- Hard to iterate and refine
- Can't rollback easily

## The Solution: Sandbox Preview System

### Workflow:
```
1. User: "make the button blue"
   ↓
2. TooLoo: Shows visual mockup/description + code preview
   ↓
3. User sees:
   - Visual preview (iframe sandbox or screenshot)
   - Code diff showing changes
   - Options: "Approve", "Modify", "Cancel"
   ↓
4. User can iterate:
   - "Make it lighter blue"
   - "Add a shadow"
   - "Actually, make it green instead"
   ↓
5. Only when user says "approve" or "implement" → actual files change
   ↓
6. Changes applied with backup and rollback option
```

## Implementation Plan

### Phase 1: Preview Infrastructure
1. **Preview Endpoint** - Generate changes without saving
2. **Diff Viewer** - Show before/after code
3. **Visual Preview** - Render changes in iframe sandbox
4. **Iteration State** - Store proposed changes for refinement

### Phase 2: UI Components
1. **Preview Panel** - Split view: current vs proposed
2. **Diff Highlighting** - Green (added), Red (removed)
3. **Action Buttons** - Approve, Modify, Reject
4. **Preview Iframe** - Live rendering of proposed UI

### Phase 3: Safety Features
1. **Auto-backup** - Before any change
2. **Rollback button** - Undo last change
3. **Change history** - See all modifications
4. **Comparison mode** - Side-by-side before/after

## Technical Architecture

### Backend Changes:
```javascript
// New endpoints
POST /api/v1/preview - Generate preview without saving
POST /api/v1/approve - Apply previewed changes
POST /api/v1/rollback - Undo last change
GET /api/v1/diff - Get diff between current and proposed

// New state management
this.previewStates = new Map(); // sessionId -> proposed changes
this.changeHistory = new Map(); // sessionId -> array of changes
```

### Frontend Changes:
```javascript
// New components
<PreviewPanel />      // Split view with diff
<PreviewIframe />     // Sandboxed preview
<ApprovalButtons />   // Approve/Modify/Reject
<ChangeHistory />     // List of all changes

// New workflow states
- 'discussing'   // Initial chat
- 'previewing'   // Showing preview
- 'iterating'    // User refining
- 'implementing' // Actually applying
- 'completed'    // Change applied
```

## Preview Modes

### 1. Code Preview (Always)
```
Before:                    After:
─────────────────────────────────────────
<button                    <button
  className="..."            className="..."
  style={{ color: '#666' }}  style={{ color: '#3b82f6' }}
>                          >
  Send                       Send
</button>                  </button>
```

### 2. Visual Preview (When Possible)
- Iframe with proposed changes
- Interactive (can test buttons, inputs)
- Isolated from main app

### 3. Description Preview (Fallback)
- Visual description of changes
- "The button will be bright blue like Twitter's primary button"
- Screenshots/mockups from AI

## User Interactions

### Approve Change:
```
User: "approve" | "looks good" | "do it" | "implement"
→ Apply changes to real files
→ Show success message
→ Reload page automatically
```

### Iterate on Change:
```
User: "make it darker" | "add a shadow" | "try green instead"
→ Keep in preview mode
→ Update preview with new changes
→ Don't touch real files yet
```

### Reject Change:
```
User: "cancel" | "never mind" | "go back" | "reject"
→ Discard preview
→ Return to discussion mode
→ Files unchanged
```

## Benefits

✅ **Safe** - See before you commit
✅ **Iterative** - Refine until perfect
✅ **Reversible** - Easy rollback
✅ **Transparent** - See exactly what changes
✅ **Controlled** - User has final say
✅ **Learning** - See how changes work

## Implementation Steps

### Step 1: Backend Preview System (30 min)
- Add preview state management
- Create preview generation logic
- Add diff generation

### Step 2: Frontend Preview UI (45 min)
- Create PreviewPanel component
- Add diff viewer with syntax highlighting
- Add approval buttons

### Step 3: Sandbox Rendering (30 min)
- Create isolated iframe
- Inject preview code
- Handle security/CORS

### Step 4: Integration (15 min)
- Connect preview to chat flow
- Update TooLoo's behavior
- Test end-to-end

## Example Flow

```
You: "make the chat input have a blue border when focused"

TooLoo: "I'll add a blue focus ring to the input. Here's what it will look like:"

[Preview Panel Shows]
┌─────────────────────────────────────────┐
│ Current Code → Proposed Code            │
├─────────────────────────────────────────┤
│ className="...                          │
│ - focus:ring-gray-500                   │
│ + focus:ring-blue-500                   │
│ + focus:ring-2                          │
├─────────────────────────────────────────┤
│ [Visual Preview: Live iframe]           │
│ [Try typing here] ← Blue border!        │
├─────────────────────────────────────────┤
│ [Approve] [Modify] [Cancel]             │
└─────────────────────────────────────────┘

You: "make the blue lighter"

[Preview Updates]
│ + focus:ring-blue-400  ← Lighter blue   │

You: "perfect! approve"

TooLoo: "✅ Changes applied! Page reloading..."
[Actual files updated, page reloads]
```

## Priority Features

### Must Have (MVP):
1. ✅ Code diff viewer
2. ✅ Approve/Reject buttons
3. ✅ Preview state management
4. ✅ Iteration support

### Should Have:
1. Visual preview iframe
2. Rollback functionality
3. Change history
4. Side-by-side comparison

### Nice to Have:
1. Screenshot generation
2. AI-generated mockups
3. Interactive preview
4. A/B comparison slider

---

**Ready to implement?** This will give you complete control over changes before they happen.
