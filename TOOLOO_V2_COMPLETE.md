# 🎯 TooLoo.ai v2.0 - Server Rebuild Complete

**Date**: October 5, 2025  
**Status**: ✅ **READY FOR TESTING**

---

## 🚀 What Changed

### **OLD**: `simple-api-server.js`
- ❌ 2,500+ lines - bloated and hard to maintain
- ❌ Mixed concerns (AI + filesystem + GitHub + self-awareness)
- ❌ Over-engineered for single user
- ❌ No simulation engine
- ❌ No training system
- ❌ No real user testing

### **NEW**: `tooloo-server.js`
- ✅ 500 lines - clean and focused
- ✅ Modular architecture (`core/`, `providers/`)
- ✅ Purpose-built for TooLoo.ai
- ✅ Simulation engine built-in
- ✅ Training system integrated
- ✅ Real user feedback collection
- ✅ Single-user security
- ✅ Cost-optimized AI routing

---

## 📁 New Structure

```
TooLoo.ai/
├── tooloo-server.js              ✅ NEW: Main server (500 lines)
├── core/                          ✅ NEW: Core modules
│   ├── simulator.js              ✅ Prototype generator
│   ├── trainer.js                ✅ Training data manager
│   ├── feedback.js               ✅ User testing system
│   └── auth.js                   ✅ Single-user security
├── providers/                     ✅ NEW: AI providers
│   └── provider-router.js        ✅ Cost-optimized routing
├── data/feedback/                 ✅ Feedback storage
├── temp/prototypes/               ✅ Generated prototypes
├── simulator/training/            ✅ Training examples
└── simple-api-server.js          ⚠️  OLD (backup, will delete after testing)
```

---

## 🎯 Key Features

### 1. **Simulation Engine**
Generate interactive HTML prototypes BEFORE building real code:

```bash
POST /api/v1/simulate
{
  "description": "Task manager like Linear",
  "inspiration": "task-manager"
}

Response:
{
  "url": "/temp/prototypes/proto-1234567890.html",
  "inspiration": "Linear-style Task Manager",
  "timestamp": "2025-10-05T..."
}
```

**Built-in Training Examples**:
- Linear-style Task Manager
- Splice-style Music Collaboration
- Superhuman-style Email Client
- Stripe-style Documentation
- Vercel-style Landing Page

### 2. **Training System**
Learn from real-world best practices:

```bash
# Get all training examples
GET /api/v1/training/examples

# Add custom example
POST /api/v1/training/add
{
  "key": "my-app",
  "example": {
    "name": "My App Style",
    "description": "...",
    "patterns": { ... }
  }
}

# Export/Import training data
GET /api/v1/training/export
POST /api/v1/training/import
```

### 3. **Real User Testing**
Collect feedback from testers:

```bash
# Generate share link
POST /api/v1/feedback/share
{
  "projectId": "my-project",
  "prototypeUrl": "/temp/prototypes/proto-123.html",
  "expiresInDays": 7
}

Response:
{
  "shareUrl": "http://localhost:5173/test/abc123def",
  "expiresAt": "2025-10-12T..."
}

# Share link with testers → They test and rate 1-5 stars

# View feedback
GET /api/v1/feedback/my-project

Response:
{
  "totalFeedback": 15,
  "averageRating": "4.2",
  "feedback": [...]
}
```

### 4. **Single-User Security**
Password-protected access:

```bash
# First run generates master password (save it!)
🔐 Master Password: AbC123DeF456...

# Login
POST /api/v1/auth/login
{
  "password": "AbC123DeF456..."
}

Response:
{
  "token": "session-token-here",
  "expiresAt": "2025-10-06T..."
}

# Use token in headers for all requests
Authorization: Bearer session-token-here
```

### 5. **Cost-Optimized AI Routing**
Automatically selects cheapest provider:

```bash
GET /api/v1/stats/providers

Response:
{
  "totalTokens": 1000000,
  "totalCost": "15.20",
  "breakdown": [
    {
      "provider": "DeepSeek",
      "tokens": 800000,
      "percentage": "80%",
      "cost": "1.12",
      "costPercentage": "7%"
    },
    {
      "provider": "Claude Sonnet 4",
      "tokens": 150000,
      "percentage": "15%",
      "cost": "4.50",
      "costPercentage": "30%"
    },
    ...
  ]
}
```

---

## 🚀 Getting Started

### 1. Start the New Server

```bash
# Kill old servers
npm run stop

# Start new TooLoo server
npm start

# Or start both API + frontend
npm run dev
```

### 2. First Time Setup

The server will generate a master password on first run:

```
🔐 ═══════════════════════════════════════════════════════
🔐 IMPORTANT: Save this password securely!
🔐 ═══════════════════════════════════════════════════════
🔐 Master Password: AbC123DeF456GhI789JkL012MnO345PqR
🔐 ═══════════════════════════════════════════════════════
🔐 You will need this to access TooLoo.ai
🔐 Store it in a password manager immediately!
🔐 ═══════════════════════════════════════════════════════
```

**⚠️ CRITICAL**: Save this password! You'll need it to log in.

### 3. Test Simulation

```bash
# Health check
curl http://localhost:3005/api/v1/health

# Login
curl -X POST http://localhost:3005/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"YOUR_PASSWORD_HERE"}'

# Simulate (use token from login)
curl -X POST http://localhost:3005/api/v1/simulate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "description": "Task manager like Linear",
    "inspiration": "task-manager"
  }'
```

### 4. Open Generated Prototype

After simulation, open the URL in your browser:
```
http://localhost:5173/temp/prototypes/proto-1234567890.html
```

Test the interactive prototype!

---

## 🧪 Testing Checklist

Before deleting old server, verify:

- [x] ✅ New server starts on port 3005
- [ ] ⏳ Health check responds
- [ ] ⏳ Can login with master password
- [ ] ⏳ Can generate simulation
- [ ] ⏳ Prototype opens and is interactive
- [ ] ⏳ Training examples load
- [ ] ⏳ Can add new training example
- [ ] ⏳ Feedback collection works
- [ ] ⏳ Share links generate
- [ ] ⏳ Cost tracking works
- [ ] ⏳ Frontend connects via Socket.IO
- [ ] ⏳ Real-time simulation progress updates

---

## 📊 API Endpoints Reference

### Public (No Auth)
- `GET /api/v1/health` - Health check
- `POST /api/v1/auth/login` - Login
- `GET /api/v1/auth/status` - Check if configured
- `POST /api/v1/feedback/public` - Public feedback (for testers)

### Protected (Requires Auth Token)
- `POST /api/v1/simulate` - Generate prototype
- `GET /api/v1/simulate/list` - List all prototypes
- `GET /api/v1/training/examples` - Get training examples
- `POST /api/v1/training/add` - Add training example
- `GET /api/v1/training/export` - Export training data
- `POST /api/v1/training/import` - Import training data
- `GET /api/v1/feedback/:projectId` - Get project feedback
- `POST /api/v1/feedback/share` - Generate share link
- `GET /api/v1/feedback/summary` - Feedback summary
- `GET /api/v1/stats/providers` - Provider usage stats
- `POST /api/v1/stats/reset` - Reset stats
- `POST /api/v1/auth/logout` - Logout

### Socket.IO Events
- `simulate` - Real-time simulation with progress
- `simulation-started` - Simulation began
- `simulation-progress` - Progress update
- `simulation-complete` - Simulation finished
- `simulation-error` - Error occurred

---

## 🔧 Configuration

### Environment Variables

Create `.env` file:

```bash
# Required
ANTHROPIC_API_KEY=your_claude_api_key_here

# Optional
PORT=3005
PUBLIC_URL=http://localhost:5173
NODE_ENV=development
```

### Training Data Location

Training examples stored at:
```
simulator/training/training-data.json
```

You can manually edit this file to add custom examples.

---

## 💡 Usage Examples

### Example 1: Simulate a Music App

```javascript
const result = await fetch('/api/v1/simulate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    description: 'Music collaboration app with waveform visualization',
    inspiration: 'music-collab'
  })
});

const data = await result.json();
console.log('Prototype URL:', data.prototype.url);
// Open: http://localhost:5173/temp/prototypes/proto-xxx.html
```

### Example 2: Get Real User Feedback

```javascript
// 1. Generate share link
const shareLink = await fetch('/api/v1/feedback/share', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    projectId: 'music-app-v1',
    prototypeUrl: '/temp/prototypes/proto-xxx.html',
    expiresInDays: 7
  })
});

const { shareUrl } = await shareLink.json();

// 2. Share URL with testers
console.log('Share this link:', shareUrl);
// http://localhost:5173/test/abc123def

// 3. View feedback
const feedback = await fetch('/api/v1/feedback/music-app-v1', {
  headers: { 'Authorization': 'Bearer YOUR_TOKEN' }
});

const { totalFeedback, averageRating } = await feedback.json();
console.log(`${totalFeedback} ratings, avg: ${averageRating}/5`);
```

### Example 3: Add Custom Training Example

```javascript
await fetch('/api/v1/training/add', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    key: 'my-custom-app',
    example: {
      name: 'My Custom App Style',
      description: 'Beautiful minimal design with smooth animations',
      patterns: {
        layout: 'Centered content + sidebar',
        colors: '#FF6B6B (coral), #4ECDC4 (teal)',
        interactions: 'Hover effects, smooth transitions, parallax scrolling'
      },
      referenceUrl: 'https://example.com',
      category: 'custom',
      quality: 'high'
    }
  })
});
```

---

## 🗑️ After Testing: Delete Old Server

Once you've verified everything works:

```bash
# 1. Backup old server (already done automatically)
ls -la simple-api-server.js.backup

# 2. Delete old server
rm simple-api-server.js

# 3. Update any remaining references
grep -r "simple-api-server" .

# 4. Commit changes
git add .
git commit -m "feat: Rebuilt server with simulation engine and training system"
```

---

## 📝 Next Steps

After the rebuild is verified:

1. **Week 2**: Build frontend components
   - `SimulateButton.jsx`
   - `FeedbackWidget.jsx`
   - `TrainingPanel.jsx`

2. **Week 3-4**: Add deployment adapters
   - Vercel integration
   - Railway integration
   - Fly.io integration

3. **Week 5+**: Build timeline visualization
   - DAW-style progress tracking
   - Scrub through build steps
   - Fork from any point

---

## ❓ Troubleshooting

### Server won't start

```bash
# Check if port 3005 is in use
lsof -i :3005

# Kill any process using it
kill -9 <PID>

# Start server
npm start
```

### Authentication not working

```bash
# Check if .auth-config.json exists
ls -la .auth-config.json

# Delete and regenerate
rm .auth-config.json
npm start
# Server will generate new password
```

### Simulation fails

```bash
# Check ANTHROPIC_API_KEY is set
echo $ANTHROPIC_API_KEY

# Set it if missing
export ANTHROPIC_API_KEY=your_key_here

# Restart server
npm restart
```

### Prototypes not loading

```bash
# Check temp directory exists
ls -la temp/prototypes/

# Check file permissions
chmod -R 755 temp/

# Restart server
npm restart
```

---

## 🎉 Success Criteria

TooLoo v2.0 is working when:

✅ Server starts on port 3005  
✅ Can login with master password  
✅ Can generate interactive prototypes in < 30 seconds  
✅ Prototypes are fully functional (buttons work, animations smooth)  
✅ Training examples provide context to simulations  
✅ Can share prototypes with real users for feedback  
✅ Cost tracking shows provider usage  
✅ Frontend connects via Socket.IO for real-time updates  

---

**Status**: 🟢 **READY FOR YOUR TESTING**

Test the new system and report any issues! 🚀
