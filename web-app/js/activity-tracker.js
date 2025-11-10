/**
 * TooLoo UI Activity Tracker
 * 
 * Captures user interactions with detailed event data:
 * - Click events with coordinates and target elements
 * - Form submissions
 * - Feature usage (buttons, links, UI components)
 * - Engagement metrics
 * - Session correlation
 * 
 * Sends batched events to UI Activity Monitor
 */

(function() {
  'use strict';

  const config = {
    monitorUrl: window.location.origin.replace(/\/$/, ''),
    batchInterval: 5000, // Collect events every 5 seconds
    maxEventsPerBatch: 50,
    debug: false,
    trackFeatures: true,
    trackFormSubmissions: true,
    trackClicks: true,
    trackScrollDepth: true
  };

  let sessionId = localStorage.getItem('tooloo-session-id') ||
    ('ui-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9));

  const eventQueue = [];
  let maxScrollDepth = 0;
  let isInitialized = false;

  /**
   * Logging utility
   */
  function log(...args) {
    if (config.debug) {
      console.log('[TooLoo Tracker]', ...args);
    }
  }

  /**
   * Get feature name from DOM element
   */
  function getFeatureName(target) {
    // Check data-feature attribute
    const dataFeature = target.closest('[data-feature]')?.getAttribute('data-feature');
    if (dataFeature) return dataFeature;

    // Check aria-label
    const ariaLabel = target.getAttribute('aria-label');
    if (ariaLabel) return `feature:${ariaLabel}`;

    // Check button text
    if (target.tagName === 'BUTTON') {
      return `button:${target.textContent?.trim().substring(0, 30) || 'unknown'}`;
    }

    // Check link
    if (target.tagName === 'A') {
      return `link:${target.textContent?.trim().substring(0, 30) || target.href || 'unknown'}`;
    }

    // Check input
    if (target.tagName === 'INPUT') {
      return `input:${target.name || target.id || target.type}`;
    }

    // Check ID or class
    if (target.id) return `element:${target.id}`;
    if (target.className) return `element:${target.className.split(' ')[0]}`;

    return `element:${target.tagName.toLowerCase()}`;
  }

  /**
   * Track click events
   */
  function trackClickEvent(event) {
    try {
      const target = event.target;
      const featureName = getFeatureName(target);

      // Calculate normalized coordinates (0-100)
      const x = Math.round((event.clientX / window.innerWidth) * 100);
      const y = Math.round((event.clientY / window.innerHeight) * 100);

      eventQueue.push({
        type: 'click',
        timestamp: Date.now(),
        feature: featureName,
        x: event.clientX,
        y: event.clientY,
        normalizedX: x,
        normalizedY: y,
        page: window.location.pathname,
        elementTag: target.tagName.toLowerCase(),
        elementId: target.id || null
      });

      log('📍 Click tracked:', featureName, { x, y });
    } catch (e) {
      log('⚠️ Error tracking click:', e.message);
    }
  }

  /**
   * Track form submissions
   */
  function trackFormSubmission(event) {
    try {
      const form = event.target;

      eventQueue.push({
        type: 'form',
        timestamp: Date.now(),
        formName: form.name || form.id || 'unnamed-form',
        formAction: form.action || '',
        formMethod: form.method || 'POST',
        fieldCount: form.elements.length,
        page: window.location.pathname
      });

      log('📝 Form submission tracked:', form.name || form.id);
    } catch (e) {
      log('⚠️ Error tracking form:', e.message);
    }
  }

  /**
   * Track scroll depth
   */
  function trackScrollDepth() {
    try {
      const scrollPercentage = Math.round(
        ((window.scrollY + window.innerHeight) / document.documentElement.scrollHeight) * 100
      );

      if (scrollPercentage > maxScrollDepth) {
        maxScrollDepth = scrollPercentage;

        // Record at milestones
        if (maxScrollDepth % 25 === 0) {
          eventQueue.push({
            type: 'scroll',
            timestamp: Date.now(),
            scrollDepth: maxScrollDepth,
            page: window.location.pathname
          });

          log('📜 Scroll depth milestone:', maxScrollDepth + '%');
        }
      }
    } catch (e) {
      log('⚠️ Error tracking scroll:', e.message);
    }
  }

  /**
   * Track feature usage (custom events via API)
   */
  function trackFeatureUsage(featureName, metadata = {}) {
    try {
      eventQueue.push({
        type: 'feature',
        timestamp: Date.now(),
        featureName,
        page: window.location.pathname,
        ...metadata
      });

      log('⭐ Feature tracked:', featureName);
    } catch (e) {
      log('⚠️ Error tracking feature:', e.message);
    }
  }

  /**
   * Send batched events to monitor
   */
  async function flushEvents() {
    if (eventQueue.length === 0) {
      return;
    }

    const batch = eventQueue.splice(0, config.maxEventsPerBatch);

    try {
      const response = await fetch(
        `${config.monitorUrl}/api/v1/analytics/events/batch`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            events: batch
          })
        }
      );

      if (response.ok) {
        log(`✅ Sent ${batch.length} events`);
      } else {
        log('⚠️ Failed to send events:', response.status);
        // Put events back in queue on failure
        eventQueue.unshift(...batch);
      }
    } catch (e) {
      log('⚠️ Error sending events:', e.message);
      // Put events back in queue on failure
      eventQueue.unshift(...batch);
    }
  }

  /**
   * Setup event listeners
   */
  function setupEventListeners() {
    // Click tracking
    if (config.trackClicks) {
      document.addEventListener('click', trackClickEvent, true);
      log('📍 Click tracking enabled');
    }

    // Form tracking
    if (config.trackFormSubmissions) {
      document.addEventListener('submit', trackFormSubmission, true);
      log('📝 Form tracking enabled');
    }

    // Scroll tracking
    if (config.trackScrollDepth) {
      window.addEventListener('scroll', trackScrollDepth, { passive: true });
      log('📜 Scroll tracking enabled');
    }

    // Periodic flush
    setInterval(flushEvents, config.batchInterval);

    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      flushEvents();
    });
  }

  /**
   * Initialize tracker
   */
  function init() {
    if (isInitialized) return;

    log('🚀 Initializing activity tracker');
    setupEventListeners();

    // Expose tracking API
    window.toolooTracker = {
      trackFeatureUsage,
      flushEvents,
      getEventQueue: () => [...eventQueue],
      getSessionId: () => sessionId,
      getScrollDepth: () => maxScrollDepth
    };

    isInitialized = true;
    log('✅ Activity tracker initialized');
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
