/**
 * useAuth - Authentication React Hook for V2
 *
 * @version 2.0.0-alpha.0
 */

import { useState, useCallback, useEffect } from 'react';

import { getApiBaseUrl } from '../utils/api.js';

const API_BASE = getApiBaseUrl();

/**
 * User object returned from auth endpoints
 */
export const AuthState = {
  LOADING: 'loading',
  AUTHENTICATED: 'authenticated',
  UNAUTHENTICATED: 'unauthenticated',
};

/**
 * Authentication hook
 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [authState, setAuthState] = useState(AuthState.LOADING);
  const [error, setError] = useState(null);

  // Get session token from localStorage
  const getSessionToken = useCallback(() => {
    return localStorage.getItem('sessionToken');
  }, []);

  // Save session token
  const saveSessionToken = useCallback((token) => {
    if (token) {
      localStorage.setItem('sessionToken', token);
    } else {
      localStorage.removeItem('sessionToken');
    }
  }, []);

  // Get API key from localStorage
  const getApiKey = useCallback(() => {
    return localStorage.getItem('apiKey');
  }, []);

  // Save API key
  const saveApiKey = useCallback((key) => {
    if (key) {
      localStorage.setItem('apiKey', key);
    } else {
      localStorage.removeItem('apiKey');
    }
  }, []);

  // Fetch current user
  const fetchCurrentUser = useCallback(async () => {
    const token = getSessionToken();
    const apiKey = getApiKey();

    if (!token && !apiKey) {
      setAuthState(AuthState.UNAUTHENTICATED);
      return null;
    }

    try {
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else if (apiKey) {
        headers['X-API-Key'] = apiKey;
      }

      const response = await fetch(`${API_BASE}/auth/me`, { headers });
      
      // Silently handle 401 - user is just not logged in
      if (response.status === 401) {
        saveSessionToken(null);
        setAuthState(AuthState.UNAUTHENTICATED);
        return null;
      }
      
      const data = await response.json();

      if (data.ok) {
        setUser(data.data);
        setAuthState(AuthState.AUTHENTICATED);
        return data.data;
      } else {
        // Token expired or invalid
        saveSessionToken(null);
        setAuthState(AuthState.UNAUTHENTICATED);
        return null;
      }
    } catch (err) {
      // Only log actual errors, not expected auth failures
      if (err.name !== 'AbortError') {
        console.warn('[Auth] Check failed:', err.message);
      }
      setAuthState(AuthState.UNAUTHENTICATED);
      return null;
    }
  }, [getSessionToken, getApiKey, saveSessionToken]);

  // Register new user
  const register = useCallback(async (email, name, password) => {
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, password }),
      });

      const data = await response.json();

      if (data.ok) {
        // Save API key (only shown once at registration)
        saveApiKey(data.data.apiKey);
        setUser(data.data.user);
        setAuthState(AuthState.AUTHENTICATED);
        return { success: true, apiKey: data.data.apiKey };
      } else {
        setError(data.error?.message || 'Registration failed');
        return { success: false, error: data.error?.message };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Network error';
      setError(message);
      return { success: false, error: message };
    }
  }, [saveApiKey]);

  // Login
  const login = useCallback(async (email, password) => {
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // For cookies
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.ok) {
        saveSessionToken(data.data.sessionToken);
        setUser(data.data.user);
        setAuthState(AuthState.AUTHENTICATED);
        return { success: true };
      } else {
        setError(data.error?.message || 'Login failed');
        return { success: false, error: data.error?.message };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Network error';
      setError(message);
      return { success: false, error: message };
    }
  }, [saveSessionToken]);

  // Logout
  const logout = useCallback(async () => {
    const token = getSessionToken();

    if (token) {
      try {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        });
      } catch (err) {
        console.error('Logout request failed:', err);
      }
    }

    saveSessionToken(null);
    setUser(null);
    setAuthState(AuthState.UNAUTHENTICATED);
  }, [getSessionToken, saveSessionToken]);

  // Regenerate API key
  const regenerateApiKey = useCallback(async () => {
    const token = getSessionToken();
    const apiKey = getApiKey();

    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else if (apiKey) {
      headers['X-API-Key'] = apiKey;
    }

    try {
      const response = await fetch(`${API_BASE}/auth/regenerate-key`, {
        method: 'POST',
        headers,
      });

      const data = await response.json();

      if (data.ok) {
        saveApiKey(data.data.apiKey);
        return { success: true, apiKey: data.data.apiKey };
      } else {
        return { success: false, error: data.error?.message };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Network error';
      return { success: false, error: message };
    }
  }, [getSessionToken, getApiKey, saveApiKey]);

  // Check auth on mount
  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  return {
    user,
    authState,
    error,
    isAuthenticated: authState === AuthState.AUTHENTICATED,
    isLoading: authState === AuthState.LOADING,

    // Actions
    login,
    logout,
    register,
    regenerateApiKey,
    refreshUser: fetchCurrentUser,

    // Token access
    getSessionToken,
    getApiKey,
  };
}

export default useAuth;
