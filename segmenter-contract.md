# Segmenter Engine Contract (Phase P2)
Version: 0.1.0
Date: 2025-10-08

## Purpose
Transform flat message list into higher-level conversational segments aligned with taxonomy (pivot, risk, mitigation, option framing, decision compression, authorization, privacy, profile, onboarding, format, execution).

## Input
messages: [{ id, author, content, index }]

## Output
{ segments: [ { id, label, startMessageId, endMessageId, confidence, rationale[] } ] }

## Label Determination
Lexical pattern scoring (regex library) assigns candidate labels. Highest weight >= threshold => label else EXECUTION/REFINEMENT.

## Confidence
Currently max lexical weight encountered inside segment (0–1). Future: blend with boundary distinctiveness & density.

## Boundary Rules
- New segment when label changes.
- Force boundary on high-signal labels (Pivot Question, Profile Delivery) even if prior label identical.
- Merge singleton EXECUTION between identical neighbors.

## Performance
O(N * P) where P = pattern count (~11). For 400 messages negligible (<1ms typical).

## Limitations (v0.1)
- No semantic embedding disambiguation.
- Label drift inside long segments not split mid-way.
- Does not leverage author role weighting yet.

## Planned Enhancements
1. Add recency-adjusted boundary weighting.
2. Structural bigram detection for multi-line enumerations.
3. Confidence decomposition (lexical, structural, density).

End of Contract v0.1.0