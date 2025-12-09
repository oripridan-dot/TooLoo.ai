// @version 3.3.484
/**
 * Canvas Socket Bridge
 * 
 * Connects the Living Canvas to backend events via Socket.IO.
 * Maps AI cognitive states and events to canvas emotions.
 * 
 * @module skin/canvas/CanvasSocketBridge
 */

import { useEffect } from 'react';
import { useCanvasStore } from '../store/canvasStateStore';

// ============================================================================
// STATE TO EMOTION MAPPING
// ============================================================================

const STATE_EMOTION_MAP = {
  // Processing states
  'idle': 'resting',
  'listening': 'attentive',
  'thinking': 'thinking',
  'processing': 'thinking',
  'generating': 'creating',
  'streaming': 'creating',
  'analyzing': 'thinking',
  
  // Outcome states
  'success': 'accomplished',
  'complete': 'accomplished',
  'done': 'accomplished',
  'error': 'error',
  'failed': 'error',
  
  // Emotional states
  'excited': 'excited',
  'creative': 'creating',
  'learning': 'attentive',
  'emergence': 'excited',
};

// Map presence states from TooLooPresence
const PRESENCE_EMOTION_MAP = {
  'resting': 'resting',
  'attentive': 'attentive',
  'listening': 'attentive',
  'thinking': 'thinking',
  'creating': 'creating',
  'excited': 'excited',
  'accomplished': 'accomplished',
};

// ============================================================================
// SOCKET BRIDGE HOOK
// ============================================================================

export function useCanvasSocketBridge(socket) {
  const setEmotion = useCanvasStore((s) => s.setEmotion);
  
  useEffect(() => {
    if (!socket) return;
    
    // Handler for synapsys state updates
    const handleSynapsysState = (data) => {
      const state = data?.state || data?.cognitiveState || data?.presenceState;
      if (state && STATE_EMOTION_MAP[state]) {
        setEmotion(STATE_EMOTION_MAP[state]);
      }
    };
    
    // Handler for presence state changes
    const handlePresenceChange = (data) => {
      const state = data?.state || data?.presence;
      if (state && PRESENCE_EMOTION_MAP[state]) {
        setEmotion(PRESENCE_EMOTION_MAP[state]);
      }
    };
    
    // Handler for thinking/processing updates
    const handleThinkingUpdate = (data) => {
      if (data?.stage === 'complete' || data?.stage === 'done') {
        setEmotion('accomplished');
      } else if (data?.stage === 'error') {
        setEmotion('error');
      } else {
        setEmotion('thinking');
      }
    };
    
    // Handler for streaming state
    const handleStreamStart = () => setEmotion('creating');
    const handleStreamEnd = () => setEmotion('accomplished');
    
    // Handler for emergence detection
    const handleEmergence = () => setEmotion('excited');
    
    // Handler for error events
    const handleError = () => setEmotion('error');
    
    // Handler for chat completion
    const handleChatComplete = () => {
      setEmotion('accomplished');
      // Return to resting after a delay
      setTimeout(() => setEmotion('resting'), 3000);
    };
    
    // Handler for user input (resonating)
    const handleUserTyping = () => setEmotion('resonating');
    
    // Subscribe to events
    socket.on('synapsys:state', handleSynapsysState);
    socket.on('synapsys:event', handleSynapsysState);
    socket.on('presence:change', handlePresenceChange);
    socket.on('thinking:update', handleThinkingUpdate);
    socket.on('stream:start', handleStreamStart);
    socket.on('stream:end', handleStreamEnd);
    socket.on('stream:complete', handleChatComplete);
    socket.on('emergence:detected', handleEmergence);
    socket.on('error', handleError);
    socket.on('chat:complete', handleChatComplete);
    socket.on('user:typing', handleUserTyping);
    
    // Wildcard handler for unmapped events
    socket.onAny((event, data) => {
      // Auto-detect emotion from event names
      if (event.includes('thinking') || event.includes('processing')) {
        setEmotion('thinking');
      } else if (event.includes('creating') || event.includes('generating')) {
        setEmotion('creating');
      } else if (event.includes('complete') || event.includes('success')) {
        setEmotion('accomplished');
      } else if (event.includes('error') || event.includes('failed')) {
        setEmotion('error');
      }
    });
    
    return () => {
      socket.off('synapsys:state', handleSynapsysState);
      socket.off('synapsys:event', handleSynapsysState);
      socket.off('presence:change', handlePresenceChange);
      socket.off('thinking:update', handleThinkingUpdate);
      socket.off('stream:start', handleStreamStart);
      socket.off('stream:end', handleStreamEnd);
      socket.off('stream:complete', handleChatComplete);
      socket.off('emergence:detected', handleEmergence);
      socket.off('error', handleError);
      socket.off('chat:complete', handleChatComplete);
      socket.off('user:typing', handleUserTyping);
      socket.offAny();
    };
  }, [socket, setEmotion]);
}

// ============================================================================
// COMPONENT WRAPPER
// ============================================================================

export default function CanvasSocketBridge({ socket, children }) {
  useCanvasSocketBridge(socket);
  return children || null;
}
