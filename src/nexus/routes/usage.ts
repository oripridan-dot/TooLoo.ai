/**
 * @file Usage Dashboard Routes - System Usage Metrics & Analytics
 * @module nexus/routes/usage
 * @version 3.3.530
 * 
 * Endpoints for usage dashboards, analytics, and system metrics.
 */

import { Router, Request, Response } from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { authService } from '../auth/auth-service.js';
import { bus } from '../../cortex/bus.js';
import { fsManager } from '../../cortex/core/fs-manager.js';
import { metricsCollector } from '../../cortex/core/metrics-collector.js';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface DashboardStats {
  user: {
    tier: string;
    requestsToday: number;
    tokensToday: number;
    apiKeyCount: number;
  };
  limits: {
    requestsPerDay: number;
    tokensPerDay: number;
    apiKeys: number;
  };
  percentUsed: {
    requests: number;
    tokens: number;
  };
  system: {
    uptime: number;
    version: string;
    providers: number;
  };
}

interface UsageHistoryEntry {
  date: string;
  requests: number;
  tokens: number;
  errors: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard Overview
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/usage/dashboard
 * Get comprehensive dashboard data for authenticated user
 */
router.get('/dashboard', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const usage = authService.getUserUsageStats(req.user.id);
    const limits = authService.getTierLimits(req.user.tier);
    const keys = await authService.listUserAPIKeys(req.user.id);

    // Get system metrics
    const metrics = metricsCollector?.getMetrics?.() || {};
    
    const dashboard: DashboardStats = {
      user: {
        tier: req.user.tier,
        requestsToday: usage?.requestsToday || 0,
        tokensToday: usage?.tokensUsedToday || 0,
        apiKeyCount: keys.length
      },
      limits: {
        requestsPerDay: limits.requestsPerDay,
        tokensPerDay: limits.tokensPerDay,
        apiKeys: limits.apiKeys
      },
      percentUsed: {
        requests: Math.round(((usage?.requestsToday || 0) / limits.requestsPerDay) * 100),
        tokens: Math.round(((usage?.tokensUsedToday || 0) / limits.tokensPerDay) * 100)
      },
      system: {
        uptime: process.uptime(),
        version: '3.3.530',
        providers: 6
      }
    };

    res.json({
      success: true,
      dashboard,
      generatedAt: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to load dashboard',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/usage/summary
 * Quick usage summary (lightweight endpoint for widgets)
 */
router.get('/summary', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const usage = authService.getUserUsageStats(req.user.id);
    const limits = authService.getTierLimits(req.user.tier);

    res.json({
      success: true,
      tier: req.user.tier,
      requests: {
        used: usage?.requestsToday || 0,
        limit: limits.requestsPerDay,
        percent: Math.round(((usage?.requestsToday || 0) / limits.requestsPerDay) * 100)
      },
      tokens: {
        used: usage?.tokensUsedToday || 0,
        limit: limits.tokensPerDay,
        percent: Math.round(((usage?.tokensUsedToday || 0) / limits.tokensPerDay) * 100)
      }
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get usage summary',
      message: error.message
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Usage History
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/usage/history
 * Get usage history for the last N days
 */
router.get('/history', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const days = Math.min(parseInt(req.query.days as string) || 7, 30);
    
    // Try to load from usage history file
    const historyFile = await fsManager.readJSON<{ history: Record<string, UsageHistoryEntry[]> }>(
      'data',
      'usage-history.json'
    );

    const userHistory = historyFile?.history?.[req.user.id] || [];
    
    // Generate placeholder data for missing days
    const history: UsageHistoryEntry[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const existing = userHistory.find(h => h.date === dateStr);
      history.push(existing || {
        date: dateStr,
        requests: 0,
        tokens: 0,
        errors: 0
      });
    }

    res.json({
      success: true,
      days,
      history
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get usage history',
      message: error.message
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Tier Information
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/usage/tiers
 * Get information about available subscription tiers
 */
router.get('/tiers', async (_req: Request, res: Response) => {
  try {
    const tiers = [
      {
        id: 'free',
        name: 'Free',
        price: 0,
        features: [
          '100 requests/day',
          '50,000 tokens/day',
          '2 API keys',
          'Community support'
        ],
        limits: authService.getTierLimits('free')
      },
      {
        id: 'pro',
        name: 'Pro',
        price: 29,
        features: [
          '1,000 requests/day',
          '500,000 tokens/day',
          '10 API keys',
          'Priority support',
          'Advanced analytics'
        ],
        limits: authService.getTierLimits('pro')
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        price: 199,
        features: [
          '10,000 requests/day',
          '5,000,000 tokens/day',
          '50 API keys',
          'Dedicated support',
          'Custom integrations',
          'SLA guarantee'
        ],
        limits: authService.getTierLimits('enterprise')
      }
    ];

    res.json({
      success: true,
      tiers
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get tier info',
      message: error.message
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// API Key Analytics
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/usage/keys
 * Get usage breakdown by API key
 */
router.get('/keys', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const keys = await authService.listUserAPIKeys(req.user.id);

    const keyAnalytics = keys.map(key => ({
      id: key.id,
      name: key.name,
      active: key.active,
      usageCount: key.usageCount,
      lastUsedAt: key.lastUsedAt,
      createdAt: key.createdAt,
      expiresAt: key.expiresAt,
      rateLimit: key.rateLimit,
      scopes: key.scopes
    }));

    // Sort by usage count descending
    keyAnalytics.sort((a, b) => b.usageCount - a.usageCount);

    res.json({
      success: true,
      totalKeys: keyAnalytics.length,
      activeKeys: keyAnalytics.filter(k => k.active).length,
      totalUsage: keyAnalytics.reduce((sum, k) => sum + k.usageCount, 0),
      keys: keyAnalytics
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get key analytics',
      message: error.message
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// System Status (Public)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/usage/status
 * Get system status (public endpoint)
 */
router.get('/status', async (_req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      status: 'operational',
      version: '3.3.530',
      uptime: process.uptime(),
      services: {
        api: 'operational',
        auth: 'operational',
        llm: 'operational',
        storage: 'operational'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      status: 'degraded',
      message: error.message
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Quota Check
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/usage/quota
 * Check current quota status (useful before expensive operations)
 */
router.get('/quota', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const limitCheck = await authService.checkUsageLimits(req.user.id);
    const usage = authService.getUserUsageStats(req.user.id);
    const limits = authService.getTierLimits(req.user.tier);

    res.json({
      success: true,
      allowed: limitCheck.allowed,
      reason: limitCheck.reason,
      remaining: {
        requests: limits.requestsPerDay - (usage?.requestsToday || 0),
        tokens: limits.tokensPerDay - (usage?.tokensUsedToday || 0)
      },
      resetsAt: getNextMidnight()
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to check quota',
      message: error.message
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getNextMidnight(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.toISOString();
}

export default router;
