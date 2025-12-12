/**
 * @tooloo/skills - Skill Loader
 * Load skills from YAML and Markdown files
 * 
 * @version 2.0.0-alpha.0
 */

import { readFileSync, readdirSync, statSync, existsSync, watchFile, unwatchFile } from 'fs';
import { join, extname, basename } from 'path';
import { parse as parseYaml } from 'yaml';
import { createSkillId } from '@tooloo/core';
import type { SkillDefinition } from './types.js';
import { SkillDefinitionSchema } from './types.js';
import { skillRegistry } from './registry.js';

// =============================================================================
// SKILL LOADER
// =============================================================================

/**
 * Options for the skill loader
 */
export interface SkillLoaderOptions {
  /** Watch for file changes */
  watch?: boolean;
  
  /** File extensions to load */
  extensions?: string[];
  
  /** Recursive directory scanning */
  recursive?: boolean;
}

const DEFAULT_OPTIONS: Required<SkillLoaderOptions> = {
  watch: false,
  extensions: ['.yaml', '.yml', '.md'],
  recursive: true,
};

/**
 * SkillLoader - Load skills from files
 * 
 * Supports:
 * - YAML files (.yaml, .yml)
 * - Markdown files with YAML frontmatter (.md)
 * - Hot-reload via file watching
 */
export class SkillLoader {
  private options: Required<SkillLoaderOptions>;
  private loadedFiles: Map<string, string> = new Map();  // path -> skillId
  private watchers: Map<string, boolean> = new Map();

  constructor(options: SkillLoaderOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Load all skills from a directory
   */
  loadDirectory(directory: string): number {
    if (!existsSync(directory)) {
      console.warn(`Skills directory does not exist: ${directory}`);
      return 0;
    }

    let loaded = 0;
    const files = this.scanDirectory(directory);

    for (const file of files) {
      try {
        const skill = this.loadFile(file);
        if (skill) {
          skillRegistry.register(skill, file);
          this.loadedFiles.set(file, skill.id);
          loaded++;

          if (this.options.watch) {
            this.watchFile(file);
          }
        }
      } catch (err) {
        console.error(`Failed to load skill from ${file}:`, err);
      }
    }

    console.log(`Loaded ${loaded} skills from ${directory}`);
    return loaded;
  }

  /**
   * Load a single skill file
   */
  loadFile(filePath: string): SkillDefinition | null {
    const ext = extname(filePath).toLowerCase();
    const content = readFileSync(filePath, 'utf-8');

    let definition: unknown;

    if (ext === '.yaml' || ext === '.yml') {
      definition = this.parseYaml(content, filePath);
    } else if (ext === '.md') {
      definition = this.parseMarkdown(content, filePath);
    } else {
      console.warn(`Unsupported file extension: ${ext}`);
      return null;
    }

    if (!definition) {
      return null;
    }

    // Validate and return
    const result = SkillDefinitionSchema.safeParse(definition);
    if (!result.success) {
      console.error(`Invalid skill definition in ${filePath}:`, result.error.issues);
      return null;
    }

    return result.data as SkillDefinition;
  }

  /**
   * Parse YAML content
   */
  private parseYaml(content: string, filePath: string): unknown {
    try {
      const parsed = parseYaml(content);
      
      // Generate ID from filename if not provided
      if (!parsed.id) {
        parsed.id = this.generateIdFromPath(filePath);
      }

      return parsed;
    } catch (err) {
      console.error(`Failed to parse YAML in ${filePath}:`, err);
      return null;
    }
  }

  /**
   * Parse Markdown with YAML frontmatter
   * 
   * Format:
   * ```
   * ---
   * name: My Skill
   * version: 1.0.0
   * # ... other YAML fields
   * ---
   * 
   * # Instructions
   * 
   * The rest of the file is treated as `instructions`
   * ```
   */
  private parseMarkdown(content: string, filePath: string): unknown {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    
    if (!frontmatterMatch) {
      console.warn(`No YAML frontmatter found in ${filePath}`);
      return null;
    }

    const [, yamlContent, markdownContent] = frontmatterMatch;
    
    try {
      const parsed = parseYaml(yamlContent ?? '');
      
      // Use markdown content as instructions
      parsed.instructions = (markdownContent ?? '').trim();
      
      // Generate ID from filename if not provided
      if (!parsed.id) {
        parsed.id = this.generateIdFromPath(filePath);
      }

      return parsed;
    } catch (err) {
      console.error(`Failed to parse frontmatter in ${filePath}:`, err);
      return null;
    }
  }

  /**
   * Generate skill ID from file path
   */
  private generateIdFromPath(filePath: string): string {
    const name = basename(filePath, extname(filePath));
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }

  /**
   * Scan directory for skill files
   */
  private scanDirectory(directory: string): string[] {
    const files: string[] = [];
    const entries = readdirSync(directory);

    for (const entry of entries) {
      const fullPath = join(directory, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory() && this.options.recursive) {
        files.push(...this.scanDirectory(fullPath));
      } else if (stat.isFile()) {
        const ext = extname(entry).toLowerCase();
        if (this.options.extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }

    return files;
  }

  /**
   * Watch a file for changes
   */
  private watchFile(filePath: string): void {
    if (this.watchers.has(filePath)) {
      return;
    }

    watchFile(filePath, { interval: 1000 }, () => {
      console.log(`Skill file changed: ${filePath}`);
      this.reloadFile(filePath);
    });

    this.watchers.set(filePath, true);
  }

  /**
   * Reload a skill file
   */
  private reloadFile(filePath: string): void {
    // Unregister old skill
    const oldSkillId = this.loadedFiles.get(filePath);
    if (oldSkillId) {
      skillRegistry.unregister(oldSkillId, 'reload');
    }

    // Load new skill
    try {
      const skill = this.loadFile(filePath);
      if (skill) {
        skillRegistry.register(skill, filePath);
        this.loadedFiles.set(filePath, skill.id);
        console.log(`Reloaded skill: ${skill.name}`);
      }
    } catch (err) {
      console.error(`Failed to reload skill from ${filePath}:`, err);
    }
  }

  /**
   * Stop watching all files
   */
  stopWatching(): void {
    for (const filePath of this.watchers.keys()) {
      unwatchFile(filePath);
    }
    this.watchers.clear();
  }

  /**
   * Get loaded files
   */
  getLoadedFiles(): string[] {
    return Array.from(this.loadedFiles.keys());
  }
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Load skills from the default skills directory
 */
export function loadSkillsFromDirectory(
  directory: string,
  options: SkillLoaderOptions = {}
): number {
  const loader = new SkillLoader(options);
  return loader.loadDirectory(directory);
}

/**
 * Create a skill definition programmatically
 */
export function defineSkill(
  partial: Partial<SkillDefinition> & Pick<SkillDefinition, 'name' | 'instructions'>
): SkillDefinition {
  const id = createSkillId(partial.id ?? partial.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
  
  const definition: SkillDefinition = {
    id,
    name: partial.name,
    version: partial.version ?? '1.0.0',
    description: partial.description ?? partial.name,
    instructions: partial.instructions,
    tools: partial.tools ?? [],
    triggers: partial.triggers ?? {
      intents: ['unknown'],
      keywords: [],
    },
    context: partial.context ?? {
      maxTokens: 32000,
      ragSources: ['memory'],
      memoryScope: 'session',
    },
    composability: partial.composability ?? {
      requires: [],
      enhances: [],
      conflicts: [],
    },
    modelRequirements: partial.modelRequirements,
    metadata: partial.metadata,
  };

  return definition;
}
