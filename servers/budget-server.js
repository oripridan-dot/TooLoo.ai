import express from 'express';
import cors from 'cors';
import BudgetManager from '../engine/budget-manager.js';
import CostCalculator from '../engine/cost-calculator.js';
import { getProviderStatus, generateSmartLLM } from '../engine/llm-provider.js';
import environmentHub from '../engine/environment-hub.js';

const app = express();
const PORT = process.env.BUDGET_PORT || 3003;
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const budget = new BudgetManager({ limit: Number(process.env.DAILY_BUDGET_LIMIT || 5.0) });
const costCalc = new CostCalculator(); // Phase 3: Cost-aware optimization
environmentHub.registerComponent('budgetManager', budget, ['budget-management', 'provider-orchestration']);
environmentHub.registerComponent('costCalculator', costCalc, ['cost-tracking', 'roi-analysis']);

// Real-time subscribers for performance monitoring
const realtimeSubscribers = new Set();

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

// ============================================================================
// PHASE 3: COST-AWARE OPTIMIZATION ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/budget/policy/:cohortId
 * Returns budget policy and cost metrics for a cohort
 */
app.get('/api/v1/budget/policy/:cohortId', (req, res) => {
  try {
    const cohortId = req.params.cohortId;
    const metrics = costCalc.getMetrics(cohortId);
    
    res.json({
      ok: true,
      cohortId,
      budgetPolicy: {
        monthlyBudget: 10000,
        dailyBudget: 350,
        costPerCapabilityTarget: 100 // Phase 3 target: down from 200+
      },
      metrics,
      providerRecommendations: costCalc.getProviderEfficiency(),
      efficiencyGain: costCalc.getEfficiencyGain(cohortId),
      suggestedPolicy: costCalc.suggestBudgetPolicy(cohortId, metrics)
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * POST /api/v1/budget/can-afford
 * Check if cohort can afford a workflow
 */
app.post('/api/v1/budget/can-afford', (req, res) => {
  try {
    const { cohortId, provider, estimatedCost } = req.body || {};
    
    if (!cohortId) {
      return res.status(400).json({ ok: false, error: 'cohortId required' });
    }

    const metrics = costCalc.getMetrics(cohortId);
    const cost = estimatedCost || costCalc.getProviderCost(provider || 'ollama');
    const canAfford = cost <= metrics.budgetRemaining;
    
    res.json({
      ok: true,
      cohortId,
      canAfford,
      cost,
      budgetRemaining: metrics.budgetRemaining,
      budgetUtilization: metrics.budgetUtilization,
      recommendation: canAfford 
        ? 'Proceed with workflow' 
        : `Budget insufficient. Consider cheaper provider: ${costCalc.findCheaperAlternative({ provider }, metrics.budgetRemaining)?.provider || 'ollama'}`
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * POST /api/v1/budget/record-workflow
 * Record a workflow execution and update cost metrics
 */
app.post('/api/v1/budget/record-workflow', (req, res) => {
  try {
    const { cohortId, workflowId, provider, cost, capabilityGain } = req.body || {};
    
    if (!cohortId || !workflowId) {
      return res.status(400).json({ ok: false, error: 'cohortId and workflowId required' });
    }

    const actualCost = cost || costCalc.getProviderCost(provider || 'ollama');
    costCalc.recordWorkflow(cohortId, workflowId, provider || 'ollama', actualCost, capabilityGain || 1);
    
    const metrics = costCalc.getMetrics(cohortId);
    res.json({
      ok: true,
      recorded: true,
      cohortId,
      workflowId,
      metrics
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * GET /api/v1/budget/metrics/:cohortId
 * Get detailed cost and efficiency metrics for a cohort
 */
app.get('/api/v1/budget/metrics/:cohortId', (req, res) => {
  try {
    const cohortId = req.params.cohortId;
    const metrics = costCalc.getMetrics(cohortId);
    const efficiencyGain = costCalc.getEfficiencyGain(cohortId);
    
    res.json({
      ok: true,
      cohortId,
      metrics,
      efficiencyGain: `${efficiencyGain}x improvement from baseline`,
      providerDistribution: metrics.providerDistribution,
      costPerCapability: metrics.costPerCapability.toFixed(2),
      budgetUtilization: `${metrics.budgetUtilization}%`
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * POST /api/v1/budget/rank-by-roi
 * Rank workflows by ROI (cost-aware)
 */
app.post('/api/v1/budget/rank-by-roi', (req, res) => {
  try {
    const { workflows = [], cohortId } = req.body || {};
    
    const ranked = costCalc.rankByROI(workflows);
    const metrics = cohortId ? costCalc.getMetrics(cohortId) : null;
    
    // Filter by budget if cohortId provided
    const affordable = metrics 
      ? costCalc.filterAffordable(ranked, metrics.budgetRemaining)
      : ranked;
    
    res.json({
      ok: true,
      total: workflows.length,
      ranked: ranked.slice(0, 10), // Top 10
      affordable: affordable.slice(0, 10),
      budgetRemaining: metrics?.budgetRemaining || 'unknown'
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * GET /api/v1/budget/export
 * Export all cost and efficiency data for dashboard
 */
app.get('/api/v1/budget/export', (req, res) => {
  try {
    const data = costCalc.export();
    res.json({
      ok: true,
      ...data
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Real-time performance monitoring endpoints

/**
 * GET /api/v1/providers/realtime
 * Server-Sent Events endpoint for real-time provider performance updates
 */
app.get('/api/v1/providers/realtime', (req, res) => {
  // Set headers for SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Send initial data
  const sendUpdate = () => {
    try {
      const status = getProviderStatus();
      const budgetStatus = budget.getStatus();
      const costData = costCalc.getSummary();

      const data = {
        timestamp: Date.now(),
        providers: status,
        budget: budgetStatus,
        costs: costData,
        policy: providerPolicy
      };

      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      console.error('Error sending realtime update:', error);
    }
  };

  // Send initial update
  sendUpdate();

  // Send updates every 5 seconds
  const interval = setInterval(sendUpdate, 5000);

  // Handle client disconnect
  req.on('close', () => {
    clearInterval(interval);
    res.end();
  });
});

/**
 * POST /api/v1/providers/performance-update
 * Endpoint to receive performance updates from orchestrator
 */
app.post('/api/v1/providers/performance-update', (req, res) => {
  try {
    const { type, data } = req.body || {};

    // Broadcast update to all realtime subscribers
    const updateEvent = {
      type: type || 'performance-update',
      data,
      timestamp: Date.now()
    };

    // In a real implementation, you'd broadcast to WebSocket clients
    // For now, we'll just acknowledge receipt
    console.log('Performance update received:', updateEvent);

    res.json({ ok: true, received: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * GET /api/v1/providers/performance-stream
 * Alternative polling endpoint for performance data
 */
app.get('/api/v1/providers/performance-stream', (req, res) => {
  try {
    const status = getProviderStatus();
    const budgetStatus = budget.getStatus();
    const costData = costCalc.getSummary();

    res.json({
      ok: true,
      timestamp: Date.now(),
      providers: status,
      budget: budgetStatus,
      costs: costData,
      policy: providerPolicy
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.listen(PORT, ()=> console.log(`budget-server listening on http://localhost:${PORT}`));
