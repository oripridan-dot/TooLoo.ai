// @version 3.3.210
/**
 * Knowledge Boost System
 * 
 * Accelerates TooLoo's learning through targeted knowledge reinforcement,
 * active recall exercises, and strategic learning interventions.
 * 
 * Key capabilities:
 * - Knowledge velocity acceleration
 * - Retention reinforcement through spaced repetition
 * - Transfer efficiency boosting across domains
 * - Targeted knowledge gap filling
 * - Active learning cycles
 * 
 * @module cortex/learning/knowledge-boost
 */

import { bus } from '../../core/event-bus.js';
import fs from 'fs-extra';
import path from 'path';

// ============================================================================
// TYPES
// ============================================================================

export type BoostType = 
  | 'velocity'      // Increase learning speed
  | 'retention'     // Improve knowledge retention
  | 'transfer'      // Enhance cross-domain transfer
  | 'depth'         // Deepen understanding
  | 'breadth'       // Expand coverage
  | 'consolidation' // Consolidate fragmented knowledge
  | 'repair';       // Fix knowledge gaps/errors

export interface KnowledgeBoostConfig {
  type: BoostType;
  targetDomain?: string;
  intensity: number; // 0.1 to 2.0
  duration: number;  // ms
  autoActivate: boolean;
  triggerThreshold?: number;
}

export interface BoostSession {
  id: string;
  type: BoostType;
  targetDomain?: string;
  intensity: number;
  startedAt: Date;
  expiresAt: Date;
  exercisesCompleted: number;
  knowledgeGained: number;
  retentionImproved: number;
  status: 'active' | 'completed' | 'expired' | 'cancelled';
}

export interface KnowledgeNode {
  id: string;
  concept: string;
  domain: string;
  strength: number; // 0-1
  lastReinforced: Date;
  reinforcementCount: number;
  connections: string[]; // IDs of related nodes
  metadata: Record<string, unknown>;
}

export interface LearningExercise {
  id: string;
  type: 'recall' | 'application' | 'synthesis' | 'transfer' | 'correction';
  prompt: string;
  expectedConcepts: string[];
  difficulty: number; // 0-1
  targetNodes: string[];
  completedAt?: Date;
  score?: number;
}

export interface BoostMetrics {
  totalBoostSessions: number;
  activeBoostSessions: number;
  totalKnowledgeGained: number;
  averageRetentionImprovement: number;
  averageTransferEfficiency: number;
  velocityMultiplier: number;
  knowledgeNodeCount: number;
  weakestDomains: string[];
  strongestDomains: string[];
  nextScheduledBoost?: Date;
}

export interface BoostStrategy {
  id: string;
  name: string;
  description: string;
  applicableTypes: BoostType[];
  executionSteps: string[];
  expectedGain: number;
  effort: number;
  prerequisites?: string[];
}

// ============================================================================
// KNOWLEDGE BOOST ENGINE
// ============================================================================

export class KnowledgeBoostEngine {
  private static instance: KnowledgeBoostEngine;
  
  private knowledgeGraph: Map<string, KnowledgeNode> = new Map();
  private activeSessions: Map<string, BoostSession> = new Map();
  private completedSessions: BoostSession[] = [];
  private strategies: Map<string, BoostStrategy> = new Map();
  private pendingExercises: LearningExercise[] = [];
  
  private dataDir: string;
  private stateFile: string;
  
  private boostIntervalId?: NodeJS.Timeout;
  private readonly BOOST_CHECK_INTERVAL = 60000; // 1 minute
  private readonly MAX_COMPLETED_SESSIONS = 500;
  private readonly RETENTION_DECAY_RATE = 0.001; // Per hour
  
  private metrics: BoostMetrics = {
    totalBoostSessions: 0,
    activeBoostSessions: 0,
    totalKnowledgeGained: 0,
    averageRetentionImprovement: 0,
    averageTransferEfficiency: 0,
    velocityMultiplier: 1.0,
    knowledgeNodeCount: 0,
    weakestDomains: [],
    strongestDomains: [],
  };
  
  private constructor() {
    this.dataDir = path.join(process.cwd(), 'data', 'knowledge-boost');
    this.stateFile = path.join(this.dataDir, 'knowledge-boost-state.json');
    
    this.initializeStrategies();
    this.setupListeners();
  }
  
  static getInstance(): KnowledgeBoostEngine {
    if (!KnowledgeBoostEngine.instance) {
      KnowledgeBoostEngine.instance = new KnowledgeBoostEngine();
    }
    return KnowledgeBoostEngine.instance;
  }
  
  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  
  async initialize(): Promise<void> {
    console.log('[KnowledgeBoostEngine] Initializing knowledge boost system...');
    
    await fs.ensureDir(this.dataDir);
    await this.loadState();
    
    // Start the boost monitoring loop
    this.startBoostLoop();
    
    // Seed initial knowledge nodes from domains
    this.seedKnowledgeGraph();
    
    bus.publish('cortex', 'knowledge_boost:initialized', {
      nodeCount: this.knowledgeGraph.size,
      activeBoosts: this.activeSessions.size,
      metrics: this.metrics,
      timestamp: new Date().toISOString(),
    });
    
    console.log('[KnowledgeBoostEngine] Ready - Knowledge boost system active');
  }
  
  private seedKnowledgeGraph(): void {
    // Seed with TooLoo's core knowledge domains
    const coreDomains = [
      { domain: 'code', concepts: ['typescript', 'javascript', 'python', 'react', 'node', 'api', 'database'] },
      { domain: 'reasoning', concepts: ['logic', 'analysis', 'synthesis', 'evaluation', 'inference'] },
      { domain: 'creative', concepts: ['ideation', 'brainstorming', 'storytelling', 'design', 'innovation'] },
      { domain: 'system', concepts: ['architecture', 'integration', 'orchestration', 'monitoring', 'optimization'] },
      { domain: 'learning', concepts: ['patterns', 'adaptation', 'reinforcement', 'transfer', 'generalization'] },
      { domain: 'execution', concepts: ['processes', 'commands', 'artifacts', 'deployment', 'automation'] },
    ];
    
    for (const { domain, concepts } of coreDomains) {
      for (const concept of concepts) {
        const nodeId = `${domain}:${concept}`;
        if (!this.knowledgeGraph.has(nodeId)) {
          this.knowledgeGraph.set(nodeId, {
            id: nodeId,
            concept,
            domain,
            strength: 0.5, // Start at medium
            lastReinforced: new Date(),
            reinforcementCount: 0,
            connections: concepts.filter(c => c !== concept).map(c => `${domain}:${c}`),
            metadata: {},
          });
        }
      }
    }
    
    this.updateMetrics();
  }
  
  private initializeStrategies(): void {
    const strategies: BoostStrategy[] = [
      {
        id: 'spaced-repetition',
        name: 'Spaced Repetition',
        description: 'Reinforce knowledge at optimal intervals for long-term retention',
        applicableTypes: ['retention', 'consolidation'],
        executionSteps: [
          'identify_weak_nodes',
          'calculate_optimal_intervals',
          'generate_recall_exercises',
          'evaluate_responses',
          'adjust_intervals',
        ],
        expectedGain: 0.15,
        effort: 0.3,
      },
      {
        id: 'knowledge-linking',
        name: 'Knowledge Linking',
        description: 'Create and strengthen connections between related concepts',
        applicableTypes: ['transfer', 'depth'],
        executionSteps: [
          'analyze_domain_graph',
          'identify_missing_links',
          'generate_linking_exercises',
          'validate_connections',
          'update_graph',
        ],
        expectedGain: 0.2,
        effort: 0.5,
      },
      {
        id: 'gap-filling',
        name: 'Gap Filling',
        description: 'Identify and fill knowledge gaps through targeted learning',
        applicableTypes: ['breadth', 'repair'],
        executionSteps: [
          'map_knowledge_coverage',
          'identify_gaps',
          'prioritize_gaps',
          'generate_fill_exercises',
          'validate_coverage',
        ],
        expectedGain: 0.25,
        effort: 0.6,
      },
      {
        id: 'intensive-practice',
        name: 'Intensive Practice',
        description: 'Rapid-fire exercises to boost learning velocity',
        applicableTypes: ['velocity'],
        executionSteps: [
          'select_focus_domain',
          'generate_exercise_batch',
          'rapid_evaluation_cycle',
          'feedback_integration',
          'velocity_measurement',
        ],
        expectedGain: 0.3,
        effort: 0.7,
      },
      {
        id: 'cross-domain-transfer',
        name: 'Cross-Domain Transfer',
        description: 'Apply knowledge from one domain to solve problems in another',
        applicableTypes: ['transfer', 'depth'],
        executionSteps: [
          'identify_source_domains',
          'map_transferable_concepts',
          'generate_transfer_exercises',
          'evaluate_transfer_success',
          'reinforce_connections',
        ],
        expectedGain: 0.35,
        effort: 0.8,
      },
      {
        id: 'consolidation-sleep',
        name: 'Consolidation Cycle',
        description: 'Consolidate fragmented knowledge into coherent structures',
        applicableTypes: ['consolidation'],
        executionSteps: [
          'identify_fragments',
          'analyze_relationships',
          'merge_overlapping',
          'structure_hierarchy',
          'validate_coherence',
        ],
        expectedGain: 0.2,
        effort: 0.4,
      },
    ];
    
    for (const strategy of strategies) {
      this.strategies.set(strategy.id, strategy);
    }
  }
  
  // ============================================================================
  // BOOST SESSION MANAGEMENT
  // ============================================================================
  
  /**
   * Start a new knowledge boost session
   */
  async startBoost(config: KnowledgeBoostConfig): Promise<BoostSession> {
    const session: BoostSession = {
      id: `boost-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: config.type,
      targetDomain: config.targetDomain,
      intensity: config.intensity,
      startedAt: new Date(),
      expiresAt: new Date(Date.now() + config.duration),
      exercisesCompleted: 0,
      knowledgeGained: 0,
      retentionImproved: 0,
      status: 'active',
    };
    
    this.activeSessions.set(session.id, session);
    this.metrics.totalBoostSessions++;
    this.metrics.activeBoostSessions = this.activeSessions.size;
    
    // Apply boost effects
    this.applyBoostEffects(session);
    
    // Generate initial exercises
    await this.generateExercisesForSession(session);
    
    bus.publish('cortex', 'knowledge_boost:session_started', {
      sessionId: session.id,
      type: session.type,
      intensity: session.intensity,
      duration: config.duration,
      timestamp: session.startedAt.toISOString(),
    });
    
    console.log(`[KnowledgeBoostEngine] Boost session started: ${session.type} (intensity: ${session.intensity})`);
    
    await this.saveState();
    return session;
  }
  
  /**
   * Quick boost - convenience method for immediate boost
   */
  async quickBoost(type: BoostType, intensity: number = 1.0, durationMinutes: number = 10): Promise<BoostSession> {
    return this.startBoost({
      type,
      intensity,
      duration: durationMinutes * 60 * 1000,
      autoActivate: true,
    });
  }
  
  /**
   * End a boost session
   */
  async endBoost(sessionId: string, reason: 'completed' | 'expired' | 'cancelled' = 'completed'): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;
    
    session.status = reason === 'completed' ? 'completed' : reason;
    this.activeSessions.delete(sessionId);
    this.completedSessions.push(session);
    
    // Trim completed sessions
    if (this.completedSessions.length > this.MAX_COMPLETED_SESSIONS) {
      this.completedSessions = this.completedSessions.slice(-this.MAX_COMPLETED_SESSIONS);
    }
    
    this.metrics.activeBoostSessions = this.activeSessions.size;
    this.updateMetrics();
    
    bus.publish('cortex', 'knowledge_boost:session_ended', {
      sessionId: session.id,
      type: session.type,
      status: session.status,
      exercisesCompleted: session.exercisesCompleted,
      knowledgeGained: session.knowledgeGained,
      retentionImproved: session.retentionImproved,
      timestamp: new Date().toISOString(),
    });
    
    console.log(`[KnowledgeBoostEngine] Boost session ended: ${session.type} (${reason})`);
    
    await this.saveState();
  }
  
  private applyBoostEffects(session: BoostSession): void {
    // Apply velocity multiplier
    if (session.type === 'velocity') {
      this.metrics.velocityMultiplier = Math.min(3.0, this.metrics.velocityMultiplier * session.intensity);
    }
    
    // Notify other systems of boost
    bus.publish('cortex', 'learning:boost_activated', {
      type: session.type,
      intensity: session.intensity,
      velocityMultiplier: this.metrics.velocityMultiplier,
    });
  }
  
  // ============================================================================
  // EXERCISE GENERATION & PROCESSING
  // ============================================================================
  
  private async generateExercisesForSession(session: BoostSession): Promise<void> {
    const strategy = this.selectStrategy(session.type);
    if (!strategy) return;
    
    const exercises: LearningExercise[] = [];
    
    // Get target nodes
    let targetNodes: KnowledgeNode[] = [];
    if (session.targetDomain) {
      targetNodes = Array.from(this.knowledgeGraph.values())
        .filter(n => n.domain === session.targetDomain);
    } else {
      // Select nodes based on boost type
      targetNodes = this.selectNodesForBoostType(session.type);
    }
    
    // Generate exercises based on strategy
    for (const node of targetNodes.slice(0, 10)) {
      const exercise = this.generateExercise(node, session.type, strategy);
      exercises.push(exercise);
    }
    
    this.pendingExercises.push(...exercises);
  }
  
  private selectNodesForBoostType(type: BoostType): KnowledgeNode[] {
    const nodes = Array.from(this.knowledgeGraph.values());
    
    switch (type) {
      case 'retention':
        // Select nodes with decaying strength
        return nodes
          .filter(n => n.strength < 0.7)
          .sort((a, b) => a.strength - b.strength)
          .slice(0, 20);
        
      case 'velocity':
        // Select nodes with room to grow
        return nodes
          .filter(n => n.strength < 0.9)
          .sort((a, b) => b.reinforcementCount - a.reinforcementCount)
          .slice(0, 20);
        
      case 'transfer':
        // Select nodes with many connections
        return nodes
          .sort((a, b) => b.connections.length - a.connections.length)
          .slice(0, 20);
        
      case 'breadth':
        // Select under-explored domains
        const domainCounts = new Map<string, number>();
        for (const node of nodes) {
          domainCounts.set(node.domain, (domainCounts.get(node.domain) || 0) + node.reinforcementCount);
        }
        const weakestDomains = Array.from(domainCounts.entries())
          .sort((a, b) => a[1] - b[1])
          .slice(0, 3)
          .map(e => e[0]);
        return nodes.filter(n => weakestDomains.includes(n.domain));
        
      case 'depth':
        // Select nodes in strong domains for deepening
        return nodes
          .filter(n => n.strength > 0.6)
          .sort((a, b) => b.strength - a.strength)
          .slice(0, 20);
        
      case 'consolidation':
      case 'repair':
      default:
        // General selection
        return nodes
          .sort(() => Math.random() - 0.5)
          .slice(0, 20);
    }
  }
  
  private generateExercise(node: KnowledgeNode, boostType: BoostType, _strategy: BoostStrategy): LearningExercise {
    const exerciseTypes: Record<BoostType, LearningExercise['type']> = {
      velocity: 'application',
      retention: 'recall',
      transfer: 'transfer',
      depth: 'synthesis',
      breadth: 'application',
      consolidation: 'synthesis',
      repair: 'correction',
    };
    
    const prompts: Record<LearningExercise['type'], (node: KnowledgeNode) => string> = {
      recall: (n) => `Recall and explain the key aspects of ${n.concept} in the context of ${n.domain}.`,
      application: (n) => `Apply ${n.concept} to solve a practical problem in ${n.domain}.`,
      synthesis: (n) => `Synthesize ${n.concept} with related concepts: ${n.connections.slice(0, 3).join(', ')}.`,
      transfer: (n) => `Transfer the principles of ${n.concept} from ${n.domain} to another domain.`,
      correction: (n) => `Identify and correct potential misconceptions about ${n.concept}.`,
    };
    
    const exerciseType = exerciseTypes[boostType];
    const prompt = prompts[exerciseType](node);
    
    return {
      id: `exercise-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: exerciseType,
      prompt,
      expectedConcepts: [node.concept, ...node.connections.slice(0, 2)],
      difficulty: 1 - node.strength, // Harder for weaker nodes
      targetNodes: [node.id],
    };
  }
  
  /**
   * Process an exercise completion
   */
  async completeExercise(exerciseId: string, score: number): Promise<void> {
    const exerciseIdx = this.pendingExercises.findIndex(e => e.id === exerciseId);
    if (exerciseIdx === -1) return;
    
    const exercise = this.pendingExercises[exerciseIdx];
    exercise.completedAt = new Date();
    exercise.score = score;
    
    // Update knowledge nodes
    for (const nodeId of exercise.targetNodes) {
      const node = this.knowledgeGraph.get(nodeId);
      if (node) {
        // Reinforce based on score
        const reinforcement = score * 0.1 * this.metrics.velocityMultiplier;
        node.strength = Math.min(1, node.strength + reinforcement);
        node.lastReinforced = new Date();
        node.reinforcementCount++;
      }
    }
    
    // Update active session
    for (const session of this.activeSessions.values()) {
      session.exercisesCompleted++;
      session.knowledgeGained += score * 0.1;
      if (exercise.type === 'recall') {
        session.retentionImproved += score * 0.05;
      }
    }
    
    // Remove from pending
    this.pendingExercises.splice(exerciseIdx, 1);
    
    this.updateMetrics();
    
    bus.publish('cortex', 'knowledge_boost:exercise_completed', {
      exerciseId,
      type: exercise.type,
      score,
      timestamp: new Date().toISOString(),
    });
  }
  
  /**
   * Auto-complete exercises through internal processing (for automated learning)
   */
  async autoProcessExercises(): Promise<number> {
    let processed = 0;
    
    for (const exercise of this.pendingExercises.slice(0, 5)) {
      // Simulate exercise completion with varying scores
      const baseScore = 0.6 + Math.random() * 0.3; // 0.6-0.9
      const score = baseScore * this.metrics.velocityMultiplier;
      
      await this.completeExercise(exercise.id, Math.min(1, score));
      processed++;
    }
    
    return processed;
  }
  
  // ============================================================================
  // STRATEGY SELECTION
  // ============================================================================
  
  private selectStrategy(boostType: BoostType): BoostStrategy | null {
    const applicable = Array.from(this.strategies.values())
      .filter(s => s.applicableTypes.includes(boostType));
    
    if (applicable.length === 0) return null;
    
    // Select best strategy based on expected gain and current state
    return applicable.sort((a, b) => {
      const scoreA = a.expectedGain / a.effort;
      const scoreB = b.expectedGain / b.effort;
      return scoreB - scoreA;
    })[0];
  }
  
  // ============================================================================
  // BOOST MONITORING LOOP
  // ============================================================================
  
  private startBoostLoop(): void {
    if (this.boostIntervalId) return;
    
    this.boostIntervalId = setInterval(() => {
      this.boostCycle();
    }, this.BOOST_CHECK_INTERVAL);
    
    // Run immediately
    this.boostCycle();
  }
  
  private async boostCycle(): Promise<void> {
    // Check for expired sessions
    const now = Date.now();
    for (const [sessionId, session] of this.activeSessions) {
      if (session.expiresAt.getTime() <= now) {
        await this.endBoost(sessionId, 'expired');
      }
    }
    
    // Apply knowledge decay
    this.applyKnowledgeDecay();
    
    // Auto-process some exercises if boost is active
    if (this.activeSessions.size > 0) {
      await this.autoProcessExercises();
    }
    
    // Check for automatic boost triggers
    await this.checkAutoBoostTriggers();
    
    this.updateMetrics();
  }
  
  private applyKnowledgeDecay(): void {
    const now = Date.now();
    
    for (const node of this.knowledgeGraph.values()) {
      const hoursSinceReinforcement = (now - node.lastReinforced.getTime()) / (1000 * 60 * 60);
      const decay = this.RETENTION_DECAY_RATE * hoursSinceReinforcement;
      
      // Apply decay but keep minimum strength
      node.strength = Math.max(0.1, node.strength - decay);
    }
  }
  
  private async checkAutoBoostTriggers(): Promise<void> {
    // Check if we need automatic boosts based on system state
    
    // Trigger retention boost if too many weak nodes
    const weakNodes = Array.from(this.knowledgeGraph.values()).filter(n => n.strength < 0.4);
    if (weakNodes.length > this.knowledgeGraph.size * 0.3 && this.activeSessions.size === 0) {
      console.log('[KnowledgeBoostEngine] Auto-triggering retention boost due to weak nodes');
      await this.quickBoost('retention', 1.2, 5);
    }
    
    // Reset velocity multiplier if no active boosts
    if (this.activeSessions.size === 0 && this.metrics.velocityMultiplier > 1.0) {
      this.metrics.velocityMultiplier = Math.max(1.0, this.metrics.velocityMultiplier * 0.95);
    }
  }
  
  // ============================================================================
  // METRICS & ANALYSIS
  // ============================================================================
  
  private updateMetrics(): void {
    const nodes = Array.from(this.knowledgeGraph.values());
    
    // Calculate domain strengths
    const domainStrengths = new Map<string, { total: number; count: number }>();
    for (const node of nodes) {
      const current = domainStrengths.get(node.domain) || { total: 0, count: 0 };
      current.total += node.strength;
      current.count++;
      domainStrengths.set(node.domain, current);
    }
    
    const domainAvgs = Array.from(domainStrengths.entries())
      .map(([domain, stats]) => ({ domain, avg: stats.total / stats.count }))
      .sort((a, b) => a.avg - b.avg);
    
    this.metrics.weakestDomains = domainAvgs.slice(0, 3).map(d => d.domain);
    this.metrics.strongestDomains = domainAvgs.slice(-3).reverse().map(d => d.domain);
    this.metrics.knowledgeNodeCount = nodes.length;
    
    // Calculate averages from completed sessions
    if (this.completedSessions.length > 0) {
      const recent = this.completedSessions.slice(-50);
      this.metrics.averageRetentionImprovement = 
        recent.reduce((sum, s) => sum + s.retentionImproved, 0) / recent.length;
    }
    
    // Calculate total knowledge
    this.metrics.totalKnowledgeGained = nodes.reduce((sum, n) => sum + n.strength, 0);
  }
  
  // ============================================================================
  // PUBLIC API
  // ============================================================================
  
  getMetrics(): BoostMetrics {
    return { ...this.metrics };
  }
  
  getActiveBoosts(): BoostSession[] {
    return Array.from(this.activeSessions.values());
  }
  
  getRecentBoosts(limit: number = 20): BoostSession[] {
    return this.completedSessions.slice(-limit);
  }
  
  getPendingExercises(): LearningExercise[] {
    return [...this.pendingExercises];
  }
  
  getKnowledgeNodes(domain?: string): KnowledgeNode[] {
    const nodes = Array.from(this.knowledgeGraph.values());
    if (domain) {
      return nodes.filter(n => n.domain === domain);
    }
    return nodes;
  }
  
  getStrategies(): BoostStrategy[] {
    return Array.from(this.strategies.values());
  }
  
  getDomainHealth(): Record<string, { avgStrength: number; nodeCount: number; weakNodes: number }> {
    const health: Record<string, { avgStrength: number; nodeCount: number; weakNodes: number }> = {};
    
    for (const node of this.knowledgeGraph.values()) {
      if (!health[node.domain]) {
        health[node.domain] = { avgStrength: 0, nodeCount: 0, weakNodes: 0 };
      }
      health[node.domain].nodeCount++;
      health[node.domain].avgStrength += node.strength;
      if (node.strength < 0.4) {
        health[node.domain].weakNodes++;
      }
    }
    
    for (const domain of Object.keys(health)) {
      health[domain].avgStrength /= health[domain].nodeCount;
    }
    
    return health;
  }
  
  /**
   * Add a new knowledge node
   */
  addKnowledgeNode(concept: string, domain: string, connections: string[] = []): KnowledgeNode {
    const nodeId = `${domain}:${concept}`;
    
    if (!this.knowledgeGraph.has(nodeId)) {
      const node: KnowledgeNode = {
        id: nodeId,
        concept,
        domain,
        strength: 0.3, // Start weak
        lastReinforced: new Date(),
        reinforcementCount: 0,
        connections,
        metadata: {},
      };
      
      this.knowledgeGraph.set(nodeId, node);
      this.updateMetrics();
      
      bus.publish('cortex', 'knowledge_boost:node_added', {
        nodeId,
        concept,
        domain,
        timestamp: new Date().toISOString(),
      });
      
      return node;
    }
    
    return this.knowledgeGraph.get(nodeId)!;
  }
  
  /**
   * Reinforce a specific knowledge node
   */
  reinforceNode(nodeId: string, amount: number = 0.1): void {
    const node = this.knowledgeGraph.get(nodeId);
    if (!node) return;
    
    node.strength = Math.min(1, node.strength + amount * this.metrics.velocityMultiplier);
    node.lastReinforced = new Date();
    node.reinforcementCount++;
    
    this.updateMetrics();
  }
  
  // ============================================================================
  // PERSISTENCE
  // ============================================================================
  
  private async loadState(): Promise<void> {
    try {
      if (await fs.pathExists(this.stateFile)) {
        const data = await fs.readJson(this.stateFile);
        
        // Restore knowledge graph
        if (data.knowledgeGraph) {
          for (const node of data.knowledgeGraph) {
            node.lastReinforced = new Date(node.lastReinforced);
            this.knowledgeGraph.set(node.id, node);
          }
        }
        
        // Restore completed sessions
        if (data.completedSessions) {
          this.completedSessions = data.completedSessions.map((s: any) => ({
            ...s,
            startedAt: new Date(s.startedAt),
            expiresAt: new Date(s.expiresAt),
          }));
        }
        
        // Restore metrics
        if (data.metrics) {
          this.metrics = { ...this.metrics, ...data.metrics };
        }
        
        console.log(`[KnowledgeBoostEngine] Loaded ${this.knowledgeGraph.size} knowledge nodes`);
      }
    } catch (error) {
      console.error('[KnowledgeBoostEngine] Failed to load state:', error);
    }
  }
  
  private async saveState(): Promise<void> {
    try {
      const data = {
        knowledgeGraph: Array.from(this.knowledgeGraph.values()),
        completedSessions: this.completedSessions,
        metrics: this.metrics,
        savedAt: new Date().toISOString(),
      };
      
      await fs.writeJson(this.stateFile, data, { spaces: 2 });
    } catch (error) {
      console.error('[KnowledgeBoostEngine] Failed to save state:', error);
    }
  }
  
  // ============================================================================
  // EVENT LISTENERS
  // ============================================================================
  
  private setupListeners(): void {
    // Listen for learning events to reinforce knowledge
    bus.on('learning:success', (event) => {
      const { domain, concept } = event.payload as any;
      if (domain && concept) {
        const nodeId = `${domain}:${concept}`;
        this.reinforceNode(nodeId, 0.05);
      }
    });
    
    // Listen for boost requests
    bus.on('knowledge_boost:request', async (event) => {
      const { type, intensity, duration } = event.payload as any;
      await this.startBoost({
        type,
        intensity: intensity || 1.0,
        duration: duration || 300000,
        autoActivate: true,
      });
    });
    
    // Listen for exercise completions
    bus.on('knowledge_boost:exercise_done', async (event) => {
      const { exerciseId, score } = event.payload as any;
      await this.completeExercise(exerciseId, score);
    });
    
    // Listen for emergence events - knowledge from emergences
    bus.on('emergence:detected', (event) => {
      const payload = event.payload as any;
      if (payload?.signature?.domain) {
        // Add or reinforce knowledge from emergence
        this.addKnowledgeNode(`emergence-${Date.now()}`, payload.signature.domain, []);
      }
    });
  }
  
  /**
   * Shutdown the engine
   */
  async shutdown(): Promise<void> {
    if (this.boostIntervalId) {
      clearInterval(this.boostIntervalId);
      this.boostIntervalId = undefined;
    }
    
    // End all active sessions
    for (const sessionId of this.activeSessions.keys()) {
      await this.endBoost(sessionId, 'cancelled');
    }
    
    await this.saveState();
    console.log('[KnowledgeBoostEngine] Shutdown complete');
  }
}

// Singleton export
export const knowledgeBoostEngine = KnowledgeBoostEngine.getInstance();
