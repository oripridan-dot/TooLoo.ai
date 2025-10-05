# 🚀 TooLoo.ai v2.0 - Quick Start Guide

**Get up and running in 5 minutes!**

---

## Step 1: Start the Server

```bash
cd /workspaces/TooLoo.ai
PORT=3005 node tooloo-server.js
```

**Expected output**:
```
🚀 ═══════════════════════════════════════════════════════
🚀 Initializing TooLoo.ai Server v2.0
🚀 ═══════════════════════════════════════════════════════

🔐 IMPORTANT: Save this password securely!
Master Password: Abc123XyzRandomSecure32CharPass
You will need this to access TooLoo.ai

🚀 TooLoo.ai Server running on http://localhost:3005
🔐 Security: Password protected
📚 Training examples: 5
✅ Ready to simulate and build amazing products!
```

**💡 Save the master password shown on first run!**

---

## Step 2: Login

```bash
# Replace YOUR_PASSWORD with the master password from Step 1
curl -X POST http://localhost:3005/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"YOUR_PASSWORD"}'
```

**Response**:
```json
{
  "success": true,
  "token": "abc123def456...your-session-token"
}
```

**💡 Save this token! You'll need it for all requests.**

---

## Step 3: Your First Simulation

```bash
# Replace YOUR_TOKEN with the token from Step 2
curl -X POST http://localhost:3005/api/v1/simulate \
  -H "Content-Type: application/json" \
  -H "x-session-token: YOUR_TOKEN" \
  -d '{
    "description": "A simple task manager with keyboard shortcuts and dark mode",
    "inspiration": "task-manager"
  }'
```

**Response** (after 15-30 seconds):
```json
{
  "success": true,
  "prototype": {
    "url": "/temp/prototypes/proto-1728109234567.html",
    "filepath": "/workspaces/TooLoo.ai/temp/prototypes/proto-1728109234567.html",
    "inspiration": "Linear-style Task Manager",
    "timestamp": "2025-10-05T05:20:34.567Z"
  }
}
```

**💡 Open the prototype**: `http://localhost:3005/temp/prototypes/proto-1728109234567.html`

---

## Step 4: Check Available Training Examples

```bash
curl -H "x-session-token: YOUR_TOKEN" \
  http://localhost:3005/api/v1/training/examples
```

**Response**:
```json
{
  "success": true,
  "examples": {
    "task-manager": [...],
    "music-collab": [...],
    "email-client": [...],
    "developer-tools": [...],
    "deployment-ui": [...]
  },
  "count": 5
}
```

---

## Step 5: Add Your Own Training Example

```bash
curl -X POST http://localhost:3005/api/v1/training/add \
  -H "Content-Type: application/json" \
  -H "x-session-token: YOUR_TOKEN" \
  -d '{
    "key": "portfolio-site",
    "example": {
      "name": "Modern Portfolio Site",
      "description": "Clean, minimal portfolio with smooth animations",
      "referenceUrl": "https://example.com",
      "patterns": {
        "layout": "Full-screen hero + project grid + contact form",
        "colors": "#000000 (black), #FFFFFF (white), accent colors",
        "interactions": "Smooth scroll, hover animations, parallax"
      }
    }
  }'
```

**Response**:
```json
{
  "success": true
}
```

---

## Common Commands

### Health Check
```bash
curl http://localhost:3005/api/v1/health
```

### Auth Status
```bash
curl http://localhost:3005/api/v1/auth/status
```

### List All Prototypes
```bash
curl -H "x-session-token: YOUR_TOKEN" \
  http://localhost:3005/api/v1/simulate/list
```

### Get Feedback for Project
```bash
curl -H "x-session-token: YOUR_TOKEN" \
  http://localhost:3005/api/v1/feedback/PROJECT_ID
```

### Provider Stats
```bash
curl -H "x-session-token: YOUR_TOKEN" \
  http://localhost:3005/api/v1/stats/providers
```

### Logout
```bash
curl -X POST http://localhost:3005/api/v1/auth/logout \
  -H "x-session-token: YOUR_TOKEN"
```

---

## Using with Frontend

### 1. Save Your Token
```javascript
localStorage.setItem('tooloo-session-token', 'YOUR_TOKEN');
```

### 2. Use SimulateButton Component
```jsx
import SimulateButton from './components/SimulateButton';

function App() {
  return (
    <div>
      <SimulateButton 
        description="Task manager with dark mode"
        onSimulationComplete={(prototype) => {
          console.log('Prototype ready:', prototype.url);
        }}
      />
    </div>
  );
}
```

### 3. Add FeedbackWidget
```jsx
import FeedbackWidget from './components/FeedbackWidget';

function PrototypeView({ projectId }) {
  return (
    <div>
      {/* Your prototype content */}
      <FeedbackWidget projectId={projectId} />
    </div>
  );
}
```

---

## Troubleshooting

### "Connection refused"
**Problem**: Server not running  
**Solution**: Start server with `PORT=3005 node tooloo-server.js`

### "401 Unauthorized"
**Problem**: Invalid or expired token  
**Solution**: Login again to get fresh token

### "ANTHROPIC_API_KEY not set"
**Problem**: Missing Claude API key  
**Solution**: Add to `.env` file:
```env
ANTHROPIC_API_KEY=your_key_here
```

### "Simulation timeout"
**Problem**: Claude API taking too long  
**Solution**: Normal for complex simulations (15-30 seconds)

---

## Next Steps

1. ✅ **Explore training examples** - See what TooLoo already knows
2. ✅ **Add your own examples** - Teach TooLoo about apps you love
3. ✅ **Generate multiple prototypes** - Test different approaches
4. ✅ **Collect feedback** - Create share links for testers
5. ✅ **Build Timeline UI** - Visualize your build process

---

## Need Help?

- 📖 **Full Documentation**: [`TOOLOO_V2_REBUILD_COMPLETE.md`](TOOLOO_V2_REBUILD_COMPLETE.md)
- 🐛 **Issues**: Check server logs for errors
- 💬 **Questions**: Review API endpoint documentation

---

**Happy simulating! 🎉**

**TooLoo.ai v2.0** - Build amazing products from simple ideas
