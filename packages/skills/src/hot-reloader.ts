/**
 * @tooloo/skills - Hot Reloader
 * Watch skill YAML files and reload them on change
 *
 * @version 2.0.0-alpha.0
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { SkillRegistry } from './registry.js';
import { type SkillDefinition } from './types.js';
import { createSkillId, type SkillId, type Intent } from '@tooloo/core';

export interface HotReloaderConfig {
  /** Directory to watch for skill YAML files */
  skillsDir: string;
  /** File patterns to watch (default: ['*.yaml', '*.yml']) */
  patterns?: string[];
  /** Debounce delay in ms (default: 100) */
  debounceMs?: number;
  /** Whether to log changes */
  verbose?: boolean;
}

export interface LoadedSkill {
  id: SkillId;
  path: string;
  lastModified: Date;
}

/**
 * SkillHotReloader - Watches a directory for skill YAML files and automatically
 * reloads them when changed.
 */
export class SkillHotReloader {
  private registry: SkillRegistry;
  private config: Required<HotReloaderConfig>;
  private watcher: fs.FSWatcher | null = null;
  private loadedSkills: Map<string, LoadedSkill> = new Map();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private isRunning = false;

  constructor(registry: SkillRegistry, config: HotReloaderConfig) {
    this.registry = registry;
    this.config = {
      skillsDir: config.skillsDir,
      patterns: config.patterns || ['*.yaml', '*.yml'],
      debounceMs: config.debounceMs ?? 100,
      verbose: config.verbose ?? true,
    };
  }

  /**
   * Start watching for skill file changes
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    // Ensure directory exists
    if (!fs.existsSync(this.config.skillsDir)) {
      fs.mkdirSync(this.config.skillsDir, { recursive: true });
      this.log(`Created skills directory: ${this.config.skillsDir}`);
    }

    // Initial load of all skills
    await this.loadAllSkills();

    // Start watching
    this.watcher = fs.watch(this.config.skillsDir, { persistent: true }, (eventType, filename) => {
      if (filename && this.isYamlFile(filename)) {
        this.handleFileChange(eventType, filename);
      }
    });

    this.isRunning = true;
    this.log(`Hot reloader started, watching: ${this.config.skillsDir}`);
  }

  /**
   * Stop watching for changes
   */
  stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }

    // Clear any pending debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    this.isRunning = false;
    this.log('Hot reloader stopped');
  }

  /**
   * Get list of loaded skills
   */
  getLoadedSkills(): LoadedSkill[] {
    return Array.from(this.loadedSkills.values());
  }

  /**
   * Force reload a specific skill file
   */
  async reloadSkill(filename: string): Promise<boolean> {
    const filePath = path.join(this.config.skillsDir, filename);
    if (!fs.existsSync(filePath)) {
      this.log(`Skill file not found: ${filename}`, 'warn');
      return false;
    }

    try {
      await this.loadSkillFile(filePath);
      return true;
    } catch (error) {
      this.log(`Failed to reload skill: ${filename} - ${error}`, 'error');
      return false;
    }
  }

  /**
   * Force reload all skills
   */
  async reloadAll(): Promise<number> {
    return this.loadAllSkills();
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  private async loadAllSkills(): Promise<number> {
    const files = fs.readdirSync(this.config.skillsDir).filter(f => this.isYamlFile(f));

    let loaded = 0;
    for (const file of files) {
      const filePath = path.join(this.config.skillsDir, file);
      try {
        await this.loadSkillFile(filePath);
        loaded++;
      } catch (error) {
        this.log(`Failed to load skill: ${file} - ${error}`, 'error');
      }
    }

    this.log(`Loaded ${loaded} skills from ${this.config.skillsDir}`);
    return loaded;
  }

  private async loadSkillFile(filePath: string): Promise<void> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = yaml.load(content) as Record<string, unknown>;

    // Convert YAML to SkillDefinition
    const skill = this.yamlToSkillDefinition(data, filePath);

    // Register with registry (overwrites if exists)
    this.registry.register(skill);

    // Track loaded skill
    this.loadedSkills.set(filePath, {
      id: skill.id,
      path: filePath,
      lastModified: new Date(),
    });

    this.log(`Loaded skill: ${skill.name} (${skill.id})`);
  }

  private yamlToSkillDefinition(
    data: Record<string, unknown>,
    filePath: string
  ): SkillDefinition {
    // Generate ID from name or filename
    const name = (data['name'] as string) || path.basename(filePath, path.extname(filePath));
    const id = (data['id'] as string)
      ? createSkillId(data['id'] as string)
      : createSkillId(name.toLowerCase().replace(/\s+/g, '-'));

    // Parse triggers
    const triggersData = (data['triggers'] as Record<string, unknown>) || {};
    const intentStrings = (triggersData['intents'] as string[]) || [];
    const validIntents: Intent['type'][] = [
      'code',
      'design',
      'analyze',
      'research',
      'plan',
      'chat',
      'execute',
      'create',
      'fix',
      'refactor',
      'test',
      'document',
      'unknown',
    ];
    const triggers = {
      intents: intentStrings.filter(i => validIntents.includes(i as Intent['type'])) as Intent['type'][],
      keywords: (triggersData['keywords'] as string[]) || [],
      patterns: (triggersData['patterns'] as string[]) || undefined,
      minConfidence: (triggersData['minConfidence'] as number) || undefined,
    };

    // Parse context
    const contextData = (data['context'] as Record<string, unknown>) || {};
    const context = {
      maxTokens: (contextData['maxTokens'] as number) || 4096,
      ragSources: ((contextData['ragSources'] as string[]) || ['memory']) as Array<
        'codebase' | 'docs' | 'memory' | 'web' | 'artifacts'
      >,
      memoryScope: ((contextData['memoryScope'] as string) || 'session') as
        | 'session'
        | 'project'
        | 'global',
      includeHistory: (contextData['includeHistory'] as boolean) ?? true,
      maxHistoryMessages: (contextData['maxHistoryMessages'] as number) || 10,
    };

    // Parse composability
    const composabilityData = (data['composability'] as Record<string, unknown>) || {};
    const composability = {
      requires: (composabilityData['requires'] as string[]) || [],
      enhances: (composabilityData['enhances'] as string[]) || [],
      conflicts: (composabilityData['conflicts'] as string[]) || [],
      priority: (composabilityData['priority'] as number) || 0,
    };

    // Parse model requirements
    const modelReqData = (data['modelRequirements'] as Record<string, unknown>) || {};
    type Capability = 'coding' | 'reasoning' | 'creative' | 'vision' | 'analysis';
    const validCapabilities: Capability[] = ['coding', 'reasoning', 'creative', 'vision', 'analysis'];
    const capabilitiesRaw = (modelReqData['capabilities'] as string[]) || [];
    const capabilities = capabilitiesRaw.filter(c => validCapabilities.includes(c as Capability)) as Capability[];
    
    const modelRequirements =
      Object.keys(modelReqData).length > 0
        ? {
            temperature: (modelReqData['temperature'] as number) || undefined,
            minContext: (modelReqData['minContext'] as number) || undefined,
            capabilities: capabilities.length > 0 ? capabilities : undefined,
            preferredProviders: (modelReqData['preferredProviders'] as string[]) || undefined,
          }
        : undefined;

    return {
      id,
      name,
      version: (data['version'] as string) || '1.0.0',
      description: (data['description'] as string) || `Skill loaded from ${path.basename(filePath)}`,
      instructions: (data['instructions'] as string) || '',
      tools: ((data['tools'] as Array<{ name: string; description?: string; required?: boolean }>) ||
        []) as SkillDefinition['tools'],
      triggers,
      context,
      composability,
      modelRequirements,
    };
  }

  private handleFileChange(eventType: string, filename: string): void {
    const filePath = path.join(this.config.skillsDir, filename);

    // Debounce the reload
    const existingTimer = this.debounceTimers.get(filePath);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    this.debounceTimers.set(
      filePath,
      setTimeout(async () => {
        this.debounceTimers.delete(filePath);

        if (eventType === 'rename') {
          // File might be deleted or renamed
          if (!fs.existsSync(filePath)) {
            // File deleted - unregister skill
            const loaded = this.loadedSkills.get(filePath);
            if (loaded) {
              this.registry.unregister(loaded.id);
              this.loadedSkills.delete(filePath);
              this.log(`Unregistered skill: ${loaded.id} (file deleted)`);
            }
            return;
          }
        }

        // Load or reload the skill
        try {
          await this.loadSkillFile(filePath);
          this.log(`Reloaded skill: ${filename}`);
        } catch (error) {
          this.log(`Failed to reload skill: ${filename} - ${error}`, 'error');
        }
      }, this.config.debounceMs)
    );
  }

  private isYamlFile(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    return ext === '.yaml' || ext === '.yml';
  }

  private log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    if (!this.config.verbose && level === 'info') {
      return;
    }

    const prefix = '[SkillHotReloader]';
    switch (level) {
      case 'error':
        console.error(`${prefix} ❌ ${message}`);
        break;
      case 'warn':
        console.warn(`${prefix} ⚠️  ${message}`);
        break;
      default:
        console.log(`${prefix} ${message}`);
    }
  }
}

/**
 * Factory function to create a hot reloader
 */
export function createHotReloader(
  registry: SkillRegistry,
  config: HotReloaderConfig
): SkillHotReloader {
  return new SkillHotReloader(registry, config);
}
