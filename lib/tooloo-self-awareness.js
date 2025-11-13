/**
 * TooLoo Self-Awareness System
 * Enables TooLoo to understand its own state, architecture, and capabilities
 * Supports introspection, code analysis, and system health monitoring
 */

import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';

export class ToolooSelfAwareness {
  constructor(projectRoot = process.cwd()) {
    this.projectRoot = projectRoot;
    this.state = {
      timestamp: Date.now(),
      services: {},
      architecture: null,
      capabilities: [],
      health: {}
    };
  }

  /**
   * Get complete system awareness report
   */
  async getSystemStatus() {
    return {
      timestamp: new Date().toISOString(),
      services: await this.checkServices(),
      architecture: await this.analyzeArchitecture(),
      running: await this.getRunningProcesses(),
      health: await this.checkSystemHealth(),
      version: await this.getVersion()
    };
  }

  /**
   * Check status of all microservices
   */
  async checkServices() {
    const ports = {
      'web-server': 3000,
      'learning-service': 3001,
      'context-service': 3020,
      'orchestration-service': 3100,
      'provider-service': 3200,
      'analytics-service': 3300,
      'integration-service': 3400
    };

    const services = {};
    
    for (const [name, port] of Object.entries(ports)) {
      try {
        const response = await fetch(`http://127.0.0.1:${port}/health`, { timeout: 2000 });
        services[name] = {
          port,
          status: response.ok ? 'healthy' : 'unhealthy',
          statusCode: response.status,
          lastCheck: new Date().toISOString()
        };
      } catch (error) {
        services[name] = {
          port,
          status: 'down',
          error: error.message,
          lastCheck: new Date().toISOString()
        };
      }
    }

    return services;
  }

  /**
   * Analyze project architecture
   */
  async analyzeArchitecture() {
    try {
      const structure = {
        root: this.projectRoot,
        servers: await this.listDirectory('servers'),
        services: await this.listDirectory('services'),
        lib: await this.listDirectory('lib'),
        providersArena: await this.listDirectory('providers-arena/src'),
        webApp: await this.listDirectory('web-app')
      };

      return {
        type: 'microservices',
        components: structure,
        totalFiles: Object.values(structure).reduce((acc, val) => acc + (Array.isArray(val) ? val.length : 0), 0)
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * List directory contents
   */
  async listDirectory(dirPath) {
    try {
      const fullPath = path.join(this.projectRoot, dirPath);
      const files = await fs.readdir(fullPath);
      return files.filter(f => !f.startsWith('.'));
    } catch (error) {
      return [];
    }
  }

  /**
   * Get list of running Node processes
   */
  async getRunningProcesses() {
    try {
      const result = await new Promise((resolve, reject) => {
        const ps = spawn('ps', ['aux']);
        let output = '';
        
        ps.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        ps.on('close', (code) => {
          const lines = output.split('\n').filter(line => 
            line.includes('node') && line.includes('servers')
          );
          resolve(lines.map(line => {
            const parts = line.split(/\s+/);
            return {
              pid: parts[1],
              memory: parts[5],
              command: parts.slice(10).join(' ')
            };
          }));
        });

        ps.on('error', reject);
      });

      return result;
    } catch (error) {
      return [];
    }
  }

  /**
   * Check overall system health
   */
  async checkSystemHealth() {
    const services = await this.checkServices();
    const healthyCount = Object.values(services).filter(s => s.status === 'healthy').length;
    const totalCount = Object.keys(services).length;

    return {
      healthyServices: healthyCount,
      totalServices: totalCount,
      healthPercentage: Math.round((healthyCount / totalCount) * 100),
      status: healthyCount === totalCount ? 'excellent' : healthyCount > totalCount / 2 ? 'degraded' : 'critical',
      services
    };
  }

  /**
   * Get project version and info
   */
  async getVersion() {
    try {
      const packageJson = JSON.parse(
        await fs.readFile(path.join(this.projectRoot, 'package.json'), 'utf8')
      );
      return {
        name: packageJson.name,
        version: packageJson.version,
        description: packageJson.description
      };
    } catch (error) {
      return { error: 'Could not read package.json' };
    }
  }

  /**
   * Get AI provider capabilities
   */
  async getProviderCapabilities() {
    return {
      providers: ['Claude', 'GPT-4', 'Gemini', 'DeepSeek', 'Ollama (local)'],
      defaultModel: 'Claude Haiku 4.5',
      capabilities: [
        'Multi-provider aggregation',
        'Consensus extraction',
        'Quality scoring',
        'Response comparison',
        'Cost tracking'
      ],
      failureHandling: 'Automatic fallback to available providers'
    };
  }

  /**
   * Understand self-modification capabilities
   */
  getCapabilities() {
    return {
      selfAwareness: {
        systemIntrospection: true,
        architectureAnalysis: true,
        healthMonitoring: true,
        processTracking: true
      },
      selfModification: {
        codeEditing: true,
        fileCreation: true,
        fileModification: true,
        fileDelimitation: true,
        repositoryManagement: true
      },
      gitHubIntegration: {
        branchManagement: true,
        commitAuthoring: true,
        prCreation: true,
        repositorySync: true
      },
      bugFixing: {
        errorDetection: true,
        automaticHealing: true,
        testExecution: true,
        rollbackCapability: true
      }
    };
  }

  /**
   * Generate self-awareness report
   */
  async generateFullReport() {
    const report = {
      timestamp: new Date().toISOString(),
      system: await this.getSystemStatus(),
      capabilities: this.getCapabilities(),
      providers: await this.getProviderCapabilities(),
      readiness: {
        canModifyCode: true,
        canManageGit: true,
        canFixBugs: true,
        canCreateFeatures: true,
        selfHealingEnabled: true
      }
    };

    return report;
  }

  /**
   * Check if specific capability is available
   */
  async isCapableOf(capability) {
    const caps = this.getCapabilities();
    const parts = capability.split('.');
    let current = caps;
    
    for (const part of parts) {
      current = current[part];
      if (current === undefined) return false;
    }
    
    return current === true;
  }
}

export default ToolooSelfAwareness;
