/**
 * API Utilities - Synapsys Nervous System
 * The universal communication layer between Shell and Nucleus.
 *
 * @version 3.3.579-skill-shell
 */

export function getApiBaseUrl() {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;

  // In development, use Vite proxy to avoid CORS
  if (import.meta.env.DEV) {
    return '/api/v2';
  }

  if (typeof window !== 'undefined') {
    const { hostname, protocol } = window.location;
    if (hostname.includes('.app.github.dev')) {
      return `${protocol}//${hostname.replace(/-\d+\./, '-4001.')}/api/v2`;
    }
    return 'http://localhost:4001/api/v2';
  }
  return 'http://localhost:4001/api/v2';
}

export function getSocketUrl() {
  if (import.meta.env.VITE_SOCKET_URL) return import.meta.env.VITE_SOCKET_URL;

  // In development, empty string connects to same host (Vite proxy)
  if (import.meta.env.DEV) {
    return '';
  }

  if (typeof window !== 'undefined') {
    const { hostname, protocol } = window.location;
    if (hostname.includes('.app.github.dev')) {
      return `${protocol}//${hostname.replace(/-\d+\./, '-4001.')}`;
    }
    return 'http://localhost:4001';
  }
  return 'http://localhost:4001';
}

// Generate persistent session ID for Nucleus identity
const getSessionId = () => {
  if (typeof window === 'undefined') return 'sess_ssr';
  let sid = localStorage.getItem('tooloo_session_id');
  if (!sid) {
    sid = 'sess_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('tooloo_session_id', sid);
  }
  return sid;
};

/**
 * Smart Synapsys API Request
 * Injects identity and routing headers for Nucleus recognition.
 *
 * @param {string} endpoint - API endpoint (e.g., '/skills', '/chat')
 * @param {RequestInit & { complexity?: 'simple'|'standard'|'complex'|'creative' }} options
 */
export async function apiRequest(endpoint, options = {}) {
  const url = `${getApiBaseUrl()}${endpoint}`;

  const { complexity, ...fetchOptions } = options;

  const headers = {
    'Content-Type': 'application/json',
    'x-session-id': getSessionId(),
    'x-client-version': '3.3.579',
    'x-complexity-hint': complexity || 'standard',
    ...fetchOptions.headers,
  };

  const response = await fetch(url, { ...fetchOptions, headers });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error?.message || error.error || 'API request failed');
  }

  return response.json();
}

export const API_BASE = getApiBaseUrl();
export const SOCKET_URL = getSocketUrl();
