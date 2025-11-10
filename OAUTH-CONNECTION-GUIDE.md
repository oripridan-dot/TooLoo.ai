# OAuth Connection Guide - GitHub & Slack

**Last Updated**: November 5, 2025  
**Status**: ✅ Ready for Connection

## Current Status

### OAuth System ✅
- GitHub OAuth: **Ready** (placeholder credentials)
- Slack OAuth: **Ready** (placeholder credentials)
- Connection tracking: **Enabled**
- Callback handlers: **Configured**

### Connection State
```
GitHub: NOT CONNECTED (need real credentials)
Slack:  NOT CONNECTED (need real credentials)
```

---

## How to Connect GitHub

### Step 1: Register OAuth Application in GitHub

1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in:
   - **Application name**: TooLoo.ai Phase 3
   - **Homepage URL**: `http://127.0.0.1:3000`
   - **Authorization callback URL**: `http://127.0.0.1:3000/api/v1/oauth/github/callback`
4. Click "Create OAuth App"
5. You'll get:
   - **Client ID** (copy this)
   - **Client Secret** (copy this - keep it secret!)

### Step 2: Set Environment Variables

Add to your `.env` file:
```bash
GITHUB_CLIENT_ID=your_client_id_here
GITHUB_CLIENT_SECRET=your_client_secret_here
```

Or set in terminal:
```bash
export GITHUB_CLIENT_ID="your_client_id_here"
export GITHUB_CLIENT_SECRET="your_client_secret_here"
```

### Step 3: Restart Web Server

```bash
npm run stop:all
npm run dev
# or
npm run start
```

### Step 4: Connect in Control Center

1. Open http://127.0.0.1:3000/phase3-control-center.html
2. Scroll to "OAuth & Authentication" section
3. Click **"Connect GitHub"** button
4. You'll be redirected to GitHub login
5. Authorize TooLoo.ai application
6. Redirected back to Control Center
7. Status should show: `✓ Connected as [your-username]`

---

## How to Connect Slack

### Step 1: Create Slack App

1. Go to https://api.slack.com/apps
2. Click "Create New App"
3. Choose "From scratch"
4. Enter:
   - **App Name**: TooLoo.ai Phase 3
   - **Workspace**: Select your workspace
5. Click "Create App"

### Step 2: Configure OAuth Scopes

1. Go to "OAuth & Permissions"
2. Under "Scopes" → "User Token Scopes", add:
   - `chat:write`
   - `channels:read`
   - `users:read`
   - `team:read`

### Step 3: Add Redirect URL

1. Under "Redirect URLs", add:
   ```
   http://127.0.0.1:3000/api/v1/oauth/slack/callback
   ```
2. Click "Save URLs"

### Step 4: Get Credentials

1. Copy **Client ID** and **Client Secret** from "OAuth & Permissions"
2. Save them securely

### Step 5: Set Environment Variables

```bash
SLACK_CLIENT_ID=your_client_id_here
SLACK_CLIENT_SECRET=your_client_secret_here
```

### Step 6: Restart & Connect

```bash
npm run stop:all
npm run dev
```

Then in Control Center:
1. Click **"Connect Slack"** button
2. Authorize TooLoo.ai in Slack
3. Status should show: `✓ Connected to [workspace-name]`

---

## Verify Connections

### In Control Center
- GitHub status pill shows username ✅
- Slack status pill shows workspace name ✅
- Both show green checkmark ✅

### Via API
```bash
# Check connection status
curl http://127.0.0.1:3000/api/v1/oauth/status | jq .

# Should return:
{
  "ok": true,
  "github": {
    "connected": true,
    "user": "your-github-username",
    "scopes": ["repo", "user:email", "read:org"]
  },
  "slack": {
    "connected": true,
    "team": "Your Workspace Name",
    "scopes": ["chat:write", "channels:read", ...]
  }
}
```

---

## Troubleshooting

### Error: "OAuth error: Failed to fetch"
- **Cause**: Missing/invalid credentials
- **Fix**: Double-check your Client ID and Client Secret
- **Verify**: `echo $GITHUB_CLIENT_ID` (should print your ID)

### Error: "ERR_CONNECTION_REFUSED"
- **Cause**: Web server not running or OAuth endpoint down
- **Fix**: 
  ```bash
  npm run dev
  # Verify with:
  curl http://127.0.0.1:3000/api/v1/oauth/status
  ```

### Error: "Invalid redirect_uri"
- **Cause**: Callback URL doesn't match in OAuth app settings
- **Fix**: Verify your OAuth app's callback URL matches exactly:
  ```
  http://127.0.0.1:3000/api/v1/oauth/github/callback
  http://127.0.0.1:3000/api/v1/oauth/slack/callback
  ```

### Status shows "Unavailable"
- **Cause**: OAuth endpoint returning error
- **Fix**: 
  1. Check console for errors (F12 → Console)
  2. Verify credentials are set: `env | grep GITHUB`
  3. Check web server logs

---

## Security Notes ⚠️

1. **Never commit credentials** to git
2. Use `.env` file for local development (add to `.gitignore`)
3. For production, use environment variables in deployment platform
4. Client Secret should never be exposed in client-side code
5. OAuth tokens are stored server-side, not in browser

---

## API Reference

### Check OAuth Status
```bash
GET /api/v1/oauth/status
```

**Response**:
```json
{
  "ok": true,
  "github": { "connected": bool, "user": string, "scopes": array },
  "slack": { "connected": bool, "team": string, "scopes": array }
}
```

### Initiate GitHub OAuth Flow
```bash
POST /api/v1/oauth/github/authorize
```

**Response**:
```json
{
  "ok": true,
  "authUrl": "https://github.com/login/oauth/authorize?..."
}
```

### Initiate Slack OAuth Flow
```bash
POST /api/v1/oauth/slack/authorize
```

**Response**:
```json
{
  "ok": true,
  "authUrl": "https://slack.com/oauth/authorize?..."
}
```

### Disconnect Provider
```bash
POST /api/v1/oauth/disconnect
Body: { "provider": "github" }  // or "slack"
```

**Response**:
```json
{
  "ok": true,
  "message": "Disconnected from GitHub"
}
```

---

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `GITHUB_CLIENT_ID` | GitHub OAuth app client ID | `Iv1.abc123def456` |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth app secret (KEEP SECRET) | `ghs_xxxxxxxxxxxx` |
| `SLACK_CLIENT_ID` | Slack app client ID | `123456789.123456789` |
| `SLACK_CLIENT_SECRET` | Slack app secret (KEEP SECRET) | `xxxxxxxxxxxxx` |
| `WEB_PORT` | Web server port | `3000` (default) |

---

## Testing Credentials (Placeholder)

Currently, the system uses **placeholder credentials**:
- GitHub Client ID: `placeholder-client-id`
- Slack Client ID: Not set

These won't actually authenticate but will show the OAuth flow works.

To use real authentication, replace with actual credentials from GitHub/Slack apps.

---

## Next Steps

1. ✅ System is running and healthy
2. ⏳ Set up GitHub OAuth credentials
3. ⏳ Set up Slack OAuth credentials
4. ⏳ Restart web server with new credentials
5. ⏳ Test connections in Control Center

---

**Questions?** Check the console (F12) for detailed error messages.
**All systems operational** ✅
