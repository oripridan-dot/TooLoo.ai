/**
 * Self-Modification Service
 * Handles safe file writing, hot reload triggers, and audit logging
 * for TooLoo.ai self-evolution capabilities
 * 
 * @version 1.0.0
 * @skill-os true
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';

// =============================================================================
// TYPES
// =============================================================================

export interface ProposedChange {
  id: string;
  type: 'file' | 'skill' | 'component' | 'style' | 'config';
  action: 'create' | 'modify' | 'delete';
  path: string;
  description: string;
  before?: string;
  after: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  requiresRestart: boolean;
}

export interface ChangeResult {
  changeId: string;
  success: boolean;
  error?: string;
  backupPath?: string;
  appliedAt: Date;
}

export interface ModificationResult {
  sessionId: string;
  success: boolean;
  description: string;
  results: ChangeResult[];
  requiresRestart: boolean;
  appliedAt: string;
}

export interface AuditLogEntry {
  timestamp: string;
  sessionId: string;
  changeId: string;
  type: string;
  action: string;
  path: string;
  riskLevel: string;
  success: boolean;
  error?: string;
  backupPath?: string;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const WORKSPACE_ROOT = process.env['WORKSPACE_ROOT'] ?? '/workspaces/TooLoo.ai';
const BACKUP_DIR = path.join(WORKSPACE_ROOT, 'data', 'self-modification-backups');
const AUDIT_LOG_PATH = path.join(WORKSPACE_ROOT, 'data', 'self-modification-audit.jsonl');

// Protected paths that cannot be modified
const PROTECTED_PATHS = [
  'src/kernel/kernel.ts',
  'src/kernel/boot.ts',
  'src/kernel/registry.ts',
  'package.json',
  'pnpm-lock.yaml',
  '.env',
  '.git',
  'node_modules',
];

// Paths allowed for self-modification
const ALLOWED_PATHS = [
  'skills/',
  'apps/web/src/components/',
  'apps/web/src/styles/',
  'apps/api/src/routes/',
  'config/',
  'data/',
];

// =============================================================================
// SELF-MODIFICATION SERVICE
// =============================================================================

export class SelfModificationService extends EventEmitter {
  private pendingChanges: Map<string, Map<string, ProposedChange>> = new Map();
  
  constructor() {
    super();
    this.ensureDirectories();
  }
  
  /**
   * Ensure backup and audit directories exist
   */
  private async ensureDirectories(): Promise<void> {
    try {
      await fs.mkdir(BACKUP_DIR, { recursive: true });
      await fs.mkdir(path.dirname(AUDIT_LOG_PATH), { recursive: true });
    } catch (err) {
      console.error('[SelfMod] Failed to create directories:', err);
    }
  }
  
  /**
   * Store proposed changes for a session
   */
  proposeChanges(sessionId: string, changes: ProposedChange[]): void {
    const sessionChanges = new Map<string, ProposedChange>();
    for (const change of changes) {
      sessionChanges.set(change.id, change);
    }
    this.pendingChanges.set(sessionId, sessionChanges);
    console.log(`[SelfMod] Stored ${changes.length} proposed changes for session ${sessionId}`);
  }
  
  /**
   * Get pending changes for a session
   */
  getPendingChanges(sessionId: string): ProposedChange[] {
    const changes = this.pendingChanges.get(sessionId);
    return changes ? Array.from(changes.values()) : [];
  }
  
  /**
   * Apply approved changes
   */
  async applyChanges(
    sessionId: string,
    approvedChangeIds: string[]
  ): Promise<ModificationResult> {
    const allChanges = this.pendingChanges.get(sessionId);
    if (!allChanges) {
      return {
        sessionId,
        success: false,
        description: 'No pending changes found for session',
        results: [],
        requiresRestart: false,
        appliedAt: new Date().toISOString(),
      };
    }
    
    const results: ChangeResult[] = [];
    let hasFailure = false;
    let requiresRestart = false;
    
    for (const changeId of approvedChangeIds) {
      const change = allChanges.get(changeId);
      if (!change) {
        results.push({
          changeId,
          success: false,
          error: 'Change not found',
          appliedAt: new Date(),
        });
        continue;
      }
      
      const result = await this.applyChange(sessionId, change);
      results.push(result);
      
      if (!result.success) {
        hasFailure = true;
      }
      
      if (change.requiresRestart) {
        requiresRestart = true;
      }
    }
    
    // Clear pending changes for this session
    this.pendingChanges.delete(sessionId);
    
    const successCount = results.filter(r => r.success).length;
    
    return {
      sessionId,
      success: !hasFailure,
      description: `Applied ${successCount}/${approvedChangeIds.length} changes`,
      results,
      requiresRestart,
      appliedAt: new Date().toISOString(),
    };
  }
  
  /**
   * Apply a single change with safety checks
   */
  private async applyChange(
    sessionId: string,
    change: ProposedChange
  ): Promise<ChangeResult> {
    const changeResult: ChangeResult = {
      changeId: change.id,
      success: false,
      appliedAt: new Date(),
    };
    
    try {
      // Validate path is allowed
      if (!this.isPathAllowed(change.path)) {
        throw new Error(`Path not allowed for modification: ${change.path}`);
      }
      
      // Check risk level
      if (change.riskLevel === 'critical') {
        throw new Error('Critical risk changes require manual intervention');
      }
      
      const fullPath = path.join(WORKSPACE_ROOT, change.path);
      
      // Create backup if file exists
      if (change.action !== 'create') {
        try {
          const exists = await fs.access(fullPath).then(() => true).catch(() => false);
          if (exists) {
            changeResult.backupPath = await this.createBackup(fullPath, change.id);
          }
        } catch (err) {
          // File doesn't exist, no backup needed
        }
      }
      
      // Apply the change
      switch (change.action) {
        case 'create':
        case 'modify':
          await this.writeFile(fullPath, change.after);
          break;
          
        case 'delete':
          await this.deleteFile(fullPath);
          break;
      }
      
      changeResult.success = true;
      
      // Log to audit
      await this.logAudit({
        timestamp: new Date().toISOString(),
        sessionId,
        changeId: change.id,
        type: change.type,
        action: change.action,
        path: change.path,
        riskLevel: change.riskLevel,
        success: true,
        backupPath: changeResult.backupPath,
      });
      
      // Emit event for hot reload
      this.emit('change:applied', {
        change,
        result: changeResult,
      });
      
      console.log(`[SelfMod] ✅ Applied change: ${change.id} (${change.action} ${change.path})`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      changeResult.error = errorMessage;
      
      // Log failure to audit
      await this.logAudit({
        timestamp: new Date().toISOString(),
        sessionId,
        changeId: change.id,
        type: change.type,
        action: change.action,
        path: change.path,
        riskLevel: change.riskLevel,
        success: false,
        error: errorMessage,
      });
      
      console.error(`[SelfMod] ❌ Failed to apply change: ${change.id} - ${errorMessage}`);
    }
    
    return changeResult;
  }
  
  /**
   * Check if a path is allowed for modification
   */
  private isPathAllowed(filePath: string): boolean {
    // Check if path is protected
    for (const protected_ of PROTECTED_PATHS) {
      if (filePath.includes(protected_)) {
        return false;
      }
    }
    
    // Check if path is in allowed directories
    for (const allowed of ALLOWED_PATHS) {
      if (filePath.startsWith(allowed)) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Write file with directory creation
   */
  private async writeFile(filePath: string, content: string): Promise<void> {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
  }
  
  /**
   * Delete file safely
   */
  private async deleteFile(filePath: string): Promise<void> {
    await fs.unlink(filePath);
  }
  
  /**
   * Create backup of a file
   */
  private async createBackup(filePath: string, changeId: string): Promise<string> {
    const timestamp = Date.now();
    const filename = path.basename(filePath);
    const backupName = `${timestamp}_${changeId}_${filename}`;
    const backupPath = path.join(BACKUP_DIR, backupName);
    
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    await fs.copyFile(filePath, backupPath);
    
    return backupPath;
  }
  
  /**
   * Restore a file from backup
   */
  async restoreFromBackup(backupPath: string, originalPath: string): Promise<boolean> {
    try {
      await fs.copyFile(backupPath, originalPath);
      console.log(`[SelfMod] Restored ${originalPath} from backup`);
      return true;
    } catch (error) {
      console.error(`[SelfMod] Failed to restore from backup:`, error);
      return false;
    }
  }
  
  /**
   * Log to audit file
   */
  private async logAudit(entry: AuditLogEntry): Promise<void> {
    try {
      const line = JSON.stringify(entry) + '\n';
      await fs.appendFile(AUDIT_LOG_PATH, line, 'utf-8');
    } catch (error) {
      console.error('[SelfMod] Failed to write audit log:', error);
    }
  }
  
  /**
   * Get recent audit entries
   */
  async getAuditLog(limit = 50): Promise<AuditLogEntry[]> {
    try {
      const content = await fs.readFile(AUDIT_LOG_PATH, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);
      const entries = lines.map(line => JSON.parse(line) as AuditLogEntry);
      return entries.slice(-limit);
    } catch (error) {
      return [];
    }
  }
  
  /**
   * Clear pending changes for a session (on reject)
   */
  rejectChanges(sessionId: string, reason: string): void {
    this.pendingChanges.delete(sessionId);
    console.log(`[SelfMod] Changes rejected for session ${sessionId}: ${reason}`);
  }
}

// =============================================================================
// HOT RELOAD TRIGGER
// =============================================================================

export interface HotReloadEvent {
  type: 'skill' | 'component' | 'style' | 'config';
  path: string;
  timestamp: number;
}

/**
 * Determine what type of hot reload is needed for a change
 */
export function getHotReloadType(change: ProposedChange): HotReloadEvent['type'] | null {
  if (change.path.startsWith('skills/')) {
    return 'skill';
  }
  if (change.path.includes('/components/')) {
    return 'component';
  }
  if (change.path.includes('/styles/') || change.path.endsWith('.css')) {
    return 'style';
  }
  if (change.path.startsWith('config/')) {
    return 'config';
  }
  return null;
}

// =============================================================================
// SINGLETON
// =============================================================================

let instance: SelfModificationService | null = null;

export function getSelfModificationService(): SelfModificationService {
  if (!instance) {
    instance = new SelfModificationService();
  }
  return instance;
}

export default SelfModificationService;
