/**
 * Response Formatter Integration API
 * Bridges the enhanced response formatter with API endpoints
 * Converts backend data into visually rich formatted responses
 */

/**
 * Format a metrics response with visual richness
 */
export function formatMetricsResponse(data) {
  return {
    type: 'metrics',
    title: data.title || 'System Metrics',
    subtitle: data.subtitle || '',
    metrics: (data.metrics || []).map(m => ({
      label: m.label || m.name,
      value: m.value,
      unit: m.unit || '',
      trend: m.trend || 'neutral', // up, down, neutral
      color: m.color || 'cyan'
    })),
    timestamp: new Date().toISOString(),
    source: data.source || 'TooLoo.ai'
  };
}

/**
 * Format a status/health response
 */
export function formatStatusResponse(data) {
  return {
    type: 'status',
    title: data.title || 'System Status',
    status: data.status || 'operational', // operational, warning, critical, dormant
    statusColor: {
      operational: 'green',
      warning: 'yellow',
      critical: 'red',
      dormant: 'gray'
    }[data.status] || 'cyan',
    items: (data.items || []).map(item => ({
      label: item.label || item.name,
      status: item.status || 'active', // active, inactive, pending
      value: item.value || '',
      icon: item.icon || '⚡'
    })),
    summary: data.summary || '',
    timestamp: new Date().toISOString()
  };
}

/**
 * Format a chart/data visualization response
 */
export function formatChartResponse(data) {
  return {
    type: 'chart',
    chartType: data.chartType || 'line', // line, bar, pie, doughnut, area
    title: data.title || 'Data Visualization',
    labels: data.labels || [],
    datasets: (data.datasets || []).map(ds => ({
      label: ds.label,
      data: ds.data,
      borderColor: ds.color || 'rgba(0, 212, 255, 1)',
      backgroundColor: ds.backgroundColor || 'rgba(0, 212, 255, 0.1)',
      tension: 0.4,
      fill: data.chartType === 'area'
    })),
    options: {
      responsive: true,
      maintainAspectRatio: true,
      ...data.options
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Format a table/data grid response
 */
export function formatTableResponse(data) {
  return {
    type: 'table',
    title: data.title || 'Data Table',
    columns: (data.columns || []).map(col => ({
      header: col.header || col.name,
      key: col.key || col.name,
      sortable: col.sortable !== false,
      filterable: col.filterable !== false,
      width: col.width || 'auto'
    })),
    rows: data.rows || [],
    sortBy: data.sortBy || null,
    filter: data.filter || null,
    pagination: {
      pageSize: data.pageSize || 10,
      currentPage: 1,
      totalRows: (data.rows || []).length
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Format a diagram/architecture response
 */
export function formatDiagramResponse(data) {
  return {
    type: 'diagram',
    diagramType: data.diagramType || 'flowchart', // flowchart, sequence, state, architecture
    title: data.title || 'System Diagram',
    content: data.content || '', // Mermaid diagram definition
    description: data.description || '',
    timestamp: new Date().toISOString()
  };
}

/**
 * Format a code snippet response with syntax highlighting
 */
export function formatCodeResponse(data) {
  return {
    type: 'code',
    language: data.language || 'javascript',
    title: data.title || 'Code Example',
    code: data.code || '',
    linenos: data.linenos !== false,
    highlight: data.highlight || [], // array of line numbers to highlight
    collapsible: data.collapsible !== false,
    timestamp: new Date().toISOString()
  };
}

/**
 * Format a rich content response (mixed content types)
 */
export function formatMixedResponse(data) {
  return {
    type: 'mixed',
    title: data.title || 'System Report',
    sections: (data.sections || []).map(section => ({
      type: section.type, // 'text', 'metric', 'chart', 'table', 'code', 'diagram'
      title: section.title,
      content: section.content,
      collapsible: section.collapsible !== false
    })),
    timestamp: new Date().toISOString()
  };
}

/**
 * Format a progress/timeline response
 */
export function formatProgressResponse(data) {
  return {
    type: 'progress',
    title: data.title || 'Progress Report',
    items: (data.items || []).map(item => ({
      label: item.label,
      progress: Math.min(100, Math.max(0, item.progress || 0)),
      status: item.status || 'in-progress', // completed, in-progress, pending, failed
      details: item.details || ''
    })),
    overallProgress: Math.round(
      ((data.items || []).reduce((sum, i) => sum + (i.progress || 0), 0)) / 
      Math.max(1, (data.items || []).length)
    ),
    timestamp: new Date().toISOString()
  };
}

/**
 * Format a capability status response
 */
export function formatCapabilityResponse(data) {
  return {
    type: 'capability',
    title: data.title || 'Capability Status',
    totalCapabilities: data.total || 242,
    activated: data.activated || 0,
    pending: data.pending || 242,
    activationRate: Math.round(((data.activated || 0) / (data.total || 242)) * 100),
    components: (data.components || []).map(comp => ({
      name: comp.name,
      discovered: comp.discovered,
      activated: comp.activated,
      status: comp.status || 'dormant',
      methods: comp.methods || []
    })),
    recentActivations: data.recentActivations || [],
    timestamp: new Date().toISOString()
  };
}

/**
 * Format a learning progress response
 */
export function formatLearningResponse(data) {
  return {
    type: 'learning',
    title: data.title || 'Learning Progress',
    studentName: data.studentName || 'Student',
    overallLevel: data.overallLevel || 'beginner', // beginner, intermediate, advanced
    domains: (data.domains || []).map(domain => ({
      name: domain.name,
      progress: domain.progress || 0,
      level: domain.level || 'beginner',
      problemsSolved: domain.problemsSolved || 0,
      timeSpent: domain.timeSpent || '0h',
      lastActivity: domain.lastActivity || 'never'
    })),
    velocity: data.velocity || 0.0,
    streak: data.streak || 0,
    nextChallenge: data.nextChallenge || '',
    timestamp: new Date().toISOString()
  };
}

/**
 * Format error response with rich styling
 */
export function formatErrorResponse(error, code = 500) {
  return {
    type: 'error',
    status: code,
    title: 'Error',
    message: error.message || String(error),
    details: error.details || error.stack || '',
    severity: code >= 500 ? 'critical' : code >= 400 ? 'warning' : 'info',
    timestamp: new Date().toISOString()
  };
}

/**
 * Format success response
 */
export function formatSuccessResponse(data) {
  return {
    type: 'success',
    title: data.title || 'Operation Successful',
    message: data.message || 'Request completed successfully',
    data: data.data || null,
    timestamp: new Date().toISOString()
  };
}

/**
 * Wrap any response with enhanced formatting
 * This is the main integration point for API responses
 */
export function enhanceResponse(response, formatType = 'auto') {
  // If already formatted, return as-is
  if (response && response.type) {
    return response;
  }

  // Auto-detect format based on response structure
  if (formatType === 'auto') {
    if (response && response.metrics) {
      return formatMetricsResponse(response);
    }
    if (response && response.status && typeof response.status === 'string') {
      return formatStatusResponse(response);
    }
    if (response && response.datasets) {
      return formatChartResponse(response);
    }
    if (response && Array.isArray(response.rows)) {
      return formatTableResponse(response);
    }
  }

  // Return with wrapper if explicit format requested
  return {
    type: formatType || 'text',
    content: response,
    timestamp: new Date().toISOString()
  };
}

/**
 * Middleware to automatically enhance API responses
 */
export function enhancedResponseMiddleware(req, res, next) {
  // Store original json method
  const originalJson = res.json.bind(res);

  // Override json method to enhance response
  res.json = function(data) {
    // Check if response should be enhanced
    const shouldEnhance = req.query.enhanced !== 'false' && 
                         req.headers['x-enhanced-response'] !== 'false';

    if (shouldEnhance && data && typeof data === 'object') {
      const enhanced = enhanceResponse(data, req.query.format || 'auto');
      return originalJson(enhanced);
    }

    return originalJson(data);
  };

  next();
}

/**
 * Create a formatted response builder for complex data
 */
export class ResponseBuilder {
  constructor(type = 'mixed') {
    this.type = type;
    this.data = {
      type,
      sections: [],
      timestamp: new Date().toISOString()
    };
  }

  addMetrics(metrics) {
    this.data.sections.push({
      type: 'metrics',
      content: metrics
    });
    return this;
  }

  addChart(chart) {
    this.data.sections.push({
      type: 'chart',
      content: chart
    });
    return this;
  }

  addTable(table) {
    this.data.sections.push({
      type: 'table',
      content: table
    });
    return this;
  }

  addText(text, title = '') {
    this.data.sections.push({
      type: 'text',
      title,
      content: text
    });
    return this;
  }

  addCode(code, language = 'javascript') {
    this.data.sections.push({
      type: 'code',
      content: {
        code,
        language
      }
    });
    return this;
  }

  addDiagram(diagram) {
    this.data.sections.push({
      type: 'diagram',
      content: diagram
    });
    return this;
  }

  setTitle(title) {
    this.data.title = title;
    return this;
  }

  build() {
    return this.data;
  }
}

export default {
  formatMetricsResponse,
  formatStatusResponse,
  formatChartResponse,
  formatTableResponse,
  formatDiagramResponse,
  formatCodeResponse,
  formatMixedResponse,
  formatProgressResponse,
  formatCapabilityResponse,
  formatLearningResponse,
  formatErrorResponse,
  formatSuccessResponse,
  enhanceResponse,
  enhancedResponseMiddleware,
  ResponseBuilder
};
