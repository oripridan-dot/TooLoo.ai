/**
 * Market Intelligence Engine
 * 
 * Orchestrates multiple data sources (Product Hunt, Reddit, etc.) to provide
 * comprehensive market analysis for product ideas.
 */

import ProductHuntAPI from '../integrations/producthunt.js';
import RedditAPI from '../integrations/reddit.js';

export class MarketIntelligence {
  constructor({ productHuntKey, redditClientId, redditClientSecret }) {
    this.productHunt = productHuntKey ? new ProductHuntAPI(productHuntKey) : null;
    this.reddit = (redditClientId && redditClientSecret) ? new RedditAPI(redditClientId, redditClientSecret) : null;
  }

  /**
   * Comprehensive market analysis for an idea
   * @param {Object} idea - Idea object (see idea.schema.json)
   * @returns {Promise<Object>} Complete market intelligence report
   */
  async analyzeIdea(idea) {
    console.log(`🔍 Analyzing market for: ${idea.title}`);

    const analysis = {
      idea: {
        id: idea.id,
        title: idea.title
      },
      analyzedAt: new Date().toISOString(),
      competition: null,
      trends: null,
      opportunities: null,
      recommendation: null
    };

    try {
      // Run analyses in parallel
      const [competition, trends] = await Promise.all([
        this._analyzeCompetition(idea),
        this._analyzeTrends(idea)
      ]);

      analysis.competition = competition;
      analysis.trends = trends;
      analysis.opportunities = this._identifyOpportunities(competition, trends);
      analysis.recommendation = this._generateRecommendation(competition, trends);

      console.log(`✅ Market analysis complete`);
      return analysis;

    } catch (error) {
      console.error('Market analysis error:', error);
      return {
        ...analysis,
        error: error.message,
        recommendation: 'Unable to complete market analysis. Proceed with manual research.'
      };
    }
  }

  /**
   * Get quick market validation score (0-100)
   * @param {Object} idea - Idea object
   * @returns {Promise<number>} Validation score
   */
  async getValidationScore(idea) {
    try {
      const analysis = await this.analyzeIdea(idea);
      
      let score = 50; // Base score

      // Adjust based on competition
      if (analysis.competition) {
        if (analysis.competition.saturation === 'low') score += 20;
        else if (analysis.competition.saturation === 'high') score -= 20;
      }

      // Adjust based on trends
      if (analysis.trends && analysis.trends.relevantDiscussions > 10) score += 15;
      if (analysis.trends && analysis.trends.growthIndicators.length > 0) score += 15;

      return Math.max(0, Math.min(100, score));

    } catch (error) {
      console.error('Validation score error:', error);
      return 50; // Neutral score on error
    }
  }

  /**
   * Suggest profitable markets based on trends
   * @param {string} category - General category (e.g., 'SaaS', 'tools')
   * @returns {Promise<Array>} Market opportunities
   */
  async suggestMarkets(category) {
    const suggestions = [];

    try {
      // Get Product Hunt trends
      if (this.productHunt) {
        const trending = await this.productHunt.getTrendingProducts({ category, limit: 10 });
        const categories = await this.productHunt.getPopularCategories();
        
        suggestions.push({
          source: 'Product Hunt',
          trendingProducts: trending.slice(0, 5),
          hotCategories: categories.filter(c => c.trending).slice(0, 3)
        });
      }

      // Get Reddit insights
      if (this.reddit) {
        const problems = await this.reddit.searchProblems();
        const validated = await this.reddit.findValidatedIdeas();

        suggestions.push({
          source: 'Reddit',
          topProblems: problems.slice(0, 5),
          validatedIdeas: validated.slice(0, 3)
        });
      }

      return suggestions;

    } catch (error) {
      console.error('Market suggestion error:', error);
      return [];
    }
  }

  /**
   * Private: Analyze competition
   */
  async _analyzeCompetition(idea) {
    if (!this.productHunt) {
      return { error: 'Product Hunt API not configured' };
    }

    const analysis = await this.productHunt.analyzeOpportunity(idea);
    
    return {
      competitors: analysis.competitors,
      competitorCount: analysis.competitorCount,
      saturation: analysis.marketSaturation,
      topCompetitor: analysis.topCompetitor
    };
  }

  /**
   * Private: Analyze market trends
   */
  async _analyzeTrends(idea) {
    if (!this.reddit) {
      return { error: 'Reddit API not configured' };
    }

    // Extract keywords from idea
    const keywords = this._extractKeywords(idea);
    
    // Search for relevant discussions
    const discussions = await this.reddit.searchProblems({ keywords });
    const insights = this.reddit.analyzeDiscussions(discussions);

    return {
      relevantDiscussions: discussions.length,
      topDiscussions: discussions.slice(0, 5).map(d => ({
        title: d.title,
        engagement: d.score,
        url: d.url
      })),
      commonThemes: insights.commonThemes,
      growthIndicators: this._identifyGrowthIndicators(insights)
    };
  }

  /**
   * Private: Identify market opportunities
   */
  _identifyOpportunities(competition, trends) {
    const opportunities = [];

    // Low competition + high demand = great opportunity
    if (competition.saturation === 'low' && trends.relevantDiscussions > 10) {
      opportunities.push({
        type: 'untapped-market',
        description: 'Low competition with proven demand',
        confidence: 'high'
      });
    }

    // Weak competitors = opportunity to differentiate
    if (competition.competitors.length > 0 && competition.competitors.length < 5) {
      opportunities.push({
        type: 'weak-competition',
        description: 'Few competitors, room for differentiation',
        confidence: 'medium'
      });
    }

    // Growing trends = opportunity to ride the wave
    if (trends.growthIndicators && trends.growthIndicators.length > 0) {
      opportunities.push({
        type: 'growth-trend',
        description: 'Market showing growth signals',
        confidence: 'medium'
      });
    }

    return opportunities;
  }

  /**
   * Private: Generate overall recommendation
   */
  _generateRecommendation(competition, trends) {
    const score = this._calculateConfidenceScore(competition, trends);

    if (score >= 80) {
      return {
        verdict: 'Strong Opportunity',
        confidence: score,
        reasoning: 'Low competition, proven demand, and positive market trends',
        nextSteps: [
          'Build minimal prototype',
          'Validate with 10 target users',
          'Set up landing page for early access'
        ]
      };
    } else if (score >= 60) {
      return {
        verdict: 'Moderate Opportunity',
        confidence: score,
        reasoning: 'Some competition exists, but market validation is positive',
        nextSteps: [
          'Research competitor weaknesses',
          'Define unique value proposition',
          'Survey target audience'
        ]
      };
    } else if (score >= 40) {
      return {
        verdict: 'Proceed with Caution',
        confidence: score,
        reasoning: 'Competitive market or unclear demand',
        nextSteps: [
          'Deep dive into competitor analysis',
          'Find underserved niche',
          'Validate demand before building'
        ]
      };
    } else {
      return {
        verdict: 'High Risk',
        confidence: score,
        reasoning: 'Saturated market or insufficient demand signals',
        nextSteps: [
          'Consider pivoting the idea',
          'Find a specific niche angle',
          'Conduct extensive market research'
        ]
      };
    }
  }

  /**
   * Private: Calculate confidence score
   */
  _calculateConfidenceScore(competition, trends) {
    let score = 50;

    // Competition scoring
    if (competition.saturation === 'low') score += 25;
    else if (competition.saturation === 'medium') score += 10;
    else if (competition.saturation === 'high') score -= 15;

    // Trends scoring
    if (trends.relevantDiscussions > 20) score += 20;
    else if (trends.relevantDiscussions > 10) score += 10;
    else if (trends.relevantDiscussions < 3) score -= 10;

    // Growth indicators
    if (trends.growthIndicators && trends.growthIndicators.length > 0) {
      score += trends.growthIndicators.length * 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Private: Identify growth indicators
   */
  _identifyGrowthIndicators(insights) {
    const indicators = [];

    if (insights.commonThemes) {
      // High mentions of automation = growing market
      const automation = insights.commonThemes.find(t => t.theme === 'automation');
      if (automation && automation.mentions > 5) {
        indicators.push('High demand for automation');
      }

      // Time-saving mentions = valuable problem
      const timeSaving = insights.commonThemes.find(t => t.theme === 'time-saving');
      if (timeSaving && timeSaving.mentions > 10) {
        indicators.push('Strong need for time-saving solutions');
      }
    }

    return indicators;
  }

  /**
   * Private: Extract keywords from idea
   */
  _extractKeywords(idea) {
    const text = `${idea.title} ${idea.problem?.description || ''} ${idea.solution?.description || ''}`;
    return text.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 4 && !this._isStopWord(word))
      .slice(0, 5);
  }

  /**
   * Private: Check if word is a stop word
   */
  _isStopWord(word) {
    const stopWords = ['that', 'this', 'with', 'from', 'have', 'will', 'would', 'could', 'should'];
    return stopWords.includes(word);
  }
}

export default MarketIntelligence;
