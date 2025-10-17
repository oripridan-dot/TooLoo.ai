// AI Chat Timeline - Template Engine
// Transforms conversations into structured cognitive workflows

class TemplateEngine {
  constructor() {
    this.activeTemplate = null;
    this.templates = this.loadTemplates();
    this.conversationData = {
      messages: [],
      phases: [],
      insights: [],
      outputs: []
    };
  }

  loadTemplates() {
    return {
      'learning-mode': new LearningTemplate(),
      'brainstorm-mode': new BrainstormTemplate(),
      'debug-mode': new DebugTemplate(),
      'writing-mode': new WritingTemplate(),
      'research-mode': new ResearchTemplate()
    };
  }

  activateTemplate(templateId) {
    this.activeTemplate = this.templates[templateId];
    if (this.activeTemplate) {
      this.activeTemplate.initialize();
      this.renderTemplateUI();
      return true;
    }
    return false;
  }

  processMessage(message, role) {
    if (!this.activeTemplate) return null;
    
    // Let template process and categorize the message
    const processed = this.activeTemplate.processMessage(message, role);
    
    // Update conversation data
    this.conversationData.messages.push({
      content: message,
      role: role,
      phase: processed.phase,
      category: processed.category,
      timestamp: Date.now()
    });

    // Check if phase transition is needed
    if (processed.shouldTransition) {
      this.transitionPhase(processed.nextPhase);
    }

    // Extract any insights
    if (processed.insights) {
      this.conversationData.insights.push(...processed.insights);
    }

    return processed;
  }

  transitionPhase(newPhase) {
    this.conversationData.phases.push({
      phase: newPhase,
      timestamp: Date.now(),
      messageCount: this.conversationData.messages.length
    });

    this.activeTemplate.onPhaseTransition(newPhase);
    this.renderPhaseTransition(newPhase);
  }

  renderTemplateUI() {
    const container = document.getElementById('ai-timeline-container');
    if (!container) return;

    // Add template-specific UI
    const templateUI = document.createElement('div');
    templateUI.id = 'template-mode-ui';
    templateUI.className = 'template-mode-active';
    templateUI.innerHTML = this.activeTemplate.getUI();

    // Insert before timeline segments
    const segmentsContainer = document.getElementById('ai-timeline-segments');
    container.insertBefore(templateUI, segmentsContainer);

    // Attach event listeners
    this.activeTemplate.attachEventListeners();
  }

  renderPhaseTransition(phase) {
    // Visual feedback for phase transitions
    const notification = document.createElement('div');
    notification.className = 'phase-transition-notification';
    notification.innerHTML = `
      <div class="phase-transition-content">
        <div class="phase-icon">${this.activeTemplate.getPhaseIcon(phase)}</div>
        <div class="phase-name">${phase}</div>
        <div class="phase-description">${this.activeTemplate.getPhaseDescription(phase)}</div>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('fade-in');
    }, 100);

    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 500);
    }, 3000);
  }

  exportConversation() {
    if (!this.activeTemplate) return null;

    return {
      template: this.activeTemplate.id,
      summary: this.activeTemplate.generateSummary(this.conversationData),
      structured: this.activeTemplate.structureData(this.conversationData),
      insights: this.conversationData.insights,
      metadata: {
        duration: Date.now() - (this.conversationData.messages[0]?.timestamp || Date.now()),
        messageCount: this.conversationData.messages.length,
        phaseCount: this.conversationData.phases.length
      }
    };
  }

  // Export to different formats
  exportToMarkdown() {
    const data = this.exportConversation();
    return this.activeTemplate.toMarkdown(data);
  }

  exportToNotion() {
    const data = this.exportConversation();
    return this.activeTemplate.toNotion(data);
  }

  exportToJSON() {
    return JSON.stringify(this.exportConversation(), null, 2);
  }
}

// Base Template Class
class BaseTemplate {
  constructor(id, name, description) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.phases = [];
    this.currentPhase = 0;
  }

  initialize() {
    this.currentPhase = 0;
  }

  processMessage(message, role) {
    // Override in subclasses
    return {
      phase: this.phases[this.currentPhase],
      category: 'general',
      shouldTransition: false,
      insights: []
    };
  }

  onPhaseTransition(newPhase) {
    // Override in subclasses
  }

  getUI() {
    // Override in subclasses
    return '';
  }

  attachEventListeners() {
    // Override in subclasses
  }

  getPhaseIcon(phase) {
    return '📍';
  }

  getPhaseDescription(phase) {
    return phase;
  }

  generateSummary(data) {
    return 'Summary not implemented';
  }

  structureData(data) {
    return data;
  }

  toMarkdown(data) {
    return '# Conversation Export\n\nNot implemented';
  }

  toNotion(data) {
    return { blocks: [] };
  }
}

// ========================================
// LEARNING MODE - Master any topic
// ========================================
class LearningTemplate extends BaseTemplate {
  constructor() {
    super('learning-mode', 'Learning Mode', 'Master any topic with structured learning');
    this.phases = [
      'Foundation',      // Core concepts
      'Deep Dive',       // Detailed explanations
      'Examples',        // Real-world examples
      'Practice',        // Apply knowledge
      'Mastery Check'    // Test understanding
    ];
    this.concepts = [];
    this.examples = [];
    this.questions = [];
  }

  processMessage(message, role) {
    const lower = message.toLowerCase();
    let phase = this.phases[this.currentPhase];
    let category = 'discussion';
    let shouldTransition = false;
    let insights = [];

    // Detect concepts being learned
    if (role === 'assistant' && this.currentPhase === 0) {
      // Extract key concepts from explanations
      const conceptPatterns = /(?:is |are |means |refers to |defined as )([^.!?]+)/gi;
      let match;
      while ((match = conceptPatterns.exec(message)) !== null) {
        const concept = match[1].trim();
        if (concept.length > 10 && concept.length < 100) {
          this.concepts.push(concept);
          insights.push({
            type: 'concept',
            content: concept,
            phase: phase
          });
        }
      }
    }

    // Detect examples
    if (lower.includes('example') || lower.includes('for instance') || lower.includes('such as')) {
      category = 'example';
      if (this.currentPhase < 2) {
        shouldTransition = true;
        this.currentPhase = 2;
      }
      
      this.examples.push({
        content: message,
        phase: phase
      });
    }

    // Detect practice/questions
    if (role === 'user' && (lower.includes('how do i') || lower.includes('can i try') || lower.includes('let me'))) {
      category = 'practice';
      if (this.currentPhase < 3) {
        shouldTransition = true;
        this.currentPhase = 3;
      }
    }

    // Auto-advance through phases based on message count in current phase
    const messagesInPhase = this.getMessagesInCurrentPhase();
    if (messagesInPhase > 6 && this.currentPhase < this.phases.length - 1) {
      shouldTransition = true;
      this.currentPhase++;
    }

    return {
      phase: this.phases[this.currentPhase],
      category: category,
      shouldTransition: shouldTransition,
      nextPhase: shouldTransition ? this.phases[this.currentPhase] : null,
      insights: insights
    };
  }

  getMessagesInCurrentPhase() {
    // This would be tracked by template engine
    return 0;
  }

  getUI() {
    return `
      <div class="template-header learning-mode">
        <div class="template-title">
          <span class="template-icon">🎓</span>
          <span>Learning Mode Active</span>
        </div>
        <div class="template-progress">
          <div class="progress-bar">
            ${this.phases.map((phase, i) => `
              <div class="progress-step ${i <= this.currentPhase ? 'active' : ''}" 
                   title="${phase}">
                ${i + 1}
              </div>
            `).join('')}
          </div>
          <div class="current-phase">${this.phases[this.currentPhase]}</div>
        </div>
        <div class="learning-stats">
          <div class="stat">
            <span class="stat-value">${this.concepts.length}</span>
            <span class="stat-label">Concepts</span>
          </div>
          <div class="stat">
            <span class="stat-value">${this.examples.length}</span>
            <span class="stat-label">Examples</span>
          </div>
        </div>
      </div>
      <div class="template-actions">
        <button class="template-btn" id="learning-export">Export Study Guide</button>
        <button class="template-btn" id="learning-quiz">Generate Quiz</button>
      </div>
    `;
  }

  attachEventListeners() {
    document.getElementById('learning-export')?.addEventListener('click', () => {
      this.exportStudyGuide();
    });

    document.getElementById('learning-quiz')?.addEventListener('click', () => {
      this.generateQuiz();
    });
  }

  exportStudyGuide() {
    const markdown = this.toMarkdown({
      concepts: this.concepts,
      examples: this.examples
    });

    this.downloadFile('study-guide.md', markdown);
  }

  generateQuiz() {
    // This would use Claude API to generate quiz questions
    alert('Quiz generation coming soon! Will use Claude API to create questions from your conversation.');
  }

  downloadFile(filename, content) {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  getPhaseIcon(phase) {
    const icons = {
      'Foundation': '📚',
      'Deep Dive': '🔍',
      'Examples': '💡',
      'Practice': '✏️',
      'Mastery Check': '✅'
    };
    return icons[phase] || '📍';
  }

  getPhaseDescription(phase) {
    const descriptions = {
      'Foundation': 'Building core understanding',
      'Deep Dive': 'Exploring details and nuances',
      'Examples': 'Seeing concepts in action',
      'Practice': 'Applying what you learned',
      'Mastery Check': 'Validating your knowledge'
    };
    return descriptions[phase] || phase;
  }

  toMarkdown(data) {
    let md = `# Study Guide\n\n`;
    md += `Generated: ${new Date().toLocaleDateString()}\n\n`;
    
    if (this.concepts.length > 0) {
      md += `## Key Concepts\n\n`;
      this.concepts.forEach(concept => {
        md += `- ${concept}\n`;
      });
      md += `\n`;
    }

    if (this.examples.length > 0) {
      md += `## Examples\n\n`;
      this.examples.forEach((example, i) => {
        md += `### Example ${i + 1}\n${example.content}\n\n`;
      });
    }

    md += `## Study Checklist\n\n`;
    this.phases.forEach(phase => {
      md += `- [ ] ${phase}\n`;
    });

    return md;
  }
}

// ========================================
// BRAINSTORM MODE - Idea generation
// ========================================
class BrainstormTemplate extends BaseTemplate {
  constructor() {
    super('brainstorm-mode', 'Brainstorm Mode', 'Generate and refine ideas systematically');
    this.phases = [
      'Diverge',         // Generate many ideas
      'Explore',         // Expand on promising ones
      'Converge',        // Narrow down options
      'Decide',          // Make final choice
      'Action Plan'      // Next steps
    ];
    this.ideas = [];
    this.concerns = [];
    this.decisions = [];
  }

  processMessage(message, role) {
    const lower = message.toLowerCase();
    let phase = this.phases[this.currentPhase];
    let category = 'discussion';
    let shouldTransition = false;
    let insights = [];

    // Detect new ideas
    if (role === 'user' || role === 'assistant') {
      // Look for idea indicators
      if (lower.match(/what if|we could|idea|suggestion|consider|how about|maybe we/)) {
        category = 'idea';
        
        // Extract the idea
        const ideaMatch = message.match(/(?:what if|we could|idea:|how about|maybe we could?)\s+([^.!?]+)/i);
        if (ideaMatch) {
          this.ideas.push({
            content: ideaMatch[1].trim(),
            phase: phase,
            author: role
          });
          
          insights.push({
            type: 'idea',
            content: ideaMatch[1].trim()
          });
        }
      }

      // Detect concerns/challenges
      if (lower.match(/problem|issue|concern|challenge|risk|downside|but what about/)) {
        category = 'concern';
        this.concerns.push({
          content: message,
          phase: phase
        });
      }

      // Detect decisions
      if (lower.match(/let's go with|i choose|decided|final decision|we'll do/)) {
        category = 'decision';
        shouldTransition = true;
        this.currentPhase = Math.min(3, this.phases.length - 1);
        
        this.decisions.push({
          content: message,
          phase: phase
        });
      }
    }

    // Auto-transition based on idea count
    if (this.currentPhase === 0 && this.ideas.length >= 5) {
      shouldTransition = true;
      this.currentPhase = 1;
    }

    return {
      phase: this.phases[this.currentPhase],
      category: category,
      shouldTransition: shouldTransition,
      nextPhase: shouldTransition ? this.phases[this.currentPhase] : null,
      insights: insights
    };
  }

  getUI() {
    return `
      <div class="template-header brainstorm-mode">
        <div class="template-title">
          <span class="template-icon">💡</span>
          <span>Brainstorm Mode Active</span>
        </div>
        <div class="template-progress">
          <div class="progress-bar">
            ${this.phases.map((phase, i) => `
              <div class="progress-step ${i <= this.currentPhase ? 'active' : ''}" 
                   title="${phase}">
                ${this.getPhaseIcon(phase)}
              </div>
            `).join('')}
          </div>
          <div class="current-phase">${this.phases[this.currentPhase]}</div>
        </div>
        <div class="brainstorm-stats">
          <div class="stat">
            <span class="stat-value">${this.ideas.length}</span>
            <span class="stat-label">Ideas</span>
          </div>
          <div class="stat">
            <span class="stat-value">${this.concerns.length}</span>
            <span class="stat-label">Concerns</span>
          </div>
          <div class="stat">
            <span class="stat-value">${this.decisions.length}</span>
            <span class="stat-label">Decisions</span>
          </div>
        </div>
      </div>
      <div class="idea-board">
        ${this.ideas.map((idea, i) => `
          <div class="idea-card">
            <div class="idea-number">#${i + 1}</div>
            <div class="idea-content">${idea.content}</div>
            <div class="idea-phase">${idea.phase}</div>
          </div>
        `).join('')}
      </div>
      <div class="template-actions">
        <button class="template-btn" id="brainstorm-export">Export Ideas</button>
        <button class="template-btn" id="brainstorm-matrix">Decision Matrix</button>
      </div>
    `;
  }

  attachEventListeners() {
    document.getElementById('brainstorm-export')?.addEventListener('click', () => {
      const markdown = this.toMarkdown({});
      this.downloadFile('brainstorm-session.md', markdown);
    });

    document.getElementById('brainstorm-matrix')?.addEventListener('click', () => {
      this.createDecisionMatrix();
    });
  }

  downloadFile(filename, content) {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  createDecisionMatrix() {
    alert('Decision Matrix feature coming soon! Will help you evaluate ideas systematically.');
  }

  getPhaseIcon(phase) {
    const icons = {
      'Diverge': '🌟',
      'Explore': '🔍',
      'Converge': '🎯',
      'Decide': '✅',
      'Action Plan': '🚀'
    };
    return icons[phase] || '📍';
  }

  getPhaseDescription(phase) {
    const descriptions = {
      'Diverge': 'Generate as many ideas as possible',
      'Explore': 'Expand on the most promising ideas',
      'Converge': 'Narrow down to the best options',
      'Decide': 'Make your final choice',
      'Action Plan': 'Define next steps'
    };
    return descriptions[phase] || phase;
  }

  toMarkdown(data) {
    let md = `# Brainstorm Session\n\n`;
    md += `Generated: ${new Date().toLocaleDateString()}\n\n`;
    
    md += `## All Ideas (${this.ideas.length})\n\n`;
    this.ideas.forEach((idea, i) => {
      md += `${i + 1}. **${idea.content}**\n`;
      md += `   - Phase: ${idea.phase}\n`;
      md += `   - By: ${idea.author === 'user' ? 'You' : 'AI'}\n\n`;
    });

    if (this.concerns.length > 0) {
      md += `## Concerns & Challenges\n\n`;
      this.concerns.forEach(concern => {
        md += `- ${concern.content}\n`;
      });
      md += `\n`;
    }

    if (this.decisions.length > 0) {
      md += `## Decisions Made\n\n`;
      this.decisions.forEach((decision, i) => {
        md += `${i + 1}. ${decision.content}\n\n`;
      });
    }

    md += `## Next Steps\n\n`;
    md += `- [ ] Review top 3 ideas\n`;
    md += `- [ ] Evaluate feasibility\n`;
    md += `- [ ] Create action plan\n`;
    md += `- [ ] Set timeline\n`;

    return md;
  }
}

// ========================================
// DEBUG MODE - Problem solving
// ========================================
class DebugTemplate extends BaseTemplate {
  constructor() {
    super('debug-mode', 'Debug Mode', 'Systematic problem solving and debugging');
    this.phases = [
      'Problem',         // Define the issue
      'Hypothesis',      // What might be wrong
      'Investigation',   // Gather evidence
      'Solution',        // Fix attempts
      'Validation'       // Confirm it works
    ];
    this.problem = null;
    this.hypotheses = [];
    this.attempts = [];
    this.solution = null;
  }

  processMessage(message, role) {
    const lower = message.toLowerCase();
    let phase = this.phases[this.currentPhase];
    let category = 'discussion';
    let shouldTransition = false;
    let insights = [];

    // Detect problem statement
    if (this.currentPhase === 0 && (lower.includes('error') || lower.includes('not working') || lower.includes('problem'))) {
      this.problem = message;
      category = 'problem';
      shouldTransition = true;
      this.currentPhase = 1;
    }

    // Detect hypotheses
    if (lower.match(/might be|could be|probably|possibly|maybe it's|i think it's/)) {
      category = 'hypothesis';
      this.hypotheses.push({
        content: message,
        timestamp: Date.now()
      });
    }

    // Detect solution attempts
    if (lower.match(/try|let's|i'll change|modify|update|fix/)) {
      category = 'attempt';
      this.attempts.push({
        content: message,
        timestamp: Date.now()
      });
      
      if (this.currentPhase < 3) {
        shouldTransition = true;
        this.currentPhase = 3;
      }
    }

    // Detect success
    if (lower.match(/works|fixed|solved|success|that did it|perfect/)) {
      category = 'solution';
      this.solution = message;
      shouldTransition = true;
      this.currentPhase = 4;
    }

    return {
      phase: this.phases[this.currentPhase],
      category: category,
      shouldTransition: shouldTransition,
      nextPhase: shouldTransition ? this.phases[this.currentPhase] : null,
      insights: insights
    };
  }

  getUI() {
    return `
      <div class="template-header debug-mode">
        <div class="template-title">
          <span class="template-icon">🔧</span>
          <span>Debug Mode Active</span>
        </div>
        <div class="template-progress">
          <div class="progress-bar">
            ${this.phases.map((phase, i) => `
              <div class="progress-step ${i <= this.currentPhase ? 'active' : ''} ${i === 4 && this.solution ? 'success' : ''}" 
                   title="${phase}">
                ${this.getPhaseIcon(phase)}
              </div>
            `).join('')}
          </div>
          <div class="current-phase">${this.phases[this.currentPhase]}</div>
        </div>
        <div class="debug-stats">
          <div class="stat">
            <span class="stat-value">${this.hypotheses.length}</span>
            <span class="stat-label">Theories</span>
          </div>
          <div class="stat">
            <span class="stat-value">${this.attempts.length}</span>
            <span class="stat-label">Attempts</span>
          </div>
          <div class="stat ${this.solution ? 'success' : ''}">
            <span class="stat-value">${this.solution ? '✓' : '○'}</span>
            <span class="stat-label">Solved</span>
          </div>
        </div>
      </div>
      <div class="template-actions">
        <button class="template-btn" id="debug-export">Export Debug Log</button>
        <button class="template-btn" id="debug-docs">Create Documentation</button>
      </div>
    `;
  }

  attachEventListeners() {
    document.getElementById('debug-export')?.addEventListener('click', () => {
      const markdown = this.toMarkdown({});
      this.downloadFile('debug-log.md', markdown);
    });

    document.getElementById('debug-docs')?.addEventListener('click', () => {
      const docs = this.generateDocumentation();
      this.downloadFile('solution-documentation.md', docs);
    });
  }

  downloadFile(filename, content) {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  generateDocumentation() {
    let md = `# Solution Documentation\n\n`;
    
    if (this.problem) {
      md += `## Problem\n\n${this.problem}\n\n`;
    }

    if (this.solution) {
      md += `## Solution\n\n${this.solution}\n\n`;
    }

    md += `## Troubleshooting Steps\n\n`;
    this.attempts.forEach((attempt, i) => {
      md += `${i + 1}. ${attempt.content}\n`;
    });

    return md;
  }

  getPhaseIcon(phase) {
    const icons = {
      'Problem': '🚨',
      'Hypothesis': '💭',
      'Investigation': '🔍',
      'Solution': '🔧',
      'Validation': '✅'
    };
    return icons[phase] || '📍';
  }

  getPhaseDescription(phase) {
    const descriptions = {
      'Problem': 'Defining what\'s wrong',
      'Hypothesis': 'Forming theories about the cause',
      'Investigation': 'Gathering evidence and testing',
      'Solution': 'Implementing fixes',
      'Validation': 'Confirming it works'
    };
    return descriptions[phase] || phase;
  }

  toMarkdown(data) {
    let md = `# Debug Session Log\n\n`;
    md += `Date: ${new Date().toLocaleDateString()}\n\n`;
    
    if (this.problem) {
      md += `## Problem Statement\n\n${this.problem}\n\n`;
    }

    if (this.hypotheses.length > 0) {
      md += `## Hypotheses\n\n`;
      this.hypotheses.forEach((h, i) => {
        md += `${i + 1}. ${h.content}\n`;
      });
      md += `\n`;
    }

    if (this.attempts.length > 0) {
      md += `## Solution Attempts\n\n`;
      this.attempts.forEach((a, i) => {
        md += `### Attempt ${i + 1}\n${a.content}\n\n`;
      });
    }

    if (this.solution) {
      md += `## ✅ Final Solution\n\n${this.solution}\n\n`;
    }

    return md;
  }
}

// Export for use in content script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    TemplateEngine,
    LearningTemplate,
    BrainstormTemplate,
    DebugTemplate
  };
}
