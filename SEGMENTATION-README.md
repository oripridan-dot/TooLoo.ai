# Semantic Segmentation Server

Advanced conversation segmentation using embeddings and semantic analysis.

## Features

✅ **Embeddings-based Segmentation**: Uses OpenAI's text-embedding-3-small for semantic understanding  
✅ **Multi-turn Context**: Preserves context across conversation segments  
✅ **Trait Extraction**: Identifies user interests, skills, preferences, and topics  
✅ **Cross-conversation Linking**: Finds similar topics across different conversations  
✅ **Confidence Scoring**: Provides reliability metrics for segment boundaries  
✅ **Performance Optimized**: Targets < 500ms processing for typical conversations  

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

### 3. Run Tests

```bash
npm test
```

### 4. Start Server

```bash
npm run start:segmentation
```

Server runs on port 3007 by default.

## API Usage

### Health Check

```bash
curl http://localhost:3007/api/v1/segmentation/health
```

### Analyze Conversation

```bash
curl -X POST http://localhost:3007/api/v1/segmentation/analyze \
  -H 'Content-Type: application/json' \
  -d '{
    "messages": [
      {"role": "user", "content": "I want to learn Python"},
      {"role": "assistant", "content": "Python is great..."},
      {"role": "user", "content": "How about performance with C++?"}
    ]
  }'
```

### Response Format

```json
{
  "success": true,
  "data": {
    "segments": [
      {
        "messages": [...],
        "topics": ["python", "learning"],
        "confidence": "0.85",
        "startIndex": 0,
        "endIndex": 1,
        "messageCount": 2
      }
    ],
    "traits": {
      "interests": ["learn python"],
      "skills": [],
      "preferences": [],
      "topics": ["python", "learning", "performance"],
      "sentiment": "neutral"
    },
    "crossConversationLinks": [
      {
        "segment1": 0,
        "segment2": 1,
        "similarity": "0.82",
        "commonTopics": ["python"]
      }
    ],
    "performance": {
      "processingTime": 234,
      "messageCount": 6,
      "segmentCount": 2
    }
  }
}
```

## Using as a Library

```javascript
import { SegmentationSkill } from './api/skills/segmentation.js';

const skill = new SegmentationSkill({
  openai: openaiClient,
  similarityThreshold: 0.7
});

// Analyze conversation
const result = await skill.analyzeConversation(messages);

// Build user profile from multiple conversations
const profile = await skill.buildUserProfile([conv1, conv2, conv3]);

// Compare conversations
const comparison = await skill.compareConversations(conv1, conv2);
```

## Configuration Options

- `OPENAI_API_KEY` - Required for embeddings generation
- `SEGMENTATION_PORT` - Server port (default: 3007)
- `similarityThreshold` - Minimum similarity for same segment (default: 0.7)
- `maxSegmentSize` - Maximum messages per segment (default: 5)

## Architecture

### Core Components

1. **SemanticSegmentationEngine**: Core segmentation logic with embeddings
2. **SegmentationSkill**: High-level API for common use cases
3. **Express Server**: REST API for remote access

### How It Works

1. **Embedding Generation**: Each message is converted to a 1536-dimensional vector using OpenAI's embedding model
2. **Similarity Analysis**: Cosine similarity between consecutive messages determines segment boundaries
3. **Trait Extraction**: Pattern matching and keyword analysis extract user traits
4. **Cross-linking**: Segments are compared to find related content across conversations
5. **Confidence Scoring**: Based on segment cohesion and size

## Performance

Target: < 500ms for typical 100-turn conversation

Optimizations:
- In-memory caching of embeddings
- Batch embedding generation
- Efficient vector operations
- Minimal external dependencies

## Testing

Run the comprehensive test suite:

```bash
npm test
```

Tests cover:
- ✅ Engine initialization
- ✅ Cosine similarity calculations
- ✅ Trait extraction (> 80% accuracy target)
- ✅ Message segmentation
- ✅ Confidence scoring
- ✅ Performance benchmarks
- ✅ Cross-conversation linking
- ✅ User profile building
- ✅ Edge cases (empty messages, invalid format)
- ✅ Multi-turn context preservation

## Future Enhancements

- [ ] Local embedding models (sentence-transformers) for offline operation
- [ ] Redis integration for persistent embedding cache
- [ ] Real-time streaming segmentation
- [ ] Custom trait extraction models
- [ ] Multi-language support
- [ ] Persistent trait evolution tracking

## License

MIT
