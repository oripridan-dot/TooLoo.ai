// @version 3.3.573
// @version 3.3.573
/**
 * @tooloo/engine - Context Builder
 * Builds execution context from orchestration state
 *
 * @version 2.0.0-alpha.0
 */

import type { SkillDefinition, ToolRef } from '@tooloo/skills';
import type {
  ExecutionContext,
  OrchestrationContext,
  Message,
  Artifact,
  Intent,
} from './types.js';

// =============================================================================
// CONTEXT BUILDER
// =============================================================================

/**
 * Builds execution context for skill execution
 */
export class ContextBuilder {
  private sessionId: string;
  private projectId?: string;
  private conversation: Message[] = [];
  private artifacts: Artifact[] = [];
  private intent: Intent = { type: 'general', confidence: 0.5 };
  
  constructor(sessionId?: string) {
    this.sessionId = sessionId ?? crypto.randomUUID();
  }
  
  /**
   * Set session ID
   */
  setSession(sessionId: string): this {
    this.sessionId = sessionId;
    return this;
  }
  
  /**
   * Set project ID
   */
  setProject(projectId: string): this {
    this.projectId = projectId;
    return this;
  }
  
  /**
   * Set conversation history
   */
  setConversation(messages: Message[]): this {
    this.conversation = [...messages];
    return this;
  }
  
  /**
   * Add a message to conversation
   */
  addMessage(message: Message): this {
    this.conversation.push(message);
    return this;
  }
  
  /**
   * Set artifacts
   */
  setArtifacts(artifacts: Artifact[]): this {
    this.artifacts = [...artifacts];
    return this;
  }
  
  /**
   * Add an artifact
   */
  addArtifact(artifact: Artifact): this {
    this.artifacts.push(artifact);
    return this;
  }
  
  /**
   * Set detected intent
   */
  setIntent(intent: Intent): this {
    this.intent = intent;
    return this;
  }
  
  /**
   * Build orchestration context
   */
  buildOrchestration(userMessage: string): OrchestrationContext {
    return {
      sessionId: this.sessionId,
      projectId: this.projectId,
      userMessage,
      intent: this.intent,
      conversation: this.conversation,
      artifacts: this.artifacts,
    };
  }
  
  /**
   * Build full execution context
   */
  build(
    userMessage: string,
    skill: SkillDefinition
  ): ExecutionContext {
    const orchestration = this.buildOrchestration(userMessage);
    
    // Map skill tools to tool refs
    const tools: ToolRef[] = skill.tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      required: tool.required ?? false,
    }));
    
    return {
      skill,
      orchestration,
      tools,
    };
  }
  
  /**
   * Clone this builder
   */
  clone(): ContextBuilder {
    const builder = new ContextBuilder(this.sessionId);
    builder.projectId = this.projectId;
    builder.conversation = [...this.conversation];
    builder.artifacts = [...this.artifacts];
    builder.intent = { ...this.intent };
    return builder;
  }
  
  /**
   * Reset builder state
   */
  reset(): this {
    this.conversation = [];
    this.artifacts = [];
    this.intent = { type: 'general', confidence: 0.5 };
    return this;
  }
  
  /**
   * Get current session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }
  
  /**
   * Get current project ID
   */
  getProjectId(): string | undefined {
    return this.projectId;
  }
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create a context builder
 */
export function createContextBuilder(sessionId?: string): ContextBuilder {
  return new ContextBuilder(sessionId);
}
