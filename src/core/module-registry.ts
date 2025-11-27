import { EventEmitter } from "events";

export interface SystemModule {
  name: string;
  version: string; // The module's internal version or system version
  status: "booting" | "ready" | "degraded" | "error";
  meta?: Record<string, any>;
  healthCheck?: () => Promise<boolean>;
}

class ModuleRegistry extends EventEmitter {
  private modules: Map<string, SystemModule> = new Map();

  register(module: SystemModule) {
    this.modules.set(module.name, module);
    this.emit("module:registered", module);
    console.log(
      `[Registry] Module registered: ${module.name} v${module.version} [${module.status}]`,
    );
  }

  updateStatus(
    name: string,
    status: SystemModule["status"],
    meta?: Record<string, any>,
  ) {
    const mod = this.modules.get(name);
    if (mod) {
      mod.status = status;
      if (meta) {
        mod.meta = { ...mod.meta, ...meta };
      }
      this.modules.set(name, mod);
      this.emit("module:status_change", { name, status, meta });
    }
  }

  get(name: string) {
    return this.modules.get(name);
  }

  getAll() {
    return Array.from(this.modules.values()).map((m) => ({
      ...m,
      uptime: process.uptime(), // Simplified for now
    }));
  }
}

export const registry = new ModuleRegistry();
