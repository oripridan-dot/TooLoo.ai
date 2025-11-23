# GitHub API Integration - Quick Start & Testing Guide

**For: Phase 4.3 GitHub API Integration Testing (Nov 18)**

## Setup: Enable GitHub Integration

### Step 1: Create GitHub Personal Access Token

1. Go to [GitHub Settings → Developer Settings → Personal Access Tokens](https://github.com/settings/tokens)
2. Click "Generate new token" → "Generate new token (classic)"
3. Set Name: `TooLoo.ai Phase 4.3`
4. Set Expiration: 90 days
5. Select Scopes:
   - ✅ `repo` - Full control of private repositories
   - ✅ `public_repo` - Access to public repositories
   - ✅ `workflow` - Full control of GitHub Actions workflows
6. Click "Generate token"
7. **Copy the token immediately** (you won't see it again)

### Step 2: Create Test Repository (Optional but Recommended)

For safe testing without affecting production:

```bash
# Create a new test repo on GitHub
# https://github.com/new
# Name: tooloo-phase4-test
# Description: "TooLoo.ai Phase 4.3 GitHub API Integration Testing"
# Private or Public (your choice)
# Click "Create repository"
```

### Step 3: Set Environment Variables

```bash
# In .env (never commit this file!)
export GITHUB_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
export GITHUB_REPO="your-username/tooloo-phase4-test"
```

Or temporarily for a single terminal session:

```bash
export GITHUB_TOKEN="ghp_..."
export GITHUB_REPO="owner/repo"
node servers/web-server.js
```

### Step 4: Verify Configuration

```bash
# Check if integration is configured
curl http://localhost:3000/api/v1/github/api-status
```

Expected response if configured and connected:
```json
{
  "success": true,
  "title": "GitHub API Status",
  "message": "GitHub API: connected",
  "data": {
    "configured": true,
    "status": "connected",
    "repository": {
      "name": "tooloo-phase4-test",
      "description": "Test repo...",
      "stars": 0,
      "language": null
    },
    "recentIssues": [],
    "stats": {
      "commits": 0,
      "prs": 0,
      "issues": 0,
      "errors": 0,
      "successRate": 0
    }
  }
}
```

## Testing: Three-Phase Validation

### Phase 1: Basic API Connectivity (5 mins)

#### Test 1.1: Repository Access
```bash
curl http://localhost:3000/api/v1/github/api-status
```

**Expected:** 
- `"configured": true`
- `"status": "connected"`
- Repository info displayed

#### Test 1.2: Commit Test
```bash
curl -X POST http://localhost:3000/api/v1/github/test-commit \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "setup-test.json",
    "content": "{\"test\": true, \"timestamp\": \"'$(date -Iseconds)'\"}"
  }'
```

**Expected:**
```json
{
  "success": true,
  "title": "GitHub Commit Test",
  "message": "Test commit successful",
  "data": {
    "success": true,
    "file": {
      "path": "test-artifacts/setup-test.json",
      "size": 67
    },
    "commit": {
      "sha": "abc1234...",
      "message": "test: GitHub API commit test - 2025-11-18T...",
      "url": "https://github.com/owner/repo/commit/abc1234..."
    }
  }
}
```

**Verification on GitHub:**
- Check repository → `test-artifacts/setup-test.json` file appears
- Check commit history → New test commit visible

### Phase 2: Pull Request Workflow (5 mins)

#### Test 2.1: Create PR
```bash
curl -X POST http://localhost:3000/api/v1/github/test-pull-request \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test: GitHub API Pull Request Integration",
    "description": "This PR tests the GitHub API integration.\n\n## Test Details\n- API: Functional\n- Branch: Auto-created\n- Labels: Applied\n\nReady for review!"
  }'
```

**Expected:**
```json
{
  "success": true,
  "title": "GitHub Pull Request Test",
  "message": "Test PR created successfully",
  "data": {
    "success": true,
    "prNumber": 1,
    "url": "https://github.com/owner/repo/pull/1",
    "branch": "test-pr-1700315400123"
  }
}
```

**Verification on GitHub:**
- Check Pull Requests → New PR appears
- PR title: "Test PR - 2025-11-18T..."
- PR body: Contains description
- Labels: `test`, `automated`, `phase-4-3` applied
- Branch: `test-pr-*` created with test file

#### Test 2.2: Verify PR Details
```bash
# Visit the PR URL from response
# Verify:
# - [ ] PR title is correct
# - [ ] PR description is displayed
# - [ ] Labels are applied (test, automated, phase-4-3)
# - [ ] New branch created with test file
# - [ ] Can merge without conflicts
```

### Phase 3: Issue Creation (5 mins)

#### Test 3.1: Create Issue
```bash
curl -X POST http://localhost:3000/api/v1/github/test-issue \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test: GitHub API Issue Creation",
    "description": "## Issue Test\n\nThis issue was created by TooLoo.ai Phase 4.3 GitHub API integration.\n\n### Details\n- Method: GitHub API\n- Status: Testing\n- Labels: Automated\n\nThis validates issue creation capability."
  }'
```

**Expected:**
```json
{
  "success": true,
  "title": "GitHub Issue Test",
  "message": "Test issue created successfully",
  "data": {
    "success": true,
    "issueNumber": 1,
    "url": "https://github.com/owner/repo/issues/1"
  }
}
```

**Verification on GitHub:**
- Check Issues → New issue appears
- Issue title and description match
- Labels applied: `test`, `automated`, `phase-4-3`

## Advanced Testing: Analysis Integration

### Test 4: Auto-Commit Analysis

```bash
curl -X POST http://localhost:3000/api/v1/github/commit-analysis \
  -H "Content-Type: application/json" \
  -d '{
    "analysis": {
      "analysisType": "emotion",
      "primary": "joy",
      "sentiment": "positive",
      "confidence": 0.95,
      "language": "en",
      "summary": "Text analysis shows strong positive emotion",
      "findings": ["High joy intensity", "Positive sentiment", "Enthusiastic tone"]
    },
    "branch": "analysis/emotion-test",
    "message": "analysis: Emotion detection test"
  }'
```

**Expected:** Commit with analysis JSON in `analyses/emotion/` directory

### Test 5: Analysis PR Creation

```bash
curl -X POST http://localhost:3000/api/v1/github/create-pr \
  -H "Content-Type: application/json" \
  -d '{
    "analysis": {
      "analysisType": "emotion",
      "primary": "joy",
      "sentiment": "positive",
      "confidence": 0.95,
      "language": "en",
      "summary": "Text analysis shows strong positive emotion",
      "findings": ["High joy intensity", "Positive sentiment"],
      "filesChanged": "1 analysis file"
    },
    "baseBranch": "main",
    "headBranch": "analysis/emotion-test"
  }'
```

**Expected:** PR with formatted analysis findings

### Test 6: Analysis Issue Creation

```bash
curl -X POST http://localhost:3000/api/v1/github/create-issue \
  -H "Content-Type: application/json" \
  -d '{
    "analysis": {
      "analysisType": "emotion",
      "primary": "joy",
      "sentiment": "positive",
      "confidence": 0.95,
      "intensity": 0.85,
      "language": "en",
      "description": "High confidence joy detection",
      "recommendation": "Review and take action if needed"
    }
  }'
```

**Expected:** Issue with analysis details and severity labeling

## Monitoring & Debugging

### Check Integration Health

```bash
# Check provider status
curl http://localhost:3000/api/v1/github/api-status

# Check workflow statistics
curl http://localhost:3000/api/v1/github/workflow-stats

# Reset statistics if needed
curl -X POST http://localhost:3000/api/v1/github/reset-stats
```

### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| `"GitHub not configured"` | Set GITHUB_TOKEN and GITHUB_REPO in .env and restart server |
| `401 Unauthorized` | Check token validity - tokens expire or can be revoked |
| `404 Not Found` | Verify GITHUB_REPO format is `owner/repo` |
| `403 Forbidden` | Token lacks required permissions - regenerate with correct scopes |
| `422 Unprocessable Entity` | Check branch/PR/issue data format, may have conflicts |

### Logs to Monitor

```bash
# Watch server logs for GitHub API calls
tail -f logs/web-server.log | grep -i github

# Look for:
# - Successful API calls (200 responses)
# - Auth failures (401)
# - Rate limit issues (429)
# - Network timeouts
```

## Clean Up Test Artifacts

### After Testing is Complete

```bash
# Delete test files (keep repo clean)
curl -X POST http://localhost:3000/api/v1/github/reset-stats

# Close/delete test PRs
# Close/delete test issues
# Delete test-artifacts/ directory (optional)

# On GitHub UI:
# 1. Close all test PRs
# 2. Close all test issues
# 3. Delete test branches
# 4. Delete test-artifacts/ directory
```

## Success Criteria Checklist

For Phase 4.3 GitHub API Integration to be considered COMPLETE:

### Configuration ✅
- [ ] GITHUB_TOKEN set and valid
- [ ] GITHUB_REPO points to accessible repository
- [ ] API Status endpoint returns "connected"

### Commit Operations ✅
- [ ] Test commit creates file in repository
- [ ] Commit message is correct
- [ ] Branch specification works

### Pull Request Operations ✅
- [ ] PR created with correct title and body
- [ ] Labels automatically applied
- [ ] Branch created with test file
- [ ] PR is mergeable (no conflicts)

### Issue Operations ✅
- [ ] Issue created with title and body
- [ ] Labels applied correctly
- [ ] Issue visible on GitHub Issues page

### Analysis Integration ✅
- [ ] Analysis data commits correctly
- [ ] PR with findings created and formatted
- [ ] Issue with analysis data created

### Statistics & Monitoring ✅
- [ ] Workflow stats tracked correctly
- [ ] Stats can be reset
- [ ] Error counts work properly

## Next Steps After Testing

Once all tests pass:

1. **Document Results** → Create Phase 4.3 completion report
2. **Staging Deploy** → Deploy to staging environment (parallel track)
3. **48-Hour Monitor** → Collect baseline metrics
4. **Begin Phase 4.4** → Start Slack integration (Nov 19)

## Useful Commands

```bash
# Start server with GitHub integration enabled
GITHUB_TOKEN="ghp_..." GITHUB_REPO="owner/repo" npm run dev

# Run integration tests
npm test -- tests/github-api-integration.test.js

# Check git commits created by integration
git log --grep="test:" | head -20

# View recent API activity
grep "github" servers/web-server.js | wc -l

# Quick repo health check
curl -s http://localhost:3000/api/v1/github/api-status | jq '.data.status'
```

---

**Estimated Time for Complete Testing:** 30-45 minutes  
**Success Probability (if credentials are valid):** 95%+  
**Risk Level:** LOW (test repo, not production)

Ready to validate GitHub integration! 🚀
