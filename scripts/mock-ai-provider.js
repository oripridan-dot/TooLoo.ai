#!/usr/bin/env node

/**
 * Mock AI Provider Server for Testing
 * 
 * This creates a simple HTTP server that mimics OpenAI's API
 * for testing the GitHub Context Server without real API keys.
 */

import express from 'express';

const app = express();
const PORT = 11111;

app.use(express.json());

// Mock OpenAI API endpoint
app.post('/v1/chat/completions', (req, res) => {
  const { messages } = req.body;
  
  // Extract the question from messages
  const userMessage = messages.find(m => m.role === 'user');
  const systemMessage = messages.find(m => m.role === 'system');
  
  // Generate a mock response based on the question
  const mockAnalysis = `## Repository Analysis (Mock Response)

Based on the GitHub repository context provided, here are the main findings:

### Code Quality
- The repository follows a modular structure with clear separation of concerns
- Server implementation uses Express.js with proper middleware setup
- Error handling is implemented with try-catch blocks and fallback mechanisms

### Architecture
- Multi-provider AI integration with intelligent fallback chain
- Configurable timeout handling (30s per provider)
- RESTful API design with proper HTTP methods and status codes

### Main Concerns
1. **Provider Configuration**: Server requires at least one AI provider to be configured
2. **API Key Management**: Sensitive keys should be stored securely in environment variables
3. **Timeout Handling**: 30-second timeout per provider might be too long for some use cases
4. **Error Recovery**: Fallback chain provides good resilience but all providers failing returns error

### Recommendations
1. Add request rate limiting to prevent abuse
2. Implement caching for repeated queries
3. Add monitoring/logging for provider performance
4. Consider adding streaming responses for better UX
5. Add unit tests for provider-specific code paths

### Security Considerations
- API keys are properly loaded from environment variables
- CORS is enabled (should be restricted in production)
- No sensitive data logging detected
- Input validation present for required fields

This is a well-structured implementation following best practices for multi-provider integration.`;

  // Simulate processing delay
  setTimeout(() => {
    res.json({
      id: 'mock-completion-id',
      object: 'chat.completion',
      created: Date.now(),
      model: req.body.model || 'mock-gpt-4',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: mockAnalysis
          },
          finish_reason: 'stop'
        }
      ],
      usage: {
        prompt_tokens: 1234,
        completion_tokens: 456,
        total_tokens: 1690
      }
    });
  }, 1000); // 1 second delay to simulate API call
});

app.listen(PORT, () => {
  console.log(`\n🎭 Mock AI Provider Server running on port ${PORT}`);
  console.log(`   Simulates OpenAI API for testing`);
  console.log(`   Endpoint: http://localhost:${PORT}/v1/chat/completions\n`);
});
