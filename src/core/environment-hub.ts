// @version 2.1.28
// EnvironmentHub: Central registry for engine coordination

interface ComponentEntry {
  instance: unknown;
  capabilities: string[];
}

class EnvironmentHub {
  private components: Map<string, ComponentEntry>;

  constructor() {
    this.components = new Map();
  }

  registerComponent(name: string, instance: unknown, capabilities: string[] = []) {
    this.components.set(name, { instance, capabilities });
    console.log(`🔗 Registered component: ${name} (${capabilities.join(', ')})`);
  }

  getComponent(name: string) {
    return this.components.get(name)?.instance;
  }

  listComponents() {
    return Array.from(this.components.entries()).map(([name, { capabilities }]) => ({
      name,
      capabilities,
    }));
  }
}

const environmentHub = new EnvironmentHub();
export default environmentHub;
