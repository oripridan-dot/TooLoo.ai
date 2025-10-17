/**
 * Parallel Provider Orchestrator - HYPER-SPEED MASTERY MODE
 * Uses ALL available AI providers simultaneously to accelerate training completion
 * Multiple providers work in parallel to generate, validate, and consensus-build responses
 */

import { generateSmartLLM, getProviderStatus } from './llm-provider.js';

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
    
    this.stats = {
      totalRequests: 0,
      parallelRequests: 0,
      consensusAchieved: 0,
      avgResponseTime: 0,
      providerStats: {}
    };
  }

  /**
   * HYPER-PARALLEL: Use ALL providers simultaneously for training question
   */
  async hyperParallelGenerate(prompt, options = {}) {
    const startTime = Date.now();
    this.stats.totalRequests++;
    this.stats.parallelRequests++;

    try {
      const availableProviders = await this.getAvailableProviders();
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
      this.updateStats(totalTime, responses);

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
          responseTime: Date.now() - (options.startTime || Date.now())
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
   * Get available providers
   */
  async getAvailableProviders() {
    const status = getProviderStatus();
    return Object.keys(status)
      .filter(provider => status[provider].available && status[provider].enabled)
      .slice(0, this.maxConcurrency); // Respect concurrency limits
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
   * Update performance statistics
   */
  updateStats(responseTime, responses) {
    this.stats.avgResponseTime = (this.stats.avgResponseTime + responseTime) / 2;
    
    responses.forEach(response => {
      if (!this.stats.providerStats[response.provider]) {
        this.stats.providerStats[response.provider] = {
          requests: 0,
          avgTime: 0,
          successes: 0
        };
      }
      
      const providerStats = this.stats.providerStats[response.provider];
      providerStats.requests++;
      providerStats.successes++;
      providerStats.avgTime = (providerStats.avgTime + response.responseTime) / 2;
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
   * Get performance report
   */
  getPerformanceReport() {
    const topProviders = Object.entries(this.stats.providerStats)
      .sort(([,a], [,b]) => b.successes - a.successes)
      .slice(0, 5);

    return {
      overview: {
        totalRequests: this.stats.totalRequests,
        parallelRequests: this.stats.parallelRequests,
        avgResponseTime: Math.round(this.stats.avgResponseTime),
        efficiency: Math.round((this.stats.consensusAchieved / this.stats.totalRequests) * 100)
      },
      topProviders: topProviders.map(([provider, stats]) => ({
        provider,
        requests: stats.requests,
        avgTime: Math.round(stats.avgTime),
        successRate: Math.round((stats.successes / stats.requests) * 100)
      })),
      recommendations: this.generateOptimizationRecommendations()
    };
  }

  /**
   * Generate optimization recommendations
   */
  generateOptimizationRecommendations() {
    const recommendations = [];
    
    if (this.stats.avgResponseTime > 5000) {
      recommendations.push('Consider reducing timeout or using faster providers');
    }
    
    if (this.stats.consensusAchieved / this.stats.totalRequests < 0.8) {
      recommendations.push('Improve consensus algorithm or provider diversity');
    }
    
    const fastestProvider = Object.entries(this.stats.providerStats)
      .sort(([,a], [,b]) => a.avgTime - b.avgTime)[0];
    
    if (fastestProvider) {
      recommendations.push(`${fastestProvider[0]} is your fastest provider - prioritize for quick tasks`);
    }
    
    return recommendations;
  }
}