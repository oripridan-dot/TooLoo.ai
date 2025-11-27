#!/usr/bin/env node
// @version 2.1.28

/**
 * TooLoo.ai Alert Engine
 * Extends orchestrator with rule-based alerting and auto-remediation
 *
 * Routes:
 * POST /api/v1/system/alerts/rules - Add/update alert rule
 * GET  /api/v1/system/alerts/rules - List all rules
 * DELETE /api/v1/system/alerts/rules/:id - Remove rule
 * GET  /api/v1/system/alerts/status - Current alert status
 * POST /api/v1/system/alerts/trigger - Manual trigger (testing)
 */

import express from "express";
import fetch from "node-fetch";
import crypto from "crypto";

// Alert rule engine - stores and evaluates alert thresholds
class AlertEngine {
  constructor() {
    this.rules = new Map();
    this.history = [];
    this.activeAlerts = new Map();
    this.remediationInProgress = new Set();
  }

  /**
   * Register an alert rule
   */
  addRule(rule) {
    if (!rule.id) {
      rule.id = crypto.randomUUID();
    }

    // Validate rule structure
    if (!rule.metric || !rule.operator || rule.threshold === undefined) {
      throw new Error("Rule must have: metric, operator, threshold");
    }

    this.rules.set(rule.id, {
      ...rule,
      createdAt: new Date().toISOString(),
      enabled: rule.enabled !== false,
    });

    console.log(
      `✅ Alert rule added: ${rule.id} (${rule.metric} ${rule.operator} ${rule.threshold})`,
    );
    return rule.id;
  }

  /**
   * Remove a rule
   */
  removeRule(ruleId) {
    return this.rules.delete(ruleId);
  }

  /**
   * Get all rules
   */
  getRules() {
    return Array.from(this.rules.values());
  }

  /**
   * Evaluate a metric against all rules
   */
  evaluateRules(metric, value) {
    const triggered = [];

    this.rules.forEach((rule) => {
      if (!rule.enabled) return;

      let matches = false;
      switch (rule.operator) {
        case ">":
          matches = value > rule.threshold;
          break;
        case "<":
          matches = value < rule.threshold;
          break;
        case ">=":
          matches = value >= rule.threshold;
          break;
        case "<=":
          matches = value <= rule.threshold;
          break;
        case "==":
          matches = value === rule.threshold;
          break;
        case "!=":
          matches = value !== rule.threshold;
          break;
      }

      if (matches) {
        triggered.push(rule);
      }
    });

    return triggered;
  }

  /**
   * Trigger alert
   */
  triggerAlert(metric, value, rules) {
    const alertId = crypto.randomUUID();
    const alert = {
      id: alertId,
      metric: metric,
      value: value,
      rules: rules.map((r) => r.id),
      severity: rules[0]?.severity || "warning",
      action: rules[0]?.action,
      timestamp: new Date().toISOString(),
      status: "active",
    };

    this.activeAlerts.set(alertId, alert);
    this.history.push(alert);

    // Keep history reasonable
    if (this.history.length > 1000) {
      this.history.shift();
    }

    console.log(
      `🚨 Alert triggered: ${metric}=${value} (severity: ${alert.severity})`,
    );
    return alert;
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId) {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.status = "resolved";
      alert.resolvedAt = new Date().toISOString();
      this.activeAlerts.delete(alertId);
    }
  }

  /**
   * Get active alerts
   */
  getActiveAlerts() {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Get alert history
   */
  getHistory(limit = 50) {
    return this.history.slice(-limit);
  }
}

// ============================================================================
// AUTO-REMEDIATION ENGINE
// ============================================================================

class RemediationEngine {
  constructor() {
    this.actions = new Map();
    this.setupDefaultActions();
  }

  setupDefaultActions() {
    // Default remediation actions
    this.registerAction("restart-service", async (params) => {
      const { serviceId } = params;
      console.log(`🔄 Restarting service: ${serviceId}`);

      try {
        const response = await fetch(
          `http://127.0.0.1:3000/api/v1/system/service/${serviceId}/restart`,
          {
            method: "POST",
          },
        );
        return response.ok;
      } catch (error) {
        console.error(`Failed to restart ${serviceId}:`, error);
        return false;
      }
    });

    this.registerAction("switch-provider", async (params) => {
      const { newProvider } = params;
      console.log(`🔄 Switching provider to: ${newProvider}`);

      try {
        const response = await fetch(
          "http://127.0.0.1:3003/api/v1/providers/switch",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ provider: newProvider }),
          },
        );
        return response.ok;
      } catch (error) {
        console.error("Failed to switch provider:", error);
        return false;
      }
    });

    this.registerAction("scale-up", async (params) => {
      const { serviceId, instances } = params;
      console.log(`📈 Scaling ${serviceId} to ${instances} instances`);

      try {
        const response = await fetch(
          `http://127.0.0.1:3000/api/v1/system/service/${serviceId}/scale`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ instances }),
          },
        );
        return response.ok;
      } catch (error) {
        console.error(`Failed to scale ${serviceId}:`, error);
        return false;
      }
    });

    this.registerAction("notify", async (params) => {
      const { message, channel } = params;
      console.log(`📢 Notification: ${message}`);
      // Could integrate with Slack, Discord, etc.
      return true;
    });
  }

  registerAction(name, handler) {
    this.actions.set(name, handler);
  }

  async executeAction(actionName, params) {
    const handler = this.actions.get(actionName);
    if (!handler) {
      throw new Error(`Unknown action: ${actionName}`);
    }
    return await handler(params);
  }
}

// ============================================================================
// EXPRESS APP
// ============================================================================

const app = express();
app.use(express.json());

// Engines
const alertEngine = new AlertEngine();
const remediationEngine = new RemediationEngine();

// Load default rules (can be customized)
setupDefaultRules();

function setupDefaultRules() {
  // High response time alert
  alertEngine.addRule({
    id: "rule-response-time",
    metric: "service.responseTime",
    operator: ">",
    threshold: 5000, // 5 seconds
    severity: "warning",
    action: "restart-service",
    actionParams: { serviceId: "unknown" }, // Set dynamically
    description: "Alert when service response time exceeds 5s",
  });

  // Service offline
  alertEngine.addRule({
    id: "rule-offline",
    metric: "service.health",
    operator: "==",
    threshold: "offline",
    severity: "critical",
    action: "restart-service",
    actionParams: { serviceId: "unknown" },
    description: "Alert when service goes offline",
  });

  // Low provider success rate
  alertEngine.addRule({
    id: "rule-provider-rate",
    metric: "provider.successRate",
    operator: "<",
    threshold: 0.7, // 70%
    severity: "warning",
    action: "switch-provider",
    actionParams: { newProvider: "fallback" },
    description: "Switch provider if success rate drops below 70%",
  });
}

// ============================================================================
// ROUTES
// ============================================================================

/**
 * Add/update alert rule
 */
app.post("/api/v1/system/alerts/rules", (req, res) => {
  try {
    const rule = req.body;
    const ruleId = alertEngine.addRule(rule);
    res.json({ ok: true, id: ruleId });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * List all rules
 */
app.get("/api/v1/system/alerts/rules", (req, res) => {
  res.json({
    rules: alertEngine.getRules(),
    total: alertEngine.rules.size,
  });
});

/**
 * Delete rule
 */
app.delete("/api/v1/system/alerts/rules/:id", (req, res) => {
  const { id } = req.params;
  const deleted = alertEngine.removeRule(id);
  res.json({ ok: deleted });
});

/**
 * Get current alert status
 */
app.get("/api/v1/system/alerts/status", (req, res) => {
  res.json({
    active: alertEngine.getActiveAlerts(),
    history: alertEngine.getHistory(req.query.limit || 20),
    totalActive: alertEngine.activeAlerts.size,
    totalHistory: alertEngine.history.length,
  });
});

/**
 * Manual alert trigger (for testing)
 */
app.post("/api/v1/system/alerts/trigger", async (req, res) => {
  try {
    const { metric, value } = req.body;

    if (!metric || value === undefined) {
      return res.status(400).json({
        error: "Required: metric, value",
      });
    }

    const matchedRules = alertEngine.evaluateRules(metric, value);

    if (matchedRules.length > 0) {
      const alert = alertEngine.triggerAlert(metric, value, matchedRules);

      // Execute remediation if defined
      const rule = matchedRules[0];
      if (rule.action) {
        const actionParams = {
          ...rule.actionParams,
          alertId: alert.id,
        };

        try {
          const success = await remediationEngine.executeAction(
            rule.action,
            actionParams,
          );
          alert.remediationAttempted = true;
          alert.remediationSuccess = success;
        } catch (error) {
          console.error("Remediation error:", error);
          alert.remediationError = error.message;
        }
      }

      res.json({ ok: true, alert: alert });
    } else {
      res.json({ ok: true, message: "No rules triggered" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Health endpoint
 */
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "alert-engine",
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// EXPORT FOR INTEGRATION
// ============================================================================

export { alertEngine, remediationEngine, AlertEngine, RemediationEngine };
export default app;
