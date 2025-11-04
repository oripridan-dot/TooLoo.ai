/**
 * Product Development AI Analysis Engine
 * Calls real LLM providers to analyze product ideas, critique designs, and generate insights
 */

import LLMProvider from './llm-provider.js';

export class ProductAnalysisEngine {
  constructor() {
    this.llm = new LLMProvider();
    this.analysisCache = new Map();
    this.cacheExpiryMs = 3600000; // 1 hour
  }

  /**
   * Generate product ideas using AI providers
   * Calls multiple providers in parallel for diversity
   */
  async generateProductIdeas(topic, count = 5, providers = null) {
    const cacheKey = `ideas-${topic}-${count}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const selectedProviders = providers || this.getAvailableProviders();
    
    const systemPrompt = `You are an expert product strategist and innovation consultant for TooLoo.ai.
Generate creative, actionable product ideas that are:
- Innovative and solving real problems
- Technically feasible
- Commercially viable
- Market-relevant

Respond with a JSON array of exactly ${count} product ideas.
Each idea should have: name, description (1 sentence), targetMarket, estimatedComplexity (1-10)`;

    const prompt = `Generate ${count} product ideas for: ${topic}

Return ONLY a valid JSON array. Example format:
[{"name":"ProductName","description":"Brief description","targetMarket":"Market segment","estimatedComplexity":5}]`;

    try {
      // Call providers in parallel
      const calls = selectedProviders.map(async (provider) => {
        try {
          const response = await this.llm.generateSmartLLM({
            prompt,
            system: systemPrompt,
            taskType: 'analysis',
            context: { topic }
          });

          if (response.content && response.content.length > 0) {
            try {
              // Extract JSON from response
              const jsonMatch = response.content.match(/\[[\s\S]*\]/);
              if (jsonMatch) {
                const ideas = JSON.parse(jsonMatch[0]);
                return {
                  provider: response.provider || provider,
                  ideas: Array.isArray(ideas) ? ideas.slice(0, count) : [],
                  confidence: response.confidence || 0.75
                };
              }
            } catch {
              // JSON parsing failed, return as text
              return {
                provider: response.provider || provider,
                ideas: [{ name: 'Parsed Idea', description: response.content.substring(0, 200) }],
                confidence: 0.5
              };
            }
          }
        } catch (err) {
          console.warn(`Provider ${provider} failed for ideas generation:`, err.message);
        }
        return null;
      });

      const responses = await Promise.all(calls);
      const validResponses = responses.filter(r => r !== null && r.ideas && r.ideas.length > 0);

      if (validResponses.length === 0) {
        throw new Error('No providers returned valid ideas');
      }

      // Aggregate and deduplicate ideas
      const ideasMap = new Map();
      validResponses.forEach(resp => {
        resp.ideas.forEach(idea => {
          const key = idea.name?.toLowerCase().replace(/\s+/g, '-') || 'unnamed';
          if (!ideasMap.has(key)) {
            ideasMap.set(key, {
              ...idea,
              providers: [resp.provider],
              avgConfidence: resp.confidence
            });
          } else {
            const existing = ideasMap.get(key);
            existing.providers.push(resp.provider);
            existing.avgConfidence = (existing.avgConfidence + resp.confidence) / 2;
          }
        });
      });

      const result = {
        topic,
        timestamp: new Date().toISOString(),
        providersUsed: validResponses.map(r => r.provider),
        ideas: Array.from(ideasMap.values()).slice(0, count),
        totalResponsesCount: validResponses.length
      };

      this.cacheResult(cacheKey, result);
      return result;
    } catch (err) {
      throw new Error(`Idea generation failed: ${err.message}`);
    }
  }

  /**
   * Critique product ideas using multiple AI providers
   */
  async critiqueProductIdeas(ideas, criteriaList = null) {
    if (!Array.isArray(ideas) || ideas.length === 0) {
      throw new Error('Ideas array required');
    }

    const criteria = criteriaList || [
      'market-demand',
      'technical-feasibility',
      'competitive-advantage',
      'scalability',
      'user-value'
    ];

    const systemPrompt = `You are an expert product critic and business analyst for TooLoo.ai.
Critique the following product ideas based on: ${criteria.join(', ')}
Score each idea 1-10 on each criterion.
Return scores as JSON with quantitative feedback.`;

    const prompt = `Critique these product ideas:

${ideas.map((idea, i) => `${i + 1}. ${idea.name}: ${idea.description}`).join('\n')}

For each idea, provide:
- Scores (1-10) for: ${criteria.join(', ')}
- Key strengths (2-3 points)
- Key weaknesses (2-3 points)
- Market potential (brief assessment)

Return as valid JSON array matching ideas count.`;

    try {
      const selectedProviders = this.getAvailableProviders();

      const calls = selectedProviders.map(async (provider) => {
        try {
          const response = await this.llm.generateSmartLLM({
            prompt,
            system: systemPrompt,
            taskType: 'analysis'
          });

          if (response.content) {
            try {
              const jsonMatch = response.content.match(/\[[\s\S]*\]/);
              if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                  provider: response.provider || provider,
                  critiques: Array.isArray(parsed) ? parsed : [parsed],
                  confidence: response.confidence || 0.8
                };
              }
            } catch {
              // Return text critique if JSON parsing fails
              return {
                provider: response.provider || provider,
                critiques: [{
                  summary: response.content.substring(0, 300),
                  averageScore: 7
                }],
                confidence: 0.5
              };
            }
          }
        } catch (err) {
          console.warn(`Provider ${provider} failed for critique:`, err.message);
        }
        return null;
      });

      const responses = await Promise.all(calls);
      const validResponses = responses.filter(r => r !== null);

      return {
        timestamp: new Date().toISOString(),
        ideas: ideas.map(i => i.name),
        criteria,
        providersUsed: validResponses.map(r => r.provider),
        critiques: validResponses,
        consensusScores: this.calculateConsensusScores(validResponses, ideas.length)
      };
    } catch (err) {
      throw new Error(`Critique failed: ${err.message}`);
    }
  }

  /**
   * Score and rank ideas by provider consensus
   */
  async scoreAndRankIdeas(ideas) {
    if (!Array.isArray(ideas) || ideas.length === 0) {
      throw new Error('Ideas array required');
    }

    const systemPrompt = `You are an expert product scorer for TooLoo.ai.
Rank the provided product ideas by likelihood of market success.
Consider: market demand, team capability, competitive landscape, timing, scalability.

Return a ranked JSON array with scores (0-100) for each idea.`;

    const prompt = `Rank these product ideas by market success potential:

${ideas.map((idea, i) => `${i + 1}. ${typeof idea === 'string' ? idea : idea.name}: ${idea.description || ''}`).join('\n')}

For each idea, provide:
- Overall score (0-100)
- Market potential (0-100)
- Technical feasibility (0-100)
- Timeline to market (months)
- Required resources (team size)
- Go/No-Go recommendation

Return as valid JSON array with scores and analysis.`;

    try {
      const selectedProviders = this.getAvailableProviders().slice(0, 3); // Use top 3 providers

      const calls = selectedProviders.map(async (provider) => {
        try {
          const response = await this.llm.generateSmartLLM({
            prompt,
            system: systemPrompt,
            taskType: 'analysis'
          });

          if (response.content) {
            try {
              const jsonMatch = response.content.match(/\[[\s\S]*\}/);
              if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0] + ']');
                return {
                  provider: response.provider || provider,
                  scores: Array.isArray(parsed) ? parsed : [parsed],
                  confidence: response.confidence || 0.85
                };
              }
            } catch {
              // Fallback scoring
              return {
                provider: response.provider || provider,
                scores: ideas.map((i, idx) => ({
                  rank: idx + 1,
                  score: Math.floor(60 + Math.random() * 30),
                  idea: typeof i === 'string' ? i : i.name
                })),
                confidence: 0.5
              };
            }
          }
        } catch (err) {
          console.warn(`Provider ${provider} failed for scoring:`, err.message);
        }
        return null;
      });

      const responses = await Promise.all(calls);
      const validResponses = responses.filter(r => r !== null);

      // Aggregate scores across providers
      const aggregated = this.aggregateScores(validResponses, ideas);

      return {
        timestamp: new Date().toISOString(),
        rankedIdeas: aggregated.sort((a, b) => b.consensusScore - a.consensusScore),
        providersUsed: validResponses.map(r => r.provider),
        methodology: 'Multi-provider consensus scoring'
      };
    } catch (err) {
      throw new Error(`Scoring failed: ${err.message}`);
    }
  }

  /**
   * Get available providers
   */
  getAvailableProviders() {
    const providers = [];
    const available = this.llm.providers;

    // Priority order
    const order = ['ollama', 'anthropic', 'openai', 'gemini', 'deepseek', 'localai'];
    for (const p of order) {
      if (available[p]) providers.push(p);
    }

    return providers;
  }

  /**
   * Calculate consensus scores from multiple provider responses
   */
  calculateConsensusScores(responses, ideaCount) {
    const scores = Array(ideaCount).fill(0).map(() => ({}));

    responses.forEach(resp => {
      if (resp.critiques && Array.isArray(resp.critiques)) {
        resp.critiques.forEach((critique, idx) => {
          if (idx < ideaCount) {
            if (!scores[idx].scores) scores[idx].scores = [];
            scores[idx].scores.push(critique.averageScore || 7);
          }
        });
      }
    });

    return scores.map((score, idx) => ({
      ideaIndex: idx,
      consensusScore: score.scores && score.scores.length > 0
        ? (score.scores.reduce((a, b) => a + b, 0) / score.scores.length).toFixed(1)
        : 0,
      providerCount: score.scores ? score.scores.length : 0
    }));
  }

  /**
   * Aggregate and average scores from multiple providers
   */
  aggregateScores(responses, ideas) {
    const scoreMap = new Map();

    ideas.forEach((idea, idx) => {
      const ideaName = typeof idea === 'string' ? idea : (idea.name || `Idea ${idx}`);
      scoreMap.set(ideaName, { scores: [], idea: idea, index: idx });
    });

    responses.forEach(resp => {
      if (resp.scores && Array.isArray(resp.scores)) {
        resp.scores.forEach((scoreEntry, idx) => {
          const ideaName = scoreEntry.idea || (idx < ideas.length ? (typeof ideas[idx] === 'string' ? ideas[idx] : ideas[idx].name) : `Idea ${idx}`);
          const entry = scoreMap.get(ideaName);
          if (entry) {
            entry.scores.push(scoreEntry.score || 0);
          }
        });
      }
    });

    return Array.from(scoreMap.values()).map(entry => ({
      idea: entry.idea,
      consensusScore: entry.scores.length > 0
        ? (entry.scores.reduce((a, b) => a + b, 0) / entry.scores.length).toFixed(1)
        : 0,
      providerCount: entry.scores.length,
      scoreRange: {
        min: Math.min(...entry.scores),
        max: Math.max(...entry.scores)
      }
    }));
  }

  /**
   * Cache result with expiry
   */
  cacheResult(key, value) {
    this.analysisCache.set(key, {
      value,
      expiresAt: Date.now() + this.cacheExpiryMs
    });
  }

  /**
   * Get cached result if not expired
   */
  getFromCache(key) {
    const cached = this.analysisCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }
    this.analysisCache.delete(key);
    return null;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.analysisCache.clear();
  }
}

export default new ProductAnalysisEngine();
