/**
 * WORKBENCH APPLICATION
 * =====================
 * 
 * Frontend application for TooLoo.ai unified productivity system.
 * Handles:
 * - Goal input and intent analysis
 * - Real-time work progress tracking
 * - Service health monitoring
 * - Results display and management
 * - Settings management
 */

class WorkbenchApp {
  constructor() {
    this.baseUrl = window.location.origin;
    this.currentWorkId = null;
    this.pollInterval = null;
    this.intentAnalysis = null;
    this.workResult = null;
    this.services = {
      segmentation: { name: 'Segmentation', port: 3007, status: 'unknown' },
      training: { name: 'Training', port: 3001, status: 'unknown' },
      meta: { name: 'Meta-Learning', port: 3002, status: 'unknown' },
      budget: { name: 'Budget', port: 3003, status: 'unknown' },
      coach: { name: 'Coach', port: 3004, status: 'unknown' },
      product: { name: 'Product Dev', port: 3006, status: 'unknown' },
      reports: { name: 'Reports', port: 3008, status: 'unknown' },
      capabilities: { name: 'Capabilities', port: 3009, status: 'unknown' }
    };

    this.settings = {
      qualityLevel: 'standard',
      outputFormat: 'detailed',
      autoCommit: true,
      createPR: false,
      verbose: true
    };

    this.init();
  }

  init() {
    this.setupElements();
    this.setupEventListeners();
    this.loadSettings();
    this.initializeServiceList();
    this.checkSystemHealth();
  }

  setupElements() {
    this.elements = {
      goalInput: document.getElementById('goalInput'),
      analyzeBtn: document.getElementById('analyzeBtn'),
      executeBtn: document.getElementById('executeBtn'),
      clearBtn: document.getElementById('clearBtn'),
      intentPreview: document.getElementById('intentPreview'),
      intentContent: document.getElementById('intentContent'),
      workProgress: document.getElementById('workProgress'),
      progressFill: document.getElementById('progressFill'),
      progressPercentage: document.getElementById('progressPercentage'),
      stagesTimeline: document.getElementById('stagesTimeline'),
      workGoal: document.getElementById('workGoal'),
      resultsSection: document.getElementById('resultsSection'),
      tabBtns: document.querySelectorAll('.tab-btn'),
      tabContents: document.querySelectorAll('.tab-content'),
      copyResultsBtn: document.getElementById('copyResultsBtn'),
      serviceList: document.getElementById('serviceList'),
      settingsToggle: document.getElementById('settingsToggle'),
      settingsPanel: document.getElementById('settingsPanel'),
      qualityLevel: document.getElementById('qualityLevel'),
      outputFormat: document.getElementById('outputFormat'),
      autoCommit: document.getElementById('autoCommit'),
      createPR: document.getElementById('createPR'),
      verbose: document.getElementById('verbose'),
      saveSettingsBtn: document.getElementById('saveSettingsBtn')
    };
  }

  setupEventListeners() {
    // Goal input
    this.elements.goalInput.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        this.analyzeIntent();
      }
    });

    // Buttons
    this.elements.analyzeBtn.addEventListener('click', () => this.analyzeIntent());
    this.elements.executeBtn.addEventListener('click', () => this.executeWork());
    this.elements.clearBtn.addEventListener('click', () => this.clearForm());
    this.elements.copyResultsBtn.addEventListener('click', () => this.copyResults());

    // Settings
    this.elements.settingsToggle.addEventListener('click', () => this.toggleSettings());
    this.elements.saveSettingsBtn.addEventListener('click', () => this.saveSettings());

    // Tabs
    this.elements.tabBtns.forEach(btn => {
      btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
    });
  }

  async analyzeIntent() {
    const goal = this.elements.goalInput.value.trim();
    if (!goal) {
      alert('Please enter a goal');
      return;
    }

    this.elements.analyzeBtn.disabled = true;
    this.elements.analyzeBtn.innerHTML = '📊 Analyzing<span class="loading"></span>';

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/work/analyze-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal,
          options: {
            qualityLevel: this.settings.qualityLevel,
            outputFormat: this.settings.outputFormat
          }
        })
      });

      const data = await response.json();

      if (data.ok && data.analysis) {
        this.intentAnalysis = data.analysis;
        this.displayIntentPreview();
        this.elements.executeBtn.style.display = 'block';
      } else {
        alert('Error analyzing intent: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to analyze intent: ' + error.message);
    } finally {
      this.elements.analyzeBtn.disabled = false;
      this.elements.analyzeBtn.innerHTML = '📊 Analyze Intent';
    }
  }

  displayIntentPreview() {
    const analysis = this.intentAnalysis;
    
    // Normalize analysis structure from API response
    const services = analysis.suggestedServices || analysis.requiredServices || [];
    const intentType = analysis.intent?.type || analysis.intent || 'unknown';
    const confidence = analysis.confidence || (analysis.intent?.confidence || 0);
    const outputFormat = analysis.output?.formats?.[0] || 'technical';
    const qualityLevel = analysis.quality?.level || 'standard';
    const estimatedDuration = analysis.estimatedDuration || '5-30 seconds';
    
    const serviceNames = services.map(s => {
      const name = this.services[s]?.name || s;
      return `<span style="background: rgba(102,126,234,0.2); padding: 2px 8px; border-radius: 4px; margin-right: 4px;">${name}</span>`;
    }).join('');

    const html = `
      <div>
        <div style="margin-bottom: 10px;">
          <span class="intent-badge">${intentType.toUpperCase()}</span>
          <span class="confidence-score">Confidence: ${(confidence).toFixed(0)}%</span>
        </div>
        <div style="font-size: 0.9em; color: #a0a0a0; margin-bottom: 8px;">
          Format: <strong>${outputFormat}</strong> • Quality: <strong>${qualityLevel}</strong>
        </div>
        <div style="font-size: 0.9em; color: #a0a0a0;">
          Services: ${serviceNames}
        </div>
        <div style="font-size: 0.85em; color: #606060; margin-top: 8px;">
          ⏱️ Estimated duration: ${estimatedDuration}
        </div>
      </div>
    `;

    this.elements.intentContent.innerHTML = html;
    this.elements.intentPreview.classList.add('show');
  }

  async executeWork() {
    const goal = this.elements.goalInput.value.trim();
    if (!goal) {
      alert('Please enter a goal');
      return;
    }

    this.elements.executeBtn.disabled = true;
    this.elements.executeBtn.innerHTML = '▶️ Executing<span class="loading"></span>';

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/work/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal,
          context: { userInterface: 'workbench' },
          options: {
            qualityLevel: this.settings.qualityLevel,
            outputFormat: this.settings.outputFormat,
            commitResults: this.settings.autoCommit,
            createPR: this.settings.createPR
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Work response:', data);

      if (data.ok && data.workId) {
        this.currentWorkId = data.workId;
        this.workResult = data.result;
        this.elements.workGoal.textContent = goal;
        this.elements.workProgress.classList.add('active');
        this.startProgressPoll();
      } else {
        const errorMsg = data.error || JSON.stringify(data);
        console.error('Work error:', errorMsg);
        alert('Error executing work: ' + errorMsg);
      }
    } catch (error) {
      console.error('Execute error:', error);
      alert('Failed to execute work: ' + error.message);
    } finally {
      this.elements.executeBtn.disabled = false;
      this.elements.executeBtn.innerHTML = '▶️ Execute Work';
    }
  }

  startProgressPoll() {
    if (this.pollInterval) clearInterval(this.pollInterval);

    this.pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`${this.baseUrl}/api/v1/work/status`);
        const data = await response.json();

        if (data.ok && data.currentWork) {
          this.updateProgress(data.currentWork);

          // Check if work is complete
          if (data.currentWork.status === 'complete' || data.currentWork.status === 'completed' || data.currentWork.status === 'failed') {
            clearInterval(this.pollInterval);
            setTimeout(() => this.displayResults(data.currentWork), 500);
          }
        }
      } catch (error) {
        console.error('Poll error:', error);
      }
    }, 500); // Poll every 500ms for smoother updates
  }

  updateProgress(workData) {
    // Calculate progress based on stages
    const stages = workData.stages || [];
    const totalStages = 5; // intent_analysis, pipeline_build, service_execution, synthesis, post_process
    const completedStages = stages.length;
    const progress = Math.min(completedStages / totalStages, 1);
    
    this.elements.progressFill.style.width = (progress * 100) + '%';
    this.elements.progressPercentage.textContent = Math.round(progress * 100) + '%';

    // Display stages timeline
    if (stages && stages.length > 0) {
      this.displayStagesTimeline(stages);
    }
  }

  displayStagesTimeline(stages) {
    const stageNames = {
      'intent_analysis': '🎯 Intent Analysis',
      'pipeline_build': '🔗 Pipeline Build',
      'service_execution': '⚡ Service Execution',
      'synthesis': '🔄 Synthesis',
      'post_process': '✅ Post-Process'
    };

    const html = stages.map((stage, index) => {
      const stageName = stageNames[stage.name] || stage.name;
      const time = stage.timestamp ? new Date(stage.timestamp).toLocaleTimeString() : '';
      const duration = index > 0 && stages[index - 1] ? 
        (stage.timestamp - stages[index - 1].timestamp) + 'ms' : '';
      
      // Check if stage has errors
      const hasError = stage.data && Object.values(stage.data).some(v => 
        typeof v === 'object' && v && v.error
      );

      return `
        <div class="stage-item ${hasError ? 'error' : 'success'}" style="padding: 12px; margin: 8px 0; border-left: 3px solid ${hasError ? '#ff6b6b' : '#51cf66'}; background: rgba(255,255,255,0.02); border-radius: 4px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="flex: 1;">
              <div style="font-weight: 600; color: #e0e0e0;">${stageName}</div>
              <div style="font-size: 0.85em; color: #888; margin-top: 4px;">${time} ${duration ? '(' + duration + ')' : ''}</div>
            </div>
            <div style="font-size: 1.2em;">${hasError ? '❌' : '✅'}</div>
          </div>
          ${stage.data && Object.keys(stage.data).length > 0 ? `
            <div style="font-size: 0.8em; color: #666; margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1);">
              ${Object.entries(stage.data).map(([key, val]) => {
                if (typeof val === 'object' && val && val.error) {
                  return `<div style="color: #ff6b6b;">• ${key}: ${val.error}</div>`;
                } else if (typeof val === 'string') {
                  return `<div>• ${key}: ${val.substring(0, 50)}</div>`;
                }
                return '';
              }).join('')}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    // Find or create stages container
    let stagesContainer = document.getElementById('stagesContainer');
    if (!stagesContainer) {
      stagesContainer = document.createElement('div');
      stagesContainer.id = 'stagesContainer';
      stagesContainer.style.marginTop = '20px';
      stagesContainer.style.padding = '0 0 0 20px';
      this.elements.workProgress.parentElement.insertBefore(stagesContainer, this.elements.workProgress.nextSibling);
    }
    stagesContainer.innerHTML = html;
  }

  displayResults(workData) {
    this.elements.resultsSection.classList.add('show');

    // Parse results
    const result = workData.result || {};

    // Summary tab
    const summaryHtml = `
      <div class="result-item">
        <div class="result-item-title">Execution Summary</div>
        <div class="result-item-content">
          <p><strong>Status:</strong> ${workData.status}</p>
          <p><strong>Duration:</strong> ${((workData.endTime - workData.startTime) / 1000).toFixed(2)}s</p>
          <p><strong>Stages Completed:</strong> ${workData.stages ? workData.stages.length : 0}</p>
          ${result.summary ? '<p><strong>Summary:</strong> ' + result.summary + '</p>' : ''}
        </div>
      </div>
    `;
    document.getElementById('summary').innerHTML = summaryHtml;

    // Analysis tab
    if (result.analysis) {
      const analysisHtml = `
        <div class="result-item">
          <div class="result-item-title">Detailed Analysis</div>
          <div class="result-item-content">
            ${typeof result.analysis === 'string' ? result.analysis : JSON.stringify(result.analysis, null, 2)}
          </div>
        </div>
      `;
      document.getElementById('analysis').innerHTML = analysisHtml;
    }

    // Recommendations tab
    if (result.recommendations) {
      const recsHtml = `
        <div class="result-item">
          <div class="result-item-title">Recommendations</div>
          <div class="result-item-content">
            ${typeof result.recommendations === 'string' ? result.recommendations : '<ul>' + Object.values(result.recommendations).map(r => '<li>' + r + '</li>').join('') + '</ul>'}
          </div>
        </div>
      `;
      document.getElementById('recommendations').innerHTML = recsHtml;
    }

    // Artifacts tab
    if (result.artifacts && result.artifacts.length > 0) {
      const artifactsHtml = result.artifacts.map((artifact, i) => `
        <div class="result-item">
          <div class="result-item-title">${artifact.name || 'Artifact ' + (i + 1)}</div>
          <div class="code-block">${artifact.content || artifact}</div>
        </div>
      `).join('');
      document.getElementById('artifacts').innerHTML = artifactsHtml;
    }

    // GitHub info
    if (result.githubCommit || result.pullRequest) {
      const githubHtml = `
        <div class="result-item" style="background: rgba(34,197,94,0.1); border-color: rgba(34,197,94,0.3);">
          <div class="result-item-title">✅ GitHub Integration</div>
          <div class="result-item-content">
            ${result.githubCommit ? '<p>Commit: <code>' + result.githubCommit + '</code></p>' : ''}
            ${result.pullRequest ? '<p>Pull Request: <a href="#" style="color: #667eea;">#' + result.pullRequest + '</a></p>' : ''}
          </div>
        </div>
      `;
      document.getElementById('summary').innerHTML += githubHtml;
    }
  }

  switchTab(tabName) {
    // Update buttons
    this.elements.tabBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Update content
    this.elements.tabContents.forEach(content => {
      content.classList.toggle('active', content.id === tabName);
    });
  }

  copyResults() {
    const activeTab = document.querySelector('.tab-content.active');
    if (activeTab) {
      const text = activeTab.innerText;
      navigator.clipboard.writeText(text).then(() => {
        alert('Results copied to clipboard!');
      });
    }
  }

  clearForm() {
    this.elements.goalInput.value = '';
    this.elements.intentPreview.classList.remove('show');
    this.elements.executeBtn.style.display = 'none';
    this.elements.workProgress.classList.remove('active');
    this.elements.resultsSection.classList.remove('show');
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.currentWorkId = null;
  }

  toggleSettings() {
    const isHidden = this.elements.settingsPanel.style.display === 'none';
    this.elements.settingsPanel.style.display = isHidden ? 'block' : 'none';
  }

  loadSettings() {
    const saved = localStorage.getItem('workbenchSettings');
    if (saved) {
      this.settings = JSON.parse(saved);
      this.elements.qualityLevel.value = this.settings.qualityLevel;
      this.elements.outputFormat.value = this.settings.outputFormat;
      this.elements.autoCommit.checked = this.settings.autoCommit;
      this.elements.createPR.checked = this.settings.createPR;
      this.elements.verbose.checked = this.settings.verbose;
    }
  }

  saveSettings() {
    this.settings = {
      qualityLevel: this.elements.qualityLevel.value,
      outputFormat: this.elements.outputFormat.value,
      autoCommit: this.elements.autoCommit.checked,
      createPR: this.elements.createPR.checked,
      verbose: this.elements.verbose.checked
    };
    localStorage.setItem('workbenchSettings', JSON.stringify(this.settings));
    alert('Settings saved!');
  }

  initializeServiceList() {
    const html = Object.entries(this.services).map(([key, service]) => `
      <div class="service-item healthy" data-service="${key}">
        <div class="service-dot"></div>
        <span class="service-name">${service.name}</span>
        <span class="service-port">:${service.port}</span>
      </div>
    `).join('');
    this.elements.serviceList.innerHTML = html;
  }

  async checkSystemHealth() {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/work/status`);
      if (!response.ok) {
        console.warn('System health check failed');
      }
    } catch (error) {
      console.error('Health check error:', error);
    }
  }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.workbenchApp = new WorkbenchApp();
  });
} else {
  window.workbenchApp = new WorkbenchApp();
}
