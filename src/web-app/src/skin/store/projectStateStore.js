// @version 3.3.516
/**
 * Project State Store
 * 
 * Zustand store for unified Living Canvas project state management.
 * This store manages the 4-layer architecture:
 * - Layer 1: Communication (chat, commands)
 * - Layer 2: Execution (tasks, DAG)
 * - Layer 3: Artifacts (code, visuals)
 * - Layer 4: System (metrics, health)
 * 
 * Integrates with canvasStateStore for emotional/visual state.
 * 
 * @module skin/store/projectStateStore
 */

import { create } from 'zustand';
import { subscribeWithSelector, persist } from 'zustand/middleware';
import { io } from 'socket.io-client';

// ============================================================================
// INITIAL STATE FACTORY
// ============================================================================

const createInitialState = (projectId = null) => ({
  // Project identity
  projectId,
  metadata: {
    name: 'Untitled Project',
    description: '',
    created: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    owner: 'anonymous',
    version: '0.1.0',
    type: 'general',
  },
  
  // Layer 1: Communication
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
  
  // Layer 2: Execution
  execution: {
    taskGraph: [],
    currentExecution: null,
    executionHistory: [],
    validationGates: [],
  },
  
  // Layer 3: Artifacts
  artifacts: {
    items: [],
    activeArtifactId: null,
    compareArtifactId: null,
    viewingVersionIndex: null,
    relationships: [],
  },
  
  // Layer 4: System
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
      lastCheck: new Date().toISOString(),
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
  
  // Sync state
  sync: {
    connected: false,
    lastSync: new Date().toISOString(),
    pendingChanges: 0,
    conflicts: [],
    autoSave: {
      enabled: true,
      lastSaved: new Date().toISOString(),
      intervalMs: 30000,
    },
  },
});

// ============================================================================
// SOCKET CONNECTION
// ============================================================================

let socket = null;

const initSocket = (set, get) => {
  if (socket?.connected) return;
  
  try {
    socket = io(window.location.origin, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    
    socket.on('connect', () => {
      console.log('[ProjectStore] Socket connected');
      set((state) => ({
        sync: { ...state.sync, connected: true },
      }));
    });
    
    socket.on('disconnect', () => {
      console.log('[ProjectStore] Socket disconnected');
      set((state) => ({
        sync: { ...state.sync, connected: false },
      }));
    });
    
    // Listen for project updates from backend
    socket.on('project:update', (data) => {
      const currentProject = get().projectId;
      if (data.projectId === currentProject) {
        set((state) => ({
          ...state,
          ...data.state,
          sync: { ...state.sync, lastSync: new Date().toISOString() },
        }));
      }
    });
    
    // Listen for task execution updates
    socket.on('execution:update', (data) => {
      const currentProject = get().projectId;
      if (data.projectId === currentProject) {
        get().updateTaskStatus(data.taskId, data.status);
      }
    });
    
    // Listen for artifact changes
    socket.on('artifact:created', (data) => {
      const currentProject = get().projectId;
      if (data.projectId === currentProject) {
        get().addArtifact(data.artifact);
      }
    });
    
    // Listen for system metrics updates
    socket.on('synapsys:event', (data) => {
      if (data.type === 'metrics:update') {
        get().updateMetrics(data.payload);
      }
    });
    
  } catch (err) {
    console.error('[ProjectStore] Socket init failed:', err);
  }
};

// ============================================================================
// STORE DEFINITION
// ============================================================================

export const useProjectStore = create(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        ...createInitialState(),
        
        // ====================================================================
        // PROJECT LIFECYCLE
        // ====================================================================
        
        loadProject: async (projectId) => {
          try {
            const response = await fetch(`/api/v1/projects/${projectId}`);
            if (!response.ok) throw new Error('Failed to load project');
            
            const { project } = await response.json();
            
            set({
              projectId,
              metadata: {
                name: project.name,
                description: project.description,
                created: project.createdAt,
                lastModified: project.updatedAt,
                owner: project.owner,
                version: project.currentVersion,
                type: project.type,
              },
              sync: {
                ...get().sync,
                lastSync: new Date().toISOString(),
              },
            });
            
            // Initialize socket connection
            initSocket(set, get);
            
            // Join project room
            if (socket?.connected) {
              socket.emit('project:join', { projectId });
            }
            
          } catch (err) {
            console.error('[ProjectStore] Load failed:', err);
            get().addAlert({
              type: 'error',
              title: 'Failed to load project',
              message: err.message,
            });
          }
        },
        
        createProject: async (metadata = {}) => {
          try {
            const response = await fetch('/api/v1/projects', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: metadata.name || 'Untitled Project',
                description: metadata.description,
                type: metadata.type || 'general',
              }),
            });
            
            if (!response.ok) throw new Error('Failed to create project');
            
            const { project } = await response.json();
            
            // Load the new project
            await get().loadProject(project.id);
            
            return project.id;
          } catch (err) {
            console.error('[ProjectStore] Create failed:', err);
            get().addAlert({
              type: 'error',
              title: 'Failed to create project',
              message: err.message,
            });
            return null;
          }
        },
        
        saveProject: async () => {
          const state = get();
          if (!state.projectId) return;
          
          try {
            // Emit save via socket for real-time sync
            if (socket?.connected) {
              socket.emit('project:save', {
                projectId: state.projectId,
                state: {
                  communication: state.communication,
                  execution: state.execution,
                  artifacts: state.artifacts,
                },
              });
            }
            
            set((s) => ({
              metadata: { ...s.metadata, lastModified: new Date().toISOString() },
              sync: {
                ...s.sync,
                lastSaved: new Date().toISOString(),
                pendingChanges: 0,
              },
            }));
          } catch (err) {
            console.error('[ProjectStore] Save failed:', err);
          }
        },
        
        resetProject: () => {
          if (socket?.connected && get().projectId) {
            socket.emit('project:leave', { projectId: get().projectId });
          }
          set(createInitialState());
        },
        
        // ====================================================================
        // LAYER 1: COMMUNICATION ACTIONS
        // ====================================================================
        
        addMessage: (message) => {
          const newMessage = {
            id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            timestamp: new Date().toISOString(),
            artifactRefs: [],
            segment: 'execution',
            ...message,
          };
          
          set((state) => ({
            communication: {
              ...state.communication,
              conversationHistory: [...state.communication.conversationHistory, newMessage],
            },
            sync: { ...state.sync, pendingChanges: state.sync.pendingChanges + 1 },
          }));
          
          return newMessage.id;
        },
        
        setIntent: (intent) => {
          set((state) => ({
            communication: { ...state.communication, activeIntent: intent },
          }));
        },
        
        toggleCommandPalette: () => {
          set((state) => ({
            communication: {
              ...state.communication,
              commandPalette: {
                ...state.communication.commandPalette,
                isOpen: !state.communication.commandPalette.isOpen,
                query: '',
                suggestions: [],
                selectedIndex: 0,
              },
            },
          }));
        },
        
        setCommandQuery: (query) => {
          // Generate suggestions based on query
          const suggestions = generateCommandSuggestions(query, get());
          
          set((state) => ({
            communication: {
              ...state.communication,
              commandPalette: {
                ...state.communication.commandPalette,
                query,
                suggestions,
                selectedIndex: 0,
              },
            },
          }));
        },
        
        selectCommandSuggestion: (index) => {
          set((state) => ({
            communication: {
              ...state.communication,
              commandPalette: {
                ...state.communication.commandPalette,
                selectedIndex: index,
              },
            },
          }));
        },
        
        toggleContextDrawer: () => {
          set((state) => ({
            communication: {
              ...state.communication,
              contextDrawer: {
                ...state.communication.contextDrawer,
                isOpen: !state.communication.contextDrawer.isOpen,
              },
            },
          }));
        },
        
        // ====================================================================
        // LAYER 2: EXECUTION ACTIONS
        // ====================================================================
        
        addTask: (task) => {
          const newTask = {
            id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            status: 'pending',
            parents: [],
            children: [],
            ...task,
          };
          
          set((state) => ({
            execution: {
              ...state.execution,
              taskGraph: [...state.execution.taskGraph, newTask],
            },
          }));
          
          return newTask.id;
        },
        
        updateTaskStatus: (taskId, status, output = null) => {
          set((state) => ({
            execution: {
              ...state.execution,
              taskGraph: state.execution.taskGraph.map((task) =>
                task.id === taskId
                  ? {
                      ...task,
                      status,
                      output: output || task.output,
                      timing: {
                        ...task.timing,
                        ...(status === 'executing' && !task.timing?.startedAt
                          ? { startedAt: new Date().toISOString() }
                          : {}),
                        ...(status === 'complete' || status === 'failed'
                          ? { completedAt: new Date().toISOString() }
                          : {}),
                      },
                    }
                  : task
              ),
            },
          }));
        },
        
        startExecution: (taskId) => {
          const task = get().execution.taskGraph.find((t) => t.id === taskId);
          if (!task) return;
          
          const context = {
            id: `exec-${Date.now()}`,
            taskId,
            startedAt: new Date().toISOString(),
            currentStep: 1,
            totalSteps: 1,
            liveOutput: [],
            resources: { tokens: 0, estimatedCost: 0 },
          };
          
          set((state) => ({
            execution: {
              ...state.execution,
              currentExecution: context,
            },
          }));
          
          get().updateTaskStatus(taskId, 'executing');
        },
        
        completeExecution: (success = true, output = null) => {
          const exec = get().execution.currentExecution;
          if (!exec) return;
          
          // Record in history
          const record = {
            id: exec.id,
            taskId: exec.taskId,
            startedAt: exec.startedAt,
            completedAt: new Date().toISOString(),
            status: success ? 'success' : 'failure',
            output,
          };
          
          set((state) => ({
            execution: {
              ...state.execution,
              currentExecution: null,
              executionHistory: [...state.execution.executionHistory, record],
            },
          }));
          
          get().updateTaskStatus(exec.taskId, success ? 'complete' : 'failed', output);
        },
        
        addValidationGate: (taskId, type) => {
          const gate = {
            id: `gate-${Date.now()}`,
            taskId,
            type,
            status: 'pending',
            result: null,
          };
          
          set((state) => ({
            execution: {
              ...state.execution,
              validationGates: [...state.execution.validationGates, gate],
            },
          }));
          
          return gate.id;
        },
        
        approveGate: (gateId) => {
          set((state) => ({
            execution: {
              ...state.execution,
              validationGates: state.execution.validationGates.map((g) =>
                g.id === gateId ? { ...g, status: 'passed' } : g
              ),
            },
          }));
        },
        
        rejectGate: (gateId, reason) => {
          set((state) => ({
            execution: {
              ...state.execution,
              validationGates: state.execution.validationGates.map((g) =>
                g.id === gateId
                  ? { ...g, status: 'failed', result: { ...g.result, issues: [{ severity: 'error', message: reason }] } }
                  : g
              ),
            },
          }));
        },
        
        // ====================================================================
        // LAYER 3: ARTIFACT ACTIONS
        // ====================================================================
        
        addArtifact: (artifact) => {
          const now = new Date().toISOString();
          const newArtifact = {
            id: `artifact-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            versions: [
              {
                id: `v-${Date.now()}`,
                index: 0,
                content: artifact.content,
                timestamp: now,
                author: artifact.author || { type: 'ai' },
              },
            ],
            provenance: {
              createdBy: artifact.provenance?.createdBy || { messageId: '', prompt: '' },
              generator: artifact.provenance?.generator || { provider: 'unknown', model: 'unknown' },
              modifications: [],
            },
            quality: {
              validationStatus: 'pending',
              qaScore: 0,
              issues: [],
            },
            timestamps: {
              created: now,
              modified: now,
            },
            ...artifact,
          };
          
          set((state) => ({
            artifacts: {
              ...state.artifacts,
              items: [...state.artifacts.items, newArtifact],
            },
            sync: { ...state.sync, pendingChanges: state.sync.pendingChanges + 1 },
          }));
          
          return newArtifact.id;
        },
        
        updateArtifact: (id, content, author = { type: 'user' }) => {
          const now = new Date().toISOString();
          
          set((state) => ({
            artifacts: {
              ...state.artifacts,
              items: state.artifacts.items.map((a) => {
                if (a.id !== id) return a;
                
                const newVersion = {
                  id: `v-${Date.now()}`,
                  index: a.versions.length,
                  content,
                  timestamp: now,
                  author,
                };
                
                return {
                  ...a,
                  content,
                  versions: [...a.versions, newVersion],
                  timestamps: { ...a.timestamps, modified: now },
                  quality: { ...a.quality, validationStatus: 'pending' },
                };
              }),
            },
            sync: { ...state.sync, pendingChanges: state.sync.pendingChanges + 1 },
          }));
        },
        
        setActiveArtifact: (id) => {
          set((state) => ({
            artifacts: {
              ...state.artifacts,
              activeArtifactId: id,
              viewingVersionIndex: null,
            },
          }));
        },
        
        viewVersion: (artifactId, versionIndex) => {
          set((state) => ({
            artifacts: {
              ...state.artifacts,
              activeArtifactId: artifactId,
              viewingVersionIndex: versionIndex,
            },
          }));
        },
        
        restoreVersion: (artifactId, versionIndex) => {
          const artifact = get().artifacts.items.find((a) => a.id === artifactId);
          if (!artifact || !artifact.versions[versionIndex]) return;
          
          const versionContent = artifact.versions[versionIndex].content;
          get().updateArtifact(artifactId, versionContent, { type: 'user' });
          
          set((state) => ({
            artifacts: { ...state.artifacts, viewingVersionIndex: null },
          }));
        },
        
        // ====================================================================
        // LAYER 4: SYSTEM ACTIONS
        // ====================================================================
        
        updateMetrics: (metrics) => {
          set((state) => ({
            system: {
              ...state.system,
              metrics: { ...state.system.metrics, ...metrics },
            },
          }));
        },
        
        updateQAStatus: (status) => {
          set((state) => ({
            system: {
              ...state.system,
              qaStatus: { ...state.system.qaStatus, ...status },
            },
          }));
        },
        
        addProviderToChain: (provider) => {
          set((state) => ({
            system: {
              ...state.system,
              providerChain: [...state.system.providerChain, { ...provider, status: 'pending' }],
            },
          }));
        },
        
        updateProviderStatus: (index, status, metrics = {}) => {
          set((state) => ({
            system: {
              ...state.system,
              providerChain: state.system.providerChain.map((p, i) =>
                i === index ? { ...p, status, ...metrics } : p
              ),
            },
          }));
        },
        
        clearProviderChain: () => {
          set((state) => ({
            system: { ...state.system, providerChain: [] },
          }));
        },
        
        addAlert: (alert) => {
          const newAlert = {
            id: `alert-${Date.now()}`,
            timestamp: new Date().toISOString(),
            dismissed: false,
            ...alert,
          };
          
          set((state) => ({
            system: {
              ...state.system,
              alerts: [...state.system.alerts, newAlert],
            },
          }));
          
          // Auto-dismiss success alerts after 5 seconds
          if (alert.type === 'success') {
            setTimeout(() => get().dismissAlert(newAlert.id), 5000);
          }
          
          return newAlert.id;
        },
        
        dismissAlert: (alertId) => {
          set((state) => ({
            system: {
              ...state.system,
              alerts: state.system.alerts.map((a) =>
                a.id === alertId ? { ...a, dismissed: true } : a
              ),
            },
          }));
        },
        
        // ====================================================================
        // SYNC ACTIONS
        // ====================================================================
        
        syncWithBackend: async () => {
          const state = get();
          if (!state.projectId || !socket?.connected) return;
          
          try {
            socket.emit('project:sync', {
              projectId: state.projectId,
              state: {
                communication: state.communication,
                execution: state.execution,
                artifacts: state.artifacts,
              },
            });
            
            set((s) => ({
              sync: {
                ...s.sync,
                lastSync: new Date().toISOString(),
                pendingChanges: 0,
              },
            }));
          } catch (err) {
            console.error('[ProjectStore] Sync failed:', err);
          }
        },
        
        resolveConflict: (conflictId, resolution) => {
          set((state) => ({
            sync: {
              ...state.sync,
              conflicts: state.sync.conflicts.map((c) =>
                c.id === conflictId ? { ...c, resolution } : c
              ),
            },
          }));
        },
      }),
      {
        name: 'tooloo-project-state',
        partialize: (state) => ({
          // Only persist essential state
          projectId: state.projectId,
          metadata: state.metadata,
          // Don't persist execution state (ephemeral)
          // Don't persist system state (real-time)
        }),
      }
    )
  )
);

// ============================================================================
// COMMAND SUGGESTION GENERATOR
// ============================================================================

function generateCommandSuggestions(query, state) {
  if (!query) return [];
  
  const q = query.toLowerCase();
  const suggestions = [];
  
  // Project commands
  if ('new project'.includes(q) || 'create project'.includes(q)) {
    suggestions.push({
      id: 'cmd-new-project',
      label: 'New Project',
      description: 'Create a new project',
      icon: '📁',
      action: 'project:create',
      shortcut: '⌘N',
      score: 100,
    });
  }
  
  // Code generation commands
  if ('generate'.includes(q) || 'create component'.includes(q) || 'make'.includes(q)) {
    suggestions.push({
      id: 'cmd-generate',
      label: 'Generate Code',
      description: 'Generate code with AI',
      icon: '⚡',
      action: 'generate:code',
      score: 90,
    });
  }
  
  // Run/execute commands
  if ('run'.includes(q) || 'execute'.includes(q) || 'test'.includes(q)) {
    suggestions.push({
      id: 'cmd-run',
      label: 'Run Code',
      description: 'Execute in sandbox',
      icon: '▶️',
      action: 'execute:run',
      shortcut: '⌘⏎',
      score: 85,
    });
  }
  
  // Search commands
  if ('search'.includes(q) || 'find'.includes(q)) {
    suggestions.push({
      id: 'cmd-search',
      label: 'Search Project',
      description: 'Search files and code',
      icon: '🔍',
      action: 'search:project',
      shortcut: '⌘⇧F',
      score: 80,
    });
  }
  
  // Memory commands
  if ('remember'.includes(q) || 'memory'.includes(q) || 'context'.includes(q)) {
    suggestions.push({
      id: 'cmd-memory',
      label: 'View Memory',
      description: 'See what AI remembers',
      icon: '🧠',
      action: 'memory:view',
      score: 75,
    });
  }
  
  // Sort by score and limit
  return suggestions.sort((a, b) => b.score - a.score).slice(0, 8);
}

// ============================================================================
// SELECTORS (for optimized re-renders)
// ============================================================================

export const selectProjectId = (state) => state.projectId;
export const selectMetadata = (state) => state.metadata;
export const selectConversation = (state) => state.communication.conversationHistory;
export const selectActiveIntent = (state) => state.communication.activeIntent;
export const selectCommandPalette = (state) => state.communication.commandPalette;
export const selectTaskGraph = (state) => state.execution.taskGraph;
export const selectCurrentExecution = (state) => state.execution.currentExecution;
export const selectArtifacts = (state) => state.artifacts.items;
export const selectActiveArtifact = (state) => {
  const id = state.artifacts.activeArtifactId;
  return id ? state.artifacts.items.find((a) => a.id === id) : null;
};
export const selectSystemMetrics = (state) => state.system.metrics;
export const selectQAStatus = (state) => state.system.qaStatus;
export const selectAlerts = (state) => state.system.alerts.filter((a) => !a.dismissed);
export const selectSyncState = (state) => state.sync;

export default useProjectStore;
