/**
 * @file Studio app shell
 * @version 1.0.0
 */

import React from 'react';

type Health = {
  status: string;
  service: string;
  version: string;
};

export function StudioApp() {
  const [health, setHealth] = React.useState<Health | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/health');
        if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
        const data = (await res.json()) as Health;
        if (!cancelled) setHealth(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Unknown error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 16 }}>
      <h1>TooLoo Genesis Studio</h1>
      <p>Studio UI is bootstrapped and talking to the API via Vite proxy.</p>

      <h2>API Health</h2>
      {error ? <pre>{error}</pre> : null}
      {health ? <pre>{JSON.stringify(health, null, 2)}</pre> : <p>Loading…</p>}
    </div>
  );
}
