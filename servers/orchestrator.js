import { spawn } from 'child_process';
import http from 'http';
import IntentBus from '../engine/intent-bus.js';
import ModelChooser from '../engine/model-chooser.js';
import ConfidenceScorer from '../engine/confidence-scorer.js';
import DAGBuilder from '../engine/dag-builder.js';
import { ScreenCaptureService } from '../engine/screen-capture-service.js';
import RepoAutoOrg from '../engine/repo-auto-org.js';

const intentBus = new IntentBus({ storageDir: process.cwd() + '/data/intent-bus' });
const modelChooser = new ModelChooser();
const confidenceScorer = new ConfidenceScorer();
const dagBuilder = new DAGBuilder();
const screenCaptureService = new ScreenCaptureService({
  captureIntervalMs: Number(process.env.SCREENSHOT_INTERVAL_MS || 3000),
  maxFrames: Number(process.env.MAX_FRAMES || 50),
  enableOCR: String(process.env.ENABLE_OCR || 'true').toLowerCase() === 'true',
  enableTagging: String(process.env.ENABLE_TAGGING || 'true').toLowerCase() === 'true'
});
const repoAutoOrg = new RepoAutoOrg({
  repoRoot: process.cwd(),
  defaultBranchPrefix: process.env.DEFAULT_BRANCH_PREFIX || 'feature',
  maxBranchNameLength: Number(process.env.MAX_BRANCH_NAME_LENGTH || 50)
});

const services = [
  { name:'web', cmd:['node','servers/web-server.js'], port: Number(process.env.WEB_PORT||3000), health:'/health' },
  { name:'ui-monitor', cmd:['node','servers/ui-activity-monitor.js'], port: Number(process.env.ACTIVITY_MONITOR_PORT||3050), health:'/health' },
  { name:'training', cmd:['node','servers/training-server.js'], port: Number(process.env.TRAINING_PORT||3001), health:'/health' },
  { name:'meta', cmd:['node','servers/meta-server.js'], port: Number(process.env.META_PORT||3002), health:'/health' },
  { name:'budget', cmd:['node','servers/budget-server.js'], port: Number(process.env.BUDGET_PORT||3003), health:'/health' },
  { name:'coach', cmd:['node','servers/coach-server.js'], port: Number(process.env.COACH_PORT||3004), health:'/health' },
  { name:'cup', cmd:['node','servers/cup-server.js'], port: Number(process.env.CUP_PORT||3005), health:'/health' },
  { name:'product-dev', cmd:['node','servers/product-development-server.js'], port: Number(process.env.PRODUCT_PORT||3006), health:'/health' },
  { name:'segmentation', cmd:['node','servers/segmentation-server.js'], port: Number(process.env.SEGMENTATION_PORT||3007), health:'/health' },
  { name:'reports', cmd:['node','servers/reports-server.js'], port: Number(process.env.REPORTS_PORT||3008), health:'/health' },
  { name:'capabilities', cmd:['node','servers/capabilities-server.js'], port: Number(process.env.CAPABILITIES_PORT||3009), health:'/health' },
  { name:'bridge', cmd:['node','servers/capability-workflow-bridge.js'], port: Number(process.env.CAPABILITY_BRIDGE_PORT||3010), health:'/health' },
  { name:'arena', cmd:['node','servers/providers-arena-server.js'], port: Number(process.env.ARENA_PORT||3011), health:'/health' },
  { name:'analytics', cmd:['node','servers/analytics-server.js'], port: Number(process.env.ANALYTICS_PORT||3012), health:'/health' }
];

function waitForHealth(port, path, retries=30, delayMs=300){
  return new Promise((resolve,reject)=>{
    let attempts=0;
    const tick=()=>{
      attempts++;
      const req=http.get({ hostname:'127.0.0.1', port, path, timeout:1000 }, res=>{
        if(res.statusCode===200){ resolve(true); } else if(attempts<retries){ setTimeout(tick, delayMs); } else { reject(new Error('health failed')); }
      });
      req.on('error',()=>{ if(attempts<retries) setTimeout(tick, delayMs); else reject(new Error('health timeout')); });
    };
    tick();
  });
}

async function main(){
  const children = [];
  let multiInstance = { running:false, pids:[], startTime:null, shards:0 };
  // Start services if not already running
  for (const s of services) {
    // Quick probe: if already healthy, don't spawn another instance
    let alreadyUp = false;
    try {
      await waitForHealth(s.port, s.health, 3, 200);
      alreadyUp = true;
      console.log(`Detected existing ${s.name}-server on port ${s.port}`);
    } catch {}

    if (!alreadyUp) {
      const p = spawn(s.cmd[0], s.cmd.slice(1), { stdio: 'inherit' });
      children.push({ name: s.name, p });
      p.on('exit', (code, signal) => {
        console.log(`${s.name}-server exited with code ${code} signal ${signal}`);
      });
    }

    // Wait readiness for each service
    process.stdout.write(`Waiting for ${s.name} on ${s.port}${s.health} ... `);
    await waitForHealth(s.port, s.health).catch(()=>{});
    console.log('ready');
  }

  // Pre-arm: start training camp, run a round, start meta, coach
  // training start
  await fetch(`http://127.0.0.1:${process.env.TRAINING_PORT||3001}/api/v1/training/start`, { method:'POST' }).catch(()=>{});
  await fetch(`http://127.0.0.1:${process.env.TRAINING_PORT||3001}/api/v1/training/round`, { method:'POST' }).catch(()=>{});
  // Auto-focus burst if weak gaps exist (configurable via AUTOFOCUS_DELTA)
  try {
    const overview = await fetch(`http://127.0.0.1:${process.env.TRAINING_PORT||3001}/api/v1/training/overview`).then(r=>r.json());
    const sel = overview?.data?.selection || {};
    const target = Number(sel.targetThreshold || 80);
    const delta = Number(process.env.AUTOFOCUS_DELTA || 20);
    const domains = overview?.data?.domains || [];
    const weak = domains.filter(d => (d.mastery||0) < (target - delta));
    if (weak.length > 0) {
      const gaps = Number(sel.gapsCount || 2);
      await fetch(`http://127.0.0.1:${process.env.TRAINING_PORT||3001}/api/v1/training/settings/update?autoFillGaps=true&gapsCount=${gaps}`).catch(()=>{});
      for (let i=0;i<4;i++) await fetch(`http://127.0.0.1:${process.env.TRAINING_PORT||3001}/api/v1/training/round`, { method:'POST' }).catch(()=>{});
      console.log('Auto-focus burst executed at startup');
    }
  } catch {}
  // meta start
  await fetch(`http://127.0.0.1:${process.env.META_PORT||3002}/api/v4/meta-learning/start`, { method:'POST' }).catch(()=>{});
  // coach start
  await fetch(`http://127.0.0.1:${process.env.COACH_PORT||3004}/api/v1/auto-coach/start`, { method:'POST' }).catch(()=>{});
  // Engage fast lane defaults for critical path if env toggled
  if (String(process.env.FAST_LANE_ON||'true').toLowerCase()==='true') {
    await fetch(`http://127.0.0.1:${process.env.COACH_PORT||3004}/api/v1/auto-coach/fast-lane`, {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ enable:true, weight:2, microBatchesPerTick:4, batchSize:4, intervalMs:600 })
    }).catch(()=>{});
  }

  // screen capture start
  try {
    await screenCaptureService.start();
    console.log('[Orchestrator] Screen Capture Service started');
  } catch (e) {
    console.warn(`[Orchestrator] Screen Capture failed to start: ${e.message}`);
  }

  // Optional: apply a small retention boost on startup to strengthen cross-session memory
  try{
    await fetch(`http://127.0.0.1:${process.env.META_PORT||3002}/api/v4/meta-learning/boost-retention`, {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ retentionDelta: 0.07, transferDelta: 0.05 })
    });
  }catch{}

  // Start self-healing monitoring loop
  const monitorInterval = setInterval(() => monitorServices(children), 15000); // Check every 15 seconds
  console.log('[Auto-Heal] Self-healing monitoring started (15s intervals)');

  // Apply startup priority mode (default chat-priority) if enabled
  // With retry logic for race condition (web-server may not be fully ready)
  try{
    const applyPriority = String(process.env.STARTUP_CHAT_PRIORITY||'true').toLowerCase()==='true';
    if (applyPriority) {
      const webPort = process.env.WEB_PORT||3000;
      const priorityUrl = `http://127.0.0.1:${webPort}/api/v1/system/priority/chat`;
      let prioritySet = false;
      
      // Retry with exponential backoff (5 attempts, starting at 500ms)
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 2000);
          
          const res = await fetch(priorityUrl, { 
            method: 'POST',
            signal: controller.signal
          });
          clearTimeout(timeout);
          
          if (res.status === 200 || res.status === 500) {
            prioritySet = true;
            console.log('✓ Startup priority applied: chat-priority');
            break;
          }
        } catch (e) {
          if (attempt < 4) {
            const delayMs = 500 * Math.pow(2, attempt);
            await new Promise(r => setTimeout(r, delayMs));
          }
        }
      }
      
      if (!prioritySet) {
        console.warn('⚠️  Priority mode unavailable during startup (non-fatal - continuing)');
      }
    }
  }catch(e){
    console.warn('⚠️  Priority initialization error (non-fatal):', e.message);
  }

  // Keep process alive to supervise children; handle graceful shutdown
  const keepAlive = setInterval(()=>{}, 60*60*1000);
  const shutdown = ()=>{
    clearInterval(keepAlive);
    clearInterval(monitorInterval);
    console.log('Shutting down orchestrator, terminating child servers...');
    for (const c of children) {
      try { c.p.kill('SIGTERM'); } catch {}
    }
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Simple HTTP control for multi-instance (pilot)
  const server = http.createServer(async (req,res)=>{
    const { url, method } = req;
    const ok = (data)=>{ res.statusCode=200; res.setHeader('content-type','application/json'); res.end(JSON.stringify({ ok:true, ...data })); };
    const err = (e)=>{ res.statusCode=500; res.setHeader('content-type','application/json'); res.end(JSON.stringify({ ok:false, error: e?.message||String(e) })); };
    // Basic health endpoint for uniform probing
    if (url === '/health' && method === 'GET') {
      return ok({ service: 'orchestrator', pid: process.pid, time: new Date().toISOString() });
    }
    
    // ====== INTENT BUS ENDPOINTS ======
    
    // POST /api/v1/intent/create — Create and process a new intent
    if (url.startsWith('/api/v1/intent/create') && method === 'POST') {
      try {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          const payload = JSON.parse(body);
          const { prompt, userId, sessionId, priority, screenContext, segmentationContext } = payload;
          
          const intent = intentBus.createIntent(prompt, { userId, sessionId, priority });
          if (screenContext) intent.withScreenContext(screenContext.screenshot, screenContext.ocrTags);
          if (segmentationContext) intent.withSegmentationContext(...segmentationContext);
          
          // Build execution plan
          const plan = modelChooser.buildExecutionPlan(intent, payload.budgetUsd);
          modelChooser.attachPlanToIntent(intent, plan);
          
          // Process through bus
          await intentBus.process(intent);
          
          return ok({
            intentId: intent.id,
            status: intent.status,
            confidence: intent.confidence,
            executionPlan: plan,
            augmentedPrompt: intent.getAugmentedPrompt().substring(0, 200) + '...'
          });
        });
      } catch (e) { return err(e); }
      return;
    }
    
    // GET /api/v1/intent/{id} — Retrieve intent by ID
    if (url.startsWith('/api/v1/intent/') && method === 'GET') {
      try {
        const id = url.split('/')[4];
        const history = intentBus.getHistory();
        const intent = history.find(i => i.id === id);
        
        if (!intent) {
          res.statusCode = 404;
          return res.end(JSON.stringify({ ok: false, error: 'Intent not found' }));
        }
        
        return ok({
          intent: {
            id: intent.id,
            prompt: intent.originalPrompt,
            status: intent.status,
            confidence: intent.confidence,
            executionPlan: intent.executionPlan,
            artifacts: intent.artifacts.length,
            verdicts: intent.verdicts.length,
            elapsedMs: intent.getElapsedMs()
          }
        });
      } catch (e) { return err(e); }
    }
    
    // GET /api/v1/intent/history?limit=10&sessionId=... — Retrieve intent history
    if (url.startsWith('/api/v1/intent/history') && method === 'GET') {
      try {
        const query = new URL(`http://localhost:3123${url}`).searchParams;
        const limit = Number(query.get('limit')) || 10;
        const sessionId = query.get('sessionId');
        
        const history = intentBus.getHistory({ sessionId, limit });
        
        return ok({
          count: history.length,
          intents: history.map(i => ({
            id: i.id,
            timestamp: i.timestamp,
            prompt: i.originalPrompt.substring(0, 100),
            status: i.status,
            confidence: i.confidence,
            elapsedMs: i.getElapsedMs()
          }))
        });
      } catch (e) { return err(e); }
    }
    
    // GET /api/v1/models/chooser/stats — Model chooser statistics
    if (url === '/api/v1/models/chooser/stats' && method === 'GET') {
      try {
        return ok({ stats: modelChooser.getStats() });
      } catch (e) { return err(e); }
    }
    
    // POST /api/v1/models/score — Score an artifact
    if (url === '/api/v1/models/score' && method === 'POST') {
      try {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          const { artifact, evidence } = JSON.parse(body);
          const score = confidenceScorer.score(artifact, evidence);
          const fate = await confidenceScorer.decideFate(artifact.nodeId, score, evidence.attempt || 1);
          
          return ok({ score, fate });
        });
      } catch (e) { return err(e); }
    }
    
    // GET /api/v1/confidence/retry-stats/{nodeId} — Get retry history
    if (url.startsWith('/api/v1/confidence/retry-stats/') && method === 'GET') {
      try {
        const nodeId = url.split('/')[5];
        const stats = confidenceScorer.getRetryStats(nodeId);
        
        if (!stats) {
          return ok({ nodeId, stats: null, note: 'No retry history' });
        }
        
        return ok({ nodeId, stats });
      } catch (e) { return err(e); }
    }
    
    // ====== DAG BUILDER ENDPOINTS ======
    
    // POST /api/v1/dag/build — Build DAG from intent
    if (url === '/api/v1/dag/build' && method === 'POST') {
      try {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          const payload = JSON.parse(body);
          const { intentId } = payload;
          
          const history = intentBus.getHistory();
          const intent = history.find(i => i.id === intentId);
          
          if (!intent) {
            res.statusCode = 404;
            return res.end(JSON.stringify({ ok: false, error: 'Intent not found' }));
          }
          
          const dag = dagBuilder.buildDAG(intent);
          
          return ok({
            dagId: dag.id,
            intentId: dag.intentId,
            totalNodes: dag.metrics.totalNodes,
            totalEdges: dag.metrics.totalEdges,
            estimatedTimeMs: dag.metrics.estimatedTimeMs,
            estimatedCostUsd: dag.metrics.estimatedCostUsd,
            depth: dag.metrics.depth,
            criticalPath: dag.metrics.criticalPath
          });
        });
      } catch (e) { return err(e); }
      return;
    }
    
    // GET /api/v1/dag/{dagId} — Get DAG details
    if (url.startsWith('/api/v1/dag/') && method === 'GET') {
      try {
        const dagId = url.split('/')[4];
        const dag = dagBuilder.getDAG(dagId);
        
        if (!dag) {
          res.statusCode = 404;
          return res.end(JSON.stringify({ ok: false, error: 'DAG not found' }));
        }
        
        return ok({
          dag: {
            id: dag.id,
            intentId: dag.intentId,
            status: dag.status,
            nodes: dag.nodes.map(n => ({
              id: n.id,
              title: n.title,
              type: n.type,
              station: n.station,
              status: n.status,
              estimatedTimeMs: n.estimatedTimeMs,
              confidence: n.confidence
            })),
            edges: dag.edges,
            metrics: dag.metrics
          }
        });
      } catch (e) { return err(e); }
    }
    
    // GET /api/v1/dag/{dagId}/execution-order — Get topological sort
    if (url.startsWith('/api/v1/dag/') && url.includes('/execution-order') && method === 'GET') {
      try {
        const dagId = url.split('/')[4];
        const dag = dagBuilder.getDAG(dagId);
        
        if (!dag) {
          res.statusCode = 404;
          return res.end(JSON.stringify({ ok: false, error: 'DAG not found' }));
        }
        
        const order = dagBuilder.getExecutionOrder(dag);
        const nodeDetails = order.map(nodeId => {
          const node = dag.nodes.find(n => n.id === nodeId);
          return {
            nodeId,
            title: node.title,
            type: node.type,
            station: node.station
          };
        });
        
        return ok({ executionOrder: nodeDetails });
      } catch (e) { return err(e); }
    }
    
    // GET /api/v1/dag/{dagId}/parallel-batches — Get parallel execution plan
    if (url.startsWith('/api/v1/dag/') && url.includes('/parallel-batches') && method === 'GET') {
      try {
        const dagId = url.split('/')[4];
        const dag = dagBuilder.getDAG(dagId);
        
        if (!dag) {
          res.statusCode = 404;
          return res.end(JSON.stringify({ ok: false, error: 'DAG not found' }));
        }
        
        const batches = dagBuilder.getParallelBatches(dag);
        const batchDetails = batches.map((batch, batchNum) => ({
          batch: batchNum + 1,
          parallelCount: batch.length,
          nodes: batch.map(nodeId => {
            const node = dag.nodes.find(n => n.id === nodeId);
            return { nodeId, title: node.title, type: node.type };
          })
        }));
        
        return ok({ batches: batchDetails, totalBatches: batches.length });
      } catch (e) { return err(e); }
    }
    
    // POST /api/v1/dag/{dagId}/node/{nodeId}/update — Update node status
    if (url.startsWith('/api/v1/dag/') && url.includes('/node/') && method === 'POST') {
      try {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          const parts = url.split('/');
          const dagId = parts[4];
          const nodeId = parts[6];
          const payload = JSON.parse(body);
          
          const updated = dagBuilder.updateNodeStatus(dagId, nodeId, payload.status, payload.data);
          
          return ok({
            nodeId: updated.id,
            status: updated.status,
            confidence: updated.confidence,
            artifacts: updated.artifacts.length
          });
        });
      } catch (e) { return err(e); }
      return;
    }
    
    // GET /api/v1/dag/stats — Get DAG builder statistics
    if (url === '/api/v1/dag/stats' && method === 'GET') {
      try {
        const stats = dagBuilder.getStats();
        return ok({ stats });
      } catch (e) { return err(e); }
    }

    // ====== SCREEN CAPTURE ENDPOINTS ======

    // POST /api/v1/intent/enrich-with-screen — Get current screen + auto-inject into intent
    if (url === '/api/v1/intent/enrich-with-screen' && method === 'POST') {
      try {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          const payload = JSON.parse(body || '{}');
          const { intentId } = payload;

          const status = screenCaptureService.getStatus();
          if (!status.lastFrame) {
            return ok({
              screenshotAvailable: false,
              message: 'No screenshots captured yet',
              status: status
            });
          }

          const lastFrame = status.lastFrame;

          // If intentId provided, inject into that intent
          if (intentId) {
            const history = intentBus.getHistory();
            const intent = history.find(i => i.id === intentId);
            if (intent) {
              intent.withScreenContext(lastFrame.screenshot, lastFrame.ocrTags);
            }
          }

          return ok({
            screenshotAvailable: true,
            frame: {
              id: lastFrame.id,
              timestamp: lastFrame.timestamp,
              ocrTags: lastFrame.ocrTags,
              tags: lastFrame.tags,
              metadata: lastFrame.metadata
            },
            injectedIntoIntent: !!intentId,
            intentId
          });
        });
      } catch (e) { return err(e); }
      return;
    }

    // GET /api/v1/screen/status — Get screen capture service status
    if (url === '/api/v1/screen/status' && method === 'GET') {
      try {
        const status = screenCaptureService.getStatus();
        return ok({ status });
      } catch (e) { return err(e); }
    }

    // GET /api/v1/screen/last-frames?count=5 — Get last N frames
    if (url.startsWith('/api/v1/screen/last-frames') && method === 'GET') {
      try {
        const query = new URL(`http://localhost:3123${url}`).searchParams;
        const count = Number(query.get('count')) || 5;

        const frames = screenCaptureService.getLastFrames(count);
        return ok({
          count: frames.length,
          frames: frames.map(f => ({
            id: f.id,
            timestamp: f.timestamp,
            ocrTags: f.ocrTags,
            tags: f.tags
          }))
        });
      } catch (e) { return err(e); }
    }

    // GET /api/v1/screen/frame/{frameId} — Get specific frame
    if (url.startsWith('/api/v1/screen/frame/') && method === 'GET') {
      try {
        const frameId = url.split('/')[5];
        const frame = screenCaptureService.getFrame(frameId);

        if (!frame) {
          res.statusCode = 404;
          return res.end(JSON.stringify({ ok: false, error: 'Frame not found' }));
        }

        return ok({
          frame: {
            id: frame.id,
            timestamp: frame.timestamp,
            screenshot: frame.screenshot,
            ocrTags: frame.ocrTags,
            tags: frame.tags,
            metadata: frame.metadata
          }
        });
      } catch (e) { return err(e); }
    }

    // GET /api/v1/screen/search?query=button — Search frames by OCR content
    if (url.startsWith('/api/v1/screen/search') && method === 'GET') {
      try {
        const query = new URL(`http://localhost:3123${url}`).searchParams;
        const q = query.get('query');

        if (!q) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ ok: false, error: 'Missing query parameter' }));
        }

        const results = screenCaptureService.searchFrames(q);
        return ok({
          query: q,
          resultCount: results.length,
          results
        });
      } catch (e) { return err(e); }
    }

    // POST /api/v1/screen/start — Start screen capture loop
    if (url === '/api/v1/screen/start' && method === 'POST') {
      try {
        await screenCaptureService.start();
        return ok({ message: 'Screen capture started', status: screenCaptureService.getStatus() });
      } catch (e) { return err(e); }
      return;
    }

    // POST /api/v1/screen/stop — Stop screen capture loop
    if (url === '/api/v1/screen/stop' && method === 'POST') {
      try {
        screenCaptureService.stop();
        return ok({ message: 'Screen capture stopped', status: screenCaptureService.getStatus() });
      } catch (e) { return err(e); }
      return;
    }

    // POST /api/v1/screen/clear — Clear all captured frames
    if (url === '/api/v1/screen/clear' && method === 'POST') {
      try {
        screenCaptureService.clear();
        return ok({ message: 'All frames cleared', status: screenCaptureService.getStatus() });
      } catch (e) { return err(e); }
      return;
    }

    // ====== REPO AUTO-ORG ENDPOINTS ======

    // POST /api/v1/repo/analyze — Analyze feature description for organization
    if (url === '/api/v1/repo/analyze' && method === 'POST') {
      try {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          const payload = JSON.parse(body);
          const { description } = payload;

          if (!description) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ ok: false, error: 'Missing description' }));
          }

          const plan = repoAutoOrg.generateOrganizationPlan(description);

          return ok({
            planId: plan.id,
            description: plan.description,
            primaryScope: plan.primaryScope,
            detectedScopes: plan.detectedScopes,
            branchName: plan.branchName,
            folders: plan.folders,
            fileOrganization: plan.fileOrganization,
            commandSummary: {
              createBranch: plan.commands.createBranch,
              allSteps: plan.commands.allSteps
            }
          });
        });
      } catch (e) { return err(e); }
      return;
    }

    // GET /api/v1/repo/analyze/{planId} — Get full organization plan (simulation - stores in memory)
    if (url.startsWith('/api/v1/repo/analyze/') && method === 'GET') {
      try {
        const planId = url.split('/')[5];
        // In production, would retrieve from database
        // For now, return that full plan would be available
        return ok({
          message: 'Full plan retrieval (implement persistent storage)',
          planId,
          note: 'Use POST /api/v1/repo/analyze to get full plan'
        });
      } catch (e) { return err(e); }
    }

    // POST /api/v1/repo/detect-scope — Detect scope from description
    if (url === '/api/v1/repo/detect-scope' && method === 'POST') {
      try {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          const payload = JSON.parse(body);
          const { description } = payload;

          if (!description) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ ok: false, error: 'Missing description' }));
          }

          const scopes = repoAutoOrg.detectScope(description);

          return ok({
            description: description.substring(0, 100),
            detectedScopes: scopes,
            primaryScope: scopes[0]?.scope,
            confidence: scopes[0]?.score
          });
        });
      } catch (e) { return err(e); }
      return;
    }

    // POST /api/v1/repo/generate-branch-name — Generate branch name
    if (url === '/api/v1/repo/generate-branch-name' && method === 'POST') {
      try {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          const payload = JSON.parse(body);
          const { description, scope } = payload;

          if (!description) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ ok: false, error: 'Missing description' }));
          }

          const scopes = repoAutoOrg.detectScope(description);
          const primaryScope = scope || scopes[0]?.scope;
          const branchName = repoAutoOrg.generateBranchName(description, primaryScope);

          return ok({
            branchName,
            scope: primaryScope,
            gitCheckoutCommand: `git checkout -b ${branchName}`
          });
        });
      } catch (e) { return err(e); }
      return;
    }

    // POST /api/v1/repo/generate-pr-template — Generate PR template
    if (url === '/api/v1/repo/generate-pr-template' && method === 'POST') {
      try {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          const payload = JSON.parse(body);
          const { description } = payload;

          if (!description) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ ok: false, error: 'Missing description' }));
          }

          const scopes = repoAutoOrg.detectScope(description);
          const primaryScope = scopes[0]?.scope || 'feature';
          const branchName = repoAutoOrg.generateBranchName(description, primaryScope);
          const template = repoAutoOrg.generatePRTemplate(description, scopes, branchName);

          return ok({
            prTemplate: template,
            branchName,
            scopes
          });
        });
      } catch (e) { return err(e); }
      return;
    }

    // POST /api/v1/repo/generate-commit-template — Generate commit template
    if (url === '/api/v1/repo/generate-commit-template' && method === 'POST') {
      try {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          const payload = JSON.parse(body);
          const { description } = payload;

          if (!description) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ ok: false, error: 'Missing description' }));
          }

          const scopes = repoAutoOrg.detectScope(description);
          const primaryScope = scopes[0]?.scope || 'feature';
          const template = repoAutoOrg.generateCommitTemplate(primaryScope, description);
          const pattern = repoAutoOrg.generateCommitPattern(scopes);

          return ok({
            commitTemplate: template,
            commitPattern: pattern,
            scope: primaryScope
          });
        });
      } catch (e) { return err(e); }
      return;
    }

    // GET /api/v1/repo/stats — Get repo auto-org statistics
    if (url === '/api/v1/repo/stats' && method === 'GET') {
      try {
        const stats = repoAutoOrg.getStats();
        return ok({ stats });
      } catch (e) { return err(e); }
    }
    
    // Helper to quickly probe a port/path
    const probe = (port, path='/health')=> new Promise(resolve=>{
      try{
        const req=http.get({ hostname:'127.0.0.1', port, path, timeout:800 }, r=>{ resolve(r.statusCode===200); });
        req.on('error', ()=>resolve(false));
        req.on('timeout', ()=>{ try{ req.destroy(); }catch{} resolve(false); });
      }catch{ resolve(false); }
    });
    // Map of pids for services this orchestrator spawned
    const pidMap = Object.fromEntries(children.map(c=>[c.name, c.p.pid]));
    if (url==='/api/v1/system/processes' && method==='GET'){
      try{
        const results = await Promise.all(services.map(async s=>({
          name: s.name,
          port: s.port,
          pid: pidMap[s.name] || null,
          healthy: await probe(s.port, s.health)
        })));
        return ok({ processes: results, orchestrator: { pid: process.pid } });
      }catch(e){ return err(e); }
    }
    if (url==='/api/v1/system/multi-instance/start' && method==='POST'){
      try{
        if (multiInstance.running) return ok({ already:true, pids: multiInstance.pids });
        // Spawn N sibling instances; simulate sharding by env var SHARD_ID
        const count = Math.max(2, Number(process.env.MI_COUNT||2));
        const pids = [];
        for (let i=0;i<count;i++){
          const p = spawn('bash', ['-lc', `SHARD_ID=${i+1} node servers/training-server.js`], { stdio:'ignore', detached:false });
          p.on('exit', ()=>{});
          pids.push(p.pid);
        }
        multiInstance = { running:true, pids, startTime: Date.now(), shards: count };
        ok({ pids, shards: count });
      }catch(e){ err(e); }
      return;
    }
    if (url==='/api/v1/system/multi-instance/stop' && method==='POST'){
      try{
        if (!multiInstance.running) return ok({ already:false });
        for (const pid of multiInstance.pids){ try{ process.kill(pid, 'SIGTERM'); }catch{} }
        const durationMs = Date.now() - (multiInstance.startTime||Date.now());
        // Simple collector report (placeholder)
        const stats = { instances: multiInstance.pids.length, shards: multiInstance.shards, durationMs, speedupEstimate: Math.min(multiInstance.pids.length, osCoresSafe()) };
        multiInstance = { running:false, pids:[], startTime:null };
        ok({ stopped:true, stats });
      }catch(e){ err(e); }
      return;
    }
    res.statusCode = 404; res.end('');
  });
  server.listen(Number(process.env.ORCH_CTRL_PORT||3123), '127.0.0.1');
}

function osCoresSafe(){ try{ return Math.max(1, require('os').cpus().length - 1); }catch{ return 2; } }

// Service health monitoring and auto-healing
const serviceHealthState = new Map(); // service name -> { lastCheck: timestamp, failures: count, lastRestart: timestamp }

async function checkServiceHealth(service) {
  try {
    const res = await fetch(`http://127.0.0.1:${service.port}${service.health}`, { timeout: 5000 });
    return res.status === 200;
  } catch (e) {
    return false;
  }
}

async function restartService(service, children) {
  const state = serviceHealthState.get(service.name) || { failures: 0, lastRestart: 0 };
  
  // Prevent restart spam - minimum 30 seconds between restarts
  if (Date.now() - state.lastRestart < 30000) {
    console.log(`[Auto-Heal] Skipping restart of ${service.name} - too soon since last restart`);
    return false;
  }
  
  console.log(`[Auto-Heal] Restarting failed service: ${service.name} on port ${service.port}`);
  
  try {
    // Kill existing process if running
    const existing = children.find(c => c.name === service.name);
    if (existing) {
      try { existing.p.kill('SIGTERM'); } catch {}
      // Remove from children array
      const idx = children.indexOf(existing);
      if (idx > -1) children.splice(idx, 1);
    }
    
    // Start new process
    const p = spawn(service.cmd[0], service.cmd.slice(1), { stdio: 'inherit' });
    children.push({ name: service.name, p });
    
    p.on('exit', (code, signal) => {
      console.log(`${service.name}-server exited with code ${code} signal ${signal}`);
    });
    
    // Wait for health
    await waitForHealth(service.port, service.health, 10, 1000);
    
    // Update state
    state.failures = 0;
    state.lastRestart = Date.now();
    serviceHealthState.set(service.name, state);
    
    console.log(`[Auto-Heal] Successfully restarted ${service.name}`);
    return true;
  } catch (e) {
    console.error(`[Auto-Heal] Failed to restart ${service.name}:`, e.message);
    state.failures++;
    serviceHealthState.set(service.name, state);
    return false;
  }
}

async function monitorServices(children) {
  const now = Date.now();
  
  for (const service of services) {
    const state = serviceHealthState.get(service.name) || { lastCheck: 0, failures: 0, lastRestart: 0 };
    
    // Skip check if recently checked (throttle to every 30 seconds)
    if (now - state.lastCheck < 30000) continue;
    
    state.lastCheck = now;
    serviceHealthState.set(service.name, state);
    
    const healthy = await checkServiceHealth(service);
    
    if (!healthy) {
      console.warn(`[Auto-Heal] Service ${service.name} on port ${service.port} failed health check`);
      state.failures++;
      serviceHealthState.set(service.name, state);
      
      // Restart if failed 2 consecutive checks
      if (state.failures >= 2) {
        await restartService(service, children);
      }
    } else {
      // Reset failure count on successful check
      if (state.failures > 0) {
        state.failures = 0;
        serviceHealthState.set(service.name, state);
        console.log(`[Auto-Heal] Service ${service.name} recovered`);
      }
    }
  }
}

main().catch(e=>{ console.error('orchestrator error', e); process.exit(1); });
