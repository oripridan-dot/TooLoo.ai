// @version 3.3.420
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
 *
 * Phase 2 of "Sentient Partner" Protocol - The Suggestion Engine
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
      findings: rawFindings,
      confidence,
      status,
    } = payload as {
      hypothesisId: string;
      type: string;
      targetArea: string;
      success: boolean;
      shouldIntegrate: boolean;
      findings: unknown;
      confidence: number;
      status: string;
    };

    // Normalize findings to string array (may come as object, string, or array)
    const findings: string[] = Array.isArray(rawFindings)
      ? rawFindings.filter((f): f is string => typeof f === 'string')
      : typeof rawFindings === 'string'
        ? [rawFindings]
        : typeof rawFindings === 'object' && rawFindings !== null
          ? Object.values(rawFindings).filter((f): f is string => typeof f === 'string')
          : [];

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

// ============================================================================
// SUGGESTION ENGINE - Phase 2 of "Sentient Partner" Protocol
// Generates 3 distinct "Next Moves" based on current context
// ============================================================================

export interface NextMove {
  type: 'logical' | 'creative' | 'evolutionary';
  title: string;
  description: string;
  confidence: number;
  action: string;
  context: Record<string, unknown>;
}

export interface SuggestionEngineState {
  lastAction: string;
  lastActionTime: number;
  currentFile: string | null;
  currentGoal: string | null;
  errors: Array<{ file: string; line: number; message: string }>;
  pendingMoves: NextMove[];
}

/**
 * SuggestionEngine - The Partner that runs in parallel to the user's workflow
 *
 * Logic:
 * 1. Observe: Listen to bus.on('user:action') events
 * 2. Analyze (Macro): Check the Planner state for high-level goal alignment
 * 3. Analyze (Micro): Check current file for errors or incomplete logic
 * 4. Synthesize: Generate 3 distinct 'Next Moves'
 *    - Logical: The obvious next step
 *    - Creative: A divergent idea
 *    - Evolutionary: A self-improvement suggestion
 * 5. Output: Stream to frontend via socket.emit('suggestion:ready')
 */
export class SuggestionEngine {
  private static instance: SuggestionEngine;
  private state: SuggestionEngineState;
  private debounceTimer: NodeJS.Timeout | null = null;
  private readonly DEBOUNCE_MS = 2000;

  private constructor() {
    this.state = {
      lastAction: '',
      lastActionTime: Date.now(),
      currentFile: null,
      currentGoal: null,
      errors: [],
      pendingMoves: [],
    };

    this.setupListeners();
    console.log('[SuggestionEngine] Initialized - Watching for user actions');
  }

  static getInstance(): SuggestionEngine {
    if (!SuggestionEngine.instance) {
      SuggestionEngine.instance = new SuggestionEngine();
    }
    return SuggestionEngine.instance;
  }

  // ============================================================================
  // OBSERVATION - Listen to user actions
  // ============================================================================

  private setupListeners(): void {
    // Listen for file saves
    bus.on('user:file_saved', (event) => {
      this.onUserAction('file_saved', event.payload);
    });

    // Listen for errors
    bus.on('user:error', (event) => {
      this.onUserAction('error', event.payload);
    });

    // Listen for design requests
    bus.on('user:design_request', (event) => {
      this.onUserAction('design_request', event.payload);
    });

    // Listen for chat messages
    bus.on('chat:message_sent', (event) => {
      this.onUserAction('chat_message', event.payload);
    });

    // Listen for code execution
    bus.on('agent:task_completed', (event) => {
      this.onUserAction('task_completed', event.payload);
    });

    // Listen for file changes from watcher
    bus.on('sensory:file_changed', (event) => {
      this.onUserAction('file_changed', event.payload);
    });

    // Listen for planner updates
    bus.on('planner:goal_updated', (event) => {
      this.state.currentGoal = event.payload?.goal || null;
    });
  }

  private onUserAction(actionType: string, payload: Record<string, unknown>): void {
    this.state.lastAction = actionType;
    this.state.lastActionTime = Date.now();

    // Update current file if available
    if (payload['file'] || payload['filePath']) {
      this.state.currentFile = (payload['file'] || payload['filePath']) as string;
    }

    // Track errors
    if (actionType === 'error' && payload['message']) {
      this.state.errors.push({
        file: (payload['file'] as string) || 'unknown',
        line: (payload['line'] as number) || 0,
        message: payload['message'] as string,
      });
      // Keep only last 10 errors
      if (this.state.errors.length > 10) {
        this.state.errors = this.state.errors.slice(-10);
      }
    }

    // Debounce analysis
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.analyzeAndSynthesize();
    }, this.DEBOUNCE_MS);
  }

  // ============================================================================
  // ANALYSIS - Macro and Micro context analysis
  // ============================================================================

  private async analyzeAndSynthesize(): Promise<void> {
    try {
      // 1. Macro Analysis - Check planner state
      const macroContext = await this.analyzeMacro();

      // 2. Micro Analysis - Check current file
      const microContext = await this.analyzeMicro();

      // 3. Synthesize Next Moves
      const moves = this.synthesizeMoves(macroContext, microContext);

      if (moves.length > 0) {
        this.state.pendingMoves = moves;

        // 4. Emit to frontend
        bus.publish('suggestions', 'suggestion:ready', {
          moves,
          timestamp: Date.now(),
          context: {
            lastAction: this.state.lastAction,
            currentFile: this.state.currentFile,
            currentGoal: this.state.currentGoal,
          },
        });

        console.log(`[SuggestionEngine] Generated ${moves.length} next moves`);
      }
    } catch (error) {
      console.error('[SuggestionEngine] Analysis error:', error);
    }
  }

  private async analyzeMacro(): Promise<{
    goalAlignment: number;
    onTrack: boolean;
    blockers: string[];
    suggestions: string[];
  }> {
    // Get planner state (simplified - in real impl, would query Planner)
    const hasGoal = !!this.state.currentGoal;
    const recentErrors = this.state.errors.length;

    return {
      goalAlignment: hasGoal ? 0.7 : 0.3,
      onTrack: recentErrors < 3,
      blockers: recentErrors > 0 ? ['Recent errors detected'] : [],
      suggestions: hasGoal
        ? [`Continue working on: ${this.state.currentGoal}`]
        : ['Consider setting a clear goal for this session'],
    };
  }

  private async analyzeMicro(): Promise<{
    hasErrors: boolean;
    incompletePatterns: string[];
    fileType: string | null;
    complexity: 'low' | 'medium' | 'high';
  }> {
    const recentError = this.state.errors[this.state.errors.length - 1];
    const fileType = this.state.currentFile?.split('.').pop() || null;

    // Detect incomplete patterns based on recent actions
    const incompletePatterns: string[] = [];
    if (this.state.lastAction === 'file_saved' && recentError) {
      incompletePatterns.push('File saved with errors');
    }

    return {
      hasErrors: !!recentError,
      incompletePatterns,
      fileType,
      complexity: 'medium', // Would be calculated from AST analysis
    };
  }

  // ============================================================================
  // SYNTHESIS - Generate 3 Next Moves
  // ============================================================================

  private synthesizeMoves(
    macro: { goalAlignment: number; onTrack: boolean; blockers: string[]; suggestions: string[] },
    micro: {
      hasErrors: boolean;
      incompletePatterns: string[];
      fileType: string | null;
      complexity: string;
    }
  ): NextMove[] {
    const moves: NextMove[] = [];

    // 1. LOGICAL - The obvious next step
    const logicalMove = this.generateLogicalMove(macro, micro);
    if (logicalMove) moves.push(logicalMove);

    // 2. CREATIVE - A divergent idea
    const creativeMove = this.generateCreativeMove(macro, micro);
    if (creativeMove) moves.push(creativeMove);

    // 3. EVOLUTIONARY - A self-improvement suggestion
    const evolutionaryMove = this.generateEvolutionaryMove(macro, micro);
    if (evolutionaryMove) moves.push(evolutionaryMove);

    return moves;
  }

  private generateLogicalMove(
    macro: { goalAlignment: number; onTrack: boolean; blockers: string[]; suggestions: string[] },
    micro: { hasErrors: boolean; incompletePatterns: string[]; fileType: string | null }
  ): NextMove | null {
    // If there are errors, suggest fixing them
    if (micro.hasErrors) {
      const error = this.state.errors[this.state.errors.length - 1];
      return {
        type: 'logical',
        title: 'Fix the error',
        description: `There's an error in ${error?.file || 'your code'}: ${error?.message || 'Unknown error'}`,
        confidence: 0.9,
        action: 'fix_error',
        context: { error, file: this.state.currentFile },
      };
    }

    // If off track from goal, suggest realignment
    if (!macro.onTrack && macro.blockers.length > 0) {
      return {
        type: 'logical',
        title: 'Address blockers',
        description: `You have blockers: ${macro.blockers.join(', ')}`,
        confidence: 0.8,
        action: 'address_blockers',
        context: { blockers: macro.blockers },
      };
    }

    // Default: continue with current goal
    if (macro.suggestions.length > 0) {
      return {
        type: 'logical',
        title: 'Continue current work',
        description: macro.suggestions[0] || 'Keep making progress',
        confidence: 0.7,
        action: 'continue',
        context: { goal: this.state.currentGoal },
      };
    }

    // Suggest based on file type
    if (micro.fileType) {
      const suggestions: Record<string, { title: string; description: string; action: string }> = {
        ts: {
          title: 'Add type annotations',
          description: 'Improve type safety in your TypeScript file',
          action: 'add_types',
        },
        tsx: {
          title: 'Add component tests',
          description: 'Write tests for your React component',
          action: 'add_tests',
        },
        jsx: {
          title: 'Extract component',
          description: 'Consider extracting a reusable component',
          action: 'extract_component',
        },
        css: {
          title: 'Review styles',
          description: 'Check for unused or duplicate styles',
          action: 'review_styles',
        },
      };

      const suggestion = suggestions[micro.fileType];
      if (suggestion) {
        return {
          type: 'logical',
          title: suggestion.title,
          description: suggestion.description,
          confidence: 0.6,
          action: suggestion.action,
          context: { fileType: micro.fileType },
        };
      }
    }

    return null;
  }

  private generateCreativeMove(
    macro: { goalAlignment: number; onTrack: boolean },
    micro: { fileType: string | null; complexity: string }
  ): NextMove | null {
    // Creative suggestions based on context
    const creativeIdeas: Array<{ condition: () => boolean; move: NextMove }> = [
      {
        condition: () => micro.fileType === 'jsx' || micro.fileType === 'tsx',
        move: {
          type: 'creative',
          title: 'Add visual polish ✨',
          description: 'Add subtle animations or micro-interactions to enhance UX',
          confidence: 0.5,
          action: 'add_animation',
          context: { suggestion: 'framer-motion for smooth transitions' },
        },
      },
      {
        condition: () => micro.fileType === 'ts' || micro.fileType === 'js',
        move: {
          type: 'creative',
          title: 'Add a creative pattern 🎨',
          description: 'Consider using a different design pattern like Strategy or Observer',
          confidence: 0.4,
          action: 'suggest_pattern',
          context: { patterns: ['Strategy', 'Observer', 'Command'] },
        },
      },
      {
        condition: () => macro.goalAlignment > 0.5,
        move: {
          type: 'creative',
          title: 'Think bigger 🚀',
          description: 'What if we made this feature 10x better? What would that look like?',
          confidence: 0.3,
          action: 'brainstorm',
          context: { prompt: 'Imagine the ideal version of this feature' },
        },
      },
      {
        condition: () => this.state.lastAction === 'design_request',
        move: {
          type: 'creative',
          title: 'Try a different approach 🔄',
          description: 'What about using a completely different visual metaphor?',
          confidence: 0.4,
          action: 'alternative_design',
          context: {},
        },
      },
    ];

    // Find matching creative idea
    for (const idea of creativeIdeas) {
      if (idea.condition()) {
        return idea.move;
      }
    }

    // Default creative suggestion
    return {
      type: 'creative',
      title: 'Explore something new 🌟',
      description: 'Take 5 minutes to explore a related concept or tool',
      confidence: 0.3,
      action: 'explore',
      context: {},
    };
  }

  private generateEvolutionaryMove(
    macro: { goalAlignment: number; onTrack: boolean },
    micro: { hasErrors: boolean; incompletePatterns: string[]; complexity: string }
  ): NextMove | null {
    // Self-improvement suggestions
    const evolutionaryIdeas: Array<{ condition: () => boolean; move: NextMove }> = [
      {
        condition: () => micro.hasErrors && this.state.errors.length > 2,
        move: {
          type: 'evolutionary',
          title: 'Add error prevention 🛡️',
          description: 'Add validation or guards to prevent similar errors in the future',
          confidence: 0.7,
          action: 'add_validation',
          context: { errorCount: this.state.errors.length },
        },
      },
      {
        condition: () => micro.complexity === 'high',
        move: {
          type: 'evolutionary',
          title: 'Refactor for simplicity 🔧',
          description:
            'This code could be simplified. Consider extracting functions or reducing nesting.',
          confidence: 0.6,
          action: 'refactor',
          context: { reason: 'complexity' },
        },
      },
      {
        condition: () => this.state.lastAction === 'file_saved',
        move: {
          type: 'evolutionary',
          title: 'Add documentation 📝',
          description: 'Document the key functions and their purpose',
          confidence: 0.5,
          action: 'add_docs',
          context: {},
        },
      },
      {
        condition: () => macro.goalAlignment < 0.5,
        move: {
          type: 'evolutionary',
          title: 'Clarify the goal 🎯',
          description: "Take a moment to write down exactly what you're trying to achieve",
          confidence: 0.6,
          action: 'clarify_goal',
          context: {},
        },
      },
    ];

    // Find matching evolutionary idea
    for (const idea of evolutionaryIdeas) {
      if (idea.condition()) {
        return idea.move;
      }
    }

    // Default evolutionary suggestion
    return {
      type: 'evolutionary',
      title: 'Performance check ⚡',
      description: 'Review for potential performance optimizations',
      confidence: 0.4,
      action: 'performance_review',
      context: {},
    };
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  getPendingMoves(): NextMove[] {
    return this.state.pendingMoves;
  }

  getState(): SuggestionEngineState {
    return { ...this.state };
  }

  clearPendingMoves(): void {
    this.state.pendingMoves = [];
  }

  // Manually trigger analysis
  async triggerAnalysis(): Promise<NextMove[]> {
    await this.analyzeAndSynthesize();
    return this.state.pendingMoves;
  }

  // Update current context
  setContext(context: { file?: string; goal?: string }): void {
    if (context.file) this.state.currentFile = context.file;
    if (context.goal) this.state.currentGoal = context.goal;
  }
}

// Export suggestion engine singleton
export const suggestionEngine = SuggestionEngine.getInstance();
