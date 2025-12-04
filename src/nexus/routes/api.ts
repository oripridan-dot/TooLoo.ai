// @version 2.2.196
import { Router } from 'express';
import { bus } from '../../core/event-bus.js';
import { request, successResponse, errorResponse } from '../utils.js';

const router = Router();

// Metadata Middleware
router.use((req, res, next) => {
  const intent = req.headers['x-intent'] || req.body.intent || 'unknown';
  const reason = req.headers['x-reason'] || req.body.reason || 'user_request';

  // Attach to request body for downstream use if not already present
  if (!req.body.metadata) {
    req.body.metadata = {};
  }
  req.body.metadata.intent = intent;
  req.body.metadata.reason = reason;

  next();
});

// Health Check
router.get('/health', (req, res) => {
  res.json(successResponse({ status: 'ok', system: 'Synapsys', module: 'nexus' }));
});

// Generate endpoint (used by ToolooMonitor)
router.post('/generate', (req, res) => {
  const { prompt, context } = req.body;
  request(
    'nexus:chat_request',
    {
      message: prompt,
      context,
      responseType: 'generation',
    },
    res,
    60000
  );
});

// Chat Message Endpoint
router.post('/chat/message', (req, res) => {
  request('nexus:chat_request', req.body, res, 30000);
});

// Projects Endpoints
router.get('/projects', (req, res) => {
  request('nexus:project_list_request', {}, res);
});

router.post('/projects', (req, res) => {
  request('nexus:project_create_request', req.body, res);
});

router.get('/projects/:id', (req, res) => {
  request('nexus:project_details_request', { projectId: req.params.id }, res);
});

router.post('/projects/:id/memory', (req, res) => {
  request('nexus:project_memory_update', { projectId: req.params.id, ...req.body }, res);
});

// Intervention Endpoints
router.post('/intervention/mode', (req, res) => {
  // { enabled: boolean }
  bus.publish('nexus', 'nexus:intervention:set_mode', req.body);
  res.json(
    successResponse({
      mode: req.body.enabled ? 'intervention' : 'autonomous',
    })
  );
});

router.post('/intervention/pause', (req, res) => {
  bus.publish('nexus', 'nexus:intervention:pause', {});
  res.json(successResponse({ status: 'paused' }));
});

router.post('/intervention/resume', (req, res) => {
  bus.publish('nexus', 'nexus:intervention:resume', {});
  res.json(successResponse({ status: 'resumed' }));
});

export default router;
