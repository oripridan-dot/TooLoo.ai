// @version 2.1.28
import React, { useEffect, useMemo, useRef, useState } from 'react';

const API_URL = '/api/v1/generate';
const STATUS_URL = '/api/v1/health';

type ToolooMetadata = {
  provider?: string;
  responseTime?: string | number;
  cached?: boolean;
  priority?: boolean;
  timestamp?: string;
};

type ValidationSummary = {
  command?: string;
  status?: string;
  durationMs?: number | null;
  finishedAt?: string | null;
  notes?: string | null;
};

type StructuredSummary = {
  status: string;
  changeSessionId?: string | null;
  intent?: {
    type?: string;
    feature?: string;
    prompt?: string;
  };
  plan?: {
    highlights?: Array<{
      title?: string;
      details?: unknown;
      timestamp?: string;
    }>;
    totalSteps?: number;
  };
  actions?: {
    steps?: string[];
    actionsTaken?: string[];
    filesCreated?: string[];
    filesModified?: string[];
  };
  validations?: {
    ran: boolean;
    details: ValidationSummary[];
  };
  followUps?: string[];
};

type ChangeSessionSummary = {
  id: string;
  prompt?: string;
  description?: string;
  metadata?: Record<string, unknown> | null;
  status?: string;
  plan?: Array<{ title?: string; details?: unknown; timestamp?: string }>;
  changes?: Array<Record<string, unknown>>;
  validations?: ValidationSummary[];
  notes?: Array<{ level?: string; message: string; timestamp?: string }>;
  summary?: Record<string, unknown> | null;
  createdAt?: string;
  finishedAt?: string | null;
};

type ToolooResponse = {
  success?: boolean;
  content?: string;
  metadata?: ToolooMetadata;
  error?: string;
  structuredSummary?: StructuredSummary;
  changeSession?: ChangeSessionSummary;
  sessionTimeline?: Record<string, unknown>;
  implementation?: unknown;
};

type HistoryEntry = ToolooResponse & {
  prompt: string;
};

type Metrics = {
  avgResponse: number;
  cached: number;
  total: number;
};

type SystemStatus = {
  statusText: string;
  healthyProviders: number;
  totalProviders: number;
  lastChecked: string;
};

type MaintenanceSnapshot = {
  inspection: {
    shouldInspect: boolean;
    reasons: Array<{ priority?: string; reason?: string }>;
    summary: string;
  };
  recentChangeSessions: ChangeSessionSummary[];
};

type MaintenanceTaskResult = {
  type: string;
  status: string;
  sessionId?: string;
  validation?: ValidationSummary;
  report?: Record<string, unknown> | null;
  session?: ChangeSessionSummary;
};

const containerStyle: React.CSSProperties = {
  maxWidth: 760,
  margin: '48px auto',
  padding: 32,
  borderRadius: 16,
  background: '#ffffffee',
  boxShadow: '0 24px 45px -24px rgba(15, 23, 42, 0.35)',
};

function computeMetrics(history: HistoryEntry[]): Metrics {
  if (history.length === 0) {
    return { avgResponse: 0, cached: 0, total: 0 };
  }

  const total = history.length;
  const cached = history.filter(entry => entry.metadata?.cached).length;
  const totalResponseTime = history.reduce((acc, entry) => {
    const value = Number(entry.metadata?.responseTime);
    return Number.isFinite(value) ? acc + value : acc;
  }, 0);

  return {
    avgResponse: total > 0 ? Math.round(totalResponseTime / total) : 0,
    cached,
    total,
  };
}

class HttpError extends Error {
  constructor(public status: number, public info?: string) {
    const statusText = info ? `${status} – ${info}` : `${status}`;
    super(`Request failed with status ${statusText}`);
  }
}

function resolveApiUrl(url: string): string {
  // If it's already an absolute URL, return as-is
  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  // For relative URLs, just return them - Vite proxy will handle it
  // This ensures we use the proxy at /api -> http://localhost:3001
  return url;
}

async function fetchJson<T>(url: string, init?: RequestInit, timeoutMs = 30000): Promise<T> {
  const controller = new AbortController();
  const resolvedUrl = resolveApiUrl(url);

  const timeoutId = setTimeout(() => {
    console.warn(`Request to ${resolvedUrl} timed out after ${timeoutMs}ms`);
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(resolvedUrl, {
      ...init,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      let message: string | undefined;
      try {
        const text = await response.text();
        message = text ? text.slice(0, 200).trim() : undefined;
      } catch (readError) {
        console.debug('Unable to read error response body', readError);
      }
      throw new HttpError(response.status, message);
    }
    return (await response.json()) as T;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

const ToolooMonitor: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [maintenanceStatus, setMaintenanceStatus] = useState<MaintenanceSnapshot | null>(null);
  const [maintenanceError, setMaintenanceError] = useState<string | null>(null);
  const [maintenanceLoading, setMaintenanceLoading] = useState({ inspection: false, tests: false });
  const [maintenanceLog, setMaintenanceLog] = useState<Array<{ timestamp: string; result: MaintenanceTaskResult }>>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const metrics = useMemo(() => computeMetrics(history), [history]);

  useEffect(() => {
    inputRef.current?.focus();
    refreshStatus();
    refreshMaintenanceStatus();
  }, []);

  const refreshStatus = async () => {
    try {
      const payload = await fetchJson<{
        status?: string;
        system?: { providers?: Array<{ hasKey?: boolean; enabled?: boolean }> };
      }>(STATUS_URL, undefined, 15000); // Increased timeout for initial load

      const providers = payload.system?.providers ?? [];
      const healthyProviders = providers.filter(p => p.hasKey && p.enabled).length;

      setStatus({
        statusText: payload.status ?? 'unknown',
        healthyProviders,
        totalProviders: providers.length,
        lastChecked: new Date().toISOString(),
      });
      setStatusError(null);
    } catch (error) {
      let message = 'Unable to fetch system status';
      if (error instanceof HttpError) {
        if (error.status >= 500 || error.status === 404) {
          message = 'API unavailable. Start the backend with "npm run start:api" and try again.';
        } else if (error.status === 401) {
          message = 'Access denied. Log in to your Codespace and refresh the page.';
        } else {
          message = error.message;
        }
      } else if (error instanceof Error) {
        message = error.message.includes('abort') ? 'Request timed out. Try refreshing.' : error.message;
      }
      setStatus(null);
      setStatusError(message);
    }
    await refreshMaintenanceStatus();
  };

  const refreshMaintenanceStatus = async () => {
    try {
      const payload = await fetchJson<{ success: boolean; data: MaintenanceSnapshot }>(
        '/api/v1/maintenance/status',
        undefined,
        15000, // Increased timeout
      );

      setMaintenanceStatus(payload.data ?? null);
      setMaintenanceError(null);
    } catch (error) {
      let message = 'Unable to fetch maintenance status';
      if (error instanceof HttpError) {
        message = error.status >= 500 ? 'Maintenance API unavailable.' : error.message;
      } else if (error instanceof Error) {
        message = error.message;
      }
      setMaintenanceError(message);
    }
  };

  const triggerMaintenance = async (task: 'inspection' | 'tests') => {
    setMaintenanceLoading(prev => ({ ...prev, [task]: true }));

    try {
      const response = await fetchJson<{ success: boolean; data: MaintenanceTaskResult }>(
        `/api/v1/maintenance/${task}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        },
        600000,
      );

      if (response.data) {
        setMaintenanceLog(prev => [
          { timestamp: new Date().toISOString(), result: response.data },
          ...prev,
        ].slice(0, 5));
      }
      setMaintenanceError(null);
      await refreshMaintenanceStatus();
    } catch (error) {
      let message = 'Maintenance task failed';
      if (error instanceof HttpError) {
        message = error.message;
      } else if (error instanceof Error) {
        message = error.message;
      }
      setMaintenanceError(message);
    } finally {
      setMaintenanceLoading(prev => ({ ...prev, [task]: false }));
    }
  };

  const triggerInspection = () => triggerMaintenance('inspection');
  const triggerTests = () => triggerMaintenance('tests');

  const sendPrompt = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt || loading) return;

    setLoading(true);

    try {
      // Give AI providers plenty of time for complex tasks (5 minutes)
      const result = await fetchJson<ToolooResponse>(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: trimmedPrompt }),
      }, 300000); // 5 minutes timeout for AI generation

      setHistory(prev => [
        {
          prompt: trimmedPrompt,
          ...result,
        },
        ...prev,
      ]);
    } catch (error) {
      let message = 'Unknown error';
      if (error instanceof HttpError) {
        message = error.status >= 500
          ? 'API unavailable. Please start the backend server before sending prompts.'
          : error.message;
      } else if (error instanceof Error) {
        message = error.message;
      }
      setHistory(prev => [
        {
          prompt: trimmedPrompt,
          success: false,
          error: message,
        },
        ...prev,
      ]);
    } finally {
      setLoading(false);
      setPrompt('');
      inputRef.current?.focus();
    }
  };

  const handleRetry = (entry: HistoryEntry) => {
    setPrompt(entry.prompt);
    inputRef.current?.focus();
  };

  return (
    <div style={containerStyle}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            🧠 Hey, I'm TooLoo!
          </h1>
          <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 16 }}>
            Your friendly AI dev buddy. Let's build something awesome together! 🚀
          </p>
        </div>
        <button
          type="button"
          onClick={refreshStatus}
          disabled={loading}
          style={{
            border: 'none',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff',
            padding: '12px 24px',
            borderRadius: 12,
            cursor: 'pointer',
            boxShadow: '0 10px 25px -12px rgba(102, 126, 234, 0.75)',
            fontWeight: 600,
            transition: 'all 0.3s ease',
          }}
        >
          🔄 Refresh
        </button>
      </header>

      <form onSubmit={sendPrompt} style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <input
          ref={inputRef}
          value={prompt}
          onChange={event => setPrompt(event.target.value)}
          placeholder="What shall we build today? 🎨"
          disabled={loading}
          style={{
            flex: 1,
            padding: '16px 20px',
            fontSize: 16,
            borderRadius: 12,
            border: '2px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.08)',
            transition: 'all 0.3s ease',
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '16px 32px',
            fontSize: 16,
            borderRadius: 12,
            border: 'none',
            cursor: loading ? 'progress' : 'pointer',
            background: loading 
              ? 'linear-gradient(135deg, #94a3b8, #cbd5e1)' 
              : 'linear-gradient(135deg, #667eea, #764ba2)',
            color: '#fff',
            fontWeight: 600,
            boxShadow: '0 15px 30px -18px rgba(102, 126, 234, 0.8)',
            transition: 'all 0.3s ease',
          }}
        >
          {loading ? '🤔 Thinking...' : '✨ Let\'s Go!'}
        </button>
      </form>

      <section style={{
        display: 'grid',
        gap: 16,
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        marginBottom: 24,
      }}>
        <article style={{
          background: '#f8fafc',
          borderRadius: 14,
          padding: 18,
          border: '1px solid #e2e8f0',
        }}>
          <h2 style={{ margin: '0 0 12px', fontSize: 16, color: '#475569', fontWeight: 600 }}>
            📊 Quick Stats
          </h2>
          <p style={{ margin: '0 0 8px', fontSize: 14 }}>
            Total chats: <strong style={{ color: '#667eea' }}>{metrics.total}</strong>
          </p>
          <p style={{ margin: '0 0 8px', fontSize: 14 }}>
            Avg response: <strong style={{ color: '#667eea' }}>{metrics.avgResponse} ms</strong>
          </p>
          <p style={{ margin: 0, fontSize: 14 }}>
            Cached: <strong style={{ color: '#667eea' }}>{metrics.cached}</strong> ⚡
          </p>
        </article>

        <article style={{
          background: status ? '#ecfdf5' : '#fef2f2',
          borderRadius: 14,
          padding: 20,
          border: `2px solid ${status ? '#bef5d2' : '#fecaca'}`,
          boxShadow: status ? '0 4px 12px rgba(34, 197, 94, 0.15)' : '0 4px 12px rgba(239, 68, 68, 0.15)',
        }}>
          <h2 style={{ margin: '0 0 12px', fontSize: 16, color: '#475569', fontWeight: 600 }}>
            {status ? '✨ Everything looks great!' : '⚠️ Hmm, having some trouble'}
          </h2>
          {status ? (
            <>
              <p style={{ margin: '0 0 6px', fontSize: 14 }}>
                Status: <strong style={{ textTransform: 'capitalize', color: '#22c55e' }}>{status.statusText}</strong> 🎉
              </p>
              <p style={{ margin: '0 0 6px', fontSize: 14 }}>
                AI Providers: <strong style={{ color: '#667eea' }}>{status.healthyProviders}/{status.totalProviders}</strong> ready to help
              </p>
              <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>
                Last checked {new Date(status.lastChecked).toLocaleTimeString()}
              </p>
            </>
          ) : (
            <p style={{ margin: 0, color: '#b91c1c', fontSize: 14 }}>
              {statusError ?? 'Can\'t reach the backend. Make sure the server is running! 🔌'}
            </p>
          )}
        </article>
      </section>

      <section
        style={{
          background: '#f8fafc',
          borderRadius: 14,
          padding: 24,
          border: '1px solid #e2e8f0',
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div>
            <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 600 }}>
              🔧 Maintenance & Health Checks
            </h2>
            <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>
              Let's keep everything running smoothly! Run inspections and tests whenever you want.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="button"
              onClick={triggerInspection}
              disabled={maintenanceLoading.inspection}
              style={{
                border: 'none',
                background: maintenanceLoading.inspection ? '#94a3b8' : '#22c55e',
                color: '#fff',
                padding: '10px 16px',
                borderRadius: 10,
                cursor: maintenanceLoading.inspection ? 'progress' : 'pointer',
                boxShadow: '0 10px 25px -18px rgba(34,197,94,0.7)',
                fontWeight: 600,
              }}
            >
              {maintenanceLoading.inspection ? 'Inspecting…' : 'Run Inspection'}
            </button>
            <button
              type="button"
              onClick={triggerTests}
              disabled={maintenanceLoading.tests}
              style={{
                border: 'none',
                background: '#6366f1',
                color: '#fff',
                padding: '10px 16px',
                borderRadius: 10,
                cursor: maintenanceLoading.tests ? 'progress' : 'pointer',
                boxShadow: '0 10px 25px -18px rgba(99,102,241,0.7)',
                fontWeight: 600,
              }}
            >
              {maintenanceLoading.tests ? 'Running tests…' : 'Run Tests'}
            </button>
          </div>
        </div>

        {maintenanceError ? (
          <p style={{ margin: '16px 0 0', color: '#b91c1c' }}>{maintenanceError}</p>
        ) : (
          <div style={{ marginTop: 16, display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
            <article style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 10px', fontSize: 16, color: '#475569', fontWeight: 600 }}>
                🔍 Health Check Status
              </h3>
              {maintenanceStatus ? (
                <>
                  <p style={{ margin: '0 0 6px', color: maintenanceStatus.inspection.shouldInspect ? '#b45309' : '#15803d', fontSize: 14 }}>
                    {maintenanceStatus.inspection.summary}
                  </p>
                  {maintenanceStatus.inspection.reasons && maintenanceStatus.inspection.reasons.length > 0 && (
                    <ul style={{ margin: 0, paddingLeft: 18, color: '#475569', fontSize: 14 }}>
                      {maintenanceStatus.inspection.reasons.slice(0, 3).map((reason, index) => (
                        <li key={`${reason.reason}-${index}`}>
                          <strong style={{ textTransform: 'capitalize' }}>{reason.priority ?? 'info'}:</strong> {reason.reason}
                        </li>
                      ))}
                      {maintenanceStatus.inspection.reasons.length > 3 && <li>…{maintenanceStatus.inspection.reasons.length - 3} more</li>}
                    </ul>
                  )}
                </>
              ) : (
                <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>Loading status... hang tight! ⏳</p>
              )}
            </article>

            <article style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 10px', fontSize: 16, color: '#475569', fontWeight: 600 }}>
                📝 Recent Work
              </h3>
              {maintenanceStatus && maintenanceStatus.recentChangeSessions.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: 18, color: '#475569', fontSize: 14 }}>
                  {maintenanceStatus.recentChangeSessions.slice(0, 3).map(session => (
                    <li key={session.id} style={{ marginBottom: 6 }}>
                      <strong>{session.status ?? 'pending'}</strong> — {session.description ?? session.prompt ?? session.id}
                      {session.validations && session.validations.length > 0 && (
                        <div style={{ fontSize: 12, color: '#64748b' }}>
                          {session.validations[0].status} ({session.validations[0].command})
                        </div>
                      )}
                    </li>
                  ))}
                  {maintenanceStatus.recentChangeSessions.length > 3 && (
                    <li style={{ fontSize: 12, color: '#64748b' }}>…more sessions logged</li>
                  )}
                </ul>
              ) : (
                <p style={{ margin: 0, color: '#64748b' }}>No change sessions logged yet.</p>
              )}
            </article>

            {maintenanceLog.length > 0 && (
              <article style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 10px', fontSize: 16, color: '#475569' }}>Latest Actions</h3>
                <ul style={{ margin: 0, paddingLeft: 18, color: '#475569', fontSize: 14 }}>
                  {maintenanceLog.map(entry => (
                    <li key={entry.timestamp} style={{ marginBottom: 6 }}>
                      <strong>{entry.result.type}</strong> — {entry.result.status}
                      {entry.result.sessionId && (
                        <span> (session {entry.result.sessionId})</span>
                      )}
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </div>
                    </li>
                  ))}
                </ul>
              </article>
            )}
          </div>
        )}
      </section>

      <section>
        <h2 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 600 }}>
          💬 Our Conversation
        </h2>
        {history.length === 0 ? (
          <p style={{ margin: 0, color: '#64748b', fontSize: 15 }}>
            Nothing here yet! Ask me anything to get started. I'm ready when you are! 👋
          </p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {history.map((entry, index) => (
              <li
                key={`${entry.prompt}-${index}`}
                style={{
                  background: '#f8fafc',
                  borderRadius: 14,
                  padding: 18,
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 10px 24px -22px rgba(15, 23, 42, 0.6)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div>
                    <p style={{ margin: '0 0 4px', fontWeight: 600, color: '#4338ca' }}>{entry.prompt}</p>
                    {entry.success === false ? (
                      <p style={{ margin: 0, color: '#b91c1c' }}>Error: {entry.error}</p>
                    ) : (
                      <p style={{ margin: 0, color: '#1f2937' }}>
                        {entry.content?.slice(0, 250)}
                        {entry.content && entry.content.length > 250 ? '…' : ''}
                      </p>
                    )}
                    {entry.success !== false && entry.structuredSummary && (
                      <div style={{ marginTop: 12, background: '#eef2ff', borderRadius: 10, padding: 12 }}>
                        <p style={{ margin: '0 0 6px', fontWeight: 600, color: '#3730a3' }}>
                          Status: <span style={{ textTransform: 'capitalize' }}>{entry.structuredSummary.status}</span>
                          {entry.structuredSummary.changeSessionId && (
                            <span style={{ fontSize: 12, color: '#6366f1', marginLeft: 8 }}>
                              session {entry.structuredSummary.changeSessionId}
                            </span>
                          )}
                        </p>
                        {entry.structuredSummary.intent?.feature && (
                          <p style={{ margin: '0 0 6px', color: '#4338ca' }}>
                            Intent: <strong>{entry.structuredSummary.intent.feature}</strong>
                          </p>
                        )}
                        {entry.structuredSummary.actions?.actionsTaken && entry.structuredSummary.actions.actionsTaken.length > 0 && (
                          <div style={{ marginBottom: 6 }}>
                            <p style={{ margin: '0 0 4px', fontWeight: 600, color: '#4338ca' }}>Actions</p>
                            <ul style={{ margin: 0, paddingLeft: 18, color: '#312e81', fontSize: 14 }}>
                              {entry.structuredSummary.actions.actionsTaken.slice(0, 3).map(action => (
                                <li key={action}>{action}</li>
                              ))}
                              {entry.structuredSummary.actions.actionsTaken.length > 3 && (
                                <li>…{entry.structuredSummary.actions.actionsTaken.length - 3} more</li>
                              )}
                            </ul>
                          </div>
                        )}
                        {entry.structuredSummary.validations && entry.structuredSummary.validations.ran && (
                          <div style={{ marginBottom: 6, fontSize: 13, color: '#1f2937' }}>
                            <strong>Validations:</strong>{' '}
                            {entry.structuredSummary.validations.details.length > 0
                              ? entry.structuredSummary.validations.details
                                  .map(detail => `${detail.status ?? 'done'} (${detail.command ?? 'command'})`)
                                  .slice(0, 2)
                                  .join(', ')
                              : 'Completed'}
                          </div>
                        )}
                        {entry.structuredSummary.followUps && entry.structuredSummary.followUps.length > 0 && (
                          <div>
                            <p style={{ margin: '0 0 4px', fontWeight: 600, color: '#4338ca' }}>Follow-ups</p>
                            <ul style={{ margin: 0, paddingLeft: 18, color: '#312e81', fontSize: 14 }}>
                              {entry.structuredSummary.followUps.slice(0, 2).map(item => (
                                <li key={item}>{item}</li>
                              ))}
                              {entry.structuredSummary.followUps.length > 2 && (
                                <li>…{entry.structuredSummary.followUps.length - 2} more</li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRetry(entry)}
                    style={{
                      border: 'none',
                      background: '#e2e8f0',
                      color: '#1f2937',
                      padding: '6px 12px',
                      borderRadius: 8,
                      cursor: 'pointer',
                    }}
                  >
                    Reuse prompt
                  </button>
                </div>
                <footer style={{ marginTop: 10, fontSize: 13, color: '#64748b' }}>
                  Provider: {entry.metadata?.provider ?? 'unknown'} | Response time: {entry.metadata?.responseTime ?? '—'} | Cached: {entry.metadata?.cached ? 'Yes' : 'No'}
                </footer>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default ToolooMonitor;
