// @version 3.3.575
/**
 * @file Execution routes (turn plan into code)
 * @version 1.1.0
 * @skill-os true
 */

import { Router } from 'express';
import { z } from 'zod';
import { genesisEventHub } from '../state/genesis-event-hub.js';
import { learningLedger } from '../state/learning-ledger.js';
import { approvePlan, createSession, getSession, setExecution, setPlanBundle, setPhase } from '../state/session-store.js';
import { scaffoldWebApp } from '../services/executor.js';
import { evaluatePlanningGates } from '../services/gates.js';
import { generatePlanBundle } from '../services/planner.js';

const router: import('express').Router = Router();

const DemoExecuteSchema = z
  .object({
    prompt: z.string().min(10).optional(),
    mode: z.enum(['coach', 'producer']).optional(),
    // Override any required coverage keys (useful for debugging)
    coverage: z
      .record(z.string(), z.union([z.string(), z.null()]))
      .optional(),
  })
  .strict();

/**
 * One-click verification endpoint.
 * Creates a new session, generates a deterministic plan bundle, auto-approves it,
 * and scaffolds a real project on disk.
 */
router.post('/ade/demo/execute', async (req, res) => {
  const parse = DemoExecuteSchema.safeParse(req.body ?? {});
  if (!parse.success) {
    return res.status(400).json({ error: 'Invalid request', issues: parse.error.issues });
  }

  const prompt =
    parse.data.prompt ??
    'Demo: generate a tiny React + Vite + TS web app scaffold with a simple home screen.';

  const mode = parse.data.mode ?? 'producer';

  // Minimal coverage to pass the deterministic gates.
  const coverage: Record<string, string | null | undefined> = {
    learner_age: '9–11',
    device_target: 'Web (tablet)',
    session_length: '10 min',
    voice_strategy: 'TTS now (placeholders)',
    parent_role: 'Weekly review + approve content',
    safety_mode: 'Kid-safe strict',
    ...(parse.data.coverage ?? {}),
  };

  const s = createSession({ prompt, mode });
  genesisEventHub.emit('genesis:mission:created', { mode, demo: true }, { sessionId: String(s.sessionId) });
  void learningLedger.record({ type: 'mission:created', sessionId: String(s.sessionId), payload: { mode, demo: true } });

  // Generate plan bundle deterministically.
  setPhase(s, 'plan');
  const { gates, readinessScore } = evaluatePlanningGates({ coverage, hasPlan: false, approved: false });
  const bundle = generatePlanBundle({ revision: 1, missionPrompt: s.missionPrompt, coverage, gates, readinessScore });
  setPlanBundle(s, bundle);
  genesisEventHub.emit('genesis:plan:generated', { revision: bundle.revision, readinessScore, demo: true }, { sessionId: String(s.sessionId) });
  void learningLedger.record({
    type: 'plan:generated',
    sessionId: String(s.sessionId),
    payload: { revision: bundle.revision, readinessScore, demo: true },
  });

  // Auto-approve so execution can proceed.
  approvePlan(s);
  genesisEventHub.emit('genesis:plan:approved', { revision: bundle.revision, demo: true }, { sessionId: String(s.sessionId) });
  void learningLedger.record({ type: 'plan:approved', sessionId: String(s.sessionId), payload: { revision: bundle.revision, demo: true } });

  // Run execution (real file system writes).
  setExecution(s, { status: 'running', startedAt: Date.now(), steps: [{ ts: Date.now(), label: 'start', detail: 'demo:web' }] });
  genesisEventHub.emit('genesis:exec:started', { kind: 'web', demo: true }, { sessionId: String(s.sessionId) });
  void learningLedger.record({ type: 'exec:started', sessionId: String(s.sessionId), payload: { kind: 'web', demo: true } });

  try {
    genesisEventHub.emit('genesis:exec:step', { label: 'scaffold', detail: 'Generating Vite + React + TS project (demo)' }, { sessionId: String(s.sessionId) });

    const result = await scaffoldWebApp({
      sessionId: String(s.sessionId),
      missionPrompt: s.missionPrompt,
      planBundle: bundle,
    });

    setExecution(s, {
      status: 'done',
      startedAt: s.execution?.startedAt,
      finishedAt: Date.now(),
      projectPath: result.projectPath,
      steps: [
        ...(s.execution?.steps ?? []),
        { ts: Date.now(), label: 'scaffold:done', detail: `${result.filesWritten.length} files` },
      ],
    });

    genesisEventHub.emit(
      'genesis:exec:completed',
      { kind: 'web', projectPath: result.projectPath, files: result.filesWritten, demo: true },
      { sessionId: String(s.sessionId) },
    );

    void learningLedger.record({
      type: 'exec:completed',
      sessionId: String(s.sessionId),
      payload: { kind: 'web', projectPath: result.projectPath, filesWritten: result.filesWritten.length, demo: true },
    });

    res.json({
      ok: true,
      demo: true,
      projectPath: result.projectPath,
      filesWritten: result.filesWritten,
      session: s,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);

    setExecution(s, {
      status: 'error',
      startedAt: s.execution?.startedAt,
      finishedAt: Date.now(),
      lastError: msg,
      steps: [...(s.execution?.steps ?? []), { ts: Date.now(), label: 'error', detail: msg }],
    });

    genesisEventHub.emit('genesis:exec:error', { kind: 'web', error: msg, demo: true }, { sessionId: String(s.sessionId) });
    void learningLedger.record({ type: 'exec:error', sessionId: String(s.sessionId), payload: { kind: 'web', error: msg, demo: true } });
    res.status(500).json({ error: 'Execution failed', detail: msg });
  }
});

router.post('/ade/session/:id/approve', (req, res) => {
  const s = getSession(req.params.id);
  if (!s) return res.status(404).json({ error: 'Not found' });

  if (!s.planBundle) {
    return res.status(400).json({ error: 'No plan bundle to approve yet' });
  }

  approvePlan(s);
  genesisEventHub.emit('genesis:plan:approved', { revision: s.planBundle.revision }, { sessionId: String(s.sessionId) });
  void learningLedger.record({
    type: 'plan:approved',
    sessionId: String(s.sessionId),
    payload: { revision: s.planBundle.revision },
  });

  res.json(s);
});

const ExecuteStartSchema = z
  .object({
    kind: z.enum(['web']).optional(),
  })
  .strict();

router.post('/ade/session/:id/execute/start', async (req, res) => {
  const parse = ExecuteStartSchema.safeParse(req.body ?? {});
  if (!parse.success) {
    return res.status(400).json({ error: 'Invalid request', issues: parse.error.issues });
  }

  const s = getSession(req.params.id);
  if (!s) return res.status(404).json({ error: 'Not found' });
  if (!s.planBundle) return res.status(400).json({ error: 'No plan bundle yet' });
  if (!s.approvedAt) return res.status(423).json({ error: 'Execution locked: approve plan first' });

  const kind = parse.data.kind ?? 'web';

  if (s.execution?.status === 'running') {
    return res.status(409).json({ error: 'Execution already running' });
  }

  setExecution(s, { status: 'running', startedAt: Date.now(), steps: [{ ts: Date.now(), label: 'start', detail: kind }] });
  genesisEventHub.emit('genesis:exec:started', { kind }, { sessionId: String(s.sessionId) });
  void learningLedger.record({ type: 'exec:started', sessionId: String(s.sessionId), payload: { kind } });

  try {
    genesisEventHub.emit('genesis:exec:step', { label: 'scaffold', detail: 'Generating Vite + React + TS project' }, { sessionId: String(s.sessionId) });

    const result = await scaffoldWebApp({
      sessionId: String(s.sessionId),
      missionPrompt: s.missionPrompt,
      planBundle: s.planBundle,
    });

    setExecution(s, {
      status: 'done',
      startedAt: s.execution?.startedAt,
      finishedAt: Date.now(),
      projectPath: result.projectPath,
      steps: [
        ...(s.execution?.steps ?? []),
        { ts: Date.now(), label: 'scaffold:done', detail: `${result.filesWritten.length} files` },
      ],
    });

    genesisEventHub.emit(
      'genesis:exec:completed',
      { kind, projectPath: result.projectPath, files: result.filesWritten },
      { sessionId: String(s.sessionId) },
    );

    void learningLedger.record({
      type: 'exec:completed',
      sessionId: String(s.sessionId),
      payload: { kind, projectPath: result.projectPath, filesWritten: result.filesWritten.length },
    });

    res.json(s);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);

    setExecution(s, {
      status: 'error',
      startedAt: s.execution?.startedAt,
      finishedAt: Date.now(),
      lastError: msg,
      steps: [
        ...(s.execution?.steps ?? []),
        { ts: Date.now(), label: 'error', detail: msg },
      ],
    });

    genesisEventHub.emit('genesis:exec:error', { kind, error: msg }, { sessionId: String(s.sessionId) });
    void learningLedger.record({ type: 'exec:error', sessionId: String(s.sessionId), payload: { kind, error: msg } });
    res.status(500).json({ error: 'Execution failed', detail: msg });
  }
});

router.get('/ade/session/:id/execute/status', (req, res) => {
  const s = getSession(req.params.id);
  if (!s) return res.status(404).json({ error: 'Not found' });
  res.json({ sessionId: s.sessionId, approvedAt: s.approvedAt, execution: s.execution ?? { status: 'idle' } });
});

export default router;
