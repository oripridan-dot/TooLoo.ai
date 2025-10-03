const path = require('path');

class SelfImplementationWizard {
  constructor(options = {}) {
    this.workspaceRoot = options.workspaceRoot || process.cwd();
    this.changeOrchestrator = options.changeOrchestrator || null;
    this.filesystemManager = options.filesystemManager || null;
    console.log('🧙 Self-Implementation Wizard initialized');
  }

  async parseImplementationRequest(prompt = '') {
    const normalized = prompt.toLowerCase();
    const triggers = ['self-implementation', 'self implementation', 'implementation wizard', 'auto-implement', 'scaffold this', 'build it for me'];

    if (!triggers.some((keyword) => normalized.includes(keyword))) {
      return null;
    }

    const intent = this.detectIntent(normalized);
    const summary = this.createSummary(prompt);

    return {
      intent,
      prompt,
      summary,
      createdAt: new Date().toISOString()
    };
  }

  detectIntent(normalizedPrompt) {
    if (normalizedPrompt.includes('ui') || normalizedPrompt.includes('interface')) return 'ui';
    if (normalizedPrompt.includes('api')) return 'api';
    if (normalizedPrompt.includes('test')) return 'test';
    return 'feature';
  }

  createSummary(prompt) {
    const trimmed = prompt.trim();
    if (trimmed.length <= 180) return trimmed;
    return `${trimmed.slice(0, 177)}...`;
  }

  buildPlan(intent, prompt) {
    const baseSteps = [
      {
        title: 'Clarify requirements',
        details: 'Summarize the user intent and identify deliverables.'
      },
      {
        title: 'Identify impacted files',
        details: 'Locate source files that need to be added or modified.'
      },
      {
        title: 'Implement changes',
        details: 'Apply code updates and create new assets as needed.'
      },
      {
        title: 'Validate and summarize',
        details: 'Run validation steps and produce a summary for the user.'
      }
    ];

    if (intent === 'ui') {
      baseSteps.splice(2, 0, {
        title: 'Design UI layout',
        details: 'Sketch out the structure and components for the interface.'
      });
    }

    if (intent === 'test') {
      baseSteps.push({
        title: 'Add automated tests',
        details: 'Cover the new functionality with at least one test.'
      });
    }

    return baseSteps.map((step, index) => ({
      ...step,
      id: `step-${index + 1}`
    }));
  }

  async executeImplementation(request) {
    const plan = this.buildPlan(request.intent, request.prompt);
    let changeSession = null;

    if (this.changeOrchestrator) {
      try {
        changeSession = await this.changeOrchestrator.startSession({
          prompt: request.prompt,
          description: plan[0]?.details || request.summary,
          metadata: { type: request.intent, trigger: 'self-implementation-wizard' }
        });

        for (const step of plan) {
          await this.changeOrchestrator.addPlanStep(changeSession.id, step);
        }
      } catch (error) {
        console.warn('⚠️ SelfImplementationWizard: unable to start change session:', error.message);
      }
    }

    const nextSteps = this.describeNextActions(plan);
    const conversationalResponse = `✅ Implementation plan created.

**What I'll do next:**
${nextSteps}

Say "continue" or provide more details to proceed.`;

    const structuredSummary = {
      intent: request.intent,
      summary: request.summary,
      steps: plan,
      workspaceRoot: this.workspaceRoot,
      createdAt: new Date().toISOString()
    };

    return {
      conversationalResponse,
      structuredSummary,
      plan,
      changeSession,
      sessionTimeline: changeSession
        ? [
            { title: 'Session created', timestamp: changeSession.createdAt },
            ...plan.map((step) => ({ title: step.title, timestamp: changeSession.createdAt }))
          ]
        : plan.map((step) => ({ title: step.title, timestamp: new Date().toISOString() }))
    };
  }

  describeNextActions(plan) {
    return plan
      .slice(0, 4)
      .map((step, index) => `${index + 1}. ${step.title} — ${step.details}`)
      .join('\n');
  }
}

module.exports = SelfImplementationWizard;
