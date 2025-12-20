// @version 3.3.598
// TooLoo.ai SystemStateStore - Backend State Mirror
// ═══════════════════════════════════════════════════════════════════════════
// Single source of truth for frontend-backend synchronization
// Every property maps directly to a Synapsys architecture layer
// ═══════════════════════════════════════════════════════════════════════════

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { io } from 'socket.io-client';

// ============================================================================
// UI MODE MAPPING - Backend intent → Frontend layout
// ============================================================================

const INTENT_TO_MODE = {
  // Conversation intents
  chat: 'chat',
  query: 'chat',
  question: 'chat',
  conversation: 'chat',

  // Planning intents
  plan: 'planner',
  task: 'planner',
  organize: 'planner',
  schedule: 'planner',

  // Analysis intents
  analyze: 'analysis',
  research: 'analysis',
  investigate: 'analysis',
  understand: 'analysis',

  // Creation intents
  create: 'studio',
  code: 'studio',
  build: 'studio',
  generate: 'studio',
  design: 'studio',
};

// ============================================================================
// SYSTEM STATE STORE
// ============================================================================

export const useSystemState = create(
  subscribeWithSelector((set, get) => ({
    // ═══════════════════════════════════════════════════════════════════════
    // ORCHESTRATOR STATE - Maps to Cortex/Precog routing layer
    // ═══════════════════════════════════════════════════════════════════════
    orchestrator: {
      activeProvider: null, // 'anthropic' | 'deepseek' | 'openai' | 'gemini'
      providerModel: null, // Specific model being used
      currentCost: 0, // Cost of current request (tokens)
      sessionCost: 0, // Total session cost
      remainingBudget: 100, // User's remaining budget
      routingDecision: null, // { reason, factors, alternatives }
      lastRequestId: null,
      isProcessing: false,
      status: 'idle', // 'idle' | 'routing' | 'generating' | 'complete'
    },

    // ═══════════════════════════════════════════════════════════════════════
    // SKILLS STATE - Maps to Planning/Motor/Execution layers
    // ═══════════════════════════════════════════════════════════════════════
    skills: {
      activeSkill: 'chat', // 'chat' | 'planner' | 'analysis' | 'studio'
      detectedIntent: null, // Raw intent from backend
      currentDAG: null, // Planning DAG if in planner mode
      segments: [], // Conversation segments for TOC
      executionStatus: 'idle', // 'idle' | 'queued' | 'executing' | 'validating' | 'complete'
      currentTask: null, // Active task details
      taskQueue: [], // Pending tasks
    },

    // ═══════════════════════════════════════════════════════════════════════
    // KNOWLEDGE STATE - Maps to Hippocampus/VectorStore/KnowledgeGraph
    // ═══════════════════════════════════════════════════════════════════════
    knowledge: {
      retrievedContext: [], // Vector store hits for current response
      activeGraphNodes: [], // Knowledge graph entities
      provenance: {}, // { claimId: sourceInfo } - citation mappings
      memoryCount: 0, // Total memories in vector store
      lastSearchQuery: null,
      searchResults: [],
    },

    // ═══════════════════════════════════════════════════════════════════════
    // EVALUATION STATE - Maps to Meta-Learner/QA Guardian
    // ═══════════════════════════════════════════════════════════════════════
    evaluation: {
      calibrationScore: 0.85, // Current confidence (0-1)
      confidenceLevel: 'high', // 'low' | 'medium' | 'high'
      qualityMetrics: {
        accuracy: 0.85,
        relevance: 0.9,
        completeness: 0.8,
      },
      lastFeedback: null, // User feedback on last response
      learningEvents: [], // Recent learning/correction events
      cognitiveState: {
        velocity: { trend: 'steady', value: 0 },
        cognitiveLoad: 0.5,
        focusArea: null,
      },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // MODALITY STATE - Maps to Sensory/Vision/Motor outputs
    // ═══════════════════════════════════════════════════════════════════════
    modality: {
      activeInput: 'text', // 'text' | 'voice' | 'image'
      activeOutput: 'text', // 'text' | 'visual' | 'code' | 'mixed'
      visionActive: false,
      audioActive: false,
      streamingActive: false,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // UI MODE - Derived from activeSkill, drives layout
    // ═══════════════════════════════════════════════════════════════════════
    uiMode: 'chat', // 'chat' | 'planner' | 'analysis' | 'studio'

    // ═══════════════════════════════════════════════════════════════════════
    // CONNECTION STATE
    // ═══════════════════════════════════════════════════════════════════════
    connection: {
      socket: null,
      connected: false,
      lastHeartbeat: null,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // ACTIONS - State mutations
    // ═══════════════════════════════════════════════════════════════════════

    // Initialize WebSocket connection
    initializeConnection: () => {
      const existingSocket = get().connection.socket;
      if (existingSocket?.connected) return;

      const socket = io('/', {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 10,
      });

      socket.on('connect', () => {
        console.log('[SystemState] Connected to backend');
        set((state) => ({
          connection: { ...state.connection, connected: true, lastHeartbeat: Date.now() },
        }));
      });

      socket.on('disconnect', () => {
        console.log('[SystemState] Disconnected from backend');
        set((state) => ({
          connection: { ...state.connection, connected: false },
        }));
      });

      // Wire up all event handlers
      get().wireSocketEvents(socket);

      set((state) => ({
        connection: { ...state.connection, socket },
      }));
    },

    // Wire socket event handlers
    wireSocketEvents: (socket) => {
      // === ORCHESTRATOR EVENTS ===
      socket.on('provider:selected', (data) => {
        console.log('[SystemState] Provider selected:', data);
        set((state) => ({
          orchestrator: {
            ...state.orchestrator,
            activeProvider: data.provider,
            providerModel: data.model,
          },
        }));
      });

      // NEW: Real orchestrator status updates
      socket.on('orchestrator:status_change', (data) => {
        console.log('[SystemState] Orchestrator status:', data);
        set((state) => ({
          orchestrator: {
            ...state.orchestrator,
            isProcessing: data.isProcessing || false,
            currentCost: data.currentCost || state.orchestrator.currentCost,
            status: data.status || 'idle',
            activeProvider: data.activeProvider || state.orchestrator.activeProvider,
          },
        }));
      });

      // NEW: Real learning progress updates
      socket.on('precog:learning_update', (data) => {
        console.log('[SystemState] Learning update:', data);
        set((state) => ({
          evaluation: {
            ...state.evaluation,
            learningMetrics: {
              qLearningScore: data.qLearningScore || state.evaluation.learningMetrics.qLearningScore,
              providerSuccessRate: data.providerSuccessRate || state.evaluation.learningMetrics.providerSuccessRate,
              totalExecutions: data.totalExecutions || state.evaluation.learningMetrics.totalExecutions,
            },
          },
        }));
      });

      socket.on('provider:routing_decision', (data) => {
        console.log('[SystemState] Routing decision:', data);
        set((state) => ({
          orchestrator: {
            ...state.orchestrator,
            routingDecision: data,
            activeProvider: data.selectedProvider,
          },
        }));
      });

      socket.on('cost:update', (data) => {
        set((state) => ({
          orchestrator: {
            ...state.orchestrator,
            currentCost: data.requestCost || state.orchestrator.currentCost,
            sessionCost: data.sessionCost || state.orchestrator.sessionCost,
            remainingBudget: data.remainingBudget || state.orchestrator.remainingBudget,
          },
        }));
      });

      // === SKILLS/PLANNING EVENTS ===
      socket.on('planning:dag_created', (data) => {
        console.log('[SystemState] DAG created:', data);
        set((state) => ({
          skills: {
            ...state.skills,
            currentDAG: data.dag,
            activeSkill: 'planner',
          },
          uiMode: 'planner',
        }));
      });

      socket.on('planning:segment_created', (data) => {
        set((state) => ({
          skills: {
            ...state.skills,
            segments: [...state.skills.segments, data.segment],
          },
        }));
      });

      socket.on('motor:execute', (data) => {
        set((state) => ({
          skills: {
            ...state.skills,
            executionStatus: 'executing',
            currentTask: data,
          },
        }));
      });

      socket.on('motor:result', (data) => {
        set((state) => ({
          skills: {
            ...state.skills,
            executionStatus: data.success ? 'complete' : 'error',
          },
        }));
      });

      // === KNOWLEDGE EVENTS ===
      socket.on('memory:context_retrieved', (data) => {
        console.log('[SystemState] Context retrieved:', data);
        set((state) => ({
          knowledge: {
            ...state.knowledge,
            retrievedContext: data.hits || data.context || [],
            lastSearchQuery: data.query,
          },
        }));
      });

      socket.on('knowledge:graph_update', (data) => {
        set((state) => ({
          knowledge: {
            ...state.knowledge,
            activeGraphNodes: data.nodes || [],
          },
        }));
      });

      // === EVALUATION/META EVENTS ===
      socket.on('meta:cognitive_state_change', (data) => {
        console.log('[SystemState] Cognitive state change:', data);
        const { velocity, cognitiveLoad, calibration, focusArea } = data;

        set((state) => ({
          evaluation: {
            ...state.evaluation,
            cognitiveState: {
              velocity: velocity || state.evaluation.cognitiveState.velocity,
              cognitiveLoad: cognitiveLoad || state.evaluation.cognitiveState.cognitiveLoad,
              focusArea: focusArea || state.evaluation.cognitiveState.focusArea,
            },
            calibrationScore: calibration || state.evaluation.calibrationScore,
            confidenceLevel: 
              (calibration || 0) > 0.8 ? 'high' : 
              (calibration || 0) > 0.6 ? 'medium' : 'low',
          },
        }));
      });

      // NEW: Real artifact creation events
      socket.on('agent:artifact_created', (data) => {
        console.log('[SystemState] Artifact created:', data);
        // Trigger refresh of artifacts in UI
        set((state) => ({
          ...state,
          lastArtifactUpdate: Date.now(),
        }));
      });

      // NEW: Real task completion events
      socket.on('agent:task_completed', (data) => {
        console.log('[SystemState] Task completed:', data);
        set((state) => ({
          evaluation: {
            ...state.evaluation,
            lastTaskResult: data,
            totalTasksCompleted: (state.evaluation.totalTasksCompleted || 0) + 1,
          },
        }));
      });

      socket.on('evaluation:confidence', (data) => {
        set((state) => ({
          evaluation: {
            ...state.evaluation,
            calibrationScore: data.score,
            confidenceLevel: data.score > 0.8 ? 'high' : data.score > 0.6 ? 'medium' : 'low',
            qualityMetrics: data.metrics || state.evaluation.qualityMetrics,
          },
        }));
      });

      socket.on('learning:feedback_recorded', (data) => {
        set((state) => ({
          evaluation: {
            ...state.evaluation,
            lastFeedback: data,
            learningEvents: [data, ...state.evaluation.learningEvents].slice(0, 10),
          },
        }));
      });

      // === MODALITY EVENTS ===
      socket.on('visual:generation_start', () => {
        set((state) => ({
          modality: { ...state.modality, visionActive: true, activeOutput: 'visual' },
        }));
      });

      socket.on('visual:generation_complete', () => {
        set((state) => ({
          modality: { ...state.modality, visionActive: false },
        }));
      });

      // === SYNAPSYS WILDCARD EVENT ===
      socket.on('synapsys:event', (event) => {
        get().handleSynapsysEvent(event);
      });

      // === STATUS EVENTS ===
      socket.on('thinking', (data) => {
        set((state) => ({
          orchestrator: { ...state.orchestrator, isProcessing: true, status: 'generating' },
        }));
      });

      socket.on('response', (data) => {
        set((state) => ({
          orchestrator: { ...state.orchestrator, isProcessing: false, status: 'complete' },
        }));
      });
    },

    // Handle synapsys:event wildcard
    handleSynapsysEvent: (event) => {
      const { type, payload } = event;

      // Route based on event type prefix
      if (type.startsWith('provider:') || type.startsWith('precog:')) {
        // Orchestrator events
        if (type === 'precog:routing' || type === 'provider:routing_decision') {
          set((state) => ({
            orchestrator: {
              ...state.orchestrator,
              routingDecision: payload,
              activeProvider: payload.selectedProvider || payload.provider,
            },
          }));
        }
      } else if (type.startsWith('planning:')) {
        // Planning events
        if (type === 'planning:segment_created') {
          set((state) => ({
            skills: {
              ...state.skills,
              segments: [...state.skills.segments, payload],
            },
          }));
        }
      } else if (type.startsWith('memory:') || type.startsWith('cortex:context')) {
        // Knowledge events
        if (payload.context || payload.hits) {
          set((state) => ({
            knowledge: {
              ...state.knowledge,
              retrievedContext: payload.hits || payload.context || [],
            },
          }));
        }
      } else if (type.startsWith('meta:') || type.startsWith('evaluation:')) {
        // Already handled by dedicated listeners
      }
    },

    // === MANUAL STATE SETTERS ===

    setUIMode: (mode) => {
      set({ uiMode: mode, skills: { ...get().skills, activeSkill: mode } });
    },

    setActiveProvider: (provider, model) => {
      set((state) => ({
        orchestrator: {
          ...state.orchestrator,
          activeProvider: provider,
          providerModel: model,
        },
      }));
    },

    setProcessingStatus: (status) => {
      set((state) => ({
        orchestrator: {
          ...state.orchestrator,
          status,
          isProcessing: status === 'routing' || status === 'generating',
        },
      }));
    },

    addSegment: (segment) => {
      set((state) => ({
        skills: {
          ...state.skills,
          segments: [...state.skills.segments, segment],
        },
      }));
    },

    clearSegments: () => {
      set((state) => ({
        skills: { ...state.skills, segments: [] },
      }));
    },

    setRetrievedContext: (context) => {
      set((state) => ({
        knowledge: {
          ...state.knowledge,
          retrievedContext: context,
        },
      }));
    },

    setConfidence: (score) => {
      set((state) => ({
        evaluation: {
          ...state.evaluation,
          calibrationScore: score,
          confidenceLevel: score > 0.8 ? 'high' : score > 0.6 ? 'medium' : 'low',
        },
      }));
    },

    setInputModality: (modality) => {
      set((state) => ({
        modality: { ...state.modality, activeInput: modality },
      }));
    },

    // Detect UI mode from user input
    detectModeFromInput: (input) => {
      const lowerInput = input.toLowerCase();

      // Check for planning keywords
      if (/\b(plan|task|todo|schedule|organize|breakdown)\b/.test(lowerInput)) {
        return 'planner';
      }

      // Check for analysis keywords
      if (/\b(analyze|research|investigate|understand|explain|why|how)\b/.test(lowerInput)) {
        return 'analysis';
      }

      // Check for creation keywords
      if (/\b(create|code|build|generate|design|make|write|implement)\b/.test(lowerInput)) {
        return 'studio';
      }

      // Default to chat
      return 'chat';
    },

    // Record user feedback (for teaching)
    recordFeedback: async (responseId, feedback) => {
      const socket = get().connection.socket;
      if (!socket) return false;

      // Emit feedback event
      socket.emit('user:feedback', {
        responseId,
        feedback,
        timestamp: Date.now(),
      });

      // Also call the API directly
      try {
        await fetch('/api/v1/learning/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            responseId,
            feedback,
            type: feedback.isCorrect ? 'positive' : 'correction',
          }),
        });
        return true;
      } catch (e) {
        console.error('[SystemState] Failed to record feedback:', e);
        return false;
      }
    },

    // Get current state summary for debugging
    getStateSummary: () => {
      const state = get();
      return {
        uiMode: state.uiMode,
        provider: state.orchestrator.activeProvider,
        confidence: state.evaluation.calibrationScore,
        contextCount: state.knowledge.retrievedContext.length,
        segmentCount: state.skills.segments.length,
        connected: state.connection.connected,
      };
    },
  }))
);

// ============================================================================
// CONVENIENCE HOOKS
// ============================================================================

export const useOrchestrator = () => useSystemState((s) => s.orchestrator);
export const useSkills = () => useSystemState((s) => s.skills);
export const useKnowledge = () => useSystemState((s) => s.knowledge);
export const useEvaluation = () => useSystemState((s) => s.evaluation);
export const useModality = () => useSystemState((s) => s.modality);
export const useUIMode = () => useSystemState((s) => s.uiMode);
export const useConnection = () => useSystemState((s) => s.connection);

// ============================================================================
// SELECTORS
// ============================================================================

export const selectIsProcessing = (state) => state.orchestrator.isProcessing;
export const selectConfidence = (state) => state.evaluation.calibrationScore;
export const selectActiveProvider = (state) => state.orchestrator.activeProvider;
export const selectRetrievedContext = (state) => state.knowledge.retrievedContext;
export const selectSegments = (state) => state.skills.segments;

export default useSystemState;
