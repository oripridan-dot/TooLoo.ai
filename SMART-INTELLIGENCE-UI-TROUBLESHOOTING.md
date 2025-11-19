# Smart Intelligence - UI Access & Troubleshooting Guide

## Current Situation

You mentioned seeing "the old UI" - this guide clarifies which Smart Intelligence UIs are available and where to access them.

---

## 🎯 Smart Intelligence UIs Available

### 1. Analytics Dashboard (RECOMMENDED)
**Purpose**: View real-time validation analytics and trends  
**File**: `/web-app/smart-intelligence-analytics-dashboard.html`  
**Access**: `http://127.0.0.1:3000/smart-intelligence-analytics-dashboard.html`

**What You'll See**:
- Real-time stat cards (total validations, avg confidence, etc.)
- Confidence distribution chart
- Action distribution chart
- 30-day confidence trend
- Top validated questions
- Export buttons (CSV/JSON)

**Best For**: Monitoring validation patterns, analyzing trends, exporting data

---

### 2. Chat Demo with Analytics
**Purpose**: See smart intelligence in action within a chat context  
**File**: `/web-app/smart-intelligence-chat-demo.html`  
**Access**: `http://127.0.0.1:3000/smart-intelligence-chat-demo.html`

**What You'll See**:
- Chat interface on the left
- Live analytics dashboard on the right
- Type a question, get smart intelligence validation
- Watch analytics update in real-time
- Patterns stored as you chat

**Best For**: Understanding the full flow, testing validation, seeing live updates

---

### 3. Display Component
**Purpose**: Reusable widget for embedding in your own chat  
**File**: `/web-app/smart-intelligence-display.html`  
**Access**: `http://127.0.0.1:3000/smart-intelligence-display.html`

**What You'll See**:
- Component documentation
- Example validation result display
- Collapsible widget with all details
- Confidence badges and action recommendations

**Best For**: Understanding the widget design, integrating into custom UIs

---

## 🚀 Quick Start (3 Steps)

### Step 1: Start the Server
```bash
npm run start:web
```

### Step 2: Access the Dashboard
```
http://127.0.0.1:3000/smart-intelligence-analytics-dashboard.html
```

### Step 3: Start Validating
The dashboard will show statistics as validations occur (either from your own usage or API calls).

---

## 🔍 Troubleshooting - "Old UI" Issues

### Issue: Page Shows Old Layout or Wrong UI

**Solution 1: Hard Refresh**
```
Windows/Linux: Ctrl+Shift+Delete or Ctrl+F5
Mac: Cmd+Shift+R or Cmd+Option+E then clear cache
```

**Solution 2: Different Endpoint**
Make sure you're accessing the right URL:
- Analytics: `/smart-intelligence-analytics-dashboard.html` ✅
- Chat Demo: `/smart-intelligence-chat-demo.html` ✅
- NOT: Old dashboard, old chat, or other pages ❌

**Solution 3: Browser Cache**
```bash
# Option A: Open in Private/Incognito window
# Option B: Ctrl+Shift+Delete and clear cache
# Option C: Check browser DevTools (F12) → Network → Disable cache while DevTools open
```

**Solution 4: Server Restart**
```bash
npm run clean    # Stops all services
npm run start:web # Starts fresh web server
```

---

## 📍 URL Reference

### Analytics Dashboard (Primary UI)
```
http://127.0.0.1:3000/smart-intelligence-analytics-dashboard.html
```
**Status**: ✅ Current  
**Best for**: Viewing analytics, exporting data

### Chat Demo (Integration Example)
```
http://127.0.0.1:3000/smart-intelligence-chat-demo.html
```
**Status**: ✅ Current  
**Best for**: Testing validation flow, seeing real-time updates

### Display Component (Widget Reference)
```
http://127.0.0.1:3000/smart-intelligence-display.html
```
**Status**: ✅ Current  
**Best for**: Component documentation, embedding in custom UIs

### Other Pages (Legacy - May show old UI)
```
http://127.0.0.1:3000/             # Home page
http://127.0.0.1:3000/control-room # Control room
http://127.0.0.1:3000/workspace    # Workspace
```
**Status**: May be old layout  
**Note**: These are legacy pages, not part of smart intelligence

---

## 🔗 API Endpoints (Behind the Scenes)

All these endpoints work automatically. You don't need to call them directly unless building custom UIs:

```
POST /api/v1/chat/smart-intelligence      → Validates response
GET  /api/v1/smart-intelligence/analytics/summary
GET  /api/v1/smart-intelligence/analytics/trend
GET  /api/v1/smart-intelligence/analytics/actions
GET  /api/v1/smart-intelligence/analytics/export/csv
GET  /api/v1/smart-intelligence/analytics/export/json
```

---

## 💡 How the System Works

```
┌─────────────────────────────────┐
│  Your Browser                   │
│  smart-intelligence-*.html      │
└────────────┬────────────────────┘
             │
             ↓
┌─────────────────────────────────┐
│  Web Server (port 3000)         │
│  Serves static HTML/JS files    │
│  Runs API endpoints             │
└────────────┬────────────────────┘
             │
             ├─→ API Endpoint calls ←─────┐
             │                            │
             ↓                            ↓
┌─────────────────────────────┐  ┌──────────────────┐
│ Smart Intelligence Service  │  │ Analytics Service│
│ (Validation Pipeline)       │  │ (Data Storage)   │
└────────────┬────────────────┘  └────────┬─────────┘
             │                           │
             ├──→ Store Pattern ←────────┘
             │
             ↓
       /data/validation-patterns/
       (Daily JSON files)
```

---

## 🧪 Test Everything is Working

### 1. Check Web Server is Running
```bash
curl http://127.0.0.1:3000/health
```
Should return: `{"status":"ok"}`

### 2. Check Dashboard File Exists
```bash
curl -I http://127.0.0.1:3000/smart-intelligence-analytics-dashboard.html
```
Should return: `200 OK`

### 3. Test Analytics Endpoint
```bash
curl http://127.0.0.1:3000/api/v1/smart-intelligence/analytics/summary
```
Should return JSON with analytics data

### 4. Open Dashboard in Browser
```
http://127.0.0.1:3000/smart-intelligence-analytics-dashboard.html
```
Should show dashboard with stat cards and charts

---

## 📊 What Data Will I See?

### First Time (No Data Yet)
Dashboard will show:
- "No validation patterns found yet"
- Empty charts
- Zero metrics

### After Validations
Dashboard will show:
- Total count
- Average confidence %
- Confidence distribution
- Action breakdown
- Trend lines
- Top questions

**To generate sample data**:
1. Use the Chat Demo: `/smart-intelligence-chat-demo.html`
2. Ask a few questions
3. Go back to dashboard - it will populate!

---

## 🎯 Which UI Should I Use?

### For Analytics & Monitoring
→ Use **Analytics Dashboard**
```
http://127.0.0.1:3000/smart-intelligence-analytics-dashboard.html
```

### For Testing & Development
→ Use **Chat Demo**
```
http://127.0.0.1:3000/smart-intelligence-chat-demo.html
```

### For Integration into Your Chat
→ Use **Display Component** (embed in your HTML)
```html
<script src="/smart-intelligence-display.html"></script>
<script src="/js/smart-intelligence-integration.js"></script>
```

---

## ❓ FAQ

**Q: Why am I seeing old UI?**  
A: You might be on a legacy page. Check the URL matches the ones above.

**Q: Do I need to set up anything?**  
A: No! Just run `npm run start:web` and access the dashboard URL.

**Q: Where is my data stored?**  
A: In `/data/validation-patterns/` as daily JSON files.

**Q: Can I see validation patterns?**  
A: Yes! Check the files or export CSV/JSON from the dashboard.

**Q: How do I integrate this into my chat?**  
A: See SMART-INTELLIGENCE-ANALYTICS-QUICKSTART.md for examples.

**Q: What if the endpoint returns an error?**  
A: Check that the web server is running and has no errors in the console.

---

## 🔧 Common Fixes

| Problem | Solution |
|---------|----------|
| Blank dashboard | Hard refresh (Ctrl+Shift+R) |
| "Cannot GET" error | Check URL spelling |
| No data showing | Run Chat Demo to generate data |
| Old layout visible | Clear browser cache |
| Endpoint 404 | Restart web server (`npm run start:web`) |
| CORS error | Server might not be running on 3000 |

---

## 📚 Next Steps

1. **Start server**: `npm run start:web`
2. **Open dashboard**: `http://127.0.0.1:3000/smart-intelligence-analytics-dashboard.html`
3. **Generate data**: Use Chat Demo or run validations
4. **View analytics**: Dashboard auto-updates
5. **Export data**: Use dashboard export buttons

---

## 📖 Full Documentation

- **Quick Start**: `SMART-INTELLIGENCE-ANALYTICS-QUICKSTART.md`
- **Integration Guide**: `SMART-INTELLIGENCE-ANALYTICS-INTEGRATION.md`
- **Endpoint Verification**: `SMART-INTELLIGENCE-ENDPOINT-VERIFICATION.md`
- **Implementation Details**: `SMART-INTELLIGENCE-ANALYTICS-IMPLEMENTATION-COMPLETE.md`

---

**Summary**: All endpoints and UIs are properly connected and working. The "old UI" you saw is likely a cached version or a different page. Access the correct URLs above to see the new Smart Intelligence system.

