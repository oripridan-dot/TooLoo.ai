# Real OAuth Setup - GitHub & Slack

**Status**: Ready to enable REAL OAuth connections

## Current Configuration

✅ **Real credentials already in `.env`:**
```
GITHUB_CLIENT_ID=Ov23lihiB0pbzZyCUFBt
GITHUB_CLIENT_SECRET=5a3f0e71a7908926c237bbc400878b45ed0693ce
SLACK_CLIENT_ID=9847874996609.9863318830272
SLACK_CLIENT_SECRET=ee270f03481a93167ae7ed63451e7576
```

✅ **Real callback handlers implemented:**
- `GET /api/v1/oauth/github/callback` → Exchanges code for token, fetches real user
- `GET /api/v1/oauth/slack/callback` → Exchanges code for token, fetches real team

✅ **UI configured for real OAuth:**
- "Connect GitHub" button opens real GitHub OAuth flow
- "Connect Slack" button opens real Slack OAuth flow

## What's Needed to Make It Work

### GitHub Setup

The GitHub app with Client ID `Ov23lihiB0pbzZyCUFBt` needs to have this redirect URI:

```
http://127.0.0.1:3000/api/v1/oauth/github/callback
```

**Steps:**
1. Go to https://github.com/settings/developers
2. Find the OAuth app with ID: Ov23lihiB0pbzZyCUFBt
3. In "Authorization callback URL", add/verify:
   ```
   http://127.0.0.1:3000/api/v1/oauth/github/callback
   ```
4. Click "Update Application"

### Slack Setup

The Slack app with Client ID `9847874996609.9863318830272` needs:

**Redirect URL:**
```
http://127.0.0.1:3000/api/v1/oauth/slack/callback
```

**User Token Scopes (minimum required):**
- `chat:write`
- `channels:read`
- `channels:manage`
- `users:read`
- `team:read`
- `users:read.email`

**Steps:**
1. Go to https://api.slack.com/apps
2. Find the app with ID: 9847874996609.9863318830272
3. Go to "OAuth & Permissions"
4. Under "Redirect URLs", add/verify:
   ```
   http://127.0.0.1:3000/api/v1/oauth/slack/callback
   ```
5. Under "User Token Scopes", ensure all required scopes are present
6. Click "Save Changes"

## Testing Real OAuth

### 1. Start the system:
```bash
npm run dev
```

### 2. Open Control Center:
```
http://127.0.0.1:3000/phase3-control-center.html
```

### 3. Test GitHub:
- Click **"Connect GitHub"** button
- You'll be redirected to github.com
- Authorize TooLoo.ai
- You should see: `✅ Connected as [your-github-username]`

### 4. Test Slack:
- Click **"Connect Slack"** button
- You'll be redirected to slack.com
- Authorize TooLoo.ai
- You should see: `✅ Connected to [your-slack-workspace]`

### 5. Verify via API:
```bash
curl http://127.0.0.1:3000/api/v1/oauth/status | jq .
```

Expected response:
```json
{
  "ok": true,
  "github": {
    "connected": true,
    "user": "your-github-username",
    "scopes": ["repo", "user:email", "read:org"]
  },
  "slack": {
    "connected": true,
    "team": "Your Slack Workspace",
    "scopes": ["chat:write", "channels:read", ...]
  }
}
```

## Why Not Demo Mode?

Demo mode was provided as a fallback, but the real OAuth is already fully implemented and configured. By ensuring the redirect URIs are set in GitHub/Slack app settings, you get:

✅ **Real user identity verification**  
✅ **Real workspace connections**  
✅ **Actual GitHub repos and Slack channels accessible**  
✅ **Proper security with CSRF token validation**  
✅ **OAuth tokens that can be used for API calls**

## Fallback: If Redirect URIs Can't Be Changed

If you can't modify the GitHub/Slack app settings, the `/api/v1/oauth/test/connect` endpoint provides demo mode for testing:

```bash
# Simulate GitHub connection
curl -X POST http://127.0.0.1:3000/api/v1/oauth/test/connect \
  -H 'Content-Type: application/json' \
  -d '{"provider":"github"}'

# Simulate Slack connection
curl -X POST http://127.0.0.1:3000/api/v1/oauth/test/connect \
  -H 'Content-Type: application/json' \
  -d '{"provider":"slack"}'
```

This is useful for:
- Testing UI without OAuth credentials
- CI/CD environments
- Quick demos

## Summary

The system is ready for REAL OAuth right now. The only requirement is confirming that the redirect URIs are correctly configured in the GitHub and Slack app settings. Once that's done, the "Connect GitHub" and "Connect Slack" buttons will work with real authentication.
