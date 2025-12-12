// @version 3.3.555
/**
 * Billing Dashboard Component
 * 
 * Subscription management, usage tracking, and plan comparison.
 * Integrates with the Stripe billing backend.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─────────────────────────────────────────────────────────────────────────────
// Plan Badge Component
// ─────────────────────────────────────────────────────────────────────────────

function PlanBadge({ tier }) {
  const colors = {
    free: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    pro: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    unlimited: 'bg-purple-500/20 text-purple-400 border-purple-500/30'
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${colors[tier] || colors.free}`}>
      {tier?.toUpperCase()}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Usage Progress Bar
// ─────────────────────────────────────────────────────────────────────────────

function UsageBar({ label, current, limit, unit = '' }) {
  const isUnlimited = limit === 'unlimited' || limit === Infinity;
  const percent = isUnlimited ? 0 : Math.min(100, Math.round((current / limit) * 100));
  
  const getColor = () => {
    if (isUnlimited) return 'bg-purple-500';
    if (percent >= 90) return 'bg-red-500';
    if (percent >= 70) return 'bg-yellow-500';
    return 'bg-cyan-500';
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-400">{label}</span>
        <span className="text-white">
          {current.toLocaleString()}{unit} / {isUnlimited ? '∞' : limit.toLocaleString()}{unit}
        </span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${getColor()} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: isUnlimited ? '100%' : `${percent}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
      {!isUnlimited && (
        <div className="text-xs text-gray-500">
          {percent}% used • {(limit - current).toLocaleString()}{unit} remaining
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Plan Card Component
// ─────────────────────────────────────────────────────────────────────────────

function PlanCard({ plan, currentTier, onUpgrade }) {
  const isCurrent = plan.tier === currentTier;
  const isUpgrade = plan.priceMonthly > 0 && !isCurrent;
  
  return (
    <motion.div
      className={`relative rounded-2xl p-6 border transition-all ${
        isCurrent 
          ? 'bg-cyan-500/10 border-cyan-500/50 shadow-[0_0_30px_rgba(6,182,212,0.2)]' 
          : 'bg-white/5 border-white/10 hover:border-white/20'
      }`}
      whileHover={{ scale: isCurrent ? 1 : 1.02 }}
    >
      {isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-500 text-black">
            CURRENT PLAN
          </span>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-bold text-white">{plan.name}</h3>
          <p className="text-sm text-gray-400">{plan.description}</p>
        </div>

        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold text-white">
            {plan.priceMonthly === 0 ? 'Free' : `$${plan.priceMonthly}`}
          </span>
          {plan.priceMonthly > 0 && (
            <span className="text-gray-400">/month</span>
          )}
        </div>

        {plan.priceYearly > 0 && (
          <div className="text-sm text-cyan-400">
            ${plan.priceYearly}/year (save {Math.round((1 - plan.priceYearly / (plan.priceMonthly * 12)) * 100)}%)
          </div>
        )}

        <ul className="space-y-2">
          {plan.features.map((feature, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
              <span className="text-cyan-400">✓</span>
              {feature}
            </li>
          ))}
        </ul>

        {isUpgrade && (
          <button
            onClick={() => onUpgrade(plan.tier)}
            className="w-full py-3 rounded-xl font-medium bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-all"
          >
            Upgrade to {plan.name}
          </button>
        )}

        {isCurrent && plan.tier !== 'free' && (
          <button
            className="w-full py-3 rounded-xl font-medium border border-white/20 text-gray-400 hover:text-white transition-all"
          >
            Manage Subscription
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Billing Dashboard
// ─────────────────────────────────────────────────────────────────────────────

export default function BillingDashboard() {
  const [plans, setPlans] = useState([]);
  const [currentTier, setCurrentTier] = useState('free');
  const [usage, setUsage] = useState(null);
  const [rateLimits, setRateLimits] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [upgrading, setUpgrading] = useState(false);

  // Fetch billing data
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // Fetch plans
        const plansRes = await fetch('/api/v1/billing/plans');
        const plansData = await plansRes.json();
        if (plansData.success) {
          setPlans(plansData.plans);
        }

        // Fetch rate limits (includes current tier and usage)
        const limitsRes = await fetch('/api/v1/billing/rate-limits');
        if (limitsRes.ok) {
          const limitsData = await limitsRes.json();
          if (limitsData.success) {
            setRateLimits(limitsData);
            setCurrentTier(limitsData.tier);
          }
        }

        // Fetch detailed usage
        const usageRes = await fetch('/api/v1/billing/usage');
        if (usageRes.ok) {
          const usageData = await usageRes.json();
          if (usageData.success) {
            setUsage(usageData);
          }
        }

        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch billing data:', err);
        setError(err.message);
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Handle upgrade
  const handleUpgrade = async (tier) => {
    try {
      setUpgrading(true);
      
      const res = await fetch('/api/v1/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier,
          billingPeriod: 'monthly',
          successUrl: `${window.location.origin}/billing?success=true`,
          cancelUrl: `${window.location.origin}/billing?canceled=true`
        })
      });

      const data = await res.json();
      
      if (data.success && data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to start checkout');
      }
    } catch (err) {
      console.error('Checkout failed:', err);
      setError(err.message);
      setUpgrading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Billing & Usage</h1>
          <p className="text-gray-400">Manage your subscription and monitor API usage</p>
        </div>
        <PlanBadge tier={currentTier} />
      </div>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400"
          >
            {error}
            <button 
              onClick={() => setError(null)} 
              className="ml-4 text-white hover:underline"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Usage Overview */}
      {rateLimits && (
        <div className="rounded-2xl bg-white/5 border border-white/10 p-6 space-y-6">
          <h2 className="text-lg font-semibold text-white">Current Usage</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <UsageBar
              label="API Requests (Daily)"
              current={rateLimits.usage?.requests || 0}
              limit={rateLimits.limits?.requestsPerDay}
            />
            <UsageBar
              label="Tokens Used (Daily)"
              current={rateLimits.usage?.tokens || 0}
              limit={rateLimits.limits?.tokensPerDay}
            />
          </div>

          {rateLimits.resetsAt && (
            <div className="text-sm text-gray-500">
              Usage resets at {new Date(rateLimits.resetsAt).toLocaleTimeString()}
            </div>
          )}

          {rateLimits.upgrade && currentTier !== 'unlimited' && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-cyan-400 font-medium">Need more capacity?</p>
                  <p className="text-sm text-gray-400">{rateLimits.upgrade.message}</p>
                </div>
                <button
                  onClick={() => handleUpgrade(rateLimits.upgrade.nextTier)}
                  disabled={upgrading}
                  className="px-4 py-2 rounded-lg font-medium bg-cyan-500 text-black hover:bg-cyan-400 disabled:opacity-50 transition-all"
                >
                  {upgrading ? 'Loading...' : 'Upgrade Now'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Plan Comparison */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Available Plans</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <PlanCard
              key={plan.tier}
              plan={plan}
              currentTier={currentTier}
              onUpgrade={handleUpgrade}
            />
          ))}
        </div>
      </div>

      {/* Billing History Section */}
      <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Billing Management</h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
            <div>
              <p className="text-white font-medium">Manage Payment Methods</p>
              <p className="text-sm text-gray-400">Update credit card, view invoices</p>
            </div>
            <button
              onClick={async () => {
                try {
                  const res = await fetch('/api/v1/billing/portal', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      returnUrl: window.location.href
                    })
                  });
                  const data = await res.json();
                  if (data.success && data.url) {
                    window.location.href = data.url;
                  }
                } catch (err) {
                  setError('Failed to open billing portal');
                }
              }}
              className="px-4 py-2 rounded-lg font-medium border border-white/20 text-white hover:bg-white/5 transition-all"
            >
              Open Portal →
            </button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
            <div>
              <p className="text-white font-medium">API Keys</p>
              <p className="text-sm text-gray-400">Manage your API access keys</p>
            </div>
            <a
              href="/settings/api-keys"
              className="px-4 py-2 rounded-lg font-medium border border-white/20 text-white hover:bg-white/5 transition-all"
            >
              Manage Keys →
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-gray-500">
        <p>Have questions about billing? <a href="mailto:support@tooloo.ai" className="text-cyan-400 hover:underline">Contact support</a></p>
      </div>
    </div>
  );
}
