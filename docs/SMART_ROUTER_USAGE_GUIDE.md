// @version 3.3.495
/**
 * SmartRouter Usage Guide for Chat Routes
 * 
 * This shows how to integrate SmartRouter into actual provider calls
 * to replace simulated routing with REAL dynamic intelligence.
 * 
 * Copy/adapt these patterns into /src/nexus/routes/chat.ts
 */

// ============================================================================
// PATTERN 1: Simple Single-Provider with SmartRouting
// ============================================================================

/**
 * Example: Replace a hardcoded provider selection with SmartRouter
 * 
 * BEFORE (Simulated):
 *   const response = await precog.providers.generate({
 *     prompt: message,
 *     provider: 'anthropic', // Hardcoded!
 *   });
 * 
 * AFTER (Real Smart Routing):
 */
async function generateWithSmartRouting(message: string, systemPrompt?: string) {
  const smartRouter = getSmartRouter();
  
  // Use SmartRouter waterfall - tries best provider, falls back automatically
  const result = await smartRouter.smartRoute(message, {
    system: systemPrompt,
    maxTokens: 2048,
    timeout: 30000,
    maxRetries: 4, // Will try up to 4 providers before giving up
  });

  if (!result.success) {
    throw new Error(`All providers failed: ${result.error}`);
  }

  console.log(`[SmartRoute] Success via ${result.provider} in ${result.latency}ms (attempt ${result.attemptsNeeded})`);
  console.log(`[SmartRoute] Route history:`, result.routeHistory);

  return {
    response: result.response,
    provider: result.provider,
    latency: result.latency,
    attemptsNeeded: result.attemptsNeeded,
  };
}

// Usage in chat endpoint:
// const result = await generateWithSmartRouting(userMessage, systemPrompt);
// res.write(`data: ${JSON.stringify({ chunk: result.response })}\n\n`);

// ============================================================================
// PATTERN 2: Cost-Optimal Mode
// ============================================================================

/**
 * Example: When user selects "fast & cheap" mode, use SmartRouter
 * to intelligently balance cost and speed
 */
async function generateOptimalCost(message: string) {
  const smartRouter = getSmartRouter();
  
  // For cost-optimal routing, weight cost heavily
  const scorecard = smartRouter.getScorecard();
  scorecard.setScoringWeights({
    cost: 0.7, // 70% weight on cost (cheapest wins)
    latency: 0.2, // 20% on latency (still reasonable)
    reliability: 0.1, // 10% on reliability (must work)
  });

  const result = await smartRouter.smartRoute(message, {
    system: 'You are a helpful assistant. Be concise.',
    maxTokens: 1024, // Fewer tokens = cheaper
    maxRetries: 3,
  });

  // Restore default weights for next request
  scorecard.setScoringWeights({
    latency: 0.4,
    cost: 0.3,
    reliability: 0.3,
  });

  return result;
}

// ============================================================================
// PATTERN 3: Quality-Optimal Mode
// ============================================================================

/**
 * Example: When user needs best quality (willing to pay), prioritize
 * providers with highest success rate and lowest error rate
 */
async function generateOptimalQuality(message: string) {
  const smartRouter = getSmartRouter();
  const scorecard = smartRouter.getScorecard();

  // For quality mode, weight reliability heavily
  scorecard.setScoringWeights({
    reliability: 0.6, // 60% weight on reliability (quality first)
    latency: 0.3, // 30% on latency (reasonable speed)
    cost: 0.1, // 10% on cost (cost is secondary)
  });

  const result = await smartRouter.smartRoute(message, {
    system: 'You are an expert assistant. Provide detailed, thorough responses.',
    maxTokens: 4096, // More tokens for quality
    maxRetries: 4,
  });

  // Restore default weights
  scorecard.setScoringWeights({
    latency: 0.4,
    cost: 0.3,
    reliability: 0.3,
  });

  return result;
}

// ============================================================================
// PATTERN 4: Speed-Optimal Mode
// ============================================================================

/**
 * Example: For real-time interactive chat, prioritize latency
 */
async function generateOptimalSpeed(message: string) {
  const smartRouter = getSmartRouter();
  const scorecard = smartRouter.getScorecard();

  // Speed mode: minimize latency
  scorecard.setScoringWeights({
    latency: 0.7, // 70% weight on latency (fastest wins)
    reliability: 0.2, // 20% on reliability (must work)
    cost: 0.1, // 10% on cost (secondary)
  });

  const result = await smartRouter.smartRoute(message, {
    system: 'Brief, direct responses only.',
    maxTokens: 512, // Shorter = faster
    timeout: 15000, // Aggressive timeout for speed
    maxRetries: 2, // Quick fail-over
  });

  // Restore defaults
  scorecard.setScoringWeights({
    latency: 0.4,
    cost: 0.3,
    reliability: 0.3,
  });

  return result;
}

// ============================================================================
// PATTERN 5: Real-Time Fallback Integration
// ============================================================================

/**
 * Example: Call SmartRouter and stream response in real-time
 * This shows how to integrate with express streaming responses
 */
async function generateWithStreamingFallback(
  message: string,
  res: any,
  systemPrompt: string
) {
  const smartRouter = getSmartRouter();

  // Try providers in order until one succeeds
  const result = await smartRouter.smartRoute(message, {
    system: systemPrompt,
    maxTokens: 2048,
    timeout: 30000,
    maxRetries: 4,
  });

  if (!result.success) {
    res.write(`data: ${JSON.stringify({ error: result.error })}\n\n`);
    res.write(`data: [DONE]\n\n`);
    return;
  }

  // Stream the successful response in chunks (simulate streaming)
  const chunkSize = 50;
  for (let i = 0; i < result.response.length; i += chunkSize) {
    const chunk = result.response.slice(i, i + chunkSize);
    res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    await new Promise((resolve) => setTimeout(resolve, 5)); // Realistic delay
  }

  // Send metadata
  res.write(
    `data: ${JSON.stringify({
      metadata: {
        provider: result.provider,
        latency: result.latency,
        attemptsNeeded: result.attemptsNeeded,
      },
    })}\n\n`
  );

  res.write(`data: [DONE]\n\n`);
}

// ============================================================================
// PATTERN 6: Monitoring & Metrics
// ============================================================================

/**
 * Example: Check provider rankings before routing
 */
function logProviderStatus() {
  const smartRouter = getSmartRouter();
  const rankings = smartRouter.getProviderRankings();

  console.log('[Provider Ranking Status]');
  rankings.forEach((r) => {
    console.log(
      `  ${r.rank}. ${r.provider}: score=${r.score.toFixed(3)} ${r.recommendation}`
    );
  });

  const scorecard = smartRouter.getScorecard();
  const report = scorecard.getReport();

  console.log('[Provider Performance Report]');
  Object.entries(report).forEach(([provider, data]: any) => {
    console.log(`  ${provider}:`);
    console.log(`    - Requests: ${data.requests}`);
    console.log(`    - Success Rate: ${data.successRate}`);
    console.log(`    - Avg Latency: ${data.avgLatency}`);
    console.log(`    - Error Rate: ${data.errorRate}`);
  });
}

// ============================================================================
// PATTERN 7: Exclude Specific Providers
// ============================================================================

/**
 * Example: If a provider is having issues, exclude it from routing
 */
async function generateExcludingProvider(
  message: string,
  excludeProvider: string
) {
  const smartRouter = getSmartRouter();

  const result = await smartRouter.smartRoute(message, {
    system: 'You are helpful.',
    maxTokens: 2048,
    excludeProviders: [excludeProvider], // Skip this provider
    maxRetries: 3,
  });

  return result;
}

// Usage:
// const result = await generateExcludingProvider(message, 'openai');
// If OpenAI is having issues, route will skip it and try next best

// ============================================================================
// PATTERN 8: Manual Metrics Recording (for testing)
// ============================================================================

/**
 * Example: If you call a provider manually, record the metrics
 */
async function customProviderCall(provider: string, message: string) {
  const smartRouter = getSmartRouter();
  const startTime = Date.now();

  try {
    // Call provider directly (some custom logic)
    const response = await someCustomProviderCall(provider, message);
    const latency = Date.now() - startTime;

    // Record success in scorecard
    smartRouter.recordMetric(provider, latency, true, response.tokens);

    console.log(`[Metrics] ${provider} success in ${latency}ms`);
    return response;
  } catch (error) {
    const latency = Date.now() - startTime;

    // Record failure in scorecard
    smartRouter.recordMetric(
      provider,
      latency,
      false,
      undefined,
      error instanceof Error ? error.message : String(error)
    );

    console.error(`[Metrics] ${provider} failed after ${latency}ms: ${error}`);
    throw error;
  }
}

async function someCustomProviderCall(provider: string, message: string) {
  // Your custom implementation
  return { content: 'response', tokens: 100 };
}

// ============================================================================
// HOW TO INTEGRATE INTO chat.ts
// ============================================================================

/**
 * Replace this section in /src/nexus/routes/chat.ts around line 1035:
 * 
 * BEFORE:
 *   const parallelResult = await parallelOrchestrator.hyperParallelGenerate(enhancedMessage, {
 *     system: systemPrompt,
 *     sessionId: sessionId,
 *     maxTokens: 2048,
 *   });
 * 
 * AFTER (depending on mode):
 * 
 *   if (mode === 'optimal-cost') {
 *     const result = await generateOptimalCost(enhancedMessage);
 *     fullResponse = result.response;
 *   } else if (mode === 'optimal-quality') {
 *     const result = await generateOptimalQuality(enhancedMessage);
 *     fullResponse = result.response;
 *   } else if (mode === 'optimal-speed') {
 *     const result = await generateOptimalSpeed(enhancedMessage);
 *     fullResponse = result.response;
 *   } else if (routingStrategy === 'ensemble') {
 *     // Keep parallel orchestrator for true ensemble
 *     const parallelResult = await parallelOrchestrator.hyperParallelGenerate(...);
 *   } else {
 *     // Default: smart routing with waterfall
 *     const result = await generateWithSmartRouting(enhancedMessage, systemPrompt);
 *     fullResponse = result.response;
 *   }
 */

export {
  generateWithSmartRouting,
  generateOptimalCost,
  generateOptimalQuality,
  generateOptimalSpeed,
  generateWithStreamingFallback,
  logProviderStatus,
  generateExcludingProvider,
  customProviderCall,
};
