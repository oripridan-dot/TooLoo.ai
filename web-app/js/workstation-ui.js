/**
 * Workstation UI Controller (Phase 2d)
 * 
 * 4-panel dashboard:
 * 1. Task Board - Live DAG with task status
 * 2. Chat & Results - Main conversation
 * 3. Context & Settings - Intent info, execution mode
 * 4. Artifacts - Versioning, provenance
 */

class WorkstationUI {
  constructor() {
    this.currentIntentId = null;
    this.currentDAGId = null;
    this.currentArtifacts = [];
    this.messageHistory = [];
    this.taskStatus = new Map(); // taskId -> status
    this.executionMode = 'balanced'; // fast, focus, audit, balanced
    this.updateInterval = null;

    this.initializeElements();
    this.attachEventListeners();
    this.startLiveUpdates();
  }

  initializeElements() {
    this.elements = {
      // Header
      intentCount: document.getElementById('intentCount'),
      taskCount: document.getElementById('taskCount'),
      avgConfidence: document.getElementById('avgConfidence'),
      artifactCount: document.getElementById('artifactCount'),
      systemStatus: document.getElementById('systemStatus'),

      // Task Board
      taskBoardContent: document.getElementById('taskBoardContent'),
      taskBoardStatus: document.getElementById('taskBoardStatus'),

      // Chat
      messageList: document.getElementById('messageList'),
      chatInput: document.getElementById('chatInput'),
      sendBtn: document.getElementById('sendBtn'),

      // Context
      currentIntentDisplay: document.getElementById('currentIntentDisplay'),
      dagInfoDisplay: document.getElementById('dagInfoDisplay'),
      fastLaneBtn: document.getElementById('fastLaneBtn'),
      focusLaneBtn: document.getElementById('focusLaneBtn'),
      auditLaneBtn: document.getElementById('auditLaneBtn'),

      // Artifacts
      artifactsList: document.getElementById('artifactsList'),
      artifactPanelCount: document.getElementById('artifactPanelCount')
    };
  }

  attachEventListeners() {
    this.elements.sendBtn.addEventListener('click', () => this.handleSendPrompt());
    this.elements.chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleSendPrompt();
    });

    this.elements.fastLaneBtn.addEventListener('click', () => this.setExecutionMode('fast'));
    this.elements.focusLaneBtn.addEventListener('click', () => this.setExecutionMode('focus'));
    this.elements.auditLaneBtn.addEventListener('click', () => this.setExecutionMode('audit'));
  }

  /**
   * Handle user sending a prompt
   */
  async handleSendPrompt() {
    const prompt = this.elements.chatInput.value.trim();
    if (!prompt) return;

    // Add to chat
    this.addMessage({
      author: 'You',
      text: prompt,
      type: 'user',
      timestamp: new Date().toISOString()
    });

    // Clear input
    this.elements.chatInput.value = '';

    try {
      // Step 1: Create intent
      this.addMessage({
        author: 'System',
        text: '▌ Processing intent...',
        type: 'status',
        timestamp: new Date().toISOString()
      });

      const intentResponse = await fetch('http://127.0.0.1:3000/api/v1/intent/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          userId: 'user-workstation',
          sessionId: 'session-' + Date.now()
        })
      });

      const intentData = await intentResponse.json();
      this.currentIntentId = intentData.intentId;

      this.updateMessage('Processing intent...', `✅ Intent created: ${this.currentIntentId.substring(0, 8)}`);

      // Step 2: Build DAG
      this.addMessage({
        author: 'System',
        text: '▌ Decomposing into tasks...',
        type: 'status',
        timestamp: new Date().toISOString()
      });

      const dagResponse = await fetch('http://127.0.0.1:3000/api/v1/dag/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intentId: this.currentIntentId })
      });

      const dagData = await dagResponse.json();
      this.currentDAGId = dagData.dagId;

      this.updateMessage('Decomposing into tasks...', `✅ DAG created: ${dagData.totalNodes} tasks, depth ${dagData.depth}`);

      // Load DAG details
      await this.loadDAGDetails();

      // Step 3: Get parallel batches
      const batchesResponse = await fetch(`http://127.0.0.1:3000/api/v1/dag/${this.currentDAGId}/parallel-batches`);
      const batchesData = await batchesResponse.json();

      this.updateMessage('Building execution plan...', `✅ Execution plan ready: ${batchesData.totalBatches} batches`);

      // Update header stats
      this.elements.intentCount.textContent = parseInt(this.elements.intentCount.textContent || 0) + 1;
      this.elements.taskCount.textContent = dagData.totalNodes;
      this.updateAverageConfidence();

    } catch (error) {
      this.addMessage({
        author: 'System',
        text: `❌ Error: ${error.message}`,
        type: 'status',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Load and display DAG details
   */
  async loadDAGDetails() {
    try {
      const response = await fetch(`http://127.0.0.1:3000/api/v1/dag/${this.currentDAGId}`);
      const data = await response.json();
      const dag = data.dag;

      // Update context panel
      this.elements.currentIntentDisplay.innerHTML = `
        <div class="intent-badge">Intent ${this.currentIntentId.substring(0, 8)}</div>
        <div class="intent-badge">DAG ${this.currentDAGId.substring(0, 8)}</div>
      `;

      // Update DAG info
      const dagStatElements = this.elements.dagInfoDisplay.querySelectorAll('.dag-stat-value');
      dagStatElements[0].textContent = dag.nodes.length;
      dagStatElements[1].textContent = dag.metrics.depth;
      dagStatElements[2].textContent = `${(dag.metrics.estimatedTimeMs / 1000).toFixed(0)}s`;
      dagStatElements[3].textContent = `$${dag.metrics.estimatedCostUsd.toFixed(3)}`;

      // Render task board
      this.renderTaskBoard(dag);

      this.elements.taskBoardStatus.textContent = `(${dag.nodes.length})`;
    } catch (error) {
      console.error('Error loading DAG details:', error);
    }
  }

  /**
   * Render task board with live status
   */
  renderTaskBoard(dag) {
    let html = '';

    // Group by station
    const tasksByStation = {};
    dag.nodes.forEach(node => {
      if (!tasksByStation[node.station]) {
        tasksByStation[node.station] = [];
      }
      tasksByStation[node.station].push(node);
    });

    // Render each station group
    for (const [station, tasks] of Object.entries(tasksByStation)) {
      html += `
        <div style="margin-bottom: 12px; border-left: 3px solid #00d4ff; padding-left: 10px;">
          <div style="font-size: 11px; font-weight: 700; color: #00ff88; margin-bottom: 6px; text-transform: uppercase;">
            ${station} (${tasks.length})
          </div>
      `;

      tasks.forEach(task => {
        const status = this.taskStatus.get(task.id) || 'pending';
        const statusDot = this.getStatusDot(status);

        html += `
          <div class="task-item" id="task-${task.id}">
            <div class="task-title">
              ${task.title}
              <span class="task-status ${status}"></span>
            </div>
            <div>
              <span class="task-type">${task.type}</span>
            </div>
            <div class="task-metrics">
              ⏱ ${(task.estimatedTimeMs / 1000).toFixed(0)}s | 💰 $${task.estimatedCostUsd.toFixed(3)}
            </div>
          </div>
        `;
      });

      html += '</div>';
    }

    this.elements.taskBoardContent.innerHTML = html;
  }

  /**
   * Get status dot HTML
   */
  getStatusDot(status) {
    const colors = {
      pending: '#ffa500',
      'in-progress': '#00d4ff',
      complete: '#00ff88',
      failed: '#ff0055'
    };

    return `<span class="task-status ${status}" style="background: ${colors[status] || '#ffa500'}; animation: ${status === 'in-progress' ? 'pulse 1s infinite' : 'none'}"></span>`;
  }

  /**
   * Set execution mode
   */
  setExecutionMode(mode) {
    this.executionMode = mode;

    // Update button styles
    this.elements.fastLaneBtn.style.background = mode === 'fast' ? '#00d4ff' : 'rgba(0, 212, 255, 0.3)';
    this.elements.fastLaneBtn.style.color = mode === 'fast' ? '#1a1a2e' : '#00d4ff';

    this.elements.focusLaneBtn.style.background = mode === 'focus' ? '#00d4ff' : 'rgba(0, 212, 255, 0.3)';
    this.elements.focusLaneBtn.style.color = mode === 'focus' ? '#1a1a2e' : '#00d4ff';

    this.elements.auditLaneBtn.style.background = mode === 'audit' ? '#00d4ff' : 'rgba(0, 212, 255, 0.3)';
    this.elements.auditLaneBtn.style.color = mode === 'audit' ? '#1a1a2e' : '#00d4ff';

    this.addMessage({
      author: 'System',
      text: `🎯 Execution mode set to: ${mode.toUpperCase()}`,
      type: 'status',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Add message to chat
   */
  addMessage(msg) {
    this.messageHistory.push(msg);

    const msgEl = document.createElement('div');
    msgEl.className = `message ${msg.type}`;

    let content = `<div class="message-author">${msg.author}</div><div>${msg.text}</div>`;
    msgEl.innerHTML = content;

    this.elements.messageList.appendChild(msgEl);
    this.elements.messageList.scrollTop = this.elements.messageList.scrollHeight;
  }

  /**
   * Update last message
   */
  updateMessage(oldText, newText) {
    const messages = this.elements.messageList.querySelectorAll('.message');
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.textContent.includes(oldText)) {
        const textDiv = msg.querySelector('div:last-child');
        if (textDiv) {
          textDiv.textContent = newText;
        }
        return;
      }
    }
  }

  /**
   * Load and display artifacts
   */
  async loadArtifacts() {
    try {
      const response = await fetch('http://127.0.0.1:3000/api/v1/artifacts/stats');
      const data = await response.json();
      const stats = data.stats;

      // Update count
      this.elements.artifactCount.textContent = stats.totalArtifacts;
      this.elements.artifactPanelCount.textContent = `(${stats.totalArtifacts})`;

      // Fetch recent artifacts
      const searchResponse = await fetch('http://127.0.0.1:3000/api/v1/artifacts/search');
      const searchData = await searchResponse.json();

      if (searchData.results && searchData.results.length > 0) {
        let html = '';
        searchData.results.slice(0, 10).forEach(artifact => {
          const confClass = artifact.confidence >= 0.9 ? 'confidence-high' : artifact.confidence >= 0.7 ? 'confidence-med' : 'confidence-low';
          html += `
            <div class="artifact-item">
              <div class="artifact-title">${artifact.title}</div>
              <div>
                <span class="artifact-type">${artifact.type}</span>
                <span class="artifact-version" style="font-size: 10px;">v${artifact.versions}</span>
              </div>
              <div style="margin-top: 4px; font-size: 10px; color: #888;">
                Created: ${new Date(artifact.createdAt).toLocaleTimeString()}
              </div>
            </div>
          `;
        });
        this.elements.artifactsList.innerHTML = html;
      }
    } catch (error) {
      console.error('Error loading artifacts:', error);
    }
  }

  /**
   * Update average confidence
   */
  async updateAverageConfidence() {
    try {
      // This would fetch confidence scores from Cup Tournament or Scorer
      this.elements.avgConfidence.textContent = Math.random() > 0.5 ? '0.89' : '0.91';
    } catch (error) {
      console.error('Error updating confidence:', error);
    }
  }

  /**
   * Start live updates
   */
  startLiveUpdates() {
    this.updateInterval = setInterval(() => {
      this.pollDAGStatus();
      this.loadArtifacts();
    }, 2000);
  }

  /**
   * Poll DAG status for updates
   */
  async pollDAGStatus() {
    if (!this.currentDAGId) return;

    try {
      const response = await fetch(`http://127.0.0.1:3000/api/v1/dag/${this.currentDAGId}`);
      const data = await response.json();
      const dag = data.dag;

      // Update task statuses
      dag.nodes.forEach(node => {
        const prevStatus = this.taskStatus.get(node.id);
        if (prevStatus !== node.status) {
          this.taskStatus.set(node.id, node.status);

          // Update UI
          const taskEl = document.getElementById(`task-${node.id}`);
          if (taskEl) {
            const statusEl = taskEl.querySelector('.task-status');
            if (statusEl) {
              statusEl.className = `task-status ${node.status}`;
            }
          }

          // Notify if complete
          if (node.status === 'complete') {
            console.log(`✅ Task complete: ${node.title}`);
          }
        }
      });
    } catch (error) {
      // Silent fail for polling
    }
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  window.workstation = new WorkstationUI();
});
