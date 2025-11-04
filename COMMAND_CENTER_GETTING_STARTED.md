# 🎯 Command Center – Getting Started (Visual Guide)

## Step-by-Step Instructions

### Step 1: Navigate to Command Center
```
Open: http://127.0.0.1:3000/command-center.html
```

### Step 2: What You'll See (First Load)
```
┌─────────────────────────────────────────────────────────────┐
│  🧠 TooLoo Command Center                    💾 Save Export  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  LEFT PANEL          │  CENTER (CANVAS TABS)  │  RIGHT PANEL│
│  📍 MODE             │  💡 Ideation [ACTIVE]  │  🧠 Responses
│  ├─ Planning         │  🗺️  Roadmap           │  Context:   │
│  ├─ Building         │  📋 Tasks ← CLICK THIS │  Planning   │
│  ├─ Analyzing        │                        │             │
│  └─ Debugging        │  [Ideation board       │  [Response  │
│                      │   with idea cards]     │   area]     │
│  ⭐ Quick Access    │                        │             │
│  └─ Recent items    │                        │             │
│                      │                        │             │
├─────────────────────────────────────────────────────────────┤
│ Input: Ask TooLoo...                         [Send Button]   │
└─────────────────────────────────────────────────────────────┘
```

### Step 3: Click "📋 Tasks" Tab

You'll see this:
```
┌─────────────────────────────────────────────────────────────┐
│  Canvas Tabs:  💡 Ideation  │  🗺️ Roadmap  │  📋 Tasks    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  📋 Task Board (Monday.com Style)                            │
│  [+ Add Task] button                                         │
│                                                               │
│  ┌──────────────┬──────────────┬──────────────┐             │
│  │ 📋 Backlog   │ 🏗️ In Prog   │ ✅ Done      │             │
│  ├──────────────┼──────────────┼──────────────┤             │
│  │ Design UI    │ Build canvas │ Create       │             │
│  │ [High]       │ [tabs]       │ layout       │             │
│  │              │              │              │             │
│  │ Research     │              │              │             │
│  │ context      │              │              │             │
│  │ [Medium]     │              │              │             │
│  │              │              │              │             │
│  └──────────────┴──────────────┴──────────────┘             │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Step 4: Interact with Tasks

**Create a Task:**
1. Click **[+ Add Task]** button
2. Type task title: `"Build API endpoint"`
3. Press Enter
4. Task appears in **Backlog** column

**Move a Task (Drag-Drop):**
1. Click and hold a task card
2. Drag it to **In Progress** column
3. Release mouse
4. Task moves & auto-saves

**Ask AI About It:**
1. Type in bottom input: `"How do I build an API endpoint?"`
2. Press Enter
3. Right panel shows building-mode response with code examples

---

## Key Buttons/Tabs Location

| Element | Location | What It Does |
|---------|----------|--------------|
| Mode buttons | Left sidebar | Change AI response style |
| Canvas tabs | Top of center | Switch between Ideation/Roadmap/Tasks |
| + Add Task | Top of Tasks canvas | Create new task |
| Task cards | Kanban board | Drag between columns |
| Input field | Bottom | Ask TooLoo questions |
| Smart Response | Right panel | Shows context-aware AI answer |

---

## Which Tab to Click?

**Current state:** 💡 Ideation tab (default on page load)

**To see tasks:** 📋 Tasks tab (second tab, top center)

**Other tabs:**
- 🗺️ Roadmap – See project phases & timeline
- 💡 Ideation – Brainstorm board with idea cards

---

## If Page Still Shows Workspace

Your browser might be showing the **old workspace.html** page. Try:

1. **Hard refresh:**
   - Mac: `Cmd + Shift + R`
   - Windows/Linux: `Ctrl + Shift + R`

2. **Or manually navigate:**
   - Click address bar
   - Clear it completely
   - Type: `http://127.0.0.1:3000/command-center.html`
   - Press Enter

3. **Or use the simple browser button:**
   - Look for "Simple Browser" tab
   - Close and reopen command-center URL

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Can't see tasks | Click "📋 Tasks" tab at top |
| Page shows workspace.html | Use URL: `http://127.0.0.1:3000/command-center.html` |
| Tasks not saving | Check browser console (F12) for errors |
| Drag-drop not working | Refresh page, then try again |
| No response to queries | Check if mode is set (buttons on left) |

---

## Quick Test Sequence

1. ✅ Load page
2. ✅ Click "📋 Tasks" tab
3. ✅ Click "+ Add Task"
4. ✅ Type "Test task"
5. ✅ Drag task from Backlog → In Progress
6. ✅ Type question: "How do I test this?"
7. ✅ See AI response in right panel

**All 7 steps = success! 🎉**

---

## Next Steps

Once you see the task board:
- Switch between modes (left sidebar) and notice response style changes
- Try the other tabs (Roadmap & Ideation)
- Explore drag-drop functionality
- Ask different types of questions for each mode

**Questions?** The API is fully tested and working. Just need to navigate to the right page! 🚀
