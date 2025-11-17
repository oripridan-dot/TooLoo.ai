#!/usr/bin/env node
/**
 * Knowledge Base Initialization Script
 * Loads foundational knowledge into TooLoo.ai's learning system
 * Provides baseline concepts for training and meta-learning engines
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class KnowledgeBaseInitializer {
  constructor() {
    this.workspaceRoot = process.cwd();
    this.knowledgeDir = path.join(this.workspaceRoot, 'data', 'knowledge');
    this.trainingDataDir = path.join(this.workspaceRoot, 'data', 'training-camp');
    this.metaLearningDir = path.join(this.workspaceRoot, 'data', 'meta-learning');
    this.results = {
      loaded: [],
      initialized: [],
      errors: []
    };
  }

  async init() {
    console.log('🧠 TooLoo.ai Knowledge Base Initialization');
    console.log('━'.repeat(50));
    
    try {
      // Ensure directories exist
      await this.ensureDirectories();
      
      // Load foundational knowledge
      const bibliography = await this.loadFile('bibliography.json');
      const principles = await this.loadFile('core-principles.json');
      
      if (bibliography && principles) {
        console.log('✅ Loaded foundational knowledge files');
        this.results.loaded.push('bibliography.json', 'core-principles.json');
      }

      // Initialize baseline data
      await this.initializeBaselineMetrics();
      await this.initializeKnowledgeIndex(bibliography, principles);
      await this.initializeTrainingBaseline();
      
      this.printSummary();
      return this.results;
    } catch (error) {
      console.error('❌ Initialization failed:', error.message);
      this.results.errors.push(error.message);
      throw error;
    }
  }

  async ensureDirectories() {
    const dirs = [this.knowledgeDir, this.trainingDataDir, this.metaLearningDir];
    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (e) {
        // Silent fail - directory may already exist
      }
    }
  }

  async loadFile(filename) {
    const filepath = path.join(this.knowledgeDir, filename);
    try {
      const content = await fs.readFile(filepath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.warn(`⚠️  Could not load ${filename}: ${error.message}`);
      return null;
    }
  }

  async initializeBaselineMetrics() {
    const metricsFile = path.join(this.metaLearningDir, 'baseline-metrics.json');
    const metrics = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      description: 'Baseline learning metrics for TooLoo.ai',
      baseline_levels: {
        beginner: {
          learning_velocity: 0.35,
          adaptation_speed: 0.30,
          knowledge_retention: 0.40,
          transfer_efficiency: 0.25
        },
        intermediate: {
          learning_velocity: 0.65,
          adaptation_speed: 0.60,
          knowledge_retention: 0.70,
          transfer_efficiency: 0.55
        },
        expert: {
          learning_velocity: 0.95,
          adaptation_speed: 0.90,
          knowledge_retention: 0.85,
          transfer_efficiency: 0.80
        }
      },
      improvement_targets: {
        daily_goal: { learning_velocity: 0.02, adaptation_speed: 0.01 },
        weekly_goal: { knowledge_retention: 0.05, transfer_efficiency: 0.03 },
        monthly_goal: { overall_improvement: 0.20 }
      }
    };

    await fs.writeFile(metricsFile, JSON.stringify(metrics, null, 2));
    console.log('✅ Initialized baseline metrics');
    this.results.initialized.push('baseline-metrics.json');
  }

  async initializeKnowledgeIndex(bibliography, principles) {
    if (!bibliography) return;

    const indexFile = path.join(this.knowledgeDir, 'knowledge-index.json');
    const domains = Object.keys(bibliography.domains || {});
    
    const index = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      description: 'Index of available knowledge domains and learning materials',
      domains_available: domains.length,
      domains: domains.map(domain => ({
        name: domain,
        full_name: bibliography.domains[domain]?.name || domain,
        concepts: (bibliography.domains[domain]?.core_concepts || []).length,
        references: (bibliography.domains[domain]?.references || []).length
      })),
      total_references: Object.values(bibliography.domains || {}).reduce(
        (sum, domain) => sum + (domain.references?.length || 0), 
        0
      ),
      fundamental_principles: Object.keys(bibliography.fundamental_principles || {}).length,
      learning_strategies: Object.keys(bibliography.learning_strategies || {}).length
    };

    await fs.writeFile(indexFile, JSON.stringify(index, null, 2));
    console.log(`✅ Created knowledge index (${domains.length} domains)`);
    this.results.initialized.push('knowledge-index.json');
  }

  async initializeTrainingBaseline() {
    const baselineFile = path.join(this.trainingDataDir, 'baseline-curriculum.json');
    
    const baseline = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      description: 'Baseline curriculum for initial training',
      domains: {
        data_structures_algorithms: {
          name: 'Data Structures & Algorithms',
          status: 'ready',
          problem_count: 3,
          difficulty_distribution: { easy: 1, medium: 1, hard: 1 }
        },
        operating_systems: {
          name: 'Operating Systems',
          status: 'ready',
          problem_count: 3,
          difficulty_distribution: { easy: 1, medium: 1, hard: 1 }
        },
        computer_networks: {
          name: 'Computer Networks',
          status: 'ready',
          problem_count: 3,
          difficulty_distribution: { easy: 1, medium: 1, hard: 1 }
        },
        databases: {
          name: 'Databases',
          status: 'ready',
          problem_count: 3,
          difficulty_distribution: { easy: 1, medium: 1, hard: 1 }
        },
        machine_learning: {
          name: 'Machine Learning',
          status: 'ready',
          problem_count: 3,
          difficulty_distribution: { easy: 1, medium: 1, hard: 1 }
        },
        security: {
          name: 'Security',
          status: 'ready',
          problem_count: 3,
          difficulty_distribution: { easy: 1, medium: 1, hard: 1 }
        },
        compilers: {
          name: 'Compilers',
          status: 'ready',
          problem_count: 3,
          difficulty_distribution: { easy: 1, medium: 1, hard: 1 }
        },
        theory: {
          name: 'Theory of Computation',
          status: 'ready',
          problem_count: 3,
          difficulty_distribution: { easy: 1, medium: 1, hard: 1 }
        },
        distributed_systems: {
          name: 'Distributed Systems',
          status: 'ready',
          problem_count: 3,
          difficulty_distribution: { easy: 1, medium: 1, hard: 1 }
        }
      },
      total_domains: 9,
      total_problems: 27,
      spaced_repetition_enabled: true,
      recommended_intervals: [1800000, 7200000, 28800000],
      curriculum_notes: 'Initial baseline covers 9 CS domains with 3 problems each (easy, medium, hard). Spaced repetition enabled for optimal retention.'
    };

    await fs.writeFile(baselineFile, JSON.stringify(baseline, null, 2));
    console.log('✅ Initialized training baseline curriculum');
    this.results.initialized.push('baseline-curriculum.json');
  }

  printSummary() {
    console.log('\n📊 Initialization Summary');
    console.log('━'.repeat(50));
    console.log(`Files loaded: ${this.results.loaded.length}`);
    this.results.loaded.forEach(f => console.log(`  • ${f}`));
    
    console.log(`\nBaseline data initialized: ${this.results.initialized.length}`);
    this.results.initialized.forEach(f => console.log(`  • ${f}`));

    if (this.results.errors.length > 0) {
      console.log(`\nErrors encountered: ${this.results.errors.length}`);
      this.results.errors.forEach(e => console.log(`  • ${e}`));
    }

    console.log('\n✅ Knowledge Base Initialization Complete');
    console.log('━'.repeat(50));
    console.log('Next steps:');
    console.log('  1. Start meta-server: npm run start:meta');
    console.log('  2. Start training-server: npm run start:training');
    console.log('  3. Run meta-learning phases: curl -X POST http://localhost:3002/api/v4/meta-learning/run-all');
    console.log('  4. Start training round: curl -X POST http://localhost:3001/api/v1/training/start-round');
  }
}

// Run initialization
const initializer = new KnowledgeBaseInitializer();
try {
  const results = await initializer.init();
  process.exit(0);
} catch (error) {
  console.error('Fatal error:', error);
  process.exit(1);
}
