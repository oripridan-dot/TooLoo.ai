# Phase 3: Integration & Context Services Implementation Plan

## Status: 🟢 IN PROGRESS
**Timeline:** Week 3 (Nov 10-16, 2025)  
**Target:** 1,500+ lines of production code + 50+ tests  
**Services:** Integration Service (Port 3400) + Context Service (Port 3020)

---

## Overview

Phase 3 implements the two supporting services that handle external integrations and repository context. These services extend the learning and provider infrastructure by:
- **Integration Service**: Connecting to GitHub, Slack, email for multi-channel interaction
- **Context Service**: Loading and analyzing repository structure, files, and issues

---

## 1. Integration Service (Port 3400)

### Purpose
- Handle OAuth flows for GitHub/Google/Slack
- Webhook processing (GitHub push, PR, issues; Slack messages)
- External API integration (fetch user repos, create issues, send messages)
- Authentication and authorization
- Token management and refresh

### Architecture

```
integrationService
├── OAuth Handlers
│  ├── GitHub OAuth (code exchange, token refresh)
│  ├── Google OAuth (for Gmail integration)
│  └── Slack OAuth (workspace connection)
│
├── Webhook Handlers
│  ├── GitHub webhooks (push, PR, issues, releases)
│  ├── Slack webhooks (app_mention, message)
│  └── Email webhooks (if configured)
│
├── API Integrations
│  ├── GitHub API (repos, PRs, issues, commits)
│  ├── Slack API (send messages, reactions)
│  └── External services
│
└── Event Integration
   ├── Emit: integration.connected, webhook.received
   └── Subscribe: training.completed (trigger webhooks)
```

### Key Classes

#### 1. OAuthManager
```javascript
class OAuthManager {
  // GitHub OAuth flow
  async initiateGitHubOAuth(state)
  async completeGitHubOAuth(code, state)
  async refreshGitHubToken(userId)
  
  // Slack OAuth flow
  async initiateSlackOAuth(state)
  async completeSlackOAuth(code, state)
  
  // Token management
  async getStoredToken(userId, provider)
  async saveToken(userId, provider, token, refreshToken)
  async isTokenExpired(token)
}
```

#### 2. WebhookHandler
```javascript
class WebhookHandler {
  // GitHub webhooks
  async handleGitHubPush(payload)
  async handleGitHubPullRequest(payload)
  async handleGitHubIssues(payload)
  
  // Slack webhooks
  async handleSlackMessage(payload)
  async handleSlackAppMention(payload)
  
  // Generic handler
  async processWebhook(source, event, payload)
}
```

#### 3. ExternalAPIClient
```javascript
class ExternalAPIClient {
  // GitHub API calls
  async getRepository(owner, repo)
  async listRepositories(username, token)
  async getIssues(owner, repo, token)
  async createIssue(owner, repo, title, body, token)
  
  // Slack API calls
  async sendMessage(channelId, text, token)
  async postToChannel(channel, message, token)
  
  // Generic HTTP client
  async request(method, url, options)
}
```

### API Endpoints

```
Authentication:
GET    /api/v1/oauth/github/authorize     - Start GitHub OAuth
GET    /api/v1/oauth/github/callback      - GitHub OAuth callback
GET    /api/v1/oauth/slack/authorize      - Start Slack OAuth
GET    /api/v1/oauth/slack/callback       - Slack OAuth callback

Webhooks:
POST   /api/v1/webhooks/github           - GitHub webhook receiver
POST   /api/v1/webhooks/slack            - Slack webhook receiver

External APIs:
GET    /api/v1/github/repos              - List user repositories
GET    /api/v1/github/repos/:owner/:repo - Get repository details
GET    /api/v1/github/issues/:owner/:repo - Get issues
POST   /api/v1/github/issues/:owner/:repo - Create issue

GET    /api/v1/slack/channels            - List channels
POST   /api/v1/slack/send                - Send Slack message

System:
GET    /api/v1/integration/health        - Service health
GET    /api/v1/system/info               - API documentation
```

### Events Published
- `integration.connected` - OAuth success
- `integration.disconnected` - Token revoked
- `webhook.received` - Webhook processed
- `github.push` - Code pushed
- `github.pullrequest` - PR created/updated
- `slack.message` - Slack message received

### Configuration

```javascript
// Environment variables needed
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
SLACK_CLIENT_ID=...
SLACK_CLIENT_SECRET=...
OAUTH_CALLBACK_URL=http://localhost:3000/api/v1/oauth/*/callback
WEBHOOK_SECRET=...
```

---

## 2. Context Service (Port 3020)

### Purpose
- Load and cache repository structure
- Analyze file types and organization
- Fetch and index code files
- Track issues and PRs
- Provide code context for learning
- File search and retrieval

### Architecture

```
contextService
├── Repository Management
│  ├── Load repo structure (files, folders)
│  ├── Cache repo metadata
│  ├── Track file changes
│  └── Index code files
│
├── Code Analysis
│  ├── Language detection
│  ├── File size and complexity
│  ├── Function/class extraction
│  └── Dependency analysis
│
├── Issue/PR Tracking
│  ├── Fetch issues and PRs
│  ├── Track status changes
│  ├── Link to code files
│  └── Build context graphs
│
└── Event Integration
   ├── Emit: context.loaded, context.updated
   └── Subscribe: github.push (refresh context)
```

### Key Classes

#### 1. RepositoryManager
```javascript
class RepositoryManager {
  // Repository management
  async loadRepository(owner, repo, branch = 'main')
  async getRepositoryStructure(owner, repo)
  async cacheRepository(owner, repo, structure)
  async refreshRepository(owner, repo)
  
  // File operations
  async getFile(owner, repo, path)
  async listFiles(owner, repo, directory)
  async searchFiles(owner, repo, pattern)
}
```

#### 2. CodeAnalyzer
```javascript
class CodeAnalyzer {
  // Code analysis
  async analyzeFile(content, language)
  async extractFunctions(content, language)
  async extractClasses(content, language)
  async detectLanguage(filename)
  
  // Metrics
  async calculateComplexity(content, language)
  async calculateFileSize(content)
  
  // Build dependency graph
  async analyzeImports(content, language)
}
```

#### 3. ContextIndexer
```javascript
class ContextIndexer {
  // Indexing
  async indexRepository(owner, repo)
  async indexFile(owner, repo, path)
  async updateIndex(owner, repo, changedFiles)
  
  // Search
  async search(query, owner, repo)
  async findFile(owner, repo, pattern)
  async findFunction(owner, repo, name)
}
```

### API Endpoints

```
Repository:
GET    /api/v1/context/repos/:owner/:repo - Get repo context
GET    /api/v1/context/repos/:owner/:repo/files - List files
GET    /api/v1/context/repos/:owner/:repo/structure - Get tree

Files:
GET    /api/v1/context/repos/:owner/:repo/file/:path - Get file content
POST   /api/v1/context/repos/:owner/:repo/analyze - Analyze file

Search:
GET    /api/v1/context/search - Search across repos
GET    /api/v1/context/repos/:owner/:repo/search - Search in repo

Issues:
GET    /api/v1/context/repos/:owner/:repo/issues - Get issues
GET    /api/v1/context/repos/:owner/:repo/issues/:id - Get issue details

System:
GET    /api/v1/context/health - Service health
GET    /api/v1/system/info - API documentation
```

### Events Published
- `context.loaded` - Repository context loaded
- `context.updated` - Repository context refreshed
- `context.file.analyzed` - File analyzed
- `context.search.completed` - Search results ready

---

## 3. Event Flow Integration

### GitHub Push → Learning Flow
```
[GitHub] Push event
  └─> [Webhook] POST /webhooks/github
      └─> [Integration Service] handleGitHubPush()
          └─> emit github.push
              └─> [Context Service] subscribes
                  └─> refreshRepository()
                  └─> emit context.updated
                      └─> [Learning Service] subscribes
                          └─> createChallengeFromFiles()
```

### Training Completion → Slack Notification
```
[Learning Service] completeRound()
  └─> emit training.completed
      └─> [Event Bus]
          └─> [Integration Service] subscribes
              └─> if slack connected:
                  └─> sendMessage()
                      └─> emit integration.slack.sent
```

### User Adds Context → Training Personalization
```
[Context Service] indexRepository()
  └─> emit context.loaded
      └─> [Learning Service] subscribes
          └─> loadContextIntoTraining()
          └─> createFileBasedChallenges()
```

---

## 4. Integration Service Implementation Details

### OAuth Token Storage
```javascript
// File-based or database
{
  userId: "user-123",
  provider: "github",
  accessToken: "ghp_...",
  refreshToken: "ghr_...",
  expiresAt: 1699900000,
  scope: ["repo", "user:email"],
  createdAt: 1699813600
}
```

### Webhook Verification
```javascript
// HMAC verification for security
const crypto = require('crypto');
const signature = req.headers['x-hub-signature-256']; // GitHub
const payload = JSON.stringify(req.body);
const secret = process.env.WEBHOOK_SECRET;
const hash = crypto.createHmac('sha256', secret)
  .update(payload)
  .digest('hex');
const isValid = `sha256=${hash}` === signature;
```

---

## 5. Context Service Implementation Details

### File Tree Caching
```javascript
// Cache structure in-memory with TTL
{
  owner: "oripridan-dot",
  repo: "TooLoo.ai",
  cachedAt: 1699813600,
  ttl: 3600,
  structure: {
    files: [...],
    folders: {...},
    stats: {
      totalFiles: 150,
      languages: { javascript: 80, json: 20, ... }
    }
  }
}
```

### Code Analysis Results
```javascript
{
  owner: "oripridan-dot",
  repo: "TooLoo.ai",
  path: "lib/event-bus.js",
  language: "javascript",
  size: 8321,
  complexity: "medium",
  functions: [
    { name: "emit", startLine: 45, endLine: 65, params: 1 },
    { name: "subscribe", startLine: 68, endLine: 85, params: 2 }
  ],
  classes: [
    { name: "EventBus", startLine: 10, endLine: 250 }
  ],
  imports: ["sqlite3", "uuid", "crypto"]
}
```

---

## 6. Implementation Checklist

### Integration Service
- [ ] Create `servers/integration-service.js` (400+ lines)
  - OAuthManager class
  - WebhookHandler class
  - ExternalAPIClient class
  - Express endpoints
  
- [ ] Create `lib/oauth-manager.js` (300+ lines)
  - GitHub OAuth flow
  - Slack OAuth flow
  - Token management and refresh
  
- [ ] Create `lib/webhook-handler.js` (250+ lines)
  - GitHub webhook processing
  - Slack webhook processing
  - Event emission
  
- [ ] Create `lib/external-api-client.js` (200+ lines)
  - GitHub API calls
  - Slack API calls
  - Error handling

### Context Service
- [ ] Create `servers/context-service.js` (300+ lines)
  - RepositoryManager class
  - CodeAnalyzer class
  - ContextIndexer class
  - Express endpoints
  
- [ ] Create `lib/repository-manager.js` (250+ lines)
  - Repository loading
  - File operations
  - Caching

- [ ] Create `lib/code-analyzer.js` (200+ lines)
  - File analysis
  - Language detection
  - Complexity calculation

- [ ] Create `lib/context-indexer.js` (150+ lines)
  - Indexing and search
  - Cache management

### Testing
- [ ] Integration Service unit tests (25+ tests)
- [ ] Context Service unit tests (25+ tests)
- [ ] Integration tests (15+ tests)
- [ ] Event flow validation

### Documentation
- [ ] API documentation
- [ ] OAuth setup guide
- [ ] Webhook configuration
- [ ] Context loading examples

---

## 7. Testing Strategy

### Unit Tests
- OAuthManager: Token flow, refresh, expiration
- WebhookHandler: Payload parsing, event emission
- RepositoryManager: Caching, file operations
- CodeAnalyzer: Language detection, complexity

### Integration Tests
- OAuth → Token storage → API calls
- GitHub webhook → Context refresh → Learning integration
- File search → Challenge creation

### Mock Providers
- Mock GitHub API responses
- Mock Slack API responses
- Mock file system for testing

---

## 8. Dependencies

```json
{
  "dependencies": {
    "axios": "^1.6.0",
    "jsonwebtoken": "^9.0.0",
    "crypto": "built-in",
    "express": "^4.18.0",
    "sqlite3": "^5.1.0",
    "uuid": "^9.0.0"
  }
}
```

---

## 9. Timeline

**Day 1-2:** Integration Service
- OAuth setup
- Webhook handlers
- External API client

**Day 3-4:** Context Service
- Repository manager
- Code analyzer
- Indexer

**Day 5:** Testing & Integration
- Unit tests (50+ tests)
- Integration tests
- Event flow validation
- Documentation

---

## 10. Success Criteria

- [x] All code written (1,500+ lines)
- [ ] All tests passing (50+ tests)
- [ ] Zero linting errors
- [ ] Event Bus integration working
- [ ] OAuth flows tested
- [ ] Webhook processing validated
- [ ] Code analysis working
- [ ] All endpoints documented
- [ ] Ready for Phase 4

---

## Next Phase (Phase 4)

After Phase 3 completion:
- Analytics Service (metrics, tracking)
- Product Service (workflows, artifacts)
- Design Service (components, branding)
- End-to-end integration tests
- Production stabilization

