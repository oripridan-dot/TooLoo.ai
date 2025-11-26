// @version 2.1.259
import { EventEmitter } from 'events';
import { bus } from '../core/event-bus.js';

export interface Memory {
    id: string;
    content: string;
    timestamp: number;
    tags: string[];
    embedding?: number[];
    accessCount: number;
    lastAccessed: number;
    significance: number; // 0-1
    type: 'conversation' | 'fact' | 'rule' | 'code';
}

export interface Context {
    currentTask: string;
    recentTopics: string[];
    activeFiles: string[];
    userIntent?: string;
    activeContext?: any; // ContextBundle from SmartFS
}

export interface ResonanceResult {
    memory: Memory;
    score: number;
    reason: string;
}

export class ContextResonanceEngine extends EventEmitter {
    private memories: Map<string, Memory>;
    private readonly DECAY_FACTOR = 0.95;
    private readonly ACQUISITION_BOOST_THRESHOLD = 3; // Accesses before boost

    constructor() {
        super();
        this.memories = new Map();
        this.setupBusListeners();
    }

    private setupBusListeners() {
        bus.on('memory:ingest', (event: any) => {
            const data = event.payload;
            this.ingest(data.content, data.type, data.tags);
        });

        bus.on('memory:query', (event: any) => {
            const data = event.data;
            const results = this.retrieveResonantMemory(data.context, data.limit);
            this.bus.publish('memory:response', {
                requestId: data.requestId,
                results
            }, 'cortex');
        });
    }

    /**
     * Ingest a new memory into the system
     */
    public ingest(content: string, type: Memory['type'], tags: string[] = []): Memory {
        const id = crypto.randomUUID();
        const memory: Memory = {
            id,
            content,
            timestamp: Date.now(),
            tags,
            accessCount: 0,
            lastAccessed: Date.now(),
            significance: 0.5, // Default significance
            type
        };
        this.memories.set(id, memory);
        this.emit('memory:ingested', memory);
        return memory;
    }

    /**
     * Retrieve memories that resonate with the current context
     */
    public retrieveResonantMemory(context: Context, limit: number = 5): ResonanceResult[] {
        const results: ResonanceResult[] = [];

        for (const memory of this.memories.values()) {
            const score = this.calculateResonance(memory, context);
            if (score > 0.3) { // Minimum resonance threshold
                results.push({
                    memory,
                    score,
                    reason: this.explainResonance(memory, context)
                });
            }
        }

        // Sort by score descending
        return results
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    }

    /**
     * Calculate the resonance score between a memory and the current context
     */
    private calculateResonance(memory: Memory, context: Context): number {
        let score = 0;

        // 1. Topic Overlap (High weight)
        const topicMatches = memory.tags.filter(tag => context.recentTopics.includes(tag));
        score += topicMatches.length * 0.2;

        // 2. Recency (Decay)
        const hoursSinceAccess = (Date.now() - memory.lastAccessed) / (1000 * 60 * 60);
        const recencyScore = Math.max(0, 1 - (hoursSinceAccess * 0.01)); // Slow decay
        score += recencyScore * 0.1;

        // 3. Significance (Intrinsic weight)
        score += memory.significance * 0.3;

        // 4. Acquisition Boost (Frequency)
        const boost = this.calculateAcquisitionBoost(memory);
        score += boost * 0.2;

        // 5. Contextual Keyword Match (Simple string match for now)
        if (memory.content.includes(context.currentTask)) {
            score += 0.4;
        }

        // 6. Dependency Resonance (SmartFS)
        if (context.activeContext && context.activeContext.dependencies) {
             const deps = context.activeContext.dependencies;
             // If memory content mentions any dependency path
             for (const dep of deps) {
                 if (memory.content.includes(dep.path)) {
                     score += 0.3;
                     break;
                 }
             }
        }

        return Math.min(1, score); // Normalize to 0-1
    }

    private calculateAcquisitionBoost(memory: Memory): number {
        if (memory.accessCount > this.ACQUISITION_BOOST_THRESHOLD) {
            return Math.min(1, Math.log(memory.accessCount) * 0.1);
        }
        return 0;
    }

    private explainResonance(memory: Memory, context: Context): string {
        const reasons: string[] = [];
        if (memory.content.includes(context.currentTask)) reasons.push('Matches current task');
        const topicMatches = memory.tags.filter(tag => context.recentTopics.includes(tag));
        if (topicMatches.length > 0) reasons.push(`Topic match: ${topicMatches.join(', ')}`);
        if (memory.significance > 0.8) reasons.push('High significance');
        return reasons.join('; ') || 'General relevance';
    }

    /**
     * Mark a memory as accessed and update its stats
     */
    public accessMemory(id: string): void {
        const memory = this.memories.get(id);
        if (memory) {
            memory.accessCount++;
            memory.lastAccessed = Date.now();
            // Reinforce significance on frequent access
            if (memory.accessCount % 5 === 0) {
                memory.significance = Math.min(1, memory.significance + 0.05);
            }
            this.memories.set(id, memory);
            this.emit('memory:accessed', memory);
        }
    }
}
