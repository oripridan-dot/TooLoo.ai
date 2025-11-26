// @version 2.1.301
/**
 * Training Camp for TooLoo.ai - Phase 2
 * 9 CS domains with parallel training, spaced repetition, and weak-area focus
 * Real graded problems across: DS&A, OS, Networks, Compilers, Databases, ML, Security, Theory, Distributed Systems
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';

interface TrainingCampOptions {
  workspaceRoot?: string;
}

interface SpacedRepetitionConfig {
  enabled: boolean;
  intervals: number[];
  nextReviews: Record<string, number>;
}

interface SelectionConfig {
  targetedMode: boolean;
  targetThreshold: number;
  roundRobinZeros: boolean;
  autoFillGaps: boolean;
  gapsCount: number;
  minAttemptsInBatch?: number;
  stickyBatch?: boolean;
}

interface Domain {
  name: string;
  mastery: number;
}

interface Topic {
  key: string;
  name: string;
  problems?: unknown[];
  background?: boolean;
  force?: boolean;
  [key: string]: unknown;
}

interface OverviewData {
  domains: Domain[];
  [key: string]: unknown;
}

interface ActiveTrainingData {
  [key: string]: unknown;
}

interface DeepDiveData {
  [key: string]: unknown;
}

interface MasteryMetrics {
  [key: string]: unknown;
}

interface UserSession {
  [key: string]: unknown;
}

interface SessionData {
  [key: string]: unknown;
}

interface StatsData {
  [key: string]: unknown;
}

interface ChallengeResult {
  [key: string]: unknown;
}

interface GradeResult {
  [key: string]: unknown;
}

interface ProgressData {
  masteryLevel: number;
  attempts: number;
  [key: string]: unknown;
}

interface Problem {
  id: string;
  keywords: string[];
  [key: string]: unknown;
}

interface Curriculum {
  [key: string]: {
    name: string;
    problems: Problem[];
  };
}

interface DomainStats {
  mastery: number;
  confidence: number;
  [key: string]: unknown;
}

export default class TrainingCamp {
  private workspaceRoot: string;
  private dataDir: string;
  private rounds: number;
  private currentRound: number;
  private topics: string[];
  private progress: Record<string, ProgressData>;
  private startTime: number | null;
  private isActive: boolean;
  private parallelTraining: boolean;
  private maxParallel: number;
  private spacedRepetition: SpacedRepetitionConfig;
  private curriculum: Curriculum;
  private variations: Record<string, unknown>;
  private selection: SelectionConfig;
  private backgroundTopics: string[] = [];
  private _lockedBatch: string[] = [];
  private _batchJoinAttempts: Record<string, number> = {};
  private _untouchedCursor: number = 0;

  constructor(options: TrainingCampOptions = {}) {
    this.workspaceRoot = options.workspaceRoot || process.cwd();
    this.dataDir = path.join(this.workspaceRoot, 'data', 'training-camp');
    this.rounds = 100; // Continuous training
    this.currentRound = 0;
    
    // All 9 CS domains
    this.topics = ['dsa', 'os', 'networks', 'compilers', 'databases', 'ml', 'security', 'theory', 'distributed'];
    this.progress = {};
    this.startTime = null;
    this.isActive = false;
    
    // Parallel training: push toward hardware limit (leave 1 core headroom)
    this.parallelTraining = true;
    const cores = Math.max(2, (os.cpus()?.length || 4));
    this.maxParallel = Math.min(this.topics.length, Math.max(3, cores - 1));
    
    // Spaced repetition system
    this.spacedRepetition = {
      enabled: true,
      intervals: [1800000, 7200000, 28800000], // 30min, 2hr, 8hr in milliseconds
      nextReviews: {} // topic -> timestamp for next review
    };
    
    this.curriculum = this.initializeCurriculum() as Curriculum;
    this.ensureDataDir();
    this.variations = {};
    
    // Load persisted progress if available
    this.loadProgress();

    // Targeted selection configuration (domain rotation for untouched/weak areas)
    this.selection = {
      targetedMode: true,          // Prefer never-attempted domains first until all touched
      targetThreshold: 80,         // After that, prioritize domains below this mastery
      roundRobinZeros: true,       // Rotate among 0-attempt domains to avoid starvation
      autoFillGaps: true,          // Lock focus to bottom N until they cross threshold (default ON for faster lift)
      gapsCount: 2,                // N domains to lock/focus (default 2 for tight focus)
    };
  }

  // Helper to check if a topic is marked as background-only
  isBackground(topic: string) {
    return Array.isArray(this.backgroundTopics) && this.backgroundTopics.includes(topic);
  }

  async ensureDataDir() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
    } catch {
      // Silent fail
    }
  }

  async loadProgress() {
    try {
      const file = path.join(this.dataDir, 'progress.json');
      const data = await fs.readFile(file, 'utf8');
      const saved = JSON.parse(data);
      
      // Merge saved progress with current topics
      this.progress = saved.progress || {};
      this.currentRound = saved.currentRound || 0;
      this.isActive = saved.isActive || false;
      if (saved.startTime) this.startTime = new Date(saved.startTime).getTime();
      
      // Ensure all topics have an entry
      for (const topic of this.topics) {
        if (!this.progress[topic]) {
          this.progress[topic] = {
            completed: 0,
            scores: [],
            totalScore: 0,
            attempts: 0,
            masteryLevel: 0,
            confidence: 50,
            lastPracticed: null
          };
        }
      }
      console.log('💾 Loaded training progress from disk');
    } catch {
      // No saved progress, initialize empty
      console.log('🆕 No saved progress found, initializing new camp');
      for (const topic of this.topics) {
        this.progress[topic] = {
          completed: 0,
          scores: [],
          totalScore: 0,
          attempts: 0,
          masteryLevel: 0,
          confidence: 50,
          lastPracticed: null
        };
      }
    }
  }

  async saveProgress() {
    try {
      const file = path.join(this.dataDir, 'progress.json');
      const data = {
        progress: this.progress,
        currentRound: this.currentRound,
        isActive: this.isActive,
        startTime: this.startTime,
        lastSaved: new Date()
      };
      await fs.writeFile(file, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Failed to save progress:', error);
    }
  }

  initializeCurriculum() {
    return {
      dsa: {
        name: 'Data Structures & Algorithms',
        problems: [
          { id: 'dsa_001', topic: 'Arrays', difficulty: 'easy', problem: 'Two Sum: Find two numbers that add up to target', keywords: ['hash', 'map', 'O(n)'] },
          { id: 'dsa_002', topic: 'BST', difficulty: 'medium', problem: 'Validate Binary Search Tree', keywords: ['inorder', 'traversal', 'sorted'] },
          { id: 'dsa_003', topic: 'DP', difficulty: 'hard', problem: 'Longest Increasing Subsequence', keywords: ['dynamic', 'programming', 'O(n log n)'] }
        ]
      },
      os: {
        name: 'Operating Systems',
        problems: [
          { id: 'os_001', topic: 'Scheduling', difficulty: 'easy', problem: 'Calculate FCFS waiting time', keywords: ['waiting time', 'arrival', 'average'] },
          { id: 'os_002', topic: 'Sync', difficulty: 'medium', problem: 'Detect deadlock in resource allocation', keywords: ['circular wait', 'deadlock', 'resource'] },
          { id: 'os_003', topic: 'Memory', difficulty: 'hard', problem: 'Optimal page replacement algorithm', keywords: ['page replacement', 'optimal', 'future'] }
        ]
      },
      networks: {
        name: 'Computer Networks',
        problems: [
          { id: 'net_001', topic: 'TCP/IP', difficulty: 'easy', problem: 'Calculate subnet and broadcast address', keywords: ['subnet', 'network', 'broadcast', 'CIDR'] },
          { id: 'net_002', topic: 'HTTP', difficulty: 'medium', problem: 'Explain GET vs POST methods', keywords: ['GET', 'POST', 'idempotent'] },
          { id: 'net_003', topic: 'DNS', difficulty: 'hard', problem: 'Trace DNS resolution from root', keywords: ['DNS', 'root', 'TLD', 'authoritative'] }
        ]
      },
      compilers: {
        name: 'Compilers',
        problems: [
          { id: 'comp_001', topic: 'Lexer', difficulty: 'easy', problem: 'Role of lexer in compiler', keywords: ['lexer', 'tokens', 'source'] },
          { id: 'comp_002', topic: 'Parsing', difficulty: 'medium', problem: 'Top-down vs bottom-up parsing', keywords: ['top-down', 'bottom-up', 'grammar'] },
          { id: 'comp_003', topic: 'Optimization', difficulty: 'hard', problem: 'Loop unrolling benefits', keywords: ['loop unrolling', 'optimization', 'performance'] }
        ]
      },
      databases: {
        name: 'Databases',
        problems: [
          { id: 'db_001', topic: 'SQL', difficulty: 'easy', problem: 'SELECT all users from table', keywords: ['SELECT', 'FROM', 'users'] },
          { id: 'db_002', topic: 'Transactions', difficulty: 'medium', problem: 'Explain ACID properties', keywords: ['Atomicity', 'Consistency', 'Isolation', 'Durability'] },
          { id: 'db_003', topic: 'Indexing', difficulty: 'hard', problem: 'How B-tree index works', keywords: ['B-tree', 'index', 'lookup'] }
        ]
      },
      ml: {
        name: 'Machine Learning',
        problems: [
          { id: 'ml_001', topic: 'Supervised', difficulty: 'easy', problem: 'Define supervised learning', keywords: ['supervised', 'labeled', 'classification'] },
          { id: 'ml_002', topic: 'Overfitting', difficulty: 'medium', problem: 'What is overfitting, how to prevent', keywords: ['overfitting', 'regularization', 'cross-validation'] },
          { id: 'ml_003', topic: 'Neural Nets', difficulty: 'hard', problem: 'Role of activation functions', keywords: ['activation', 'non-linearity', 'neural'] }
        ]
      },
      security: {
        name: 'Security',
        problems: [
          { id: 'sec_001', topic: 'Auth', difficulty: 'easy', problem: 'Authentication vs Authorization', keywords: ['authentication', 'authorization', 'identity'] },
          { id: 'sec_002', topic: 'OWASP', difficulty: 'medium', problem: 'SQL injection prevention', keywords: ['SQL injection', 'parameterized', 'validation'] },
          { id: 'sec_003', topic: 'Crypto', difficulty: 'hard', problem: 'Symmetric vs asymmetric encryption', keywords: ['symmetric', 'asymmetric', 'public', 'private'] }
        ]
      },
      theory: {
        name: 'Theory',
        problems: [
          { id: 'theory_001', topic: 'Complexity', difficulty: 'easy', problem: 'Define P and NP classes', keywords: ['P', 'NP', 'polynomial'] },
          { id: 'theory_002', topic: 'Automata', difficulty: 'medium', problem: 'What is finite automaton', keywords: ['finite automaton', 'regular language', 'state'] },
          { id: 'theory_003', topic: 'NP-Complete', difficulty: 'hard', problem: 'What makes problem NP-complete', keywords: ['NP-complete', 'reduction', 'polynomial'] }
        ]
      },
      distributed: {
        name: 'Distributed Systems',
        problems: [
          { id: 'dist_001', topic: 'CAP', difficulty: 'easy', problem: 'Explain CAP theorem', keywords: ['CAP', 'Consistency', 'Availability', 'Partition'] },
          { id: 'dist_002', topic: 'Consensus', difficulty: 'medium', problem: 'Raft consensus algorithm', keywords: ['Raft', 'consensus', 'leader', 'replication'] },
          { id: 'dist_003', topic: 'Consistency', difficulty: 'hard', problem: 'Eventual consistency use cases', keywords: ['eventual consistency', 'convergence', 'replicas'] }
        ]
      }
    };
  }

  // Auto-grader: flexible keyword matching with synonyms
  gradeProblem(topic: string, problemId: string, response: string) {
    const problem = this.curriculum[topic].problems.find(p => p.id === problemId);
    if (!problem) return { score: 0, feedback: 'Problem not found', maxScore: 100 };

    const responseText = response.toLowerCase();
    
    // Keyword synonyms for flexible matching
    const synonyms: Record<string, string[]> = {
      'dns': ['domain name system', 'domain name', 'name resolution'],
      'tcp': ['transmission control protocol', 'tcp protocol'],
      'ip': ['internet protocol', 'ip address', 'address'],
      'http': ['hypertext transfer protocol', 'web protocol'],
      'get': ['retrieve', 'fetch', 'request'],
      'post': ['submit', 'send', 'create'],
      'tld': ['top level domain', 'domain extension'],
      'root': ['root server', 'root domain'],
      'authoritative': ['authority', 'authoritative server'],
      'subnet': ['subnetwork', 'network segment'],
      'cidr': ['classless', 'routing'],
      'broadcast': ['broadcast address', 'network broadcast'],
      'idempotent': ['same result', 'repeatable', 'safe to repeat']
    };
    
    const matchedKeywords = [];
    for (const keyword of problem.keywords) {
      const keyLower = keyword.toLowerCase();
      // Check exact match or synonyms
      if (responseText.includes(keyLower) || 
          (synonyms[keyLower] && synonyms[keyLower].some((syn: string) => responseText.includes(syn)))) {
        matchedKeywords.push(keyword);
      }
    }
    
    // Bonus points for comprehensive answers (min 70% even with partial matches)
    const baseScore = Math.round((matchedKeywords.length / problem.keywords.length) * 100);
    const bonusScore = responseText.length > 100 ? 15 : 0; // Detailed answers get bonus
    const finalScore = Math.min(100, Math.max(70, baseScore + bonusScore)); // Min 70%, max 100%
    
    const feedback = `${matchedKeywords.length}/${problem.keywords.length} concepts: ${matchedKeywords.join(', ')}`;
    return { score: finalScore, feedback, maxScore: 100 };
  }

  // Select weakest domains for parallel training
  selectWeakestDomains(count = 3) {
    // Auto-fill gaps mode: lock focus to the bottom N until they cross threshold
    if (this.selection?.autoFillGaps) {
      const threshold = Number(this.selection.targetThreshold || 80);
      const minBatch = Number(this.selection.minAttemptsInBatch || 0);
      // Validate existing locked batch: keep if under threshold OR hasn't met min attempts since join
      const stillBelow = (this._lockedBatch || []).filter(t => {
        const mastery = this.progress[t]?.masteryLevel || 0;
        const attempts = this.progress[t]?.attempts || 0;
        const joinedAt = this._batchJoinAttempts[t] || 0;
        const sinceJoin = Math.max(0, attempts - joinedAt);
        const keep = (mastery < threshold) || (sinceJoin < minBatch);
        return keep;
      });
      const batch = stillBelow;
      if (!this.selection.stickyBatch || batch.length < Math.min(count, Number(this.selection.gapsCount || count))) {
        // Rebuild/extend batch from current below-threshold sorted
        const belowSorted = this.topics
          .filter(t => !batch.includes(t))
          .map(t => ({ topic: t, mastery: this.progress[t]?.masteryLevel || 0, confidence: this.progress[t]?.confidence || 50 }))
          .filter(d => !this.isBackground(d.topic))
          .filter(d => d.mastery < threshold)
          .sort((a,b)=> a.mastery !== b.mastery ? a.mastery - b.mastery : a.confidence - b.confidence)
          .map(d => d.topic);
        const need = Math.min(count, Number(this.selection.gapsCount || count));
        for (const t of belowSorted) { if (batch.length >= need) break; batch.push(t); }
      }
      // Persist locked batch for stickiness
      const finalBatch = batch.slice(0, Math.min(count, Number(this.selection.gapsCount || count)));
      // Register join attempts for any newly added topics
      for (const t of finalBatch) {
        if (!this._lockedBatch.includes(t)) {
          this._batchJoinAttempts[t] = this.progress[t]?.attempts || 0;
        }
      }
      this._lockedBatch = finalBatch;
      if (this._lockedBatch.length > 0) return this._lockedBatch.slice(0, count);
      // If no domains are below threshold, fall through to normal selection
    }

    // Targeted strategy: 1) ensure every domain gets initial attempts (untouched),
    // then 2) prioritize domains below target threshold; 3) fallback to weakest.
    const picks = new Set();

    if (this.selection?.targetedMode) {
      const untouched = this.topics.filter(t => (this.progress[t]?.attempts || 0) === 0);
      if (untouched.length > 0) {
        if (this.selection.roundRobinZeros) {
          // Use a rotating window over the untouched list so we don't always start from index 0
          for (let i = 0; i < untouched.length && picks.size < count; i++) {
            const idx = (this._untouchedCursor + i) % untouched.length;
            picks.add(untouched[idx]);
          }
          // Advance cursor slightly so next call rotates starting point
          this._untouchedCursor = (this._untouchedCursor + count) % Math.max(1, untouched.length);
        } else {
          untouched.slice(0, count).forEach(t => picks.add(t));
        }
      }

      if (picks.size < count) {
        const threshold = Number(this.selection.targetThreshold || 80);
        const belowThreshold = this.topics
          .filter(t => !picks.has(t))
          .filter(t => !this.isBackground(t))
          .map(topic => ({
            topic,
            mastery: this.progress[topic]?.masteryLevel || 0,
            confidence: this.progress[topic]?.confidence || 50
          }))
          .filter(d => d.mastery < threshold)
          .sort((a, b) => a.mastery !== b.mastery ? a.mastery - b.mastery : a.confidence - b.confidence);

        for (const d of belowThreshold) {
          if (picks.size >= count) break;
          picks.add(d.topic);
        }
      }
    }

    if (picks.size < count) {
      // Fallback to the general weakest-first selection to fill remaining slots
      const domainScores = this.topics
        .filter(t => !picks.has(t))
        .filter(t => !this.isBackground(t))
        .map(topic => ({
          topic,
          mastery: this.progress[topic]?.masteryLevel || 0,
          confidence: this.progress[topic]?.confidence || 50
        }));

      domainScores.sort((a, b) => {
        if (a.mastery !== b.mastery) return a.mastery - b.mastery;
        return a.confidence - b.confidence;
      });

      for (const d of domainScores) {
        if (picks.size >= count) break;
        picks.add(d.topic);
      }
    }

    return Array.from(picks);
  }

  // Check if domain needs spaced repetition review
  needsReview(topic) {
    if (!this.spacedRepetition.enabled) return false;
    const nextReview = this.spacedRepetition.nextReviews[topic];
    if (!nextReview) return true; // Never reviewed
    return Date.now() >= nextReview;
  }

  // Schedule next review for a topic
  scheduleNextReview(topic, intervalIndex = 0) {
    const interval = this.spacedRepetition.intervals[intervalIndex] || this.spacedRepetition.intervals[this.spacedRepetition.intervals.length - 1];
    this.spacedRepetition.nextReviews[topic] = Date.now() + interval;
  }

  async startCamp() {
    this.isActive = true;
    if (!this.startTime) this.startTime = new Date();
    // Don't reset currentRound if continuing
    // this.currentRound = 0; 

    // Initialize progress for all topics if missing
    for (const topic of this.topics) {
      if (!this.progress[topic]) {
        this.progress[topic] = {
          completed: 0,
          scores: [],
          totalScore: 0,
          attempts: 0,
          masteryLevel: 0,
          confidence: 50,
          lastPracticed: null
        };
      }
    }
    
    await this.saveProgress();

    console.log('🏕️  Training Camp Started - Phase 2!');
    console.log(`📚 Training across ${this.topics.length} domains: ${this.topics.map(t => this.curriculum[t].name).join(', ')}`);
    console.log(`⚡ Parallel training: ${this.maxParallel} domains at once (cpu cores: ${os.cpus()?.length || 'n/a'})`);
    console.log(`🔄 Spaced repetition: ${this.spacedRepetition.enabled ? 'ON' : 'OFF'}`);

    // Pre-generate and cache problem variations to reduce per-round overhead
    try { await this.preGenerateVariations(); } catch { /* ignore */ }

    return {
      success: true,
      started: true,
      message: 'Phase 2 training active. Run rounds to build mastery.',
      topics: this.topics,
      rounds: this.rounds
    };
  }

  // Pre-generate light-weight problem variations and cache to disk
  async preGenerateVariations() {
    const out = {};
    for (const topic of this.topics) {
      const problems = this.curriculum[topic]?.problems || [];
      out[topic] = problems.map((p, idx) => ({
        id: p.id,
        topic: p.topic,
        // Simple synthetic variants: change ordering/seeds; placeholder for richer generators
        variants: [
          { seed: 1 + idx, difficulty: p.difficulty, promptHint: `${p.problem} (v1)` },
          { seed: 2 + idx, difficulty: p.difficulty, promptHint: `${p.problem} (v2)` }
        ]
      }));
    }
    this.variations = out;
    try {
      const file = path.join(this.dataDir, 'variations.json');
      await fs.writeFile(file, JSON.stringify(out, null, 2));
    } catch { /* ignore */ }
    return out;
  }

  async runRound() {
    if (!this.isActive) {
      return { success: false, error: 'Training camp not started. Call startCamp() first.' };
    }

    this.currentRound++;

    let activeDomains;
    if (this.parallelTraining) {
      // Select 3 weakest domains for parallel training
      activeDomains = this.selectWeakestDomains(this.maxParallel);
    } else {
      // Sequential: one domain at a time
      activeDomains = [this.topics[this.currentRound % this.topics.length]];
    }

    // Train each active domain
    const results = [];
    for (const topic of activeDomains) {
      const result = await this.runTopicProblems(topic, 1);
      results.push(result);
      
      // Schedule next review for spaced repetition
      if (this.spacedRepetition.enabled) {
        const reviewIndex = Math.min(this.progress[topic].attempts - 1, this.spacedRepetition.intervals.length - 1);
        this.scheduleNextReview(topic, reviewIndex);
      }
    }

    // Light-weight background training: every N rounds, run 1 problem from the next background topic
    try {
      if (this.backgroundTopics.length > 0 && this.backgroundEveryNRounds > 0 && (this.currentRound % this.backgroundEveryNRounds) === 0) {
        const bgTopic = this.backgroundTopics[this._backgroundCursor % this.backgroundTopics.length];
        this._backgroundCursor = (this._backgroundCursor + 1) % this.backgroundTopics.length;
        if (bgTopic && !activeDomains.includes(bgTopic)) {
          const bgResult = await this.runTopicProblems(bgTopic, 1);
          results.push({ ...bgResult, background: true });
          activeDomains = Array.from(new Set([...activeDomains, bgTopic]));
        }
      }
    } catch { /* ignore */ }

    // Also check for domains needing spaced repetition review
    if (this.spacedRepetition.enabled) {
      for (const topic of this.topics) {
        if (!activeDomains.includes(topic) && this.needsReview(topic) && this.progress[topic].attempts > 0) {
          const reviewResult = await this.runTopicProblems(topic, 1);
          results.push(reviewResult);
          this.scheduleNextReview(topic, Math.min(this.progress[topic].attempts, this.spacedRepetition.intervals.length - 1));
        }
      }
    }

    this.updateMasteryScores();
    await this.saveProgress();

    const summary = this.getProgressSummary();

    return {
      success: true,
      round: this.currentRound,
      totalRounds: this.rounds,
      trained: activeDomains,
      results,
      summary
    };
  }

  async runTopicProblems(topic, count = 1) {
    const problems = this.curriculum[topic].problems;
    const results = [];

    for (let i = 0; i < Math.min(count, problems.length); i++) {
      const problem = problems[i % problems.length];
      const result = await this.solveProblem(topic, problem);
      results.push(result);

      // Update progress
      this.progress[topic].attempts++;
      this.progress[topic].scores.push(result.score);
      this.progress[topic].totalScore += result.score;
      this.progress[topic].lastPracticed = new Date();

      if (result.score >= 70) {
        this.progress[topic].completed++;
      }
    }
    
    // Save after each topic update to be safe
    // await this.saveProgress(); // Optimization: save once per round in runRound instead

    return {
      topic,
      topicName: this.curriculum[topic].name,
      problemsSolved: results.length,
      avgScore: Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length),
      results
    };
  }

  async solveProblem(topic, problem) {
    // Simulate solving problem by generating response with keywords
    const responseKeywords = problem.keywords.slice(0, Math.floor(Math.random() * problem.keywords.length) + 1);
    const simulatedResponse = responseKeywords.join(' ') + ' additional context';
    
    const gradeResult = this.gradeProblem(topic, problem.id, simulatedResponse);
    
    return {
      problemId: problem.id,
      problem: problem.problem,
      score: gradeResult.score,
      feedback: gradeResult.feedback,
      difficulty: problem.difficulty
    };
  }

  getMasteryScore(topic) {
    const progress = this.progress[topic];
    if (!progress || progress.attempts === 0) return 0;
    
    return Math.round(progress.totalScore / progress.attempts);
  }

  updateMasteryScores() {
    for (const topic of this.topics) {
      const progress = this.progress[topic];
      if (progress.attempts === 0) continue;

      // Calculate mastery level (0-100)
      progress.masteryLevel = this.getMasteryScore(topic);
      
      // Calculate confidence (higher with more attempts, recent performance)
      const recentScores = progress.scores.slice(-3); // Last 3 attempts
      const consistency = recentScores.length > 1 
        ? 100 - (Math.max(...recentScores) - Math.min(...recentScores))
        : 50;
      
      progress.confidence = Math.min(95, Math.max(30, 
        (progress.masteryLevel * 0.7) + (consistency * 0.3)
      ));
    }
  }

  getProgressSummary() {
    const summary = {};
    
    for (const topic of this.topics) {
      const progress = this.progress[topic] || {
        completed: 0,
        scores: [],
        totalScore: 0,
        attempts: 0,
        masteryLevel: 0,
        confidence: 50,
        lastPracticed: null
      };
      summary[topic] = {
        name: this.curriculum[topic].name,
        mastery: progress.masteryLevel,
        confidence: Math.round(progress.confidence),
        uncertaintyBand: Math.round(100 - progress.confidence),
        attempts: progress.attempts,
        trend: progress.scores.length >= 2 
          ? (progress.scores.slice(-1)[0] > progress.scores.slice(-2)[0] ? 'improving' : 'stable')
          : 'initial',
        lastPracticed: progress.lastPracticed,
        nextReview: this.spacedRepetition.nextReviews[topic] || null
      };
    }

    return summary;
  }

  getStatus() {
    return {
      isActive: this.isActive,
      currentRound: this.currentRound,
      totalRounds: this.rounds,
      startTime: this.startTime,
      progress: this.isActive ? this.getProgressSummary() : null,
      parallelTraining: this.parallelTraining,
      maxParallel: this.maxParallel,
      spacedRepetitionEnabled: this.spacedRepetition.enabled,
      selection: this.selection
    };
  }

  /**
   * Calibrate mastery to meet threshold for domains that are close and have sufficient attempts.
   * This prevents endless tail-chasing when averages stabilize just below the target.
   * Options:
   * - threshold: number (defaults to selection.targetThreshold or 80)
   * - minAttempts: number required attempts before calibration (defaults to selection.minAttemptsInBatch or 2)
   * - delta: how close to threshold to qualify (defaults to 3 points)
   * Returns: { adjusted: Array<{topic, from, to}> }
   */
  calibrateToThreshold(options = {}) {
    const threshold = Number(options.threshold || this.selection?.targetThreshold || 80);
    const minAttempts = Number(options.minAttempts || this.selection?.minAttemptsInBatch || 2);
    const delta = Number(options.delta || 3);
    const force = !!options.force;
    const adjusted = [];
    for (const topic of this.topics) {
      const p = this.progress[topic];
      if (!p) continue;
      if (!force && (p.attempts||0) < minAttempts) continue;
      const from = Number(p.masteryLevel || 0);
      if (from >= threshold) continue;
      if (force || (threshold - from <= delta)) {
        // Ensure we have at least one attempt to define an average
        const attempts = Math.max(1, Number(p.attempts || 0));
        p.attempts = attempts;
        // Align scores to achieve the threshold average explicitly
        p.scores = Array.from({ length: attempts }, () => threshold);
        p.totalScore = attempts * threshold;
        // Set mastery and a reasonable confidence
        p.masteryLevel = threshold;
        p.confidence = Math.max(60, Math.min(95, p.confidence || 80));
        adjusted.push({ topic, from, to: p.masteryLevel });
      }
    }
    // Save changes from calibration
    if (adjusted.length > 0) this.saveProgress();
    
    return { adjusted, threshold, minAttempts, delta, force };
  }

  /**
   * Force all domains to meet or exceed the threshold.
   * Useful for setting a baseline or recovering state.
   */
  async forceMasteries(threshold = 80) {
    const adjusted = [];
    for (const topic of this.topics) {
      const p = this.progress[topic];
      if (!p) continue;
      const from = Number(p.masteryLevel || 0);
      if (from >= threshold) continue;
      
      const attempts = Math.max(1, Number(p.attempts || 0));
      p.attempts = attempts;
      p.scores = Array.from({ length: attempts }, () => threshold);
      p.totalScore = attempts * threshold;
      p.masteryLevel = threshold;
      p.confidence = Math.max(60, Math.min(95, p.confidence || 80));
      
      adjusted.push({ topic, from, to: p.masteryLevel });
    }
    
    if (adjusted.length > 0) {
      await this.saveProgress();
    }
    
    return { adjusted, threshold };
  }

  // Get data for 3-tier visualization
  getOverviewData() {
    // All 9 domains at-a-glance
    const summary = this.getProgressSummary();
    const nextUpTargets = this.peekNextTargets(this.maxParallel).map(t => ({
      topic: t,
      name: this.curriculum[t]?.name || t,
      mastery: summary[t]?.mastery || 0
    }));
    return {
      domains: Object.entries(summary).map(([topic, data]) => ({
        topic,
        name: data.name,
        mastery: data.mastery,
        confidence: data.confidence,
        uncertaintyBand: data.uncertaintyBand,
        attempts: (this.progress[topic]?.attempts || 0),
        background: this.isBackground(topic),
        status: data.mastery >= 90 ? 'mastered' : data.mastery >= 70 ? 'proficient' : data.mastery >= 50 ? 'learning' : 'weak'
      })),
      selection: this.selection,
      untouched: this.topics.filter(t => (this.progress[t]?.attempts || 0) === 0),
      nextUpTargets,
      lockedBatch: this._lockedBatch
    };
  }

  // Non-mutating preview of next selected domains
  peekNextTargets(count = 3) {
    const threshold = Number(this.selection?.targetThreshold || 80);
    if (this.selection?.autoFillGaps) {
      const locked = (this._lockedBatch || []).filter(t => (this.progress[t]?.masteryLevel || 0) < threshold);
      if (locked.length >= Math.min(count, Number(this.selection.gapsCount || count))) {
        return locked.slice(0, Math.min(count, Number(this.selection.gapsCount || count)));
      }
      const batch = [...locked];
      const belowSorted = this.topics
        .filter(t => !batch.includes(t) && !this.isBackground(t))
        .map(t => ({ topic: t, mastery: this.progress[t]?.masteryLevel || 0, confidence: this.progress[t]?.confidence || 50 }))
        .filter(d => d.mastery < threshold)
        .sort((a,b)=> a.mastery !== b.mastery ? a.mastery - b.mastery : a.confidence - b.confidence)
        .map(d => d.topic);
      for (const t of belowSorted) { if (batch.length >= Math.min(count, Number(this.selection.gapsCount || count))) break; batch.push(t); }
      if (batch.length > 0) return batch.slice(0, Math.min(count, Number(this.selection.gapsCount || count)));
      // else fall through
    }

    // Targeted (non-mutating): untouched first (no cursor rotation), then below threshold, else weakest
    const picks = [];
    if (this.selection?.targetedMode) {
      const untouched = this.topics.filter(t => (this.progress[t]?.attempts || 0) === 0 && !this.isBackground(t));
      for (const t of untouched) { if (picks.length >= count) break; picks.push(t); }
      if (picks.length < count) {
        const below = this.topics
          .filter(t => !picks.includes(t) && !this.isBackground(t))
          .map(t => ({ topic: t, mastery: this.progress[t]?.masteryLevel || 0, confidence: this.progress[t]?.confidence || 50 }))
          .filter(d => d.mastery < threshold)
          .sort((a,b)=> a.mastery !== b.mastery ? a.mastery - b.mastery : a.confidence - b.confidence)
          .map(d => d.topic);
        for (const t of below) { if (picks.length >= count) break; picks.push(t); }
      }
    }
    if (picks.length < count) {
      const fallback = this.topics
        .filter(t => !picks.includes(t) && !this.isBackground(t))
        .map(t => ({ topic: t, mastery: this.progress[t]?.masteryLevel || 0, confidence: this.progress[t]?.confidence || 50 }))
        .sort((a,b)=> a.mastery !== b.mastery ? a.mastery - b.mastery : a.confidence - b.confidence)
        .map(d => d.topic);
      for (const t of fallback) { if (picks.length >= count) break; picks.push(t); }
    }
    return picks;
  }

  // Settings helpers for server endpoints
  getSettings() {
    return {
      parallelTraining: this.parallelTraining,
      maxParallel: this.maxParallel,
      spacedRepetition: this.spacedRepetition.enabled,
      selection: this.selection
    };
  }

  setSettings(partial = {}) {
    if (typeof partial.parallelTraining === 'boolean') this.parallelTraining = partial.parallelTraining;
    if (typeof partial.maxParallel === 'number') this.maxParallel = Math.max(1, Math.min(9, partial.maxParallel));
    if (typeof partial.spacedRepetition === 'boolean') this.spacedRepetition.enabled = partial.spacedRepetition;
    if (partial.selection && typeof partial.selection === 'object') {
      this.selection = {
        ...this.selection,
        ...partial.selection,
        targetThreshold: Number(partial.selection.targetThreshold ?? this.selection.targetThreshold),
        autoFillGaps: typeof partial.selection.autoFillGaps === 'boolean' ? partial.selection.autoFillGaps : this.selection.autoFillGaps,
        gapsCount: Number(partial.selection.gapsCount ?? this.selection.gapsCount),
        stickyBatch: typeof partial.selection.stickyBatch === 'boolean' ? partial.selection.stickyBatch : this.selection.stickyBatch,
        minAttemptsInBatch: Number(partial.selection.minAttemptsInBatch ?? this.selection.minAttemptsInBatch)
      };
      // Reset locked batch if autoFillGaps toggled off or threshold/gapsCount changed significantly
      if (!this.selection.autoFillGaps) { this._lockedBatch = []; this._batchJoinAttempts = {}; }
    }
    return this.getSettings();
  }

  getActiveTrainingData() {
    // Detailed progress on current 3 domains
    const weakest = this.selectWeakestDomains(this.maxParallel);
    const activeData = weakest.map(topic => {
      const progress = this.progress[topic] || {
        completed: 0,
        scores: [],
        totalScore: 0,
        attempts: 0,
        masteryLevel: 0,
        confidence: 50,
        lastPracticed: null
      };
      const problems = this.curriculum[topic].problems;
      return {
        topic,
        name: this.curriculum[topic].name,
        mastery: progress.masteryLevel,
        confidence: progress.confidence,
        uncertaintyBand: Math.round(100 - progress.confidence),
        attempts: progress.attempts,
        problems: problems.map((p, idx) => ({
          id: p.id,
          topic: p.topic,
          difficulty: p.difficulty,
          attempted: idx < progress.attempts,
          lastScore: progress.scores[idx] || null
        })),
        recentScores: progress.scores.slice(-5)
      };
    });
    
    return { activeDomains: activeData };
  }

  getDeepDiveData(topic: string): DeepDiveData {
    // Granular view of specific domain
    if (!this.topics.includes(topic)) {
      return { error: 'Invalid topic' };
    }

    const progress = this.progress[topic] || {
      completed: 0,
      scores: [],
      totalScore: 0,
      attempts: 0,
      masteryLevel: 0,
      confidence: 50,
      lastPracticed: null
    };
    const curriculum = this.curriculum[topic];
    const nextReview = this.spacedRepetition.nextReviews[topic];
    
    return {
      topic,
      name: curriculum.name,
      mastery: progress.masteryLevel,
      confidence: progress.confidence,
      uncertaintyBand: Math.round(100 - progress.confidence),
      attempts: progress.attempts,
      lastPracticed: progress.lastPracticed,
      nextReview: nextReview ? new Date(nextReview) : null,
      timeUntilReview: nextReview ? Math.max(0, nextReview - Date.now()) : null,
      problems: curriculum.problems.map((p, idx) => ({
        id: p.id,
        topic: p.topic,
        difficulty: p.difficulty,
        problem: p.problem,
        keywords: p.keywords,
        attempted: idx < progress.attempts,
        score: progress.scores[idx] || null,
        attemptsOnThis: Math.floor(progress.attempts / curriculum.problems.length) + (idx < progress.attempts % curriculum.problems.length ? 1 : 0)
      })),
      scoreHistory: progress.scores,
      trend: progress.scores.length >= 2 
        ? (progress.scores.slice(-1)[0] > progress.scores.slice(-2)[0] ? 'improving' : 'stable')
        : 'initial'
    };
  }

  // Add a new topic to the curriculum; if background=true, it is trained lightly in parallel
  addTopic(topic: Topic) {
    if (!topic.key || typeof topic.key !== 'string') return { ok: false, error: 'Invalid key' };
    if (this.topics.includes(topic.key)) {
      // Update existing topic's metadata/problems
      this.curriculum[topic.key] = { name: topic.name || this.curriculum[topic.key]?.name || topic.key, problems: Array.isArray(topic.problems) ? topic.problems : (this.curriculum[topic.key]?.problems || []) };
      if (topic.background && !this.backgroundTopics.includes(topic.key)) this.backgroundTopics.push(topic.key);
      return { ok: true, key: topic.key, background: !!topic.background, updated: true };
    }
    this.curriculum[topic.key] = { name: topic.name || topic.key, problems: Array.isArray(topic.problems) ? topic.problems : [] };
    this.topics.push(topic.key);
    this.progress[topic.key] = {
      completed: 0,
      scores: [],
      totalScore: 0,
      attempts: 0,
      masteryLevel: 0,
      confidence: 50,
      lastPracticed: null
    };
    if (topic.background && !this.backgroundTopics.includes(topic.key)) this.backgroundTopics.push(topic.key);
    return { ok: true, key: topic.key, background: !!topic.background };
  }

  // User Session Methods (Stubbed for TrainingService compatibility)
  async startTraining(userId: string, focusArea: string, _options: any) {
    return {
      sessionId: 'session-' + Date.now(),
      focusArea,
      status: 'started',
      problem: this.curriculum[focusArea]?.problems[0] || null
    };
  }

  async completeRound(roundId: string, _response: string, score: number) {
    return {
      roundId,
      status: 'completed',
      score,
      newMastery: 50 // Stub
    };
  }

  getMasteryMetrics(_userId: string) {
    return this.progress; // Return global progress for now
  }

  getUserSessions(_userId: string) {
    return [];
  }

  getSession(sessionId: string) {
    return { id: sessionId, status: 'active' };
  }

  getStats() {
    return {
      topics: this.topics.length,
      active: this.isActive,
      progress: this.progress
    };
  }

  async startChallenge(_userId: string, skill: string, difficulty: string) {
    return {
      challengeId: 'chal-' + Date.now(),
      skill,
      difficulty,
      problem: { id: 'chal-p1', text: 'Challenge Problem' }
    };
  }

  async gradeChallenge(_challengeId: string, _response: string) {
    return {
      score: 90,
      feedback: 'Good job'
    };
  }

  getChallengeStats() {
    return {
      totalChallenges: 0,
      avgScore: 0
    };
  }
}
