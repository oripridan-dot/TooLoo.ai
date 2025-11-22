export default class SampleIntegrationPlugin {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.metadata = {
      name: 'sample-integration',
      version: '1.0.0',
      description: 'A sample plugin demonstrating the event bus integration'
    };
  }

  async init() {
    console.log('[SamplePlugin] Initializing...');
    
    this.eventBus.subscribe('plugin:loaded', (data) => {
      console.log(`[SamplePlugin] Detected new plugin: ${data.name}`);
    });

    this.eventBus.subscribe('test:event', (data) => {
      console.log('[SamplePlugin] Received test event:', data);
    });
  }
}
