import { getUserModelEngine, UserSegment } from './user-model-engine.js';

export class SegmentationService {
  private userModel = getUserModelEngine();

  // Keywords for simple classification
  private readonly keywords: Record<UserSegment, string[]> = {
    developer: [
      'code', 'function', 'api', 'bug', 'error', 'typescript', 'python', 'java', 
      'const', 'var', 'let', 'class', 'interface', 'compile', 'runtime', 'stack trace',
      'git', 'docker', 'deploy', 'endpoint', 'json', 'xml', 'sql', 'query'
    ],
    creative: [
      'write', 'story', 'poem', 'creative', 'imagine', 'design', 'paint', 'draw',
      'character', 'plot', 'narrative', 'fiction', 'style', 'tone', 'voice',
      'blog', 'article', 'essay', 'script', 'screenplay'
    ],
    analyst: [
      'analyze', 'data', 'report', 'summary', 'trend', 'statistics', 'chart',
      'graph', 'excel', 'csv', 'forecast', 'predict', 'insight', 'metric',
      'kpi', 'performance', 'growth', 'revenue', 'profit', 'loss'
    ],
    general: [] // Fallback
  };

  async analyzeUserIntent(userId: string, message: string): Promise<UserSegment> {
    const text = message.toLowerCase();
    let bestSegment: UserSegment = 'general';
    let maxMatches = 0;

    // Simple keyword matching
    for (const [segment, words] of Object.entries(this.keywords)) {
      if (segment === 'general') continue;
      
      const matches = words.filter(word => text.includes(word)).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        bestSegment = segment as UserSegment;
      }
    }

    // Calculate confidence based on match density (simplified)
    const confidence = maxMatches > 0 ? Math.min(maxMatches * 0.2, 0.9) : 0.1;

    // Update user model
    await this.userModel.updateUserSegment(userId, bestSegment, confidence);

    return bestSegment;
  }

  async getProviderPreferences(segment: UserSegment): Promise<Record<string, number>> {
    // Returns weight multipliers for each provider based on segment
    // > 1.0 means preferred, < 1.0 means avoided
    
    switch (segment) {
      case 'developer':
        return {
          'anthropic': 1.2, // Claude is good at code
          'deepseek': 1.3,  // DeepSeek is great at code
          'openai': 1.0,
          'google': 0.9
        };
      case 'creative':
        return {
          'anthropic': 1.3, // Claude is creative
          'openai': 1.1,    // GPT-4 is good
          'google': 1.0,
          'deepseek': 0.8
        };
      case 'analyst':
        return {
          'openai': 1.2,    // GPT-4 is good at reasoning
          'anthropic': 1.1, // Claude has large context
          'google': 1.0,
          'deepseek': 0.9
        };
      default:
        return {
          'openai': 1.0,
          'anthropic': 1.0,
          'google': 1.0,
          'deepseek': 1.0
        };
    }
  }
}

// Singleton
let instance: SegmentationService | null = null;

export function getSegmentationService(): SegmentationService {
  if (!instance) {
    instance = new SegmentationService();
  }
  return instance;
}
