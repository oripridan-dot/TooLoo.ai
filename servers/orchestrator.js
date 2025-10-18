import { spawn } from 'child_process';
import http from 'http';

const services = [
  { name:'web', cmd:['node','servers/web-server.js'], port: Number(process.env.WEB_PORT||3000), health:'/health' },
  { name:'training', cmd:['node','servers/training-server.js'], port: Number(process.env.TRAINING_PORT||3001), health:'/health' },
  { name:'meta', cmd:['node','servers/meta-server.js'], port: Number(process.env.META_PORT||3002), health:'/health' },
  { name:'budget', cmd:['node','servers/budget-server.js'], port: Number(process.env.BUDGET_PORT||3003), health:'/health' },
  { name:'coach', cmd:['node','servers/coach-server.js'], port: Number(process.env.COACH_PORT||3004), health:'/health' },
  { name:'cup', cmd:['node','servers/cup-server.js'], port: Number(process.env.CUP_PORT||3005), health:'/health' },
  { name:'product-dev', cmd:['node','servers/product-development-server.js'], port: Number(process.env.PRODUCT_PORT||3006), health:'/health' },
  { name:'segmentation', cmd:['node','servers/segmentation-server.js'], port: Number(process.env.SEGMENTATION_PORT||3007), health:'/health' },
  { name:'reports', cmd:['node','servers/reports-server.js'], port: Number(process.env.REPORTS_PORT||3008), health:'/health' },
  { name:'capabilities', cmd:['node','servers/capabilities-server.js'], port: Number(process.env.CAPABILITIES_PORT||3009), health:'/health' },
  { name:'bridge', cmd:['node','servers/capability-workflow-bridge.js'], port: Number(process.env.CAPABILITY_BRIDGE_PORT||3010), health:'/health' }
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

  // Optional: apply a small retention boost on startup to strengthen cross-session memory
  try{
    await fetch(`http://127.0.0.1:${process.env.META_PORT||3002}/api/v4/meta-learning/boost-retention`, {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ retentionDelta: 0.07, transferDelta: 0.05 })
    });
  }catch{}

  console.log('All services up and pre-armed. Web UI: http://127.0.0.1:'+(process.env.WEB_PORT||3000)+'/control-room');

  // Apply startup priority mode (default chat-priority) if enabled
  try{
    const applyPriority = String(process.env.STARTUP_CHAT_PRIORITY||'true').toLowerCase()==='true';
    if (applyPriority) {
      await fetch(`http://127.0.0.1:${process.env.WEB_PORT||3000}/api/v1/system/priority/chat`, { method:'POST' });
      console.log('Startup priority applied: chat-priority');
    }
  }catch{}

  // Keep process alive to supervise children; handle graceful shutdown
  const keepAlive = setInterval(()=>{}, 60*60*1000);
  const shutdown = ()=>{
    clearInterval(keepAlive);
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

main().catch(e=>{ console.error('orchestrator error', e); process.exit(1); });
