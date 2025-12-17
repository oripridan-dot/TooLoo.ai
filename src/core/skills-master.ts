/**
 * @file TooLoo Genesis - The Skills Master (Hands)
 * @description Dynamic skill composition, execution, and creation
 * @version 1.0.0
 * @created 2025-12-16
 *
 * The Hands execute actions in the world. This includes:
 * - File operations (read, write, delete)
 * - Terminal commands (with safety checks)
 * - Skill composition and creation
 * - Tool orchestration
 *
 * Core Pursuits Applied:
 * - QUALITY: Validate all operations before and after
 * - PERFORMANCE: Accurate execution with error handling
 * - EFFICIENCY: Cache results, batch operations
 */

import { EventEmitter } from 'events';
import { readFileSync, writeFileSync, existsSync, unlinkSync, readdirSync, statSync } from 'fs';
import { join, dirname, basename, extname } from 'path';
import { execSync, spawn } from 'child_process';
import { mkdir } from 'fs/promises';
import YAML from 'yaml';

// =============================================================================
// TYPES
// =============================================================================

export interface SkillDefinition {
  id: string;
  name: string;
  version: string;
  description: string;
  keywords: string[];
  schema: Record<string, unknown>;
  instructions: string;
  tools: string[];
}

export interface ActionResult {
  success: boolean;
  output: string;
  duration: number;
  error?: string;
}

export interface FileOperation {
  type: 'read' | 'write' | 'delete' | 'list' | 'find';
  path: string;
  content?: string;
  pattern?: string;
}

export interface TerminalOperation {
  command: string;
  cwd?: string;
  timeout?: number;
  safe?: boolean;
}

export interface SkillsConfig {
  workspaceRoot: string;
  skillsDir: string;
  safePaths: string[];
  blockedCommands: string[];
  maxFileSize: number;
  terminalTimeout: number;
}

// =============================================================================
// THE SKILLS MASTER (HANDS)
// =============================================================================

export class SkillsMaster extends EventEmitter {
  private config: SkillsConfig;
  private registeredSkills: Map<string, SkillDefinition> = new Map();
  private operationCache: Map<string, ActionResult> = new Map();
  private metrics = {
    totalOperations: 0,
    fileReads: 0,
    fileWrites: 0,
    terminalCommands: 0,
    skillsCreated: 0,
    cacheHits: 0,
    errors: 0,
  };

  constructor(config?: Partial<SkillsConfig>) {
    super();
    this.config = {
      workspaceRoot: config?.workspaceRoot ?? process.cwd(),
      skillsDir: config?.skillsDir ?? join(process.cwd(), 'skills'),
      safePaths: config?.safePaths ?? [process.cwd(), '/tmp', '/workspaces'],
      blockedCommands: config?.blockedCommands ?? [
        'rm -rf /',
        'sudo rm',
        'mkfs',
        ':(){ :|:& };:',
        'dd if=/dev',
        '> /dev/sda',
        'chmod -R 777 /',
      ],
      maxFileSize: config?.maxFileSize ?? 10 * 1024 * 1024, // 10MB
      terminalTimeout: config?.terminalTimeout ?? 30000, // 30 seconds
    };
  }

  // ---------------------------------------------------------------------------
  // INITIALIZATION
  // ---------------------------------------------------------------------------

  /**
   * Initialize hands - load skills and prepare tools
   */
  async initialize(): Promise<void> {
    this.emit('hands:initializing');

    // Load existing skills
    await this.loadSkillsFromDirectory();

    this.emit('hands:ready', {
      skillCount: this.registeredSkills.size,
    });
    console.log(`[Hands] 🤲 Ready with ${this.registeredSkills.size} skills loaded`);
  }

  /**
   * Load all YAML skills from the skills directory
   */
  private async loadSkillsFromDirectory(): Promise<void> {
    try {
      if (!existsSync(this.config.skillsDir)) {
        console.log('[Hands] Skills directory not found, creating...');
        await mkdir(this.config.skillsDir, { recursive: true });
        return;
      }

      const files = readdirSync(this.config.skillsDir);
      for (const file of files) {
        if (file.endsWith('.yaml') || file.endsWith('.yml')) {
          try {
            const content = readFileSync(join(this.config.skillsDir, file), 'utf-8');
            const skill = YAML.parse(content) as SkillDefinition;
            if (skill.id) {
              this.registeredSkills.set(skill.id, skill);
            }
          } catch (error) {
            console.warn(`[Hands] Failed to load skill ${file}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('[Hands] Failed to load skills:', error);
    }
  }

  // ---------------------------------------------------------------------------
  // ACTION EXECUTION
  // ---------------------------------------------------------------------------

  /**
   * Execute an action based on the step description
   */
  async executeAction(action: string, description: string, brainOutput: string): Promise<string> {
    const startTime = Date.now();
    this.metrics.totalOperations++;
    this.emit('hands:action-start', { action, description });

    try {
      // Parse the action type
      const actionType = this.classifyAction(action, description, brainOutput);

      let result: ActionResult;

      switch (actionType) {
        case 'file-read':
          result = await this.executeFileRead(brainOutput);
          break;
        case 'file-write':
          result = await this.executeFileWrite(brainOutput);
          break;
        case 'file-delete':
          result = await this.executeFileDelete(brainOutput);
          break;
        case 'directory-list':
          result = await this.executeDirectoryList(brainOutput);
          break;
        case 'file-search':
          result = await this.executeFileSearch(brainOutput);
          break;
        case 'terminal':
          result = await this.executeTerminal(brainOutput);
          break;
        case 'skill-create':
          result = await this.executeSkillCreation(brainOutput);
          break;
        default:
          // Pure thinking/planning action - brain output is the result
          result = {
            success: true,
            output: brainOutput,
            duration: Date.now() - startTime,
          };
      }

      this.emit('hands:action-complete', { action, result });
      return result.output;
    } catch (error) {
      this.metrics.errors++;
      const errorMsg = `Action failed: ${(error as Error).message}`;
      this.emit('hands:action-error', { action, error });
      return errorMsg;
    }
  }

  /**
   * Classify what type of action this is
   */
  private classifyAction(action: string, description: string, brainOutput: string): string {
    const combined = `${action} ${description} ${brainOutput}`.toLowerCase();

    if (
      combined.includes('read file') ||
      combined.includes('readfile') ||
      combined.match(/read\s+[\w\/\.]+/)
    ) {
      return 'file-read';
    }
    if (
      combined.includes('write file') ||
      combined.includes('writefile') ||
      combined.includes('create file')
    ) {
      return 'file-write';
    }
    if (combined.includes('delete file') || combined.includes('remove file')) {
      return 'file-delete';
    }
    if (
      combined.includes('list director') ||
      combined.includes('ls ') ||
      combined.includes('dir ')
    ) {
      return 'directory-list';
    }
    if (
      combined.includes('search') ||
      combined.includes('find file') ||
      combined.includes('grep')
    ) {
      return 'file-search';
    }
    if (
      combined.includes('run command') ||
      combined.includes('execute') ||
      combined.includes('terminal')
    ) {
      return 'terminal';
    }
    if (combined.includes('create skill') || combined.includes('new skill')) {
      return 'skill-create';
    }

    return 'thinking'; // Default to pure thinking
  }

  // ---------------------------------------------------------------------------
  // FILE OPERATIONS
  // ---------------------------------------------------------------------------

  /**
   * Read a file
   */
  async executeFileRead(context: string): Promise<ActionResult> {
    const startTime = Date.now();
    this.metrics.fileReads++;

    // Extract file path from context
    const pathMatch =
      context.match(/(?:read|file|path)[:\s]*([\/\w\.-]+)/i) || context.match(/`([\/\w\.-]+)`/);

    if (!pathMatch || !pathMatch[1]) {
      return {
        success: false,
        output: 'Could not identify file path',
        duration: Date.now() - startTime,
      };
    }

    const filePath = this.resolvePath(pathMatch[1]);

    if (!this.isPathSafe(filePath)) {
      return {
        success: false,
        output: `Path not allowed: ${filePath}`,
        duration: Date.now() - startTime,
      };
    }

    try {
      if (!existsSync(filePath)) {
        return {
          success: false,
          output: `File not found: ${filePath}`,
          duration: Date.now() - startTime,
        };
      }

      const stats = statSync(filePath);
      if (stats.size > this.config.maxFileSize) {
        return {
          success: false,
          output: `File too large: ${stats.size} bytes`,
          duration: Date.now() - startTime,
        };
      }

      const content = readFileSync(filePath, 'utf-8');
      return { success: true, output: content, duration: Date.now() - startTime };
    } catch (error) {
      return {
        success: false,
        output: `Read failed: ${(error as Error).message}`,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Write a file
   */
  async executeFileWrite(context: string): Promise<ActionResult> {
    const startTime = Date.now();
    this.metrics.fileWrites++;

    // Extract file path and content from context
    // Look for patterns like: "write to /path/file.ts:\n```content```"
    const pathMatch = context.match(/(?:write|create|file|path)[:\s]*([\/\w\.-]+)/i);
    const contentMatch =
      context.match(/```[\w]*\n([\s\S]*?)```/) || context.match(/content[:\s]*([\s\S]+)/i);

    if (!pathMatch || !pathMatch[1]) {
      return {
        success: false,
        output: 'Could not identify file path',
        duration: Date.now() - startTime,
      };
    }

    if (!contentMatch || !contentMatch[1]) {
      return {
        success: false,
        output: 'Could not identify content to write',
        duration: Date.now() - startTime,
      };
    }

    const filePath = this.resolvePath(pathMatch[1]);
    const content = contentMatch[1];

    if (!this.isPathSafe(filePath)) {
      return {
        success: false,
        output: `Path not allowed: ${filePath}`,
        duration: Date.now() - startTime,
      };
    }

    try {
      // Create directory if needed
      const dir = dirname(filePath);
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
      }

      // Backup existing file if it exists
      if (existsSync(filePath)) {
        const backupPath = `${filePath}.backup.${Date.now()}`;
        writeFileSync(backupPath, readFileSync(filePath));
        this.emit('hands:file-backed-up', { original: filePath, backup: backupPath });
      }

      writeFileSync(filePath, content, 'utf-8');
      return {
        success: true,
        output: `Written ${content.length} bytes to ${filePath}`,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        output: `Write failed: ${(error as Error).message}`,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Delete a file
   */
  async executeFileDelete(context: string): Promise<ActionResult> {
    const startTime = Date.now();

    const pathMatch = context.match(/(?:delete|remove|file|path)[:\s]*([\/\w\.-]+)/i);

    if (!pathMatch || !pathMatch[1]) {
      return {
        success: false,
        output: 'Could not identify file path',
        duration: Date.now() - startTime,
      };
    }

    const filePath = this.resolvePath(pathMatch[1]);

    if (!this.isPathSafe(filePath)) {
      return {
        success: false,
        output: `Path not allowed: ${filePath}`,
        duration: Date.now() - startTime,
      };
    }

    try {
      if (!existsSync(filePath)) {
        return {
          success: false,
          output: `File not found: ${filePath}`,
          duration: Date.now() - startTime,
        };
      }

      // Backup before delete
      const backupPath = `${filePath}.deleted.${Date.now()}`;
      writeFileSync(backupPath, readFileSync(filePath));

      unlinkSync(filePath);
      return {
        success: true,
        output: `Deleted ${filePath} (backup: ${backupPath})`,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        output: `Delete failed: ${(error as Error).message}`,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * List directory contents
   */
  async executeDirectoryList(context: string): Promise<ActionResult> {
    const startTime = Date.now();

    const pathMatch = context.match(/(?:list|directory|dir|path)[:\s]*([\/\w\.-]+)/i);
    const dirPath = (pathMatch && pathMatch[1]) ? this.resolvePath(pathMatch[1]) : this.config.workspaceRoot;

    if (!this.isPathSafe(dirPath)) {
      return {
        success: false,
        output: `Path not allowed: ${dirPath}`,
        duration: Date.now() - startTime,
      };
    }

    try {
      if (!existsSync(dirPath)) {
        return {
          success: false,
          output: `Directory not found: ${dirPath}`,
          duration: Date.now() - startTime,
        };
      }

      const entries = readdirSync(dirPath);
      const detailed = entries.map((entry) => {
        const fullPath = join(dirPath, entry);
        try {
          const stats = statSync(fullPath);
          const type = stats.isDirectory() ? 'd' : 'f';
          const size = stats.isFile() ? ` (${stats.size} bytes)` : '';
          return `[${type}] ${entry}${size}`;
        } catch {
          return `[?] ${entry}`;
        }
      });

      return { success: true, output: detailed.join('\n'), duration: Date.now() - startTime };
    } catch (error) {
      return {
        success: false,
        output: `List failed: ${(error as Error).message}`,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Search for files
   */
  async executeFileSearch(context: string): Promise<ActionResult> {
    const startTime = Date.now();

    // Extract search pattern
    const patternMatch = context.match(/(?:search|find|grep|pattern)[:\s]*([^\n]+)/i);

    if (!patternMatch || !patternMatch[1]) {
      return {
        success: false,
        output: 'Could not identify search pattern',
        duration: Date.now() - startTime,
      };
    }

    const pattern = patternMatch[1].trim();

    try {
      // Use grep for content search, find for filename search
      const isContentSearch =
        context.toLowerCase().includes('grep') || context.includes('contains');

      let command: string;
      if (isContentSearch) {
        command = `grep -r "${pattern}" ${this.config.workspaceRoot} --include="*.ts" --include="*.js" --include="*.yaml" -l 2>/dev/null | head -20`;
      } else {
        command = `find ${this.config.workspaceRoot} -name "*${pattern}*" -type f 2>/dev/null | head -20`;
      }

      const output = execSync(command, {
        encoding: 'utf-8',
        timeout: this.config.terminalTimeout,
      });

      return {
        success: true,
        output: output || 'No matches found',
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        output: `Search failed: ${(error as Error).message}`,
        duration: Date.now() - startTime,
      };
    }
  }

  // ---------------------------------------------------------------------------
  // TERMINAL OPERATIONS
  // ---------------------------------------------------------------------------

  /**
   * Execute a terminal command
   */
  async executeTerminal(context: string): Promise<ActionResult> {
    const startTime = Date.now();
    this.metrics.terminalCommands++;

    // Extract command
    const commandMatch =
      context.match(/(?:run|execute|command)[:\s]*`?([^`\n]+)`?/i) ||
      context.match(/```(?:bash|sh)?\n([\s\S]*?)```/);

    if (!commandMatch || !commandMatch[1]) {
      return {
        success: false,
        output: 'Could not identify command',
        duration: Date.now() - startTime,
      };
    }

    const command = commandMatch[1].trim();

    // Safety check
    if (!this.isCommandSafe(command)) {
      return {
        success: false,
        output: `Command blocked for safety: ${command}`,
        duration: Date.now() - startTime,
      };
    }

    try {
      const output = execSync(command, {
        encoding: 'utf-8',
        timeout: this.config.terminalTimeout,
        cwd: this.config.workspaceRoot,
        maxBuffer: 5 * 1024 * 1024, // 5MB output limit
      });

      return { success: true, output: output, duration: Date.now() - startTime };
    } catch (error) {
      const err = error as any;
      return {
        success: false,
        output: err.stderr || err.message || 'Command failed',
        duration: Date.now() - startTime,
        error: err.message,
      };
    }
  }

  // ---------------------------------------------------------------------------
  // SKILL CREATION
  // ---------------------------------------------------------------------------

  /**
   * Create a new skill from YAML definition
   */
  async executeSkillCreation(context: string): Promise<ActionResult> {
    const startTime = Date.now();
    this.metrics.skillsCreated++;

    // Extract YAML from context
    const yamlMatch = context.match(/```yaml\n([\s\S]*?)```/);

    if (!yamlMatch || !yamlMatch[1]) {
      return {
        success: false,
        output: 'Could not find YAML skill definition',
        duration: Date.now() - startTime,
      };
    }

    try {
      const yamlContent = yamlMatch[1];
      const skill = YAML.parse(yamlContent) as SkillDefinition;

      if (!skill.id || !skill.name) {
        return {
          success: false,
          output: 'Skill must have id and name',
          duration: Date.now() - startTime,
        };
      }

      // Write skill file
      const skillPath = join(this.config.skillsDir, `${skill.id}.yaml`);
      writeFileSync(skillPath, yamlContent, 'utf-8');

      // Register skill
      this.registeredSkills.set(skill.id, skill);

      // Record in evolution journal
      await this.recordSkillCreation(skill);

      this.emit('hands:skill-created', skill);
      return {
        success: true,
        output: `Created skill: ${skill.id} (${skill.name})`,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        output: `Skill creation failed: ${(error as Error).message}`,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Record skill creation in evolution journal
   */
  private async recordSkillCreation(skill: SkillDefinition): Promise<void> {
    const evolutionPath = join(process.cwd(), 'soul', 'evolution.yaml');

    try {
      let evolution: any = { lessons: [], skills_created: [], growth_events: [] };

      if (existsSync(evolutionPath)) {
        evolution = YAML.parse(readFileSync(evolutionPath, 'utf-8'));
      }

      evolution.skills_created = evolution.skills_created || [];
      evolution.skills_created.push({
        id: skill.id,
        name: skill.name,
        description: skill.description,
        timestamp: new Date().toISOString(),
      });

      writeFileSync(evolutionPath, YAML.stringify(evolution), 'utf-8');
    } catch (error) {
      console.error('[Hands] Failed to record skill creation:', error);
    }
  }

  // ---------------------------------------------------------------------------
  // SAFETY CHECKS
  // ---------------------------------------------------------------------------

  /**
   * Check if a path is safe to access
   */
  private isPathSafe(path: string): boolean {
    const resolved = this.resolvePath(path);
    return this.config.safePaths.some((safe) => resolved.startsWith(safe));
  }

  /**
   * Check if a command is safe to execute
   */
  private isCommandSafe(command: string): boolean {
    const lowered = command.toLowerCase();

    // Check against blocked commands
    for (const blocked of this.config.blockedCommands) {
      if (lowered.includes(blocked.toLowerCase())) {
        return false;
      }
    }

    // Additional checks
    if (lowered.includes('rm -rf') && !lowered.includes('node_modules')) {
      return false;
    }

    return true;
  }

  /**
   * Resolve a path relative to workspace
   */
  private resolvePath(path: string): string {
    if (path.startsWith('/')) {
      return path;
    }
    return join(this.config.workspaceRoot, path);
  }

  // ---------------------------------------------------------------------------
  // PUBLIC API
  // ---------------------------------------------------------------------------

  getMetrics() {
    return { ...this.metrics };
  }

  getRegisteredSkills(): SkillDefinition[] {
    return Array.from(this.registeredSkills.values());
  }

  hasSkill(skillId: string): boolean {
    return this.registeredSkills.has(skillId);
  }

  getSkill(skillId: string): SkillDefinition | undefined {
    return this.registeredSkills.get(skillId);
  }

  /**
   * Direct file read (for other components)
   */
  readFile(path: string): string | null {
    const resolved = this.resolvePath(path);
    if (!this.isPathSafe(resolved) || !existsSync(resolved)) {
      return null;
    }
    return readFileSync(resolved, 'utf-8');
  }

  /**
   * Direct file write (for other components)
   */
  writeFile(path: string, content: string): boolean {
    const resolved = this.resolvePath(path);
    if (!this.isPathSafe(resolved)) {
      return false;
    }
    try {
      writeFileSync(resolved, content, 'utf-8');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * List directory (for other components)
   */
  listDirectory(path: string): string[] | null {
    const resolved = this.resolvePath(path);
    if (!this.isPathSafe(resolved) || !existsSync(resolved)) {
      return null;
    }
    return readdirSync(resolved);
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let skillsMaster: SkillsMaster | null = null;

export function getSkillsMaster(): SkillsMaster {
  if (!skillsMaster) {
    skillsMaster = new SkillsMaster();
  }
  return skillsMaster;
}

export default SkillsMaster;
