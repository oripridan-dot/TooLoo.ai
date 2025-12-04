// @version 2.1.28
import { Router } from 'express';
import { bus } from '../../core/event-bus.js';
import { request } from '../utils.js';

const router = Router();

// Helper for Event Bus Request/Response (Duplicated from api.ts for now, should be shared util)
const capabilityRequest = (event: string, payload: any, res: any, timeout = 5000) => {
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const listener = (evt: any) => {
    if (evt.payload.requestId === requestId) {
      if (evt.payload.error) {
        res.status(evt.payload.status || 500).json({ error: evt.payload.error });
      } else {
        res.json(evt.payload.data || evt.payload.response);
      }
      bus.off('cortex:response', listener);
    }
  };

  bus.on('cortex:response', listener);

  bus.publish('nexus', event, { ...payload, requestId });

  setTimeout(() => {
    bus.off('cortex:response', listener);
    if (!res.headersSent) {
      res.status(504).json({ error: 'Request timed out' });
    }
  }, timeout);
};

// List Discovered Capabilities
router.get('/discovered', (req, res) => {
  capabilityRequest('nexus:capabilities_list', {}, res);
});

// Get Status
router.get('/status', (req, res) => {
  capabilityRequest('nexus:capabilities_status', {}, res);
});

// Activate Capability
router.post('/activate', (req, res) => {
  capabilityRequest('nexus:capabilities_activate', req.body, res);
});

export default router;
