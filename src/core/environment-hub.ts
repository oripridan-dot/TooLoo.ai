// @version 2.1.29
// EnvironmentHub: Central registry for engine coordination
// Integrated into main system to track AI engines and their capabilities

interface ComponentEntry {
  instance: unknown;
  capabilities: string[];
  registeredAt: number;
}

class EnvironmentHub {
  private components: Map<string, ComponentEntry>;

  constructor() {
    this.components = new Map();
  }

  registerComponent(name: string, instance: unknown, capabilities: string[] = []) {
    this.components.set(name, {
      instance,
      capabilities,
      registeredAt: Date.now(),
    });
    console.log(`🔗 Registered component: ${name} (${capabilities.join(', ')})`);
  }

  getComponent<T = unknown>(name: string): T | undefined {
    return this.components.get(name)?.instance as T | undefined;
  }

  hasComponent(name: string): boolean {
    return this.components.has(name);
  }

  listComponents() {
    return Array.from(this.components.entries()).map(([name, { capabilities, registeredAt }]) => ({
      name,
      capabilities,
      registeredAt,
    }));
  }

  getCapabilities(name: string): string[] {
    return this.components.get(name)?.capabilities ?? [];
  }

  findByCapability(capability: string): string[] {
    return Array.from(this.components.entries())
      .filter(([, entry]) => entry.capabilities.includes(capability))
      .map(([name]) => name);
  }
}

const environmentHub = new EnvironmentHub();
export default environmentHub;
export { EnvironmentHub };
