# OAuth Setup Guide for TooLoo.ai Phase 3

## GitHub OAuth Setup

### Step 1: Create GitHub OAuth App
1. Go to https://github.com/settings/developers
2. Click "New OAuth App" (or use the link from the screenshot)
3. Fill in the form:

**Application name:** `TooLoo.ai`

**Homepage URL:** `http://localhost:3000` (for local) or `https://your-domain.com` (for production)

**Application description:** `TooLoo.ai - Multi-format AI analysis platform with OAuth integrations`

**Authorization callback URL:** `http://localhost:3000/oauth/callback/github` (for local) or `https://your-domain.com/oauth/callback/github` (for production)

### Step 2: Generate Credentials
1. After creating the app, you'll see:
   - **Client ID** (copy this)
   - **Client Secret** (generate and copy this)

2. Add to your `.env` file:
```bash
GITHUB_CLIENT_ID=your_client_id_here
GITHUB_CLIENT_SECRET=your_client_secret_here
GITHUB_WEBHOOK_SECRET=your_webhook_secret_here
```

3. Restart the integrations server:
```bash
pkill -f "node servers/integrations-server" && sleep 1 && node servers/integrations-server.js &
```

---

## Slack OAuth Setup

### Step 1: Create Slack App
1. Go to https://api.slack.com/apps
2. Click "Create New App"
3. Choose "From scratch"
4. App name: `TooLoo.ai`
5. Choose your workspace

### Step 2: Configure OAuth
1. Go to "OAuth & Permissions" in left sidebar
2. Under "Redirect URLs" add:
   - `http://localhost:3000/oauth/callback/slack` (local)
   - `https://your-domain.com/oauth/callback/slack` (production)

3. Under "Scopes" add these **Bot Token Scopes**:
   - `chat:write` - Send messages
   - `channels:read` - List channels
   - `users:read` - List users
   - `files:read` - Read files

4. Copy the credentials:
   - **Client ID** (under OAuth & Permissions)
   - **Client Secret** (under OAuth & Permissions)

5. Add to `.env`:
```bash
SLACK_CLIENT_ID=your_client_id_here
SLACK_CLIENT_SECRET=your_client_secret_here
SLACK_SIGNING_SECRET=your_signing_secret_here
```

### Step 3: Enable Event Subscriptions
1. Go to "Event Subscriptions" in left sidebar
2. Turn on "Enable Events"
3. For "Request URL" enter: `https://your-domain.com/webhooks/slack`
4. Subscribe to these events:
   - `message.channels` - New messages
   - `reaction_added` - Emoji reactions
   - `app_mention` - When bot is mentioned

---

## Environment File Template

Create or update `.env` in `/workspaces/TooLoo.ai/`:

```bash
# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_WEBHOOK_SECRET=your_webhook_secret

# Slack OAuth
SLACK_CLIENT_ID=your_slack_client_id
SLACK_CLIENT_SECRET=your_slack_client_secret
SLACK_SIGNING_SECRET=your_slack_signing_secret

# Server Ports
WEB_PORT=3000
INTEGRATIONS_PORT=3012
DOMAINS_PORT=3016
IDE_PORT=3017
WEBHOOKS_PORT=3018
ORCH_CTRL_PORT=3123

# Environment
NODE_ENV=development
```

---

## Testing OAuth Setup

### 1. Test GitHub OAuth Flow
```bash
# Get authorization URL
curl "http://127.0.0.1:3012/oauth/authorize/github?userId=test-user&redirect_uri=http://localhost:3000/oauth/callback"

# Expected response:
# {
#   "ok": true,
#   "authUrl": "https://github.com/login/oauth/authorize?client_id=...",
#   "state": "github-test-user-..."
# }
```

### 2. Test Slack OAuth Flow
```bash
# Get authorization URL
curl "http://127.0.0.1:3012/oauth/authorize/slack?userId=test-user&redirect_uri=http://localhost:3000/oauth/callback"

# Expected response:
# {
#   "ok": true,
#   "authUrl": "https://slack.com/oauth_authorize?client_id=...",
#   "state": "slack-test-user-..."
# }
```

### 3. Verify Stored Tokens
```bash
# List providers for user
curl "http://127.0.0.1:3012/oauth/providers/test-user"

# Should show: ["github", "slack"]
```

---

## GitHub Webhook Setup

### Step 1: Add Webhook to Repository
1. Go to your repository on GitHub
2. Settings → Webhooks → Add webhook
3. Fill in:
   - **Payload URL:** `https://your-domain.com/webhooks/github`
   - **Content type:** `application/json`
   - **Secret:** Use the same as `GITHUB_WEBHOOK_SECRET`
   - **Events:** Select:
     - Push events
     - Pull request events
     - Issues

### Step 2: Verify Webhook
```bash
# View recent webhook events
curl http://127.0.0.1:3018/webhooks/events

# Expected response shows push, PR, and issue events
```

---

## Slack Webhook Setup

### Step 1: Install App to Workspace
1. Go to your Slack app settings
2. "Install App" section
3. Click "Install to Workspace"
4. Authorize the app

### Step 2: Enable Event Subscriptions
1. Go to "Event Subscriptions"
2. Set Request URL to: `https://your-domain.com/webhooks/slack`
3. Slack will send a challenge, webhooks-server automatically responds
4. Subscribe to events and save

---

## Verify Everything Works

### Run Full Test Suite
```bash
cd /workspaces/TooLoo.ai

# Make sure servers are running
npm run dev &
sleep 5
nohup node servers/{integrations,domains,ide,webhooks}-server.js &
sleep 2

# Run all tests (should see 33/33 passing)
node tests/phase3-integration-tests.js
node tests/phase3-enhancements-tests.js
```

### Troubleshooting

**OAuth returns `undefined` for client ID/secret:**
```bash
# Check environment variables are set
echo $GITHUB_CLIENT_ID
echo $GITHUB_CLIENT_SECRET

# If empty, set them:
export GITHUB_CLIENT_ID=your_value
export GITHUB_CLIENT_SECRET=your_value

# Then restart server
pkill -f "node servers/integrations-server"
sleep 1
node servers/integrations-server.js &
```

**Webhooks not processing:**
```bash
# Verify webhooks server is running
curl http://127.0.0.1:3018/health

# Check event log
curl http://127.0.0.1:3018/webhooks/events

# Verify URL is accessible from internet (not localhost)
# Use ngrok or similar for local testing:
# ngrok http 3018
# Then use ngrok URL in GitHub/Slack webhook settings
```

**Cache not working:**
```bash
# Check cache stats
curl http://127.0.0.1:3000/api/v1/domains/cache/stats

# Should show:
# {"ok":true,"stats":{"activeKeys":0,"expiredKeys":0,"totalSize":0}}
```

---

## Production Deployment Checklist

- [ ] GitHub OAuth app created and credentials saved
- [ ] Slack OAuth app created and credentials saved
- [ ] `.env` file configured with all credentials
- [ ] GitHub webhook added to repository
- [ ] Slack webhook events configured
- [ ] All 5 servers running (`npm run dev`)
- [ ] All 33 tests passing
- [ ] Cache performance verified
- [ ] Webhook events flowing through
- [ ] Domain is HTTPS (required for production webhooks)

---

## API Quick Reference

### OAuth
- `GET /oauth/authorize/:provider?userId=X&redirect_uri=Y` - Get auth URL
- `POST /oauth/callback/:provider` - Token exchange
- `GET /oauth/providers/:userId` - List connected providers
- `POST /oauth/disconnect/:provider` - Disconnect

### Webhooks
- `POST /webhooks/github` - GitHub events
- `POST /webhooks/slack` - Slack events
- `GET /webhooks/events` - View event log

### Cache
- `GET /api/v1/domains/cache/stats` - Cache statistics
- `POST /api/v1/domains/cache/clear` - Clear cache

---

## Next Steps

1. **Create GitHub OAuth app** (you're almost there in the screenshot!)
2. **Create Slack OAuth app** at api.slack.com
3. **Copy credentials to `.env`**
4. **Restart servers and run tests**
5. **Add webhooks to GitHub and Slack**
6. **Deploy to production**

Questions? Check the detailed documentation in:
- `PHASE3_ENHANCEMENTS.md` - Full feature guide
- `PHASE3_ENHANCEMENTS_FINAL.md` - Production checklist
