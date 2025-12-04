import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';

// Responsibility categories for modules
export const MODULE_RESPONSIBILITIES = [
  // Core Processing
  'intent-parsing', // Parse user intent from input
  'reasoning', // Multi-step reasoning chains
  'planning', // Task and workflow planning
  'execution', // Execute planned actions

  // Provider Management
  'provider-selection', // Select optimal provider
  'provider-metrics', // Track provider performance
  'provider-failover', // Handle provider failures

  // Memory & Context
  'short-term-memory', // Session context
  'long-term-memory', // Persistent memory
  'context-retrieval', // Retrieve relevant context

  // Communication
  'api-handling', // Handle API requests
  'websocket-handling', // Handle WebSocket connections
  'event-dispatch', // Dispatch system events

  // Visual & Output
  'visual-generation', // Generate visual content
  'response-formatting', // Format responses
  'artifact-management', // Manage created artifacts

  // System
  'health-monitoring', // Monitor system health
  'logging', // System logging
  'configuration', // System configuration
] as const;

export type ModuleResponsibility = (typeof MODULE_RESPONSIBILITIES)[number];

export interface SystemModule {
  name: string;
  version: string;
  status: 'booting' | 'ready' | 'degraded' | 'error';
  responsibilities?: ModuleResponsibility[];
  meta?: Record<string, unknown>;
  healthCheck?: () => Promise<boolean>;
}

interface ResponsibilityConflict {
  responsibility: ModuleResponsibility;
  modules: string[];
  resolution: 'first-wins' | 'error' | 'coexist';
}

class ModuleRegistry extends EventEmitter {
  private modules: Map<string, SystemModule> = new Map();
  private responsibilityMap: Map<ModuleResponsibility, string> = new Map();
  private conflicts: ResponsibilityConflict[] = [];
  private strictMode: boolean = true;

  register(module: SystemModule) {
    // Validate responsibilities
    if (module.responsibilities && module.responsibilities.length > 0) {
      for (const resp of module.responsibilities) {
        const existing = this.responsibilityMap.get(resp);
        if (existing && existing !== module.name) {
          const conflict: ResponsibilityConflict = {
            responsibility: resp,
            modules: [existing, module.name],
            resolution: this.strictMode ? 'error' : 'first-wins',
          };
          this.conflicts.push(conflict);

          if (this.strictMode) {
            console.error(
              `[Registry] ⚠️ RESPONSIBILITY CONFLICT: "${resp}" claimed by both ${existing} and ${module.name}`
            );
            this.emit('responsibility:conflict', conflict);
          }
        } else {
          this.responsibilityMap.set(resp, module.name);
        }
      }
    }

    this.modules.set(module.name, module);
    this.emit('module:registered', module);
    console.log(
      `[Registry] Module registered: ${module.name} v${module.version} [${module.status}]` +
        (module.responsibilities?.length ? ` (${module.responsibilities.join(', ')})` : '')
    );
  }

  updateStatus(name: string, status: SystemModule['status'], meta?: Record<string, unknown>) {
    const mod = this.modules.get(name);
    if (mod) {
      mod.status = status;
      if (meta) {
        mod.meta = { ...mod.meta, ...meta };
      }
      this.modules.set(name, mod);
      this.emit('module:status_change', { name, status, meta });
    }
  }

  get(name: string) {
    return this.modules.get(name);
  }

  getAll() {
    return Array.from(this.modules.values()).map((m) => ({
      ...m,
      uptime: process.uptime(),
    }));
  }

  /**
   * Get the module responsible for a specific responsibility
   */
  getModuleForResponsibility(responsibility: ModuleResponsibility): string | null {
    return this.responsibilityMap.get(responsibility) || null;
  }

  /**
   * Get the responsibility matrix - which module owns what
   */
  getResponsibilityMatrix(): Record<ModuleResponsibility, string | null> {
    const matrix: Record<string, string | null> = {};
    for (const resp of MODULE_RESPONSIBILITIES) {
      matrix[resp] = this.responsibilityMap.get(resp) || null;
    }
    return matrix as Record<ModuleResponsibility, string | null>;
  }

  /**
   * Validate that no two modules claim the same responsibility
   */
  validateResponsibilities(): {
    valid: boolean;
    conflicts: ResponsibilityConflict[];
  } {
    return {
      valid: this.conflicts.length === 0,
      conflicts: [...this.conflicts],
    };
  }

  /**
   * Generate RESPONSIBILITIES.md content
   */
  generateResponsibilitiesDoc(): string {
    const lines: string[] = [
      '# System Responsibilities Matrix',
      '',
      '> Auto-generated from module registry. Do not edit manually.',
      '',
      `Last updated: ${new Date().toISOString()}`,
      '',
      '## Module Responsibilities',
      '',
      '| Responsibility | Module | Status |',
      '|----------------|--------|--------|',
    ];

    for (const resp of MODULE_RESPONSIBILITIES) {
      const moduleName = this.responsibilityMap.get(resp);
      const module = moduleName ? this.modules.get(moduleName) : null;
      const status = module?.status || 'unassigned';
      lines.push(`| ${resp} | ${moduleName || '-'} | ${status} |`);
    }

    if (this.conflicts.length > 0) {
      lines.push('');
      lines.push('## ⚠️ Conflicts Detected');
      lines.push('');
      for (const conflict of this.conflicts) {
        lines.push(`- **${conflict.responsibility}**: Claimed by ${conflict.modules.join(', ')}`);
      }
    }

    lines.push('');
    lines.push('## Module Summary');
    lines.push('');

    for (const [name, module] of this.modules) {
      lines.push(`### ${name}`);
      lines.push('');
      lines.push(`- Version: ${module.version}`);
      lines.push(`- Status: ${module.status}`);
      if (module.responsibilities?.length) {
        lines.push(`- Responsibilities: ${module.responsibilities.join(', ')}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Save RESPONSIBILITIES.md to project root
   */
  async saveResponsibilitiesDoc(projectRoot: string = process.cwd()): Promise<void> {
    const content = this.generateResponsibilitiesDoc();
    const filePath = path.join(projectRoot, 'RESPONSIBILITIES.md');
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`[Registry] RESPONSIBILITIES.md updated at ${filePath}`);
  }

  /**
   * Get formatted status report
   */
  getStatusReport(): string {
    const lines: string[] = [
      '╔════════════════════════════════════════════════════════════════╗',
      '║               MODULE REGISTRY STATUS                           ║',
      '╚════════════════════════════════════════════════════════════════╝',
      '',
      `Total Modules: ${this.modules.size}`,
      `Responsibilities Assigned: ${this.responsibilityMap.size}/${MODULE_RESPONSIBILITIES.length}`,
      `Conflicts: ${this.conflicts.length}`,
      '',
    ];

    lines.push('📦 REGISTERED MODULES:');
    lines.push('─'.repeat(60));
    for (const [name, mod] of this.modules) {
      const respStr = mod.responsibilities?.length ? ` → ${mod.responsibilities.join(', ')}` : '';
      lines.push(`  ${name} (v${mod.version}) [${mod.status}]${respStr}`);
    }

    const unassigned = MODULE_RESPONSIBILITIES.filter((r) => !this.responsibilityMap.has(r));
    if (unassigned.length > 0) {
      lines.push('');
      lines.push('⚪ UNASSIGNED RESPONSIBILITIES:');
      lines.push('─'.repeat(60));
      for (const resp of unassigned) {
        lines.push(`  • ${resp}`);
      }
    }

    if (this.conflicts.length > 0) {
      lines.push('');
      lines.push('🔴 CONFLICTS:');
      lines.push('─'.repeat(60));
      for (const conflict of this.conflicts) {
        lines.push(`  ${conflict.responsibility}: ${conflict.modules.join(' vs ')}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Enable/disable strict mode
   */
  setStrictMode(enabled: boolean): void {
    this.strictMode = enabled;
    console.log(`[Registry] Strict mode: ${enabled ? 'ENABLED' : 'DISABLED'}`);
  }

  /**
   * Clear registry (for testing)
   */
  clear(): void {
    this.modules.clear();
    this.responsibilityMap.clear();
    this.conflicts = [];
  }
}

export const registry = new ModuleRegistry();
