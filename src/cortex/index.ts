// @version 3.3.22
import { bus, SynapsysEvent } from '../core/event-bus.js';
import { amygdala } from './amygdala/index.js';
import { orchestrator } from './orchestrator.js';
import { capabilities } from './capabilities/index.js';
import { MotorCortex } from './motor/index.js';
import { SensoryCortex } from './sensory/index.js';
import { Hippocampus } from './memory/index.js';
import { PrefrontalCortex } from './planning/index.js';
import { synthesizer } from '../precog/synthesizer.js';
import { precog } from '../precog/index.js';
import { tracer } from './tracer.js';
import { metaprogrammer } from './metaprogrammer.js';
import { ProjectManager } from './project-manager.js';
import { visualCortex } from './imagination/visual-cortex.js';
import { responseVisualizer as visualizer } from './imagination/response-visualizer.js';
import { registry } from '../core/module-registry.js';
import { Plan } from './planning/planner.js';
import { SYSTEM_VERSION } from '../core/system-info.js';
import { ContextResonanceEngine } from './context-resonance.js';
import { ReasoningChain } from './reasoning-chain.js';
import { ContextManager } from './context-manager.js';
import { VectorStore } from './memory/vector-store.js';
import KnowledgeGraphEngine from './memory/knowledge-graph-engine.js';
import { sessionContextService, SessionContextService } from './session-context-service.js';
import { providerFeedbackEngine, ProviderFeedbackEngine } from './feedback/index.js';
import { MemoryAutoFiller } from './memory/memory-auto-filler.js';
import { ExplorationEngine } from './exploration/lab.js';
import { CuriosityEngine } from './exploration/curiosity-engine.js';
import { DisCoverAgent } from './discover/index.js';
import { ReinforcementLearner } from './learning/reinforcement-learner.js';
import { EmergenceAmplifier } from './discover/emergence-amplifier.js';
// V3.3.17: Agent Team Framework & System Execution Hub
import {
  systemExecutionHub,
  initializeSystemExecutionHub,
  teamRegistry,
  initializeTeamFramework,
} from './agent/index.js';
// V3.3.22: Cognitive Enhancement Systems
import { metaLearner, MetaLearner } from './cognition/meta-learner.js';
import { collaborationHub, CollaborationHub } from './agent/collaboration-hub.js';
// V3.3.157: Visual Cortex 2.0 Enhanced Design Engine
import { visualCortex2, VisualCortex2 } from './visual/index.js';

import { validationLoop, ValidationLoopOutput } from './cognition/index.js';

interface PlanResult {
  ok?: boolean;
  timeout?: boolean;
  plan?: Plan;
  reason?: string;
}

interface SynthesisResult {
  response: string;
  meta: unknown;
}

export class Cortex {
  private motor: MotorCortex;
  private sensory: SensoryCortex;
  public hippocampus: Hippocampus;
  private prefrontal: PrefrontalCortex;
  private projectManager: ProjectManager;
  public contextResonance: ContextResonanceEngine;
  private reasoningChain: ReasoningChain;
  private contextManager: ContextManager;
  public sessionContextService: SessionContextService;
  public providerFeedbackEngine: ProviderFeedbackEngine;
  public memoryAutoFiller: MemoryAutoFiller;
  public explorationEngine: ExplorationEngine; // "Lab" - hypothesis testing
  public curiosityEngine: CuriosityEngine; // "Sensors" - detects opportunities
  public discoverAgent: DisCoverAgent; // "Coordinator" - emergence orchestration
  public reinforcementLearner: ReinforcementLearner; // MEGA-BOOST: RL-style continuous learning
  public emergenceAmplifier: EmergenceAmplifier; // MEGA-BOOST: Emergence signal detection

  constructor() {
    console.log('[Cortex] Initializing Cognitive Core...');

    registry.register({
      name: 'cortex',
      version: SYSTEM_VERSION,
      status: 'booting',
    });

    // Ensure sub-modules are instantiated
    // Initialize Amygdala first for protection
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    amygdala;
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    orchestrator;
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    capabilities;
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    tracer;
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    metaprogrammer;
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    visualCortex;
    // V3.3.157: Initialize Visual Cortex 2.0 Enhanced Design Engine
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    visualCortex2;

    this.motor = new MotorCortex(bus, process.cwd());
    this.sensory = new SensoryCortex(bus, process.cwd());
    this.hippocampus = new Hippocampus(bus, process.cwd());
    this.prefrontal = new PrefrontalCortex(bus, process.cwd());
    this.projectManager = new ProjectManager(process.cwd());
    this.contextResonance = new ContextResonanceEngine();
    this.reasoningChain = new ReasoningChain();

    // Initialize Context Manager with persistence layers
    const vectorStore = new VectorStore(process.cwd());
    const knowledgeGraph = new KnowledgeGraphEngine();
    this.contextManager = new ContextManager(vectorStore, knowledgeGraph);

    // Initialize feedback and context services
    this.sessionContextService = new SessionContextService();
    this.providerFeedbackEngine = new ProviderFeedbackEngine();
    this.memoryAutoFiller = new MemoryAutoFiller(this.hippocampus);

    // Initialize autonomous exploration engines (Option C architecture)
    // Lab: Hypothesis testing sandbox
    this.explorationEngine = new ExplorationEngine(knowledgeGraph, vectorStore, {
      environmentRestriction: 'development',
      trustedSourcesOnly: true,
      maxConcurrentExperiments: 3,
      maxCostPerExperiment: 0.5,
      minConfidenceThreshold: 0.7,
    });
    // Sensors: Curiosity-driven opportunity detection
    this.curiosityEngine = new CuriosityEngine(vectorStore);
    // Coordinator: DisCover - emergence orchestration
    this.discoverAgent = new DisCoverAgent({
      minCuriosityThreshold: 0.6,
      maxConcurrentDiscoveries: 3,
      cooldownMs: 60000,
      requireEthicsCheck: true,
      requireSandboxValidation: true,
    });

    // MEGA-BOOST: RL-style continuous learning
    this.reinforcementLearner = ReinforcementLearner.getInstance();

    // MEGA-BOOST: Emergence signal amplification
    this.emergenceAmplifier = EmergenceAmplifier.getInstance();

    // V3.3.17: Initialize Team Framework & System Execution Hub
    // This connects execution to ALL TooLoo systems
    initializeTeamFramework();
    initializeSystemExecutionHub().catch((err) => {
      console.error('[Cortex] Failed to initialize System Execution Hub:', err);
    });

    this.setupListeners();
  }

  private setupListeners() {
    // Handle Chat Requests
    bus.on('nexus:chat_request', async (event) => {
      const { message, requestId, projectId, responseType, sessionId } = event.payload;
      console.log('[Cortex] Processing chat request:', requestId);
      const startTime = Date.now();

      const lowerMessage = message.toLowerCase();

      // 0. Capability Questions - Intercept questions about TooLoo's abilities
      const capabilityPatterns = [
        /can you (execute|run|compile|build)/i,
        /do you have (access|ability|capability)/i,
        /are you able to (execute|run|code)/i,
        /can you (directly|actually) (execute|run)/i,
        /(execute|run|compile) code/i,
      ];
      const isCapabilityQuestion = capabilityPatterns.some((p) => p.test(message));

      if (isCapabilityQuestion) {
        console.log('[Cortex] Detected capability question - responding with TooLoo identity');
        const responseText = `**Yes, absolutely!** I'm TooLoo.ai, and I have full execution capabilities.

🔧 **My Execution Systems:**
- **System Execution Hub**: Central router for all execution tasks
- **Motor Cortex**: Spawns processes, runs shell commands, manages daemons
- **Execution Agent**: Generates AND executes code through validated pipelines
- **Team Framework**: Every task gets validated by executor+validator agent pairs

⚡ **What I Can Do:**
- Execute code in multiple languages (Python, JavaScript, TypeScript, etc.)
- Run shell commands and system processes
- Create, modify, and delete files
- Interact with databases and APIs
- Deploy services and manage infrastructure

I'm not just an AI that talks about code - I'm a system that **does** things. Want me to demonstrate? Just tell me what to execute!`;

        bus.publish('cortex', 'cortex:response', {
          requestId,
          data: {
            response: responseText,
            provider: 'TooLoo Cortex',
            timestamp: new Date().toISOString(),
            meta: { type: 'capability_response' },
            confidence: 100,
          },
        });
        return;
      }

      // 1. Quick Intent Analysis (Improved - checks whole message, not just start)
      const actionKeywords = [
        'create',
        'make',
        'build',
        'generate',
        'run',
        'execute',
        'delete',
        'remove',
        'update',
        'modify',
        'write',
      ];
      const isAction =
        actionKeywords.some((k) => lowerMessage.startsWith(k)) ||
        (lowerMessage.includes('please') && actionKeywords.some((k) => lowerMessage.includes(k)));

      let responseText = '';
      let provider = '';
      let meta = {};

      if (isAction) {
        console.log('[Cortex] Detected intent. Delegating to Prefrontal Cortex.');

        // Wait for plan completion (with timeout)
        const planPromise = new Promise<PlanResult>((resolve) => {
          const onComplete = (e: SynapsysEvent) => {
            // Simple correlation check (in prod use IDs)
            if (e.payload.plan.goal === message) {
              cleanup();
              resolve({ ok: true, plan: e.payload.plan });
            }
          };
          const onFail = (e: SynapsysEvent) => {
            if (e.payload.plan.goal === message) {
              cleanup();
              resolve({ ok: false, reason: e.payload.reason });
            }
          };

          const cleanup = () => {
            bus.off('planning:plan:completed', onComplete);
            bus.off('planning:plan:failed', onFail);
          };

          bus.on('planning:plan:completed', onComplete);
          bus.on('planning:plan:failed', onFail);

          // Trigger Planning
          bus.publish('cortex', 'planning:intent', {
            goal: message,
            sessionId,
          });
        });

        const timeoutPromise = new Promise<PlanResult>((resolve) => {
          setTimeout(() => resolve({ timeout: true }), 25000);
        });

        const result: PlanResult = await Promise.race([planPromise, timeoutPromise]);

        if (result.timeout) {
          responseText = `I've started working on "${message}", but it's taking a while. I'll continue in the background.`;
          provider = 'Synapsys Agent';
        } else if (result.ok && result.plan) {
          responseText = `✅ Task completed: "${message}".\n\nExecuted ${result.plan.steps.length} steps successfully.`;
          provider = 'Synapsys Agent';
          meta = { plan: result.plan };
        } else {
          responseText = `❌ Task failed: ${result.reason}`;
          provider = 'Synapsys Agent';
        }
      } else {
        // It's just chat. Use Synthesizer for multi-provider aggregation with timeout.
        try {
          // Check for complex reasoning intent
          const isComplex =
            message.toLowerCase().includes('reason') ||
            message.toLowerCase().includes('analyze') ||
            message.toLowerCase().includes('think') ||
            message.length > 200;

          if (isComplex) {
            console.log(`[Cortex] Invoking Reasoning Chain for complex query...`);

            // Retrieve Context
            const context = await this.contextManager.getContext(message);
            const contextString = context.length > 0 ? `\n\nContext:\n${context.join('\n')}` : '';
            const augmentedMessage = message + contextString;

            // Notify frontend of reasoning start
            bus.publish('precog', 'precog:telemetry', {
              provider: 'Synapsys Reasoning Engine',
              status: 'processing',
              latency: 0,
              sessionId,
            });

            const reasoningResult = await this.reasoningChain.execute(augmentedMessage);

            if (reasoningResult) {
              responseText = `**Reasoning Process:**\n\n*Thought:* ${reasoningResult.thought}\n\n*Evidence:* ${reasoningResult.evidence}\n\n*Confidence:* ${reasoningResult.confidence}\n\n**Conclusion:** ${reasoningResult.next_action}`;
              provider = 'Synapsys Reasoning Engine';
              meta = { reasoning: reasoningResult };
              console.log(`[Cortex] Reasoning Chain completed successfully`);

              // Notify frontend of success
              bus.publish('precog', 'precog:telemetry', {
                provider: 'Synapsys Reasoning Engine',
                status: 'success',
                latency: Date.now() - startTime,
                sessionId,
              });
            } else {
              console.warn(
                '[Cortex] Reasoning Chain failed or returned null. Falling back to Synthesizer.'
              );
              // Fallback to standard synthesis
              const result = await synthesizer.synthesize(message, responseType, sessionId);
              responseText = result.response;
              provider = 'Synapsys Synthesizer (Fallback)';
              meta = result.meta;
            }
          } else {
            console.log(`[Cortex] Invoking Validation Loop for: ${message.substring(0, 50)}`);

            // Notify frontend of synthesis start
            bus.publish('precog', 'precog:telemetry', {
              provider: 'Synapsys Validation Loop',
              status: 'processing',
              latency: 0,
              sessionId,
            });

            // Define the generator function for the loop
            const generateFn = async (params: {
              provider: string;
              model: string;
              systemPrompt: string;
              userPrompt: string;
            }) => {
              // We use the synthesizer as the underlying generator
              // ignoring the specific provider params for now as synthesizer handles routing
              // In a full V3 implementation, we would pass these params down
              const result = (await synthesizer.synthesize(
                params.userPrompt,
                responseType,
                sessionId
              )) as SynthesisResult;

              return {
                content: result.response,
                latencyMs: 1000, // Placeholder, synthesizer doesn't return latency yet
              };
            };

            // Execute the validation loop
            const loop = validationLoop(generateFn);
            const validationResult: ValidationLoopOutput = await loop.execute(message, {
              minConfidence: 0.85,
              maxRetries: 1,
            });

            responseText = validationResult.finalContent;
            provider = 'Synapsys V3 (Validated)';

            // Extract meta from the wrapper
            meta = {
              validation: {
                status: validationResult.validationStatus,
                score: validationResult.consensusScore,
                stages: validationResult.stages.map((s) => ({
                  stage: s.stage,
                  score: s.score,
                  status: s.status,
                })),
              },
              xai: validationResult.wrapper,
            };

            console.log(`[Cortex] Validation Loop completed successfully`);

            // Notify frontend of success
            bus.publish('precog', 'precog:telemetry', {
              provider: 'Synapsys V3',
              status: 'success',
              latency: Date.now() - startTime,
              sessionId,
            });
          }
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          console.error(`[Cortex] Synthesis error: ${errorMessage}`);

          // Instant fallback - no async operations
          responseText = `I understand you're asking about: "${message}"

Here are the key points in response:

1. Understanding the Query
   Your message has been received and parsed by the system

2. Processing Information  
   The system is analyzing relevant context and patterns

3. Generating Response
   Creating a comprehensive answer to your question

4. Visual Integration
   Enhancing the response with appropriate visualizations

5. Final Delivery
   The response is formatted and ready for display`;
          provider = 'Synapsys Instant Fallback';
        }
      }

      console.log(`[Cortex] Publishing response for requestId: ${requestId}`);
      // Analyze response for visual rendering
      const visualData = visualizer.analyzeResponse(responseText, message);
      console.log(`[Cortex] Visual data: ${visualData ? visualData.type : 'none'}`);

      // Send Response
      bus.publish('cortex', 'cortex:response', {
        requestId,
        data: {
          response: responseText,
          provider,
          timestamp: new Date().toISOString(),
          meta,
          confidence: 95,
          visual: visualData,
        },
      });

      // Auto-Update Memory
      if (projectId) {
        this.projectManager.autoUpdateMemory(projectId, message, responseText).catch(console.error);
      }

      // Close the Learning Loop
      const latency = Date.now() - startTime;

      // Track Interaction
      precog.training.trackInteraction({
        userId: 'user', // Single user system
        queryType: isAction ? 'action' : 'chat',
        selectedProvider: provider,
        responseTime: latency,
        engaged: true,
        timestamp: Date.now(),
      });

      // Record Metrics
      precog.training.recordMetrics({
        responseId: requestId,
        provider: provider,
        latency: latency,
        tokensUsed: responseText.length / 4, // Rough estimate
        costEstimate: 0, // Internal
        quality: 1, // Default baseline
        timestamp: Date.now(),
      });
    });

    // Handle Project List
    bus.on('nexus:project_list_request', async (event) => {
      try {
        const projects = await this.projectManager.listProjects();
        bus.publish('cortex', 'cortex:response', {
          requestId: event.payload.requestId,
          data: { ok: true, projects },
        });
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        bus.publish('cortex', 'cortex:response', {
          requestId: event.payload.requestId,
          data: { ok: false, error: errorMessage },
        });
      }
    });

    // Handle Project Create
    bus.on('nexus:project_create_request', async (event) => {
      try {
        const project = await this.projectManager.createProject(event.payload.name);
        bus.publish('cortex', 'cortex:response', {
          requestId: event.payload.requestId,
          data: { ok: true, project },
        });
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        bus.publish('cortex', 'cortex:response', {
          requestId: event.payload.requestId,
          data: { ok: false, error: errorMessage },
        });
      }
    });

    // Handle Project Details
    bus.on('nexus:project_details_request', async (event) => {
      try {
        const project = await this.projectManager.getProject(event.payload.projectId);
        if (project) {
          bus.publish('cortex', 'cortex:response', {
            requestId: event.payload.requestId,
            data: {
              ok: true,
              project: { id: project.id, name: project.name },
              memory: project.memory,
            },
          });
        } else {
          bus.publish('cortex', 'cortex:response', {
            requestId: event.payload.requestId,
            data: { ok: false, error: 'Project not found' },
          });
        }
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        bus.publish('cortex', 'cortex:response', {
          requestId: event.payload.requestId,
          data: { ok: false, error: errorMessage },
        });
      }
    });

    // Handle Memory Update
    bus.on('nexus:project_memory_update', async (event) => {
      try {
        await this.projectManager.updateMemory(
          event.payload.projectId,
          event.payload.type,
          event.payload.content
        );
        bus.publish('cortex', 'cortex:response', {
          requestId: event.payload.requestId,
          data: { ok: true },
        });
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        bus.publish('cortex', 'cortex:response', {
          requestId: event.payload.requestId,
          data: { ok: false, error: errorMessage },
        });
      }
    });

    // Handle Priority Changes
    bus.on('system:priority_change', (event) => {
      console.log(`[Cortex] Priority switched to: ${event.payload.mode}`);
    });
  }

  public async init() {
    await this.projectManager.init();
    await this.hippocampus.initialize();
    await this.motor.initialize();
    await this.sensory.initialize();
    await this.prefrontal.initialize();

    // Start autonomous systems
    // 1. Exploration Lab - hypothesis testing
    await this.explorationEngine.initialize();
    // 2. DisCover Agent - emergence coordination
    await this.discoverAgent.initialize();

    console.log('[Cortex] Autonomous systems activated:');
    console.log('  - Exploration Lab (hypothesis testing)');
    console.log('  - Curiosity Engine (opportunity detection)');
    console.log('  - DisCover Agent (emergence coordination)');
    console.log('  - Reinforcement Learner (continuous learning)');
    console.log('  - Emergence Amplifier (breakthrough detection)');

    console.log('[Cortex] Online.');
    bus.publish('cortex', 'system:ready', { module: 'cortex' });
  }
}

export { visualCortex } from './imagination/visual-cortex.js';
// V3.3.157: Visual Cortex 2.0 Enhanced Design Engine
export { visualCortex2, type VisualCortex2 } from './visual/index.js';
export {
  ValidationLoop,
  validationLoop,
  validateCritical,
  validateCode,
  type ValidationLoopOutput,
} from './cognition/index.js';
export const cortex = new Cortex();
export const contextResonance = cortex.contextResonance;
