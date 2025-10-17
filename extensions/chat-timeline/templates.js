// AI Chat Timeline Navigator - Templates System v2.0
// The Unbelievable Cognitive Framework Engine

class TemplateEngine {
  constructor(timelineNavigator) {
    this.navigator = timelineNavigator;
    this.activeMode = null;
    this.modeData = {};
    this.init();
  }

  init() {
    console.log('[Templates] Initializing Template Engine');
    this.injectModeSelector();
    this.loadSavedMode();
  }

  // The 7 Foundation Modes
  getModes() {
    return {
      learning: {
        name: '🎓 Genius Learning',
        description: 'Transform conversations into complete learning experiences',
        color: '#4CAF50',
        stages: [
          { name: 'Concept Introduction', icon: '📚', prompt: 'Explain this concept simply' },
          { name: 'Deep Dive', icon: '🔍', prompt: 'Now explain the technical details' },
          { name: 'Real-World Applications', icon: '💡', prompt: 'Where is this used in practice?' },
          { name: 'Practice Problems', icon: '✏️', prompt: 'Give me exercises to practice' },
          { name: 'Knowledge Check', icon: '🎯', prompt: 'Quiz me on what we covered' },
          { name: 'Summary Notes', icon: '📝', prompt: 'Create a study guide summary' }
        ],
        features: ['flashcards', 'concept-map', 'export-notion', 'quiz-mode'],
        premium: false
      },
      
      brainstorm: {
        name: '💡 Breakthrough Brainstorm',
        description: 'Structured ideation that generates breakthrough ideas',
        color: '#FF9800',
        stages: [
          { name: 'Diverge', icon: '🌊', prompt: 'Generate as many wild ideas as possible' },
          { name: 'Explore', icon: '🔍', prompt: 'Deep dive on the top 3 ideas' },
          { name: 'Converge', icon: '🎯', prompt: 'Analyze and score ideas' },
          { name: 'Execute', icon: '📋', prompt: 'Create action plan for best idea' }
        ],
        features: ['idea-board', 'voting', 'priority-matrix', 'export-miro'],
        premium: true
      },
      
      debug: {
        name: '🐛 Debug Detective',
        description: 'Systematic problem-solving for any issue',
        color: '#F44336',
        stages: [
          { name: 'Problem Statement', icon: '🔴', prompt: 'Clearly define what is broken' },
          { name: 'Hypothesis Generation', icon: '🔍', prompt: 'What could be causing this?' },
          { name: 'Testing Protocol', icon: '🧪', prompt: 'Let me try solution X' },
          { name: 'Solution Found', icon: '✅', prompt: 'This worked! Here is why' },
          { name: 'Documentation', icon: '📚', prompt: 'Document this for future reference' }
        ],
        features: ['test-tracker', 'solution-library', 'stack-overflow', 'auto-docs'],
        premium: true
      },
      
      writing: {
        name: '✍️ Writing Evolution',
        description: 'Version control for creative writing',
        color: '#9C27B0',
        stages: [
          { name: 'Draft 1.0', icon: '📝', prompt: 'Brain dump version - just write' },
          { name: 'Feedback Session', icon: '🔍', prompt: 'Analyze and suggest improvements' },
          { name: 'Draft 2.0', icon: '📝', prompt: 'Revised version with changes' },
          { name: 'Polish Pass', icon: '🎨', prompt: 'Final language and flow refinement' },
          { name: 'Final Version', icon: '✅', prompt: 'Publication-ready version' }
        ],
        features: ['version-history', 'side-by-side', 'style-analysis', 'export-medium'],
        premium: true
      },
      
      decision: {
        name: '🎯 Decision Matrix',
        description: 'Structured decision-making for important choices',
        color: '#2196F3',
        stages: [
          { name: 'Decision Statement', icon: '❓', prompt: 'What decision needs to be made?' },
          { name: 'Options Generation', icon: '📊', prompt: 'List all possible options' },
          { name: 'Criteria Definition', icon: '⚖️', prompt: 'What criteria matter most?' },
          { name: 'Analysis', icon: '🔢', prompt: 'Score each option against criteria' },
          { name: 'Final Decision', icon: '🎯', prompt: 'Make the call with rationale' }
        ],
        features: ['matrix-view', 'ai-research', 'scenario-simulator', 'decision-diary'],
        premium: true
      },
      
      project: {
        name: '🚀 Project Accelerator',
        description: 'Turn ideas into executable project plans',
        color: '#00BCD4',
        stages: [
          { name: 'Vision', icon: '💡', prompt: 'What are we building and why?' },
          { name: 'Goals & Metrics', icon: '🎯', prompt: 'Define success criteria' },
          { name: 'Roadmap', icon: '🗺️', prompt: 'Break down into milestones' },
          { name: 'Task Breakdown', icon: '📋', prompt: 'Generate detailed task list' },
          { name: 'Sprint Planning', icon: '🏃', prompt: 'Week-by-week execution plan' }
        ],
        features: ['gantt-chart', 'task-estimator', 'dependency-mapper', 'export-asana'],
        premium: true
      },
      
      research: {
        name: '🎓 Research Synthesizer',
        description: 'Transform conversations into research papers',
        color: '#673AB7',
        stages: [
          { name: 'Research Phase', icon: '📚', prompt: 'Gather information on topic' },
          { name: 'Connection Phase', icon: '🔗', prompt: 'Find patterns and links' },
          { name: 'Synthesis Phase', icon: '📊', prompt: 'Identify key insights' },
          { name: 'Output Generation', icon: '📝', prompt: 'Generate formatted paper' }
        ],
        features: ['cross-search', 'knowledge-graph', 'citation-gen', 'export-pdf'],
        premium: true
      }
    };
  }

  injectModeSelector() {
    // Add mode selector to timeline header
    const header = document.querySelector('.ai-timeline-header');
    if (!header) return;

    const modeButton = document.createElement('button');
    modeButton.id = 'ai-mode-selector';
    modeButton.className = 'ai-timeline-btn ai-mode-btn';
    modeButton.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 4a.5.5 0 0 1 .5.5V6a.5.5 0 0 1-1 0V4.5A.5.5 0 0 1 8 4zM3.732 5.732a.5.5 0 0 1 .707 0l.915.914a.5.5 0 1 1-.708.708l-.914-.915a.5.5 0 0 1 0-.707zM2 10a.5.5 0 0 1 .5-.5h1.586a.5.5 0 0 1 0 1H2.5A.5.5 0 0 1 2 10zm9.5 0a.5.5 0 0 1 .5-.5h1.5a.5.5 0 0 1 0 1H12a.5.5 0 0 1-.5-.5zm.754-4.246a.389.389 0 0 0-.527-.02L7.547 9.31a.91.91 0 1 0 1.302 1.258l3.434-4.297a.389.389 0 0 0-.029-.518z"/>
        <path fill-rule="evenodd" d="M0 10a8 8 0 1 1 15.547 2.661c-.442 1.253-1.845 1.602-2.932 1.25C11.309 13.488 9.475 13 8 13c-1.474 0-3.31.488-4.615.911-1.087.352-2.49.003-2.932-1.25A7.988 7.988 0 0 1 0 10zm8-7a7 7 0 0 0-6.603 9.329c.203.575.923.876 1.68.63C4.397 12.533 6.358 12 8 12s3.604.532 4.923.96c.757.245 1.477-.056 1.68-.631A7 7 0 0 0 8 3z"/>
      </svg>
      <span>Mode</span>
    `;
    
    const controls = header.querySelector('.ai-timeline-controls');
    controls.insertBefore(modeButton, controls.firstChild);

    modeButton.addEventListener('click', () => this.showModeSelector());
  }

  showModeSelector() {
    // Create modal for mode selection
    const modal = document.createElement('div');
    modal.className = 'ai-mode-modal';
    modal.innerHTML = `
      <div class="ai-mode-modal-content">
        <div class="ai-mode-modal-header">
          <h2>🚀 Choose Your Cognitive Mode</h2>
          <button class="ai-mode-close">×</button>
        </div>
        <div class="ai-mode-grid">
          ${this.renderModeCards()}
        </div>
        <div class="ai-mode-footer">
          <div class="ai-mode-upgrade">
            💎 Premium modes unlock advanced features
            <button class="ai-upgrade-btn">Upgrade to Pro</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Event listeners
    modal.querySelector('.ai-mode-close').addEventListener('click', () => {
      modal.remove();
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    modal.querySelectorAll('.ai-mode-card').forEach(card => {
      card.addEventListener('click', () => {
        const modeId = card.dataset.mode;
        const mode = this.getModes()[modeId];
        
        if (mode.premium && !this.isPremium()) {
          this.showUpgradePrompt(mode);
        } else {
          this.activateMode(modeId);
          modal.remove();
        }
      });
    });
  }

  renderModeCards() {
    const modes = this.getModes();
    return Object.entries(modes).map(([id, mode]) => `
      <div class="ai-mode-card ${mode.premium ? 'premium' : ''}" 
           data-mode="${id}"
           style="border-left: 4px solid ${mode.color}">
        <div class="ai-mode-card-header">
          <span class="ai-mode-name">${mode.name}</span>
          ${mode.premium ? '<span class="ai-mode-badge">PRO</span>' : '<span class="ai-mode-badge free">FREE</span>'}
        </div>
        <p class="ai-mode-description">${mode.description}</p>
        <div class="ai-mode-stages">
          ${mode.stages.slice(0, 3).map(s => `<span class="ai-mode-stage-pill">${s.icon} ${s.name}</span>`).join('')}
          ${mode.stages.length > 3 ? `<span class="ai-mode-more">+${mode.stages.length - 3} more</span>` : ''}
        </div>
      </div>
    `).join('');
  }

  activateMode(modeId) {
    this.activeMode = modeId;
    const mode = this.getModes()[modeId];
    
    console.log('[Templates] Activated mode:', mode.name);
    
    // Save to localStorage
    localStorage.setItem('ai-timeline-mode', modeId);
    
    // Update UI
    this.updateTimelineForMode(mode);
    this.showModeActivatedNotification(mode);
    
    // Initialize mode-specific features
    this.initializeModeFeatures(modeId, mode);
  }

  updateTimelineForMode(mode) {
    // Add mode indicator to timeline
    const header = document.querySelector('.ai-timeline-header .ai-timeline-title');
    if (header) {
      const modeIndicator = document.createElement('span');
      modeIndicator.className = 'ai-mode-indicator';
      modeIndicator.style.color = mode.color;
      modeIndicator.textContent = mode.name.split(' ')[0]; // Just the emoji
      header.appendChild(modeIndicator);
    }

    // Re-segment conversation based on mode stages
    this.resegmentForMode(mode);
  }

  resegmentForMode(mode) {
    // This would re-analyze the conversation to match mode stages
    // For now, we'll add mode-aware segmentation hints
    const segments = document.querySelectorAll('.ai-timeline-segment');
    
    segments.forEach((segment, index) => {
      const stageIndex = index % mode.stages.length;
      const stage = mode.stages[stageIndex];
      
      // Update segment to show which stage it represents
      const marker = segment.querySelector('.ai-timeline-segment-marker');
      if (marker) {
        marker.innerHTML = `<span class="ai-timeline-segment-icon">${stage.icon}</span>`;
        marker.style.background = mode.color;
      }
      
      // Add stage name hint
      const meta = segment.querySelector('.ai-timeline-segment-meta');
      if (meta) {
        meta.textContent = `${stage.name} • ${meta.textContent}`;
      }
    });
  }

  showModeActivatedNotification(mode) {
    const notification = document.createElement('div');
    notification.className = 'ai-mode-notification';
    notification.innerHTML = `
      <div class="ai-mode-notification-content">
        <strong>${mode.name} Activated!</strong>
        <p>Your conversation will now follow the ${mode.name} framework</p>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('show');
    }, 100);
    
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  initializeModeFeatures(modeId, mode) {
    // Initialize mode-specific features
    switch(modeId) {
      case 'learning':
        this.initLearningMode(mode);
        break;
      case 'brainstorm':
        this.initBrainstormMode(mode);
        break;
      case 'debug':
        this.initDebugMode(mode);
        break;
      // ... other modes
    }
  }

  initLearningMode(mode) {
    // Add flashcard generator button
    this.addFeatureButton('📇 Generate Flashcards', () => {
      this.generateFlashcards();
    });
    
    // Add concept map button
    this.addFeatureButton('🗺️ Concept Map', () => {
      this.generateConceptMap();
    });
    
    // Add export button
    this.addFeatureButton('📤 Export to Notion', () => {
      this.exportToNotion();
    });
  }

  initBrainstormMode(mode) {
    // Add idea board view
    this.addFeatureButton('🎨 Idea Board', () => {
      this.showIdeaBoard();
    });
    
    // Add voting interface
    this.addFeatureButton('🗳️ Vote on Ideas', () => {
      this.showVotingInterface();
    });
  }

  initDebugMode(mode) {
    // Add test tracker
    this.addFeatureButton('✅ Test Tracker', () => {
      this.showTestTracker();
    });
    
    // Add solution library
    this.addFeatureButton('📚 Solution Library', () => {
      this.showSolutionLibrary();
    });
  }

  addFeatureButton(label, onClick) {
    const container = document.getElementById('ai-timeline-segments');
    if (!container) return;
    
    let featureBar = document.querySelector('.ai-mode-feature-bar');
    if (!featureBar) {
      featureBar = document.createElement('div');
      featureBar.className = 'ai-mode-feature-bar';
      container.parentElement.insertBefore(featureBar, container);
    }
    
    const button = document.createElement('button');
    button.className = 'ai-mode-feature-btn';
    button.textContent = label;
    button.addEventListener('click', onClick);
    
    featureBar.appendChild(button);
  }

  // Feature implementations (simplified for MVP)
  generateFlashcards() {
    alert('🎓 Flashcard generation coming soon!\n\nThis will extract key concepts from your conversation and create Anki-compatible flashcards.');
  }

  generateConceptMap() {
    alert('🗺️ Concept mapping coming soon!\n\nThis will create a visual knowledge graph showing how concepts connect.');
  }

  exportToNotion() {
    alert('📤 Notion export coming soon!\n\nThis will format your learning session as a beautiful Notion study guide.');
  }

  showIdeaBoard() {
    alert('🎨 Idea board coming soon!\n\nThis will display all your ideas as draggable cards for organization.');
  }

  showVotingInterface() {
    alert('🗳️ Voting interface coming soon!\n\nThis will let you upvote/downvote ideas to find the best ones.');
  }

  showTestTracker() {
    alert('✅ Test tracker coming soon!\n\nThis will track all solutions you\'ve tried with checkboxes.');
  }

  showSolutionLibrary() {
    alert('📚 Solution library coming soon!\n\nThis will save successful solutions for future reference.');
  }

  isPremium() {
    // Check if user has premium (for now, return false)
    return localStorage.getItem('ai-timeline-premium') === 'true';
  }

  showUpgradePrompt(mode) {
    const modal = document.createElement('div');
    modal.className = 'ai-mode-modal';
    modal.innerHTML = `
      <div class="ai-mode-modal-content ai-upgrade-modal">
        <div class="ai-upgrade-header">
          <h2>💎 Unlock ${mode.name}</h2>
        </div>
        <div class="ai-upgrade-content">
          <p class="ai-upgrade-subtitle">${mode.description}</p>
          
          <div class="ai-upgrade-features">
            <h3>Premium Features:</h3>
            <ul>
              ${mode.features.map(f => `<li>✨ ${this.getFeatureName(f)}</li>`).join('')}
            </ul>
          </div>
          
          <div class="ai-upgrade-pricing">
            <div class="ai-price-card">
              <div class="ai-price-header">Monthly</div>
              <div class="ai-price-amount">$12<span>/month</span></div>
              <button class="ai-upgrade-cta">Get Premium</button>
            </div>
            
            <div class="ai-price-card featured">
              <div class="ai-price-badge">BEST VALUE</div>
              <div class="ai-price-header">Annual</div>
              <div class="ai-price-amount">$100<span>/year</span></div>
              <div class="ai-price-save">Save $44</div>
              <button class="ai-upgrade-cta primary">Get Premium</button>
            </div>
          </div>
          
          <p class="ai-upgrade-footer">
            ✅ All 7 Premium Modes<br>
            ✅ Unlimited Conversations<br>
            ✅ Export to All Platforms<br>
            ✅ Priority Support
          </p>
        </div>
        <button class="ai-mode-close">×</button>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelector('.ai-mode-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
    
    // For demo purposes
    modal.querySelectorAll('.ai-upgrade-cta').forEach(btn => {
      btn.addEventListener('click', () => {
        alert('🚀 Payment integration coming soon!\n\nFor now, activating Premium trial...');
        localStorage.setItem('ai-timeline-premium', 'true');
        modal.remove();
        this.activateMode(Object.keys(this.getModes()).find(k => this.getModes()[k] === mode));
      });
    });
  }

  getFeatureName(featureId) {
    const names = {
      'flashcards': 'Auto-generate Flashcards',
      'concept-map': 'Visual Concept Maps',
      'export-notion': 'Export to Notion',
      'quiz-mode': 'Interactive Quiz Mode',
      'idea-board': 'Visual Idea Board',
      'voting': 'Idea Voting System',
      'priority-matrix': 'Priority Matrix View',
      'export-miro': 'Export to Miro/FigJam',
      'test-tracker': 'Solution Test Tracker',
      'solution-library': 'Personal Solution Library',
      'stack-overflow': 'Stack Overflow Integration',
      'auto-docs': 'Auto-Documentation',
      'version-history': 'Complete Version History',
      'side-by-side': 'Side-by-Side Comparison',
      'style-analysis': 'Writing Style Analysis',
      'export-medium': 'Export to Medium/Substack',
      'matrix-view': 'Interactive Decision Matrix',
      'ai-research': 'AI Research Assistant',
      'scenario-simulator': 'Scenario Simulator',
      'decision-diary': 'Decision Outcome Tracking',
      'gantt-chart': 'Gantt Chart Generator',
      'task-estimator': 'AI Task Estimation',
      'dependency-mapper': 'Dependency Mapping',
      'export-asana': 'Export to Asana/Trello',
      'cross-search': 'Cross-Conversation Search',
      'knowledge-graph': 'Knowledge Graph Visualization',
      'citation-gen': 'Auto Citation Generator',
      'export-pdf': 'PDF Research Paper Export'
    };
    return names[featureId] || featureId;
  }

  loadSavedMode() {
    const savedMode = localStorage.getItem('ai-timeline-mode');
    if (savedMode && this.getModes()[savedMode]) {
      this.activateMode(savedMode);
    }
  }
}

// Initialize when timeline is ready
if (window.chatTimelineNavigator) {
  window.templateEngine = new TemplateEngine(window.chatTimelineNavigator);
}
