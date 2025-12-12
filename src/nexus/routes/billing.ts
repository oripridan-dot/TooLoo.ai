// @version 3.3.549
/**
 * @file Billing Routes - Stripe Payment Endpoints
 * @module nexus/routes/billing
 * @version 3.3.550
 * 
 * REST API for subscription management, checkout, webhooks, and usage.
 * V3.3.550: Added rate-limits endpoint for tier-based rate limit status
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { billingService, SUBSCRIPTION_PLANS, type SubscriptionTier } from '../billing/billing-service.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { getRateLimitStatus, getDailyUsage, getTierLimits } from '../middleware/rate-limiter.js';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// Validation Schemas
// ─────────────────────────────────────────────────────────────────────────────

const CheckoutSchema = z.object({
  tier: z.enum(['pro', 'unlimited']),
  billingPeriod: z.enum(['monthly', 'yearly']).default('monthly'),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional()
});

// ─────────────────────────────────────────────────────────────────────────────
// Public Routes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/billing/plans
 * Get all available subscription plans
 */
router.get('/plans', (_req: Request, res: Response) => {
  const plans = billingService.getPlans();
  
  res.json({
    success: true,
    plans: plans.map(p => ({
      tier: p.tier,
      name: p.name,
      description: p.description,
      priceMonthly: p.priceMonthly,
      priceYearly: p.priceYearly,
      features: p.features,
      limits: p.limits
    })),
    stripeConfigured: billingService.isStripeConfigured()
  });
});

/**
 * GET /api/v1/billing/plans/:tier
 * Get details for a specific plan
 */
router.get('/plans/:tier', (req: Request, res: Response) => {
  const tier = req.params.tier as SubscriptionTier;
  
  if (!SUBSCRIPTION_PLANS[tier]) {
    res.status(404).json({ error: 'Plan not found' });
    return;
  }

  const plan = billingService.getPlan(tier);
  
  res.json({
    success: true,
    plan: {
      tier: plan.tier,
      name: plan.name,
      description: plan.description,
      priceMonthly: plan.priceMonthly,
      priceYearly: plan.priceYearly,
      features: plan.features,
      limits: plan.limits
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Authenticated Routes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/billing/subscription
 * Get current user's subscription status
 */
router.get('/subscription', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const subscription = await billingService.getSubscription(req.user.id);
    const currentPlan = billingService.getPlan(req.user.tier as SubscriptionTier);

    res.json({
      success: true,
      subscription: subscription ? {
        tier: subscription.tier,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd
      } : null,
      currentPlan: {
        tier: currentPlan.tier,
        name: currentPlan.name,
        limits: currentPlan.limits
      }
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get subscription',
      message: error.message
    });
  }
});

/**
 * POST /api/v1/billing/checkout
 * Create a Stripe checkout session for subscription upgrade
 */
router.post('/checkout', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const input = CheckoutSchema.parse(req.body);
    
    // Default URLs
    const baseUrl = process.env.APP_URL || 'http://localhost:4000';
    const successUrl = input.successUrl || `${baseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = input.cancelUrl || `${baseUrl}/billing/cancel`;

    const session = await billingService.createCheckoutSession(
      req.user,
      input.tier,
      input.billingPeriod,
      successUrl,
      cancelUrl
    );

    res.json({
      success: true,
      sessionId: session.sessionId,
      url: session.url
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors
      });
      return;
    }
    res.status(400).json({
      error: 'Checkout failed',
      message: error.message
    });
  }
});

/**
 * POST /api/v1/billing/portal
 * Create a Stripe billing portal session for subscription management
 */
router.post('/portal', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const returnUrl = req.body.returnUrl || process.env.APP_URL || 'http://localhost:4000';
    
    const session = await billingService.createPortalSession(req.user, returnUrl);

    res.json({
      success: true,
      url: session.url
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to create portal session',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/billing/usage
 * Get current user's usage statistics
 */
router.get('/usage', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const since = req.query.since 
      ? new Date(req.query.since as string) 
      : undefined;

    const usage = billingService.getUsageStats(req.user.id, since);
    const plan = billingService.getPlan(req.user.tier as SubscriptionTier);

    res.json({
      success: true,
      usage: {
        requests: usage.requests,
        tokens: usage.tokens,
        period: since ? { since } : { period: '24h' }
      },
      limits: {
        requestsPerDay: plan.limits.requestsPerDay,
        tokensPerDay: plan.limits.tokensPerDay
      },
      percentUsed: {
        requests: plan.limits.requestsPerDay === Infinity 
          ? 0 
          : Math.round((usage.requests / plan.limits.requestsPerDay) * 100),
        tokens: Math.round((usage.tokens / plan.limits.tokensPerDay) * 100)
      }
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get usage',
      message: error.message
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Webhook Route (No Auth - Verified by Stripe Signature)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/billing/webhook
 * Handle Stripe webhook events
 * 
 * IMPORTANT: This endpoint must receive raw body for signature verification
 */
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      res.status(400).json({ error: 'Missing stripe-signature header' });
      return;
    }

    // Note: In production, express.raw() middleware must be used for this route
    // to preserve the raw body for signature verification
    let event;
    
    try {
      event = billingService.verifyWebhookSignature(
        req.body,
        signature
      );
    } catch (err: any) {
      console.error('[Billing Webhook] Signature verification failed:', err.message);
      res.status(400).json({ error: 'Invalid signature' });
      return;
    }

    await billingService.handleWebhook(event);

    res.json({ received: true });
  } catch (error: any) {
    console.error('[Billing Webhook] Error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Tier Comparison
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/billing/compare
 * Compare all subscription tiers
 */
router.get('/compare', optionalAuth, (req: Request, res: Response) => {
  const plans = billingService.getPlans();
  const currentTier = req.user?.tier || 'free';

  res.json({
    success: true,
    currentTier,
    comparison: plans.map(p => ({
      tier: p.tier,
      name: p.name,
      priceMonthly: p.priceMonthly,
      priceYearly: p.priceYearly,
      yearlyDiscount: p.priceYearly > 0 
        ? Math.round((1 - p.priceYearly / (p.priceMonthly * 12)) * 100) 
        : 0,
      features: p.features,
      limits: p.limits,
      isCurrent: p.tier === currentTier,
      isUpgrade: p.priceMonthly > (SUBSCRIPTION_PLANS[currentTier as SubscriptionTier]?.priceMonthly || 0)
    }))
  });
});

export default router;
