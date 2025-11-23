// @version 2.1.11
/**
 * Budget Manager and Response Cache
 * - Tracks daily AI spend with per-provider costs
 * - Enforces DAILY_BUDGET_LIMIT with 80% warning, 100% block
 * - Provides 1-hour TTL response cache to reduce costs
 */

import crypto from 'crypto';

const env = (k, d) => (process.env[k] ?? d);

export default class BudgetManager {
  constructor(options = {}) {
    // Allow constructor overrides while keeping env defaults
    this.limit = Number(options.limit ?? env('DAILY_BUDGET_LIMIT', '5.00'));
    this.prices = {
      deepseek: Number(options.deepseekCost ?? env('DEEPSEEK_COST_PER_CALL', '0.002')),
      anthropic: Number(options.anthropicCost ?? env('ANTHROPIC_COST_PER_CALL', '0.012')),
      openai: Number(options.openaiCost ?? env('OPENAI_COST_PER_CALL', '0.010')),
      gemini: Number(options.geminiCost ?? env('GEMINI_COST_PER_CALL', '0.004'))
    };

    this.state = {
      date: this._todayKey(),
      used: 0,
      calls: { deepseek: 0, anthropic: 0, openai: 0, gemini: 0 },
      history: []
    };

    this.cache = new Map(); // key -> { value, expiresAt }
    this.defaultTTLms = 60 * 60 * 1000; // 1 hour
  }

  available() { return true; }

  _todayKey() {
    const d = new Date();
    return d.toISOString().slice(0,10);
  }

  _rolloverIfNeeded() {
    const today = this._todayKey();
    if (this.state.date !== today) {
      this.state = {
        date: today,
        used: 0,
        calls: { deepseek: 0, anthropic: 0, openai: 0, gemini: 0 },
        history: []
      };
    }
  }

  getProviderCost(provider) {
    return this.prices[provider] ?? 0.005; // sensible default
  }

  checkBudget(estimatedCost = 0) {
    this._rolloverIfNeeded();
    const used = this.state.used;
    const limit = this.limit;
    const remaining = Math.max(0, limit - used);
    const percent = limit > 0 ? used / limit : 0;
    const willExceed = used + estimatedCost > limit;
    return {
      allowed: !willExceed,
      used,
      limit,
      remaining,
      percent,
      warning: percent >= 0.8 && percent < 1.0,
      blocked: percent >= 1.0 || willExceed
    };
  }

  // Back-compat: previous code expects budget.willExceed(provider)
  // Accepts either a provider string or a numeric cost override
  willExceed(providerOrCost) {
    const estimatedCost = typeof providerOrCost === 'number' 
      ? providerOrCost 
      : this.getProviderCost(providerOrCost);
    const status = this.checkBudget(estimatedCost);
    return status.blocked;
  }

  recordCall(provider, costOverride) {
    this._rolloverIfNeeded();
    const cost = typeof costOverride === 'number' ? costOverride : this.getProviderCost(provider);
    this.state.used += cost;
    if (!this.state.calls[provider]) this.state.calls[provider] = 0;
    this.state.calls[provider] += 1;
    this.state.history.unshift({ provider, cost, t: Date.now() });
    if (this.state.history.length > 200) this.state.history = this.state.history.slice(0, 200);
    return cost;
  }

  // Back-compat: previous code expects budget.record(provider) to return a status
  // object with { spent, limit, percent }. We return the up-to-date status plus
  // callCost to make per-call accounting explicit for new callers.
  record(provider, costOverride) {
    const callCost = this.recordCall(provider, costOverride);
    const status = this.getStatus();
    return { ...status, spent: status.used, callCost };
  }

  getStatus() {
    this._rolloverIfNeeded();
    const percent = this.limit > 0 ? this.state.used / this.limit : 0;
    return {
      date: this.state.date,
      used: round2(this.state.used),
      // Back-compat alias for existing callers
      spent: round2(this.state.used),
      limit: round2(this.limit),
      remaining: round2(Math.max(0, this.limit - this.state.used)),
      percent,
      calls: this.state.calls,
      warning: percent >= 0.8 && percent < 1.0,
      blocked: percent >= 1.0
    };
  }

  // Cache helpers
  makeCacheKeyFromRequest(reqBody) {
    const { prompt = '', system = '', taskType = 'chat', context = {} } = reqBody || {};
    const raw = JSON.stringify({ prompt, system, taskType, context });
    return crypto.createHash('md5').update(raw).digest('hex');
  }

  getCached(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  setCache(key, value, ttlMs) {
    const ttl = typeof ttlMs === 'number' ? ttlMs : this.defaultTTLms;
    this.cache.set(key, { value, expiresAt: Date.now() + ttl });
  }
}

function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }
// End of module
