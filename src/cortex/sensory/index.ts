// @version 3.3.10
import { EventBus, SynapsysEvent } from '../../core/event-bus.js';
import { FileWatcher } from './watcher.js';
import { SemanticParser } from './semantic-parser.js';

interface MotorResult {
  ok: boolean;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
}

interface FocusTarget {
  paths: string[];
  priority: 'high' | 'normal' | 'low';
  reason: string;
  addedAt: number;
  expiresAt?: number;
}

export class SensoryCortex {
  private watcher: FileWatcher;
  private parser: SemanticParser;
  private focusTargets: Map<string, FocusTarget> = new Map();
  private defaultWatchPaths: string[] = ['.'];

  constructor(
    private bus: EventBus,
    private workspaceRoot: string
  ) {
    this.watcher = new FileWatcher(bus, workspaceRoot);
    this.parser = new SemanticParser(bus, workspaceRoot);
  }

  async initialize() {
    console.log('[SensoryCortex] Initializing Sensory Systems...');

    // Start watching the workspace
    // We watch the root by default, but exclude heavy folders in the watcher config
    this.watcher.start(['.']);

    // Initial Project Analysis
    await this.parser.analyzeProject();

    this.setupListeners();

    // Start focus expiry checker
    this.startFocusExpiryChecker();

    this.bus.publish('cortex', 'system:component_ready', {
      component: 'sensory-cortex',
    });
    console.log('[SensoryCortex] Online - Eyes open.');
  }

  private setupListeners() {
    // Listen for requests to watch specific paths (focus attention)
    this.bus.on('sensory:focus', (event: SynapsysEvent) => {
      this.handleFocusRequest(event.payload);
    });

    // Listen for unfocus requests
    this.bus.on('sensory:unfocus', (event: SynapsysEvent) => {
      this.handleUnfocusRequest(event.payload);
    });

    // Listen for focus list request
    this.bus.on('sensory:focus:list', () => {
      this.bus.publish('cortex', 'sensory:focus:list:response', {
        focusTargets: Array.from(this.focusTargets.entries()).map(([id, target]) => ({
          id,
          ...target
        }))
      });
    });

    // Listen for project re-analysis request
    this.bus.on('sensory:analyze_project', async () => {
      await this.parser.analyzeProject();
    });

    // Listen for real-time input (typing)
    this.bus.on('sensory:input', (event: SynapsysEvent) => {
      this.analyzeInputStream(event.payload.input);
    });

    // Listen for motor output to "see" what the hands are doing
    this.bus.on('motor:result', (event: SynapsysEvent) => {
      this.analyzeMotorOutput(event.payload);
    });
  }

  /**
   * Handle dynamic focus requests to watch specific paths with priorities
   */
  private handleFocusRequest(payload: {
    id?: string;
    paths: string[];
    priority?: 'high' | 'normal' | 'low';
    reason?: string;
    ttlMs?: number;
  }) {
    const {
      id = `focus-${Date.now()}`,
      paths,
      priority = 'normal',
      reason = 'Manual focus request',
      ttlMs
    } = payload;

    if (!paths || !Array.isArray(paths) || paths.length === 0) {
      console.warn('[SensoryCortex] Invalid focus request: no paths provided');
      return;
    }

    const focusTarget: FocusTarget = {
      paths,
      priority,
      reason,
      addedAt: Date.now(),
      expiresAt: ttlMs ? Date.now() + ttlMs : undefined
    };

    this.focusTargets.set(id, focusTarget);
    console.log(`[SensoryCortex] 🎯 Focus added: "${id}" -> ${paths.join(', ')} (${priority} priority)`);

    // Update watcher with new combined paths
    this.updateWatchPaths();

    this.bus.publish('cortex', 'sensory:focus:added', {
      id,
      ...focusTarget
    });
  }

  /**
   * Handle unfocus requests to stop watching specific paths
   */
  private handleUnfocusRequest(payload: { id?: string; paths?: string[] }) {
    const { id, paths } = payload;

    if (id) {
      // Remove by focus ID
      if (this.focusTargets.has(id)) {
        this.focusTargets.delete(id);
        console.log(`[SensoryCortex] 🎯 Focus removed: "${id}"`);
        this.updateWatchPaths();
        this.bus.publish('cortex', 'sensory:focus:removed', { id });
      }
    } else if (paths) {
      // Remove any focus targets that contain these paths
      for (const [focusId, target] of this.focusTargets) {
        const hasMatchingPath = target.paths.some(p => paths.includes(p));
        if (hasMatchingPath) {
          this.focusTargets.delete(focusId);
          console.log(`[SensoryCortex] 🎯 Focus removed: "${focusId}" (path match)`);
        }
      }
      this.updateWatchPaths();
    }
  }

  /**
   * Update the file watcher with the combined list of all focus paths
   */
  private async updateWatchPaths() {
    // Combine default paths with all focus target paths
    const allPaths = new Set<string>(this.defaultWatchPaths);
    
    // Sort focus targets by priority to handle high-priority first
    const sortedTargets = Array.from(this.focusTargets.values())
      .sort((a, b) => {
        const priorityOrder = { high: 0, normal: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

    for (const target of sortedTargets) {
      for (const p of target.paths) {
        allPaths.add(p);
      }
    }

    const pathArray = Array.from(allPaths);
    console.log(`[SensoryCortex] Updating watch paths: ${pathArray.join(', ')}`);

    // Restart watcher with new paths
    await this.watcher.stop();
    this.watcher.start(pathArray);
  }

  /**
   * Periodically check and remove expired focus targets
   */
  private startFocusExpiryChecker() {
    setInterval(() => {
      const now = Date.now();
      let removed = false;

      for (const [id, target] of this.focusTargets) {
        if (target.expiresAt && target.expiresAt < now) {
          this.focusTargets.delete(id);
          console.log(`[SensoryCortex] 🎯 Focus expired: "${id}"`);
          this.bus.publish('cortex', 'sensory:focus:expired', { id });
          removed = true;
        }
      }

      if (removed) {
        this.updateWatchPaths();
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Get current focus targets
   */
  public getFocusTargets(): Map<string, FocusTarget> {
    return new Map(this.focusTargets);
  }

  /**
   * Add high-priority focus (shortcut method)
   */
  public focusOnPath(path: string, reason: string = 'Direct focus', ttlMs?: number): string {
    const id = `focus-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    this.handleFocusRequest({
      id,
      paths: [path],
      priority: 'high',
      reason,
      ttlMs
    });
    return id;
  }

  private async analyzeInputStream(input: string) {
    if (!input || input.length < 5) return;

    // Advanced Intent Recognition (LLM-based)
    // We use a lightweight heuristic first for speed, then refine if ambiguous
    const lower = input.toLowerCase();
    let type = 'General Chat';
    let confidence = 0.5;
    const entities: string[] = [];

    // Heuristic Layer (Fast)
    if (lower.startsWith('create') || lower.startsWith('make')) {
      type = 'Creative Task';
      confidence = 0.85;
    } else if (
      lower.startsWith('analyze') ||
      lower.startsWith('check') ||
      lower.includes('check it')
    ) {
      type = 'Analysis Task';
      confidence = 0.8;
    } else if (lower.includes('plan') || lower.includes('roadmap')) {
      type = 'Planning Task';
      confidence = 0.9;
    } else if (lower.includes('code') || lower.includes('function')) {
      type = 'Coding Task';
      confidence = 0.85;
    } else if (lower.startsWith('run') || lower.startsWith('exec')) {
      type = 'Execution Task';
      confidence = 0.9;
    }

    // Refinement Layer (for ambiguous cases like "can you check it?")
    // If confidence is low or type is generic, we could call Precog here.
    // For now, we improve the heuristic to catch the "check it" case identified in inspection.
    if (
      type === 'General Chat' &&
      (lower.includes('check') || lower.includes('verify') || lower.includes('review'))
    ) {
      type = 'Analysis Task';
      confidence = 0.75;
    }

    // Auto-focus on mentioned files
    const fileMatches = input.match(/\b[\w-]+\.(ts|js|json|md|py|html|css)\b/g);
    if (fileMatches && fileMatches.length > 0) {
      // Auto-focus on mentioned files with short TTL
      for (const file of fileMatches) {
        this.handleFocusRequest({
          paths: [`**/${file}`],
          priority: 'high',
          reason: `Mentioned in input: "${input.substring(0, 50)}..."`,
          ttlMs: 5 * 60 * 1000 // 5 minute focus
        });
      }
    }

    // Extract potential entities (quoted strings or file extensions)
    const quoted = input.match(/"([^"]+)"/g);
    if (quoted) {
      entities.push(...quoted.map((s) => s.replace(/"/g, '')));
    }

    const files = input.match(/\b[\w-]+\.(ts|js|json|md|py|html|css)\b/g);
    if (files) {
      entities.push(...files);
    }

    this.bus.publish('cortex', 'precog:intent_prediction', {
      type,
      confidence,
      entities: [...new Set(entities)], // Unique
      input,
    });
  }

  private analyzeMotorOutput(result: MotorResult) {
    // This is where we "read" the terminal output
    if (!result.ok) {
      console.log(`[SensoryCortex] Observed execution failure: ${result.stderr}`);
      this.bus.publish('cortex', 'sensory:observation:error', {
        source: 'motor',
        details: result.stderr,
      });
    } else {
      // If the output is interesting, we might publish an observation
      if (result.stdout && result.stdout.length > 0) {
        // Simple heuristic: if it's short, log it. If it's long, maybe summarize?
        // For now, just acknowledge.
        console.log(`[SensoryCortex] Observed execution output (${result.stdout.length} chars)`);
      }
    }
  }
}
