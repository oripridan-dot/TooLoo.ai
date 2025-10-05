/**
 * TooLoo.ai - Honest Validation Engine
 * 
 * Provides REAL validation with critical analysis:
 * - Calls actual AI APIs (DeepSeek/Claude/OpenAI)
 * - Scores honestly (bad ideas get 10-30/100)
 * - Identifies fatal flaws and red flags
 * - Provides actionable criticism, not just praise
 */

export class ValidationEngine {
  constructor(config = {}) {
    this.deepseekKey = config.deepseekKey || process.env.DEEPSEEK_API_KEY;
    this.anthropicKey = config.anthropicKey || process.env.ANTHROPIC_API_KEY;
    this.openaiKey = config.openaiKey || process.env.OPENAI_API_KEY;
  }

  /**
   * Validate idea with HONEST, CRITICAL analysis
   * Returns scores 10-100 based on real merit
   */
  async validateIdea(idea) {
    console.log('🔍 Running REAL validation for:', idea.title);

    try {
      // Try real AI validation first
      const validation = await this._callAIForValidation(idea);
      
      if (validation) {
        return validation;
      }
    } catch (error) {
      console.warn('⚠️ AI validation failed, falling back to critical analysis:', error.message);
    }

    // Fallback to critical rule-based validation
    return this._criticalValidation(idea);
  }

  /**
   * Call AI for honest validation
   */
  async _callAIForValidation(idea) {
    const prompt = this._buildValidationPrompt(idea);

    // Try DeepSeek first (cheapest)
    if (this.deepseekKey) {
      try {
        return await this._callDeepSeek(prompt);
      } catch (error) {
        console.warn('DeepSeek failed:', error.message);
      }
    }

    // Try Claude (best quality)
    if (this.anthropicKey) {
      try {
        return await this._callClaude(prompt);
      } catch (error) {
        console.warn('Claude failed:', error.message);
      }
    }

    // Try OpenAI (fallback)
    if (this.openaiKey) {
      try {
        return await this._callOpenAI(prompt);
      } catch (error) {
        console.warn('OpenAI failed:', error.message);
      }
    }

    return null;
  }

  _buildValidationPrompt(idea) {
    return `You are a brutally honest startup advisor. Validate this product idea and be CRITICAL.

Idea:
- Title: ${idea.title}
- Problem: ${idea.problem}
- Solution: ${idea.solution}
- Target: ${idea.target}

Provide HONEST validation in JSON format:

{
  "viabilityScore": 10-100 (be HARSH - most ideas are 20-40),
  "marketScore": 10-100 (realistic market assessment),
  "competitionScore": 10-100 (lower = more competition),
  "uniquenessScore": 10-100 (is this truly unique?),
  "overallScore": 10-100 (weighted average),
  "redFlags": [
    "Critical problem 1",
    "Critical problem 2"
  ],
  "strengths": [
    "One thing that's actually good"
  ],
  "criticalFeedback": "Honest assessment - what's wrong with this idea?",
  "recommendations": [
    "Specific action to improve (not generic)",
    "Another specific action"
  ],
  "verdict": "PROCEED|PIVOT|STOP" 
}

Be HARSH. Most ideas have fatal flaws. Score accordingly.
- Generic ideas: 20-35/100
- Copycat ideas: 15-30/100  
- Vague ideas: 10-25/100
- Saturated markets: 15-35/100
- Actually unique + viable: 60-80/100
- Exceptional ideas: 80-95/100 (rare!)

Never give 100/100. There's always room for improvement.`;
  }

  async _callDeepSeek(prompt) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000); // 20s timeout

    try {
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.deepseekKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: 'You are a critical startup advisor who gives honest feedback.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3, // Lower temp for more consistent critical analysis
          max_tokens: 1500
        })
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      // Parse JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const validation = JSON.parse(jsonMatch[0]);
        validation.source = 'deepseek';
        return validation;
      }
      
      throw new Error('Failed to parse DeepSeek response');
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }

  async _callClaude(prompt) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.anthropicKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1500,
          temperature: 0.3,
          messages: [{
            role: 'user',
            content: prompt
          }]
        })
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.content[0].text;
      
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const validation = JSON.parse(jsonMatch[0]);
        validation.source = 'claude';
        return validation;
      }
      
      throw new Error('Failed to parse Claude response');
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }

  async _callOpenAI(prompt) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a critical startup advisor who gives honest feedback.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 1500
        })
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const validation = JSON.parse(jsonMatch[0]);
        validation.source = 'openai';
        return validation;
      }
      
      throw new Error('Failed to parse OpenAI response');
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }

  /**
   * Critical rule-based validation (fallback when AI unavailable)
   * Scores 10-70 based on red flags
   */
  _criticalValidation(idea) {
    const titleLower = (idea.title || '').toLowerCase();
    const problemLower = (idea.problem || '').toLowerCase();
    const solutionLower = (idea.solution || '').toLowerCase();
    const targetLower = (idea.target || '').toLowerCase();
    const combined = `${titleLower} ${problemLower} ${solutionLower} ${targetLower}`;

    let viabilityScore = 50; // Start neutral
    let marketScore = 50;
    let competitionScore = 50;
    let uniquenessScore = 50;
    const redFlags = [];
    const strengths = [];

    // RED FLAGS (deduct points)
    
    // Vague/nonsense content
    if (problemLower.includes('crap') || solutionLower.includes('crap') || titleLower.includes('crap')) {
      redFlags.push('Idea appears to be a joke or placeholder - no serious problem/solution defined');
      viabilityScore -= 35;
      marketScore -= 40;
    }

    // Too short/vague
    if (idea.problem.split(' ').length < 8) {
      redFlags.push('Problem statement too vague - needs specific pain points and quantification');
      viabilityScore -= 20;
    }

    if (idea.solution.split(' ').length < 8) {
      redFlags.push('Solution too generic - needs specific features and differentiation');
      uniquenessScore -= 25;
    }

    // No specific target
    if (idea.target.split(' ').length < 3 || targetLower === 'people' || targetLower === 'everyone') {
      redFlags.push('Target market too broad - "everyone" means "no one". Need specific segment.');
      marketScore -= 30;
    }

    // Saturated markets
    const saturatedKeywords = ['social media', 'dating app', 'food delivery', 'uber for', 'airbnb for'];
    if (saturatedKeywords.some(keyword => combined.includes(keyword))) {
      redFlags.push('Highly saturated market - extremely difficult to differentiate and acquire customers');
      competitionScore -= 35;
      marketScore -= 20;
    }

    // Missing monetization clues
    if (!combined.includes('pay') && !combined.includes('subscription') && !combined.includes('buy') && !combined.includes('price')) {
      redFlags.push('No clear monetization strategy - how will this make money?');
      viabilityScore -= 15;
    }

    // Technical complexity without clear value
    if ((combined.includes('ai') || combined.includes('blockchain') || combined.includes('crypto')) && problemLower.length < 100) {
      redFlags.push('Complex technology mentioned but problem/value prop unclear - tech for tech\'s sake?');
      viabilityScore -= 20;
    }

    // POSITIVE SIGNALS (add points - rare!)

    // Specific metrics in problem
    if (/\d+%|\$\d+|[0-9]+ hours|[0-9]+ days/.test(idea.problem)) {
      strengths.push('Problem includes quantified pain points - shows research');
      viabilityScore += 15;
      marketScore += 10;
    }

    // Specific demographics in target
    if (/age [0-9]|income \$|[0-9]+-[0-9]+|professionals|companies with/.test(idea.target)) {
      strengths.push('Target market has specific demographics - enables focused marketing');
      marketScore += 12;
    }

    // Unique angle mentioned
    if (combined.includes('unique') || combined.includes('first') || combined.includes('only') || combined.includes('unlike')) {
      strengths.push('Claims differentiation - needs validation');
      uniquenessScore += 8;
    }

    // Cap scores at reasonable ranges
    viabilityScore = Math.max(10, Math.min(70, viabilityScore));
    marketScore = Math.max(10, Math.min(70, marketScore));
    competitionScore = Math.max(10, Math.min(70, competitionScore));
    uniquenessScore = Math.max(10, Math.min(70, uniquenessScore));

    const overallScore = Math.round(
      (viabilityScore * 0.3) + 
      (marketScore * 0.3) + 
      (competitionScore * 0.2) + 
      (uniquenessScore * 0.2)
    );

    let verdict = 'STOP';
    let criticalFeedback = '';

    if (overallScore >= 60) {
      verdict = 'PROCEED';
      criticalFeedback = 'Idea shows promise but needs significant refinement. Focus on specificity and differentiation.';
    } else if (overallScore >= 35) {
      verdict = 'PIVOT';
      criticalFeedback = 'Idea has potential but needs major rework. Consider pivoting to a more specific problem or unique angle.';
    } else {
      verdict = 'STOP';
      criticalFeedback = 'Idea has too many red flags. Either completely rethink the concept or start with a different problem worth solving.';
    }

    if (redFlags.length === 0) {
      redFlags.push('Idea is too generic - needs more specific problem definition and unique value proposition');
    }

    if (strengths.length === 0) {
      strengths.push('None identified - needs significant development');
    }

    return {
      viabilityScore,
      marketScore,
      competitionScore,
      uniquenessScore,
      overallScore,
      redFlags,
      strengths,
      criticalFeedback,
      recommendations: this._generateRecommendations(redFlags, idea),
      verdict,
      source: 'rule-based-critical'
    };
  }

  _generateRecommendations(redFlags, idea) {
    const recommendations = [];

    if (redFlags.some(f => f.includes('vague') || f.includes('generic'))) {
      recommendations.push('Add specific metrics: How many people? How much time/money lost? What exact pain point?');
    }

    if (redFlags.some(f => f.includes('target') || f.includes('broad'))) {
      recommendations.push('Narrow target to a specific segment: Add age, income, job title, location, or specific behavior');
    }

    if (redFlags.some(f => f.includes('differentiation') || f.includes('saturated'))) {
      recommendations.push('Identify ONE unique differentiator competitors cannot easily copy - tech alone is not enough');
    }

    if (redFlags.some(f => f.includes('monetization'))) {
      recommendations.push('Define clear revenue model: Who pays? How much? Why would they pay you vs free alternatives?');
    }

    if (recommendations.length === 0) {
      recommendations.push('Research 3 direct competitors - what are they missing that you could provide?');
      recommendations.push('Interview 5 potential customers - validate the problem is real and painful enough to pay for');
    }

    return recommendations;
  }
}
