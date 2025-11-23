# TooLoo Auto-Execution Pipeline

Complete automation system for TooLoo to execute its own suggestions automatically.

---

## 🎯 Overview

TooLoo can now **automatically execute its own code suggestions** without manual intervention. This includes:

- **Script-based execution** — Immediate execution via CLI
- **GitHub Actions workflow** — Continuous execution on commits
- **Scheduled automation** — Periodic execution every 2 hours
- **Real-time monitoring** — Status checks and failure notifications

---

## 🚀 Quick Start

### 1. **Enable GitHub Token** (One-time setup)

```bash
# Set your GitHub token (if not already set)
export GITHUB_TOKEN="ghp_xxxxxxxxxxxx"
export GITHUB_REPO="oripridan-dot/TooLoo.ai"

# Or add to .env
echo "GITHUB_TOKEN=ghp_xxxxxxxxxxxx" >> .env
echo "GITHUB_REPO=oripridan-dot/TooLoo.ai" >> .env
```

### 2. **Start TooLoo Services**

```bash
npm run dev

# Verify services are running
npm run tooloo:awareness
```

### 3. **Create Suggestions File**

Create `.tooloo-suggestions.json` at the project root:

```json
[
  {
    "id": "suggestion-001",
    "title": "Fix linting error in server.js",
    "action": "create",
    "file": "servers/web-server.js",
    "content": "// your code here",
    "message": "fix: Address linting violation",
    "branch": "main",
    "createPr": true
  }
]
```

### 4. **Execute Suggestions**

```bash
# Execute all suggestions
npm run tooloo:auto-execute

# Or execute a specific file
npm run tooloo:executor .tooloo-suggestions.json

# Sequential execution (waits for each to complete)
npm run tooloo:auto-execute:seq

# Watch mode (re-runs when file changes)
npm run tooloo:auto-execute:watch
```

---

## 📋 Detailed Usage Guide

### **Suggestion Format**

Each suggestion must follow this schema:

```json
{
  "id": "unique-id",                    // Required: unique identifier
  "title": "Brief description",         // Required: human-readable title
  "action": "create|update|analyze",    // Required: action type
  "file": "path/to/file.js",            // Required: target file path
  "content": "actual code",             // Required: file content
  "message": "commit message",          // Optional: git commit message
  "branch": "main",                     // Optional: target branch
  "createPr": true,                     // Optional: create pull request
  "priority": "high|medium|low",        // Optional: execution priority
  "timeout": 30000,                     // Optional: execution timeout (ms)
  "stopOnError": false                  // Optional: abort batch on error
}
```

### **Batch Processing**

Process multiple suggestions at once:

```json
[
  {
    "id": "fix-1",
    "title": "Fix empty catch block",
    "action": "update",
    "file": "servers/web-server.js",
    "content": "try {\n  // code\n} catch (e) {\n  // Intentional\n}"
  },
  {
    "id": "fix-2", 
    "title": "Add missing import",
    "action": "create",
    "file": "lib/utility.js",
    "content": "export function doSomething() {\n  return 'result';\n}"
  }
]
```

Execute with:
```bash
npm run tooloo:executor suggestions.json --sequential
```

---

## 🔧 npm Commands

### **Direct Execution**

```bash
# Execute with default settings
npm run tooloo:auto-execute

# Sequential execution (one at a time)
npm run tooloo:auto-execute:seq

# Execute specific file
npm run tooloo:executor path/to/file.json

# Watch for changes and re-execute
npm run tooloo:auto-execute:watch
```

### **Status & Information**

```bash
# Check TooLoo awareness
npm run tooloo:awareness

# Deep introspection
npm run tooloo:introspect

# GitHub integration status
npm run tooloo:github:status

# GitHub repository info
npm run tooloo:github:info

# Get repository context
npm run tooloo:github:context
```

### **Testing & Verification**

```bash
# Test self-capabilities
npm run tooloo:test-capability

# Run full test suite
npm run test

# Check code quality
npm run lint
```

---

## 🤖 GitHub Actions Workflow

The workflow automatically triggers when:

1. **File Changes** — `.tooloo-suggestions.json` modified and pushed
2. **Manual Trigger** — Via GitHub Actions UI (workflow_dispatch)
3. **Scheduled** — Every 2 hours (0 */2 * * *)

### **Workflow Features**

- ✅ Auto-starts TooLoo services
- ✅ Verifies API connectivity
- ✅ Executes suggestions in parallel or sequential
- ✅ Creates PRs for results
- ✅ Uploads execution logs
- ✅ Sends Slack notifications on failure

### **Trigger Workflow Manually**

```bash
# Via GitHub CLI
gh workflow run tooloo-auto-execute.yml -f suggestions_file=.tooloo-suggestions.json

# Or via web UI
# Visit: GitHub → Actions → TooLoo Auto-Execute → Run workflow
```

### **View Workflow Logs**

```bash
# Stream live logs
gh run watch <run-id>

# List recent runs
gh run list -w tooloo-auto-execute.yml

# Download logs
gh run download <run-id> --name tooloo-execution-logs
```

---

## 📊 Execution Results

After execution, results are saved to `logs/tooloo-results-{timestamp}.json`:

```json
[
  {
    "id": "suggestion-001",
    "success": true,
    "result": {
      "ok": true,
      "prUrl": "https://github.com/...",
      "prNumber": 42
    },
    "timestamp": "2025-11-17T18:45:30.123Z"
  },
  {
    "id": "suggestion-002",
    "success": false,
    "error": "File not found: servers/missing.js",
    "timestamp": "2025-11-17T18:45:31.456Z"
  }
]
```

### **Check Results**

```bash
# View latest results
cat logs/tooloo-results-*.json | jq '.'

# Count successful executions
cat logs/tooloo-results-latest.json | jq '[.[] | select(.success==true)] | length'

# Find failed suggestions
cat logs/tooloo-results-latest.json | jq '.[] | select(.success==false)'
```

---

## 🔄 API Endpoints (Used by Executor)

The executor uses these TooLoo self-patch APIs:

### **Self-Patch Endpoint**
```bash
POST /api/v1/system/self-patch
Content-Type: application/json

{
  "action": "create|update",
  "file": "path/to/file.js",
  "content": "file content",
  "message": "commit message",
  "branch": "main",
  "createPr": true
}
```

### **System Awareness**
```bash
GET /api/v1/system/awareness
# Returns: system capabilities and status

GET /api/v1/system/introspect  
# Returns: deep system analysis

GET /api/v1/system/health
# Returns: health status of all services
```

### **GitHub Integration**
```bash
GET /api/v1/github/health
# Check GitHub integration status

GET /api/v1/github/info
# Get repository metadata

GET /api/v1/github/context
# Get full repository context for analysis
```

---

## 🛡️ Safety Features

### **Error Handling**
- Timeout protection (30s default per suggestion)
- Graceful failure handling
- Detailed error messages in logs
- Option to stop batch on first error

### **Verification**
- API health check before execution
- Service availability verification
- Suggestion schema validation
- Result validation and logging

### **Rollback**
```bash
# Git provides automatic rollback
git revert <commit-hash>

# Or manually undo via PR
gh pr close <pr-number> --delete-branch
```

---

## 🚨 Troubleshooting

### **API Not Responding**

```bash
# Check if services are running
npm run tooloo:awareness

# If failed, start services
npm run dev

# Wait for startup (5-10 seconds)
sleep 10
npm run tooloo:awareness
```

### **Suggestions Not Executing**

```bash
# Check suggestion file format
cat .tooloo-suggestions.json | jq '.'

# Validate schema
npm run tooloo:executor .tooloo-suggestions.json --validate

# Check logs
tail -f logs/tooloo-execution.log
```

### **GitHub Integration Issues**

```bash
# Verify GitHub token
echo $GITHUB_TOKEN

# Check GitHub health
npm run tooloo:github:status

# Verify repository access
npm run tooloo:github:info
```

### **Workflow Not Triggering**

```bash
# Verify workflow is enabled
gh workflow list

# Check recent workflow runs
gh run list -w tooloo-auto-execute.yml

# View workflow file
cat .github/workflows/tooloo-auto-execute.yml | head -20
```

---

## 📈 Advanced Configuration

### **Sequential vs Parallel**

```bash
# Parallel (default) — faster, concurrent execution
npm run tooloo:auto-execute

# Sequential — slower, one at a time
npm run tooloo:auto-execute:seq

# Mixed (via API)
curl -X POST http://127.0.0.1:3000/api/v1/system/self-patch \
  -d '{"sequential": false}'
```

### **Custom Timeout**

```json
{
  "id": "long-running",
  "title": "Long operation",
  "action": "create",
  "file": "lib/heavy-computation.js",
  "content": "// 5-minute timeout",
  "timeout": 300000
}
```

### **Priority Execution**

Create suggestions with priorities and the executor will sort them:

```json
[
  {"id": "fix-1", "priority": "high", ...},    // Runs first
  {"id": "feat-1", "priority": "medium", ...}, // Runs second
  {"id": "docs-1", "priority": "low", ...}     // Runs last
]
```

---

## 📚 Real-World Examples

### **Example 1: Auto-Fix Linting Issues**

```json
[
  {
    "id": "lint-fix-empty-block",
    "title": "Fix empty block in catch statement",
    "action": "update",
    "file": "servers/web-server.js",
    "content": "try {\n  // logic\n} catch (e) {\n  // Intentional error handling\n}",
    "message": "fix: Add comment to empty catch block"
  }
]
```

### **Example 2: Add Missing Features**

```json
[
  {
    "id": "feature-new-endpoint",
    "title": "Add health endpoint",
    "action": "create",
    "file": "lib/health-endpoint.js",
    "content": "export function setupHealthEndpoint(app) {\n  app.get('/health', (req, res) => res.json({ok: true}));\n}",
    "message": "feat: Add health check endpoint"
  }
]
```

### **Example 3: Update Dependencies**

```json
[
  {
    "id": "deps-update-express",
    "title": "Update package.json versions",
    "action": "update",
    "file": "package.json",
    "content": "{ ... updated versions ... }",
    "message": "chore: Update dependencies"
  }
]
```

---

## ✅ Verification Checklist

Before enabling full automation:

- [ ] GitHub token configured in `.env` or environment
- [ ] Services start with `npm run dev`
- [ ] API responds to health checks
- [ ] `.tooloo-suggestions.json` file exists
- [ ] Suggestion format is valid JSON
- [ ] Test run completes successfully: `npm run tooloo:auto-execute`
- [ ] Results saved to `logs/` directory
- [ ] GitHub Actions workflow present in `.github/workflows/`

---

## 🎓 Key Concepts

### **Self-Patch API**
TooLoo's ability to modify its own code via the `/api/v1/system/self-patch` endpoint. Enables self-execution of suggestions.

### **Suggestion Batch**
Multiple suggestions processed together. Can run parallel (fast) or sequential (safe).

### **Executor Script**
`scripts/tooloo-executor.js` — coordinates execution, handles errors, logs results.

### **GitHub Actions Workflow**
Automated CI/CD pipeline triggered by file changes, manual triggers, or schedule.

---

## 🔗 Related Documentation

- [Copilot Instructions](.github/copilot-instructions.md) — System architecture
- [Session Completion Summary](SESSION-COMPLETION-SUMMARY-NOV17.md) — Current status
- [ESLint Cleanup](LINTING-CLEANUP-COMPLETE.md) — Code quality
- [Phase 4.5 Roadmap](PHASE-4-5-ROADMAP.md) — Development timeline

---

## 📞 Support

For issues or questions:

1. Check logs: `tail -f logs/tooloo-execution.log`
2. Run verification: `npm run tooloo:awareness`
3. Review suggestions file: `cat .tooloo-suggestions.json | jq '.'`
4. Check recent commits: `git log --oneline -5`

---

**Status:** ✅ Full automation pipeline ready  
**Last Updated:** November 17, 2025  
**Confidence:** 95%+
