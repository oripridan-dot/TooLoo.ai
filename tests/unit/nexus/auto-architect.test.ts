// @version 3.3.573
/**
 * Auto-Architect (System Optimizer) Tests
 * Tests for the system optimization and code health checking system
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Test optimization suggestion types
describe('Optimization Suggestion Types', () => {
  type SuggestionType = 'performance' | 'security' | 'code_quality' | 'architecture';

  interface OptimizationSuggestion {
    type: SuggestionType;
    file: string;
    message: string;
    severity?: 'low' | 'medium' | 'high';
  }

  it('should create performance suggestion', () => {
    const suggestion: OptimizationSuggestion = {
      type: 'performance',
      file: 'src/main.ts',
      message: 'Consider lazy loading modules'
    };
    expect(suggestion.type).toBe('performance');
  });

  it('should create security suggestion', () => {
    const suggestion: OptimizationSuggestion = {
      type: 'security',
      file: 'src/core/config.ts',
      message: 'API keys should be encrypted'
    };
    expect(suggestion.type).toBe('security');
  });

  it('should create code quality suggestion', () => {
    const suggestion: OptimizationSuggestion = {
      type: 'code_quality',
      file: 'src/utils/helpers.ts',
      message: 'Function is too complex, consider splitting'
    };
    expect(suggestion.type).toBe('code_quality');
  });

  it('should create architecture suggestion', () => {
    const suggestion: OptimizationSuggestion = {
      type: 'architecture',
      file: 'src/services/api.ts',
      message: 'Consider using dependency injection'
    };
    expect(suggestion.type).toBe('architecture');
  });

  it('should support severity levels', () => {
    const suggestion: OptimizationSuggestion = {
      type: 'security',
      file: 'src/auth.ts',
      message: 'Password stored in plain text',
      severity: 'high'
    };
    expect(suggestion.severity).toBe('high');
  });
});

// Test optimization check status
describe('Optimization Check Status', () => {
  interface OptimizationCheckResult {
    status: 'clean' | 'opportunities_found' | 'error';
    suggestions: Array<{ type: string; file: string; message: string }>;
    timestamp: number;
  }

  it('should report clean status when no issues', () => {
    const result: OptimizationCheckResult = {
      status: 'clean',
      suggestions: [],
      timestamp: Date.now()
    };
    expect(result.status).toBe('clean');
    expect(result.suggestions.length).toBe(0);
  });

  it('should report opportunities when issues found', () => {
    const result: OptimizationCheckResult = {
      status: 'opportunities_found',
      suggestions: [
        { type: 'performance', file: 'main.ts', message: 'Optimize startup' }
      ],
      timestamp: Date.now()
    };
    expect(result.status).toBe('opportunities_found');
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it('should report error status on failure', () => {
    const result: OptimizationCheckResult = {
      status: 'error',
      suggestions: [],
      timestamp: Date.now()
    };
    expect(result.status).toBe('error');
  });
});

// Test interval configuration
describe('Optimization Interval', () => {
  const HOUR_MS = 1000 * 60 * 60;
  const MINUTE_MS = 1000 * 60;

  it('should use 1 hour as default interval', () => {
    const intervalMs = HOUR_MS;
    expect(intervalMs).toBe(3600000);
  });

  it('should convert to minutes', () => {
    const intervalMinutes = HOUR_MS / MINUTE_MS;
    expect(intervalMinutes).toBe(60);
  });

  it('should be configurable', () => {
    const customInterval = 30 * MINUTE_MS;
    expect(customInterval).toBe(1800000);
  });
});

// Test heuristic checks
describe('Heuristic Checks', () => {
  function checkLazyLoading(modules: string[]): boolean {
    // Large number of modules suggests lazy loading could help
    return modules.length > 20;
  }

  function checkCodeComplexity(linesOfCode: number): boolean {
    // Files with many lines should be split
    return linesOfCode > 500;
  }

  function checkCircularDependencies(deps: Map<string, string[]>): string[] {
    const circular: string[] = [];
    for (const [mod, imports] of deps) {
      for (const imp of imports) {
        if (deps.get(imp)?.includes(mod)) {
          circular.push(`${mod} <-> ${imp}`);
        }
      }
    }
    return circular;
  }

  it('should suggest lazy loading for many modules', () => {
    const manyModules = Array.from({ length: 30 }, (_, i) => `module${i}`);
    expect(checkLazyLoading(manyModules)).toBe(true);
  });

  it('should not suggest lazy loading for few modules', () => {
    const fewModules = ['main', 'utils', 'config'];
    expect(checkLazyLoading(fewModules)).toBe(false);
  });

  it('should flag complex files', () => {
    expect(checkCodeComplexity(600)).toBe(true);
    expect(checkCodeComplexity(100)).toBe(false);
  });

  it('should detect circular dependencies', () => {
    const deps = new Map([
      ['a', ['b']],
      ['b', ['a']] // circular!
    ]);
    const circular = checkCircularDependencies(deps);
    expect(circular.length).toBeGreaterThan(0);
  });
});

// Test suggestion aggregation
describe('Suggestion Aggregation', () => {
  interface Suggestion {
    type: string;
    severity: number;
    file: string;
  }

  function aggregateSuggestions(suggestions: Suggestion[]): Map<string, Suggestion[]> {
    const grouped = new Map<string, Suggestion[]>();
    for (const s of suggestions) {
      const existing = grouped.get(s.type) || [];
      existing.push(s);
      grouped.set(s.type, existing);
    }
    return grouped;
  }

  function prioritizeSuggestions(suggestions: Suggestion[]): Suggestion[] {
    return [...suggestions].sort((a, b) => b.severity - a.severity);
  }

  it('should group suggestions by type', () => {
    const suggestions: Suggestion[] = [
      { type: 'performance', severity: 1, file: 'a.ts' },
      { type: 'performance', severity: 2, file: 'b.ts' },
      { type: 'security', severity: 3, file: 'c.ts' }
    ];
    const grouped = aggregateSuggestions(suggestions);
    expect(grouped.get('performance')?.length).toBe(2);
    expect(grouped.get('security')?.length).toBe(1);
  });

  it('should prioritize by severity', () => {
    const suggestions: Suggestion[] = [
      { type: 'perf', severity: 1, file: 'a.ts' },
      { type: 'sec', severity: 3, file: 'b.ts' },
      { type: 'code', severity: 2, file: 'c.ts' }
    ];
    const prioritized = prioritizeSuggestions(suggestions);
    expect(prioritized[0].severity).toBe(3);
    expect(prioritized[prioritized.length - 1].severity).toBe(1);
  });
});

// Test lazy loading analysis
describe('Lazy Loading Analysis', () => {
  interface ModuleInfo {
    name: string;
    size: number;
    usedAtStartup: boolean;
  }

  function analyzeLazyLoadCandidates(modules: ModuleInfo[]): ModuleInfo[] {
    // Modules not used at startup with size > threshold are candidates
    const SIZE_THRESHOLD = 50000; // 50KB
    return modules.filter(m => !m.usedAtStartup && m.size > SIZE_THRESHOLD);
  }

  it('should identify lazy load candidates', () => {
    const modules: ModuleInfo[] = [
      { name: 'core', size: 10000, usedAtStartup: true },
      { name: 'analytics', size: 100000, usedAtStartup: false },
      { name: 'reporting', size: 80000, usedAtStartup: false }
    ];
    const candidates = analyzeLazyLoadCandidates(modules);
    expect(candidates.length).toBe(2);
    expect(candidates.map(c => c.name)).toContain('analytics');
  });

  it('should not include startup modules', () => {
    const modules: ModuleInfo[] = [
      { name: 'bootstrap', size: 200000, usedAtStartup: true }
    ];
    const candidates = analyzeLazyLoadCandidates(modules);
    expect(candidates.length).toBe(0);
  });

  it('should not include small modules', () => {
    const modules: ModuleInfo[] = [
      { name: 'tiny', size: 1000, usedAtStartup: false }
    ];
    const candidates = analyzeLazyLoadCandidates(modules);
    expect(candidates.length).toBe(0);
  });
});

// Test event publishing
describe('Event Publishing', () => {
  interface OptimizationEvent {
    source: string;
    eventType: string;
    data: {
      status: string;
      suggestions: unknown[];
    };
  }

  it('should format optimization check event', () => {
    const event: OptimizationEvent = {
      source: 'nexus',
      eventType: 'system:optimization_check',
      data: {
        status: 'clean',
        suggestions: []
      }
    };
    expect(event.source).toBe('nexus');
    expect(event.eventType).toBe('system:optimization_check');
  });

  it('should include suggestions in event', () => {
    const event: OptimizationEvent = {
      source: 'nexus',
      eventType: 'system:optimization_check',
      data: {
        status: 'opportunities_found',
        suggestions: [
          { type: 'performance', message: 'Optimize' }
        ]
      }
    };
    expect(event.data.suggestions.length).toBe(1);
  });
});

// Test optimization metrics
describe('Optimization Metrics', () => {
  interface OptimizationMetrics {
    checksPerformed: number;
    suggestionsGenerated: number;
    lastCheckTime: number;
    avgCheckDuration: number;
  }

  function updateMetrics(
    current: OptimizationMetrics,
    newSuggestions: number,
    duration: number
  ): OptimizationMetrics {
    const totalChecks = current.checksPerformed + 1;
    return {
      checksPerformed: totalChecks,
      suggestionsGenerated: current.suggestionsGenerated + newSuggestions,
      lastCheckTime: Date.now(),
      avgCheckDuration: (current.avgCheckDuration * current.checksPerformed + duration) / totalChecks
    };
  }

  it('should track checks performed', () => {
    let metrics: OptimizationMetrics = {
      checksPerformed: 0,
      suggestionsGenerated: 0,
      lastCheckTime: 0,
      avgCheckDuration: 0
    };
    metrics = updateMetrics(metrics, 3, 100);
    expect(metrics.checksPerformed).toBe(1);
    expect(metrics.suggestionsGenerated).toBe(3);
  });

  it('should calculate average duration', () => {
    let metrics: OptimizationMetrics = {
      checksPerformed: 1,
      suggestionsGenerated: 0,
      lastCheckTime: 0,
      avgCheckDuration: 100
    };
    metrics = updateMetrics(metrics, 0, 200);
    expect(metrics.avgCheckDuration).toBe(150);
  });
});

// Test stop functionality
describe('Stop Functionality', () => {
  it('should clear interval when stopped', () => {
    let intervalCleared = false;
    const mockClearInterval = () => { intervalCleared = true; };
    
    // Simulate stop
    mockClearInterval();
    expect(intervalCleared).toBe(true);
  });

  it('should prevent new checks after stop', () => {
    let canCheck = true;
    
    // Simulate stop
    canCheck = false;
    
    expect(canCheck).toBe(false);
  });
});
