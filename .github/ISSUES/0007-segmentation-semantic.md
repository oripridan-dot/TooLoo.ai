Title: High – Segmentation Server needs semantic segmentation

Description:
The Segmentation Server (`servers/segmentation-server.js`) currently uses only token-based segmentation. Advanced semantic segmentation is a placeholder for future enhancement (noted in `api/skills/segmentation.js` line 404).

What's missing:
- Only token/sentence-based splitting (no semantic understanding)
- Limited trait detection (pattern-matching only)
- No cross-conversation context matching
- No embedding-based clustering

Requirements:
1. Semantic segmentation using embeddings (OpenAI or local)
2. Multi-turn context preservation across segments
3. Trait clustering and profiling
4. Cross-conversation linking (find similar topics across chats)
5. Confidence scores for segment boundaries
6. Optional: persistent trait evolution tracking

Acceptance Criteria:
- [ ] Embeddings generated for segments (sentence-transformers or OpenAI)
- [ ] Semantic clustering identifies related content across turns
- [ ] Traits extracted with > 80% accuracy on test set
- [ ] Cross-conversation matching finds similar topics
- [ ] Confidence scores > 0.7 for accurate segments
- [ ] Performance < 500ms for typical conversation (100 turns)
- [ ] Test cases pass

Effort: 2.5 hours  
Priority: P1 (High – improves user profiling)  
Labels: high, backend, nlp, segmentation

Files affected:
- `servers/segmentation-server.js`
- `api/skills/segmentation.js`

Dependencies:
- Embedding model (local: sentence-transformers, or remote: OpenAI API)
- Optional: redis for caching embeddings

Test command (after fix):
```bash
curl -X POST http://127.0.0.1:3007/api/v1/segmentation/analyze \
  -H 'Content-Type: application/json' \
  -d '{
    "messages": [
      {"role":"user","content":"I want to learn Python"},
      {"role":"assistant","content":"Python is great..."},
      {"role":"user","content":"How about performance with C++?"}
    ]
  }'
```

Expected: Semantic segments with trait extraction and cross-turn linking
