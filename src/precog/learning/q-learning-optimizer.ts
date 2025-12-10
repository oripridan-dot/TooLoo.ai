// @version 3.3.502
import fs from 'fs/promises';
import path from 'path';

export interface QState {
  taskType: string; // 'code', 'creative', 'general', etc.
  userSegment: string; // 'developer', 'creative', 'analyst', 'general'
}

export interface QAction {
  provider: string;
}

export interface QReward {
  latency: number; // ms
  success: boolean;
  quality?: number; // 0-1, optional user feedback or self-evaluation
  tokens?: number;
}

interface QTableEntry {
  qValue: number;
  visits: number;
}

export class QLearningOptimizer {
  private qTable: Map<string, QTableEntry> = new Map();
  private readonly storagePath: string;
  private alpha = 0.1; // Learning rate
  private gamma = 0.9; // Discount factor (low for bandit-like)
  private epsilon = 0.1; // Exploration rate
  private initialized = false;

  constructor(storagePath: string = 'data/q-learning-state.json') {
    this.storagePath = path.resolve(process.cwd(), storagePath);
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    try {
      await this.ensureDirectory();
      const data = await fs.readFile(this.storagePath, 'utf-8');
      const json = JSON.parse(data);
      this.qTable = new Map(Object.entries(json));
      console.log(`[QLearning] Loaded ${this.qTable.size} Q-table entries`);
    } catch (error) {
      console.log('[QLearning] Starting with empty Q-table');
    }
    this.initialized = true;
  }

  private getStateKey(state: QState, action: QAction): string {
    return `${state.taskType}:${state.userSegment}:${action.provider}`;
  }

  /**
   * Get the best provider for the current state
   */
  getOptimalProvider(state: QState, availableProviders: string[]): string {
    // Epsilon-greedy exploration
    if (Math.random() < this.epsilon) {
      const random = availableProviders[Math.floor(Math.random() * availableProviders.length)];
      console.log(`[QLearning] Exploring: ${random}`);
      return random;
    }

    let bestProvider = availableProviders[0];
    let maxQ = -Infinity;

    for (const provider of availableProviders) {
      const key = this.getStateKey(state, { provider });
      const entry = this.qTable.get(key);
      const qValue = entry ? entry.qValue : 0; // Default Q-value 0

      if (qValue > maxQ) {
        maxQ = qValue;
        bestProvider = provider;
      }
    }

    console.log(`[QLearning] Exploiting: ${bestProvider} (Q: ${maxQ.toFixed(3)})`);
    return bestProvider;
  }

  /**
   * Update Q-value based on reward
   */
  async update(state: QState, action: QAction, reward: QReward): Promise<void> {
    if (!this.initialized) await this.initialize();

    const key = this.getStateKey(state, action);
    const currentEntry = this.qTable.get(key) || { qValue: 0, visits: 0 };

    // Calculate reward scalar (0-1 range ideally)
    // Higher is better
    const latencyScore = Math.max(0, 1 - reward.latency / 5000); // 5s = 0 score
    const successScore = reward.success ? 1 : 0;
    const qualityScore = reward.quality ?? 0.5; // Default neutral if unknown

    // Composite reward
    const r = (latencyScore * 0.3) + (successScore * 0.5) + (qualityScore * 0.2);

    // Q-Learning Update Rule
    // Q(s,a) = Q(s,a) + alpha * (r - Q(s,a))
    // Note: Simplified for bandit (no max Q(s', a'))
    const newQ = currentEntry.qValue + this.alpha * (r - currentEntry.qValue);

    this.qTable.set(key, {
      qValue: newQ,
      visits: currentEntry.visits + 1
    });

    await this.save();
  }

  private async save(): Promise<void> {
    try {
      const json = JSON.stringify(Object.fromEntries(this.qTable), null, 2);
      await fs.writeFile(this.storagePath, json, 'utf-8');
    } catch (error) {
      console.error('[QLearning] Failed to save state:', error);
    }
  }

  private async ensureDirectory(): Promise<void> {
    const dir = path.dirname(this.storagePath);
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }
}

// Singleton
let instance: QLearningOptimizer | null = null;

export function getQLearningOptimizer(): QLearningOptimizer {
  if (!instance) {
    instance = new QLearningOptimizer();
    instance.initialize().catch(console.error);
  }
  return instance;
}
