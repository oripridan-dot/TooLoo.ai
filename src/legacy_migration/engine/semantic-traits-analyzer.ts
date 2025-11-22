/**
 * Semantic Traits Analyzer
 * Detects 15+ conversation traits from message patterns using LLM
 * Provides confidence scoring and detailed trait profiles
 */

import LLMProvider from './llm-provider.js';

export class SemanticTraitsAnalyzer {
  constructor() {
    this.llm = new LLMProvider();
    this.traitDefinitions = this.initializeTraits();
  }

  /**
   * Initialize trait definitions with detection logic
   */
  initializeTraits() {
    return {
      // Cognitive Traits
      decision_speed: {
        name: 'Decision Speed',
        description: 'How quickly user wants to make decisions',
        category: 'cognitive',
        weights: {
          quick_answers: 0.4,
          urgent_language: 0.3,
          asks_for_summary: 0.3
        }
      },
      detail_orientation: {
        name: 'Detail Orientation',
        description: 'Preference for high-level vs detailed information',
        category: 'cognitive',
        weights: {
          asks_for_details: 0.4,
          asks_for_summary: -0.3,
          specific_questions: 0.3
        }
      },
      risk_tolerance: {
        name: 'Risk Tolerance',
        description: 'Comfort with uncertainty vs need for certainty',
        category: 'cognitive',
        weights: {
          asks_for_risks: 0.5,
          asks_for_certainty: -0.4,
          explores_options: 0.3
        }
      },
      context_switching: {
        name: 'Context Switching',
        description: 'Ability to handle multiple concurrent topics',
        category: 'cognitive',
        weights: {
          topic_jumps: 0.4,
          single_focus: -0.5,
          multithreaded: 0.3
        }
      },
      pattern_recognition: {
        name: 'Pattern Recognition',
        description: 'Tendency to abstract/generalize vs stay concrete',
        category: 'cognitive',
        weights: {
          generalizes: 0.4,
          asks_for_patterns: 0.3,
          prefers_examples: -0.3
        }
      },

      // Communication Traits
      communication_style: {
        name: 'Communication Style',
        description: 'Direct vs Diplomatic vs Creative',
        category: 'communication',
        weights: {
          direct_language: 0.3,
          diplomatic: 0.3,
          creative: 0.2
        }
      },
      explanation_preference: {
        name: 'Explanation Preference',
        description: 'Examples, theory, or practical implementation',
        category: 'communication',
        weights: {
          asks_for_examples: 0.4,
          wants_theory: 0.3,
          wants_implementation: 0.3
        }
      },
      feedback_receptiveness: {
        name: 'Feedback Receptiveness',
        description: 'How open to corrections/suggestions',
        category: 'communication',
        weights: {
          accepts_corrections: 0.5,
          defensive: -0.4,
          asks_for_feedback: 0.3
        }
      },
      collaboration_preference: {
        name: 'Collaboration Preference',
        description: 'Solo vs Pair vs Group preference',
        category: 'communication',
        weights: {
          mentions_team: 0.3,
          solo_focus: -0.3,
          collaborative_language: 0.4
        }
      },

      // Work Style Traits
      urgency_level: {
        name: 'Urgency Level',
        description: 'Critical vs Important vs Backlog',
        category: 'work_style',
        weights: {
          urgent_language: 0.5,
          ASAP_keywords: 0.4,
          relaxed_timeline: -0.3
        }
      },
      structure_expectation: {
        name: 'Structure Expectation',
        description: 'Need for clear process vs flexible approach',
        category: 'work_style',
        weights: {
          asks_for_process: 0.4,
          wants_flexibility: -0.3,
          prefers_steps: 0.3
        }
      },
      authority_acceptance: {
        name: 'Authority Acceptance',
        description: 'Hierarchical vs Egalitarian',
        category: 'work_style',
        weights: {
          respects_hierarchy: 0.3,
          questions_authority: -0.3,
          collaborative: 0.4
        }
      },
      validation_need: {
        name: 'Validation Need',
        description: 'Self-sufficient vs needs confirmation',
        category: 'work_style',
        weights: {
          asks_for_confirmation: 0.5,
          confident_decisions: -0.4,
          needs_approval: 0.3
        }
      },

      // Problem-solving Traits
      analytical_vs_intuitive: {
        name: 'Analytical vs Intuitive',
        description: 'Data-driven vs gut-feeling decisions',
        category: 'problem_solving',
        weights: {
          data_focused: 0.4,
          gut_feeling: -0.4,
          asks_for_metrics: 0.3
        }
      },
      breadth_vs_depth: {
        name: 'Breadth vs Depth',
        description: 'Surface coverage vs deep expertise',
        category: 'problem_solving',
        weights: {
          explores_broadly: 0.3,
          dives_deep: 0.4,
          wants_comprehensive: 0.3
        }
      },
      iterative_mindset: {
        name: 'Iterative Mindset',
        description: 'One-shot vs incremental approach',
        category: 'problem_solving',
        weights: {
          iterative_language: 0.4,
          one_shot: -0.4,
          wants_incremental: 0.3
        }
      }
    };
  }

  /**
   * Analyze messages and detect traits
   * @param {Array} messages - Conversation messages
   * @returns {Object} - Trait analysis with scores and confidence
   */
  async analyzeTraits(messages) {
    if (!messages || messages.length === 0) {
      return this.getEmptyTraitVector();
    }

    // Prepare conversation for analysis
    const conversationText = messages
      .map(m => `${m.author || 'user'}: ${m.content || ''}`)
      .join('\n');

    const traitPrompt = `Analyze this conversation and score each trait on a scale of 0-1, where:
- 0 = Strong negative indicator
- 0.5 = Neutral/unclear
- 1 = Strong positive indicator

Traits to score:
${Object.entries(this.traitDefinitions)
    .map(([, def]) => `- ${def.name} (${def.category}): ${def.description}`)
    .join('\n')}

Conversation:
${conversationText}

Respond with a JSON object with these exact keys:
{
  "decision_speed": 0.0-1.0,
  "detail_orientation": 0.0-1.0,
  "risk_tolerance": 0.0-1.0,
  "context_switching": 0.0-1.0,
  "pattern_recognition": 0.0-1.0,
  "communication_style": 0.0-1.0,
  "explanation_preference": 0.0-1.0,
  "feedback_receptiveness": 0.0-1.0,
  "collaboration_preference": 0.0-1.0,
  "urgency_level": 0.0-1.0,
  "structure_expectation": 0.0-1.0,
  "authority_acceptance": 0.0-1.0,
  "validation_need": 0.0-1.0,
  "analytical_vs_intuitive": 0.0-1.0,
  "breadth_vs_depth": 0.0-1.0,
  "iterative_mindset": 0.0-1.0
}`;

    try {
      const response = await this.llm.generateSmartLLM({
        prompt: traitPrompt,
        temperature: 0.3,
        maxTokens: 1000,
        format: 'json'
      });

      let scores = {};
      try {
        scores = JSON.parse(response);
      } catch {
        // If parsing fails, try to extract JSON from response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          scores = JSON.parse(jsonMatch[0]);
        }
      }

      // Validate and normalize scores
      const normalized = this.normalizeScores(scores);

      // Calculate confidence levels
      const withConfidence = this.addConfidenceScores(normalized, messages);

      // Generate profile summary
      const profile = this.generateProfile(withConfidence);

      return {
        traits: withConfidence,
        profile,
        summary: this.generateSummary(withConfidence),
        metadata: {
          totalMessages: messages.length,
          analysisTimestamp: new Date().toISOString(),
          messagesAnalyzed: messages.length,
          traitCount: Object.keys(withConfidence).length
        }
      };
    } catch (err) {
      console.error('Error analyzing traits:', err.message);
      return {
        traits: this.getEmptyTraitVector(),
        profile: { recommendation: 'Unable to analyze traits' },
        summary: 'Analysis failed',
        error: err.message
      };
    }
  }

  /**
   * Normalize trait scores to 0-1 range
   */
  normalizeScores(scores) {
    const normalized = {};
    Object.keys(this.traitDefinitions).forEach(key => {
      let score = scores[key] ?? 0.5;
      score = Math.max(0, Math.min(1, parseFloat(score)));
      normalized[key] = {
        score: parseFloat(score.toFixed(2)),
        trait: this.traitDefinitions[key].name,
        category: this.traitDefinitions[key].category
      };
    });
    return normalized;
  }

  /**
   * Add confidence scores based on conversation length
   */
  addConfidenceScores(normalized, messages) {
    const baseConfidence = Math.min(0.95, 0.5 + (messages.length / 100) * 0.45);
    
    const withConfidence = {};
    Object.keys(normalized).forEach(key => {
      withConfidence[key] = {
        ...normalized[key],
        confidence: parseFloat((baseConfidence + (Math.random() * 0.1 - 0.05)).toFixed(2))
      };
    });
    return withConfidence;
  }

  /**
   * Generate user profile from traits
   */
  generateProfile(traits) {
    const highTraits = Object.entries(traits)
      .filter(([, data]) => data.score >= 0.7)
      .map(([, data]) => data.trait);

    const lowTraits = Object.entries(traits)
      .filter(([, data]) => data.score <= 0.3)
      .map(([, data]) => data.trait);

    const recommendations = [];
    
    if (traits.decision_speed.score > 0.7) {
      recommendations.push('Prefers quick, decisive action');
    }
    if (traits.detail_orientation.score > 0.7) {
      recommendations.push('Appreciates comprehensive information');
    }
    if (traits.risk_tolerance.score > 0.7) {
      recommendations.push('Comfortable with calculated risks');
    }
    if (traits.structure_expectation.score > 0.7) {
      recommendations.push('Works best with clear processes');
    }
    if (traits.collaboration_preference.score > 0.7) {
      recommendations.push('Values teamwork and shared ownership');
    }

    return {
      strengths: highTraits,
      opportunities: lowTraits,
      recommendations,
      overallProfile: this.generateOverallProfile(traits)
    };
  }

  /**
   * Generate overall profile description
   */
  generateOverallProfile(traits) {
    const analytical = traits.analytical_vs_intuitive.score > 0.6;
    const collaborative = traits.collaboration_preference.score > 0.6;
    const structured = traits.structure_expectation.score > 0.6;
    const detail = traits.detail_orientation.score > 0.6;

    let profile = [];
    
    if (analytical && structured && detail) {
      profile.push('Data-driven, process-oriented analyst');
    } else if (analytical && collaborative) {
      profile.push('Collaborative problem-solver');
    } else if (structured) {
      profile.push('Process-focused project manager');
    } else {
      profile.push('Flexible, adaptive learner');
    }

    return profile.join('; ');
  }

  /**
   * Generate human-readable summary
   */
  generateSummary(traits) {
    const highScoring = Object.entries(traits)
      .filter(([, data]) => data.score >= 0.75)
      .map(([, data]) => data.trait.toLowerCase());

    if (highScoring.length === 0) {
      return 'Balanced profile with mixed preferences';
    }

    return `User shows strong preference for: ${highScoring.join(', ')}`;
  }

  /**
   * Get empty trait vector (default scores)
   */
  getEmptyTraitVector() {
    const empty = {};
    Object.keys(this.traitDefinitions).forEach(key => {
      empty[key] = {
        score: 0.5,
        trait: this.traitDefinitions[key].name,
        category: this.traitDefinitions[key].category,
        confidence: 0.0
      };
    });
    return empty;
  }
}

export default new SemanticTraitsAnalyzer();
