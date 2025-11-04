Title: High – Product Development Server analysis must call real providers

Description:
The Product Development Server (`servers/product-development-server.js`) has showcase and analysis endpoints but returns simulated/mocked results instead of calling real AI providers.

What's broken:
- `/api/v1/analysis/document` returns hardcoded mock analysis
- `/api/v1/showcase/generate-ideas` returns deterministic demo ideas
- `/api/v1/showcase/critique-ideas` generates random scores (no real provider evaluation)
- `/api/v1/showcase/select-best` picks winner deterministically (no true consensus)
- `/api/v1/showcase/generate-docs` returns skeleton templates only (no real content)

Requirements:
1. Document analysis must call real provider (not simulate)
2. Multi-provider consensus scoring for ideas (aggregate scores from 3+ providers)
3. Real artifact generation (use templates + provider-generated content)
4. Idea generation uses provider brainstorming (not hardcoded list)
5. Caching for repeated analyses (1-hour TTL)
6. Fallback if providers are down

Acceptance Criteria:
- [ ] Real provider calls verified in logs
- [ ] Analysis includes insights from Claude/GPT/Gemini (not mocks)
- [ ] Consensus scores reflect multiple providers
- [ ] Generated artifacts include provider-written content
- [ ] Ideas are unique per request (not deterministic)
- [ ] Caching works (same input → cached result)
- [ ] Error handling graceful (provider down → fallback)
- [ ] All showcase stages functional with real data

Effort: 3 hours  
Priority: P1 (High – feature completeness)  
Labels: high, backend, ai-integration, product-dev

Files affected:
- `servers/product-development-server.js`
- Reference: `simple-api-server.js` (for provider patterns)
- Reference: `lib/domains/coding-module.js` (for AI calling)

Test command (after fix):
```bash
# Generate ideas (should call providers)
curl -X POST http://127.0.0.1:3006/api/v1/showcase/generate-ideas \
  -H 'Content-Type: application/json' \
  -d '{}'

# Critique ideas (should call multiple providers)
curl -X POST http://127.0.0.1:3006/api/v1/showcase/critique-ideas \
  -H 'Content-Type: application/json' \
  -d '{"ideas":["App1","App2"]}'
```

Expected: Real provider analysis (check logs for API calls)
