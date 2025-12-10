// @version 3.3.420
import { VectorStore } from './memory/vector-store.js';
import KnowledgeGraphEngine from './memory/knowledge-graph-engine.js';
import { bus } from '../core/event-bus.js';

// ============================================================================
// INITIATIVE STATE - Phase 4 of "Sentient Partner" Protocol
// ============================================================================

export type InitiativeMode = 'director' | 'partner' | 'agent';

export interface InitiativeState {
  mode: InitiativeMode;
  lastUserAction: number;
  idleTime: number;
  agentTask: string | null;
  autoSuggestion: boolean;
}

/**
 * Initiative State Constants
 * - DIRECTOR: User leads, Tooloo fixes errors silently
 * - PARTNER: User paused >10s, Tooloo offers suggestions
 * - AGENT: User handed over control, Tooloo executes autonomously
 */
export const INITIATIVE_MODES = {
  DIRECTOR: 'director' as InitiativeMode,
  PARTNER: 'partner' as InitiativeMode,
  AGENT: 'agent' as InitiativeMode,
};

const IDLE_THRESHOLD_MS = 10000; // 10 seconds

/**
 * ContextManager
 * Retrieves relevant history by vector similarity AND causal links in the Knowledge Graph.
 */
export class ContextManager {
  constructor(
    private vectorStore: VectorStore,
    private knowledgeGraph: KnowledgeGraphEngine
  ) {}

  /**
   * Retrieves context for a given query.
   * @param query The user's query.
   * @param limit Max number of context items.
   */
  async getContext(query: string, limit: number = 5): Promise<string[]> {
    const vectorContext = await this.getVectorContext(query, limit);
    const graphContext = await this.getGraphContext(query, limit);

    // Combine and deduplicate
    return [...new Set([...vectorContext, ...graphContext])];
  }

  /**
   * Retrieves context based on vector similarity (Semantic Search).
   */
  private async getVectorContext(query: string, limit: number): Promise<string[]> {
    try {
      const results = await this.vectorStore.search(query, limit);
      return results.map((r) => r.doc.text);
    } catch (error) {
      console.warn('Vector search failed:', error);
      return [];
    }
  }

  /**
   * Retrieves context based on causal links in the Knowledge Graph.
   * Performs entity extraction and graph traversal to find related knowledge.
   */
  private async getGraphContext(query: string, limit: number): Promise<string[]> {
    const context: string[] = [];

    try {
      // 1. Extract entities/keywords from the query
      const entities = this.extractEntities(query);
      console.log(`[ContextManager] Extracted entities: ${entities.join(', ')}`);

      // 2. Find matching goals
      const goalStats = this.knowledgeGraph.getGoalStatistics();
      const matchedGoals: Array<{ goal: string; score: number; stats: any }> = [];

      for (const [goalId, stats] of goalStats) {
        const matchScore = this.calculateEntityMatchScore(goalId, entities);
        if (matchScore > 0.3) {
          matchedGoals.push({ goal: goalId, score: matchScore, stats });
        }
      }

      // Sort by match score and take top matches
      matchedGoals.sort((a, b) => b.score - a.score);
      const topGoals = matchedGoals.slice(0, Math.min(limit, 3));

      // 3. Build context from matched goals
      for (const matched of topGoals) {
        const summary = this.knowledgeGraph.getGoalPerformanceSummary(matched.goal);

        // Add goal context
        context.push(
          `Goal "${matched.goal}": ${summary.totalAttempts} attempts, ` +
            `${(summary.avgSuccessRate * 100).toFixed(1)}% success rate`
        );

        // Add best provider context
        const bestProvider = summary.providers[0];
        if (bestProvider && bestProvider.attempts > 0) {
          context.push(
            `Best provider for ${matched.goal}: ${bestProvider.provider} ` +
              `(${(bestProvider.successRate * 100).toFixed(1)}% success, ` +
              `${bestProvider.avgTime.toFixed(0)}ms avg)`
          );
        }
      }

      // 4. Get provider recommendations if query implies a task
      const taskKeywords = ['generate', 'create', 'analyze', 'code', 'write', 'help'];
      const isTaskQuery = taskKeywords.some((kw) => query.toLowerCase().includes(kw));

      if (isTaskQuery && topGoals.length > 0 && topGoals[0]) {
        const recommendations = this.knowledgeGraph.getProviderRecommendations(topGoals[0].goal);
        if (recommendations.length > 0 && recommendations[0]) {
          const topRec = recommendations[0];
          context.push(
            `Recommended provider: ${topRec.provider} ` +
              `(confidence: ${(topRec.confidence * 100).toFixed(0)}%, ` +
              `quality: ${(topRec.metrics.avgQuality * 100).toFixed(0)}%)`
          );
        }
      }

      // 5. Add graph statistics for transparency
      const graphStats = this.knowledgeGraph.getGraphStatistics();
      if (graphStats.learningHistory > 0) {
        context.push(
          `Knowledge base: ${graphStats.nodes.tasks} tasks, ` +
            `${graphStats.nodes.providers} providers, ` +
            `${graphStats.learningHistory} learning entries`
        );
      }
    } catch (error) {
      console.warn('[ContextManager] Graph context retrieval failed:', error);
    }

    return context.slice(0, limit);
  }

  /**
   * Extract entities/keywords from a query for graph matching.
   */
  private extractEntities(query: string): string[] {
    // Normalize and tokenize
    const normalized = query
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const words = normalized.split(' ');

    // Common stop words to filter out
    const stopWords = new Set([
      'a',
      'an',
      'the',
      'is',
      'are',
      'was',
      'were',
      'be',
      'been',
      'being',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'could',
      'should',
      'may',
      'might',
      'can',
      'this',
      'that',
      'these',
      'those',
      'i',
      'me',
      'my',
      'we',
      'our',
      'you',
      'your',
      'it',
      'its',
      'what',
      'which',
      'who',
      'when',
      'where',
      'why',
      'how',
      'all',
      'each',
      'every',
      'both',
      'few',
      'more',
      'most',
      'other',
      'some',
      'such',
      'no',
      'not',
      'only',
      'same',
      'so',
      'than',
      'too',
      'very',
      'just',
      'and',
      'but',
      'or',
      'if',
      'then',
      'else',
      'for',
      'of',
      'to',
      'in',
      'on',
      'at',
      'by',
      'from',
      'up',
      'down',
      'with',
      'about',
      'into',
      'through',
    ]);

    // Filter meaningful words (2+ chars, not stop words)
    const entities = words.filter((word) => word.length >= 2 && !stopWords.has(word));

    // Deduplicate
    return [...new Set(entities)];
  }

  /**
   * Calculate how well a goal matches the extracted entities.
   */
  private calculateEntityMatchScore(goalId: string, entities: string[]): number {
    if (entities.length === 0) return 0;

    const goalLower = goalId.toLowerCase();
    let matchCount = 0;

    for (const entity of entities) {
      if (goalLower.includes(entity) || entity.includes(goalLower)) {
        matchCount++;
      }
    }

    // Partial match scoring
    return matchCount / entities.length;
  }

  /**
   * Get enriched context with both vector and graph data merged intelligently.
   */
  async getEnrichedContext(
    query: string,
    options: {
      vectorLimit?: number;
      graphLimit?: number;
      includeRecommendations?: boolean;
    } = {}
  ): Promise<{
    semantic: string[];
    graph: string[];
    recommendations: Array<{ provider: string; score: number; reason: string }>;
    metadata: { vectorHits: number; graphHits: number; confidence: number };
  }> {
    const vectorLimit = options.vectorLimit ?? 5;
    const graphLimit = options.graphLimit ?? 5;

    const semantic = await this.getVectorContext(query, vectorLimit);
    const graph = await this.getGraphContext(query, graphLimit);

    const recommendations: Array<{ provider: string; score: number; reason: string }> = [];

    if (options.includeRecommendations) {
      const entities = this.extractEntities(query);
      const goalStats = this.knowledgeGraph.getGoalStatistics();

      // Find best matching goal
      let bestGoal = '';
      let bestScore = 0;
      for (const [goalId] of goalStats) {
        const score = this.calculateEntityMatchScore(goalId, entities);
        if (score > bestScore) {
          bestScore = score;
          bestGoal = goalId;
        }
      }

      if (bestGoal) {
        const recs = this.knowledgeGraph.getProviderRecommendations(bestGoal);
        for (const rec of recs.slice(0, 3)) {
          recommendations.push({
            provider: rec.provider,
            score: rec.score,
            reason: `Best for ${bestGoal}: ${(rec.metrics.successRate * 100).toFixed(0)}% success rate`,
          });
        }
      }
    }

    // Calculate confidence based on context richness
    const confidence = Math.min(1, (semantic.length + graph.length) / 10);

    return {
      semantic,
      graph,
      recommendations,
      metadata: {
        vectorHits: semantic.length,
        graphHits: graph.length,
        confidence,
      },
    };
  }
}

// ============================================================================
// INITIATIVE MANAGER - Tracks workflow state for "Reversed" workflow
// ============================================================================

/**
 * InitiativeManager - Manages the three-state workflow
 *
 * States:
 * - Director Mode (User Leads): User is actively typing/designing.
 *   Tooloo stays silent and only fixes errors automatically.
 * - Partner Mode (Collaborative): User has paused for >10 seconds.
 *   Tooloo offers suggestions without being intrusive.
 * - Agent Mode (Tooloo Leads): User explicitly hands over control.
 *   Tooloo executes autonomously and reports progress.
 *
 * Wiring:
 * - In Director Mode: Chat input is maximized, Tooloo background processes
 * - In Partner Mode: Suggestion panel appears, soft prompts
 * - In Agent Mode: Terminal/Logs are maximized, Tooloo reports progress
 */
export class InitiativeManager {
  private static instance: InitiativeManager;

  private state: InitiativeState = {
    mode: INITIATIVE_MODES.DIRECTOR,
    lastUserAction: Date.now(),
    idleTime: 0,
    agentTask: null,
    autoSuggestion: true,
  };

  private idleCheckInterval: NodeJS.Timeout | null = null;
  private listeners: Array<(state: InitiativeState) => void> = [];

  private constructor() {
    this.startIdleTracking();
    this.setupEventListeners();
    console.log('[InitiativeManager] Initialized in Director mode');
  }

  static getInstance(): InitiativeManager {
    if (!InitiativeManager.instance) {
      InitiativeManager.instance = new InitiativeManager();
    }
    return InitiativeManager.instance;
  }

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  getState(): InitiativeState {
    return { ...this.state };
  }

  getMode(): InitiativeMode {
    return this.state.mode;
  }

  isDirector(): boolean {
    return this.state.mode === INITIATIVE_MODES.DIRECTOR;
  }

  isPartner(): boolean {
    return this.state.mode === INITIATIVE_MODES.PARTNER;
  }

  isAgent(): boolean {
    return this.state.mode === INITIATIVE_MODES.AGENT;
  }

  // ============================================================================
  // MODE TRANSITIONS
  // ============================================================================

  private setMode(mode: InitiativeMode, reason: string): void {
    if (this.state.mode === mode) return;

    const previousMode = this.state.mode;
    this.state.mode = mode;

    console.log(`[InitiativeManager] Mode: ${previousMode} → ${mode} (${reason})`);

    // Emit mode change event
    bus.publish('initiative', 'initiative:mode_changed', {
      previousMode,
      newMode: mode,
      reason,
      timestamp: Date.now(),
    });

    // Notify listeners
    this.notifyListeners();

    // Update UI based on mode
    this.updateUIForMode(mode);
  }

  private updateUIForMode(mode: InitiativeMode): void {
    // Emit events for UI components to react
    switch (mode) {
      case INITIATIVE_MODES.DIRECTOR:
        bus.publish('ui', 'ui:layout_hint', {
          chatInput: 'maximized',
          suggestions: 'hidden',
          terminal: 'minimized',
          mood: 'focused',
        });
        break;

      case INITIATIVE_MODES.PARTNER:
        bus.publish('ui', 'ui:layout_hint', {
          chatInput: 'normal',
          suggestions: 'visible',
          terminal: 'normal',
          mood: 'calm',
        });
        // Trigger suggestion engine
        bus.publish('suggestions', 'suggestion:request_analysis', {
          trigger: 'partner_mode',
        });
        break;

      case INITIATIVE_MODES.AGENT:
        bus.publish('ui', 'ui:layout_hint', {
          chatInput: 'minimized',
          suggestions: 'hidden',
          terminal: 'maximized',
          mood: 'thinking',
        });
        break;
    }
  }

  // ============================================================================
  // USER ACTION TRACKING
  // ============================================================================

  recordUserAction(action: string, metadata?: Record<string, unknown>): void {
    this.state.lastUserAction = Date.now();
    this.state.idleTime = 0;

    // If in Partner or Agent mode, transition to Director
    if (this.state.mode !== INITIATIVE_MODES.DIRECTOR) {
      // Exception: Don't leave Agent mode on minor actions
      if (this.state.mode === INITIATIVE_MODES.AGENT) {
        const majorActions = ['typing', 'editing', 'command', 'design_request'];
        if (!majorActions.includes(action)) {
          return; // Stay in Agent mode
        }
      }

      this.setMode(INITIATIVE_MODES.DIRECTOR, `user_action: ${action}`);
    }

    // Emit for other systems
    bus.publish('user', 'user:action', {
      action,
      timestamp: Date.now(),
      metadata,
    });
  }

  // ============================================================================
  // IDLE TRACKING
  // ============================================================================

  private startIdleTracking(): void {
    this.idleCheckInterval = setInterval(() => {
      const now = Date.now();
      this.state.idleTime = now - this.state.lastUserAction;

      // Auto-transition to Partner mode after idle threshold
      if (
        this.state.mode === INITIATIVE_MODES.DIRECTOR &&
        this.state.idleTime >= IDLE_THRESHOLD_MS &&
        this.state.autoSuggestion
      ) {
        this.setMode(INITIATIVE_MODES.PARTNER, 'user_idle');
      }
    }, 1000);
  }

  stopIdleTracking(): void {
    if (this.idleCheckInterval) {
      clearInterval(this.idleCheckInterval);
      this.idleCheckInterval = null;
    }
  }

  // ============================================================================
  // AGENT MODE MANAGEMENT
  // ============================================================================

  /**
   * Enter Agent mode - User hands over control to Tooloo
   * @param task Description of what Tooloo should accomplish
   */
  enterAgentMode(task: string): void {
    this.state.agentTask = task;
    this.setMode(INITIATIVE_MODES.AGENT, `user_handoff: ${task}`);

    bus.publish('agent', 'agent:control_granted', {
      task,
      timestamp: Date.now(),
    });
  }

  /**
   * Exit Agent mode - Tooloo returns control to user
   * @param reason Why agent mode is ending
   */
  exitAgentMode(reason: string = 'task_complete'): void {
    const task = this.state.agentTask;
    this.state.agentTask = null;
    this.setMode(INITIATIVE_MODES.DIRECTOR, `agent_exit: ${reason}`);

    bus.publish('agent', 'agent:control_returned', {
      task,
      reason,
      timestamp: Date.now(),
    });
  }

  /**
   * Report progress during Agent mode
   */
  reportAgentProgress(progress: { step: string; percentage: number; details?: string }): void {
    if (this.state.mode !== INITIATIVE_MODES.AGENT) return;

    bus.publish('agent', 'agent:progress', {
      task: this.state.agentTask,
      ...progress,
      timestamp: Date.now(),
    });
  }

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  setAutoSuggestion(enabled: boolean): void {
    this.state.autoSuggestion = enabled;
    console.log(`[InitiativeManager] Auto-suggestion ${enabled ? 'enabled' : 'disabled'}`);
  }

  // ============================================================================
  // EVENT LISTENERS
  // ============================================================================

  private setupEventListeners(): void {
    // Listen for explicit mode change requests
    bus.on('initiative:request_mode', (event) => {
      const { mode, reason } = event.payload as { mode: InitiativeMode; reason: string };
      if (Object.values(INITIATIVE_MODES).includes(mode)) {
        this.setMode(mode, reason || 'external_request');
      }
    });

    // Listen for agent handoff requests
    bus.on('user:handoff_to_agent', (event) => {
      const { task } = event.payload as { task: string };
      if (task) {
        this.enterAgentMode(task);
      }
    });
  }

  // ============================================================================
  // SUBSCRIPTION
  // ============================================================================

  subscribe(callback: (state: InitiativeState) => void): () => void {
    this.listeners.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    const state = this.getState();
    for (const listener of this.listeners) {
      try {
        listener(state);
      } catch (error) {
        console.error('[InitiativeManager] Listener error:', error);
      }
    }
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  destroy(): void {
    this.stopIdleTracking();
    this.listeners = [];
  }
}

// Export singleton
export const initiativeManager = InitiativeManager.getInstance();
