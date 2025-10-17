// Prototype: Parallel Thread Detection (Phase 0)
// Non-invasive helper used by content.js when premium enabled or experiment flag set.
// Provides a minimal heuristic for identifying concurrent thematic strands.

class ParallelThreadDetector {
  constructor() {
    this.minMessagesPerThread = 2;
  }

  analyze(messages = []) {
    if (!Array.isArray(messages) || messages.length < 6) return { threads: [], confidence: 0 };
    // Step 1: Extract topic tokens (very rough heuristic)
    const topicKeywords = ['design','code','test','api','error','plan','deploy','idea','ux','backend','frontend'];
    const enriched = messages.map((m, i) => ({
      i,
      role: m.role,
      content: m.content,
      keywords: topicKeywords.filter(k => m.content.toLowerCase().includes(k))
    }));
    // Step 2: Group by dominant keyword sets
    const buckets = new Map();
    enriched.forEach(msg => {
      const key = msg.keywords.sort().join('|') || 'general';
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(msg);
    });
    // Step 3: Filter viable threads
    const threads = Array.from(buckets.entries())
      .filter(([k, msgs]) => k !== 'general' && msgs.length >= this.minMessagesPerThread)
      .map(([k, msgs], idx) => ({
        id: `thread_${idx+1}`,
        label: k.split('|').map(w => w.charAt(0).toUpperCase()+w.slice(1)).join(' / '),
        span: [msgs[0].i, msgs[msgs.length - 1].i],
        messageIndexes: msgs.map(m => m.i),
        count: msgs.length
      }));
    // Step 4: Compute naive confidence
    const confidence = Math.min(0.9, threads.length * 0.2);
    return { threads, confidence };
  }
}

window.ParallelThreadDetector = ParallelThreadDetector;