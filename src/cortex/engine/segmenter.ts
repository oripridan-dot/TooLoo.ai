// @version 2.1.28
/**
 * SegmenterEngine (Phase P2)
 * Heuristic phase detection over parsed messages.
 *
 * Strategy:
 * 1. Score each message across label candidates using lexical patterns.
 * 2. Choose highest scoring label above minimal threshold; else FALLBACK 'EXECUTION'.
 * 3. Create a new segment when label changes OR a high-signal trigger occurs.
 * 4. Merge very short singleton segments (<1 msg length) into neighbor unless trigger label.
 */

const LABELS = {
  PIVOT: "Pivot Question",
  RISK: "Risk Enumeration",
  MITIG: "Mitigation Plan",
  OPTION: "Option Framing",
  DECISION: "Decision Compression",
  AUTH: "Authorization",
  PRIV: "Privacy Principle",
  META: "Profile Request",
  PROFILE: "Profile Delivery",
  FORMAT: "Format Convention",
  ONBOARD: "Onboarding Design",
  EXEC: "Execution/Refinement",
};

const patterns = [
  {
    label: LABELS.PIVOT,
    weight: 1.0,
    test: (c) => /ceiling|right path|shift.*path|pivot direction/i.test(c),
  },
  {
    label: LABELS.RISK,
    weight: 0.88,
    test: (c) =>
      /risk|blocker|constraints|enumerating|launch blockers/i.test(c),
  },
  {
    label: LABELS.MITIG,
    weight: 0.86,
    test: (c) => /mitigation|sequence:|→|mitigation sequence|ordering/i.test(c),
  },
  {
    label: LABELS.OPTION,
    weight: 0.82,
    test: (c) => /(three|2|3) (ways|options|levers|paths)/i.test(c),
  },
  {
    label: LABELS.DECISION,
    weight: 0.9,
    test: (c) => /\b\d\.y\b|\b\d\.ok\b|\/ ?\d\.\d\.go/i.test(c),
  },
  {
    label: LABELS.AUTH,
    weight: 0.95,
    test: (c) =>
      /proceed|execute|approved|transition focus|go\b|green-light|good\. *proceed|yes\. *reflect/i.test(
        c,
      ) && c.length < 90,
  },
  {
    label: LABELS.PRIV,
    weight: 0.9,
    test: (c) =>
      /local-only|local first|nothing uploaded|no central|processing stays on your device|privacy reassurance/i.test(
        c,
      ),
  },
  {
    label: LABELS.META,
    weight: 0.9,
    test: (c) =>
      /analyze .*cognitive profile|cognitive profile|analyze everything/i.test(
        c,
      ),
  },
  { label: LABELS.PROFILE, weight: 0.96, test: (c) => /Profile:/i.test(c) },
  {
    label: LABELS.FORMAT,
    weight: 0.8,
    test: (c) => /Outcome:\s*.*Tested:.*Impact:.*Next:/i.test(c),
  },
  {
    label: LABELS.ONBOARD,
    weight: 0.75,
    test: (c) =>
      /60s|60-second|pipeline|time-to-value|onboarding should deliver|under a minute|value in under a minute/i.test(
        c,
      ),
  },
];

export function segment(messages, options = {}) {
  const minScore = options.minScore || 0.5;
  const out = [];
  let current = null;
  const choose = (content) => {
    const lc = content;
    let best = { label: LABELS.EXEC, score: 0 };
    for (const p of patterns) {
      if (p.test(lc)) {
        if (p.weight > best.score) best = { label: p.label, score: p.weight };
      }
    }
    if (best.score < minScore) best.label = LABELS.EXEC;
    return best;
  };
  for (const msg of messages) {
    const res = choose(msg.content);
    const label = res.label;
    if (!current) {
      current = {
        id: "s1",
        label,
        startMessageId: msg.id,
        endMessageId: msg.id,
        confidence: res.score || 0,
        rationale: [],
      };
      out.push(current);
    } else if (current.label === label) {
      current.endMessageId = msg.id;
      current.confidence = Math.max(current.confidence, res.score || 0);
    } else {
      // boundary
      current = {
        id: "s" + (out.length + 1),
        label,
        startMessageId: msg.id,
        endMessageId: msg.id,
        confidence: res.score || 0,
        rationale: [],
      };
      out.push(current);
    }
  }
  // Merge singleton EXEC flanked by same label segments
  for (let i = 1; i < out.length - 1; i++) {
    const seg = out[i];
    if (seg.label === LABELS.EXEC && seg.startMessageId === seg.endMessageId) {
      const prev = out[i - 1];
      const next = out[i + 1];
      if (prev.label === next.label) {
        prev.endMessageId = next.endMessageId;
        out.splice(i, 2); // remove seg and next
        i -= 1;
      }
    }
  }
  // Add simple rationale tokens
  for (const seg of out) {
    if (seg.label === LABELS.EXEC) continue;
    seg.rationale.push("lexical");
  }
  return { segments: out };
}

export { LABELS };

// CLI debug
if (import.meta.url === `file://${process.argv[1]}`) {
  const fs = await import("fs");
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: node engine/segmenter.js <raw-transcript.txt>");
    process.exit(1);
  }
  const raw = fs.readFileSync(file, "utf8");
  const { parse } = await import("./parser.js");
  const parsed = parse(raw);
  const result = segment(parsed.messages);
  console.log(JSON.stringify(result, null, 2));
}
