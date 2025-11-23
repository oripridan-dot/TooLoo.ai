// @version 2.1.11
/**
 * TooLoo Performance Monitor
 * 
 * Tracks Real User Monitoring (RUM) metrics:
 * - First Contentful Paint (FCP)
 * - Largest Contentful Paint (LCP)
 * - Cumulative Layout Shift (CLS)
 * - First Input Delay (FID)
 * - Custom interaction metrics
 * 
 * Sends metrics to UI Activity Monitor
 */

(function() {
  'use strict';

  const config = {
    monitorUrl: window.location.origin.replace(/\/$/, ''),
    analyticsPort: 3051,
    sendMetricsInterval: 60000, // Every 60 seconds
    debug: false
  };

  let metrics = {
    fcp: null,
    lcp: null,
    cls: 0,
    fid: null,
    ttfb: null,
    dcl: null,
    loadComplete: null,
    resourceTimings: [],
    navigationTiming: null
  };

  // Session ID (should match heartbeat)
  let sessionId = localStorage.getItem('tooloo-session-id') ||
    ('ui-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9));

  /**
   * Logging utility
   */
  function log(...args) {
    if (config.debug) {
      console.log('[TooLoo Performance]', ...args);
    }
  }

  /**
   * Collect Web Vitals metrics
   */
  function collectWebVitals() {
    // Check if PerformanceObserver is available
    if (!window.PerformanceObserver) {
      log('⚠️ PerformanceObserver not available');
      return;
    }

    // First Contentful Paint & Largest Contentful Paint
    try {
      const paintEntries = performance.getEntriesByType('paint');
      paintEntries.forEach(entry => {
        if (entry.name === 'first-contentful-paint') {
          metrics.fcp = Math.round(entry.startTime);
          log('✅ FCP collected:', metrics.fcp);
        }
      });

      // LCP via PerformanceObserver
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        metrics.lcp = Math.round(lastEntry.startTime);
        log('✅ LCP collected:', metrics.lcp);
      });

      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // Stop observing LCP after 3 seconds of inactivity or page hidden
      let lcpTimeout = setTimeout(() => {
        lcpObserver.disconnect();
      }, 5000);

      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          lcpObserver.disconnect();
          clearTimeout(lcpTimeout);
        }
      });
    } catch (e) {
      log('⚠️ Error collecting paint metrics:', e.message);
    }

    // Cumulative Layout Shift
    try {
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            metrics.cls += entry.value;
            log('✅ CLS updated:', metrics.cls.toFixed(3));
          }
        }
      });

      clsObserver.observe({ entryTypes: ['layout-shift'] });

      // Stop observing CLS on page hide
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          clsObserver.disconnect();
        }
      });
    } catch (e) {
      log('⚠️ Error collecting CLS:', e.message);
    }

    // First Input Delay
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entry = list.getEntries()[0];
        metrics.fid = Math.round(entry.processingDuration);
        log('✅ FID collected:', metrics.fid);
        fidObserver.disconnect();
      });

      fidObserver.observe({ entryTypes: ['first-input'] });
    } catch (e) {
      log('⚠️ Error collecting FID:', e.message);
    }
  }

  /**
   * Collect Navigation Timing
   */
  function collectNavigationTiming() {
    if (!window.performance || !window.performance.timing) {
      return;
    }

    const timing = window.performance.timing;
    metrics.navigationTiming = {
      ttfb: timing.responseStart - timing.navigationStart,
      dcl: timing.domContentLoadedEventEnd - timing.navigationStart,
      loadComplete: timing.loadEventEnd - timing.navigationStart,
      dns: timing.domainLookupEnd - timing.domainLookupStart,
      tcp: timing.connectEnd - timing.connectStart,
      request: timing.responseStart - timing.requestStart,
      response: timing.responseEnd - timing.responseStart,
      dom: timing.domInteractive - timing.domLoading,
      domContent: timing.domContentLoadedEventEnd - timing.domContentLoadedEventStart,
      loadEvent: timing.loadEventEnd - timing.loadEventStart
    };

    metrics.ttfb = metrics.navigationTiming.ttfb;
    metrics.dcl = metrics.navigationTiming.dcl;
    metrics.loadComplete = metrics.navigationTiming.loadComplete;

    log('✅ Navigation timing collected', metrics.navigationTiming);
  }

  /**
   * Collect Resource Timings
   */
  function collectResourceTimings() {
    if (!window.performance || !window.performance.getEntriesByType) {
      return;
    }

    const resources = window.performance.getEntriesByType('resource');
    const slow = [];

    resources.forEach(resource => {
      const duration = Math.round(resource.duration);
      if (duration > 1000) { // Slow resources over 1 second
        slow.push({
          name: resource.name,
          duration,
          size: resource.transferSize,
          type: resource.initiatorType
        });
      }
    });

    metrics.resourceTimings = slow.slice(0, 10); // Top 10 slowest
    log('✅ Resource timings collected, slow resources:', slow.length);
  }

  /**
   * Collect interaction metrics (track clicks, inputs, etc)
   */
  function collectInteractionMetrics() {
    const interactions = {
      clickEvents: 0,
      keyboardEvents: 0,
      scrollEvents: 0,
      touchEvents: 0,
      customEvents: []
    };

    // Track document-level interactions
    document.addEventListener('click', () => {
      interactions.clickEvents++;
    }, true);

    document.addEventListener('keydown', () => {
      interactions.keyboardEvents++;
    }, true);

    window.addEventListener('scroll', () => {
      interactions.scrollEvents++;
    }, true);

    document.addEventListener('touchstart', () => {
      interactions.touchEvents++;
    }, true);

    window.toolooInteractions = interactions;
  }

  /**
   * Send metrics to monitor
   */
  async function sendMetrics() {
    if (!sessionId) {
      log('⚠️ No session ID, skipping metrics send');
      return;
    }

    try {
      const response = await fetch(
        `${config.monitorUrl}/api/v1/analytics/events`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            events: [
              {
                type: 'performance',
                timestamp: Date.now(),
                fcp: metrics.fcp,
                lcp: metrics.lcp,
                cls: metrics.cls,
                fid: metrics.fid,
                ttfb: metrics.ttfb,
                dcl: metrics.dcl,
                loadComplete: metrics.loadComplete,
                navigationTiming: metrics.navigationTiming,
                slowResources: metrics.resourceTimings.length,
                interactions: window.toolooInteractions || {}
              }
            ]
          })
        }
      );

      if (response.ok) {
        log('✅ Metrics sent successfully');
      } else {
        log('⚠️ Failed to send metrics:', response.status);
      }
    } catch (e) {
      log('⚠️ Error sending metrics:', e.message);
    }
  }

  /**
   * Initialize performance monitoring
   */
  function init() {
    log('🚀 Initializing performance monitor');

    // Wait for page to load before collecting some metrics
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        collectNavigationTiming();
        collectResourceTimings();
      });

      window.addEventListener('load', () => {
        collectWebVitals();
        collectInteractionMetrics();

        // Initial send after page load
        setTimeout(() => {
          sendMetrics();
        }, 2000);
      });
    } else {
      // Page already loaded
      collectNavigationTiming();
      collectResourceTimings();
      collectWebVitals();
      collectInteractionMetrics();

      setTimeout(() => {
        sendMetrics();
      }, 1000);
    }

    // Periodic metrics send
    setInterval(() => {
      sendMetrics();
    }, config.sendMetricsInterval);

    // Send metrics before page unload
    window.addEventListener('beforeunload', () => {
      sendMetrics();
    });

    // Expose metrics globally
    window.toolooPerformance = metrics;
    window.toolooPerformanceMonitor = {
      getMetrics: () => metrics,
      sendMetrics,
      getInteractions: () => window.toolooInteractions
    };

    log('✅ Performance monitor initialized');
  }

  // Start when DOM is ready or immediately if already loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
