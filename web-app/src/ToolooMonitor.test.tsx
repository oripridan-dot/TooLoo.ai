import { render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ToolooMonitor from './ToolooMonitor';
import '@testing-library/jest-dom/vitest';

type FetchResponseOptions = {
  ok: boolean;
  status: number;
  json?: unknown;
  text?: string;
};

const originalFetch = global.fetch;
const originalLocation = window.location;

function mockFetchResponse({ ok, status, json, text }: FetchResponseOptions) {
  const response = {
    ok,
    status,
    json: async () => (json ?? {}),
    text: async () => text ?? '',
  } as Response;

  const fetchMock = vi.fn().mockResolvedValue(response);
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

function stubLocation({
  protocol,
  hostname,
  origin,
  search,
}: {
  protocol: string;
  hostname: string;
  origin?: string;
  search?: string;
}) {
  const resolvedOrigin = origin ?? `${protocol}//${hostname}`;
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      protocol,
      hostname,
      origin: resolvedOrigin,
      search: search ?? '',
    } as Location,
  });
}

describe('ToolooMonitor', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    if (originalFetch) {
      global.fetch = originalFetch;
    } else {
      // @ts-expect-error - allow cleanup when fetch was undefined
      delete global.fetch;
    }

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  it('shows healthy system status when the API responds successfully', async () => {
    mockFetchResponse({
      ok: true,
      status: 200,
      json: {
        status: 'healthy',
        system: {
          providers: [
            { hasKey: true, enabled: true },
            { hasKey: false, enabled: true },
          ],
        },
      },
    });

    render(<ToolooMonitor />);

    const statusLine = await screen.findByText(/Status:/i);
  expect(statusLine).toHaveTextContent(/Status: healthy/i);

    const providersLine = await screen.findByText(/Providers ready:/i);
    expect(providersLine).toHaveTextContent('Providers ready: 1/2');
  });

  it('prompts the user to start the backend when the health check returns 500', async () => {
    mockFetchResponse({
      ok: false,
      status: 500,
      text: 'Internal Server Error',
    });

    render(<ToolooMonitor />);

    const errorMessage = await screen.findByText(
      'API unavailable. Start the backend with "npm run start:api" and try again.',
    );
    expect(errorMessage).toBeInTheDocument();
  });

  it('tells the user to log in when the health check returns 401', async () => {
    mockFetchResponse({
      ok: false,
      status: 401,
      text: 'Unauthorized',
    });

    render(<ToolooMonitor />);

    const errorMessage = await screen.findByText(
      'Access denied. Log in to your Codespace and refresh the page.',
    );
    expect(errorMessage).toBeInTheDocument();
  });

  it('targets localhost:3001 when running on localhost', async () => {
    const fetchMock = mockFetchResponse({
      ok: true,
      status: 200,
      json: { status: 'healthy', system: { providers: [] } },
    });

    stubLocation({ protocol: 'http:', hostname: 'localhost', origin: 'http://localhost:5173' });

    render(<ToolooMonitor />);

    await screen.findByText(/Status:/i);

    expect(fetchMock).toHaveBeenCalled();
    // Now uses relative URL - Vite proxy handles forwarding to :3001
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/health');
  });

  it('targets Codespaces API URL when running on forwarded domain', async () => {
    const fetchMock = mockFetchResponse({
      ok: true,
      status: 200,
      json: { status: 'healthy', system: { providers: [] } },
    });

    stubLocation({
      protocol: 'https:',
      hostname: 'fluffy-doodle-q7gg7rx5wrxjh9v77-5173.app.github.dev',
      origin: 'https://fluffy-doodle-q7gg7rx5wrxjh9v77-5173.app.github.dev',
      search: '?token=abc123',
    });

    render(<ToolooMonitor />);

    await screen.findByText(/Status:/i);

    expect(fetchMock).toHaveBeenCalled();
    // Now uses relative URL - Vite proxy handles forwarding
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/health');
  });
});
