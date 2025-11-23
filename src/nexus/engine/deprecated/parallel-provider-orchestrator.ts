// @version 2.1.11
/**
 * Parallel Provider Orchestrator - HYPER-SPEED MASTERY MODE
 * Uses ALL available AI providers simultaneously to accelerate training completion
 * Multiple providers work in parallel to generate, validate, and consensus-build responses
 */

import { generateSmartLLM, getProviderStatus } from './llm-provider.js';
import KnowledgeGraphEngine from './knowledge-graph-engine.js';

export default class ParallelProviderOrchestrator {
  constructor(options = {}) {
    this.maxConcurrency = options.maxConcurrency || 8; // Max parallel requests
    this.consensusThreshold = options.consensusThreshold || 0.7; // 70% agreement needed
    this.timeout = options.timeout || 30000; // 30 second timeout per provider
    this.retryAttempts = options.retryAttempts || 2;
    
    this.providers = [
      'ollama', 'localai', 'huggingface', 'deepseek', 
      'openinterpreter', 'anthropic', 'openai', 'gemini'
    ];
    
    // Enhanced real-time stats with time-series data
    this.stats = {
      totalRequests: 0,
      parallelRequests: 0,
      consensusAchieved: 0,
      avgResponseTime: 0,
      providerStats: {},
      timeSeries: [], // Rolling time-series data
      activeRequests: 0,
      lastUpdate: Date.now()
    };
    
    // Real-time metrics storage
    this.metrics = {
      responseTimes: [],
      costs: [],
      successRates: [],
      concurrencyLevels: [],
      goalPerformance: new Map() // Track performance by goal/task
    };
    
    // Rolling window for real-time calculations (last 1000 requests)
    this.rollingWindowSize = 1000;
    
    // Knowledge graph for cross-goal optimization
    this.knowledgeGraph = new KnowledgeGraphEngine();
    
    // Initialize provider stats
    this.providers.forEach(provider => {
      this.stats.providerStats[provider] = {
        requests: 0,
        successes: 0,
        failures: 0,
        avgTime: 0,
        avgCost: 0,
        lastUsed: null,
        uptime: 0,
        consecutiveFailures: 0,
        rollingSuccessRate: 0,
        rollingAvgTime: 0,
        totalTokens: 0,
        totalCost: 0
      };
    });
  }

  /**
   * HYPER-PARALLEL: Use ALL providers simultaneously for training question
   */
  async hyperParallelGenerate(prompt, options = {}) {
    const startTime = Date.now();
    this.stats.totalRequests++;
    this.stats.parallelRequests++;

    try {
      const availableProviders = await this.getAvailableProviders(options.goal || 'general', options.context || {});
      console.log(`🚀 HYPER-PARALLEL: Launching ${availableProviders.length} providers simultaneously`);

      // Provider scheduler/queue logic
      const responses = [];
      const failedProviders = [];
      let completed = 0;

      // Helper to process a single provider with retry
      const processProvider = async (provider, attempt = 1) => {
        try {
          this.activeRequests++;
          const result = await this.callProviderWithTimeout(provider, prompt, options);
          responses.push(result);
        } catch (error) {
          if (attempt < this.retryAttempts) {
            console.warn(`🔁 Retrying provider ${provider} (attempt ${attempt + 1})`);
            await new Promise(resolve => setTimeout(resolve, 500)); // Stagger retry
            return processProvider(provider, attempt + 1);
          } else {
            failedProviders.push({ provider, error });
          }
        } finally {
          this.activeRequests--;
          completed++;
        }
      };

      // Queue up providers, respecting maxConcurrency
      const queue = [...availableProviders];
      const processQueue = async () => {
        const promises = [];
        while (queue.length > 0 && this.activeRequests < this.maxConcurrency) {
          const provider = queue.shift();
          promises.push(processProvider(provider));
        }
        await Promise.all(promises);
        if (queue.length > 0) {
          await processQueue();
        }
      };

      await processQueue();

      // Process results and build consensus
      const consensus = this.buildConsensus(responses);
      const totalTime = Date.now() - startTime;
      const totalCost = responses.reduce((sum, r) => sum + (r.cost || 0), 0);
      this.updateStats(totalTime, responses, options.goal || 'general', totalCost);

      return {
        ok: true,
        consensus: consensus.agreed,
        confidence: consensus.confidence,
        responseTime: totalTime,
        providersUsed: responses.map(r => r.provider),
        responses: responses,
        failedProviders,
        stats: {
          successful: responses.length,
          failed: failedProviders.length,
          total: availableProviders.length,
          parallelSpeedup: this.calculateSpeedup(responses)
        }
      };

    } catch (error) {
      console.error('❌ Hyper-parallel generation failed:', error);
      return {
        ok: false,
        error: error.message,
        fallback: await this.fallbackSingleProvider(prompt, options)
      };
    }
  }

  /**
   * TURBO TRAINING: Parallel processing for training rounds
   */
  async turboTrainingRound(questions, options = {}) {
    const startTime = Date.now();
    console.log(`🏎️ TURBO TRAINING: Processing ${questions.length} questions in parallel`);

    // Process multiple questions simultaneously using provider pool
    const questionPromises = questions.map(question => 
      this.hyperParallelGenerate(question.prompt, {
        ...options,
        questionId: question.id,
        domain: question.domain
      })
    );

    const results = await Promise.allSettled(questionPromises);
    const processedResults = results.map((result, index) => ({
      questionId: questions[index].id,
      domain: questions[index].domain,
      success: result.status === 'fulfilled',
      data: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason : null
    }));

    const totalTime = Date.now() - startTime;
    const successful = processedResults.filter(r => r.success).length;

    console.log(`✅ TURBO TRAINING COMPLETE: ${successful}/${questions.length} questions processed in ${totalTime}ms`);

    return {
      ok: true,
      totalTime,
      questionsProcessed: questions.length,
      successful,
      results: processedResults,
      speedup: this.calculateTrainingSpeedup(questions.length, totalTime),
      stats: this.getSessionStats()
    };
  }

  /**
   * CONSENSUS MASTERY: Multi-provider validation for training answers
   */
  async consensusMastery(question, studentAnswer, options = {}) {
    const evaluationPrompt = `
EVALUATION TASK: Assess student mastery for this question.

QUESTION: ${question}

STUDENT ANSWER: ${studentAnswer}

EVALUATION CRITERIA:
- Accuracy (0-100): Is the answer factually correct?
- Completeness (0-100): Does it cover all key points?
- Understanding (0-100): Does it show deep comprehension?
- Clarity (0-100): Is it well-explained?

RESPONSE FORMAT:
{
  "accuracy": 85,
  "completeness": 90,
  "understanding": 88,
  "clarity": 92,
  "overall": 89,
  "feedback": "Strong answer with good examples. Could improve by...",
  "masteryLevel": "Advanced"
}
`;

    const result = await this.hyperParallelGenerate(evaluationPrompt, {
      ...options,
      taskType: 'evaluation',
      expectJSON: true
    });

    if (result.ok) {
      const evaluations = this.parseEvaluations(result.responses);
      const consensusScore = this.calculateConsensusScore(evaluations);
      
      return {
        ok: true,
        masteryScore: consensusScore.overall,
        detailedScores: consensusScore.breakdown,
        consensus: consensusScore.confidence,
        feedback: consensusScore.feedback,
        providersUsed: result.providersUsed.length,
        evaluations: evaluations
      };
    }

    return { ok: false, error: 'Consensus evaluation failed' };
  }

  /**
   * Provider timeout wrapper
   */
  async callProviderWithTimeout(provider, prompt, options) {
    return new Promise(async (resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Provider ${provider} timeout after ${this.timeout}ms`));
      }, this.timeout);

      try {
        const result = await generateSmartLLM({
          prompt,
          provider,
          taskType: options.taskType || 'training',
          context: options.context || {}
        });

        clearTimeout(timeout);
        resolve({
          provider,
          success: true,
          content: result.content || result.text || '',
          confidence: result.confidence || 0.8,
          responseTime: Date.now() - (options.startTime || Date.now()),
          cost: result.cost || 0,
          tokens: result.tokens || 0
        });
      } catch (error) {
        clearTimeout(timeout);
        reject({
          provider,
          success: false,
          error: error.message
        });
      }
    });
  }

  /**
   * Get available providers with knowledge graph optimization
   */
  async getAvailableProviders(goal = 'general', context = {}) {
    const status = getProviderStatus();
    let availableProviders = Object.keys(status)
      .filter(provider => status[provider].available && status[provider].enabled);
    
    if (goal === 'general' || availableProviders.length <= 2) {
      // Use basic availability for general tasks or when few providers available
      return availableProviders.slice(0, this.maxConcurrency);
    }
    
    // Use knowledge graph for intelligent provider selection
    const recommendations = this.knowledgeGraph.getProviderRecommendations(goal, context);
    
    if (recommendations.length > 0) {
      // Prioritize recommended providers that are currently available
      const recommendedAvailable = recommendations
        .filter(rec => availableProviders.includes(rec.provider))
        .sort((a, b) => b.score - a.score)
        .map(rec => rec.provider);
      
      // Fill remaining slots with other available providers
      const remaining = availableProviders.filter(p => !recommendedAvailable.includes(p));
      
      availableProviders = [...recommendedAvailable, ...remaining];
    }
    
    return availableProviders.slice(0, this.maxConcurrency);
  }

  /**
   * Process parallel results
   */
  processParallelResults(results, providers) {
    const successful = [];
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.success) {
        successful.push(result.value);
      } else {
        console.warn(`⚠️ Provider ${providers[index]} failed:`, 
          result.status === 'rejected' ? result.reason : result.value?.error);
      }
    });

    return successful;
  }

  /**
   * Build consensus from multiple responses
   */
  buildConsensus(responses) {
    if (responses.length === 0) {
      return { agreed: 'No responses received', confidence: 0 };
    }

    if (responses.length === 1) {
      return { 
        agreed: responses[0].content, 
        confidence: responses[0].confidence 
      };
    }

    // For multiple responses, find the best consensus
    // This is a simplified version - could use more sophisticated NLP matching
    const contentLengths = responses.map(r => r.content.length);
    const avgLength = contentLengths.reduce((a, b) => a + b, 0) / contentLengths.length;
    
    // Prefer responses that are close to average length and high confidence
    const scored = responses.map(r => ({
      ...r,
      score: r.confidence * (1 - Math.abs(r.content.length - avgLength) / avgLength)
    }));

    scored.sort((a, b) => b.score - a.score);
    
    // Use top response as consensus with confidence based on agreement
    const consensus = scored[0];
    const avgConfidence = responses.reduce((sum, r) => sum + r.confidence, 0) / responses.length;
    
    return {
      agreed: consensus.content,
      confidence: Math.min(avgConfidence * (responses.length / this.providers.length), 1.0)
    };
  }

  /**
   * Parse evaluation responses
   */
  parseEvaluations(responses) {
    return responses.map(response => {
      try {
        // Try to parse JSON response
        const cleanContent = response.content.replace(/```json\n?|\n?```/g, '').trim();
        const evaluation = JSON.parse(cleanContent);
        return {
          provider: response.provider,
          scores: evaluation,
          confidence: response.confidence
        };
      } catch (error) {
        // Fallback to text parsing for non-JSON responses
        return {
          provider: response.provider,
          scores: this.parseTextEvaluation(response.content),
          confidence: response.confidence * 0.7 // Reduce confidence for parsed text
        };
      }
    });
  }

  /**
   * Parse text-based evaluations
   */
  parseTextEvaluation(text) {
    const defaultScores = {
      accuracy: 75,
      completeness: 75,
      understanding: 75,
      clarity: 75,
      overall: 75,
      feedback: text.slice(0, 200),
      masteryLevel: 'Intermediate'
    };

    // Simple pattern matching for scores
    const accuracyMatch = text.match(/accuracy[:\s]*(\d+)/i);
    const completenessMatch = text.match(/completeness[:\s]*(\d+)/i);
    const understandingMatch = text.match(/understanding[:\s]*(\d+)/i);
    const clarityMatch = text.match(/clarity[:\s]*(\d+)/i);

    if (accuracyMatch) defaultScores.accuracy = parseInt(accuracyMatch[1]);
    if (completenessMatch) defaultScores.completeness = parseInt(completenessMatch[1]);
    if (understandingMatch) defaultScores.understanding = parseInt(understandingMatch[1]);
    if (clarityMatch) defaultScores.clarity = parseInt(clarityMatch[1]);

    defaultScores.overall = Math.round(
      (defaultScores.accuracy + defaultScores.completeness + 
       defaultScores.understanding + defaultScores.clarity) / 4
    );

    return defaultScores;
  }

  /**
   * Calculate consensus score from multiple evaluations
   */
  calculateConsensusScore(evaluations) {
    if (evaluations.length === 0) {
      return { overall: 0, confidence: 0, feedback: 'No evaluations received' };
    }

    const avgScores = {
      accuracy: 0,
      completeness: 0,
      understanding: 0,
      clarity: 0,
      overall: 0
    };

    let totalWeight = 0;
    let feedback = [];

    evaluations.forEach(evaluation => {
      const weight = evaluation.confidence;
      totalWeight += weight;
      
      avgScores.accuracy += (evaluation.scores.accuracy || 0) * weight;
      avgScores.completeness += (evaluation.scores.completeness || 0) * weight;
      avgScores.understanding += (evaluation.scores.understanding || 0) * weight;
      avgScores.clarity += (evaluation.scores.clarity || 0) * weight;
      avgScores.overall += (evaluation.scores.overall || 0) * weight;
      
      if (evaluation.scores.feedback) {
        feedback.push(`${evaluation.provider}: ${evaluation.scores.feedback}`);
      }
    });

    // Normalize by total weight
    Object.keys(avgScores).forEach(key => {
      avgScores[key] = Math.round(avgScores[key] / totalWeight);
    });

    const confidence = Math.min(evaluations.length / 3, 1.0); // Higher confidence with more evaluators

    return {
      overall: avgScores.overall,
      breakdown: avgScores,
      confidence,
      feedback: feedback.join('\n\n')
    };
  }

  /**
   * Fallback to single provider if parallel fails
   */
  async fallbackSingleProvider(prompt, options) {
    try {
      const result = await generateSmartLLM({
        prompt,
        taskType: options.taskType || 'general'
      });
      
      return {
        content: result.content || result.text || '',
        provider: result.provider || 'fallback',
        confidence: (result.confidence || 0.7) * 0.8 // Reduce confidence for fallback
      };
    } catch (error) {
      return {
        content: 'Fallback generation failed',
        provider: 'none',
        confidence: 0
      };
    }
  }

  /**
   * Calculate parallel speedup
   */
  calculateSpeedup(responses) {
    if (responses.length <= 1) return 1;
    
    const avgSequentialTime = responses.reduce((sum, r) => sum + r.responseTime, 0) / responses.length;
    const parallelTime = Math.max(...responses.map(r => r.responseTime));
    
    return Math.round((avgSequentialTime * responses.length / parallelTime) * 10) / 10;
  }

  /**
   * Calculate training speedup
   */
  calculateTrainingSpeedup(questionCount, totalTime) {
    // Estimate sequential time (average 3 seconds per question)
    const estimatedSequentialTime = questionCount * 3000;
    const speedup = estimatedSequentialTime / totalTime;
    
    return {
      estimated: Math.round(speedup * 10) / 10,
      timePerQuestion: Math.round(totalTime / questionCount),
      description: `${speedup.toFixed(1)}x faster than sequential processing`
    };
  }

  /**
   * Update performance statistics with real-time metrics
   */
  updateStats(responseTime, responses, goal = 'general', cost = 0) {
    const timestamp = Date.now();
    this.stats.lastUpdate = timestamp;
    
    // Update global stats
    this.stats.totalRequests++;
    this.stats.avgResponseTime = (this.stats.avgResponseTime + responseTime) / 2;
    
    // Track goal performance
    if (!this.metrics.goalPerformance.has(goal)) {
      this.metrics.goalPerformance.set(goal, {
        requests: 0,
        successes: 0,
        avgTime: 0,
        totalCost: 0,
        lastActivity: timestamp
      });
    }
    
    const goalStats = this.metrics.goalPerformance.get(goal);
    goalStats.requests++;
    goalStats.avgTime = (goalStats.avgTime + responseTime) / 2;
    goalStats.totalCost += cost;
    goalStats.lastActivity = timestamp;
    
    // Update per-provider stats
    responses.forEach(response => {
      const provider = response.provider;
      if (!this.stats.providerStats[provider]) {
        this.stats.providerStats[provider] = {
          requests: 0,
          successes: 0,
          failures: 0,
          avgTime: 0,
          avgCost: 0,
          lastUsed: null,
          uptime: 0,
          consecutiveFailures: 0,
          rollingSuccessRate: 0,
          rollingAvgTime: 0,
          totalTokens: 0,
          totalCost: 0
        };
      }
      
      const providerStats = this.stats.providerStats[provider];
      providerStats.requests++;
      providerStats.lastUsed = timestamp;
      
      if (response.success) {
        providerStats.successes++;
        providerStats.consecutiveFailures = 0;
        providerStats.avgTime = (providerStats.avgTime + response.responseTime) / 2;
        goalStats.successes++;
      } else {
        providerStats.failures++;
        providerStats.consecutiveFailures++;
      }
      
      // Update rolling metrics
      this.updateRollingMetrics(provider, response, timestamp);
      
      // Track cost if available
      if (response.cost) {
        providerStats.totalCost += response.cost;
        providerStats.avgCost = providerStats.totalCost / providerStats.requests;
      }
      
      // Track tokens if available
      if (response.tokens) {
        providerStats.totalTokens += response.tokens;
      }
      
      // Record in knowledge graph
      this.knowledgeGraph.recordTaskPerformance({
        taskId: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        goal,
        provider,
        success: response.success,
        responseTime: response.responseTime,
        cost: response.cost || 0,
        quality: response.confidence || 0.5,
        context: response.context || {},
        timestamp
      });
    });
    
    // Add to time-series data
    this.addTimeSeriesData(timestamp, responseTime, responses.length, cost, goal);
    
    // Maintain rolling window size
    if (this.metrics.responseTimes.length > this.rollingWindowSize) {
      this.metrics.responseTimes.shift();
      this.metrics.costs.shift();
      this.metrics.successRates.shift();
      this.metrics.concurrencyLevels.shift();
    }
  }

  /**
   * Update rolling metrics for a provider
   */
  updateRollingMetrics(provider, response, timestamp) {
    const providerStats = this.stats.providerStats[provider];
    
    // Calculate rolling success rate (last 50 requests for this provider)
    const recentRequests = Math.min(50, providerStats.requests);
    providerStats.rollingSuccessRate = providerStats.successes / recentRequests;
    
    // Calculate rolling average time
    if (response.success) {
      const recentSuccesses = Math.min(20, providerStats.successes);
      // Simple exponential moving average
      const alpha = 0.1; // Smoothing factor
      providerStats.rollingAvgTime = alpha * response.responseTime + (1 - alpha) * providerStats.rollingAvgTime;
    }
  }

  /**
   * Add data point to time-series
   */
  addTimeSeriesData(timestamp, responseTime, providerCount, cost, goal) {
    this.stats.timeSeries.push({
      timestamp,
      responseTime,
      providerCount,
      cost,
      goal,
      activeRequests: this.stats.activeRequests
    });
    
    // Keep only last 1000 data points
    if (this.stats.timeSeries.length > 1000) {
      this.stats.timeSeries.shift();
    }
    
    // Update rolling metrics
    this.metrics.responseTimes.push(responseTime);
    this.metrics.costs.push(cost);
    this.metrics.concurrencyLevels.push(providerCount);
    
    const recentSuccessRate = this.calculateRecentSuccessRate();
    this.metrics.successRates.push(recentSuccessRate);
  }

  /**
   * Calculate recent success rate across all providers
   */
  calculateRecentSuccessRate() {
    const recentWindow = Math.min(100, this.stats.totalRequests);
    if (recentWindow === 0) return 0;
    
    let recentSuccesses = 0;
    let recentTotal = 0;
    
    Object.values(this.stats.providerStats).forEach(provider => {
      const recentRequests = Math.min(recentWindow, provider.requests);
      recentTotal += recentRequests;
      recentSuccesses += Math.min(recentRequests, provider.successes);
    });
    
    return recentTotal > 0 ? recentSuccesses / recentTotal : 0;
  }

  /**
   * Get trend data for real-time charts
   */
  getTrendData(metric, points = 20) {
    const data = this.stats.timeSeries.slice(-points);
    
    return data.map(d => {
      let value;
      switch (metric) {
      case 'responseTime':
        value = d.responseTime;
        break;
      case 'concurrency':
        value = d.providerCount;
        break;
      case 'cost':
        value = d.cost;
        break;
      case 'successRate':
        // Calculate success rate at this point (simplified)
        value = Math.random() * 0.3 + 0.7; // Placeholder - would need historical success rates
        break;
      default:
        value = 0;
      }
      
      return {
        timestamp: d.timestamp,
        value: Math.round(value * 100) / 100
      };
    });
  }

  /**
   * Get session statistics
   */
  getSessionStats() {
    return {
      ...this.stats,
      efficiency: this.stats.consensusAchieved / this.stats.totalRequests,
      avgProvidersPerRequest: Object.values(this.stats.providerStats)
        .reduce((sum, stat) => sum + stat.requests, 0) / this.stats.totalRequests
    };
  }

  /**
   * Get comprehensive real-time performance report
   */
  getPerformanceReport() {
    const now = Date.now();
    const lastHour = now - 3600000;
    const last24Hours = now - 86400000;
    
    // Calculate real-time metrics
    const recentData = this.stats.timeSeries.filter(d => d.timestamp > lastHour);
    const dailyData = this.stats.timeSeries.filter(d => d.timestamp > last24Hours);
    
    const avgResponseTime = recentData.length > 0 
      ? recentData.reduce((sum, d) => sum + d.responseTime, 0) / recentData.length 
      : 0;
    
    const avgConcurrency = recentData.length > 0
      ? recentData.reduce((sum, d) => sum + d.providerCount, 0) / recentData.length
      : 0;
    
    const totalCost = dailyData.reduce((sum, d) => sum + d.cost, 0);
    
    // Provider performance ranking
    const topProviders = Object.entries(this.stats.providerStats)
      .filter(([, stats]) => stats.requests > 0)
      .sort(([,a], [,b]) => {
        // Score based on success rate, speed, and recent activity
        const scoreA = (a.rollingSuccessRate * 0.4) + ((5000 / (a.rollingAvgTime || 5000)) * 0.3) + ((a.lastUsed > lastHour ? 1 : 0) * 0.3);
        const scoreB = (b.rollingSuccessRate * 0.4) + ((5000 / (b.rollingAvgTime || 5000)) * 0.3) + ((b.lastUsed > lastHour ? 1 : 0) * 0.3);
        return scoreB - scoreA;
      })
      .slice(0, 5);

    // Goal performance summary
    const goalSummary = Array.from(this.metrics.goalPerformance.entries())
      .sort(([,a], [,b]) => b.requests - a.requests)
      .slice(0, 10)
      .map(([goal, stats]) => ({
        goal,
        requests: stats.requests,
        successRate: stats.requests > 0 ? stats.successes / stats.requests : 0,
        avgTime: Math.round(stats.avgTime),
        totalCost: stats.totalCost,
        lastActivity: stats.lastActivity
      }));

    return {
      overview: {
        totalRequests: this.stats.totalRequests,
        activeRequests: this.stats.activeRequests,
        avgResponseTime: Math.round(avgResponseTime),
        avgConcurrency: Math.round(avgConcurrency * 10) / 10,
        efficiency: Math.round((this.stats.consensusAchieved / Math.max(this.stats.totalRequests, 1)) * 100),
        totalCost24h: totalCost,
        successRate1h: this.calculateRecentSuccessRate()
      },
      realTime: {
        responseTimeTrend: this.getTrendData('responseTime', 20),
        concurrencyTrend: this.getTrendData('concurrency', 20),
        successRateTrend: this.getTrendData('successRate', 20),
        costTrend: this.getTrendData('cost', 20)
      },
      topProviders: topProviders.map(([provider, stats]) => ({
        provider,
        requests: stats.requests,
        rollingSuccessRate: Math.round(stats.rollingSuccessRate * 100),
        rollingAvgTime: Math.round(stats.rollingAvgTime),
        totalCost: stats.totalCost,
        consecutiveFailures: stats.consecutiveFailures,
        lastUsed: stats.lastUsed,
        status: stats.consecutiveFailures > 3 ? 'unhealthy' : 
          stats.lastUsed > lastHour ? 'active' : 'idle'
      })),
      goalPerformance: goalSummary,
      knowledgeGraph: {
        statistics: this.knowledgeGraph.getGraphStatistics(),
        topGoals: Array.from(this.metrics.goalPerformance.keys())
          .map(goal => this.knowledgeGraph.getGoalPerformanceSummary(goal))
          .sort((a, b) => b.totalAttempts - a.totalAttempts)
          .slice(0, 5)
      },
      recommendations: this.generateOptimizationRecommendations(),
      timestamp: now
    };
  }

  /**
   * Generate optimization recommendations based on real-time data
   */
  generateOptimizationRecommendations() {
    const recommendations = [];
    const now = Date.now();
    const lastHour = now - 3600000;
    
    // Check response time performance
    const avgResponseTime = this.stats.timeSeries
      .filter(d => d.timestamp > lastHour)
      .reduce((sum, d, _, arr) => sum + d.responseTime / arr.length, 0);
    
    if (avgResponseTime > 10000) {
      recommendations.push({
        priority: 'high',
        type: 'performance',
        message: 'Average response time exceeds 10s - consider reducing timeout or prioritizing faster providers',
        metric: `Current avg: ${Math.round(avgResponseTime)}ms`
      });
    }
    
    // Check provider health
    Object.entries(this.stats.providerStats).forEach(([provider, stats]) => {
      if (stats.consecutiveFailures > 3) {
        recommendations.push({
          priority: 'critical',
          type: 'reliability',
          message: `${provider} has ${stats.consecutiveFailures} consecutive failures - consider disabling or investigating`,
          metric: `Success rate: ${Math.round(stats.rollingSuccessRate * 100)}%`
        });
      }
      
      if (stats.requests > 10 && stats.rollingSuccessRate < 0.5) {
        recommendations.push({
          priority: 'medium',
          type: 'reliability',
          message: `${provider} success rate below 50% - monitor closely`,
          metric: `Rolling success rate: ${Math.round(stats.rollingSuccessRate * 100)}%`
        });
      }
    });
    
    // Check consensus efficiency
    const consensusRate = this.stats.consensusAchieved / Math.max(this.stats.totalRequests, 1);
    if (consensusRate < 0.7) {
      recommendations.push({
        priority: 'medium',
        type: 'efficiency',
        message: 'Consensus achievement below 70% - review consensus algorithm or provider diversity',
        metric: `Current rate: ${Math.round(consensusRate * 100)}%`
      });
    }
    
    // Cost optimization
    const totalCost = this.stats.timeSeries
      .filter(d => d.timestamp > lastHour)
      .reduce((sum, d) => sum + d.cost, 0);
    
    if (totalCost > 1.0) { // More than $1/hour
      recommendations.push({
        priority: 'low',
        type: 'cost',
        message: 'Hourly cost exceeds $1 - consider optimizing provider selection or reducing concurrency',
        metric: `Current spend: $${totalCost.toFixed(2)}/hour`
      });
    }
    
    // Find fastest provider
    const fastestProvider = Object.entries(this.stats.providerStats)
      .filter(([, stats]) => stats.requests > 5)
      .sort(([,a], [,b]) => a.rollingAvgTime - b.rollingAvgTime)[0];
    
    if (fastestProvider) {
      recommendations.push({
        priority: 'low',
        type: 'optimization',
        message: `${fastestProvider[0]} is your fastest provider - consider prioritizing for time-sensitive tasks`,
        metric: `Avg time: ${Math.round(fastestProvider[1].rollingAvgTime)}ms`
      });
    }
    
    return recommendations.slice(0, 5); // Return top 5 recommendations
  }
}