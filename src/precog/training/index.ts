// @version 2.1.298
import path from "path";
import fs from "fs";
import fetch from "node-fetch";
import { EventEmitter } from "events";

// Engines
import TrainingCamp from "../engine/training-camp.js";
import MetaLearningEngine from "../engine/meta-learning-engine.js";
import HyperSpeedTrainingCamp from "../engine/hyper-speed-training-camp.js";
import ParallelProviderOrchestrator from "../engine/parallel-provider-orchestrator.js";
import ValidatedExecutionFramework, { createValidationFramework } from "../engine/validated-execution-framework.js";

interface FeedbackEntry {
  id: string;
  quality: number;
  relevance: number;
  clarity: number;
  provider: string;
  helpful: boolean | null;
  comment: string;
  timestamp: number;
  averageScore: number;
}

interface InteractionEntry {
  userId: string;
  engaged: boolean;
  [key: string]: unknown;
}

interface FeedbackStore {
  feedback: FeedbackEntry[];
  count: number;
  interactions: InteractionEntry[];
  lastUpdated: number;
}

interface ProviderMetrics {
  totalRequests: number;
  averageLatency: number;
  averageQuality: number;
  totalCost: number;
}

interface MetricsStore {
  providers: Record<string, ProviderMetrics>;
  responses: MetricsData[];
  averageQuality: number;
  lastUpdated: number;
}

interface TopicData {
  key?: string;
  id?: string;
  topic?: string;
  name?: string;
  problems?: unknown[];
  background?: boolean;
  force?: boolean;
}

interface Domain {
  name: string;
  mastery: number;
}

interface TrainingSettings {
  [key: string]: unknown;
}

interface MetricsData {
  responseId: string;
  provider: string;
  latency: number;
  tokensUsed: number;
  costEstimate: number;
  quality: number;
  timestamp: number;
}

interface InteractionData {
  [key: string]: unknown;
}

interface OptimizationTask {
  original?: string;
  [key: string]: unknown;
}

interface OptimizationContext {
  [key: string]: unknown;
}

interface FeedbackData {
  [key: string]: unknown;
}

export class TrainingService extends EventEmitter {
  private trainingCamp!: TrainingCamp;
  private meta!: MetaLearningEngine;
  private hyperCamp!: HyperSpeedTrainingCamp;
  private orchestrator!: ParallelProviderOrchestrator;
  private validationFramework!: ValidatedExecutionFramework;
  private sourcesStateFile: string;

  // In-memory stores
  private feedbackStore: FeedbackStore = {
    feedback: [],
    count: 0,
    interactions: [],
    lastUpdated: Date.now(),
  };

  private metricsStore: MetricsStore = {
    providers: {},
    responses: [],
    averageQuality: 0,
    lastUpdated: Date.now(),
  };

  constructor(private workspaceRoot: string) {
    super();
    this.sourcesStateFile = path.join(
      this.workspaceRoot,
      "data",
      "sources-github-state.json",
    );
    this.initializeEngines();
  }

  private initializeEngines() {
    this.trainingCamp = new TrainingCamp({ workspaceRoot: this.workspaceRoot });
    this.meta = new MetaLearningEngine({ workspaceRoot: this.workspaceRoot });
    this.hyperCamp = new HyperSpeedTrainingCamp({
      workspaceRoot: this.workspaceRoot,
      trainingCamp: this.trainingCamp,
    });
    this.orchestrator = new ParallelProviderOrchestrator({
      workspaceRoot: this.workspaceRoot,
    });
    this.validationFramework = createValidationFramework("training");
  }

  // ============= GitHub Sources Logic =============

  private loadSourcesState() {
    try {
      return JSON.parse(fs.readFileSync(this.sourcesStateFile, "utf8"));
    } catch {
      return {};
    }
  }

  private saveSourcesState(state: Record<string, unknown>) {
    if (!fs.existsSync(path.dirname(this.sourcesStateFile))) {
      fs.mkdirSync(path.dirname(this.sourcesStateFile), { recursive: true });
    }
    fs.writeFileSync(this.sourcesStateFile, JSON.stringify(state, null, 2));
  }

  async syncGithubIssues(repo: string, token: string, force: boolean = false) {
    const state = this.loadSourcesState();
    const lastSync = state[repo]?.lastSync || 0;
    const since = force ? 0 : lastSync;

    const issuesUrl = `https://api.github.com/repos/${repo}/issues?state=all&since=${new Date(since).toISOString()}`;
    const r = await fetch(issuesUrl, {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!r.ok) {
      throw new Error(`GitHub API error: ${r.statusText}`);
    }

    interface GitHubLabel {
      name: string;
    }

    interface GitHubIssue {
      id: number;
      title: string;
      html_url: string;
      body: string;
      created_at: string;
      labels?: GitHubLabel[];
    }

    const issues = (await r.json()) as GitHubIssue[];
    const newTopics = [];

    for (const issue of issues) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!issue.id || (state[repo] as any)?.ids?.includes(issue.id)) continue;

      const topic = {
        key: `github-issue-${issue.id}`,
        name: issue.title,
        background: true,
        source: "github",
        url: issue.html_url,
        body: issue.body || "",
        created_at: issue.created_at,
        labels: issue.labels?.map((l: GitHubLabel) => l.name) || [],
      };

      try {
        const result = this.trainingCamp.addTopic(topic);
        if (result.ok) newTopics.push(topic);
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.warn(`Failed to add issue ${issue.id}:`, errorMessage);
      }

      state[repo] = state[repo] || { ids: [], lastSync: 0 };
      state[repo].ids.push(issue.id);
    }

    state[repo].lastSync = Date.now();
    this.saveSourcesState(state);

    return {
      repo,
      newTopics,
      count: newTopics.length,
      nextSync: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    };
  }

  getGithubSourceStatus(repo: string) {
    const state = this.loadSourcesState();
    const repoState = state[repo];

    if (!repoState) {
      return {
        repo,
        synced: false,
        message: "Never synced",
      };
    }

    return {
      repo,
      synced: true,
      syncedIssues: repoState.ids?.length || 0,
      lastSync: new Date(repoState.lastSync).toISOString(),
    };
  }

  // ============= Training Logic =============

  async startCamp() {
    return await this.trainingCamp.startCamp();
  }

  getStatus() {
    return this.trainingCamp.getStatus();
  }

  async runRound() {
    return await this.trainingCamp.runRound();
  }

  getOverviewData() {
    return this.trainingCamp.getOverviewData();
  }

  getActiveTrainingData() {
    return this.trainingCamp.getActiveTrainingData();
  }

  getDeepDiveData(topic: string) {
    return this.trainingCamp.getDeepDiveData(topic);
  }

  addTopic(data: TopicData) {
    const key = data.key || data.id || data.topic || "systems";
    const name = data.name || "Systems Design";
    const problems = Array.isArray(data.problems) ? data.problems : undefined;
    // If problems are undefined, the original code had a default list, but only if it was a POST body.
    // I'll assume the caller handles defaults or I should replicate the default logic here?
    // The original code had defaults inside the route handler. I'll replicate them here for safety.

    const finalProblems = problems || [
      {
        id: `${key}_001`,
        topic: "Foundations",
        difficulty: "easy",
        problem: "Explain scalability vs elasticity",
        keywords: ["scalability", "elasticity", "load"],
      },
      {
        id: `${key}_002`,
        topic: "Architecture",
        difficulty: "medium",
        problem: "Design a URL shortener core components",
        keywords: ["hash", "collision", "database", "cache"],
      },
      {
        id: `${key}_003`,
        topic: "Reliability",
        difficulty: "hard",
        problem: "Describe strategies for high availability",
        keywords: ["replication", "failover", "health check"],
      },
    ];

    const background = data.background !== undefined ? !!data.background : true;
    const force = data.force !== undefined ? !!data.force : false;

    return this.trainingCamp.addTopic({
      key,
      name,
      problems: finalProblems,
      background,
      force,
    });
  }

  async getNextDomain() {
    const overview = this.trainingCamp.getOverviewData();
    const domains = Array.isArray(overview?.domains) ? overview.domains : [];
    const avg = domains.length
      ? domains.reduce((s: number, d: Domain) => s + (d.mastery || 0), 0) /
        domains.length
      : 0;
    const gaps = domains
      .filter((d: Domain) => (d.mastery || 0) < 80)
      .map((d: Domain) => ({ name: d.name, mastery: d.mastery }));

    await this.meta.init();
    const insights = this.meta.getInsights();
    const readiness = Math.round((insights.readiness || 0) * 1000) / 10;
    const recommendMeta = avg >= 75 && gaps.length <= 3;
    const domain = recommendMeta
      ? "Meta-Learning Mastery"
      : "Continue CS Fundamentals Optimization";
    const rationale = recommendMeta
      ? "Fundamentals strong; advance to meta-learning."
      : "Lift remaining fundamentals to 80%+";

    return {
      domain,
      readiness,
      rationale,
      currentMastery: {
        average: Math.round(avg * 10) / 10,
        domainsBelow80: gaps,
      },
    };
  }

  getSettings() {
    return this.trainingCamp.getSettings();
  }

  setSettings(settings: TrainingSettings) {
    return this.trainingCamp.setSettings(settings);
  }

  calibrateToThreshold(options: {
    threshold?: number;
    minAttempts?: number;
    delta?: number;
    force?: boolean;
  }) {
    return this.trainingCamp.calibrateToThreshold(options);
  }

  async forceMasteries(threshold: number) {
    return await this.trainingCamp.forceMasteries(threshold);
  }

  // ============= Hyper-Speed Training Logic =============

  async startHyperSpeed(rounds?: number) {
    const originalRounds = this.hyperCamp.hyperMode?.turboRounds;
    if (rounds !== undefined) {
      const n = Math.max(1, Math.min(10, rounds));
      this.hyperCamp.hyperMode.turboRounds = n;
    }

    const result = await this.hyperCamp.turboStart();

    if (rounds !== undefined) {
      this.hyperCamp.hyperMode.turboRounds = originalRounds;
    }
    return result;
  }

  async runMicroBatch(domain?: string, question?: string) {
    return await this.validationFramework.safeExecute(
        async ({ domain, question }: { domain: string; question: string }) => {
        return await this.hyperCamp.runMicroBatch({ domain, question });
      },
      { domain, question },
      {
        requiredFields: [],
        typeValidation: { domain: "string" },
        expectedResult: {
          type: "object",
          properties: ["ok", "domains", "questionsProcessed"],
        },
      },
    );
  }

  async runTurboRound() {
    return await this.hyperCamp.runTurboRound();
  }

  getHyperStats() {
    return this.hyperCamp.getHyperStats();
  }

  // ============= Parallel Provider Logic =============

  async parallelGenerate(prompt: string) {
    return await this.orchestrator.hyperParallelGenerate(prompt);
  }

  getParallelPerformance() {
    return this.orchestrator.getPerformanceReport();
  }

  // ============= Learning Service Consolidation =============

  async startTrainingSession(
    userId: string,
    focusArea: string,
    roundCount?: number,
  ) {
    return await this.trainingCamp.startTraining(userId, focusArea, {
      roundCount,
    });
  }

  async completeTrainingRound(roundId: string, response: string, score?: number) {
    return await this.trainingCamp.completeRound(roundId, response, score);
  }

  getTrainingProgress(userId: string) {
    const metrics = this.trainingCamp.getMasteryMetrics(userId);
    const sessions = this.trainingCamp.getUserSessions(userId);
    return {
      mastery: metrics,
      sessions,
      timestamp: Date.now(),
    };
  }

  getSession(sessionId: string) {
    return this.trainingCamp.getSession(sessionId);
  }

  getStats() {
    return this.trainingCamp.getStats();
  }

  // ============= Challenge Logic =============

  async startChallenge(
    userId: string,
    skill: string,
    difficulty: string = "medium",
  ) {
    return await this.trainingCamp.startChallenge(userId, skill, difficulty);
  }

  async gradeChallenge(challengeId: string, response: string) {
    return await this.trainingCamp.gradeChallenge(challengeId, response);
  }

  getChallengeStats() {
    return this.trainingCamp.getChallengeStats();
  }

  // ============= Feedback & Metrics Logic =============

  submitFeedback(data: FeedbackData) {
    const quality = (data.quality as number) || 3;
    const relevance = (data.relevance as number) || 3;
    const clarity = (data.clarity as number) || 3;
    const provider = (data.provider as string) || "unknown";
    const helpful = (data.helpful as boolean) || null;
    const comment = (data.comment as string) || "";
    const responseId = data.responseId as string;

    const feedbackEntry = {
      id: responseId,
      quality,
      relevance,
      clarity,
      provider,
      helpful,
      comment,
      timestamp: Date.now(),
      averageScore: (quality + relevance + clarity) / 3,
    };

    this.feedbackStore.feedback.push(feedbackEntry);
    if (this.feedbackStore.feedback.length > 1000) {
      this.feedbackStore.feedback.shift();
    }
    this.feedbackStore.count = this.feedbackStore.feedback.length;
    this.feedbackStore.lastUpdated = Date.now();

    return {
      message: "Feedback recorded",
      feedbackId: responseId,
    };
  }

  getFeedbackSummary() {
    return {
      totalFeedback: this.feedbackStore.count,
      feedbackLastUpdated: this.feedbackStore.lastUpdated,
      avgQuality:
        this.feedbackStore.feedback.length > 0
          ? this.feedbackStore.feedback.reduce((a, b) => a + b.quality, 0) /
            this.feedbackStore.feedback.length
          : 0,
      avgRelevance:
        this.feedbackStore.feedback.length > 0
          ? this.feedbackStore.feedback.reduce((a, b) => a + b.relevance, 0) /
            this.feedbackStore.feedback.length
          : 0,
    };
  }

  getProviderFeedback(provider: string) {
    const providerFeedback = this.feedbackStore.feedback.filter(
      (f) => f.provider === provider,
    );
    const avg = (arr: number[]) =>
      arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    return {
      provider,
      totalResponses: providerFeedback.length,
      averageQuality: avg(providerFeedback.map((f) => f.quality)),
      averageRelevance: avg(providerFeedback.map((f) => f.relevance)),
      averageClarity: avg(providerFeedback.map((f) => f.clarity)),
      helpfulRate:
        providerFeedback.filter((f) => f.helpful).length /
        Math.max(1, providerFeedback.length),
      recentFeedback: providerFeedback.slice(-10),
    };
  }

  recordMetrics(data: MetricsData) {
    const {
      responseId,
      provider = "unknown",
      latency = 0,
      tokensUsed = 0,
      costEstimate = 0,
      quality = 0,
    } = data;

    const metricEntry = {
      responseId,
      provider,
      latency,
      tokensUsed,
      costEstimate,
      quality,
      timestamp: Date.now(),
    };

    this.metricsStore.responses.push(metricEntry);
    if (this.metricsStore.responses.length > 1000) {
      this.metricsStore.responses.shift();
    }
    this.metricsStore.lastUpdated = Date.now();

    if (!this.metricsStore.providers[provider]) {
      this.metricsStore.providers[provider] = {
        totalRequests: 0,
        averageLatency: 0,
        averageQuality: 0,
        totalCost: 0,
      };
    }

    const providerData = this.metricsStore.providers[provider];
    providerData.totalRequests += 1;
    providerData.averageLatency =
      (providerData.averageLatency * (providerData.totalRequests - 1) +
        latency) /
      providerData.totalRequests;
    providerData.averageQuality =
      (providerData.averageQuality * (providerData.totalRequests - 1) +
        quality) /
      providerData.totalRequests;
    providerData.totalCost += costEstimate;

    return { message: "Metrics recorded" };
  }

  getPerformanceMetrics() {
    return {
      providers: this.metricsStore.providers,
      totalMetrics: this.metricsStore.responses.length,
      lastUpdated: this.metricsStore.lastUpdated,
    };
  }

  trackInteraction(data: InteractionData) {
    const interaction = {
      userId: (data.userId as string) || "unknown",
      queryType: data.queryType,
      selectedProvider: data.selectedProvider,
      responseTime: data.responseTime,
      engaged: (data.engaged as boolean) || false,
      followUpQuery: data.followUpQuery,
      timestamp: Date.now(),
    };

    this.feedbackStore.interactions.push(interaction);
    this.feedbackStore.lastUpdated = Date.now();

    return { message: "Interaction tracked" };
  }

  getUserProfile(userId: string) {
    const userInteractions = this.feedbackStore.interactions.filter(
      (i) => i.userId === userId,
    );

    return {
      userId,
      totalInteractions: userInteractions.length,
      engagementRate:
        userInteractions.filter((i) => i.engaged).length /
        Math.max(1, userInteractions.length),
      recentActivity: userInteractions.slice(-5),
    };
  }

  getRecommendations(userId: string, currentQuery: string = "") {
    const userInteractions = this.feedbackStore.interactions.filter(
      (i) => i.userId === userId,
    );

    return {
      userId,
      interactionCount: userInteractions.length,
      engagementRate:
        userInteractions.filter((i) => i.engaged).length /
        Math.max(1, userInteractions.length),
      suggestedApproach: currentQuery.includes("code")
        ? "technical"
        : "standard",
      timestamp: Date.now(),
    };
  }

  getImprovementAnalysis() {
    return {
      dataCollected: {
        totalFeedback: this.feedbackStore.count,
        totalMetrics: this.metricsStore.responses.length,
        totalInteractions: this.feedbackStore.interactions.length,
      },
      avgQuality:
        this.feedbackStore.feedback.length > 0
          ? this.feedbackStore.feedback.reduce((a, b) => a + b.quality, 0) /
            this.feedbackStore.feedback.length
          : 0,
      providers: this.metricsStore.providers,
      lastUpdated: this.metricsStore.lastUpdated,
    };
  }

  getOptimizationPlan(task: OptimizationTask, context: OptimizationContext) {
    // 1. Select Provider
    let provider = "openai";
    if (task?.type === "creative") provider = "gemini";
    if (task?.type === "reasoning") provider = "anthropic";
    if (task?.type === "speed") provider = "deepseek";

    // 2. Check Context Limits
    const contextLength = JSON.stringify(context || []).length;
    const limit = 100000;

    let prompt = task?.original || "";

    return {
      provider,
      prompt,
      contextAction: contextLength > limit ? "summarize" : "keep",
    };
  }
}
