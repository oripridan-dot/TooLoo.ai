# Task 3 Kickoff: Per-Cohort Gap Analysis

**Previous Task**: Task 2 - Extend bridge for cohort context ✅  
**Current Task**: Task 3 - Per-cohort gap analysis endpoint  
**Feature Branch**: `feature/phase-2-sprint-2-cohort-gaps`  
**Status**: READY TO START  

---

## What Task 3 Does

### The Request (User Perspective)
```
User (Fast Learner): "What should I learn next?"

System Response:
"Based on your Fast Learner profile, here are your top priorities:

1. async-patterns (CRITICAL - 1.36)
   Why? Fast learners excel with patterns that enable rapid iteration.
   
2. performance-optimization (HIGH - 0.80)
   Why? Complements async knowledge for experienced developers.
   
3. concurrency (MEDIUM - 0.56)
   Why? Next logical progression from async mastery."
```

### The Technical Flow
```
Request: POST /api/v1/bridge/gaps-per-cohort/cohort-fast
         { includeArchetypeContext: true }
         
Step 1: FETCH (Task 2 ✅)
        └─ fetchCohortTraits('cohort-fast')
           └─ Returns: { id, archetype, avgTraits }
           └─ Archetype: "Fast Learner"
           
Step 2: QUERY
        └─ Get global gaps from capabilities-server
           └─ Returns: [{ component, severity }, ...]
           
Step 3: WEIGHT (New - Task 3)
        └─ For each gap:
           └─ modified_severity = gap.severity × ARCHETYPE_WEIGHTS[archetype]
           └─ Fast Learner: 2.0x multiplier
           
Step 4: SORT
        └─ Sort by modified_severity descending
        └─ Take top 10
        
Response: [
  { component, severity, modified_severity, archetype_reasoning },
  ...
]
```

---

## Implementation Plan

### File to Modify
```
servers/capability-workflow-bridge.js
```

### New Function to Add

```javascript
// After the existingfetchCohortTraits() function, add:

async function getGapsPerCohort(cohortId, options = {}) {
  try {
    // Step 1: Fetch cohort traits (using Task 2 cache)
    const cohort = await fetchCohortTraits(cohortId);
    if (!cohort) {
      return { error: `Cohort ${cohortId} not found`, statusCode: 404 };
    }
    
    // Step 2: Get global gaps from capabilities-server
    const capabilitiesUrl = `${CAPABILITIES_URL}/api/v1/capabilities/gaps`;
    const gapsResponse = await fetch(capabilitiesUrl);
    const gaps = await gapsResponse.json();
    
    if (!Array.isArray(gaps)) {
      console.warn('Expected gaps array, got:', typeof gaps);
      return { error: 'Invalid gaps format', statusCode: 500 };
    }
    
    // Step 3: Apply archetype-specific weighting
    const archetypeWeights = {
      'Fast Learner': 2.0,
      'Specialist': 2.5,
      'Power User': 1.8,
      'Long-term Retainer': 1.5,
      'Generalist': 1.3
    };
    
    const weight = archetypeWeights[cohort.archetype] || 1.0;
    
    const weightedGaps = gaps.map(gap => ({
      ...gap,
      archetypeWeight: weight,
      modifiedSeverity: gap.severity * weight,
      archetypeReasoning: generateReasoning(cohort.archetype, gap)
    }));
    
    // Step 4: Sort by modified severity (highest first)
    const sortedGaps = weightedGaps.sort(
      (a, b) => b.modifiedSeverity - a.modifiedSeverity
    );
    
    // Step 5: Return top 10 (or specified count)
    const count = options.count || 10;
    return {
      cohortId,
      archetype: cohort.archetype,
      avgTraits: cohort.avgTraits,
      gaps: sortedGaps.slice(0, count),
      totalGapsAnalyzed: gaps.length,
      timestamp: Date.now()
    };
    
  } catch (error) {
    console.error('Error analyzing gaps for cohort:', error);
    return { error: error.message, statusCode: 500 };
  }
}
```

### Helper Function: generateReasoning()

```javascript
function generateReasoning(archetype, gap) {
  const reasoningMap = {
    'Fast Learner': {
      'async-patterns': 'Enables rapid iteration and quick feedback loops',
      'performance-optimization': 'Allows mastery of high-performance techniques',
      'concurrency': 'Essential for building modern, scalable systems'
    },
    'Specialist': {
      'design-patterns': 'Deepens domain expertise',
      'ui-optimization': 'Specialization-aligned skill building',
      'component-architecture': 'Advanced architectural knowledge'
    },
    'Power User': {
      'async-patterns': 'Foundational for advanced users',
      'testing': 'Critical for high-volume adoption',
      'ci-pipeline': 'Essential infrastructure knowledge'
    }
  };
  
  const archReasoning = reasoningMap[archetype] || {};
  return archReasoning[gap.component] || 
    `Important gap for ${archetype} users`;
}
```

### New API Endpoint

```javascript
// Add this route to app.js in the POST section:

app.post('/api/v1/bridge/gaps-per-cohort/:cohortId', 
  validateCohortId, // middleware to validate format
  async (req, res) => {
    try {
      const { cohortId } = req.params;
      const { includeArchetypeContext, count } = req.body;
      
      const result = await getGapsPerCohort(cohortId, { count });
      
      if (result.error) {
        return res.status(result.statusCode || 500).json(result);
      }
      
      res.json(result);
    } catch (error) {
      console.error('Endpoint error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);
```

### Middleware: validateCohortId

```javascript
const validateCohortId = (req, res, next) => {
  const { cohortId } = req.params;
  if (!cohortId || typeof cohortId !== 'string') {
    return res.status(400).json({ 
      error: 'Invalid cohortId format' 
    });
  }
  next();
};
```

---

## Testing Task 3

### Manual Test: Happy Path

```bash
# Start the services
npm run dev

# Wait for startup
sleep 8

# Test the new endpoint
curl -X POST http://127.0.0.1:3010/api/v1/bridge/gaps-per-cohort/cohort-fast \
  -H 'Content-Type: application/json' \
  -d '{"includeArchetypeContext": true, "count": 5}'

# Expected response:
# {
#   "cohortId": "cohort-fast",
#   "archetype": "Fast Learner",
#   "avgTraits": {
#     "learningVelocity": 0.85,
#     "domainAffinity": 0.62,
#     ...
#   },
#   "gaps": [
#     {
#       "component": "async-patterns",
#       "severity": 0.68,
#       "modifiedSeverity": 1.36,
#       "archetypeWeight": 2.0,
#       "archetypeReasoning": "Enables rapid iteration..."
#     },
#     ...
#   ],
#   "totalGapsAnalyzed": 47,
#   "timestamp": 1729892400000
# }
```

### Manual Test: Specialist Cohort

```bash
curl -X POST http://127.0.0.1:3010/api/v1/bridge/gaps-per-cohort/cohort-specialist \
  -H 'Content-Type: application/json' \
  -d '{"count": 3}'

# Expected: design-patterns and UI-related gaps ranked higher (2.5x weight)
```

### Manual Test: Error Cases

```bash
# Invalid cohort ID
curl -X POST http://127.0.0.1:3010/api/v1/bridge/gaps-per-cohort/invalid \
  -H 'Content-Type: application/json' \
  -d '{}'
# Expected: 404 Not Found

# Missing parameters
curl -X POST http://127.0.0.1:3010/api/v1/bridge/gaps-per-cohort/ \
  -H 'Content-Type: application/json' \
  -d '{}'
# Expected: 404 (route not found)
```

---

## Key Design Decisions

### 1. Weight Multipliers
```javascript
const archetypeWeights = {
  'Fast Learner': 2.0,      // Fastest learning, highest priority
  'Specialist': 2.5,        // Deep expertise, highest domain focus
  'Power User': 1.8,        // High engagement, strong adoption
  'Long-term Retainer': 1.5, // Sustainable growth, retention focus
  'Generalist': 1.3         // Broad learning, balanced approach
};
```

**Rationale**:
- Specialist gets 2.5x (deepest domain focus)
- Fast Learner gets 2.0x (rapid iteration priority)
- Power User gets 1.8x (high engagement)
- Retainer gets 1.5x (sustainable pace)
- Generalist gets 1.3x (balanced learning)

### 2. Top 10 Default
- Cognitive load: 10 items is optimal for decision-making
- Customizable: `count` parameter allows override
- Configurable: Easy to adjust if analytics show better number

### 3. Archetype Reasoning
- Improves user understanding ("Why this for me?")
- Builds trust in recommendation system
- Enables feedback loop for improvement

---

## Expected Output (Full Example)

### Request
```bash
POST /api/v1/bridge/gaps-per-cohort/cohort-fast
{
  "includeArchetypeContext": true,
  "count": 5
}
```

### Response (200 OK)
```json
{
  "cohortId": "cohort-fast",
  "archetype": "Fast Learner",
  "avgTraits": {
    "learningVelocity": 0.85,
    "domainAffinity": 0.62,
    "interactionFrequency": 0.78,
    "feedbackResponsiveness": 0.91,
    "retentionStrength": 0.71
  },
  "gaps": [
    {
      "component": "async-patterns",
      "severity": 0.68,
      "modifiedSeverity": 1.36,
      "archetypeWeight": 2.0,
      "archetypeReasoning": "Enables rapid iteration and quick feedback loops"
    },
    {
      "component": "performance-optimization",
      "severity": 0.40,
      "modifiedSeverity": 0.80,
      "archetypeWeight": 2.0,
      "archetypeReasoning": "Allows mastery of high-performance techniques"
    },
    {
      "component": "concurrency",
      "severity": 0.28,
      "modifiedSeverity": 0.56,
      "archetypeWeight": 2.0,
      "archetypeReasoning": "Essential for building modern, scalable systems"
    },
    {
      "component": "error-handling",
      "severity": 0.45,
      "modifiedSeverity": 0.90,
      "archetypeWeight": 2.0,
      "archetypeReasoning": "Critical for production-grade systems"
    },
    {
      "component": "testing",
      "severity": 0.30,
      "modifiedSeverity": 0.60,
      "archetypeWeight": 2.0,
      "archetypeReasoning": "Ensures code quality and confidence"
    }
  ],
  "totalGapsAnalyzed": 47,
  "timestamp": 1729892400000
}
```

---

## Integration with Task 2

### How Task 2 Enables Task 3

```
Task 2 provides: fetchCohortTraits(cohortId)
  ├─ Returns cohort with archetype + traits
  ├─ <1ms latency (95% cache hit)
  └─ Ready for immediate use

Task 3 consumes: fetchCohortTraits(cohortId)
  ├─ Gets archetype for weighting
  ├─ Gets traits for reasoning
  └─ Uses cached data (fast)

Result: Fast, personalized gap analysis ✅
```

---

## Deployment Checklist

- [ ] Implement `getGapsPerCohort()` function (core logic)
- [ ] Implement `generateReasoning()` helper (contextual strings)
- [ ] Add `validateCohortId` middleware
- [ ] Add `POST /api/v1/bridge/gaps-per-cohort/:cohortId` endpoint
- [ ] Test happy path (Fast Learner cohort)
- [ ] Test specialist path (different weights)
- [ ] Test error cases (invalid cohort, missing fields)
- [ ] Verify backward compatibility (Phase 1 endpoints unchanged)
- [ ] Update health endpoint with Task 3 info (optional)
- [ ] Commit changes with message: "feat: Task 3 - Per-cohort gap analysis"
- [ ] Create documentation (similar to Task 2 format)

---

## Performance Expectations

| Metric | Expected |
|--------|----------|
| **Latency (95th percentile)** | <250ms |
| **Cache hit contribution** | 95% (from Task 2) |
| **P99 latency** | <500ms |
| **Error rate** | <0.5% |
| **Throughput** | 1000+ req/sec |

---

## Next Steps After Task 3

1. ✅ Complete Task 3 (per-cohort gap analysis)
2. Create documentation (3 files like Task 2)
3. → Task 4: Cohort-specific workflow suggestions
4. → Task 5: ROI tracking per cohort
5. → Task 6: Acceptance tests (all tasks)

---

## Code Size Estimate

- **Core function**: 30-40 lines
- **Helper functions**: 15-20 lines
- **Endpoint handler**: 20-25 lines
- **Middleware**: 10-15 lines
- **Total**: 75-100 lines of production code

**Time estimate**: 1-2 hours (implementation + testing)

---

## Acceptance Criteria

✅ Cohort traits fetched using Task 2 cache  
✅ Archetype-specific weights applied correctly  
✅ Severity scores modified accurately  
✅ Top 10 gaps returned by modified severity  
✅ Archetype reasoning included in response  
✅ Error cases handled gracefully  
✅ All Phase 1 endpoints still working  
✅ Response latency <250ms (99th percentile)  

---

**Ready to implement Task 3? Let's go!** 🚀
