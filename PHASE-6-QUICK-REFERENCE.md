# Phase 6 Quick Reference
**Fast lookup for Phase 6 ML Clustering & Design System Governance**

## API Quick Start

### ML Clustering

#### K-Means Token Grouping
```bash
curl -X POST http://127.0.0.1:3006/api/v1/ml/clustering/kmeans \
  -H 'Content-Type: application/json' \
  -d '{
    "tokens": [
      {"name": "color-1", "hex": "#FF0000"},
      {"name": "color-2", "hex": "#00FF00"}
    ],
    "k": 2
  }'
```

#### Hierarchical Token Relationships
```bash
curl -X POST http://127.0.0.1:3006/api/v1/ml/clustering/hierarchical \
  -H 'Content-Type: application/json' \
  -d '{"tokens": [...]}'
```

#### 2D PCA Visualization
```bash
curl -X POST http://127.0.0.1:3006/api/v1/ml/clustering/pca \
  -H 'Content-Type: application/json' \
  -d '{"tokens": [...]}'
```

#### Archetype Classification
```bash
curl -X POST http://127.0.0.1:3006/api/v1/ml/clustering/archetype \
  -H 'Content-Type: application/json' \
  -d '{"colors": {...}, "typography": [...], "components": {...}}'
```

### Governance

#### Create Version
```bash
curl -X POST http://127.0.0.1:3006/api/v1/governance/version/create \
  -H 'Content-Type: application/json' \
  -d '{
    "system": {...},
    "metadata": {
      "author": "designer-1",
      "title": "Version 1.0",
      "description": "Initial design system"
    }
  }'
```

#### Get Version History
```bash
curl http://127.0.0.1:3006/api/v1/governance/version/history
```

#### Compare Versions
```bash
curl -X POST http://127.0.0.1:3006/api/v1/governance/version/compare \
  -H 'Content-Type: application/json' \
  -d '{"versionA": "v1", "versionB": "v2"}'
```

#### Deprecate Token
```bash
curl -X POST http://127.0.0.1:3006/api/v1/governance/deprecate \
  -H 'Content-Type: application/json' \
  -d '{
    "token": "color-old-blue",
    "reason": "Replaced with primary-blue",
    "replacement": "primary-blue",
    "impact": "medium"
  }'
```

#### Check Deprecations
```bash
curl http://127.0.0.1:3006/api/v1/governance/deprecations
```

#### Create Approval Workflow
```bash
curl -X POST http://127.0.0.1:3006/api/v1/governance/approval/create \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "color_addition",
    "title": "Add Primary Colors",
    "priority": "high",
    "requiredApprovals": 2
  }'
```

#### Approve Workflow
```bash
curl -X POST http://127.0.0.1:3006/api/v1/governance/approval/WF_ID/approve \
  -H 'Content-Type: application/json' \
  -d '{"by": "designer-name", "comment": "Approved"}'
```

#### Get Approval Status
```bash
curl http://127.0.0.1:3006/api/v1/governance/approval/status
```

#### Generate Migration Path
```bash
curl -X POST http://127.0.0.1:3006/api/v1/governance/migration \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "removed_colors",
    "severity": "high",
    "items": ["color-1", "color-2"]
  }'
```

#### Get Governance Report
```bash
curl http://127.0.0.1:3006/api/v1/governance/report
```

## Code Snippets

### Python: K-Means Integration
```python
import requests
import json

response = requests.post(
    'http://127.0.0.1:3006/api/v1/ml/clustering/kmeans',
    json={
        'tokens': [
            {'name': 'color-1', 'hex': '#FF0000'},
            {'name': 'color-2', 'hex': '#00FF00'}
        ],
        'k': 2
    }
)

result = response.json()
for cluster in result['clustering']['clusters']:
    print(f"Cluster {cluster['id']}: {len(cluster['tokens'])} tokens")
```

### JavaScript: Version Management
```javascript
// Get version history
const response = await fetch('http://127.0.0.1:3006/api/v1/governance/version/history');
const history = await response.json();

history.history.forEach(v => {
  console.log(`${v.id}: ${v.title} (${v.changes})`);
});
```

### Node.js: Governance Workflow
```javascript
import DesignGovernance from './lib/design-governance.js';

const governance = new DesignGovernance('my-system');

// Create version
const v1 = governance.createVersion(system1, {
  author: 'designer',
  title: 'Initial Release'
});

// Deprecate token
governance.deprecateToken({
  token: 'old-color',
  reason: 'Replaced',
  replacement: 'new-color'
});

// Check status
const status = governance.getDeprecationStatus();
console.log(`Deprecated: ${status.totalDeprecated}`);
```

## ML Clustering Cheat Sheet

| Method | Purpose | Input | Output |
|--------|---------|-------|--------|
| `kMeansClustering()` | Group similar tokens | tokens, k | clusters + quality |
| `hierarchicalClustering()` | Build token tree | tokens | dendrogram + depth |
| `pcaVisualization()` | 2D projection | tokens | x/y coordinates |
| `detectArchetype()` | Classify system | system | archetype + characteristics |

## Governance Cheat Sheet

| Method | Purpose | Returns |
|--------|---------|---------|
| `createVersion()` | Snapshot system | version record |
| `getVersionHistory()` | List versions | version array |
| `compareVersions()` | Diff two versions | additions/removals/breaking |
| `deprecateToken()` | Mark as deprecated | deprecation record |
| `getDeprecationStatus()` | Check status | deprecations + timeline |
| `createApprovalWorkflow()` | Propose change | workflow + ID |
| `approveWorkflow()` | Approve change | updated workflow |
| `generateMigrationPath()` | Breaking change guide | migration steps |
| `generateGovernanceReport()` | Full summary | stats + recommendations |

## Archetype Classification

### Enterprise
- 12+ colors
- 20+ components
- 75%+ maturity
- Well-documented

### Semantic
- Semantic color naming
- Base spacing unit
- 60%+ maturity
- Well-organized

### Minimal
- 6 or fewer colors
- 10 or fewer components
- Lean and focused

### Flexible
- 25+ components
- Many variations
- High scalability

### Standard
- Balanced, well-rounded
- 8-15 colors
- 15-20 components

## Performance Tips

### K-Means
- Limit k to 2-7 for best results
- 100-1000 tokens recommended
- Linear convergence typical

### Hierarchical
- Use with 3-20 tokens max
- Avoid large datasets (O(n²))
- Great for small token families

### PCA
- Works well with 50+ tokens
- 2-3 dimensions sufficient
- Excellent for visualization

### Governance
- Version creation: <100ms
- Comparison: <200ms
- Deprecation check: <10ms

## Common Patterns

### Pattern 1: Analyze Then Remediate
```
1. Cluster tokens (k-means)
2. Compare clusters to identify redundancy
3. Create deprecation records
4. Generate migration path
5. Create approval workflow
```

### Pattern 2: Version-Based Tracking
```
1. Create version with metadata
2. Make changes to system
3. Create new version
4. Compare versions
5. Generate report
```

### Pattern 3: Change Control
```
1. Propose workflow
2. Collect approvals
3. Create version
4. Apply changes
5. Generate governance report
```

## Troubleshooting

### K-Means Won't Converge
- Reduce k value
- Check token diversity
- Limit tokens to <500

### Hierarchical Too Slow
- Reduce token count to <20
- Use k-means first, then hierarchical
- Filter tokens by type

### Governance Report Empty
- Ensure versions exist
- Check deprecation records
- Verify workflow creation

## Resources

- Full documentation: `PHASE-6-DESIGN-SYSTEM-INTELLIGENCE.md`
- Test suite: `test-phase6-simple.js`
- Module files: `lib/design-ml-clustering.js`, `lib/design-governance.js`
- Server integration: `servers/product-development-server.js`
