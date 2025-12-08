# 🚨 CRITICAL DIRECTIVE: NO MOCKUPS - REAL DATA ONLY

**Effective Date:** December 7, 2025  
**Applies To:** ALL AI assistants, Copilot, Codespaces, TooLoo.ai systems, and any code generation

---

## ABSOLUTE RULES

### 1. NO FAKE DATA
```
❌ FORBIDDEN:
- value || 0.75  (hidden fallback that shows fake percentage)
- value || 99    (fake metric)
- value ?? 'placeholder'
- Math.random() for display values
- Hardcoded numbers that look like real metrics
- "Lorem ipsum" or sample text in production UI
- Static arrays pretending to be API responses

✅ REQUIRED:
- value ?? null  (show nothing if no data)
- value ?? 'No data'  (explicit "no data" message)
- Loading states when fetching
- Error states when failed
- Empty states when no data exists
```

### 2. EVERY METRIC MUST HAVE A SOURCE
Before displaying ANY number, percentage, or metric:
1. Identify the data source (API endpoint, database, calculation)
2. Document the source in a comment
3. If no source exists, DO NOT DISPLAY THE METRIC

```typescript
// ❌ BAD - No traceable source
const learningScore = data?.score || 75;

// ✅ GOOD - Traceable source with explicit empty state
// Source: /api/v1/learning/metrics -> improvements.successRate
const learningScore = data?.improvements?.successRate;
if (learningScore === undefined) return <NoDataState />;
```

### 3. NO PLACEHOLDER UI
```
❌ FORBIDDEN:
- Dashboards with fake graphs
- Progress bars with random values
- "Coming soon" features that look functional
- Animated counters with no real data
- Charts with static sample data

✅ REQUIRED:
- If feature doesn't work, hide it or show "Not Implemented"
- Empty state: "No [X] recorded yet"
- Loading state: skeleton or spinner
- Error state: clear error message
```

### 4. UI COMPONENT RULES

#### StatCards / Metrics
```jsx
// ❌ BAD
<StatCard value={metrics.learning || 75} label="Learning" />

// ✅ GOOD
{metrics.learning !== undefined ? (
  <StatCard value={metrics.learning} label="Learning" source="/api/v1/learning/score" />
) : (
  <EmptyMetric label="Learning" message="Not yet measured" />
)}
```

#### Charts / Graphs
```jsx
// ❌ BAD - Fake data generator
const data = Array.from({length: 20}, () => Math.random() * 100);

// ✅ GOOD - Real data or nothing
const data = apiResponse?.timeSeries;
if (!data?.length) return <EmptyChart message="No data points recorded" />;
```

#### Lists / Tables
```jsx
// ❌ BAD - Placeholder items
const items = data || [
  { name: 'Sample 1', value: 100 },
  { name: 'Sample 2', value: 200 },
];

// ✅ GOOD - Empty state
const items = data || [];
if (!items.length) return <EmptyList message="No items yet" />;
```

---

## IMPLEMENTATION CHECKLIST

When building or reviewing ANY feature:

- [ ] Does every displayed number come from a real, documented source?
- [ ] Are there NO `|| defaultValue` patterns hiding missing data?
- [ ] Do empty states clearly indicate "no data" vs "loading" vs "error"?
- [ ] Can I trace every metric back to an API endpoint or calculation?
- [ ] Are placeholder/sample data patterns completely removed?
- [ ] Does the UI honestly represent the system's actual state?

---

## DATA SOURCE REGISTRY

### Real Data Sources (USE THESE)
| Metric | Endpoint | Returns |
|--------|----------|---------|
| System Health | `/api/v1/system/health` | uptime, memory, cpu |
| Chat History | `/api/v1/chat/history` | actual conversations |
| Artifacts | `/api/v1/agent/artifacts` | created files/code |
| Sessions | `/api/v1/flow/sessions` | real session data |
| Provider Status | `/api/v1/providers/status` | actual API availability |

### Metrics That Need Real Implementation
| Metric | Current State | Required Work |
|--------|---------------|---------------|
| Learning Score | FAKE (|| 0.75) | Track actual improvements over time |
| Discoveries | Always 0 | Implement discovery tracking |
| Breakthroughs | Always 0 | Define what constitutes breakthrough |
| Curiosity % | Random | Remove or implement real curiosity engine |
| Velocity Graph | Fake wave | Track real request/response times |

---

## ENFORCEMENT

1. **Code Review:** Any PR with `|| [number]` pattern for display values MUST be rejected
2. **Linting:** Add ESLint rule to flag suspicious fallback patterns
3. **Testing:** Every metric should have a test verifying its data source
4. **Documentation:** Every dashboard component must document its data sources

---

## THE PRINCIPLE

> "If you can't explain where a number comes from, don't show it."

A blank space or "No data" is infinitely more honest than a fake 75%.

---

**Signed:**  
- GitHub Copilot (Claude Opus 4.5)
- TooLoo.ai V3.3.337
- All future AI assistants working on this codebase

**This directive is permanent and non-negotiable.**
