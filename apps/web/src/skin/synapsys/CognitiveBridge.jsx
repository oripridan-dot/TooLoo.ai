// @version 3.3.588
// TooLoo.ai Cognitive Bridge
// Connects backend orchestration events to the SynapysDNA system
// Makes the UI "react" to the AI's thinking process in real-time

import { useEffect, useCallback, useRef } from 'react';
import { useSocket } from '../../hooks/useSocket';
import { useDNAActions } from './SynapysDNA';

/**
 * Maps intent types to DNA presets
 */
const INTENT_TO_PRESET = {
  code: 'focus',
  creative: 'creative',
  analysis: 'thinking',
  conversation: 'balanced',
  default: 'thinking',
};

/**
 * Maps provider personalities to DNA presets
 */
const PROVIDER_TO_PRESET = {
  anthropic: 'creative',    // Claude is creative/warm
  deepseek: 'focus',        // DeepSeek is precise/analytical
  openai: 'balanced',       // GPT is balanced
  gemini: 'immersive',      // Gemini is multi-modal/immersive
  ollama: 'zen',            // Local is calm/efficient
};

/**
 * CognitiveBridge - Logic-only component that bridges backend events to UI DNA
 * 
 * This component:
 * 1. Listens to orchestration events from the backend
 * 2. Maps cognitive states to visual DNA presets
 * 3. Triggers smooth transitions to reflect AI state changes
 * 
 * @returns {null} - Renders nothing, pure logic component
 */
export const CognitiveBridge = () => {
  const { getSocket, connectionState } = useSocket();
  const { transitionTo, setIntensityDial, override, applyPreset } = useDNAActions();
  const lastStateRef = useRef({ preset: 'balanced', intensity: 1 });

  /**
   * Handle orchestration start - intent detection
   */
  const handleOrchestrationStart = useCallback((data) => {
    // Immediate spike in energy - "I heard you"
    setIntensityDial(1.5);
    
    // Determine preset based on intent
    const intentType = data?.context?.intent?.type || data?.intent?.type || 'default';
    const preset = INTENT_TO_PRESET[intentType] || INTENT_TO_PRESET.default;
    
    // Fast transition to thinking mode
    transitionTo(preset, 300);
    lastStateRef.current = { preset, intensity: 1.5 };
  }, [setIntensityDial, transitionTo]);

  /**
   * Handle skill routing - which agent/skill was selected
   */
  const handleOrchestrationRouted = useCallback((data) => {
    // Show confidence through intensity
    const confidence = data?.result?.confidence || data?.confidence || 0.8;
    setIntensityDial(0.8 + (confidence * 0.4)); // 0.8-1.2 based on confidence
    
    // Optional: Adjust color based on skill category
    const skillCategory = data?.result?.skill?.category || data?.skill?.category;
    if (skillCategory === 'code') {
      override({ colors: { primary: 200 } }); // Blue for code
    } else if (skillCategory === 'creative') {
      override({ colors: { primary: 300 } }); // Purple for creative
    }
  }, [setIntensityDial, override]);

  /**
   * Handle provider selection - adjust mood based on AI personality
   */
  const handleProviderSelected = useCallback((data) => {
    const providerId = data?.selection?.providerId || data?.providerId;
    const preset = PROVIDER_TO_PRESET[providerId];
    
    if (preset) {
      transitionTo(preset, 500);
      lastStateRef.current.preset = preset;
    }
  }, [transitionTo]);

  /**
   * Handle execution start - AI is actively working
   */
  const handleExecutionStart = useCallback(() => {
    // Increase breath rate to show activity
    override({
      presence: { breathRate: 0.9, pulseStrength: 0.6 },
      motion: { speed: 1.2 },
    });
  }, [override]);

  /**
   * Handle orchestration complete - return to calm
   */
  const handleOrchestrationComplete = useCallback((data) => {
    const success = data?.success !== false;
    
    if (success) {
      // Brief emergence celebration
      transitionTo('emergence', 400);
      
      // Then settle back to balanced after 2 seconds
      setTimeout(() => {
        transitionTo('balanced', 1000);
        setIntensityDial(1.0);
      }, 2000);
    } else {
      // Alert state for errors
      transitionTo('alert', 300);
      
      // Return to balanced after error acknowledgment
      setTimeout(() => {
        transitionTo('balanced', 800);
      }, 3000);
    }
    
    lastStateRef.current = { preset: 'balanced', intensity: 1 };
  }, [transitionTo, setIntensityDial]);

  /**
   * Handle synapsys state events - direct DNA control from backend
   */
  const handleSynapsysState = useCallback((data) => {
    if (data.dnaPreset && typeof data.dnaPreset === 'string') {
      transitionTo(data.dnaPreset, data.transitionDuration || 500);
    }
    
    if (data.visuals) {
      override(data.visuals);
    }
  }, [transitionTo, override]);

  /**
   * Handle streaming tokens - subtle visual feedback
   */
  const handleStreamToken = useCallback(() => {
    // Micro-pulse on each token for "thinking" feedback
    // This is intentionally subtle - just a slight intensity bump
    const current = lastStateRef.current.intensity;
    setIntensityDial(current + 0.05);
    
    // Return to baseline quickly
    setTimeout(() => {
      setIntensityDial(current);
    }, 100);
  }, [setIntensityDial]);

  // Set up event listeners
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // Initial state - balanced when connected
    if (connectionState === 'connected') {
      transitionTo('balanced', 800);
    }

    // Orchestration lifecycle events
    socket.on('orchestration:start', handleOrchestrationStart);
    socket.on('orchestration:routed', handleOrchestrationRouted);
    socket.on('orchestration:provider_selected', handleProviderSelected);
    socket.on('orchestration:executing', handleExecutionStart);
    socket.on('orchestration:complete', handleOrchestrationComplete);
    
    // Direct DNA control events
    socket.on('synapsys:state', handleSynapsysState);
    socket.on('synapsys:visualization', handleSynapsysState);
    
    // Streaming feedback
    socket.on('chat:token', handleStreamToken);
    socket.on('stream:token', handleStreamToken);

    // Cleanup
    return () => {
      socket.off('orchestration:start', handleOrchestrationStart);
      socket.off('orchestration:routed', handleOrchestrationRouted);
      socket.off('orchestration:provider_selected', handleProviderSelected);
      socket.off('orchestration:executing', handleExecutionStart);
      socket.off('orchestration:complete', handleOrchestrationComplete);
      socket.off('synapsys:state', handleSynapsysState);
      socket.off('synapsys:visualization', handleSynapsysState);
      socket.off('chat:token', handleStreamToken);
      socket.off('stream:token', handleStreamToken);
    };
  }, [
    getSocket,
    connectionState,
    transitionTo,
    handleOrchestrationStart,
    handleOrchestrationRouted,
    handleProviderSelected,
    handleExecutionStart,
    handleOrchestrationComplete,
    handleSynapsysState,
    handleStreamToken,
  ]);

  // This is a logic-only component - renders nothing
  return null;
};

export default CognitiveBridge;
