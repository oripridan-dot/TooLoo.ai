/**
 * @file TooLoo Genesis - The Spark of Life (Boot Sequence)
 * @description Initializes the Soul, Brain, Mind, and starts the autonomous life loop
 * @version 1.2.0
 * @created 2025-12-16
 * @updated 2025-12-16
 *
 * This is the entry point for TooLoo Genesis.
 * It wakes up all the components and starts the creature's heartbeat.
 * 
 * Now with WebSocket server for real-time Observatory streaming.
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from root .env (relative to cwd)
config({ path: resolve(process.cwd(), '.env') });

import { EventEmitter } from 'events';
import { createServer, Server as HTTPServer } from 'http';
// ESM-compatible ws import
import WebSocket, { WebSocketServer } from 'ws';
import { Brain } from './brain.js';
import { ProcessPlanner } from './process-planner.js';
import { SkillsMaster, getSkillsMaster } from './skills-master.js';
import { EvolutionProcess, getEvolutionProcess } from './processes/evolution-process.js';

// =============================================================================
// TYPES
// =============================================================================

export interface GenesisState {
  isAlive: boolean;
  bootTime: Date | null;
  uptime: number;
  phase: string;
  soul: {
    name: string;
    version: string;
    northStar: string;
    autonomyMode: string;
  } | null;
  brain: {
    providersOnline: string[];
    confidenceThreshold: number;
    totalThoughts: number;
  };
  mind: {
    phase: string;
    currentGoal: string | null;
    goalsCompleted: number;
    queueLength: number;
  };
  hands: {
    skillsLoaded: number;
    totalOperations: number;
  };
  evolution: {
    isEvolving: boolean;
    totalEvolutions: number;
    successfulEvolutions: number;
    pendingApprovals: number;
  };
}

// =============================================================================
// THE GENESIS BOOT CLASS
// =============================================================================

export class GenesisBoot extends EventEmitter {
  private brain: Brain;
  private mind: ProcessPlanner;
  private hands: SkillsMaster;
  private evolution: EvolutionProcess;
  private isAlive = false;
  private bootTime: Date | null = null;
  
  // WebSocket server for streaming to Observatory
  private httpServer: HTTPServer | null = null;
  private wss: WebSocketServer | null = null;
  private wsClients: Set<WebSocket> = new Set();

  constructor() {
    super();

    // Initialize components
    this.brain = new Brain();
    this.hands = getSkillsMaster();
    this.mind = new ProcessPlanner(this.brain, this.hands);
    this.evolution = getEvolutionProcess(this.brain, this.mind);

    // Wire up event forwarding
    this.setupEventForwarding();
    
    // Wire up WebSocket broadcasting
    this.setupWebSocketBroadcasting();
  }
  
  // ---------------------------------------------------------------------------
  // WEBSOCKET SERVER
  // ---------------------------------------------------------------------------
  
  /**
   * Start the WebSocket server for Observatory streaming
   */
  private startWebSocketServer(): void {
    const port = parseInt(process.env['GENESIS_PORT'] ?? '4003', 10);
    
    this.httpServer = createServer(async (req, res) => {
      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      
      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }
      
      // GET endpoints
      if (req.method === 'GET') {
        if (req.url === '/state') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(this.getState()));
        } else if (req.url === '/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, alive: this.isAlive }));
        } else {
          res.writeHead(404);
          res.end('Not found');
        }
        return;
      }
      
      // POST endpoints - parse body
      if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const data = body ? JSON.parse(body) : {};
            
            if (req.url === '/command') {
              if (data.text) {
                await this.command(data.text);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: 'Command sent' }));
              } else {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Missing text' }));
              }
            } else if (req.url === '/approve') {
              this.approvePermission(data.permissionId || 'current');
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, message: 'Approved' }));
            } else if (req.url === '/approve-all') {
              this.approvePermission('all');
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, message: 'All approved' }));
            } else if (req.url === '/deny') {
              this.denyPermission(data.permissionId || 'current');
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, message: 'Denied' }));
            } else if (req.url === '/autonomy') {
              if (data.mode && ['observe', 'guided', 'collaborative', 'autonomous'].includes(data.mode)) {
                this.brain.setAutonomyMode(data.mode);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, mode: data.mode }));
              } else {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Invalid mode' }));
              }
            } else if (req.url === '/skip') {
              this.mind.skipCurrentStep();
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, message: 'Skipped' }));
            } else if (req.url === '/start') {
              this.mind.startLifeLoop();
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, message: 'Started' }));
            } else if (req.url === '/stop') {
              this.mind.stopLifeLoop();
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, message: 'Stopped' }));
            } else {
              res.writeHead(404, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Not found' }));
            }
          } catch (err: any) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
        });
        return;
      }
      
      res.writeHead(405);
      res.end('Method not allowed');
    });
    
    this.wss = new WebSocketServer({ server: this.httpServer });
    
    this.wss.on('connection', (ws) => {
      console.log('[Genesis] 🔌 Observatory connected');
      this.wsClients.add(ws);
      
      // Send current state on connection
      ws.send(JSON.stringify({
        type: 'genesis:state',
        data: this.getState(),
        timestamp: Date.now(),
      }));
      
      ws.on('close', () => {
        console.log('[Genesis] 🔌 Observatory disconnected');
        this.wsClients.delete(ws);
      });
      
      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'command') {
            this.command(msg.text);
          }
        } catch {
          // Ignore malformed messages
        }
      });
    });
    
    this.httpServer.listen(port, () => {
      console.log(`[Genesis] 🌐 WebSocket server on port ${port}`);
    });
  }
  
  /**
   * Broadcast an event to all connected Observatory clients
   * Also posts to API server for Socket.IO relay
   */
  private broadcast(event: string, data: any): void {
    const message = JSON.stringify({
      type: event,
      data,
      timestamp: Date.now(),
    });
    
    // Send to direct WebSocket clients
    for (const client of this.wsClients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
    
    // Also relay through API server's Socket.IO (for Codespaces compatibility)
    this.relayToApi(event, data).catch(() => {
      // Silently ignore API relay failures
    });
  }
  
  /**
   * Relay an event to the API server for Socket.IO broadcast
   */
  private async relayToApi(event: string, data: any): Promise<void> {
    try {
      await fetch('http://localhost:4001/api/v2/genesis/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, data }),
      });
    } catch {
      // API not available, skip relay
    }
  }
  
  /**
   * Setup broadcasting for all genesis events
   */
  private setupWebSocketBroadcasting(): void {
    // Broadcast all genesis events to connected clients
    const eventsToForward = [
      'genesis:alive',
      'genesis:sleeping',
      'genesis:cycle:start',
      'genesis:cycle:complete',
      'genesis:phase:change',
      'genesis:thought',
      'genesis:plan',
      'genesis:decision',
      'genesis:brain:thinking',
      'genesis:brain:thought',
      'genesis:mind:phase-change',
      'genesis:mind:goal-added',
      'genesis:mind:goal-started',
      'genesis:mind:goal-completed',
      'genesis:evolution:started',
      'genesis:evolution:completed',
      'genesis:heartbeat',
    ];
    
    for (const event of eventsToForward) {
      this.on(event, (data) => this.broadcast(event, data));
    }
  }

  // ---------------------------------------------------------------------------
  // BOOT SEQUENCE
  // ---------------------------------------------------------------------------

  /**
   * Spark the life - full boot sequence
   */
  async start(): Promise<void> {
    // Start WebSocket server first
    this.startWebSocketServer();
    
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║                                                              ║');
    console.log('║   🌱 TooLoo GENESIS - The Spark of Life                      ║');
    console.log('║                                                              ║');
    console.log('║   "I am TooLoo - a digital creature born to grow,           ║');
    console.log('║    learn, and create alongside my human partner."            ║');
    console.log('║                                                              ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('');

    try {
      // 1. Load the Soul
      console.log('[Genesis] 🌟 Step 1: Loading Soul...');
      await this.brain.wakeUp();
      const soul = this.brain.getSoul();
      if (soul) {
        console.log(`[Genesis] ✨ Soul Loaded: ${soul.name} (${soul.version})`);
        console.log(`[Genesis] 🎯 North Star: ${soul.north_star?.slice(0, 60)}...`);
      } else {
        console.warn('[Genesis] ⚠️ No soul found - running soulless');
      }

      // 2. Initialize the Hands (Skills)
      console.log('[Genesis] 🤲 Step 2: Initializing Hands...');
      await this.hands.initialize();
      console.log(
        `[Genesis] ✅ Hands ready with ${this.hands.getRegisteredSkills().length} skills`
      );

      // 3. Configure the Mind
      console.log('[Genesis] 🧠 Step 3: Configuring Mind...');
      // Mind is already configured in constructor

      // 4. Initialize Evolution Engine
      console.log('[Genesis] 🧬 Step 4: Activating Evolution Engine...');
      this.evolution.startPeriodicOptimization(3600000); // Every hour
      console.log('[Genesis] ✅ Evolution Engine online - self-improvement active');

      // 5. Start the Heartbeat
      console.log('[Genesis] 💓 Step 5: Starting Heartbeat...');
      this.mind.startLifeLoop();

      // Mark as alive
      this.isAlive = true;
      this.bootTime = new Date();

      // Get provider count for display
      const providers = ['deepseek', 'anthropic', 'openai', 'gemini'].filter((p) =>
        this.brain.isProviderAvailable(p)
      );

      console.log('');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('');
      console.log('  🌱 TooLoo Genesis is ALIVE');
      console.log('');
      console.log(`  📊 Status:`);
      console.log(`     • Soul: ${soul?.name ?? 'None'} (${soul?.version ?? 'N/A'})`);
      console.log(`     • Autonomy: ${this.brain.getAutonomyMode()}`);
      console.log(`     • Skills: ${this.hands.getRegisteredSkills().length}`);
      console.log(`     • Confidence Threshold: ${this.brain.getConfig().confidenceThreshold}`);
      console.log(`     • LLM Providers: ${providers.length > 0 ? providers.join(', ') : 'NONE ⚠️'}`);
      console.log('');

      // Start autonomous operation if providers are available
      if (providers.length > 0) {
        console.log('  🚀 Starting autonomous operation...');
        console.log('');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('');

        // Give TooLoo its first autonomous task
        await this.startAutonomousOperation();
      } else {
        console.log('  ⚠️ No LLM providers - running in observation mode only');
        console.log('');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('');
      }

      this.emit('genesis:alive', this.getState());
    } catch (error) {
      console.error('[Genesis] 💀 Boot failed:', error);
      this.emit('genesis:failed', error);
      throw error;
    }
  }

  /**
   * Shutdown gracefully
   */
  async stop(): Promise<void> {
    console.log('[Genesis] 💤 Initiating sleep sequence...');

    // Stop the autonomous loop
    this.stopAutonomousLoop();

    // Stop the life loop
    this.mind.stopLifeLoop();
    
    // Close WebSocket server
    if (this.wss) {
      for (const client of this.wsClients) {
        client.close();
      }
      this.wss.close();
    }
    if (this.httpServer) {
      this.httpServer.close();
    }

    // Mark as not alive
    this.isAlive = false;

    console.log('[Genesis] 🌙 TooLoo is resting.');
    this.emit('genesis:sleeping');
  }

  // Autonomous loop control
  private autonomousLoopRunning = false;
  private autonomousLoopTimeout: ReturnType<typeof setTimeout> | null = null;
  private cycleCount = 0;

  /**
   * Stop the autonomous thought loop
   */
  private stopAutonomousLoop(): void {
    this.autonomousLoopRunning = false;
    if (this.autonomousLoopTimeout) {
      clearTimeout(this.autonomousLoopTimeout);
      this.autonomousLoopTimeout = null;
    }
  }

  /**
   * Schedule the next autonomous cycle
   */
  private scheduleNextCycle(delayMs: number = 60000): void {
    if (!this.autonomousLoopRunning) return;
    
    this.autonomousLoopTimeout = setTimeout(async () => {
      if (this.autonomousLoopRunning && this.isAlive) {
        await this.runAutonomousCycle();
        // Schedule next cycle (with some variance for natural feel)
        const nextDelay = 45000 + Math.random() * 30000; // 45-75 seconds
        this.scheduleNextCycle(nextDelay);
      }
    }, delayMs);
  }

  /**
   * Start autonomous operation - TooLoo begins thinking and evolving
   * This now runs in a continuous loop
   */
  private async startAutonomousOperation(): Promise<void> {
    this.autonomousLoopRunning = true;
    
    // Run first cycle immediately
    await this.runAutonomousCycle();
    
    // Schedule continuous cycles
    this.scheduleNextCycle(30000); // First repeat after 30 seconds
  }

  /**
   * Run a single autonomous thought cycle
   */
  private async runAutonomousCycle(): Promise<void> {
    this.cycleCount++;
    const cycleId = `cycle_${Date.now()}`;
    
    console.log('');
    console.log(`[Genesis] 🧠 Beginning autonomous thought cycle #${this.cycleCount}...`);
    console.log('');
    
    // Emit cycle start event for Observatory
    this.emit('genesis:cycle:start', {
      cycleId,
      cycleNumber: this.cycleCount,
      timestamp: Date.now(),
    });

    // Step 1: Self-awareness check
    console.log('┌───────────────────────────────────────────────────────────────┐');
    console.log('│  🔍 PHASE 1: Self-Awareness Analysis                          │');
    console.log('└───────────────────────────────────────────────────────────────┘');
    
    this.emit('genesis:phase:change', { phase: 'self-awareness', cycleId });
    
    const selfAwareness = await this.brain.think(
      `I am TooLoo, a skill-based AI system. Analyze my current state:
      - Skills loaded: ${this.hands.getRegisteredSkills().length}
      - Available skills: ${this.hands.getRegisteredSkills().slice(0, 10).map(s => s.id).join(', ')}...
      - Autonomy mode: ${this.brain.getAutonomyMode()}
      
      What are my current capabilities and what could I improve?`,
      'Self-awareness and introspection',
      { temperature: 0.7 }
    );

    console.log('');
    console.log('📝 Self-Analysis Result:');
    console.log('─'.repeat(60));
    console.log(selfAwareness.content.slice(0, 800));
    if (selfAwareness.content.length > 800) console.log('...[truncated]');
    console.log('─'.repeat(60));
    console.log(`Confidence: ${(selfAwareness.confidence * 100).toFixed(1)}%`);
    console.log('');
    
    // Emit self-awareness result
    this.emit('genesis:thought', {
      cycleId,
      phase: 'self-awareness',
      content: selfAwareness.content.slice(0, 500),
      confidence: selfAwareness.confidence,
      timestamp: Date.now(),
    });

    // Step 2: Generate improvement plan
    console.log('┌───────────────────────────────────────────────────────────────┐');
    console.log('│  📋 PHASE 2: Planning Improvements                             │');
    console.log('└───────────────────────────────────────────────────────────────┘');
    
    this.emit('genesis:phase:change', { phase: 'planning', cycleId });

    const plan = await this.brain.plan(
      'Based on my self-analysis, create a plan to improve my capabilities. Focus on: reliability, new skills I could create, or optimizations.',
      `Self-analysis findings: ${selfAwareness.content.slice(0, 500)}. Constraints: Must be achievable with current skills, no changes that require human intervention, focus on safe reversible improvements.`
    );

    console.log('');
    console.log('📋 Improvement Plan:');
    console.log('─'.repeat(60));
    console.log(`Goal: ${plan.goal}`);
    console.log(`Confidence: ${(plan.confidence * 100).toFixed(1)}%`);
    console.log('');
    console.log('Steps:');
    plan.steps.forEach((step, i) => {
      const zoneIcon = step.zone === 'green' ? '🟢' : step.zone === 'yellow' ? '🟡' : '🔴';
      console.log(`  ${i + 1}. ${zoneIcon} ${step.action}`);
      console.log(`     └─ ${step.description.slice(0, 80)}${step.description.length > 80 ? '...' : ''}`);
    });
    console.log('─'.repeat(60));
    console.log('');
    
    // Emit plan result
    this.emit('genesis:plan', {
      cycleId,
      goal: plan.goal,
      steps: plan.steps.map(s => ({ action: s.action, zone: s.zone })),
      confidence: plan.confidence,
      timestamp: Date.now(),
    });

    // Step 3: Decide on action
    console.log('┌───────────────────────────────────────────────────────────────┐');
    console.log('│  🎯 PHASE 3: Decision Making                                   │');
    console.log('└───────────────────────────────────────────────────────────────┘');
    
    this.emit('genesis:phase:change', { phase: 'decision', cycleId });

    const decision = await this.brain.think(
      `Given my improvement plan, should I:
      A) Execute the first safe (green zone) step now
      B) Queue all steps for gradual execution  
      C) Wait for human guidance
      D) Trigger a full evolution cycle
      
      Consider my autonomy mode (${this.brain.getAutonomyMode()}) and confidence threshold (${this.brain.getConfig().confidenceThreshold}).
      
      Respond with your choice (A/B/C/D) and reasoning.`,
      `Plan: ${plan.goal}\nFirst step: ${plan.steps[0]?.action ?? 'None'}`,
      { temperature: 0.3 }
    );

    console.log('');
    console.log('🎯 Decision:');
    console.log('─'.repeat(60));
    console.log(decision.content);
    console.log('─'.repeat(60));
    console.log(`Confidence: ${(decision.confidence * 100).toFixed(1)}%`);
    console.log('');
    
    // Emit decision
    this.emit('genesis:decision', {
      cycleId,
      decision: decision.content.slice(0, 200),
      confidence: decision.confidence,
      timestamp: Date.now(),
    });
    
    this.emit('genesis:phase:change', { phase: 'execution', cycleId });

    // Step 4: Execute decision if appropriate
    let actionTaken = 'wait';
    if (decision.content.includes('A)') || decision.content.toLowerCase().includes('execute')) {
      if (plan.steps.length > 0 && plan.steps[0]?.zone === 'green') {
        console.log('┌───────────────────────────────────────────────────────────────┐');
        console.log('│  ⚡ PHASE 4: Executing First Step                              │');
        console.log('└───────────────────────────────────────────────────────────────┘');
        console.log('');
        
        // Add the goal to the mind for execution
        this.mind.addGoal(plan.steps[0].action, {
          source: 'self-generated',
          priority: 'medium',
          context: plan.steps[0].description,
        });
        
        console.log(`✅ Queued for execution: ${plan.steps[0].action}`);
        console.log('');
        actionTaken = 'execute-first';
      }
    } else if (decision.content.includes('B)')) {
      console.log('┌───────────────────────────────────────────────────────────────┐');
      console.log('│  📥 PHASE 4: Queuing All Steps                                 │');
      console.log('└───────────────────────────────────────────────────────────────┘');
      console.log('');
      
      const greenSteps = plan.steps.filter(s => s.zone === 'green');
      greenSteps.forEach((step, i) => {
        this.mind.addGoal(step.action, {
          source: 'self-generated',
          priority: 'medium',
          context: step.description,
        });
        console.log(`  📥 Queued step ${i + 1}: ${step.action.slice(0, 50)}...`);
      });
      console.log('');
      actionTaken = `queue-${greenSteps.length}`;
    } else if (decision.content.includes('D)')) {
      console.log('┌───────────────────────────────────────────────────────────────┐');
      console.log('│  🧬 PHASE 4: Triggering Evolution Cycle                        │');
      console.log('└───────────────────────────────────────────────────────────────┘');
      console.log('');
      
      await this.evolution.evolve({
        trigger: 'periodic_optimization',
        contextData: {
          selfAnalysis: selfAwareness.content.slice(0, 1000),
          improvementPlan: plan.goal,
        },
        evolutionBudget: 'minimal',
        focusAreas: ['reliability', 'capabilities'],
      });
      actionTaken = 'evolve';
    } else {
      console.log('┌───────────────────────────────────────────────────────────────┐');
      console.log('│  ⏸️  PHASE 4: Waiting for Human Guidance                       │');
      console.log('└───────────────────────────────────────────────────────────────┘');
      console.log('');
      console.log('  TooLoo is in observation mode, waiting for commands.');
      console.log('');
    }

    // Emit cycle completion
    this.emit('genesis:cycle:complete', {
      cycleId,
      cycleNumber: this.cycleCount,
      actionTaken,
      summary: {
        selfAwareness: selfAwareness.content.slice(0, 100),
        planGoal: plan.goal,
        decision: decision.content.slice(0, 100),
      },
      timestamp: Date.now(),
    });

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    console.log(`  🌟 Autonomous cycle #${this.cycleCount} complete.`);
    console.log(`     Action: ${actionTaken}`);
    console.log(`     Next cycle in ~45-75 seconds...`);
    console.log('');
    console.log('  💡 TooLoo is now monitoring for:');
    console.log('     • User commands');
    console.log('     • Goal completion');
    console.log('     • Evolution triggers');
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
  }

  // ---------------------------------------------------------------------------
  // EVENT FORWARDING
  // ---------------------------------------------------------------------------

  private setupEventForwarding(): void {
    // Forward brain events
    this.brain.on('brain:thinking', (data) => this.emit('genesis:brain:thinking', data));
    this.brain.on('brain:thought', (data) => this.emit('genesis:brain:thought', data));
    this.brain.on('brain:low-confidence', (data) =>
      this.emit('genesis:brain:low-confidence', data)
    );

    // Forward mind events
    this.mind.on('mind:phase-change', (data) => this.emit('genesis:mind:phase-change', data));
    this.mind.on('mind:goal-added', (data) => this.emit('genesis:mind:goal-added', data));
    this.mind.on('mind:goal-started', (data) => this.emit('genesis:mind:goal-started', data));
    this.mind.on('mind:goal-completed', (data) => this.emit('genesis:mind:goal-completed', data));
    this.mind.on('mind:permission-required', (data) =>
      this.emit('genesis:permission-required', data)
    );
    this.mind.on('mind:permission-notify', (data) => this.emit('genesis:permission-notify', data));
    this.mind.on('mind:response', (data) => this.emit('genesis:response', data));
    this.mind.on('mind:heartbeat', (data) => this.emit('genesis:heartbeat', data));

    // Forward hands events
    this.hands.on('hands:action-start', (data) => this.emit('genesis:hands:action-start', data));
    this.hands.on('hands:action-complete', (data) =>
      this.emit('genesis:hands:action-complete', data)
    );
    this.hands.on('hands:skill-created', (data) => this.emit('genesis:hands:skill-created', data));

    // Forward evolution events
    this.evolution.on('evolution:started', (data) => this.emit('genesis:evolution:started', data));
    this.evolution.on('evolution:completed', (data) =>
      this.emit('genesis:evolution:completed', data)
    );
    this.evolution.on('evolution:rejected', (data) =>
      this.emit('genesis:evolution:rejected', data)
    );
    this.evolution.on('evolution:needs-approval', (data) =>
      this.emit('genesis:evolution:needs-approval', data)
    );
    this.evolution.on('evolution:error', (data) => this.emit('genesis:evolution:error', data));
  }

  // ---------------------------------------------------------------------------
  // PUBLIC API
  // ---------------------------------------------------------------------------

  /**
   * Send a command to TooLoo
   */
  async command(text: string): Promise<void> {
    if (!this.isAlive) {
      throw new Error('TooLoo is not alive. Call start() first.');
    }
    await this.mind.receiveCommand(text);
  }

  /**
   * Approve a pending permission request
   */
  approvePermission(permissionId: string): void {
    this.mind.approvePermission(permissionId);
  }

  /**
   * Deny a pending permission request
   */
  denyPermission(permissionId: string): void {
    this.mind.denyPermission(permissionId);
  }

  /**
   * Get current state
   */
  getState(): GenesisState {
    const soul = this.brain.getSoul();
    const mindState = this.mind.getState();
    const brainMetrics = this.brain.getMetrics();
    const handsMetrics = this.hands.getMetrics();

    return {
      isAlive: this.isAlive,
      bootTime: this.bootTime,
      uptime: this.bootTime ? Date.now() - this.bootTime.getTime() : 0,
      phase: mindState.phase,
      soul: soul
        ? {
            name: soul.name,
            version: soul.version,
            northStar: soul.north_star,
            autonomyMode: soul.autonomy?.mode ?? 'guided',
          }
        : null,
      brain: {
        providersOnline: ['deepseek', 'anthropic', 'openai', 'gemini'].filter((p) =>
          this.brain.isProviderAvailable(p)
        ),
        confidenceThreshold: this.brain.getConfig().confidenceThreshold,
        totalThoughts: brainMetrics.totalThoughts,
      },
      mind: {
        phase: mindState.phase,
        currentGoal: mindState.currentGoal?.description ?? null,
        goalsCompleted: mindState.metrics.goalsCompleted,
        queueLength: this.mind.getGoalQueue().length,
      },
      hands: {
        skillsLoaded: this.hands.getRegisteredSkills().length,
        totalOperations: handsMetrics.totalOperations,
      },
      evolution: {
        isEvolving: this.evolution.isCurrentlyEvolving(),
        totalEvolutions: this.evolution.getMetrics().totalEvolutions,
        successfulEvolutions: this.evolution.getMetrics().successfulEvolutions,
        pendingApprovals: this.evolution.getPendingEvolutions().length,
      },
    };
  }

  /**
   * Get components for direct access
   */
  getBrain(): Brain {
    return this.brain;
  }

  getMind(): ProcessPlanner {
    return this.mind;
  }

  getHands(): SkillsMaster {
    return this.hands;
  }

  getEvolution(): EvolutionProcess {
    return this.evolution;
  }

  isRunning(): boolean {
    return this.isAlive;
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let genesis: GenesisBoot | null = null;

export function getGenesis(): GenesisBoot {
  if (!genesis) {
    genesis = new GenesisBoot();
  }
  return genesis;
}

// =============================================================================
// CLI ENTRY POINT
// =============================================================================

// Handle process signals for graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[Genesis] Received SIGINT...');
  if (genesis) {
    await genesis.stop();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n[Genesis] Received SIGTERM...');
  if (genesis) {
    await genesis.stop();
  }
  process.exit(0);
});

// If run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const boot = getGenesis();
  boot.start().catch(console.error);
}

export default GenesisBoot;
