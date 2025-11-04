Title: High – Reports Server needs advanced analytics

Description:
The Reports Server (`servers/reports-server.js`) generates basic reports but lacks advanced comparative and predictive analytics needed for insights and decisions.

What's missing:
- No multi-cohort comparisons
- Limited trend analysis (no 7/30/90-day trends)
- No learning velocity predictions
- No cost-benefit analysis per workflow
- Peer profiling data not persisted

Requirements:
1. Multi-cohort comparative dashboards (side-by-side metrics)
2. Trend analysis (7-day, 30-day, 90-day moving averages)
3. Predictive analytics (learning velocity forecast)
4. Cost-benefit analysis (ROI per workflow)
5. Peer profiling persistence (save/load profiles)
6. Anomaly detection (alert on unusual patterns)

Acceptance Criteria:
- [ ] Comparative reports show 2+ cohorts side-by-side
- [ ] Trend endpoint calculates moving averages (7/30/90 day)
- [ ] Learning velocity prediction accuracy > 75%
- [ ] Cost-benefit scores available per workflow
- [ ] Peer profiles persisted to disk/DB
- [ ] Anomalies flagged with > 95% specificity
- [ ] Reports generated in < 2 seconds

Effort: 2.5 hours  
Priority: P1 (High – needed for strategy decisions)  
Labels: high, backend, analytics, reports

Files affected:
- `servers/reports-server.js`
- Possibly new: `modules/predictive-analytics.js`

Dependencies:
- Historical data (training server logs)
- Cost tracking (budget server)

Test command (after fix):
```bash
# Multi-cohort comparison
curl http://127.0.0.1:3008/api/v1/reports/cohort-comparison?cohortA=grp1&cohortB=grp2

# Trend analysis
curl http://127.0.0.1:3008/api/v1/reports/trends?period=30d

# Learning velocity prediction
curl http://127.0.0.1:3008/api/v1/reports/predict-velocity?cohortId=grp1
```

Expected: Real trend data and predictions (not mocks)
