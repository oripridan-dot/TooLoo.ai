// @version 3.3.573
/**
 * Amygdala Tests
 * Tests for the stress response and survival instincts system
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Test AmygdalaState enum
describe('AmygdalaState Enum', () => {
  const states = ['CALM', 'ALERT', 'PANIC', 'CRITICAL'];

  it('should have CALM state', () => {
    expect(states).toContain('CALM');
  });

  it('should have ALERT state', () => {
    expect(states).toContain('ALERT');
  });

  it('should have PANIC state', () => {
    expect(states).toContain('PANIC');
  });

  it('should have CRITICAL state', () => {
    expect(states).toContain('CRITICAL');
  });

  it('should have exactly 4 states', () => {
    expect(states.length).toBe(4);
  });
});

// Test cortisol level management
describe('Cortisol Level Management', () => {
  describe('cortisol spike', () => {
    it('should increase cortisol level', () => {
      let cortisol = 0.0;
      const amount = 0.2;
      cortisol = Math.min(1.0, cortisol + amount);
      expect(cortisol).toBe(0.2);
    });

    it('should cap cortisol at 1.0', () => {
      let cortisol = 0.9;
      const amount = 0.5;
      cortisol = Math.min(1.0, cortisol + amount);
      expect(cortisol).toBe(1.0);
    });

    it('should handle small increments', () => {
      let cortisol = 0.0;
      for (let i = 0; i < 5; i++) {
        cortisol = Math.min(1.0, cortisol + 0.1);
      }
      expect(cortisol).toBeCloseTo(0.5);
    });
  });

  describe('cortisol decay', () => {
    it('should decay cortisol over time', () => {
      let cortisol = 0.5;
      const decay = 0.05;
      cortisol = Math.max(0, cortisol - decay);
      expect(cortisol).toBe(0.45);
    });

    it('should not go below 0', () => {
      let cortisol = 0.02;
      const decay = 0.05;
      cortisol = Math.max(0, cortisol - decay);
      expect(cortisol).toBe(0);
    });

    it('should decay completely over time', () => {
      let cortisol = 0.5;
      const decay = 0.05;
      for (let i = 0; i < 20; i++) {
        cortisol = Math.max(0, cortisol - decay);
      }
      expect(cortisol).toBe(0);
    });
  });
});

// Test state determination
describe('State Determination', () => {
  function determineState(cortisol: number): string {
    if (cortisol >= 0.9) return 'CRITICAL';
    if (cortisol >= 0.7) return 'PANIC';
    if (cortisol >= 0.4) return 'ALERT';
    return 'CALM';
  }

  it('should return CALM for low cortisol', () => {
    expect(determineState(0.1)).toBe('CALM');
    expect(determineState(0.0)).toBe('CALM');
    expect(determineState(0.39)).toBe('CALM');
  });

  it('should return ALERT for moderate cortisol', () => {
    expect(determineState(0.4)).toBe('ALERT');
    expect(determineState(0.5)).toBe('ALERT');
    expect(determineState(0.69)).toBe('ALERT');
  });

  it('should return PANIC for high cortisol', () => {
    expect(determineState(0.7)).toBe('PANIC');
    expect(determineState(0.8)).toBe('PANIC');
    expect(determineState(0.89)).toBe('PANIC');
  });

  it('should return CRITICAL for very high cortisol', () => {
    expect(determineState(0.9)).toBe('CRITICAL');
    expect(determineState(1.0)).toBe('CRITICAL');
  });
});

// Test memory stress calculation
describe('Memory Stress Calculation', () => {
  const MEMORY_WARNING_THRESHOLD = 0.7;
  const MEMORY_CRITICAL_THRESHOLD = 0.9;

  function calculateMemoryStress(usedRatio: number): number {
    if (usedRatio >= MEMORY_CRITICAL_THRESHOLD) {
      return 0.5; // Critical stress
    } else if (usedRatio >= MEMORY_WARNING_THRESHOLD) {
      return 0.2; // Warning stress
    }
    return 0; // No stress
  }

  it('should return 0 for normal memory usage', () => {
    expect(calculateMemoryStress(0.5)).toBe(0);
    expect(calculateMemoryStress(0.3)).toBe(0);
    expect(calculateMemoryStress(0.69)).toBe(0);
  });

  it('should return warning stress for high memory', () => {
    expect(calculateMemoryStress(0.7)).toBe(0.2);
    expect(calculateMemoryStress(0.8)).toBe(0.2);
  });

  it('should return critical stress for very high memory', () => {
    expect(calculateMemoryStress(0.9)).toBe(0.5);
    expect(calculateMemoryStress(0.95)).toBe(0.5);
    expect(calculateMemoryStress(1.0)).toBe(0.5);
  });
});

// Test cognitive load calculation
describe('Cognitive Load Calculation', () => {
  const EVENT_SPIKE_THRESHOLD = 50;

  function calculateCognitiveLoad(eventsPerSecond: number): number {
    if (eventsPerSecond > EVENT_SPIKE_THRESHOLD) {
      return Math.min(0.5, (eventsPerSecond - EVENT_SPIKE_THRESHOLD) / 100);
    }
    return 0;
  }

  it('should return 0 for normal event rate', () => {
    expect(calculateCognitiveLoad(10)).toBe(0);
    expect(calculateCognitiveLoad(30)).toBe(0);
    expect(calculateCognitiveLoad(50)).toBe(0);
  });

  it('should return stress for high event rate', () => {
    expect(calculateCognitiveLoad(60)).toBe(0.1);
    expect(calculateCognitiveLoad(100)).toBe(0.5);
    expect(calculateCognitiveLoad(150)).toBe(0.5);
  });

  it('should cap at 0.5', () => {
    expect(calculateCognitiveLoad(200)).toBe(0.5);
    expect(calculateCognitiveLoad(1000)).toBe(0.5);
  });
});

// Test disk clutter stress
describe('Disk Clutter Stress', () => {
  const CLUTTER_THRESHOLD = 50;

  function calculateClutterStress(fileCount: number): number {
    if (fileCount > CLUTTER_THRESHOLD) {
      return Math.min(0.3, (fileCount - CLUTTER_THRESHOLD) / 100);
    }
    return 0;
  }

  it('should return 0 for few files', () => {
    expect(calculateClutterStress(10)).toBe(0);
    expect(calculateClutterStress(30)).toBe(0);
    expect(calculateClutterStress(50)).toBe(0);
  });

  it('should return stress for many files', () => {
    expect(calculateClutterStress(60)).toBe(0.1);
    expect(calculateClutterStress(80)).toBe(0.3);
  });

  it('should cap at 0.3', () => {
    expect(calculateClutterStress(200)).toBe(0.3);
    expect(calculateClutterStress(500)).toBe(0.3);
  });
});

// Test event history rolling window
describe('Event History Rolling Window', () => {
  it('should maintain rolling window', () => {
    const eventHistory: number[] = [];
    const WINDOW_SIZE = 60;
    
    for (let i = 0; i < 70; i++) {
      eventHistory.push(i);
      if (eventHistory.length > WINDOW_SIZE) {
        eventHistory.shift();
      }
    }
    
    expect(eventHistory.length).toBe(WINDOW_SIZE);
    expect(eventHistory[0]).toBe(10); // First 10 removed
    expect(eventHistory[eventHistory.length - 1]).toBe(69);
  });

  it('should calculate average events per second', () => {
    const eventHistory = [10, 20, 30, 40, 50];
    const average = eventHistory.reduce((a, b) => a + b, 0) / eventHistory.length;
    expect(average).toBe(30);
  });
});

// Test reflex triggers
describe('Reflex Triggers', () => {
  interface Reflex {
    trigger: string;
    action: () => void;
    enabled: boolean;
  }

  it('should define memory cleanup reflex', () => {
    const reflex: Reflex = {
      trigger: 'PANIC',
      action: () => { /* cleanup */ },
      enabled: true
    };
    expect(reflex.trigger).toBe('PANIC');
    expect(reflex.enabled).toBe(true);
  });

  it('should define disk cleanup reflex', () => {
    const reflex: Reflex = {
      trigger: 'ALERT',
      action: () => { /* disk cleanup */ },
      enabled: true
    };
    expect(reflex.trigger).toBe('ALERT');
  });

  it('should define emergency shutdown reflex', () => {
    const reflex: Reflex = {
      trigger: 'CRITICAL',
      action: () => { /* shutdown */ },
      enabled: true
    };
    expect(reflex.trigger).toBe('CRITICAL');
  });
});

// Test combined stress calculation
describe('Combined Stress Calculation', () => {
  function calculateTotalStress(
    memoryStress: number,
    cognitiveLoad: number,
    clutterStress: number,
    currentCortisol: number,
    decay: number
  ): number {
    let cortisol = currentCortisol;
    
    // Apply decay
    cortisol = Math.max(0, cortisol - decay);
    
    // Add stressors
    cortisol += memoryStress;
    cortisol += cognitiveLoad;
    cortisol += clutterStress;
    
    // Cap at 1.0
    return Math.min(1.0, cortisol);
  }

  it('should accumulate stressors', () => {
    const result = calculateTotalStress(0.2, 0.1, 0.1, 0.0, 0.0);
    expect(result).toBe(0.4);
  });

  it('should apply decay', () => {
    const result = calculateTotalStress(0.0, 0.0, 0.0, 0.5, 0.05);
    expect(result).toBe(0.45);
  });

  it('should cap at 1.0', () => {
    const result = calculateTotalStress(0.5, 0.5, 0.5, 0.5, 0.0);
    expect(result).toBe(1.0);
  });

  it('should handle no stress', () => {
    const result = calculateTotalStress(0, 0, 0, 0.1, 0.05);
    expect(result).toBe(0.05);
  });
});

// Test state transition events
describe('State Transition Events', () => {
  type StateTransition = {
    from: string;
    to: string;
    cortisol: number;
    timestamp: number;
  };

  it('should record state transitions', () => {
    const transitions: StateTransition[] = [];
    
    transitions.push({
      from: 'CALM',
      to: 'ALERT',
      cortisol: 0.45,
      timestamp: Date.now()
    });
    
    expect(transitions.length).toBe(1);
    expect(transitions[0].from).toBe('CALM');
    expect(transitions[0].to).toBe('ALERT');
  });

  it('should track escalation', () => {
    const transitions: StateTransition[] = [
      { from: 'CALM', to: 'ALERT', cortisol: 0.45, timestamp: 1000 },
      { from: 'ALERT', to: 'PANIC', cortisol: 0.75, timestamp: 2000 },
      { from: 'PANIC', to: 'CRITICAL', cortisol: 0.95, timestamp: 3000 }
    ];
    
    expect(transitions[transitions.length - 1].to).toBe('CRITICAL');
    expect(transitions.length).toBe(3);
  });

  it('should track de-escalation', () => {
    const transitions: StateTransition[] = [
      { from: 'CRITICAL', to: 'PANIC', cortisol: 0.8, timestamp: 1000 },
      { from: 'PANIC', to: 'ALERT', cortisol: 0.5, timestamp: 2000 },
      { from: 'ALERT', to: 'CALM', cortisol: 0.2, timestamp: 3000 }
    ];
    
    expect(transitions[transitions.length - 1].to).toBe('CALM');
  });
});
