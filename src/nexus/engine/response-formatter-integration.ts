// @version 2.1.28
/**
 * Response Formatter Integration
 * Middleware to wrap API responses with rich visualization support
 * Converts text/JSON responses into enhanced format with charts, diagrams, and interactive elements
 */

class ResponseFormatterIntegration {
  constructor() {
    this.enabled = true;
    this.templates = new Map();
    this.formatterUrl = '/web-app/response-formatter-enhanced.html';
    this._initializeTemplates();
  }

  /**
   * Middleware function for Express
   * Wraps response.json to apply formatting
   */
  middleware() {
    return (req, res, next) => {
      const originalJson = res.json.bind(res);

      res.json = function(data) {
        if (req.query.format === 'enhanced' || req.headers['x-format'] === 'enhanced') {
          const formatted = this._formatResponse(data, req);
          return originalJson(formatted);
        }
        return originalJson(data);
      }.bind(this);

      next();
    };
  }

  /**
   * Format response based on content type
   */
  _formatResponse(data, req) {
    // Detect response type
    const type = this._detectType(data);
    const template = this.templates.get(type);

    if (!template) {
      return {
        type: 'raw',
        data,
        formatterUrl: this.formatterUrl
      };
    }

    return template(data, req);
  }

  /**
   * Detect response type from data structure
   */
  _detectType(data) {
    if (!data) {
      return 'raw';
    }

    // Check for known response patterns
    if (data.metrics || (data.value !== undefined && data.label !== undefined)) {
      return 'metric';
    }

    if (data.chart || data.datasets) {
      return 'chart';
    }

    if (data.table || (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object')) {
      return 'table';
    }

    if (data.diagram || data.mermaid) {
      return 'diagram';
    }

    if (data.status || data.healthy !== undefined || data.services) {
      return 'status';
    }

    if (data.code || data.language) {
      return 'code';
    }

    if (data.success !== undefined && data.message) {
      return 'result';
    }

    return 'raw';
  }

  /**
   * Initialize response templates
   */
  _initializeTemplates() {
    // Metric template
    this.templates.set('metric', (data) => ({
      type: 'metric',
      title: data.title || 'Metric',
      metrics: Array.isArray(data.metrics) ? data.metrics : [data],
      formatterUrl: this.formatterUrl,
      renderType: 'metric'
    }));

    // Chart template
    this.templates.set('chart', (data) => ({
      type: 'chart',
      title: data.title || 'Chart',
      chart: {
        type: data.chartType || 'line',
        labels: data.labels || [],
        datasets: data.datasets || []
      },
      formatterUrl: this.formatterUrl,
      renderType: 'chart'
    }));

    // Table template
    this.templates.set('table', (data) => ({
      type: 'table',
      title: data.title || 'Data',
      table: {
        headers: data.headers || (Array.isArray(data) && data.length > 0 ? Object.keys(data[0]) : []),
        rows: Array.isArray(data.rows) ? data.rows : (Array.isArray(data) ? data : [data])
      },
      formatterUrl: this.formatterUrl,
      renderType: 'table'
    }));

    // Status template
    this.templates.set('status', (data) => ({
      type: 'status',
      title: data.title || 'Status',
      status: {
        healthy: data.healthy,
        message: data.message || data.status,
        details: data.details || data.services || []
      },
      formatterUrl: this.formatterUrl,
      renderType: 'status'
    }));

    // Code template
    this.templates.set('code', (data) => ({
      type: 'code',
      title: data.title || 'Code',
      code: {
        language: data.language || 'javascript',
        content: data.code || data.content || ''
      },
      formatterUrl: this.formatterUrl,
      renderType: 'code'
    }));

    // Result template (success/error)
    this.templates.set('result', (data) => ({
      type: 'result',
      success: data.success,
      message: data.message,
      details: data.details || data.data,
      formatterUrl: this.formatterUrl,
      renderType: 'result'
    }));

    // Diagram template
    this.templates.set('diagram', (data) => ({
      type: 'diagram',
      title: data.title || 'Diagram',
      diagram: {
        format: data.format || 'mermaid',
        content: data.diagram || data.mermaid || ''
      },
      formatterUrl: this.formatterUrl,
      renderType: 'diagram'
    }));
  }

  /**
   * Create a metric response
   */
  static createMetric(title, metrics) {
    return {
      type: 'metric',
      title,
      metrics: Array.isArray(metrics) ? metrics : [metrics]
    };
  }

  /**
   * Create a chart response
   */
  static createChart(title, chartType, labels, datasets) {
    return {
      type: 'chart',
      title,
      chartType,
      labels,
      datasets
    };
  }

  /**
   * Create a table response
   */
  static createTable(title, headers, rows) {
    return {
      type: 'table',
      title,
      headers,
      rows
    };
  }

  /**
   * Create a status response
   */
  static createStatus(title, healthy, message, details) {
    return {
      type: 'status',
      title,
      healthy,
      message,
      details
    };
  }

  /**
   * Create a diagram response
   */
  static createDiagram(title, content, format) {
    return {
      type: 'diagram',
      title,
      diagram: content,
      format: format || 'mermaid'
    };
  }
}

export default ResponseFormatterIntegration;
