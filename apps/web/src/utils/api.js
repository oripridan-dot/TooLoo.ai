/**
 * API Utilities
 * Handles URL generation for Codespaces and local development
 *
 * @version 2.0.0-alpha.0
 */

/**
 * Get the API base URL, handling Codespaces port forwarding
 * @returns {string} API base URL
 */
export function getApiBaseUrl() {
  // Check for explicit env var first
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // In browser, detect Codespaces URL pattern
  if (typeof window !== 'undefined') {
    const { hostname, protocol } = window.location;

    // GitHub Codespaces pattern: xxx-5173.app.github.dev -> xxx-4001.app.github.dev
    if (hostname.includes('.app.github.dev')) {
      const apiHost = hostname.replace(/-\d+\./, '-4001.');
      return `${protocol}//${apiHost}/api/v2`;
    }

    // Local development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:4001/api/v2';
    }
  }

  // Fallback
  return 'http://localhost:4001/api/v2';
}

/**
 * Get the Socket.IO URL
 * @returns {string} Socket URL (without /api/v2 path)
 */
export function getSocketUrl() {
  // Check for explicit env var first
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }

  // In browser, detect Codespaces URL pattern
  if (typeof window !== 'undefined') {
    const { hostname, protocol } = window.location;

    // GitHub Codespaces pattern
    if (hostname.includes('.app.github.dev')) {
      const apiHost = hostname.replace(/-\d+\./, '-4001.');
      return `${protocol}//${apiHost}`;
    }

    // Local development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:4001';
    }
  }

  // Fallback
  return 'http://localhost:4001';
}

/**
 * Make an API request
 * @param {string} endpoint - API endpoint (e.g., '/skills')
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<any>} Response data
 */
export async function apiRequest(endpoint, options = {}) {
  const url = `${getApiBaseUrl()}${endpoint}`;
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error?.message || error.error || 'API request failed');
  }

  return response.json();
}

// Export constants for backward compatibility
export const API_BASE = getApiBaseUrl();
export const SOCKET_URL = getSocketUrl();
