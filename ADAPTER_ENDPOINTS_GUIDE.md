# 🧪 Adapter Endpoints Testing Guide

**Date:** November 4, 2025  
**Status:** Phase 11 Adapters - Ready for Wiring  
**Current Phase:** 11.5+ (Web-server Integration)

---

## 📋 Quick Start

### Run All Tests
```bash
npm run test:adapters          # Full comprehensive test
npm run test:endpoints         # Just endpoint tests
npm run test:all:comprehensive # Adapters + Smoke + QA
```

### Run Targeted Tests
```bash
npm run test:phase7      # Test LLMProvider interface only
npm run test:phase11     # Test all Phase 11 adapters
```

### Start System First
```bash
npm run dev              # Start all services (required for tests)
```

---

## 🚀 Endpoint Architecture

### Current System (Live)
```
Port 3000 → Web-Server (UI + API proxy)
Port 3001 → Training Server
Port 3002 → Meta Server
Port 3003 → Budget Server
Port 3004 → Coach Server
Port 3005 → Cup Server
Port 3006 → Product Development Server
Port 3007 → Segmentation Server
Port 3008 → Reports Server
Port 3009 → Capabilities Server
Port 3123 → Orchestrator
```

### Phase 11 Adapter Endpoints (To Be Wired)

All endpoints proxied through **Port 3000 (Web-Server)**:

```
GET    /api/v1/health
GET    /api/v1/system/health
GET    /api/v1/adapters/list
GET    /api/v1/adapters/health
POST   /api/v1/adapters/init/:name
GET    /api/v1/adapters/:name/info
GET    /api/v1/adapters/:name/capabilities
GET/POST /api/v1/adapters/:name/action/:action
```

---

## 🔌 Adapter Endpoints Detail

### 1. Health & Discovery

#### Get Health Status
```bash
curl http://127.0.0.1:3000/api/v1/health
```

**Response:**
```json
{
  "ok": true,
  "server": "web",
  "time": "2025-11-04T23:09:09.297Z"
}
```

#### List Available Adapters
```bash
curl http://127.0.0.1:3000/api/v1/adapters/list
```

**Response (Planned):**
```json
{
  "adapters": ["oauth", "design", "integrations"],
  "total": 3,
  "timestamp": "2025-11-04T23:09:09.297Z"
}
```

#### Get Adapter Health
```bash
curl http://127.0.0.1:3000/api/v1/adapters/health
```

**Response (Planned):**
```json
{
  "adapters": {
    "oauth": {
      "status": "healthy",
      "initialized": true,
      "lastChecked": "2025-11-04T23:09:09.297Z"
    },
    "design": {
      "status": "healthy",
      "initialized": true,
      "lastChecked": "2025-11-04T23:09:09.297Z"
    },
    "integrations": {
      "status": "healthy",
      "initialized": true,
      "lastChecked": "2025-11-04T23:09:09.297Z"
    }
  }
}
```

---

### 2. Adapter Initialization

#### Initialize an Adapter
```bash
curl -X POST http://127.0.0.1:3000/api/v1/adapters/init/oauth \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Response (Planned):**
```json
{
  "adapter": "oauth",
  "initialized": true,
  "message": "OAuth adapter initialized successfully"
}
```

---

### 3. OAuth Adapter Endpoints

#### List OAuth Providers
```bash
curl http://127.0.0.1:3000/api/v1/adapters/oauth/action/list-providers
```

**Response (Planned):**
```json
{
  "providers": ["google", "github", "microsoft"],
  "capabilities": {
    "google": ["login", "profile"],
    "github": ["login", "repos"],
    "microsoft": ["login", "calendar"]
  }
}
```

#### Get Authorization URL
```bash
curl -X POST http://127.0.0.1:3000/api/v1/adapters/oauth/action/auth-url \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "google",
    "redirectUri": "http://localhost:3000/auth/callback",
    "state": "random-state-string",
    "scope": ["profile", "email"]
  }'
```

**Response (Planned):**
```json
{
  "provider": "google",
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...",
  "state": "random-state-string",
  "expiresIn": 600
}
```

#### Exchange Code for Token
```bash
curl -X POST http://127.0.0.1:3000/api/v1/adapters/oauth/action/authenticate \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "google",
    "code": "auth-code-from-google",
    "redirectUri": "http://localhost:3000/auth/callback"
  }'
```

**Response (Planned):**
```json
{
  "provider": "google",
  "userId": "user@example.com",
  "accessToken": "ya29.abc123...",
  "refreshToken": "1//0gZa...",
  "expiresIn": 3600,
  "tokenType": "Bearer"
}
```

#### Get User Info
```bash
curl -X POST http://127.0.0.1:3000/api/v1/adapters/oauth/action/get-user \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "google",
    "accessToken": "ya29.abc123..."
  }'
```

**Response (Planned):**
```json
{
  "provider": "google",
  "userId": "user@example.com",
  "name": "John Doe",
  "email": "user@example.com",
  "avatar": "https://...",
  "profile": {
    "locale": "en",
    "picture": "https://..."
  }
}
```

#### Refresh Token
```bash
curl -X POST http://127.0.0.1:3000/api/v1/adapters/oauth/action/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user@example.com",
    "refreshToken": "1//0gZa..."
  }'
```

**Response (Planned):**
```json
{
  "userId": "user@example.com",
  "accessToken": "ya29.new-token...",
  "expiresIn": 3600
}
```

#### Revoke Token
```bash
curl -X POST http://127.0.0.1:3000/api/v1/adapters/oauth/action/revoke \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user@example.com"
  }'
```

**Response (Planned):**
```json
{
  "success": true,
  "message": "Token revoked successfully"
}
```

---

### 4. Design Adapter (Figma) Endpoints

#### List Figma Files
```bash
curl http://127.0.0.1:3000/api/v1/adapters/design/action/list-files?teamId=<team-id>
```

**Response (Planned):**
```json
{
  "files": [
    {
      "key": "abc123",
      "name": "Design System",
      "thumbnail_url": "https://...",
      "lastModified": "2025-11-04T23:09:09.297Z"
    }
  ],
  "total": 1
}
```

#### Get File Structure
```bash
curl http://127.0.0.1:3000/api/v1/adapters/design/action/get-file?fileId=abc123
```

**Response (Planned):**
```json
{
  "fileId": "abc123",
  "name": "Design System",
  "pages": [
    {
      "id": "page-1",
      "name": "Components",
      "nodeCount": 24
    }
  ],
  "components": [
    {
      "id": "comp-1",
      "name": "Button",
      "description": "Primary button component"
    }
  ]
}
```

#### Get Components
```bash
curl http://127.0.0.1:3000/api/v1/adapters/design/action/get-components?fileId=abc123
```

**Response (Planned):**
```json
{
  "components": [
    {
      "id": "button-primary",
      "name": "Button/Primary",
      "description": "Primary action button",
      "mainComponentId": "comp-1",
      "created": "2025-11-04T23:09:09.297Z"
    }
  ],
  "total": 24
}
```

#### Get Design Styles
```bash
curl http://127.0.0.1:3000/api/v1/adapters/design/action/get-styles?fileId=abc123
```

**Response (Planned):**
```json
{
  "styles": [
    {
      "id": "style-1",
      "name": "Colors/Primary",
      "type": "FILL",
      "value": "#2563eb"
    }
  ],
  "total": 45
}
```

#### Export Assets
```bash
curl -X POST http://127.0.0.1:3000/api/v1/adapters/design/action/export \
  -H "Content-Type: application/json" \
  -d '{
    "fileId": "abc123",
    "nodeIds": ["node-1", "node-2"],
    "format": "png",
    "scale": 2
  }'
```

**Response (Planned):**
```json
{
  "exports": [
    {
      "nodeId": "node-1",
      "url": "https://figma-cdn.../export.png",
      "format": "png"
    }
  ]
}
```

#### Get File History
```bash
curl http://127.0.0.1:3000/api/v1/adapters/design/action/history?fileId=abc123
```

**Response (Planned):**
```json
{
  "versions": [
    {
      "id": "v-1",
      "label": "v1.0",
      "description": "Initial version",
      "createdAt": "2025-11-04T23:09:09.297Z"
    }
  ],
  "total": 1
}
```

---

### 5. Integrations Adapter Endpoints

#### List Available Handlers
```bash
curl http://127.0.0.1:3000/api/v1/adapters/integrations/action/list-handlers
```

**Response (Planned):**
```json
{
  "handlers": ["log", "echo", "delay", "webhook"],
  "registered": 4,
  "builtIn": 3,
  "custom": 1
}
```

#### List Registered Webhooks
```bash
curl http://127.0.0.1:3000/api/v1/adapters/integrations/action/list-webhooks
```

**Response (Planned):**
```json
{
  "webhooks": [
    {
      "id": "webhook-1",
      "url": "https://example.com/webhook",
      "events": ["message"],
      "active": true
    }
  ],
  "total": 1
}
```

#### Register a Webhook
```bash
curl -X POST http://127.0.0.1:3000/api/v1/adapters/integrations/action/register-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "id": "webhook-1",
    "url": "https://example.com/webhook",
    "events": ["message", "error"],
    "secret": "webhook-secret"
  }'
```

**Response (Planned):**
```json
{
  "webhookId": "webhook-1",
  "registered": true,
  "message": "Webhook registered successfully"
}
```

#### Execute Handler
```bash
curl -X POST http://127.0.0.1:3000/api/v1/adapters/integrations/action/custom \
  -H "Content-Type: application/json" \
  -d '{
    "handler": "log",
    "params": {
      "message": "Test message",
      "level": "info"
    }
  }'
```

**Response (Planned):**
```json
{
  "success": true,
  "handler": "log",
  "result": {
    "logged": true,
    "timestamp": "2025-11-04T23:09:09.297Z"
  }
}
```

#### Send Message (Slack/Discord)
```bash
curl -X POST http://127.0.0.1:3000/api/v1/adapters/integrations/action/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "slack",
    "channel": "#general",
    "message": "Hello from TooLoo.ai",
    "attachments": []
  }'
```

**Response (Planned):**
```json
{
  "success": true,
  "platform": "slack",
  "messageId": "msg-123",
  "timestamp": "2025-11-04T23:09:09.297Z"
}
```

#### Trigger Workflow (Zapier/Make)
```bash
curl -X POST http://127.0.0.1:3000/api/v1/adapters/integrations/action/trigger-workflow \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "zapier",
    "workflowId": "zap-123",
    "data": {
      "text": "Test data"
    }
  }'
```

**Response (Planned):**
```json
{
  "success": true,
  "platform": "zapier",
  "executionId": "exec-123"
}
```

---

## 🧪 Testing Commands

### Full Test Suite
```bash
# Start system first
npm run dev

# In another terminal:
npm run test:adapters
```

### Individual Adapter Tests
```bash
# OAuth only
curl http://127.0.0.1:3000/api/v1/adapters/oauth/action/list-providers

# Design only
curl http://127.0.0.1:3000/api/v1/adapters/design/action/list-files

# Integrations only
curl http://127.0.0.1:3000/api/v1/adapters/integrations/action/list-handlers
```

### Phase 7.3 LLMProvider Test
```bash
npm run test:phase7
```

### System Health
```bash
curl http://127.0.0.1:3000/api/v1/health
curl http://127.0.0.1:3000/api/v1/system/health
```

---

## 📊 Test Coverage

### Currently Implemented
- ✅ Web-server health checks
- ✅ LLMProvider interface (Phase 7.3)
- ✅ Adapter classes (Phase 11.1-4)
- ✅ Adapter registry pattern

### To Be Implemented (Phase 11.5+)
- ❌ Web-server adapter routes
- ❌ Middleware authentication
- ❌ Endpoint integration
- ❌ Error handling
- ❌ Response formatting

### Test Status
```
Phase 7.3:       ✅ COMPLETE
Phase 11.1-11.4: ✅ COMPLETE (adapters built)
Phase 11.5-11.6: ⏳ PENDING (endpoints to wire)
Phase 11.7:      ⏳ PENDING (integration tests)
Phase 11.8:      ⏳ PENDING (documentation)
```

---

## 🔑 Configuration

### OAuth Adapter Configuration
```javascript
{
  "oauth": {
    "providers": {
      "google": {
        "clientId": process.env.GOOGLE_CLIENT_ID,
        "clientSecret": process.env.GOOGLE_CLIENT_SECRET,
        "redirectUri": "http://localhost:3000/auth/google/callback"
      },
      "github": {
        "clientId": process.env.GITHUB_CLIENT_ID,
        "clientSecret": process.env.GITHUB_CLIENT_SECRET,
        "redirectUri": "http://localhost:3000/auth/github/callback"
      },
      "microsoft": {
        "clientId": process.env.MICROSOFT_CLIENT_ID,
        "clientSecret": process.env.MICROSOFT_CLIENT_SECRET,
        "redirectUri": "http://localhost:3000/auth/microsoft/callback"
      }
    }
  }
}
```

### Design Adapter Configuration
```javascript
{
  "design": {
    "figma": {
      "apiToken": process.env.FIGMA_TOKEN,
      "cache": {
        "enabled": true,
        "ttl": 3600
      }
    }
  }
}
```

### Integrations Adapter Configuration
```javascript
{
  "integrations": {
    "slack": {
      "webhookUrl": process.env.SLACK_WEBHOOK_URL
    },
    "discord": {
      "webhookUrl": process.env.DISCORD_WEBHOOK_URL
    },
    "zapier": {
      "apiKey": process.env.ZAPIER_API_KEY
    }
  }
}
```

---

## ✅ Next Steps

1. **Phase 11.5: Wire Adapters to Web-Server** (20 min)
   - Create adapter route handlers
   - Wire to port 3000
   - Add middleware

2. **Phase 11.6: Add Authentication** (25 min)
   - Token validation
   - Error handling
   - Request logging

3. **Phase 11.7: Integration Tests** (40 min)
   - End-to-end flows
   - OAuth complete cycle
   - Figma integration (with real token)

4. **Phase 11.8: Documentation** (30 min)
   - Setup guides
   - API docs
   - Example workflows

5. **Final: Merge to Main** (5 min)
   - Verify smoke tests pass
   - Confirm no regressions
   - Mark Phase 11 complete

---

## 📞 Support

For issues, errors, or questions:

1. Check logs: `tail -100 /tmp/web-server.log`
2. Run health check: `curl http://127.0.0.1:3000/api/v1/health`
3. Test endpoints: `npm run test:adapters`
4. Check branch status: `npm run branch:status`

---

**Status:** Sprint 2 Phase 11 Adapters ✅ FRAMEWORK COMPLETE → ⏳ WIRING IN PROGRESS

