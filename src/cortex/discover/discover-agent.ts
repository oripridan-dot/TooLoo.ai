// @version 1.0.0
import { bus } from '../../core/event-bus.js';
import { EmergenceArtifact, ArtifactType, createEmergenceArtifact } from './emergence-artifact.js';

export interface CuriositySignal {
  id: string;
  type: 'novelty' | 'uncertainty' | 'surprise' | 'complexity';
  description: string;
  score: number;
  context: Record<string, unknown>;
  timestamp: Date;
}

export interface DiscoverPolicy {
  minCuriosityThreshold: number;
  maxConcurrentDiscoveries: number;
  cooldownMs: number;
  priorityTypes: ArtifactType[];
  requireEthicsCheck: boolean;
  requireSandboxValidation: boolean;
  humanApprovalThreshold: number;
}

export class DisCoverAgent {
  private artifacts: Map<string, EmergenceArtifact> = new Map();
  private pendingSignals: CuriositySignal[] = [];
  private activeDiscoveries: Set<string> = new Set();
  private policy: DiscoverPolicy;

  constructor(policy?: Partial<DiscoverPolicy>) {
    this.policy = {
      minCuriosityThreshold: 0.6,
      maxConcurrentDiscoveries: 3,
      cooldownMs: 60000,
      priorityTypes: ['pattern', 'optimization', 'capability'],
      requireEthicsCheck: true,
      requireSandboxValidation: true,
      humanApprovalThreshold: 0.8,
      ...policy,
    };
    this.setupListeners();
  }

  async initialize(): Promise<void> {
    console.log('[DisCover] Agent initialized - Emergence coordinator ready');
    this.startDiscoveryCycle();
    bus.publish('cortex', 'discover:initialized', {
      policy: this.policy,
      timestamp: new Date().toISOString(),
    });
  }

  private setupListeners(): void {
    bus.on('curiosity:signal_generated', (event) => {
      this.receiveCuriositySignal(event.payload as CuriositySignal);
    });
  }

  receiveCuriositySignal(signal: CuriositySignal): void {
    if (signal.score < this.policy.minCuriosityThreshold) return;
    this.pendingSignals.push(signal);
    console.log(
      '[DisCover] Queued signal: ' + signal.type + ' (score: ' + signal.score.toFixed(2) + ')'
    );
  }

  private startDiscoveryCycle(): void {
    setInterval(() => this.processDiscoveryCycle(), this.policy.cooldownMs);
  }

  private async processDiscoveryCycle(): Promise<void> {
    if (this.activeDiscoveries.size >= this.policy.maxConcurrentDiscoveries) return;
    const signal = this.pendingSignals.shift();
    if (!signal) return;

    const discoveryId = 'discovery-' + Date.now();
    this.activeDiscoveries.add(discoveryId);
    try {
      const artifact = await this.processSignal(signal);
      if (artifact) {
        this.artifacts.set(artifact.id, artifact);
        bus.publish('cortex', 'discover:artifact_created', {
          artifactId: artifact.id,
          type: artifact.type,
        });
      }
    } finally {
      this.activeDiscoveries.delete(discoveryId);
    }
  }

  private async processSignal(signal: CuriositySignal): Promise<EmergenceArtifact | null> {
    const artifactType =
      signal.type === 'novelty' ? 'knowledge' : signal.type === 'surprise' ? 'pattern' : 'insight';
    return createEmergenceArtifact(
      artifactType,
      signal.type + ': ' + signal.description.substring(0, 50),
      signal.description,
      {},
      { confidence: signal.score * 0.7, sourceSignals: [signal.id], tags: [signal.type] }
    );
  }

  getArtifacts(): EmergenceArtifact[] {
    return Array.from(this.artifacts.values());
  }
  getStatistics(): Record<string, unknown> {
    return { totalArtifacts: this.artifacts.size, pendingSignals: this.pendingSignals.length };
  }
}

export const discoverAgent = new DisCoverAgent();
