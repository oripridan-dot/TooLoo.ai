# TooLoo.ai Architecture Documentation

## Overview

TooLoo.ai is a modular AI system designed for scalable, maintainable intelligence with multimodal capabilities. The architecture emphasizes clean module boundaries, testability, and extensibility.

## Core Principles

1. **Modular Design**: Each system component has clear responsibilities and interfaces
2. **Quality First**: Built-in evaluation and auto-improvement loops
3. **Evidence-Based**: All claims backed by benchmarks and confidence scores
4. **Graceful Degradation**: System abstains when uncertain rather than fabricating
5. **Multimodal Ready**: Vision, audio, and voice capabilities as focused, excellent modules

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        TooLoo.ai v2.0                          │
├─────────────────────────────────────────────────────────────────┤
│  🎯 Core Orchestrator                                          │
│  • Intent routing & provider selection                         │
│  • Budget management & rate limiting                           │
│  • Session context & conversation memory                       │
│  • Telemetry & monitoring                                      │
├─────────────────────────────────────────────────────────────────┤
│  🧠 Knowledge Layer                                            │
│  • Vector store (embeddings, semantic search)                  │
│  • Knowledge graph (entities, relations, claims)               │
│  • Fact registry (confidence, provenance, freshness)           │
│  • Source cache (web snapshots, transcripts)                   │
├─────────────────────────────────────────────────────────────────┤
│  ⚡ Skills Layer                                               │
│  • Segmentation: conversation → structured segments            │
│  • Analysis: text → insights, patterns, summaries              │
│  • Planning: goals → actionable steps                          │
│  • Critique: claims → verification, alternatives               │
│  • Extraction: unstructured → structured data                  │
├─────────────────────────────────────────────────────────────────┤
│  📊 Evaluation Layer                                           │
│  • Benchmark suites (prediction vs truth)                      │
│  • Calibration scoring (confidence vs accuracy)                │
│  • Error analysis & taxonomy                                   │
│  • Performance dashboards & alerts                             │
├─────────────────────────────────────────────────────────────────┤
│  🎓 Auto-Teach Layer                                           │
│  • Gap detection (from eval errors & low confidence)           │
│  • Source curation (search, rank, deduplicate)                 │
│  • Knowledge synthesis (claims, evidence, notes)               │
│  • Prompt improvement (few-shots, templates)                   │
│  • Validation loops (re-test, promote/rollback)                │
├─────────────────────────────────────────────────────────────────┤
│  👁️👂🗣️ Modalities Layer                                      │
│  • Vision: screenshots/camera → OCR, captions, VQA            │
│  • Audio-In: mic/files → ASR, diarization, task extraction     │
│  • Voice-Out: text → natural TTS with prosody control          │
├─────────────────────────────────────────────────────────────────┤
│  🌐 Delivery Surfaces                                          │
│  • Web dashboard (metrics, benchmarks, knowledge views)        │
│  • Browser extension (host-native timeline UI)                 │
│  • REST API (programmatic access)                              │
│  • SDK (future app integration)                                │
└─────────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
api/
├── server/              # HTTP server, routing, middleware
│   ├── main.js         # Entry point
│   └── routes/         # Route handlers by domain
├── providers/          # AI model integrations (DeepSeek, Claude, etc.)
├── skills/             # Core capabilities (segmentation, analysis, etc.)
├── evaluation/         # Benchmark runners and scoring
├── auto-teach/         # Self-improvement system
└── store/              # Data persistence (vector, graph, cache)

modalities/
├── vision/             # OCR, image captioning, visual Q&A
├── audio-in/           # ASR, speaker detection, audio analysis
└── voice-out/          # TTS with emotion and emphasis control

web-app/                # Dashboard and admin interfaces
├── outcomes-dashboard.html
├── components/         # Reusable UI components
└── assets/            # Styles, scripts, images

extensions/
└── chat-timeline/      # Browser extension for host integration

datasets/
├── benchmarks/         # Truth sets and evaluation data
├── runs/              # Benchmark execution results
├── sources/           # Cached web content and references
└── sample-material/   # Development and demo data

docs/
├── architecture/      # System design documents
├── ops/              # Operations runbooks
└── guides/           # Development and usage guides
```

## Data Flow

### Request Processing
1. **Request** arrives at API server
2. **Intent detection** routes to appropriate skill
3. **Context retrieval** from knowledge layer
4. **Skill execution** with confidence scoring
5. **Response** with structured output and metadata

### Learning Loop
1. **Evaluation** detects accuracy gaps or low confidence
2. **Auto-teach** searches for authoritative sources
3. **Knowledge synthesis** extracts claims and evidence
4. **Validation** re-tests affected benchmarks
5. **Promotion** if metrics improve without regression

### Multimodal Integration
1. **Input** (text/image/audio) routed to appropriate modality
2. **Processing** converts to structured intermediate format
3. **Integration** feeds into knowledge layer and skills
4. **Output** maintains provenance and confidence metadata

## Quality Assurance

### Built-in Evaluation
- Continuous benchmarking against ground truth datasets
- Calibration scoring (confidence vs actual accuracy)
- Per-domain and per-skill performance tracking
- Error taxonomy and root cause analysis

### Safety Measures
- Abstention when confidence below threshold
- Multi-source verification for factual claims
- Provenance tracking for all knowledge
- PII detection and sanitization

### Performance Monitoring
- Response time and throughput metrics
- Resource utilization and cost tracking
- Error rates and failure patterns
- User satisfaction and task completion rates

## Extension Guidelines

### Adding New Skills
1. Implement skill interface with confidence scoring
2. Add evaluation benchmarks and truth sets
3. Document inputs, outputs, and error conditions
4. Integrate with auto-teach for continuous improvement

### Adding Modalities
1. Define clean input/output contracts
2. Implement fallback for unsupported formats
3. Add quality metrics and benchmarks
4. Ensure privacy and safety compliance

### Adding Providers
1. Implement provider interface with rate limiting
2. Add cost tracking and budget controls
3. Define routing rules based on task type
4. Monitor performance and reliability metrics

## Deployment

### Development
```bash
cd api/server && node main.js
```

### Production
- Docker containerization with health checks
- Environment-based configuration
- Graceful shutdown and error recovery
- Monitoring and alerting integration

---

*Last Updated: October 2025*
*Version: 2.0.0*