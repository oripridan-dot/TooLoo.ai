// @version 2.1.28
import { EventBus, SynapsysEvent } from '../../core/event-bus.js';
import { FileWatcher } from './watcher.js';
import { SemanticParser } from './semantic-parser.js';

interface MotorResult {
  ok: boolean;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
}

export class SensoryCortex {
  private watcher: FileWatcher;
  private parser: SemanticParser;

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

    this.bus.publish('cortex', 'system:component_ready', {
      component: 'sensory-cortex',
    });
    console.log('[SensoryCortex] Online - Eyes open.');
  }

  private setupListeners() {
    // Listen for requests to watch specific paths (focus attention)
    this.bus.on('sensory:focus', (event: SynapsysEvent) => {
      // TODO: Implement dynamic watch path updates
      console.log(`[SensoryCortex] Focus request received: ${JSON.stringify(event.payload)}`);
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
