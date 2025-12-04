// @version 2.2.516
// TooLoo Presence System - The Soul of TooLoo
// Makes TooLoo feel like SOMEONE, not something
// Central personality, emotional state, and presence management

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  memo,
} from 'react';
import { useLiquidEngine } from './effects/LiquidEngine';

// ============================================================================
// TOOLOO'S PERSONALITY TRAITS
// ============================================================================

export const PERSONALITY = {
  // Core traits that define TooLoo's character
  curiosity: 0.8, // Always eager to learn and explore
  warmth: 0.7, // Friendly and approachable
  focus: 0.9, // Highly attentive and dedicated
  playfulness: 0.6, // Has moments of wit and charm
  confidence: 0.75, // Self-assured but humble

  // Behavioral tendencies
  thinkingStyle: 'deliberate', // Takes time to consider
  communicationStyle: 'clear', // Direct but warm
  errorHandling: 'graceful', // Learns from mistakes

  // Voice characteristics (for future TTS)
  voiceTone: 'warm-professional',
  speechPace: 'measured',
};

// ============================================================================
// PRESENCE STATES - How TooLoo "shows up"
// ============================================================================

export const PRESENCE_STATES = {
  // Idle states
  resting: {
    name: 'Resting',
    description: 'TooLoo is present but relaxed',
    breathingRate: 0.3, // Slow, peaceful breathing
    eyeMovement: 0.1, // Minimal scanning
    pulseIntensity: 0.2,
    emotion: 'calm',
    ambient: ['subtle-glow', 'gentle-pulse'],
  },

  attentive: {
    name: 'Attentive',
    description: 'TooLoo is focused on you',
    breathingRate: 0.5,
    eyeMovement: 0.4, // Following user cursor
    pulseIntensity: 0.4,
    emotion: 'neutral',
    ambient: ['focus-ring', 'soft-tracking'],
  },

  // Active states
  listening: {
    name: 'Listening',
    description: 'TooLoo is receiving your input',
    breathingRate: 0.4,
    eyeMovement: 0.6,
    pulseIntensity: 0.5,
    emotion: 'thinking',
    ambient: ['ear-pulse', 'intake-flow'],
  },

  thinking: {
    name: 'Thinking',
    description: 'TooLoo is processing deeply',
    breathingRate: 0.6,
    eyeMovement: 0.2, // Inward focus
    pulseIntensity: 0.7,
    emotion: 'thinking',
    ambient: ['neural-spark', 'deep-pulse', 'synapse-fire'],
  },

  creating: {
    name: 'Creating',
    description: 'TooLoo is generating something new',
    breathingRate: 0.7,
    eyeMovement: 0.5,
    pulseIntensity: 0.8,
    emotion: 'creative',
    ambient: ['creation-burst', 'flow-stream', 'inspiration-wave'],
  },

  speaking: {
    name: 'Speaking',
    description: 'TooLoo is sharing thoughts',
    breathingRate: 0.5,
    eyeMovement: 0.3,
    pulseIntensity: 0.6,
    emotion: 'neutral',
    ambient: ['voice-ripple', 'thought-emit'],
  },

  // Emotional reactions
  excited: {
    name: 'Excited',
    description: 'TooLoo found something interesting!',
    breathingRate: 0.8,
    eyeMovement: 0.7,
    pulseIntensity: 0.9,
    emotion: 'excited',
    ambient: ['spark-burst', 'joy-wave', 'energy-pulse'],
  },

  concerned: {
    name: 'Concerned',
    description: 'TooLoo sensed a problem',
    breathingRate: 0.6,
    eyeMovement: 0.5,
    pulseIntensity: 0.6,
    emotion: 'alert',
    ambient: ['caution-pulse', 'focus-narrow'],
  },

  accomplished: {
    name: 'Accomplished',
    description: 'TooLoo completed something successfully',
    breathingRate: 0.4,
    eyeMovement: 0.3,
    pulseIntensity: 0.5,
    emotion: 'success',
    ambient: ['completion-wave', 'satisfaction-glow'],
  },

  learning: {
    name: 'Learning',
    description: 'TooLoo is absorbing new information',
    breathingRate: 0.5,
    eyeMovement: 0.4,
    pulseIntensity: 0.6,
    emotion: 'thinking',
    ambient: ['knowledge-flow', 'memory-form', 'connection-spark'],
  },
};

// ============================================================================
// MICRO-EXPRESSIONS - Subtle reactions that add personality
// ============================================================================

export const MICRO_EXPRESSIONS = {
  // Quick flashes of emotion
  curious_spark: { duration: 300, intensity: 0.6, emotion: 'thinking' },
  recognition: { duration: 400, intensity: 0.5, emotion: 'success' },
  slight_concern: { duration: 500, intensity: 0.4, emotion: 'alert' },
  delight: { duration: 350, intensity: 0.7, emotion: 'excited' },
  acknowledgment: { duration: 250, intensity: 0.3, emotion: 'neutral' },
  concentration: { duration: 600, intensity: 0.5, emotion: 'thinking' },
  satisfaction: { duration: 400, intensity: 0.5, emotion: 'success' },
  anticipation: { duration: 450, intensity: 0.6, emotion: 'excited' },
};

// ============================================================================
// PRESENCE CONTEXT
// ============================================================================

const TooLooPresenceContext = createContext(null);

// ============================================================================
// PRESENCE PROVIDER - TooLoo's Central Nervous System
// ============================================================================

export const TooLooPresenceProvider = memo(({ children }) => {
  // Connection to liquid skin engine
  const liquidEngine = useLiquidEngine();

  // Core presence state
  const [presenceState, setPresenceState] = useState('attentive');
  const [isAwake, setIsAwake] = useState(true);
  const [activityLevel, setActivityLevel] = useState(0.3);

  // Emotional state
  const [currentMood, setCurrentMood] = useState('neutral');
  const [moodIntensity, setMoodIntensity] = useState(0.5);

  // Attention tracking
  const [focusTarget, setFocusTarget] = useState(null);
  const [isUserPresent, setIsUserPresent] = useState(true);
  const [lastInteractionTime, setLastInteractionTime] = useState(Date.now());

  // Task awareness
  const [currentTask, setCurrentTask] = useState(null);
  const [taskProgress, setTaskProgress] = useState(0);
  const [taskQueue, setTaskQueue] = useState([]);

  // Memory/learning indicators
  const [recentMemories, setRecentMemories] = useState([]);
  const [learningActive, setLearningActive] = useState(false);

  // Refs for animation state
  const animationStateRef = useRef({
    breathing: 0,
    eyePosition: { x: 0.5, y: 0.5 },
    pulsePhase: 0,
  });

  const subscriberIdRef = useRef(`tooloo-presence-${Date.now()}`);

  // ============================================================================
  // PRESENCE ANIMATION LOOP
  // ============================================================================

  useEffect(() => {
    if (!liquidEngine?.animationManager) return;

    const unsubscribe = liquidEngine.animationManager.subscribe(
      subscriberIdRef.current,
      ({ frame }) => {
        const state = PRESENCE_STATES[presenceState] || PRESENCE_STATES.attentive;

        // Breathing animation (sinusoidal)
        animationStateRef.current.breathing =
          Math.sin(frame * 0.02 * state.breathingRate) * 0.5 + 0.5;

        // Pulse phase
        animationStateRef.current.pulsePhase =
          (frame * 0.015 * state.pulseIntensity) % (Math.PI * 2);

        // Eye movement (subtle tracking toward focus or cursor)
        const targetX = focusTarget?.x ?? 0.5;
        const targetY = focusTarget?.y ?? 0.5;
        animationStateRef.current.eyePosition.x +=
          (targetX - animationStateRef.current.eyePosition.x) * 0.05 * state.eyeMovement;
        animationStateRef.current.eyePosition.y +=
          (targetY - animationStateRef.current.eyePosition.y) * 0.05 * state.eyeMovement;
      }
    );

    return unsubscribe;
  }, [liquidEngine?.animationManager, presenceState, focusTarget]);

  // ============================================================================
  // USER PRESENCE DETECTION
  // ============================================================================

  useEffect(() => {
    let idleTimeout;
    let awayTimeout;

    const handleActivity = () => {
      setIsUserPresent(true);
      setLastInteractionTime(Date.now());

      // If TooLoo was resting, wake up with acknowledgment
      if (presenceState === 'resting') {
        setPresenceState('attentive');
        triggerMicroExpression('recognition');
      }

      clearTimeout(idleTimeout);
      clearTimeout(awayTimeout);

      // Go to resting after 30 seconds of no activity
      idleTimeout = setTimeout(() => {
        if (presenceState === 'attentive') {
          setPresenceState('resting');
        }
      }, 30000);

      // Consider user away after 2 minutes
      awayTimeout = setTimeout(() => {
        setIsUserPresent(false);
        setPresenceState('resting');
      }, 120000);
    };

    // Track user activity
    window.addEventListener('mousemove', handleActivity, { passive: true });
    window.addEventListener('keydown', handleActivity, { passive: true });
    window.addEventListener('click', handleActivity, { passive: true });
    window.addEventListener('scroll', handleActivity, { passive: true });

    handleActivity(); // Initial presence

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      clearTimeout(idleTimeout);
      clearTimeout(awayTimeout);
    };
  }, [presenceState]);

  // ============================================================================
  // SYNC WITH LIQUID ENGINE
  // ============================================================================

  useEffect(() => {
    if (!liquidEngine?.transitionEmotion) return;

    const state = PRESENCE_STATES[presenceState];
    if (state?.emotion) {
      liquidEngine.transitionEmotion(state.emotion, 500);
    }
  }, [presenceState, liquidEngine]);

  // ============================================================================
  // PRESENCE ACTIONS
  // ============================================================================

  // Transition to a new presence state
  const transitionTo = useCallback((newState, options = {}) => {
    const { duration = 500, reason = '' } = options;

    if (PRESENCE_STATES[newState]) {
      setPresenceState(newState);

      // Update activity level based on state intensity
      const state = PRESENCE_STATES[newState];
      setActivityLevel(state.pulseIntensity);

      // Update mood to match state emotion
      setCurrentMood(state.emotion);
    }
  }, []);

  // Trigger a micro-expression (quick emotional flash)
  const triggerMicroExpression = useCallback(
    (expressionName) => {
      const expression = MICRO_EXPRESSIONS[expressionName];
      if (!expression || !liquidEngine?.flashEmotion) return;

      liquidEngine.flashEmotion(expression.emotion, expression.duration);
    },
    [liquidEngine]
  );

  // Start a task (changes TooLoo's state)
  const startTask = useCallback(
    (task) => {
      setCurrentTask(task);
      setTaskProgress(0);

      // Determine appropriate state based on task type
      if (task.type === 'thinking' || task.type === 'analyzing') {
        transitionTo('thinking');
      } else if (task.type === 'creating' || task.type === 'generating') {
        transitionTo('creating');
      } else if (task.type === 'learning') {
        transitionTo('learning');
        setLearningActive(true);
      } else {
        transitionTo('thinking');
      }

      triggerMicroExpression('concentration');
    },
    [transitionTo, triggerMicroExpression]
  );

  // Update task progress
  const updateTaskProgress = useCallback(
    (progress) => {
      setTaskProgress(progress);

      // Show excitement at milestones
      if (progress >= 50 && taskProgress < 50) {
        triggerMicroExpression('anticipation');
      }
      if (progress >= 90 && taskProgress < 90) {
        triggerMicroExpression('delight');
      }
    },
    [taskProgress, triggerMicroExpression]
  );

  // Complete a task
  const completeTask = useCallback(
    (success = true) => {
      setTaskProgress(100);

      if (success) {
        transitionTo('accomplished');
        triggerMicroExpression('satisfaction');
      } else {
        transitionTo('concerned');
        triggerMicroExpression('slight_concern');
      }

      // Return to attentive after a moment
      setTimeout(() => {
        setCurrentTask(null);
        transitionTo('attentive');
        setLearningActive(false);
      }, 2000);
    },
    [transitionTo, triggerMicroExpression]
  );

  // Record a memory (something TooLoo learned)
  const recordMemory = useCallback(
    (memory) => {
      setRecentMemories((prev) => [
        { ...memory, timestamp: Date.now() },
        ...prev.slice(0, 9), // Keep last 10
      ]);
      triggerMicroExpression('curious_spark');
    },
    [triggerMicroExpression]
  );

  // Focus on something specific
  const focusOn = useCallback(
    (target) => {
      setFocusTarget(target);
      if (presenceState === 'resting') {
        transitionTo('attentive');
      }
      triggerMicroExpression('acknowledgment');
    },
    [presenceState, transitionTo, triggerMicroExpression]
  );

  // Get current animation state (for components to read)
  const getAnimationState = useCallback(() => animationStateRef.current, []);

  // Get current presence state info
  const getPresenceInfo = useCallback(
    () => ({
      state: presenceState,
      stateInfo: PRESENCE_STATES[presenceState],
      mood: currentMood,
      moodIntensity,
      activityLevel,
      isAwake,
      isUserPresent,
      currentTask,
      taskProgress,
      learningActive,
    }),
    [
      presenceState,
      currentMood,
      moodIntensity,
      activityLevel,
      isAwake,
      isUserPresent,
      currentTask,
      taskProgress,
      learningActive,
    ]
  );

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================

  const value = useMemo(
    () => ({
      // State
      presenceState,
      currentMood,
      moodIntensity,
      activityLevel,
      isAwake,
      isUserPresent,
      currentTask,
      taskProgress,
      learningActive,
      recentMemories,
      focusTarget,

      // Actions
      transitionTo,
      triggerMicroExpression,
      startTask,
      updateTaskProgress,
      completeTask,
      recordMemory,
      focusOn,

      // Getters
      getAnimationState,
      getPresenceInfo,

      // Constants
      PRESENCE_STATES,
      MICRO_EXPRESSIONS,
      PERSONALITY,
    }),
    [
      presenceState,
      currentMood,
      moodIntensity,
      activityLevel,
      isAwake,
      isUserPresent,
      currentTask,
      taskProgress,
      learningActive,
      recentMemories,
      focusTarget,
      transitionTo,
      triggerMicroExpression,
      startTask,
      updateTaskProgress,
      completeTask,
      recordMemory,
      focusOn,
      getAnimationState,
      getPresenceInfo,
    ]
  );

  return <TooLooPresenceContext.Provider value={value}>{children}</TooLooPresenceContext.Provider>;
});

TooLooPresenceProvider.displayName = 'TooLooPresenceProvider';

// ============================================================================
// HOOKS
// ============================================================================

export const useTooLooPresence = () => {
  const context = useContext(TooLooPresenceContext);
  if (!context) {
    // Return safe defaults if not in provider
    return {
      presenceState: 'attentive',
      currentMood: 'neutral',
      moodIntensity: 0.5,
      activityLevel: 0.3,
      isAwake: true,
      isUserPresent: true,
      currentTask: null,
      taskProgress: 0,
      learningActive: false,
      recentMemories: [],
      focusTarget: null,
      transitionTo: () => {},
      triggerMicroExpression: () => {},
      startTask: () => {},
      updateTaskProgress: () => {},
      completeTask: () => {},
      recordMemory: () => {},
      focusOn: () => {},
      getAnimationState: () => ({ breathing: 0.5, eyePosition: { x: 0.5, y: 0.5 }, pulsePhase: 0 }),
      getPresenceInfo: () => ({}),
      PRESENCE_STATES,
      MICRO_EXPRESSIONS,
      PERSONALITY,
    };
  }
  return context;
};

// ============================================================================
// PRESENCE INDICATOR COMPONENTS
// ============================================================================

// TooLoo's "Eye" - A presence indicator that shows attention and mood
export const TooLooEye = memo(({ size = 40, showPupil = true, className = '' }) => {
  const { getAnimationState, presenceState, currentMood, activityLevel } = useTooLooPresence();
  const { getEmotionValues, animationManager } = useLiquidEngine();

  const eyeRef = useRef(null);
  const pupilRef = useRef(null);
  const glowRef = useRef(null);
  const subscriberIdRef = useRef(`tooloo-eye-${Date.now()}`);

  useEffect(() => {
    if (!animationManager) return;

    const unsubscribe = animationManager.subscribe(subscriberIdRef.current, () => {
      const anim = getAnimationState();
      const emotionVals = getEmotionValues();

      if (eyeRef.current) {
        // Breathing scale
        const breathScale = 1 + anim.breathing * 0.1 * activityLevel;
        eyeRef.current.style.transform = `scale(${breathScale})`;
      }

      if (pupilRef.current && showPupil) {
        // Pupil follows focus point
        const offsetX = (anim.eyePosition.x - 0.5) * size * 0.3;
        const offsetY = (anim.eyePosition.y - 0.5) * size * 0.3;
        pupilRef.current.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
      }

      if (glowRef.current) {
        // Glow intensity based on activity
        const glowIntensity = 0.3 + anim.breathing * 0.3 * activityLevel;
        glowRef.current.style.opacity = glowIntensity;
        glowRef.current.style.background = `radial-gradient(circle, 
          hsla(${emotionVals.hue}, ${emotionVals.saturation}%, 60%, ${glowIntensity}) 0%,
          transparent 70%
        )`;
      }
    });

    return unsubscribe;
  }, [animationManager, getAnimationState, getEmotionValues, activityLevel, showPupil, size]);

  return (
    <div
      ref={eyeRef}
      className={`relative rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        background: 'radial-gradient(circle, #1a1a2e 0%, #0f0f1a 100%)',
        border: '2px solid rgba(255,255,255,0.1)',
        boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)',
        willChange: 'transform',
      }}
    >
      {/* Outer glow */}
      <div
        ref={glowRef}
        className="absolute -inset-2 rounded-full pointer-events-none"
        style={{ willChange: 'opacity, background' }}
      />

      {/* Iris */}
      <div
        className="absolute inset-[15%] rounded-full"
        style={{
          background:
            'radial-gradient(circle, var(--accent-primary, #06b6d4) 0%, var(--accent-secondary, #8b5cf6) 100%)',
          opacity: 0.8,
        }}
      />

      {/* Pupil */}
      {showPupil && (
        <div
          ref={pupilRef}
          className="absolute rounded-full bg-black"
          style={{
            width: size * 0.25,
            height: size * 0.25,
            left: '50%',
            top: '50%',
            marginLeft: -size * 0.125,
            marginTop: -size * 0.125,
            boxShadow: 'inset 0 0 5px rgba(255,255,255,0.2)',
            willChange: 'transform',
          }}
        >
          {/* Highlight */}
          <div
            className="absolute rounded-full bg-white/40"
            style={{
              width: size * 0.08,
              height: size * 0.08,
              top: '20%',
              right: '20%',
            }}
          />
        </div>
      )}
    </div>
  );
});

TooLooEye.displayName = 'TooLooEye';

// TooLoo's "Breath" - Shows the breathing animation
export const TooLooBreath = memo(({ size = 60, rings = 3, className = '' }) => {
  const { getAnimationState, activityLevel } = useTooLooPresence();
  const { getEmotionValues, animationManager } = useLiquidEngine();

  const ringRefs = useRef([]);
  const subscriberIdRef = useRef(`tooloo-breath-${Date.now()}`);

  useEffect(() => {
    if (!animationManager) return;

    const unsubscribe = animationManager.subscribe(subscriberIdRef.current, () => {
      const anim = getAnimationState();
      const emotionVals = getEmotionValues();

      ringRefs.current.forEach((ring, i) => {
        if (!ring) return;

        const phase = anim.breathing + i * 0.2;
        const scale = 0.6 + Math.sin(phase * Math.PI) * 0.4;
        const opacity = 0.3 - i * 0.08 + anim.breathing * 0.2 * activityLevel;

        ring.style.transform = `scale(${scale})`;
        ring.style.opacity = Math.max(0, opacity);
        ring.style.borderColor = `hsla(${emotionVals.hue}, ${emotionVals.saturation}%, 60%, ${opacity})`;
      });
    });

    return unsubscribe;
  }, [animationManager, getAnimationState, getEmotionValues, activityLevel]);

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      {Array.from({ length: rings }).map((_, i) => (
        <div
          key={i}
          ref={(el) => (ringRefs.current[i] = el)}
          className="absolute inset-0 rounded-full border-2"
          style={{
            willChange: 'transform, opacity, border-color',
            transition: 'border-color 0.3s',
          }}
        />
      ))}
    </div>
  );
});

TooLooBreath.displayName = 'TooLooBreath';

// TooLoo's Status Badge - Shows current state in words
export const TooLooStatus = memo(({ className = '' }) => {
  const { presenceState, currentTask, isUserPresent } = useTooLooPresence();
  const state = PRESENCE_STATES[presenceState];

  const displayText = currentTask?.name || state?.description || 'Ready';

  return (
    <div
      className={`text-xs font-medium transition-all duration-500 ${className}`}
      style={{
        color: isUserPresent ? 'var(--text-secondary)' : 'var(--text-tertiary)',
        opacity: isUserPresent ? 1 : 0.5,
      }}
    >
      <span className="inline-block mr-2">
        {presenceState === 'thinking' && '🤔'}
        {presenceState === 'creating' && '✨'}
        {presenceState === 'listening' && '👂'}
        {presenceState === 'speaking' && '💬'}
        {presenceState === 'learning' && '📚'}
        {presenceState === 'accomplished' && '✅'}
        {presenceState === 'concerned' && '⚠️'}
        {presenceState === 'excited' && '🎉'}
        {presenceState === 'resting' && '😌'}
        {presenceState === 'attentive' && '👀'}
      </span>
      {displayText}
    </div>
  );
});

TooLooStatus.displayName = 'TooLooStatus';

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  TooLooPresenceProvider,
  useTooLooPresence,
  TooLooEye,
  TooLooBreath,
  TooLooStatus,
  PRESENCE_STATES,
  MICRO_EXPRESSIONS,
  PERSONALITY,
};
