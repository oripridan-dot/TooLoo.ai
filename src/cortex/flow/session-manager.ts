// @version 3.3.216
// TooLoo Flow Session Manager
// Manages the unified thinking and creation experience

import { v4 as uuid } from 'uuid';
import { promises as fs } from 'fs';
import path from 'path';
import { bus } from '../../shared/event-bus.js';
import {
  FlowSession,
  FlowPhase,
  ThinkingTree,
  ThinkingNode,
  ThinkingDimension,
  DimensionType,
  FlowOption,
  Decision,
  FlowMessage,
  FlowResponse,
  ExtendedKnowledge,
  DimensionReadiness,
  QAHandoff,
  FlowArtifact,
  DIMENSION_TEMPLATES,
} from './types.js';

const DATA_DIR = path.join(process.cwd(), 'data', 'flow-sessions');

// ============================================================================
// FLOW SESSION MANAGER
// ============================================================================

export class FlowSessionManager {
  private sessions: Map<string, FlowSession> = new Map();
  private activeSessionId: string | null = null;
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Ensure data directory exists
    await fs.mkdir(DATA_DIR, { recursive: true });

    // Load existing sessions
    try {
      const files = await fs.readdir(DATA_DIR);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await fs.readFile(path.join(DATA_DIR, file), 'utf-8');
          const session = JSON.parse(content) as FlowSession;
          this.sessions.set(session.id, session);
        }
      }
      console.log(`[FlowSessionManager] Loaded ${this.sessions.size} sessions`);
    } catch (error) {
      console.log('[FlowSessionManager] No existing sessions found');
    }

    this.initialized = true;
    bus.publish('cortex', 'flow:initialized', { sessionCount: this.sessions.size });
  }

  // ============================================================================
  // SESSION MANAGEMENT
  // ============================================================================

  async createSession(name: string, description?: string): Promise<FlowSession> {
    const id = `flow-${uuid().slice(0, 8)}`;
    
    const session: FlowSession = {
      id,
      name,
      description,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      phase: 'discover',
      tree: this.createEmptyTree(),
      decisions: [],
      knowledge: this.createEmptyKnowledge(),
      artifacts: [],
      readiness: this.initializeReadiness(),
      metadata: {
        totalMessages: 0,
        totalOptions: 0,
        collectedCount: 0,
        dismissedCount: 0,
        branchCount: 0,
      },
    };

    this.sessions.set(id, session);
    this.activeSessionId = id;
    
    await this.saveSession(session);
    bus.publish('cortex', 'flow:session:created', { sessionId: id, name });

    return session;
  }

  async getSession(id: string): Promise<FlowSession | null> {
    return this.sessions.get(id) || null;
  }

  async getActiveSession(): Promise<FlowSession | null> {
    if (!this.activeSessionId) return null;
    return this.sessions.get(this.activeSessionId) || null;
  }

  async setActiveSession(id: string): Promise<void> {
    if (!this.sessions.has(id)) {
      throw new Error(`Session ${id} not found`);
    }
    this.activeSessionId = id;
    bus.publish('cortex', 'flow:session:activated', { sessionId: id });
  }

  async listSessions(): Promise<FlowSession[]> {
    return Array.from(this.sessions.values())
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async deleteSession(id: string): Promise<void> {
    this.sessions.delete(id);
    if (this.activeSessionId === id) {
      this.activeSessionId = null;
    }
    
    try {
      await fs.unlink(path.join(DATA_DIR, `${id}.json`));
    } catch (error) {
      // File might not exist
    }
    
    bus.publish('cortex', 'flow:session:deleted', { sessionId: id });
  }

  // ============================================================================
  // THINKING TREE OPERATIONS
  // ============================================================================

  async addUserMessage(sessionId: string, content: string, nodeId?: string): Promise<FlowMessage> {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    const targetNodeId = nodeId || this.getCurrentNodeId(session);
    const node = this.findNode(session.tree.root, targetNodeId);
    if (!node) throw new Error(`Node ${targetNodeId} not found`);

    const message: FlowMessage = {
      id: uuid(),
      role: 'user',
      content,
      timestamp: Date.now(),
      nodeId: targetNodeId,
    };

    node.messages.push(message);
    node.updatedAt = Date.now();
    session.metadata.totalMessages++;
    session.updatedAt = Date.now();

    await this.saveSession(session);
    bus.publish('cortex', 'flow:message:added', { sessionId, messageId: message.id, role: 'user' });

    return message;
  }

  async addToolooResponse(
    sessionId: string,
    response: FlowResponse,
    nodeId?: string
  ): Promise<FlowMessage> {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    const targetNodeId = nodeId || this.getCurrentNodeId(session);
    const node = this.findNode(session.tree.root, targetNodeId);
    if (!node) throw new Error(`Node ${targetNodeId} not found`);

    const message: FlowMessage = {
      id: uuid(),
      role: 'tooloo',
      content: response.message,
      response,
      timestamp: Date.now(),
      nodeId: targetNodeId,
    };

    node.messages.push(message);
    node.updatedAt = Date.now();
    session.metadata.totalMessages++;

    // Track options if present
    if (response.options) {
      session.metadata.totalOptions += response.options.length;
    }

    // Add dimensions as child nodes if surfaced
    if (response.dimensions) {
      for (const dimension of response.dimensions) {
        this.addDimensionNode(session, node, dimension);
      }
    }

    session.updatedAt = Date.now();
    await this.saveSession(session);
    bus.publish('cortex', 'flow:message:added', { sessionId, messageId: message.id, role: 'tooloo' });

    return message;
  }

  async createBranch(
    sessionId: string,
    parentNodeId: string,
    label: string,
    reason: string
  ): Promise<ThinkingNode> {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    const parentNode = this.findNode(session.tree.root, parentNodeId);
    if (!parentNode) throw new Error(`Parent node ${parentNodeId} not found`);

    const branchNode: ThinkingNode = {
      id: uuid(),
      type: 'branch',
      content: { type: 'branch', label, reason },
      messages: [],
      children: [],
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    parentNode.children.push(branchNode);
    session.metadata.branchCount++;
    session.updatedAt = Date.now();

    // Update current path to the new branch
    session.tree.currentPath = [...session.tree.currentPath, branchNode.id];

    await this.saveSession(session);
    bus.publish('cortex', 'flow:branch:created', { sessionId, branchId: branchNode.id, label });

    return branchNode;
  }

  // ============================================================================
  // OPTIONS & DECISIONS
  // ============================================================================

  async collectOption(
    sessionId: string,
    optionId: string,
    nodeId: string
  ): Promise<Decision> {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    const node = this.findNode(session.tree.root, nodeId);
    if (!node) throw new Error(`Node ${nodeId} not found`);

    // Find the option in the node's messages
    let option: FlowOption | null = null;
    for (const msg of node.messages) {
      if (msg.response?.options) {
        option = msg.response.options.find(o => o.id === optionId) || null;
        if (option) break;
      }
    }

    if (!option) throw new Error(`Option ${optionId} not found in node ${nodeId}`);

    // Update option status
    option.status = 'collected';
    option.collectedAt = Date.now();

    // Create decision from option
    const decision: Decision = {
      id: uuid(),
      dimensionType: this.inferDimensionFromOption(option),
      title: option.title,
      description: option.insight,
      sourceNodeId: nodeId,
      sourceOptionId: optionId,
      implications: option.content?.pros || [],
      affectsDimensions: [],
      status: 'firm',
      confidence: 0.8,
      createdAt: Date.now(),
    };

    session.decisions.push(decision);
    session.metadata.collectedCount++;
    
    // Update readiness
    this.updateReadiness(session, decision.dimensionType);

    // Add to knowledge
    this.addToKnowledge(session, 'collection', option, node);

    session.updatedAt = Date.now();
    await this.saveSession(session);
    
    bus.publish('cortex', 'flow:option:collected', { 
      sessionId, 
      optionId, 
      decisionId: decision.id 
    });

    return decision;
  }

  async dismissOption(
    sessionId: string,
    optionId: string,
    nodeId: string,
    reason: string
  ): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    const node = this.findNode(session.tree.root, nodeId);
    if (!node) throw new Error(`Node ${nodeId} not found`);

    // Find and update the option
    for (const msg of node.messages) {
      if (msg.response?.options) {
        const option = msg.response.options.find(o => o.id === optionId);
        if (option) {
          option.status = 'dismissed';
          option.dismissReason = reason;
          
          // Add to knowledge (even dismissed options teach us)
          this.addToKnowledge(session, 'dismissal', option, node, reason);
          break;
        }
      }
    }

    session.metadata.dismissedCount++;
    session.updatedAt = Date.now();
    await this.saveSession(session);

    bus.publish('cortex', 'flow:option:dismissed', { sessionId, optionId, reason });
  }

  // ============================================================================
  // PHASE MANAGEMENT
  // ============================================================================

  async setPhase(sessionId: string, phase: FlowPhase): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    const previousPhase = session.phase;
    session.phase = phase;
    session.updatedAt = Date.now();

    await this.saveSession(session);
    bus.publish('cortex', 'flow:phase:changed', { sessionId, from: previousPhase, to: phase });
  }

  async suggestNextPhase(sessionId: string): Promise<{ phase: FlowPhase; reason: string } | null> {
    const session = await this.getSession(sessionId);
    if (!session) return null;

    const { phase, decisions, readiness } = session;
    
    const readyCount = readiness.filter(r => r.status === 'ready').length;
    const exploringCount = readiness.filter(r => r.status === 'exploring').length;
    const decisionCount = decisions.length;

    switch (phase) {
      case 'discover':
        if (decisionCount >= 2 && readyCount >= 1) {
          return { phase: 'explore', reason: 'You have initial direction. Ready to explore specific dimensions.' };
        }
        break;
      
      case 'explore':
        if (readyCount >= 4 && exploringCount <= 2) {
          return { phase: 'refine', reason: 'Key dimensions are decided. Time to refine and combine.' };
        }
        break;
      
      case 'refine':
        if (decisionCount >= 8 && session.artifacts.length >= 2) {
          return { phase: 'build', reason: 'Design is solid. Ready to generate production outputs.' };
        }
        break;
      
      case 'build':
        if (session.artifacts.length >= 5) {
          return { phase: 'validate', reason: 'Artifacts ready. Hand off to QA for validation.' };
        }
        break;
      
      case 'validate':
        if (session.qa?.status === 'passed') {
          return { phase: 'ship', reason: 'QA passed. Ready to ship!' };
        }
        break;
    }

    return null;
  }

  // ============================================================================
  // QA HANDOFF
  // ============================================================================

  async handoffToQA(sessionId: string): Promise<QAHandoff> {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    const handoff: QAHandoff = {
      status: 'pending',
      handedOffAt: Date.now(),
    };

    session.qa = handoff;
    session.phase = 'validate';
    session.updatedAt = Date.now();

    await this.saveSession(session);
    bus.publish('cortex', 'flow:qa:handoff', { sessionId, artifactCount: session.artifacts.length });

    return handoff;
  }

  async updateQAStatus(
    sessionId: string,
    status: QAHandoff['status'],
    results?: QAHandoff['results'],
    feedback?: string
  ): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session || !session.qa) throw new Error(`Session ${sessionId} not found or no QA handoff`);

    session.qa.status = status;
    if (results) session.qa.results = results;
    if (feedback) session.qa.feedback = feedback;
    if (status === 'passed' || status === 'failed') {
      session.qa.completedAt = Date.now();
    }

    session.updatedAt = Date.now();
    await this.saveSession(session);

    bus.publish('cortex', 'flow:qa:updated', { sessionId, status });
  }

  // ============================================================================
  // CONTEXT BUILDING (for AI prompts)
  // ============================================================================

  buildContextForAI(session: FlowSession): string {
    const parts: string[] = [];

    // Phase context
    parts.push(`## Current Phase: ${session.phase.toUpperCase()}`);
    parts.push('');

    // Decisions made
    if (session.decisions.length > 0) {
      parts.push('## Decisions Made');
      for (const decision of session.decisions) {
        parts.push(`- **${decision.dimensionType}**: ${decision.title}`);
        if (decision.description) {
          parts.push(`  ${decision.description}`);
        }
      }
      parts.push('');
    }

    // Extended knowledge
    if (session.knowledge.preferences.length > 0) {
      parts.push('## User Preferences Learned');
      for (const pref of session.knowledge.preferences) {
        parts.push(`- ${pref.category}: ${pref.values.join(', ')}`);
      }
      parts.push('');
    }

    // Constraints
    if (session.knowledge.constraints.length > 0) {
      parts.push('## Constraints');
      for (const constraint of session.knowledge.constraints) {
        parts.push(`- ${constraint.description} (${constraint.source})`);
      }
      parts.push('');
    }

    // Readiness status
    const needsAttention = session.readiness.filter(r => r.status === 'needs-attention');
    if (needsAttention.length > 0) {
      parts.push('## Dimensions Needing Attention');
      for (const dim of needsAttention) {
        parts.push(`- ${dim.dimensionType}: ${dim.openQuestions.join(', ')}`);
      }
      parts.push('');
    }

    return parts.join('\n');
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private createEmptyTree(): ThinkingTree {
    const rootNode: ThinkingNode = {
      id: 'root',
      type: 'prompt',
      content: { type: 'prompt', text: '' },
      messages: [],
      children: [],
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    return {
      root: rootNode,
      currentPath: ['root'],
    };
  }

  private createEmptyKnowledge(): ExtendedKnowledge {
    return {
      preferences: [],
      explorationInsights: [],
      constraints: [],
      relationships: [],
    };
  }

  private initializeReadiness(): DimensionReadiness[] {
    const coreTypes: DimensionType[] = [
      'design', 'technical', 'user', 'business', 
      'ethical', 'operational', 'data'
    ];

    return coreTypes.map(type => ({
      dimensionType: type,
      status: 'not-started',
      decisionCount: 0,
      openQuestions: [DIMENSION_TEMPLATES[type].question],
    }));
  }

  private getCurrentNodeId(session: FlowSession): string {
    return session.tree.currentPath[session.tree.currentPath.length - 1] || 'root';
  }

  private findNode(node: ThinkingNode, id: string): ThinkingNode | null {
    if (node.id === id) return node;
    for (const child of node.children) {
      const found = this.findNode(child, id);
      if (found) return found;
    }
    return null;
  }

  private addDimensionNode(
    session: FlowSession,
    parentNode: ThinkingNode,
    dimension: ThinkingDimension
  ): void {
    const dimensionNode: ThinkingNode = {
      id: uuid(),
      type: 'dimension',
      content: { type: 'dimension', dimension },
      messages: [],
      children: [],
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    parentNode.children.push(dimensionNode);
  }

  private inferDimensionFromOption(option: FlowOption): DimensionType {
    const typeMap: Record<string, DimensionType> = {
      'direction': 'business',
      'layout': 'design',
      'component': 'design',
      'color': 'design',
      'typography': 'design',
      'architecture': 'technical',
      'feature': 'user',
      'flow': 'user',
      'data-model': 'data',
      'integration': 'ecosystem',
      'strategy': 'business',
    };
    return typeMap[option.type] || 'custom';
  }

  private updateReadiness(session: FlowSession, dimensionType: DimensionType): void {
    const readiness = session.readiness.find(r => r.dimensionType === dimensionType);
    if (readiness) {
      readiness.decisionCount++;
      if (readiness.decisionCount >= 2) {
        readiness.status = 'ready';
        readiness.openQuestions = [];
      } else {
        readiness.status = 'exploring';
      }
    }
  }

  private addToKnowledge(
    session: FlowSession,
    type: 'collection' | 'dismissal' | 'refinement',
    option: FlowOption,
    node: ThinkingNode,
    reason?: string
  ): void {
    if (type === 'dismissal' && reason) {
      // Learn from dismissals
      session.knowledge.explorationInsights.push({
        nodeId: node.id,
        insight: `Dismissed "${option.title}" because: ${reason}`,
        source: 'dismissal',
      });

      // Extract preference patterns
      const avoidKeywords = ['too', 'not', "don't", 'avoid', 'dislike'];
      if (avoidKeywords.some(k => reason.toLowerCase().includes(k))) {
        // This is a negative preference
        const existingPref = session.knowledge.preferences.find(
          p => p.category === 'avoid'
        );
        if (existingPref) {
          existingPref.values.push(option.title);
        } else {
          session.knowledge.preferences.push({
            category: 'avoid',
            values: [option.title],
            confidence: 0.7,
          });
        }
      }
    } else if (type === 'collection') {
      // Learn from collections
      session.knowledge.explorationInsights.push({
        nodeId: node.id,
        insight: `Collected "${option.title}" - ${option.insight}`,
        source: 'refinement',
      });

      // Extract positive preferences
      const existingPref = session.knowledge.preferences.find(
        p => p.category === 'prefer'
      );
      if (existingPref) {
        existingPref.values.push(option.title);
      } else {
        session.knowledge.preferences.push({
          category: 'prefer',
          values: [option.title],
          confidence: 0.8,
        });
      }
    }
  }

  private async saveSession(session: FlowSession): Promise<void> {
    const filePath = path.join(DATA_DIR, `${session.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(session, null, 2));
  }
}

// Singleton instance
export const flowSessionManager = new FlowSessionManager();
