# 🔗 TooLoo.ai Outsource Connections Checklist

**Date:** October 31, 2025  
**Purpose:** Verify and establish all external/third-party API connections  
**Status:** Starting verification cycle

---

## 📋 Overview

This document lists ALL external services that TooLoo.ai connects to, with setup instructions and testing procedures.

**Total External Services:** 10  
**Categories:** AI Providers (5), Platform APIs (3), Data Sources (2)

---

## ✅ OUTSOURCE CONNECTION TASKS

### **TIER 1: AI PROVIDER INTEGRATIONS** 🤖

These are required for core functionality. Chat won't work without at least one provider.

#### 1. **Anthropic Claude API** ⭐
**Status:** Configured in `.env`  
**API Key:** `ANTHROPIC_API_KEY`  
**Current Value:** `sk-ant-api03--yzOZAMI1aqPW_NvaorAK-...`  
**Model:** claude-3-5-haiku-20241022 (fallback: claude-3-sonnet-20241022)  
**Port:** 3010 (Chat API Bridge)

**Setup:**
- [ ] Verify API key is valid (currently set)
- [ ] Test provider connectivity
- [ ] Check account has billing enabled
- [ ] Test model inference
- [ ] Verify token limits

**Test Command:**
```bash
curl -X POST http://127.0.0.1:3010/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"provider":"anthropic","message":"Hello, test","model":"claude-3-5-haiku-20241022"}'
```

**Reference:** `servers/chat-api-bridge.js` (line 26+)  
**Documentation:** `PROVIDER_INTEGRATION_GUIDE.md`

---

#### 2. **OpenAI GPT-4 API** 
**Status:** Configured in `.env`  
**API Key:** `OPENAI_API_KEY`  
**Current Value:** `sk-proj-CW5w7DCg9ad2Cf7joUQBU3BV...`  
**Model:** gpt-4-turbo  
**Port:** 3010 (Chat API Bridge)  
**Role:** Fallback provider when Claude unavailable

**Setup:**
- [ ] Verify API key is valid (currently set)
- [ ] Confirm account has billing enabled
- [ ] Check usage limits aren't exceeded
- [ ] Test provider connectivity
- [ ] Verify model is available in account

**Test Command:**
```bash
curl -X POST http://127.0.0.1:3010/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"provider":"openai","message":"Hello, test","model":"gpt-4-turbo"}'
```

**Reference:** `servers/chat-api-bridge.js` (line 26+), `engine/llm-provider.js`  
**Get Keys:** https://platform.openai.com/account/api-keys

---

#### 3. **Google Gemini API** 
**Status:** Configured in `.env`  
**API Key:** `GEMINI_API_KEY`  
**Current Value:** `AIzaSyB2O1Y5oSGDvs8F2Fe5wcvJIHjHuBt5y9I`  
**Model:** gemini-pro  
**Port:** 3010 (Chat API Bridge)  
**Role:** Secondary fallback provider

**Setup:**
- [ ] Verify API key format (must be Google Cloud API key)
- [ ] Confirm key is enabled for Gemini API
- [ ] Test provider connectivity
- [ ] Check quota limits
- [ ] Verify model is available

**Test Command:**
```bash
curl -X POST http://127.0.0.1:3010/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"provider":"gemini","message":"Hello, test","model":"gemini-pro"}'
```

**Reference:** `servers/chat-api-bridge.js` (line 26+)  
**Get Keys:** https://aistudio.google.com/app/apikey

---

#### 4. **DeepSeek API** 
**Status:** Configured in `.env`  
**API Key:** `DEEPSEEK_API_KEY`  
**Current Value:** `sk-58ae2e140c694533b6fd0f957a4add0e`  
**Model:** deepseek-chat  
**Port:** 3010 (Chat API Bridge)  
**Role:** Cost-optimized fallback provider

**Setup:**
- [ ] Verify API key is valid
- [ ] Confirm account has active billing
- [ ] Test provider connectivity
- [ ] Check rate limits
- [ ] Verify model availability

**Test Command:**
```bash
curl -X POST http://127.0.0.1:3010/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"provider":"deepseek","message":"Hello, test","model":"deepseek-chat"}'
```

**Reference:** `servers/chat-api-bridge.js` (line 26+)  
**Get Keys:** https://platform.deepseek.com

---

#### 5. **Ollama Local LLM** (Optional)
**Status:** Optional (for local/offline use)  
**Setup Required:** Download from https://ollama.ai  
**Default Model:** llama2, mistral, neural-chat  
**Port:** 11434 (Ollama), routed via 3010  
**Role:** Free, local, privacy-focused alternative

**Setup:**
- [ ] Download Ollama from https://ollama.ai
- [ ] Install and run `ollama serve`
- [ ] Pull a model: `ollama pull llama2`
- [ ] Test connectivity to http://localhost:11434
- [ ] Verify model loads

**Test Command:**
```bash
curl -X POST http://127.0.0.1:3010/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"provider":"ollama","message":"Hello, test","model":"llama2"}'
```

**Reference:** `servers/chat-api-bridge.js`, `engine/llm-provider.js`

---

### **TIER 2: PLATFORM & INFRASTRUCTURE APIs** 🔧

#### 6. **GitHub Repository API** 
**Status:** Configured partially  
**API Key:** `GITHUB_TOKEN`  
**Current Value:** `ghp_placeholder_your_token_here` (NEEDS UPDATE)  
**Repository:** `oripridan-dot/TooLoo.ai`  
**Port:** 3020 (GitHub Context Server)

**Purpose:**
- Scan repository code
- Extract context for AI training
- Fetch issues/PRs for analysis
- Auto-commit capabilities
- Webhook processing

**Setup:**
- [ ] Generate GitHub Personal Access Token:
  1. Go to https://github.com/settings/tokens
  2. Create new token (classic or fine-grained)
  3. Select: `repo`, `read:user`, `read:org`
  4. Copy to `.env` as `GITHUB_TOKEN`
- [ ] Update `.env` with real token (currently placeholder)
- [ ] Test API connectivity
- [ ] Verify token permissions
- [ ] Test repository access

**Test Command:**
```bash
curl -X GET http://127.0.0.1:3020/api/v1/github/status \
  -H "Authorization: Bearer $GITHUB_TOKEN"

curl -X GET http://127.0.0.1:3020/api/v1/github/repo/context
```

**Reference:** `servers/github-context-server.js`, `api/server/main.js` (line ~350+)  
**Endpoints:**
- `GET /api/v1/github/status` – Service status
- `GET /api/v1/github/repo/context` – Repository context
- `GET /api/v1/github/issues` – Issues list
- `POST /api/v1/github/webhook` – Webhook handler

**Permissions Required:**
- `repo:read` – Read repository code
- `read:user` – Read user info
- `read:org` – Read organization info

---

#### 7. **Anthropic Admin API** (Optional)
**Status:** Configured for advanced key management  
**API Key:** `ANTHROPIC_ADMIN_KEY`  
**Current Value:** Not set in `.env`  
**Port:** 3000 (Web Server proxy)  
**Purpose:** Manage API keys securely, revoke compromised keys

**Setup:**
- [ ] Generate Anthropic Admin Key:
  1. Go to https://console.anthropic.com/admin/keys
  2. Create admin API key
  3. Copy to `.env` as `ANTHROPIC_ADMIN_KEY`
- [ ] Update `.env` with admin key
- [ ] Test API connectivity
- [ ] Verify permissions

**Test Command:**
```bash
curl -X GET http://127.0.0.1:3000/api/v1/anthropic/admin/api_keys \
  -H "X-Admin-Key: $ANTHROPIC_ADMIN_KEY"
```

**Reference:** `api/server/main.js` (line 371)  
**Endpoints:**
- `GET /api/v1/anthropic/admin/api_keys/:id` – Get key details
- `POST /api/v1/anthropic/admin/api_keys/:id/revoke` – Revoke key
- `GET /api/v1/anthropic/admin/account` – Account info

---

#### 8. **PostgreSQL Database** 
**Status:** Configured for learner data  
**Connection Params:**
- Host: `DB_HOST` (not set)
- Port: `DB_PORT` (not set)
- Database: `tooloo_learners`
- User: `DB_USER` (not set)
- Password: `DB_PASSWORD` (not set)
- Purpose: Store learner profiles, training data, progress

**Setup:**
- [ ] Set environment variables:
  ```bash
  export DB_HOST="localhost"
  export DB_PORT="5432"
  export DB_USER="postgres"
  export DB_PASSWORD="your-password"
  ```
- [ ] Ensure PostgreSQL is running
- [ ] Create database: `createdb tooloo_learners`
- [ ] Run migrations (if available)
- [ ] Test connection
- [ ] Verify tables exist

**Test Command:**
```bash
psql -h $DB_HOST -U $DB_USER -d tooloo_learners -c "SELECT 1;"

curl -X GET http://127.0.0.1:3000/api/v1/learner/health
```

**Reference:** `scripts/phase-3-task-1-learner-pipeline.js`, `engine/database-connector.js`  
**Tables:**
- `learners` – User profiles
- `training_sessions` – Training history
- `progress` – Learning progress
- `badges` – Achievement tracking

---

### **TIER 3: DATA SOURCE INTEGRATIONS** 📊

#### 9. **Web Scraping & HTTP Sources**
**Status:** Configured with domain whitelist  
**Purpose:** Extract content from web pages for analysis  
**Configuration:** `engine/web-source-pipeline-manager.js`

**Setup:**
- [ ] Configure allowed domains (whitelist)
- [ ] Set request timeout (default: 30000ms)
- [ ] Enable cache (default: true)
- [ ] Test HTTP connectivity to sample domains
- [ ] Verify SSL certificate validation

**Configuration (in code):**
```javascript
const config = {
  allowDomains: ['github.com', 'news.ycombinator.com', 'arxiv.org'],
  requestTimeoutMs: 30000,
  cacheEnabled: true,
  cacheTTLMinutes: 60
};
```

**Test Command:**
```bash
curl -X POST http://127.0.0.1:3000/api/v1/sources/fetch \
  -H "Content-Type: application/json" \
  -d '{"url":"https://news.ycombinator.com"}'
```

**Reference:** `engine/web-source-pipeline-manager.js`, `servers/sources-server.js`

---

#### 10. **RSS Feed Integration**
**Status:** Configured for feed parsing  
**Purpose:** Aggregate RSS feeds for content discovery  
**Configuration:** Domain whitelist + feed URLs

**Setup:**
- [ ] Configure RSS feed sources
- [ ] Set refresh interval (default: 1 hour)
- [ ] Enable caching (default: true)
- [ ] Test feed connectivity
- [ ] Verify feed parsing

**Sample Feeds to Add:**
```
https://news.ycombinator.com/rss
https://www.arxiv.org/rss/cs
https://www.indiehackers.com/feed
https://www.producthunt.com/feed
```

**Test Command:**
```bash
curl -X GET http://127.0.0.1:3000/api/v1/feeds/list

curl -X POST http://127.0.0.1:3000/api/v1/feeds/refresh
```

**Reference:** `engine/web-source-pipeline-manager.js`, `servers/sources-server.js`

---

### **TIER 4: OPTIONAL INTEGRATIONS** 🎁

#### 11. **ElevenLabs Text-to-Speech** (Optional)
**Status:** Partially configured  
**API Key:** `ELEVENLABS_API_KEY`  
**Current Value:** Not set  
**Purpose:** Generate voice narration for content

**Setup:**
- [ ] Sign up at https://elevenlabs.io
- [ ] Get API key from dashboard
- [ ] Set `ELEVENLABS_API_KEY` in `.env`
- [ ] Test voice generation

**Test Command:**
```bash
curl -X POST http://127.0.0.1:3000/api/v1/tts/speak \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello world","voice":"Bella"}'
```

**Reference:** `scripts/speak-selection.js`, `elevenlabs-tts.js`

---

#### 12. **Analytics & Monitoring** (Optional)
**Status:** Internal only (no external service)  
**Purpose:** Track system performance and user behavior  
**Port:** 3008, 3012

**Metrics Tracked:**
- API response times
- Provider usage statistics
- User engagement metrics
- Learning velocity
- Model selection patterns

**No setup needed** - Internal service

---

## 🚀 STARTUP & CONNECTION TEST SEQUENCE

### Quick Start (All Providers)

**Terminal 1: Start Web Server**
```bash
node servers/web-server.js
# or
npm run start:web
```

**Terminal 2: Start Chat API Bridge (Port 3010)**
```bash
node servers/chat-api-bridge.js
# or
npm run start:chat-bridge
```

**Terminal 3: Start Orchestrator (Port 3123)**
```bash
node servers/orchestrator.js
# or
npm run start
```

### Systematic Connection Test

Run these in order to verify each external connection:

#### Step 1: Verify API Keys in Environment
```bash
echo "Anthropic: $ANTHROPIC_API_KEY" | head -c 40
echo "OpenAI: $OPENAI_API_KEY" | head -c 40
echo "Gemini: $GEMINI_API_KEY" | head -c 40
echo "DeepSeek: $DEEPSEEK_API_KEY" | head -c 40
echo "GitHub Token: $GITHUB_TOKEN"
```

#### Step 2: Test Chat API Bridge Health
```bash
curl http://127.0.0.1:3010/health
```

**Expected:** `{"status":"ok","providers":["anthropic","openai","gemini","deepseek"]}`

#### Step 3: Test Each AI Provider
```bash
# Test Anthropic
curl -X POST http://127.0.0.1:3010/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"provider":"anthropic","message":"Say OK if working","max_tokens":10}'

# Test OpenAI
curl -X POST http://127.0.0.1:3010/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"provider":"openai","message":"Say OK if working","max_tokens":10}'

# Test Gemini
curl -X POST http://127.0.0.1:3010/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"provider":"gemini","message":"Say OK if working","max_tokens":10}'

# Test DeepSeek
curl -X POST http://127.0.0.1:3010/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"provider":"deepseek","message":"Say OK if working","max_tokens":10}'
```

#### Step 4: Test Provider Status Endpoint
```bash
curl http://127.0.0.1:3003/api/v1/providers/status
```

**Expected:** Shows all active providers with health status

#### Step 5: Test GitHub Integration (if configured)
```bash
curl http://127.0.0.1:3020/api/v1/github/status
```

#### Step 6: Test Web Sources (optional)
```bash
curl -X POST http://127.0.0.1:3000/api/v1/sources/fetch \
  -H "Content-Type: application/json" \
  -d '{"url":"https://github.com"}'
```

#### Step 7: Access Chat Interface
```
http://localhost:3000/chat-modern
```

---

## 📊 VERIFICATION MATRIX

| Service | Status | Configured | Tested | Working | Notes |
|---------|--------|-----------|--------|---------|-------|
| **Anthropic Claude** | ✅ | Yes | ❓ | ❓ | Primary provider |
| **OpenAI GPT-4** | ✅ | Yes | ❓ | ❓ | Fallback provider |
| **Google Gemini** | ✅ | Yes | ❓ | ❓ | Secondary fallback |
| **DeepSeek** | ✅ | Yes | ❓ | ❓ | Cost-optimized |
| **Ollama Local** | ✅ | Optional | ❓ | ❓ | For offline use |
| **GitHub API** | 🟡 | Partial | ❓ | ❓ | Token is placeholder |
| **Anthropic Admin** | ❌ | No | ❌ | ❌ | Optional feature |
| **PostgreSQL** | ❌ | No | ❌ | ❌ | Needs DB setup |
| **Web Scraping** | ✅ | Configured | ❓ | ❓ | Need to test |
| **RSS Feeds** | ✅ | Configured | ❓ | ❓ | Need to test |

---

## 🔧 TROUBLESHOOTING

### Chat API Bridge Won't Start
```bash
# Check what's using port 3010
lsof -i :3010

# Kill existing process
pkill -f "node servers/chat-api-bridge.js"

# Check for errors in logs
node servers/chat-api-bridge.js 2>&1 | head -50
```

### Provider Returns 401 Unauthorized
- **Anthropic:** Check ANTHROPIC_API_KEY is valid (console.anthropic.com/account/keys)
- **OpenAI:** Check OPENAI_API_KEY has billing enabled (platform.openai.com)
- **Gemini:** Verify key is for Google AI Studio (aistudio.google.com/app/apikey)
- **DeepSeek:** Check account has active credit (platform.deepseek.com)

### Provider Returns 429 (Rate Limit)
- Check API rate limits in provider dashboard
- Reduce request frequency or upgrade tier

### Database Connection Fails
```bash
# Check PostgreSQL is running
pg_isready -h $DB_HOST -p $DB_PORT

# Test connection
psql -h $DB_HOST -U $DB_USER -d tooloo_learners

# Check environment variables
env | grep DB_
```

### GitHub Token Not Working
```bash
# Verify token
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user

# Check token permissions
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user/permissions
```

---

## 📝 NEXT STEPS

1. **Verify All API Keys** – Ensure each key in `.env` is valid
2. **Start Core Services** – Web + Chat Bridge + Orchestrator
3. **Run Connection Tests** – Execute verification sequence above
4. **Document Results** – Update verification matrix with actual status
5. **Fix Issues** – Debug any failing providers
6. **Test Chat Interface** – Verify end-to-end chat works
7. **Validate Fallback Chain** – Ensure provider routing works
8. **Setup Optional Services** – GitHub, Database, Analytics as needed

---

## 📚 REFERENCE DOCUMENTATION

- **Provider Integration Guide:** `PROVIDER_INTEGRATION_GUIDE.md`
- **AI Provider Integration Pattern:** `ai-provider-integration.md`
- **System Architecture:** `APP_ARCHITECTURE.md`
- **Chat API Bridge:** `servers/chat-api-bridge.js`
- **LLM Provider Engine:** `engine/llm-provider.js`
- **GitHub Context Server:** `servers/github-context-server.js`
- **Web Sources Manager:** `engine/web-source-pipeline-manager.js`

---

**Last Updated:** October 31, 2025  
**Maintained By:** TooLoo.ai Development Team
