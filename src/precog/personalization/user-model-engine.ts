// @version 3.3.500
import fs from 'fs/promises';
import path from 'path';
import { EventEmitter } from 'events';

export type UserSegment = 'developer' | 'creative' | 'analyst' | 'general';

export interface UserProfile {
  id: string;
  segment: UserSegment;
  preferences: {
    preferredProvider?: string;
    latencySensitivity: number; // 0-1
    costSensitivity: number; // 0-1
  };
  stats: {
    totalRequests: number;
    lastActive: number;
    segmentConfidence: number; // 0-1
  };
}

export class UserModelEngine extends EventEmitter {
  private profiles: Map<string, UserProfile> = new Map();
  private readonly storagePath: string;
  private initialized: boolean = false;

  constructor(storagePath: string = 'data/user-profiles.json') {
    super();
    this.storagePath = path.resolve(process.cwd(), storagePath);
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.ensureDirectory();
      const data = await fs.readFile(this.storagePath, 'utf-8');
      const json = JSON.parse(data);
      
      if (Array.isArray(json)) {
        json.forEach((profile: UserProfile) => {
          this.profiles.set(profile.id, profile);
        });
      }
      
      console.log(`[UserModelEngine] Loaded ${this.profiles.size} user profiles`);
    } catch (error) {
      // If file doesn't exist, start empty
      console.log('[UserModelEngine] Starting with empty user profiles');
    }

    this.initialized = true;
  }

  async getUserProfile(userId: string): Promise<UserProfile> {
    if (!this.initialized) await this.initialize();

    if (!this.profiles.has(userId)) {
      const newProfile: UserProfile = {
        id: userId,
        segment: 'general',
        preferences: {
          latencySensitivity: 0.5,
          costSensitivity: 0.5
        },
        stats: {
          totalRequests: 0,
          lastActive: Date.now(),
          segmentConfidence: 0.1
        }
      };
      this.profiles.set(userId, newProfile);
      await this.save();
    }

    return this.profiles.get(userId)!;
  }

  async updateUserSegment(userId: string, segment: UserSegment, confidence: number): Promise<void> {
    const profile = await this.getUserProfile(userId);
    
    // Simple update logic - could be more complex Bayesian update
    if (confidence > profile.stats.segmentConfidence || profile.segment === 'general') {
      profile.segment = segment;
      profile.stats.segmentConfidence = confidence;
    }
    
    profile.stats.lastActive = Date.now();
    profile.stats.totalRequests++;
    
    this.profiles.set(userId, profile);
    this.emit('profile:updated', profile);
    await this.save();
  }

  private async save(): Promise<void> {
    try {
      const data = JSON.stringify(Array.from(this.profiles.values()), null, 2);
      await fs.writeFile(this.storagePath, data, 'utf-8');
    } catch (error) {
      console.error('[UserModelEngine] Failed to save profiles:', error);
    }
  }

  private async ensureDirectory(): Promise<void> {
    const dir = path.dirname(this.storagePath);
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }
}

// Singleton instance
let instance: UserModelEngine | null = null;

export function getUserModelEngine(): UserModelEngine {
  if (!instance) {
    instance = new UserModelEngine();
    // Don't await initialize here, let it happen on first use or explicit call
    instance.initialize().catch(console.error);
  }
  return instance;
}
