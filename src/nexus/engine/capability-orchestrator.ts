// @version 2.1.28
/**
 * Capability Orchestrator
 * Safe activation and management of 242 discovered capabilities
 * Handles prerequisites, error recovery, and cross-service wiring
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class CapabilityOrchestrator {
  constructor() {
    this.capabilities = new Map();
    this.activated = new Map();
    this.activationLog = [];
    this.prerequisites = new Map();
    this.cycleCount = 0;
    this.successCount = 0;
    this.errorCount = 0;
    this.maxPerCycle = 2;
    this.mode = 'safe'; // safe, moderate, aggressive
    this.enabled = false;
  }

  /**
   * Initialize orchestrator with discovered capabilities
   */
  initialize(discoveredCapabilities) {
    this.capabilities = new Map(discoveredCapabilities);
    console.log(`[CapabilityOrchestrator] Initialized with ${this.capabilities.size} capabilities`);
    return {
      initialized: true,
      capabilityCount: this.capabilities.size,
      engines: this._groupByEngine(discoveredCapabilities)
    };
  }

  /**
   * Enable autonomous capability activation
   */
  enableAutonomous(options = {}) {
    this.enabled = options.enabled !== false;
    this.mode = options.mode || 'safe';
    this.maxPerCycle = options.maxPerCycle || 2;

    const result = {
      enabled: this.enabled,
      mode: this.mode,
      maxPerCycle: this.maxPerCycle,
      status: this.enabled ? 'ACTIVE' : 'DISABLED',
      message: this.enabled 
        ? `Autonomous mode enabled (${this.mode}, max ${this.maxPerCycle}/cycle)`
        : 'Autonomous mode disabled'
    };

    console.log(`[CapabilityOrchestrator] ${result.message}`);
    return result;
  }

  /**
   * Activate a single capability with safety checks
   */
  async activateCapability(capabilityId, options) {
    options = options || {};
    const capability = this.capabilities.get(capabilityId);
    if (!capability) {
      return { success: false, error: 'Capability not found: ' + capabilityId };
    }

    if (this.activated.has(capabilityId)) {
      return { success: true, message: `Already activated: ${capabilityId}` };
    }

    try {
      // Check prerequisites
      const prereqCheck = await this._checkPrerequisites(capabilityId);
      if (!prereqCheck.passed && this.mode === 'safe') {
        this.errorCount++;
        return {
          success: false,
          error: `Prerequisites not met: ${prereqCheck.missing.join(', ')}`
        };
      }

      // Safety validation
      if (!await this._validateSafety(capability)) {
        this.errorCount++;
        return { success: false, error: 'Safety validation failed' };
      }

      // Activate the capability
      const activated = {
        ...capability,
        activatedAt: new Date(),
        cycle: this.cycleCount,
        mode: this.mode,
        status: 'RUNNING'
      };

      this.activated.set(capabilityId, activated);
      this.successCount++;
      
      // Log activation
      this.activationLog.push({
        timestamp: new Date(),
        capabilityId,
        action: 'ACTIVATED',
        mode: this.mode,
        engine: capability.engine
      });

      console.log(`[CapabilityOrchestrator] ✓ Activated: ${capabilityId}`);

      return {
        success: true,
        capabilityId,
        engine: capability.engine,
        methods: capability.methods?.length || 0,
        message: `Successfully activated ${capabilityId}`
      };

    } catch (error) {
      this.errorCount++;
      console.error(`[CapabilityOrchestrator] ✗ Failed: ${capabilityId}`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Run autonomous activation cycle
   * Activates up to maxPerCycle capabilities per cycle
   */
  async runActivationCycle() {
    if (!this.enabled) {
      return { success: false, message: 'Autonomous mode disabled' };
    }

    this.cycleCount++;
    const cycleStart = Date.now();
    const toActivate = Array.from(this.capabilities.keys())
      .filter(id => !this.activated.has(id))
      .slice(0, this.maxPerCycle);

    if (toActivate.length === 0) {
      return {
        success: true,
        cycle: this.cycleCount,
        message: 'All capabilities activated',
        duration: Date.now() - cycleStart
      };
    }

    const results = [];
    for (const capabilityId of toActivate) {
      const result = await this.activateCapability(capabilityId);
      results.push(result);
    }

    return {
      success: true,
      cycle: this.cycleCount,
      activated: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      details: results,
      duration: Date.now() - cycleStart
    };
  }

  /**
   * Get activation status
   */
  getStatus() {
    return {
      enabled: this.enabled,
      mode: this.mode,
      totalDiscovered: this.capabilities.size,
      totalActivated: this.activated.size,
      totalSuccessful: this.successCount,
      totalFailed: this.errorCount,
      cycles: this.cycleCount,
      successRate: this.capabilities.size > 0 
        ? ((this.activated.size / this.capabilities.size) * 100).toFixed(1) + '%'
        : '0%',
      engines: this._getEngineStatus(),
      nextCycleCapabilities: this._getNextCycleCapabilities(5)
    };
  }

  /**
   * Get full capability map with activation status
   */
  getCapabilityMap() {
    const map = {};
    const engines = this._groupByEngine(Array.from(this.capabilities.entries()));

    for (const [engine, caps] of Object.entries(engines)) {
      map[engine] = {
        total: caps.length,
        activated: caps.filter(c => this.activated.has(c.id)).length,
        capabilities: caps.map(c => ({
          id: c.id,
          name: c.name,
          status: this.activated.has(c.id) ? 'ACTIVE' : 'DORMANT',
          methods: c.methods?.length || 0
        }))
      };
    }

    return map;
  }

  /**
   * Deactivate a capability (rollback)
   */
  deactivateCapability(capabilityId) {
    if (!this.activated.has(capabilityId)) {
      return { success: false, message: 'Capability not activated' };
    }

    this.activated.delete(capabilityId);
    this.activationLog.push({
      timestamp: new Date(),
      capabilityId,
      action: 'DEACTIVATED'
    });

    console.log(`[CapabilityOrchestrator] Deactivated: ${capabilityId}`);
    return { success: true, message: `Deactivated ${capabilityId}` };
  }

  /**
   * Check if prerequisites are met
   */
  async _checkPrerequisites(capabilityId) {
    const capability = this.capabilities.get(capabilityId);
    const prereqs = capability.prerequisites || [];
    const missing = [];

    for (const prereq of prereqs) {
      if (!this.activated.has(prereq)) {
        missing.push(prereq);
      }
    }

    return {
      passed: missing.length === 0,
      missing,
      required: prereqs
    };
  }

  /**
   * Validate capability safety
   */
  async _validateSafety(capability) {
    // In safe mode, check for dangerous patterns
    if (this.mode === 'safe') {
      const dangerousPatterns = [
        'DELETE', 'DROP', 'TRUNCATE', // DB operations
        'system(', 'exec(', 'spawn(', // Shell execution
        'eval(', 'Function(', // Code evaluation
      ];

      const capString = JSON.stringify(capability).toUpperCase();
      const hasDangerous = dangerousPatterns.some(p => capString.includes(p));

      if (hasDangerous) {
        console.warn(`[CapabilityOrchestrator] Safety concern in ${capability.id}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Group capabilities by engine
   */
  _groupByEngine(capabilities) {
    const grouped = {};
    for (const [id, cap] of capabilities) {
      const engine = cap.engine || 'unknown';
      if (!grouped[engine]) grouped[engine] = [];
      grouped[engine].push({ id, ...cap });
    }
    return grouped;
  }

  /**
   * Get engine status summary
   */
  _getEngineStatus() {
    const engines = this._groupByEngine(Array.from(this.capabilities.entries()));
    const status = {};

    for (const [engine, caps] of Object.entries(engines)) {
      const activated = caps.filter(c => this.activated.has(c.id)).length;
      status[engine] = {
        total: caps.length,
        activated,
        percentage: ((activated / caps.length) * 100).toFixed(1) + '%'
      };
    }

    return status;
  }

  /**
   * Get next capabilities to activate
   */
  _getNextCycleCapabilities(count) {
    return Array.from(this.capabilities.keys())
      .filter(id => !this.activated.has(id))
      .slice(0, count)
      .map(id => {
        const cap = this.capabilities.get(id);
        return {
          id,
          engine: cap.engine,
          complexity: cap.complexity || 'unknown',
          prerequisites: cap.prerequisites?.length || 0
        };
      });
  }

  /**
   * Export activation log
   */
  exportLog() {
    return {
      cycleCount: this.cycleCount,
      successCount: this.successCount,
      errorCount: this.errorCount,
      log: this.activationLog.slice(-100) // Last 100 entries
    };
  }
}

export default CapabilityOrchestrator;
