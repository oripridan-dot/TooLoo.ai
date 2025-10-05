# 🚀 TooLoo.ai V2 - Quick Start Guide

## What TooLoo Does

TooLoo transforms rough product ideas into validated, market-ready concepts through:

1. **🎨 Idea Canvas** - Capture your raw idea (problem, solution, target market)
2. **✨ AI Refinery** - Get context-aware improvements with impact scores
3. **📊 Market Insights** - Validate with real Reddit discussions and Product Hunt competitors

## 🏃 Starting TooLoo

### One-Command Startup
```bash
./start-tooloo.sh
```

This starts both servers and verifies they're ready.

### Manual Startup (if needed)
```bash
# Terminal 1: API Server
cd /workspaces/TooLoo.ai/api
node server.js

# Terminal 2: UI Server
cd /workspaces/TooLoo.ai/ui
npm run dev
```

### Access
- **Web UI**: http://localhost:5173
- **API**: http://localhost:3001

## 📋 The Workflow

### Step 1: Fill Idea Canvas (Left Panel)
Enter your rough idea:
- **Title**: Product name
- **Problem**: What pain are you solving?
- **Solution**: How do you solve it?
- **Target**: Who are your customers?

*Example*:
```
Title: Natfv App
Problem: Hebrew speaking teen wants to learn English
Solution: AI coach with virtual basketball practices  
Target: Teens learning English through sports
```

### Step 2: Refine with AI (Middle Panel)
1. Click **"Refine with AI"** button
2. AI analyzes your idea and generates:
   - **Problem refinement** with quantified metrics
   - **Solution improvements** with unique differentiators
   - **Target market** precision with demographics
   - **Revenue model** recommendations
   - **Alternative markets** to explore

3. Review suggestions (color-coded by impact):
   - 🟢 **Green** = High impact (30+ points)
   - 🟡 **Yellow** = Medium impact (15-25 points)
   - ⚪ **Gray** = Low impact (<15 points)

4. Check/uncheck refinements you want to apply

5. Click **"Apply Selected (X)"** to update your idea

### Step 3: Market Validation (Right Panel)
1. After applying refinements, enter a relevant URL:
   - Product Hunt competitor
   - Reddit discussion
   - Industry blog post

2. Click **"Analyze Market"**

3. Review intelligence:
   - **Validation Score** (0-100)
   - **Competitors Found** on Product Hunt
   - **Reddit Discussions** showing real user pain
   - **Opportunities** discovered

### Step 4: Iterate
- Re-run **"Refine with AI"** after market research
- Apply new insights
- Watch your validation score improve!

## 🎯 What Happens When You Click "Apply Selected"?

When you click **"Apply Selected (3)"**:

1. ✅ **Replaces** original text in Idea Canvas with refined versions
2. ✅ **Only applies** checked refinements (unchecked stay original)
3. ✅ **Clears** the refinement panel (ready for next iteration)
4. ✅ **Updates** the idea state for market analysis

**Example**: If you check Problem and Solution but uncheck Target:
- Problem → Updated with refined version
- Solution → Updated with refined version  
- Target → Keeps original text

## 🧠 Context-Aware Refinements

TooLoo's AI **analyzes your specific idea** and provides tailored suggestions:

### Education/Learning Ideas
- Adds real proficiency gap data
- Suggests engagement mechanics
- Identifies age-appropriate monetization

### Moving/Logistics Ideas
- Quantifies household waste patterns
- Highlights scheduling pain points
- Recommends marketplace models

### B2B/SaaS Ideas
- Adds productivity loss metrics
- Suggests tiered pricing
- Identifies enterprise expansion paths

**Every idea gets unique, relevant improvements** - not generic templates!

## 🛠️ Troubleshooting

### UI Shows "This page isn't working"
**Fix**: Make port 5173 **Public** in Codespaces Ports tab
1. Click "Ports" tab at bottom
2. Right-click port 5173 row
3. Select "Port Visibility" → "Public"

### API Not Responding
```bash
# Check if running
curl http://localhost:3001/api/health

# Restart if needed
pkill -f "node server.js"
cd /workspaces/TooLoo.ai/api
node server.js &
```

### UI Not Responding
```bash
# Restart UI
pkill -f vite
cd /workspaces/TooLoo.ai/ui
npm run dev &
```

### Both Servers Down
```bash
# One-command restart
./start-tooloo.sh
```

## 📊 Example Session

```
1. Enter Idea:
   Title: Natfv App
   Problem: Teen wants to learn English for NBA dreams
   Solution: AI coach in virtual basketball
   Target: Sports-loving teens

2. Refine with AI → Score: 100/100
   ✅ Problem: Adds proficiency gap data (68% anxiety rate)
   ✅ Solution: Adds NBA voice packs, leaderboards
   ✅ Target: Specifies Israeli teens, $60K+ families
   ✅ Revenue: $15/mo premium, $25/mo family plan

3. Apply Selected (all 3)

4. Analyze Market:
   URL: reddit.com/r/languagelearning
   Result: 83/100 validation score
   - 28 Reddit discussions found
   - 10 competitors on Product Hunt
   - Opportunity: "Gamification + sports engagement underexplored"

5. Re-refine based on market data
   - Even better suggestions incorporating market insights!
```

## 🔄 Best Practices

1. **Start rough** - TooLoo improves your idea, so don't overthink the initial input
2. **Apply high-impact first** - Green badges = biggest improvements
3. **Iterate after market research** - Use competitor data to refine again
4. **Test alternative markets** - AI suggests 3 expansion opportunities
5. **Export ideas** - Copy refined text for pitch decks, landing pages

## 📁 File Structure

```
TooLoo.ai/
├── start-tooloo.sh          # One-command startup
├── api/
│   └── server.js            # Backend (port 3001)
├── ui/
│   └── src/
│       ├── App.jsx          # Main 3-column layout
│       └── components/
│           ├── IdeaCanvas.jsx      # Input panel
│           ├── IdeaRefinery.jsx    # AI refinement panel
│           └── MarketInsights.jsx  # Validation panel
└── workshop/
    └── refinery/
        └── prompt-refinery.js     # Context-aware AI engine
```

## 🚀 Next Steps

Ready to build Phase 2 (software deployment)?

The current system validates ideas. Next phase:
- Generate actual code from validated ideas
- Deploy to production
- Monitor real user feedback

---

**Questions?** Check the logs:
```bash
tail -f /tmp/tooloo-api.log    # API errors
tail -f /tmp/tooloo-ui.log     # UI errors
```
