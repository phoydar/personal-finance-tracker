import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';

function Login() {
  const { login } = useAuth();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

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

  const handleGoogleError = () => {
    setError('Google sign-in was unsuccessful. Please try again.');
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <h1>Finance<span>Tracker</span></h1>
          <p>Your personal finance dashboard</p>
        </div>

        <div className="login-divider" />

        <div className="login-content">
          <h2>Sign in to continue</h2>
          <p>Use your Google account to securely access your financial data.</p>

          <div className="login-button-wrapper">
            {loading ? (
              <div className="login-loading">Signing in...</div>
            ) : (
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                theme="filled_black"
                size="large"
                width="300"
                text="signin_with"
                shape="rectangular"
              />
            )}
          </div>

          {error && <div className="login-error">{error}</div>}
        </div>
      </div>
    </div>
  );
}

export default Login;
