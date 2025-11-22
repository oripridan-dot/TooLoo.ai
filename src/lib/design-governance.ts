#!/usr/bin/env node

/**
 * Design System Governance Workflows
 * 
 * Features:
 * 1. Version Control - Track changes across versions
 * 2. Token Deprecation - Manage token lifecycle
 * 3. Change Approvals - Workflow-based change management
 * 4. Migration Paths - Automatic migration suggestions
 * 5. Breaking Change Tracking - Impact analysis
 */

export class DesignGovernance {
  constructor(systemId = 'default') {
    this.systemId = systemId;
    this.versions = [];
    this.deprecations = new Map();
    this.approvalWorkflows = [];
    this.changeLog = [];
    this.migrations = new Map();
  }

  /**
   * PHASE 1: VERSION CONTROL
   * Track design system versions and changes
   */

  /**
   * Create a new version checkpoint
   * @param {Object} system - Current system state
   * @param {Object} metadata - Version metadata
   * @returns {Object} Version record
   */
  createVersion(system, metadata = {}) {
    const version = {
      id: `v${this.versions.length + 1}`,
      timestamp: new Date().toISOString(),
      hash: this._calculateHash(system),
      system: JSON.parse(JSON.stringify(system)),
      metadata: {
        author: metadata.author || 'system',
        title: metadata.title || `Version ${this.versions.length + 1}`,
        description: metadata.description || '',
        tags: metadata.tags || []
      },
      changes: this._detectChanges(system),
      stats: this._calculateStats(system)
    };

    this.versions.push(version);
    return version;
  }

  /**
   * Get version history
   * @returns {Array} Version list
   */
  getVersionHistory() {
    return this.versions.map(v => ({
      id: v.id,
      timestamp: v.timestamp,
      title: v.metadata.title,
      author: v.metadata.author,
      changes: v.changes.summary,
      stats: v.stats
    }));
  }

  /**
   * Compare two versions
   * @param {string} versionA - First version ID
   * @param {string} versionB - Second version ID
   * @returns {Object} Detailed comparison
   */
  compareVersions(versionA, versionB) {
    const v1 = this.versions.find(v => v.id === versionA);
    const v2 = this.versions.find(v => v.id === versionB);

    if (!v1 || !v2) {
      return { error: 'Version not found' };
    }

    return {
      versionA: versionA,
      versionB: versionB,
      timeline: {
        a: v1.timestamp,
        b: v2.timestamp,
        daysBetween: this._daysBetween(v1.timestamp, v2.timestamp)
      },
      additions: this._findAdditions(v1.system, v2.system),
      removals: this._findRemovals(v1.system, v2.system),
      modifications: this._findModifications(v1.system, v2.system),
      breakingChanges: this._identifyBreakingChanges(v1.system, v2.system),
      statsDelta: this._calculateDelta(v1.stats, v2.stats)
    };
  }

  /**
   * Rollback to specific version
   * @param {string} versionId - Version to rollback to
   * @returns {Object} Rollback result
   */
  rollbackToVersion(versionId) {
    const version = this.versions.find(v => v.id === versionId);

    if (!version) {
      return { error: 'Version not found' };
    }

    return {
      success: true,
      rolledBack: versionId,
      timestamp: new Date().toISOString(),
      system: version.system,
      note: `Rolled back to ${version.metadata.title}`
    };
  }

  _detectChanges(system) {
    if (this.versions.length === 0) {
      return { summary: 'Initial version', detail: {} };
    }

    const prev = this.versions[this.versions.length - 1].system;
    const added = {};
    const modified = {};
    const removed = {};

    // Compare colors
    const prevColors = Object.keys(prev.colors || {});
    const currColors = Object.keys(system.colors || {});

    added.colors = currColors.filter(c => !prevColors.includes(c));
    removed.colors = prevColors.filter(c => !currColors.includes(c));
    modified.colors = currColors.filter(c => 
      prevColors.includes(c) && prev.colors[c] !== system.colors[c]
    );

    // Compare typography
    const prevTypo = prev.typography || [];
    const currTypo = system.typography || [];

    added.typography = currTypo.filter(t => !prevTypo.some(pt => pt.name === t.name));
    removed.typography = prevTypo.filter(t => !currTypo.some(ct => ct.name === t.name));
    modified.typography = currTypo.filter(t => 
      prevTypo.some(pt => pt.name === t.name && JSON.stringify(pt) !== JSON.stringify(t))
    );

    return {
      summary: this._summarizeChanges(added, modified, removed),
      detail: { added, modified, removed }
    };
  }

  _summarizeChanges(added, modified, removed) {
    const parts = [];

    if (Object.values(added).some(a => a.length > 0)) {
      parts.push(`+${Object.values(added).reduce((sum, a) => sum + a.length, 0)} added`);
    }

    if (Object.values(modified).some(m => m.length > 0)) {
      parts.push(`${Object.values(modified).reduce((sum, m) => sum + m.length, 0)} modified`);
    }

    if (Object.values(removed).some(r => r.length > 0)) {
      parts.push(`-${Object.values(removed).reduce((sum, r) => sum + r.length, 0)} removed`);
    }

    return parts.length > 0 ? parts.join(', ') : 'No changes';
  }

  _calculateStats(system) {
    return {
      colors: Object.keys(system.colors || {}).length,
      typography: (system.typography || []).length,
      spacing: Object.keys(system.spacing || {}).length,
      components: Object.keys(system.components || {}).length,
      total: (
        Object.keys(system.colors || {}).length +
        (system.typography || []).length +
        Object.keys(system.spacing || {}).length +
        Object.keys(system.components || {}).length
      )
    };
  }

  _calculateHash(system) {
    const str = JSON.stringify(system);
    let hash = 0;

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }

    return Math.abs(hash).toString(16);
  }

  _daysBetween(d1, d2) {
    const date1 = new Date(d1);
    const date2 = new Date(d2);
    const diffTime = Math.abs(date2 - date1);
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  _findAdditions(v1, v2) {
    const additions = {};

    // New colors
    const newColors = Object.keys(v2.colors || {}).filter(c => !Object.keys(v1.colors || {}).includes(c));
    if (newColors.length > 0) {
      additions.colors = newColors.map(c => ({ name: c, value: (v2.colors || {})[c] }));
    }

    // New components
    const newComps = Object.keys(v2.components || {}).filter(c => !Object.keys(v1.components || {}).includes(c));
    if (newComps.length > 0) {
      additions.components = newComps;
    }

    return additions;
  }

  _findRemovals(v1, v2) {
    const removals = {};

    const removedColors = Object.keys(v1.colors || {}).filter(c => !Object.keys(v2.colors || {}).includes(c));
    if (removedColors.length > 0) {
      removals.colors = removedColors.map(c => ({ name: c, value: (v1.colors || {})[c] }));
    }

    const removedComps = Object.keys(v1.components || {}).filter(c => !Object.keys(v2.components || {}).includes(c));
    if (removedComps.length > 0) {
      removals.components = removedComps;
    }

    return removals;
  }

  _findModifications(v1, v2) {
    const modifications = [];

    const colors1 = v1.colors || {};
    const colors2 = v2.colors || {};

    for (const color of Object.keys(colors1)) {
      if (color in colors2 && colors1[color] !== colors2[color]) {
        modifications.push({
          type: 'color',
          name: color,
          from: colors1[color],
          to: colors2[color]
        });
      }
    }

    return modifications;
  }

  _identifyBreakingChanges(v1, v2) {
    const breaking = [];

    // Removed colors that might be used
    const removedColors = Object.keys(v1.colors || {}).filter(c => !(c in (v2.colors || {})));
    if (removedColors.length > 0) {
      breaking.push({
        type: 'removed_colors',
        count: removedColors.length,
        items: removedColors,
        severity: 'high',
        description: 'Colors removed that may be referenced in code'
      });
    }

    // Removed components
    const removedComps = Object.keys(v1.components || {}).filter(c => !(c in (v2.components || {})));
    if (removedComps.length > 0) {
      breaking.push({
        type: 'removed_components',
        count: removedComps.length,
        items: removedComps,
        severity: 'critical',
        description: 'Components removed from design system'
      });
    }

    return breaking;
  }

  _calculateDelta(stats1, stats2) {
    return {
      colors: stats2.colors - stats1.colors,
      typography: stats2.typography - stats1.typography,
      spacing: stats2.spacing - stats1.spacing,
      components: stats2.components - stats1.components,
      total: stats2.total - stats1.total
    };
  }

  /**
   * PHASE 2: TOKEN DEPRECATION
   * Manage deprecated tokens and migration paths
   */

  /**
   * Mark token as deprecated
   * @param {Object} deprecation - Deprecation info
   * @returns {Object} Deprecation record
   */
  deprecateToken(deprecation) {
    const record = {
      id: `depr-${Date.now()}`,
      token: deprecation.token,
      reason: deprecation.reason,
      deprecatedAt: new Date().toISOString(),
      removalDate: deprecation.removalDate || null,
      replacement: deprecation.replacement || null,
      impact: deprecation.impact || 'low',
      status: 'active'
    };

    this.deprecations.set(deprecation.token, record);

    // Log change
    this.changeLog.push({
      type: 'deprecation',
      token: deprecation.token,
      timestamp: record.deprecatedAt
    });

    return record;
  }

  /**
   * Get deprecation status
   * @returns {Object} Deprecation report
   */
  getDeprecationStatus() {
    const active = Array.from(this.deprecations.values()).filter(d => d.status === 'active');
    const critical = active.filter(d => d.impact === 'critical');
    const upcoming = active.filter(d => d.removalDate && new Date(d.removalDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

    return {
      totalDeprecated: active.length,
      critical: critical.length,
      upcomingRemoval: upcoming.length,
      deprecations: active.map(d => ({
        token: d.token,
        reason: d.reason,
        replacement: d.replacement,
        removalDate: d.removalDate,
        daysUntilRemoval: d.removalDate ? this._daysBetween(new Date().toISOString(), d.removalDate) : null,
        impact: d.impact
      }))
    };
  }

  /**
   * Find tokens using deprecated ones
   * @param {Object} system - Design system
   * @returns {Object} Usage report
   */
  findDeprecatedTokenUsage(system) {
    const usage = {};

    for (const [token, record] of this.deprecations.entries()) {
      const references = this._findTokenReferences(system, token);

      if (references.length > 0) {
        usage[token] = {
          deprecated: record,
          locations: references,
          totalReferences: references.length,
          suggestedReplacement: record.replacement
        };
      }
    }

    return usage;
  }

  _findTokenReferences(system, tokenName) {
    const references = [];

    // Search in components
    for (const [compName, comp] of Object.entries(system.components || {})) {
      const compStr = JSON.stringify(comp);
      if (compStr.includes(tokenName)) {
        references.push({
          location: `components.${compName}`,
          type: 'component'
        });
      }
    }

    return references;
  }

  /**
   * PHASE 3: CHANGE APPROVALS
   * Workflow-based change management
   */

  /**
   * Create approval workflow for change
   * @param {Object} change - Change request
   * @returns {Object} Workflow record
   */
  createApprovalWorkflow(change) {
    const workflow = {
      id: `wf-${Date.now()}`,
      change: {
        type: change.type, // 'color_addition', 'component_rename', etc.
        title: change.title,
        description: change.description,
        from: change.from,
        to: change.to,
        priority: change.priority || 'normal'
      },
      status: 'pending', // pending, approved, rejected, implementing
      createdAt: new Date().toISOString(),
      approvals: [],
      rejections: [],
      requiredApprovals: change.requiredApprovals || 2,
      timeline: {
        createdAt: new Date().toISOString(),
        approvedAt: null,
        implementedAt: null
      },
      comments: []
    };

    this.approvalWorkflows.push(workflow);
    return workflow;
  }

  /**
   * Approve workflow
   * @param {string} workflowId - Workflow ID
   * @param {Object} approval - Approval details
   * @returns {Object} Updated workflow
   */
  approveWorkflow(workflowId, approval) {
    const workflow = this.approvalWorkflows.find(w => w.id === workflowId);

    if (!workflow) {
      return { error: 'Workflow not found' };
    }

    workflow.approvals.push({
      by: approval.by,
      timestamp: new Date().toISOString(),
      comment: approval.comment || ''
    });

    // Check if enough approvals
    if (workflow.approvals.length >= workflow.requiredApprovals) {
      workflow.status = 'approved';
      workflow.timeline.approvedAt = new Date().toISOString();
    }

    return workflow;
  }

  /**
   * Get approval status
   * @returns {Object} Approval report
   */
  getApprovalStatus() {
    const pending = this.approvalWorkflows.filter(w => w.status === 'pending');
    const approved = this.approvalWorkflows.filter(w => w.status === 'approved');
    const implementing = this.approvalWorkflows.filter(w => w.status === 'implementing');

    return {
      pending: pending.length,
      approved: approved.length,
      implementing: implementing.length,
      workflows: this.approvalWorkflows.map(w => ({
        id: w.id,
        change: w.change.title,
        status: w.status,
        approvals: `${w.approvals.length}/${w.requiredApprovals}`,
        createdAt: w.timeline.createdAt,
        priority: w.change.priority
      }))
    };
  }

  /**
   * PHASE 4: MIGRATION PATHS
   * Generate migration suggestions for breaking changes
   */

  /**
   * Generate migration path
   * @param {Object} breaking - Breaking change
   * @returns {Object} Migration guide
   */
  generateMigrationPath(breaking) {
    const migrations = [];

    for (const item of breaking.items || []) {
      const replacement = this._findBestReplacement(item);

      migrations.push({
        deprecated: item,
        replacement: replacement,
        codeExample: this._generateMigrationCode(item, replacement),
        effort: this._estimateMigrationEffort(item),
        priority: breaking.severity === 'critical' ? 'high' : 'normal'
      });
    }

    return {
      type: breaking.type,
      totalMigrations: migrations.length,
      migrations,
      estimatedDays: migrations.reduce((sum, m) => sum + m.effort, 0),
      summary: this._summarizeMigration(migrations)
    };
  }

  _findBestReplacement(token) {
    // Simple heuristic: find most similar token
    if (token.includes('primary')) return 'color-primary';
    if (token.includes('secondary')) return 'color-secondary';
    if (token.includes('error')) return 'color-error';
    return 'custom-replacement';
  }

  _generateMigrationCode(from, to) {
    return {
      before: `color: var(--${from});`,
      after: `color: var(--${to});`,
      searchRegex: `--${from}`,
      replaceWith: `--${to}`
    };
  }

  _estimateMigrationEffort(token) {
    // Rough estimate based on token name length
    return Math.max(0.5, Math.min(2, token.length / 20));
  }

  _summarizeMigration(migrations) {
    const efforts = migrations.map(m => m.effort);
    const avgEffort = efforts.reduce((a, b) => a + b, 0) / efforts.length;

    return `Estimated ${avgEffort.toFixed(1)} days for ${migrations.length} migrations`;
  }

  /**
   * PHASE 5: CHANGE LOG & ANALYTICS
   */

  /**
   * Get full change history
   * @returns {Array} Chronological change log
   */
  getChangeLog(options = {}) {
    let log = [...this.changeLog];

    // Filter by type
    if (options.type) {
      log = log.filter(l => l.type === options.type);
    }

    // Filter by date range
    if (options.since) {
      log = log.filter(l => new Date(l.timestamp) >= new Date(options.since));
    }

    return log.map(l => ({
      ...l,
      relativeTime: this._getRelativeTime(l.timestamp)
    }));
  }

  _getRelativeTime(timestamp) {
    const now = new Date();
    const then = new Date(timestamp);
    const diff = now - then;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  /**
   * Generate governance report
   * @returns {Object} Comprehensive governance report
   */
  generateGovernanceReport() {
    return {
      timestamp: new Date().toISOString(),
      versions: {
        total: this.versions.length,
        latest: this.versions[this.versions.length - 1]?.id
      },
      deprecations: this.getDeprecationStatus(),
      approvals: this.getApprovalStatus(),
      changeLog: {
        total: this.changeLog.length,
        byType: this._groupByType()
      },
      recommendations: this._generateGovernanceRecommendations()
    };
  }

  _groupByType() {
    const grouped = {};

    for (const log of this.changeLog) {
      grouped[log.type] = (grouped[log.type] || 0) + 1;
    }

    return grouped;
  }

  _generateGovernanceRecommendations() {
    const recs = [];

    if (this.deprecations.size > 5) {
      recs.push('Consider scheduling a version bump to remove old deprecations');
    }

    const pending = this.approvalWorkflows.filter(w => w.status === 'pending');
    if (pending.length > 3) {
      recs.push('Multiple pending approvals need attention');
    }

    return recs;
  }
}

export default DesignGovernance;
