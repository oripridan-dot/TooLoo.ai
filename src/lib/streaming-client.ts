/**
 * StreamingClient
 * JavaScript client for consuming streaming analysis events
 * 
 * Supports both SSE (unidirectional) and WebSocket (bidirectional) connections
 */

export class StreamingClient {
  constructor(endpoint = '/api/v1/analysis/stream') {
    this.endpoint = endpoint;
    this.listeners = new Map();
    this.eventQueue = [];
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  /**
   * Register event listener
   * @param {string} event - Event type (progress, finding, phase, complete, error)
   * @param {function} callback - Callback function
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * Remove event listener
   * @param {string} event - Event type
   * @param {function} callback - Callback function to remove
   */
  off(event, callback) {
    if (!this.listeners.has(event)) return;
    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  /**
   * Start analysis with SSE streaming
   * @param {object} data - Data to analyze
   * @returns {Promise<object>} Final results
   */
  async startAnalysis(data) {
    try {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('connecting', { endpoint: this.endpoint });

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify({ data })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      this.emit('connected', { status: 'connected' });

      return await this.readStream(response);
    } catch (error) {
      this.emit('error', { error: error.message });
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Read streaming response
   * @private
   */
  async readStream(response) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finalResults = null;

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));
              this.handleEvent(event);

              if (event.type === 'complete') {
                finalResults = event.data.results;
              }
            } catch (parseError) {
              console.error('Failed to parse SSE event:', parseError);
            }
          }
        }
      }

      // Process any remaining buffer
      if (buffer.startsWith('data: ')) {
        try {
          const event = JSON.parse(buffer.slice(6));
          this.handleEvent(event);

          if (event.type === 'complete') {
            finalResults = event.data.results;
          }
        } catch (parseError) {
          console.error('Failed to parse final SSE event:', parseError);
        }
      }

      this.emit('disconnected', { status: 'disconnected' });
      this.isConnected = false;

      return finalResults;
    } catch (error) {
      this.emit('error', { error: error.message });
      throw error;
    }
  }

  /**
   * Handle incoming event
   * @private
   */
  handleEvent(event) {
    const { type, data } = event;

    // Store in queue for replay if needed
    this.eventQueue.push({ type, data, timestamp: Date.now() });
    if (this.eventQueue.length > 1000) {
      this.eventQueue.shift();
    }

    // Emit to listeners
    this.emit(type, data);
  }

  /**
   * Emit event to all listeners
   * @private
   */
  emit(event, data) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(cb => {
      try {
        cb(data);
      } catch (error) {
        console.error(`Error in ${event} listener:`, error);
      }
    });
  }

  /**
   * Get event history
   * @param {string} eventType - Optional filter by event type
   * @returns {array} Event history
   */
  getEventHistory(eventType = null) {
    if (!eventType) {
      return this.eventQueue;
    }
    return this.eventQueue.filter(e => e.type === eventType);
  }

  /**
   * Clear event history
   */
  clearHistory() {
    this.eventQueue = [];
  }

  /**
   * Check connection status
   */
  isActive() {
    return this.isConnected;
  }
}

/**
 * WebSocket variant for bidirectional streaming (future)
 */
export class WebSocketStreamingClient extends StreamingClient {
  constructor(endpoint = '/api/v1/analysis/stream-websocket') {
    super(endpoint);
    this.ws = null;
  }

  /**
   * Start analysis with WebSocket
   */
  async startAnalysis(data) {
    return new Promise((resolve, reject) => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsEndpoint = this.endpoint.replace(/^https?:\/\/[^/]+/, `${protocol}//${window.location.host}`);

        this.ws = new WebSocket(wsEndpoint);
        let finalResults = null;

        this.ws.onopen = () => {
          this.isConnected = true;
          this.emit('connected', { status: 'connected' });
          this.ws.send(JSON.stringify({ type: 'start', data }));
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleEvent(message);

            if (message.type === 'complete') {
              finalResults = message.data.results;
              resolve(finalResults);
            }
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onerror = (error) => {
          this.emit('error', { error: error.message || 'WebSocket error' });
          reject(error);
        };

        this.ws.onclose = () => {
          this.isConnected = false;
          this.emit('disconnected', { status: 'disconnected' });
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Send message to server
   */
  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Cancel stream
   */
  cancel(reason = 'User cancelled') {
    this.send({ type: 'cancel', reason });
    if (this.ws) {
      this.ws.close();
    }
  }
}

export default StreamingClient;
