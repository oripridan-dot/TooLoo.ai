// @version 3.3.358 - AI Infrastructure Enhancement Tests
// Combined tests for all Phase 1-4 modules
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock event bus
vi.mock('../../src/core/event-bus.js', () => ({
  bus: {
    publish: vi.fn(),
    on: vi.fn(),
  },
}));

// ============================================================================
// Smart Router Tests
// ============================================================================
import { SmartRouter } from '../../src/precog/providers/smart-router.js';

describe('SmartRouter', () => {
  let router: SmartRouter;

  beforeEach(() => {
    router = new SmartRouter();
  });

  it('should create router successfully', () => {
    expect(router).toBeDefined();
  });

  it('should analyze simple tasks', () => {
    const profile = router.analyzeTask('Hello, how are you?', {});
    expect(profile.complexity).toBe('low');
    expect(profile.type).toBe('chat');
  });

  it('should analyze code tasks', () => {
    const profile = router.analyzeTask('function test() { return true; }', {});
    expect(profile.type).toBe('code');
  });

  it('should route tasks', async () => {
    const decision = await router.route({
      type: 'chat',
      complexity: 'low',
      domain: 'general',
      requiresStreaming: false,
      maxLatencyMs: 5000,
    });
    expect(decision).toBeDefined();
    expect(decision.primaryProvider).toBeDefined();
  });

  it('should get routing history', async () => {
    await router.route({
      type: 'chat',
      complexity: 'low',
      domain: 'general',
      requiresStreaming: false,
      maxLatencyMs: 5000,
    });
    const history = router.getRoutingHistory();
    expect(Array.isArray(history)).toBe(true);
  });
});

// ============================================================================
// Ollama Provider Tests
// ============================================================================
import { OllamaProvider } from '../../src/precog/providers/ollama-provider.js';

describe('OllamaProvider', () => {
  let provider: OllamaProvider;

  beforeEach(() => {
    provider = new OllamaProvider('http://localhost:11434');
  });

  it('should create provider with URL', () => {
    expect(provider).toBeDefined();
  });

  it('should create provider with default URL', () => {
    const defaultProvider = new OllamaProvider();
    expect(defaultProvider).toBeDefined();
  });

  it('should check online status', async () => {
    // Will return false since Ollama isn't running
    const online = await provider.isOnline();
    expect(typeof online).toBe('boolean');
  });

  it('should list models (empty when offline)', async () => {
    const models = await provider.listModels();
    expect(Array.isArray(models)).toBe(true);
  });
});

// ============================================================================
// Encryption Manager Tests
// ============================================================================
import { EncryptionManager } from '../../src/core/security/encryption-manager.js';

describe('EncryptionManager', () => {
  let manager: EncryptionManager;

  beforeEach(async () => {
    // Use non-production env for auto-generated key
    process.env['NODE_ENV'] = 'test';
    manager = new EncryptionManager();
    await manager.initialize();
  });

  it('should initialize successfully', () => {
    expect(manager.isInitialized()).toBe(true);
  });

  it('should encrypt and decrypt data', () => {
    const plaintext = 'secret-api-key-12345';
    const encrypted = manager.encrypt(plaintext);
    const decrypted = manager.decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('should generate unique IVs', () => {
    const enc1 = manager.encrypt('test');
    const enc2 = manager.encrypt('test');
    expect(enc1.iv).not.toBe(enc2.iv);
  });

  it('should store and retrieve API keys', async () => {
    await manager.storeApiKey('test-provider', 'test-key-value');
    const retrieved = await manager.getApiKey('test-provider');
    expect(retrieved).toBe('test-key-value');
  });

  it('should return null for non-existent keys', async () => {
    const retrieved = await manager.getApiKey('nonexistent');
    expect(retrieved).toBeNull();
  });

  it('should store and retrieve secrets', async () => {
    await manager.storeSecret('db-password', 'super-secret');
    const retrieved = await manager.getSecret('db-password');
    expect(retrieved).toBe('super-secret');
  });

  it('should get key metadata', () => {
    const metadata = manager.getKeyMetadata();
    expect(metadata).toBeDefined();
    expect(metadata.algorithm).toBe('aes-256-gcm');
  });
});

// ============================================================================
// Data Enrichment Pipeline Tests
// ============================================================================
import { DataEnrichmentPipeline } from '../../src/precog/engine/data-enrichment.js';

describe('DataEnrichmentPipeline', () => {
  let pipeline: DataEnrichmentPipeline;

  beforeEach(() => {
    pipeline = new DataEnrichmentPipeline();
  });

  it('should create pipeline successfully', () => {
    expect(pipeline).toBeDefined();
  });

  it('should have default sources', () => {
    const sources = pipeline.getActiveSources();
    expect(sources.length).toBeGreaterThan(0);
  });

  it('should register custom source', () => {
    const initialCount = pipeline.getActiveSources().length;
    pipeline.registerSource({
      id: 'custom-test',
      name: 'Custom Test',
      type: 'custom',
      priority: 10,
      enabled: true,
    });
    expect(pipeline.getActiveSources().length).toBe(initialCount + 1);
  });

  it('should enrich request', async () => {
    const result = await pipeline.enrichRequest({
      prompt: 'Test prompt',
      sessionId: 'test-session',
    });
    expect(result).toBeDefined();
    expect(result.originalPrompt).toBe('Test prompt');
  });

  it('should enrich response', async () => {
    const result = await pipeline.enrichResponse({
      response: 'Test response',
      prompt: 'Test prompt',
    });
    expect(result).toBeDefined();
    expect(result.originalResponse).toBe('Test response');
  });
});

// ============================================================================
// Plugin Manager Tests
// ============================================================================
import { PluginManager } from '../../src/core/plugin-manager.js';

describe('PluginManager', () => {
  let manager: PluginManager;

  beforeEach(async () => {
    manager = new PluginManager(process.cwd());
    await manager.initialize();
  });

  it('should initialize successfully', () => {
    expect(manager).toBeDefined();
  });

  it('should list plugins (empty initially)', () => {
    const plugins = manager.listPlugins();
    expect(Array.isArray(plugins)).toBe(true);
  });

  it('should register plugin', async () => {
    await manager.registerPlugin({
      id: 'test-plugin',
      name: 'Test Plugin',
      version: '1.0.0',
      author: 'Test',
      type: 'tool',
      entry: 'index.js',
    }, async () => ({ success: true }));

    const plugins = manager.listPlugins();
    expect(plugins.some(p => p.id === 'test-plugin')).toBe(true);
  });

  it('should enable and disable plugin', async () => {
    await manager.registerPlugin({
      id: 'toggle-plugin',
      name: 'Toggle Plugin',
      version: '1.0.0',
      author: 'Test',
      type: 'tool',
      entry: 'index.js',
    }, async () => ({}));

    await manager.enablePlugin('toggle-plugin');
    let plugin = manager.getPlugin('toggle-plugin');
    expect(plugin?.enabled).toBe(true);

    await manager.disablePlugin('toggle-plugin');
    plugin = manager.getPlugin('toggle-plugin');
    expect(plugin?.enabled).toBe(false);
  });

  it('should execute hooks', async () => {
    const hookFn = vi.fn().mockResolvedValue({ modified: true });
    
    await manager.registerPlugin({
      id: 'hook-plugin',
      name: 'Hook Plugin',
      version: '1.0.0',
      author: 'Test',
      type: 'tool',
      entry: 'index.js',
      hooks: ['before-generate'],
    }, hookFn);

    await manager.enablePlugin('hook-plugin');
    await manager.executeHook('before-generate', { data: 'test' });

    expect(hookFn).toHaveBeenCalled();
  });
});

// ============================================================================
// Self-Healing Orchestrator Tests
// ============================================================================
import { SelfHealingOrchestrator } from '../../src/cortex/self-modification/self-healing-orchestrator.js';

describe('SelfHealingOrchestrator', () => {
  let orchestrator: SelfHealingOrchestrator;

  beforeEach(async () => {
    orchestrator = new SelfHealingOrchestrator();
    await orchestrator.initialize();
  });

  afterEach(() => {
    orchestrator.stopMonitoring();
  });

  it('should initialize successfully', () => {
    expect(orchestrator).toBeDefined();
  });

  it('should start and stop monitoring', () => {
    orchestrator.startMonitoring(60000);
    expect(orchestrator.isMonitoring()).toBe(true);

    orchestrator.stopMonitoring();
    expect(orchestrator.isMonitoring()).toBe(false);
  });

  it('should run health check', async () => {
    const report = await orchestrator.runHealthCheck();
    expect(report).toBeDefined();
    expect(report.healthy).toBeDefined();
    expect(Array.isArray(report.metrics)).toBe(true);
  });

  it('should get status', () => {
    const status = orchestrator.getStatus();
    expect(status).toBeDefined();
    expect(typeof status.monitoring).toBe('boolean');
    expect(typeof status.issuesDetected).toBe('number');
  });

  it('should get healing history', () => {
    const history = orchestrator.getHealingHistory();
    expect(Array.isArray(history)).toBe(true);
  });

  it('should heal issues', async () => {
    const result = await orchestrator.heal({
      type: 'performance',
      severity: 'low',
      component: 'cache',
      message: 'Test issue',
    }, 'cache-clear');

    expect(result).toBeDefined();
    expect(result.strategy).toBe('cache-clear');
  });
});
