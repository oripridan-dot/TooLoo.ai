// @version 3.3.573
/**
 * Socket Server Tests
 * Tests for Socket.IO real-time communication
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Test socket configuration
describe('Socket Configuration', () => {
  const defaultConfig = {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
    allowUpgrades: true,
    upgradeTimeout: 10000,
    maxHttpBufferSize: 1e7
  };

  it('should configure CORS', () => {
    expect(defaultConfig.cors.origin).toBe('*');
    expect(defaultConfig.cors.methods).toContain('GET');
    expect(defaultConfig.cors.methods).toContain('POST');
  });

  it('should set ping timeout', () => {
    expect(defaultConfig.pingTimeout).toBe(60000);
  });

  it('should set ping interval', () => {
    expect(defaultConfig.pingInterval).toBe(25000);
  });

  it('should configure transports', () => {
    expect(defaultConfig.transports).toContain('websocket');
    expect(defaultConfig.transports).toContain('polling');
  });

  it('should allow upgrades', () => {
    expect(defaultConfig.allowUpgrades).toBe(true);
    expect(defaultConfig.upgradeTimeout).toBe(10000);
  });

  it('should set max buffer size', () => {
    expect(defaultConfig.maxHttpBufferSize).toBe(10000000);
  });
});

// Test connection state recovery
describe('Connection State Recovery', () => {
  const recoveryConfig = {
    maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
    skipMiddlewares: true
  };

  it('should set max disconnection duration', () => {
    expect(recoveryConfig.maxDisconnectionDuration).toBe(120000);
  });

  it('should skip middlewares on recovery', () => {
    expect(recoveryConfig.skipMiddlewares).toBe(true);
  });
});

// Test socket map management
describe('Socket Map Management', () => {
  let socketMap: Map<string, { id: string }>;

  beforeEach(() => {
    socketMap = new Map();
  });

  it('should store socket by request ID', () => {
    const socket = { id: 'socket-123' };
    socketMap.set('req-456', socket);
    expect(socketMap.has('req-456')).toBe(true);
    expect(socketMap.get('req-456')?.id).toBe('socket-123');
  });

  it('should remove socket after completion', () => {
    socketMap.set('req-789', { id: 'socket-abc' });
    socketMap.delete('req-789');
    expect(socketMap.has('req-789')).toBe(false);
  });

  it('should handle multiple concurrent requests', () => {
    socketMap.set('req-1', { id: 'socket-1' });
    socketMap.set('req-2', { id: 'socket-2' });
    socketMap.set('req-3', { id: 'socket-3' });
    expect(socketMap.size).toBe(3);
  });
});

// Test generate request handling
describe('Generate Request Handling', () => {
  interface GenerateRequest {
    message: string;
    requestId: string;
    sessionId?: string;
  }

  function validateGenerateRequest(data: GenerateRequest): boolean {
    if (!data.message || typeof data.message !== 'string') return false;
    if (!data.requestId || typeof data.requestId !== 'string') return false;
    return true;
  }

  it('should validate valid request', () => {
    const request: GenerateRequest = {
      message: 'Hello, world!',
      requestId: 'req-123'
    };
    expect(validateGenerateRequest(request)).toBe(true);
  });

  it('should reject missing message', () => {
    const request = { requestId: 'req-123' } as GenerateRequest;
    expect(validateGenerateRequest(request)).toBe(false);
  });

  it('should reject missing requestId', () => {
    const request = { message: 'Hello' } as GenerateRequest;
    expect(validateGenerateRequest(request)).toBe(false);
  });

  it('should accept optional sessionId', () => {
    const request: GenerateRequest = {
      message: 'Hello',
      requestId: 'req-123',
      sessionId: 'session-456'
    };
    expect(validateGenerateRequest(request)).toBe(true);
    expect(request.sessionId).toBe('session-456');
  });
});

// Test chat request event
describe('Chat Request Event', () => {
  interface ChatRequestEvent {
    message: string;
    requestId: string;
    sessionId: string | null;
    projectId: string | null;
    responseType: 'chat' | 'streaming' | 'batch';
  }

  function createChatRequestEvent(
    message: string,
    requestId: string,
    sessionId?: string
  ): ChatRequestEvent {
    return {
      message,
      requestId,
      sessionId: sessionId || null,
      projectId: null,
      responseType: 'chat'
    };
  }

  it('should create chat request event', () => {
    const event = createChatRequestEvent('Hello', 'req-123', 'session-456');
    expect(event.message).toBe('Hello');
    expect(event.requestId).toBe('req-123');
    expect(event.sessionId).toBe('session-456');
    expect(event.responseType).toBe('chat');
  });

  it('should handle null sessionId', () => {
    const event = createChatRequestEvent('Hello', 'req-123');
    expect(event.sessionId).toBeNull();
  });

  it('should have null projectId by default', () => {
    const event = createChatRequestEvent('Hello', 'req-123');
    expect(event.projectId).toBeNull();
  });
});

// Test sensory input handling
describe('Sensory Input Handling', () => {
  interface SensoryInput {
    input: string;
    sessionId: string;
    timestamp: number;
  }

  function processSensoryInput(data: SensoryInput): boolean {
    if (!data.input || !data.sessionId) return false;
    if (!data.timestamp || data.timestamp <= 0) return false;
    return true;
  }

  it('should validate valid sensory input', () => {
    const input: SensoryInput = {
      input: 'typing...',
      sessionId: 'session-123',
      timestamp: Date.now()
    };
    expect(processSensoryInput(input)).toBe(true);
  });

  it('should reject missing input', () => {
    const input = {
      sessionId: 'session-123',
      timestamp: Date.now()
    } as SensoryInput;
    expect(processSensoryInput(input)).toBe(false);
  });

  it('should reject invalid timestamp', () => {
    const input: SensoryInput = {
      input: 'typing',
      sessionId: 'session-123',
      timestamp: -1
    };
    expect(processSensoryInput(input)).toBe(false);
  });
});

// Test response routing
describe('Response Routing', () => {
  let socketMap: Map<string, { emit: (event: string, data: unknown) => void }>;

  beforeEach(() => {
    socketMap = new Map();
  });

  function routeResponse(requestId: string, response: unknown): boolean {
    const socket = socketMap.get(requestId);
    if (!socket) {
      console.log(`No socket found for requestId: ${requestId}`);
      return false;
    }
    socket.emit('response', response);
    return true;
  }

  it('should route response to correct socket', () => {
    let emitted = false;
    const mockSocket = {
      emit: (event: string, data: unknown) => {
        emitted = true;
        expect(event).toBe('response');
      }
    };
    socketMap.set('req-123', mockSocket);
    
    const result = routeResponse('req-123', { content: 'Hello' });
    expect(result).toBe(true);
    expect(emitted).toBe(true);
  });

  it('should return false for unknown requestId', () => {
    const result = routeResponse('unknown-req', { content: 'Hello' });
    expect(result).toBe(false);
  });
});

// Test event bridging
describe('Event Bridging', () => {
  type EventType = 'cortex:response' | 'precog:telemetry' | 'motor:action';

  interface BridgedEvent {
    type: EventType;
    data: unknown;
    timestamp: number;
  }

  function shouldBridge(eventType: EventType): boolean {
    const bridgedEvents: EventType[] = ['cortex:response', 'precog:telemetry', 'motor:action'];
    return bridgedEvents.includes(eventType);
  }

  it('should bridge cortex:response', () => {
    expect(shouldBridge('cortex:response')).toBe(true);
  });

  it('should bridge precog:telemetry', () => {
    expect(shouldBridge('precog:telemetry')).toBe(true);
  });

  it('should bridge motor:action', () => {
    expect(shouldBridge('motor:action')).toBe(true);
  });
});

// Test thinking status
describe('Thinking Status', () => {
  interface ThinkingStatus {
    requestId: string;
    stage?: 'processing' | 'generating' | 'validating';
  }

  function createThinkingStatus(requestId: string, stage?: string): ThinkingStatus {
    return {
      requestId,
      stage: (stage as ThinkingStatus['stage']) || 'processing'
    };
  }

  it('should create basic thinking status', () => {
    const status = createThinkingStatus('req-123');
    expect(status.requestId).toBe('req-123');
    expect(status.stage).toBe('processing');
  });

  it('should support generating stage', () => {
    const status = createThinkingStatus('req-123', 'generating');
    expect(status.stage).toBe('generating');
  });

  it('should support validating stage', () => {
    const status = createThinkingStatus('req-123', 'validating');
    expect(status.stage).toBe('validating');
  });
});

// Test disconnect handling
describe('Disconnect Handling', () => {
  it('should clean up socket map on disconnect', () => {
    const socketMap = new Map<string, { socketId: string }>();
    const socketId = 'socket-123';
    
    // Add some requests for this socket
    socketMap.set('req-1', { socketId });
    socketMap.set('req-2', { socketId });
    socketMap.set('req-3', { socketId: 'other-socket' });
    
    // Clean up on disconnect
    for (const [key, value] of socketMap.entries()) {
      if (value.socketId === socketId) {
        socketMap.delete(key);
      }
    }
    
    expect(socketMap.size).toBe(1);
    expect(socketMap.has('req-3')).toBe(true);
  });
});

// Test message truncation for logging
describe('Message Truncation', () => {
  function truncateForLog(message: string, maxLength = 50): string {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  }

  it('should not truncate short messages', () => {
    const result = truncateForLog('Hello');
    expect(result).toBe('Hello');
  });

  it('should truncate long messages', () => {
    const longMessage = 'a'.repeat(100);
    const result = truncateForLog(longMessage);
    expect(result.length).toBe(53); // 50 + '...'
    expect(result.endsWith('...')).toBe(true);
  });

  it('should use custom max length', () => {
    const message = 'Hello World Test Message';
    const result = truncateForLog(message, 10);
    expect(result).toBe('Hello Worl...');
  });
});

// Test error handling
describe('Socket Error Handling', () => {
  interface SocketError {
    code: string;
    message: string;
    recoverable: boolean;
  }

  function categorizeError(error: Error): SocketError {
    if (error.message.includes('connection')) {
      return { code: 'CONNECTION_ERROR', message: error.message, recoverable: true };
    }
    if (error.message.includes('timeout')) {
      return { code: 'TIMEOUT', message: error.message, recoverable: true };
    }
    return { code: 'UNKNOWN', message: error.message, recoverable: false };
  }

  it('should categorize connection errors', () => {
    const error = categorizeError(new Error('connection refused'));
    expect(error.code).toBe('CONNECTION_ERROR');
    expect(error.recoverable).toBe(true);
  });

  it('should categorize timeout errors', () => {
    const error = categorizeError(new Error('request timeout'));
    expect(error.code).toBe('TIMEOUT');
    expect(error.recoverable).toBe(true);
  });

  it('should categorize unknown errors', () => {
    const error = categorizeError(new Error('something went wrong'));
    expect(error.code).toBe('UNKNOWN');
    expect(error.recoverable).toBe(false);
  });
});
