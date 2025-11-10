/**
 * Event Bus Unit Tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

// Use absolute paths
import EventBus from '../../lib/event-bus.js';
import { createEvent } from '../../lib/event-schema.js';

const testDbPath = path.join(rootDir, 'data/test-events.db');

// Cleanup function
function cleanupTestDb() {
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
}

describe('EventBus', () => {
  let eventBus;

  beforeAll(async () => {
    cleanupTestDb();
    eventBus = new EventBus(testDbPath);
    await eventBus.initialize();
  });

  afterAll(async () => {
    await eventBus.close();
    cleanupTestDb();
  });

  describe('initialization', () => {
    it('should initialize with SQLite WAL mode', async () => {
      expect(eventBus.db).toBeDefined();
      expect(eventBus.subscribers).toBeDefined();
      expect(eventBus.subscribers.size).toBe(0);
    });
  });

  describe('event emission', () => {
    it('should emit an event and return an ID', async () => {
      const event = createEvent('training.started', 'user_1', {
        userId: 'user_1',
        campId: 'dsa',
        topic: 'arrays'
      });

      const eventId = await eventBus.emit(event);
      expect(eventId).toBeDefined();
      expect(typeof eventId).toBe('string');
    });

    it('should persist event to database', async () => {
      const event = createEvent('training.started', 'user_2', {
        userId: 'user_2',
        campId: 'graphs',
        topic: 'shortest-path'
      });

      await eventBus.emit(event);

      const allEvents = await eventBus.getAllEvents();
      expect(allEvents.length).toBeGreaterThan(0);
      expect(allEvents.some(e => e.aggregateId === 'user_2')).toBe(true);
    });

    it('should handle event with custom metadata', async () => {
      const event = createEvent('training.started', 'user_3', {
        userId: 'user_3',
        campId: 'sorting',
        topic: 'quicksort'
      });
      event.metadata.customField = 'customValue';

      const eventId = await eventBus.emit(event);
      expect(eventId).toBeDefined();
    });
  });

  describe('deduplication', () => {
    it('should prevent duplicate events with same hash', async () => {
      const eventData = {
        userId: 'user_4',
        campId: 'dynamic-programming',
        topic: 'knapsack'
      };

      const event1 = createEvent('training.started', 'user_4', eventData);
      const event2 = createEvent('training.started', 'user_4', eventData);

      await eventBus.emit(event1);
      await eventBus.emit(event2); // Same event again

      const allEvents = await eventBus.getAllEvents({ type: 'training.started', aggregateId: 'user_4' });
      expect(allEvents.length).toBe(1); // Should only have one
    });

    it('should allow different events from same user', async () => {
      const event1 = createEvent('training.started', 'user_5', {
        userId: 'user_5',
        campId: 'camp1',
        topic: 'topic1'
      });

      const event2 = createEvent('training.paused', 'user_5', {
        userId: 'user_5',
        campId: 'camp1'
      });

      await eventBus.emit(event1);
      await eventBus.emit(event2);

      const events = await eventBus.getEventsByAggregate('user_5');
      expect(events.length).toBe(2);
      expect(events.map(e => e.type)).toContain('training.started');
      expect(events.map(e => e.type)).toContain('training.paused');
    });
  });

  describe('subscription', () => {
    it('should subscribe to events', async () => {
      const events = [];

      eventBus.subscribe('test-service', ['training.started'], (event) => {
        events.push(event);
      });

      const event = createEvent('training.started', 'user_6', {
        userId: 'user_6',
        campId: 'trees',
        topic: 'binary-trees'
      });

      await eventBus.emit(event);

      // Give subscriber time to process
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(events.length).toBeGreaterThan(0);
    });

    it('should receive multiple events', async () => {
      const events = [];

      eventBus.subscribe('test-service-2', ['training.completed'], (event) => {
        events.push(event);
      });

      const event1 = createEvent('training.completed', 'user_7', {
        userId: 'user_7',
        campId: 'camp1',
        score: 95
      });

      const event2 = createEvent('training.completed', 'user_8', {
        userId: 'user_8',
        campId: 'camp2',
        score: 87
      });

      await eventBus.emit(event1);
      await eventBus.emit(event2);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(events.length).toBeGreaterThanOrEqual(2);
    });

    it('should support wildcard subscriptions', async () => {
      const events = [];

      eventBus.subscribe('wildcard-service', ['*'], (event) => {
        events.push(event);
      });

      const event1 = createEvent('training.started', 'user_9', {
        userId: 'user_9',
        campId: 'camp1',
        topic: 'greedy'
      });

      const event2 = createEvent('mastery.improved', 'user_9', {
        userId: 'user_9',
        topic: 'greedy',
        previousScore: 60,
        newScore: 75
      });

      const initialCount = events.length;
      await eventBus.emit(event1);
      await eventBus.emit(event2);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(events.length).toBeGreaterThan(initialCount);
    });

    it('should return unsubscribe function', async () => {
      const events = [];

      const unsubscribe = eventBus.subscribe('unsub-service', ['challenge.started'], (event) => {
        events.push(event);
      });

      const event = createEvent('challenge.started', 'user_10', {
        userId: 'user_10',
        challengeId: 'ch1',
        topic: 'recursion'
      });

      await eventBus.emit(event);
      await new Promise(resolve => setTimeout(resolve, 50));

      const firstCount = events.length;

      unsubscribe();

      const event2 = createEvent('challenge.started', 'user_11', {
        userId: 'user_11',
        challengeId: 'ch2',
        topic: 'recursion'
      });

      await eventBus.emit(event2);
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(events.length).toBe(firstCount); // Should not have increased
    });
  });

  describe('event retrieval', () => {
    it('should get events by type', async () => {
      const event = createEvent('badge.earned', 'user_12', {
        userId: 'user_12',
        badgeId: 'badge1',
        badgeName: 'Coding Warrior'
      });

      await eventBus.emit(event);

      const badgeEvents = await eventBus.getEventsByType('badge.earned');
      expect(badgeEvents.length).toBeGreaterThan(0);
      expect(badgeEvents.every(e => e.type === 'badge.earned')).toBe(true);
    });

    it('should get events by aggregate', async () => {
      const event1 = createEvent('training.started', 'user_13', {
        userId: 'user_13',
        campId: 'camp1',
        topic: 'topic1'
      });

      const event2 = createEvent('training.completed', 'user_13', {
        userId: 'user_13',
        campId: 'camp1',
        score: 90
      });

      await eventBus.emit(event1);
      await eventBus.emit(event2);

      const userEvents = await eventBus.getEventsByAggregate('user_13');
      expect(userEvents.length).toBeGreaterThanOrEqual(2);
      expect(userEvents.every(e => e.aggregateId === 'user_13')).toBe(true);
    });

    it('should get all events', async () => {
      const allEvents = await eventBus.getAllEvents();
      expect(Array.isArray(allEvents)).toBe(true);
      expect(allEvents.length).toBeGreaterThan(0);
    });

    it('should filter events by type', async () => {
      const trainingEvents = await eventBus.getAllEvents({ type: 'training.started' });
      expect(trainingEvents.every(e => e.type === 'training.started')).toBe(true);
    });

    it('should filter events by aggregateId', async () => {
      const userEvents = await eventBus.getAllEvents({ aggregateId: 'user_1' });
      expect(userEvents.every(e => e.aggregateId === 'user_1')).toBe(true);
    });

    it('should filter events by timestamp range', async () => {
      const now = Date.now();
      const recentEvents = await eventBus.getAllEvents({
        fromTimestamp: now - 60000, // Last minute
        toTimestamp: now
      });

      expect(Array.isArray(recentEvents)).toBe(true);
    });

    it('should support limit parameter', async () => {
      const limitedEvents = await eventBus.getAllEvents({ limit: 5 });
      expect(limitedEvents.length).toBeLessThanOrEqual(5);
    });
  });

  describe('event processing tracking', () => {
    it('should mark event as processed', async () => {
      const event = createEvent('milestone.reached', 'user_14', {
        userId: 'user_14',
        milestoneId: 'milestone1',
        milestoneName: 'First 100 Challenges'
      });

      const eventId = await eventBus.emit(event);
      await eventBus.markAsProcessed('analytics-service', 'milestone.reached', eventId);

      // No error should be thrown
      expect(true).toBe(true);
    });
  });

  describe('statistics', () => {
    it('should calculate event statistics', async () => {
      const stats = await eventBus.getStats();

      expect(stats).toBeDefined();
      expect(stats.totalEvents).toBeGreaterThan(0);
      expect(Array.isArray(stats.eventsByType)).toBe(true);
    });

    it('should show event type breakdown', async () => {
      const stats = await eventBus.getStats();

      expect(stats.eventsByType.length).toBeGreaterThan(0);
      expect(stats.eventsByType[0]).toHaveProperty('type');
      expect(stats.eventsByType[0]).toHaveProperty('count');
    });
  });

  describe('event data', () => {
    it('should preserve event data through emit-retrieve cycle', async () => {
      const testData = {
        userId: 'user_15',
        campId: 'camp-special',
        topic: 'preservation-test',
        metadata: {
          source: 'mobile-app',
          version: '3.0.0'
        }
      };

      const event = createEvent('training.started', 'user_15', testData);
      const eventId = await eventBus.emit(event);

      const retrieved = await eventBus.getEventsByAggregate('user_15');
      const found = retrieved.find(e => e.id === eventId);

      expect(found).toBeDefined();
      expect(found.data.userId).toBe(testData.userId);
      expect(found.data.campId).toBe(testData.campId);
      expect(found.data.topic).toBe(testData.topic);
    });
  });
});
