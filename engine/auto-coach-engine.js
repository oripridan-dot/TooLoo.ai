export default class AutoCoachEngine {
  constructor(options = {}) {
    this.trainingCamp = options.trainingCamp;
    this.metaLearningEngine = options.metaLearningEngine;
    this.logger = options.logger || console;
    this.thresholds = Object.assign({
      minAvgMastery: 75,
      maxBelow80: 3,
      intervalMs: 2000,
      maxRoundsPerCycle: 3,
      microBatchesPerTick: 1,           // Run N micro-batches per tick to amortize overhead
      autoFocusOnLaunch: true,          // On start: run short focus burst if big gaps
      autoFocusGapDelta: 20,            // If mastery < (targetThreshold - delta)
      fastLane: { enabled: true, targets: ['meta-learning'], weight: 2 }
    }, options.thresholds || {});

    this._timer = null;
    this._active = false;
    this._metaTriggered = false;
    this._roundsRun = 0;
    this._lastAction = null;
    this._lastStatus = null;
    this._normalInterval = this.thresholds.intervalMs;
    this._normalMicro = this.thresholds.microBatchesPerTick || 1;
    this._normalBatch = this.thresholds.batchSize || 1;
  }

  getStatus() {
    return {
      active: this._active,
      metaTriggered: this._metaTriggered,
      roundsRun: this._roundsRun,
      lastAction: this._lastAction,
      thresholds: this.thresholds,
      lastStatus: this._lastStatus
    };
  }

  async start() {
    if (this._active) return this.getStatus();
    this._active = true;
    this._metaTriggered = false;
    this._roundsRun = 0;
    this._lastAction = 'auto-coach started';

    // Ensure meta engine initialized
    try { await this.metaLearningEngine?.init?.(); } catch {}

    // Kick off training camp if not active
    try {
      const st = this.trainingCamp.getStatus();
      if (!st.isActive) await this.trainingCamp.startCamp();
    } catch {}

    // Optional auto-focus burst on launch when gaps are large
    try { await this._maybeAutoFocusBurstOnStart(); } catch {}
    // Engage Rush Mode by default for Meta‑Learning until completion
    try { await this._ensureRushModeForMeta(); } catch {}
    this._timer = setInterval(() => this._tick().catch(()=>{}), this.thresholds.intervalMs);
    return this.getStatus();
  }

  async stop() {
    if (this._timer) clearInterval(this._timer);
    this._timer = null;
    this._active = false;
    this._lastAction = 'auto-coach stopped';
    return this.getStatus();
  }

  async _tick() {
    if (!this._active) return;

    // Read current mastery overview
  const overview = await this.trainingCamp.getOverviewData();
    const domains = Array.isArray(overview?.domains) ? overview.domains : [];
    const avg = domains.length ? (domains.reduce((s,d)=>s+(d.mastery||0),0)/domains.length) : 0;
    const below80 = domains.filter(d => (d.mastery||0) < 80);
    this._lastStatus = { avg: Math.round(avg*10)/10, below80: below80.length };

    // If we already triggered meta-learning, keep idle
    if (this._metaTriggered) { this._lastAction = 'meta already triggered'; return; }

    // Hyper-aggressive mode when enabled
  let cycleRounds = this.thresholds.maxRoundsPerCycle;
    const isHyperMode = this.thresholds.hyperMode;
    const aggressiveThreshold = this.thresholds.aggressiveThreshold || 50;
    
    if (this.thresholds.aggressiveMode && avg < aggressiveThreshold) {
      cycleRounds = Math.floor(cycleRounds * (this.thresholds.aggressiveMultiplier || 2));
      if (isHyperMode) cycleRounds *= 2; // Double again in hyper mode
      cycleRounds = Math.min(cycleRounds, 20); // Cap at 20 rounds per cycle for safety
    }

    // If not ready, run multiple parallel rounds to raise weak domains faster
    const needsCoaching = avg < this.thresholds.minAvgMastery || below80.length > this.thresholds.maxBelow80;
    if (needsCoaching) {
      const batchSize = this.thresholds.batchSize || 1;
      let ran = 0;
      // Micro-batching: split cycles into micro batches per tick
      const micro = Math.max(1, this.thresholds.microBatchesPerTick || 1);
      for (let mb = 0; mb < micro && ran < cycleRounds; mb++) {
        const toRun = Math.min(batchSize, cycleRounds - ran);
        const batchPromises = [];
        for (let b = 0; b < toRun; b++) { batchPromises.push(this.trainingCamp.runRound()); }
        const results = await Promise.all(batchPromises);
        this._roundsRun += results.length;
        ran += results.length;
        const modeLabel = isHyperMode ? ' HYPER' : (this.thresholds.aggressiveMode && avg < aggressiveThreshold ? ' aggressive' : '');
        this._lastAction = `micro-batch ${results.length} rounds (tick +${ran}${modeLabel})`;
      }
      return;
    }

    // Ready for Meta-Learning: start and run all phases once
    try {
      await this.metaLearningEngine.start();
      await this.metaLearningEngine.runAllPhases();
      this._metaTriggered = true;
      this._lastAction = 'meta-learning phases completed';
      // After completion, revert Rush Mode to normal
      this._disableRushMode();
    } catch (e) {
      this._lastAction = `meta-learning error: ${e.message}`;
    }
    // Keep Rush Mode if meta not completed yet
    try { await this._ensureRushModeForMeta(); } catch {}
  }

  _enableRushMode() {
    this.thresholds.fastLane = { enabled: true, weight: 2 };
    this.thresholds.microBatchesPerTick = Math.max(3, this.thresholds.microBatchesPerTick || 1);
    this.thresholds.batchSize = Math.max(3, this.thresholds.batchSize || 1);
    this.thresholds.intervalMs = Math.min(800, this.thresholds.intervalMs || 2000);
  }
  _disableRushMode() {
    // If persistent fast-lane is enabled externally, do not disable
    if (this.thresholds.fastLane && this.thresholds.fastLane.enabled) {
      return; // keep current rush settings
    }
    this.thresholds.fastLane = { enabled: false, weight: 1 };
    this.thresholds.microBatchesPerTick = this._normalMicro;
    this.thresholds.batchSize = this._normalBatch;
    this.thresholds.intervalMs = this._normalInterval;
  }
  async _ensureRushModeForMeta() {
    try {
      // If fast-lane explicitly enabled, force rush mode regardless of meta phases
      if (this.thresholds.fastLane && this.thresholds.fastLane.enabled) {
        this._enableRushMode();
        return;
      }
      const st = await this.metaLearningEngine?.getStatus?.();
      const phases = st?.phases || {};
      const done = Object.values(phases).filter(p=>p.status==='completed').length;
      if (done < 4) this._enableRushMode(); else this._disableRushMode();
    } catch { /* best-effort */ }
  }

  async _maybeAutoFocusBurstOnStart() {
    if (!this.thresholds.autoFocusOnLaunch) return;
    try {
      const overview = await this.trainingCamp.getOverviewData();
      const sel = overview?.selection || {};
      const delta = Number(this.thresholds.autoFocusGapDelta || 20);
      const target = Number(sel.targetThreshold || 80);
      const weak = (overview?.domains || []).filter(d => (d.mastery||0) < (target - delta));
      if (weak.length > 0) {
        // Temporarily enforce auto-fill with current N; run small burst
        const gaps = Number(sel.gapsCount || 2);
        await fetch(`/api/v1/training/settings/update?autoFillGaps=true&gapsCount=${gaps}`);
        const burst = Math.min(6, this.thresholds.maxRoundsPerCycle * 2);
        const promises = [];
        for (let i=0;i<burst;i++) promises.push(this.trainingCamp.runRound());
        await Promise.all(promises);
        // No hard revert here: settings panel and Focus button handle persistence explicitly
        this._lastAction = `auto-focus burst on launch (${burst} rounds)`;
      }
    } catch {}
  }
}
