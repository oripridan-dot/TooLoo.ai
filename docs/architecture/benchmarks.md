# TooLoo.ai Web Search Benchmark System

## Objective

Achieve >90% accuracy on real-world prediction tasks through evidence-based learning and continuous improvement.

## Benchmark Design

### Task Categories

1. **Fact Verification**
   - Claims: "Company X launched product Y in 2024"
   - Sources: Multiple independent articles, press releases
   - Metrics: Accuracy, precision, recall, calibration

2. **Causal Analysis**
   - Questions: "What caused the service outage on date X?"
   - Sources: Technical blogs, incident reports, documentation
   - Metrics: Causal chain accuracy, evidence quality

3. **Timeline Reconstruction**
   - Questions: "What was the sequence of events in project Y?"
   - Sources: News articles, company updates, financial reports
   - Metrics: Temporal ordering accuracy, completeness

4. **Best Practice Synthesis**
   - Questions: "What are recommended approaches for problem X?"
   - Sources: Technical documentation, expert articles, case studies
   - Metrics: Recommendation quality, source authority

### Quality Framework

#### Truth Generation
- **Multi-source requirement**: Minimum 3 independent sources
- **Authority scoring**: Academic > Industry experts > News > Blogs
- **Recency weighting**: Prefer sources <6 months old
- **Contradiction detection**: Flag conflicting evidence
- **Evidence quotation**: Mark supporting text spans

#### Prediction Scoring
- **Accuracy**: Exact match vs truth
- **Calibration**: Confidence vs correctness correlation (Brier score)
- **Abstention**: Reward "I don't know" over incorrect certainty
- **Latency**: Time to first response
- **Cost**: API calls and tokens used

#### Confidence Calibration
```
If confidence > 0.9: Accuracy should be > 0.9
If confidence > 0.8: Accuracy should be > 0.8
If confidence < 0.6: Should abstain or flag uncertainty
```

## Implementation

### Data Pipeline

```
Search Queries → Web Sources → Content Extraction → Truth Sets → Prediction → Scoring
```

1. **Query Generation**
   - Curated question bank across domains
   - Parameterized templates for systematic coverage
   - Real user queries from production logs

2. **Source Acquisition**
   - Web search with query rewrites
   - Authority-based ranking and filtering
   - Content deduplication and spam detection
   - HTML → clean text extraction

3. **Truth Extraction**
   - Multi-model consensus on facts
   - Human verification for high-value examples
   - Structured claim representation
   - Provenance and confidence metadata

4. **Prediction Generation**
   - TooLoo processes question + sources
   - Structured output with reasoning chain
   - Confidence score and evidence citations
   - Abstention option for uncertain cases

5. **Automated Scoring**
   - Truth comparison with fuzzy matching
   - Confidence calibration analysis
   - Error categorization and reporting
   - Performance trending and alerts

### Benchmark Datasets

#### Initial Domains
- **Technology**: Product launches, security incidents, API changes
- **Health**: Treatment guidelines, study results, safety alerts  
- **Business**: Earnings, strategy changes, market events

#### Dataset Structure
```json
{
  "id": "tech_001",
  "domain": "technology",
  "question": "What caused the AWS outage on 2024-03-15?",
  "sources": [
    {
      "url": "https://aws.amazon.com/status/",
      "title": "AWS Service Health Dashboard",
      "content": "...",
      "authority": 0.95,
      "timestamp": "2024-03-15T14:30:00Z"
    }
  ],
  "truth": {
    "answer": "Configuration change in us-east-1 load balancer",
    "confidence": 0.9,
    "evidence": ["quote1", "quote2"],
    "sources_used": [0, 1]
  }
}
```

## Benchmark Runners

### Continuous Evaluation
```bash
# Run latest benchmark suite
npm run benchmark:web-search

# Run specific domain
npm run benchmark:web-search -- --domain=technology

# Generate calibration report
npm run benchmark:calibration
```

### Performance Targets

| Metric | Current | Target | 
|--------|---------|--------|
| Accuracy | 75% | >90% |
| Calibration | 0.15 | <0.10 |
| Abstention | 5% | 10-15% |
| Cost/Query | $0.02 | <$0.01 |

## Auto-Improvement Loop

### Gap Detection
- Accuracy drops below threshold per domain
- High-confidence errors (overconfident mistakes)
- New question types without coverage
- Source authority degradation over time

### Learning Actions
1. **Source Expansion**: Find better authorities for low-accuracy domains
2. **Prompt Tuning**: Improve few-shots and reasoning templates  
3. **Provider Routing**: Route questions to best-performing models
4. **Knowledge Updates**: Refresh facts with newer information
5. **Abstention Calibration**: Adjust confidence thresholds

### Validation Protocol
- Hold-out test set (20% of benchmark)
- A/B testing for significant changes
- Rollback if accuracy regression > 2%
- Human review for high-stakes domains

## Dashboard Integration

### Real-time Metrics
- Current accuracy by domain and time period
- Calibration curves and Brier scores
- Cost and latency trends
- Error taxonomy breakdown

### Benchmark Management
- Queue and status of running evaluations
- Truth set coverage and freshness
- Source quality and diversity metrics
- Manual review queue for edge cases

### Auto-Teach Monitor
- Active learning opportunities identified
- Knowledge update candidates
- Prompt improvement suggestions
- A/B test results and recommendations

---

*Implementation Timeline: Week 2 of reorg*
*First accuracy target: >85% by end of Month 1*