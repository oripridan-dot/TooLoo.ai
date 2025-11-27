// @version 2.1.28
import { promises as fs } from "fs";

export default class StructuredExtractor {
  constructor(opts = {}) {
    this.opts = { maxWindowJoin: 1, ...opts };
    this.signalMap = {
      efficiency: ["efficiency", "efficient", "utilization"],
      robustness: [
        "robustness",
        "robust",
        "stability",
        "resilient",
        "resilience",
      ],
      accuracy: ["accuracy", "accurate", "precision", "exactness"],
      latency: ["latency", "response time", "delay", "rt", "p50", "p95", "p99"],
      throughput: [
        "throughput",
        "tps",
        "qps",
        "rate",
        "through-put",
        "tok/s",
        "tokens/s",
        "req/s",
        "requests per second",
      ],
      tokens: [
        "tokens",
        "token count",
        "prompt tokens",
        "completion tokens",
        "context window",
      ],
      memory: ["memory", "ram", "vram", "gb", "mb"],
      cost: [
        "cost",
        "price",
        "usd",
        "$",
        "dollar",
        "per-token cost",
        "cost per token",
        "per 1k tokens",
        "per 1000 tokens",
      ],
      energy: ["energy", "power", "watt", "w", "kw", "kwh"],
      bleu: ["bleu"],
      rouge: ["rouge", "rouge-l"],
      meteor: ["meteor"],
      cider: ["cider", "cider-d"],
      chrf: ["chrf", "chrf++"],
      win_rate: [
        "win rate",
        "win-rate",
        "winrate",
        "human preference",
        "preference rate",
      ],
      f1: ["f1", "f1-score"],
      precision_metric: ["precision"],
      recall_metric: ["recall"],
      perplexity: ["perplexity", "ppl"],
      safety: ["safety", "jailbreak", "harmful", "risk"],
      privacy: [
        "privacy",
        "differential privacy",
        "dp",
        "anonymization",
        "pseudonymization",
      ],
    };
    this.numberUnitRe = /(\d+(?:\.\d+)?)\s*(%|percent|pct|per\s*cent)/i;
  }

  unitToSignal(unit) {
    if (!unit) return null;
    if (unit === "USD") return "cost";
    if (
      unit === "USD/1k" ||
      unit === "USD/1K" ||
      unit === "USD/token" ||
      unit === "USD/tok"
    )
      return "cost";
    if (unit === "ms" || unit === "s" || unit === "min") return "latency";
    if (unit === "tok/s" || unit === "req/s") return "throughput";
    if (unit === "tokens") return "tokens";
    if (unit === "GB" || unit === "MB" || unit === "TB") return "memory";
    if (unit === "W" || unit === "kw" || unit === "kwh") return "energy";
    return null;
  }

  splitSentences(text = "") {
    // Split on . ! ? or newlines, but don't split decimals like 0.32
    // Use lookarounds: don't split on a dot if it's between digits
    const rough = text
      .replace(/\u2014|—/g, " - ")
      .split(/(?<!\d)[\.!?]+(?!\d)(?:\s+|$)|[\n\r]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const merged = [];
    for (const s of rough) {
      if (merged.length && s.length < 20) {
        merged[merged.length - 1] += " " + s;
      } else merged.push(s);
    }
    return merged;
  }

  normalizeUnit(u) {
    return "%";
  }
  extractNumbers(sentence) {
    const out = [];
    const s = sentence;
    // Percent variants
    for (const re of [/(\d+(?:\.\d+)?)\s*(%|percent|pct|per\s*cent)/gi]) {
      let m;
      while ((m = re.exec(s)))
        out.push({ n: Number(m[1]), unit: "%", match: m[0] });
    }
    // Time units
    for (const re of [/(\d+(?:\.\d+)?)\s*ms\b/gi]) {
      let m;
      while ((m = re.exec(s)))
        out.push({ n: Number(m[1]), unit: "ms", match: m[0] });
    }
    for (const re of [/(\d+(?:\.\d+)?)\s*(s|sec|secs|second|seconds)\b/gi]) {
      let m;
      while ((m = re.exec(s)))
        out.push({ n: Number(m[1]), unit: "s", match: m[0] });
    }
    for (const re of [/(\d+(?:\.\d+)?)\s*(m|min|mins|minute|minutes)\b/gi]) {
      let m;
      while ((m = re.exec(s)))
        out.push({ n: Number(m[1]), unit: "min", match: m[0] });
    }
    // Memory units
    for (const re of [/(\d+(?:\.\d+)?)\s*gb\b/gi]) {
      let m;
      while ((m = re.exec(s)))
        out.push({ n: Number(m[1]), unit: "GB", match: m[0] });
    }
    for (const re of [/(\d+(?:\.\d+)?)\s*mb\b/gi]) {
      let m;
      while ((m = re.exec(s)))
        out.push({ n: Number(m[1]), unit: "MB", match: m[0] });
    }
    for (const re of [/(\d+(?:\.\d+)?)\s*tb\b/gi]) {
      let m;
      while ((m = re.exec(s)))
        out.push({ n: Number(m[1]), unit: "TB", match: m[0] });
    }
    // Tokens & throughput
    for (const re of [
      /(\d+(?:\.\d+)?)\s*(tok\/s|tokens\/s|tokens\s*per\s*second|tps)\b/gi,
    ]) {
      let m;
      while ((m = re.exec(s)))
        out.push({ n: Number(m[1]), unit: "tok/s", match: m[0] });
    }
    for (const re of [
      /(\d+(?:\.\d+)?)\s*(qps|req\/s|requests\s*per\s*second)\b/gi,
    ]) {
      let m;
      while ((m = re.exec(s)))
        out.push({ n: Number(m[1]), unit: "req/s", match: m[0] });
    }
    for (const re of [/(\d+(?:\.\d+)?)\s*(token|tokens)\b/gi]) {
      let m;
      while ((m = re.exec(s)))
        out.push({ n: Number(m[1]), unit: "tokens", match: m[0] });
    }
    // Currency ($) with multipliers
    for (const re of [
      /\$\s*(\d+(?:\.\d+)?)\s*\/\s*(?:1k|1000|1K)\s*(?:tokens?|tok)/g,
    ]) {
      let m;
      while ((m = re.exec(s)))
        out.push({
          n: Number(m[1]) * 1000,
          unit: "USD",
          match: m[0],
          multiplier: 1000,
        });
    }
    for (const re of [/\$\s*(\d+(?:\.\d+)?)\s*\/\s*(?:tokens?|tok)\b/g]) {
      let m;
      while ((m = re.exec(s)))
        out.push({ n: Number(m[1]), unit: "USD", match: m[0], multiplier: 1 });
    }
    for (const re of [/\$\s*(\d+(?:\.\d+)?)/g]) {
      let m;
      while ((m = re.exec(s)))
        out.push({ n: Number(m[1]), unit: "USD", match: m[0] });
    }
    // Energy
    for (const re of [/(\d+(?:\.\d+)?)\s*(w|kw|kwh)\b/gi]) {
      let m;
      while ((m = re.exec(s)))
        out.push({
          n: Number(m[1]),
          unit: m[2].toLowerCase() === "w" ? "W" : m[2].toLowerCase(),
          match: m[0],
        });
    }
    // Quality metrics by name (bleu/rouge/f1/precision/recall/perplexity) without percent
    const qres = [
      { key: "bleu", re: /\bbleu\b[^\d]*(\d+(?:\.\d+)?)(%?)/i, unitIfPct: "%" },
      {
        key: "rouge",
        re: /\brouge(?:-l)?\b[^\d]*(\d+(?:\.\d+)?)(%?)/i,
        unitIfPct: "%",
      },
      { key: "f1", re: /\bf1\b[^\d]*(\d+(?:\.\d+)?)(%?)/i, unitIfPct: "%" },
      {
        key: "precision",
        re: /\bprecision\b[^\d]*(\d+(?:\.\d+)?)(%?)/i,
        unitIfPct: "%",
      },
      {
        key: "recall",
        re: /\brecall\b[^\d]*(\d+(?:\.\d+)?)(%?)/i,
        unitIfPct: "%",
      },
      {
        key: "perplexity",
        re: /\bperplexity\b[^\d]*(\d+(?:\.\d+)?)/i,
        unitIfPct: "",
      },
      {
        key: "meteor",
        re: /\bmeteor\b[^\d]*(\d+(?:\.\d+)?)(%?)/i,
        unitIfPct: "%",
      },
      {
        key: "cider",
        re: /\bcider(?:-d)?\b[^\d]*(\d+(?:\.\d+)?)(%?)/i,
        unitIfPct: "",
      },
      {
        key: "chrf",
        re: /\bchrf(?:\+\+)?\b[^\d]*(\d+(?:\.\d+)?)(%?)/i,
        unitIfPct: "%",
      },
      {
        key: "win_rate",
        re: /\b(?:win[- ]?rate|human[- ]?preference|preference[- ]?rate)\b[^\d]*(\d+(?:\.\d+)?)(%?)/i,
        unitIfPct: "%",
      },
    ];
    for (const q of qres) {
      const m = q.re.exec(s);
      if (m) {
        out.push({
          n: Number(m[1]),
          unit: m[2] === "%" ? "%" : q.key === "perplexity" ? "ppl" : "score",
          match: m[0],
          qualityKey: q.key,
        });
      }
    }
    // Cost per token vs per 1k tokens normalization
    // Examples: $0.32 per 1K tokens, $0.00032 per token, cost per token $0.00032, $0.45 / 1000 tokens
    const costPatterns = [
      // $0.32 per 1K tokens (variations of 1k/1,000/k)
      {
        re: /\$\s*(\d+(?:\.\d+)?)\s*(?:per|\/)\s*(?:1\s*,?\s*000|1\s*k|1k|1000|k)\s*(?:token|tokens)\b/gi,
        basis: "perK",
      },
      // $0.00032 per token
      {
        re: /\$\s*(\d+(?:\.\d+)?)\s*(?:per|\/)\s*(?:token|tok)\b/gi,
        basis: "perToken",
      },
      // cost per token $0.00032 (reversed order)
      {
        re: /costs?\s*per\s*(?:token|tok)\s*[:\-=]?\s*\$\s*(\d+(?:\.\d+)?)/gi,
        basis: "perToken",
      },
      // per 1k tokens costs $0.32 (reversed order)
      {
        re: /per\s*(?:1\s*,?\s*000|1\s*k|1k|1000|k)\s*(?:token|tokens)\s*(?:costs?|=|:)?\s*\$\s*(\d+(?:\.\d+)?)/gi,
        basis: "perK",
      },
      // $0.45 / 1000 tokens
      {
        re: /\$\s*(\d+(?:\.\d+)?)\s*\/\s*(?:1\s*,?\s*000|1k|1000|k)\s*(?:token|tokens)\b/gi,
        basis: "perK",
      },
    ];
    for (const p of costPatterns) {
      let m;
      while ((m = p.re.exec(s))) {
        const v = Number(m[1]);
        let perToken = v;
        let perK = v;
        if (p.basis === "perK") {
          perK = v;
          perToken = v / 1000;
        } else {
          perToken = v;
          perK = v * 1000;
        }
        out.push({
          n: perK,
          unit: "USD/1k",
          match: m[0],
          norm: { perTokenUSD: perToken, perKTokensUSD: perK, basis: p.basis },
        });
      }
    }
    return out;
  }
  findSignals(sentence) {
    const low = sentence.toLowerCase();
    const found = [];
    for (const [sig, words] of Object.entries(this.signalMap)) {
      if (words.some((w) => low.includes(w))) found.push(sig);
    }
    return found;
  }
  withinRangeForUnit(n, unit) {
    if (typeof n !== "number" || isNaN(n)) return false;
    if (unit === "%") return n >= 0 && n <= 100;
    // Broadly accept other units; basic sanity for non-negative where applicable
    if (
      [
        "ms",
        "s",
        "min",
        "GB",
        "MB",
        "TB",
        "USD",
        "tok/s",
        "req/s",
        "tokens",
        "W",
        "kw",
        "kwh",
        "score",
        "ppl",
      ].includes(unit)
    )
      return n >= 0;
    return n >= 0; // default
  }

  extract({ text = "", topic = "", signals = [] } = {}) {
    const sentences = this.splitSentences(text);
    const wanted =
      signals && signals.length ? signals : Object.keys(this.signalMap);
    const result = [];
    const perSentenceCap = this.opts.perSentenceCap ?? 6; // cap extractions per sentence
    for (let i = 0; i < sentences.length; i++) {
      const s = sentences[i];
      let nums = this.extractNumbers(s);
      // Heuristic: if sentence ends with a cut currency like "$0" and next starts with digits, join to recover decimals (e.g., $0.32)
      if (
        i + 1 < sentences.length &&
        /\$\s*\d+$/.test(s) &&
        /^\d/.test(sentences[i + 1])
      ) {
        const joined = s + sentences[i + 1];
        const jnums = this.extractNumbers(joined);
        if (jnums && jnums.length) {
          nums = jnums; // override with joined extraction
          // Also replace s with joined for downstream processing
          sentences[i] = joined; // mutate current for consistency
          // Mark next as consumed to avoid duplicate processing
          sentences[i + 1] = "";
        }
      }
      if (!nums.length) {
        // Join small next sentence if allowed (windowing) to catch split constructs
        if (i + 1 < sentences.length && sentences[i + 1].length < 60) {
          const joined = s + " " + sentences[i + 1];
          const nextNums = this.extractNumbers(joined);
          const sigs = this.findSignals(joined).filter((x) =>
            wanted.includes(x),
          );
          for (const num of nextNums) {
            if (!this.withinRangeForUnit(num.n, num.unit)) continue;
            const conf =
              0.7 +
              (/%$/.test(num.match) ? 0.2 : 0) +
              (topic && joined.toLowerCase().includes(topic.toLowerCase())
                ? 0.1
                : 0);
            const unitSig = this.unitToSignal(num.unit);
            let signal = sigs[0] || num.qualityKey || unitSig || null;
            if (unitSig && signal && signal !== unitSig) signal = unitSig; // prefer unit-derived when specific
            result.push({
              topic,
              signal,
              value: num.n,
              unit: num.unit || "%",
              sentence: joined,
              confidence: Math.min(0.98, conf),
            });
          }
        }
        continue;
      }
      const sigs = this.findSignals(s).filter(
        (x) => wanted.includes(x) || wanted.includes("*"),
      );
      let countForSentence = 0;
      for (const num of nums) {
        if (!this.withinRangeForUnit(num.n, num.unit)) continue;
        const conf =
          0.75 +
          (/%$/.test(num.match) ? 0.15 : 0) +
          (topic && s.toLowerCase().includes(topic.toLowerCase()) ? 0.1 : 0);
        const unitSig = this.unitToSignal(num.unit);
        // Prefer unit-derived mapping when it conflicts with contextual signals
        let signal =
          sigs[0] || num.qualityKey || unitSig || (num.norm ? "cost" : null);
        if (unitSig && signal && signal !== unitSig) signal = unitSig;
        const base = {
          topic,
          signal,
          value: num.n,
          unit: num.unit || "%",
          sentence: s,
          confidence: Math.min(0.99, conf),
        };
        if (num.norm) base.normalized = { ...num.norm };
        if (num.qualityKey && !signal) base.metric = num.qualityKey;
        result.push(base);
        countForSentence++;
        if (countForSentence >= perSentenceCap) break;
      }
    }
    // Post-filter: require signal when multiple signals are allowed
    let filtered = result.filter((r) => !!r.signal);
    // De-duplicate redundant cost entries: if normalized USD/1k present for same sentence, drop raw USD duplicates
    const keep = [];
    const seenBySentence = new Map(); // key: sentence -> info
    for (const r of filtered) {
      if (r.signal !== "cost") {
        keep.push(r);
        continue;
      }
      const key = r.sentence;
      const info = seenBySentence.get(key) || { hasNorm: false, raws: [] };
      if (r.unit && r.unit.toUpperCase && r.unit.toUpperCase() === "USD/1K") {
        info.hasNorm = true;
        // Keep normalized once; overwrite previous
        info.norm = r;
      } else if (r.unit === "USD") {
        info.raws.push(r);
      } else {
        // Other cost-like entries (unlikely) keep as-is
        keep.push(r);
      }
      seenBySentence.set(key, info);
    }
    for (const [, info] of seenBySentence) {
      if (info.hasNorm && info.norm) keep.push(info.norm);
      else keep.push(...info.raws);
    }
    filtered = keep;

    // Cross-sentence dedupe: if adjacent sentences yield identical normalized perK cost, keep first only
    try {
      const idxMap = new Map();
      // Rebuild sentences from text to index order
      // Note: splitSentences ensures same logic; we'll map by sentence string
      for (let i = 0; i < sentences.length; i++) {
        if (sentences[i]) idxMap.set(sentences[i], i);
      }
      const costSeen = new Map(); // key: perK value -> lastIdx kept
      const finalOut = [];
      for (const r of filtered) {
        if (
          r.signal !== "cost" ||
          !r.normalized ||
          typeof r.normalized.perKTokensUSD !== "number"
        ) {
          finalOut.push(r);
          continue;
        }
        const idx = idxMap.has(r.sentence) ? idxMap.get(r.sentence) : -Infinity;
        const key = r.normalized.perKTokensUSD;
        if (costSeen.has(key)) {
          const lastIdx = costSeen.get(key);
          if (
            isFinite(idx) &&
            isFinite(lastIdx) &&
            Math.abs(idx - lastIdx) <= 1
          ) {
            // skip duplicate adjacent cost
            continue;
          }
        }
        costSeen.set(key, idx);
        finalOut.push(r);
      }
      filtered = finalOut;
    } catch {
      /* best effort */
    }
    return filtered;
  }

  async persistExtractions(filePath, data) {
    try {
      const { promises: fs } = await import("fs");
      const path = await import("path");
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
      return true;
    } catch (e) {
      console.error("Failed to persist extractions:", e.message);
      return false;
    }
  }

  validateAssertion(extraction, signal, expectedValue, tolerance = 0.1) {
    if (!Array.isArray(extraction)) return false;
    const matches = extraction.filter(
      (item) =>
        item.signal === signal &&
        typeof item.value === "number" &&
        Math.abs(item.value - expectedValue) <= tolerance,
    );
    return matches.length > 0;
  }
}
