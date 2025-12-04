import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

interface Source {
  id: string;
  url: string;
  content: string;
  timestamp: string;
  metadata: Record<string, any>;
}

interface Interaction {
  id: string;
  userMessage: string;
  assistantResponse: string;
  timestamp: string;
  success: boolean;
  metadata?: Record<string, any>;
}

interface SessionStats {
  totalSessions: number;
  successfulGenerations: number;
  failedGenerations: number;
  uniqueSessionIds: string[];
  providerUsage: Record<string, number>;
  lastUpdated: string;
}

interface LearningMemory {
  sources: Source[];
  interactions: Interaction[];
  vectors: any[];
  stats: SessionStats;
}

export class Learner {
  private memoryPath: string;
  private memory: LearningMemory;

  constructor() {
    this.memoryPath = path.join(process.cwd(), 'data', 'memory', 'vectors.json');
    this.memory = {
      sources: [],
      interactions: [],
      vectors: [],
      stats: {
        totalSessions: 0,
        successfulGenerations: 0,
        failedGenerations: 0,
        uniqueSessionIds: [],
        providerUsage: {},
        lastUpdated: new Date().toISOString(),
      },
    };
    this.loadMemory();
  }

  private async loadMemory() {
    try {
      await fs.ensureDir(path.dirname(this.memoryPath));
      if (await fs.pathExists(this.memoryPath)) {
        const data = await fs.readJson(this.memoryPath);
        this.memory = {
          sources: data.sources || [],
          interactions: data.interactions || [],
          vectors: data.vectors || [],
          stats: data.stats || {
            totalSessions: 0,
            successfulGenerations: 0,
            failedGenerations: 0,
            uniqueSessionIds: [],
            providerUsage: {},
            lastUpdated: new Date().toISOString(),
          },
        };
      } else {
        await this.saveMemory();
      }
    } catch (error) {
      console.error('Failed to load learner memory:', error);
    }
  }

  private async saveMemory() {
    try {
      await fs.writeJson(this.memoryPath, this.memory, { spaces: 2 });
    } catch (error) {
      console.error('Failed to save learner memory:', error);
    }
  }

  async ingestInteraction(
    userMessage: string,
    assistantResponse: string,
    metadata?: Record<string, any>
  ): Promise<{ success: boolean; id: string }> {
    const id = uuidv4();

    // Determine if this was a successful interaction
    // Success = got a response without error indicators
    const isSuccess = Boolean(
      assistantResponse &&
      !assistantResponse.toLowerCase().includes('error') &&
      !assistantResponse.toLowerCase().includes('failed') &&
      assistantResponse.length > 10
    );

    const interaction: Interaction = {
      id,
      userMessage,
      assistantResponse,
      timestamp: new Date().toISOString(),
      success: isSuccess,
      metadata,
    };

    this.memory.interactions.push(interaction);

    // Update stats
    const sessionId = metadata?.['sessionId'] as string | undefined;
    if (sessionId && !this.memory.stats.uniqueSessionIds.includes(sessionId)) {
      this.memory.stats.uniqueSessionIds.push(sessionId);
      this.memory.stats.totalSessions = this.memory.stats.uniqueSessionIds.length;
    }

    if (isSuccess) {
      this.memory.stats.successfulGenerations++;
    } else {
      this.memory.stats.failedGenerations++;
    }

    // Track provider usage
    const provider = (metadata?.['provider'] as string) || 'unknown';
    this.memory.stats.providerUsage[provider] =
      (this.memory.stats.providerUsage[provider] || 0) + 1;
    this.memory.stats.lastUpdated = new Date().toISOString();

    // Keep only last 1000 interactions to prevent file bloat
    if (this.memory.interactions.length > 1000) {
      this.memory.interactions = this.memory.interactions.slice(-1000);
    }

    // Keep only last 100 session IDs
    if (this.memory.stats.uniqueSessionIds.length > 100) {
      this.memory.stats.uniqueSessionIds = this.memory.stats.uniqueSessionIds.slice(-100);
    }

    await this.saveMemory();
    return { success: true, id };
  }

  async ingest(url: string): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      // In a real implementation, we would fetch the URL content here.
      // For now, we'll simulate ingestion.
      const id = uuidv4();
      const source: Source = {
        id,
        url,
        content: `Simulated content for ${url}`, // TODO: Implement real fetching
        timestamp: new Date().toISOString(),
        metadata: {
          status: 'ingested',
          type: 'web',
        },
      };

      this.memory.sources.push(source);
      await this.saveMemory();

      return { success: true, id };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async query(queryText: string): Promise<{ answer: string; sources: Source[] }> {
    // Simple keyword search simulation
    const keywords = queryText.toLowerCase().split(' ');
    const relevantSources = this.memory.sources.filter((source) =>
      keywords.some(
        (kw) => source.url.toLowerCase().includes(kw) || source.content.toLowerCase().includes(kw)
      )
    );

    // In a real system, this would use an LLM to generate an answer
    const answer =
      relevantSources.length > 0
        ? `Based on your sources, I found information related to "${queryText}" in ${relevantSources.length} documents.`
        : `I couldn't find any specific information about "${queryText}" in the ingested sources.`;

    return { answer, sources: relevantSources };
  }

  async listSources(): Promise<Source[]> {
    return this.memory.sources;
  }

  /**
   * Get real-time statistics from tracked interactions
   */
  getStats(): SessionStats {
    return this.memory.stats;
  }

  /**
   * Calculate real metrics for the dashboard
   */
  calculateMetrics(): {
    totalSessions: number;
    successfulGenerations: number;
    failedGenerations: number;
    firstTrySuccessRate: number;
    providerBreakdown: Record<string, number>;
  } {
    const total = this.memory.stats.successfulGenerations + this.memory.stats.failedGenerations;
    const successRate = total > 0 ? this.memory.stats.successfulGenerations / total : 0;

    return {
      totalSessions: this.memory.stats.totalSessions,
      successfulGenerations: this.memory.stats.successfulGenerations,
      failedGenerations: this.memory.stats.failedGenerations,
      firstTrySuccessRate: successRate,
      providerBreakdown: this.memory.stats.providerUsage,
    };
  }

  /**
   * Analyze repeated problems (same type of failures)
   */
  analyzeRepeatProblems(): {
    repeatRate: number;
    commonFailures: Array<{ pattern: string; count: number }>;
  } {
    const failures = this.memory.interactions.filter((i) => !i.success);
    const patterns: Record<string, number> = {};

    for (const failure of failures) {
      // Extract error pattern from response
      const errorMatch = failure.assistantResponse.match(/error[:\s]+([^.]+)/i);
      const pattern = errorMatch ? errorMatch[1]?.trim().substring(0, 50) : 'unknown';
      if (pattern) {
        patterns[pattern] = (patterns[pattern] || 0) + 1;
      }
    }

    const commonFailures = Object.entries(patterns)
      .map(([pattern, count]) => ({ pattern, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const total = this.memory.interactions.length;
    const repeatRate = total > 0 ? failures.length / total : 0;

    return { repeatRate, commonFailures };
  }
}

export const learner = new Learner();
