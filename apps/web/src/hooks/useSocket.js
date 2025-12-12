/**
 * useSocket.js
 * React hook for Socket.IO connection to V2 API
 *
 * @version 2.0.0-alpha.0
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { getSocketUrl } from '../utils/api.js';

const SOCKET_URL = getSocketUrl();

/**
 * Socket connection state
 */
export const ConnectionState = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  ERROR: 'error',
};

/**
 * Hook for managing Socket.IO connection
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

  const socketRef = useRef(null);
  const [connectionState, setConnectionState] = useState(ConnectionState.DISCONNECTED);
  const [systemStatus, setSystemStatus] = useState(null);

  // Initialize socket connection
  useEffect(() => {
    if (!autoConnect) return;

    setConnectionState(ConnectionState.CONNECTING);

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnectionState(ConnectionState.CONNECTED);
      onConnect?.();

      // Request initial system status
      socket.emit('system:ping');
    });

    socket.on('disconnect', reason => {
      setConnectionState(ConnectionState.DISCONNECTED);
      onDisconnect?.(reason);
    });

    socket.on('connect_error', error => {
      setConnectionState(ConnectionState.ERROR);
      onError?.(error);
    });

    socket.on('system:status', status => {
      setSystemStatus(status);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [autoConnect, onConnect, onDisconnect, onError]);

  // Get current socket instance
  const getSocket = useCallback(() => socketRef.current, []);

  // Manually connect
  const connect = useCallback(() => {
    if (socketRef.current && !socketRef.current.connected) {
      socketRef.current.connect();
    }
  }, []);

  // Manually disconnect
  const disconnect = useCallback(() => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.disconnect();
    }
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
 *
 * @param {Object} options
 * @param {boolean} options.stream - Enable streaming mode (default: true)
 * @returns {Object} Chat state and methods
 */
export function useChat(options = {}) {
  const { stream = true } = options;

  const { socket, isConnected, emit, on } = useSocket();
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [matchedSkill, setMatchedSkill] = useState(null);
  const [error, setError] = useState(null);

  // Handle chat responses
  useEffect(() => {
    if (!isConnected) return;

    // Full response (non-streaming)
    const unsubResponse = on('chat:response', data => {
      setMessages(prev => [
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
      setIsStreaming(false);
      setMatchedSkill(data.skill);
    });

    // Streaming chunks
    const unsubStream = on('chat:stream', data => {
      if (data.done) {
        // Stream complete - finalize message
        setMessages(prev => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg && lastMsg.streaming) {
            return [
              ...prev.slice(0, -1),
              { ...lastMsg, streaming: false, content: currentResponse + data.chunk },
            ];
          }
          return prev;
        });
        setIsStreaming(false);
        setCurrentResponse('');
      } else {
        // Append chunk
        setCurrentResponse(prev => prev + data.chunk);
        setMessages(prev => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg && lastMsg.streaming) {
            return [...prev.slice(0, -1), { ...lastMsg, content: currentResponse + data.chunk }];
          }
          return prev;
        });
      }
    });

    // Skill matched
    const unsubSkill = on('skill:matched', data => {
      setMatchedSkill(data);
    });

    // Error
    const unsubError = on('chat:error', data => {
      setError(data);
      setIsStreaming(false);
    });

    return () => {
      unsubResponse();
      unsubStream();
      unsubSkill();
      unsubError();
    };
  }, [isConnected, on, currentResponse]);

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
      setMessages(prev => [...prev, userMessage]);

      // If streaming, add placeholder for response
      if (stream) {
        setMessages(prev => [
          ...prev,
          {
            id: `msg_${Date.now()}_response`,
            role: 'assistant',
            content: '',
            streaming: true,
            timestamp: new Date(),
          },
        ]);
        setIsStreaming(true);
        setCurrentResponse('');
      }

      // Emit message
      emit('chat:message', {
        message: content.trim(),
        stream,
        ...context,
      });

      setError(null);
    },
    [isConnected, emit, stream]
  );

  // Cancel streaming
  const cancelStream = useCallback(() => {
    emit('chat:cancel', {});
    setIsStreaming(false);
  }, [emit]);

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
    setMatchedSkill(null);
  }, []);

  return {
    messages,
    isStreaming,
    matchedSkill,
    error,
    isConnected,
    sendMessage,
    cancelStream,
    clearMessages,
  };
}

export default useSocket;
