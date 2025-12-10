// @version 3.3.460
/**
 * RepoAutoOrg - Automated Repository Organization
 * 
 * This system provides intelligent git workflow automation:
 * - Scope detection: Analyzes changes to determine type (feature/fix/chore/refactor)
 * - Semantic branching: Creates branches based on change scope
 * - Auto-commits: Groups and commits related changes with meaningful messages
 * - PR creation: Optionally creates pull requests when milestones are reached
 * 
 * @module cortex/automation/repo-auto-org
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs-extra';
import { bus } from '../../core/event-bus.js';

const execAsync = promisify(exec);

// ============================================================================
// TYPES
// ============================================================================

interface ChangeScope {
  type: 'feature' | 'fix' | 'chore' | 'refactor' | 'docs' | 'test' | 'style';
  domain: string; // e.g., 'cortex', 'nexus', 'qa', 'web-app'
  summary: string;
  files: string[];
  impact: 'major' | 'minor' | 'patch';
}

interface CommitPlan {
  scope: ChangeScope;
  message: string;
  files: string[];
  branchName?: string;
  createPR?: boolean;
}

interface RepoAutoOrgConfig {
  enabled: boolean;
  autoCommit: boolean;
  autoBranch: boolean;
  autoPR: boolean;
  minChangesForPR: number;
  scopeDetectionEnabled: boolean;
  workspaceRoot: string;
}

interface RepoStats {
  totalCommits: number;
  totalBranches: number;
  totalPRs: number;
  changesByScope: Record<string, number>;
  lastCommitAt?: string;
}

// ============================================================================
// SCOPE DETECTION RULES
// ============================================================================

const SCOPE_RULES: Array<{
  pattern: RegExp;
  type: ChangeScope['type'];
  domain: string;
}> = [
  // Feature patterns
  { pattern: /src\/web-app\/.*\.jsx?$/, type: 'feature', domain: 'web-app' },
  { pattern: /src\/cortex\/.*\.ts$/, type: 'feature', domain: 'cortex' },
  { pattern: /src\/precog\/.*\.ts$/, type: 'feature', domain: 'precog' },
  { pattern: /src\/nexus\/routes\/.*\.ts$/, type: 'feature', domain: 'nexus' },
  
  // Fix patterns
  { pattern: /src\/qa\/.*\.ts$/, type: 'fix', domain: 'qa' },
  { pattern: /\.test\.(ts|tsx|js|jsx)$/, type: 'test', domain: 'test' },
  
  // Chore patterns
  { pattern: /package\.json$/, type: 'chore', domain: 'deps' },
  { pattern: /tsconfig\.json$/, type: 'chore', domain: 'config' },
  { pattern: /\.github\/.*/, type: 'chore', domain: 'ci' },
  { pattern: /scripts\/.*/, type: 'chore', domain: 'scripts' },
  
  // Docs patterns
  { pattern: /docs\/.*\.md$/, type: 'docs', domain: 'docs' },
  { pattern: /README\.md$/, type: 'docs', domain: 'docs' },
  
  // Style patterns
  { pattern: /\.css$/, type: 'style', domain: 'styles' },
  { pattern: /tailwind\.config/, type: 'style', domain: 'styles' },
  
  // Refactor patterns
  { pattern: /src\/core\/.*\.ts$/, type: 'refactor', domain: 'core' },
  { pattern: /src\/shared\/.*\.ts$/, type: 'refactor', domain: 'shared' },
];

// ============================================================================
// REPO AUTO-ORG CLASS
// ============================================================================

export class RepoAutoOrg {
  private config: RepoAutoOrgConfig;
  private stats: RepoStats;
  private pendingChanges: Map<string, { path: string; timestamp: number }> = new Map();
  private commitTimer: NodeJS.Timeout | null = null;
  private readonly COMMIT_DELAY_MS = 10000; // 10 seconds of quiet before committing

  constructor(config: Partial<RepoAutoOrgConfig> = {}) {
    this.config = {
      enabled: true,
      autoCommit: true,
      autoBranch: true,
      autoPR: false, // Off by default - PRs need human review
      minChangesForPR: 5,
      scopeDetectionEnabled: true,
      workspaceRoot: process.cwd(),
      ...config,
    };

    this.stats = {
      totalCommits: 0,
      totalBranches: 0,
      totalPRs: 0,
      changesByScope: {},
    };

    this.setupEventListeners();
    console.log('[RepoAutoOrg] Initialized with scope detection');
  }

  // ============================================================================
  // EVENT HANDLING
  // ============================================================================

  private setupEventListeners(): void {
    // Listen to file changes from sensory cortex
    bus.on('sensory:file:change', (event: any) => {
      if (!this.config.enabled) return;
      
      const filePath = event.payload?.path;
      if (filePath && this.shouldTrackFile(filePath)) {
        this.trackChange(filePath);
      }
    });

    // Listen to file additions
    bus.on('sensory:file:add', (event: any) => {
      if (!this.config.enabled) return;
      
      const filePath = event.payload?.path;
      if (filePath && this.shouldTrackFile(filePath)) {
        this.trackChange(filePath);
      }
    });

    // Listen for manual commit requests
    bus.on('repo:commit:request', async (event: any) => {
      const { message, files } = event.payload || {};
      await this.commitNow(message, files);
    });

    // Listen for branch creation requests
    bus.on('repo:branch:request', async (event: any) => {
      const { name, base } = event.payload || {};
      await this.createBranch(name, base);
    });
  }

  private shouldTrackFile(filePath: string): boolean {
    // Ignore node_modules, .git, data directories
    if (filePath.includes('node_modules/')) return false;
    if (filePath.includes('.git/')) return false;
    if (filePath.includes('data/')) return false;
    if (filePath.includes('dist/')) return false;
    if (filePath.includes('coverage/')) return false;
    
    // Track source files
    return /\.(ts|tsx|js|jsx|css|html|md|json)$/.test(filePath);
  }

  private trackChange(filePath: string): void {
    this.pendingChanges.set(filePath, {
      path: filePath,
      timestamp: Date.now(),
    });

    // Reset commit timer
    if (this.commitTimer) {
      clearTimeout(this.commitTimer);
    }

    if (this.config.autoCommit) {
      this.commitTimer = setTimeout(() => {
        this.processChanges();
      }, this.COMMIT_DELAY_MS);
    }
  }

  // ============================================================================
  // SCOPE DETECTION
  // ============================================================================

  detectScope(files: string[]): ChangeScope {
    const scopeCounts: Record<string, number> = {};
    const domainCounts: Record<string, number> = {};
    const allTypes: ChangeScope['type'][] = [];
    const allDomains: string[] = [];

    for (const file of files) {
      for (const rule of SCOPE_RULES) {
        if (rule.pattern.test(file)) {
          scopeCounts[rule.type] = (scopeCounts[rule.type] || 0) + 1;
          domainCounts[rule.domain] = (domainCounts[rule.domain] || 0) + 1;
          allTypes.push(rule.type);
          allDomains.push(rule.domain);
          break;
        }
      }
    }

    // Determine dominant type and domain
    const dominantType = Object.entries(scopeCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] as ChangeScope['type'] || 'chore';
    
    const dominantDomain = Object.entries(domainCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'misc';

    // Determine impact
    let impact: ChangeScope['impact'] = 'patch';
    if (dominantType === 'feature' && files.length >= 3) {
      impact = 'minor';
    } else if (files.some(f => f.includes('api') || f.includes('schema'))) {
      impact = 'minor';
    }

    // Generate summary
    const summary = this.generateSummary(dominantType, dominantDomain, files);

    return {
      type: dominantType,
      domain: dominantDomain,
      summary,
      files,
      impact,
    };
  }

  private generateSummary(type: ChangeScope['type'], domain: string, files: string[]): string {
    const fileCount = files.length;
    const fileList = files.slice(0, 3).map(f => path.basename(f)).join(', ');
    const suffix = fileCount > 3 ? ` +${fileCount - 3} more` : '';

    switch (type) {
      case 'feature':
        return `Add ${domain} functionality (${fileList}${suffix})`;
      case 'fix':
        return `Fix ${domain} issues (${fileList}${suffix})`;
      case 'refactor':
        return `Refactor ${domain} (${fileList}${suffix})`;
      case 'docs':
        return `Update documentation (${fileList}${suffix})`;
      case 'test':
        return `Add/update tests (${fileList}${suffix})`;
      case 'style':
        return `Style updates (${fileList}${suffix})`;
      case 'chore':
      default:
        return `Maintenance: ${domain} (${fileList}${suffix})`;
    }
  }

  // ============================================================================
  // GIT OPERATIONS
  // ============================================================================

  private async processChanges(): Promise<void> {
    if (this.pendingChanges.size === 0) return;

    const files = Array.from(this.pendingChanges.values()).map(c => c.path);
    this.pendingChanges.clear();

    const scope = this.config.scopeDetectionEnabled 
      ? this.detectScope(files) 
      : {
          type: 'chore' as const,
          domain: 'misc',
          summary: `Update ${files.length} files`,
          files,
          impact: 'patch' as const,
        };

    const commitMessage = `${scope.type}(${scope.domain}): ${scope.summary}`;
    
    await this.commitChanges(commitMessage, files);

    // Update stats
    this.stats.totalCommits++;
    this.stats.changesByScope[scope.type] = (this.stats.changesByScope[scope.type] || 0) + 1;
    this.stats.lastCommitAt = new Date().toISOString();

    // Emit event
    bus.publish('system', 'repo:commit:complete', {
      scope,
      message: commitMessage,
      files,
      timestamp: Date.now(),
    });

    // Check if PR should be created
    if (this.config.autoPR && this.stats.totalCommits % this.config.minChangesForPR === 0) {
      await this.createPullRequest(scope);
    }
  }

  private async commitChanges(message: string, files: string[]): Promise<boolean> {
    try {
      // Stage files
      for (const file of files) {
        try {
          await execAsync(`git add "${file}"`, { cwd: this.config.workspaceRoot });
        } catch {
          // File might be ignored or deleted
        }
      }

      // Commit with disabled GPG signing
      const escapedMessage = message.replace(/"/g, '\\"');
      await execAsync(
        `git -c commit.gpgsign=false commit -m "${escapedMessage}" --allow-empty`,
        { cwd: this.config.workspaceRoot }
      );

      console.log(`[RepoAutoOrg] ✓ Committed: ${message}`);
      return true;
    } catch (error: any) {
      if (error.message?.includes('nothing to commit')) {
        console.log('[RepoAutoOrg] Nothing to commit');
        return false;
      }
      console.error('[RepoAutoOrg] Commit failed:', error.message);
      return false;
    }
  }

  async createBranch(name: string, base: string = 'main'): Promise<boolean> {
    try {
      // Sanitize branch name
      const safeName = name
        .toLowerCase()
        .replace(/[^a-z0-9-/]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      await execAsync(`git checkout -b ${safeName}`, { cwd: this.config.workspaceRoot });
      
      this.stats.totalBranches++;
      console.log(`[RepoAutoOrg] ✓ Created branch: ${safeName}`);

      bus.publish('system', 'repo:branch:created', {
        name: safeName,
        base,
        timestamp: Date.now(),
      });

      return true;
    } catch (error: any) {
      // Branch might already exist
      if (error.message?.includes('already exists')) {
        await execAsync(`git checkout ${name}`, { cwd: this.config.workspaceRoot });
        return true;
      }
      console.error('[RepoAutoOrg] Branch creation failed:', error.message);
      return false;
    }
  }

  private async createPullRequest(scope: ChangeScope): Promise<boolean> {
    try {
      const { stdout: currentBranch } = await execAsync(
        'git rev-parse --abbrev-ref HEAD',
        { cwd: this.config.workspaceRoot }
      );

      const branch = currentBranch.trim();
      if (branch === 'main' || branch === 'master') {
        console.log('[RepoAutoOrg] Skipping PR creation - on main branch');
        return false;
      }

      // Push branch first
      await execAsync(`git push -u origin ${branch}`, { cwd: this.config.workspaceRoot });

      // Create PR using gh CLI
      const title = `[${scope.type.toUpperCase()}] ${scope.summary}`;
      const body = this.generatePRBody(scope);

      const { stdout } = await execAsync(
        `gh pr create --title "${title}" --body "${body}" --base main`,
        { cwd: this.config.workspaceRoot }
      );

      this.stats.totalPRs++;
      console.log(`[RepoAutoOrg] ✓ Created PR: ${stdout.trim()}`);

      bus.publish('system', 'repo:pr:created', {
        url: stdout.trim(),
        scope,
        timestamp: Date.now(),
      });

      return true;
    } catch (error: any) {
      console.error('[RepoAutoOrg] PR creation failed:', error.message);
      return false;
    }
  }

  private generatePRBody(scope: ChangeScope): string {
    return `## Summary
${scope.summary}

## Type
- **Scope**: \`${scope.type}\`
- **Domain**: \`${scope.domain}\`
- **Impact**: \`${scope.impact}\`

## Files Changed
${scope.files.map(f => `- \`${f}\``).join('\n')}

---
*Auto-generated by TooLoo RepoAutoOrg*`;
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  async commitNow(message?: string, files?: string[]): Promise<boolean> {
    const filesToCommit = files || Array.from(this.pendingChanges.values()).map(c => c.path);
    
    if (filesToCommit.length === 0) {
      // Get all unstaged changes
      const { stdout } = await execAsync('git diff --name-only', { cwd: this.config.workspaceRoot });
      const unstaged = stdout.trim().split('\n').filter(Boolean);
      if (unstaged.length > 0) {
        filesToCommit.push(...unstaged);
      }
    }

    if (filesToCommit.length === 0) {
      console.log('[RepoAutoOrg] No changes to commit');
      return false;
    }

    const scope = this.detectScope(filesToCommit);
    const commitMessage = message || `${scope.type}(${scope.domain}): ${scope.summary}`;

    this.pendingChanges.clear();
    return this.commitChanges(commitMessage, filesToCommit);
  }

  async createFeatureBranch(name: string): Promise<boolean> {
    const branchName = `feature/${name}`;
    return this.createBranch(branchName);
  }

  async createFixBranch(name: string): Promise<boolean> {
    const branchName = `fix/${name}`;
    return this.createBranch(branchName);
  }

  getStats(): RepoStats {
    return { ...this.stats };
  }

  getPendingChanges(): string[] {
    return Array.from(this.pendingChanges.values()).map(c => c.path);
  }

  setConfig(config: Partial<RepoAutoOrgConfig>): void {
    this.config = { ...this.config, ...config };
  }

  enable(): void {
    this.config.enabled = true;
    console.log('[RepoAutoOrg] Enabled');
  }

  disable(): void {
    this.config.enabled = false;
    if (this.commitTimer) {
      clearTimeout(this.commitTimer);
    }
    console.log('[RepoAutoOrg] Disabled');
  }

  /**
   * Generate an organization plan from a feature description
   * Analyzes the description and suggests branch names, file structure, and git commands
   */
  generateOrganizationPlan(description: string): {
    featureName: string;
    branchName: string;
    suggestedStructure: { path: string; type: 'file' | 'directory'; purpose: string }[];
    commands: {
      createBranch: string;
      stageFiles: string;
      commit: string;
    };
    scope: ChangeScope;
  } {
    // Extract feature name from description
    const cleanDesc = description.toLowerCase().trim();
    const words = cleanDesc.split(/\s+/).filter(w => w.length > 2);
    
    // Detect scope type from keywords
    let type: ChangeScope['type'] = 'feature';
    let domain = 'general';
    
    if (/fix|bug|error|issue|broken/.test(cleanDesc)) {
      type = 'fix';
    } else if (/refactor|clean|improve|optimize/.test(cleanDesc)) {
      type = 'refactor';
    } else if (/test|spec|coverage/.test(cleanDesc)) {
      type = 'test';
    } else if (/doc|readme|comment/.test(cleanDesc)) {
      type = 'docs';
    } else if (/style|css|ui|design/.test(cleanDesc)) {
      type = 'style';
    }
    
    // Detect domain from keywords
    if (/api|route|endpoint|server/.test(cleanDesc)) {
      domain = 'nexus';
    } else if (/brain|ai|model|llm|agent/.test(cleanDesc)) {
      domain = 'cortex';
    } else if (/ui|frontend|react|component/.test(cleanDesc)) {
      domain = 'web-app';
    } else if (/test|qa|quality/.test(cleanDesc)) {
      domain = 'qa';
    } else if (/predict|routing|provider/.test(cleanDesc)) {
      domain = 'precog';
    }
    
    // Generate feature name (kebab-case)
    const keyWords = words
      .filter(w => !/^(the|a|an|is|are|to|for|with|and|or|in|on|at|by)$/.test(w))
      .slice(0, 4);
    const featureName = keyWords.join('-').replace(/[^a-z0-9-]/g, '');
    
    // Generate branch name
    const branchName = `${type}/${featureName}`;
    
    // Generate suggested file structure based on domain
    const suggestedStructure = this.generateSuggestedStructure(domain, featureName, type);
    
    // Generate git commands
    const commands = {
      createBranch: `git checkout -b ${branchName}`,
      stageFiles: `git add ${suggestedStructure.map(f => f.path).join(' ')}`,
      commit: `git commit -m "${type}(${domain}): ${description.slice(0, 50)}"`,
    };
    
    return {
      featureName,
      branchName,
      suggestedStructure,
      commands,
      scope: {
        type,
        domain,
        summary: description.slice(0, 100),
        files: suggestedStructure.filter(f => f.type === 'file').map(f => f.path),
        impact: type === 'feature' ? 'minor' : 'patch',
      },
    };
  }

  private generateSuggestedStructure(
    domain: string, 
    featureName: string, 
    type: ChangeScope['type']
  ): { path: string; type: 'file' | 'directory'; purpose: string }[] {
    const structure: { path: string; type: 'file' | 'directory'; purpose: string }[] = [];
    
    switch (domain) {
      case 'nexus':
        structure.push(
          { path: `src/nexus/routes/${featureName}.ts`, type: 'file', purpose: 'API route handlers' },
          { path: `tests/unit/nexus/${featureName}.test.ts`, type: 'file', purpose: 'Unit tests' }
        );
        break;
      case 'cortex':
        structure.push(
          { path: `src/cortex/${featureName}/`, type: 'directory', purpose: 'Feature module' },
          { path: `src/cortex/${featureName}/index.ts`, type: 'file', purpose: 'Main module entry' },
          { path: `tests/unit/cortex/${featureName}.test.ts`, type: 'file', purpose: 'Unit tests' }
        );
        break;
      case 'web-app':
        structure.push(
          { path: `src/web-app/src/components/${featureName}/`, type: 'directory', purpose: 'Component folder' },
          { path: `src/web-app/src/components/${featureName}/${featureName}.tsx`, type: 'file', purpose: 'React component' },
          { path: `src/web-app/src/components/${featureName}/${featureName}.stories.tsx`, type: 'file', purpose: 'Storybook stories' }
        );
        break;
      case 'qa':
        structure.push(
          { path: `src/qa/${featureName}.ts`, type: 'file', purpose: 'QA module' },
          { path: `tests/unit/qa/${featureName}.test.ts`, type: 'file', purpose: 'Unit tests' }
        );
        break;
      case 'precog':
        structure.push(
          { path: `src/precog/${featureName}.ts`, type: 'file', purpose: 'Prediction module' },
          { path: `tests/unit/precog/${featureName}.test.ts`, type: 'file', purpose: 'Unit tests' }
        );
        break;
      default:
        structure.push(
          { path: `src/${domain}/${featureName}.ts`, type: 'file', purpose: 'Feature implementation' },
          { path: `tests/unit/${featureName}.test.ts`, type: 'file', purpose: 'Unit tests' }
        );
    }
    
    // Add docs for features
    if (type === 'feature') {
      structure.push(
        { path: `docs/${featureName}.md`, type: 'file', purpose: 'Feature documentation' }
      );
    }
    
    return structure;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const repoAutoOrg = new RepoAutoOrg();
