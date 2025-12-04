// @version 2.3.0
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

export interface BiasResult {
  detected: boolean;
  score: number; // 0-1
  severity: 'none' | 'low' | 'medium' | 'high' | 'critical';
  categories: BiasCategory[];
  reasoning: string;
  details: string;
  recommendations: string[];
  confidence: number; // 0-1
  providerScores: {
    claude?: number;
    openai?: number;
  };
}

export interface BiasCategory {
  type: string;
  score: number;
  examples: string[];
  description: string;
}

export interface BiasAnalysisOptions {
  useMultiProvider?: boolean; // Default true for quality
  includeRecommendations?: boolean; // Default true
  minConfidence?: number; // Default 0.7
}

export class BiasDetector {
  private static anthropic: Anthropic | null = null;
  private static openai: OpenAI | null = null;

  private static initProviders() {
    if (!this.anthropic && process.env['ANTHROPIC_API_KEY']) {
      this.anthropic = new Anthropic({
        apiKey: process.env['ANTHROPIC_API_KEY'],
      });
    }
    if (!this.openai && process.env['OPENAI_API_KEY']) {
      this.openai = new OpenAI({
        apiKey: process.env['OPENAI_API_KEY'],
      });
    }
  }

  /**
   * ML-based bias detection using multi-provider consensus
   * Analyzes for: gender, racial, age, religious, political, ableist, socioeconomic biases
   * Plus: toxicity, stereotypes, microaggressions, exclusionary language
   */
  static async analyze(text: string, options: BiasAnalysisOptions = {}): Promise<BiasResult> {
    const { useMultiProvider = true, includeRecommendations = true, minConfidence = 0.7 } = options;

    this.initProviders();

    const analysisPrompt = `Analyze the following text for biases, toxicity, and ethical concerns.

Text to analyze:
"""
${text}
"""

Provide a detailed JSON analysis with this exact structure:
{
  "overallScore": <0-1 decimal representing severity>,
  "detected": <boolean, true if any concerning bias found>,
  "severity": <"none"|"low"|"medium"|"high"|"critical">,
  "categories": [
    {
      "type": <"gender"|"racial"|"age"|"religious"|"political"|"ableist"|"socioeconomic"|"toxicity"|"stereotype"|"microaggression"|"exclusionary">,
      "score": <0-1 decimal>,
      "examples": [<array of specific phrases from the text>],
      "description": <brief explanation of the issue>
    }
  ],
  "reasoning": <comprehensive explanation of findings>,
  "recommendations": [<array of specific suggestions to improve the text>],
  "confidence": <0-1 decimal for how confident you are in this analysis>
}

Be thorough but fair. Consider context. Flag genuine issues but don't over-interpret.`;

    try {
      if (useMultiProvider) {
        // Multi-provider consensus for highest quality
        const results = await Promise.allSettled([
          this.analyzeWithClaude(analysisPrompt),
          this.analyzeWithOpenAI(analysisPrompt),
        ]);

        const analyses: Array<{ provider: string; result: any; score: number }> = [];

        results.forEach((result, idx) => {
          if (result.status === 'fulfilled' && result.value) {
            const provider = idx === 0 ? 'claude' : 'openai';
            analyses.push({
              provider,
              result: result.value,
              score: result.value.overallScore || 0,
            });
          }
        });

        if (analyses.length === 0) {
          // Fallback to keyword-based if all AI providers fail
          console.warn('[BiasDetector] All AI providers failed, using fallback heuristics');
          return this.fallbackAnalysis(text);
        }

        // Combine analyses with weighted average (prefer higher severity for safety)
        return this.combineAnalyses(analyses, includeRecommendations);
      } else {
        // Single provider (Claude preferred for quality)
        const analysis = await this.analyzeWithClaude(analysisPrompt);
        if (!analysis) {
          const analysis2 = await this.analyzeWithOpenAI(analysisPrompt);
          if (!analysis2) {
            return this.fallbackAnalysis(text);
          }
          return this.formatResult(analysis2, 'openai', includeRecommendations);
        }
        return this.formatResult(analysis, 'claude', includeRecommendations);
      }
    } catch (error) {
      console.error('[BiasDetector] Analysis failed:', error);
      return this.fallbackAnalysis(text);
    }
  }

  private static async analyzeWithClaude(prompt: string): Promise<any> {
    if (!this.anthropic) return null;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2048,
        temperature: 0.3, // Lower temperature for consistency
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const content = response.content[0];
      if (content && content.type === 'text') {
        const jsonMatch = (content as any).text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }
      return null;
    } catch (error) {
      console.error('[BiasDetector] Claude analysis error:', error);
      return null;
    }
  }

  private static async analyzeWithOpenAI(prompt: string): Promise<any> {
    if (!this.openai) return null;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert at detecting bias, toxicity, and ethical concerns in text. Respond only with valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        return JSON.parse(content);
      }
      return null;
    } catch (error) {
      console.error('[BiasDetector] OpenAI analysis error:', error);
      return null;
    }
  }

  private static combineAnalyses(
    analyses: Array<{ provider: string; result: any; score: number }>,
    includeRecommendations: boolean
  ): BiasResult {
    // Weighted average favoring higher severity (safety-first approach)
    const maxScore = Math.max(...analyses.map((a) => a.score));
    const avgScore = analyses.reduce((sum, a) => sum + a.score, 0) / analyses.length;
    const finalScore = maxScore * 0.6 + avgScore * 0.4; // Bias toward worst-case

    // Combine all unique categories
    const categoryMap = new Map<string, BiasCategory>();
    analyses.forEach(({ result }) => {
      result.categories?.forEach((cat: BiasCategory) => {
        const existing = categoryMap.get(cat.type);
        if (!existing || cat.score > existing.score) {
          categoryMap.set(cat.type, cat);
        }
      });
    });

    // Combine recommendations
    const allRecommendations = new Set<string>();
    if (includeRecommendations) {
      analyses.forEach(({ result }) => {
        result.recommendations?.forEach((rec: string) => allRecommendations.add(rec));
      });
    }

    // Combined reasoning
    const reasoning = analyses.map((a) => `[${a.provider}] ${a.result.reasoning}`).join('\n\n');

    const providerScores: any = {};
    analyses.forEach(({ provider, score }) => {
      providerScores[provider] = score;
    });

    return {
      detected: finalScore > 0.3,
      score: finalScore,
      severity: this.scoreToSeverity(finalScore),
      categories: Array.from(categoryMap.values()),
      reasoning,
      details: `Multi-provider analysis (${analyses.length} providers)`,
      recommendations: Array.from(allRecommendations).slice(0, 5),
      confidence: Math.min(...analyses.map((a) => a.result.confidence || 0.8)),
      providerScores,
    };
  }

  private static formatResult(analysis: any, provider: string, includeRecs: boolean): BiasResult {
    return {
      detected: analysis.detected || false,
      score: analysis.overallScore || 0,
      severity: analysis.severity || this.scoreToSeverity(analysis.overallScore || 0),
      categories: analysis.categories || [],
      reasoning: analysis.reasoning || 'No detailed analysis available',
      details: `Single provider: ${provider}`,
      recommendations: includeRecs ? analysis.recommendations || [] : [],
      confidence: analysis.confidence || 0.8,
      providerScores: { [provider]: analysis.overallScore || 0 },
    };
  }

  private static scoreToSeverity(score: number): 'none' | 'low' | 'medium' | 'high' | 'critical' {
    if (score < 0.2) return 'none';
    if (score < 0.4) return 'low';
    if (score < 0.6) return 'medium';
    if (score < 0.8) return 'high';
    return 'critical';
  }

  private static fallbackAnalysis(text: string): BiasResult {
    // Simple keyword-based fallback (original logic)
    const genderBias = [
      'he',
      'she',
      'him',
      'her',
      'man',
      'woman',
      'guy',
      'girl',
      'waitress',
      'stewardess',
      'fireman',
    ];
    const sentimentBias = ['always', 'never', 'best', 'worst', 'hate', 'love', 'stupid', 'idiot'];

    const lower = text.toLowerCase();
    const categories: BiasCategory[] = [];
    let score = 0;

    let genderCount = 0;
    const genderExamples: string[] = [];
    for (const word of genderBias) {
      if (new RegExp(`\\b${word}\\b`).test(lower)) {
        genderCount++;
        genderExamples.push(word);
      }
    }

    if (genderCount > 2) {
      categories.push({
        type: 'gender',
        score: 0.4,
        examples: genderExamples,
        description: 'Multiple gendered terms detected',
      });
      score += 0.4;
    }

    let sentimentCount = 0;
    const sentimentExamples: string[] = [];
    for (const word of sentimentBias) {
      if (new RegExp(`\\b${word}\\b`).test(lower)) {
        sentimentCount++;
        sentimentExamples.push(word);
      }
    }

    if (sentimentCount > 1) {
      categories.push({
        type: 'toxicity',
        score: 0.3,
        examples: sentimentExamples,
        description: 'Extreme sentiment language detected',
      });
      score += 0.3;
    }

    return {
      detected: score > 0.3,
      score,
      severity: this.scoreToSeverity(score),
      categories,
      reasoning:
        categories.length > 0
          ? `Fallback heuristic analysis: ${categories.map((c) => c.type).join(', ')}`
          : 'No obvious bias detected (fallback heuristics)',
      details: 'Keyword-based fallback analysis (AI providers unavailable)',
      recommendations: [],
      confidence: 0.5, // Low confidence for heuristic approach
      providerScores: {},
    };
  }
}
