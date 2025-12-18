/**
 * @file Studio app shell
 * @version 1.0.0
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
    padding: tokens.space.lg,
    maxWidth: 980,
  };

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

  return (
    <div style={shellStyle}>
      <h1 style={{ margin: 0 }}>TooLoo Genesis Studio</h1>
      <p style={{ color: tokens.color.muted, marginTop: tokens.space.sm }}>
        Studio UI is bootstrapped and talking to the API via Vite proxy.
      </p>

      <div style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>API Health</h2>
        {health ? (
          <pre style={{ fontFamily: tokens.font.mono, margin: 0 }}>{JSON.stringify(health, null, 2)}</pre>
        ) : (
          <p style={{ margin: 0 }}>Loading…</p>
        )}
      </div>

      <div style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>Knowledge: Ingest</h2>
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
                }),
              )
            }
          >
            Ingest
          </button>
        </div>
      </div>

      <div style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>Knowledge: Search</h2>
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
                }),
              )
            }
          >
            Search
          </button>
        </div>
      </div>

      <div style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>Knowledge: Cite</h2>
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
                }),
              )
            }
          >
            Cite
          </button>
        </div>
      </div>

      <div style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>Last Result</h2>
        {error ? (
          <p style={{ color: tokens.color.danger, marginTop: 0 }}>{error}</p>
        ) : null}
        {lastResult ? (
          <pre style={{ fontFamily: tokens.font.mono, margin: 0 }}>
            {JSON.stringify(lastResult, null, 2)}
          </pre>
        ) : (
          <p style={{ margin: 0, color: tokens.color.muted }}>No calls yet.</p>
        )}
      </div>
    </div>
  );
}
