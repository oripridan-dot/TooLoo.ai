// @version 2.2.157
/**
 * MemoryAutoFiller
 * Automatically fills short-term and long-term memory boxes with relevant content.
 * Extracts context from cortex processing for quick recap display.
 *
 * @version 2.2.121
 */

import { bus } from '../../core/event-bus.js';
import { Hippocampus } from './hippocampus.js';

export interface MemoryState {
  shortTerm: string;
  longTerm: string;
  lastUpdated: Date;
  contextScore: number;
}

export class MemoryAutoFiller {
  private memoryStates: Map<string, MemoryState> = new Map();
  private hippocampus: Hippocampus;
  private recentEvents: Array<{
    type: string;
    content: string;
    timestamp: Date;
  }> = [];
  private readonly MAX_RECENT_EVENTS = 50;

  constructor(hippocampus: Hippocampus) {
    this.hippocampus = hippocampus;
    this.setupListeners();
  }

  /**
   * Get memory state for session, creating if needed
   */
  private getOrCreateMemoryState(sessionId: string): MemoryState {
    if (!this.memoryStates.has(sessionId)) {
      this.memoryStates.set(sessionId, {
        shortTerm: '',
        longTerm: '',
        lastUpdated: new Date(),
        contextScore: 0,
      });
    }
    return this.memoryStates.get(sessionId)!;
  }

  /**
   * Auto-fill short-term memory from recent context
   */
  private async generateShortTermMemory(sessionId: string): Promise<string> {
    const recentEvents = this.recentEvents.slice(-10);

    if (recentEvents.length === 0) {
      return 'Session started. Awaiting input...';
    }

    // Group events by type
    const eventsByType: Record<string, string[]> = {};
    for (const ev of recentEvents) {
      if (!eventsByType[ev.type]) {
        eventsByType[ev.type] = [];
      }
      eventsByType[ev.type]?.push(ev.content);
    }

    // Build short-term summary
    const lines: string[] = [];

    if (eventsByType['goal']) {
      lines.push(`📌 Current Goal: ${eventsByType['goal'][0]}`);
    }

    if (eventsByType['action']) {
      lines.push(`⚙️ Recent Actions: ${eventsByType['action'].slice(0, 2).join(', ')}`);
    }

    if (eventsByType['observation']) {
      lines.push(`👁️ Observations: ${eventsByType['observation'][0]}`);
    }

    if (eventsByType['decision']) {
      lines.push(`🎯 Latest Decision: ${eventsByType['decision'][0]}`);
    }

    if (eventsByType['error']) {
      lines.push(`⚠️ Issues: ${eventsByType['error'][0]}`);
    }

    return lines.length > 0 ? lines.join('\n') : 'Processing...';
  }

  /**
   * Auto-fill long-term memory from persisted knowledge
   */
  private async generateLongTermMemory(): Promise<string> {
    try {
      // Get summary from hippocampus vector store
      const recent = await this.hippocampus.vectorStore.search(
        'session summary context learning',
        3
      );

      if (recent && recent.length > 0) {
        return recent
          .map(
            (item: Record<string, unknown>) =>
              (item['content'] as string) || (item['text'] as string) || ''
          )
          .join('\n\n');
      }

      return 'No prior context available. Building memory...';
    } catch (e) {
      console.error('[MemoryAutoFiller] Error fetching long-term memory:', e);
      return 'Memory retrieval pending...';
    }
  }

  /**
   * Update memory state automatically
   */
  async updateMemoryState(sessionId: string) {
    const state = this.getOrCreateMemoryState(sessionId);

    state.shortTerm = await this.generateShortTermMemory(sessionId);
    state.longTerm = await this.generateLongTermMemory();
    state.lastUpdated = new Date();
    state.contextScore = Math.min(1.0, this.recentEvents.length / 20);

    this.publishMemoryUpdate(sessionId);
  }

  /**
   * Get memory state
   */
  getMemoryState(sessionId: string): MemoryState {
    return this.getOrCreateMemoryState(sessionId);
  }

  /**
   * Get serializable memory for frontend
   */
  getSerializableMemory(sessionId: string) {
    const state = this.getOrCreateMemoryState(sessionId);
    return {
      shortTerm: state.shortTerm,
      longTerm: state.longTerm,
      lastUpdated: state.lastUpdated.toISOString(),
      contextScore: state.contextScore,
    };
  }

  /**
   * Populate memory from session highlights
   */
  populateFromHighlights(
    sessionId: string,
    highlights: Array<{ icon?: string; content?: string }>
  ) {
    console.log(
      `[MemoryAutoFiller] Populating memory for ${sessionId} with ${highlights?.length || 0} highlights`
    );
    const state = this.getOrCreateMemoryState(sessionId);

    if (!highlights || highlights.length === 0) {
      state.shortTerm = 'Session started. Awaiting input...';
      console.log(`[MemoryAutoFiller] No highlights, setting default`);
      return;
    }

    // Build short-term memory from recent highlights
    const lines: string[] = [];
    const recent = highlights.slice(0, 5).reverse(); // Most recent first

    for (const highlight of recent) {
      const icon = highlight.icon || '•';
      const content = highlight.content || '';
      lines.push(`${icon} ${content}`);
    }

    state.shortTerm = lines.join('\n');
    state.lastUpdated = new Date();
    state.contextScore = Math.min(1.0, highlights.length / 10);
    console.log(`[MemoryAutoFiller] Memory populated:`, state.shortTerm);
  }

  /**
   * Record event for memory building
   */
  private recordEvent(type: string, content: string) {
    this.recentEvents.push({
      type,
      content,
      timestamp: new Date(),
    });

    if (this.recentEvents.length > this.MAX_RECENT_EVENTS) {
      this.recentEvents.shift();
    }
  }

  /**
   * Setup event listeners to build memory from cortex events
   */
  private setupListeners() {
    // Goals and plans
    bus.on('planning:intent', (event) => {
      if (event.payload.goal) {
        this.recordEvent('goal', event.payload.goal);
      }
    });

    // Actions
    bus.on('motor:execute', (event) => {
      const action = event.payload.action || event.payload.type;
      if (action) {
        this.recordEvent('action', action);
      }
    });

    // Observations and context
    bus.on('sensory:perception', (event) => {
      if (event.payload.content) {
        this.recordEvent('observation', event.payload.content);
      }
    });

    // Decisions
    bus.on('cortex:decision', (event) => {
      if (event.payload.decision) {
        this.recordEvent('decision', event.payload.decision);
      }
    });

    // Errors
    bus.on('cortex:error', (event) => {
      if (event.payload.error) {
        this.recordEvent('error', event.payload.error);
      }
    });

    // Insights
    bus.on('cortex:insight', (event) => {
      if (event.payload.insight) {
        this.recordEvent('insight', event.payload.insight);
      }
    });

    // Trigger memory updates on significant events
    bus.on('planning:plan:completed', async (event) => {
      const sessionId = event.payload.sessionId || 'default';
      await this.updateMemoryState(sessionId);
    });

    bus.on('cortex:decision', async (event) => {
      const sessionId = event.payload.sessionId || 'default';
      // Debounce - only update periodically
      if (Math.random() < 0.3) {
        await this.updateMemoryState(sessionId);
      }
    });
  }

  /**
   * Publish memory update to event bus
   */
  private publishMemoryUpdate(sessionId: string) {
    bus.publish('cortex', 'memory:auto_filled', {
      sessionId,
      memory: this.getSerializableMemory(sessionId),
    });
  }

  /**
   * Force immediate update (useful for testing or explicit trigger)
   */
  async forceUpdate(sessionId: string) {
    await this.updateMemoryState(sessionId);
  }

  /**
   * Clear session memory
   */
  clearSession(sessionId: string) {
    this.memoryStates.delete(sessionId);
    this.recentEvents = [];
  }
}
