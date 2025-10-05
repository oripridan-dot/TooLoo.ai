# 🎯 Workshop Data Schemas

## Purpose

JSON schemas that define the core data structures for Phase 1: Idea Refinery Workshop.

## Schemas

### `idea.schema.json`
**The master schema** - Everything about a product idea:
- **Problem**: What you're solving, who for, pain level
- **Solution**: Your approach, unique value, key features
- **Market**: Category, competitors, market size, trends
- **Revenue**: Business model, pricing tiers, projections
- **Timeline**: Development phases, milestones, dependencies
- **Risk**: Complexity, time, cost, main risks
- **Status**: Current lifecycle stage

### Future Schemas
- `market-analysis.schema.json` - Detailed market research results
- `revenue-model.schema.json` - Business model templates
- `timeline-block.schema.json` - Individual timeline phases
- `prototype-test.schema.json` - Phase 1.5 testing results

## Why JSON Schema?

1. **Type safety** - Validate data before processing
2. **Documentation** - Self-documenting data structures
3. **Tool generation** - Auto-generate forms and UIs
4. **API contracts** - Clear interface definitions

## Usage Example

```javascript
import Ajv from 'ajv';
import ideaSchema from './idea.schema.json';

const ajv = new Ajv();
const validate = ajv.compile(ideaSchema);

const myIdea = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  title: 'TaskFlow',
  problem: {
    description: 'Freelancers waste 3 hours/day on admin tasks',
    targetAudience: 'Solo freelancers',
    painLevel: 'severe'
  },
  solution: {
    description: 'AI assistant that handles invoicing, time tracking, client comms',
    keyFeatures: ['Auto-invoicing', 'Time tracking', 'Email templates']
  },
  createdAt: new Date().toISOString()
};

if (validate(myIdea)) {
  console.log('✅ Valid idea!');
} else {
  console.error('❌ Validation errors:', validate.errors);
}
```

## Design Principles

- **Flexible** - Optional fields for early-stage ideas
- **Extensible** - Easy to add new properties
- **Validatable** - Clear constraints and rules
- **Human-readable** - Comments and descriptions

## Current Status

✅ **Idea schema complete** - Ready for implementation

Next: Build validation layer and form generator
