Title: Critical – GitHub Context Server must call AI providers

Description:
The GitHub Context Server (`servers/github-context-server.js`) is prepared to analyze GitHub repository context but does NOT actually call any AI provider. Currently it returns a status of 'ready' but the AI analysis never executes.

What's broken:
- Line 87 has a TODO comment: `// TODO: Call providers (Claude, GPT, etc.) with this context`
- System prompt is built but never sent to any provider
- Response is mocked with `status: 'ready'` instead of actual analysis
- Users cannot get AI-generated insights about their repository

Requirements:
1. POST `/api/v1/github/ask` must call a provider (fallback chain: Claude → OpenAI → Gemini → DeepSeek → LocalAI)
2. Send systemPrompt + question to selected provider
3. Stream or batch return actual AI-generated analysis
4. Include timeout handling (30s max)
5. Fall back to next provider if one fails
6. Return structured response: { ok, analysis, provider, tokens, error }

Acceptance Criteria:
- [ ] POST request to `/api/v1/github/ask` calls actual provider (verified via logs)
- [ ] At least one provider returns non-mocked analysis
- [ ] Error handling works (provider down → fallback)
- [ ] Response includes which provider was used
- [ ] Test script passes with real repo context

Effort: 2 hours  
Priority: P0 (Blocking demos)  
Labels: critical, backend, ai-integration, github

Files affected:
- `servers/github-context-server.js`
- Import: `simple-api-server.js` (for provider calling patterns)

Test command (after fix):
```bash
curl -X POST http://localhost:3010/api/v1/github/ask \
  -H 'Content-Type: application/json' \
  -d '{"question":"What are the main concerns in this codebase?","depth":"full"}'
```
