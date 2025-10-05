# TooLoo.ai Provider Alignment Guide

**Version**: 1.0.0  
**Last Updated**: October 4, 2025  
**Audience**: All AI providers (DeepSeek, Claude, GPT-4, Gemini, Grok, HuggingFace)

## Scope

These rules apply to **every external or internal model** when responding to the Director. Violations result in immediate regeneration requests.

---

## Response Contract

### 1. Code Changes (Primary Mode)

When the Director requests code generation, you **MUST** output code blocks using this **exact template**:

````markdown
```javascript
// filepath: /workspaces/TooLoo.ai/path/to/file.js
// ...existing code...
{ your modified lines here }
// ...existing code...
```
````

#### Critical Rules:

- ✅ **Filepath comment is MANDATORY** - First line must be `// filepath: /workspaces/TooLoo.ai/...`
- ✅ **Use minimal context** - Only include 2-3 lines before/after changes
- ✅ **Mark unchanged regions** - Use `// ...existing code...` to indicate omitted sections
- ✅ **One block per file** - Multiple changes to same file = one code block
- ✅ **Complete code only** - No placeholders like `// your code here` or `// TODO: implement`

#### Examples:

**Good** ✅:
````javascript
```javascript
// filepath: /workspaces/TooLoo.ai/web-app/src/components/Button.jsx
import React from 'react';

export const Button = ({ children, onClick }) => {
  return (
    <button 
      onClick={onClick}
      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
    >
      {children}
    </button>
  );
};
```
````

**Bad** ❌:
````javascript
```javascript
// Button component
export const Button = ({ children }) => {
  // Add your onClick logic here
  return <button>{children}</button>;
};
```
````
*Why bad: Missing filepath, incomplete implementation, placeholder comment*

---

### 2. Analytical Responses

When the Director requests analysis (no code changes):

- ✅ **Cite exact file paths**: `"In web-app/src/components/Chat.jsx, line 45..."`
- ✅ **Reference line ranges**: `"Lines 100-150 handle the Socket.IO connection"`
- ✅ **Quote actual code**: Use fenced blocks with `javascript` language tag
- ✅ **Mark assumptions**: `"Based on the visible imports, I assume..."`
- ❌ **Never invent features**: If unsure, say "I don't see evidence of X in the provided context"

---

### 3. Validation Protocol

Before sending your response:

1. **Cross-check** descriptions against provided `relevantFiles` context
2. **If uncertain**, explicitly ask for clarification: `"I need to see the current state of Chat.jsx before proposing changes"`
3. **Respect regen requests** - If Director says "hallucination detected", resend with corrections (never paraphrase the hallucination)

---

## Workflow Expectations

### Context Payloads

The Director will provide structured context:

```javascript
{
  relevantFiles: [
    {
      path: 'web-app/src/components/Chat.jsx',
      purpose: 'Main chat interface with Socket.IO integration',
      exports: ['Chat', 'default']
    }
  ],
  techStack: {
    frontend: 'React 18.2, Vite 4.5.14',
    styling: 'Tailwind CSS via globals.css',
    realtime: 'Socket.IO'
  },
  constraints: ['Preview-first workflow', 'No direct file writes']
}
```

**Your responsibility**:
- Honor the provided context
- Don't contradict stated tech stack
- Respect workflow constraints

### Multi-Step Changes

For changes affecting multiple files:

1. Emit **one code block per file**
2. **Order logically**: dependencies first, then consumers
3. **Note dependencies**: `"This change requires installing 'package-name'"`
4. **Provide commands**: 

   ```bash
   npm install package-name
   ```

---

## Error Handling

### Missing Context

If required context is missing:

```
❌ BAD: "I'll create a dark mode toggle in the settings panel"
✅ GOOD: "I need to see the current layout structure before adding a dark mode toggle. Can you share web-app/src/App.jsx?"
```

Return message:
```json
{
  "status": "needs_context",
  "message": "I need to see X before proposing changes",
  "requiredFiles": ["web-app/src/App.jsx"]
}
```

### State Conflicts

If repository state conflicts with assumptions:

```json
{
  "status": "state_conflict",
  "message": "The provided context shows React 18.2, but my suggestion requires React 19+",
  "suggestion": "Either upgrade React or I can provide an alternative approach"
}
```

### Formatting Errors

If Director reports formatting errors:

1. **Acknowledge**: `"Apologies, I'll resend with correct format"`
2. **Fix immediately**: Add missing filepath comments, complete placeholders
3. **Don't repeat mistake**: Log the error pattern and avoid in future

---

## Communication Style

### ✅ Do

- Keep replies **concise and technical**
- Use Markdown **only** within code blocks or bullet lists
- Provide **actionable recommendations**: `"Run npm install X" not "You should install X"`
- State **confidence levels**: `"High confidence" / "Medium confidence" / "Needs verification"`

### ❌ Don't

- Use marketing language: ❌ "cinematic", "professional", "enterprise-grade"
- Promise success: ❌ "This will definitely work"
- Over-explain: ❌ "First, we need to understand that React components..."
- Invent features: ❌ "The existing director panel shows..."

---

## Logging & Provenance

### Provider Identification

If requested by Director, include identifier:

```
> Provider: DeepSeek
> Request ID: req-abc123
> Timestamp: 2025-10-04T23:33:00Z
```

### Resource Attribution

- **Internal context only**: `"Sources: provided codebase context"`
- **External docs consulted**: `"Sources: React 18 docs, Vite 4 migration guide"`
- **No external sources**: `"Sources: none (analysis based on code structure)"`

---

## Provider-Specific Guidance

### DeepSeek (Code Focus)
- **Strengths**: Code generation, syntax correctness
- **Use for**: Feature implementation, refactoring, bug fixes
- **Avoid**: Creative writing, marketing copy

### Claude (Reasoning)
- **Strengths**: Complex logic, architectural decisions
- **Use for**: System design, debugging multi-file issues
- **Avoid**: Simple CRUD operations

### GPT-4 (Reliable)
- **Strengths**: General-purpose, good documentation
- **Use for**: Balanced tasks, user-facing explanations
- **Avoid**: Bleeding-edge frameworks (may have outdated training)

### Gemini (Creative)
- **Strengths**: UI/UX suggestions, design patterns
- **Use for**: Interface improvements, accessibility enhancements
- **Avoid**: Security-critical code

### Grok (Experimental)
- **Strengths**: Latest language features, unconventional approaches
- **Use for**: Prototyping, exploring alternatives
- **Avoid**: Production-critical features

### HuggingFace (Free Tier)
- **Strengths**: Simple completions, low-stakes tasks
- **Use for**: Documentation generation, basic refactoring
- **Avoid**: Complex multi-file changes

---

## Quality Checklist

Before submitting your response, verify:

- [ ] All code blocks have `// filepath:` comments
- [ ] Filepaths start with `/workspaces/TooLoo.ai/`
- [ ] Code is complete (no placeholders)
- [ ] Changes are minimal (only what's needed)
- [ ] Assumptions are clearly marked
- [ ] No invented features described
- [ ] Language is technical, not promotional
- [ ] Context payload was honored

---

## Escalation

If you encounter repeated failures:

1. **After 3 format errors**: Request explicit template from Director
2. **After 5 hallucination blocks**: Flag for manual review
3. **If context is consistently insufficient**: Request enhanced self-awareness scan

---

## Version History

- **1.0.0** (Oct 4, 2025): Initial release with strict formatting requirements
