import express from 'express';
import cors from 'cors';
import ConfidenceScorer from '../engine/confidence-scorer.js';
import CostCalculator from '../engine/cost-calculator.js';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.CUP_PORT || 3005;
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Initialize confidence scorer
const scorer = new ConfidenceScorer({
  minAcceptanceConfidence: Number(process.env.CUP_CONFIDENCE_THRESHOLD || 0.82),
  maxRetriesPerNode: Number(process.env.CUP_MAX_RETRIES || 2),
  ensembleMergeThreshold: Number(process.env.CUP_ENSEMBLE_THRESHOLD || 0.65)
});

// Phase 3: Initialize cost calculator for ROI-based tournament ranking
const costCalc = new CostCalculator();

// Health
app.get('/health', (req,res)=> res.json({ ok:true, server:'cup', time:new Date().toISOString() }));

// In-memory tournament state and results
const tournaments = new Map(); // tournamentId -> { id, nodeId, candidates, results, winner, mergedResult }

/**
 * Legacy: Simple in-memory scoreboard
 */
function getScoreboard(){
  const overall = {
    deepseek: { rank: 1, avgScore: 86.5, totalCost: 0.42 },
    claude: { rank: 2, avgScore: 84.0, totalCost: 0.88 },
    openai: { rank: 3, avgScore: 82.3, totalCost: 1.41 },
    gemini: { rank: 4, avgScore: 78.9, totalCost: 0.65 }
  };
  return { overall, lastUpdated: new Date().toISOString() };
}

app.get('/api/v1/cup/scoreboard', (req,res)=>{
  try{ res.json({ ok:true, scoreboard: getScoreboard() }); }catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

app.post('/api/v1/cup/mini', async (req,res)=>{
  // Simulate a quick evaluation; return updated scoreboard and a summary
  try{
    const scoreboard = getScoreboard();
    const summary = {
      testsRun: 12,
      domains: ['DSA','OS','DB','ML'],
      winner: 'deepseek',
      avgWinnerScore: scoreboard.overall.deepseek.avgScore
    };
    res.json({ ok:true, scoreboard, summary });
  }catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

// ====== NEW TOURNAMENT ENDPOINTS ======

/**
 * POST /api/v1/cup/tournament/create
 * Create a new cross-model tournament for artifact evaluation
 * 
 * Payload:
 * {
 *   nodeId: string,
 *   candidates: [
 *     { id, provider, model, content, costUsd, latencyMs },
 *     ...
 *   ],
 *   evidence: {
 *     deterministicChecks: { test1: true, lint: true, ... },
 *     sources: [ { text, url, confidence } ],
 *     claims: [ "claim1", "claim2" ],
 *     criticAgreement: { model1: 0.85, model2: 0.88 },
 *     semanticMetrics: { fluencyScore: 0.9, relevanceScore: 0.85 },
 *     modelProvider: "anthropic",
 *     historicalSuccess: 0.92
 *   }
 * }
 */
app.post('/api/v1/cup/tournament/create', async (req,res)=>{
  try {
    const { nodeId, candidates, evidence } = req.body;
    
    if (!nodeId || !candidates || !Array.isArray(candidates) || candidates.length === 0) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Missing or invalid nodeId, candidates'
      });
    }
    
    const tournamentId = uuidv4();
    const results = [];
    
    // Score each candidate
    for (const candidate of candidates) {
      const score = scorer.score(candidate, {
        ...evidence,
        costUsd: candidate.costUsd,
        modelProvider: candidate.provider
      });
      
      scorer.recordAttempt(nodeId, candidate.provider, score, candidate.costUsd, true);
      
      results.push({
        candidateId: candidate.id,
        provider: candidate.provider,
        model: candidate.model,
        score: score.overall,
        components: score.components,
        costUsd: candidate.costUsd,
        latencyMs: candidate.latencyMs
      });
    }
    
    // Sort by score (descending)
    results.sort((a, b) => b.score - a.score);
    
    // Determine winner and adjudication
    const topResult = results[0];
    const topTwo = results.slice(0, 2);
    
    let winner = topResult;
    let mergedResult = null;
    let adjudication = null;
    
    if (
      topTwo.length > 1 &&
      topTwo[0].score < scorer.config.minAcceptanceConfidence &&
      topTwo[0].score >= scorer.config.ensembleMergeThreshold
    ) {
      // Attempt ensemble merge
      const merge = scorer.attemptEnsemble(
        candidates[0],
        candidates[1],
        results[0],
        results[1]
      );
      
      if (merge.canMerge) {
        mergedResult = {
          strategy: merge.mergeStrategy,
          mergedConfidence: merge.mergedConfidence,
          mergedFrom: [topTwo[0].candidateId, topTwo[1].candidateId],
          note: merge.note
        };
        winner = {
          ...topResult,
          isMerged: true,
          mergedConfidence: merge.mergedConfidence
        };
      }
    }
    
    // Determine fate (accept/retry/escalate)
    const fate = await scorer.decideFate(nodeId, topResult, 1);
    
    const tournament = {
      id: tournamentId,
      nodeId,
      candidateCount: candidates.length,
      results,
      winner,
      mergedResult,
      fate,
      createdAt: new Date().toISOString()
    };
    
    tournaments.set(tournamentId, tournament);
    
    res.json({ 
      ok: true, 
      tournament: {
        id: tournamentId,
        nodeId,
        results: results.map(r => ({
          candidateId: r.candidateId,
          provider: r.provider,
          score: r.score,
          costUsd: r.costUsd
        })),
        winner: {
          candidateId: winner.candidateId,
          provider: winner.provider,
          score: winner.score || winner.mergedConfidence,
          costUsd: winner.costUsd
        },
        mergedResult,
        fate: fate.decision
      }
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * GET /api/v1/cup/tournament/{id}
 * Retrieve a completed tournament
 */
app.get('/api/v1/cup/tournament/:id', (req,res)=>{
  try {
    const tournament = tournaments.get(req.params.id);
    
    if (!tournament) {
      return res.status(404).json({ ok: false, error: 'Tournament not found' });
    }
    
    res.json({ ok: true, tournament });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * GET /api/v1/cup/stats
 * Get overall cup statistics
 */
app.get('/api/v1/cup/stats', (req,res)=>{
  try {
    const allTournaments = Array.from(tournaments.values());
    
    const stats = {
      totalTournaments: allTournaments.length,
      totalCandidates: allTournaments.reduce((sum, t) => sum + t.candidateCount, 0),
      averageWinnerScore: allTournaments.length > 0 
        ? allTournaments.reduce((sum, t) => sum + (t.winner.score || t.winner.mergedConfidence || 0), 0) / allTournaments.length
        : 0,
      mergedResults: allTournaments.filter(t => t.mergedResult).length,
      escalations: allTournaments.filter(t => t.fate.decision === 'escalate').length
    };
    
    res.json({ ok: true, stats });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ============================================================================
// PHASE 3: COST-AWARE TOURNAMENT RANKING
// ============================================================================

/**
 * POST /api/v1/cup/cost-aware-tournament
 * Rank workflows by ROI (capability value / provider cost) with efficiency bonuses
 * 
 * Payload:
 * {
 *   workflows: [
 *     { id, provider, expectedGain, cost },
 *     ...
 *   ],
 *   cohortId: "cohort-001",
 *   budgetRemaining: 1000
 * }
 */
app.post('/api/v1/cup/cost-aware-tournament', (req, res) => {
  try {
    const { workflows = [], cohortId, budgetRemaining } = req.body || {};
    
    if (!workflows || workflows.length === 0) {
      return res.status(400).json({ ok: false, error: 'workflows array required' });
    }
    
    // Rank by ROI
    const ranked = costCalc.rankByROI(workflows);
    
    // Filter by budget if available
    const affordable = budgetRemaining 
      ? costCalc.filterAffordable(ranked, budgetRemaining)
      : ranked;
    
    // Get provider efficiency stats
    const providerStats = costCalc.getProviderEfficiency(ranked);
    
    res.json({
      ok: true,
      cohortId: cohortId || 'unknown',
      totalWorkflows: workflows.length,
      affordableWorkflows: affordable.length,
      budgetRemaining,
      ranked: ranked.slice(0, 20), // Top 20
      affordable: affordable.slice(0, 10), // Top 10 affordable
      winner: ranked.length > 0 ? ranked[0] : null,
      winnerROI: ranked.length > 0 ? ranked[0].weightedROI.toFixed(2) : 0,
      providerStats: providerStats.slice(0, 5),
      recommendation: affordable.length > 0 
        ? `Execute ${affordable[0].id || 'top workflow'} using ${affordable[0].provider}`
        : 'Insufficient budget for any workflow'
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * POST /api/v1/cup/suggest-provider
 * Suggest cheapest provider for a workflow given budget constraints
 * 
 * Payload:
 * {
 *   workflowId: "wf-001",
 *   expectedGain: 0.8,
 *   budgetRemaining: 50
 * }
 */
app.post('/api/v1/cup/suggest-provider', (req, res) => {
  try {
    const { workflowId, expectedGain = 0.5, budgetRemaining = 1000 } = req.body || {};
    
    // Create synthetic workflows for each provider
    const providerWorkflows = Object.keys(costCalc.providers).map(provider => ({
      id: `${workflowId}-${provider}`,
      provider,
      expectedGain
    }));
    
    // Rank by ROI
    const ranked = costCalc.rankByROI(providerWorkflows);
    const affordable = costCalc.filterAffordable(ranked, budgetRemaining);
    
    res.json({
      ok: true,
      workflowId,
      budgetRemaining,
      recommended: affordable.length > 0 ? affordable[0].provider : 'ollama',
      alternatives: affordable.slice(0, 3).map(wf => ({
        provider: wf.provider,
        cost: wf.cost,
        roi: wf.roi.toFixed(2),
        efficiency: wf.costTier
      })),
      cheapest: ranked.length > 0 ? ranked[0].provider : 'ollama'
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.listen(PORT, ()=> console.log(`cup-server listening on http://localhost:${PORT}`));
