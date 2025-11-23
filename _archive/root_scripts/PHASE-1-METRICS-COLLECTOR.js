#!/usr/bin/env node
/**
 * Phase 1: Metrics Collector
 * 
 * Foundation for strategic improvements:
 * - Collect performance metrics from all services
 * - Track provider utilization patterns
 * - Build baseline for optimization targets
 * - Enable real-time dashboard updates
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const METRICS_DIR = path.join(__dirname, 'metrics-data');

// Ensure metrics directory exists
if (!fs.existsSync(METRICS_DIR)) {
  fs.mkdirSync(METRICS_DIR, { recursive: true });
}

// Service registry for metric collection
const SERVICES = [
  { id: 'training', port: 3001 },
  { id: 'meta', port: 3002 },
  { id: 'budget', port: 3003 },
  { id: 'coach', port: 3004 },
  { id: 'product', port: 3006 },
  { id: 'segmentation', port: 3007 },
  { id: 'reports', port: 3008 },
  { id: 'capabilities', port: 3009 },
  { id: 'orchestration', port: 3100 },
  { id: 'provider', port: 3200 }
];

const PROVIDERS = [
  'anthropic-claude',
  'openai',
  'google-gemini',
  'deepseek',
  'localai'
];

class MetricsCollector {
  constructor() {
    this.metrics = {
      timestamp: new Date().toISOString(),
      services: {},
      providers: {},
      systemHealth: {}
    };
  }

  async collectServiceMetrics() {
    console.log('📊 Collecting service metrics...');
    
    for (const service of SERVICES) {
      try {
        const response = await fetch(`http://127.0.0.1:${service.port}/health`, {
          timeout: 5000
        });
        
        if (response.ok) {
          const health = await response.json();
          this.metrics.services[service.id] = {
            status: 'healthy',
            port: service.port,
            latency: response.headers.get('x-response-time') || 'unknown',
            ...health
          };
        } else {
          this.metrics.services[service.id] = {
            status: 'unhealthy',
            port: service.port,
            code: response.status
          };
        }
      } catch (error) {
        this.metrics.services[service.id] = {
          status: 'unreachable',
          port: service.port,
          error: error.message
        };
      }
    }
  }

  async collectProviderMetrics() {
    console.log('🎲 Collecting provider metrics...');
    
    try {
      const response = await fetch('http://127.0.0.1:3200/api/v1/providers/status', {
        timeout: 5000
      });
      
      if (response.ok) {
        const providers = await response.json();
        this.metrics.providers = providers;
      }
    } catch (error) {
      console.warn('⚠️  Could not fetch provider metrics:', error.message);
    }
  }

  async collectSystemMetrics() {
    console.log('🖥️  Collecting system metrics...');
    
    try {
      const response = await fetch('http://127.0.0.1:3000/api/v1/system/introspect', {
        timeout: 5000
      });
      
      if (response.ok) {
        const system = await response.json();
        this.metrics.systemHealth = system;
      }
    } catch (error) {
      console.warn('⚠️  Could not fetch system metrics:', error.message);
    }
  }

  async generateReport() {
    console.log('📈 Generating metrics report...');
    
    const reportPath = path.join(METRICS_DIR, `metrics-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(this.metrics, null, 2));
    
    // Generate summary
    const summary = {
      timestamp: this.metrics.timestamp,
      services: {
        total: SERVICES.length,
        healthy: Object.values(this.metrics.services).filter(s => s.status === 'healthy').length,
        unhealthy: Object.values(this.metrics.services).filter(s => s.status === 'unhealthy').length,
        unreachable: Object.values(this.metrics.services).filter(s => s.status === 'unreachable').length
      },
      providers: Object.keys(this.metrics.providers || {}).length,
      latencyEstimate: this.estimateLatency(),
      recommendations: this.generateRecommendations()
    };
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 METRICS SNAPSHOT');
    console.log('='.repeat(60));
    console.log(JSON.stringify(summary, null, 2));
    console.log('='.repeat(60));
    console.log(`\n✅ Full metrics saved to: ${reportPath}\n`);
    
    return summary;
  }

  estimateLatency() {
    const latencies = Object.values(this.metrics.services)
      .filter(s => s.latency && s.latency !== 'unknown')
      .map(s => parseInt(s.latency))
      .filter(l => !isNaN(l));
    
    if (latencies.length === 0) return 'unknown';
    const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    return `${Math.round(avg)}ms`;
  }

  generateRecommendations() {
    const recommendations = [];
    
    if (this.metrics.services) {
      const unhealthy = Object.entries(this.metrics.services)
        .filter(([_, s]) => s.status !== 'healthy')
        .map(([id]) => id);
      
      if (unhealthy.length > 0) {
        recommendations.push(`🔧 Restart unhealthy services: ${unhealthy.join(', ')}`);
      }
    }
    
    return recommendations;
  }

  async run() {
    console.log('\n🚀 Starting Phase 1 Metrics Collection\n');
    
    await this.collectServiceMetrics();
    await this.collectProviderMetrics();
    await this.collectSystemMetrics();
    await this.generateReport();
    
    console.log('✨ Metrics collection complete!');
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const collector = new MetricsCollector();
  collector.run().catch(console.error);
}

export default MetricsCollector;
