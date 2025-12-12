// @version 3.3.543
/**
 * @file Billing Service - Stripe Payment Integration
 * @module nexus/billing/billing-service
 * @version 3.3.542
 * 
 * Handles subscription management, checkout sessions, webhooks, and usage metering.
 * 
 * Subscription Tiers:
 * - Free: 100 requests/day, 10K tokens/day
 * - Pro: 10,000 requests/day, 1M tokens/day, $29/month
 * - Unlimited: Unlimited requests, 10M tokens/day, $99/month
 */

import Stripe from 'stripe';
import { EventEmitter } from 'events';
import { authService } from '../auth/auth-service.js';
import type { User } from '../auth/auth-service.js';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type SubscriptionTier = 'free' | 'pro' | 'unlimited';

export interface SubscriptionPlan {
  tier: SubscriptionTier;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  stripePriceIdMonthly: string | null;
  stripePriceIdYearly: string | null;
  limits: {
    requestsPerDay: number;
    tokensPerDay: number;
    apiKeys: number;
    teamMembers: number;
    prioritySupport: boolean;
  };
  features: string[];
}

export interface CustomerSubscription {
  id: string;
  customerId: string;
  tier: SubscriptionTier;
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId: string | null;
}

export interface UsageRecord {
  userId: string;
  timestamp: Date;
  requestCount: number;
  tokenCount: number;
  meterId?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

export const SUBSCRIPTION_PLANS: Record<SubscriptionTier, SubscriptionPlan> = {
  free: {
    tier: 'free',
    name: 'Free',
    description: 'For hobbyists and testing',
    priceMonthly: 0,
    priceYearly: 0,
    stripePriceIdMonthly: null,
    stripePriceIdYearly: null,
    limits: {
      requestsPerDay: 100,
      tokensPerDay: 10_000,
      apiKeys: 2,
      teamMembers: 1,
      prioritySupport: false
    },
    features: [
      '100 requests/day',
      '10K tokens/day',
      '2 API keys',
      'Community support',
      'Basic analytics'
    ]
  },
  pro: {
    tier: 'pro',
    name: 'Pro',
    description: 'For professional developers',
    priceMonthly: 29,
    priceYearly: 290,
    stripePriceIdMonthly: process.env.STRIPE_PRICE_PRO_MONTHLY || null,
    stripePriceIdYearly: process.env.STRIPE_PRICE_PRO_YEARLY || null,
    limits: {
      requestsPerDay: 10_000,
      tokensPerDay: 1_000_000,
      apiKeys: 10,
      teamMembers: 5,
      prioritySupport: true
    },
    features: [
      '10,000 requests/day',
      '1M tokens/day',
      '10 API keys',
      '5 team members',
      'Priority support',
      'Advanced analytics',
      'Custom webhooks'
    ]
  },
  unlimited: {
    tier: 'unlimited',
    name: 'Unlimited',
    description: 'For teams and enterprises',
    priceMonthly: 99,
    priceYearly: 990,
    stripePriceIdMonthly: process.env.STRIPE_PRICE_UNLIMITED_MONTHLY || null,
    stripePriceIdYearly: process.env.STRIPE_PRICE_UNLIMITED_YEARLY || null,
    limits: {
      requestsPerDay: Infinity,
      tokensPerDay: 10_000_000,
      apiKeys: 100,
      teamMembers: 50,
      prioritySupport: true
    },
    features: [
      'Unlimited requests',
      '10M tokens/day',
      '100 API keys',
      '50 team members',
      'Priority support',
      'Dedicated account manager',
      'SLA guarantee',
      'Custom integrations'
    ]
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Billing Service
// ─────────────────────────────────────────────────────────────────────────────

class BillingService extends EventEmitter {
  private stripe: Stripe | null = null;
  private initialized = false;
  private subscriptions = new Map<string, CustomerSubscription>();
  private usageRecords: UsageRecord[] = [];

  constructor() {
    super();
  }

  /**
   * Initialize the billing service with Stripe
   */
  async initialize(): Promise<void> {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    
    if (stripeKey) {
      this.stripe = new Stripe(stripeKey, {
        apiVersion: '2024-11-20.acacia'
      });
      console.log('[BillingService] Stripe initialized');
    } else {
      console.log('[BillingService] Running in mock mode (no STRIPE_SECRET_KEY)');
    }
    
    this.initialized = true;
    this.emit('initialized');
  }

  /**
   * Check if Stripe is configured
   */
  isStripeConfigured(): boolean {
    return this.stripe !== null;
  }

  /**
   * Get all subscription plans
   */
  getPlans(): SubscriptionPlan[] {
    return Object.values(SUBSCRIPTION_PLANS);
  }

  /**
   * Get a specific plan by tier
   */
  getPlan(tier: SubscriptionTier): SubscriptionPlan {
    return SUBSCRIPTION_PLANS[tier];
  }

  /**
   * Create or get Stripe customer for a user
   */
  async getOrCreateCustomer(user: User): Promise<string> {
    if (!this.stripe) {
      // Mock mode - return user ID as customer ID
      return `cus_mock_${user.id}`;
    }

    // Check if user already has a Stripe customer ID
    const existingCustomerId = (user as any).stripeCustomerId;
    if (existingCustomerId) {
      return existingCustomerId;
    }

    // Create new Stripe customer
    const customer = await this.stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: {
        userId: user.id,
        tier: user.tier
      }
    });

    // Store customer ID (would normally update user in DB)
    console.log(`[BillingService] Created Stripe customer ${customer.id} for user ${user.id}`);
    
    return customer.id;
  }

  /**
   * Create a checkout session for subscription upgrade
   */
  async createCheckoutSession(
    user: User,
    tier: SubscriptionTier,
    billingPeriod: 'monthly' | 'yearly' = 'monthly',
    successUrl: string,
    cancelUrl: string
  ): Promise<{ sessionId: string; url: string }> {
    const plan = SUBSCRIPTION_PLANS[tier];
    
    if (!plan) {
      throw new Error(`Invalid tier: ${tier}`);
    }

    if (tier === 'free') {
      throw new Error('Cannot checkout for free tier');
    }

    if (!this.stripe) {
      // Mock mode
      const mockSessionId = `cs_mock_${Date.now()}`;
      return {
        sessionId: mockSessionId,
        url: `${successUrl}?session_id=${mockSessionId}&mock=true`
      };
    }

    const priceId = billingPeriod === 'yearly' 
      ? plan.stripePriceIdYearly 
      : plan.stripePriceIdMonthly;

    if (!priceId) {
      throw new Error(`No Stripe price configured for ${tier} ${billingPeriod}`);
    }

    const customerId = await this.getOrCreateCustomer(user);

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: user.id,
        tier,
        billingPeriod
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          tier
        }
      }
    });

    return {
      sessionId: session.id,
      url: session.url!
    };
  }

  /**
   * Create a billing portal session for subscription management
   */
  async createPortalSession(user: User, returnUrl: string): Promise<{ url: string }> {
    if (!this.stripe) {
      // Mock mode
      return { url: `${returnUrl}?portal=mock` };
    }

    const customerId = await this.getOrCreateCustomer(user);

    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl
    });

    return { url: session.url };
  }

  /**
   * Get user's current subscription
   */
  async getSubscription(userId: string): Promise<CustomerSubscription | null> {
    // Check cache first
    const cached = this.subscriptions.get(userId);
    if (cached) {
      return cached;
    }

    // In production, this would query Stripe
    // For now, return null (user is on free tier)
    return null;
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(event: Stripe.Event): Promise<void> {
    console.log(`[BillingService] Webhook received: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await this.handleCheckoutComplete(session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await this.handleSubscriptionUpdate(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await this.handleSubscriptionCanceled(subscription);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        await this.handleInvoicePaid(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await this.handlePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`[BillingService] Unhandled webhook event: ${event.type}`);
    }

    this.emit('webhook', event);
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string | Buffer, signature: string): Stripe.Event {
    if (!this.stripe) {
      throw new Error('Stripe not configured');
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET not configured');
    }

    return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  }

  /**
   * Record usage for metering
   */
  async recordUsage(userId: string, requestCount: number, tokenCount: number): Promise<void> {
    const record: UsageRecord = {
      userId,
      timestamp: new Date(),
      requestCount,
      tokenCount
    };

    this.usageRecords.push(record);

    // In production, would send to Stripe Meter
    if (this.stripe && process.env.STRIPE_METER_ID) {
      try {
        // Stripe metering API would be called here
        // await this.stripe.billing.meterEvents.create(...)
        console.log(`[BillingService] Recorded usage for ${userId}: ${requestCount} requests, ${tokenCount} tokens`);
      } catch (error) {
        console.error('[BillingService] Failed to record usage to Stripe:', error);
      }
    }

    this.emit('usageRecorded', record);
  }

  /**
   * Get usage stats for a user
   */
  getUsageStats(userId: string, since?: Date): { requests: number; tokens: number } {
    const cutoff = since || new Date(Date.now() - 24 * 60 * 60 * 1000); // Default: last 24h
    
    const records = this.usageRecords.filter(
      r => r.userId === userId && r.timestamp >= cutoff
    );

    return {
      requests: records.reduce((sum, r) => sum + r.requestCount, 0),
      tokens: records.reduce((sum, r) => sum + r.tokenCount, 0)
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Private Webhook Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  private async handleCheckoutComplete(session: Stripe.Checkout.Session): Promise<void> {
    const userId = session.metadata?.userId;
    const tier = session.metadata?.tier as SubscriptionTier;

    if (!userId || !tier) {
      console.error('[BillingService] Missing metadata in checkout session');
      return;
    }

    // Update user tier
    await authService.updateUser(userId, { tier });
    console.log(`[BillingService] User ${userId} upgraded to ${tier}`);
    
    this.emit('subscriptionCreated', { userId, tier });
  }

  private async handleSubscriptionUpdate(subscription: Stripe.Subscription): Promise<void> {
    const userId = subscription.metadata?.userId;
    const tier = subscription.metadata?.tier as SubscriptionTier;

    if (!userId) {
      console.error('[BillingService] Missing userId in subscription metadata');
      return;
    }

    const customerSub: CustomerSubscription = {
      id: `sub_${userId}`,
      customerId: subscription.customer as string,
      tier: tier || 'free',
      status: subscription.status as CustomerSubscription['status'],
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      stripeSubscriptionId: subscription.id
    };

    this.subscriptions.set(userId, customerSub);

    // Update user tier if subscription is active
    if (subscription.status === 'active' && tier) {
      await authService.updateUser(userId, { tier });
    }

    this.emit('subscriptionUpdated', customerSub);
  }

  private async handleSubscriptionCanceled(subscription: Stripe.Subscription): Promise<void> {
    const userId = subscription.metadata?.userId;

    if (!userId) {
      return;
    }

    // Downgrade to free tier
    await authService.updateUser(userId, { tier: 'free' });
    this.subscriptions.delete(userId);
    
    console.log(`[BillingService] User ${userId} downgraded to free tier`);
    this.emit('subscriptionCanceled', { userId });
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    console.log(`[BillingService] Invoice paid: ${invoice.id}`);
    this.emit('invoicePaid', invoice);
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const customerId = invoice.customer as string;
    console.log(`[BillingService] Payment failed for customer: ${customerId}`);
    
    // Would notify user via email
    this.emit('paymentFailed', { customerId, invoiceId: invoice.id });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton Export
// ─────────────────────────────────────────────────────────────────────────────

export const billingService = new BillingService();
export default billingService;
