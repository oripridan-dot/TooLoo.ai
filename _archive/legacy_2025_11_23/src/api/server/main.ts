// Clean, unified TooLoo API with Segmentation Unifier
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();
import SegmentationUnifier from '../../engine/segmentation-unifier.js';
import SegmentationGuardian from '../../engine/segmentation-guardian.js';
import AlertManager from '../../engine/alert-manager.js';
import Summarizer from '../../engine/summarizer.js';
import TopicEnhancementOrchestrator from '../../engine/topic-enhancement-orchestrator.js';
import StructuredExtractor from '../../engine/structured-extractor.js';
import WebSourcePipelineManager from '../../engine/web-source-pipeline-manager.js';
import SystemOperationsManager from '../../engine/system-operations-manager.js';

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

app.use(cors());
app.use(express.json({ limit: '2mb' }));
try { if (fs.existsSync('web-app')) app.use(express.static('web-app')); } catch {}

// --- TTS config (guarded) ---
const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY || '';
const voiceMap = {
  rachel: '21m00Tcm4TlvDq8ikWAM',
  bella: 'EXAVITQu4vr4xnSDxMaL',
  adam: 'pNInz6obpgDQGcFmaJgB'
};

// --- Helpers (single copy) ---
function tokenize(text=''){ return text.toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(Boolean); }
function termFreq(tokens){ const m={}; tokens.forEach(t=>m[t]=(m[t]||0)+1); const n=tokens.length||1; Object.keys(m).forEach(k=>m[k]/=n); return m; }
function cosineSimilarity(a,b){ let dot=0,na=0,nb=0; const keys=new Set([...Object.keys(a),...Object.keys(b)]); keys.forEach(k=>{ const va=a[k]||0,vb=b[k]||0; dot+=va*vb; na+=va*va; nb+=vb*vb; }); if(!na||!nb) return 0; return dot/(Math.sqrt(na)*Math.sqrt(nb)); }
function blendVectors(a,b){ const out={...a}; Object.keys(b).forEach(k=>{ out[k]=(out[k]||0)*0.5 + b[k]*0.5; }); return out; }
function deriveTitle(message, idx){ const t=(message?.content||'').toLowerCase(); if(t.includes('plan')) return 'Planning'; if(t.includes('error')||t.includes('fix')) return 'Troubleshooting'; if(t.includes('idea')||t.includes('brainstorm')) return 'Ideation'; if(t.includes('code')) return 'Coding'; if(t.includes('design')) return 'Design'; return `Segment ${idx+1}`; }
function buildSummary(msgs){ const user = msgs.filter(m=>m.role==='user').map(m=>m.content).join(' ').slice(0,160); return user || (msgs[0]?.content||'').slice(0,160); }

function basicSegment(messages){
  const segments=[]; let current={ start:0,end:0,title:'Opening',summary:'',messageCount:0 };
  const flush=()=>{ if(current.messageCount>0){ const slice=messages.slice(current.start,current.end+1); current.summary=current.summary||buildSummary(slice); segments.push({ ...current }); } };
  for(let i=0;i<messages.length;i++){
    const m=messages[i];
    if(i===0){ current={ start:0,end:0,title:deriveTitle(m,0),summary:'',messageCount:1 }; continue; }
    const prev=messages[i-1]; const boundary=(m.role==='user' && prev.role==='assistant');
    if(boundary && current.messageCount>=3){ current.end=i-1; flush(); current={ start:i,end:i,title:deriveTitle(m,segments.length),summary:'',messageCount:1 }; }
    else { current.end=i; current.messageCount++; }
  }
  flush();
  return segments;
}

function advancedSegment(messages){
  const vectors = messages.map(m=>termFreq(tokenize(m.content)));
  const segments=[]; let segStart=0; let last=vectors[0];
  for(let i=1;i<messages.length;i++){
    const sim=cosineSimilarity(last,vectors[i]);
    const roleBoundary=(messages[i].role==='user' && messages[i-1].role==='assistant');
    const force=(i-segStart)>=6;
    if((sim<0.18 && roleBoundary) || force){ segments.push(buildSeg(messages,segStart,i-1,segments.length)); segStart=i; }
    last=blendVectors(last,vectors[i]);
  }
  segments.push(buildSeg(messages,segStart,messages.length-1,segments.length));
  return segments;
}
function buildSeg(messages,start,end,idx){ const slice=messages.slice(start,end+1); return { start, end, title: deriveTitle(slice.find(m=>m.role==='user')||slice[0], idx), summary: buildSummary(slice), messageCount: slice.length }; }

// --- Segmentation Unifier ---
const segmentationUnifier = new SegmentationUnifier({
  strategies: {
    'rule-basic': async (messages)=>basicSegment(messages),
    'rule-advanced': async (messages)=>advancedSegment(messages),
    'ml-heuristic': async (messages)=>{
      try {
        const mod = await import('./engine/segmenter.js');
        const { segment } = mod;
        const adapted = messages.map((m,i)=>({ id:i, role:m.role, content:m.content }));
        const out = await segment(adapted);
        const segs = out?.segments||[];
        return segs.map((s,idx)=>({
          start: Math.max(0, Math.min(adapted.length-1, s.startMessageId ?? s.start ?? 0)),
          end: Math.max(0, Math.min(adapted.length-1, s.endMessageId ?? s.end ?? (s.startMessageId ?? 0))),
          title: String(s.label || `Segment ${idx+1}`),
          summary: (messages[s.startMessageId||0]?.content||'').slice(0,160)
        }));
      } catch { return advancedSegment(messages); }
    }
  }
});

// --- Guardian (drift + gating) ---
const alerts = new AlertManager();
const guardian = new SegmentationGuardian({ unifier: segmentationUnifier, alertManager: alerts });
if (!process.env.OFF_GUARDIAN) { guardian.start(); guardian.startNightly(2, 0); }

// --- System Intelligence Engines ---
const summarizer = new Summarizer({ cacheDir: 'data/summaries/cache' });
const topicOrchestrator = new TopicEnhancementOrchestrator({ workspaceRoot: process.cwd() });
const structuredExtractor = new StructuredExtractor();
const webSources = new WebSourcePipelineManager({ workspaceRoot: process.cwd() });
const sysOps = new SystemOperationsManager({ baseUrl: `http://localhost:${PORT}` });

// --- Core routes ---
app.get('/api/v1/health', (req,res)=>res.json({ ok:true, time:new Date().toISOString() }));

// System operations (arming + smoke tests)
app.post('/api/v1/system/arm', (req,res)=>{ try { res.json({ ok:true, ...sysOps.arm() }); } catch(e){ res.status(500).json({ ok:false, error:e.message }); } });
app.post('/api/v1/system/disarm', (req,res)=>{ try { res.json({ ok:true, ...sysOps.disarm() }); } catch(e){ res.status(500).json({ ok:false, error:e.message }); } });
app.get('/api/v1/system/status', async (req,res)=>{ try { const status = await sysOps.runSmoke(); res.json({ ok:true, ...status, armed: sysOps.getStatus().armed }); } catch(e){ res.status(500).json({ ok:false, error:e.message }); } });

// analyze free text by lines -> segments
app.post('/api/v1/analyze-text', async (req,res)=>{
  try {
    let { text, advanced } = req.body || {};
    if (!text || !(text = String(text).trim())) return res.status(400).json({ error: 'text required' });
    if (text.length > 50000) text = text.slice(0,50000);
    // Parse role-prefixed transcript lines if present
    const lines = text.split(/\n+/).map(l=>l.trim()).filter(Boolean);
    const messages = [];
    for (const line of lines) {
      const userMatch = line.match(/^User:\s*(.*)$/i);
      const asstMatch = line.match(/^Assistant:\s*(.*)$/i);
      if (userMatch) {
        messages.push({ role:'user', content: userMatch[1] });
      } else if (asstMatch) {
        messages.push({ role:'assistant', content: asstMatch[1] });
      } else if (messages.length) {
        // continuation of previous message
        messages[messages.length - 1].content += ' ' + line;
      } else {
        messages.push({ role:'user', content: line });
      }
    }
    const strategy = advanced ? 'rule-advanced' : undefined;
    const segments = await segmentationUnifier.segment(messages, { strategy });
    res.json({ segments, messageCount: messages.length });
  } catch(e){ res.status(500).json({ error: e.message }); }
});

// segment from structured messages
app.post('/api/v1/segment', async (req,res)=>{
  try {
    const { messages, advanced } = req.body || {};
    if (!Array.isArray(messages) || !messages.length) return res.status(400).json({ error: 'messages array required' });
    const strategy = advanced ? 'rule-advanced' : undefined;
    const segments = await segmentationUnifier.segment(messages, { strategy });
    res.json({ segments });
  } catch(e){ res.status(500).json({ error: e.message }); }
});

// status & config
app.get('/api/v1/segmentation/status', (req,res)=>{ try { res.json({ ok:true, status: segmentationUnifier.getStatus() }); } catch(e){ res.status(500).json({ error: e.message }); } });
app.post('/api/v1/segmentation/config', (req,res)=>{ try { const { mode, rule, canaryRatio } = req.body||{}; const next={}; if (mode && !['rule','ml','hybrid'].includes(mode)) return res.status(400).json({ error:'invalid mode' }); if (mode) next.mode=mode; if (rule) next.rule={ ...(segmentationUnifier.config.rule||{}), ...rule }; if (typeof canaryRatio==='number'){ if (canaryRatio<0 || canaryRatio>1) return res.status(400).json({ error:'canaryRatio must be 0..1' }); next.canaryRatio = canaryRatio; } const cfg=segmentationUnifier.saveConfig(next); res.json({ ok:true, config: cfg }); } catch(e){ res.status(500).json({ error:e.message }); } });

// Guardian status and gated config change
app.get('/api/v1/segmentation/guardian/status', (req,res)=>{ try { res.json({ ok:true, guardian: guardian.getStatus(), unifier: segmentationUnifier.getStatus() }); } catch(e){ res.status(500).json({ error:e.message }); } });
// POST { desiredConfig, baseUrl?, suites?, minAccuracy? } -> runs benchmarks; applies if passing
app.post('/api/v1/segmentation/guardian/gate', async (req,res)=>{
  try {
    const { desiredConfig, baseUrl = `http://localhost:${PORT}`, suites, minAccuracy } = req.body || {};
    if (!desiredConfig || typeof desiredConfig !== 'object') return res.status(400).json({ error: 'desiredConfig required' });
    const check = await guardian.gateConfigChange({ baseUrl, suites, minAccuracy });
    if (!check.passed) return res.status(412).json({ error: 'benchmark gate failed', accuracy: check.accuracy, minAccuracy: minAccuracy ?? guardian.thresholds.minBenchmarkAccuracy });
    const cfg = segmentationUnifier.saveConfig(desiredConfig);
    res.json({ ok:true, config: cfg, accuracy: check.accuracy });
  } catch(e){ res.status(500).json({ error:e.message }); }
});

// Manual nightly run trigger (useful for dev/testing)
app.post('/api/v1/segmentation/guardian/nightly', async (req,res)=>{
  try {
    const { baseUrl = `http://localhost:${PORT}`, suites, minAccuracy } = req.body || {};
    const out = await guardian.runNightlyCycle({ baseUrl, suites: suites || ['basic-segmentation','segmentation-100'], minAccuracy });
    res.json(out);
  } catch(e){ res.status(500).json({ error:e.message }); }
});

// Alerts API
app.get('/api/v1/alerts/recent', (req,res)=>{ try { const limit = Math.min(200, parseInt(req.query.limit,10)||50); res.json({ items: alerts.getRecent(limit) }); } catch(e){ res.status(500).json({ error:e.message }); } });

// Web Source Pipeline - real ingestion
// Plan ingestion
app.post('/api/v1/web/plan', async (req,res)=>{
  try {
    const { taskId='general', topic='', urls=[], feeds=[], keywords=[], maxDocs=20, ttlHours=6 } = req.body||{};
    const out = await webSources.plan({ taskId, topic, urls, feeds, keywords, maxDocs, ttlHours });
    res.json({ ok:true, ...out });
  } catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});
// Run a plan (fetch & persist)
app.post('/api/v1/web/run', async (req,res)=>{
  try {
    const { plan } = req.body||{};
    if (!plan) return res.status(400).json({ ok:false, error:'plan required' });
    const out = await webSources.runPlan(plan);
    res.json({ ok:true, ...out });
  } catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});
// List docs (from persisted jsonl)
app.get('/api/v1/web/docs', async (req,res)=>{
  try {
    const { taskId='general', limit='50', mock } = req.query||{};
    if (mock==='1'){
      // fallback mock mode
      const mockDocs = [
        { id:'doc1', url:'https://example.com/ai-performance', title:'AI Performance Metrics', content:'AI model performance evaluation shows 92% accuracy, 45ms latency, and $0.25 per 1K tokens cost. BLEU score of 0.78 achieved.', timestamp:new Date().toISOString() },
        { id:'doc2', url:'https://example.com/transformer-study', title:'Transformer Analysis', content:'Transformer architecture delivers 89% efficiency with 120ms response time. Memory usage at 3.2GB with 95% precision on benchmarks.', timestamp:new Date().toISOString() },
        { id:'doc3', url:'https://example.com/llm-evaluation', title:'LLM Evaluation Report', content:'Large language model shows 94% accuracy, processes 150 tokens/sec, costs $0.32/1K tokens. ROUGE-L score: 0.85, F1-score: 0.91.', timestamp:new Date().toISOString() },
        { id:'doc4', url:'https://example.com/ml-optimization', title:'ML Optimization Results', content:'Machine learning optimization achieved 87% efficiency, reduced latency to 38ms, energy consumption at 2.1kW. Win rate: 76%.', timestamp:new Date().toISOString() },
        { id:'doc5', url:'https://example.com/benchmark-results', title:'Comprehensive Benchmarks', content:'Benchmark results: 93% precision, 88% recall, METEOR 0.72, CIDEr 0.64, chrF 0.81. Perplexity: 15.2.', timestamp:new Date().toISOString() },
      ];
      const limitNum = parseInt(limit,10)||50; return res.json({ ok:true, taskId, docs: mockDocs.slice(0,limitNum) });
    }
    const limitNum = parseInt(limit,10)||50;
    const docs = await webSources.listDocs(taskId, limitNum);
    res.json({ ok:true, taskId, docs });
  } catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});
// Search docs by query
app.get('/api/v1/web/search', async (req,res)=>{
  try {
    const { taskId='general', q='', limit='10' } = req.query||{};
    const limitNum = parseInt(limit,10)||10;
    const results = await webSources.search(taskId, q, limitNum);
    res.json({ ok:true, taskId, results });
  } catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

// Ingestion configuration (allowlist, timeouts, pacing)
app.get('/api/v1/web/config', (req,res)=>{
  try {
    res.json({ ok:true, config: { allowDomains: webSources.allowDomains, requestTimeoutMs: webSources.requestTimeoutMs, domainMinIntervalMs: webSources.http.domainMinIntervalMs } });
  } catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});
app.post('/api/v1/web/config', (req,res)=>{
  try {
    const { allowDomains, requestTimeoutMs, domainMinIntervalMs } = req.body||{};
    const cfg = webSources.setConfig({ allowDomains, requestTimeoutMs, domainMinIntervalMs });
    res.json({ ok:true, config: cfg });
  } catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

app.post('/api/v1/extract/batch', async (req,res)=>{
  try {
    const { taskId = 'general', signals, limit = 20, perSentenceCap } = req.body || {};
    const docs = await webSources.listDocs(taskId, Math.max(1, Math.min(200, parseInt(limit,10)||20)));
    if (!docs.length) return res.status(404).json({ ok:false, error:'no docs available; run /api/v1/web/plan then /api/v1/web/run' });
    const results = [];
    for (const doc of docs) {
      const content = doc.content || doc.text || '';
      if (!content.trim()) continue;
      if (typeof perSentenceCap === 'number') structuredExtractor.opts.perSentenceCap = Math.max(1, Math.min(50, perSentenceCap));
      const extraction = structuredExtractor.extract({ text: content, signals });
      results.push({ docId: doc.id, url: doc.url, title: doc.title, extraction, extractedCount: extraction.length });
    }
    const timestamp = new Date().toISOString();
    const persistPath = `data/insights/structured/batch-${taskId}-${timestamp.slice(0,10)}.json`;
    await structuredExtractor.persistExtractions(persistPath, { taskId, results, timestamp, totalDocs: docs.length });
    const totalExtractions = results.reduce((sum, r) => sum + r.extractedCount, 0);
    res.json({ ok:true, processed: results.length, totalExtractions, results, persistedTo: persistPath });
  } catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

// System Summaries - Intelligent Content Analysis
app.post('/api/v1/summarize/logs', async (req,res)=>{
  try {
    const { content, title, url, hint } = req.body || {};
    if (!content || !content.trim()) return res.status(400).json({ ok:false, error:'content required' });
    const summary = await summarizer.summarize({ text: content, title, url, hint });
    const timestamp = new Date().toISOString();
    const persistPath = `data/insights/summaries/logs-${timestamp.slice(0,10)}.json`;
    await summarizer.persistSummary(persistPath, { content, summary, timestamp, type: 'logs' });
    res.json({ ok:true, summary, persistedTo: persistPath });
  } catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

app.post('/api/v1/summarize/evolution', async (req,res)=>{
  try {
    const { content, title, url, hint } = req.body || {};
    if (!content || !content.trim()) return res.status(400).json({ ok:false, error:'content required' });
    const summary = await summarizer.summarize({ text: content, title, url, hint: hint || 'evolution' });
    const timestamp = new Date().toISOString();
    const persistPath = `data/insights/summaries/evolution-${timestamp.slice(0,10)}.json`;
    await summarizer.persistSummary(persistPath, { content, summary, timestamp, type: 'evolution' });
    res.json({ ok:true, summary, persistedTo: persistPath });
  } catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

app.post('/api/v1/summarize/files', async (req,res)=>{
  try {
    const { content, title, url, hint } = req.body || {};
    if (!content || !content.trim()) return res.status(400).json({ ok:false, error:'content required' });
    const summary = await summarizer.summarize({ text: content, title, url, hint: hint || 'workspace' });
    const timestamp = new Date().toISOString();
    const persistPath = `data/insights/summaries/workspace-${timestamp.slice(0,10)}.json`;
    await summarizer.persistSummary(persistPath, { content, summary, timestamp, type: 'workspace' });
    res.json({ ok:true, summary, persistedTo: persistPath });
  } catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

// Topic Enhancement - Self-Improvement Evaluation  
app.post('/api/v1/topics/plan', async (req,res)=>{
  try {
    await topicOrchestrator.init();
    const { topicCount = 100 } = req.body || {};
    const plan = await topicOrchestrator.planEnhancement(topicCount);
    res.json({ ok:true, plan });
  } catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

app.post('/api/v1/topics/run', async (req,res)=>{
  try {
    await topicOrchestrator.init();
    const { plan } = req.body || {};
    if (!plan) return res.status(400).json({ ok:false, error:'plan required' });
    const results = await topicOrchestrator.runEnhancement(plan);
    const timestamp = new Date().toISOString();
    const persistPath = `data/insights/digests/topic-enhancement-${timestamp.slice(0,10)}.json`;
    await topicOrchestrator.persistResults(persistPath, results);
    res.json({ ok:true, results, persistedTo: persistPath });
  } catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

app.get('/api/v1/topics/latest', async (req,res)=>{
  try {
    await topicOrchestrator.init();
    const latest = await topicOrchestrator.getLatestResults();
    res.json({ ok:true, latest });
  } catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

// Structured Extraction - Quality Metrics Analysis
app.post('/api/v1/extract/structured', async (req,res)=>{
  try {
    const { text, signals, perSentenceCap } = req.body || {};
    if (!text || !text.trim()) return res.status(400).json({ ok:false, error:'text required' });
    if (typeof perSentenceCap === 'number') structuredExtractor.opts.perSentenceCap = Math.max(1, Math.min(50, perSentenceCap));
    const extraction = structuredExtractor.extract({ text, signals });
    res.json({ ok:true, extraction });
  } catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

app.post('/api/v1/extract/compare', async (req,res)=>{
  try {
    const { assertions } = req.body || {};
    if (!Array.isArray(assertions)) return res.status(400).json({ ok:false, error:'assertions array required' });
    const validationResults = [];
    for (const assertion of assertions) {
      const { topic, signal, expectedValue, tolerance = 0.1, text } = assertion;
      if (!topic || !signal || expectedValue === undefined || !text) {
        validationResults.push({ assertion, valid: false, error: 'missing required fields' });
        continue;
      }
      const extraction = structuredExtractor.extract({ text });
      const passed = structuredExtractor.validateAssertion(extraction, signal, expectedValue, tolerance);
      validationResults.push({ assertion, extraction, valid: passed });
    }
    res.json({ ok:true, validationResults, passed: validationResults.filter(r=>r.valid).length });
  } catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

// minimal fetch (used in docs/testing)
app.get('/api/v1/fetch', async (req,res)=>{ try { const { url } = req.query; if (!url) return res.status(400).json({ error:'url required' }); if (!/^https?:\/\//i.test(url)) return res.status(400).json({ error:'only http/https allowed' }); const r = await fetch(url); if (!r.ok) return res.status(r.status).json({ error: 'fetch failed' }); let txt = await r.text(); if (txt.length>120000) txt=txt.slice(0,120000); res.json({ bytes: txt.length, snippet: txt.slice(0,5000) }); } catch(e){ res.status(500).json({ error: e.message }); } });

// optional TTS routes (guarded)
app.get('/api/v1/tts/voices', async (req,res)=>{ if (!ELEVEN_KEY) return res.status(500).json({ error:'ELEVENLABS_API_KEY missing' }); try { const r = await fetch('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': ELEVEN_KEY } }); if (!r.ok) return res.status(r.status).json({ error: await r.text() }); res.json(await r.json()); } catch(e){ res.status(500).json({ error: e.message }); } });
app.post('/api/v1/tts/speak', async (req,res)=>{ if (!ELEVEN_KEY) return res.status(500).json({ error:'ELEVENLABS_API_KEY missing' }); const { text, voiceName='rachel', voiceId, settings } = req.body||{}; if (!text || !text.trim()) return res.status(400).json({ error:'text is required' }); const chosenVoiceId = voiceId || voiceMap[voiceName] || voiceMap.rachel; const body = { text: text.trim(), model_id: settings?.model_id || 'eleven_monolingual_v1', voice_settings: { stability:0.5, similarity_boost:0.5, style:0.5, use_speaker_boost:true, ...(settings?.voice_settings||{}) } }; try { const url=`https://api.elevenlabs.io/v1/text-to-speech/${chosenVoiceId}`; const r = await fetch(url, { method:'POST', headers:{ 'Accept':'audio/mpeg','Content-Type':'application/json','xi-api-key':ELEVEN_KEY }, body: JSON.stringify(body) }); if(!r.ok){ const errText=await r.text(); return res.status(r.status).json({ error: errText }); } res.setHeader('Content-Type','audio/mpeg'); res.setHeader('Cache-Control','no-store'); const buf = Buffer.from(await r.arrayBuffer()); return res.end(buf); } catch(e){ return res.status(500).json({ error: e.message }); } });

// Anthropic Admin API: Get API Key details (secure proxy)
// GET /api/v1/anthropic/admin/api_keys/:id
app.get('/api/v1/anthropic/admin/api_keys/:id', async (req, res) => {
  try {
    const adminKey = process.env.ANTHROPIC_ADMIN_KEY || '';
    const { id } = req.params || {};
    if (!id || !String(id).trim()) return res.status(400).json({ ok:false, error:'api_key_id is required' });
    if (!adminKey) return res.status(500).json({ ok:false, error:'ANTHROPIC_ADMIN_KEY missing' });
    const url = `https://api.anthropic.com/v1/organizations/api_keys/${encodeURIComponent(id)}`;
    const r = await fetch(url, { headers: { 'anthropic-version':'2023-06-01', 'content-type':'application/json', 'x-api-key': adminKey } });
    const text = await r.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    if (!r.ok) return res.status(r.status).json({ ok:false, error: data });
    return res.json({ ok:true, key: data });
  } catch(e){
    return res.status(500).json({ ok:false, error: e.message });
  }
});

// dashboard (static)
app.get('/dashboard', (req,res)=>{ const f=path.join(process.cwd(),'web-app','outcomes-dashboard.html'); if (fs.existsSync(f)) return res.sendFile(f); res.status(404).send('dashboard missing'); });

// start server
if (!process.env.TEST_MODE) {
  app.listen(PORT, HOST, ()=>{ const shown = (HOST==='0.0.0.0'?'localhost':HOST); console.log(`TooLoo.ai API running on http://${shown}:${PORT}`); });
}


