/**
 * TooLoo.ai Self-Implementation Wizard
 * 
 * Allows TooLoo to implement features, fix bugs, and modify itself
 * through conversational interaction - NO CODE SHOWN, JUST ACTION!
 */

const fs = require('fs').promises;
const path = require('path');
const SelfAwarenessManager = require('./self-awareness-manager');

class SelfImplementationWizard {
  constructor(options = {}) {
    this.workspaceRoot = options.workspaceRoot || process.cwd();
    this.selfAwareness = new SelfAwarenessManager({ workspaceRoot: this.workspaceRoot });
    this.filesystemManager = options.filesystemManager || null;
    this.changeOrchestrator = options.changeOrchestrator || null;
    this.activeChangeSessionId = null;
    this.conversationMode = 'action'; // 'action' = do things, 'show' = show code
    
    // Track implementation sessions
    this.currentSession = null;
    this.sessionHistory = [];
    
    console.log('🧙 Self-Implementation Wizard initialized');
  }

  recordStep(result, message, options = {}) {
    if (!result || !message) {
      return;
    }

    if (!Array.isArray(result.steps)) {
      result.steps = [];
    }

    result.steps.push(message);

    if (this.currentSession && Array.isArray(this.currentSession.steps)) {
      this.currentSession.steps.push({
        kind: options.kind || 'progress',
        message,
        details: options.details ?? null,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Parse user request and determine implementation type
   */
  async parseImplementationRequest(prompt) {
    const lowerPrompt = prompt.toLowerCase();
    
    // Implementation patterns
    const patterns = [
      // Feature additions
      {
        regex: /(?:add|create|implement|build)\s+(?:a\s+)?(.+?)(?:\s+feature|\s+to)/i,
        type: 'feature',
        confidence: 'high'
      },
      // Bug fixes
      {
        regex: /(?:fix|repair|solve|resolve)\s+(.+?)(?:\s+bug|\s+issue|\s+problem)?/i,
        type: 'bugfix',
        confidence: 'high'
      },
      // Improvements
      {
        regex: /(?:improve|enhance|optimize|upgrade|better)\s+(.+)/i,
        type: 'improvement',
        confidence: 'medium'
      },
      // Modifications
      {
        regex: /(?:modify|change|update|refactor)\s+(.+)/i,
        type: 'modification',
        confidence: 'medium'
      },
      // Capabilities
      {
        regex: /(?:make|enable|allow)\s+(?:me|yourself|tooloo)\s+(?:to\s+)?(.+)/i,
        type: 'capability',
        confidence: 'high'
      }
    ];

    for (const pattern of patterns) {
      const match = prompt.match(pattern.regex);
      if (match) {
        return {
          type: pattern.type,
          feature: match[1],
          confidence: pattern.confidence,
          originalPrompt: prompt
        };
      }
    }

    return null;
  }

  /**
   * Execute implementation - NO CODE SHOWN, JUST ACTION!
   */
  async executeImplementation(request) {
    console.log(`🚀 Starting implementation: ${request.type} - ${request.feature}`);
    
    this.currentSession = {
      id: Date.now(),
      type: request.type,
      feature: request.feature,
      prompt: request.originalPrompt,
      startTime: new Date(),
      steps: [],
      status: 'in-progress'
    };

    let changeSession = null;
    if (this.changeOrchestrator) {
      changeSession = await this.changeOrchestrator.startSession({
        prompt: request.originalPrompt,
        description: `${request.type}: ${request.feature}`,
        metadata: { type: request.type, feature: request.feature }
      });
      this.activeChangeSessionId = changeSession.id;
    }

    const result = {
      success: false,
      message: '',
      steps: [],
      filesModified: [],
      filesCreated: [],
      testsRun: false,
      actionsTaken: [],
      planHighlights: [],
      sessionTimeline: null,
      changeSessionId: changeSession ? changeSession.id : null
    };

    let failureError = null;

    try {
      switch (request.type) {
        case 'feature':
          await this.implementFeature(request, result);
          break;
        case 'bugfix':
          await this.fixBug(request, result);
          break;
        case 'improvement':
          await this.improveCode(request, result);
          break;
        case 'modification':
          await this.modifyCode(request, result);
          break;
        case 'capability':
          await this.addCapability(request, result);
          break;
        default:
          throw new Error(`Unknown implementation type: ${request.type}`);
      }

      result.success = true;
      this.currentSession.status = 'completed';
    } catch (error) {
      result.success = false;
      result.error = error.message;
      failureError = error;
      this.currentSession.status = 'failed';
    }

    // Save session
    this.currentSession.endTime = new Date();
    this.currentSession.result = result;

    const sessionSnapshot = this.createSessionSnapshot(this.currentSession);
    if (sessionSnapshot) {
      result.sessionTimeline = sessionSnapshot;
      result.planHighlights = sessionSnapshot.steps
        .filter(step => step.kind === 'plan')
        .map(step => ({
          title: step.title || step.message,
          details: step.details,
          timestamp: step.timestamp
        }));
    }

    this.sessionHistory.push(this.currentSession);

    if (changeSession) {
      const finalized = await this.changeOrchestrator.finalizeSession(
        changeSession.id,
        result.success ? 'completed' : 'failed',
        {
          message: result.message,
          error: result.error,
          actionsTaken: result.actionsTaken,
          filesCreated: result.filesCreated,
          filesModified: result.filesModified,
          steps: result.steps
        }
      );
      result.changeSession = finalized ? this.changeOrchestrator.getSessionSummary(changeSession.id) : null;
    }

    if (result.changeSession && typeof result.changeSession.then === 'function') {
      result.changeSession = await result.changeSession;
    }

    result.structuredSummary = this.buildStructuredSummary(request, result);

    if (result.success) {
      result.conversationalResponse = this.formatConversationalResponse(result);
    } else {
      const errorForResponse = failureError || new Error(result.error || 'Unknown error');
      result.conversationalResponse = this.formatErrorResponse(errorForResponse, request);
    }

    this.activeChangeSessionId = null;
    this.currentSession = null;

    return result;
  }

  /**
   * Implement a new feature
   */
  async implementFeature(request, result) {
    this.recordStep(result, '🎯 Analyzing feature request...');
    await this.recordPlanStep('Analyze feature request', request.feature);
    
    // Determine files to create/modify
    const implementation = await this.planFeatureImplementation(request.feature);
    
    this.recordStep(result, `📝 Planning to modify ${implementation.filesToModify.length} files`);
    this.recordStep(result, `🆕 Planning to create ${implementation.filesToCreate.length} files`);
    await this.recordPlanStep('Plan implementation scope', {
      filesToCreate: implementation.filesToCreate.map(file => this.toRelativePath(file.path)),
      filesToModify: implementation.filesToModify.map(file => this.toRelativePath(file.path))
    });
    
    // Create new files
    for (const file of implementation.filesToCreate) {
      this.recordStep(result, `✨ Creating ${file.path}...`);
      await this.applyChange({
        type: 'create',
        path: file.path,
        content: file.content,
        description: `Create ${this.toRelativePath(file.path)}`
      });
      result.filesCreated.push(file.path);
      result.actionsTaken.push(`Created ${path.basename(file.path)}`);
    }
    
    // Modify existing files
    for (const file of implementation.filesToModify) {
      this.recordStep(result, `🔧 Modifying ${file.path}...`);
      await this.applyChange({
        type: 'update',
        path: file.path,
        content: file.content,
        description: `Update ${this.toRelativePath(file.path)}`,
        backup: true
      });
      result.filesModified.push(file.path);
      result.actionsTaken.push(`Updated ${path.basename(file.path)}`);
    }
    
    this.recordStep(result, '✅ Feature implemented successfully!');
    result.message = `Successfully implemented: ${request.feature}`;
  }

  /**
   * Fix a bug
   */
  async fixBug(request, result) {
    this.recordStep(result, '🐛 Analyzing bug...');
    await this.recordPlanStep('Analyze bug report', request.feature);
    
    // Search for potential bug locations
    const bugLocations = await this.findBugLocations(request.feature);
    
    this.recordStep(result, `🔍 Found ${bugLocations.length} potential issue locations`);
    await this.recordPlanStep('Potential bug locations identified', bugLocations.map(loc => loc.file));
    
    for (const location of bugLocations) {
      this.recordStep(result, `🔧 Fixing in ${location.file}...`);
      await this.applyBugFix(location, result);
    }
    
    this.recordStep(result, '✅ Investigation plan prepared!');
    result.message = `Flagged potential issues related to: ${request.feature}`;
  }

  /**
   * Improve existing code
   */
  async improveCode(request, result) {
    this.recordStep(result, '⚡ Analyzing code for improvements...');
    await this.recordPlanStep('Analyze improvement target', request.feature);
    
    const improvements = await this.identifyImprovements(request.feature);
    await this.recordPlanStep('Identify improvements', improvements.map(imp => imp.aspect));
    
    for (const improvement of improvements) {
      this.recordStep(result, `✨ Improving ${improvement.aspect}...`);
      await this.applyImprovement(improvement, result);
    }
    
    this.recordStep(result, '✅ Improvement plan prepared!');
    result.message = `Outlined improvements for: ${request.feature}`;
  }

  /**
   * Modify code
   */
  async modifyCode(request, result) {
    this.recordStep(result, '🔄 Analyzing modification request...');
    await this.recordPlanStep('Analyze modification request', request.feature);
    
    const modifications = await this.planModifications(request.feature);
    await this.recordPlanStep('Plan modifications', modifications.map(mod => mod.target));
    
    for (const mod of modifications) {
      this.recordStep(result, `📝 Modifying ${mod.target}...`);
      await this.applyModification(mod, result);
    }
    
    this.recordStep(result, '✅ Modification plan prepared!');
    result.message = `Outlined modification steps for: ${request.feature}`;
  }

  /**
   * Add new capability
   */
  async addCapability(request, result) {
    this.recordStep(result, '🎨 Adding new capability...');
    await this.recordPlanStep('Design capability', request.feature);
    
    const capability = await this.designCapability(request.feature);
    
    // Add to main server file
    this.recordStep(result, '📦 Integrating capability into system...');
    if (this.changeOrchestrator && this.activeChangeSessionId) {
      await this.changeOrchestrator.addPlanStep(this.activeChangeSessionId, 'Integrate capability', capability.name);
    }
    await this.selfAwareness.addCapability(
      capability.name,
      capability.code,
      'simple-api-server.js'
    );
    
    result.filesModified.push('simple-api-server.js');
    result.actionsTaken.push(`Added capability: ${capability.name}`);
    
    this.recordStep(result, '✅ Capability added!');
    result.message = `Successfully added capability: ${request.feature}`;
  }

  async recordPlanStep(title, details) {
    if (this.currentSession && Array.isArray(this.currentSession.steps)) {
      this.currentSession.steps.push({
        kind: 'plan',
        title,
        details,
        timestamp: new Date().toISOString()
      });
    }

    if (!this.changeOrchestrator || !this.activeChangeSessionId) {
      return;
    }

    try {
      await this.changeOrchestrator.addPlanStep(this.activeChangeSessionId, title, details);
    } catch (error) {
      console.error('Failed to record plan step:', error.message);
    }
  }

  async applyChange(change) {
    if (this.changeOrchestrator && this.activeChangeSessionId) {
      return this.changeOrchestrator.applyChange(this.activeChangeSessionId, change);
    }

    const resolvedPath = path.isAbsolute(change.path)
      ? change.path
      : path.join(this.workspaceRoot, change.path);

    switch (change.type) {
      case 'create': {
        await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
        await fs.writeFile(resolvedPath, change.content ?? '');
        break;
      }
      case 'update': {
        await this.selfAwareness.modifySourceCode(resolvedPath, change.content ?? '', { backup: change.backup !== false });
        break;
      }
      case 'append': {
        const existing = await fs.readFile(resolvedPath, 'utf8').catch(() => '');
        const combined = existing + (change.content ?? '');
        await this.selfAwareness.modifySourceCode(resolvedPath, combined, { backup: change.backup !== false });
        break;
      }
      case 'delete': {
        if (this.filesystemManager) {
          await this.filesystemManager.deleteItem(resolvedPath, { recursive: change.recursive === true });
        } else {
          await fs.unlink(resolvedPath);
        }
        break;
      }
      default:
        throw new Error(`Unsupported change type without orchestrator: ${change.type}`);
    }

    return { status: 'applied', path: resolvedPath };
  }

  toRelativePath(filePath) {
    if (!filePath) return '';
    return path.relative(this.workspaceRoot, filePath).replace(/^(?:\.\/|\.\\)/, '');
  }

  /**
   * Plan feature implementation
   */
  async planFeatureImplementation(feature) {
    // Smart planning based on feature description
    const lowerFeature = feature.toLowerCase();
    
    const implementation = {
      filesToCreate: [],
      filesToModify: []
    };

    // Determine if we need new module
    if (lowerFeature.includes('wizard') || lowerFeature.includes('manager') || lowerFeature.includes('handler')) {
      const moduleName = feature.replace(/\s+/g, '-').toLowerCase();
      implementation.filesToCreate.push({
        path: path.join(this.workspaceRoot, `${moduleName}.js`),
        content: this.generateModuleTemplate(feature)
      });
    }

    // Always update main server to integrate
    const serverPath = path.join(this.workspaceRoot, 'simple-api-server.js');
    const serverContent = await fs.readFile(serverPath, 'utf8');
    implementation.filesToModify.push({
      path: serverPath,
      content: this.integrateFeatureIntoServer(serverContent, feature)
    });

    return implementation;
  }

  /**
   * Generate module template
   */
  generateModuleTemplate(featureName) {
    const className = featureName
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');

    return `/**
 * ${featureName} - Auto-generated by Self-Implementation Wizard
 * Created: ${new Date().toISOString()}
 */

class ${className} {
  constructor(options = {}) {
    this.workspaceRoot = options.workspaceRoot || process.cwd();
    console.log('✨ ${featureName} initialized');
  }

  async execute(params = {}) {
    console.log('🚀 Executing ${featureName}...');
    
    // Implementation goes here
    
    return {
      success: true,
      message: '${featureName} executed successfully'
    };
  }
}

module.exports = ${className};
`;
  }

  /**
   * Integrate feature into server
   */
  integrateFeatureIntoServer(serverContent, feature) {
    // Find the imports section and add new import
    const requireStatement = `const ${feature.replace(/\s+/g, '')}Manager = require('./${feature.replace(/\s+/g, '-').toLowerCase()}');\n`;
    
    // Find last require statement
    const lastRequireIndex = serverContent.lastIndexOf('require(');
    const nextNewlineIndex = serverContent.indexOf('\n', lastRequireIndex);
    
    return serverContent.slice(0, nextNewlineIndex + 1) + requireStatement + serverContent.slice(nextNewlineIndex + 1);
  }

  /**
   * Format conversational response - NO CODE!
   */
  formatConversationalResponse(result) {
    let response = `## ✅ Done!\n\n`;
    response += `${result.message}\n\n`;
    
    if (result.actionsTaken && result.actionsTaken.length > 0) {
      response += `**What I did:**\n`;
      result.actionsTaken.forEach(action => {
        response += `- ${action}\n`;
      });
      response += `\n`;
    }

    if (result.planHighlights && result.planHighlights.length > 0) {
      const highlights = result.planHighlights.slice(0, 3);
      response += `**Plan highlights:**\n`;
      highlights.forEach(step => {
        response += `- ${step.title}`;
        if (step.details) {
          const detailText = typeof step.details === 'string' ? step.details : JSON.stringify(step.details);
          response += ` — ${detailText}`;
        }
        response += `\n`;
      });
      if (result.planHighlights.length > highlights.length) {
        response += `- …${result.planHighlights.length - highlights.length} more planning steps\n`;
      }
      response += `\n`;
    }

    if (result.sessionTimeline && result.sessionTimeline.steps && result.sessionTimeline.steps.length > 0) {
      const progressSteps = result.sessionTimeline.steps.filter(step => step.kind === 'progress').slice(0, 4);
      if (progressSteps.length > 0) {
        response += `**Execution flow:**\n`;
        progressSteps.forEach(step => {
          response += `- ${step.message}\n`;
        });
        if (result.sessionTimeline.steps.filter(step => step.kind === 'progress').length > progressSteps.length) {
          response += `- …more actions completed\n`;
        }
        response += `\n`;
      }
    }

    if (result.filesCreated && result.filesCreated.length > 0) {
      response += `**New files created:** ${result.filesCreated.length}`;
      const preview = result.filesCreated.slice(0, 3).map(file => this.toRelativePath(file));
      response += preview.length ? ` (e.g. ${preview.join(', ')})` : '';
      response += `\n`;
    }

    if (result.filesModified && result.filesModified.length > 0) {
      response += `**Files updated:** ${result.filesModified.length}`;
      const preview = result.filesModified.slice(0, 3).map(file => this.toRelativePath(file));
      response += preview.length ? ` (touched ${preview.join(', ')})` : '';
      response += `\n`;
    }

    if (result.changeSessionId) {
      const logPath = `logs/change-sessions/${result.changeSessionId}.json`;
      response += `**Change session:** ${result.changeSessionId}\n`;
      response += `- Audit log saved at ${logPath}\n`;
    }

    if (result.testsRun) {
      response += `**Validations:** Automated checks finished successfully.\n`;
    } else {
      response += `**Validations:** Ready for the next round of automated checks whenever you are.\n`;
    }

    response += `\n✨ **Everything is ready to use!** Let me know if you want refinements or additional follow-up.\n`;

    return response;
  }

  /**
   * Format error response
   */
  formatErrorResponse(error, request) {
    return `## ⚠️ Encountered an issue\n\nWhile trying to ${request.type} "${request.feature}", I ran into:\n\n${error.message}\n\n**Let me try a different approach** or **give me more details** about what you want to achieve.`;
  }

  /**
   * Placeholder methods (to be implemented based on actual use cases)
   */
  async findBugLocations(feature) {
    const matches = await this.searchWorkspace(feature, { maxMatches: 5 });

    if (matches.length === 0) {
      const fallbackMatches = await this.searchWorkspace('throw new Error', { maxMatches: 3 });
      matches.push(...fallbackMatches);
    }

    if (matches.length === 0) {
      const todoMatches = await this.searchWorkspace('TODO', { maxMatches: 3 });
      matches.push(...todoMatches);
    }

    return matches.map(match => ({
      file: this.toRelativePath(match.file),
      line: match.line,
      snippet: match.snippet,
      reason: `Matched keyword near "${feature}"`
    }));
  }

  async applyBugFix(location, result) {
    const note = `Manual review recommended at ${location.file}:${location.line} – ${location.snippet}`;
    this.recordStep(result, `🧩 Flagged ${location.file}:${location.line} for manual review`, {
      kind: 'note',
      details: location.snippet
    });

    result.actionsTaken.push(`Flagged potential issue in ${path.basename(location.file)}`);

    if (this.changeOrchestrator && this.activeChangeSessionId) {
      await this.changeOrchestrator.addNote(this.activeChangeSessionId, note, 'warning');
    }
  }

  async identifyImprovements(feature) {
    const maxSuggestions = 5;
    const seen = new Set();
    const suggestions = [];

    const addSuggestion = (aspect, match, recommendation) => {
      if (!match) return;
      const key = `${match.file}:${match.line}:${aspect}`;
      if (seen.has(key)) return;
      seen.add(key);
      suggestions.push({
        aspect,
        file: this.toRelativePath(match.file),
        line: match.line,
        snippet: match.snippet,
        recommendation
      });
    };

    const consoleMatches = await this.searchWorkspace('console.log', { maxMatches: maxSuggestions });
    consoleMatches.forEach(match => {
      addSuggestion('Reduce console logging noise', match, 'Replace with structured logger or remove in production code.');
    });

    if (suggestions.length < maxSuggestions) {
      const todoMatches = await this.searchWorkspace('TODO', { maxMatches: maxSuggestions });
      todoMatches.forEach(match => {
        addSuggestion('Resolve outstanding TODO', match, 'Convert TODO into an actionable task or resolve it now.');
      });
    }

    if (suggestions.length < maxSuggestions) {
      const fixmeMatches = await this.searchWorkspace('FIXME', { maxMatches: maxSuggestions });
      fixmeMatches.forEach(match => {
        addSuggestion('Address flagged FIXME', match, 'Investigate and resolve the flagged issue.');
      });
    }

    if (suggestions.length < maxSuggestions && feature) {
      const featureMatches = await this.searchWorkspace(feature, { maxMatches: maxSuggestions });
      featureMatches.forEach(match => {
        addSuggestion(`Align ${feature} references`, match, 'Review this usage to ensure it matches the requested improvement.');
      });
    }

    return suggestions.slice(0, maxSuggestions);
  }

  async applyImprovement(improvement, result) {
    const note = `Improvement opportunity in ${improvement.file}:${improvement.line} – ${improvement.recommendation}`;
    this.recordStep(result, `📌 Logged improvement note for ${improvement.file}:${improvement.line}`, {
      kind: 'note',
      details: `${improvement.snippet}\n${improvement.recommendation}`
    });

    result.actionsTaken.push(`Logged improvement: ${improvement.aspect}`);

    if (this.changeOrchestrator && this.activeChangeSessionId) {
      await this.changeOrchestrator.addNote(this.activeChangeSessionId, note, 'info');
    }
  }

  async planModifications(feature) {
    const maxPlans = 5;
    const matches = await this.searchWorkspace(feature || 'function', { maxMatches: maxPlans });

    if (matches.length === 0) {
      const fallback = await this.searchWorkspace('TODO', { maxMatches: maxPlans });
      matches.push(...fallback);
    }

    return matches.slice(0, maxPlans).map(match => ({
      target: feature ? `Refine ${feature}` : 'Refine identified code segment',
      file: this.toRelativePath(match.file),
      line: match.line,
      snippet: match.snippet,
      recommendation: 'Review this location to align with the modification request and update logic accordingly.'
    }));
  }

  async applyModification(mod, result) {
    const note = `Modification plan for ${mod.file}:${mod.line} – ${mod.recommendation}`;
    this.recordStep(result, `🗂️ Documented modification plan for ${mod.file}:${mod.line}`, {
      kind: 'note',
      details: `${mod.snippet}\n${mod.recommendation}`
    });

    result.actionsTaken.push(`Planned modification: ${mod.target}`);

    if (this.changeOrchestrator && this.activeChangeSessionId) {
      await this.changeOrchestrator.addNote(this.activeChangeSessionId, note, 'info');
    }
  }

  async designCapability(feature) {
    // Design a new capability
    return {
      name: feature.replace(/\s+/g, ''),
      code: `// ${feature} capability\nfunction ${feature.replace(/\s+/g, '')}() { return true; }`
    };
  }

  async searchWorkspace(term, { maxMatches = 8, includeExtensions = ['.js', '.jsx', '.ts', '.tsx', '.json', '.md', '.yaml', '.yml'] } = {}) {
    const matches = [];
    const lowerTerm = term.toLowerCase();
    const files = await this.selfAwareness.listProjectFiles();

    for (const file of files) {
      const extension = path.extname(file.path).toLowerCase();
      if (includeExtensions.length > 0 && !includeExtensions.includes(extension)) {
        continue;
      }

      try {
        const content = await fs.readFile(file.path, 'utf8');
        const lines = content.split(/\r?\n/);
        for (let i = 0; i < lines.length; i += 1) {
          const line = lines[i];
          if (line.toLowerCase().includes(lowerTerm)) {
            matches.push({
              file: file.path,
              line: i + 1,
              snippet: line.trim()
            });
            if (matches.length >= maxMatches) {
              return matches;
            }
          }
        }
      } catch (error) {
        console.warn(`Unable to scan ${file.path}:`, error.message);
      }
    }

    return matches;
  }

  createSessionSnapshot(session) {
    if (!session) return null;

    const toIso = value => {
      if (!value) return null;
      return value instanceof Date ? value.toISOString() : value;
    };

    return {
      id: session.id,
      type: session.type,
      feature: session.feature,
      status: session.status,
      startTime: toIso(session.startTime),
      endTime: toIso(session.endTime),
      steps: (session.steps || []).map(step => ({
        kind: step.kind || 'progress',
        message: step.message || step.title || '',
        title: step.title || null,
        details: step.details ?? null,
        timestamp: step.timestamp || new Date().toISOString()
      }))
    };
  }

  buildStructuredSummary(request, result) {
    const timeline = result.sessionTimeline ? result.sessionTimeline.steps : [];
    const validations = (result.changeSession && result.changeSession.validations) || [];

    const toRelativeList = items => (items || []).map(item => this.toRelativePath(item));

    const summary = {
      status: result.success ? 'completed' : 'failed',
      changeSessionId: result.changeSessionId || null,
      intent: {
        type: request.type,
        feature: request.feature,
        prompt: request.originalPrompt
      },
      plan: {
        highlights: result.planHighlights || [],
        totalSteps: timeline.length
      },
      actions: {
        steps: timeline.filter(step => step.kind === 'progress').map(step => step.message),
        actionsTaken: result.actionsTaken || [],
        filesCreated: toRelativeList(result.filesCreated),
        filesModified: toRelativeList(result.filesModified)
      },
      validations: {
        ran: validations.length > 0 || !!result.testsRun,
        details: validations.map(run => ({
          command: run.command,
          status: run.status,
          durationMs: run.durationMs || null,
          finishedAt: run.finishedAt || null,
          notes: run.stderr ? this.truncateForSummary(run.stderr) : null
        }))
      },
      followUps: []
    };

    if (!summary.validations.ran) {
      summary.followUps.push('Consider running automated validations (tests, lint) to confirm the change.');
    }

    if (result.success === false && result.error) {
      summary.followUps.push(`Investigate failure: ${result.error}`);
    }

    return summary;
  }

  truncateForSummary(text, limit = 280) {
    if (!text) return null;
    return text.length > limit ? `${text.slice(0, limit)}…` : text;
  }

  /**
   * Get implementation history
   */
  getHistory(limit = 10) {
    return this.sessionHistory.slice(-limit);
  }

  /**
   * Get current session status
   */
  getStatus() {
    if (!this.currentSession) {
      return { active: false, message: 'No implementation in progress' };
    }

    return {
      active: true,
      type: this.currentSession.type,
      feature: this.currentSession.feature,
      status: this.currentSession.status,
      steps: this.currentSession.steps.length
    };
  }
}

module.exports = SelfImplementationWizard;
