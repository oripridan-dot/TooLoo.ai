// Referral System for TooLoo.ai Beta
// Tracks user referrals for growth during Oct 21 - Nov 15 beta phase
// Handles: code generation, referral tracking, leaderboard data

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ReferralSystem {
  constructor() {
    this.referralsFile = path.join(process.cwd(), '.data', 'referrals.json');
    this.referrals = [];
    this.initPromise = this.init();
  }

  async init() {
    try {
      await fs.promises.mkdir(path.dirname(this.referralsFile), { recursive: true });
      try {
        const data = await fs.promises.readFile(this.referralsFile, 'utf8');
        this.referrals = JSON.parse(data) || [];
      } catch {
        this.referrals = [];
      }
    } catch (e) {
      console.error('Referral system init error:', e);
    }
  }

  // Ensure initialization before operations
  async ensureReady() {
    await this.initPromise;
  }

  // Generate unique referral code (e.g., "tooloo-abc123xyz")
  generateCode(userId) {
    const random = Math.random().toString(36).substring(2, 9);
    return `tooloo-${random}`;
  }

  // Create referral record for a user
  async createReferral(userId, email) {
    await this.ensureReady();
    const code = this.generateCode(userId);
    const referral = {
      code,
      creator_id: userId,
      creator_email: email || null,
      created_at: new Date().toISOString(),
      referred_count: 0,
      referred_users: [],
      last_share: null
    };

    this.referrals.push(referral);
    await this.save();

    return referral;
  }

  // Redeem referral code (user signs up with referral code)
  async redeemCode(referralCode, newUserId) {
    await this.ensureReady();
    const referral = this.referrals.find(r => r.code === referralCode);
    if (!referral) {
      return { ok: false, error: 'Invalid referral code' };
    }

    // Add to referred users list
    if (!referral.referred_users.includes(newUserId)) {
      referral.referred_users.push(newUserId);
      referral.referred_count = referral.referred_users.length;
      referral.last_share = new Date().toISOString();
    }

    await this.save();

    return {
      ok: true,
      referrer_id: referral.creator_id,
      referrer_email: referral.creator_email,
      referred_by: referralCode
    };
  }

  // Get top referrers (leaderboard)
  async getLeaderboard(limit = 10) {
    await this.ensureReady();
    return this.referrals
      .filter(r => r.referred_count > 0)
      .sort((a, b) => b.referred_count - a.referred_count)
      .slice(0, limit)
      .map((r, idx) => ({
        rank: idx + 1,
        code: r.code,
        creator_email: r.creator_email || 'Anonymous',
        referred_count: r.referred_count,
        created_at: r.created_at
      }));
  }

  // Get user's referral data
  async getUserReferral(userId) {
    await this.ensureReady();
    return this.referrals.find(r => r.creator_id === userId) || null;
  }

  // Get referral by code
  async getReferralByCode(code) {
    await this.ensureReady();
    return this.referrals.find(r => r.code === code) || null;
  }

  // Save to disk
  async save() {
    try {
      await fs.promises.writeFile(
        this.referralsFile,
        JSON.stringify(this.referrals, null, 2)
      );
    } catch (e) {
      console.error('Failed to save referral data:', e);
    }
  }

  // Get stats
  async getStats() {
    await this.ensureReady();
    const total = this.referrals.length;
    const active = this.referrals.filter(r => r.referred_count > 0).length;
    const totalReferred = this.referrals.reduce((sum, r) => sum + r.referred_count, 0);

    return {
      total_referral_codes: total,
      active_referrers: active,
      total_referrals: totalReferred,
      avg_referrals_per_active: active > 0 ? (totalReferred / active).toFixed(1) : 0
    };
  }
}

export default ReferralSystem;
