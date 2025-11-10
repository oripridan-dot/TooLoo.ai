# ⚠️ ACTION REQUIRED: Update OAuth Credentials

## The Problem

Your `.env` file contains **placeholder/old credentials** that don't match real GitHub and Slack apps.

**Current values:**
```
GITHUB_CLIENT_ID=Ov23lihiB0pbzZyCUFBt
SLACK_CLIENT_ID=9847874996609.9863318830272
```

These are probably test/example credentials. When you try to authorize:
- GitHub returns: ❌ Invalid client ID
- Slack returns: ❌ Invalid permissions / Invalid scope

---

## What You Need to Do

You have **two choices**:

### Option A: Use Real OAuth (Recommended)
Get your own GitHub and Slack OAuth app credentials and put them in `.env`

**Time required:** 15-20 minutes

**Steps:**
1. Create GitHub OAuth app: https://github.com/settings/developers
2. Create Slack OAuth app: https://api.slack.com/apps
3. Copy credentials to `.env`
4. Restart: `npm run stop:all && npm run dev`
5. Test authorization

**See:** `OAUTH_REAL_CREDENTIALS.md` for detailed steps

---

### Option B: Disable OAuth (For Now)
Remove OAuth buttons from UI and focus on other features

**Time required:** 5 minutes

---

## Do You Want to...

**Option A) Set up real OAuth credentials?**
- Go to https://github.com/settings/developers
- Go to https://api.slack.com/apps
- Come back with the Client IDs and Client Secrets
- I'll update `.env` for you

**OR**

**Option B) Skip OAuth for now and focus on other features?**
- I can remove the OAuth UI
- You can continue using TooLoo.ai without GitHub/Slack integration

---

## Quick Copy/Paste Template

When you have your real credentials, use this template to update `.env`:

```bash
# GitHub OAuth
GITHUB_CLIENT_ID=<YOUR_GITHUB_CLIENT_ID>
GITHUB_CLIENT_SECRET=<YOUR_GITHUB_CLIENT_SECRET>

# Slack OAuth
SLACK_CLIENT_ID=<YOUR_SLACK_CLIENT_ID>
SLACK_CLIENT_SECRET=<YOUR_SLACK_CLIENT_SECRET>
SLACK_BOT_TOKEN=<YOUR_SLACK_BOT_TOKEN>
```

---

## Let Me Know

What would you prefer?

1. **"I'll get real OAuth credentials"** → Wait for your credentials
2. **"Skip OAuth for now"** → Remove from UI and move on

Which one?
