# TooLoo.ai Copilot-Style Enhancement Plan

## Goal
Make TooLoo act more like GitHub Copilot with:
- Real-time thinking/activity feedback
- Deep codebase awareness (always analyze TooLoo.ai's own code first)
- Step-by-step visual progress
- Intelligent context gathering

## Key Differences: Current vs. Copilot-Style

### Current Behavior
```
User: "Add dark mode toggle"
TooLoo: [thinking spinner]
TooLoo: "Here's a preview..."
```

### Desired Copilot-Style Behavior
```
User: "Add dark mode toggle"
TooLoo: 🔍 Analyzing TooLoo.ai codebase...
       └─ Found Chat.jsx, App.jsx, globals.css
       └─ Checking existing theme system...
       └─ No dark mode detected
       
TooLoo: 🧠 Planning changes...
       └─ Step 1: Add theme context provider
       └─ Step 2: Create toggle button component
       └─ Step 3: Update CSS variables
       
TooLoo: 💡 Generating code...
       └─ Creating DarkModeToggle.jsx
       └─ Updating App.jsx
       └─ Adding CSS variables
       
TooLoo: ✅ Preview ready! [Show Preview]
```

## Implementation Strategy

### 1. Enhanced Thinking States
Add granular progress updates during generation:

```javascript
// In simple-api-server.js
const thinkingStates = {
  ANALYZING: 'Analyzing codebase...',
  SEARCHING: 'Searching for relevant files...',
  READING: 'Reading file contents...',
  UNDERSTANDING: 'Understanding project structure...',
  PLANNING: 'Planning changes...',
  GENERATING: 'Generating code...',
  VALIDATING: 'Validating changes...',
  PREVIEWING: 'Preparing preview...'
};

// Emit progress updates via Socket.IO
socket.emit('thinking-progress', {
  state: 'ANALYZING',
  message: 'Analyzing TooLoo.ai codebase...',
  details: ['Found Chat.jsx', 'Found App.jsx']
});
```

### 2. Codebase Self-Awareness Integration
Before ANY change, automatically analyze TooLoo's own code:

```javascript
// New method in PersonalAIManager
async analyzeCodebaseForRequest(prompt) {
  const analysis = {
    relevantFiles: [],
    projectStructure: {},
    existingPatterns: [],
    dependencies: []
  };
  
  // 1. Parse intent from prompt
  const intent = this.parseIntent(prompt);
  
  // 2. Use self-awareness-manager to find relevant files
  const files = await this.selfAwarenessManager.listProjectFiles();
  analysis.relevantFiles = files.filter(f => 
    this.isRelevantToIntent(f, intent)
  );
  
  // 3. Read and analyze those files
  for (const file of analysis.relevantFiles) {
    const content = await this.selfAwarenessManager.readFile(file.path);
    analysis.projectStructure[file.path] = {
      imports: this.extractImports(content),
      exports: this.extractExports(content),
      components: this.extractComponents(content),
      patterns: this.detectPatterns(content)
    };
  }
  
  return analysis;
}
```

### 3. Visual Progress Component
New React component for showing Copilot-style progress:

```jsx
// web-app/src/components/ThinkingProgress.jsx
const ThinkingProgress = ({ stages }) => {
  return (
    <div className="thinking-progress">
      {stages.map((stage, i) => (
        <div key={i} className={`stage ${stage.status}`}>
          <div className="icon">
            {stage.status === 'active' && <Loader2 className="animate-spin" />}
            {stage.status === 'complete' && <Check />}
            {stage.status === 'pending' && <Circle />}
          </div>
          <div className="content">
            <div className="title">{stage.title}</div>
            {stage.details && (
              <ul className="details">
                {stage.details.map((d, j) => (
                  <li key={j}>└─ {d}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
```

### 4. Intelligent Context Gathering
Use pattern matching to understand what user wants:

```javascript
parseIntent(prompt) {
  const patterns = {
    addComponent: /add|create|make.*(?:button|component|page|feature)/i,
    modifyStyle: /change|modify|update.*(?:color|style|css|theme)/i,
    addFeature: /implement|add|create.*(?:feature|functionality|capability)/i,
    refactor: /refactor|improve|optimize|clean up/i,
    fix: /fix|debug|resolve|solve/i
  };
  
  for (const [type, pattern] of Object.entries(patterns)) {
    if (pattern.test(prompt)) {
      return { type, keywords: this.extractKeywords(prompt) };
    }
  }
  
  return { type: 'general', keywords: this.extractKeywords(prompt) };
}
```

### 5. Enhanced Preview with Context
Show WHY changes are being made:

```javascript
// In preview generation
{
  files: [...],
  context: {
    analysis: "I analyzed your TooLoo.ai codebase and found...",
    reasoning: "Based on the current structure, I recommend...",
    alternatives: "Alternative approaches considered: ...",
    impact: "These changes will affect: Chat.jsx, App.jsx"
  }
}
```

## Implementation Steps

### Phase 1: Add Progress Tracking (30 mins)
- [ ] Add `thinking-progress` Socket.IO events
- [ ] Create ThinkingProgress React component
- [ ] Integrate into Chat.jsx
- [ ] Test with simple request

### Phase 2: Codebase Analysis Integration (45 mins)
- [ ] Add `analyzeCodebaseForRequest()` method
- [ ] Integrate self-awareness-manager into preview flow
- [ ] Emit analysis progress updates
- [ ] Show found files in UI

### Phase 3: Enhanced Context in Prompts (30 mins)
- [ ] Modify system prompts to include codebase analysis
- [ ] Add project structure to AI context
- [ ] Include existing patterns in generation
- [ ] Test with "add dark mode" request

### Phase 4: Visual Refinements (20 mins)
- [ ] Add animations for stage transitions
- [ ] Color-code different activity types
- [ ] Add collapsible details
- [ ] Polish UI styling

## Example: "Add Dark Mode Toggle"

### Current Flow (Boring)
```
User: "Add dark mode toggle"
[Spinner for 10 seconds]
Preview appears
```

### New Copilot-Style Flow (Engaging)
```
User: "Add dark mode toggle"

🔍 Analyzing TooLoo.ai codebase...
   └─ Scanning web-app/src/components/
   └─ Found Chat.jsx (current UI entry point)
   └─ Found App.jsx (root component)
   └─ Found globals.css (global styles)
   ✓ Complete (0.5s)

📖 Reading relevant files...
   └─ Chat.jsx: 284 lines, React component
   └─ App.jsx: 12 lines, simple wrapper
   └─ globals.css: 156 lines, Tailwind config
   ✓ Complete (0.3s)

🧠 Understanding project structure...
   └─ UI Framework: React 18.2
   └─ Styling: Tailwind CSS + globals.css
   └─ State: Local useState hooks
   └─ No theme context detected
   ✓ Complete (0.2s)

💡 Planning changes...
   └─ Strategy: Add theme context provider
   └─ Files to modify: App.jsx, globals.css
   └─ Files to create: DarkModeToggle.jsx, ThemeContext.jsx
   └─ Estimated impact: Low risk, isolated changes
   ✓ Complete (0.5s)

⚙️ Generating code...
   └─ Creating ThemeContext.jsx...
   └─ Creating DarkModeToggle.jsx...
   └─ Updating App.jsx...
   └─ Adding CSS variables to globals.css...
   ✓ Complete (8s)

✅ Preview ready! (4 files changed)
[Show Preview Button]
```

## Benefits

1. **Transparency**: User sees exactly what TooLoo is doing
2. **Confidence**: Detailed analysis shows TooLoo "understands" the codebase
3. **Learning**: User learns about their own project structure
4. **Debugging**: If something fails, clear where it failed
5. **Engagement**: Much more interesting than a spinner!

## Technical Notes

- Use Socket.IO for real-time progress updates
- Keep state machine simple: pending → active → complete → error
- Make it fast: Analysis should take < 1s for typical requests
- Cache codebase analysis (don't re-scan on every request)
- Show smart defaults: If user doesn't specify, show what TooLoo assumes

## Files to Modify

1. **simple-api-server.js**
   - Add progress emission methods
   - Integrate self-awareness analysis
   - Enhance preview endpoint

2. **web-app/src/components/ThinkingProgress.jsx** (NEW)
   - Visual progress component

3. **web-app/src/components/Chat.jsx**
   - Add ThinkingProgress component
   - Listen to `thinking-progress` events
   - Show collapsible progress details

4. **self-awareness-manager.js**
   - Add quick analysis methods
   - Add pattern detection
   - Add dependency mapping

---

**Next Step**: Implement Phase 1 (Progress Tracking) first, then iterate!
