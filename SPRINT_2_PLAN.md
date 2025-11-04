# 📋 Sprint 2 Plan: Phase 7.3 + Phase 11
**Status:** Planning (Ready for execution)  
**Date:** November 4, 2025  
**Target Duration:** 2 weeks (starting immediately after Sprint 1 feedback)  
**System:** Production-live consolidation (10 services, port 3000)  

---

## 🎯 Sprint Goals

| Goal | Phase | Priority | Outcome |
|------|-------|----------|---------|
| **Standardize LLM calls** | 7.3 | MEDIUM | All 5 services use unified interface |
| **Build adapter framework** | 11 | HIGH | OAuth + Figma + Generic integrations ready |
| **Enable extensibility** | 11 | HIGH | Third-party integrations possible |
| **Zero downtime** | Both | CRITICAL | System stays live throughout |

---

## 📊 Phase 7.3: LLMProvider Standardization

### Current State: 5 Services, Inconsistent Patterns

**Service 1: training-server (port 3001)**
```javascript
// Current: Class method via TrainingCamp engine
const { default: TrainingCamp } = await import('../engine/training-camp.js');
const engine = new TrainingCamp();
const response = await engine.runSelectionRound(request);
// Internally calls: this.llm.generateSmartLLM(prompt)
```

**Service 2: coach-server (port 3004)**
```javascript
// Current: Class method via AutoCoach engine
import AutoCoach from '../engine/auto-coach.js';
const coach = new AutoCoach();
const response = await coach.provideFeedback(userData);
// Internally calls: this.llm.generateSmartLLM({...})
```

**Service 3: product-dev-server (port 3006)**
```javascript
// Current: Engine wrapper
import ProductAnalysisEngine from '../engine/product-analysis-engine.js';
const result = await ProductAnalysisEngine.generateProductIdeas(topic, count);
// Internally calls: this.llm.generateSmartLLM({...})
```

**Service 4: reports-server (port 3008)**
```javascript
// Current: Standalone function (dynamic import)
const { generateSmartLLM } = await import('../engine/llm-provider.js');
const response = await generateSmartLLM({prompt, system, taskType, ...});
```

**Service 5: meta-server (port 3002)**
```javascript
// Current: Engine wrapper
import MetaLearningEngine from '../engine/meta-learning-engine.js';
const result = await engine.analyzePerformance(metrics);
// Internally calls: this.llm.generateSmartLLM({...})
```

### 7.3 Tasks

| # | Task | Duration | Complexity | Files |
|---|------|----------|-----------|-------|
| 7.3.1 | **Audit:** Document exact signatures | 20 min | LOW | llm-provider.js, training-camp.js, auto-coach.js, etc |
| 7.3.2 | **Design:** Create unified interface spec | 15 min | MEDIUM | (spec document) |
| 7.3.3 | **Implement:** Update LLMProvider.generate() | 20 min | MEDIUM | engine/llm-provider.js |
| 7.3.4 | **Update:** Each service (5× 5 min) | 25 min | LOW | training-camp.js, auto-coach.js, product-analysis-engine.js, reports-server.js, meta-learning-engine.js |
| 7.3.5 | **Test:** Smoke test + integration tests | 20 min | MEDIUM | tests/smoke-test.js + new tests |
| 7.3.6 | **Verify:** No regressions | 10 min | LOW | (manual verification) |

**Total: 110 minutes (~2 hours)**

### Deliverable: Unified LLMProvider Interface

```javascript
// NEW: Single unified interface for all services
class LLMProvider {
  async generate(request) {
    const {
      prompt,              // REQUIRED: Main query/instruction
      system,              // OPTIONAL: System prompt (default: smart default)
      taskType,            // OPTIONAL: 'analysis'|'generation'|'critique'|'planning'
      context,             // OPTIONAL: Domain context
      maxTokens,           // OPTIONAL: Max output length (default: 2000)
      criticality,         // OPTIONAL: 'low'|'normal'|'high' (default: 'normal')
      temperature,         // OPTIONAL: Creativity 0.0-1.0 (default: 0.7)
      provider,            // OPTIONAL: Force specific provider
      timeout              // OPTIONAL: Timeout in ms (default: 30000)
    } = request;

    // Unified logic:
    // 1. Validate parameters
    // 2. Select optimal provider (based on criticality, domain expertise)
    // 3. Call provider with timeout
    // 4. Return {text, provider, confidence, metadata}
  }

  // Backwards-compatible
  async generateSmartLLM(request) {
    return this.generate(request);
  }
}

// Standalone export (for direct imports)
export async function generateLLM(request) {
  const provider = new LLMProvider();
  return provider.generate(request);
}
```

---

## 🔌 Phase 11: Middleware Adapters

### Architecture Vision

```
TooLoo.ai (Port 3000)
    │
    ├─ /api/v1/adapters/
    │   ├─ GET    /list           → List all adapters
    │   ├─ POST   /init/:name     → Initialize OAuth/Figma/etc
    │   ├─ POST   /oauth/auth     → OAuth callback handler
    │   └─ GET    /health         → Adapter status
    │
    ├─ /adapters/oauth/
    │   ├─ /authorize             → Redirect to provider login
    │   ├─ /callback              → Receive auth code
    │   └─ /token                 → Verify token
    │
    ├─ /adapters/design/
    │   ├─ /files                 → List Figma files
    │   ├─ /components            → List components
    │   └─ /export                → Export assets
    │
    └─ /adapters/integrations/
        ├─ /send                  → Send message (Slack, Discord)
        ├─ /trigger               → Trigger workflow (Zapier, Make)
        └─ /register              → Register new handler
```

### 11 Sub-Tasks

| # | Task | Duration | Complexity | Scope |
|---|------|----------|-----------|-------|
| 11.1 | **Base Adapter Framework** | 30 min | MEDIUM | Create abstract base class + registry |
| 11.2 | **OAuth Adapter** | 40 min | HIGH | Multi-provider OAuth2 (Google, GitHub, Microsoft) |
| 11.3 | **Design Adapter** | 40 min | HIGH | Figma API integration |
| 11.4 | **Integrations Adapter** | 30 min | MEDIUM | Generic handler framework (extensible) |
| 11.5 | **Wire to web-server** | 20 min | MEDIUM | Add `/api/v1/adapters/*` endpoints |
| 11.6 | **Middleware & Auth** | 25 min | MEDIUM | Token validation, error handling |
| 11.7 | **Integration Tests** | 40 min | MEDIUM | OAuth flow, Figma connection, adapter discovery |
| 11.8 | **Documentation** | 30 min | LOW | ADAPTERS_GUIDE.md, setup instructions |

**Total: 255 minutes (~4.5 hours)**

### 11.1: Base Adapter Framework (30 min)

**Create:** `lib/adapters/base-adapter.js`

```javascript
export class BaseAdapter {
  constructor(name, config = {}) {
    this.name = name;
    this.config = config;
    this.isInitialized = false;
    this.lastError = null;
    this.metadata = {
      capabilities: [],
      scopes: [],
      authentication: 'none',
      version: '1.0.0',
      author: 'TooLoo.ai'
    };
  }

  async initialize(config) {
    throw new Error(`${this.name}.initialize() not implemented`);
  }

  async connect() {
    throw new Error(`${this.name}.connect() not implemented`);
  }

  async authenticate(credentials) {
    throw new Error(`${this.name}.authenticate() not implemented`);
  }

  async executeAction(action, params) {
    throw new Error(`${this.name}.executeAction() not implemented`);
  }

  async listCapabilities() {
    return this.metadata.capabilities;
  }

  async health() {
    return {
      name: this.name,
      status: this.isInitialized ? 'ready' : 'not-initialized',
      lastError: this.lastError
    };
  }
}
```

**Create:** `lib/adapters/adapter-registry.js`

```javascript
export class AdapterRegistry {
  constructor() {
    this.adapters = new Map();
    this.initialized = new Set();
  }

  register(adapter) {
    this.adapters.set(adapter.name, adapter);
  }

  async initialize(name, config) {
    const adapter = this.adapters.get(name);
    if (!adapter) throw new Error(`Unknown adapter: ${name}`);
    
    await adapter.initialize(config);
    adapter.isInitialized = true;
    this.initialized.add(name);
  }

  get(name) {
    return this.adapters.get(name);
  }

  list() {
    return Array.from(this.adapters.keys());
  }

  listInitialized() {
    return Array.from(this.initialized);
  }

  async executeAction(adapterName, action, params) {
    const adapter = this.adapters.get(adapterName);
    if (!adapter) throw new Error(`Unknown adapter: ${adapterName}`);
    if (!adapter.isInitialized) throw new Error(`${adapterName} not initialized`);
    
    return adapter.executeAction(action, params);
  }
}
```

### 11.2: OAuth Adapter (40 min)

**Create:** `lib/adapters/oauth-adapter.js`

Supports: Google, GitHub, Microsoft

```javascript
import { BaseAdapter } from './base-adapter.js';

export class OAuthAdapter extends BaseAdapter {
  constructor(config = {}) {
    super('oauth', config);
    this.metadata.authentication = 'oauth2';
    this.metadata.capabilities = [
      'authenticate',
      'refresh-token',
      'revoke-token',
      'get-user-info',
      'list-providers'
    ];

    this.providers = {
      google: {
        clientId: config.google_client_id,
        clientSecret: config.google_client_secret,
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
        scopes: ['profile', 'email']
      },
      github: {
        clientId: config.github_client_id,
        clientSecret: config.github_client_secret,
        authUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        userInfoUrl: 'https://api.github.com/user',
        scopes: ['read:user', 'user:email']
      },
      microsoft: {
        clientId: config.microsoft_client_id,
        clientSecret: config.microsoft_client_secret,
        authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
        scopes: ['profile', 'email']
      }
    };

    this.tokens = new Map(); // userId → {accessToken, refreshToken, expiresAt}
  }

  async initialize(config) {
    this.config = config;
    this.validateConfig();
    this.isInitialized = true;
  }

  validateConfig() {
    // Ensure at least one provider is configured
    const hasProvider = Object.keys(this.providers).some(p => 
      this.config[`${p}_client_id`] && this.config[`${p}_client_secret`]
    );
    if (!hasProvider) throw new Error('No OAuth provider configured');
  }

  async authenticate(provider, code, redirectUri) {
    // Exchange auth code for tokens
    const providerConfig = this.providers[provider];
    if (!providerConfig) throw new Error(`Unknown provider: ${provider}`);

    const response = await fetch(providerConfig.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: providerConfig.clientId,
        client_secret: providerConfig.clientSecret
      })
    });

    const tokenData = await response.json();
    if (!tokenData.access_token) throw new Error('OAuth authentication failed');

    return tokenData;
  }

  async refreshToken(userId, refreshToken) {
    // Refresh expired token
    // TODO: Implement token refresh logic
  }

  async revokeToken(userId) {
    // Revoke user's token
    this.tokens.delete(userId);
  }

  async executeAction(action, params) {
    switch(action) {
      case 'authenticate':
        return this.authenticate(params.provider, params.code, params.redirectUri);
      case 'refresh':
        return this.refreshToken(params.userId, params.refreshToken);
      case 'revoke':
        return this.revokeToken(params.userId);
      case 'list-providers':
        return Object.keys(this.providers);
      default:
        throw new Error(`Unknown OAuth action: ${action}`);
    }
  }

  async connect() {
    return {
      status: 'connected',
      providers: Object.keys(this.providers).filter(p => 
        this.config[`${p}_client_id`]
      )
    };
  }
}
```

### 11.3: Design Adapter - Figma (40 min)

**Create:** `lib/adapters/design-adapter.js`

```javascript
import { BaseAdapter } from './base-adapter.js';

export class DesignAdapter extends BaseAdapter {
  constructor(config = {}) {
    super('design', config);
    this.metadata.authentication = 'api-key';
    this.metadata.capabilities = [
      'list-files',
      'get-file',
      'get-components',
      'export-assets',
      'get-styles'
    ];

    this.figmaToken = config.figma_token;
    this.figmaApiBase = 'https://api.figma.com/v1';
    this.cache = new Map();
    this.cacheExpiry = 3600000; // 1 hour
  }

  async initialize(config) {
    this.figmaToken = config.figma_token;
    if (!this.figmaToken) throw new Error('Missing Figma API token');
    this.isInitialized = true;
  }

  async _call(endpoint, method = 'GET', body = null) {
    const url = `${this.figmaApiBase}${endpoint}`;
    const options = {
      method,
      headers: {
        'X-Figma-Token': this.figmaToken,
        'Content-Type': 'application/json'
      }
    };

    if (body) options.body = JSON.stringify(body);

    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`Figma API error: ${response.statusText}`);
    
    return response.json();
  }

  async listFiles(teamId) {
    const cacheKey = `files-${teamId}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);

    const data = await this._call(`/teams/${teamId}/files`);
    this.cache.set(cacheKey, data);
    setTimeout(() => this.cache.delete(cacheKey), this.cacheExpiry);
    
    return data;
  }

  async getFile(fileId) {
    const cacheKey = `file-${fileId}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);

    const data = await this._call(`/files/${fileId}`);
    this.cache.set(cacheKey, data);
    
    return data;
  }

  async getComponents(fileId) {
    return this._call(`/files/${fileId}/components`);
  }

  async exportAssets(fileId, nodeIds, format = 'png', scale = 1) {
    return this._call(
      `/files/${fileId}/export?ids=${nodeIds.join(',')}&format=${format}&scale=${scale}`
    );
  }

  async executeAction(action, params) {
    switch(action) {
      case 'list-files':
        return this.listFiles(params.teamId);
      case 'get-file':
        return this.getFile(params.fileId);
      case 'get-components':
        return this.getComponents(params.fileId);
      case 'export':
        return this.exportAssets(params.fileId, params.nodeIds, params.format, params.scale);
      default:
        throw new Error(`Unknown design action: ${action}`);
    }
  }

  async connect() {
    try {
      // Test connection
      const response = await this._call('/me');
      return { status: 'connected', user: response };
    } catch (err) {
      return { status: 'error', error: err.message };
    }
  }
}
```

### 11.4: Generic Integrations Adapter (30 min)

**Create:** `lib/adapters/integrations-adapter.js`

```javascript
import { BaseAdapter } from './base-adapter.js';

export class IntegrationsAdapter extends BaseAdapter {
  constructor(config = {}) {
    super('integrations', config);
    this.metadata.capabilities = [
      'send-message',      // Slack, Discord, Teams
      'trigger-workflow',  // Zapier, Make
      'create-event',      // Google Calendar, etc
      'store-data',        // Webhook to database
      'custom-handler'     // User-defined handler
    ];

    this.handlers = new Map();
    this.webhooks = new Map();
  }

  async initialize(config) {
    this.config = config;
    this.isInitialized = true;
  }

  registerHandler(eventType, handler) {
    if (typeof handler !== 'function') {
      throw new Error('Handler must be a function');
    }
    this.handlers.set(eventType, handler);
  }

  registerWebhook(id, callback) {
    this.webhooks.set(id, callback);
  }

  async executeAction(action, params) {
    const handler = this.handlers.get(action);
    if (!handler) throw new Error(`No handler for action: ${action}`);
    
    try {
      return await handler(params);
    } catch (err) {
      this.lastError = err.message;
      throw err;
    }
  }

  async triggerWebhook(id, data) {
    const webhook = this.webhooks.get(id);
    if (!webhook) throw new Error(`Unknown webhook: ${id}`);
    
    return webhook(data);
  }

  async connect() {
    return {
      status: 'ready',
      handlers: Array.from(this.handlers.keys()),
      webhooks: Array.from(this.webhooks.keys())
    };
  }
}
```

### 11.5-11.8: Wire, Test, Document

**Create:** `lib/middleware/adapter-routes.js`

```javascript
export function setupAdapterRoutes(app, registry) {
  // GET /api/v1/adapters/list
  app.get('/api/v1/adapters/list', (req, res) => {
    res.json({
      ok: true,
      available: registry.list(),
      initialized: registry.listInitialized()
    });
  });

  // POST /api/v1/adapters/init/:name
  app.post('/api/v1/adapters/init/:name', async (req, res) => {
    try {
      const { name } = req.params;
      const { config } = req.body;
      await registry.initialize(name, config);
      res.json({ ok: true, message: `${name} adapter initialized` });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  // POST /api/v1/adapters/:name/action/:action
  app.post('/api/v1/adapters/:name/action/:action', async (req, res) => {
    try {
      const { name, action } = req.params;
      const result = await registry.executeAction(name, action, req.body);
      res.json({ ok: true, result });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  // GET /api/v1/adapters/health
  app.get('/api/v1/adapters/health', async (req, res) => {
    const health = {};
    for (const name of registry.list()) {
      const adapter = registry.get(name);
      health[name] = await adapter.health();
    }
    res.json({ ok: true, adapters: health });
  });
}
```

---

## 📈 Combined Execution Timeline

### Week 1 (Phase 7.3)
```
Mon:  Phase 7.3.1 Audit (20 min)
      Phase 7.3.2 Design (15 min)
Tue:  Phase 7.3.3 Implement (20 min)
      Phase 7.3.4 Update services (25 min)
Wed:  Phase 7.3.5-6 Testing & Verify (30 min)
      MERGE to main

Thu:  Phase 11.1 Base Adapter (30 min)
Fri:  Phase 11.2 OAuth Adapter (40 min)
```

### Week 2 (Phase 11)
```
Mon:  Phase 11.3 Design Adapter (40 min)
Tue:  Phase 11.4 Integrations (30 min)
      Phase 11.5 Wire to web-server (20 min)
Wed:  Phase 11.6 Middleware (25 min)
Thu:  Phase 11.7 Integration Tests (40 min)
Fri:  Phase 11.8 Documentation (30 min)
      FINAL MERGE to main
```

**Total: ~365 minutes (~6 hours over 2 weeks)**

---

## ✅ Success Criteria

### Phase 7.3
- [ ] All 5 services use `LLMProvider.generate(request)` or `generateLLM(request)`
- [ ] Backwards compatibility maintained
- [ ] No endpoints broken
- [ ] Smoke test passes 80%+ (6/10 services)

### Phase 11
- [ ] OAuth adapter initializes and supports 3 providers
- [ ] Figma adapter can list files and export assets
- [ ] Integrations adapter is extensible
- [ ] `/api/v1/adapters/*` endpoints functional
- [ ] Documentation complete (ADAPTERS_GUIDE.md)

### Overall
- [ ] Zero production downtime
- [ ] All tests pass
- [ ] Merged to main branch
- [ ] Ready for user beta testing

---

## 🚀 Next Steps

**Ready to start Phase 7.3 now?**

I can:
1. **Audit LLMProvider** - Exact call signatures from all 5 services
2. **Create implementation plan** - Step-by-step refactoring
3. **Build adapters framework** - Start with Phase 11.1

Which would you like to do first?

---

**Expected Outcome:**
- ✅ Unified LLM interface (Phase 7.3)
- ✅ Extensible adapter framework (Phase 11)
- ✅ Production system stays live
- ✅ Foundation for future integrations

