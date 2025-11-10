# UI Activity Monitoring - Implementation Guide

## Overview

Complete Real User Monitoring (RUM) system that tracks user interactions, generates engagement metrics, performance monitoring, and clickheat maps.

## Architecture

### Components

| Component | Location | Purpose | Port |
|-----------|----------|---------|------|
| **Activity Monitor Server** | `servers/ui-activity-monitor.js` | Central event collection & analytics | 3051 |
| **Performance Monitor** | `web-app/js/perf-monitor.js` | Client-side Web Vitals collection | - |
| **Activity Tracker** | `web-app/js/activity-tracker.js` | Client-side click/form/scroll tracking | - |
| **Analytics Dashboard** | `web-app/analytics-dashboard.html` | Real-time visualizations | 3000 |
| **Test Suite** | `scripts/test-ui-activity-monitoring.js` | Validation tests | - |

## Features

### 1. Event Tracking

**Click Tracking**
- Records click coordinates (raw & normalized)
- Identifies feature names from DOM attributes
- Generates heatmap data
- Batches events for efficiency

**Form Tracking**
- Detects form submissions
- Captures form name, action, method
- Counts form fields
- Tracks engagement with forms

**Scroll Tracking**
- Measures scroll depth percentage
- Records milestones (0%, 25%, 50%, 75%, 100%)
- Identifies content engagement

**Performance Metrics**
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Cumulative Layout Shift (CLS)
- First Input Delay (FID)
- Time to First Byte (TTFB)
- Navigation timing details
- Slow resource identification

### 2. Analytics Engine

**Engagement Metrics**
- Active sessions count
- Total events tracked
- Average session duration
- Events per session
- Top pages visited
- Feature usage frequency

**Feature Usage Report**
- Top 20 most-clicked features
- Feature names extracted from:
  - `data-feature` attributes
  - `aria-label` attributes
  - Button/link text
  - Form element names
- Usage percentages

**Performance Report**
- Core Web Vitals summary
- Resource timing analysis
- Slow resource identification
- Client-side performance profile

**Heatmap Generation**
- Converts click coordinates to grid
- Normalizes intensity (0-100%)
- Supports custom resolution
- Color-coded visualization

### 3. Dashboard

**Real-Time Metrics**
- Active sessions display
- Total events counter
- Average engagement metrics
- Core Web Vitals at a glance

**Interactive Visualizations**
- Click heatmap canvas
- Feature usage table
- Page analytics table
- Active sessions table
- Engagement trends

**Controls**
- Manual refresh
- Auto-refresh toggle
- Data export (JSON)
- 24-hour trend viewing

## API Reference

### Base URL
```
http://127.0.0.1:3051
```

### Endpoints

#### Record Events
```http
POST /api/v1/analytics/events
Content-Type: application/json

{
  "sessionId": "ui-1234567890-abc",
  "events": [
    {
      "type": "click",
      "feature": "submit-button",
      "x": 150,
      "y": 250,
      "page": "/",
      "elementTag": "button",
      "elementId": "submit-btn"
    }
  ]
}
```

#### Batch Record Events
```http
POST /api/v1/analytics/events/batch
Content-Type: application/json

{
  "sessionId": "ui-1234567890-abc",
  "events": [...]
}
```

#### Get Heatmap Data
```http
GET /api/v1/analytics/heatmap

Response:
{
  "ok": true,
  "data": {
    "resolution": 100,
    "data": [
      {
        "x": 25,
        "y": 30,
        "intensity": 45,
        "percentage": 100
      }
    ],
    "totalClicks": 45,
    "timestamp": 1699123456789
  }
}
```

#### Get Feature Usage
```http
GET /api/v1/analytics/features

Response:
{
  "ok": true,
  "data": {
    "topFeatures": [
      {
        "feature": "submit-button",
        "usageCount": 150,
        "percentage": 25
      }
    ],
    "totalUniqueFeatures": 20,
    "timestamp": 1699123456789
  }
}
```

#### Get Engagement Metrics
```http
GET /api/v1/analytics/engagement

Response:
{
  "ok": true,
  "data": {
    "activeSessions": 5,
    "totalSessions": 150,
    "totalEvents": 5000,
    "clickEvents": 2500,
    "scrollEvents": 1500,
    "formEvents": 1000,
    "averageSessionDuration": 180000,
    "averageEventsPerSession": 33,
    "topPages": [
      {
        "page": "/",
        "views": 500
      }
    ],
    "timestamp": 1699123456789
  }
}
```

#### Get Performance Metrics
```http
GET /api/v1/analytics/performance

Response:
{
  "ok": true,
  "data": {
    "firstContentfulPaint": {
      "value": 1200,
      "unit": "ms"
    },
    "largestContentfulPaint": {
      "value": 2500,
      "unit": "ms"
    },
    "cumulativeLayoutShift": {
      "value": 0.05,
      "unit": "score"
    },
    "firstInputDelay": {
      "value": 50,
      "unit": "ms"
    },
    "timestamp": 1699123456789
  }
}
```

#### Get Trends
```http
GET /api/v1/analytics/trends?hours=24

Response:
{
  "ok": true,
  "data": {
    "hours": 24,
    "dataPoints": 96,
    "trends": [
      {
        "timestamp": 1699123456789,
        "activeSessions": 5,
        "totalEvents": 500,
        "avgSessionDuration": 180000,
        "topFeature": "submit-button"
      }
    ]
  }
}
```

#### Get Active Sessions
```http
GET /api/v1/analytics/sessions

Response:
{
  "ok": true,
  "data": {
    "activeSessions": 5,
    "sessions": [
      {
        "sessionId": "ui-1234567890-abc",
        "userId": "user@example.com",
        "startTime": 1699123456789,
        "endTime": 1699123500000,
        "eventCount": 150,
        "pages": ["/", "/features"],
        "duration": 43211
      }
    ]
  }
}
```

#### Get Analytics Summary
```http
GET /api/v1/analytics/summary

Returns all analytics data combined
```

#### Export Analytics
```http
POST /api/v1/analytics/export
Content-Type: application/json

{
  "format": "json",
  "includeData": ["engagement", "features", "performance", "heatmap"]
}
```

#### Get Configuration
```http
GET /api/v1/analytics/config

Response:
{
  "ok": true,
  "config": {
    "sessionTimeoutMs": 300000,
    "maxHeatmapResolution": 100,
    "eventsPerSessionLimit": 1000
  }
}
```

#### Update Configuration
```http
POST /api/v1/analytics/config
Content-Type: application/json

{
  "sessionTimeoutMs": 300000,
  "maxHeatmapResolution": 100,
  "eventsPerSessionLimit": 1000
}
```

## Installation

### 1. Server Setup

The activity monitor server is already created at `servers/ui-activity-monitor.js`.

### 2. Client-Side Integration

Add these scripts to your HTML `<head>`:

```html
<!-- Performance Monitoring -->
<script src="/js/perf-monitor.js" async></script>

<!-- Activity Tracking -->
<script src="/js/activity-tracker.js" async></script>
```

Or inject automatically in `servers/web-server.js`:

```javascript
// Add to HTML template rendering
html = html.replace('</head>', `
  <script src="/js/perf-monitor.js" async></script>
  <script src="/js/activity-tracker.js" async></script>
</head>`);
```

### 3. Dashboard Access

The dashboard is available at:
```
http://localhost:3000/analytics-dashboard.html
```

## Usage

### Starting the System

```bash
# Start all servers
npm run dev

# The activity monitor starts automatically on port 3051
```

### Running Tests

```bash
# Run comprehensive test suite
node scripts/test-ui-activity-monitoring.js
```

### Manual API Testing

```bash
# Check server health
curl http://127.0.0.1:3051/health

# Get engagement metrics
curl http://127.0.0.1:3051/api/v1/analytics/engagement | jq

# Get heatmap data
curl http://127.0.0.1:3051/api/v1/analytics/heatmap | jq

# Get feature usage
curl http://127.0.0.1:3051/api/v1/analytics/features | jq

# Get performance metrics
curl http://127.0.0.1:3051/api/v1/analytics/performance | jq

# Export all data
curl -X POST http://127.0.0.1:3051/api/v1/analytics/export \
  -H 'Content-Type: application/json' \
  -d '{"format":"json","includeData":["engagement","features","performance"]}' | jq
```

### Programmatic API Access

**From Browser:**
```javascript
// Track custom feature usage
window.toolooTracker.trackFeatureUsage('my-feature', {
  action: 'click',
  value: 'some-value'
});

// Manually flush events
window.toolooTracker.flushEvents();

// Get current metrics
const metrics = window.toolooPerformanceMonitor.getMetrics();
console.log('FCP:', metrics.fcp, 'ms');
console.log('LCP:', metrics.lcp, 'ms');
```

**From Node.js:**
```javascript
import fetch from 'node-fetch';

// Record events
const res = await fetch('http://127.0.0.1:3051/api/v1/analytics/events', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId: 'test-session',
    events: [
      {
        type: 'click',
        feature: 'test-button',
        x: 100,
        y: 200,
        page: '/'
      }
    ]
  })
});

const result = await res.json();
console.log('Events recorded:', result.processed);
```

## Events Schema

### Click Event
```javascript
{
  type: 'click',
  timestamp: number,      // milliseconds
  feature: string,        // feature name
  x: number,             // pixel x coordinate
  y: number,             // pixel y coordinate
  normalizedX: number,   // 0-100
  normalizedY: number,   // 0-100
  page: string,          // current page path
  elementTag: string,    // HTML tag name
  elementId: string      // element ID if available
}
```

### Scroll Event
```javascript
{
  type: 'scroll',
  timestamp: number,
  scrollDepth: number,   // percentage 0-100
  page: string
}
```

### Form Event
```javascript
{
  type: 'form',
  timestamp: number,
  formName: string,
  formAction: string,
  formMethod: string,
  fieldCount: number,
  page: string
}
```

### Performance Event
```javascript
{
  type: 'performance',
  timestamp: number,
  fcp: number,           // First Contentful Paint (ms)
  lcp: number,           // Largest Contentful Paint (ms)
  cls: number,           // Cumulative Layout Shift (score)
  fid: number,           // First Input Delay (ms)
  ttfb: number,          // Time to First Byte (ms)
  dcl: number,           // DOM Content Loaded (ms)
  loadComplete: number,  // Page Load Complete (ms)
  navigationTiming: object,
  slowResources: number,
  interactions: object
}
```

### Feature Event
```javascript
{
  type: 'feature',
  timestamp: number,
  featureName: string,
  page: string,
  ...metadata             // any additional data
}
```

## Configuration

Edit `servers/ui-activity-monitor.js` to customize:

```javascript
const config = {
  sessionTimeoutMs: 5 * 60 * 1000,    // 5 minutes
  maxHeatmapResolution: 100,           // Grid cells
  metricsUpdateIntervalMs: 60000,      // 1 minute
  eventsPerSessionLimit: 1000          // Max events before archiving
};
```

## Dashboard Features

### Real-Time Metrics
- Active sessions
- Total events
- Average session duration
- Events per session

### Performance Monitoring
- FCP (First Contentful Paint)
- LCP (Largest Contentful Paint)
- CLS (Cumulative Layout Shift)
- FID (First Input Delay)

### Visualizations
- Interactive click heatmap
- Feature usage breakdown
- Page traffic analytics
- Session activity table
- 24-hour trend view

### Controls
- Auto-refresh (30 second interval)
- Manual refresh button
- Export data as JSON
- Configurable time windows

## Performance Considerations

### Memory
- Sessions kept in memory (cleaned up after timeout)
- Heatmap grid resolution affects memory usage
- Event batching reduces overhead

### Network
- Events batched and sent every 5 seconds
- Performance metrics sent every 60 seconds
- Gzip compression recommended for production

### Storage
- No persistent storage (in-memory only)
- Trends kept for 24 hours
- Sessions cleaned on timeout

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Performance Observer | ✅ | ✅ | ✅ | ✅ |
| Web Vitals | ✅ | ✅ | ✅ | ✅ |
| localStorage | ✅ | ✅ | ✅ | ✅ |
| Fetch API | ✅ | ✅ | ✅ | ✅ |

## Troubleshooting

### Activity Monitor Not Starting
```bash
# Check if port 3051 is available
lsof -i :3051

# Start manually
node servers/ui-activity-monitor.js
```

### No Events Being Recorded
```bash
# Check if scripts are loaded
curl http://127.0.0.1:3000/js/perf-monitor.js
curl http://127.0.0.1:3000/js/activity-tracker.js

# Check browser console for errors
# Press F12 and look for [TooLoo] messages
```

### Dashboard Not Showing Data
```bash
# Verify activity monitor is running
curl http://127.0.0.1:3051/health

# Check if events are being recorded
curl http://127.0.0.1:3051/api/v1/analytics/engagement

# Clear browser cache and reload
# Ctrl+Shift+Delete (or Cmd+Shift+Delete on Mac)
```

### Heatmap Not Displaying
```bash
# Ensure events have click data
curl http://127.0.0.1:3051/api/v1/analytics/heatmap | jq '.data.data | length'

# Should return > 0 if clicks are recorded
```

## Monitoring Commands

```bash
# Watch active sessions
watch 'curl -s http://127.0.0.1:3051/api/v1/analytics/engagement | jq ".data.activeSessions"'

# Watch total events
watch 'curl -s http://127.0.0.1:3051/api/v1/analytics/engagement | jq ".data.totalEvents"'

# Monitor performance
watch 'curl -s http://127.0.0.1:3051/api/v1/analytics/performance | jq ".data"'

# View heatmap statistics
watch 'curl -s http://127.0.0.1:3051/api/v1/analytics/heatmap | jq ".data | {totalClicks, dataPoints: (.data | length)}"'
```

## Next Steps

1. **Integrate with Existing Analytics**: Connect to Google Analytics, Segment, or similar
2. **Add Alerts**: Set up notifications for performance issues
3. **Custom Events**: Track domain-specific user actions
4. **Retention Policies**: Implement data archival strategy
5. **Real-Time Alerts**: Dashboard notifications for anomalies

---

**Status**: ✅ Complete and Ready for Production
**Last Updated**: 2025-11-05
**Version**: 1.0
