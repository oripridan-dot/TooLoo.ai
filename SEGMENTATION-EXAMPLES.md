# Semantic Segmentation Usage Examples

This document provides practical examples of using the Semantic Segmentation Server.

## Table of Contents
1. [Quick Start](#quick-start)
2. [API Examples](#api-examples)
3. [Library Usage](#library-usage)
4. [Advanced Features](#advanced-features)

## Quick Start

### 1. Installation

```bash
npm install
```

### 2. Configuration

Create a `.env` file:

```bash
OPENAI_API_KEY=your_api_key_here
SEGMENTATION_PORT=3007
```

### 3. Run Tests

```bash
# Unit tests (works without API key)
npm test

# Integration tests (works without API key)
npm run test:integration

# Integration tests with real OpenAI API
npm run test:integration:api
```

### 4. Start Server

```bash
npm run start:segmentation
```

## API Examples

### Basic Conversation Analysis

Analyze a conversation to extract segments, traits, and topics:

```bash
curl -X POST http://localhost:3007/api/v1/segmentation/analyze \
  -H 'Content-Type: application/json' \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "I want to learn Python programming"
      },
      {
        "role": "assistant",
        "content": "Python is a great language for beginners. It has clean syntax and powerful libraries."
      },
      {
        "role": "user",
        "content": "What about performance compared to C++?"
      },
      {
        "role": "assistant",
        "content": "C++ is generally faster for compute-intensive tasks."
      }
    ]
  }'
```

**Response:**

```json
{
  "success": true,
  "data": {
    "segments": [
      {
        "messages": [...],
        "topics": ["python", "learning", "programming"],
        "confidence": "0.85",
        "startIndex": 0,
        "endIndex": 1,
        "messageCount": 2
      },
      {
        "messages": [...],
        "topics": ["performance", "comparison"],
        "confidence": "0.78",
        "startIndex": 2,
        "endIndex": 3,
        "messageCount": 2
      }
    ],
    "traits": {
      "interests": ["python programming"],
      "skills": [],
      "preferences": [],
      "topics": ["python", "programming", "performance"],
      "sentiment": "neutral"
    },
    "crossConversationLinks": [
      {
        "segment1": 0,
        "segment2": 1,
        "similarity": "0.72",
        "commonTopics": ["python"]
      }
    ],
    "performance": {
      "processingTime": 234,
      "messageCount": 4,
      "segmentCount": 2
    }
  }
}
```

### Health Check

```bash
curl http://localhost:3007/api/v1/segmentation/health
```

**Response:**

```json
{
  "status": "ok",
  "service": "semantic-segmentation",
  "openaiConfigured": true,
  "version": "1.0.0"
}
```

## Library Usage

### Basic Segmentation

```javascript
import { SemanticSegmentationEngine } from './servers/segmentation-server.js';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const engine = new SemanticSegmentationEngine({
  openai,
  similarityThreshold: 0.7,
  maxSegmentSize: 5
});

const messages = [
  { role: 'user', content: 'I want to learn Python' },
  { role: 'assistant', content: 'Python is great...' }
];

const result = await engine.segmentMessages(messages);

console.log('Segments:', result.segments.length);
console.log('Traits:', result.traits);
console.log('Performance:', result.performance.processingTime, 'ms');
```

### Using SegmentationSkill for Advanced Features

```javascript
import { SegmentationSkill } from './api/skills/segmentation.js';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const skill = new SegmentationSkill({ openai });

// Analyze single conversation
const analysis = await skill.analyzeConversation(messages);

// Compare two conversations
const comparison = await skill.compareConversations(conv1, conv2);
console.log('Similarity:', comparison.overallSimilarity);

// Build user profile from history
const profile = await skill.buildUserProfile([conv1, conv2, conv3]);
console.log('Top interests:', profile.interests.slice(0, 5));

// Find similar conversations
const similar = await skill.findSimilarConversations(
  currentMessages,
  conversationHistory,
  5  // top 5
);
console.log('Most similar:', similar[0].conversationId);
```

## Advanced Features

### 1. Multi-turn Context Preservation

The engine automatically preserves context across conversation turns:

```javascript
const longConversation = [
  // 20+ messages about Python
  { role: 'user', content: 'Tell me about Python' },
  { role: 'assistant', content: '...' },
  // ... more messages
];

const result = await engine.segmentMessages(longConversation);

// Segments maintain contextual relationships
result.segments.forEach(segment => {
  console.log(`Segment ${segment.startIndex}-${segment.endIndex}`);
  console.log('Topics:', segment.topics);
  console.log('Confidence:', segment.confidence);
});
```

### 2. Trait Extraction

Extract user interests, skills, and preferences automatically:

```javascript
const messages = [
  { role: 'user', content: 'I want to learn machine learning' },
  { role: 'user', content: 'I am experienced with Python' },
  { role: 'user', content: 'I prefer visual explanations' }
];

const result = await engine.segmentMessages(messages);

console.log('Interests:', result.traits.interests);
// ['machine learning']

console.log('Skills:', result.traits.skills);
// ['python']

console.log('Preferences:', result.traits.preferences);
// ['visual explanations']
```

### 3. Cross-conversation Linking

Find related topics across different segments:

```javascript
const result = await engine.segmentMessages(messages);

// Links show which segments are related
result.crossConversationLinks.forEach(link => {
  console.log(`Segment ${link.segment1} ↔ ${link.segment2}`);
  console.log('Similarity:', link.similarity);
  console.log('Common topics:', link.commonTopics);
});
```

### 4. Building User Profiles

Aggregate insights from multiple conversations:

```javascript
const conversationHistory = [
  // Previous conversations
  conversation1Messages,
  conversation2Messages,
  conversation3Messages
];

const profile = await skill.buildUserProfile(conversationHistory);

// Profile includes frequency and confidence scores
console.log('Top 5 interests:');
profile.interests.slice(0, 5).forEach(interest => {
  console.log(`- ${interest.item}: ${interest.confidence} confidence`);
});

console.log('Dominant sentiment:', profile.sentiment.dominant);
console.log('Confidence:', profile.sentiment.confidence);
```

### 5. Finding Similar Conversations

Match current conversation with historical data:

```javascript
const currentConv = [
  { role: 'user', content: 'I need help with React' }
];

const history = [
  { id: 'conv1', messages: pythonConv },
  { id: 'conv2', messages: reactConv },
  { id: 'conv3', messages: cookingConv }
];

const similar = await skill.findSimilarConversations(
  currentConv,
  history,
  3  // top 3
);

// Results sorted by similarity
similar.forEach(match => {
  console.log(`${match.conversationId}: ${match.similarity}`);
  console.log('Common traits:', match.commonTraits);
});
```

### 6. Custom Configuration

Fine-tune the segmentation behavior:

```javascript
const engine = new SemanticSegmentationEngine({
  openai: openaiClient,
  similarityThreshold: 0.8,  // Higher = stricter boundaries
  maxSegmentSize: 3,         // Smaller = more segments
  embeddingModel: 'text-embedding-3-small'  // Or 'text-embedding-3-large'
});
```

## Performance Optimization

### 1. Embedding Cache

The engine automatically caches embeddings to reduce API calls:

```javascript
// First call generates embeddings
const result1 = await engine.segmentMessages(messages);

// Second call with same messages uses cache
const result2 = await engine.segmentMessages(messages);
// Much faster - no API calls!
```

### 2. Batch Processing

Process multiple conversations efficiently:

```javascript
const conversations = [conv1, conv2, conv3, conv4, conv5];

const results = await Promise.all(
  conversations.map(conv => 
    engine.segmentMessages(conv)
  )
);

// All processed in parallel
console.log('Total time:', results.reduce((sum, r) => 
  sum + r.performance.processingTime, 0
));
```

## Error Handling

### Graceful Degradation

The engine handles errors gracefully:

```javascript
try {
  const result = await engine.segmentMessages(messages);
  
  if (result.performance.processingTime > 500) {
    console.warn('Performance threshold exceeded');
  }
  
  // Even with embedding failures, basic traits still extracted
  console.log('Traits:', result.traits);
  
} catch (error) {
  console.error('Segmentation failed:', error.message);
  // Fallback to simple processing
}
```

### API Key Not Configured

```javascript
if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY not set');
  // Use mock client for development/testing
  const mockClient = new MockOpenAI();
  const engine = new SemanticSegmentationEngine({ openai: mockClient });
}
```

## Testing

### Unit Tests

```bash
npm test
```

Tests cover:
- Engine initialization
- Cosine similarity
- Trait extraction
- Segmentation logic
- Confidence scoring
- Performance benchmarks

### Integration Tests

```bash
# With mock (no API key needed)
npm run test:integration

# With real OpenAI API
npm run test:integration:api
```

### Manual API Testing

```bash
# Start server
npm run start:segmentation

# In another terminal
curl -X POST http://localhost:3007/api/v1/segmentation/analyze \
  -H 'Content-Type: application/json' \
  -d @test-data.json
```

## Troubleshooting

### "OpenAI API key not configured"

Set the environment variable:

```bash
export OPENAI_API_KEY=your_key_here
npm run start:segmentation
```

### "Processing time > 500ms"

- Reduce conversation size
- Increase `maxSegmentSize`
- Use smaller embedding model
- Check network latency

### "Memory issues with large conversations"

- Process in batches
- Clear embedding cache periodically
- Reduce conversation window size

## Best Practices

1. **Cache embeddings** for frequently analyzed conversations
2. **Batch similar requests** to reduce API calls
3. **Monitor performance** metrics in production
4. **Set appropriate thresholds** for your use case
5. **Handle errors gracefully** with fallbacks
6. **Test with real data** before production deployment

## Next Steps

- See [SEGMENTATION-README.md](SEGMENTATION-README.md) for architecture details
- Check [tests/integration-test.js](tests/integration-test.js) for more examples
- Explore API endpoints in [servers/segmentation-server.js](servers/segmentation-server.js)

## License

MIT
