/**
 * UI Activity Monitor Server
 * 
 * Tracks user clicks, interactions, and UI activity.
 * Provides engagement metrics, feature usage analytics, and heatmap data.
 * 
 * Features:
 * - Real-time session tracking
 * - Click event aggregation with coordinates
 * - Feature usage frequency tracking
 * - Engagement scoring
 * - Performance metrics collection
 * - Heatmap data generation
 */

import express from 'express';

const app = express();
const PORT = process.env.UI_ACTIVITY_MONITOR_PORT || 3050;

app.use(express.json({ limit: '10mb' }));

// ============ Data Storage ============

// Session data: sessionId -> { startTime, endTime, events: [...], pages: [...] }
const sessions = new Map();

// Track which sessions are preload data (for filtering/reporting)
const dataSource = new Map(); // sessionId -> 'preload' | 'real'

// Aggregated metrics
const metrics = {
  totalSessions: 0,
  totalEvents: 0,
  totalClickEvents: 0,
  totalScrollEvents: 0,
  totalFormEvents: 0,
  averageSessionDuration: 0,
  averageEventsPerSession: 0,
  topFeatures: new Map(), // featureName -> count
  topPages: new Map(), // pagePath -> count
  clickHeatmap: new Map(), // "x,y" -> count
  performanceMetrics: {
    avgFCP: 0, // First Contentful Paint
    avgLCP: 0, // Largest Contentful Paint
    avgCLS: 0, // Cumulative Layout Shift
    avgFID: 0  // First Input Delay
  },
  preloadSessionCount: 0,
  realSessionCount: 0
};

// Time series data for engagement trends
const engagementTimeSeries = [];

// Configuration
const config = {
  sessionTimeoutMs: 5 * 60 * 1000, // 5 minutes
  maxHeatmapResolution: 100, // Grid cells per dimension
  metricsUpdateIntervalMs: 60000, // Update every minute
  eventsPerSessionLimit: 1000, // Max events per session before archiving
  usePreloadData: true,
  preloadSessionCount: 150,
  preloadMarkSessions: true
};

// ============ Preload Data Generation ============

/**
 * Generate realistic preload data for demonstration
 */
function generatePreloadSession(index, baseTime) {
  const sessionId = `preload-${index}`;
  const startTime = baseTime - Math.random() * 86400000; // Last 24 hours
  const duration = 60000 + Math.random() * 600000; // 1-10 minutes
  const endTime = startTime + duration;

  const pages = ['/', '/knowledge', '/docs', '/features', '/contact'];
  const features = [
    'search-books', 'filter-category', 'view-book', 'export-list',
    'save-favorites', 'share', 'print', 'sort-results'
  ];

  const events = [];
  let eventTime = startTime;

  // Generate 10-50 events per session
  const eventCount = 10 + Math.floor(Math.random() * 40);

  for (let i = 0; i < eventCount; i++) {
    eventTime += Math.random() * 30000; // Spread over session
    const eventType = Math.random();
    let event = {
      type: 'click',
      timestamp: eventTime,
      page: pages[Math.floor(Math.random() * pages.length)],
      userId: `user-${Math.floor(Math.random() * 100)}`
    };

    if (eventType < 0.6) {
      // Click events (60%)
      event.type = 'click';
      event.feature = features[Math.floor(Math.random() * features.length)];
      event.x = Math.random() * 1920;
      event.y = Math.random() * 1080;
    } else if (eventType < 0.8) {
      // Scroll events (20%)
      event.type = 'scroll';
      event.scrollDepth = Math.floor(Math.random() * 100);
    } else if (eventType < 0.95) {
      // Form events (15%)
      event.type = 'form';
      event.formName = Math.random() > 0.5 ? 'contact-form' : 'search-form';
      event.fieldCount = Math.floor(Math.random() * 10) + 1;
    } else {
      // Performance event
      event.type = 'performance';
      event.fcp = 1200 + Math.random() * 400;
      event.lcp = 2000 + Math.random() * 800;
      event.cls = Math.random() * 0.2;
      event.fid = Math.random() * 100;
    }

    events.push(event);
  }

  return { sessionId, startTime, endTime, events, userId: `user-${Math.floor(Math.random() * 100)}` };
}

/**
 * Load preload data into the system
 */
function loadPreloadData() {
  if (!config.usePreloadData) {
    console.log('⏭️  Preload data disabled');
    return;
  }

  const baseTime = Date.now();
  let preloadSessions = 0;

  console.log(`📥 Loading ${config.preloadSessionCount} preload sessions...`);

  for (let i = 0; i < config.preloadSessionCount; i++) {
    const preloadSession = generatePreloadSession(i, baseTime);
    const { sessionId, events, userId, startTime } = preloadSession;

    // Create session
    const session = {
      sessionId,
      startTime,
      endTime: preloadSession.endTime,
      lastActivityTime: preloadSession.endTime,
      events: [],
      pages: new Set(),
      userId,
      provider: null,
      metadata: { isPreload: true }
    };

    sessions.set(sessionId, session);
    if (config.preloadMarkSessions) {
      dataSource.set(sessionId, 'preload');
    }
    metrics.preloadSessionCount++;

    // Record all events
    events.forEach(event => {
      recordEvent(sessionId, event);
    });

    preloadSessions++;
  }

  console.log(`✅ Loaded ${preloadSessions} preload sessions with realistic patterns`);
  calculateEngagementMetrics();
}

// ============ Event Processing ============

/**
 * Record a user activity event
 */
function recordEvent(sessionId, event) {
  let session = sessions.get(sessionId);
  if (!session) {
    session = {
      sessionId,
      startTime: Date.now(),
      endTime: null,
      events: [],
      pages: new Set(),
      userId: event.userId || 'anonymous',
      provider: event.provider || null,
      metadata: {}
    };
    sessions.set(sessionId, session);
    metrics.totalSessions++;

    // Mark as real data if not preload
    if (config.preloadMarkSessions && !session.metadata.isPreload) {
      dataSource.set(sessionId, 'real');
      metrics.realSessionCount++;
    }
  }

  // Update session activity time
  session.endTime = Date.now();
  session.lastActivityTime = Date.now();

  // Track page visits
  if (event.page) {
    session.pages.add(event.page);
    metrics.topPages.set(
      event.page,
      (metrics.topPages.get(event.page) || 0) + 1
    );
  }

  // Process different event types
  switch (event.type) {
  case 'click':
    recordClickEvent(session, event);
    break;
  case 'scroll':
    recordScrollEvent(session, event);
    break;
  case 'form':
    recordFormEvent(session, event);
    break;
  case 'performance':
    recordPerformanceMetric(event);
    break;
  case 'feature':
    recordFeatureUsage(session, event);
    break;
  }

  // Add event to session
  if (session.events.length < config.eventsPerSessionLimit) {
    session.events.push({
      type: event.type,
      timestamp: Date.now(),
      data: event
    });
    metrics.totalEvents++;
  }
}

/**
 * Record a click event
 */
function recordClickEvent(session, event) {
  metrics.totalClickEvents++;

  // Generate heatmap key with reduced resolution
  if (event.x !== undefined && event.y !== undefined) {
    const gridX = Math.floor(event.x / (1920 / config.maxHeatmapResolution));
    const gridY = Math.floor(event.y / (1080 / config.maxHeatmapResolution));
    const key = `${gridX},${gridY}`;
    metrics.clickHeatmap.set(key, (metrics.clickHeatmap.get(key) || 0) + 1);
  }

  // Track feature clicks
  if (event.feature) {
    metrics.topFeatures.set(
      event.feature,
      (metrics.topFeatures.get(event.feature) || 0) + 1
    );
  }
}

/**
 * Record a scroll event
 */
function recordScrollEvent() {
  metrics.totalScrollEvents++;
}

/**
 * Record a form submission
 */
function recordFormEvent(session, event) {
  metrics.totalFormEvents++;

  if (event.formName) {
    metrics.topFeatures.set(
      `form:${event.formName}`,
      (metrics.topFeatures.get(`form:${event.formName}`) || 0) + 1
    );
  }
}

/**
 * Record performance metrics
 */
function recordPerformanceMetric(event) {
  if (event.fcp !== undefined) metrics.performanceMetrics.avgFCP = event.fcp;
  if (event.lcp !== undefined) metrics.performanceMetrics.avgLCP = event.lcp;
  if (event.cls !== undefined) metrics.performanceMetrics.avgCLS = event.cls;
  if (event.fid !== undefined) metrics.performanceMetrics.avgFID = event.fid;
}

/**
 * Record feature usage
 */
function recordFeatureUsage(session, event) {
  if (event.featureName) {
    metrics.topFeatures.set(
      event.featureName,
      (metrics.topFeatures.get(event.featureName) || 0) + 1
    );
  }
}

// ============ Analytics Calculation ============

/**
 * Calculate engagement metrics for all sessions
 */
function calculateEngagementMetrics() {
  const now = Date.now();
  let totalDuration = 0;
  let activeSessions = 0;

  const cleanedSessions = [];

  for (const [sessionId, session] of sessions) {
    // Clean up inactive sessions
    if (now - session.lastActivityTime > config.sessionTimeoutMs) {
      sessions.delete(sessionId);
      continue;
    }

    activeSessions++;
    const duration = (session.endTime || now) - session.startTime;
    totalDuration += duration;
    cleanedSessions.push(session);
  }

  // Update average metrics
  if (activeSessions > 0) {
    metrics.averageSessionDuration = Math.round(totalDuration / activeSessions);
    metrics.averageEventsPerSession = Math.round(
      metrics.totalEvents / activeSessions
    );
  }

  // Record time series data
  engagementTimeSeries.push({
    timestamp: now,
    activeSessions,
    totalEvents: metrics.totalEvents,
    avgSessionDuration: metrics.averageSessionDuration,
    topFeature: Array.from(metrics.topFeatures.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'none'
  });

  // Keep only last 24 hours of time series
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  while (engagementTimeSeries.length > 0 && engagementTimeSeries[0].timestamp < oneDayAgo) {
    engagementTimeSeries.shift();
  }

  return {
    activeSessions,
    totalSessions: metrics.totalSessions,
    averageSessionDuration: metrics.averageSessionDuration,
    averageEventsPerSession: metrics.averageEventsPerSession
  };
}

/**
 * Generate heatmap data
 */
function generateHeatmapData() {
  const heatmapArray = [];
  for (const [key, count] of metrics.clickHeatmap) {
    const [x, y] = key.split(',').map(Number);
    heatmapArray.push({
      x,
      y,
      intensity: count,
      percentage: 0 // Will be calculated below
    });
  }

  // Normalize intensities to percentages
  const maxIntensity = Math.max(...heatmapArray.map(p => p.intensity), 1);
  heatmapArray.forEach(point => {
    point.percentage = Math.round((point.intensity / maxIntensity) * 100);
  });

  return {
    resolution: config.maxHeatmapResolution,
    data: heatmapArray,
    totalClicks: metrics.totalClickEvents,
    timestamp: Date.now()
  };
}

/**
 * Generate feature usage report
 */
function generateFeatureUsageReport() {
  const features = Array.from(metrics.topFeatures.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20) // Top 20
    .map(([name, count]) => ({
      feature: name,
      usageCount: count,
      percentage: Math.round((count / metrics.totalEvents) * 100)
    }));

  return {
    topFeatures: features,
    totalUniqueFeatures: metrics.topFeatures.size,
    timestamp: Date.now()
  };
}

/**
 * Generate engagement report
 */
function generateEngagementReport() {
  const engagement = calculateEngagementMetrics();

  return {
    activeSessions: engagement.activeSessions,
    totalSessions: engagement.totalSessions,
    totalEvents: metrics.totalEvents,
    clickEvents: metrics.totalClickEvents,
    scrollEvents: metrics.totalScrollEvents,
    formEvents: metrics.totalFormEvents,
    averageSessionDuration: engagement.averageSessionDuration,
    averageEventsPerSession: engagement.averageEventsPerSession,
    topPages: Array.from(metrics.topPages.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([page, count]) => ({ page, views: count })),
    timestamp: Date.now()
  };
}

/**
 * Generate performance report
 */
function generatePerformanceReport() {
  return {
    firstContentfulPaint: {
      value: metrics.performanceMetrics.avgFCP,
      unit: 'ms'
    },
    largestContentfulPaint: {
      value: metrics.performanceMetrics.avgLCP,
      unit: 'ms'
    },
    cumulativeLayoutShift: {
      value: metrics.performanceMetrics.avgCLS,
      unit: 'score'
    },
    firstInputDelay: {
      value: metrics.performanceMetrics.avgFID,
      unit: 'ms'
    },
    timestamp: Date.now()
  };
}

// ============ API Endpoints ============

/**
 * POST /api/v1/events
 * Record user activity events
 */
app.post('/api/v1/events', (req, res) => {
  try {
    const { sessionId, events } = req.body;

    if (!sessionId || !Array.isArray(events)) {
      return res.status(400).json({
        ok: false,
        error: 'Missing sessionId or events array'
      });
    }

    // Process each event
    events.forEach(event => {
      recordEvent(sessionId, event);
    });

    res.json({
      ok: true,
      processed: events.length,
      sessionId
    });
  } catch (e) {
    console.error('Error processing events:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * POST /api/v1/events/batch
 * Batch record events (more efficient)
 */
app.post('/api/v1/events/batch', (req, res) => {
  try {
    const { sessionId, events } = req.body;

    if (!sessionId || !Array.isArray(events)) {
      return res.status(400).json({
        ok: false,
        error: 'Missing sessionId or events array'
      });
    }

    events.forEach(event => {
      recordEvent(sessionId, event);
    });

    res.json({
      ok: true,
      processed: events.length,
      timestamp: Date.now()
    });
  } catch (e) {
    console.error('Error in batch processing:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * GET /api/v1/analytics/heatmap
 * Get click heatmap data
 */
app.get('/api/v1/analytics/heatmap', (req, res) => {
  try {
    const heatmap = generateHeatmapData();
    res.json({
      ok: true,
      data: heatmap
    });
  } catch (e) {
    console.error('Error generating heatmap:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * GET /api/v1/analytics/features
 * Get feature usage report
 */
app.get('/api/v1/analytics/features', (req, res) => {
  try {
    const report = generateFeatureUsageReport();
    res.json({
      ok: true,
      data: report
    });
  } catch (e) {
    console.error('Error generating feature report:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * GET /api/v1/analytics/engagement
 * Get engagement metrics
 */
app.get('/api/v1/analytics/engagement', (req, res) => {
  try {
    const report = generateEngagementReport();
    res.json({
      ok: true,
      data: report
    });
  } catch (e) {
    console.error('Error generating engagement report:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * GET /api/v1/analytics/performance
 * Get performance metrics
 */
app.get('/api/v1/analytics/performance', (req, res) => {
  try {
    const report = generatePerformanceReport();
    res.json({
      ok: true,
      data: report
    });
  } catch (e) {
    console.error('Error generating performance report:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * GET /api/v1/analytics/trends
 * Get engagement trends over time
 */
app.get('/api/v1/analytics/trends', (req, res) => {
  try {
    const hours = parseInt(req.query.hours || '24');
    const cutoffTime = Date.now() - hours * 60 * 60 * 1000;
    const trends = engagementTimeSeries.filter(t => t.timestamp >= cutoffTime);

    res.json({
      ok: true,
      data: {
        hours,
        dataPoints: trends.length,
        trends
      }
    });
  } catch (e) {
    console.error('Error retrieving trends:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * GET /api/v1/analytics/sessions
 * Get active sessions
 */
app.get('/api/v1/analytics/sessions', (req, res) => {
  try {
    const activeSessions = Array.from(sessions.values()).map(s => ({
      sessionId: s.sessionId,
      userId: s.userId,
      startTime: s.startTime,
      endTime: s.endTime,
      eventCount: s.events.length,
      pages: Array.from(s.pages),
      duration: (s.endTime || Date.now()) - s.startTime,
      dataSource: dataSource.get(s.sessionId) || 'unknown',
      isPreload: s.metadata?.isPreload || false
    }));

    res.json({
      ok: true,
      data: {
        activeSessions: activeSessions.length,
        preloadSessions: activeSessions.filter(s => s.isPreload).length,
        realSessions: activeSessions.filter(s => !s.isPreload).length,
        sessions: activeSessions
      }
    });
  } catch (e) {
    console.error('Error retrieving sessions:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * GET /api/v1/analytics/summary
 * Get complete analytics summary
 */
app.get('/api/v1/analytics/summary', (req, res) => {
  try {
    const engagement = calculateEngagementMetrics();
    const filterPreload = req.query.filterPreload === 'true';

    let filteredMetrics = {
      engagement,
      features: generateFeatureUsageReport(),
      performance: generatePerformanceReport(),
      heatmap: generateHeatmapData(),
      timestamp: Date.now(),
      dataSource: {
        preloadSessions: metrics.preloadSessionCount,
        realSessions: metrics.realSessionCount,
        total: metrics.preloadSessionCount + metrics.realSessionCount,
        preloadPercentage: metrics.preloadSessionCount > 0
          ? Math.round((metrics.preloadSessionCount / (metrics.preloadSessionCount + metrics.realSessionCount)) * 100)
          : 0
      }
    };

    if (filterPreload) {
      // Return only real data (exclude preload)
      // This would require recalculating metrics filtering by dataSource
      // For now, include the note
      filteredMetrics.note = 'Use includePreload=false to exclude preload data';
    }

    res.json({
      ok: true,
      data: filteredMetrics
    });
  } catch (e) {
    console.error('Error generating summary:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * POST /api/v1/analytics/export
 * Export analytics data in various formats
 */
app.post('/api/v1/analytics/export', (req, res) => {
  try {
    const { format = 'json', includeData = ['engagement', 'features', 'performance'] } = req.body;

    const exportData = {};

    if (includeData.includes('engagement')) {
      exportData.engagement = generateEngagementReport();
    }
    if (includeData.includes('features')) {
      exportData.features = generateFeatureUsageReport();
    }
    if (includeData.includes('performance')) {
      exportData.performance = generatePerformanceReport();
    }
    if (includeData.includes('heatmap')) {
      exportData.heatmap = generateHeatmapData();
    }

    res.json({
      ok: true,
      format,
      data: exportData,
      exportTime: new Date().toISOString()
    });
  } catch (e) {
    console.error('Error exporting data:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * GET /api/v1/analytics/config
 * Get monitor configuration
 */
app.get('/api/v1/analytics/config', (req, res) => {
  res.json({
    ok: true,
    config: {
      sessionTimeoutMs: config.sessionTimeoutMs,
      maxHeatmapResolution: config.maxHeatmapResolution,
      eventsPerSessionLimit: config.eventsPerSessionLimit
    }
  });
});

/**
 * POST /api/v1/analytics/config
 * Update monitor configuration
 */
app.post('/api/v1/analytics/config', (req, res) => {
  try {
    const { sessionTimeoutMs, maxHeatmapResolution, eventsPerSessionLimit, usePreloadData, preloadSessionCount } = req.body;

    if (sessionTimeoutMs !== undefined) config.sessionTimeoutMs = sessionTimeoutMs;
    if (maxHeatmapResolution !== undefined) config.maxHeatmapResolution = maxHeatmapResolution;
    if (eventsPerSessionLimit !== undefined) config.eventsPerSessionLimit = eventsPerSessionLimit;
    if (usePreloadData !== undefined) config.usePreloadData = usePreloadData;
    if (preloadSessionCount !== undefined) config.preloadSessionCount = preloadSessionCount;

    res.json({
      ok: true,
      config
    });
  } catch (e) {
    console.error('Error updating config:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * GET /api/v1/analytics/preload-status
 * Get preload data information
 */
app.get('/api/v1/analytics/preload-status', (req, res) => {
  try {
    const totalSessions = metrics.preloadSessionCount + metrics.realSessionCount;
    const preloadPercentage = totalSessions > 0
      ? Math.round((metrics.preloadSessionCount / totalSessions) * 100)
      : 0;

    res.json({
      ok: true,
      data: {
        preloadEnabled: config.usePreloadData,
        preloadSessions: metrics.preloadSessionCount,
        realSessions: metrics.realSessionCount,
        totalSessions,
        preloadPercentage,
        preloadConfig: {
          sessionCount: config.preloadSessionCount,
          markSessions: config.preloadMarkSessions
        },
        note: preloadPercentage > 50
          ? '⚠️  Preload data dominates - real data is minority'
          : preloadPercentage > 10
            ? '📊 Preload and real data mixed'
            : preloadPercentage > 0
              ? '✅ Preload is minority - real data dominates'
              : '📈 Pure real data only'
      }
    });
  } catch (e) {
    console.error('Error retrieving preload status:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * GET /health
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    status: 'healthy',
    activeSessions: sessions.size,
    totalEvents: metrics.totalEvents,
    uptime: process.uptime()
  });
});

// ============ Startup ============

async function main() {
  console.log('🎯 UI Activity Monitor starting...');
  console.log('📊 Tracking engagement, heatmaps, and performance metrics');
  console.log(`🔧 Session timeout: ${config.sessionTimeoutMs}ms`);
  console.log(`📈 Heatmap resolution: ${config.maxHeatmapResolution}x${config.maxHeatmapResolution}`);

  // Load preload data if enabled
  if (config.usePreloadData) {
    loadPreloadData();
  }

  // Periodic metrics update
  setInterval(() => {
    calculateEngagementMetrics();
  }, config.metricsUpdateIntervalMs);

  const server = app.listen(PORT, '127.0.0.1', () => {
    console.log(`✅ UI Activity Monitor listening on port ${PORT}`);
    console.log(`🌐 API ready at http://127.0.0.1:${PORT}/api/v1/`);
    console.log(`📊 Preload data: ${config.usePreloadData ? 'ENABLED' : 'DISABLED'}`);
  });
  server.on('error', (err) => console.error('[ui-activity-monitor] Error:', err.message) && process.exit(1));
}

main().catch(e => {
  console.error('Failed to start UI Activity Monitor:', e);
  process.exit(1);
});

export default app;
