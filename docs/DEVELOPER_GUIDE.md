# TooLoo.ai Developer Guide

## 🧩 Plugin System

The Plugin System allows you to extend TooLoo.ai's capabilities by adding new services or integrations that hook into the central **Event Bus**.

### Architecture
*   **Event Bus**: A central message hub in `servers/capabilities-server.js`.
*   **Plugin Manager**: Loads, unloads, and manages the lifecycle of plugins.
*   **Plugin Interface**: A standard structure that all plugins must follow.

### Creating a Plugin

1.  **Create a file** in `plugins/` (e.g., `plugins/my-feature.js`).
2.  **Export a class** that implements the plugin interface:

```javascript
export default class MyFeaturePlugin {
  constructor() {
    this.metadata = {
      name: 'my-feature',
      version: '1.0.0',
      description: 'Adds a cool new feature',
      author: 'You'
    };
  }

  /**
   * Called when the plugin is loaded.
   * @param {Object} context - { eventBus, app, config }
   */
  async onLoad(context) {
    this.eventBus = context.eventBus;
    
    // Subscribe to events
    this.eventBus.subscribe('chat:message', this.handleChatMessage.bind(this));
    
    console.log('My Feature Loaded!');
  }

  /**
   * Handle an event.
   */
  async handleChatMessage(payload) {
    console.log('Chat message received:', payload);
    // Do something...
  }

  /**
   * Called when the plugin is unloaded.
   */
  async onUnload() {
    console.log('My Feature Unloaded!');
  }
}
```

3.  **Register the plugin** (currently auto-discovery is in progress, so you may need to manually register it in `servers/capabilities-server.js` or use the API).

### API Endpoints

*   `GET /api/v1/plugins`: List all plugins.
*   `POST /api/v1/plugins/register`: Register a new plugin dynamically.
*   `POST /api/v1/plugins/:name/enable`: Enable a plugin.
*   `POST /api/v1/plugins/:name/disable`: Disable a plugin.

## 🏗️ Service Architecture

TooLoo.ai consists of 12 microservices. When adding a new service:
1.  Create `servers/new-service.js`.
2.  Register it in `servers/orchestrator.js`.
3.  Add it to `package.json` scripts if needed.
4.  Ensure it reports health at `/health`.

## 🧪 Testing

*   Run `npm test` for unit tests.
*   Run `node scripts/qa-monitor.js` for a system health check.
