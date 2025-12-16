/**
 * useSocket.js
 * React hook for Socket.IO connection to V2 API
 *
 * @version 2.1.0 - Added shared chat state for real-time sync
 */

import { useEffect, useRef, useState, useCallback, createContext, useContext } from 'react';
import { io } from 'socket.io-client';
import { getSocketUrl } from '../utils/api.js';

const SOCKET_URL = getSocketUrl();

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED CHAT STATE (for real-time sync between components)
// ═══════════════════════════════════════════════════════════════════════════════

// Global shared state for chat (module-level singleton)
const sharedChatState = {
  messages: [],
  isStreaming: false,
  matchedSkill: null,
  error: null,
  listeners: new Set(),
  currentResponseRef: '',
  
  // Notify all listeners of state change
  notify() {
    this.listeners.forEach(listener => listener({
      messages: [...this.messages],
      isStreaming: this.isStreaming,
      matchedSkill: this.matchedSkill,
      error: this.error,
    }));
  },
  
  // Subscribe to state changes
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  },
  
  // Update messages
  setMessages(updater) {
    if (typeof updater === 'function') {
      this.messages = updater(this.messages);
    } else {
      this.messages = updater;
    }
    this.notify();
  },
  
  // Update streaming state
  setIsStreaming(value) {
    this.isStreaming = value;
    this.notify();
  },
  
  // Update matched skill
  setMatchedSkill(value) {
    this.matchedSkill = value;
    this.notify();
  },
  
  // Update error
  setError(value) {
    this.error = value;
    this.notify();
  },
  
  // Clear all state
  clear() {
    this.messages = [];
    this.isStreaming = false;
    this.matchedSkill = null;
    this.error = null;
    this.currentResponseRef = '';
    this.notify();
  }
};

/**
 * Socket connection state
 */
export const ConnectionState = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  ERROR: 'error',
};

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON SOCKET (prevents multiple connections)
// ═══════════════════════════════════════════════════════════════════════════════

let globalSocket = null;
let globalConnectionState = ConnectionState.DISCONNECTED;
const socketListeners = new Set();

function notifySocketListeners() {
  socketListeners.forEach(listener => listener(globalConnectionState));
}

function getOrCreateSocket() {
  if (globalSocket && globalSocket.connected) {
    return globalSocket;
  }
  
  if (globalSocket) {
    // Socket exists but disconnected - let it reconnect
    return globalSocket;
  }

  globalConnectionState = ConnectionState.CONNECTING;
  notifySocketListeners();

  globalSocket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 10000,
    timeout: 20000,
  });

  globalSocket.on('connect', () => {
    globalConnectionState = ConnectionState.CONNECTED;
    notifySocketListeners();
  });

  globalSocket.on('disconnect', () => {
    globalConnectionState = ConnectionState.DISCONNECTED;
    notifySocketListeners();
  });

  globalSocket.on('connect_error', () => {
    globalConnectionState = ConnectionState.ERROR;
    notifySocketListeners();
  });

  return globalSocket;
}

/**
 * Hook for managing Socket.IO connection (uses singleton)
 *
 * @param {Object} options
 * @param {boolean} options.autoConnect - Auto-connect on mount (default: true)
 * @param {function} options.onConnect - Callback when connected
 * @param {function} options.onDisconnect - Callback when disconnected
 * @param {function} options.onError - Callback on error
 * @returns {Object} Socket state and methods
 */
export function useSocket(options = {}) {
  const { autoConnect = true, onConnect, onDisconnect, onError } = options;

  const [connectionState, setConnectionState] = useState(globalConnectionState);
  const [systemStatus, setSystemStatus] = useState(null);
  const socketRef = useRef(null);

  // Subscribe to connection state changes
  useEffect(() => {
    const listener = (state) => setConnectionState(state);
    socketListeners.add(listener);
    return () => socketListeners.delete(listener);
  }, []);

  // Initialize socket connection
  useEffect(() => {
    if (!autoConnect) return;

    const socket = getOrCreateSocket();
    socketRef.current = socket;

    // Set initial state
    setConnectionState(globalConnectionState);

    const handleConnect = () => {
      onConnect?.();
      socket.emit('system:ping');
    };

    const handleDisconnect = (reason) => {
      onDisconnect?.(reason);
    };

    const handleError = (error) => {
      onError?.(error);
    };

    const handleStatus = (status) => {
      setSystemStatus(status);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleError);
    socket.on('system:status', handleStatus);

    // If already connected, trigger connect callback
    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleError);
      socket.off('system:status', handleStatus);
      // Don't disconnect - singleton stays alive
    };
  }, [autoConnect, onConnect, onDisconnect, onError]);

  // Get current socket instance
  const getSocket = useCallback(() => socketRef.current, []);

  // Manually connect
  const connect = useCallback(() => {
    const socket = getOrCreateSocket();
    socketRef.current = socket;
  }, []);

  // Manually disconnect (not recommended - use sparingly)
  const disconnect = useCallback(() => {
    // Don't actually disconnect singleton - just mark as disconnected
    console.warn('Disconnect called on singleton socket - ignoring');
  }, []);

  // Emit event
  const emit = useCallback((event, data) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit(event, data);
    }
  }, []);

  // Subscribe to event
  const on = useCallback((event, handler) => {
    if (socketRef.current) {
      socketRef.current.on(event, handler);
      return () => socketRef.current?.off(event, handler);
    }
    return () => {};
  }, []);

  return {
    socket: socketRef.current,
    connectionState,
    systemStatus,
    isConnected: connectionState === ConnectionState.CONNECTED,
    getSocket,
    connect,
    disconnect,
    emit,
    on,
  };
}

/**
 * Hook for chat functionality via Socket.IO
 * Uses shared state for real-time sync between components
 *
 * @param {Object} options
 * @param {boolean} options.stream - Enable streaming mode (default: true)
 * @returns {Object} Chat state and methods
 */
export function useChat(options = {}) {
  const { stream = true } = options;

  const { socket, isConnected, emit, on } = useSocket();
  
  // Local state that syncs with shared state
  const [state, setState] = useState({
    messages: sharedChatState.messages,
    isStreaming: sharedChatState.isStreaming,
    matchedSkill: sharedChatState.matchedSkill,
    error: sharedChatState.error,
  });

  // Subscribe to shared state changes
  useEffect(() => {
    const unsubscribe = sharedChatState.subscribe(newState => {
      setState(newState);
    });
    return unsubscribe;
  }, []);

  // Handle chat responses
  useEffect(() => {
    if (!isConnected) return;

    // Full response (non-streaming)
    const unsubResponse = on('chat:response', data => {
      sharedChatState.setMessages(prev => [
        ...prev,
        {
          id: data.messageId,
          role: 'assistant',
          content: data.content,
          skill: data.skill,
          usage: data.usage,
          timestamp: new Date(),
        },
      ]);
      sharedChatState.setIsStreaming(false);
      sharedChatState.setMatchedSkill(data.skill);
    });

    // Streaming chunks
    const unsubStream = on('chat:stream', data => {
      if (data.done) {
        // Stream complete - finalize message
        const finalContent = sharedChatState.currentResponseRef + (data.chunk || '');
        sharedChatState.setMessages(prev => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg && lastMsg.streaming) {
            return [
              ...prev.slice(0, -1),
              { ...lastMsg, streaming: false, content: finalContent },
            ];
          }
          return prev;
        });
        sharedChatState.setIsStreaming(false);
        sharedChatState.currentResponseRef = '';
      } else {
        // Append chunk
        sharedChatState.currentResponseRef += data.chunk || '';
        const content = sharedChatState.currentResponseRef;
        sharedChatState.setMessages(prev => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg && lastMsg.streaming) {
            return [...prev.slice(0, -1), { ...lastMsg, content }];
          }
          return prev;
        });
      }
    });

    // Skill matched
    const unsubSkill = on('skill:matched', data => {
      sharedChatState.setMatchedSkill(data);
    });

    // Error
    const unsubError = on('chat:error', data => {
      sharedChatState.setError(data);
      sharedChatState.setIsStreaming(false);
    });

    return () => {
      unsubResponse();
      unsubStream();
      unsubSkill();
      unsubError();
    };
  }, [isConnected, on]);

  // Send message
  const sendMessage = useCallback(
    (content, context = {}) => {
      if (!isConnected || !content.trim()) return;

      // Add user message
      const userMessage = {
        id: `msg_${Date.now()}`,
        role: 'user',
        content: content.trim(),
        timestamp: new Date(),
      };
      sharedChatState.setMessages(prev => [...prev, userMessage]);

      // If streaming, add placeholder for response
      if (stream) {
        sharedChatState.setMessages(prev => [
          ...prev,
          {
            id: `msg_${Date.now()}_response`,
            role: 'assistant',
            content: '',
            streaming: true,
            timestamp: new Date(),
          },
        ]);
        sharedChatState.setIsStreaming(true);
        sharedChatState.currentResponseRef = ''; // Reset for new stream
      }

      // Emit message
      emit('chat:message', {
        message: content.trim(),
        stream,
        ...context,
      });

      sharedChatState.setError(null);
    },
    [isConnected, emit, stream]
  );

  // Cancel streaming
  const cancelStream = useCallback(() => {
    emit('chat:cancel', {});
    sharedChatState.setIsStreaming(false);
  }, [emit]);

  // Clear messages
  const clearMessages = useCallback(() => {
    sharedChatState.clear();
  }, []);

  return {
    messages: state.messages,
    isStreaming: state.isStreaming,
    matchedSkill: state.matchedSkill,
    error: state.error,
    isConnected,
    sendMessage,
    cancelStream,
    clearMessages,
  };
}

export default useSocket;
