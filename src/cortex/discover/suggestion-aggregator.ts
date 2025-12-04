// @version 2.2.653
/**
 * SuggestionAggregator
 * Aggregates emergence, learning, and exploration signals into actionable suggestions.
 * Enables symbiotic improvement by surfacing findings with implementation guidance
 * and optional GitHub integration for versioning discoveries.
 *
 * Key capabilities:
 * - Listens to emergence:detected, learning:significant_signal, exploration:experiment_completed
 * - Transforms discoveries into structured ActionableSuggestion objects
 * - Provides GitHub action templates (create issue, branch, PR, commit)
 * - Tracks suggestion lifecycle: pending → reviewed → executed/dismissed
 */

import { bus } from '../../core/event-bus.js';
import fs from 'fs-extra';
import path from 'path';

// ============================================================================
// TYPES
// ============================================================================

export interface ActionableSuggestion {
  id: string;
  /** Short, descriptive title */
  title: string;
  /** One-paragraph conclusion/summary */
  conclusion: string;
  /** Source system that generated this suggestion */
  source: 'emergence' | 'learning' | 'exploration' | 'curiosity' | 'serendipity';
  /** Severity/importance level */
  priority: 'low' | 'medium' | 'high' | 'critical';
  /** Detailed bullet points (expandable in UI) */
  details: SuggestionDetail[];
  /** Actionable next steps */
  suggestions: SuggestionAction[];
  /** GitHub integration actions */
  githubActions: GitHubAction[];
  /** Metadata */
  createdAt: Date;
  expiresAt?: Date;
  status: 'pending' | 'reviewed' | 'executed' | 'dismissed' | 'expired';
  /** Original event data */
  sourceEvent: Record<string, unknown>;
  /** Tags for filtering */
  tags: string[];
}

export interface SuggestionDetail {
  label: string;
  value: string;
  type: 'metric' | 'finding' | 'warning' | 'insight' | 'evidence';
}

export interface SuggestionAction {
  id: string;
  label: string;
  description: string;
  type: 'manual' | 'automated' | 'exploration' | 'config_change';
  /** Command or action to execute */
  action?: string;
  /** Estimated impact */
  impact: 'low' | 'medium' | 'high';
}

export interface GitHubAction {
  type: 'create_issue' | 'create_branch' | 'create_pr' | 'commit_file';
  label: string;
  /** Pre-filled data for the action */
  data: {
    title?: string;
    body?: string;
    branchName?: string;
    labels?: string[];
    filePath?: string;
    content?: string;
    commitMessage?: string;
  };
}

export interface SuggestionAggregatorConfig {
  maxPendingSuggestions: number;
  suggestionTTLMs: number;
  autoPersist: boolean;
  autoCreateGitHubIssues: boolean; // Auto-create issues for high-priority emergences
  priorityThresholds: {
    emergence: number; // Strength threshold for priority escalation
    learning: number; // Reward threshold
    exploration: number; // Confidence threshold
  };
}

// ============================================================================
// SUGGESTION AGGREGATOR
// ============================================================================

export class SuggestionAggregator {
  private static instance: SuggestionAggregator;

  private suggestions: Map<string, ActionableSuggestion> = new Map();
  private config: SuggestionAggregatorConfig;
  private dataDir: string;
  private stateFile: string;

  private readonly MAX_SUGGESTIONS = 100;

  private constructor() {
    this.dataDir = path.join(process.cwd(), 'data', 'suggestions');
    this.stateFile = path.join(this.dataDir, 'suggestions.json');

    this.config = {
      maxPendingSuggestions: 50,
      suggestionTTLMs: 24 * 60 * 60 * 1000, // 24 hours
      autoPersist: true,
      autoCreateGitHubIssues: true, // Enable auto-issue creation for high-impact emergences
      priorityThresholds: {
        emergence: 0.7,
        learning: 0.8,
        exploration: 0.75,
      },
    };

    this.setupListeners();
  }

  static getInstance(): SuggestionAggregator {
    if (!SuggestionAggregator.instance) {
      SuggestionAggregator.instance = new SuggestionAggregator();
    }
    return SuggestionAggregator.instance;
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  async initialize(): Promise<void> {
    console.log('[SuggestionAggregator] Initializing...');
    await fs.ensureDir(this.dataDir);
    await this.loadState();
    this.cleanupExpired();

    bus.publish('cortex', 'suggestions:aggregator_initialized', {
      pendingCount: this.getPendingSuggestions().length,
      timestamp: new Date().toISOString(),
    });

    console.log('[SuggestionAggregator] Ready - Listening for discoveries');
  }

  // ============================================================================
  // EVENT LISTENERS - Symbiotic Integration
  // ============================================================================

  private setupListeners(): void {
    // Listen for emergence detections
    bus.on('emergence:detected', (event) => {
      this.processEmergenceEvent(event.payload);
    });

    // Listen for significant learning signals
    bus.on('learning:significant_signal', (event) => {
      this.processLearningEvent(event.payload);
    });

    // Listen for exploration completions
    bus.on('exploration:experiment_completed', (event) => {
      this.processExplorationEvent(event.payload);
    });

    // Listen for coordinator emergence responses
    bus.on('coordinator:emergence_response_complete', (event) => {
      this.processCoordinatorEvent(event.payload);
    });

    // Listen for curiosity signals above threshold
    bus.on('curiosity:emergence_precursor_detected', (event) => {
      this.processCuriosityEvent(event.payload);
    });

    // Listen for serendipity discoveries
    bus.on('serendipity:discovery_made', (event) => {
      this.processSerendipityEvent(event.payload);
    });
  }

  // ============================================================================
  // EVENT PROCESSORS
  // ============================================================================

  private processEmergenceEvent(payload: Record<string, unknown>): void {
    const {
      eventId,
      type,
      strength,
      confidence,
      impact,
      domain,
      description,
      signalCount,
      safetyTier,
    } = payload as {
      eventId: string;
      type: string;
      strength: number;
      confidence: number;
      impact: string;
      domain: string;
      description: string;
      signalCount: number;
      safetyTier?: string;
    };

    // Determine priority based on strength and impact
    const priority = this.calculatePriority(strength, impact as string);

    const suggestion: ActionableSuggestion = {
      id: `suggestion-emergence-${eventId || Date.now()}`,
      title: `🌟 Emergence: ${this.capitalizeFirst(type)} Detected`,
      conclusion:
        description ||
        `An emergent ${type} pattern has been detected in the ${domain} domain with ${(confidence * 100).toFixed(0)}% confidence. This represents ${impact} impact potential.`,
      source: 'emergence',
      priority,
      details: [
        { label: 'Emergence Type', value: type, type: 'finding' },
        { label: 'Strength', value: `${(strength * 100).toFixed(0)}%`, type: 'metric' },
        { label: 'Confidence', value: `${(confidence * 100).toFixed(0)}%`, type: 'metric' },
        { label: 'Impact Level', value: impact, type: 'insight' },
        { label: 'Domain', value: domain, type: 'finding' },
        { label: 'Signal Count', value: String(signalCount || 'N/A'), type: 'metric' },
        ...(safetyTier
          ? [{ label: 'Safety Tier', value: safetyTier, type: 'warning' as const }]
          : []),
      ],
      suggestions: [
        {
          id: 'explore-further',
          label: 'Explore Further',
          description: `Create a hypothesis to explore this ${type} pattern in depth`,
          type: 'exploration',
          impact: 'medium',
        },
        {
          id: 'document-finding',
          label: 'Document Finding',
          description: 'Add this discovery to the knowledge base for future reference',
          type: 'manual',
          impact: 'low',
        },
        ...(impact === 'high' || impact === 'transformative'
          ? [
              {
                id: 'boost-learning',
                label: 'Boost Learning Rate',
                description: 'Temporarily increase learning rate to capitalize on this emergence',
                type: 'automated' as const,
                action: 'learning:boost_requested',
                impact: 'high' as const,
              },
            ]
          : []),
      ],
      githubActions: this.generateGitHubActions('emergence', {
        type,
        domain,
        description,
        strength,
        confidence,
        impact,
      }),
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.config.suggestionTTLMs),
      status: 'pending',
      sourceEvent: payload,
      tags: ['emergence', type, domain, impact],
    };

    this.addSuggestion(suggestion);
  }

  private processLearningEvent(payload: Record<string, unknown>): void {
    const { value, context, source } = payload as {
      value: number;
      context: Record<string, unknown>;
      source: string;
    };

    if (value < this.config.priorityThresholds.learning) return;

    const priority = value >= 0.9 ? 'high' : 'medium';

    const suggestion: ActionableSuggestion = {
      id: `suggestion-learning-${Date.now()}`,
      title: `📚 Significant Learning Signal`,
      conclusion: `A significant learning signal (${(value * 100).toFixed(0)}%) was recorded from ${source}. This indicates a successful strategy that should be reinforced.`,
      source: 'learning',
      priority,
      details: [
        { label: 'Signal Strength', value: `${(value * 100).toFixed(0)}%`, type: 'metric' },
        { label: 'Source', value: source || 'unknown', type: 'finding' },
        ...(context
          ? Object.entries(context).map(([key, val]) => ({
              label: this.capitalizeFirst(key),
              value: String(val),
              type: 'insight' as const,
            }))
          : []),
      ],
      suggestions: [
        {
          id: 'reinforce-strategy',
          label: 'Reinforce Strategy',
          description: 'Increase weight of this successful approach in future decisions',
          type: 'automated',
          impact: 'medium',
        },
        {
          id: 'create-pattern',
          label: 'Create Pattern',
          description: 'Extract and save this as a reusable pattern',
          type: 'manual',
          impact: 'high',
        },
      ],
      githubActions: this.generateGitHubActions('learning', {
        value,
        source,
        context,
      }),
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.config.suggestionTTLMs),
      status: 'pending',
      sourceEvent: payload,
      tags: ['learning', 'strategy', source || 'unknown'],
    };

    this.addSuggestion(suggestion);
  }

  private processExplorationEvent(payload: Record<string, unknown>): void {
    const {
      hypothesisId,
      type,
      targetArea,
      success,
      shouldIntegrate,
      findings,
      confidence,
      status,
    } = payload as {
      hypothesisId: string;
      type: string;
      targetArea: string;
      success: boolean;
      shouldIntegrate: boolean;
      findings: string[];
      confidence: number;
      status: string;
    };

    // Only create suggestions for validated explorations
    if (status !== 'validated' && !shouldIntegrate) return;

    const priority = confidence >= 0.8 ? 'high' : 'medium';

    const suggestion: ActionableSuggestion = {
      id: `suggestion-exploration-${hypothesisId}`,
      title: `🔬 Exploration Validated: ${this.capitalizeFirst(type.replace(/_/g, ' '))}`,
      conclusion: `Exploration hypothesis in "${targetArea}" has been ${success ? 'validated' : 'completed'}. ${shouldIntegrate ? 'Findings are recommended for integration.' : 'Review recommended before integration.'}`,
      source: 'exploration',
      priority,
      details: [
        { label: 'Experiment Type', value: type, type: 'finding' },
        { label: 'Target Area', value: targetArea, type: 'finding' },
        { label: 'Success', value: success ? 'Yes' : 'No', type: success ? 'insight' : 'warning' },
        { label: 'Confidence', value: `${(confidence * 100).toFixed(0)}%`, type: 'metric' },
        {
          label: 'Integrate',
          value: shouldIntegrate ? 'Recommended' : 'Review needed',
          type: shouldIntegrate ? 'insight' : 'warning',
        },
        ...(findings || []).map((f, i) => ({
          label: `Finding ${i + 1}`,
          value: f,
          type: 'evidence' as const,
        })),
      ],
      suggestions: [
        ...(shouldIntegrate
          ? [
              {
                id: 'integrate-findings',
                label: 'Integrate Findings',
                description: 'Apply these findings to the system',
                type: 'automated' as const,
                impact: 'high' as const,
              },
            ]
          : []),
        {
          id: 'repeat-experiment',
          label: 'Repeat Experiment',
          description: 'Run the exploration again for confirmation',
          type: 'exploration',
          impact: 'medium',
        },
        {
          id: 'expand-exploration',
          label: 'Expand Exploration',
          description: 'Create related hypotheses to explore adjacent areas',
          type: 'exploration',
          impact: 'medium',
        },
      ],
      githubActions: this.generateGitHubActions('exploration', {
        type,
        targetArea,
        findings,
        confidence,
      }),
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.config.suggestionTTLMs),
      status: 'pending',
      sourceEvent: payload,
      tags: ['exploration', type, targetArea, success ? 'success' : 'review'],
    };

    this.addSuggestion(suggestion);
  }

  private processCoordinatorEvent(payload: Record<string, unknown>): void {
    const { responseId, responseLevel, outcome } = payload as {
      responseId: string;
      responseLevel: string;
      outcome: {
        success: boolean;
        learningGain: number;
        newHypotheses: number;
        artifactsCreated: number;
        knowledgeIntegrated: boolean;
      };
    };

    if (!outcome.success || outcome.learningGain < 0.3) return;

    const suggestion: ActionableSuggestion = {
      id: `suggestion-coordinator-${responseId}`,
      title: `🎯 Emergence Response Complete`,
      conclusion: `Emergence response at level "${responseLevel}" completed successfully with ${(outcome.learningGain * 100).toFixed(0)}% learning gain. ${outcome.newHypotheses} new hypotheses generated, ${outcome.artifactsCreated} artifacts created.`,
      source: 'emergence',
      priority: outcome.learningGain >= 0.7 ? 'high' : 'medium',
      details: [
        { label: 'Response Level', value: responseLevel, type: 'finding' },
        {
          label: 'Learning Gain',
          value: `${(outcome.learningGain * 100).toFixed(0)}%`,
          type: 'metric',
        },
        { label: 'New Hypotheses', value: String(outcome.newHypotheses), type: 'metric' },
        { label: 'Artifacts Created', value: String(outcome.artifactsCreated), type: 'metric' },
        {
          label: 'Knowledge Integrated',
          value: outcome.knowledgeIntegrated ? 'Yes' : 'No',
          type: 'insight',
        },
      ],
      suggestions: [
        {
          id: 'explore-hypotheses',
          label: 'Explore New Hypotheses',
          description: `Run the ${outcome.newHypotheses} newly generated hypotheses`,
          type: 'exploration',
          impact: 'medium',
        },
        {
          id: 'review-artifacts',
          label: 'Review Artifacts',
          description: 'Review and approve/reject created artifacts',
          type: 'manual',
          impact: 'medium',
        },
      ],
      githubActions: this.generateGitHubActions('coordinator', {
        responseLevel,
        outcome,
      }),
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.config.suggestionTTLMs),
      status: 'pending',
      sourceEvent: payload,
      tags: ['emergence', 'coordinator', responseLevel],
    };

    this.addSuggestion(suggestion);
  }

  private processCuriosityEvent(payload: Record<string, unknown>): void {
    const { clusterStrength, emergenceType, signalCount } = payload as {
      clusterStrength: number;
      emergenceType: string;
      signalCount: number;
    };

    if (clusterStrength < 0.6) return;

    const suggestion: ActionableSuggestion = {
      id: `suggestion-curiosity-${Date.now()}`,
      title: `🧠 Curiosity: ${this.capitalizeFirst(emergenceType)} Precursor`,
      conclusion: `Curiosity engine detected an emergence precursor of type "${emergenceType}" with ${signalCount} converging signals at ${(clusterStrength * 100).toFixed(0)}% cluster strength. This may indicate an upcoming breakthrough.`,
      source: 'curiosity',
      priority: clusterStrength >= 0.8 ? 'high' : 'medium',
      details: [
        { label: 'Emergence Type', value: emergenceType, type: 'finding' },
        {
          label: 'Cluster Strength',
          value: `${(clusterStrength * 100).toFixed(0)}%`,
          type: 'metric',
        },
        { label: 'Signal Count', value: String(signalCount), type: 'metric' },
      ],
      suggestions: [
        {
          id: 'focus-attention',
          label: 'Focus Attention',
          description: 'Increase monitoring and exploration in this area',
          type: 'automated',
          impact: 'medium',
        },
        {
          id: 'create-hypothesis',
          label: 'Create Hypothesis',
          description: 'Design an experiment to validate this precursor',
          type: 'exploration',
          impact: 'high',
        },
      ],
      githubActions: [],
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.config.suggestionTTLMs / 2), // Shorter TTL for precursors
      status: 'pending',
      sourceEvent: payload,
      tags: ['curiosity', 'precursor', emergenceType],
    };

    this.addSuggestion(suggestion);
  }

  private processSerendipityEvent(payload: Record<string, unknown>): void {
    const { discovery, impactScore, domain } = payload as {
      discovery: string;
      impactScore: number;
      domain: string;
    };

    const suggestion: ActionableSuggestion = {
      id: `suggestion-serendipity-${Date.now()}`,
      title: `✨ Serendipitous Discovery`,
      conclusion: discovery || 'An unexpected discovery was made through controlled randomness.',
      source: 'serendipity',
      priority: impactScore >= 0.7 ? 'high' : 'medium',
      details: [
        { label: 'Domain', value: domain || 'general', type: 'finding' },
        {
          label: 'Impact Score',
          value: `${((impactScore || 0.5) * 100).toFixed(0)}%`,
          type: 'metric',
        },
      ],
      suggestions: [
        {
          id: 'investigate',
          label: 'Investigate',
          description: 'Create a structured exploration to understand this discovery',
          type: 'exploration',
          impact: 'medium',
        },
      ],
      githubActions: this.generateGitHubActions('serendipity', {
        discovery,
        domain,
        impactScore,
      }),
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.config.suggestionTTLMs),
      status: 'pending',
      sourceEvent: payload,
      tags: ['serendipity', 'discovery', domain || 'general'],
    };

    this.addSuggestion(suggestion);
  }

  // ============================================================================
  // GITHUB ACTION GENERATORS
  // ============================================================================

  private generateGitHubActions(source: string, data: Record<string, unknown>): GitHubAction[] {
    const actions: GitHubAction[] = [];
    const timestamp = new Date().toISOString().split('T')[0];

    // Create Issue action
    actions.push({
      type: 'create_issue',
      label: '📝 Create GitHub Issue',
      data: {
        title: `[${source.toUpperCase()}] ${this.generateIssueTitle(source, data)}`,
        body: this.generateIssueBody(source, data),
        labels: ['tooloo-discovery', source, 'automated'],
      },
    });

    // Create Branch action (for significant discoveries)
    if (data['confidence'] && (data['confidence'] as number) >= 0.7) {
      const branchName = `discovery/${source}/${timestamp}-${this.slugify(String(data['type'] || data['domain'] || 'finding'))}`;
      actions.push({
        type: 'create_branch',
        label: '🌿 Create Discovery Branch',
        data: {
          branchName,
          commitMessage: `feat(${source}): document discovery - ${this.generateIssueTitle(source, data)}`,
        },
      });
    }

    // Commit Documentation action
    actions.push({
      type: 'commit_file',
      label: '📄 Commit Discovery Log',
      data: {
        filePath: `docs/discoveries/${timestamp}-${source}-${Date.now()}.md`,
        content: this.generateDiscoveryDoc(source, data),
        commitMessage: `docs: log ${source} discovery`,
      },
    });

    return actions;
  }

  private generateIssueTitle(source: string, data: Record<string, unknown>): string {
    switch (source) {
      case 'emergence':
        return `${data['type']} emergence in ${data['domain']} (${((data['strength'] as number) * 100).toFixed(0)}% strength)`;
      case 'learning':
        return `Significant learning signal (${((data['value'] as number) * 100).toFixed(0)}%)`;
      case 'exploration':
        return `Validated ${data['type']} experiment in ${data['targetArea']}`;
      case 'serendipity':
        return `Serendipitous discovery in ${data['domain']}`;
      default:
        return `Discovery from ${source}`;
    }
  }

  private generateIssueBody(source: string, data: Record<string, unknown>): string {
    const lines = [
      `## 🔬 Discovery Report`,
      ``,
      `**Source:** ${source}`,
      `**Timestamp:** ${new Date().toISOString()}`,
      ``,
      `### Details`,
      ``,
    ];

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && value !== null) {
        const formattedValue =
          typeof value === 'number' ? (value * 100).toFixed(1) + '%' : String(value);
        lines.push(`- **${this.capitalizeFirst(key)}:** ${formattedValue}`);
      }
    }

    lines.push(
      ``,
      `---`,
      `*This issue was automatically created by TooLoo.ai's SuggestionAggregator*`
    );

    return lines.join('\n');
  }

  private generateDiscoveryDoc(source: string, data: Record<string, unknown>): string {
    return `# Discovery: ${this.generateIssueTitle(source, data)}

## Overview

- **Source System:** ${source}
- **Discovered At:** ${new Date().toISOString()}
- **Auto-generated:** Yes

## Data

\`\`\`json
${JSON.stringify(data, null, 2)}
\`\`\`

## Impact Assessment

${
  data['impact'] || data['confidence']
    ? `
- **Impact Level:** ${data['impact'] || 'Unknown'}
- **Confidence:** ${data['confidence'] ? ((data['confidence'] as number) * 100).toFixed(0) + '%' : 'N/A'}
`
    : 'No impact assessment available.'
}

## Next Steps

1. Review this discovery
2. Decide on integration
3. Document learnings

---

*Generated by TooLoo.ai SuggestionAggregator*
`;
  }

  // ============================================================================
  // SUGGESTION MANAGEMENT
  // ============================================================================

  private addSuggestion(suggestion: ActionableSuggestion): void {
    // Prevent duplicates (within 5 minute window)
    const recentDuplicate = Array.from(this.suggestions.values()).find(
      (s) =>
        s.source === suggestion.source &&
        s.title === suggestion.title &&
        Date.now() - s.createdAt.getTime() < 5 * 60 * 1000
    );

    if (recentDuplicate) {
      console.log(`[SuggestionAggregator] Skipping duplicate suggestion: ${suggestion.title}`);
      return;
    }

    this.suggestions.set(suggestion.id, suggestion);

    // Trim if over limit
    if (this.suggestions.size > this.MAX_SUGGESTIONS) {
      const oldest = Array.from(this.suggestions.entries()).sort(
        (a, b) => a[1].createdAt.getTime() - b[1].createdAt.getTime()
      )[0];
      if (oldest) {
        this.suggestions.delete(oldest[0]);
      }
    }

    // Publish event
    bus.publish('cortex', 'suggestion:created', {
      id: suggestion.id,
      title: suggestion.title,
      source: suggestion.source,
      priority: suggestion.priority,
      timestamp: new Date().toISOString(),
    });

    console.log(
      `[SuggestionAggregator] New suggestion: ${suggestion.title} (${suggestion.priority})`
    );

    // Auto-create GitHub issue for critical/high priority emergence suggestions
    if (
      this.config.autoCreateGitHubIssues &&
      suggestion.source === 'emergence' &&
      (suggestion.priority === 'critical' || suggestion.priority === 'high')
    ) {
      this.autoCreateGitHubIssue(suggestion).catch((err) => {
        console.error('[SuggestionAggregator] Failed to auto-create GitHub issue:', err);
      });
    }

    // Auto-persist
    if (this.config.autoPersist) {
      this.saveState().catch(console.error);
    }
  }

  /**
   * Automatically create a GitHub issue for high-impact suggestions
   */
  private async autoCreateGitHubIssue(suggestion: ActionableSuggestion): Promise<void> {
    const createIssueAction = suggestion.githubActions.find((a) => a.type === 'create_issue');
    if (!createIssueAction) return;

    const { title, body, labels } = createIssueAction.data;
    if (!title || !body) return;

    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      const labelsArg = labels?.length ? `--label "${labels.join(',')}"` : '';
      const escapedBody = body
        .replace(/"/g, '\\"')
        .replace(/`/g, '\\`')
        .replace(/\$/g, '\\$')
        .replace(/\n/g, '\\n');

      const cmd = `gh issue create --title "${title}" --body "${escapedBody}" ${labelsArg}`;
      const { stdout } = await execAsync(cmd);

      console.log(`[SuggestionAggregator] Auto-created GitHub issue: ${stdout.trim()}`);

      // Publish event
      bus.publish('cortex', 'suggestion:github_issue_auto_created', {
        suggestionId: suggestion.id,
        issueUrl: stdout.trim(),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      // Silently fail - GitHub might not be available
      console.warn(
        '[SuggestionAggregator] Could not auto-create issue (GitHub CLI may not be available)'
      );
    }
  }

  getPendingSuggestions(): ActionableSuggestion[] {
    this.cleanupExpired();
    return Array.from(this.suggestions.values())
      .filter((s) => s.status === 'pending')
      .sort((a, b) => {
        // Sort by priority then by date
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
  }

  getSuggestion(id: string): ActionableSuggestion | undefined {
    return this.suggestions.get(id);
  }

  getAllSuggestions(): ActionableSuggestion[] {
    return Array.from(this.suggestions.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  updateSuggestionStatus(id: string, status: ActionableSuggestion['status']): boolean {
    const suggestion = this.suggestions.get(id);
    if (!suggestion) return false;

    suggestion.status = status;

    bus.publish('cortex', 'suggestion:status_updated', {
      id,
      status,
      timestamp: new Date().toISOString(),
    });

    if (this.config.autoPersist) {
      this.saveState().catch(console.error);
    }

    return true;
  }

  dismissSuggestion(id: string): boolean {
    return this.updateSuggestionStatus(id, 'dismissed');
  }

  markExecuted(id: string): boolean {
    return this.updateSuggestionStatus(id, 'executed');
  }

  markReviewed(id: string): boolean {
    return this.updateSuggestionStatus(id, 'reviewed');
  }

  private cleanupExpired(): void {
    const now = Date.now();
    for (const [id, suggestion] of this.suggestions) {
      if (suggestion.expiresAt && suggestion.expiresAt.getTime() < now) {
        suggestion.status = 'expired';
      }
    }
  }

  // ============================================================================
  // PERSISTENCE
  // ============================================================================

  private async loadState(): Promise<void> {
    try {
      if (await fs.pathExists(this.stateFile)) {
        const data = await fs.readJson(this.stateFile);
        if (data.suggestions) {
          for (const s of data.suggestions) {
            // Rehydrate dates
            s.createdAt = new Date(s.createdAt);
            if (s.expiresAt) s.expiresAt = new Date(s.expiresAt);
            this.suggestions.set(s.id, s);
          }
          console.log(`[SuggestionAggregator] Loaded ${this.suggestions.size} suggestions`);
        }
      }
    } catch (error) {
      console.error('[SuggestionAggregator] Failed to load state:', error);
    }
  }

  private async saveState(): Promise<void> {
    try {
      await fs.writeJson(
        this.stateFile,
        {
          savedAt: new Date().toISOString(),
          suggestions: Array.from(this.suggestions.values()),
        },
        { spaces: 2 }
      );
    } catch (error) {
      console.error('[SuggestionAggregator] Failed to save state:', error);
    }
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private calculatePriority(strength: number, impact: string): ActionableSuggestion['priority'] {
    if (impact === 'transformative' || strength >= 0.9) return 'critical';
    if (impact === 'high' || strength >= 0.75) return 'high';
    if (impact === 'medium' || strength >= 0.5) return 'medium';
    return 'low';
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private slugify(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 30);
  }

  // ============================================================================
  // STATISTICS
  // ============================================================================

  getStatistics(): {
    total: number;
    pending: number;
    bySource: Record<string, number>;
    byPriority: Record<string, number>;
    byStatus: Record<string, number>;
  } {
    const all = Array.from(this.suggestions.values());

    const bySource: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    for (const s of all) {
      bySource[s.source] = (bySource[s.source] || 0) + 1;
      byPriority[s.priority] = (byPriority[s.priority] || 0) + 1;
      byStatus[s.status] = (byStatus[s.status] || 0) + 1;
    }

    return {
      total: all.length,
      pending: all.filter((s) => s.status === 'pending').length,
      bySource,
      byPriority,
      byStatus,
    };
  }
}

// Export singleton
export const suggestionAggregator = SuggestionAggregator.getInstance();
