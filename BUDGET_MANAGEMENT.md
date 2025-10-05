# Budget Management System

## Overview

TooLoo.ai V2 includes a comprehensive budget management system to control AI provider costs and prevent overspending. The system tracks spending, enforces limits, caches responses, and provides detailed analytics.

## Features

### 💰 Cost Tracking
- **Real-time tracking** of API calls and costs
- **Per-provider pricing** based on actual provider rates
- **Daily and monthly limits** with configurable thresholds
- **Automatic logging** to JSONL files for audit trail

### 🔄 Response Caching
- **1-hour TTL** on cached responses
- **Automatic cache cleanup** of expired entries
- **Cost savings tracking** showing amount saved via cache
- **MD5 hashing** for cache key generation

### 🚨 Budget Enforcement
- **Pre-call validation** checks budget before API calls
- **Automatic fallback** to mock data when limits reached
- **Warning alerts** at 80% budget usage
- **Graceful degradation** instead of hard failures

### 📊 Analytics & Reporting
- **Spending breakdown** by provider
- **Provider comparison** with cost-per-call metrics
- **Budget recommendations** for optimal provider selection
- **Historical tracking** via JSONL logs

## Configuration

### Environment Variables

Add these to your `.env` file:

```env
# Budget limits (in USD)
DAILY_BUDGET_LIMIT=5.00
MONTHLY_BUDGET_LIMIT=100.00
```

**Defaults:**
- Daily limit: $5.00
- Monthly limit: $100.00

### Provider Pricing

Current pricing (per 1 million tokens):

| Provider | Input Cost | Output Cost | Best For |
|----------|-----------|-------------|----------|
| **DeepSeek** | $0.14 | $0.28 | Code & technical content |
| **Gemini** | $0.075 | $0.30 | General text (cheapest input) |
| **Claude** | $3.00 | $15.00 | Complex reasoning tasks |
| **OpenAI GPT-4** | $10.00 | $30.00 | Reliable fallback |
| **Hugging Face** | Free | Free | Limited free tier |

**Recommendation:** Use DeepSeek for best cost/quality balance on coding tasks.

## API Endpoints

### GET /api/health

Health check with budget summary:

```bash
curl http://localhost:3001/api/health
```

**Response:**
```json
{
  "status": "ok",
  "service": "TooLoo.ai Market Intelligence API",
  "version": "2.0.0",
  "apis": {
    "ai": {
      "openai": true,
      "claude": false,
      "deepseek": true
    }
  },
  "budget": {
    "dailySpent": 0.0042,
    "dailyLimit": 5,
    "dailyRemaining": 4.9958,
    "callsToday": 3
  }
}
```

### GET /api/budget

Detailed budget status and breakdown:

```bash
curl http://localhost:3001/api/budget
```

**Response:**
```json
{
  "success": true,
  "status": {
    "daily": {
      "spent": 0.0042,
      "limit": 5,
      "remaining": 4.9958,
      "percentage": 0.1
    },
    "monthly": {
      "spent": 0.0042,
      "limit": 100,
      "remaining": 99.9958,
      "percentage": 0.0
    },
    "callsToday": 3,
    "cheapestProvider": "gemini",
    "pricing": {
      "deepseek": {"input": 0.14, "output": 0.28},
      "gemini": {"input": 0.075, "output": 0.30},
      "claude": {"input": 3.00, "output": 15.00},
      "openai": {"input": 10.00, "output": 30.00}
    }
  },
  "breakdown": {
    "deepseek": {
      "calls": 2,
      "cost": 0.0028,
      "tokens": {"input": 3000, "output": 4000}
    },
    "openai": {
      "calls": 1,
      "cost": 0.0014,
      "tokens": {"input": 1000, "output": 500}
    }
  },
  "recommendations": {
    "cheapestProvider": "gemini",
    "message": "✅ Budget healthy. Current cheapest option: gemini"
  }
}
```

### POST /api/refine

AI-powered idea refinement with budget tracking:

```bash
curl -X POST http://localhost:3001/api/refine \
  -H "Content-Type: application/json" \
  -d '{
    "idea": {
      "title": "TaskMaster Pro",
      "problem": "Teams waste time on manual task tracking",
      "solution": "AI-powered automated task management",
      "target": "Software development teams"
    }
  }'
```

**Response includes budget:**
```json
{
  "success": true,
  "refinement": { /* ... refinement data ... */ },
  "budget": {
    "spent": 0.0056,
    "remaining": 4.9944,
    "percentage": 0.1
  }
}
```

## How It Works

### 1. Request Flow with Budget Management

```
User Request → Budget Check → Cache Check → API Call → Track Cost → Cache Response
                     ↓              ↓            ↓
                  Denied?      Hit?         Failed?
                     ↓              ↓            ↓
              Return Error   Return Cache   Fallback
```

### 2. Budget Validation

Before each API call:

1. **Estimate cost** based on expected token usage
2. **Check daily limit**: `spent + estimated < daily_limit`
3. **Check monthly limit**: `spent + estimated < monthly_limit`
4. **Allow or deny** the call

If denied:
```json
{
  "allowed": false,
  "reason": "daily_limit_exceeded",
  "current": 5.02,
  "limit": 5.00,
  "estimated": 0.003
}
```

### 3. Caching Strategy

**Cache Key Generation:**
```javascript
const hash = crypto.createHash('md5')
  .update(prompt + provider)
  .digest('hex');
```

**Cache Hit:**
- Response returned immediately
- Zero cost charged
- "saved cost" logged for analytics

**Cache Miss:**
- API call made
- Cost tracked
- Response cached for 1 hour

### 4. Cost Tracking

All API calls logged to `logs/budget.jsonl`:

```json
{"provider":"deepseek","tokens":{"input":1500,"output":2000},"cost":0.00077,"timestamp":"2025-10-05T21:55:30.126Z","date":"2025-10-05"}
{"provider":"openai","tokens":{"input":1200,"output":800},"cost":0.00136,"timestamp":"2025-10-05T22:10:15.432Z","date":"2025-10-05"}
```

## Usage Examples

### Initialize Budget Manager

```javascript
import { BudgetManager } from './api/budget-manager.js';

const budgetManager = new BudgetManager({
  dailyLimit: 5.00,
  monthlyLimit: 100.00,
  cacheDir: './cache',
  logFile: './logs/budget.jsonl'
});
```

### Check Budget Before API Call

```javascript
const budgetCheck = budgetManager.canMakeCall('deepseek', {
  input: 1500,
  output: 2000
});

if (!budgetCheck.allowed) {
  console.warn(`Budget limit reached: ${budgetCheck.reason}`);
  return fallbackResponse();
}
```

### Track API Call

```javascript
await budgetManager.trackCall('deepseek', {
  input: 1500,
  output: 2000
});
```

### Use Caching

```javascript
const cacheKey = budgetManager.hashPrompt(prompt);

// Check cache
const cached = await budgetManager.getCached(cacheKey);
if (cached) return cached;

// Make API call
const response = await callProvider(prompt);

// Cache response
await budgetManager.setCached(cacheKey, response, estimatedCost);
```

## Integration with PromptRefineryEngine

The refinery engine automatically uses budget management:

```javascript
const refineryEngine = new PromptRefineryEngine({
  openAIKey: process.env.OPENAI_API_KEY,
  deepSeekKey: process.env.DEEPSEEK_API_KEY,
  budgetManager // Pass budget manager
});

// Budget checks happen automatically
const refinement = await refineryEngine.refineIdea(idea);
```

**Automatic behaviors:**
1. Cache check before API call
2. Budget validation pre-call
3. Cost tracking post-call
4. Fallback to mock data if budget exceeded

## Best Practices

### 💡 Cost Optimization

1. **Use DeepSeek first** - Best cost/quality for code and technical content
2. **Enable caching** - Saves 70%+ on redundant requests
3. **Set conservative limits** - Start with $5/day, adjust based on usage
4. **Monitor spending** - Check `/api/budget` regularly

### 🔍 Monitoring

```bash
# Check current status
curl http://localhost:3001/api/budget

# Watch budget in real-time
watch -n 5 'curl -s http://localhost:3001/api/budget | jq .status.daily'

# Analyze spending logs
cat logs/budget.jsonl | jq -s 'group_by(.provider) | map({provider: .[0].provider, total: map(.cost) | add})'
```

### 🚨 Alerts

Budget warnings appear automatically in logs:

```
⚠️ Budget alert: $4.02/$5.00 daily limit used (80.4%)
```

At 80% usage, the system recommends the cheapest provider.

### 🧹 Maintenance

**Clean old cache files:**
```javascript
await budgetManager.cleanCache(); // Removes files older than 24 hours
```

**Auto-cleanup on startup:**
```javascript
budgetManager.cleanCache().catch(() => {});
```

## Troubleshooting

### Issue: Budget not updating

**Check:**
1. Log file permissions: `chmod 644 logs/budget.jsonl`
2. Directory exists: `mkdir -p logs cache`
3. Disk space available

### Issue: Cache not working

**Check:**
1. Cache directory writable: `ls -la cache/`
2. File timestamps: `ls -lt cache/`
3. Clean old cache: `rm cache/*.json`

### Issue: Cost estimates wrong

**Update pricing:**
Edit `api/budget-manager.js`:
```javascript
this.pricing = {
  deepseek: { input: 0.14, output: 0.28 }, // Update here
  // ...
};
```

## Future Enhancements

Potential improvements for V3:

- [ ] Real-time dashboard UI component
- [ ] Webhook alerts for budget thresholds
- [ ] Provider performance analytics
- [ ] Cost forecasting based on trends
- [ ] Multi-user budget allocation
- [ ] Export spending reports (CSV, PDF)
- [ ] Integration with billing systems

## License

MIT - See LICENSE file for details

---

**Last Updated:** October 2025  
**Version:** 2.0.0  
**Maintainer:** TooLoo.ai Team
