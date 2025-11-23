# GitHub & Slack Integration: Technical Implementation Specs

**Document Version:** 1.0  
**Date:** November 17, 2025  
**Audience:** Backend developers, DevOps, architects

---

## Overview

This document provides **technical specifications** for implementing the integration improvements outlined in `GITHUB-SLACK-INTEGRATION-IMPROVEMENTS.md`.

**Current Endpoints:** 16 total (8 GitHub + 8 Slack)  
**Proposed New Endpoints:** 24+ (organized by tier)

---

## Part 1: GitHub Enhancements - Technical Specs

### 1.1 Webhook Integration

**New Files:**
- `engine/github-webhook-handler.js` (250 lines)
- `lib/webhook-validator.js` (120 lines)
- `lib/github-event-dispatcher.js` (180 lines)

**New Endpoints:**

```http
POST /api/v1/github/configure-webhook
Content-Type: application/json

Request:
{
  "owner": "oripridan-dot",
  "repo": "TooLoo.ai",
  "events": ["push", "pull_request", "issues", "issue_comment"],
  "active": true
}

Response:
{
  "ok": true,
  "webhookId": "wh_1234567890",
  "url": "https://tooloo.ai/api/v1/github/webhook",
  "events": [...],
  "createdAt": "2025-11-17T12:00:00Z",
  "lastDelivery": null
}
```

```http
POST /api/v1/github/webhook
Content-Type: application/json
X-Hub-Signature-256: sha256=...

Request: (GitHub webhook payload)
{
  "action": "opened",
  "pull_request": {...},
  "repository": {...},
  "sender": {...}
}

Response:
{
  "ok": true,
  "eventType": "pull_request.opened",
  "processed": true,
  "handledBy": "pr-review-queue"
}
```

**Implementation Details:**

1. **Signature Validation:**
   ```javascript
   // Use GITHUB_WEBHOOK_SECRET from .env
   // Compute HMAC-SHA256 of request body
   // Compare with X-Hub-Signature-256 header
   // Reject if mismatch
   ```

2. **Event Dispatcher:**
   ```javascript
   eventMap = {
     'push': handlePushEvent,
     'pull_request.opened': handlePROpen,
     'pull_request.synchronize': handlePRSync,
     'pull_request.closed': handlePRClose,
     'issues.opened': handleIssueOpen,
     'issue_comment.created': handleCommentCreated,
   }
   ```

3. **Queue Strategy:**
   - Store events in Redis queue for async processing
   - Process in worker threads to avoid blocking
   - Retry failed events with exponential backoff
   - Track delivery metrics (success, latency, errors)

4. **Persistence:**
   - Store webhook configuration in DB/JSON file
   - Track delivery history (last 100 deliveries)
   - Monitor failed deliveries, alert if >5 consecutive failures

---

### 1.2 PR Review Automation

**New Files:**
- `engine/github-pr-reviewer.js` (350 lines)
- `lib/code-quality-analyzer.js` (280 lines)
- `lib/diff-analyzer.js` (200 lines)

**New Endpoints:**

```http
GET /api/v1/github/pr/:number/quality-check
Response:
{
  "ok": true,
  "prNumber": 123,
  "qualityScore": 8.4,  // 0-10
  "categories": {
    "codeSmells": {
      "score": 7.2,
      "issues": [
        {
          "file": "src/index.js",
          "line": 45,
          "type": "complexity",
          "severity": "medium",
          "message": "Function 'parseData' has 12 branches (max: 8)",
          "suggestion": "Consider extracting conditional logic"
        }
      ]
    },
    "testCoverage": {
      "score": 9.1,
      "coverage": 87,
      "newLinesUncovered": 12,
      "recommendations": ["Cover edge case in handleError()"]
    },
    "security": {
      "score": 9.8,
      "vulnerabilities": 0,
      "warnings": []
    },
    "performance": {
      "score": 8.0,
      "bundleSizeDelta": "+2.4kb",
      "recommendations": ["Consider lazy-loading user module"]
    }
  },
  "canMerge": true,
  "blockers": [],
  "reviewSummary": "Code quality acceptable. Recommend addressing code smell in parseData()."
}
```

```http
POST /api/v1/github/pr/:number/auto-review
Request:
{
  "checkCoverage": true,
  "checkSecurity": true,
  "checkPerformance": false,
  "checkComplexity": true
}

Response:
{
  "ok": true,
  "reviewId": "rev_abc123",
  "status": "completed",
  "event": "COMMENT",  // or APPROVE / REQUEST_CHANGES
  "commentUrl": "https://github.com/.../pull/123#issuecomment-1234567890",
  "summary": "✅ Quality review complete. 4 suggestions posted."
}
```

**Analysis Components:**

1. **Complexity Analysis:**
   ```javascript
   // Use existing AST tools (estree, babel)
   // Measure:
   // - Cyclomatic complexity per function
   // - Nesting depth
   // - Parameter count
   // - Function size
   ```

2. **Test Coverage:**
   ```javascript
   // Parse diff to find new lines
   // Compare against coverage reports (if available)
   // Flag untested code
   // Suggest test cases
   ```

3. **Security Scanning:**
   ```javascript
   // Check for:
   // - Hardcoded secrets
   // - Unsafe dependencies (via package audit)
   // - OWASP patterns (SQL injection, XSS)
   // - Type errors (if TypeScript)
   ```

4. **Performance:**
   ```javascript
   // Estimate bundle size delta
   // Detect algorithmic regressions
   // Check for common perf antipatterns
   ```

---

### 1.3 Repository Health Dashboard

**New Files:**
- `engine/github-health-dashboard.js` (320 lines)
- `lib/repository-metrics.js` (250 lines)

**New Endpoint:**

```http
GET /api/v1/github/health-dashboard?repo=TooLoo.ai&owner=oripridan-dot

Response:
{
  "ok": true,
  "repository": {
    "name": "TooLoo.ai",
    "url": "https://github.com/oripridan-dot/TooLoo.ai",
    "description": "...",
    "stars": 145,
    "watchers": 23,
    "forks": 8
  },
  "branches": {
    "total": 12,
    "active": [
      {
        "name": "main",
        "protected": true,
        "rules": {
          "requireReviews": 1,
          "requireStatusChecks": true,
          "dismissStaleReviews": true,
          "requireCodeOwnerReviews": false
        },
        "latestCommit": {
          "sha": "abc123...",
          "message": "feat: add streaming endpoint",
          "author": "oripridan-dot",
          "date": "2025-11-17T12:00:00Z",
          "checks": {
            "status": "success",
            "tests": "✓ 35/35",
            "lint": "✓ 0 errors"
          }
        },
        "health": {
          "status": "healthy",
          "behindMainBy": 0,
          "aheadOfMainBy": 0
        }
      },
      {
        "name": "develop",
        "protected": false,
        "latestCommit": {...},
        "health": {
          "status": "behind",
          "behindMainBy": 3,
          "aheadOfMainBy": 2
        }
      }
    ]
  },
  "pullRequests": {
    "open": 3,
    "total": 127,
    "avgReviewTime": "4.2 hours",
    "longestOpen": {
      "number": 118,
      "title": "Phase 4.5: Response Streaming",
      "createdAt": "2025-11-15T10:00:00Z",
      "daysOpen": 2,
      "status": "in review",
      "missingReviews": 1
    },
    "readyToMerge": [
      { "number": 120, "title": "...", "approvals": 2 }
    ]
  },
  "issues": {
    "total": 42,
    "open": 18,
    "byLabel": {
      "bug": { "count": 6, "avgAge": 8 },
      "feature": { "count": 7, "avgAge": 14 },
      "urgent": { "count": 2, "avgAge": 2 }
    },
    "oldestOpen": {
      "number": 45,
      "title": "Performance: Reduce bundle size",
      "createdAt": "2025-10-20",
      "daysOpen": 28,
      "stale": true
    }
  },
  "codeQuality": {
    "complexity": "low-medium",
    "avgComplexity": 3.4,
    "vulnerabilities": 0,
    "dependencyHealth": "excellent",
    "outOfDateDeps": 0
  },
  "deployments": {
    "lastDeployment": {
      "timestamp": "2025-11-17T11:30:00Z",
      "status": "success",
      "branch": "main",
      "duration": "2m 15s"
    },
    "uptime": 99.98,
    "errorRate": 0.02,
    "avgResponseTime": "45ms"
  },
  "trends": {
    "pullRequests": {
      "thisWeek": 8,
      "lastWeek": 12,
      "trend": "down"
    },
    "commits": {
      "thisWeek": 34,
      "lastWeek": 28,
      "trend": "up"
    },
    "issues": {
      "openedThisWeek": 5,
      "closedThisWeek": 3,
      "trend": "stable"
    }
  },
  "recommendations": [
    "Issue #45 is stale - consider closing or assigning",
    "PR #118 awaiting 1 review - ping reviewer",
    "Develop branch 3 commits behind main - sync recommended"
  ]
}
```

---

## Part 2: Slack Enhancements - Technical Specs

### 2.1 Slash Commands & Interactive Actions

**New Files:**
- `engine/slack-commands-handler.js` (300 lines)
- `lib/slack-interactions.js` (250 lines)
- `lib/slack-modal-renderer.js` (180 lines)

**Implementation:**

1. **Command Registration:**
   ```javascript
   // POST /api/v1/slack/configure-commands
   // Registers slash commands via Slack API
   
   commands = [
     {
       command: '/tooloo',
       description: 'TooLoo.ai system control',
       subcommands: [
         'status', 'analyze-pr', 'suggest-branch',
         'create-issue', 'leaderboard', 'help'
       ]
     }
   ]
   ```

2. **Slash Command Handler:**
   ```http
   POST /api/v1/slack/commands
   
   Request: (Slack command payload)
   {
     "token": "...",
     "command": "/tooloo",
     "text": "status",
     "user_id": "U123ABC",
     "channel_id": "C456DEF",
     "trigger_id": "...",
     "team_id": "T789GHI"
   }
   
   Response: (immediate)
   {
     "response_type": "in_channel",
     "blocks": [...]  // Visual response
   }
   ```

3. **Interactive Actions:**
   ```http
   POST /api/v1/slack/interactive-actions
   
   Request: (Slack interactive payload)
   {
     "type": "block_actions",
     "user": { "id": "U123ABC" },
     "actions": [
       {
         "action_id": "pr_approve_button",
         "value": "PR-123",
         "type": "button"
       }
     ],
     "trigger_id": "123.456...",
     "team": { "id": "T789GHI" },
     "channel": { "id": "C456DEF" }
   }
   
   Response:
   {
     "ok": true,
     "action": "pr_approve",
     "targetId": "PR-123",
     "result": "Approval recorded on GitHub"
   }
   ```

4. **Supported Commands:**
   ```javascript
   /tooloo status
     → System health dashboard (service status, uptime, metrics)
   
   /tooloo analyze-pr <number>
     → Quality analysis of PR #number (complexity, coverage, security)
   
   /tooloo suggest-branch <description>
     → Generate git-safe branch name from description
   
   /tooloo create-issue
     → Open modal to create GitHub issue from Slack
   
   /tooloo leaderboard
     → Show team learning/productivity leaderboard
   
   /tooloo help
     → Display available commands
   ```

---

### 2.2 Smart Notification Routing

**Configuration Endpoint:**

```http
POST /api/v1/slack/configure-routing-v2
Content-Type: application/json

Request:
{
  "rules": [
    {
      "id": "critical-alerts",
      "trigger": {
        "severity": "critical",
        "type": ["system-error", "deploy-failure"]
      },
      "action": {
        "channels": ["#alerts"],
        "mentions": ["@devops"],
        "priority": "urgent",
        "throttle": false,
        "dnd": false
      }
    },
    {
      "id": "daily-summaries",
      "trigger": {
        "type": "daily-summary"
      },
      "action": {
        "channels": ["#daily-digest"],
        "scheduling": {
          "time": "09:00",
          "timezone": "America/New_York",
          "batch": true,
          "maxPerBatch": 10
        },
        "throttle": true
      }
    },
    {
      "id": "after-hours-queue",
      "trigger": {
        "time": { "after": "6pm", "before": "9am" }
      },
      "action": {
        "dnd": true,
        "queue": true,
        "deliverAt": "09:00"
      }
    }
  ],
  "userPreferences": {
    "doNotDisturbHours": {
      "start": "6pm",
      "end": "9am",
      "timezone": "America/New_York",
      "exceptions": ["critical", "urgent"]
    },
    "notificationMethod": "smart",  // smart | always | digest
    "digestFrequency": "daily"  // daily | weekly | on-demand
  }
}

Response:
{
  "ok": true,
  "rulesConfigured": 3,
  "userPreferencesSet": true,
  "validationWarnings": [],
  "preview": {
    "exampleFlow": "Critical error → #alerts + @devops mention (immediate) | Normal alert → #notifications (queue if after 6pm) | Summary → #digest (batch at 9am)"
  }
}
```

---

### 2.3 Rich Dashboard Rendering

**New Endpoint:**

```http
POST /api/v1/slack/render-dashboard
Content-Type: application/json

Request:
{
  "type": "team-velocity",
  "period": "4 weeks",
  "includeInteractive": true
}

Response:
{
  "ok": true,
  "blocks": [
    {
      "type": "header",
      "text": { "type": "plain_text", "text": "📊 Team Velocity - Last 4 Weeks" }
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "```\nWeek 1: ████████░░ 80 points\nWeek 2: ███████░░░ 70 points\nWeek 3: █████████░ 90 points\nWeek 4: ██████████ 100 points (↑ 12%)\n```"
      }
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": { "type": "plain_text", "text": "Detailed Report" },
          "action_id": "velocity_details",
          "value": "4weeks"
        },
        {
          "type": "button",
          "text": { "type": "plain_text", "text": "Export CSV" },
          "action_id": "velocity_export",
          "value": "4weeks"
        }
      ]
    }
  ],
  "threadTs": "1234567890.123456"
}
```

---

## Part 3: Cross-System Integration

### 3.1 Unified Event Bus

**Architecture:**

```javascript
// lib/unified-event-bus.js (250 lines)

class UnifiedEventBus {
  async emit(event) {
    // Determine source and target system(s)
    const route = this.determineRoute(event);
    
    // Route to appropriate handler
    for (const target of route.targets) {
      if (target === 'github') {
        await this.routeToGitHub(event);
      } else if (target === 'slack') {
        await this.routeToSlack(event);
      }
    }
    
    // Track in audit log
    await this.logEvent(event, route);
  }
}
```

**Event Types:**

```javascript
events = {
  // GitHub → Slack
  'github.pr.opened': 'notify-slack-review-needed',
  'github.pr.approved': 'notify-slack-approved',
  'github.deployment.success': 'notify-slack-deployed',
  'github.deployment.failure': 'notify-slack-deploy-failed',
  'github.issue.created': 'notify-slack-new-issue',
  
  // Slack → GitHub
  'slack.reaction.approved': 'approve-github-pr',
  'slack.reaction.merged': 'merge-github-pr',
  'slack.reaction.rejected': 'request-changes-pr',
  'slack.command.create-issue': 'create-github-issue'
}
```

---

### 3.2 Workflow Automation

**New Files:**
- `engine/workflow-orchestrator.js` (400 lines)
- `lib/workflow-engine.js` (350 lines)
- `lib/condition-evaluator.js` (200 lines)

**Workflow Definition Format:**

```yaml
# workflows/auto-merge-approved-prs.yaml
name: "Auto-Merge Approved PRs"
trigger: "pull_request"
conditions:
  - type: "all_approvals_received"
    requiredCount: 2
  - type: "all_tests_passed"
  - type: "no_pending_reviews"

actions:
  - type: "notify_slack"
    channel: "#deployments"
    message: "PR approved and ready to merge"
  
  - type: "merge_pr"
    strategy: "squash"
    commitMessage: "Auto-merged by workflow"
  
  - type: "notify_github"
    action: "post_comment"
    text: "✅ Auto-merged by workflow engine"
```

**Workflow Execution:**

```javascript
async executeWorkflow(workflowName, context) {
  const workflow = await loadWorkflow(workflowName);
  
  // Evaluate conditions
  for (const condition of workflow.conditions) {
    const result = await evaluateCondition(condition, context);
    if (!result.satisfied) {
      return { success: false, reason: result.reason };
    }
  }
  
  // Execute actions in sequence
  for (const action of workflow.actions) {
    const result = await executeAction(action, context);
    if (!result.success && action.critical) {
      return { success: false, failedAction: action.id, error: result.error };
    }
  }
  
  return { success: true, executedActions: workflow.actions.length };
}
```

---

## Part 4: Database Schema (if using persistent storage)

### GitHub Integration Tables

```sql
CREATE TABLE IF NOT EXISTS github_webhooks (
  id VARCHAR(255) PRIMARY KEY,
  repo_owner VARCHAR(255),
  repo_name VARCHAR(255),
  webhook_id VARCHAR(255),
  url VARCHAR(500),
  events JSON,
  active BOOLEAN DEFAULT true,
  last_delivery TIMESTAMP,
  delivery_count INT DEFAULT 0,
  failure_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY(repo_owner, repo_name)
);

CREATE TABLE IF NOT EXISTS github_webhook_deliveries (
  id VARCHAR(255) PRIMARY KEY,
  webhook_id VARCHAR(255),
  event_type VARCHAR(255),
  payload_signature VARCHAR(255),
  status INT,
  response_code INT,
  latency_ms INT,
  delivered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(webhook_id) REFERENCES github_webhooks(id),
  INDEX(webhook_id, delivered_at)
);

CREATE TABLE IF NOT EXISTS github_pr_reviews (
  id VARCHAR(255) PRIMARY KEY,
  repo_owner VARCHAR(255),
  repo_name VARCHAR(255),
  pr_number INT,
  review_ts TIMESTAMP,
  quality_score DECIMAL(3,1),
  categories JSON,
  review_comment_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY(repo_owner, repo_name, pr_number),
  INDEX(pr_number, review_ts)
);
```

### Slack Integration Tables

```sql
CREATE TABLE IF NOT EXISTS slack_commands (
  id VARCHAR(255) PRIMARY KEY,
  command VARCHAR(255),
  description TEXT,
  handler VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY(command)
);

CREATE TABLE IF NOT EXISTS slack_notification_rules (
  id VARCHAR(255) PRIMARY KEY,
  rule_name VARCHAR(255),
  trigger_conditions JSON,
  action_config JSON,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS slack_threads (
  id VARCHAR(255) PRIMARY KEY,
  channel_id VARCHAR(255),
  thread_ts VARCHAR(255),
  context_data JSON,
  related_artifacts JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY(channel_id, thread_ts)
);
```

---

## Part 5: Environment Variables

Add to `.env`:

```bash
# GitHub Integration
GITHUB_WEBHOOK_SECRET=<generate-random-32-char-secret>
GITHUB_API_RATE_LIMIT_THRESHOLD=4000  # Alert at 80% of 5000
GITHUB_WEBHOOK_EVENTS=push,pull_request,issues,issue_comment
GITHUB_PR_REVIEW_CHECK_COVERAGE=true
GITHUB_PR_REVIEW_CHECK_SECURITY=true
GITHUB_PR_REVIEW_CHECK_COMPLEXITY=true

# Slack Integration
SLACK_WEBHOOK_SECRET=<generate-slack-signing-secret>
SLACK_COMMAND_PREFIX=/tooloo
SLACK_BOT_RATE_LIMIT=60  # messages per minute
SLACK_NOTIFICATION_DND_START=18:00  # 6 PM
SLACK_NOTIFICATION_DND_END=09:00    # 9 AM
SLACK_DIGEST_TIME=09:00             # 9 AM delivery
SLACK_DIGEST_TIMEZONE=America/New_York

# Cross-System
UNIFIED_NOTIFICATION_ENABLED=true
WORKFLOW_AUTOMATION_ENABLED=true
WORKFLOW_STORAGE=filesystem  # or 'database'
WORKFLOW_DEFINITIONS_PATH=./workflows
```

---

## Part 6: Testing Strategy

**Unit Tests:**
- Webhook signature validation (10 tests)
- Event routing logic (15 tests)
- PR analysis modules (20 tests)
- Slack command parsing (12 tests)
- Notification routing rules (18 tests)

**Integration Tests:**
- End-to-end GitHub webhook → Slack notification
- PR review trigger → GitHub PR comment
- Slack command → GitHub artifact creation
- Workflow execution with conditions/actions

**Load Tests:**
- Webhook delivery under spike (1000 events/sec)
- Slack API rate limiting behavior
- Concurrent PR analysis

---

## Deployment Checklist

- [ ] All endpoints have input validation
- [ ] Error responses include actionable messages
- [ ] Rate limiting configured and tested
- [ ] Monitoring/alerting set up for new endpoints
- [ ] Documentation updated
- [ ] Rollback procedure documented
- [ ] Security audit completed (secret handling, HMAC validation)
- [ ] Performance baseline established
- [ ] Team training/onboarding completed

---

## Success Criteria

| Metric | Target | Measurement |
|--------|--------|------------|
| Webhook delivery latency | <100ms | Avg across deliveries |
| PR review completion time | <30s | Time to post review |
| Command invocation rate | >20/day | Per team member |
| Notification CTR | >40% | Click-through on Slack messages |
| Workflow success rate | >95% | % of workflows completing as intended |
| System availability | >99.9% | Uptime across services |

---

End of Technical Specifications
