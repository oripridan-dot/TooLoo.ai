# OAuth HTTPS Setup - TooLoo.ai

## Overview

Slack (and other OAuth providers) require **HTTPS** for redirect URIs. This guide explains the updated OAuth configuration for TooLoo.ai.

---

## What Changed

### 1. HTTPS Server Added
- **New HTTPS server** running on `https://localhost:8443`
- **Auto-generates self-signed certificates** on first run (in `certs/` directory)
- **Certificate generation** uses OpenSSL - generates `localhost.crt` and `localhost.key`

### 2. New OAuth Callback Paths
- **GitHub**: `https://localhost:8443/oauth/callback/github`
- **Slack**: `https://localhost:8443/oauth/callback/slack`

### 3. Authorize Endpoints (Unchanged)
- **GitHub authorize**: `POST http://127.0.0.1:3000/api/v1/oauth/github/authorize`
- **Slack authorize**: `POST http://127.0.0.1:3000/api/v1/oauth/slack/authorize`

---

## Configuration Steps

### Step 1: Get Self-Signed Certificate
When you start the system with `npm run dev`:

```bash
npm run dev
```

The web-server will:
1. Create `certs/` directory if needed
2. Generate `localhost.crt` and `localhost.key` automatically
3. Start HTTPS server on port 8443
4. Log: ✅ "Self-signed certificates generated successfully"

### Step 2: Update GitHub App Settings

1. Go to: **https://github.com/settings/developers**
2. Select your OAuth app (Client ID: `Ov23lihiB0pbzZyCUFBt`)
3. Find **"Authorization callback URL"**
4. Set it to:
   ```
   https://localhost:8443/oauth/callback/github
   ```
5. Click **Save**

### Step 3: Update Slack App Settings

1. Go to: **https://api.slack.com/apps**
2. Select your Slack app (ID: `9847874996609.9863318830272`)
3. Navigate to **"OAuth & Permissions"** (left sidebar)
4. Scroll to **"Redirect URLs"**
5. Click **"Add New Redirect URL"**
6. Paste:
   ```
   https://localhost:8443/oauth/callback/slack
   ```
7. Click **"Add"**
8. Click **"Save URLs"**

---

## Browser Warning About Certificate

When you authorize via `https://localhost:8443`, your browser will show a certificate warning:

```
⚠️ Connection not private
"The certificate is not trusted because it is self-signed"
```

**This is normal and expected.** To proceed:

1. Click **"Advanced"** (Chrome) or **"More Information"** (Firefox)
2. Click **"Proceed to localhost (unsafe)"** or **"Accept the Risk and Continue"**
3. Complete OAuth authorization normally

---

## Full OAuth Flow

### GitHub OAuth Flow

```
1. User clicks "Connect GitHub" button
2. Opens: https://github.com/login/oauth/authorize?client_id=Ov23lihiB0pbzZyCUFBt&...
3. User authorizes on GitHub
4. GitHub redirects to: https://localhost:8443/oauth/callback/github?code=...&state=...
5. TooLoo.ai exchanges code for access token
6. TooLoo.ai fetches real GitHub username
7. ✅ Connection established
```

### Slack OAuth Flow

```
1. User clicks "Connect Slack" button  
2. Opens: https://slack.com/oauth/authorize?client_id=9847874996609.9863318830272&...
3. User authorizes on Slack workspace
4. Slack redirects to: https://localhost:8443/oauth/callback/slack?code=...&state=...
5. TooLoo.ai exchanges code for access token
6. TooLoo.ai fetches real workspace name
7. ✅ Connection established
```

---

## Certificate Location

Certificates are stored in the `certs/` directory:

```
certs/
├── localhost.crt      (Public certificate)
└── localhost.key      (Private key)
```

**Don't commit these to Git** - they're auto-generated. Add to `.gitignore`:

```bash
echo "certs/" >> .gitignore
```

---

## Troubleshooting

### Issue: HTTPS Server Won't Start

**Error message:**
```
⚠️ Could not auto-generate certs, HTTPS will be unavailable for local testing
```

**Solution:** Manually generate certs:

```bash
mkdir -p certs
openssl req -x509 -newkey rsa:2048 -keyout certs/localhost.key -out certs/localhost.crt -days 365 -nodes -subj "/CN=localhost"
```

Then restart:

```bash
npm run dev
```

### Issue: Browser Blocks HTTPS Connection

**Solution:** This is normal for self-signed certs. Click through the warning:
- Chrome: Click "Advanced" → "Proceed to localhost (unsafe)"
- Firefox: Click "More Information" → "Accept the Risk and Continue"
- Safari: Click "Visit Website"

### Issue: OAuth Callback Gets "Connection Refused"

**Possible causes:**
1. HTTPS server on 8443 not running
   - Check: `lsof -i :8443` should show `node` process
   - Fix: Restart with `npm run dev`

2. GitHub/Slack redirect URL not configured correctly
   - Check: **GitHub**: https://github.com/settings/developers → Your app
   - Check: **Slack**: https://api.slack.com/apps → Your app → OAuth & Permissions

3. Port 8443 already in use
   - Check: `lsof -i :8443`
   - Fix: Kill the process or wait for it to free the port

---

## Testing the Setup

### Test 1: Verify HTTPS Server is Running

```bash
curl -k https://localhost:8443/api/v1/oauth/status
```

Expected response:
```json
{
  "github": { "connected": false },
  "slack": { "connected": false }
}
```

The `-k` flag ignores the self-signed certificate warning.

### Test 2: Verify OAuth Authorization URLs

```bash
# GitHub
curl -s -X POST http://127.0.0.1:3000/api/v1/oauth/github/authorize | jq .

# Slack
curl -s -X POST http://127.0.0.1:3000/api/v1/oauth/slack/authorize | jq .
```

### Test 3: Complete OAuth Flow

1. Open Control Center: `http://127.0.0.1:3000/phase3-control-center.html`
2. Click "Connect GitHub"
3. Complete GitHub authorization
4. ✅ Should see: "GitHub user: [your-username]"
5. Click "Connect Slack"
6. Complete Slack authorization
7. ✅ Should see: "Slack workspace: [your-workspace-name]"

---

## Production Deployment

For production, replace self-signed certificates with real ones:

1. **Get real certificate** from Certificate Authority (Let's Encrypt, etc.)
2. **Place in `certs/` directory**:
   - `certs/localhost.crt` → Your certificate
   - `certs/localhost.key` → Your private key
3. **Update redirect URIs** in GitHub/Slack to production domain:
   - GitHub: `https://yourdomain.com/oauth/callback/github`
   - Slack: `https://yourdomain.com/oauth/callback/slack`
4. **Update authorize endpoints** to use production domain
5. **Deploy!**

---

## Summary

| Component | URL | Purpose |
|-----------|-----|---------|
| **HTTP Server** | `http://127.0.0.1:3000` | Main API, static UI |
| **HTTPS Server** | `https://127.0.0.1:8443` | OAuth callbacks (Slack requires HTTPS) |
| **GitHub Callback** | `https://localhost:8443/oauth/callback/github` | Where GitHub redirects after authorization |
| **Slack Callback** | `https://localhost:8443/oauth/callback/slack` | Where Slack redirects after authorization |

That's it! Your OAuth setup is now real, secure, and production-ready. 🎉
