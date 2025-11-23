/* ============================================
   PROVIDERS ARENA - SMART AGGREGATION APP
   ============================================ */

const API_BASE = '/api/arena';

const PROVIDERS_INFO = {
  openai: {
    name: 'OpenAI',
    icon: '🤖',
    description: 'GPT-3.5 Turbo - Advanced language understanding',
    model: 'gpt-3.5-turbo',
    color: '#10a37f'
  },
  anthropic: {
    name: 'Anthropic',
    icon: '🧠',
    description: 'Claude - Constitutional AI for safety',
    model: 'claude-3-sonnet',
    color: '#9b59b6'
  },
  gemini: {
    name: 'Google Gemini',
    icon: '✨',
    description: 'Gemini Pro - Multimodal reasoning',
    model: 'gemini-pro',
    color: '#4f46e5'
  }
};

/* ============================================
   DOM ELEMENTS
   ============================================ */

const promptInput = document.getElementById('prompt-input');
const aggregateBtn = document.getElementById('aggregate-btn');
const healthBtn = document.getElementById('health-btn');
const clearBtn = document.getElementById('clear-btn');
const loadingEl = document.getElementById('loading');
const aggregatedResult = document.getElementById('aggregated-result');
const healthResult = document.getElementById('health-result');
const providersGrid = document.getElementById('providers-grid');

/* ============================================
   INITIALIZATION
   ============================================ */

document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await loadProviders();
});

function setupEventListeners() {
  aggregateBtn.addEventListener('click', handleAggregation);
  healthBtn.addEventListener('click', handleHealthCheck);
  clearBtn.addEventListener('click', () => {
    promptInput.value = '';
    aggregatedResult.classList.add('hidden');
    healthResult.classList.add('hidden');
    promptInput.focus();
  });

  // Allow Shift+Enter to submit
  promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.shiftKey) {
      handleAggregation();
    }
  });
}

/* ============================================
   LOAD PROVIDERS
   ============================================ */

async function loadProviders() {
  try {
    const response = await fetch(`${API_BASE}/providers`);
    const data = await response.json();
    renderProviders(data.providers);
  } catch (error) {
    console.error('Error loading providers:', error);
    providersGrid.innerHTML = '<p style="grid-column: 1 / -1; color: #ff6b6b;">Error loading providers</p>';
  }
}

function renderProviders(providers) {
  providersGrid.innerHTML = providers.map(provider => {
    const info = PROVIDERS_INFO[provider];
    return `
      <div class="provider-card ${provider}">
        <div class="provider-icon">${info.icon}</div>
        <div class="provider-name">${info.name}</div>
        <div class="provider-description">${info.description}</div>
        <div class="provider-meta">Model: ${info.model}</div>
      </div>
    `;
  }).join('');
}

/* ============================================
   AGGREGATION LOGIC
   ============================================ */

async function handleAggregation() {
  const prompt = promptInput.value.trim();
  
  if (!prompt) {
    alert('Please enter a prompt');
    return;
  }

  loadingEl.classList.remove('hidden');
  aggregatedResult.classList.add('hidden');
  healthResult.classList.add('hidden');
  aggregateBtn.disabled = true;

  try {
    const response = await fetch(`${API_BASE}/aggregate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    renderAggregatedResponse(data);
  } catch (error) {
    console.error('Error:', error);
    alert('Error getting aggregated response: ' + error.message);
  } finally {
    loadingEl.classList.add('hidden');
    aggregateBtn.disabled = false;
  }
}

function renderAggregatedResponse(data) {
  // Update stats
  document.getElementById('providers-used').textContent = `${data.providersUsed.length} provider${data.providersUsed.length !== 1 ? 's' : ''}`;
  document.getElementById('providers-success').textContent = `${data.successfulProviders} successful`;
  document.getElementById('providers-failed').textContent = `${data.failedProviders} failed`;

  // Render aggregated text
  document.getElementById('aggregated-text').textContent = data.aggregatedResponse;

  // Render consensus
  const consensusInfo = document.getElementById('consensus-info');
  if (data.consensus.keyTerms && data.consensus.keyTerms.length > 0) {
    consensusInfo.innerHTML = `
      <div class="consensus-item">
        <strong>Agreement Level:</strong> ${data.consensus.agreement}
      </div>
      <div class="consensus-item">
        <strong>Key Terms:</strong> ${data.consensus.keyTerms.join(', ')}
      </div>
      <div class="consensus-item">
        <strong>Providers Analyzed:</strong> ${data.consensus.diversity}
      </div>
    `;
  } else {
    consensusInfo.innerHTML = '<div class="consensus-item">Single provider response</div>';
  }

  // Render unique insights
  const insightsList = document.getElementById('insights-list');
  if (data.providerInsights && data.providerInsights.length > 0) {
    insightsList.innerHTML = data.providerInsights.map(insight => `
      <div class="insight-item">
        <div class="insight-provider">${PROVIDERS_INFO[insight.provider].name}</div>
        <div class="insight-text">${escapeHtml(insight.uniquePoint)}</div>
      </div>
    `).join('');
  } else {
    insightsList.innerHTML = '<div class="insight-item">No unique insights available</div>';
  }

  // Render all provider responses if we have more than one
  if (data.providers && data.providers.length > 1) {
    const allResponses = document.getElementById('all-responses');
    const responsesGrid = document.getElementById('responses-grid');
    
    responsesGrid.innerHTML = data.providers.map(provider => {
      const info = PROVIDERS_INFO[provider.name];
      return `
        <div class="response-card">
          <div class="response-card-header">${info.icon} ${info.name}</div>
          <div class="response-card-text">${escapeHtml(provider.response)}</div>
        </div>
      `;
    }).join('');
    
    allResponses.classList.remove('hidden');
  } else {
    document.getElementById('all-responses').classList.add('hidden');
  }

  aggregatedResult.classList.remove('hidden');
}

/* ============================================
   HEALTH CHECK LOGIC
   ============================================ */

async function handleHealthCheck() {
  loadingEl.classList.remove('hidden');
  healthResult.classList.add('hidden');
  aggregatedResult.classList.add('hidden');
  healthBtn.disabled = true;

  try {
    const response = await fetch(`${API_BASE}/health`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    renderHealthStatus(data);
  } catch (error) {
    console.error('Error:', error);
    alert('Error checking provider health: ' + error.message);
  } finally {
    loadingEl.classList.add('hidden');
    healthBtn.disabled = false;
  }
}

function renderHealthStatus(health) {
  const healthGrid = document.getElementById('health-grid');
  
  healthGrid.innerHTML = health.map(item => {
    const info = PROVIDERS_INFO[item.provider];
    return `
      <div class="health-item">
        <div class="health-item-header">
          <div class="health-item-name">${info.icon} ${info.name}</div>
          <div class="health-status-badge ${item.status}">${item.status.toUpperCase()}</div>
        </div>
        ${item.success ? `
          <div class="health-item-detail">
            <strong>Response Time:</strong>
            <span>${item.responseTime}ms</span>
          </div>
        ` : `
          <div class="health-item-detail">
            <strong>Error:</strong>
            <span>${escapeHtml(item.error)}</span>
          </div>
        `}
      </div>
    `;
  }).join('');

  healthResult.classList.remove('hidden');
}

/* ============================================
   UTILITY FUNCTIONS
   ============================================ */

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}