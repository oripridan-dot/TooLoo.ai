/**
 * TooLoo.ai Visual Feedback Engine
 * Real-time progress indicators + emotionally resonant visualizations
 * 
 * Provides:
 * - Dynamic progress indicators with visual richness
 * - Interactive data visualizations
 * - Real-time feedback mechanisms
 * - Emotional resonance through design
 */

class VisualFeedbackEngine {
  constructor() {
    this.indicators = new Map();
    this.animations = new Map();
    this.colorScheme = {
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
      pending: '#8b5cf6'
    };
    this.emotionalStates = {
      thinking: '🤔',
      processing: '⚡',
      success: '🎉',
      error: '😔',
      loading: '⏳',
      celebrating: '🚀'
    };
  }

  /**
   * Create dynamic progress indicator
   * @param {string} elementId - Container ID
   * @param {object} config - Configuration
   */
  createProgressIndicator(elementId, config = {}) {
    const {
      label = 'Progress',
      maxSteps = 10,
      showPercentage = true,
      emotionalMode = true,
      animated = true
    } = config;

    const container = document.getElementById(elementId);
    if (!container) return null;

    const indicator = document.createElement('div');
    indicator.className = 'visual-progress-indicator';
    indicator.innerHTML = `
      <div class="progress-header">
        <span class="progress-label">${label}</span>
        <span class="progress-emotion">${this.emotionalStates.loading}</span>
        ${showPercentage ? '<span class="progress-percentage">0%</span>' : ''}
      </div>
      <div class="progress-track">
        <div class="progress-bar"></div>
        <div class="progress-glow"></div>
      </div>
      <div class="progress-milestones">
        ${Array.from({length: maxSteps}, (_, i) =>
          `<div class="milestone" data-step="${i+1}"></div>`
        ).join('')}
      </div>
      <div class="progress-status">Ready to start</div>
    `;

    container.appendChild(indicator);

    const instance = {
      element: indicator,
      currentStep: 0,
      maxSteps,
      showPercentage,
      emotionalMode,
      animated,
      update: (step, status = '') => this.updateProgress(indicator, step, maxSteps, status)
    };

    this.indicators.set(elementId, instance);
    return instance;
  }

  updateProgress(element, step, maxSteps, status = '') {
    const percentage = Math.round((step / maxSteps) * 100);
    const bar = element.querySelector('.progress-bar');
    const glow = element.querySelector('.progress-glow');
    const percentage_el = element.querySelector('.progress-percentage');
    const emotion = element.querySelector('.progress-emotion');
    const status_el = element.querySelector('.progress-status');

    // Update bar
    bar.style.width = percentage + '%';
    glow.style.width = percentage + '%';

    // Update percentage
    if (percentage_el) percentage_el.textContent = percentage + '%';

    // Update emotion based on progress
    if (emotion) {
      if (percentage === 100) emotion.textContent = this.emotionalStates.celebrating;
      else if (percentage > 60) emotion.textContent = this.emotionalStates.processing;
      else emotion.textContent = this.emotionalStates.thinking;
    }

    // Update milestones
    element.querySelectorAll('.milestone').forEach((m, i) => {
      if (i < step) {
        m.classList.add('completed');
        m.textContent = '✓';
      } else if (i === step - 1) {
        m.classList.add('active');
        m.textContent = '●';
      } else {
        m.classList.remove('completed', 'active');
        m.textContent = '';
      }
    });

    // Update status
    if (status_el) status_el.textContent = status || `Step ${step} of ${maxSteps}`;

    // Add celebration effect at completion
    if (percentage === 100) {
      this.celebrateCompletion(element);
    }
  }

  celebrateCompletion(element) {
    element.classList.add('celebrating');
    
    // Create confetti effect
    for (let i = 0; i < 20; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.style.left = Math.random() * 100 + '%';
      confetti.style.animationDelay = Math.random() * 0.5 + 's';
      confetti.style.background = Object.values(this.colorScheme)[Math.floor(Math.random() * Object.values(this.colorScheme).length)];
      element.appendChild(confetti);
    }

    setTimeout(() => {
      element.classList.remove('celebrating');
      element.querySelectorAll('.confetti').forEach(c => c.remove());
    }, 2000);
  }

  /**
   * Create interactive data visualization
   * @param {string} elementId - Container ID
   * @param {array} data - Data points
   * @param {object} config - Configuration
   */
  createDataVisualization(elementId, data, config = {}) {
    const {
      type = 'bar', // 'bar', 'line', 'pie', 'gauge'
      title = 'Data Visualization',
      interactive = true
    } = config;

    const container = document.getElementById(elementId);
    if (!container) return null;

    const viz = document.createElement('div');
    viz.className = `visual-data-viz viz-${type}`;
    viz.innerHTML = `
      <div class="viz-title">${title}</div>
      <div class="viz-container"></div>
      <div class="viz-legend"></div>
    `;

    container.appendChild(viz);

    switch (type) {
    case 'bar':
      this.renderBarChart(viz, data);
      break;
    case 'line':
      this.renderLineChart(viz, data);
      break;
    case 'gauge':
      this.renderGaugeChart(viz, data);
      break;
    case 'pie':
      this.renderPieChart(viz, data);
      break;
    default:
      break;
    }

    if (interactive) {
      this.addInteractivity(viz, data);
    }

    return viz;
  }

  renderBarChart(container, data) {
    const vizContainer = container.querySelector('.viz-container');
    const maxValue = Math.max(...data.map(d => d.value));

    data.forEach((item, idx) => {
      const bar = document.createElement('div');
      bar.className = 'chart-bar-item';
      bar.innerHTML = `
        <div class="bar-label">${item.label}</div>
        <div class="bar-track">
          <div class="bar-fill" style="width: 0%; background: ${item.color || '#3b82f6'};"></div>
          <div class="bar-glow"></div>
        </div>
        <div class="bar-value">${item.value}</div>
      `;

      vizContainer.appendChild(bar);

      // Animate bar
      setTimeout(() => {
        const percentage = (item.value / maxValue) * 100;
        bar.querySelector('.bar-fill').style.width = percentage + '%';
      }, idx * 100);
    });
  }

  renderLineChart(container, data) {
    const vizContainer = container.querySelector('.viz-container');
    const canvas = document.createElement('canvas');
    canvas.className = 'line-chart-canvas';
    vizContainer.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    canvas.width = vizContainer.offsetWidth;
    canvas.height = 300;

    const maxValue = Math.max(...data.map(d => d.value));
    const points = data.map((d, i) => ({
      x: (i / (data.length - 1)) * canvas.width,
      y: canvas.height - (d.value / maxValue) * canvas.height * 0.8
    }));

    // Draw line
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.beginPath();
    points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();

    // Draw points
    points.forEach((p, i) => {
      ctx.fillStyle = i === data.length - 1 ? '#10b981' : '#3b82f6';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  renderGaugeChart(container, data) {
    const vizContainer = container.querySelector('.viz-container');
    const value = data[0].value;
    const max = data[0].max || 100;
    const percentage = (value / max) * 100;

    const gauge = document.createElement('div');
    gauge.className = 'gauge-chart';
    gauge.innerHTML = `
      <div class="gauge-container">
        <svg viewBox="0 0 200 120" class="gauge-svg">
          <path class="gauge-background" d="M 10,100 A 90,90 0 0,1 190,100"></path>
          <path class="gauge-fill" d="M 10,100 A 90,90 0 0,1 190,100" style="stroke-dashoffset: ${282 * (1 - percentage/100)};"></path>
        </svg>
        <div class="gauge-value">${value}</div>
        <div class="gauge-label">${data[0].label}</div>
      </div>
    `;

    vizContainer.appendChild(gauge);
  }

  renderPieChart(container, data) {
    const vizContainer = container.querySelector('.viz-container');
    const total = data.reduce((sum, d) => sum + d.value, 0);
    
    const pie = document.createElement('div');
    pie.className = 'pie-chart';

    let currentAngle = 0;
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

    data.forEach((item, idx) => {
      const percentage = (item.value / total) * 100;
      const angle = (percentage / 100) * 360;
      
      const slice = document.createElement('div');
      slice.className = 'pie-slice';
      slice.style.background = colors[idx % colors.length];
      slice.style.transform = `rotate(${currentAngle}deg)`;
      slice.style.width = `${angle}deg`;
      slice.title = `${item.label}: ${item.value} (${percentage.toFixed(1)}%)`;
      
      pie.appendChild(slice);
      currentAngle += angle;
    });

    vizContainer.appendChild(pie);
  }

  addInteractivity(container, data) {
    const items = container.querySelectorAll('[data-interactive]');
    items.forEach(item => {
      item.addEventListener('mouseenter', () => {
        item.classList.add('highlighted');
      });
      item.addEventListener('mouseleave', () => {
        item.classList.remove('highlighted');
      });
    });
  }

  /**
   * Create real-time metric card with emotional feedback
   */
  createMetricCard(elementId, config = {}) {
    const {
      label = 'Metric',
      value = 0,
      unit = '',
      trend = 'neutral', // 'up', 'down', 'neutral'
      goal = null,
      color = '#3b82f6'
    } = config;

    const container = document.getElementById(elementId);
    if (!container) return null;

    const card = document.createElement('div');
    card.className = `metric-card metric-${trend}`;
    
    const trendIcon = {
      'up': '📈',
      'down': '📉',
      'neutral': '→'
    }[trend];

    card.innerHTML = `
      <div class="metric-header">
        <span class="metric-label">${label}</span>
        <span class="metric-trend">${trendIcon}</span>
      </div>
      <div class="metric-value" style="color: ${color};">${value}</div>
      ${unit ? `<div class="metric-unit">${unit}</div>` : ''}
      ${goal ? `<div class="metric-goal">Goal: ${goal}</div>` : ''}
      <div class="metric-bar-mini" style="background: ${color};"></div>
    `;

    container.appendChild(card);

    return {
      element: card,
      update: (newValue, newTrend = trend) => {
        card.querySelector('.metric-value').textContent = newValue;
        card.querySelector('.metric-trend').textContent = {
          'up': '📈',
          'down': '📉',
          'neutral': '→'
        }[newTrend];
        card.className = `metric-card metric-${newTrend}`;
        card.classList.add('updated');
        setTimeout(() => card.classList.remove('updated'), 500);
      }
    };
  }

  /**
   * Create animated status indicator
   */
  createStatusIndicator(elementId, config = {}) {
    const {
      statuses = ['Online', 'Processing', 'Optimizing'],
      refreshInterval = 2000
    } = config;

    const container = document.getElementById(elementId);
    if (!container) return null;

    const indicator = document.createElement('div');
    indicator.className = 'status-indicator-container';
    
    statuses.forEach((status, idx) => {
      const item = document.createElement('div');
      item.className = 'status-item';
      item.innerHTML = `
        <div class="status-dot"></div>
        <span class="status-label">${status}</span>
      `;
      indicator.appendChild(item);
    });

    container.appendChild(indicator);

    let currentIndex = 0;
    setInterval(() => {
      indicator.querySelectorAll('.status-item').forEach((item, idx) => {
        item.classList.remove('active');
      });
      indicator.children[currentIndex].classList.add('active');
      currentIndex = (currentIndex + 1) % statuses.length;
    }, refreshInterval);

    return indicator;
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VisualFeedbackEngine;
}
