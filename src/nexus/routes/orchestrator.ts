// @version 3.3.450 - Added vision integration endpoints
import { Router } from 'express';
import { request } from '../utils.js';

const router = Router();

// Initialize
router.post('/initialize', (req, res) => {
  request('nexus:orchestrator_init', req.body, res);
});

// Status
router.get('/status', (req, res) => {
  request('nexus:orchestrator_status', {}, res);
});

// Capability Map
router.get('/capability-map', (req, res) => {
  request('nexus:orchestrator_map', {}, res);
});

// Enable Autonomous
router.post('/enable-autonomous', (req, res) => {
  request('nexus:orchestrator_enable', req.body, res);
});

// Activate Cycle
router.post('/activate/cycle', (req, res) => {
  request('nexus:orchestrator_cycle', req.body, res);
});

// Add to Queue
router.post('/queue/add', (req, res) => {
  const { goal } = req.body;
  request('nexus:orchestrator_plan_update', { action: 'add', item: goal }, res);
});

// ============= Vision Integration (V3.3.450) =============

/**
 * POST /orchestrator/vision/enable
 * Enable/disable vision context for task execution
 * 
 * Body:
 * - enabled: boolean - Enable vision integration
 * - url: string (optional) - Initial URL to capture context from
 */
router.post('/vision/enable', (req, res) => {
  const { enabled, url } = req.body;
  request('nexus:orchestrator_vision', { enabled, url }, res);
});

/**
 * POST /orchestrator/vision/capture
 * Capture vision context from a URL
 * 
 * Body:
 * - url: string - URL to capture and extract text from
 */
router.post('/vision/capture', (req, res) => {
  const { url } = req.body;
  request('nexus:orchestrator_vision_capture', { url }, res);
});

export default router;
