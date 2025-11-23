import fs from 'fs';
import path from 'path';

const INTEGRATIONS_DIR = path.join(process.cwd(), 'data', 'integrations');

export class IntegrationManager {
  constructor() {
    this.adapters = new Map();
    this.tokens = new Map();
    this.ensureDir();
  }

  ensureDir() {
    if (!fs.existsSync(INTEGRATIONS_DIR)) {
      fs.mkdirSync(INTEGRATIONS_DIR, { recursive: true });
    }
  }

  registerAdapter(name, adapter) {
    this.adapters.set(name, adapter);
  }

  async getAdapter(name) {
    return this.adapters.get(name);
  }

  async saveToken(userId, serviceName, token, metadata = {}) {
    this.ensureDir();
    const tokenPath = path.join(INTEGRATIONS_DIR, `${serviceName}-${userId}.json`);
    const data = { token, metadata, savedAt: new Date().toISOString() };
    await fs.promises.writeFile(tokenPath, JSON.stringify(data, null, 2));
    return { ok: true, serviceName, userId };
  }

  async getToken(userId, serviceName) {
    this.ensureDir();
    const tokenPath = path.join(INTEGRATIONS_DIR, `${serviceName}-${userId}.json`);
    try {
      const data = await fs.promises.readFile(tokenPath, 'utf8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  async listIntegrations(userId) {
    this.ensureDir();
    try {
      const files = await fs.promises.readdir(INTEGRATIONS_DIR);
      const userFiles = files.filter(f => f.endsWith(`-${userId}.json`));
      return userFiles.map(f => {
        const [service] = f.split('-').slice(0, -1);
        return service;
      });
    } catch {
      return [];
    }
  }

  async executeAction(userId, serviceName, action, params = {}) {
    const adapter = this.adapters.get(serviceName);
    if (!adapter) {
      return { ok: false, error: `No adapter for ${serviceName}` };
    }
    const token = await this.getToken(userId, serviceName);
    if (!token) {
      return { ok: false, error: `No token for ${serviceName}` };
    }
    try {
      const result = await adapter.execute(action, params, token);
      return { ok: true, result };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  async revokeToken(userId, serviceName) {
    this.ensureDir();
    const tokenPath = path.join(INTEGRATIONS_DIR, `${serviceName}-${userId}.json`);
    try {
      await fs.promises.unlink(tokenPath);
      return { ok: true, revoked: true };
    } catch {
      return { ok: false, error: 'token not found' };
    }
  }
}

export default new IntegrationManager();
