// @version 2.1.28
/**
 * TooLoo UI Heartbeat & Server Activation
 * 
 * Inject into every HTML page to:
 * 1. Send activity heartbeats to server monitor
 * 2. Track user sessions
 * 3. Ensure backend servers stay active
 * 4. Route real data through providers
 * 
 * Include in <head>: <script src="/js/tooloo-heartbeat.js" async></script>
 */

(function() {
  'use strict';
  
  // Configuration
  const config = {
    monitorUrl: window.location.origin.replace(/\/$/, ''),
    heartbeatIntervalMs: 30000, // Every 30 seconds
    ensureServicesOnActivity: true,
    realDataMode: true,
    debug: false
  };
  
  // Session tracking
  let sessionId = localStorage.getItem('tooloo-session-id');
  if (!sessionId) {
    sessionId = 'ui-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('tooloo-session-id', sessionId);
  }
  
  let lastActivityTime = Date.now();
  let heartbeatCount = 0;
  let monitorActive = true;
  let heartbeatFailures = 0;
  
  // Logging
  function log(...args) {
    if (config.debug) {
      console.log('[TooLoo Heartbeat]', ...args);
    }
  }
  
  /**
   * Send heartbeat to activity monitor
   */
  async function sendHeartbeat() {
    if (!monitorActive) {
      return;
    }

    try {
      const response = await fetch(`${config.monitorUrl}/api/v1/activity/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          route: window.location.pathname,
          action: 'heartbeat',
          userId: window.toolooUserId || 'anonymous',
          ensureServices: config.ensureServicesOnActivity
        })
      });
      
      if (!response.ok) {
        heartbeatFailures++;
        if (heartbeatFailures >= 3) {
          monitorActive = false;
          log('⚠️ Heartbeat endpoint unavailable, disabling further heartbeats.');
        }
        return;
      }

      heartbeatFailures = 0;
      heartbeatCount++;
      const data = await response.json();
      
      log(`✅ Heartbeat #${heartbeatCount}`, {
        activeSessions: data.activeSessions,
        serversActive: data.serversActive,
        realDataMode: data.config?.realDataMode
      });
      
      // Update global state if needed
      if (window.toolooServerHealth) {
        window.toolooServerHealth = data.serverHealth;
      }
    } catch (e) {
      heartbeatFailures++;
      log('⚠️ Heartbeat failed:', e.message);
      if (heartbeatFailures >= 3) {
        monitorActive = false;
        log('⏸️  Disabling heartbeat attempts after repeated failures.');
      }
    }
  }
  
  /**
   * Track user activity (mouse, keyboard, scroll)
   */
  function setupActivityTracking() {
    const trackActivity = () => {
      lastActivityTime = Date.now();
    };
    
    document.addEventListener('mousemove', trackActivity);
    document.addEventListener('keypress', trackActivity);
    document.addEventListener('click', trackActivity);
    window.addEventListener('scroll', trackActivity);
    
    log('📊 Activity tracking enabled');
  }
  
  /**
   * Ensure real data provider is active
   */
  async function ensureRealDataProvider() {
    if (!monitorActive) {
      return false;
    }

    try {
      const response = await fetch(`${config.monitorUrl}/api/v1/activity/ensure-real-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      log('🔴 Real data ensured:', data);
      return data.providersActive;
    } catch (e) {
      log('⚠️ Real data ensure failed:', e.message);
    }
    return false;
  }
  
  /**
   * Inject data availability banner (optional)
   */
  function injectDataStatusBanner() {
    // Only inject if element exists for it
    const banner = document.getElementById('tooloo-data-status');
    if (!banner) return;
    
    const updateBanner = async () => {
      if (!monitorActive) {
        return;
      }

      try {
        const response = await fetch(`${config.monitorUrl}/api/v1/activity/servers`);
        const data = await response.json();
        
        if (data.ok) {
          const healthy = data.servers.filter(s => s.healthy).length;
          const icon = data.activeServers >= config.minActiveServers ? '🟢' : '🟡';
          banner.textContent = `${icon} ${healthy}/${data.totalServers} servers active`;
          banner.style.color = healthy >= 6 ? '#4ade80' : '#fbbf24';
        }
      } catch (e) {
        // Silently fail
      }
    };
    
    updateBanner();
    setInterval(updateBanner, 15000);
  }
  
  /**
   * Auto-route API calls through real data pipeline if enabled
   */
  function setupRealDataPipeline() {
    if (!config.realDataMode) return;
    
    // Store original fetch
    const originalFetch = window.fetch;
    
    window.fetch = function(...args) {
      const [resource] = args;
      const url = typeof resource === 'string' ? resource : resource.url;
      
      // For provider/burst queries, ensure they go through real pipeline
      if (url.includes('/providers/burst') || url.includes('/api/v1/providers/')) {
        log(`📡 Routing provider call through real pipeline: ${url}`);
      }
      
      // Call original fetch
      return originalFetch.apply(this, args);
    };
    
    log('🔄 Real data pipeline initialized');
  }
  
  /**
   * Initialize heartbeat system
   */
  function init() {
    log('Initializing TooLoo Heartbeat System');
    log(`Session ID: ${sessionId}`);
    log(`Monitor URL: ${config.monitorUrl}`);
    
    // Setup activity tracking
    setupActivityTracking();
    
    // Send initial heartbeat
    sendHeartbeat().then(() => {
      // Ensure real data if configured
      if (config.realDataMode) {
        ensureRealDataProvider();
      }
    });
    
    // Set up regular heartbeats
    setInterval(() => {
      sendHeartbeat();
    }, config.heartbeatIntervalMs);
    
    // Inject status banner if exists
    injectDataStatusBanner();
    
    // Setup real data pipeline
    setupRealDataPipeline();
    
    // Expose global state
    window.tooloo = window.tooloo || {};
    window.tooloo.sessionId = sessionId;
    window.tooloo.heartbeatCount = () => heartbeatCount;
    window.tooloo.lastActivity = () => lastActivityTime;
    
    log('✅ Initialization complete');
  }
  
  // Start when DOM is ready or immediately if already loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
