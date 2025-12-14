/**
 * Login Component - V2 Authentication UI
 *
 * @version 2.0.0-alpha.0
 */

import { useState } from 'react';
import { useAuth, AuthState } from '../hooks/useAuth';

// =============================================================================
// LOGIN FORM
// =============================================================================

function LoginForm({ onSwitch }) {
  const { login, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    setLoading(true);

    const result = await login(email, password);

    setLoading(false);

    if (!result.success) {
      setLocalError(result.error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <h2>🔐 Login</h2>

      {(error || localError) && (
        <div className="error-message">{error || localError}</div>
      )}

      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          autoComplete="email"
        />
      </div>

      <div className="form-group">
        <label htmlFor="password">Password</label>
        <input
          type="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          autoComplete="current-password"
        />
      </div>

      <button type="submit" className="submit-btn" disabled={loading}>
        {loading ? '⏳ Logging in...' : '→ Login'}
      </button>

      <p className="switch-text">
        Don't have an account?{' '}
        <button type="button" onClick={onSwitch} className="link-btn">
          Register
        </button>
      </p>

      {/* Demo credentials hint */}
      <div className="demo-hint">
        <strong>Demo:</strong> test@tooloo.ai / any password
      </div>
    </form>
  );
}

// =============================================================================
// REGISTER FORM
// =============================================================================

function RegisterForm({ onSwitch }) {
  const { register, error } = useAuth();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [apiKey, setApiKey] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    setLoading(true);

    const result = await register(email, name, password);

    setLoading(false);

    if (result.success) {
      setApiKey(result.apiKey);
    } else {
      setLocalError(result.error);
    }
  };

  if (apiKey) {
    return (
      <div className="auth-form success-panel">
        <h2>✅ Registration Successful!</h2>
        <p>Your API key (save it now, shown only once):</p>
        <code className="api-key">{apiKey}</code>
        <button
          type="button"
          className="copy-btn"
          onClick={() => navigator.clipboard.writeText(apiKey)}
        >
          📋 Copy to Clipboard
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <h2>📝 Register</h2>

      {(error || localError) && (
        <div className="error-message">{error || localError}</div>
      )}

      <div className="form-group">
        <label htmlFor="reg-name">Name</label>
        <input
          type="text"
          id="reg-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your Name"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="reg-email">Email</label>
        <input
          type="email"
          id="reg-email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="reg-password">Password</label>
        <input
          type="password"
          id="reg-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Min 8 characters"
          required
          minLength={8}
        />
      </div>

      <button type="submit" className="submit-btn" disabled={loading}>
        {loading ? '⏳ Creating account...' : '→ Register'}
      </button>

      <p className="switch-text">
        Already have an account?{' '}
        <button type="button" onClick={onSwitch} className="link-btn">
          Login
        </button>
      </p>
    </form>
  );
}

// =============================================================================
// USER PROFILE
// =============================================================================

function UserProfile() {
  const { user, logout, regenerateApiKey, getApiKey } = useAuth();
  const [showApiKey, setShowApiKey] = useState(false);
  const [newApiKey, setNewApiKey] = useState(null);
  const [regenerating, setRegenerating] = useState(false);

  const handleRegenerate = async () => {
    if (!confirm('This will invalidate your current API key. Continue?')) {
      return;
    }

    setRegenerating(true);
    const result = await regenerateApiKey();
    setRegenerating(false);

    if (result.success) {
      setNewApiKey(result.apiKey);
    } else {
      alert(`Failed: ${result.error}`);
    }
  };

  const storedApiKey = getApiKey();

  return (
    <div className="user-profile">
      <div className="profile-header">
        <div className="avatar">{user?.name?.[0]?.toUpperCase() || '?'}</div>
        <div className="info">
          <h3>{user?.name}</h3>
          <p>{user?.email}</p>
          <span className={`tier tier-${user?.tier}`}>{user?.tier}</span>
        </div>
      </div>

      <div className="profile-section">
        <h4>🔑 API Key</h4>
        {newApiKey ? (
          <div className="new-key-notice">
            <p>New key (save now):</p>
            <code>{newApiKey}</code>
            <button onClick={() => navigator.clipboard.writeText(newApiKey)}>
              📋 Copy
            </button>
          </div>
        ) : showApiKey && storedApiKey ? (
          <div className="key-display">
            <code>{storedApiKey}</code>
            <button onClick={() => setShowApiKey(false)}>Hide</button>
          </div>
        ) : (
          <button onClick={() => setShowApiKey(true)} disabled={!storedApiKey}>
            {storedApiKey ? '👁️ Show Key' : 'No key stored'}
          </button>
        )}
        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          className="regenerate-btn"
        >
          {regenerating ? '⏳ Regenerating...' : '🔄 Regenerate Key'}
        </button>
      </div>

      <div className="profile-actions">
        <button onClick={logout} className="logout-btn">
          🚪 Logout
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN AUTH PAGE COMPONENT
// =============================================================================

export function AuthPage() {
  const { authState, isAuthenticated } = useAuth();
  const [mode, setMode] = useState('login');

  // Show loading state
  if (authState === AuthState.LOADING) {
    return (
      <div className="auth-page">
        <div className="auth-container loading">
          <div className="spinner">⏳</div>
          <p>Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Show profile if authenticated
  if (isAuthenticated) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <UserProfile />
        </div>
      </div>
    );
  }

  // Show login/register forms
  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-logo">
          <span className="logo-icon">🧠</span>
          <span className="logo-text">TooLoo.ai</span>
        </div>

        {mode === 'login' ? (
          <LoginForm onSwitch={() => setMode('register')} />
        ) : (
          <RegisterForm onSwitch={() => setMode('login')} />
        )}
      </div>
    </div>
  );
}

// =============================================================================
// STYLES (Inline for simplicity - move to CSS in production)
// =============================================================================

const styles = `
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  padding: 20px;
}

.auth-container {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 40px;
  width: 100%;
  max-width: 420px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.auth-container.loading {
  text-align: center;
}

.spinner {
  font-size: 48px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.auth-logo {
  text-align: center;
  margin-bottom: 30px;
}

.logo-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 10px;
}

.logo-text {
  font-size: 24px;
  font-weight: 700;
  color: #fff;
}

.auth-form h2 {
  color: #fff;
  margin: 0 0 24px 0;
  font-size: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 8px;
  font-size: 14px;
}

.form-group input {
  width: 100%;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: #fff;
  font-size: 16px;
  transition: border-color 0.2s, background 0.2s;
  box-sizing: border-box;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
  background: rgba(255, 255, 255, 0.15);
}

.form-group input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.submit-btn {
  width: 100%;
  padding: 14px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.switch-text {
  text-align: center;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 20px;
  font-size: 14px;
}

.link-btn {
  background: none;
  border: none;
  color: #667eea;
  cursor: pointer;
  text-decoration: underline;
  font-size: 14px;
}

.link-btn:hover {
  color: #764ba2;
}

.error-message {
  background: rgba(255, 71, 87, 0.2);
  border: 1px solid rgba(255, 71, 87, 0.4);
  color: #ff6b7a;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 14px;
}

.demo-hint {
  margin-top: 20px;
  padding: 12px;
  background: rgba(102, 126, 234, 0.1);
  border-radius: 8px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  text-align: center;
}

.success-panel {
  text-align: center;
}

.success-panel h2 {
  color: #4caf50;
}

.api-key {
  display: block;
  background: rgba(0, 0, 0, 0.3);
  padding: 16px;
  border-radius: 8px;
  font-family: monospace;
  font-size: 12px;
  word-break: break-all;
  margin: 16px 0;
  color: #4caf50;
}

.copy-btn {
  background: rgba(76, 175, 80, 0.2);
  border: 1px solid #4caf50;
  color: #4caf50;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.copy-btn:hover {
  background: rgba(76, 175, 80, 0.3);
}

/* User Profile Styles */
.user-profile {
  color: #fff;
}

.profile-header {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.avatar {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 700;
}

.profile-header h3 {
  margin: 0 0 4px 0;
  font-size: 20px;
}

.profile-header p {
  margin: 0;
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
}

.tier {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  margin-top: 8px;
}

.tier-free {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
}

.tier-pro {
  background: rgba(102, 126, 234, 0.2);
  color: #667eea;
}

.tier-enterprise {
  background: rgba(255, 193, 7, 0.2);
  color: #ffc107;
}

.profile-section {
  margin-bottom: 24px;
}

.profile-section h4 {
  margin: 0 0 12px 0;
  font-size: 16px;
  color: rgba(255, 255, 255, 0.8);
}

.profile-section button {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: #fff;
  cursor: pointer;
  font-size: 14px;
  margin-right: 10px;
  margin-bottom: 10px;
}

.profile-section button:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
}

.profile-section button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.regenerate-btn {
  background: rgba(255, 152, 0, 0.2) !important;
  border-color: rgba(255, 152, 0, 0.4) !important;
  color: #ff9800 !important;
}

.key-display {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 10px;
}

.key-display code {
  flex: 1;
  background: rgba(0, 0, 0, 0.3);
  padding: 10px;
  border-radius: 6px;
  font-family: monospace;
  font-size: 12px;
  word-break: break-all;
}

.new-key-notice {
  background: rgba(76, 175, 80, 0.1);
  border: 1px solid rgba(76, 175, 80, 0.3);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.new-key-notice p {
  margin: 0 0 8px 0;
  color: #4caf50;
}

.new-key-notice code {
  display: block;
  background: rgba(0, 0, 0, 0.3);
  padding: 10px;
  border-radius: 6px;
  font-family: monospace;
  font-size: 11px;
  word-break: break-all;
  margin-bottom: 10px;
}

.logout-btn {
  width: 100%;
  padding: 12px;
  background: rgba(255, 71, 87, 0.2) !important;
  border: 1px solid rgba(255, 71, 87, 0.4) !important;
  color: #ff6b7a !important;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
}

.logout-btn:hover {
  background: rgba(255, 71, 87, 0.3) !important;
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

export default AuthPage;
