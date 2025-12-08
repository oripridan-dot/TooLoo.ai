// @version 3.3.403
/**
 * Session Continuity Manager
 * 
 * Ensures TooLoo maintains context and progress across restarts.
 * This is critical for autonomous operation - the AI should "remember"
 * what it was doing and seamlessly continue.
 * 
 * Key capabilities:
 * 1. **Session State Persistence** - Save/restore active work state
 * 2. **Task Resumption** - Continue interrupted tasks on restart
 * 3. **Context Preservation** - Maintain conversation and project context
 * 4. **Progress Tracking** - Track and report on multi-session goals
 * 
 * @module cortex/continuity/session-continuity
 */

import { bus, SynapsysEvent } from '../../core/event-bus.js';
import fs from 'fs-extra';
import path from 'path';

// ============================================================================
// TYPES
// ============================================================================

export interface SessionState {
  /** Current session ID */
  sessionId: string;
  /** When this session started */
  startedAt: number;
  /** Previous session ID (for continuity) */
  previousSessionId?: string;
  /** When previous session ended */
  previousSessionEndedAt?: number;
  /** Active tasks that need to resume */
  activeTasks: ActiveTask[];
  /** Current project context */
  projectContext: ProjectContext | null;
  /** Conversation context to resume */
  conversationContext: ConversationContext | null;
  /** Goals being tracked across sessions */
  persistentGoals: PersistentGoal[];
  /** System state snapshot */
  systemSnapshot: SystemSnapshot;
  /** Total uptime across all sessions (ms) */
  totalUptime: number;
  /** Number of sessions */
  sessionCount: number;
}

export interface ActiveTask {
  id: string;
  type: 'execution' | 'analysis' | 'generation' | 'learning' | 'optimization';
  description: string;
  /** Progress (0-1) */
  progress: number;
  /** State data needed to resume */
  resumeState: Record<string, unknown>;
  /** Priority */
  priority: number;
  /** When task was started */
  startedAt: number;
  /** Estimated completion percentage when interrupted */
  lastCheckpoint: number;
}

export interface ProjectContext {
  projectId: string;
  projectName: string;
  /** Files being actively worked on */
  activeFiles: string[];
  /** Recent changes made */
  recentChanges: { file: string; type: string; timestamp: number }[];
  /** Current focus area */
  focusArea?: string;
}

export interface ConversationContext {
  /** Recent messages for context */
  recentMessages: { role: string; content: string; timestamp: number }[];
  /** Current topic/intent */
  currentTopic?: string;
  /** Pending user requests */
  pendingRequests: { id: string; request: string; timestamp: number }[];
}

export interface PersistentGoal {
  id: string;
  description: string;
  metric: string;
  targetValue: number;
  currentValue: number;
  progress: number;
  createdAt: number;
  deadline?: number;
  sessionsActive: number;
  status: 'active' | 'achieved' | 'failed' | 'paused';
}

export interface SystemSnapshot {
  memoryUsage: { heapUsed: number; heapTotal: number };
  componentsReady: string[];
  lastHealthCheck: number;
  errors: { timestamp: number; message: string }[];
}

export interface ContinuityReport {
  sessionId: string;
  previousSessionId?: string;
  timeSinceLastSession: number;
  resumedTasks: number;
  restoredContext: boolean;
  goalsInProgress: number;
  continuityScore: number; // 0-1, how well we maintained continuity
}

// ============================================================================
// SESSION CONTINUITY MANAGER
// ============================================================================

export class SessionContinuityManager {
  private static instance: SessionContinuityManager;
  
  private state: SessionState;
  private dataDir: string;
  private stateFile: string;
  private saveInterval: NodeJS.Timeout | null = null;
  private sessionStartTime: number;

  private readonly SAVE_INTERVAL_MS = 30 * 1000; // Save every 30 seconds
  private readonly MAX_RECENT_MESSAGES = 20;
  private readonly MAX_RECENT_CHANGES = 50;
  private readonly MAX_ERRORS = 100;

  private constructor() {
    this.dataDir = path.join(process.cwd(), 'data', 'continuity');
    this.stateFile = path.join(this.dataDir, 'session-state.json');
    this.sessionStartTime = Date.now();

    this.state = this.createFreshState();
  }

  static getInstance(): SessionContinuityManager {
    if (!SessionContinuityManager.instance) {
      SessionContinuityManager.instance = new SessionContinuityManager();
    }
    return SessionContinuityManager.instance;
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  async initialize(): Promise<ContinuityReport> {
    console.log('[SessionContinuity] Initializing cross-session continuity...');
    
    await fs.ensureDir(this.dataDir);
    
    // Load previous session state
    const previousState = await this.loadPreviousState();
    
    // Create new session with continuity from previous
    this.state = this.createFreshState();
    
    let report: ContinuityReport;
    
    if (previousState) {
      report = await this.restoreContinuity(previousState);
    } else {
      report = {
        sessionId: this.state.sessionId,
        timeSinceLastSession: 0,
        resumedTasks: 0,
        restoredContext: false,
        goalsInProgress: 0,
        continuityScore: 0,
      };
    }
    
    this.setupEventListeners();
    this.startPeriodicSave();

    bus.publish('cortex', 'continuity:session_started', {
      sessionId: this.state.sessionId,
      previousSessionId: this.state.previousSessionId,
      continuityScore: report.continuityScore,
    });

    console.log(`[SessionContinuity] Session ${this.state.sessionId.substring(0, 8)}... started`);
    if (report.previousSessionId) {
      console.log(`[SessionContinuity] Continuity from ${report.previousSessionId.substring(0, 8)}... (score: ${(report.continuityScore * 100).toFixed(0)}%)`);
    }

    return report;
  }

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  private createFreshState(): SessionState {
    return {
      sessionId: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      startedAt: Date.now(),
      activeTasks: [],
      projectContext: null,
      conversationContext: null,
      persistentGoals: [],
      systemSnapshot: {
        memoryUsage: process.memoryUsage(),
        componentsReady: [],
        lastHealthCheck: Date.now(),
        errors: [],
      },
      totalUptime: 0,
      sessionCount: 1,
    };
  }

  private async restoreContinuity(previousState: SessionState): Promise<ContinuityReport> {
    const timeSinceLastSession = Date.now() - (previousState.systemSnapshot.lastHealthCheck || previousState.startedAt);
    
    // Transfer continuity data
    this.state.previousSessionId = previousState.sessionId;
    this.state.previousSessionEndedAt = previousState.systemSnapshot.lastHealthCheck;
    this.state.totalUptime = previousState.totalUptime + (previousState.systemSnapshot.lastHealthCheck - previousState.startedAt);
    this.state.sessionCount = previousState.sessionCount + 1;
    
    // Restore persistent goals
    this.state.persistentGoals = previousState.persistentGoals.filter(g => g.status === 'active');
    for (const goal of this.state.persistentGoals) {
      goal.sessionsActive++;
    }
    
    // Restore active tasks that can be resumed
    const resumableTasks = previousState.activeTasks.filter(t => t.progress < 1 && t.progress > 0);
    this.state.activeTasks = resumableTasks;
    
    // Restore project context if recent
    if (previousState.projectContext && timeSinceLastSession < 24 * 60 * 60 * 1000) {
      this.state.projectContext = previousState.projectContext;
    }
    
    // Restore conversation context if very recent (< 1 hour)
    if (previousState.conversationContext && timeSinceLastSession < 60 * 60 * 1000) {
      this.state.conversationContext = previousState.conversationContext;
    }
    
    // Calculate continuity score
    let score = 0;
    if (this.state.persistentGoals.length > 0) score += 0.3;
    if (this.state.activeTasks.length > 0) score += 0.3;
    if (this.state.projectContext) score += 0.2;
    if (this.state.conversationContext) score += 0.2;
    
    // Emit events for resumed tasks
    for (const task of this.state.activeTasks) {
      bus.publish('cortex', 'continuity:task_resumed', {
        taskId: task.id,
        type: task.type,
        progress: task.progress,
      });
    }
    
    return {
      sessionId: this.state.sessionId,
      previousSessionId: previousState.sessionId,
      timeSinceLastSession,
      resumedTasks: this.state.activeTasks.length,
      restoredContext: !!this.state.projectContext || !!this.state.conversationContext,
      goalsInProgress: this.state.persistentGoals.length,
      continuityScore: score,
    };
  }

  // ============================================================================
  // TASK TRACKING
  // ============================================================================

  /**
   * Register an active task for potential resumption
   */
  trackTask(task: Omit<ActiveTask, 'startedAt' | 'lastCheckpoint'>): void {
    const existingIndex = this.state.activeTasks.findIndex(t => t.id === task.id);
    
    const trackedTask: ActiveTask = {
      ...task,
      startedAt: existingIndex >= 0 ? this.state.activeTasks[existingIndex]!.startedAt : Date.now(),
      lastCheckpoint: task.progress,
    };
    
    if (existingIndex >= 0) {
      this.state.activeTasks[existingIndex] = trackedTask;
    } else {
      this.state.activeTasks.push(trackedTask);
    }
  }

  /**
   * Update task progress
   */
  updateTaskProgress(taskId: string, progress: number, resumeState?: Record<string, unknown>): void {
    const task = this.state.activeTasks.find(t => t.id === taskId);
    if (task) {
      task.progress = progress;
      task.lastCheckpoint = progress;
      if (resumeState) {
        task.resumeState = resumeState;
      }
      
      // Remove completed tasks
      if (progress >= 1) {
        this.state.activeTasks = this.state.activeTasks.filter(t => t.id !== taskId);
      }
    }
  }

  /**
   * Get tasks that need to be resumed
   */
  getResumableTasks(): ActiveTask[] {
    return this.state.activeTasks.filter(t => t.progress > 0 && t.progress < 1);
  }

  // ============================================================================
  // CONTEXT MANAGEMENT
  // ============================================================================

  /**
   * Update project context
   */
  setProjectContext(context: ProjectContext): void {
    this.state.projectContext = context;
  }

  /**
   * Add a recent change to project context
   */
  addProjectChange(file: string, type: string): void {
    if (!this.state.projectContext) return;
    
    this.state.projectContext.recentChanges.push({
      file,
      type,
      timestamp: Date.now(),
    });
    
    // Keep only recent changes
    if (this.state.projectContext.recentChanges.length > this.MAX_RECENT_CHANGES) {
      this.state.projectContext.recentChanges = 
        this.state.projectContext.recentChanges.slice(-this.MAX_RECENT_CHANGES);
    }
  }

  /**
   * Add a conversation message
   */
  addConversationMessage(role: string, content: string): void {
    if (!this.state.conversationContext) {
      this.state.conversationContext = {
        recentMessages: [],
        pendingRequests: [],
      };
    }
    
    this.state.conversationContext.recentMessages.push({
      role,
      content: content.substring(0, 1000), // Truncate long messages
      timestamp: Date.now(),
    });
    
    // Keep only recent messages
    if (this.state.conversationContext.recentMessages.length > this.MAX_RECENT_MESSAGES) {
      this.state.conversationContext.recentMessages = 
        this.state.conversationContext.recentMessages.slice(-this.MAX_RECENT_MESSAGES);
    }
  }

  // ============================================================================
  // GOAL TRACKING
  // ============================================================================

  /**
   * Add a persistent goal
   */
  addPersistentGoal(goal: Omit<PersistentGoal, 'id' | 'createdAt' | 'sessionsActive' | 'status'>): PersistentGoal {
    const newGoal: PersistentGoal = {
      ...goal,
      id: `goal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      sessionsActive: 1,
      status: 'active',
    };
    
    this.state.persistentGoals.push(newGoal);
    
    bus.publish('cortex', 'continuity:goal_added', {
      goalId: newGoal.id,
      description: newGoal.description,
    });
    
    return newGoal;
  }

  /**
   * Update goal progress
   */
  updateGoalProgress(goalId: string, currentValue: number): void {
    const goal = this.state.persistentGoals.find(g => g.id === goalId);
    if (goal) {
      goal.currentValue = currentValue;
      goal.progress = Math.min(1, currentValue / goal.targetValue);
      
      if (goal.progress >= 1) {
        goal.status = 'achieved';
        bus.publish('cortex', 'continuity:goal_achieved', {
          goalId,
          sessionsToAchieve: goal.sessionsActive,
        });
      }
    }
  }

  /**
   * Get active goals
   */
  getActiveGoals(): PersistentGoal[] {
    return this.state.persistentGoals.filter(g => g.status === 'active');
  }

  // ============================================================================
  // SYSTEM SNAPSHOT
  // ============================================================================

  /**
   * Update system snapshot
   */
  updateSnapshot(): void {
    this.state.systemSnapshot = {
      memoryUsage: process.memoryUsage(),
      componentsReady: this.state.systemSnapshot.componentsReady,
      lastHealthCheck: Date.now(),
      errors: this.state.systemSnapshot.errors,
    };
  }

  /**
   * Record component ready
   */
  recordComponentReady(componentName: string): void {
    if (!this.state.systemSnapshot.componentsReady.includes(componentName)) {
      this.state.systemSnapshot.componentsReady.push(componentName);
    }
  }

  /**
   * Record error
   */
  recordError(message: string): void {
    this.state.systemSnapshot.errors.push({
      timestamp: Date.now(),
      message: message.substring(0, 500),
    });
    
    // Keep only recent errors
    if (this.state.systemSnapshot.errors.length > this.MAX_ERRORS) {
      this.state.systemSnapshot.errors = 
        this.state.systemSnapshot.errors.slice(-this.MAX_ERRORS);
    }
  }

  // ============================================================================
  // EVENT LISTENERS
  // ============================================================================

  private setupEventListeners(): void {
    // Track system components
    bus.on('system:component_ready', (event: SynapsysEvent) => {
      const { component } = event.payload;
      if (component) {
        this.recordComponentReady(component);
      }
    });

    // Track errors
    bus.on('system:error', (event: SynapsysEvent) => {
      const { message } = event.payload;
      if (message) {
        this.recordError(message);
      }
    });

    // Track chat messages
    bus.on('chat:message', (event: SynapsysEvent) => {
      const { role, content } = event.payload;
      if (role && content) {
        this.addConversationMessage(role, content);
      }
    });

    // Track file changes
    bus.on('motor:file:write', (event: SynapsysEvent) => {
      const { path: filePath } = event.payload;
      if (filePath) {
        this.addProjectChange(filePath, 'write');
      }
    });
  }

  // ============================================================================
  // PERSISTENCE
  // ============================================================================

  private startPeriodicSave(): void {
    this.saveInterval = setInterval(
      () => this.saveState().catch(console.error),
      this.SAVE_INTERVAL_MS
    );
  }

  private async loadPreviousState(): Promise<SessionState | null> {
    try {
      if (await fs.pathExists(this.stateFile)) {
        return await fs.readJson(this.stateFile);
      }
    } catch (err) {
      console.warn('[SessionContinuity] Could not load previous state');
    }
    return null;
  }

  private async saveState(): Promise<void> {
    try {
      this.updateSnapshot();
      await fs.writeJson(this.stateFile, this.state, { spaces: 2 });
    } catch (err) {
      console.error('[SessionContinuity] Failed to save state:', err);
    }
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  getState(): SessionState {
    return { ...this.state };
  }

  getSessionId(): string {
    return this.state.sessionId;
  }

  getSessionCount(): number {
    return this.state.sessionCount;
  }

  getTotalUptime(): number {
    return this.state.totalUptime + (Date.now() - this.sessionStartTime);
  }

  async shutdown(): Promise<void> {
    console.log('[SessionContinuity] Saving session state before shutdown...');
    
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
    }
    
    // Final save
    await this.saveState();
    
    bus.publish('cortex', 'continuity:session_ended', {
      sessionId: this.state.sessionId,
      duration: Date.now() - this.sessionStartTime,
      tasksInProgress: this.state.activeTasks.length,
      goalsActive: this.state.persistentGoals.filter(g => g.status === 'active').length,
    });
    
    console.log(`[SessionContinuity] Session ${this.state.sessionId.substring(0, 8)}... ended`);
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const sessionContinuity = SessionContinuityManager.getInstance();
export default SessionContinuityManager;
