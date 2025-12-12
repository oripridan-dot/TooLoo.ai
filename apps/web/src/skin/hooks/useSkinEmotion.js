// @version 2.2.466
// TooLoo.ai Skin Emotion Hook
// Bridges app state to liquid engine emotional expression

import { useEffect, useCallback } from 'react';
import { useLiquidEngine, EMOTIONS } from '../effects/LiquidEngine';

/**
 * Map common app states to TooLoo emotional states
 */
const STATE_TO_EMOTION = {
  // Processing states
  idle: 'neutral',
  loading: 'thinking',
  processing: 'processing',
  streaming: 'creative',
  
  // Outcome states
  success: 'success',
  error: 'error',
  warning: 'alert',
  
  // Activity states
  typing: 'curious',
  waiting: 'calm',
  active: 'excited',
  
  // Focus states
  focused: 'thinking',
  exploring: 'creative',
};

/**
 * Hook to control TooLoo's emotional expression from any component
 * 
 * @example
 * const { setAppState, setEmotionDirect, currentEmotion, EMOTIONS } = useSkinEmotion();
 * 
 * // Set by app state (recommended)
 * setAppState('processing');
 * setAppState('success');
 * 
 * // Or set emotion directly
 * setEmotionDirect('excited');
 */
export const useSkinEmotion = () => {
  const { 
    enabled, 
    emotion: currentEmotion, 
    transitionEmotion, 
    setEmotionIntensity,
    emotionIntensity,
    getEmotionValues 
  } = useLiquidEngine();

  /**
   * Set emotion based on app state
   * @param {string} state - One of: idle, loading, processing, streaming, success, error, warning, typing, waiting, active, focused, exploring
   * @param {number} duration - Transition duration in ms (default: 500)
   */
  const setAppState = useCallback((state, duration = 500) => {
    const targetEmotion = STATE_TO_EMOTION[state] || 'neutral';
    if (transitionEmotion) {
      transitionEmotion(targetEmotion, duration);
    }
  }, [transitionEmotion]);

  /**
   * Set emotion directly
   * @param {string} emotion - One of: neutral, thinking, excited, calm, alert, creative, processing, success, error
   * @param {number} duration - Transition duration in ms (default: 500)
   */
  const setEmotionDirect = useCallback((emotion, duration = 500) => {
    if (EMOTIONS[emotion] && transitionEmotion) {
      transitionEmotion(emotion, duration);
    } else {
      console.warn(`[useSkinEmotion] Unknown emotion: ${emotion}`);
    }
  }, [transitionEmotion]);

  /**
   * Temporarily flash an emotion then return to previous
   * @param {string} emotion - Emotion to flash
   * @param {number} flashDuration - How long to show the flash (default: 800ms)
   */
  const flashEmotion = useCallback((emotion, flashDuration = 800) => {
    const previousEmotion = currentEmotion;
    setEmotionDirect(emotion, 200);
    
    setTimeout(() => {
      setEmotionDirect(previousEmotion || 'neutral', 300);
    }, flashDuration);
  }, [currentEmotion, setEmotionDirect]);

  /**
   * Set emotional intensity (0-1)
   * Higher intensity = more pronounced visual effects
   */
  const setIntensity = useCallback((value) => {
    if (setEmotionIntensity) {
      setEmotionIntensity(Math.max(0, Math.min(1, value)));
    }
  }, [setEmotionIntensity]);

  return {
    // State setters
    setAppState,
    setEmotionDirect,
    flashEmotion,
    setIntensity,
    
    // Current state
    currentEmotion,
    emotionIntensity,
    emotionValues: getEmotionValues?.() || EMOTIONS.neutral,
    isEnabled: enabled,
    
    // Reference
    EMOTIONS,
    STATE_TO_EMOTION,
  };
};

/**
 * Hook to auto-sync processing state to emotions
 * Use in components that have isProcessing or loading state
 * 
 * @example
 * useProcessingEmotion(isLoading, isError);
 */
export const useProcessingEmotion = (isProcessing, isError = false, isSuccess = false) => {
  const { setAppState, flashEmotion } = useSkinEmotion();

  useEffect(() => {
    if (isError) {
      flashEmotion('error');
    } else if (isSuccess) {
      flashEmotion('success');
    } else if (isProcessing) {
      setAppState('processing');
    } else {
      setAppState('idle');
    }
  }, [isProcessing, isError, isSuccess, setAppState, flashEmotion]);
};

/**
 * Hook to sync chat/conversation state to emotions
 * 
 * @example
 * useChatEmotion(isStreaming, hasNewMessage, isUserTyping);
 */
export const useChatEmotion = (isStreaming, hasNewMessage = false, isUserTyping = false) => {
  const { setAppState, flashEmotion } = useSkinEmotion();

  useEffect(() => {
    if (isStreaming) {
      setAppState('streaming');
    } else if (hasNewMessage) {
      flashEmotion('excited', 600);
    } else if (isUserTyping) {
      setAppState('waiting');
    } else {
      setAppState('idle');
    }
  }, [isStreaming, hasNewMessage, isUserTyping, setAppState, flashEmotion]);
};

export default useSkinEmotion;
