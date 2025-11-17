/**
 * Month 2: System Control API
 * 
 * Handles:
 * - Service restart commands with confirmation flow
 * - Live feedback as services restart
 * - Service health monitoring
 * - Error handling with suggestions
 */

// ============================================================================
// SERVICE MANAGEMENT
// ============================================================================

/**
 * Restart a service with live feedback
 * Returns stream of status updates
 */
export async function restartService(serviceName) {
  try {
    // Validate service name
    const validServices = [
      'web-server',
      'training-server',
      'meta-server',
      'budget-server',
      'coach-server',
      'product-development-server',
      'segmentation-server',
      'reports-server',
      'capabilities-server',
      'orchestrator',
    ];

    if (!validServices.includes(serviceName)) {
      throw new Error(`Unknown service: ${serviceName}`);
    }

    // Step 1: Request restart via orchestrator
    const url = 'http://127.0.0.1:3123/api/v1/system/service/' + serviceName + '/restart';
    const response = await fetch(url, { method: 'POST' });

    if (!response.ok) {
      throw new Error('Orchestrator error: ' + response.status);
    }

    const data = await response.json();
    
    return {
      status: 'restarting',
      service: serviceName,
      message: serviceName + ' restart initiated',
      details: data,
    };
  } catch (error) {
    return {
      status: 'error',
      service: serviceName,
      message: 'Failed to restart ' + serviceName,
      error: error.message,
      suggestion: 'Check that ' + serviceName + ' is configured and the orchestrator is running',
    };
  }
}

/**
 * Poll service health until it recovers
 */
export async function pollServiceHealth(serviceName, maxWaitMs = 30000) {
  const startTime = Date.now();
  const pollInterval = 1000; // 1 second between polls
  const healthUpdates = [];

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const response = await fetch(
        `http://127.0.0.1:3010/api/v1/metrics/service/${serviceName}`,
        { timeout: 2000 }
      );

      if (response.ok) {
        const data = await response.json();
        const update = {
          timestamp: new Date().toISOString(),
          service: serviceName,
          status: data.status,
          responseTime: data.responseTime,
          healthy: data.status === 'online',
        };
        healthUpdates.push(update);

        if (data.status === 'online') {
          return {
            recovered: true,
            service: serviceName,
            timeToRecoveryMs: Date.now() - startTime,
            updates: healthUpdates,
          };
        }
      }
    } catch (error) {
      // Service not responding yet, continue polling
    }

    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  return {
    recovered: false,
    service: serviceName,
    timeoutMs: maxWaitMs,
    updates: healthUpdates,
    message: `Service did not recover within ${maxWaitMs}ms`,
  };
}

/**
 * Get detailed service information
 */
export async function getServiceDetails(serviceName) {
  try {
    const response = await fetch(
      `http://127.0.0.1:3010/api/v1/metrics/service/${serviceName}`,
      { timeout: 2000 }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    return {
      service: serviceName,
      status: 'unknown',
      error: error.message,
    };
  }
}

/**
 * Stop a service gracefully
 */
export async function stopService(serviceName) {
  try {
    const response = await fetch(
      `http://127.0.0.1:3123/api/v1/system/service/${serviceName}/stop`,
      { method: 'POST' }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return {
      status: 'stopped',
      service: serviceName,
      message: `${serviceName} stopped successfully`,
    };
  } catch (error) {
    return {
      status: 'error',
      service: serviceName,
      error: error.message,
    };
  }
}

/**
 * Start a service
 */
export async function startService(serviceName) {
  try {
    const response = await fetch(
      `http://127.0.0.1:3123/api/v1/system/service/${serviceName}/start`,
      { method: 'POST' }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return {
      status: 'starting',
      service: serviceName,
      message: `${serviceName} start initiated`,
    };
  } catch (error) {
    return {
      status: 'error',
      service: serviceName,
      error: error.message,
    };
  }
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Restart all services in sequence
 */
export async function restartAllServices() {
  const services = [
    'web-server',
    'training-server',
    'meta-server',
    'budget-server',
    'coach-server',
    'product-development-server',
    'segmentation-server',
    'reports-server',
    'capabilities-server',
  ];

  const results = [];
  for (const service of services) {
    const restart = await restartService(service);
    results.push(restart);
    
    // Wait 2 seconds between restarts to avoid thundering herd
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  return {
    action: 'restart_all',
    totalServices: services.length,
    results,
  };
}

/**
 * Get status of all services
 */
export async function getAllServicesStatus() {
  try {
    const response = await fetch('http://127.0.0.1:3010/api/v1/metrics/services', {
      timeout: 3000,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return {
      timestamp: new Date().toISOString(),
      summary: {
        online: data.list?.filter(s => s.status === 'online').length || 0,
        degraded: data.list?.filter(s => s.status === 'degraded').length || 0,
        offline: data.list?.filter(s => s.status === 'offline').length || 0,
        total: data.list?.length || 0,
      },
      services: data.list || [],
    };
  } catch (error) {
    return {
      timestamp: new Date().toISOString(),
      error: error.message,
      services: [],
    };
  }
}

// ============================================================================
// HEALTH MONITORING
// ============================================================================

/**
 * Diagnose service health issues
 */
export async function diagnoseService(serviceName) {
  try {
    const [details, neighbors] = await Promise.all([
      getServiceDetails(serviceName),
      getServicesWithDependencies(serviceName),
    ]);

    const diagnosis = {
      service: serviceName,
      health: details,
      dependencies: neighbors,
      possibleIssues: [],
      recommendations: [],
    };

    // Analyze issues
    if (details.status === 'offline') {
      diagnosis.possibleIssues.push('Service is not responding');
      diagnosis.recommendations.push('Try restarting the service');
    }

    if (details.status === 'degraded') {
      diagnosis.possibleIssues.push('Service is responding slowly');
      if (details.responseTime > 5000) {
        diagnosis.recommendations.push('Service is experiencing high latency - consider switching providers');
      }
      if (details.memoryUsage > 80) {
        diagnosis.recommendations.push('Service memory usage is high - consider scaling');
      }
    }

    return diagnosis;
  } catch (error) {
    return {
      service: serviceName,
      error: error.message,
    };
  }
}

/**
 * Get services with dependency relationships
 */
async function getServicesWithDependencies(serviceName) {
  // This is a placeholder - in full implementation,
  // would query dependency graph from orchestrator
  const dependencyMap = {
    'web-server': ['orchestrator'],
    'training-server': ['web-server'],
    'meta-server': ['web-server'],
    'budget-server': ['web-server'],
    'coach-server': ['training-server'],
    'reports-server': ['training-server'],
  };

  return {
    [serviceName]: {
      dependsOn: dependencyMap[serviceName] || [],
      dependents: Object.keys(dependencyMap).filter(
        s => dependencyMap[s].includes(serviceName)
      ),
    },
  };
}

// ============================================================================
// API HANDLERS (for Express/server integration)
// ============================================================================

/**
 * POST /api/v1/system/service/:name/restart
 */
export async function handleRestartService(req, res) {
  try {
    const { name } = req.params;
    const restart = await restartService(name);

    if (restart.status === 'error') {
      return res.status(400).json(restart);
    }

    // Start polling health in background
    pollServiceHealth(name).then(health => {
      // Could emit via WebSocket or store in state
      console.log(`[System Control] ${name} health poll complete:`, health);
    });

    res.json(restart);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/v1/system/service/:name/stop
 */
export async function handleStopService(req, res) {
  try {
    const { name } = req.params;
    const result = await stopService(name);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/v1/system/service/:name/start
 */
export async function handleStartService(req, res) {
  try {
    const { name } = req.params;
    const result = await startService(name);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/v1/system/service/:name
 */
export async function handleGetService(req, res) {
  try {
    const { name } = req.params;
    const details = await getServiceDetails(name);
    res.json(details);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/v1/system/services
 */
export async function handleGetAllServices(req, res) {
  try {
    const status = await getAllServicesStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/v1/system/services/restart-all
 */
export async function handleRestartAllServices(req, res) {
  try {
    const result = await restartAllServices();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/v1/system/service/:name/diagnose
 */
export async function handleDiagnoseService(req, res) {
  try {
    const { name } = req.params;
    const diagnosis = await diagnoseService(name);
    res.json(diagnosis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/v1/system/service/:name/health
 * Stream health updates (polling)
 */
export async function handleStreamServiceHealth(req, res) {
  try {
    const { name } = req.params;
    const maxWait = parseInt(req.query.maxWait) || 30000;

    const health = await pollServiceHealth(name, maxWait);
    res.json(health);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Health check
 */
export function handleHealth(req, res) {
  res.json({
    status: 'ok',
    service: 'system-control-api',
    timestamp: new Date().toISOString(),
  });
}
