import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { LockKey } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext';

function Login() {
  const { login } = useAuth();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const googleClientIdConfigured = Boolean(process.env.REACT_APP_GOOGLE_CLIENT_ID?.trim());

  const handleGoogleSuccess = async (credentialResponse) => {
    setError(null);
    setLoading(true);
    try {
      await login(credentialResponse.credential);
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-context" aria-hidden="true">
        <div className="login-brand"><span className="brand-mark">L</span><span>Ledger</span></div>
        <div className="login-preview-wrap">
          <p>A calm, private place to see where you stand.</p>
          <div className="login-preview-card">
            <span className="metric-label">Net worth</span>
            <strong className="login-preview-value">$379,175</strong>
            <span className="positive-delta">▲ +$4,210 (+1.1%) this month</span>
            <div className="preview-divider" />
            <dl>
              <div><dt>Assets</dt><dd>$692,821</dd></div>
              <div><dt>Liabilities</dt><dd>−$313,645</dd></div>
            </dl>
          </div>
        </div>
        <p className="login-privacy">Your data stays private. Read-only bank connections via Plaid.</p>
      </section>

      <section className="login-auth">
        <div className="login-card">
          <span className="mobile-login-brand"><span className="brand-mark">L</span> Ledger</span>
          <h1>Welcome back</h1>
          <p>Sign in to review your finances.</p>

          <div className="login-button-wrapper">
            {!googleClientIdConfigured ? (
              <div className="inline-notice error" role="alert">Google sign-in is not configured for this deployment.</div>
            ) : loading ? (
              <div className="login-loading" role="status">Signing in…</div>
            ) : (
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Google sign-in was unsuccessful. Please try again.')}
                theme="outline"
                size="large"
                width="360"
                text="continue_with"
                shape="rectangular"
              />
            )}
          </div>

          {error && googleClientIdConfigured && <div className="inline-notice error" role="alert">{error}</div>}
          <div className="login-security"><LockKey size={15} aria-hidden="true" /> Private and encrypted. Only you can access this account.</div>
        </div>
      </section>
    </main>
  );
}

export default Login;
