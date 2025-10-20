# 🚀 DEPLOY TO RENDER (2 minutes)

## Step 1: Go to Render Dashboard
https://dashboard.render.com

## Step 2: Click "New +"
Choose: **Web Service**

## Step 3: Connect GitHub
- Click "Connect account" (if first time)
- Select repository: `oripridan-dot/TooLoo.ai`
- Authorize access

## Step 4: Configure
- **Name:** `tooloo-ai`
- **Environment:** Node
- **Build Command:** `npm install`
- **Start Command:** `npm run dev`
- **Plan:** Free (✅ Fully functional)

## Step 5: Deploy
Click **"Create Web Service"**

⏳ **Wait 2-3 minutes** for deployment

✅ You'll get a URL like: `https://tooloo-ai-xyz.render.com`

---

## Then Update Launch Posts

Replace `http://127.0.0.1:3000/` with your Render URL in:
- LAUNCH_POSTS.md
- LAUNCH_DAY_CHECKLIST.md

---

## Direct Deploy Link (If GitHub Connected)
Click here to auto-deploy:
https://render.com/deploy?repo=https://github.com/oripridan-dot/TooLoo.ai

(Select "Use render.yaml config" if prompted)
