import { bus } from '../../core/event-bus.js';
import { smartFS } from '../../core/fs-manager.js';

export class Oracle {
  constructor() {
    this.setupListeners();
    console.log('[Oracle] Predictive Engine Online.');
  }

  private setupListeners() {
    bus.on('sensory:file:change', async (event: any) => {
      await this.handleFileChange(event.payload);
    });
  }

  private async handleFileChange(payload: { path: string; type: string }) {
    const { path: filePath, type } = payload;

    if (type !== 'change' && type !== 'add') return;
    if (!filePath || typeof filePath !== 'string') return;

    // Only predict for TypeScript files that are NOT tests
    if (filePath.endsWith('.ts') && !filePath.includes('.test.ts')) {
      await this.predictNextStep(filePath);
    }
  }

  private async predictNextStep(filePath: string) {
    console.log(`[Oracle] Predicting next step for modified file: ${filePath}`);

    // In a real scenario, we might read the file content here
    // const content = await smartFS.read(filePath);

    // Predict: "User likely wants a test for this new code"
    bus.publish('cortex', 'cortex:metaprogram_request', {
      task: 'generate_code',
      context: {
        prompt: `Generate a Vitest suite for ${filePath}. Ensure high coverage.`,
        filePath: filePath,
        predictionType: 'test-generation',
      },
    });
  }
}
