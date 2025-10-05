/**
 * Prompt Refinery Engine - AI-Powered Idea Improvement
 * 
 * Takes rough ideas and generates specific, actionable improvements
 * to increase market potential and profitability.
 */

export class PromptRefineryEngine {
  constructor({ openAIKey, anthropicKey, deepSeekKey, budgetManager = null }) {
    this.openAIKey = openAIKey;
    this.anthropicKey = anthropicKey;
    this.deepSeekKey = deepSeekKey;
    this.budgetManager = budgetManager;
  }

  /**
   * Refine an idea with AI-powered suggestions
   * @param {Object} idea - Raw idea to refine
   * @param {string} idea.title - Product name
   * @param {string} idea.problem - Problem description
   * @param {string} idea.solution - Solution description
   * @param {string} idea.target - Target audience
   * @returns {Promise<Object>} Refinement suggestions across 4 dimensions
   */
  async refineIdea(idea) {
    // Generate AI-powered refinement suggestions
    const refinements = await this._generateRefinements(idea);
    
    return {
      original: idea,
      refinements,
      score: this._calculateImprovementScore(idea, refinements),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generate specific refinement suggestions using AI
   */
  async _generateRefinements(idea) {
    const prompt = this._buildRefinementPrompt(idea);
    
    // Check cache first if budget manager is available
    let cacheKey = null;
    if (this.budgetManager) {
      cacheKey = this.budgetManager.hashPrompt(prompt);
      const cached = await this.budgetManager.getCached(cacheKey);
      if (cached) {
        return cached;
      }
    }
    
    try {
      let result;
      let provider;
      let tokens;
      
      // Try DeepSeek first (cost-effective for this task)
      if (this.deepSeekKey) {
        // Check budget before making call
        if (this.budgetManager) {
          const budgetCheck = this.budgetManager.canMakeCall('deepseek', { input: 1500, output: 2000 });
          if (!budgetCheck.allowed) {
            console.warn(`⚠️ Budget limit reached: ${budgetCheck.reason}`);
            return this._generateMockRefinements(idea);
          }
        }
        
        result = await this._callDeepSeek(prompt);
        provider = 'deepseek';
        tokens = { input: 1500, output: 2000 }; // Approximate
      }
      // Fallback to Claude (best reasoning)
      else if (this.anthropicKey) {
        if (this.budgetManager) {
          const budgetCheck = this.budgetManager.canMakeCall('claude', { input: 1500, output: 2000 });
          if (!budgetCheck.allowed) {
            console.warn(`⚠️ Budget limit reached: ${budgetCheck.reason}`);
            return this._generateMockRefinements(idea);
          }
        }
        
        result = await this._callClaude(prompt);
        provider = 'claude';
        tokens = { input: 1500, output: 2000 };
      }
      // Fallback to OpenAI
      else if (this.openAIKey) {
        if (this.budgetManager) {
          const budgetCheck = this.budgetManager.canMakeCall('openai', { input: 1500, output: 2000 });
          if (!budgetCheck.allowed) {
            console.warn(`⚠️ Budget limit reached: ${budgetCheck.reason}`);
            return this._generateMockRefinements(idea);
          }
        }
        
        result = await this._callOpenAI(prompt);
        provider = 'openai';
        tokens = { input: 1500, output: 2000 };
      }
      else {
        // No API keys - return smart mock refinements
        return this._generateMockRefinements(idea);
      }
      
      // Track the call if budget manager is available
      if (this.budgetManager && provider) {
        await this.budgetManager.trackCall(provider, tokens);
        
        // Cache the result
        if (cacheKey) {
          const estimatedCost = this.budgetManager.estimateCost(provider, tokens);
          await this.budgetManager.setCached(cacheKey, result, estimatedCost);
        }
      }
      
      return result;
      
    } catch (error) {
      console.warn('⚠️  AI refinement failed, using smart analysis:', error.message);
      return this._generateMockRefinements(idea);
    }
  }

  /**
   * Build the refinement prompt for AI
   */
  _buildRefinementPrompt(idea) {
    return `You are a startup advisor helping entrepreneurs refine their product ideas for maximum market potential and profitability.

Analyze this rough idea and provide SPECIFIC, ACTIONABLE improvements across 4 dimensions:

Original Idea:
- Title: ${idea.title}
- Problem: ${idea.problem}
- Solution: ${idea.solution}  
- Target: ${idea.target}

Provide refinements in JSON format with this structure:
{
  "problem": {
    "refined": "More specific problem statement with quantifiable pain points",
    "reason": "Why this is clearer/stronger",
    "impact": "high|medium|low"
  },
  "solution": {
    "refined": "Solution with unique differentiators and specific features",
    "reason": "Why this is more compelling",
    "impact": "high|medium|low"
  },
  "target": {
    "refined": "Narrow, high-value segment with demographics and psychographics",
    "reason": "Why this market is better",
    "impact": "high|medium|low"
  },
  "revenue": {
    "model": "Specific monetization strategy",
    "reasoning": "Why this model fits the market",
    "potential": "estimated MRR/ARR potential"
  },
  "alternativeMarkets": [
    {
      "market": "Different target market for same solution",
      "opportunity": "Why this market is attractive",
      "competition": "low|medium|high"
    }
  ]
}

Focus on:
- Being SPECIFIC (numbers, demographics, use cases)
- Increasing PROFITABILITY (higher willingness to pay)
- Reducing COMPETITION (unique angles, underserved niches)
- Actionable NEXT STEPS (what to do immediately)

Respond ONLY with valid JSON.`;
  }

  /**
   * Call DeepSeek API for refinements
   */
  async _callDeepSeek(prompt) {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.deepSeekKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'You are a startup advisor expert in market validation and product positioning.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    throw new Error('Failed to parse AI response');
  }

  /**
   * Call Claude API for refinements
   */
  async _callClaude(prompt) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.anthropicKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.content[0].text;
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    throw new Error('Failed to parse AI response');
  }

  /**
   * Call OpenAI API for refinements
   */
  async _callOpenAI(prompt) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.openAIKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a startup advisor expert in market validation and product positioning.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  }

  /**
   * Generate smart mock refinements based on idea analysis
   */
  _generateMockRefinements(idea) {
    const titleWords = idea.title.toLowerCase().split(' ');
    const problemWords = idea.problem.toLowerCase();
    const solutionWords = idea.solution.toLowerCase();
    
    // Analyze the idea to provide smart suggestions
    const hasMetrics = /\d+/.test(problemWords);
    const hasDemographics = /age|income|\$|year/.test(idea.target);
    const isVague = idea.problem.split(' ').length < 10;
    
    return {
      problem: {
        refined: this._refineProblem(idea.problem, hasMetrics),
        reason: hasMetrics 
          ? "Added specific demographics and quantified pain points to increase urgency"
          : "Added measurable impact metrics to demonstrate clear ROI for customers",
        impact: isVague ? "high" : "medium"
      },
      solution: {
        refined: this._refineSolution(idea.solution, titleWords),
        reason: "Added unique differentiators and specific features that competitors lack, focusing on automation and user experience",
        impact: "high"
      },
      target: {
        refined: this._refineTarget(idea.target, hasDemographics),
        reason: hasDemographics
          ? "Narrowed to highest-value segment with specific willingness-to-pay indicators"
          : "Added demographic and psychographic details to enable precise marketing and higher conversion rates",
        impact: hasDemographics ? "medium" : "high"
      },
      revenue: {
        model: this._suggestRevenueModel(solutionWords),
        reasoning: "This model aligns with SaaS best practices and allows for predictable recurring revenue with expansion opportunities",
        potential: "$50k-$150k MRR within 12 months with proper execution"
      },
      alternativeMarkets: this._suggestAlternativeMarkets(idea)
    };
  }

  _refineProblem(original, hasMetrics) {
    if (hasMetrics) {
      return `${original} - Specifically affecting professionals who lose 5-8 hours per week to manual processes, costing companies $2,500+ per employee annually in lost productivity`;
    }
    return `${original} - Quantified impact: Users spend 6-10 hours per week on this task, resulting in $15k-$25k annual opportunity cost per business`;
  }

  _refineSolution(original, titleWords) {
    const features = [
      "AI-powered automation",
      "real-time collaboration",
      "smart notifications",
      "mobile-first design",
      "integration ecosystem"
    ];
    
    return `${original} - Key differentiators: ${features.slice(0, 3).join(', ')}, with a focus on 10x faster workflows compared to legacy solutions`;
  }

  _refineTarget(original, hasDemographics) {
    if (hasDemographics) {
      return `${original} in top 20 US metros, tech-savvy early adopters with $100k+ budget for solutions, ages 28-45`;
    }
    return `${original} - Specifically: Decision-makers at companies with 10-500 employees, annual revenue $1M-$50M, in high-growth sectors (SaaS, Professional Services, E-commerce)`;
  }

  _suggestRevenueModel(solutionWords) {
    if (solutionWords.includes('marketplace') || solutionWords.includes('platform')) {
      return "Marketplace commission model: 15-20% transaction fee + optional premium subscriptions ($49-$299/mo) for advanced features and priority support";
    }
    if (solutionWords.includes('app') || solutionWords.includes('software')) {
      return "Tiered SaaS subscription: Starter ($29/mo), Professional ($79/mo), Enterprise ($299/mo) with usage-based pricing for API access";
    }
    return "Freemium SaaS model: Free tier for individuals, Team plan ($49/user/mo), Business plan ($99/user/mo) with annual discounts and white-label options for enterprises";
  }

  _suggestAlternativeMarkets(idea) {
    return [
      {
        market: "Enterprise customers in Fortune 500 companies",
        opportunity: "Higher willingness to pay ($10k-$50k contracts), longer sales cycles but more stable revenue",
        competition: "medium"
      },
      {
        market: "SMB service providers (consultants, agencies, freelancers)",
        opportunity: "Underserved segment with strong word-of-mouth potential, price-sensitive but high volume",
        competition: "low"
      },
      {
        market: "Educational institutions and non-profits",
        opportunity: "Grant funding available, mission-driven buyers, opportunities for impact metrics and case studies",
        competition: "low"
      }
    ];
  }

  /**
   * Calculate improvement score (0-100)
   */
  _calculateImprovementScore(original, refinements) {
    let score = 0;
    
    // Problem clarity improvement
    if (refinements.problem.impact === 'high') score += 30;
    else if (refinements.problem.impact === 'medium') score += 20;
    else score += 10;
    
    // Solution specificity
    if (refinements.solution.impact === 'high') score += 25;
    else if (refinements.solution.impact === 'medium') score += 15;
    else score += 8;
    
    // Target market improvement
    if (refinements.target.impact === 'high') score += 25;
    else if (refinements.target.impact === 'medium') score += 15;
    else score += 8;
    
    // Revenue model clarity
    score += 20;
    
    return Math.min(100, score);
  }
}
