// @version 3.3.350
/**
 * Plugin Manager - Ecosystem Extension Architecture
 *
 * Enables TooLoo to be extended with:
 * - Custom AI providers
 * - Data sources and integrations
 * - Processing pipelines
 * - Custom tools and capabilities
 * - Hooks for request/response transformation
 *
 * Part of PHASE 3: Ecosystem Extensions
 * @module core/plugin-manager
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { bus } from './event-bus.js';

// ============================================================================
// TYPES
// ============================================================================

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  type: PluginType;
  capabilities: string[];
  hooks: PluginHook[];
  config?: Record<string, PluginConfigField>;
  dependencies?: string[];
  main: string;
}

export type PluginType = 
  | 'provider'      // AI provider integration
  | 'data-source'   // External data source
  | 'processor'     // Data/response processor
  | 'tool'          // Custom tool/capability
  | 'integration'   // Third-party integration
  | 'theme'         // UI theme (future)
  | 'analytics';    // Analytics/telemetry

export type PluginHook =
  | 'pre-request'   // Before AI request
  | 'post-request'  // After AI request
  | 'pre-response'  // Before response sent
  | 'post-response' // After response sent
  | 'on-error'      // On error
  | 'on-startup'    // On system startup
  | 'on-shutdown';  // On system shutdown

export interface PluginConfigField {
  type: 'string' | 'number' | 'boolean' | 'select' | 'secret';
  label: string;
  description?: string;
  required?: boolean;
  default?: unknown;
  options?: string[]; // For select type
}

export interface PluginInstance {
  manifest: PluginManifest;
  config: Record<string, unknown>;
  enabled: boolean;
  loadedAt: number;
  instance: IPlugin;
}

export interface IPlugin {
  // Lifecycle
  initialize?(config: Record<string, unknown>): Promise<void>;
  destroy?(): Promise<void>;
  
  // Hooks
  preRequest?(context: PluginContext): Promise<PluginContext>;
  postRequest?(context: PluginContext): Promise<PluginContext>;
  preResponse?(context: PluginContext): Promise<PluginContext>;
  postResponse?(context: PluginContext): Promise<PluginContext>;
  onError?(error: Error, context: PluginContext): Promise<void>;
  onStartup?(): Promise<void>;
  onShutdown?(): Promise<void>;
  
  // Provider interface (for provider plugins)
  generate?(request: ProviderRequest): Promise<ProviderResponse>;
  stream?(request: ProviderRequest, onChunk: (chunk: string) => void): Promise<ProviderResponse>;
  
  // Data source interface (for data-source plugins)
  search?(query: string, options?: Record<string, unknown>): Promise<DataResult[]>;
  fetch?(id: string): Promise<DataResult | null>;
  
  // Tool interface (for tool plugins)
  execute?(input: Record<string, unknown>): Promise<ToolResult>;
  getSchema?(): ToolSchema;
}

export interface PluginContext {
  requestId: string;
  sessionId?: string;
  query: string;
  response?: string;
  metadata: Record<string, unknown>;
  modifiedBy: string[];
}

export interface ProviderRequest {
  prompt: string;
  system?: string;
  history?: Array<{ role: string; content: string }>;
  options?: Record<string, unknown>;
}

export interface ProviderResponse {
  content: string;
  provider: string;
  model?: string;
  usage?: { promptTokens: number; completionTokens: number };
}

export interface DataResult {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  relevance?: number;
}

export interface ToolResult {
  success: boolean;
  output: unknown;
  error?: string;
}

export interface ToolSchema {
  name: string;
  description: string;
  parameters: Record<string, {
    type: string;
    description: string;
    required?: boolean;
  }>;
}

// ============================================================================
// PLUGIN MANAGER CLASS
// ============================================================================

export class PluginManager extends EventEmitter {
  private plugins: Map<string, PluginInstance> = new Map();
  private pluginsDir: string;
  private configPath: string;
  private hookListeners: Map<PluginHook, string[]> = new Map();

  constructor(baseDir?: string) {
    super();
    this.pluginsDir = path.join(baseDir || process.cwd(), 'plugins');
    this.configPath = path.join(baseDir || process.cwd(), 'data', 'plugins-config.json');
    this.initializeHookListeners();
  }

  private initializeHookListeners() {
    const hooks: PluginHook[] = [
      'pre-request', 'post-request', 'pre-response', 'post-response',
      'on-error', 'on-startup', 'on-shutdown'
    ];
    hooks.forEach(hook => this.hookListeners.set(hook, []));
  }

  // ===========================================================================
  // Plugin Discovery & Loading
  // ===========================================================================

  async discoverPlugins(): Promise<PluginManifest[]> {
    const manifests: PluginManifest[] = [];

    if (!fs.existsSync(this.pluginsDir)) {
      console.log('[PluginManager] No plugins directory found');
      return manifests;
    }

    const entries = fs.readdirSync(this.pluginsDir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const manifestPath = path.join(this.pluginsDir, entry.name, 'manifest.json');
        
        if (fs.existsSync(manifestPath)) {
          try {
            const manifest = JSON.parse(
              fs.readFileSync(manifestPath, 'utf8')
            ) as PluginManifest;
            manifests.push(manifest);
          } catch (error) {
            console.warn(`[PluginManager] Invalid manifest in ${entry.name}:`, error);
          }
        }
      }
    }

    console.log(`[PluginManager] Discovered ${manifests.length} plugins`);
    return manifests;
  }

  async loadPlugin(pluginId: string, config?: Record<string, unknown>): Promise<boolean> {
    try {
      const manifestPath = path.join(this.pluginsDir, pluginId, 'manifest.json');
      
      if (!fs.existsSync(manifestPath)) {
        console.error(`[PluginManager] Plugin ${pluginId} not found`);
        return false;
      }

      const manifest = JSON.parse(
        fs.readFileSync(manifestPath, 'utf8')
      ) as PluginManifest;

      // Check dependencies
      if (manifest.dependencies) {
        for (const dep of manifest.dependencies) {
          if (!this.plugins.has(dep)) {
            console.error(`[PluginManager] Missing dependency ${dep} for ${pluginId}`);
            return false;
          }
        }
      }

      // Load plugin module
      const pluginPath = path.join(this.pluginsDir, pluginId, manifest.main);
      const pluginModule = await import(pluginPath);
      const PluginClass = pluginModule.default || pluginModule.Plugin;
      
      if (!PluginClass) {
        console.error(`[PluginManager] No default export in ${pluginId}`);
        return false;
      }

      const instance: IPlugin = new PluginClass();
      
      // Merge config with defaults
      const finalConfig = this.mergeConfig(manifest.config, config);
      
      // Initialize plugin
      if (instance.initialize) {
        await instance.initialize(finalConfig);
      }

      // Register hooks
      for (const hook of manifest.hooks) {
        const listeners = this.hookListeners.get(hook) || [];
        listeners.push(pluginId);
        this.hookListeners.set(hook, listeners);
      }

      // Store plugin instance
      this.plugins.set(pluginId, {
        manifest,
        config: finalConfig,
        enabled: true,
        loadedAt: Date.now(),
        instance,
      });

      bus.publish('system', 'plugin:loaded', { pluginId, manifest });
      console.log(`[PluginManager] ✓ Loaded plugin: ${manifest.name} v${manifest.version}`);
      
      return true;

    } catch (error: any) {
      console.error(`[PluginManager] Failed to load ${pluginId}:`, error.message);
      return false;
    }
  }

  async unloadPlugin(pluginId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return false;

    try {
      // Call destroy if available
      if (plugin.instance.destroy) {
        await plugin.instance.destroy();
      }

      // Remove from hook listeners
      for (const [hook, listeners] of Array.from(this.hookListeners.entries())) {
        this.hookListeners.set(hook, listeners.filter(id => id !== pluginId));
      }

      this.plugins.delete(pluginId);
      
      bus.publish('system', 'plugin:unloaded', { pluginId });
      console.log(`[PluginManager] ✓ Unloaded plugin: ${pluginId}`);
      
      return true;
    } catch (error: any) {
      console.error(`[PluginManager] Failed to unload ${pluginId}:`, error.message);
      return false;
    }
  }

  private mergeConfig(
    schema?: Record<string, PluginConfigField>,
    provided?: Record<string, unknown>
  ): Record<string, unknown> {
    const config: Record<string, unknown> = {};
    
    if (schema) {
      for (const [key, field] of Object.entries(schema)) {
        config[key] = provided?.[key] ?? field.default;
      }
    }
    
    return config;
  }

  // ===========================================================================
  // Hook Execution
  // ===========================================================================

  async executeHook(hook: PluginHook, context: PluginContext): Promise<PluginContext> {
    const listeners = this.hookListeners.get(hook) || [];
    let currentContext = { ...context };

    for (const pluginId of listeners) {
      const plugin = this.plugins.get(pluginId);
      if (!plugin?.enabled) continue;

      try {
        const hookMethod = this.getHookMethod(plugin.instance, hook);
        if (hookMethod) {
          const result = await hookMethod.call(plugin.instance, currentContext);
          if (result) {
            currentContext = {
              ...result,
              modifiedBy: [...(result.modifiedBy || []), pluginId],
            };
          }
        }
      } catch (error: any) {
        console.error(`[PluginManager] Hook ${hook} failed for ${pluginId}:`, error.message);
        bus.publish('system', 'plugin:hook-error', { pluginId, hook, error: error.message });
      }
    }

    return currentContext;
  }

  private getHookMethod(instance: IPlugin, hook: PluginHook): Function | undefined {
    const methodMap: Record<PluginHook, keyof IPlugin> = {
      'pre-request': 'preRequest',
      'post-request': 'postRequest',
      'pre-response': 'preResponse',
      'post-response': 'postResponse',
      'on-error': 'onError',
      'on-startup': 'onStartup',
      'on-shutdown': 'onShutdown',
    };
    
    const method = methodMap[hook];
    return method ? instance[method] as Function | undefined : undefined;
  }

  // ===========================================================================
  // Provider Plugins
  // ===========================================================================

  getProviderPlugins(): Array<{ id: string; manifest: PluginManifest }> {
    const results: Array<{ id: string; manifest: PluginManifest }> = [];
    this.plugins.forEach((p, id) => {
      if (p.manifest.type === 'provider' && p.enabled) {
        results.push({ id, manifest: p.manifest });
      }
    });
    return results;
  }

  async generateWithPlugin(
    pluginId: string,
    request: ProviderRequest
  ): Promise<ProviderResponse | null> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin?.instance.generate) return null;
    
    return plugin.instance.generate(request);
  }

  // ===========================================================================
  // Tool Plugins
  // ===========================================================================

  getToolPlugins(): Array<{ id: string; schema: ToolSchema }> {
    const tools: Array<{ id: string; schema: ToolSchema }> = [];
    
    this.plugins.forEach((plugin, id) => {
      if (plugin.manifest.type === 'tool' && plugin.enabled && plugin.instance.getSchema) {
        tools.push({ id, schema: plugin.instance.getSchema() });
      }
    });
    
    return tools;
  }

  async executeTool(pluginId: string, input: Record<string, unknown>): Promise<ToolResult | null> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin?.instance.execute) return null;
    
    return plugin.instance.execute(input);
  }

  // ===========================================================================
  // Lifecycle
  // ===========================================================================

  async initialize(): Promise<void> {
    // Create plugins directory if it doesn't exist
    if (!fs.existsSync(this.pluginsDir)) {
      fs.mkdirSync(this.pluginsDir, { recursive: true });
    }

    // Load saved plugin config
    await this.loadSavedConfig();

    // Execute startup hooks
    await this.executeHook('on-startup', {
      requestId: 'startup',
      query: '',
      metadata: {},
      modifiedBy: [],
    });

    console.log(`[PluginManager] ✓ Initialized with ${this.plugins.size} plugins`);
  }

  async shutdown(): Promise<void> {
    // Execute shutdown hooks
    await this.executeHook('on-shutdown', {
      requestId: 'shutdown',
      query: '',
      metadata: {},
      modifiedBy: [],
    });

    // Unload all plugins
    const pluginIds = Array.from(this.plugins.keys());
    for (const pluginId of pluginIds) {
      await this.unloadPlugin(pluginId);
    }

    // Save config
    await this.saveConfig();
  }

  private async loadSavedConfig(): Promise<void> {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
        
        for (const [pluginId, config] of Object.entries(data.plugins || {})) {
          const pluginConfig = config as { enabled: boolean; config: Record<string, unknown> };
          if (pluginConfig.enabled) {
            await this.loadPlugin(pluginId, pluginConfig.config);
          }
        }
      }
    } catch (error) {
      console.warn('[PluginManager] Could not load saved config');
    }
  }

  private async saveConfig(): Promise<void> {
    try {
      const data: Record<string, { enabled: boolean; config: Record<string, unknown> }> = {};
      
      this.plugins.forEach((plugin, id) => {
        data[id] = {
          enabled: plugin.enabled,
          config: plugin.config,
        };
      });

      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(this.configPath, JSON.stringify({ plugins: data }, null, 2));
    } catch (error) {
      console.error('[PluginManager] Failed to save config');
    }
  }

  // ===========================================================================
  // Info & Stats
  // ===========================================================================

  getPluginInfo(pluginId: string): PluginInstance | undefined {
    return this.plugins.get(pluginId);
  }

  listPlugins(): Array<{
    id: string;
    name: string;
    type: PluginType;
    enabled: boolean;
    version: string;
  }> {
    const result: Array<{ id: string; name: string; type: PluginType; enabled: boolean; version: string }> = [];
    this.plugins.forEach((p, id) => {
      result.push({
        id,
        name: p.manifest.name,
        type: p.manifest.type,
        enabled: p.enabled,
        version: p.manifest.version,
      });
    });
    return result;
  }

  getStats() {
    return {
      totalPlugins: this.plugins.size,
      enabledPlugins: Array.from(this.plugins.values()).filter(p => p.enabled).length,
      byType: this.countByType(),
      hooks: Object.fromEntries(
        Array.from(this.hookListeners.entries())
          .map(([hook, listeners]) => [hook, listeners.length])
      ),
    };
  }

  private countByType(): Record<PluginType, number> {
    const counts: Record<string, number> = {};
    
    this.plugins.forEach((plugin) => {
      counts[plugin.manifest.type] = (counts[plugin.manifest.type] || 0) + 1;
    });
    
    return counts as Record<PluginType, number>;
  }

  async enablePlugin(pluginId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return false;
    
    plugin.enabled = true;
    await this.saveConfig();
    bus.publish('system', 'plugin:enabled', { pluginId });
    return true;
  }

  async disablePlugin(pluginId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return false;
    
    plugin.enabled = false;
    await this.saveConfig();
    bus.publish('system', 'plugin:disabled', { pluginId });
    return true;
  }
}

// Export singleton instance
export const pluginManager = new PluginManager();
