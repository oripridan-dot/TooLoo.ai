import express from 'express';
import cors from 'cors';
import BudgetManager from '../engine/budget-manager.js';
import { getProviderStatus, generateSmartLLM } from '../engine/llm-provider.js';
import environmentHub from '../engine/environment-hub.js';

const app = express();
const PORT = process.env.BUDGET_PORT || 3003;
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const budget = new BudgetManager({ limit: Number(process.env.DAILY_BUDGET_LIMIT || 5.0) });
environmentHub.registerComponent('budgetManager', budget, ['budget-management', 'provider-orchestration']);

// Mutable provider policy for quick tuning
const providerPolicy = {
	maxConcurrency: Number(process.env.PROVIDER_MAX_CONCURRENCY || 4),
	minConcurrency: 1,
	criticality: 'normal'
};

app.get('/api/v1/providers/policy', (req, res) => {
	try { res.json({ ok: true, policy: providerPolicy }); } catch (e) { res.status(500).json({ ok:false, error: e.message }); }
});

app.post('/api/v1/providers/policy', (req, res) => {
	try {
		const { maxConcurrency, criticality } = req.body || {};
		if (maxConcurrency !== undefined) providerPolicy.maxConcurrency = Math.max(1, Math.min(Number(maxConcurrency)||1, 12));
		if (criticality) providerPolicy.criticality = String(criticality);
		res.json({ ok: true, policy: providerPolicy });
	} catch (e) { res.status(500).json({ ok:false, error: e.message }); }
});

app.get('/health', (req,res)=> res.json({ ok:true, server:'budget', time:new Date().toISOString() }));
app.get('/api/v1/budget', (req,res)=>{ try{ res.json({ ok:true, budget: budget.getStatus() }); }catch(e){ res.status(500).json({ ok:false, error:e.message }); }});
app.get('/api/v1/providers/status', (req,res)=>{ try{ res.json({ ok:true, status: getProviderStatus() }); }catch(e){ res.status(500).json({ ok:false, error:e.message }); }});

// Simple in-memory TTL cache for provider burst prompts
const CACHE = new Map(); // key -> { text, until }
function cacheGet(key){ const v=CACHE.get(key); if (v && v.until> Date.now()) return v.text; CACHE.delete(key); return null; }
function cacheSet(key, text, ttlMs=3600000){ CACHE.set(key, { text, until: Date.now()+ttlMs }); }

// Provider-aware burst: dial concurrency based on status and cache with TTL
app.post('/api/v1/providers/burst', async (req,res)=>{
	try{
		const { prompt = 'quick check', ttlSeconds = 3600, criticality = providerPolicy.criticality } = req.body || {};
		const cached = cacheGet(prompt);
		if (cached) return res.json({ ok:true, cached:true, text: cached });

		const status = getProviderStatus();
		// naive concurrency dial: count available providers
		const available = Object.values(status).filter(s=>s.available && s.enabled).length;
		const dynamic = Math.max(1, Math.min(available*2, 6));
		const concurrency = Math.max(providerPolicy.minConcurrency, Math.min(providerPolicy.maxConcurrency, dynamic));
		let text = '';
		if (available>0){
			const systemPrompt = "You are TooLoo, the AI assistant for TooLoo.ai. Never introduce yourself as any other AI or company. Structure ALL responses hierarchically: Start with a clear **heading** or key point. Use **bold** for emphasis. Break into sections with sub-headings if needed. Use bullet points (- or •) for lists. Keep it lean: no filler, direct answers only. Respond in clear, concise English. Be friendly, insightful, and proactive. If a small UI tweak would improve clarity (e.g., switch to lean/detailed mode, show/hide status, start a system check), append a final fenced UI control block using the exact syntax and same-origin paths only: ```ui\n{\"action\":\"setMode\",\"mode\":\"lean\"}\n``` You may also use: toggleSection {id, show}, open {url:\"/path\"}, priority {mode:\"chat\"|\"background\"}, startSystem, systemCheck, scrollTo {id}, setTheme {primaryColor}, setChatStyle {compact}, showHint {text}. Keep the main content clean and do not include UI JSON inside it.";
			const tasks = [];
			for (let i=0;i<concurrency;i++) tasks.push(generateSmartLLM({ prompt, system: systemPrompt, criticality }));
			const results = await Promise.allSettled(tasks);
			const ok = results.find(r=>r.status==='fulfilled' && r.value?.text);
			text = ok ? ok.value.text : (results.find(r=>r.status==='fulfilled')?.value?.text || '');
		}else{
			text = `[mock] ${prompt} — providers unavailable; enable DeepSeek/OSS to replace this cached mock.`;
		}
		cacheSet(prompt, text, Number(ttlSeconds)*1000);
		res.json({ ok:true, cached:false, text, concurrency, providersAvailable: available>0, policy: providerPolicy });
	}catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

// GET fallback for environments where POST JSON is tricky
app.get('/api/v1/providers/burst', async (req,res)=>{
	try{
		const q = req.query||{};
		const prompt = String(q.prompt||'quick check');
		const ttlSeconds = Number(q.ttlSeconds||3600);
		const criticality = String(q.criticality||providerPolicy.criticality);
		const cached = cacheGet(prompt);
		if (cached) return res.json({ ok:true, cached:true, text: cached });
		const status = getProviderStatus();
		const available = Object.values(status).filter(s=>s.available && s.enabled).length;
		const dynamic = Math.max(1, Math.min(available*2, 6));
		const concurrency = Math.max(providerPolicy.minConcurrency, Math.min(providerPolicy.maxConcurrency, dynamic));
		let text = '';
		if (available>0){
			const systemPrompt = "You are TooLoo, the AI assistant for TooLoo.ai. Never introduce yourself as any other AI or company. Structure ALL responses hierarchically: Start with a clear **heading** or key point. Use **bold** for emphasis. Break into sections with sub-headings if needed. Use bullet points (- or •) for lists. Keep it lean: no filler, direct answers only. Respond in clear, concise English. Be friendly, insightful, and proactive. If a small UI tweak would improve clarity (e.g., switch to lean/detailed mode, show/hide status, start a system check), append a final fenced UI control block using the exact syntax and same-origin paths only: ```ui\n{\"action\":\"setMode\",\"mode\":\"lean\"}\n``` You may also use: toggleSection {id, show}, open {url:\"/path\"}, priority {mode:\"chat\"|\"background\"}, startSystem, systemCheck, scrollTo {id}, setTheme {primaryColor}, setChatStyle {compact}, showHint {text}. Keep the main content clean and do not include UI JSON inside it.";
			const tasks = [];
			for (let i=0;i<concurrency;i++) tasks.push(generateSmartLLM({ prompt, system: systemPrompt, criticality }));
			const results = await Promise.allSettled(tasks);
			const ok = results.find(r=>r.status==='fulfilled' && r.value?.text);
			text = ok ? ok.value.text : (results.find(r=>r.status==='fulfilled')?.value?.text || '');
		}else{
			text = `[mock] ${prompt} — providers unavailable; enable DeepSeek/OSS to replace this cached mock.`;
		}
		cacheSet(prompt, text, ttlSeconds*1000);
		res.json({ ok:true, cached:false, text, concurrency, providersAvailable: available>0, policy: providerPolicy });
	}catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

app.get('/api/v1/budget/history', (req, res) => {
  try {
    res.json({ ok: true, history: budget.state.history });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get('/api/v1/providers/costs', (req, res) => {
  try {
    res.json({ ok: true, prices: budget.prices });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get('/api/v1/providers/recommend', (req, res) => {
  try {
    const status = getProviderStatus();
    // Recommend cheapest available provider
    const available = Object.entries(status).filter(([k, v]) => v.available && v.enabled);
    if (!available.length) return res.json({ ok: false, error: 'No providers available' });
    const sorted = available.sort((a, b) => (budget.getProviderCost(a[0]) - budget.getProviderCost(b[0])));
    res.json({ ok: true, recommended: sorted[0][0], cost: budget.getProviderCost(sorted[0][0]) });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.listen(PORT, ()=> console.log(`budget-server listening on http://localhost:${PORT}`));
