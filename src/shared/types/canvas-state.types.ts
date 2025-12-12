// @version 3.3.515
/**
 * Living Canvas State Types
 * 
 * TypeScript definitions for the unified Living Canvas state management system.
 * These types define the project-centric state that powers the 4-layer canvas:
 * 
 * - Layer 1: Communication (chat, command palette)
 * - Layer 2: Execution (task graph, DAG visualization)
 * - Layer 3: Artifacts (code, visuals, documents)
 * - Layer 4: System (metrics, providers, health)
 * 
 * @module shared/types/canvas-state
 */

// ============================================================================
// CORE STATE TYPES
// ============================================================================

/**
 * Unified project state that drives the Living Canvas
 */
export interface ProjectState {
  /** Unique project identifier */
  projectId: string;
  
  /** Project metadata */
  metadata: ProjectMetadata;
  
  /** Layer 1: Communication state */
  communication: CommunicationState;
  
  /** Layer 2: Execution state */
  execution: ExecutionState;
  
  /** Layer 3: Artifact state */
  artifacts: ArtifactState;
  
  /** Layer 4: System state */
  system: SystemState;
  
  /** State synchronization info */
  sync: SyncState;
}

export interface ProjectMetadata {
  name: string;
  description?: string;
  created: string;
  lastModified: string;
  owner: string;
  version: string;
  type: 'web' | 'api' | 'cli' | 'library' | 'mobile' | 'general';
}

// ============================================================================
// LAYER 1: COMMUNICATION STATE
// ============================================================================

export interface CommunicationState {
  /** Full conversation history for this project */
  conversationHistory: Message[];
  
  /** Currently active user intent (what they're trying to do) */
  activeIntent: Intent | null;
  
  /** Command palette state */
  commandPalette: CommandPaletteState;
  
  /** Context drawer state */
  contextDrawer: ContextDrawerState;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  
  /** Message segmentation for timeline display */
  segment: 'decision' | 'discovery' | 'execution' | 'reflection';
  
  /** Associated artifacts created/modified by this message */
  artifactRefs: string[];
  
  /** Provider that generated this response (for assistant messages) */
  provider?: {
    name: string;
    model: string;
    tokens: number;
    cost: number;
  };
}

export interface Intent {
  id: string;
  description: string;
  type: 'generate' | 'modify' | 'analyze' | 'debug' | 'explain';
  confidence: number;
  detectedAt: string;
  context: Record<string, unknown>;
}

export interface CommandPaletteState {
  isOpen: boolean;
  query: string;
  suggestions: CommandSuggestion[];
  selectedIndex: number;
}

export interface CommandSuggestion {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  action: string;
  shortcut?: string;
  score: number;
}

export interface ContextDrawerState {
  isOpen: boolean;
  width: number;
  activeTab: 'related' | 'history' | 'memory';
  relatedMessages: string[];
}

// ============================================================================
// LAYER 2: EXECUTION STATE
// ============================================================================

export interface ExecutionState {
  /** Task decomposition graph from DAG builder */
  taskGraph: TaskNode[];
  
  /** Currently executing context */
  currentExecution: ExecutionContext | null;
  
  /** Execution history for this project */
  executionHistory: ExecutionRecord[];
  
  /** Active validation gates */
  validationGates: ValidationGate[];
}

export interface TaskNode {
  id: string;
  label: string;
  description?: string;
  
  /** Node status in the execution pipeline */
  status: 'pending' | 'planning' | 'executing' | 'validating' | 'complete' | 'failed' | 'awaiting-approval';
  
  /** Parent node IDs (for DAG structure) */
  parents: string[];
  
  /** Child node IDs */
  children: string[];
  
  /** Provider selection for this task */
  provider?: {
    name: string;
    model: string;
    confidence: number;
    reasoning?: string;
  };
  
  /** Execution timing */
  timing?: {
    startedAt?: string;
    completedAt?: string;
    estimatedMs?: number;
    actualMs?: number;
  };
  
  /** Output from this task */
  output?: {
    type: 'artifact' | 'decision' | 'validation';
    refId?: string;
    value?: unknown;
  };
}

export interface ExecutionContext {
  id: string;
  taskId: string;
  startedAt: string;
  
  /** Current step in multi-step execution */
  currentStep: number;
  totalSteps: number;
  
  /** Live logs/output stream */
  liveOutput: string[];
  
  /** Resources being used */
  resources: {
    sandboxId?: string;
    tokens: number;
    estimatedCost: number;
  };
}

export interface ExecutionRecord {
  id: string;
  taskId: string;
  startedAt: string;
  completedAt: string;
  status: 'success' | 'failure' | 'cancelled';
  output?: unknown;
  error?: string;
}

export interface ValidationGate {
  id: string;
  taskId: string;
  type: 'syntax' | 'semantic' | 'acceptance';
  status: 'pending' | 'passed' | 'failed' | 'skipped';
  result?: {
    confidence: number;
    issues: ValidationIssue[];
    autoFixable: boolean;
  };
}

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  message: string;
  location?: {
    file: string;
    line: number;
    column?: number;
  };
  suggestedFix?: string;
}

// ============================================================================
// LAYER 3: ARTIFACT STATE
// ============================================================================

export interface ArtifactState {
  /** All artifacts in this project */
  artifacts: Artifact[];
  
  /** Currently focused artifact */
  activeArtifactId: string | null;
  
  /** Artifact being compared (for diff view) */
  compareArtifactId: string | null;
  
  /** Version being viewed (for time-travel) */
  viewingVersionIndex: number | null;
  
  /** Artifact relationships for dependency graph */
  relationships: ArtifactRelationship[];
}

export interface Artifact {
  id: string;
  name: string;
  type: 'code' | 'design' | 'document' | 'data' | 'visual' | 'config';
  
  /** File path within project */
  path: string;
  
  /** MIME type for rendering */
  mimeType: string;
  
  /** Current content */
  content: string;
  
  /** Version history */
  versions: ArtifactVersion[];
  
  /** Creation provenance */
  provenance: ArtifactProvenance;
  
  /** Quality status */
  quality: ArtifactQuality;
  
  /** Metadata for search/filtering */
  metadata: {
    language?: string;
    framework?: string;
    tags: string[];
    size: number;
    lines?: number;
  };
  
  timestamps: {
    created: string;
    modified: string;
    lastAccessed?: string;
  };
}

export interface ArtifactVersion {
  id: string;
  index: number;
  content: string;
  timestamp: string;
  
  /** What changed from previous version */
  diff?: {
    additions: number;
    deletions: number;
    changes: string[];
  };
  
  /** Who/what made this change */
  author: {
    type: 'user' | 'ai' | 'system';
    id?: string;
    provider?: string;
  };
  
  /** Message associated with this version */
  messageRef?: string;
}

export interface ArtifactProvenance {
  /** Message that created this artifact */
  createdBy: {
    messageId: string;
    prompt: string;
  };
  
  /** Provider/model that generated it */
  generator: {
    provider: string;
    model: string;
    temperature?: number;
  };
  
  /** All modifications with their sources */
  modifications: {
    versionId: string;
    messageId: string;
    timestamp: string;
  }[];
}

export interface ArtifactQuality {
  /** Validation status */
  validationStatus: 'pending' | 'passed' | 'failed' | 'skipped';
  
  /** QA Guardian score */
  qaScore: number;
  
  /** Issues found */
  issues: ValidationIssue[];
  
  /** Last validation time */
  lastValidated?: string;
}

export interface ArtifactRelationship {
  sourceId: string;
  targetId: string;
  type: 'imports' | 'exports' | 'references' | 'generates' | 'derives-from';
}

// ============================================================================
// LAYER 4: SYSTEM STATE
// ============================================================================

export interface SystemState {
  /** Real-time system metrics */
  metrics: SystemMetrics;
  
  /** Active provider chain for current operations */
  providerChain: ProviderExecution[];
  
  /** QA Guardian status */
  qaStatus: QAStatus;
  
  /** Resource usage */
  resources: ResourceUsage;
  
  /** Active alerts/notifications */
  alerts: SystemAlert[];
}

export interface SystemMetrics {
  /** Token usage in current session */
  sessionTokens: number;
  
  /** Estimated cost for current session */
  sessionCost: number;
  
  /** Requests made this session */
  requestCount: number;
  
  /** Average response time (ms) */
  avgResponseTime: number;
  
  /** Success rate percentage */
  successRate: number;
  
  /** System health score */
  healthScore: number;
}

export interface ProviderExecution {
  provider: string;
  model: string;
  status: 'pending' | 'streaming' | 'complete' | 'failed';
  startedAt?: string;
  completedAt?: string;
  tokens?: number;
  cost?: number;
  latencyMs?: number;
}

export interface QAStatus {
  /** Overall health */
  health: 'healthy' | 'degraded' | 'critical';
  
  /** Last check time */
  lastCheck: string;
  
  /** Wire coverage percentage */
  wireCoverage: number;
  
  /** Perfection score */
  perfectionScore: number;
  
  /** Active issues count */
  activeIssues: number;
  
  /** Auto-fix queue */
  pendingFixes: number;
}

export interface ResourceUsage {
  /** Sandbox resource usage */
  sandbox: {
    active: number;
    cpuPercent: number;
    memoryMb: number;
  };
  
  /** Daily limits */
  limits: {
    requestsUsed: number;
    requestsLimit: number;
    tokensUsed: number;
    tokensLimit: number;
  };
}

export interface SystemAlert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: string;
  dismissed: boolean;
  action?: {
    label: string;
    handler: string;
  };
}

// ============================================================================
// SYNC STATE
// ============================================================================

export interface SyncState {
  /** WebSocket connection status */
  connected: boolean;
  
  /** Last sync with backend */
  lastSync: string;
  
  /** Pending changes not yet synced */
  pendingChanges: number;
  
  /** Conflict resolution state */
  conflicts: SyncConflict[];
  
  /** Auto-save status */
  autoSave: {
    enabled: boolean;
    lastSaved: string;
    intervalMs: number;
  };
}

export interface SyncConflict {
  id: string;
  artifactId: string;
  localVersion: string;
  remoteVersion: string;
  detectedAt: string;
  resolution?: 'local' | 'remote' | 'merged';
}

// ============================================================================
// CANVAS EMOTION STATE (from existing canvasStateStore)
// ============================================================================

export type CanvasEmotion = 
  | 'resting' 
  | 'attentive' 
  | 'thinking' 
  | 'creating' 
  | 'excited' 
  | 'accomplished' 
  | 'error' 
  | 'resonating';

export interface EmotionConfig {
  name: CanvasEmotion;
  primaryHue: number;
  secondaryHue: number;
  intensity: number;
  waveSpeed: number;
  particleDensity: number;
  glowRadius: number;
}

export type PerformanceBudget = 'minimal' | 'low' | 'balanced' | 'high' | 'ultra';

export interface PerformanceConfig {
  name: string;
  description: string;
  useWebGL: boolean;
  maxParticles: number;
  enableBlur: boolean;
  enableGlow: boolean;
  enableParallax: boolean;
  fps: number;
}

// ============================================================================
// STORE ACTIONS (for Zustand)
// ============================================================================

export interface ProjectStateActions {
  // Project lifecycle
  loadProject: (projectId: string) => Promise<void>;
  createProject: (metadata: Partial<ProjectMetadata>) => Promise<string>;
  saveProject: () => Promise<void>;
  
  // Communication actions
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  setIntent: (intent: Intent | null) => void;
  toggleCommandPalette: () => void;
  
  // Execution actions
  startExecution: (taskNode: TaskNode) => void;
  updateTaskStatus: (taskId: string, status: TaskNode['status']) => void;
  approveGate: (gateId: string) => void;
  rejectGate: (gateId: string, reason: string) => void;
  
  // Artifact actions
  addArtifact: (artifact: Omit<Artifact, 'id' | 'versions' | 'timestamps'>) => string;
  updateArtifact: (id: string, content: string, author: ArtifactVersion['author']) => void;
  setActiveArtifact: (id: string | null) => void;
  viewVersion: (artifactId: string, versionIndex: number) => void;
  restoreVersion: (artifactId: string, versionIndex: number) => void;
  
  // System actions
  updateMetrics: (metrics: Partial<SystemMetrics>) => void;
  addAlert: (alert: Omit<SystemAlert, 'id' | 'timestamp' | 'dismissed'>) => void;
  dismissAlert: (alertId: string) => void;
  
  // Sync actions
  syncWithBackend: () => Promise<void>;
  resolveConflict: (conflictId: string, resolution: 'local' | 'remote' | 'merged') => void;
}

// ============================================================================
// COMPLETE STORE TYPE
// ============================================================================

export type ProjectStore = ProjectState & ProjectStateActions;

// ============================================================================
// INITIAL STATE FACTORY
// ============================================================================

export function createInitialProjectState(projectId: string, metadata: Partial<ProjectMetadata> = {}): ProjectState {
  const now = new Date().toISOString();
  
  return {
    projectId,
    metadata: {
      name: metadata.name || 'Untitled Project',
      description: metadata.description,
      created: now,
      lastModified: now,
      owner: metadata.owner || 'anonymous',
      version: '0.1.0',
      type: metadata.type || 'general',
    },
    communication: {
      conversationHistory: [],
      activeIntent: null,
      commandPalette: {
        isOpen: false,
        query: '',
        suggestions: [],
        selectedIndex: 0,
      },
      contextDrawer: {
        isOpen: false,
        width: 320,
        activeTab: 'related',
        relatedMessages: [],
      },
    },
    execution: {
      taskGraph: [],
      currentExecution: null,
      executionHistory: [],
      validationGates: [],
    },
    artifacts: {
      artifacts: [],
      activeArtifactId: null,
      compareArtifactId: null,
      viewingVersionIndex: null,
      relationships: [],
    },
    system: {
      metrics: {
        sessionTokens: 0,
        sessionCost: 0,
        requestCount: 0,
        avgResponseTime: 0,
        successRate: 100,
        healthScore: 100,
      },
      providerChain: [],
      qaStatus: {
        health: 'healthy',
        lastCheck: now,
        wireCoverage: 95,
        perfectionScore: 90,
        activeIssues: 0,
        pendingFixes: 0,
      },
      resources: {
        sandbox: { active: 0, cpuPercent: 0, memoryMb: 0 },
        limits: { requestsUsed: 0, requestsLimit: 1000, tokensUsed: 0, tokensLimit: 100000 },
      },
      alerts: [],
    },
    sync: {
      connected: false,
      lastSync: now,
      pendingChanges: 0,
      conflicts: [],
      autoSave: {
        enabled: true,
        lastSaved: now,
        intervalMs: 30000,
      },
    },
  };
}
