/**
 * Base Adapter Class - Abstract foundation for all adapters
 * Provides common interface for OAuth, Design, Integrations, and custom adapters
 */

export class BaseAdapter {
  /**
   * Create a new adapter
   * @param {string} name - Adapter name (e.g., 'oauth', 'design', 'integrations')
   * @param {Object} config - Configuration object specific to the adapter
   */
  constructor(name, config = {}) {
    this.name = name;
    this.config = config;
    this.isInitialized = false;
    this.lastError = null;
    this.lastUpdate = null;
    
    // Metadata about adapter capabilities
    this.metadata = {
      capabilities: [],    // ['authenticate', 'refresh-token', etc]
      scopes: [],         // Required permissions/scopes
      authentication: 'none', // 'none', 'api-key', 'oauth2', 'bearer'
      version: '1.0.0',
      author: 'TooLoo.ai',
      description: `${name} adapter`
    };
  }

  /**
   * Initialize the adapter with configuration
   * Must be implemented by subclasses
   * @param {Object} config - Adapter-specific configuration
   * @throws {Error} If not implemented
   */
  async initialize(config) {
    throw new Error(`${this.name}.initialize() must be implemented by subclass`);
  }

  /**
   * Connect to the external service
   * Must be implemented by subclasses
   * @throws {Error} If not implemented
   */
  async connect() {
    throw new Error(`${this.name}.connect() must be implemented by subclass`);
  }

  /**
   * Authenticate with external service
   * Must be implemented by subclasses
   * @param {Object} credentials - Authentication credentials
   * @throws {Error} If not implemented
   */
  async authenticate(credentials) {
    throw new Error(`${this.name}.authenticate() must be implemented by subclass`);
  }

  /**
   * Execute an action through the adapter
   * Must be implemented by subclasses
   * @param {string} action - Action to execute
   * @param {Object} params - Parameters for the action
   * @throws {Error} If not implemented
   */
  async executeAction(action, params) {
    throw new Error(`${this.name}.executeAction(${action}) must be implemented by subclass`);
  }

  /**
   * List available capabilities
   * @returns {Promise<Array>} Array of capability names
   */
  async listCapabilities() {
    return this.metadata.capabilities || [];
  }

  /**
   * Get adapter health status
   * @returns {Promise<Object>} Health information
   */
  async health() {
    return {
      name: this.name,
      status: this.isInitialized ? 'ready' : 'not-initialized',
      initialized: this.isInitialized,
      lastError: this.lastError,
      lastUpdate: this.lastUpdate,
      capabilities: this.metadata.capabilities.length,
      authentication: this.metadata.authentication
    };
  }

  /**
   * Validate adapter configuration
   * Override in subclasses to perform specific validation
   * @throws {Error} If configuration is invalid
   */
  validateConfig() {
    // Base implementation does nothing
    // Subclasses override to validate required config
  }

  /**
   * Mark adapter as ready
   * @protected
   */
  _markReady() {
    this.isInitialized = true;
    this.lastUpdate = new Date().toISOString();
  }

  /**
   * Record an error
   * @protected
   */
  _recordError(error) {
    this.lastError = error instanceof Error ? error.message : String(error);
    this.lastUpdate = new Date().toISOString();
  }

  /**
   * Clear error state
   * @protected
   */
  _clearError() {
    this.lastError = null;
    this.lastUpdate = new Date().toISOString();
  }
}

export default BaseAdapter;
