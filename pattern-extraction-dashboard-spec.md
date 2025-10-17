# Pattern Extraction Health Dashboard – Specification

## Objective
Provide real-time visibility into conversation intelligence extraction quality (patterns, traits, confidence) to ensure reliability and enable rapid remediation.

## Users & Primary Questions

| User | Question |
|------|----------|
| Product Lead | Are pattern confidences stable week-over-week? |
| Data Engineer | Which extraction stages are degrading? |
| QA Analyst | Are undefined / NaN incidents eliminated? |
| Founder | Is system accuracy improving with usage? |

## Core Metrics

| Metric | Definition | Target |
|--------|-----------|--------|
| Pattern Precision | TP / (TP+FP) vs validated sample | ≥ 0.85 |
| Pattern Recall | TP / (TP+FN) | ≥ 0.90 |
| Trait Confidence Drift | Δ mean confidence last 7d vs prior 7d | ≤ ±5% |
| Undefined Pattern Rate | (Undefined entries / total patterns) | 0% |
| NaN Confidence Rate | NaN confidences / total confidences | 0% |
| Extraction Latency | Ingest → render (p95) | < 2.5s |
| Duplicate Pattern Rate | Duplicate labels / total | < 2% |
| Guardrail Violations | Sum of all blocked renders | Downward trend |

## Data Flow

1. Ingestion event logged (conversation_id, timestamp, token_count).  
2. Extractor stages emit structured events (stage, duration_ms, outputs).  
3. Validator applies guardrails -> emits pass/fail & reasons.  
4. Aggregator computes rolling metrics (1h, 24h, 7d).  
5. Dashboard queries materialized views (e.g., SQLite/ DuckDB or timeseries store).  

## Guardrail Rules (Operational)

| Rule | Description | Action |
|------|-------------|--------|
| Non-empty label | Pattern label length ≥ 3 | Reject + log |
| Finite confidence | isFinite(conf) & 0≤conf≤100 | Clamp / reject if impossible |
| Duplicate collision | Same label same convo | Retain highest confidence |
| Trait required keys | All trait schema keys present | Insert default + warn |
| Overflow patterns | > MAX_PATTERNS (e.g., 25) | Truncate & emit overflow event |

## UI Layout

Sections: KPI Row → Trend Charts (Precision, Recall, Drift) → Error Table (violations grouped) → Latency Histogram → Recent Conversations Sample Explorer.

## Alerts

| Trigger | Threshold | Channel |
|---------|-----------|---------|
| Precision drop | <0.78 for 15m | Slack #ci-alerts |
| Undefined rate | >0 in last hour | Pager duty (low) |
| Drift spike | >10% change in mean confidence | Slack + email |

## Roadmap Enhancements

1. Anomaly detection (Z-score on drift).  
2. Active learning loop (flag low-confidence for manual labeling).  
3. Model version comparison overlay.  
4. Cost per extraction panel.  

---
End of Spec
