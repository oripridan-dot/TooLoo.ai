// @version 2.1.28
/**
 * Confidence Scoring & Retry Logic
 * 
 * Implements multi-dimensional scoring rubric:
 * - Deterministic checks (lint, tests, schema): 30%
 * - Source grounding / citations: 20%
 * - Critic agreement (peer validators): 15%
 * - Semantic quality (fluency, relevance): 15%
 * - Model reliability history: 10%
 * - Cost penalty: -10%
 * 
 * Auto-retry logic: if confidence < threshold, escalate or retry with different model mix.
 */

import { v4 as uuidv4 } from 'uuid';

export class ConfidenceScorer {
  constructor(options = {}) {
    this.config = {
      minAcceptanceConfidence: options.minAcceptanceConfidence || 0.82,
      maxRetriesPerNode: options.maxRetriesPerNode || 2,
      ensembleMergeThreshold: options.ensembleMergeThreshold || 0.65,
      ensembleDiffThreshold: options.ensembleDiffThreshold || 0.12,
      ...options
    };
    
    this.retryHistories = new Map(); // nodeId -> [attempts]
    this.scoringHistory = [];
  }
  
  /**
   * Comprehensive scoring formula
   */
  score(artifact, evidence = {}) {
    const weights = {
      deterministic: 0.30,
      grounding: 0.20,
      critic: 0.15,
      semantic: 0.15,
      reliability: 0.10,
      cost: -0.10
    };
    
    let total = 0;
    
    // Deterministic checks (lint, tests, schema validation)
    const deterministicScore = this.scoreDeterministic(evidence.deterministicChecks || {});
    total += deterministicScore * weights.deterministic;
    
    // Source grounding (citations, fact checks)
    const groundingScore = this.scoreGrounding(evidence.sources || [], evidence.claims || []);
    total += groundingScore * weights.grounding;
    
    // Critic agreement (cross-model validation)
    const criticScore = this.scoreCritic(evidence.criticAgreement || {});
    total += criticScore * weights.critic;
    
    // Semantic quality (fluency, instruction adherence, length appropriateness)
    const semanticScore = this.scoreSemantic(artifact.content || '', evidence.semanticMetrics || {});
    total += semanticScore * weights.semantic;
    
    // Model reliability (historical success rate)
    const reliabilityScore = this.scoreReliability(evidence.modelProvider || '', evidence.historicalSuccess || 0);
    total += reliabilityScore * weights.reliability;
    
    // Cost penalty (prefer cheaper solutions)
    const costScore = 1 - Math.min(1, (evidence.costUsd || 0) / 0.10); // normalize to $0.10
    total += costScore * weights.cost;
    
    const finalScore = Math.min(1, Math.max(0, total));
    
    return {
      overall: finalScore,
      components: {
        deterministic: deterministicScore,
        grounding: groundingScore,
        critic: criticScore,
        semantic: semanticScore,
        reliability: reliabilityScore,
        cost: costScore
      },
      breakdown: {
        weights,
        evidence
      }
    };
  }
  
  /**
   * Score deterministic checks: pass/fail ratio
   */
  scoreDeterministic(checks = {}) {
    if (!checks || Object.keys(checks).length === 0) return 0.5; // neutral if no data
    
    const results = Object.values(checks);
    const passCount = results.filter(r => r === true || r === 'pass' || r.passed === true).length;
    const totalCount = results.length;
    
    return totalCount > 0 ? passCount / totalCount : 0.5;
  }
  
  /**
   * Score source grounding: % of claims with citations
   */
  scoreGrounding(sources = [], claims = []) {
    if (claims.length === 0) return 0.8; // neutral, assume low-fact-density content
    
    let groundedCount = 0;
    claims.forEach(claim => {
      const hasSource = sources.some(s => 
        s.text && claim.toLowerCase().includes(s.text.toLowerCase())
      );
      if (hasSource) groundedCount++;
    });
    
    return groundedCount / claims.length;
  }
  
  /**
   * Score critic agreement: cross-model consistency
   */
  scoreCritic(agreement = {}) {
    if (!agreement || Object.keys(agreement).length === 0) return 0.5;
    
    const scores = Object.values(agreement).filter(v => typeof v === 'number');
    if (scores.length === 0) return 0.5;
    
    // High agreement = high score
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    
    // Penalize high variance (disagreement)
    const consistency = 1 - Math.min(1, stdDev / 0.2);
    return (mean * 0.7) + (consistency * 0.3);
  }
  
  /**
   * Score semantic quality
   */
  scoreSemantic(content = '', metrics = {}) {
    let score = 0.5; // neutral baseline
    
    const contentLength = content.length;
    
    // Length appropriateness (prefer 200-2000 chars for most tasks)
    if (contentLength > 100 && contentLength < 5000) {
      score += 0.2;
    }
    
    // Structure indicators (headings, sections, lists)
    const hasStructure = /(\*\*|#{1,3}|^[-•])/m.test(content);
    if (hasStructure) score += 0.1;
    
    // Clarity indicators (no excessive jargon)
    const jargonDensity = (content.match(/[^a-zA-Z0-9\s]/g) || []).length / contentLength;
    if (jargonDensity < 0.15) score += 0.1;
    
    // Custom metrics
    if (metrics.fluencyScore !== undefined) score += metrics.fluencyScore * 0.1;
    if (metrics.relevanceScore !== undefined) score += metrics.relevanceScore * 0.1;
    
    return Math.min(1, score);
  }
  
  /**
   * Score model reliability based on historical success
   */
  scoreReliability(provider = '', successRate = 0) {
    // Base reliability by provider (from empirical data)
    const baseReliability = {
      anthropic: 0.92,
      openai: 0.90,
      gemini: 0.85,
      deepseek: 0.88,
      ollama: 0.75,
      localai: 0.70,
      huggingface: 0.60
    };
    
    const base = baseReliability[provider] || 0.75;
    return (base * 0.7) + (Math.min(1, successRate) * 0.3);
  }
  
  /**
   * Decide: accept, retry, or escalate
   */
  async decideFate(nodeId, score, attempt = 1) {
    const decision = {
      nodeId,
      attempt,
      score: score.overall,
      decision: null,
      reason: null
    };
    
    if (score.overall >= this.config.minAcceptanceConfidence) {
      decision.decision = 'accept';
      decision.reason = `Confidence ${(score.overall * 100).toFixed(1)}% meets threshold ${(this.config.minAcceptanceConfidence * 100).toFixed(1)}%`;
    } else if (attempt < this.config.maxRetriesPerNode) {
      decision.decision = 'retry';
      decision.reason = `Low confidence (${(score.overall * 100).toFixed(1)}%); attempt ${attempt}/${this.config.maxRetriesPerNode}`;
    } else {
      decision.decision = 'escalate';
      decision.reason = `Max retries (${this.config.maxRetriesPerNode}) exhausted; confidence stuck at ${(score.overall * 100).toFixed(1)}%`;
    }
    
    return decision;
  }
  
  /**
   * Attempt ensemble merge of compatible candidates
   */
  attemptEnsemble(candidate1, candidate2, score1, score2) {
    const diff = Math.abs(score1.overall - score2.overall);
    const minScore = Math.min(score1.overall, score2.overall);
    
    if (
      minScore >= this.config.ensembleMergeThreshold &&
      diff <= this.config.ensembleDiffThreshold
    ) {
      return {
        canMerge: true,
        mergeStrategy: 'compatible',
        mergedConfidence: (score1.overall + score2.overall) / 2,
        note: `Merging ${candidate1.modelSource} + ${candidate2.modelSource} (diff: ${(diff * 100).toFixed(1)}%)`
      };
    }
    
    return { canMerge: false };
  }
  
  /**
   * Track retry history
   */
  recordAttempt(nodeId, provider, score, costUsd, success = true) {
    if (!this.retryHistories.has(nodeId)) {
      this.retryHistories.set(nodeId, []);
    }
    
    const history = this.retryHistories.get(nodeId);
    history.push({
      attempt: history.length + 1,
      provider,
      score: score.overall,
      costUsd,
      success,
      timestamp: new Date().toISOString()
    });
    
    this.scoringHistory.push({
      nodeId,
      ...history[history.length - 1]
    });
  }
  
  /**
   * Get retry stats
   */
  getRetryStats(nodeId) {
    const history = this.retryHistories.get(nodeId) || [];
    if (history.length === 0) return null;
    
    return {
      totalAttempts: history.length,
      attempts: history,
      avgScore: history.reduce((sum, a) => sum + a.score, 0) / history.length,
      totalCost: history.reduce((sum, a) => sum + a.costUsd, 0),
      successRate: history.filter(a => a.success).length / history.length
    };
  }
}

export default ConfidenceScorer;
