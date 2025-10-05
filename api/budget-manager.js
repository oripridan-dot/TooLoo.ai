/**
 * BudgetManager - Tracks AI provider costs and enforces limits
 * 
 * Features:
 * - Daily/monthly spending limits
 * - Per-provider cost tracking
 * - Request caching (1-hour TTL)
 * - Alert system for overspending
 * - Cost optimization recommendations
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class BudgetManager {
  constructor(options = {}) {
    this.dailyLimit = options.dailyLimit || 5.00;
    this.monthlyLimit = options.monthlyLimit || 100.00;
    this.cacheDir = options.cacheDir || path.join(__dirname, '../cache');
    this.logFile = options.logFile || path.join(__dirname, '../logs/budget.jsonl');
    
    // Provider pricing (per 1M tokens)
    // Based on actual provider pricing as of 2024
    this.pricing = {
      deepseek: { input: 0.14, output: 0.28 },
      gemini: { input: 0.075, output: 0.30 },
      claude: { input: 3.00, output: 15.00 },
      openai: { input: 10.00, output: 30.00 },
      huggingface: { input: 0, output: 0 } // Free tier
    };
    
    this.todaySpent = 0;
    this.monthSpent = 0;
    this.calls = [];
    this.cache = new Map();
    
    this.init();
  }

  async init() {
    try {
      // Create cache directory
      await fs.mkdir(this.cacheDir, { recursive: true });
      await fs.mkdir(path.dirname(this.logFile), { recursive: true });
      
      // Load today's spending
      await this.loadTodaySpending();
      
      console.log('💰 Budget Manager initialized');
      console.log(`   Daily limit: $${this.dailyLimit.toFixed(2)}`);
      console.log(`   Monthly limit: $${this.monthlyLimit.toFixed(2)}`);
    } catch (error) {
      console.warn('⚠️  Budget Manager initialization warning:', error.message);
    }
  }

  async loadTodaySpending() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const logContent = await fs.readFile(this.logFile, 'utf-8');
      const lines = logContent.trim().split('\n').filter(line => line.trim());
      
      this.calls = lines
        .map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter(call => call && call.date === today);
      
      this.todaySpent = this.calls.reduce((sum, call) => sum + (call.cost || 0), 0);
      
      if (this.calls.length > 0) {
        console.log(`   Loaded ${this.calls.length} calls from today ($${this.todaySpent.toFixed(4)})`);
      }
      
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.warn('⚠️  Could not load budget history:', error.message);
      }
    }
  }

  /**
   * Check if a call can be made within budget
   */
  canMakeCall(provider, estimatedTokens) {
    const estimatedCost = this.estimateCost(provider, estimatedTokens);
    
    if (this.todaySpent + estimatedCost > this.dailyLimit) {
      return {
        allowed: false,
        reason: 'daily_limit_exceeded',
        current: this.todaySpent,
        limit: this.dailyLimit,
        estimated: estimatedCost
      };
    }
    
    if (this.monthSpent + estimatedCost > this.monthlyLimit) {
      return {
        allowed: false,
        reason: 'monthly_limit_exceeded',
        current: this.monthSpent,
        limit: this.monthlyLimit,
        estimated: estimatedCost
      };
    }
    
    return { allowed: true, estimated: estimatedCost };
  }

  /**
   * Estimate cost for a provider call
   */
  estimateCost(provider, tokens) {
    const providerPricing = this.pricing[provider] || this.pricing.openai;
    const inputTokens = tokens.input || tokens;
    const outputTokens = tokens.output || tokens;
    
    return (
      (inputTokens / 1_000_000) * providerPricing.input +
      (outputTokens / 1_000_000) * providerPricing.output
    );
  }

  /**
   * Track a completed API call
   */
  async trackCall(provider, tokens, actualCost = null) {
    const cost = actualCost || this.estimateCost(provider, tokens);
    
    const call = {
      provider,
      tokens,
      cost,
      timestamp: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0]
    };
    
    this.calls.push(call);
    this.todaySpent += cost;
    this.monthSpent += cost;
    
    // Log to file
    try {
      await fs.appendFile(this.logFile, JSON.stringify(call) + '\n');
    } catch (error) {
      console.warn('⚠️  Could not log budget call:', error.message);
    }
    
    // Check if approaching limits
    if (this.todaySpent > this.dailyLimit * 0.8) {
      console.warn(`⚠️  Budget alert: $${this.todaySpent.toFixed(4)}/$${this.dailyLimit.toFixed(2)} daily limit used (${((this.todaySpent/this.dailyLimit)*100).toFixed(1)}%)`);
    }
    
    return call;
  }

  /**
   * Get cached response for a prompt
   */
  async getCached(promptHash) {
    const cacheFile = path.join(this.cacheDir, `${promptHash}.json`);
    
    try {
      const cached = await fs.readFile(cacheFile, 'utf-8');
      const data = JSON.parse(cached);
      
      // Check if expired (1 hour TTL)
      const age = Date.now() - data.timestamp;
      if (age < 3600000) {
        console.log('✅ Using cached response (saved cost: ~$' + (data.savedCost || 0).toFixed(4) + ')');
        return data.response;
      } else {
        // Cache expired, delete it
        await fs.unlink(cacheFile).catch(() => {});
      }
    } catch (error) {
      // Cache miss - this is normal
    }
    
    return null;
  }

  /**
   * Cache a response
   */
  async setCached(promptHash, response, estimatedCost = 0) {
    const cacheFile = path.join(this.cacheDir, `${promptHash}.json`);
    
    try {
      await fs.writeFile(cacheFile, JSON.stringify({
        response,
        timestamp: Date.now(),
        savedCost: estimatedCost
      }));
    } catch (error) {
      console.warn('⚠️  Could not cache response:', error.message);
    }
  }

  /**
   * Generate hash for prompt caching
   */
  hashPrompt(prompt, provider = '') {
    return crypto.createHash('md5')
      .update(prompt + provider)
      .digest('hex');
  }

  /**
   * Get budget status
   */
  getStatus() {
    return {
      daily: {
        spent: parseFloat(this.todaySpent.toFixed(6)),
        limit: this.dailyLimit,
        remaining: parseFloat((this.dailyLimit - this.todaySpent).toFixed(6)),
        percentage: parseFloat(((this.todaySpent / this.dailyLimit) * 100).toFixed(1))
      },
      monthly: {
        spent: parseFloat(this.monthSpent.toFixed(6)),
        limit: this.monthlyLimit,
        remaining: parseFloat((this.monthlyLimit - this.monthSpent).toFixed(6)),
        percentage: parseFloat(((this.monthSpent / this.monthlyLimit) * 100).toFixed(1))
      },
      callsToday: this.calls.length,
      cheapestProvider: this.getCheapestProvider(),
      pricing: this.pricing
    };
  }

  /**
   * Recommend cheapest provider for task
   */
  getCheapestProvider() {
    const available = Object.keys(this.pricing)
      .filter(p => p !== 'huggingface'); // Exclude free tier from recommendations
    
    return available.sort((a, b) => 
      this.pricing[a].input - this.pricing[b].input
    )[0] || 'deepseek';
  }

  /**
   * Get spending breakdown by provider
   */
  getBreakdown() {
    const breakdown = {};
    
    this.calls.forEach(call => {
      if (!breakdown[call.provider]) {
        breakdown[call.provider] = {
          calls: 0,
          cost: 0,
          tokens: { input: 0, output: 0 }
        };
      }
      
      breakdown[call.provider].calls++;
      breakdown[call.provider].cost += call.cost;
      breakdown[call.provider].tokens.input += call.tokens.input || 0;
      breakdown[call.provider].tokens.output += call.tokens.output || 0;
    });
    
    // Round costs for display
    Object.keys(breakdown).forEach(provider => {
      breakdown[provider].cost = parseFloat(breakdown[provider].cost.toFixed(6));
    });
    
    return breakdown;
  }

  /**
   * Clear old cache files (older than 24 hours)
   */
  async cleanCache() {
    try {
      const files = await fs.readdir(this.cacheDir);
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      
      let cleaned = 0;
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        const filePath = path.join(this.cacheDir, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtimeMs > maxAge) {
          await fs.unlink(filePath);
          cleaned++;
        }
      }
      
      if (cleaned > 0) {
        console.log(`🧹 Cleaned ${cleaned} expired cache files`);
      }
    } catch (error) {
      console.warn('⚠️  Cache cleanup warning:', error.message);
    }
  }
}
