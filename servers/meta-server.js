import express from 'express';
import cors from 'cors';
import MetaLearningEngine from '../engine/meta-learning-engine.js';
import fs from 'fs';
import path from 'path';
import environmentHub from '../engine/environment-hub.js';

const app = express();
const PORT = process.env.META_PORT || 3002;
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const meta = new MetaLearningEngine({ workspaceRoot: process.cwd() });
environmentHub.registerComponent('metaLearningEngine', meta, ['meta-learning', 'reporting', 'insights']);

app.get('/health', (req,res)=> res.json({ ok:true, server:'meta', time:new Date().toISOString() }));
app.get('/api/v4/meta-learning/status', async (req,res)=>{ try{ await meta.init(); res.json({ ok:true, status: meta.getStatus() }); }catch(e){ res.status(500).json({ ok:false, error:e.message }); }});
app.post('/api/v4/meta-learning/start', async (req,res)=>{ try{ await meta.init(); const s=await meta.start(); res.json({ ok:true, status:s }); }catch(e){ res.status(500).json({ ok:false, error:e.message }); }});
app.post('/api/v4/meta-learning/run-all', async (req,res)=>{ try{ await meta.init(); const r=await meta.runAllPhases(); res.json({ ok:true, report:r }); }catch(e){ res.status(500).json({ ok:false, error:e.message }); }});
app.get('/api/v4/meta-learning/report', async (req,res)=>{ try{ await meta.init(); res.json({ ok:true, report: meta.getReport() }); }catch(e){ res.status(500).json({ ok:false, error:e.message }); }});
app.get('/api/v4/meta-learning/insights', async (req,res)=>{ try{ await meta.init(); res.json({ ok:true, insights: meta.getInsights() }); }catch(e){ res.status(500).json({ ok:false, error:e.message }); }});

// Knowledge endpoint: curated bibliography of published books (CS & Design)
app.get('/api/v4/meta-learning/knowledge', async (req,res)=>{
	try{
		const file = path.join(process.cwd(), 'data', 'knowledge', 'bibliography.json');
		const exists = fs.existsSync(file);
		if (!exists) return res.json({ ok:true, sources: [], note: 'No bibliography found' });
		const raw = await fs.promises.readFile(file, 'utf-8');
		const data = JSON.parse(raw);
		res.json({ ok:true, ...data });
	}catch(e){
		res.status(500).json({ ok:false, error:e.message });
	}
});

app.get('/api/v4/meta-learning/phase/:phaseNumber/report', async (req, res) => {
  try {
    await meta.init();
    const phaseNumber = Number(req.params.phaseNumber);
    if (!meta.phases[phaseNumber]) {
      return res.status(404).json({ ok: false, error: 'Phase not found' });
    }
    res.json({ ok: true, report: meta.phases[phaseNumber] });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get('/api/v4/meta-learning/activity-log', async (req, res) => {
  try {
    await meta.init();
    res.json({ ok: true, log: meta.activityLog });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get('/api/v4/meta-learning/metrics', async (req, res) => {
  try {
    await meta.init();
    res.json({ ok: true, metrics: meta.metrics });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Retention booster: small, safe bump to knowledge retention and transfer efficiency
app.post('/api/v4/meta-learning/boost-retention', async (req, res) => {
  try {
    await meta.init();
    const payload = req.body || {};
    const result = await meta.boostRetention({ retentionDelta: Number(payload.retentionDelta||0.05), transferDelta: Number(payload.transferDelta||0.04) });
    res.json({ ok:true, booster: result, metrics: meta.metrics });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.listen(PORT, ()=> console.log(`meta-server listening on http://localhost:${PORT}`));
