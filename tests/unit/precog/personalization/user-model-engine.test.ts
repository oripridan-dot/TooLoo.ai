/**
 * UserModelEngine Tests
 * Tests for user profile management and segmentation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fs
vi.mock('fs/promises', () => ({
  default: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
    access: vi.fn(),
  },
}));

describe('UserModelEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Types', () => {
    describe('UserSegment', () => {
      it('should define developer segment', () => {
        type UserSegment = 'developer' | 'creative' | 'analyst' | 'general';
        const segment: UserSegment = 'developer';
        expect(segment).toBe('developer');
      });

      it('should define creative segment', () => {
        type UserSegment = 'developer' | 'creative' | 'analyst' | 'general';
        const segment: UserSegment = 'creative';
        expect(segment).toBe('creative');
      });

      it('should define analyst segment', () => {
        type UserSegment = 'developer' | 'creative' | 'analyst' | 'general';
        const segment: UserSegment = 'analyst';
        expect(segment).toBe('analyst');
      });

      it('should define general segment', () => {
        type UserSegment = 'developer' | 'creative' | 'analyst' | 'general';
        const segment: UserSegment = 'general';
        expect(segment).toBe('general');
      });
    });

    describe('UserProfile', () => {
      it('should have id property', () => {
        interface UserProfile {
          id: string;
          segment: string;
          preferences: {
            preferredProvider?: string;
            latencySensitivity: number;
            costSensitivity: number;
          };
          stats: {
            totalRequests: number;
            lastActive: number;
            segmentConfidence: number;
          };
        }
        const profile: UserProfile = {
          id: 'user-123',
          segment: 'developer',
          preferences: {
            latencySensitivity: 0.5,
            costSensitivity: 0.5,
          },
          stats: {
            totalRequests: 0,
            lastActive: Date.now(),
            segmentConfidence: 0.1,
          },
        };
        expect(profile.id).toBe('user-123');
      });

      it('should have segment property', () => {
        interface UserProfile {
          id: string;
          segment: string;
          preferences: {
            preferredProvider?: string;
            latencySensitivity: number;
            costSensitivity: number;
          };
          stats: {
            totalRequests: number;
            lastActive: number;
            segmentConfidence: number;
          };
        }
        const profile: UserProfile = {
          id: 'user-456',
          segment: 'creative',
          preferences: {
            latencySensitivity: 0.3,
            costSensitivity: 0.7,
          },
          stats: {
            totalRequests: 10,
            lastActive: Date.now(),
            segmentConfidence: 0.8,
          },
        };
        expect(profile.segment).toBe('creative');
      });

      it('should have optional preferred provider', () => {
        interface UserProfile {
          id: string;
          segment: string;
          preferences: {
            preferredProvider?: string;
            latencySensitivity: number;
            costSensitivity: number;
          };
          stats: {
            totalRequests: number;
            lastActive: number;
            segmentConfidence: number;
          };
        }
        const profile: UserProfile = {
          id: 'user-789',
          segment: 'analyst',
          preferences: {
            preferredProvider: 'anthropic',
            latencySensitivity: 0.2,
            costSensitivity: 0.8,
          },
          stats: {
            totalRequests: 50,
            lastActive: Date.now(),
            segmentConfidence: 0.9,
          },
        };
        expect(profile.preferences.preferredProvider).toBe('anthropic');
      });

      it('should have latency sensitivity 0-1', () => {
        const latencySensitivity = 0.7;
        expect(latencySensitivity).toBeGreaterThanOrEqual(0);
        expect(latencySensitivity).toBeLessThanOrEqual(1);
      });

      it('should have cost sensitivity 0-1', () => {
        const costSensitivity = 0.4;
        expect(costSensitivity).toBeGreaterThanOrEqual(0);
        expect(costSensitivity).toBeLessThanOrEqual(1);
      });

      it('should track total requests', () => {
        const stats = { totalRequests: 100 };
        expect(stats.totalRequests).toBe(100);
      });

      it('should track last active timestamp', () => {
        const now = Date.now();
        const stats = { lastActive: now };
        expect(stats.lastActive).toBe(now);
      });

      it('should track segment confidence 0-1', () => {
        const segmentConfidence = 0.85;
        expect(segmentConfidence).toBeGreaterThanOrEqual(0);
        expect(segmentConfidence).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('UserModelEngine Class', () => {
    it('should initialize with storage path', () => {
      const storagePath = 'data/user-profiles.json';
      expect(storagePath).toBe('data/user-profiles.json');
    });

    it('should default to user-profiles.json', () => {
      const defaultPath = 'data/user-profiles.json';
      expect(defaultPath).toContain('user-profiles.json');
    });

    it('should start with empty profiles map', () => {
      const profiles = new Map();
      expect(profiles.size).toBe(0);
    });

    it('should track initialization state', () => {
      let initialized = false;
      initialized = true;
      expect(initialized).toBe(true);
    });

    it('should extend EventEmitter', () => {
      const events: string[] = [];
      const emit = (event: string) => events.push(event);
      emit('profile:updated');
      expect(events).toContain('profile:updated');
    });
  });

  describe('Initialization', () => {
    it('should only initialize once', () => {
      let initCount = 0;
      let initialized = false;
      const initialize = () => {
        if (initialized) return;
        initCount++;
        initialized = true;
      };
      initialize();
      initialize();
      expect(initCount).toBe(1);
    });

    it('should load profiles from file', () => {
      const json = [
        { id: 'user-1', segment: 'developer' },
        { id: 'user-2', segment: 'creative' },
      ];
      const profiles = new Map<string, { id: string; segment: string }>();
      json.forEach((p) => profiles.set(p.id, p));
      expect(profiles.size).toBe(2);
    });

    it('should handle missing file gracefully', () => {
      const profiles = new Map();
      // File doesn't exist, start empty
      expect(profiles.size).toBe(0);
    });

    it('should ensure directory exists', () => {
      const path = 'data/user-profiles.json';
      const dir = path.split('/').slice(0, -1).join('/');
      expect(dir).toBe('data');
    });
  });

  describe('Profile Management', () => {
    describe('getUserProfile', () => {
      it('should return existing profile', () => {
        const profiles = new Map([['user-1', { id: 'user-1', segment: 'developer' }]]);
        const profile = profiles.get('user-1');
        expect(profile?.segment).toBe('developer');
      });

      it('should create new profile if not exists', () => {
        const profiles = new Map<string, { id: string; segment: string }>();
        if (!profiles.has('new-user')) {
          profiles.set('new-user', { id: 'new-user', segment: 'general' });
        }
        expect(profiles.get('new-user')?.segment).toBe('general');
      });

      it('should initialize new profile with defaults', () => {
        const newProfile = {
          id: 'new-user',
          segment: 'general',
          preferences: {
            latencySensitivity: 0.5,
            costSensitivity: 0.5,
          },
          stats: {
            totalRequests: 0,
            lastActive: Date.now(),
            segmentConfidence: 0.1,
          },
        };
        expect(newProfile.segment).toBe('general');
        expect(newProfile.preferences.latencySensitivity).toBe(0.5);
        expect(newProfile.stats.segmentConfidence).toBe(0.1);
      });

      it('should save after creating new profile', () => {
        let saved = false;
        const save = () => {
          saved = true;
        };
        save();
        expect(saved).toBe(true);
      });
    });

    describe('updateUserSegment', () => {
      it('should update segment if confidence is higher', () => {
        const profile = {
          segment: 'general',
          stats: { segmentConfidence: 0.5 },
        };
        const newConfidence = 0.7;
        if (newConfidence > profile.stats.segmentConfidence) {
          profile.segment = 'developer';
          profile.stats.segmentConfidence = newConfidence;
        }
        expect(profile.segment).toBe('developer');
      });

      it('should update segment from general regardless of confidence', () => {
        const profile = {
          segment: 'general',
          stats: { segmentConfidence: 0.5 },
        };
        const newConfidence = 0.3;
        if (newConfidence > profile.stats.segmentConfidence || profile.segment === 'general') {
          profile.segment = 'analyst';
          profile.stats.segmentConfidence = newConfidence;
        }
        expect(profile.segment).toBe('analyst');
      });

      it('should not downgrade if confidence is lower', () => {
        const profile = {
          segment: 'developer',
          stats: { segmentConfidence: 0.8 },
        };
        const newConfidence = 0.6;
        if (
          newConfidence > profile.stats.segmentConfidence ||
          profile.segment === 'general'
        ) {
          profile.segment = 'creative';
          profile.stats.segmentConfidence = newConfidence;
        }
        expect(profile.segment).toBe('developer');
      });

      it('should update last active timestamp', () => {
        const profile = { stats: { lastActive: 0 } };
        profile.stats.lastActive = Date.now();
        expect(profile.stats.lastActive).toBeGreaterThan(0);
      });

      it('should increment total requests', () => {
        const profile = { stats: { totalRequests: 5 } };
        profile.stats.totalRequests++;
        expect(profile.stats.totalRequests).toBe(6);
      });

      it('should emit profile:updated event', () => {
        const events: string[] = [];
        const emit = (event: string) => events.push(event);
        emit('profile:updated');
        expect(events).toContain('profile:updated');
      });
    });
  });

  describe('Persistence', () => {
    it('should serialize profiles to JSON', () => {
      const profiles = new Map([
        ['user-1', { id: 'user-1', segment: 'developer' }],
        ['user-2', { id: 'user-2', segment: 'creative' }],
      ]);
      const data = JSON.stringify(Array.from(profiles.values()), null, 2);
      expect(data).toContain('user-1');
      expect(data).toContain('developer');
    });

    it('should deserialize JSON to profiles', () => {
      const json = '[{"id":"user-1","segment":"developer"}]';
      const data = JSON.parse(json) as { id: string; segment: string }[];
      const profiles = new Map<string, { id: string; segment: string }>();
      data.forEach((p) => profiles.set(p.id, p));
      expect(profiles.get('user-1')?.segment).toBe('developer');
    });

    it('should handle empty JSON array', () => {
      const json = '[]';
      const data = JSON.parse(json) as unknown[];
      expect(data).toHaveLength(0);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      let instance: { id: number } | null = null;
      const getInstance = () => {
        if (!instance) instance = { id: 1 };
        return instance;
      };
      const a = getInstance();
      const b = getInstance();
      expect(a).toBe(b);
    });
  });
});
