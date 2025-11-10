/**
 * Event Schema Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
path.dirname(__filename);

import {
  validateEvent,
  createEvent,
  getEventSchema,
  getEventsByDomain,
  getAllEventTypes,
  getSchemaSummary,
  EVENT_SCHEMAS
} from '../../lib/event-schema.js';

describe('Event Schema', () => {
  describe('event types', () => {
    it('should have learning domain events', () => {
      expect(EVENT_SCHEMAS['training.started']).toBeDefined();
      expect(EVENT_SCHEMAS['training.paused']).toBeDefined();
      expect(EVENT_SCHEMAS['training.completed']).toBeDefined();
      expect(EVENT_SCHEMAS['mastery.improved']).toBeDefined();
      expect(EVENT_SCHEMAS['challenge.started']).toBeDefined();
      expect(EVENT_SCHEMAS['challenge.completed']).toBeDefined();
    });

    it('should have provider domain events', () => {
      expect(EVENT_SCHEMAS['provider.selected']).toBeDefined();
      expect(EVENT_SCHEMAS['provider.query.started']).toBeDefined();
      expect(EVENT_SCHEMAS['provider.query.completed']).toBeDefined();
      expect(EVENT_SCHEMAS['provider.budget.exceeded']).toBeDefined();
      expect(EVENT_SCHEMAS['provider.priority.changed']).toBeDefined();
    });

    it('should have orchestration domain events', () => {
      expect(EVENT_SCHEMAS['intent.created']).toBeDefined();
      expect(EVENT_SCHEMAS['dag.built']).toBeDefined();
      expect(EVENT_SCHEMAS['task.executed']).toBeDefined();
      expect(EVENT_SCHEMAS['screen.captured']).toBeDefined();
    });

    it('should have integration domain events', () => {
      expect(EVENT_SCHEMAS['oauth.started']).toBeDefined();
      expect(EVENT_SCHEMAS['oauth.completed']).toBeDefined();
      expect(EVENT_SCHEMAS['github.connected']).toBeDefined();
      expect(EVENT_SCHEMAS['github.sync.started']).toBeDefined();
      expect(EVENT_SCHEMAS['github.issue.synced']).toBeDefined();
      expect(EVENT_SCHEMAS['webhook.received']).toBeDefined();
    });

    it('should have analytics domain events', () => {
      expect(EVENT_SCHEMAS['learning.velocity.calculated']).toBeDefined();
      expect(EVENT_SCHEMAS['badge.earned']).toBeDefined();
      expect(EVENT_SCHEMAS['milestone.reached']).toBeDefined();
      expect(EVENT_SCHEMAS['engagement.tracked']).toBeDefined();
    });

    it('should have product domain events', () => {
      expect(EVENT_SCHEMAS['workflow.created']).toBeDefined();
      expect(EVENT_SCHEMAS['artifact.generated']).toBeDefined();
    });

    it('should have context domain events', () => {
      expect(EVENT_SCHEMAS['context.loaded']).toBeDefined();
    });

    it('should have design domain events', () => {
      expect(EVENT_SCHEMAS['design.component.updated']).toBeDefined();
    });
  });

  describe('validation', () => {
    it('should validate event with all required fields', () => {
      const valid = () => {
        validateEvent('training.started', {
          userId: 'user_1',
          campId: 'dsa',
          topic: 'arrays'
        });
      };

      expect(valid).not.toThrow();
    });

    it('should reject event missing required field', () => {
      const invalid = () => {
        validateEvent('training.started', {
          userId: 'user_1',
          campId: 'dsa'
          // Missing 'topic'
        });
      };

      expect(invalid).toThrow('missing required field: topic');
    });

    it('should reject unknown event type', () => {
      const invalid = () => {
        validateEvent('unknown.event', {});
      };

      expect(invalid).toThrow('Unknown event type');
    });

    it('should accept optional fields', () => {
      const valid = () => {
        validateEvent('training.paused', {
          userId: 'user_1',
          campId: 'dsa',
          reason: 'user requested'
        });
      };

      expect(valid).not.toThrow();
    });

    it('should warn about unknown fields', () => {
      let warned = false;
      const originalWarn = console.warn;
      console.warn = () => { warned = true; };

      validateEvent('training.started', {
        userId: 'user_1',
        campId: 'dsa',
        topic: 'arrays',
        unknownField: 'value'
      });

      console.warn = originalWarn;
      expect(warned).toBe(true);
    });
  });

  describe('event creation', () => {
    it('should create valid event', () => {
      const event = createEvent('training.started', 'user_1', {
        userId: 'user_1',
        campId: 'dsa',
        topic: 'arrays'
      });

      expect(event).toBeDefined();
      expect(event.id).toBeDefined();
      expect(event.type).toBe('training.started');
      expect(event.aggregateId).toBe('user_1');
      expect(event.timestamp).toBeDefined();
      expect(event.data.topic).toBe('arrays');
    });

    it('should generate unique event ID', () => {
      const event1 = createEvent('training.started', 'user_1', {
        userId: 'user_1',
        campId: 'camp1',
        topic: 'topic1'
      });

      const event2 = createEvent('training.started', 'user_2', {
        userId: 'user_2',
        campId: 'camp2',
        topic: 'topic2'
      });

      expect(event1.id).not.toBe(event2.id);
    });

    it('should set timestamp', () => {
      const before = Date.now();
      const event = createEvent('training.started', 'user_1', {
        userId: 'user_1',
        campId: 'camp',
        topic: 'topic'
      });
      const after = Date.now();

      expect(event.timestamp).toBeGreaterThanOrEqual(before);
      expect(event.timestamp).toBeLessThanOrEqual(after);
    });

    it('should include metadata', () => {
      const event = createEvent('training.started', 'user_1', {
        userId: 'user_1',
        campId: 'camp',
        topic: 'topic'
      });

      expect(event.metadata).toBeDefined();
      expect(event.metadata.createdBy).toBeDefined();
      expect(event.metadata.environment).toBeDefined();
    });

    it('should throw on invalid event creation', () => {
      const invalid = () => {
        createEvent('training.started', 'user_1', {
          userId: 'user_1'
          // Missing required fields
        });
      };

      expect(invalid).toThrow();
    });
  });

  describe('schema retrieval', () => {
    it('should get schema for event type', () => {
      const schema = getEventSchema('training.started');
      expect(schema).toBeDefined();
      expect(schema.domain).toBe('learning');
      expect(schema.requiredFields).toBeDefined();
      expect(schema.optionalFields).toBeDefined();
    });

    it('should throw on unknown event type', () => {
      const invalid = () => {
        getEventSchema('unknown.event');
      };

      expect(invalid).toThrow('Unknown event type');
    });

    it('should show event domain', () => {
      const schema = getEventSchema('provider.selected');
      expect(schema.domain).toBe('provider');
    });

    it('should show event description', () => {
      const schema = getEventSchema('badge.earned');
      expect(schema.description).toBeDefined();
      expect(schema.description.length).toBeGreaterThan(0);
    });
  });

  describe('domain queries', () => {
    it('should get all events by domain', () => {
      const learningEvents = getEventsByDomain('learning');
      expect(Array.isArray(learningEvents)).toBe(true);
      expect(learningEvents.length).toBeGreaterThan(0);
      expect(learningEvents).toContain('training.started');
      expect(learningEvents).toContain('mastery.improved');
    });

    it('should return empty array for unknown domain', () => {
      const unknownDomain = getEventsByDomain('unknown');
      expect(Array.isArray(unknownDomain)).toBe(true);
      expect(unknownDomain.length).toBe(0);
    });

    it('should have events in each domain', () => {
      const domains = ['learning', 'provider', 'orchestration', 'integration', 'analytics', 'product', 'context', 'design'];

      domains.forEach(domain => {
        const events = getEventsByDomain(domain);
        expect(events.length).toBeGreaterThan(0);
      });
    });
  });

  describe('type enumeration', () => {
    it('should get all event types', () => {
      const allTypes = getAllEventTypes();
      expect(Array.isArray(allTypes)).toBe(true);
      expect(allTypes.length).toBeGreaterThanOrEqual(25);
    });

    it('should include all domains in types', () => {
      const allTypes = getAllEventTypes();
      const domains = new Set(allTypes.map(type => type.split('.')[0]));

      expect(domains.has('training')).toBe(true);
      expect(domains.has('provider')).toBe(true);
      expect(domains.has('oauth')).toBe(true);
      expect(domains.has('badge')).toBe(true);
    });
  });

  describe('schema summary', () => {
    it('should generate schema summary', () => {
      const summary = getSchemaSummary();
      expect(summary).toBeDefined();
      expect(Object.keys(summary).length).toBeGreaterThan(0);
    });

    it('should organize by domain', () => {
      const summary = getSchemaSummary();
      expect(summary.learning).toBeDefined();
      expect(summary.provider).toBeDefined();
      expect(summary.orchestration).toBeDefined();
      expect(summary.integration).toBeDefined();
      expect(summary.analytics).toBeDefined();
    });

    it('should include event details', () => {
      const summary = getSchemaSummary();
      const learningEvents = summary.learning;

      expect(Array.isArray(learningEvents)).toBe(true);
      expect(learningEvents[0].type).toBeDefined();
      expect(learningEvents[0].description).toBeDefined();
      expect(learningEvents[0].requiredFields).toBeDefined();
      expect(learningEvents[0].optionalFields).toBeDefined();
    });

    it('should have correct counts', () => {
      const summary = getSchemaSummary();
      const totalEvents = Object.values(summary).reduce((sum, events) => sum + events.length, 0);

      expect(totalEvents).toBeGreaterThanOrEqual(20);
    });
  });

  describe('provider events', () => {
    it('should have provider.selected with correct fields', () => {
      const schema = getEventSchema('provider.selected');
      expect(schema.requiredFields).toContain('userId');
      expect(schema.requiredFields).toContain('providerId');
      expect(schema.requiredFields).toContain('model');
    });

    it('should have provider.budget.exceeded with correct fields', () => {
      const schema = getEventSchema('provider.budget.exceeded');
      expect(schema.requiredFields).toContain('providerId');
      expect(schema.requiredFields).toContain('dailyBudget');
    });
  });

  describe('github events', () => {
    it('should have github.connected event', () => {
      const event = createEvent('github.connected', 'user_1', {
        userId: 'user_1',
        githubUsername: 'octocat'
      });

      expect(event.type).toBe('github.connected');
      expect(event.data.githubUsername).toBe('octocat');
    });

    it('should have github.issue.synced event', () => {
      const event = createEvent('github.issue.synced', 'user_1', {
        userId: 'user_1',
        repoId: 'repo123',
        issueId: 'issue456'
      });

      expect(event.data.repoId).toBe('repo123');
      expect(event.data.issueId).toBe('issue456');
    });
  });

  describe('analytics events', () => {
    it('should have badge.earned event', () => {
      const event = createEvent('badge.earned', 'user_1', {
        userId: 'user_1',
        badgeId: 'badge1',
        badgeName: 'Coding Warrior'
      });

      expect(event.data.badgeName).toBe('Coding Warrior');
    });

    it('should have milestone.reached event', () => {
      const event = createEvent('milestone.reached', 'user_1', {
        userId: 'user_1',
        milestoneId: 'milestone1',
        milestoneName: 'First 100 Challenges'
      });

      expect(event.data.milestoneName).toBe('First 100 Challenges');
    });
  });
});
