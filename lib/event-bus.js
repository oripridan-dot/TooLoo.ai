/**
 * Event Bus - SQLite WAL-backed event store
 * 
 * Provides:
 * - Event emission with deduplication
 * - Event subscription/consumer pattern
 * - Event replay capability
 * - Async event processing
 */

import sqlite3 from 'sqlite3';
import { v4 as uuid } from 'uuid';
import crypto from 'crypto';
import { EventEmitter } from 'events';

class EventBus extends EventEmitter {
  constructor(dbPath = './data/events.db') {
    super();
    this.dbPath = dbPath;
    this.db = null;
    this.subscribers = new Map();
    this.processedEvents = new Map(); // For deduplication
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) reject(err);
        else {
          // Enable WAL mode
          this.db.run('PRAGMA journal_mode=WAL', (err) => {
            if (err) {
              reject(err);
              return;
            }
            
            // Create tables
            this.db.serialize(() => {
              // Events table - immutable event log
              this.db.run(`
                CREATE TABLE IF NOT EXISTS events (
                  id TEXT PRIMARY KEY,
                  type TEXT NOT NULL,
                  aggregate_id TEXT NOT NULL,
                  timestamp INTEGER NOT NULL,
                  data TEXT NOT NULL,
                  metadata TEXT,
                  event_hash TEXT UNIQUE NOT NULL,
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
              `, (err) => {
                if (err) console.error('Failed to create events table:', err);
              });

              // Event consumers - track which events each service has processed
              this.db.run(`
                CREATE TABLE IF NOT EXISTS consumers (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  service_name TEXT NOT NULL,
                  event_type TEXT,
                  last_processed_event_id TEXT,
                  last_processed_at DATETIME,
                  UNIQUE(service_name, event_type)
                )
              `, (err) => {
                if (err) console.error('Failed to create consumers table:', err);
              });

              // Indices for performance
              this.db.run('CREATE INDEX IF NOT EXISTS idx_events_type ON events(type)', (err) => {
                if (err) console.error('Failed to create type index:', err);
              });

              this.db.run('CREATE INDEX IF NOT EXISTS idx_events_aggregate ON events(aggregate_id)', (err) => {
                if (err) console.error('Failed to create aggregate index:', err);
              });

              this.db.run('CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp)', (err) => {
                if (err) console.error('Failed to create timestamp index:', err);
              });

              resolve();
            });
          });
        }
      });
    });
  }

  /**
   * Calculate hash of event for deduplication
   */
  _calculateEventHash(type, aggregateId, data) {
    const str = JSON.stringify({ type, aggregateId, data });
    return crypto.createHash('sha256').update(str).digest('hex');
  }

  /**
   * Emit an event to the bus
   * @param {object} event - Event object with type, aggregateId, data
   * @returns {Promise<string>} Event ID
   */
  async emit(event) {
    if (!event.type || !event.aggregateId) {
      throw new Error('Event must have type and aggregateId');
    }

    const eventId = event.id || uuid();
    const timestamp = event.timestamp || Date.now();
    const eventHash = this._calculateEventHash(event.type, event.aggregateId, event.data);

    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO events (id, type, aggregate_id, timestamp, data, metadata, event_hash) 
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(event_hash) DO NOTHING`,
        [
          eventId,
          event.type,
          event.aggregateId,
          timestamp,
          JSON.stringify(event.data || {}),
          JSON.stringify(event.metadata || {}),
          eventHash
        ],
        (err) => {
          if (err) {
            reject(err);
            return;
          }

          // Notify subscribers
          this._notifySubscribers(event.type, {
            id: eventId,
            type: event.type,
            aggregateId: event.aggregateId,
            timestamp,
            data: event.data,
            metadata: event.metadata
          });

          resolve(eventId);
        }
      );
    });
  }

  /**
   * Subscribe to events of specific types
   * @param {string} serviceName - Service subscribing
   * @param {string[]} eventTypes - Event types to subscribe to
   * @param {function} callback - Callback function(event)
   */
  subscribe(serviceName, eventTypes, callback) {
    if (!Array.isArray(eventTypes)) {
      eventTypes = [eventTypes];
    }

    const subId = `${serviceName}:${eventTypes.join(',')}`;
    
    if (!this.subscribers.has(subId)) {
      this.subscribers.set(subId, []);
    }

    const subscriber = { serviceName, eventTypes, callback };
    this.subscribers.get(subId).push(subscriber);

    // Notify of past events since last checkpoint
    this._replayEventsForSubscriber(serviceName, eventTypes, callback).catch(err => {
      console.error(`Failed to replay events for ${serviceName}:`, err);
    });

    return () => {
      // Unsubscribe function
      const subs = this.subscribers.get(subId);
      const idx = subs.indexOf(subscriber);
      if (idx > -1) subs.splice(idx, 1);
    };
  }

  /**
   * Notify all subscribers of a new event
   */
  _notifySubscribers(eventType, event) {
    this.subscribers.forEach((subs) => {
      subs.forEach(sub => {
        if (sub.eventTypes.includes(eventType) || sub.eventTypes.includes('*')) {
          try {
            sub.callback(event);
          } catch (err) {
            console.error(`Error in subscriber callback for ${sub.serviceName}:`, err);
          }
        }
      });
    });
  }

  /**
   * Replay past events for a subscriber
   */
  async _replayEventsForSubscriber(serviceName, eventTypes, callback) {
    return new Promise((resolve, reject) => {
      // Get last processed event for this service
      this.db.get(
        `SELECT last_processed_event_id FROM consumers 
         WHERE service_name = ? AND event_type IN (${eventTypes.map(() => '?').join(',')})
         ORDER BY last_processed_at DESC LIMIT 1`,
        [serviceName, ...eventTypes],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }

          const afterId = row?.last_processed_event_id;

          // Get events since last processed
          const query = afterId
            ? `SELECT * FROM events WHERE type IN (${eventTypes.map(() => '?').join(',')}) 
               AND id > ? ORDER BY timestamp ASC`
            : `SELECT * FROM events WHERE type IN (${eventTypes.map(() => '?').join(',')}) 
               ORDER BY timestamp ASC`;

          const params = afterId ? [...eventTypes, afterId] : eventTypes;

          this.db.all(query, params, (err, rows) => {
            if (err) {
              reject(err);
              return;
            }

            rows?.forEach(row => {
              try {
                callback({
                  id: row.id,
                  type: row.type,
                  aggregateId: row.aggregate_id,
                  timestamp: row.timestamp,
                  data: JSON.parse(row.data),
                  metadata: JSON.parse(row.metadata || '{}')
                });
              } catch (e) {
                console.error('Error replaying event:', e);
              }
            });

            resolve();
          });
        }
      );
    });
  }

  /**
   * Get all events of a specific type
   */
  async getEventsByType(type) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM events WHERE type = ? ORDER BY timestamp ASC',
        [type],
        (err, rows) => {
          if (err) {
            reject(err);
            return;
          }

          const events = (rows || []).map(row => ({
            id: row.id,
            type: row.type,
            aggregateId: row.aggregate_id,
            timestamp: row.timestamp,
            data: JSON.parse(row.data),
            metadata: JSON.parse(row.metadata || '{}')
          }));

          resolve(events);
        }
      );
    });
  }

  /**
   * Get all events for an aggregate
   */
  async getEventsByAggregate(aggregateId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM events WHERE aggregate_id = ? ORDER BY timestamp ASC',
        [aggregateId],
        (err, rows) => {
          if (err) {
            reject(err);
            return;
          }

          const events = (rows || []).map(row => ({
            id: row.id,
            type: row.type,
            aggregateId: row.aggregate_id,
            timestamp: row.timestamp,
            data: JSON.parse(row.data),
            metadata: JSON.parse(row.metadata || '{}')
          }));

          resolve(events);
        }
      );
    });
  }

  /**
   * Get all events with optional filtering
   */
  async getAllEvents(filter = {}) {
    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM events WHERE 1=1';
      const params = [];

      if (filter.type) {
        query += ' AND type = ?';
        params.push(filter.type);
      }

      if (filter.aggregateId) {
        query += ' AND aggregate_id = ?';
        params.push(filter.aggregateId);
      }

      if (filter.fromTimestamp) {
        query += ' AND timestamp >= ?';
        params.push(filter.fromTimestamp);
      }

      if (filter.toTimestamp) {
        query += ' AND timestamp <= ?';
        params.push(filter.toTimestamp);
      }

      query += ' ORDER BY timestamp ASC';

      if (filter.limit) {
        query += ' LIMIT ?';
        params.push(filter.limit);
      }

      this.db.all(query, params, (err, rows) => {
        if (err) {
          reject(err);
          return;
        }

        const events = (rows || []).map(row => ({
          id: row.id,
          type: row.type,
          aggregateId: row.aggregate_id,
          timestamp: row.timestamp,
          data: JSON.parse(row.data),
          metadata: JSON.parse(row.metadata || '{}')
        }));

        resolve(events);
      });
    });
  }

  /**
   * Mark an event as processed by a service
   */
  async markAsProcessed(serviceName, eventType, eventId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO consumers (service_name, event_type, last_processed_event_id, last_processed_at)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(service_name, event_type) 
         DO UPDATE SET last_processed_event_id = ?, last_processed_at = CURRENT_TIMESTAMP`,
        [serviceName, eventType, eventId, eventId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  /**
   * Get statistics
   */
  async getStats() {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT COUNT(*) as total_events FROM events',
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }

          this.db.all(
            'SELECT type, COUNT(*) as count FROM events GROUP BY type ORDER BY count DESC',
            (err, typeRows) => {
              if (err) {
                reject(err);
                return;
              }

              resolve({
                totalEvents: row?.total_events || 0,
                eventsByType: typeRows || []
              });
            }
          );
        }
      );
    });
  }

  /**
   * Close the database connection
   */
  async close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

export default EventBus;
