// EnvironmentHub: Central registry for engine coordination
class EnvironmentHub {
  constructor() {
    this.components = new Map();
  }
  registerComponent(name, instance, capabilities = []) {
    this.components.set(name, { instance, capabilities });
    console.log(`🔗 Registered component: ${name} (${capabilities.join(', ')})`);
  }
  getComponent(name) {
    return this.components.get(name)?.instance;
  }
  listComponents() {
    return Array.from(this.components.entries()).map(([name, { capabilities }]) => ({ name, capabilities }));
  }
}

const environmentHub = new EnvironmentHub();
export default environmentHub;
