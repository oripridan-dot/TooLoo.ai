const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

/**
 * Auth - Single-user authentication for TooLoo.ai
 * 
 * Purpose: Secure personal workspace with password protection
 * Note: Single-user only, no multi-tenant features needed
 */
class Auth {
  constructor() {
    this.configPath = path.join(process.cwd(), '.auth-config.json');
    this.sessionToken = null;
    this.sessionExpiry = null;
    this.sessionDuration = 24 * 60 * 60 * 1000; // 24 hours
  }

  /**
   * Initialize authentication system
   */
  async initialize() {
    const config = await this.loadConfig();
    
    if (!config.masterPassword) {
      // First time setup - generate secure password
      const password = this.generateSecurePassword();
      await this.setMasterPassword(password);
      
      console.log('\n🔐 ═══════════════════════════════════════════════════════');
      console.log('🔐 IMPORTANT: Save this password securely!');
      console.log('🔐 ═══════════════════════════════════════════════════════');
      console.log(`🔐 Master Password: ${password}`);
      console.log('🔐 ═══════════════════════════════════════════════════════');
      console.log('🔐 You will need this to access TooLoo.ai');
      console.log('🔐 Store it in a password manager immediately!');
      console.log('🔐 ═══════════════════════════════════════════════════════\n');
      
      return false; // Not configured yet
    }
    
    console.log('🔐 Authentication configured');
    return true;
  }

  /**
   * Load auth config from disk
   * @private
   */
  async loadConfig() {
    try {
      const content = await fs.readFile(this.configPath, 'utf8');
      return JSON.parse(content);
    } catch {
      return {};
    }
  }

  /**
   * Set master password (hashed)
   * @private
   */
  async setMasterPassword(password) {
    const salt = crypto.randomBytes(32).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    
    const config = {
      masterPassword: hash,
      salt,
      createdAt: new Date().toISOString()
    };
    
    await fs.writeFile(this.configPath, JSON.stringify(config, null, 2), 'utf8');
  }

  /**
   * Generate secure random password
   * @private
   */
  generateSecurePassword() {
    // Generate 32 character password with mix of characters
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    const password = Array.from(crypto.randomBytes(32))
      .map(byte => chars[byte % chars.length])
      .join('');
    
    return password.slice(0, 32);
  }

  /**
   * Authenticate user with password
   */
  async authenticate(password) {
    const config = await this.loadConfig();
    
    if (!config.masterPassword || !config.salt) {
      throw new Error('Authentication not configured');
    }
    
    // Hash provided password with stored salt
    const hash = crypto.pbkdf2Sync(password, config.salt, 100000, 64, 'sha512').toString('hex');
    
    if (hash === config.masterPassword) {
      // Generate session token
      this.sessionToken = crypto.randomBytes(64).toString('hex');
      this.sessionExpiry = Date.now() + this.sessionDuration;
      
      console.log('✅ Authentication successful');
      
      return {
        token: this.sessionToken,
        expiresAt: new Date(this.sessionExpiry).toISOString()
      };
    }
    
    console.log('❌ Authentication failed - invalid password');
    return null;
  }

  /**
   * Check if token is valid and not expired
   */
  isAuthenticated(token) {
    if (!token || !this.sessionToken) {
      return false;
    }
    
    if (token !== this.sessionToken) {
      return false;
    }
    
    if (Date.now() > this.sessionExpiry) {
      console.log('⚠️  Session expired');
      this.sessionToken = null;
      this.sessionExpiry = null;
      return false;
    }
    
    return true;
  }

  /**
   * Check if auth is configured
   */
  async isConfigured() {
    const config = await this.loadConfig();
    return !!config.masterPassword;
  }

  /**
   * Express middleware for protected routes
   */
  middleware() {
    return (req, res, next) => {
      const token = req.headers['x-session-token'] || req.headers['authorization']?.replace('Bearer ', '');
      
      if (!this.isAuthenticated(token)) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized - Invalid or expired session token',
          requiresAuth: true
        });
      }
      
      next();
    };
  }

  /**
   * Logout (invalidate session)
   */
  logout() {
    this.sessionToken = null;
    this.sessionExpiry = null;
    console.log('👋 Logged out');
  }

  /**
   * Change master password
   */
  async changePassword(oldPassword, newPassword) {
    // Verify old password
    const auth = await this.authenticate(oldPassword);
    if (!auth) {
      throw new Error('Invalid current password');
    }
    
    // Set new password
    await this.setMasterPassword(newPassword);
    
    // Invalidate current session
    this.logout();
    
    console.log('✅ Password changed successfully');
    return true;
  }
}

module.exports = Auth;
