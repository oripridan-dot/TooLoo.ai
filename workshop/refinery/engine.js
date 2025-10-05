/**
 * Prompt Refinery Engine - AI-Powered Idea Improvement
 * 
 * Analyzes rough ideas and generates specific, actionable improvements
 * across 4 dimensions: Problem, Solution, Market, Revenue
 */

export class PromptRefineryEngine {
  constructor({ aiProvider, apiKey }) {
    this.aiProvider = aiProvider; // 'deepseek', 'claude', 'openai'
    this.apiKey = apiKey;
  }

  /**
   * Analyze idea and generate refinement suggestions
   * @param {Object} idea - Raw idea input
   * @returns {Promise<Object>} Refinement suggestions with scoring
   */
  async refineIdea(idea) {
    const prompt = this._buildRefinementPrompt(idea);
    
    try {
      const aiResponse = await this._callAI(prompt);
      const suggestions = this._parseAISuggestions(aiResponse);
      
      return {
        success: true,
        original: idea,
        suggestions,
        improvements: this._calculateImprovements(idea, suggestions),
        alternativeMarkets: await this._generateAlternativeMarkets(idea)
      };
    } catch (error) {
      console.error('Refinement failed:', error);
      return this._getFallbackSuggestions(idea);
    }
  }

  /**
   * Build comprehensive refinement prompt for AI
   */
  _buildRefinementPrompt(idea) {
    return `You are a product validation expert helping entrepreneurs refine their ideas into profitable products.

**Current Idea:**
Title: ${idea.title}
Problem: ${idea.problem}
Solution: ${idea.solution}
Target: ${idea.target || 'Not specified'}

**Task:** Analyze this idea and provide SPECIFIC, ACTIONABLE improvements in 4 areas:

1. **PROBLEM CLARITY** - Make the pain point more specific and measurable
   - Add concrete numbers (time wasted, money lost, frequency)
   - Identify the exact moment of frustration
   - Specify WHO experiences this most acutely

2. **SOLUTION SPECIFICITY** - Add unique differentiators and features
   - What makes this different from existing solutions?
   - What's the core innovation or unique approach?
   - What's the "aha moment" for users?

3. **MARKET TARGETING** - Narrow to high-value, reachable segments
   - Be ultra-specific (not "families" but "urban families with 2+ kids in top 20 metros")
   - Include demographics, psychographics, and behaviors
   - Identify early adopters vs mass market

4. **REVENUE MODEL** - Suggest profitable monetization strategies
   - Pricing model (subscription, usage-based, marketplace commission)
   - Price point range with justification
   - Upsell/premium tier opportunities

**Output Format (JSON):**
{
  "problemRefinement": {
    "improved": "Ultra-specific problem statement with numbers",
    "reasoning": "Why this is better",
    "impactScore": 0-10
  },
  "solutionRefinement": {
    "improved": "Specific solution with unique differentiators",
    "reasoning": "What makes this compelling",
    "impactScore": 0-10
  },
  "marketRefinement": {
    "improved": "Laser-focused target market description",
    "reasoning": "Why this segment is valuable",
    "impactScore": 0-10
  },
  "revenueModel": {
    "model": "Specific pricing strategy",
    "pricePoint": "$X-$Y per [unit]",
    "reasoning": "Why this will work",
    "impactScore": 0-10
  },
  "overallImprovement": {
    "currentScore": 0-100,
    "projectedScore": 0-100,
    "keyInsight": "One sentence on biggest opportunity"
  }
}`;
  }

  /**
   * Call AI provider API
   */
  async _callAI(prompt) {
    if (this.aiProvider === 'deepseek') {
      return await this._callDeepSeek(prompt);
    } else if (this.aiProvider === 'claude') {
      return await this._callClaude(prompt);
    } else {
      return await this._callOpenAI(prompt);
    }
  }

  /**
   * DeepSeek API call (cost-effective for code/analysis)
   */
  async _callDeepSeek(prompt) {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'You are a product validation expert. Always respond with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    const data = await response.json();
    return data.choices[0].message.content;
  }

  /**
   * Claude API call (best for reasoning)
   */
  async _callClaude(prompt) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        messages: [
          { role: 'user', content: prompt }
        ]
      })
    });

    const data = await response.json();
    return data.content[0].text;
  }

  /**
   * OpenAI API call (fallback)
   */
  async _callOpenAI(prompt) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are a product validation expert. Always respond with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    const data = await response.json();
    return data.choices[0].message.content;
  }

  /**
   * Parse AI response into structured suggestions
   */
  _parseAISuggestions(aiResponse) {
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in response');
      
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      throw error;
    }
  }

  /**
   * Calculate improvement metrics
   */
  _calculateImprovements(original, suggestions) {
    const avgImpact = (
      suggestions.problemRefinement.impactScore +
      suggestions.solutionRefinement.impactScore +
      suggestions.marketRefinement.impactScore +
      suggestions.revenueModel.impactScore
    ) / 4;

    return {
      averageImpact: Math.round(avgImpact * 10) / 10,
      scoreDelta: suggestions.overallImprovement.projectedScore - suggestions.overallImprovement.currentScore,
      topPriority: this._identifyTopPriority(suggestions)
    };
  }

  /**
   * Identify which refinement has highest impact
   */
  _identifyTopPriority(suggestions) {
    const scores = [
      { area: 'problem', score: suggestions.problemRefinement.impactScore },
      { area: 'solution', score: suggestions.solutionRefinement.impactScore },
      { area: 'market', score: suggestions.marketRefinement.impactScore },
      { area: 'revenue', score: suggestions.revenueModel.impactScore }
    ];

    return scores.sort((a, b) => b.score - a.score)[0].area;
  }

  /**
   * Generate alternative profitable markets for the same solution
   */
  async _generateAlternativeMarkets(idea) {
    const prompt = `Given this product idea: "${idea.solution}"

Identify 3-5 ALTERNATIVE high-value markets that could benefit from the same core solution.

For each market, provide:
- Market name and size estimate
- Why this solution fits
- Estimated willingness to pay
- Key modification needed

Format as JSON array.`;

    try {
      const response = await this._callAI(prompt);
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Fallback suggestions when AI fails
   */
  _getFallbackSuggestions(idea) {
    return {
      success: false,
      error: 'AI refinement unavailable',
      suggestions: {
        problemRefinement: {
          improved: idea.problem + ' (Be more specific: add numbers, frequency, cost impact)',
          reasoning: 'Quantify the problem for stronger validation',
          impactScore: 7
        },
        solutionRefinement: {
          improved: idea.solution + ' (Add unique differentiator or key innovation)',
          reasoning: 'Highlight what makes this different from alternatives',
          impactScore: 8
        },
        marketRefinement: {
          improved: idea.target + ' (Narrow to specific demographics, location, income)',
          reasoning: 'Focused targeting enables better marketing',
          impactScore: 7
        },
        revenueModel: {
          model: 'Consider: Subscription, Usage-based, or Marketplace commission',
          pricePoint: 'Research competitor pricing',
          reasoning: 'Clear monetization drives investor confidence',
          impactScore: 6
        },
        overallImprovement: {
          currentScore: 50,
          projectedScore: 75,
          keyInsight: 'Specificity and differentiation are key to validation'
        }
      }
    };
  }
}
