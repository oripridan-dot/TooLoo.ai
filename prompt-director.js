/**
 * 🎬 Prompt Director - Orchestrates Prompt Saturation & Multi-Provider Synthesis
 * 
 * The Director's role:
 * 1. Refines user prompts through conversation (saturation loop)
 * 2. Breaks complex prompts into provider-specific sub-tasks
 * 3. Sends tasks to optimal providers in parallel
 * 4. Compiles responses into unified TooLoo.ai answer
 * 
 * This creates TooLoo's unique "hive mind" approach where multiple AI perspectives
 * are synthesized into a superior response.
 */

const axios = require('axios');

class PromptDirector {
  constructor(aiManager) {
    this.aiManager = aiManager;
    this.conversationHistory = new Map(); // Track saturation loops per user
    this.saturationThreshold = 3; // Max refinement iterations
  }

  /**
   * Main entry point: Saturate prompt, execute with director, compile response
   */
  async processWithDirector(userPrompt, conversationId = 'default', context = {}) {
    console.log('🎬 Director activated for prompt processing');

    // Emit director status
    if (context.socket) {
      context.socket.emit('director-status', { 
        active: true, 
        stage: 'starting',
        timestamp: Date.now() 
      });
    }

    // PHASE 1: Prompt Saturation Loop
    if (context.socket) {
      context.socket.emit('director-activity', {
        id: Date.now(),
        type: 'saturating',
        action: 'Saturating prompt',
        details: 'Refining your request for optimal results',
        timestamp: Date.now()
      });
    }
    const saturatedPrompt = await this.saturatePrompt(userPrompt, conversationId, context);

    // PHASE 2: Director's Analysis & Task Breakdown
    if (context.socket) {
      context.socket.emit('director-activity', {
        id: Date.now(),
        type: 'executing',
        action: 'Creating execution plan',
        details: `Analyzed after ${saturatedPrompt.iterations.length} saturation iterations`,
        timestamp: Date.now()
      });
    }
    const executionPlan = await this.createExecutionPlan(saturatedPrompt, context);

    // PHASE 3: Parallel Multi-Provider Execution
    if (context.socket) {
      context.socket.emit('director-activity', {
        id: Date.now(),
        type: 'executing',
        action: 'Executing with multiple providers',
        details: `Using ${executionPlan.tasks.length} providers in parallel`,
        timestamp: Date.now()
      });
    }
    const providerResponses = await this.executeParallel(executionPlan);

    // PHASE 4: Response Compilation & Synthesis
    if (context.socket) {
      context.socket.emit('director-activity', {
        id: Date.now(),
        type: 'executing',
        action: 'Synthesizing responses',
        details: 'Compiling multi-provider insights',
        timestamp: Date.now()
      });
    }
    const finalResponse = await this.compileResponse(providerResponses, saturatedPrompt, context);

    // Emit completion
    if (context.socket) {
      context.socket.emit('director-activity', {
        id: Date.now(),
        type: 'complete',
        action: 'Director processing complete',
        details: `Used ${providerResponses.length} providers`,
        timestamp: Date.now()
      });
      context.socket.emit('director-status', { 
        active: false, 
        stage: 'complete',
        timestamp: Date.now() 
      });
    }

    return {
      originalPrompt: userPrompt,
      saturatedPrompt: saturatedPrompt.final,
      iterations: saturatedPrompt.iterations,
      executionPlan,
      providerResponses,
      finalResponse,
      metadata: {
        providersUsed: providerResponses.map(r => r.provider),
        totalTokens: providerResponses.reduce((sum, r) => sum + (r.tokens?.total || 0), 0),
        processingTimeMs: Date.now() - saturatedPrompt.startTime
      }
    };
  }

  /**
   * PHASE 1: Prompt Saturation Loop
   * Refines the prompt through iterative conversation until it's "saturated" (ready)
   */
  async saturatePrompt(userPrompt, conversationId, context) {
    const startTime = Date.now();
    let currentPrompt = userPrompt;
    let iterations = [];

    // Get conversation history if exists
    if (!this.conversationHistory.has(conversationId)) {
      this.conversationHistory.set(conversationId, []);
    }
    const history = this.conversationHistory.get(conversationId);

    // Saturation loop: Refine until clear or max iterations
    for (let i = 0; i < this.saturationThreshold; i++) {
      const refinementAnalysis = await this.analyzePromptClarity(currentPrompt, history, context);
      
      iterations.push({
        iteration: i + 1,
        prompt: currentPrompt,
        clarity: refinementAnalysis.clarity,
        missingInfo: refinementAnalysis.missing,
        confidence: refinementAnalysis.confidence
      });

      // If prompt is clear enough (confidence > 0.8), stop saturating
      if (refinementAnalysis.confidence > 0.8) {
        console.log(`✅ Prompt saturated after ${i + 1} iterations (confidence: ${refinementAnalysis.confidence})`);
        break;
      }

      // Generate refinement questions
      if (refinementAnalysis.missing.length > 0 && i < this.saturationThreshold - 1) {
        const refinementQuestions = this.generateRefinementQuestions(refinementAnalysis.missing);
        iterations[i].refinementQuestions = refinementQuestions;
        
        // In a real implementation, you'd pause here and wait for user answers
        // For now, we'll use AI to simulate answering its own questions
        currentPrompt = await this.simulateRefinement(currentPrompt, refinementQuestions, context);
      }
    }

    // Update conversation history
    history.push({ prompt: currentPrompt, timestamp: Date.now() });

    return {
      original: userPrompt,
      final: currentPrompt,
      iterations,
      startTime,
      saturated: iterations[iterations.length - 1]?.confidence > 0.8
    };
  }

  /**
   * Analyze if a prompt is clear enough to execute
   */
  async analyzePromptClarity(prompt, history, context) {
    // Use the fastest provider (DeepSeek) for quick analysis
    const analysisPrompt = `
Analyze this prompt for clarity and completeness:

PROMPT: "${prompt}"

CONVERSATION HISTORY: ${JSON.stringify(history.slice(-3))}

Respond in JSON format:
{
  "clarity": "clear|vague|ambiguous",
  "confidence": 0.0-1.0,
  "missing": ["list", "of", "missing", "details"],
  "intent": "what the user wants to achieve",
  "complexity": "simple|moderate|complex"
}`;

    try {
      const provider = this.aiManager.providers.get('deepseek');
      if (!provider) {
        // Fallback if DeepSeek not available
        return this.heuristicClarity(prompt);
      }

      const response = await this.aiManager.callDeepSeek(provider, analysisPrompt);
      
      // Parse JSON response
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.warn('Clarity analysis failed, using heuristics:', error.message);
    }

    return this.heuristicClarity(prompt);
  }

  /**
   * Fallback heuristic if AI analysis fails
   */
  heuristicClarity(prompt) {
    const wordCount = prompt.split(/\s+/).length;
    const hasQuestionWords = /who|what|where|when|why|how/i.test(prompt);
    const hasSpecifics = /\b(file|function|class|component|feature)\b/i.test(prompt);

    let confidence = 0.5;
    if (wordCount > 10) confidence += 0.1;
    if (wordCount > 20) confidence += 0.1;
    if (hasSpecifics) confidence += 0.2;
    if (!hasQuestionWords) confidence += 0.1;

    return {
      clarity: confidence > 0.7 ? 'clear' : confidence > 0.5 ? 'vague' : 'ambiguous',
      confidence: Math.min(confidence, 1.0),
      missing: confidence < 0.7 ? ['More specific details needed'] : [],
      intent: 'Inferred from context',
      complexity: wordCount > 30 ? 'complex' : wordCount > 10 ? 'moderate' : 'simple'
    };
  }

  /**
   * Generate questions to refine unclear prompts
   */
  generateRefinementQuestions(missingInfo) {
    return missingInfo.map(missing => {
      if (missing.toLowerCase().includes('file')) {
        return 'Which files should be modified?';
      }
      if (missing.toLowerCase().includes('technology')) {
        return 'What technology/framework should be used?';
      }
      if (missing.toLowerCase().includes('detail')) {
        return 'Can you provide more specific requirements?';
      }
      return `Can you clarify: ${missing}?`;
    });
  }

  /**
   * Simulate answering refinement questions (in real use, user would answer)
   */
  async simulateRefinement(prompt, questions, context) {
    // For now, just add context hints to the prompt
    const refinement = questions.map(q => `(${q})`).join(' ');
    return `${prompt} ${refinement}`;
  }

  /**
   * PHASE 2: Director's Execution Plan
   * Breaks the saturated prompt into provider-specific tasks
   */
  async createExecutionPlan(saturatedPrompt, context) {
    const plan = {
      strategy: 'parallel',
      tasks: [],
      reasoning: ''
    };

    // Analyze prompt to determine task breakdown strategy
    const complexity = saturatedPrompt.iterations[saturatedPrompt.iterations.length - 1]?.complexity || 'moderate';
    const promptText = saturatedPrompt.final;

    // STRATEGY 1: Code-heavy prompts
    if (this.isCodeRequest(promptText)) {
      plan.tasks.push(
        { 
          provider: 'deepseek', 
          role: 'code-generation', 
          prompt: this.buildProviderPrompt('deepseek', 'code-generation', promptText),
          systemPrompt: 'You are an expert code generator. Focus on clean, efficient, well-documented code. Include error handling and follow best practices.',
          priority: 1 
        },
        { 
          provider: 'claude', 
          role: 'architecture-review', 
          prompt: this.buildProviderPrompt('claude', 'architecture-review', promptText),
          systemPrompt: 'You are a software architect. Review the approach for design patterns, scalability, maintainability, and adherence to SOLID principles. Be critical but constructive.',
          priority: 2 
        },
        { 
          provider: 'openai', 
          role: 'edge-cases', 
          prompt: this.buildProviderPrompt('openai', 'edge-cases', promptText),
          systemPrompt: 'You are a QA engineer. Identify edge cases, potential bugs, error scenarios, and security vulnerabilities. Think adversarially.',
          priority: 3 
        }
      );
      plan.reasoning = 'Code request: DeepSeek generates, Claude reviews architecture, OpenAI checks edge cases';
    }
    // STRATEGY 2: Reasoning/explanation prompts
    else if (this.isReasoningRequest(promptText)) {
      plan.tasks.push(
        { 
          provider: 'claude', 
          role: 'deep-reasoning', 
          prompt: this.buildProviderPrompt('claude', 'deep-reasoning', promptText),
          systemPrompt: 'You are a philosophy professor and systems thinker. Provide deep, nuanced explanations with logical reasoning. Explore implications and connections.',
          priority: 1 
        },
        { 
          provider: 'openai', 
          role: 'practical-examples', 
          prompt: this.buildProviderPrompt('openai', 'practical-examples', promptText),
          systemPrompt: 'You are a practical teacher. Provide clear, real-world examples and code demonstrations. Make complex concepts accessible.',
          priority: 2 
        },
        { 
          provider: 'gemini', 
          role: 'creative-alternatives', 
          prompt: this.buildProviderPrompt('gemini', 'creative-alternatives', promptText),
          systemPrompt: 'You are an innovative thinker. Present alternative viewpoints, unconventional approaches, and creative solutions.',
          priority: 3 
        }
      );
      plan.reasoning = 'Reasoning request: Claude for deep analysis, OpenAI for examples, Gemini for alternatives';
    }
    // STRATEGY 3: Creative/design prompts
    else if (this.isCreativeRequest(promptText)) {
      plan.tasks.push(
        { 
          provider: 'gemini', 
          role: 'creative-lead', 
          prompt: this.buildProviderPrompt('gemini', 'creative-lead', promptText),
          systemPrompt: 'You are a creative director and UX designer. Think outside the box. Prioritize innovation, user experience, and aesthetic appeal.',
          priority: 1 
        },
        { 
          provider: 'claude', 
          role: 'refinement', 
          prompt: this.buildProviderPrompt('claude', 'refinement', promptText),
          systemPrompt: 'You are a design critic. Refine creative ideas with structure, usability principles, and feasibility constraints. Balance creativity with practicality.',
          priority: 2 
        },
        { 
          provider: 'deepseek', 
          role: 'implementation', 
          prompt: this.buildProviderPrompt('deepseek', 'implementation', promptText),
          systemPrompt: 'You are a technical implementation specialist. Translate creative concepts into concrete technical solutions. Focus on buildability.',
          priority: 3 
        }
      );
      plan.reasoning = 'Creative request: Gemini leads creativity, Claude refines, DeepSeek implements';
    }
    // STRATEGY 4: Default balanced approach
    else {
      plan.tasks.push(
        { 
          provider: 'deepseek', 
          role: 'primary-response', 
          prompt: this.buildProviderPrompt('deepseek', 'primary-response', promptText),
          systemPrompt: 'You are a general AI assistant. Provide a comprehensive, accurate response. Be clear and thorough.',
          priority: 1 
        },
        { 
          provider: 'claude', 
          role: 'validation', 
          prompt: this.buildProviderPrompt('claude', 'validation', promptText),
          systemPrompt: 'You are a fact-checker and validator. Review the primary response for accuracy, completeness, and potential improvements.',
          priority: 2 
        }
      );
      plan.reasoning = 'Balanced request: DeepSeek primary, Claude validates';
    }

    // Filter tasks to only available providers
    plan.tasks = plan.tasks.filter(task => this.aiManager.providers.has(task.provider));

    console.log(`📋 Director created plan: ${plan.reasoning}`);
    console.log(`   Tasks: ${plan.tasks.length} parallel executions`);

    return plan;
  }

  /**
   * Build provider-specific prompts with role-optimized instructions
   */
  buildProviderPrompt(provider, role, originalPrompt) {
    const roleInstructions = {
      'code-generation': `Generate production-ready code for: ${originalPrompt}\n\nRequirements:\n- Clean, readable code\n- Proper error handling\n- Comments explaining key logic\n- Follow language best practices`,
      'architecture-review': `Review the architectural approach for: ${originalPrompt}\n\nAnalyze:\n- Design patterns used\n- Scalability considerations\n- Maintainability\n- Potential improvements\n- SOLID principles adherence`,
      'edge-cases': `Identify edge cases and potential issues for: ${originalPrompt}\n\nConsider:\n- Invalid inputs\n- Boundary conditions\n- Error scenarios\n- Security vulnerabilities\n- Performance bottlenecks`,
      'deep-reasoning': `Provide a comprehensive explanation for: ${originalPrompt}\n\nInclude:\n- Fundamental concepts\n- Logical reasoning\n- Implications and connections\n- Common misconceptions`,
      'practical-examples': `Provide practical examples for: ${originalPrompt}\n\nInclude:\n- Real-world use cases\n- Code demonstrations\n- Step-by-step breakdowns\n- Common pitfalls`,
      'creative-alternatives': `Suggest creative alternatives for: ${originalPrompt}\n\nExplore:\n- Unconventional approaches\n- Different perspectives\n- Innovative solutions\n- Pros/cons of each`,
      'creative-lead': `Generate creative concepts for: ${originalPrompt}\n\nFocus on:\n- Innovation\n- User experience\n- Visual/aesthetic appeal\n- Uniqueness`,
      'refinement': `Refine and improve this concept: ${originalPrompt}\n\nBalance:\n- Creativity with usability\n- Innovation with feasibility\n- Design with implementation`,
      'implementation': `Provide technical implementation for: ${originalPrompt}\n\nDetail:\n- Technology choices\n- Architecture\n- Code structure\n- Build steps`,
      'primary-response': originalPrompt,
      'validation': `Review and validate this approach: ${originalPrompt}\n\nCheck for:\n- Accuracy\n- Completeness\n- Potential issues\n- Improvements`
    };

    return roleInstructions[role] || originalPrompt;
  }

  /**
   * Request type detection helpers
   */
  isCodeRequest(prompt) {
    const codeKeywords = ['function', 'class', 'component', 'implement', 'code', 'write', 'create'];
    return codeKeywords.some(keyword => prompt.toLowerCase().includes(keyword));
  }

  isReasoningRequest(prompt) {
    const reasoningKeywords = ['why', 'how', 'explain', 'analyze', 'compare', 'evaluate'];
    return reasoningKeywords.some(keyword => prompt.toLowerCase().includes(keyword));
  }

  isCreativeRequest(prompt) {
    const creativeKeywords = ['design', 'creative', 'suggest', 'ideas', 'innovative', 'unique'];
    return creativeKeywords.some(keyword => prompt.toLowerCase().includes(keyword));
  }

  /**
   * PHASE 3: Execute tasks in parallel across multiple providers
   */
  async executeParallel(executionPlan) {
    console.log(`🚀 Executing ${executionPlan.tasks.length} tasks in parallel...`);

    // Execute all tasks concurrently
    const promises = executionPlan.tasks.map(async (task) => {
      const startTime = Date.now();
      try {
        // Build context with system prompt and role information
        const context = {
          systemPrompt: task.systemPrompt,
          role: task.role,
          priority: task.priority
        };
        
        const response = await this.aiManager.callProvider(task.provider, task.prompt, context);
        return {
          provider: task.provider,
          role: task.role,
          priority: task.priority,
          success: true,
          content: response.content,
          tokens: response.tokens,
          responseTimeMs: Date.now() - startTime,
          error: null
        };
      } catch (error) {
        console.error(`❌ ${task.provider} (${task.role}) failed:`, error.message);
        return {
          provider: task.provider,
          role: task.role,
          priority: task.priority,
          success: false,
          content: null,
          tokens: { input: 0, output: 0, total: 0 },
          responseTimeMs: Date.now() - startTime,
          error: error.message
        };
      }
    });

    const results = await Promise.all(promises);
    
    const successCount = results.filter(r => r.success).length;
    console.log(`✅ ${successCount}/${results.length} providers responded successfully`);

    return results;
  }

  /**
   * PHASE 4: Compile multiple provider responses into one unified TooLoo.ai response
   */
  async compileResponse(providerResponses, saturatedPrompt, context) {
    console.log('🎨 Compiling multi-provider responses...');

    // Filter successful responses
    const successfulResponses = providerResponses.filter(r => r.success);

    if (successfulResponses.length === 0) {
      return {
        content: '❌ All providers failed to respond. Please check your API keys and try again.',
        compilationStrategy: 'fallback',
        providersUsed: []
      };
    }

    // Sort by priority (primary response first)
    successfulResponses.sort((a, b) => a.priority - b.priority);

    // COMPILATION STRATEGY: Synthesize responses based on roles
    const primary = successfulResponses[0];
    const supporting = successfulResponses.slice(1);

    let compiledContent = `# TooLoo.ai Response (Multi-Provider Synthesis)\n\n`;
    
    // Add primary response
    compiledContent += `## Primary Response (${primary.provider})\n\n`;
    compiledContent += primary.content + '\n\n';

    // Add supporting insights
    if (supporting.length > 0) {
      compiledContent += `## Additional Perspectives\n\n`;
      
      for (const response of supporting) {
        compiledContent += `### ${this.roleToTitle(response.role)} (${response.provider})\n\n`;
        compiledContent += response.content + '\n\n';
      }
    }

    // Add meta-analysis
    compiledContent += `---\n\n`;
    compiledContent += `**Director's Note**: This response synthesizes insights from ${successfulResponses.length} AI provider(s). `;
    compiledContent += `Primary execution by ${primary.provider}, with ${supporting.length} supporting perspective(s).\n`;

    return {
      content: compiledContent,
      compilationStrategy: 'multi-provider-synthesis',
      providersUsed: successfulResponses.map(r => r.provider),
      primaryProvider: primary.provider,
      responseTimeMs: Math.max(...successfulResponses.map(r => r.responseTimeMs))
    };
  }

  /**
   * Convert role names to readable titles
   */
  roleToTitle(role) {
    const titles = {
      'code-generation': 'Code Generation',
      'architecture-review': 'Architecture Review',
      'edge-cases': 'Edge Case Analysis',
      'deep-reasoning': 'Deep Reasoning',
      'practical-examples': 'Practical Examples',
      'creative-alternatives': 'Creative Alternatives',
      'creative-lead': 'Creative Direction',
      'refinement': 'Refinement',
      'implementation': 'Implementation Strategy',
      'primary-response': 'Core Response',
      'validation': 'Validation & Review'
    };
    return titles[role] || role.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Clear conversation history for a user
   */
  clearHistory(conversationId) {
    this.conversationHistory.delete(conversationId);
  }

  /**
   * Get saturation statistics
   */
  getStats() {
    return {
      activeConversations: this.conversationHistory.size,
      saturationThreshold: this.saturationThreshold,
      averageIterations: this.calculateAverageIterations()
    };
  }

  calculateAverageIterations() {
    if (this.conversationHistory.size === 0) return 0;
    
    let total = 0;
    for (const history of this.conversationHistory.values()) {
      total += history.length;
    }
    return (total / this.conversationHistory.size).toFixed(2);
  }
}

module.exports = PromptDirector;
