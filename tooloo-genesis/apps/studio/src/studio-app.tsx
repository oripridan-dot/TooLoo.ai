// @version 3.3.574
/**
 * @file Studio app shell
 * @version 1.4.0
 */

import React from 'react';
import { tokens } from './tokens';

type Health = {
  status: string;
  service: string;
  version: string;
};

type ApiResult = {
  ok: boolean;
  status: number;
  data: unknown;
};

type SseStatus = {
  state: 'connecting' | 'connected' | 'error';
  attempts: number;
  lastErrorAt: number | null;
};

type AdeLoopStatus = {
  running: boolean;
  loopId: string | null;
  intervalMs: number;
  iteration: number;
  lastTickAt: number | null;
  lastError: string | null;
};

type AdeEvent = {
  id: string;
  ts: number;
  type: string;
  loopId: string;
  iteration: number;
  detail?: unknown;
};

type GenesisEvent = {
  id: string;
  ts: number;
  type: string;
  context?: { sessionId?: string };
  payload?: unknown;
};

type LearningStats = {
  total: number;
  byType: Record<string, number>;
  lastAt: number | null;
  recent: Array<{ id: string; ts: number; type: string; sessionId?: string; payload?: unknown }>;
};

type ProviderId = 'ollama' | 'gemini' | 'anthropic' | 'openai' | 'none';
type PolicyMode = 'cheap' | 'balanced' | 'quality';

type ModelPolicy = {
  mode: PolicyMode;
  cheap: { provider: ProviderId; model?: string };
  hard: { provider: ProviderId; model?: string };
  hardFallback: { provider: ProviderId; model?: string };
  ollamaHost: string;
};

type OllamaStatus = {
  ok: boolean;
  status: number;
  host: string;
  modelCount: number | null;
  error?: string;
};

type MissionSessionSnapshot = {
  sessionId: string;
  createdAt: number;
  updatedAt: number;
  mode: 'coach' | 'producer';
  phase: string;
  missionPrompt: string;
  messages: Array<{ id: string; ts: number; role: 'user' | 'genesis'; content: string }>;
  questionBank: Array<{ id: string; key: string; question: string; rationale?: string }>; // minimal
  questions: Array<{ id: string; key: string; question: string; rationale?: string }>; // minimal
  answers: Array<{ questionId: string; ts: number; answer: string }>;
  planBundle: null | {
    revision: number;
    createdAt: number;
    prdMarkdown: string;
    curriculumMarkdown: string;
    scriptsMarkdown: string;
    readinessScore: number;
    gates: Array<{ type: string; title: string; status: string; score: number; missing?: string[] }>;
  };
  approvedAt?: number;
  execution?: {
    status: 'idle' | 'running' | 'done' | 'error';
    startedAt?: number;
    finishedAt?: number;
    lastError?: string;
    projectPath?: string;
    steps?: Array<{ ts: number; label: string; detail?: string }>;
  };
};

async function api<T = unknown>(path: string, init?: RequestInit): Promise<ApiResult> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  let data: unknown = null;
  try {
    data = (await res.json()) as T;
  } catch {
    data = await res.text();
  }

  return { ok: res.ok, status: res.status, data };
}

export function StudioApp() {
  const [health, setHealth] = React.useState<Health | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const [busy, setBusy] = React.useState(false);
  const [lastResult, setLastResult] = React.useState<ApiResult | null>(null);

  const [adeStatus, setAdeStatus] = React.useState<AdeLoopStatus | null>(null);
  const [adeEvents, setAdeEvents] = React.useState<AdeEvent[]>([]);
  const [genesisEvents, setGenesisEvents] = React.useState<GenesisEvent[]>([]);
  const [sse, setSse] = React.useState<SseStatus>({ state: 'connecting', attempts: 0, lastErrorAt: null });
  const [loopIntervalMs, setLoopIntervalMs] = React.useState<number>(1500);
  const [autoScroll, setAutoScroll] = React.useState(true);
  const eventsEndRef = React.useRef<HTMLDivElement | null>(null);
  const lastGenesisSeenRef = React.useRef<string | null>(null);

  const [missionPrompt, setMissionPrompt] = React.useState<string>(
    "I want to make my nephew an app to learn English as a Hebrew speaker (A0).\nNarrative: retired NBA coach guides in Hebrew and injects English during drills.\nThemes: basketball, capoeira, spray painting, drumming.\nInclude SFX and voices (guest legend). Parents provide guidance and info.\nGoal: professional basketball communication.",
  );
  const [session, setSession] = React.useState<MissionSessionSnapshot | null>(null);
  const [chatInput, setChatInput] = React.useState<string>('');
  const [quickAnswers, setQuickAnswers] = React.useState<Record<string, string>>({});

  const [learning, setLearning] = React.useState<LearningStats | null>(null);
  const [policy, setPolicy] = React.useState<ModelPolicy | null>(null);
  const [ollamaStatus, setOllamaStatus] = React.useState<OllamaStatus | null>(null);

  const [ingest, setIngest] = React.useState({
    id: `doc-${Date.now()}`,
    title: 'Genesis note',
    content: 'validate then simulate then execute',
    tags: 'genesis,validation',
    source: 'studio',
  });

  const [search, setSearch] = React.useState({
    text: 'simulate',
    tags: 'validation',
    limit: 10,
  });

  const [cite, setCite] = React.useState({
    id: '',
    needle: 'simulate',
  });

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const result = await api<Health>('/health', { method: 'GET' });
        if (!result.ok) throw new Error(`Health check failed: ${result.status}`);
        const data = result.data as Health;
        if (!cancelled) setHealth(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Unknown error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Always try to show loop state, even if SSE is down.
  React.useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      try {
        const result = await api<AdeLoopStatus>('/api/v2/ade/loop/status', { method: 'GET' });
        if (!cancelled && result.ok) setAdeStatus(result.data as AdeLoopStatus);
      } catch {
        // ignore
      }
    };

    void tick();
    const interval = setInterval(tick, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const refreshSessionOnce = React.useCallback(
    async (sessionId: string) => {
      try {
        const result = await api<MissionSessionSnapshot>(`/api/v2/ade/session/${encodeURIComponent(sessionId)}`, { method: 'GET' });
        if (!result.ok) return;
        const next = result.data as MissionSessionSnapshot;
        setSession((prev) => {
          if (!prev) return prev;
          // Avoid unnecessary re-renders.
          return prev.updatedAt === next.updatedAt ? prev : next;
        });
      } catch {
        // ignore
      }
    },
    [setSession],
  );

  // Keep session state live (real data) while you're watching the process.
  React.useEffect(() => {
    if (!session?.sessionId) return;

    const sessionId = String(session.sessionId);
    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      await refreshSessionOnce(sessionId);
    };

    void tick();
    const interval = setInterval(tick, 1500);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [refreshSessionOnce, session?.sessionId]);

  // React immediately to Genesis events (plan generated, execution started, etc.).
  React.useEffect(() => {
    const latest = genesisEvents.length ? genesisEvents[genesisEvents.length - 1] : null;
    if (!latest) return;
    if (latest.id === lastGenesisSeenRef.current) return;
    lastGenesisSeenRef.current = latest.id;

    const sid = session?.sessionId ? String(session.sessionId) : null;
    if (!sid) return;
    if (latest.context?.sessionId && String(latest.context.sessionId) === sid) {
      void refreshSessionOnce(sid);
    }
  }, [genesisEvents, refreshSessionOnce, session?.sessionId]);

  function suggestedOptionsForKey(key: string): string[] {
    switch (key) {
      case 'learner_age':
        return ['6–8', '9–11', '12–14', '15–17', '18+'];
      case 'device_target':
        return ['Web (laptop/desktop)', 'Web (tablet)', 'Web (phone)', 'iPad app', 'Android app'];
      case 'session_length':
        return ['5 min', '10 min', '15 min', '20 min'];
      case 'session_frequency':
        return ['2× / week', '3× / week', '5× / week', 'Daily'];
      case 'voice_strategy':
        return ['TTS now (placeholders)', 'Recorded later', 'Hybrid (TTS now → record later)'];
      case 'parent_role':
        return ['Setup only', 'Co-play sometimes', 'Weekly review', 'Approve content', 'Full co-pilot'];
      case 'safety_mode':
        return ['Kid-safe strict', 'Standard', 'Teen-friendly'];
      case 'motivation_style':
        return ['Playful + funny', 'Pro training vibe', 'Mixed'];
      case 'time_horizon':
        return ['2 weeks', '1 month', '3 months', '6 months', '12 months'];
      default:
        return [];
    }
  }

  function buildNumberedReplyFromQuickAnswers(s: MissionSessionSnapshot): string {
    const lines = s.questions.map((q, idx) => {
      const a = quickAnswers[q.id] ?? '';
      return `${idx + 1}) ${a}`.trimEnd();
    });
    return lines.join('\n');
  }

  React.useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (cancelled) return;

      setSse((prev) => ({ ...prev, state: 'connecting', attempts }));
      es = new EventSource('/api/v2/ade/events');

      // Live stream ADE loop events so you can *see the cycles*.
      const onSnapshot = (evt: MessageEvent) => {
        try {
          const payload = JSON.parse(String(evt.data)) as {
            status?: AdeLoopStatus;
            events?: AdeEvent[];
            genesisEvents?: GenesisEvent[];
            learning?: LearningStats;
            policy?: ModelPolicy;
          };
          if (payload.status) setAdeStatus(payload.status);
          if (Array.isArray(payload.events)) setAdeEvents(payload.events);
          if (Array.isArray(payload.genesisEvents)) setGenesisEvents(payload.genesisEvents);
          if (payload.learning) setLearning(payload.learning);
          if (payload.policy) setPolicy(payload.policy);

          setSse((prev) => ({ ...prev, state: 'connected', lastErrorAt: null }));
        } catch {
          // ignore
        }
      };

      const onAde = (evt: MessageEvent) => {
        try {
          const e = JSON.parse(String(evt.data)) as AdeEvent;
          setAdeEvents((prev) => {
            const next = [...prev, e].slice(-200);
            return next;
          });
          // Keep status fresh (events include iteration/loopId).
          setAdeStatus((prev) =>
            prev
              ? {
                  ...prev,
                  loopId: e.loopId ?? prev.loopId,
                  iteration: Math.max(prev.iteration ?? 0, e.iteration ?? 0),
                  lastTickAt: e.type === 'tick:done' ? e.ts : prev.lastTickAt,
                  lastError: e.type === 'tick:error' ? 'tick:error' : prev.lastError,
                }
              : prev,
          );
        } catch {
          // ignore
        }
      };

      const onGenesis = (evt: MessageEvent) => {
        try {
          const e = JSON.parse(String(evt.data)) as GenesisEvent;
          setGenesisEvents((prev) => [...prev, e].slice(-200));
        } catch {
          // ignore
        }
      };

      es.addEventListener('snapshot', onSnapshot as EventListener);
      es.addEventListener('ade', onAde as EventListener);
      es.addEventListener('genesis', onGenesis as EventListener);

      es.onerror = () => {
        if (cancelled) return;

        setSse({ state: 'error', attempts: attempts + 1, lastErrorAt: Date.now() });

        try {
          es?.close();
        } catch {
          // ignore
        }

        attempts += 1;
        const delayMs = Math.min(15_000, Math.round(800 * Math.pow(1.6, Math.min(attempts, 8))));
        reconnectTimer = setTimeout(connect, delayMs);
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      try {
        es?.close();
      } catch {
        // ignore
      }
    };
  }, []);

  React.useEffect(() => {
    if (!autoScroll) return;
    eventsEndRef.current?.scrollIntoView({ block: 'end' });
  }, [adeEvents, autoScroll]);

  async function run<T = unknown>(fn: () => Promise<ApiResult>): Promise<void> {
    setError(null);
    setBusy(true);
    try {
      const result = await fn();
      setLastResult(result);
      if (!result.ok) {
        setError(`Request failed: HTTP ${result.status}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  }

  const shellStyle: React.CSSProperties = {
    fontFamily: tokens.font.family,
    color: tokens.color.fg,
    background: tokens.color.bg,
    padding: tokens.space.md,
    maxWidth: 1200,
    margin: '0 auto',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.space.md,
    overflow: 'hidden',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.space.md,
    paddingBottom: tokens.space.sm,
    borderBottom: `1px solid ${tokens.color.border}`,
  };

  const tabsStyle: React.CSSProperties = {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
  };

  const tabButtonStyle = (active: boolean): React.CSSProperties => ({
    border: `1px solid ${active ? tokens.color.primary : tokens.color.border}`,
    background: active ? tokens.color.primary : tokens.color.card,
    color: active ? '#fff' : tokens.color.fg,
    borderRadius: tokens.radius.md,
    padding: '6px 10px',
    cursor: 'pointer',
    fontFamily: tokens.font.family,
    fontSize: '0.9rem',
  });

  const contentFrameStyle: React.CSSProperties = {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  };

  const twoPaneStyle: React.CSSProperties = {
    height: '100%',
    display: 'grid',
    gridTemplateColumns: '1.1fr 0.9fr',
    gap: tokens.space.md,
    minHeight: 0,
  };

  const paneStyle: React.CSSProperties = {
    minHeight: 0,
    overflow: 'auto',
    paddingRight: 2,
  };

  const badgeStyle: React.CSSProperties = {
    fontFamily: tokens.font.mono,
    fontSize: '0.85rem',
    padding: '4px 8px',
    borderRadius: tokens.radius.md,
    border: `1px solid ${tokens.color.border}`,
    background: tokens.color.card,
    color: tokens.color.muted,
    whiteSpace: 'nowrap',
  };

  type FeedItem = { id: string; ts: number; kind: 'ade' | 'genesis'; label: string };
  const feedItems: FeedItem[] = React.useMemo(() => {
    const ade: FeedItem[] = adeEvents.map((e) => ({
      id: `ade-${e.id}`,
      ts: e.ts,
      kind: 'ade',
      label: `#${e.iteration} ${e.type}`,
    }));
    const gen: FeedItem[] = genesisEvents.map((e) => ({
      id: `gen-${e.id}`,
      ts: e.ts,
      kind: 'genesis',
      label: e.type,
    }));

    const all = [...ade, ...gen];
    all.sort((a, b) => a.ts - b.ts);
    return all.slice(-250);
  }, [adeEvents, genesisEvents]);

  const cardStyle: React.CSSProperties = {
    border: `1px solid ${tokens.color.border}`,
    background: tokens.color.card,
    borderRadius: tokens.radius.md,
    padding: tokens.space.md,
    marginTop: tokens.space.md,
  };

  const rowStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: tokens.space.md,
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.875rem',
    color: tokens.color.muted,
    marginBottom: tokens.space.xs,
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    border: `1px solid ${tokens.color.border}`,
    borderRadius: tokens.radius.md,
    padding: tokens.space.sm,
    fontFamily: tokens.font.family,
  };

  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    fontFamily: tokens.font.mono,
    minHeight: 110,
  };

  const buttonStyle: React.CSSProperties = {
    border: `1px solid ${tokens.color.primary}`,
    background: tokens.color.primary,
    color: '#fff',
    borderRadius: tokens.radius.md,
    padding: `${tokens.space.sm} ${tokens.space.md}`,
    cursor: busy ? 'not-allowed' : 'pointer',
    opacity: busy ? 0.7 : 1,
    fontFamily: tokens.font.family,
  };

  const subtleButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: 'transparent',
    color: tokens.color.primary,
  };

  const bubbleStyle = (role: 'user' | 'genesis'): React.CSSProperties => ({
    background: role === 'user' ? tokens.color.card : tokens.color.bg,
    border: `1px solid ${tokens.color.border}`,
    borderRadius: tokens.radius.md,
    padding: tokens.space.sm,
    whiteSpace: 'pre-wrap',
  });

  type StageStatus = 'idle' | 'running' | 'ok' | 'warn' | 'fail' | 'stale';
  type Stage = {
    id: 'plan' | 'simulate' | 'refine' | 'execute' | 'validate' | 'learn';
    label: string;
    status: StageStatus;
    meter: number; // 0..1
    task: string;
    cta?: {
      label: string;
      variant?: 'primary' | 'subtle';
      disabled?: boolean;
      onClick: () => void;
    };
  };

  const stageColor = (status: StageStatus): string => {
    switch (status) {
      case 'ok':
        return '#059669';
      case 'warn':
        return '#d97706';
      case 'fail':
        return tokens.color.danger;
      case 'running':
        return tokens.color.primary;
      case 'stale':
        return '#7c3aed';
      case 'idle':
      default:
        return tokens.color.muted;
    }
  };

  const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

  const lastUserMessageTs = React.useMemo(() => {
    if (!session?.messages?.length) return null;
    let max = -Infinity;
    for (const m of session.messages) {
      if (m.role === 'user') max = Math.max(max, m.ts);
    }
    return Number.isFinite(max) ? max : null;
  }, [session]);

  const pipeline: Stage[] = (() => {
    // PLAN
    const answeredUnique = session
      ? new Set(session.answers.map((a) => a.questionId)).size
      : 0;
    const totalQuestions = session ? Math.max(1, session.questionBank.length || session.questions.length || 1) : 1;
    const planProgress = session?.planBundle ? session.planBundle.readinessScore : answeredUnique / totalQuestions;

    const planIsStale = Boolean(
      session?.planBundle &&
        lastUserMessageTs &&
        lastUserMessageTs > session.planBundle.createdAt,
    );

    const planStatus: StageStatus = !session
      ? 'idle'
      : !session.planBundle
        ? session.phase === 'blocked'
          ? 'fail'
          : 'running'
        : planIsStale
          ? 'stale'
          : session.planBundle.readinessScore >= 0.85
            ? 'ok'
            : session.planBundle.readinessScore >= 0.65
              ? 'warn'
              : 'fail';

    const planTask = !session
      ? 'Start a mission'
      : !session.planBundle
        ? session.questions.length
          ? `Answer ${session.questions.length} questions`
          : `Phase: ${session.phase}`
        : planIsStale
          ? 'Plan outdated (needs refresh)'
          : `Plan r${session.planBundle.revision} (${Math.round(session.planBundle.readinessScore * 100)}%)`;

    const planCta: Stage['cta'] = !session
      ? {
          label: 'Start session',
          variant: 'primary',
          disabled: busy,
          onClick: () => {
            void run(async () => {
              const result = await api<MissionSessionSnapshot>('/api/v2/ade/session', {
                method: 'POST',
                body: JSON.stringify({ prompt: missionPrompt, mode: 'producer' }),
              });
              if (result.ok) {
                setSession(result.data as MissionSessionSnapshot);
                setQuickAnswers({});
                setChatInput('');
              }
              return result;
            });
          },
        }
      : undefined;

    // SIMULATE (mapped to ADE loop for now)
    const simulateStatus: StageStatus = adeStatus
      ? adeStatus.running
        ? 'running'
        : 'idle'
      : 'idle';
    const simulateMeter = (() => {
      if (!adeStatus?.running) return 0;
      const intervalMs = adeStatus.intervalMs || 1500;
      const last = adeStatus.lastTickAt ?? Date.now();
      const elapsed = Date.now() - last;
      return clamp01(elapsed / Math.max(200, intervalMs));
    })();
    const simulateTask = adeStatus
      ? adeStatus.running
        ? `ADE loop running • iter ${adeStatus.iteration}`
        : 'ADE loop stopped'
      : 'ADE loop connecting…';

    const loopTags = search.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const simulateCta: Stage['cta'] = {
      label: adeStatus?.running ? 'Stop loop' : 'Start loop',
      variant: adeStatus?.running ? 'subtle' : 'primary',
      disabled: busy,
      onClick: () => {
        void run(() =>
          api(adeStatus?.running ? '/api/v2/ade/loop/stop' : '/api/v2/ade/loop/start', {
            method: adeStatus?.running ? 'POST' : 'POST',
            body: adeStatus?.running
              ? JSON.stringify({})
              : JSON.stringify({ intervalMs: loopIntervalMs, queryText: search.text, tags: loopTags }),
          }),
        );
      },
    };

    // REFINE (questions + revisions)
    const refineNeedsUser = Boolean(session?.questions?.length);
    const refineStatus: StageStatus = !session
      ? 'idle'
      : refineNeedsUser
        ? 'running'
        : planIsStale
          ? 'stale'
          : session.planBundle && session.planBundle.readinessScore < 0.85
            ? 'running'
            : 'ok';
    const refineMeter = !session
      ? 0
      : refineNeedsUser
        ? clamp01(answeredUnique / totalQuestions)
        : session.planBundle
          ? session.planBundle.readinessScore
          : 0;
    const refineTask = !session
      ? '—'
      : refineNeedsUser
        ? 'Provide clarifications'
        : session.planBundle
          ? `Refine until green (readiness ${Math.round(session.planBundle.readinessScore * 100)}%)`
          : `Phase: ${session.phase}`;

    // EXECUTE
    const exec = session?.execution;
    const executeStatus: StageStatus = !session
      ? 'idle'
      : exec?.status === 'running'
        ? 'running'
        : exec?.status === 'done'
          ? 'ok'
          : exec?.status === 'error'
            ? 'fail'
            : session?.approvedAt
              ? 'idle'
              : session?.planBundle
                ? 'idle'
                : 'idle';
    const executeMeter = exec?.status === 'done' ? 1 : exec?.status === 'running' ? 0.5 : exec?.status === 'error' ? 1 : 0;
    const executeTask = !session
      ? '—'
      : exec?.status === 'running'
        ? `Building… (${exec.steps?.length ?? 0} steps)`
        : exec?.status === 'done'
          ? `Built: ${exec.projectPath ?? 'project ready'}`
          : exec?.status === 'error'
            ? `Build failed: ${exec.lastError ?? 'unknown error'}`
            : session?.approvedAt
              ? 'Ready to build'
              : session?.planBundle
                ? 'Approve plan to unlock build'
                : 'Need a plan first';

    // VALIDATE (plan gates)
    const gates = session?.planBundle?.gates ?? [];
    const anyFail = gates.some((g) => g.status === 'fail');
    const anyWarn = gates.some((g) => g.status === 'warn');
    const gateScore = gates.length ? gates.reduce((a, g) => a + (g.score ?? 0), 0) / gates.length : 0;
    const validateStatus: StageStatus = !session
      ? 'idle'
      : !session.planBundle
        ? 'idle'
        : planIsStale
          ? 'stale'
          : anyFail
            ? 'fail'
            : anyWarn
              ? 'warn'
              : 'ok';
    const validateMeter = session?.planBundle ? clamp01(gateScore) : 0;
    const validateTask = !session
      ? '—'
      : !session.planBundle
        ? 'No gates yet'
        : planIsStale
          ? 'Gates outdated (plan changed)'
          : anyFail
            ? 'Fix failing gates'
            : anyWarn
              ? 'Resolve warnings'
              : 'All gates pass';

    // LEARN (local learning stats)
    const learnMeter = learning ? clamp01(learning.total / 50) : 0;
    const learnStatus: StageStatus = !learning
      ? 'idle'
      : learning.total > 0
        ? 'ok'
        : 'idle';
    const learnTask = !learning
      ? 'No learning events yet'
      : `Events: ${learning.total} • last: ${learning.lastAt ? new Date(learning.lastAt).toLocaleTimeString() : '—'}`;

    return [
      { id: 'plan', label: 'Plan', status: planStatus, meter: clamp01(planProgress), task: planTask, cta: planCta },
      { id: 'simulate', label: 'Simulate', status: simulateStatus, meter: clamp01(simulateMeter), task: simulateTask, cta: simulateCta },
      { id: 'refine', label: 'Refine', status: refineStatus, meter: clamp01(refineMeter), task: refineTask },
      { id: 'execute', label: 'Execute', status: executeStatus, meter: clamp01(executeMeter), task: executeTask },
      { id: 'validate', label: 'Validate', status: validateStatus, meter: clamp01(validateMeter), task: validateTask },
      { id: 'learn', label: 'Learn', status: learnStatus, meter: clamp01(learnMeter), task: learnTask },
    ];
  })();

  const StageCard = ({ stage }: { stage: Stage }) => {
    const color = stageColor(stage.status);
    return (
      <div
        style={{
          border: `1px solid ${tokens.color.border}`,
          background: tokens.color.card,
          borderRadius: tokens.radius.md,
          padding: tokens.space.sm,
          minWidth: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ fontWeight: 700 }}>{stage.label}</div>
          <div style={{ fontFamily: tokens.font.mono, fontSize: '0.8rem', color }}>{stage.status}</div>
        </div>
        <div
          style={{
            marginTop: 8,
            height: 8,
            borderRadius: 999,
            background: tokens.color.border,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${Math.round(clamp01(stage.meter) * 100)}%`,
              background: color,
              transition: 'width 200ms ease',
            }}
          />
        </div>
        <div style={{ marginTop: 8, color: tokens.color.muted, fontSize: '0.85rem', minHeight: 18, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {stage.task}
        </div>

        {stage.cta ? (
          <div style={{ marginTop: 10 }}>
            <button
              style={stage.cta.variant === 'subtle' ? subtleButtonStyle : buttonStyle}
              disabled={Boolean(stage.cta.disabled)}
              onClick={stage.cta.onClick}
            >
              {stage.cta.label}
            </button>
          </div>
        ) : null}
      </div>
    );
  };

  const handleOmniSend = async () => {
    if (busy) return;

    // If user typed nothing, try to synthesize from quick answers.
    const fallback = session ? buildNumberedReplyFromQuickAnswers(session) : '';
    const payload = chatInput.trim() ? chatInput.trim() : fallback.trim();
    if (!payload) return;

    await run(async () => {
      if (!session) {
        const result = await api<MissionSessionSnapshot>('/api/v2/ade/session', {
          method: 'POST',
          body: JSON.stringify({ prompt: payload, mode: 'producer' }),
        });
        if (result.ok) {
          setSession(result.data as MissionSessionSnapshot);
          setQuickAnswers({});
          setChatInput('');
        }
        return result;
      }

      const result = await api<MissionSessionSnapshot>(`/api/v2/ade/session/${session.sessionId}/message`, {
        method: 'POST',
        body: JSON.stringify({ content: payload }),
      });
      if (result.ok) {
        setSession(result.data as MissionSessionSnapshot);
        setChatInput('');
        setQuickAnswers({});
      }
      return result;
    });
  };

  return (
    <div
      style={{
        ...shellStyle,
        height: '100vh',
        minHeight: 0,
        overflow: 'hidden',
        display: 'grid',
        gridTemplateRows: 'auto auto 1fr auto',
      }}
    >
      <div style={{ ...headerStyle, paddingBottom: 0, borderBottom: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.space.md, minWidth: 0 }}>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: '1.25rem' }}>TooLoo Genesis Studio</h1>
            <div style={{ color: tokens.color.muted, fontSize: '0.9rem', marginTop: 2 }}>
              Control + monitor planning, execution, and learning (local-first).
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <div style={badgeStyle}>{health ? `api:${health.status}` : 'api:…'}</div>
            <div style={badgeStyle}>stream:{sse.state}</div>
            <div style={badgeStyle}>{adeStatus ? (adeStatus.running ? `loop:running` : `loop:stopped`) : 'loop:…'}</div>
            <div style={badgeStyle}>iter:{adeStatus?.iteration ?? '—'}</div>
          </div>
        </div>
      </div>

      {/* Horizontal Genesis loop (always visible, stays in viewport) */}
      <div style={{ borderBottom: `1px solid ${tokens.color.border}`, paddingBottom: tokens.space.sm }}>
        <div style={{ overflowX: 'auto', overflowY: 'hidden' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(6, minmax(220px, 1fr))',
              gap: tokens.space.sm,
              minWidth: 6 * 220,
            }}
          >
            {pipeline.map((s) => (
              <StageCard key={s.id} stage={s} />
            ))}
          </div>
        </div>
      </div>

      {/* One-screen grid: Mission / Monitor / Knowledge / Debug */}
      <div
        style={{
          minHeight: 0,
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: '1.15fr 0.85fr',
          gridTemplateRows: '1fr 1fr',
          gap: tokens.space.md,
        }}
      >
          {/* Mission */}
          <div style={paneStyle}>
            <div style={cardStyle}>
              <h2 style={{ marginTop: 0 }}>Mission</h2>
              <div style={{ color: tokens.color.muted, marginTop: 4, fontSize: '0.9rem' }}>
                Linear Genesis flow. When you change inputs, downstream stages go “stale” until we’re green again.
              </div>

              {!session ? (
                <div style={{ marginTop: tokens.space.md }}>
                  <label style={labelStyle}>mission prompt (optional)</label>
                  <textarea style={textareaStyle} value={missionPrompt} onChange={(e) => setMissionPrompt(e.target.value)} />
                  <div style={{ marginTop: tokens.space.sm, display: 'flex', gap: tokens.space.sm, flexWrap: 'wrap' }}>
                    <button
                      style={buttonStyle}
                      disabled={busy}
                      onClick={() =>
                        run(async () => {
                          const result = await api<MissionSessionSnapshot>('/api/v2/ade/session', {
                            method: 'POST',
                            body: JSON.stringify({ prompt: missionPrompt, mode: 'producer' }),
                          });
                          if (result.ok) {
                            setSession(result.data as MissionSessionSnapshot);
                            setQuickAnswers({});
                            setChatInput('');
                          }
                          return result;
                        })
                      }
                    >
                      Start session from prompt
                    </button>
                    <div style={{ color: tokens.color.muted, fontSize: '0.85rem', alignSelf: 'center' }}>
                      Or just type in the bottom textbox and hit Send.
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: tokens.space.md }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: tokens.space.md, flexWrap: 'wrap' }}>
                    <div style={{ color: tokens.color.muted }}>
                      session: <span style={{ fontFamily: tokens.font.mono }}>{session.sessionId}</span> — phase:{' '}
                      <span style={{ fontFamily: tokens.font.mono }}>{session.phase}</span>
                    </div>
                    <button style={subtleButtonStyle} disabled={busy} onClick={() => setSession(null)}>
                      New session
                    </button>
                  </div>

                  <div style={{ marginTop: tokens.space.md, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: tokens.space.md }}>
                    <div>
                      <h3 style={{ marginTop: 0 }}>Conversation</h3>
                      <div
                        style={{
                          border: `1px solid ${tokens.color.border}`,
                          borderRadius: tokens.radius.md,
                          padding: tokens.space.sm,
                          maxHeight: 220,
                          overflow: 'auto',
                          background: tokens.color.bg,
                          display: 'grid',
                          gap: tokens.space.sm,
                        }}
                      >
                        {session.messages.map((m) => (
                          <div key={m.id} style={bubbleStyle(m.role)}>
                            <div style={{ fontSize: '0.75rem', color: tokens.color.muted, marginBottom: 6 }}>
                              {m.role} • {new Date(m.ts).toLocaleTimeString()}
                            </div>
                            {m.content}
                          </div>
                        ))}
                      </div>

                      {session.questions.length > 0 ? (
                        <div style={{ marginTop: tokens.space.sm, color: tokens.color.muted, fontSize: '0.9rem' }}>
                          Quick answers (optional). Your bottom textbox will send the numbered reply.
                        </div>
                      ) : null}

                      {session.questions.length > 0 ? (
                        <div
                          style={{
                            marginTop: tokens.space.sm,
                            border: `1px solid ${tokens.color.border}`,
                            borderRadius: tokens.radius.md,
                            padding: tokens.space.sm,
                            background: tokens.color.bg,
                            display: 'grid',
                            gap: tokens.space.sm,
                            maxHeight: 260,
                            overflow: 'auto',
                          }}
                        >
                          {session.questions.map((q, idx) => {
                            const options = suggestedOptionsForKey(q.key);
                            const selected = quickAnswers[q.id] ?? '';

                            return (
                              <div
                                key={q.id}
                                style={{
                                  border: `1px solid ${tokens.color.border}`,
                                  borderRadius: tokens.radius.md,
                                  padding: tokens.space.sm,
                                  background: tokens.color.card,
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: tokens.space.sm }}>
                                  <div style={{ fontWeight: 600 }}>
                                    {idx + 1}) {q.question}
                                  </div>
                                  <div style={{ fontFamily: tokens.font.mono, color: tokens.color.muted, fontSize: '0.8rem' }}>{q.key}</div>
                                </div>
                                {q.rationale ? (
                                  <div style={{ marginTop: 6, color: tokens.color.muted, fontSize: '0.9rem' }}>{q.rationale}</div>
                                ) : null}

                                {options.length > 0 ? (
                                  <div style={{ marginTop: tokens.space.sm, display: 'flex', gap: tokens.space.xs, flexWrap: 'wrap' }}>
                                    {options.map((opt) => (
                                      <button
                                        key={opt}
                                        style={opt === selected ? buttonStyle : subtleButtonStyle}
                                        disabled={busy}
                                        onClick={() => {
                                          setQuickAnswers((prev) => ({ ...prev, [q.id]: opt }));
                                          if (!chatInput.trim()) {
                                            setChatInput((prev) => (prev.trim() ? prev : buildNumberedReplyFromQuickAnswers(session)));
                                          }
                                        }}
                                      >
                                        {opt}
                                      </button>
                                    ))}
                                  </div>
                                ) : null}

                                <div style={{ marginTop: tokens.space.sm }}>
                                  <label style={{ ...labelStyle, marginBottom: 6 }}>custom answer (optional)</label>
                                  <input
                                    style={inputStyle}
                                    value={selected}
                                    placeholder="Type your own answer…"
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setQuickAnswers((prev) => ({ ...prev, [q.id]: val }));
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })}

                          <div style={{ display: 'flex', gap: tokens.space.sm, flexWrap: 'wrap' }}>
                            <button
                              style={subtleButtonStyle}
                              disabled={busy || session.questions.length === 0}
                              onClick={() => setChatInput(buildNumberedReplyFromQuickAnswers(session))}
                            >
                              Fill bottom textbox
                            </button>
                            <button
                              style={subtleButtonStyle}
                              disabled={busy}
                              onClick={() => {
                                setQuickAnswers({});
                                setChatInput('');
                              }}
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div>
                      <h3 style={{ marginTop: 0 }}>Plan Bundle</h3>
                      {session.planBundle ? (
                        <div>
                          <div style={{ color: tokens.color.muted }}>
                            revision {session.planBundle.revision} • readiness {Math.round(session.planBundle.readinessScore * 100)}%
                          </div>

                          <div style={{ marginTop: tokens.space.sm, display: 'flex', gap: tokens.space.sm, flexWrap: 'wrap' }}>
                            {!session.approvedAt ? (
                              <button
                                style={buttonStyle}
                                disabled={busy || session.execution?.status === 'running'}
                                onClick={() =>
                                  run(async () => {
                                    const approved = await api<MissionSessionSnapshot>(
                                      `/api/v2/ade/session/${session.sessionId}/approve`,
                                      { method: 'POST', body: JSON.stringify({}) },
                                    );
                                    if (!approved.ok) return approved;

                                    const started = await api<MissionSessionSnapshot>(
                                      `/api/v2/ade/session/${session.sessionId}/execute/start`,
                                      { method: 'POST', body: JSON.stringify({ kind: 'web' }) },
                                    );
                                    if (started.ok) setSession(started.data as MissionSessionSnapshot);
                                    return started;
                                  })
                                }
                              >
                                Approve + Build
                              </button>
                            ) : (
                              <>
                                <button style={subtleButtonStyle} disabled>
                                  Plan approved
                                </button>
                                <button
                                  style={buttonStyle}
                                  disabled={busy || session.execution?.status === 'running'}
                                  onClick={() =>
                                    run(async () => {
                                      const result = await api<MissionSessionSnapshot>(
                                        `/api/v2/ade/session/${session.sessionId}/execute/start`,
                                        { method: 'POST', body: JSON.stringify({ kind: 'web' }) },
                                      );
                                      if (result.ok) setSession(result.data as MissionSessionSnapshot);
                                      return result;
                                    })
                                  }
                                >
                                  Build
                                </button>
                              </>
                            )}
                          </div>

                          {session.execution ? (
                            <div style={{ marginTop: tokens.space.sm, color: tokens.color.muted }}>
                              execution: <span style={{ fontFamily: tokens.font.mono }}>{session.execution.status}</span>
                              {session.execution.projectPath ? (
                                <>
                                  {' '}• project:{' '}
                                  <span style={{ fontFamily: tokens.font.mono }}>{session.execution.projectPath}</span>
                                </>
                              ) : null}
                              {session.execution.lastError ? (
                                <div style={{ color: tokens.color.danger, marginTop: 6 }}>{session.execution.lastError}</div>
                              ) : null}
                            </div>
                          ) : null}

                          <div style={{ marginTop: tokens.space.md, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: tokens.space.sm }}>
                            <div style={{ border: `1px solid ${tokens.color.border}`, borderRadius: tokens.radius.md, background: tokens.color.bg, padding: tokens.space.sm, maxHeight: 160, overflow: 'auto' }}>
                              <div style={{ fontWeight: 700, marginBottom: 6 }}>Gates</div>
                              <pre style={{ fontFamily: tokens.font.mono, whiteSpace: 'pre-wrap', margin: 0 }}>
                                {JSON.stringify(session.planBundle.gates, null, 2)}
                              </pre>
                            </div>
                            <div style={{ border: `1px solid ${tokens.color.border}`, borderRadius: tokens.radius.md, background: tokens.color.bg, padding: tokens.space.sm, maxHeight: 160, overflow: 'auto' }}>
                              <div style={{ fontWeight: 700, marginBottom: 6 }}>PRD</div>
                              <pre style={{ fontFamily: tokens.font.mono, whiteSpace: 'pre-wrap', margin: 0 }}>{session.planBundle.prdMarkdown}</pre>
                            </div>
                            <div style={{ border: `1px solid ${tokens.color.border}`, borderRadius: tokens.radius.md, background: tokens.color.bg, padding: tokens.space.sm, maxHeight: 160, overflow: 'auto' }}>
                              <div style={{ fontWeight: 700, marginBottom: 6 }}>Curriculum</div>
                              <pre style={{ fontFamily: tokens.font.mono, whiteSpace: 'pre-wrap', margin: 0 }}>{session.planBundle.curriculumMarkdown}</pre>
                            </div>
                            <div style={{ border: `1px solid ${tokens.color.border}`, borderRadius: tokens.radius.md, background: tokens.color.bg, padding: tokens.space.sm, maxHeight: 160, overflow: 'auto' }}>
                              <div style={{ fontWeight: 700, marginBottom: 6 }}>Scripts</div>
                              <pre style={{ fontFamily: tokens.font.mono, whiteSpace: 'pre-wrap', margin: 0 }}>{session.planBundle.scriptsMarkdown}</pre>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ color: tokens.color.muted }}>No plan yet — answer the questions to unlock plan generation.</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Monitor */}
          <div style={paneStyle}>
            <div style={cardStyle}>
              <h2 style={{ marginTop: 0 }}>Monitor</h2>
              <div style={{ color: tokens.color.muted, marginTop: 4, fontSize: '0.9rem' }}>
                Autonomy loop + activity feed + status snapshot.
              </div>

        <div style={{ ...rowStyle, gridTemplateColumns: '1fr 1fr 1fr' }}>
          <div>
            <label style={labelStyle}>interval (ms)</label>
            <input
              style={inputStyle}
              type="number"
              min={200}
              max={60000}
              value={loopIntervalMs}
              onChange={(e) => setLoopIntervalMs(Number(e.target.value))}
            />
          </div>
          <div>
            <label style={labelStyle}>status</label>
            <div style={{ fontFamily: tokens.font.mono, paddingTop: 10 }}>
              {adeStatus ? (adeStatus.running ? 'running' : 'stopped') : 'connecting…'}
            </div>
          </div>
          <div>
            <label style={labelStyle}>iteration</label>
            <div style={{ fontFamily: tokens.font.mono, paddingTop: 10 }}>{adeStatus?.iteration ?? '—'}</div>
          </div>
        </div>

        <div style={{ marginTop: tokens.space.md, display: 'flex', gap: tokens.space.sm, flexWrap: 'wrap' }}>
          <button
            style={buttonStyle}
            disabled={busy}
            onClick={() =>
              run(() =>
                api('/api/v2/ade/loop/start', {
                  method: 'POST',
                  body: JSON.stringify({ intervalMs: loopIntervalMs, queryText: search.text, tags: search.tags.split(',').map((t) => t.trim()).filter(Boolean) }),
                }),
              )
            }
          >
            Start loop
          </button>
          <button
            style={subtleButtonStyle}
            disabled={busy}
            onClick={() => run(() => api('/api/v2/ade/loop/stop', { method: 'POST' }))}
          >
            Stop loop
          </button>
          <button style={subtleButtonStyle} disabled={busy} onClick={() => run(() => api('/api/v2/ade/loop/status', { method: 'GET' }))}>
            Refresh status
          </button>
          <label style={{ display: 'flex', alignItems: 'center', gap: tokens.space.sm, color: tokens.color.muted }}>
            <input type="checkbox" checked={autoScroll} onChange={(e) => setAutoScroll(e.target.checked)} />
            auto-scroll activity
          </label>
        </div>

                <div style={{ ...cardStyle, marginTop: tokens.space.md }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: tokens.space.md }}>
                    <h3 style={{ marginTop: 0, marginBottom: 0 }}>Activity</h3>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button
                        style={subtleButtonStyle}
                        onClick={() => {
                          setAdeEvents([]);
                          setGenesisEvents([]);
                        }}
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      fontFamily: tokens.font.mono,
                      fontSize: '0.85rem',
                      maxHeight: 360,
                      overflow: 'auto',
                      border: `1px solid ${tokens.color.border}`,
                      borderRadius: tokens.radius.md,
                      padding: tokens.space.sm,
                      background: tokens.color.bg,
                      marginTop: tokens.space.sm,
                    }}
                  >
                    {feedItems.length === 0 ? (
                      <div style={{ color: tokens.color.muted }}>No events yet.</div>
                    ) : (
                      feedItems.map((e) => (
                        <div key={e.id} style={{ whiteSpace: 'pre-wrap' }}>
                          [{new Date(e.ts).toLocaleTimeString()}] {e.kind === 'ade' ? 'ade' : 'gen'} • {e.label}
                        </div>
                      ))
                    )}
                    <div ref={eventsEndRef} />
                  </div>
                </div>
              </div>

              <div style={{ ...cardStyle, marginTop: tokens.space.md }}>
                <h3 style={{ marginTop: 0 }}>Status</h3>
                <div style={{ color: tokens.color.muted, fontSize: '0.9rem' }}>
                  Quick glance at session + execution + learning.
                </div>

                <div style={{ marginTop: tokens.space.md, display: 'grid', gap: tokens.space.sm }}>
                  <div style={{ ...badgeStyle, color: tokens.color.fg }}>
                    session: {session ? String(session.sessionId) : '—'}
                  </div>
                  <div style={{ ...badgeStyle, color: tokens.color.fg }}>
                    phase: {session?.phase ?? '—'}
                  </div>
                  <div style={{ ...badgeStyle, color: tokens.color.fg }}>
                    plan: {session?.planBundle ? `r${session.planBundle.revision} (${Math.round(session.planBundle.readinessScore * 100)}%)` : '—'}
                  </div>
                  <div style={{ ...badgeStyle, color: tokens.color.fg }}>
                    exec: {session?.execution?.status ?? 'idle'}
                  </div>
                </div>

                <div style={{ ...cardStyle, marginTop: tokens.space.md }}>
                  <h3 style={{ marginTop: 0 }}>Learning (local)</h3>
                  <div style={{ color: tokens.color.muted, fontSize: '0.9rem' }}>
                    Tracks what Genesis did (plans/executions) on your machine. No cloud required.
                  </div>

                  <div style={{ marginTop: tokens.space.sm, display: 'flex', gap: tokens.space.sm, flexWrap: 'wrap' }}>
                    <div style={badgeStyle}>total: {learning?.total ?? 0}</div>
                    <div style={badgeStyle}>last: {learning?.lastAt ? new Date(learning.lastAt).toLocaleTimeString() : '—'}</div>
                    <button
                      style={subtleButtonStyle}
                      disabled={busy}
                      onClick={() =>
                        run(async () => {
                          const result = await api('/api/v2/ade/learning/reset', { method: 'POST' });
                          if (result.ok) setLearning({ total: 0, byType: {}, lastAt: null, recent: [] });
                          return result;
                        })
                      }
                    >
                      Reset learning
                    </button>
                  </div>

                  {learning?.recent?.length ? (
                    <div
                      style={{
                        marginTop: tokens.space.sm,
                        fontFamily: tokens.font.mono,
                        fontSize: '0.85rem',
                        maxHeight: 220,
                        overflow: 'auto',
                        border: `1px solid ${tokens.color.border}`,
                        borderRadius: tokens.radius.md,
                        padding: tokens.space.sm,
                        background: tokens.color.bg,
                      }}
                    >
                      {learning.recent.slice(-30).map((r) => (
                        <div key={r.id} style={{ whiteSpace: 'pre-wrap' }}>
                          [{new Date(r.ts).toLocaleTimeString()}] {r.type}
                          {r.sessionId ? ` • ${String(r.sessionId).slice(0, 8)}` : ''}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ marginTop: tokens.space.sm, color: tokens.color.muted }}>
                      No learning records yet. Generate/approve a plan or run execution.
                    </div>
                  )}
                </div>

                <div style={{ ...cardStyle, marginTop: tokens.space.md }}>
                  <h3 style={{ marginTop: 0 }}>Cost controls</h3>
                  <div style={{ color: tokens.color.muted, fontSize: '0.9rem' }}>
                    Set a simple routing policy: Ollama for cheap/easy tasks; Gemini or Claude for harder ones.
                    (This Studio/Genesis demo won’t burn tokens unless you wire cloud calls — but this policy is what we’ll use when we do.)
                  </div>

                  <div style={{ marginTop: tokens.space.sm, display: 'grid', gap: tokens.space.sm }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: tokens.space.sm }}>
                      <div>
                        <label style={labelStyle}>mode</label>
                        <select
                          style={inputStyle}
                          value={policy?.mode ?? 'cheap'}
                          onChange={(e) =>
                            setPolicy((p) =>
                              p
                                ? { ...p, mode: e.target.value as PolicyMode }
                                : {
                                    mode: e.target.value as PolicyMode,
                                    cheap: { provider: 'ollama', model: 'qwen2.5:7b' },
                                    hard: { provider: 'gemini', model: 'gemini-1.5-flash' },
                                    hardFallback: { provider: 'anthropic', model: 'claude-3-5-sonnet-latest' },
                                    ollamaHost: 'http://127.0.0.1:11434',
                                  },
                            )
                          }
                        >
                          <option value="cheap">cheap (local-first)</option>
                          <option value="balanced">balanced</option>
                          <option value="quality">quality (cloud-first)</option>
                        </select>
                      </div>

                      <div>
                        <label style={labelStyle}>ollama host</label>
                        <input
                          style={inputStyle}
                          value={policy?.ollamaHost ?? 'http://127.0.0.1:11434'}
                          onChange={(e) => setPolicy((p) => (p ? { ...p, ollamaHost: e.target.value } : p))}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: tokens.space.sm }}>
                      <div>
                        <label style={labelStyle}>cheap provider</label>
                        <select
                          style={inputStyle}
                          value={policy?.cheap.provider ?? 'ollama'}
                          onChange={(e) =>
                            setPolicy((p) =>
                              p ? { ...p, cheap: { ...p.cheap, provider: e.target.value as ProviderId } } : p,
                            )
                          }
                        >
                          <option value="ollama">ollama</option>
                          <option value="none">none</option>
                        </select>
                        <div style={{ marginTop: 6 }}>
                          <input
                            style={inputStyle}
                            placeholder="model (e.g., qwen2.5:7b)"
                            value={policy?.cheap.model ?? ''}
                            onChange={(e) => setPolicy((p) => (p ? { ...p, cheap: { ...p.cheap, model: e.target.value } } : p))}
                          />
                        </div>
                      </div>

                      <div>
                        <label style={labelStyle}>hard provider</label>
                        <select
                          style={inputStyle}
                          value={policy?.hard.provider ?? 'gemini'}
                          onChange={(e) =>
                            setPolicy((p) =>
                              p ? { ...p, hard: { ...p.hard, provider: e.target.value as ProviderId } } : p,
                            )
                          }
                        >
                          <option value="gemini">gemini</option>
                          <option value="anthropic">anthropic (claude)</option>
                          <option value="openai">openai</option>
                          <option value="none">none</option>
                        </select>
                        <div style={{ marginTop: 6 }}>
                          <input
                            style={inputStyle}
                            placeholder="model (e.g., gemini-1.5-flash)"
                            value={policy?.hard.model ?? ''}
                            onChange={(e) => setPolicy((p) => (p ? { ...p, hard: { ...p.hard, model: e.target.value } } : p))}
                          />
                        </div>
                      </div>

                      <div>
                        <label style={labelStyle}>hard fallback</label>
                        <select
                          style={inputStyle}
                          value={policy?.hardFallback.provider ?? 'anthropic'}
                          onChange={(e) =>
                            setPolicy((p) =>
                              p
                                ? { ...p, hardFallback: { ...p.hardFallback, provider: e.target.value as ProviderId } }
                                : p,
                            )
                          }
                        >
                          <option value="anthropic">anthropic (claude)</option>
                          <option value="gemini">gemini</option>
                          <option value="openai">openai</option>
                          <option value="none">none</option>
                        </select>
                        <div style={{ marginTop: 6 }}>
                          <input
                            style={inputStyle}
                            placeholder="model (e.g., claude-3-5-sonnet-latest)"
                            value={policy?.hardFallback.model ?? ''}
                            onChange={(e) =>
                              setPolicy((p) =>
                                p ? { ...p, hardFallback: { ...p.hardFallback, model: e.target.value } } : p,
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: tokens.space.sm, flexWrap: 'wrap' }}>
                      <button
                        style={buttonStyle}
                        disabled={busy || !policy}
                        onClick={() =>
                          run(async () => {
                            const result = await api('/api/v2/ade/policy', { method: 'POST', body: JSON.stringify(policy) });
                            if (result.ok) {
                              const p = (result.data as { policy?: ModelPolicy })?.policy;
                              if (p) setPolicy(p);
                            }
                            return result;
                          })
                        }
                      >
                        Save policy
                      </button>
                      <button
                        style={subtleButtonStyle}
                        disabled={busy}
                        onClick={() =>
                          run(async () => {
                            const result = await api('/api/v2/ade/policy/ollama/status', { method: 'GET' });
                            setOllamaStatus(result.data as OllamaStatus);
                            return result;
                          })
                        }
                      >
                        Check Ollama
                      </button>

                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={badgeStyle}>
                          cheap → {policy?.cheap.provider ?? '—'} {policy?.cheap.model ? `(${policy.cheap.model})` : ''}
                        </div>
                        <div style={badgeStyle}>
                          hard → {policy?.hard.provider ?? '—'} {policy?.hard.model ? `(${policy.hard.model})` : ''}
                        </div>
                      </div>
                    </div>

                    {ollamaStatus ? (
                      <div style={{ marginTop: tokens.space.sm, color: ollamaStatus.ok ? tokens.color.muted : tokens.color.danger }}>
                        Ollama @ {ollamaStatus.host} → {ollamaStatus.ok ? `OK (models: ${ollamaStatus.modelCount ?? '—'})` : `NOT OK (${ollamaStatus.error ?? 'unreachable'})`}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Knowledge */}
          <div style={paneStyle}>
            <div style={{ display: 'grid', gap: tokens.space.md }}>
              <div style={cardStyle}>
                <h2 style={{ marginTop: 0 }}>Knowledge</h2>
                <div style={{ color: tokens.color.muted, fontSize: '0.9rem' }}>
                  Local in-memory knowledge (ingest/search/cite).
                </div>
              </div>

              <div style={cardStyle}>
                <h2 style={{ marginTop: 0 }}>Ingest</h2>
                <div style={rowStyle}>
                  <div>
                    <label style={labelStyle}>id</label>
                    <input
                      style={inputStyle}
                      value={ingest.id}
                      onChange={(e) => setIngest((s) => ({ ...s, id: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>title</label>
                    <input
                      style={inputStyle}
                      value={ingest.title}
                      onChange={(e) => setIngest((s) => ({ ...s, title: e.target.value }))}
                    />
                  </div>
                </div>
                <div style={{ marginTop: tokens.space.md }}>
                  <label style={labelStyle}>content</label>
                  <textarea
                    style={textareaStyle}
                    value={ingest.content}
                    onChange={(e) => setIngest((s) => ({ ...s, content: e.target.value }))}
                  />
                </div>
                <div style={{ ...rowStyle, marginTop: tokens.space.md }}>
                  <div>
                    <label style={labelStyle}>tags (comma-separated)</label>
                    <input
                      style={inputStyle}
                      value={ingest.tags}
                      onChange={(e) => setIngest((s) => ({ ...s, tags: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>source</label>
                    <input
                      style={inputStyle}
                      value={ingest.source}
                      onChange={(e) => setIngest((s) => ({ ...s, source: e.target.value }))}
                    />
                  </div>
                </div>

                <div style={{ marginTop: tokens.space.md, display: 'flex', gap: tokens.space.sm }}>
                  <button
                    style={buttonStyle}
                    disabled={busy}
                    onClick={() =>
                      run(() =>
                        api('/api/v2/knowledge/ingest', {
                          method: 'POST',
                          body: JSON.stringify({
                            id: ingest.id,
                            title: ingest.title,
                            content: ingest.content,
                            tags: ingest.tags
                              .split(',')
                              .map((t) => t.trim())
                              .filter(Boolean),
                            source: ingest.source,
                            createdAt: Date.now(),
                          }),
                        })
                      )
                    }
                  >
                    Ingest
                  </button>
                </div>
              </div>

              <div style={cardStyle}>
                <h2 style={{ marginTop: 0 }}>Search</h2>
                <div style={rowStyle}>
                  <div>
                    <label style={labelStyle}>text</label>
                    <input
                      style={inputStyle}
                      value={search.text}
                      onChange={(e) => setSearch((s) => ({ ...s, text: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>tags (comma-separated)</label>
                    <input
                      style={inputStyle}
                      value={search.tags}
                      onChange={(e) => setSearch((s) => ({ ...s, tags: e.target.value }))}
                    />
                  </div>
                </div>
                <div style={{ marginTop: tokens.space.md, display: 'flex', gap: tokens.space.sm }}>
                  <button
                    style={buttonStyle}
                    disabled={busy}
                    onClick={() =>
                      run(() =>
                        api('/api/v2/knowledge/search', {
                          method: 'POST',
                          body: JSON.stringify({
                            text: search.text,
                            tags: search.tags
                              .split(',')
                              .map((t) => t.trim())
                              .filter(Boolean),
                            limit: search.limit,
                          }),
                        })
                      )
                    }
                  >
                    Search
                  </button>
                </div>
              </div>

              <div style={cardStyle}>
                <h2 style={{ marginTop: 0 }}>Cite</h2>
                <div style={rowStyle}>
                  <div>
                    <label style={labelStyle}>id</label>
                    <input
                      style={inputStyle}
                      placeholder="doc-..."
                      value={cite.id}
                      onChange={(e) => setCite((s) => ({ ...s, id: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>needle (optional)</label>
                    <input
                      style={inputStyle}
                      value={cite.needle}
                      onChange={(e) => setCite((s) => ({ ...s, needle: e.target.value }))}
                    />
                  </div>
                </div>
                <div style={{ marginTop: tokens.space.md, display: 'flex', gap: tokens.space.sm }}>
                  <button
                    style={buttonStyle}
                    disabled={busy || !cite.id}
                    onClick={() =>
                      run(() =>
                        api(`/api/v2/knowledge/cite/${encodeURIComponent(cite.id)}?needle=${encodeURIComponent(cite.needle)}`, {
                          method: 'GET',
                        })
                      )
                    }
                  >
                    Cite
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Debug */}
          <div style={paneStyle}>
            <div style={cardStyle}>
              <h2 style={{ marginTop: 0 }}>Debug</h2>
              <div style={{ color: tokens.color.muted, fontSize: '0.9rem' }}>
                Raw API results + health.
              </div>
            </div>

            <div style={cardStyle}>
              <h2 style={{ marginTop: 0 }}>API Health (raw)</h2>
              {health ? (
                <pre style={{ fontFamily: tokens.font.mono, margin: 0 }}>{JSON.stringify(health, null, 2)}</pre>
              ) : (
                <p style={{ margin: 0 }}>Loading…</p>
              )}
            </div>

            <div style={cardStyle}>
              <h2 style={{ marginTop: 0 }}>Last Result</h2>
              {error ? <p style={{ color: tokens.color.danger, marginTop: 0 }}>{error}</p> : null}
              {lastResult ? (
                <pre style={{ fontFamily: tokens.font.mono, margin: 0 }}>{JSON.stringify(lastResult, null, 2)}</pre>
              ) : (
                <p style={{ margin: 0, color: tokens.color.muted }}>No calls yet.</p>
              )}
            </div>
          </div>
        </div>
  );
}
