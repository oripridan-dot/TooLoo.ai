// Product Workflow Orchestrator Implementation
// Integrates all TooLoo capabilities into systematic product development processes

const fs = require('fs').promises;
const path = require('path');
const { DynamicLearningEngine } = require('./dynamic-learning-engine');
const { BookWormAnalysisEngine } = require('./bookworm-analysis-engine');
const { ArtifactGenerationEngine } = require('./artifact-generation-engine');

class ProductWorkflowOrchestrator {
  constructor() {
    // Initialize core engines
    this.learningEngine = new DynamicLearningEngine();
    this.bookwormEngine = new BookWormAnalysisEngine(this.learningEngine);
    this.artifactEngine = new ArtifactGenerationEngine(this.learningEngine, this.bookwormEngine);
    
    // Workflow management
    this.activeWorkflows = new Map();
    this.workflowTemplates = new Map();
    this.qualityGates = new Map();
    this.workflowHistory = [];
    
    this.initializeWorkflowTemplates();
    this.initializeQualityGates();
  }

  // Main workflow orchestration interface
  async startProductWorkflow(type, requirements, options = {}) {
    console.log(`🚀 Starting ${type} product workflow`);

    try {
      const workflowId = this.generateWorkflowId();
      const template = this.workflowTemplates.get(type);
      
      if (!template) {
        throw new Error(`Unknown workflow type: ${type}. Available: ${Array.from(this.workflowTemplates.keys()).join(', ')}`);
      }

      // Prepare required capabilities for this workflow
      await this.prepareWorkflowCapabilities(type, requirements);

      // Initialize workflow state
      const workflow = {
        id: workflowId,
        type: type,
        requirements: requirements,
        options: options,
        state: 'initializing',
        currentPhase: null,
        phases: template.phases.map(phase => ({
          ...phase,
          status: 'pending',
          startedAt: null,
          completedAt: null,
          artifacts: [],
          qualityScore: null,
          tasks: phase.tasks.map(task => ({ ...task, status: 'pending', result: null }))
        })),
        startedAt: new Date().toISOString(),
        artifacts: new Map(),
        metrics: new Map(),
        risks: [],
        decisions: [],
        progress: 0
      };

      this.activeWorkflows.set(workflowId, workflow);

      // Start execution
      const startResult = await this.startNextPhase(workflowId);

      console.log(`✅ Workflow ${workflowId} started successfully`);
      return { 
        workflowId, 
        status: 'started', 
        currentPhase: workflow.currentPhase,
        nextActions: startResult.nextActions 
      };

    } catch (error) {
      console.error(`❌ Failed to start ${type} workflow:`, error.message);
      throw error;
    }
  }

  // Execute workflow phases systematically  
  async executeWorkflowPhase(workflowId, phaseName = null) {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    // If no phase specified, use current phase
    const targetPhase = phaseName || workflow.currentPhase;
    const phase = workflow.phases.find(p => p.name === targetPhase);
    
    if (!phase) {
      throw new Error(`Phase ${targetPhase} not found in workflow`);
    }

    console.log(`⚡ Executing ${workflow.type} workflow - Phase: ${targetPhase}`);
    
    try {
      phase.status = 'executing';
      phase.startedAt = new Date().toISOString();
      workflow.state = 'executing-phase';

      // Execute all phase tasks
      const phaseResults = await this.runPhaseTasks(workflow, phase);

      // Validate phase completion through quality gates
      const qualityValidation = await this.validatePhaseQuality(workflow, phase, phaseResults);

      // Update phase status
      phase.status = qualityValidation.passed ? 'completed' : 'quality-gate-failed';
      phase.completedAt = new Date().toISOString();
      phase.qualityScore = qualityValidation.score;
      phase.qualityFeedback = qualityValidation.feedback;

      // Store phase results
      workflow.artifacts.set(targetPhase, phaseResults.artifacts);
      workflow.metrics.set(targetPhase, phaseResults.metrics);
      
      if (!qualityValidation.passed) {
        await this.handleQualityGateFailure(workflow, phase, qualityValidation);
      }

      // Update workflow progress
      workflow.progress = this.calculateProgress(workflow);

      // Check if workflow is complete
      if (this.isWorkflowComplete(workflow)) {
        await this.completeWorkflow(workflow);
      } else {
        await this.startNextPhase(workflowId);
      }

      console.log(`✅ Phase ${targetPhase} completed with quality score: ${qualityValidation.score.toFixed(2)}`);
      
      return {
        workflowId,
        phase: targetPhase,
        status: phase.status,
        qualityScore: qualityValidation.score,
        artifactsGenerated: phaseResults.artifacts.length,
        nextPhase: this.getNextPhase(workflow)?.name,
        progress: workflow.progress
      };

    } catch (error) {
      phase.status = 'failed';
      phase.error = error.message;
      phase.completedAt = new Date().toISOString();
      
      console.error(`❌ Phase ${targetPhase} failed:`, error.message);
      
      // Add to workflow risks for visibility
      workflow.risks.push({
        type: 'phase-failure',
        phase: targetPhase,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  }

  // Run all tasks within a phase
  async runPhaseTasks(workflow, phase) {
    console.log(`🔄 Running ${phase.tasks.length} tasks for phase: ${phase.name}`);
    
    const results = {
      tasks: [],
      artifacts: [],
      metrics: {},
      insights: [],
      risks: []
    };

    for (const task of phase.tasks) {
      console.log(`  • Executing: ${task.name}`);
      
      try {
        task.status = 'executing';
        task.startedAt = new Date().toISOString();
        
        const taskResult = await this.executeTask(workflow, task);
        
        task.status = 'completed';
        task.completedAt = new Date().toISOString();
        task.result = taskResult;
        
        results.tasks.push(taskResult);
        
        // Collect artifacts from task
        if (taskResult.artifact) {
          results.artifacts.push(taskResult.artifact);
        }
        
        // Aggregate metrics
        if (taskResult.metrics) {
          Object.assign(results.metrics, taskResult.metrics);
        }
        
        // Collect insights
        if (taskResult.insights) {
          results.insights.push(...taskResult.insights);
        }

        console.log(`    ✅ ${task.name} completed`);
        
      } catch (error) {
        task.status = 'failed';
        task.error = error.message;
        task.completedAt = new Date().toISOString();
        
        results.risks.push({
          type: 'task-failure',
          task: task.name,
          error: error.message
        });
        
        console.error(`    ❌ ${task.name} failed:`, error.message);
        // Continue with other tasks unless it's a critical failure
        if (task.critical) {
          throw error;
        }
      }
    }

    return results;
  }

  // Execute individual tasks using appropriate engines
  async executeTask(workflow, task) {
    const { type, parameters, name } = task;
    
    switch (type) {
      case 'market-analysis':
        return await this.executeMarketAnalysisTask(workflow, parameters, name);
      
      case 'technical-assessment':
        return await this.executeTechnicalAssessmentTask(workflow, parameters, name);
      
      case 'artifact-generation':
        return await this.executeArtifactGenerationTask(workflow, parameters, name);
      
      case 'learning-acquisition':
        return await this.executeLearningAcquisitionTask(workflow, parameters, name);
      
      case 'quality-validation':
        return await this.executeQualityValidationTask(workflow, parameters, name);
      
      case 'design-research':
        return await this.executeDesignResearchTask(workflow, parameters, name);
      
      default:
        console.warn(`Unknown task type: ${type}, executing as generic task`);
        return await this.executeGenericTask(workflow, task);
    }
  }

  // Specific task execution methods
  async executeMarketAnalysisTask(workflow, parameters, taskName) {
    // Prepare market analysis document content
    const marketContext = `
      Market Analysis Request for: ${workflow.requirements.productName || 'Product'}
      Industry: ${workflow.requirements.industry || 'General'}
      Target Market: ${workflow.requirements.targetMarket || 'General Consumer'}
      Geographic Scope: ${workflow.requirements.geography || 'Global'}
    `;

    const analysis = await this.bookwormEngine.analyzeDocument(marketContext, {
      type: 'market-analysis',
      mode: 'comprehensive',
      context: { 
        industry: workflow.requirements.industry,
        projectType: workflow.type
      }
    });

    return {
      type: 'market-analysis',
      taskName,
      result: analysis,
      metrics: {
        analysisQuality: analysis.metadata.qualityScore,
        recommendationCount: analysis.feedback.recommendations.length,
        riskFactors: analysis.feedback.riskMitigation?.length || 0
      },
      insights: analysis.feedback.recommendations.slice(0, 3), // Top 3 recommendations
      artifact: analysis.artifacts?.[0] || null
    };
  }

  async executeArtifactGenerationTask(workflow, parameters, taskName) {
    const artifact = await this.artifactEngine.generateArtifact(
      parameters.artifactType,
      {
        ...workflow.requirements,
        workflowContext: workflow.type,
        phaseContext: parameters.phase || 'general',
        projectName: workflow.requirements.productName || workflow.requirements.projectName
      },
      parameters.quality || 'production'
    );

    return {
      type: 'artifact-generation',
      taskName,
      artifact,
      metrics: {
        artifactType: parameters.artifactType,
        qualityLevel: parameters.quality || 'production',
        filesGenerated: artifact.files?.length || 1,
        deliverables: artifact.deliverables?.length || 1
      }
    };
  }

  async executeLearningAcquisitionTask(workflow, parameters, taskName) {
    const skill = await this.learningEngine.acquireSkill(
      parameters.skillName,
      {
        workflow: workflow.type,
        project: workflow.requirements.productType || workflow.requirements.industry,
        urgency: 'immediate'
      }
    );

    return {
      type: 'learning-acquisition',
      taskName,
      skill,
      metrics: {
        skillName: parameters.skillName,
        proficiencyAchieved: skill.proficiency,
        confidenceLevel: skill.confidence,
        applicationsIdentified: skill.applications?.length || 0
      },
      insights: [`Acquired ${skill.proficiency} level proficiency in ${parameters.skillName}`]
    };
  }

  async executeTechnicalAssessmentTask(workflow, parameters, taskName) {
    // Technical feasibility analysis
    const requirements = workflow.requirements;
    const technicalSpec = {
      complexity: this.assessTechnicalComplexity(requirements),
      feasibility: this.assessTechnicalFeasibility(requirements),
      risks: this.identifyTechnicalRisks(requirements),
      recommendations: this.generateTechnicalRecommendations(requirements)
    };

    return {
      type: 'technical-assessment',
      taskName,
      result: technicalSpec,
      metrics: {
        complexityScore: technicalSpec.complexity.score,
        feasibilityScore: technicalSpec.feasibility.score,
        riskCount: technicalSpec.risks.length,
        recommendationCount: technicalSpec.recommendations.length
      },
      insights: technicalSpec.recommendations.slice(0, 2)
    };
  }

  async executeQualityValidationTask(workflow, parameters, taskName) {
    // Validate current workflow state and artifacts
    const validation = {
      artifactQuality: this.validateArtifactQuality(workflow),
      processCompliance: this.validateProcessCompliance(workflow),
      riskAssessment: this.assessCurrentRisks(workflow),
      recommendations: this.generateQualityRecommendations(workflow)
    };

    return {
      type: 'quality-validation',
      taskName,
      result: validation,
      metrics: {
        overallQuality: validation.artifactQuality.average,
        complianceScore: validation.processCompliance.score,
        riskLevel: validation.riskAssessment.level,
        improvementOpportunities: validation.recommendations.length
      }
    };
  }

  async executeDesignResearchTask(workflow, parameters, taskName) {
    // Design research and user experience analysis
    const designContext = `
      Design Research for: ${workflow.requirements.productName}
      Target Users: ${workflow.requirements.targetUsers || 'General Users'}
      Platform: ${workflow.requirements.platform || 'Web/Mobile'}
      Use Cases: ${workflow.requirements.useCases || 'Standard functionality'}
    `;

    const designAnalysis = await this.bookwormEngine.analyzeDocument(designContext, {
      type: 'design-research',
      mode: 'focused',
      context: { 
        userTypes: workflow.requirements.targetUsers,
        platform: workflow.requirements.platform
      }
    });

    return {
      type: 'design-research',
      taskName,
      result: designAnalysis,
      metrics: {
        designQuality: designAnalysis.metadata.qualityScore,
        userInsights: designAnalysis.feedback.recommendations.length,
        designPrinciples: 5 // Standard design principles applied
      },
      artifact: designAnalysis.artifacts?.[0] || null
    };
  }

  async executeGenericTask(workflow, task) {
    // Fallback for unknown task types
    console.log(`Executing generic task: ${task.name}`);
    
    return {
      type: 'generic',
      taskName: task.name,
      result: { status: 'completed', note: 'Generic task execution' },
      metrics: { completed: true }
    };
  }

  // Quality gate validation
  async validatePhaseQuality(workflow, phase, phaseResults) {
    const qualityGate = this.qualityGates.get(workflow.type)?.[phase.name];
    
    if (!qualityGate) {
      console.log(`No quality gate defined for ${workflow.type}.${phase.name}, using default validation`);
      return { 
        passed: true, 
        score: 0.8, 
        feedback: 'Default validation - no specific quality gate defined' 
      };
    }

    const criteriaResults = [];
    let totalScore = 0;

    for (const [criterion, threshold] of Object.entries(qualityGate.criteria)) {
      const score = await this.evaluateQualityCriterion(workflow, phase, phaseResults, criterion);
      const passed = score >= threshold;
      
      criteriaResults.push({
        criterion,
        score,
        threshold,
        passed,
        gap: passed ? 0 : threshold - score
      });

      totalScore += score;
    }

    const averageScore = totalScore / criteriaResults.length;
    const overallPassed = criteriaResults.every(result => result.passed);
    const failedCriteria = criteriaResults.filter(result => !result.passed);

    return {
      passed: overallPassed,
      score: averageScore,
      criteria: criteriaResults,
      failedCriteria,
      feedback: this.generateQualityFeedback(criteriaResults, qualityGate)
    };
  }

  async evaluateQualityCriterion(workflow, phase, phaseResults, criterion) {
    // Evaluate specific quality criteria
    switch (criterion) {
      case 'marketValidation':
        return this.evaluateMarketValidation(phaseResults);
      case 'technicalFeasibility':
        return this.evaluateTechnicalFeasibility(phaseResults);
      case 'documentationQuality':
        return this.evaluateDocumentationQuality(phaseResults);
      case 'businessModelClarity':
        return this.evaluateBusinessModelClarity(phaseResults);
      case 'designQuality':
        return this.evaluateDesignQuality(phaseResults);
      default:
        // Default scoring based on task completion and artifact quality
        const completedTasks = phase.tasks.filter(t => t.status === 'completed').length;
        const taskCompletionRate = completedTasks / phase.tasks.length;
        const artifactQuality = phaseResults.artifacts.length > 0 ? 0.8 : 0.6;
        return (taskCompletionRate + artifactQuality) / 2;
    }
  }

  // Quality evaluation methods
  evaluateMarketValidation(phaseResults) {
    const marketAnalysis = phaseResults.tasks.find(t => t.type === 'market-analysis');
    if (!marketAnalysis) return 0.5;
    
    return marketAnalysis.metrics?.analysisQuality || 0.7;
  }

  evaluateTechnicalFeasibility(phaseResults) {
    const techAssessment = phaseResults.tasks.find(t => t.type === 'technical-assessment');
    if (!techAssessment) return 0.5;
    
    return techAssessment.metrics?.feasibilityScore || 0.7;
  }

  evaluateDocumentationQuality(phaseResults) {
    const artifactCount = phaseResults.artifacts.length;
    const expectedArtifacts = 2; // Minimum expected per phase
    
    return Math.min(artifactCount / expectedArtifacts, 1.0);
  }

  evaluateBusinessModelClarity(phaseResults) {
    const businessPlan = phaseResults.artifacts.find(a => a.type?.includes('business'));
    return businessPlan ? 0.85 : 0.6;
  }

  evaluateDesignQuality(phaseResults) {
    const designArtifacts = phaseResults.artifacts.filter(a => 
      a.type?.includes('design') || a.type?.includes('ui')
    );
    return designArtifacts.length > 0 ? 0.8 : 0.5;
  }

  // Workflow management methods
  async prepareWorkflowCapabilities(workflowType, requirements) {
    console.log(`🧠 Preparing capabilities for ${workflowType} workflow`);
    
    // Acquire core skills needed for this workflow type
    const coreSkills = this.getCoreWorkflowSkills(workflowType);
    
    for (const skill of coreSkills) {
      if (!this.learningEngine.hasSkill(skill)) {
        await this.learningEngine.acquireSkill(skill, {
          workflow: workflowType,
          urgency: 'high'
        });
      }
    }
  }

  getCoreWorkflowSkills(workflowType) {
    const skillMap = {
      'concept-to-market': ['market-analysis', 'business-strategy', 'product-management', 'technical-assessment'],
      'product-enhancement': ['product-analysis', 'user-research', 'performance-optimization'],
      'market-expansion': ['market-research', 'localization', 'competitive-analysis']
    };
    
    return skillMap[workflowType] || ['project-management', 'analysis'];
  }

  async startNextPhase(workflowId) {
    const workflow = this.activeWorkflows.get(workflowId);
    const nextPhase = workflow.phases.find(p => p.status === 'pending');
    
    if (nextPhase) {
      workflow.currentPhase = nextPhase.name;
      workflow.state = 'phase-ready';
      
      // Return next actions instead of auto-executing
      const nextActions = this.getPhaseActions(nextPhase);
      
      return {
        phase: nextPhase.name,
        actions: nextActions,
        readyToExecute: true
      };
    } else {
      workflow.state = 'completed';
      return { completed: true };
    }
  }

  getPhaseActions(phase) {
    return phase.tasks.map(task => ({
      type: task.type,
      name: task.name,
      description: task.description || `Execute ${task.name}`,
      estimated_duration: task.duration || '30-60 minutes'
    }));
  }

  // Initialize workflow templates
  initializeWorkflowTemplates() {
    // Concept-to-Market Workflow (Comprehensive)
    this.workflowTemplates.set('concept-to-market', {
      name: 'Concept-to-Market Product Development',
      description: 'Complete journey from idea to paying customers',
      estimatedDuration: '8-16 weeks',
      phases: [
        {
          name: 'discovery',
          title: 'Market Discovery & Validation',
          duration: '2 weeks',
          description: 'Validate market opportunity and technical feasibility',
          tasks: [
            {
              type: 'learning-acquisition',
              name: 'Market Analysis Expertise',
              parameters: { skillName: 'market-analysis' },
              critical: true
            },
            {
              type: 'market-analysis',
              name: 'Market Opportunity Assessment',
              parameters: { focus: 'opportunity-sizing' }
            },
            {
              type: 'technical-assessment',
              name: 'Technical Feasibility Analysis',
              parameters: { scope: 'feasibility' }
            },
            {
              type: 'artifact-generation',
              name: 'Discovery Report',
              parameters: { artifactType: 'discovery-report', quality: 'review' }
            }
          ]
        },
        {
          name: 'strategy',
          title: 'Strategic Planning & Architecture',
          duration: '2 weeks',
          description: 'Develop business strategy and technical architecture',
          tasks: [
            {
              type: 'learning-acquisition',
              name: 'Business Strategy Skills',
              parameters: { skillName: 'business-strategy' }
            },
            {
              type: 'artifact-generation',
              name: 'Business Plan Development',
              parameters: { artifactType: 'business-plan', quality: 'production' }
            },
            {
              type: 'artifact-generation',
              name: 'Technical Specification',
              parameters: { artifactType: 'technical-specification', quality: 'production' }
            },
            {
              type: 'artifact-generation',
              name: 'Marketing Strategy',
              parameters: { artifactType: 'marketing-strategy', quality: 'production' }
            }
          ]
        },
        {
          name: 'development',
          title: 'Product Development & Design',
          duration: '6 weeks',
          description: 'Build product with professional design system',
          tasks: [
            {
              type: 'design-research',
              name: 'User Experience Research',
              parameters: { focus: 'user-journey' }
            },
            {
              type: 'artifact-generation',
              name: 'Design System Creation',
              parameters: { artifactType: 'design-system', quality: 'production' }
            },
            {
              type: 'quality-validation',
              name: 'Development Oversight',
              parameters: { scope: 'mvp-development' }
            },
            {
              type: 'artifact-generation',
              name: 'Launch Preparation',
              parameters: { artifactType: 'launch-plan', quality: 'production' }
            }
          ]
        },
        {
          name: 'launch',
          title: 'Market Launch & Customer Acquisition',
          duration: '4 weeks',
          description: 'Execute go-to-market and acquire first customers',
          tasks: [
            {
              type: 'quality-validation',
              name: 'Launch Readiness Assessment',
              parameters: { scope: 'market-readiness' }
            },
            {
              type: 'market-analysis',
              name: 'Launch Strategy Validation',
              parameters: { focus: 'go-to-market' }
            },
            {
              type: 'artifact-generation',
              name: 'Performance Dashboard',
              parameters: { artifactType: 'analytics-dashboard', quality: 'production' }
            }
          ]
        },
        {
          name: 'scale',
          title: 'Growth & Optimization',
          duration: '2+ weeks',
          description: 'Scale operations and optimize for growth',
          tasks: [
            {
              type: 'market-analysis',
              name: 'Performance Analysis',
              parameters: { focus: 'growth-metrics' }
            },
            {
              type: 'artifact-generation',
              name: 'Scaling Strategy',
              parameters: { artifactType: 'scaling-plan', quality: 'production' }
            }
          ]
        }
      ]
    });

    // Rapid MVP Workflow (Streamlined)
    this.workflowTemplates.set('rapid-mvp', {
      name: 'Rapid MVP Development',
      description: 'Fast-track from concept to testable product',
      estimatedDuration: '2-4 weeks',
      phases: [
        {
          name: 'validate',
          title: 'Quick Validation',
          duration: '3 days',
          tasks: [
            {
              type: 'market-analysis',
              name: 'Rapid Market Check',
              parameters: { mode: 'rapid' }
            },
            {
              type: 'technical-assessment', 
              name: 'MVP Feasibility',
              parameters: { scope: 'mvp-only' }
            }
          ]
        },
        {
          name: 'build',
          title: 'MVP Development',
          duration: '2-3 weeks',
          tasks: [
            {
              type: 'artifact-generation',
              name: 'MVP Specification',
              parameters: { artifactType: 'mvp-spec', quality: 'review' }
            },
            {
              type: 'design-research',
              name: 'Basic UX Design',
              parameters: { scope: 'essential-flows' }
            }
          ]
        },
        {
          name: 'test',
          title: 'Market Testing',
          duration: '1 week',
          tasks: [
            {
              type: 'quality-validation',
              name: 'User Testing',
              parameters: { scope: 'basic-validation' }
            }
          ]
        }
      ]
    });
  }

  // Initialize quality gates for each workflow type
  initializeQualityGates() {
    this.qualityGates.set('concept-to-market', {
      discovery: {
        criteria: {
          marketValidation: 0.8,
          technicalFeasibility: 0.7,
          competitiveAnalysis: 0.75,
          documentationQuality: 0.8
        },
        description: 'Market opportunity must be validated with high confidence'
      },
      strategy: {
        criteria: {
          businessModelClarity: 0.85,
          technicalArchitecture: 0.8,
          marketingStrategy: 0.8,
          financialProjections: 0.75
        },
        description: 'Strategic foundation must be solid for execution'
      },
      development: {
        criteria: {
          designQuality: 0.85,
          technicalImplementation: 0.8,
          userExperience: 0.85,
          documentationQuality: 0.8
        },
        description: 'Product must meet professional quality standards'
      },
      launch: {
        criteria: {
          marketReadiness: 0.9,
          customerAcquisition: 0.75,
          operationalReadiness: 0.8,
          riskMitigation: 0.8
        },
        description: 'All systems must be ready for customer-facing launch'
      },
      scale: {
        criteria: {
          growthMetrics: 0.8,
          customerSatisfaction: 0.85,
          operationalEfficiency: 0.8,
          sustainabilityModel: 0.8
        },
        description: 'Growth trajectory must be sustainable and measurable'
      }
    });

    this.qualityGates.set('rapid-mvp', {
      validate: {
        criteria: {
          marketValidation: 0.6,
          technicalFeasibility: 0.7
        }
      },
      build: {
        criteria: {
          mvpCompleteness: 0.8,
          basicUsability: 0.7
        }
      },
      test: {
        criteria: {
          userFeedback: 0.6,
          technicalStability: 0.8
        }
      }
    });
  }

  // Utility methods
  generateWorkflowId() {
    return `wf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  calculateProgress(workflow) {
    const completedPhases = workflow.phases.filter(p => p.status === 'completed').length;
    return completedPhases / workflow.phases.length;
  }

  isWorkflowComplete(workflow) {
    return workflow.phases.every(phase => phase.status === 'completed');
  }

  getNextPhase(workflow) {
    return workflow.phases.find(p => p.status === 'pending');
  }

  async completeWorkflow(workflow) {
    workflow.state = 'completed';
    workflow.completedAt = new Date().toISOString();
    
    // Generate completion report
    const completionReport = await this.generateCompletionReport(workflow);
    workflow.completionReport = completionReport;
    
    // Archive workflow
    this.workflowHistory.push({
      ...workflow,
      archivedAt: new Date().toISOString()
    });
    
    console.log(`🎉 Workflow ${workflow.id} completed successfully!`);
    return completionReport;
  }

  async generateCompletionReport(workflow) {
    const report = {
      workflowId: workflow.id,
      type: workflow.type,
      duration: this.calculateDuration(workflow.startedAt, workflow.completedAt),
      phases: workflow.phases.length,
      artifactsGenerated: Array.from(workflow.artifacts.values()).flat().length,
      averageQuality: this.calculateAverageQuality(workflow),
      keyAchievements: this.extractKeyAchievements(workflow),
      lessonsLearned: this.extractLessonsLearned(workflow),
      nextRecommendations: this.generateNextRecommendations(workflow)
    };

    return report;
  }

  // Status and reporting methods
  getWorkflowStatus(workflowId) {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) return null;

    return {
      id: workflowId,
      type: workflow.type,
      state: workflow.state,
      currentPhase: workflow.currentPhase,
      progress: workflow.progress,
      phases: workflow.phases.map(phase => ({
        name: phase.name,
        title: phase.title,
        status: phase.status,
        qualityScore: phase.qualityScore,
        tasksCompleted: phase.tasks.filter(t => t.status === 'completed').length,
        totalTasks: phase.tasks.length
      })),
      artifactCount: Array.from(workflow.artifacts.values()).flat().length,
      risks: workflow.risks,
      nextActions: this.getWorkflowNextActions(workflow),
      estimatedCompletion: this.estimateCompletion(workflow)
    };
  }

  getAllActiveWorkflows() {
    return Array.from(this.activeWorkflows.values()).map(workflow => ({
      id: workflow.id,
      type: workflow.type,
      state: workflow.state,
      currentPhase: workflow.currentPhase,
      progress: workflow.progress,
      startedAt: workflow.startedAt
    }));
  }

  getWorkflowNextActions(workflow) {
    if (workflow.state === 'completed') {
      return ['Workflow completed - review completion report'];
    }
    
    const currentPhase = workflow.phases.find(p => p.name === workflow.currentPhase);
    if (!currentPhase) {
      return ['Initialize next phase'];
    }
    
    const nextTasks = currentPhase.tasks.filter(t => t.status === 'pending');
    return nextTasks.map(task => `Execute: ${task.name}`);
  }

  // Technical assessment helper methods
  assessTechnicalComplexity(requirements) {
    let complexity = 0.5; // Base complexity
    
    if (requirements.integrations?.length > 3) complexity += 0.2;
    if (requirements.userBase === 'enterprise') complexity += 0.2;
    if (requirements.realtime === true) complexity += 0.15;
    if (requirements.ai || requirements.ml) complexity += 0.25;
    
    return {
      score: Math.min(complexity, 1.0),
      level: complexity > 0.8 ? 'high' : complexity > 0.6 ? 'medium' : 'low',
      factors: ['integrations', 'scale', 'features'].filter(f => requirements[f])
    };
  }

  assessTechnicalFeasibility(requirements) {
    let feasibility = 0.8; // Optimistic baseline
    
    if (requirements.timeline === 'aggressive') feasibility -= 0.2;
    if (requirements.budget === 'limited') feasibility -= 0.15;
    if (requirements.team === 'small') feasibility -= 0.1;
    
    return {
      score: Math.max(feasibility, 0.3),
      level: feasibility > 0.7 ? 'high' : feasibility > 0.5 ? 'medium' : 'low',
      blockers: feasibility < 0.6 ? ['timeline', 'resources'] : []
    };
  }

  identifyTechnicalRisks(requirements) {
    const risks = [];
    
    if (requirements.newTechnology) {
      risks.push({ type: 'technology', level: 'medium', description: 'New technology adoption risk' });
    }
    
    if (requirements.integrations?.length > 5) {
      risks.push({ type: 'integration', level: 'high', description: 'Complex integration dependencies' });
    }
    
    if (requirements.scalability === 'unlimited') {
      risks.push({ type: 'scalability', level: 'medium', description: 'Scalability architecture complexity' });
    }
    
    return risks;
  }

  generateTechnicalRecommendations(requirements) {
    const recommendations = [];
    
    recommendations.push({
      type: 'architecture',
      priority: 'high',
      description: 'Use microservices architecture for scalability'
    });
    
    if (requirements.ai) {
      recommendations.push({
        type: 'ai-strategy',
        priority: 'high',
        description: 'Implement AI capabilities using established APIs first'
      });
    }
    
    recommendations.push({
      type: 'development',
      priority: 'medium', 
      description: 'Implement CI/CD pipeline from day one'
    });
    
    return recommendations;
  }

  // Additional utility methods for quality validation
  validateArtifactQuality(workflow) {
    const artifacts = Array.from(workflow.artifacts.values()).flat();
    const qualityScores = artifacts.map(a => a.qualityScore || 0.7);
    
    return {
      count: artifacts.length,
      average: qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length,
      distribution: this.calculateQualityDistribution(qualityScores)
    };
  }

  validateProcessCompliance(workflow) {
    const completedPhases = workflow.phases.filter(p => p.status === 'completed');
    const totalPhases = workflow.phases.length;
    
    return {
      score: completedPhases.length / totalPhases,
      completedPhases: completedPhases.length,
      totalPhases: totalPhases,
      compliance: completedPhases.length > 0 ? 'on-track' : 'pending'
    };
  }

  assessCurrentRisks(workflow) {
    const risks = workflow.risks || [];
    const highRisks = risks.filter(r => r.level === 'high');
    
    return {
      level: highRisks.length > 0 ? 'high' : risks.length > 3 ? 'medium' : 'low',
      count: risks.length,
      highPriority: highRisks.length,
      categories: [...new Set(risks.map(r => r.type))]
    };
  }

  generateQualityRecommendations(workflow) {
    const recommendations = [];
    
    const artifactQuality = this.validateArtifactQuality(workflow);
    if (artifactQuality.average < 0.8) {
      recommendations.push({
        type: 'quality',
        priority: 'high',
        description: 'Improve artifact quality through enhanced review processes'
      });
    }
    
    const riskAssessment = this.assessCurrentRisks(workflow);
    if (riskAssessment.level === 'high') {
      recommendations.push({
        type: 'risk-mitigation',
        priority: 'critical',
        description: 'Address high-priority risks before proceeding'
      });
    }
    
    return recommendations;
  }

  // Report generation helpers
  calculateDuration(startTime, endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end - start;
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    return `${days} days, ${hours} hours`;
  }

  calculateAverageQuality(workflow) {
    const qualityScores = workflow.phases
      .filter(p => p.qualityScore !== null)
      .map(p => p.qualityScore);
    
    return qualityScores.length > 0 
      ? qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length
      : 0;
  }

  extractKeyAchievements(workflow) {
    const achievements = [];
    
    workflow.phases.forEach(phase => {
      if (phase.status === 'completed' && phase.qualityScore >= 0.8) {
        achievements.push(`Completed ${phase.title} with high quality (${(phase.qualityScore * 100).toFixed(0)}%)`);
      }
    });
    
    const totalArtifacts = Array.from(workflow.artifacts.values()).flat().length;
    if (totalArtifacts > 5) {
      achievements.push(`Generated ${totalArtifacts} professional artifacts`);
    }
    
    return achievements;
  }

  extractLessonsLearned(workflow) {
    const lessons = [];
    
    const failedTasks = workflow.phases.flatMap(p => p.tasks).filter(t => t.status === 'failed');
    if (failedTasks.length > 0) {
      lessons.push(`Task failure patterns: ${failedTasks.map(t => t.name).join(', ')}`);
    }
    
    const lowQualityPhases = workflow.phases.filter(p => p.qualityScore < 0.7);
    if (lowQualityPhases.length > 0) {
      lessons.push(`Quality improvement needed in: ${lowQualityPhases.map(p => p.name).join(', ')}`);
    }
    
    return lessons;
  }

  generateNextRecommendations(workflow) {
    const recommendations = [];
    
    if (workflow.type === 'concept-to-market') {
      recommendations.push('Monitor customer feedback and iterate on product-market fit');
      recommendations.push('Scale marketing efforts based on initial traction metrics');
      recommendations.push('Plan next product features based on user demand');
    }
    
    return recommendations;
  }

  calculateQualityDistribution(qualityScores) {
    const excellent = qualityScores.filter(s => s >= 0.9).length;
    const good = qualityScores.filter(s => s >= 0.8 && s < 0.9).length;
    const fair = qualityScores.filter(s => s >= 0.7 && s < 0.8).length;
    const poor = qualityScores.filter(s => s < 0.7).length;
    
    return { excellent, good, fair, poor };
  }

  estimateCompletion(workflow) {
    const remainingPhases = workflow.phases.filter(p => p.status === 'pending').length;
    const averagePhaseDuration = 7; // days, rough estimate
    
    const estimatedDays = remainingPhases * averagePhaseDuration;
    const completionDate = new Date();
    completionDate.setDate(completionDate.getDate() + estimatedDays);
    
    return {
      estimatedDays,
      estimatedDate: completionDate.toISOString().split('T')[0],
      confidence: workflow.progress > 0.5 ? 'high' : 'medium'
    };
  }

  generateQualityFeedback(criteriaResults, qualityGate) {
    const failedCriteria = criteriaResults.filter(result => !result.passed);
    
    if (failedCriteria.length === 0) {
      return `All quality criteria met. Phase ready for completion. ${qualityGate.description || ''}`;
    }
    
    const feedback = [`Quality gate validation failed. Issues found:`];
    
    failedCriteria.forEach(criteria => {
      feedback.push(`• ${criteria.criterion}: ${(criteria.score * 100).toFixed(0)}% (required: ${(criteria.threshold * 100).toFixed(0)}%)`);
    });
    
    feedback.push(`\nRecommendation: Address the above issues before proceeding to next phase.`);
    
    return feedback.join('\n');
  }

  async handleQualityGateFailure(workflow, phase, qualityValidation) {
    console.warn(`⚠️  Quality gate failed for ${workflow.type}.${phase.name}`);
    
    // Add to workflow risks
    workflow.risks.push({
      type: 'quality-gate-failure',
      phase: phase.name,
      criteria: qualityValidation.failedCriteria.map(c => c.criterion),
      timestamp: new Date().toISOString(),
      impact: 'medium',
      mitigation: 'Address failed criteria before proceeding'
    });
    
    // Log for visibility
    console.log('Failed criteria:', qualityValidation.failedCriteria.map(c => 
      `${c.criterion}: ${(c.score * 100).toFixed(0)}% < ${(c.threshold * 100).toFixed(0)}%`
    ).join(', '));
  }
}

module.exports = { ProductWorkflowOrchestrator };