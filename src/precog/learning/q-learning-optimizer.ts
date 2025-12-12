// @version 3.3.532
import fs from 'fs/promises';
import path from 'path';

export interface QState {
  taskType: string; // 'code', 'creative', 'general', etc.
  userSegment: string; // 'developer', 'creative', 'analyst', 'general'
  userId?: string; // V3.3.532: Optional user ID for personalized routing
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

  // V3.3.532: State key now includes userId for personalized routing
  private getStateKey(state: QState, action: QAction): string {
    const userPart = state.userId || 'global';
    return `${userPart}:${state.taskType}:${state.userSegment}:${action.provider}`;
  }

  /**
   * Get the best provider for the current state
   * V3.3.532: Falls back to global Q-values if user has no history
   */
  getOptimalProvider(state: QState, availableProviders: string[]): string {
    // Epsilon-greedy exploration
    if (Math.random() < this.epsilon) {
      const randomIdx = Math.floor(Math.random() * availableProviders.length);
      const random = availableProviders[randomIdx] ?? availableProviders[0] ?? 'deepseek';
      console.log(`[QLearning] Exploring: ${random}`);
      return random;
    }

    let bestProvider = availableProviders[0] ?? 'deepseek';
    let maxQ = -Infinity;

    for (const provider of availableProviders) {
      // V3.3.532: Try user-specific Q-value first, then fall back to global
      const userKey = this.getStateKey(state, { provider });
      const globalKey = this.getStateKey({ ...state, userId: undefined }, { provider });
      
      const userEntry = this.qTable.get(userKey);
      const globalEntry = this.qTable.get(globalKey);
      
      // Prefer user-specific if it has enough data, otherwise blend with global
      let qValue: number;
      if (userEntry && userEntry.visits >= 3) {
        qValue = userEntry.qValue;
      } else if (userEntry && globalEntry) {
        // Blend: weight user more as visits increase
        const userWeight = Math.min(userEntry.visits / 5, 0.8);
        qValue = userEntry.qValue * userWeight + globalEntry.qValue * (1 - userWeight);
      } else if (userEntry) {
        qValue = userEntry.qValue;
      } else if (globalEntry) {
        qValue = globalEntry.qValue;
      } else {
        qValue = 0;
      }

      if (qValue > maxQ) {
        maxQ = qValue;
        bestProvider = provider;
      }
    }

    const userInfo = state.userId ? ` [user:${state.userId.substring(0, 8)}]` : ' [global]';
    console.log(`[QLearning] Exploiting: ${bestProvider} (Q: ${maxQ.toFixed(3)})${userInfo}`);
    return bestProvider;
  }

  /**
   * Update Q-value based on reward
   * V3.3.532: Updates both user-specific and global entries
   */
  async update(state: QState, action: QAction, reward: QReward): Promise<void> {
    if (!this.initialized) await this.initialize();

    // Update user-specific entry
    const userKey = this.getStateKey(state, action);
    await this.updateEntry(userKey, reward);
    
    // Also update global entry for cold-start users
    if (state.userId) {
      const globalKey = this.getStateKey({ ...state, userId: undefined }, action);
      await this.updateEntry(globalKey, reward);
    }

    await this.save();
  }
  
  /**
   * V3.3.532: Internal update for a single Q-table entry
   */
  private updateEntry(key: string, reward: QReward): void {
    const currentEntry = this.qTable.get(key) || { qValue: 0, visits: 0 };

    // Calculate reward scalar (0-1 range ideally)
    // Higher is better
    const latencyScore = Math.max(0, 1 - reward.latency / 5000); // 5s = 0 score
    const successScore = reward.success ? 1 : 0;
    const qualityScore = reward.quality ?? 0.5; // Default neutral if unknown

    // Composite reward
    const r = latencyScore * 0.3 + successScore * 0.5 + qualityScore * 0.2;

    // Q-Learning Update Rule
    // Q(s,a) = Q(s,a) + alpha * (r - Q(s,a))
    // Note: Simplified for bandit (no max Q(s', a'))
    const newQ = currentEntry.qValue + this.alpha * (r - currentEntry.qValue);

    this.qTable.set(key, {
      qValue: newQ,
      visits: currentEntry.visits + 1,
    });
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
