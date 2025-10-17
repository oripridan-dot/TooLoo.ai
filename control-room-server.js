#!/usr/bin/env node

/**
 * Control Room Server (Port 3000)
 * - Serves Control Room UI
 * - Proxies /api/* to main API on port 3001
 * - Provides /api/screenshot using Playwright
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 3000;
const API_BASE = process.env.API_BASE || 'http://localhost:3001';

app.use(express.json({ limit: '2mb' }));
app.use((req,res,next)=>{ res.setHeader('Access-Control-Allow-Origin','*'); res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS'); res.setHeader('Access-Control-Allow-Headers','Content-Type'); if(req.method==='OPTIONS') return res.sendStatus(200); next(); });

// Root → Control Room
app.get('/', (req,res)=>res.redirect('/control-room'));

// Serve Control Room UI
app.get('/control-room', (req,res)=>{
  try { res.sendFile(path.join(process.cwd(), 'web-app', 'control-room.html')); }
  catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

// Serve Provider Cup Scoreboard
app.get('/scoreboard', (req,res)=>{
  try { res.sendFile(path.join(process.cwd(), 'web-app', 'provider-cup-scoreboard.html')); }
  catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

// Serve other static assets if referenced directly
app.use('/web-app', express.static(path.join(process.cwd(), 'web-app')));
app.use('/auto-screenshots', express.static(path.join(process.cwd(), 'auto-screenshots')));

// Lightweight API proxy helpers
async function proxy(req, res, targetUrl){
  try{
    const init = { method: req.method, headers: { 'Content-Type': req.headers['content-type'] || 'application/json' } };
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      init.body = JSON.stringify(req.body || {});
    }
    const r = await fetch(targetUrl, init);
    const ct = r.headers.get('content-type') || 'application/json';
    const text = await r.text();
    res.status(r.status).set('Content-Type', ct).send(text);
  }catch(e){ res.status(502).json({ ok:false, error:e.message, proxy: targetUrl }); }
}

// Aliases expected by Control Room UI → map to v1 endpoints
app.get('/api/mastery', (req,res)=> proxy(req,res, `${API_BASE}/api/v1/dashboard/domains`));
app.get('/api/learning', (req,res)=> proxy(req,res, `${API_BASE}/api/v1/dashboard/feed`));
app.get('/health', (req,res)=> proxy(req,res, `${API_BASE}/api/v1/health`));
app.get('/api/budget', (req,res)=> proxy(req,res, `${API_BASE}/api/v1/budget`));
app.post('/api/generate', (req,res)=> proxy(req,res, `${API_BASE}/api/v1/generate`));

// Generic pass-through for other v1 endpoints
app.use('/api/v1', (req,res)=> proxy(req,res, `${API_BASE}${req.originalUrl}`));

// On-demand screenshot endpoint
app.post('/api/screenshot', async (req,res)=>{
  try{
    const mod = await import(path.join(process.cwd(), 'live-screenshot-capture.js'));
    const Capture = mod.default;
    const capturer = new Capture();
    const out = await capturer.captureVSCodeWorkspace();
    if (out.success) {
      const fileName = path.basename(out.filepath);
      const publicUrl = `/auto-screenshots/${fileName}`;
      return res.json({ ok:true, file: out.filepath, publicUrl, filename: fileName, timestamp: out.timestamp });
    }
    return res.status(500).json({ ok:false, error: out.error || 'screenshot failed' });
  }catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

app.listen(PORT, '0.0.0.0', ()=>{
  console.log('🎛️  Control Room on http://localhost:'+PORT+'/control-room');
  console.log('🔌 Proxying API to', API_BASE);
});
