// @version 1.0.0
/**
 * Agent Collaboration Hub
 *
 * Enhanced inter-agent communication and collaboration patterns.
 * Enables agents to share knowledge, coordinate tasks, and learn
 * from each other's successes and failures.
 *
 * Key Features:
 * - Agent-to-agent messaging
 * - Shared knowledge pool
 * - Collaboration metrics tracking
 * - Skill complementarity analysis
 * - Dynamic team formation recommendations
 * - Conflict resolution protocols
 *
 * @module cortex/agent/collaboration-hub
 */

import { bus } from '../../core/event-bus.js';
import type { AgentProfile } from './team-framework.js';

// ============================================================================
// TYPES
// ============================================================================

export interface AgentMessage {
  id: string;
  fromAgentId: string;
  toAgentId: string | 'broadcast';
  type: 'knowledge_share' | 'task_request' | 'validation_request' | 'insight' | 'warning';
  payload: Record<string, unknown>;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  timestamp: Date;
  acknowledged: boolean;
}

export interface SharedKnowledge {
  id: string;
  contributorAgentId: string;
  domain: string;
  knowledge: string;
  confidence: number;
  validatedBy: string[];
  useCount: number;
  successRate: number;
  createdAt: Date;
  lastUsed: Date;
}

export interface CollaborationMetrics {
  totalMessages: number;
  successfulCollaborations: number;
  knowledgeShares: number;
  avgResponseTime: number;
  topContributors: Array<{ agentId: string; contributions: number }>;
  collaborationScore: number;
}

export interface SkillComplementarity {
  agent1Id: string;
  agent2Id: string;
  complementaryScore: number; // How well they work together
  overlappingSkills: string[];
  uniqueSkillsAgent1: string[];
  uniqueSkillsAgent2: string[];
  recommendedFor: string[]; // Task types they excel at together
}

export interface TeamRecommendation {
  taskType: string;
  recommendedAgents: string[];
  confidence: number;
  reasoning: string;
  estimatedSuccessRate: number;
}

export interface ConflictResolution {
  conflictId: string;
  agents: string[];
  conflictType: 'resource' | 'priority' | 'approach' | 'result';
  resolution: string;
  winner?: string;
  timestamp: Date;
}

// ============================================================================
// COLLABORATION HUB IMPLEMENTATION
// ============================================================================

export class CollaborationHub {
  private static instance: CollaborationHub;
  private messages: AgentMessage[] = [];
  private sharedKnowledge: SharedKnowledge[] = [];
  private metrics: CollaborationMetrics;
  private complementarityCache: Map<string, SkillComplementarity> = new Map();
  private conflictHistory: ConflictResolution[] = [];
  private agentRegistry: Map<string, AgentProfile> = new Map();

  private readonly MAX_MESSAGES = 1000;
  private readonly MAX_KNOWLEDGE = 500;

  private constructor() {
    this.metrics = {
      totalMessages: 0,
      successfulCollaborations: 0,
      knowledgeShares: 0,
      avgResponseTime: 0,
      topContributors: [],
      collaborationScore: 0.5,
    };

    this.setupEventListeners();
  }

  static getInstance(): CollaborationHub {
    if (!CollaborationHub.instance) {
      CollaborationHub.instance = new CollaborationHub();
    }
    return CollaborationHub.instance;
  }

  // ============================================================================
  // EVENT LISTENERS
  // ============================================================================

  private setupEventListeners(): void {
    // Register new agents
    bus.on('team:agent_created', (event) => {
      const agent = event.payload as AgentProfile;
      this.registerAgent(agent);
    });

    // Handle task completions for learning
    bus.on('team:task_completed', (event) => {
      this.processTaskCompletion(event.payload);
    });

    // Handle inter-agent communication
    bus.on('agent:message', (event) => {
      this.handleAgentMessage(event.payload as AgentMessage);
    });
  }

  // ============================================================================
  // AGENT REGISTRATION
  // ============================================================================

  registerAgent(agent: AgentProfile): void {
    this.agentRegistry.set(agent.id, agent);

    // Recalculate complementarity with existing agents
    for (const existingAgent of this.agentRegistry.values()) {
      if (existingAgent.id !== agent.id) {
        this.calculateComplementarity(agent, existingAgent);
      }
    }

    bus.publish('cortex', 'collaboration:agent_registered', {
      agentId: agent.id,
      totalAgents: this.agentRegistry.size,
      timestamp: new Date().toISOString(),
    });
  }

  // ============================================================================
  // MESSAGING SYSTEM
  // ============================================================================

  sendMessage(message: Omit<AgentMessage, 'id' | 'timestamp' | 'acknowledged'>): string {
    const fullMessage: AgentMessage = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date(),
      acknowledged: false,
    };

    this.messages.push(fullMessage);
    this.metrics.totalMessages++;

    // Trim message history
    if (this.messages.length > this.MAX_MESSAGES) {
      this.messages = this.messages.slice(-this.MAX_MESSAGES);
    }

    // Route message
    if (message.toAgentId === 'broadcast') {
      bus.publish('cortex', 'collaboration:broadcast', {
        message: fullMessage,
      });
    } else {
      bus.publish('cortex', `agent:${message.toAgentId}:message`, {
        message: fullMessage,
      });
    }

    return fullMessage.id;
  }

  acknowledgeMessage(messageId: string, _agentId: string): void {
    const message = this.messages.find((m) => m.id === messageId);
    if (message) {
      message.acknowledged = true;

      // Calculate response time
      const responseTime = Date.now() - message.timestamp.getTime();
      this.updateAverageResponseTime(responseTime);
    }
  }

  private handleAgentMessage(message: AgentMessage): void {
    switch (message.type) {
      case 'knowledge_share':
        this.processKnowledgeShare(message);
        break;
      case 'task_request':
        this.processTaskRequest(message);
        break;
      case 'validation_request':
        this.processValidationRequest(message);
        break;
      case 'insight':
        this.processInsight(message);
        break;
      case 'warning':
        this.processWarning(message);
        break;
    }
  }

  // ============================================================================
  // KNOWLEDGE SHARING
  // ============================================================================

  shareKnowledge(agentId: string, domain: string, knowledge: string, confidence: number): string {
    const sharedKnowledge: SharedKnowledge = {
      id: `know-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      contributorAgentId: agentId,
      domain,
      knowledge,
      confidence,
      validatedBy: [],
      useCount: 0,
      successRate: 0.5,
      createdAt: new Date(),
      lastUsed: new Date(),
    };

    this.sharedKnowledge.push(sharedKnowledge);
    this.metrics.knowledgeShares++;

    // Update contributor metrics
    this.updateContributorStats(agentId);

    // Trim knowledge pool
    if (this.sharedKnowledge.length > this.MAX_KNOWLEDGE) {
      // Remove least used, oldest knowledge
      this.sharedKnowledge.sort((a, b) => {
        const scoreA = a.useCount * a.successRate;
        const scoreB = b.useCount * b.successRate;
        return scoreB - scoreA;
      });
      this.sharedKnowledge = this.sharedKnowledge.slice(0, this.MAX_KNOWLEDGE);
    }

    // Broadcast knowledge share
    this.sendMessage({
      fromAgentId: agentId,
      toAgentId: 'broadcast',
      type: 'knowledge_share',
      payload: { knowledgeId: sharedKnowledge.id, domain, preview: knowledge.slice(0, 100) },
      priority: 'medium',
    });

    return sharedKnowledge.id;
  }

  validateKnowledge(knowledgeId: string, validatorAgentId: string, isValid: boolean): void {
    const knowledge = this.sharedKnowledge.find((k) => k.id === knowledgeId);
    if (knowledge && !knowledge.validatedBy.includes(validatorAgentId)) {
      knowledge.validatedBy.push(validatorAgentId);

      // Adjust confidence based on validation
      const validationWeight = 0.1;
      knowledge.confidence = knowledge.confidence + validationWeight * (isValid ? 1 : -1);
      knowledge.confidence = Math.max(0, Math.min(1, knowledge.confidence));
    }
  }

  useKnowledge(knowledgeId: string, success: boolean): void {
    const knowledge = this.sharedKnowledge.find((k) => k.id === knowledgeId);
    if (knowledge) {
      knowledge.useCount++;
      knowledge.lastUsed = new Date();

      // Update success rate with exponential moving average
      const alpha = 0.2;
      knowledge.successRate = alpha * (success ? 1 : 0) + (1 - alpha) * knowledge.successRate;
    }
  }

  getRelevantKnowledge(domain: string, limit: number = 5): SharedKnowledge[] {
    return this.sharedKnowledge
      .filter((k) => k.domain === domain || k.domain === 'general')
      .sort((a, b) => {
        // Score by confidence, validation count, and success rate
        const scoreA = a.confidence * (1 + a.validatedBy.length * 0.1) * a.successRate;
        const scoreB = b.confidence * (1 + b.validatedBy.length * 0.1) * b.successRate;
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }

  // ============================================================================
  // SKILL COMPLEMENTARITY
  // ============================================================================

  private calculateComplementarity(agent1: AgentProfile, agent2: AgentProfile): void {
    const key = [agent1.id, agent2.id].sort().join(':');

    const overlapping = agent1.capabilities.filter((c) => agent2.capabilities.includes(c));
    const unique1 = agent1.capabilities.filter((c) => !agent2.capabilities.includes(c));
    const unique2 = agent2.capabilities.filter((c) => !agent1.capabilities.includes(c));

    // Complementarity is higher when agents have different but compatible skills
    const diversityScore =
      (unique1.length + unique2.length) / (agent1.capabilities.length + agent2.capabilities.length);
    const overlapScore =
      overlapping.length / Math.max(agent1.capabilities.length, agent2.capabilities.length);

    // Ideal team has some overlap (communication) but mostly complementary skills
    const complementaryScore = 0.3 * overlapScore + 0.7 * diversityScore;

    // Determine recommended task types
    const recommendedFor = this.determineRecommendedTasks(agent1, agent2);

    const complementarity: SkillComplementarity = {
      agent1Id: agent1.id,
      agent2Id: agent2.id,
      complementaryScore,
      overlappingSkills: overlapping,
      uniqueSkillsAgent1: unique1,
      uniqueSkillsAgent2: unique2,
      recommendedFor,
    };

    this.complementarityCache.set(key, complementarity);
  }

  private determineRecommendedTasks(agent1: AgentProfile, agent2: AgentProfile): string[] {
    const recommended: string[] = [];
    const allCapabilities = [...new Set([...agent1.capabilities, ...agent2.capabilities])];

    // Task type recommendations based on combined capabilities
    if (allCapabilities.includes('execute') && allCapabilities.includes('validate')) {
      recommended.push('validated-execution');
    }
    if (allCapabilities.includes('generate') && allCapabilities.includes('critique')) {
      recommended.push('iterative-creation');
    }
    if (allCapabilities.includes('research') && allCapabilities.includes('synthesize')) {
      recommended.push('knowledge-discovery');
    }
    if (allCapabilities.includes('plan') && allCapabilities.includes('deploy')) {
      recommended.push('end-to-end-delivery');
    }
    if (allCapabilities.includes('analyze') && allCapabilities.includes('improve')) {
      recommended.push('optimization');
    }

    return recommended.length > 0 ? recommended : ['general'];
  }

  getComplementarity(agent1Id: string, agent2Id: string): SkillComplementarity | null {
    const key = [agent1Id, agent2Id].sort().join(':');
    return this.complementarityCache.get(key) || null;
  }

  // ============================================================================
  // TEAM RECOMMENDATIONS
  // ============================================================================

  recommendTeam(taskType: string, requiredCapabilities: string[]): TeamRecommendation {
    const candidates: Array<{ agentId: string; score: number }> = [];

    for (const agent of this.agentRegistry.values()) {
      const matchingCapabilities = requiredCapabilities.filter((c) =>
        agent.capabilities.includes(c)
      );
      const coverageScore = matchingCapabilities.length / requiredCapabilities.length;
      const performanceScore = agent.performanceMetrics.successRate;

      const score = 0.6 * coverageScore + 0.4 * performanceScore;
      candidates.push({ agentId: agent.id, score });
    }

    // Sort by score and find best team
    candidates.sort((a, b) => b.score - a.score);

    // Select agents that together cover all capabilities
    const selectedAgents: string[] = [];
    const coveredCapabilities = new Set<string>();

    for (const candidate of candidates) {
      const agent = this.agentRegistry.get(candidate.agentId);
      if (!agent) continue;

      const newCapabilities = agent.capabilities.filter(
        (c) => requiredCapabilities.includes(c) && !coveredCapabilities.has(c)
      );

      if (newCapabilities.length > 0) {
        selectedAgents.push(candidate.agentId);
        newCapabilities.forEach((c) => coveredCapabilities.add(c));
      }

      // Check if all capabilities are covered
      if (coveredCapabilities.size >= requiredCapabilities.length) break;
    }

    // Calculate estimated success rate based on team complementarity
    let totalComplementarity = 0;
    let pairCount = 0;

    for (let i = 0; i < selectedAgents.length; i++) {
      for (let j = i + 1; j < selectedAgents.length; j++) {
        const agent1 = selectedAgents[i];
        const agent2 = selectedAgents[j];
        if (agent1 && agent2) {
          const comp = this.getComplementarity(agent1, agent2);
          if (comp) {
            totalComplementarity += comp.complementaryScore;
            pairCount++;
          }
        }
      }
    }

    const avgComplementarity = pairCount > 0 ? totalComplementarity / pairCount : 0.5;
    const coverage = coveredCapabilities.size / requiredCapabilities.length;
    const estimatedSuccessRate = 0.5 * coverage + 0.5 * avgComplementarity;

    return {
      taskType,
      recommendedAgents: selectedAgents,
      confidence: coverage,
      reasoning: `Selected ${selectedAgents.length} agents covering ${coveredCapabilities.size}/${requiredCapabilities.length} required capabilities with ${(avgComplementarity * 100).toFixed(1)}% complementarity.`,
      estimatedSuccessRate,
    };
  }

  // ============================================================================
  // CONFLICT RESOLUTION
  // ============================================================================

  resolveConflict(
    agents: string[],
    conflictType: ConflictResolution['conflictType'],
    _context: Record<string, unknown>
  ): ConflictResolution {
    // Determine winner based on agent performance and conflict type
    let winner: string | undefined;

    if (conflictType === 'resource' || conflictType === 'priority') {
      // Higher performing agent gets priority
      let bestPerformance = 0;
      for (const agentId of agents) {
        const agent = this.agentRegistry.get(agentId);
        if (agent && agent.performanceMetrics.successRate > bestPerformance) {
          bestPerformance = agent.performanceMetrics.successRate;
          winner = agentId;
        }
      }
    } else if (conflictType === 'approach') {
      // Use consensus - no single winner
      winner = undefined;
    } else if (conflictType === 'result') {
      // Higher validation rate wins
      let bestValidation = 0;
      for (const agentId of agents) {
        const agent = this.agentRegistry.get(agentId);
        if (agent && agent.performanceMetrics.validationPassRate > bestValidation) {
          bestValidation = agent.performanceMetrics.validationPassRate;
          winner = agentId;
        }
      }
    }

    const resolution: ConflictResolution = {
      conflictId: `conflict-${Date.now()}`,
      agents,
      conflictType,
      resolution: winner
        ? `Agent ${winner} takes precedence based on ${conflictType} criteria.`
        : 'Consensus approach - all agents collaborate on resolution.',
      winner,
      timestamp: new Date(),
    };

    this.conflictHistory.push(resolution);

    // Limit history
    if (this.conflictHistory.length > 100) {
      this.conflictHistory = this.conflictHistory.slice(-100);
    }

    bus.publish('cortex', 'collaboration:conflict_resolved', {
      resolution,
      timestamp: new Date().toISOString(),
    });

    return resolution;
  }

  // ============================================================================
  // MESSAGE PROCESSORS
  // ============================================================================

  private processKnowledgeShare(_message: AgentMessage): void {
    // Knowledge shares automatically recorded through shareKnowledge method
    this.metrics.successfulCollaborations++;
    this.updateCollaborationScore(0.01);
  }

  private processTaskRequest(_message: AgentMessage): void {
    // Route task to appropriate agent(s)
    this.metrics.successfulCollaborations++;
  }

  private processValidationRequest(_message: AgentMessage): void {
    // Handle validation request
    this.metrics.successfulCollaborations++;
  }

  private processInsight(message: AgentMessage): void {
    // Share insight with meta-learner
    bus.publish('cortex', 'meta:insight_received', {
      fromAgent: message.fromAgentId,
      insight: message.payload,
      timestamp: new Date().toISOString(),
    });
  }

  private processWarning(message: AgentMessage): void {
    // Escalate warning
    bus.publish('cortex', 'system:agent_warning', {
      fromAgent: message.fromAgentId,
      warning: message.payload,
      priority: message.priority,
      timestamp: new Date().toISOString(),
    });
  }

  private processTaskCompletion(payload: Record<string, unknown>): void {
    const success = payload['success'] as boolean;
    const agentIds = payload['agentIds'] as string[];

    if (success && agentIds && agentIds.length > 1) {
      this.metrics.successfulCollaborations++;
      this.updateCollaborationScore(0.02);
    }
  }

  // ============================================================================
  // METRICS HELPERS
  // ============================================================================

  private updateAverageResponseTime(newTime: number): void {
    const alpha = 0.1;
    this.metrics.avgResponseTime = alpha * newTime + (1 - alpha) * this.metrics.avgResponseTime;
  }

  private updateContributorStats(agentId: string): void {
    const existing = this.metrics.topContributors.find((c) => c.agentId === agentId);
    if (existing) {
      existing.contributions++;
    } else {
      this.metrics.topContributors.push({ agentId, contributions: 1 });
    }

    // Sort and limit
    this.metrics.topContributors.sort((a, b) => b.contributions - a.contributions);
    this.metrics.topContributors = this.metrics.topContributors.slice(0, 10);
  }

  private updateCollaborationScore(delta: number): void {
    this.metrics.collaborationScore = Math.max(
      0,
      Math.min(1, this.metrics.collaborationScore + delta)
    );
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  getMetrics(): CollaborationMetrics {
    return { ...this.metrics };
  }

  getMessages(agentId?: string, limit: number = 50): AgentMessage[] {
    let messages = this.messages;

    if (agentId) {
      messages = messages.filter(
        (m) => m.fromAgentId === agentId || m.toAgentId === agentId || m.toAgentId === 'broadcast'
      );
    }

    return messages.slice(-limit);
  }

  getAllKnowledge(): SharedKnowledge[] {
    return [...this.sharedKnowledge];
  }

  getConflictHistory(): ConflictResolution[] {
    return [...this.conflictHistory];
  }

  getRegisteredAgents(): AgentProfile[] {
    return Array.from(this.agentRegistry.values());
  }
}

// Singleton export
export const collaborationHub = CollaborationHub.getInstance();
