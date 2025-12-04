// @version 2.2.0 - Added refresh endpoint
import { Router } from 'express';
import { precog } from '../../precog/index.js';
import { bus } from '../../core/event-bus.js';

const router = Router();

// Provider Status - Returns array of providers directly
router.get('/status', (req, res) => {
  const providers = precog.providers.getProviderStatus();

  // Return simple, clean structure that frontend expects
  res.json({
    ok: true,
    data: {
      providers: providers,
      active: providers.find((p) => p.status === 'Ready')?.id || 'none',
      timestamp: Date.now(),
    },
  });
});

/**
 * POST /api/v1/providers/refresh
 * Refresh provider status and reconnect if needed
 */
router.post('/refresh', async (req, res) => {
  try {
    // Get current provider status before refresh
    const beforeProviders = precog.providers.getProviderStatus();

    // Trigger provider status refresh
    bus.publish('nexus', 'providers:refresh_requested', {
      requestedAt: new Date().toISOString(),
    });

    // Re-check provider connections
    const providers = precog.providers.getProviderStatus();

    // Find any providers that changed status
    const changes = providers
      .map((p, i) => {
        const before = beforeProviders[i];
        return {
          id: p.id,
          name: p.name,
          status: p.status,
          changed: before?.status !== p.status,
        };
      })
      .filter((p) => p.changed);

    res.json({
      ok: true,
      message: `Provider status refreshed. ${changes.length} provider(s) updated.`,
      data: {
        providers,
        changes,
        active: providers.find((p) => p.status === 'Ready')?.id || 'none',
        timestamp: Date.now(),
      },
    });
  } catch (e: any) {
    console.error('[Providers Routes] Refresh error:', e);
    res.status(500).json({
      ok: false,
      error: e.message || 'Failed to refresh providers',
    });
  }
});

export default router;
