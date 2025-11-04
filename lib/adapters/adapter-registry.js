/**
 * Adapter Registry - Central registry for all adapters
 * Handles adapter registration, discovery, and lifecycle management
 */

export class AdapterRegistry {
  constructor() {
    this.adapters = new Map();        // name → adapter instance
    this.initialized = new Set();     // names of initialized adapters
    this.connections = new Map();     // name → connection info
  }

  /**
   * Register an adapter
   * @param {BaseAdapter} adapter - Adapter instance to register
   * @throws {Error} If adapter with same name already registered
   */
  register(adapter) {
    if (!adapter || !adapter.name) {
      throw new Error('Invalid adapter: must have name property');
    }
    
    if (this.adapters.has(adapter.name)) {
      throw new Error(`Adapter '${adapter.name}' already registered`);
    }
    
    this.adapters.set(adapter.name, adapter);
    console.log(`[AdapterRegistry] Registered adapter: ${adapter.name}`);
  }

  /**
   * Initialize an adapter with configuration
   * @param {string} name - Adapter name
   * @param {Object} config - Adapter-specific configuration
   * @throws {Error} If adapter not found or initialization fails
   */
  async initialize(name, config) {
    const adapter = this.adapters.get(name);
    if (!adapter) {
      throw new Error(`Unknown adapter: ${name}`);
    }
    
    try {
      await adapter.initialize(config);
      adapter._markReady?.();
      this.initialized.add(name);
      console.log(`[AdapterRegistry] Initialized: ${name}`);
    } catch (err) {
      adapter._recordError?.(err);
      throw err;
    }
  }

  /**
   * Get an adapter instance
   * @param {string} name - Adapter name
   * @returns {BaseAdapter} Adapter instance
   * @throws {Error} If adapter not found
   */
  get(name) {
    const adapter = this.adapters.get(name);
    if (!adapter) {
      throw new Error(`Unknown adapter: ${name}`);
    }
    return adapter;
  }

  /**
   * Check if adapter is registered
   * @param {string} name - Adapter name
   * @returns {boolean} True if registered
   */
  has(name) {
    return this.adapters.has(name);
  }

  /**
   * Check if adapter is initialized
   * @param {string} name - Adapter name
   * @returns {boolean} True if initialized
   */
  isInitialized(name) {
    return this.initialized.has(name);
  }

  /**
   * List all registered adapters
   * @returns {Array<string>} Array of adapter names
   */
  list() {
    return Array.from(this.adapters.keys());
  }

  /**
   * List initialized adapters
   * @returns {Array<string>} Array of initialized adapter names
   */
  listInitialized() {
    return Array.from(this.initialized);
  }

  /**
   * Get adapter status (all adapters)
   * @returns {Promise<Object>} Status map {adapterName -> status}
   */
  async status() {
    const status = {};
    for (const [name, adapter] of this.adapters) {
      status[name] = await adapter.health();
    }
    return status;
  }

  /**
   * Execute action on adapter
   * @param {string} adapterName - Adapter name
   * @param {string} action - Action to execute
   * @param {Object} params - Action parameters
   * @returns {Promise<any>} Action result
   * @throws {Error} If adapter not found or not initialized
   */
  async executeAction(adapterName, action, params) {
    const adapter = this.adapters.get(adapterName);
    if (!adapter) {
      throw new Error(`Unknown adapter: ${adapterName}`);
    }
    
    if (!this.initialized.has(adapterName)) {
      throw new Error(`Adapter '${adapterName}' not initialized`);
    }
    
    try {
      const result = await adapter.executeAction(action, params);
      adapter._clearError?.();
      return result;
    } catch (err) {
      adapter._recordError?.(err);
      throw err;
    }
  }

  /**
   * Clear all adapters (for testing)
   */
  clear() {
    this.adapters.clear();
    this.initialized.clear();
    this.connections.clear();
  }

  /**
   * Get diagnostic info
   * @returns {Object} Registry diagnostics
   */
  info() {
    return {
      registered: this.adapters.size,
      initialized: this.initialized.size,
      adapters: this.list(),
      initializedAdapters: this.listInitialized()
    };
  }
}

// Singleton instance
export const registry = new AdapterRegistry();

export default AdapterRegistry;
