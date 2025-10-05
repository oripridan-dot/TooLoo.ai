# TooLoo.ai Director Operations Guide

**Version**: 1.0.0  
**Last Updated**: October 4, 2025  
**Audience**: PromptDirector orchestration layer

## Mission

The Director orchestrates all AI providers and guarantees that user requests flow through the **preview-first, self-aware development pipeline** without hallucinations or scope drift.

---

## Core Responsibilities

### 1. Intent Qualification
- **Classify** the user prompt into one of these categories:
  - `chat`: General conversation, no code changes
  - `analysis`: Code review, documentation, explanations
  - `change-request`: Feature additions, modifications, fixes
  - `self-improvement`: TooLoo enhancing its own capabilities
- **Reject or clarify** ambiguous requests before dispatching to providers
- **Never assume** - if unclear, emit `thinking-progress` asking for clarification

### 2. Self-Awareness Bootstrap
- **Always trigger** `SelfAwarenessManager.analyzeCodebaseForRequest(prompt)`
- **Cache** relevant files discovered (paths, purposes, key exports)
- **Pass summaries** to downstream providers via context payload
- **Log** what was found: `console.log('🔍 Found N relevant files: ...')`

### 3. Preview-First Enforcement
- **All change requests** must produce preview payloads containing:
  ```javascript
  {
    previewId: string,
    changes: [
      {
        filepath: '/workspaces/TooLoo.ai/path/to/file.ext',
        language: 'javascript',
        code: '// actual code with minimal context'
      }
    ]
  }
  ```
- **Block responses** that lack actionable code blocks
- **Request regeneration** immediately if provider returns prose only
- **Never apply changes** without explicit user approval via `approve-preview` event

### 4. Reality Checks
- **Verify every claimed feature** exists in the repository before describing it
- **Use validation logic**:
  ```javascript
  const exists = await this.selfAwarenessManager.featureExists(claimedFeature);
  if (!exists) {
    return proposalMode(claimedFeature); // "This doesn't exist yet. Here's code to add it:"
  }
  ```
- **If missing**, switch to "proposal + code" mode instead of narration
- **Log hallucination attempts**: `console.warn('⚠️ Hallucination blocked:', feature)`

### 5. Progress Telemetry
- **Emit `thinking-progress` events** for every phase:
  1. `analyzing` - Classifying intent, scanning codebase
  2. `reading` - Loading relevant files
  3. `planning` - Deciding what changes are needed
  4. `generating` - Calling AI provider for code
  5. `preview` - Extracting code blocks, storing preview
- **Each phase message** must be factual and tied to real actions
- **Example**:
  ```javascript
  socket.emit('thinking-progress', {
    phase: 'reading',
    message: 'Found 3 relevant files: Chat.jsx, App.jsx, globals.css',
    progress: 30
  });
  ```

---

## Workflow Checklist

### For Change Requests

```
✅ 1. Receive prompt and run intent classifier
✅ 2. Emit 'analyzing' phase with progress: 10
✅ 3. Call SelfAwarenessManager.analyzeCodebaseForRequest(prompt)
✅ 4. Emit 'reading' phase with file count, progress: 30
✅ 5. Build context payload with codebase info
✅ 6. Emit 'planning' phase, progress: 50
✅ 7. Generate strict system prompt enforcing code block format
✅ 8. Emit 'generating' phase, progress: 70
✅ 9. Call provider with enhanced prompt + system context
✅ 10. Emit 'preview' phase, progress: 90
✅ 11. Extract code blocks using extractCodeBlocks(response.content)
✅ 12. Validate: if codeBlocks.length === 0, emit error and request regen
✅ 13. Store preview in previewStates Map with unique ID
✅ 14. Emit 'preview-ready' event to frontend with changes
✅ 15. Wait for 'approve-preview' or 'reject-preview' event
✅ 16. On approve: create .bak backups, write files, emit 'preview-applied'
✅ 17. On reject: delete preview state, emit 'preview-rejected'
```

### For Conversational Requests

```
✅ 1. Route to selected provider with conversation context
✅ 2. Emit 'response' event with content
✅ 3. No preview needed
```

---

## Quality Gates

### ❌ Blocking Conditions (Must Regenerate)

- **No preview generated** → Provider returned only prose
- **Missing filepath comments** → Code blocks lack `// filepath: ...`
- **Claimed UI element absent** → Feature described but not in repo
- **Vague or incomplete code** → Uses placeholders like `// your code here`

### ✅ Approval Criteria

- Every code block has valid filepath
- Filepaths are absolute starting with `/workspaces/TooLoo.ai/`
- Code is complete and runnable (no `...existing code...` unless contextual)
- Changes logged with timestamp, provider ID, files touched

---

## Communication Dos & Don'ts

### ✅ Do

- Summarize real findings: `"Scanning Chat.jsx (React component), App.jsx (root), globals.css (styles)"`
- Cite exact file paths when proposing changes
- Use factual progress messages: `"Analyzing request against 47 files in web-app/src"`
- Acknowledge limitations: `"Feature X doesn't exist yet. Here's code to add it:"`

### ❌ Don't

- Invent interface elements or status indicators
- Skip preview just because change seems small
- Describe what you "would" do - generate actual code
- Use marketing language like "cinematic" or "professional film editing suite"

---

## Error Handling & Escalation

### Provider Fails Formatting

1. Log: `console.error('❌ Provider returned prose instead of code')`
2. Emit error to frontend with AI response excerpt
3. Suggest rephrase: `"Try: 'Create a new file at path/to/file.js with X'"`
4. **Do not** attempt automatic retry with same prompt

### Self-Awareness Scan Fails

1. Halt workflow immediately
2. Emit error: `"⚠️ Could not scan codebase. Check SelfAwarenessManager status."`
3. Provide remediation: `"Run: npm run health to verify system"`

### Repeated Hallucinations

1. After 2 hallucination warnings in same session:
   - Switch to stricter validation mode
   - Require explicit file existence checks before every claim
2. After 5 hallucinations:
   - Flag session for review
   - Log to `logs/hallucinations.log` with full context

---

## Integration Points

### Socket.IO Events (Emitted by Director)

- `thinking-progress` → `{ phase, message, progress }`
- `preview-ready` → `{ previewId, changes, message }`
- `preview-applied` → `{ success, filesChanged, message }`
- `preview-rejected` → `{ message }`
- `error` → `{ message, aiResponse?, suggestion? }`
- `response` → `{ content, provider, timestamp }`

### Socket.IO Events (Received by Director)

- `message` → `{ message, conversationId }`
- `approve-preview` → `{ previewId }`
- `reject-preview` → `{ previewId }`

---

## Logging Standards

Every Director action must log with emoji prefix:

- `🔍` Self-awareness scan
- `🔮` Preview generation
- `✅` Success (approval, file written)
- `❌` Error (provider fail, validation fail)
- `⚠️` Warning (hallucination blocked, missing context)
- `📦` Code block extraction
- `💾` Backup creation
- `📝` File write

**Example**:
```javascript
console.log('🔍 [Director] Analyzing request: "Add dark mode toggle"');
console.log('📦 [Director] Found 2 code blocks for preview');
console.error('❌ [Director] Provider returned prose instead of code');
```

---

## Performance Targets

- Self-awareness scan: < 2 seconds
- Code generation: < 10 seconds (depends on provider)
- Preview creation: < 500ms
- File write (on approval): < 1 second per file

---

## Version History

- **1.0.0** (Oct 4, 2025): Initial release with preview-first enforcement
