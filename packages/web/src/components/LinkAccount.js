import React, { useState, useCallback, useEffect, useRef } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import api from '../api';

// Check if we're returning from OAuth redirect
const isOAuthRedirect = window.location.href.includes('oauth_state_id=');

// Component that handles Plaid Link - only mounts when we have a token AND want to open
function PlaidLinkHandler({ linkToken, onSuccess, onExit, isOAuth, shouldOpen }) {
  const hasOpened = useRef(false);
  
  const handleSuccess = useCallback(async (publicToken, metadata) => {
    try {
      console.log('Plaid Link success - publicToken:', publicToken);
      console.log('Plaid Link success - metadata:', metadata);
      const payload = {
        public_token: publicToken,
        institution: metadata.institution,
      };
      console.log('Sending exchange request with payload:', payload);
      await api.exchangePublicToken(payload);
      
      // Trigger initial sync
      await api.sync();
      
      // Clear OAuth state from URL and localStorage
      localStorage.removeItem('link_token');
      if (isOAuth) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error exchanging token:', error);
    }
  }, [onSuccess, isOAuth]);

  const handleExit = useCallback((err, metadata) => {
    // Clear OAuth state from URL on exit too
    if (isOAuth) {
      window.history.replaceState({}, document.title, window.location.pathname);
      localStorage.removeItem('link_token');
    }
    
    if (onExit) {
      onExit();
    }
    
    // Log the error for debugging
    if (err) {
      console.error('Plaid Link error:', err);
      console.error('Error metadata:', metadata);
      
      // Show user-friendly message
      if (err.error_code === 'INSTITUTION_NOT_RESPONDING') {
        alert('The institution is not responding. Please try again later.');
      } else if (err.error_code === 'INSTITUTION_DOWN') {
        alert('This institution is temporarily unavailable. Please try again later.');
      } else if (err.error_message) {
        alert(`Error: ${err.error_message}`);
      }
    }
  }, [isOAuth, onExit]);

  const config = {
    token: linkToken,
    onSuccess: handleSuccess,
    onExit: handleExit,
  };
  
  // For OAuth, pass the received redirect URI
  if (isOAuth) {
    config.receivedRedirectUri = window.location.href;
  }

  const { open, ready } = usePlaidLink(config);
  
  // Open when ready (only once)
  useEffect(() => {
    if (ready && shouldOpen && !hasOpened.current) {
      hasOpened.current = true;
      open();
    }
  }, [ready, shouldOpen, open]);

  return null; // This component doesn't render anything
}

function LinkAccount({ onSuccess }) {
  const [linkToken, setLinkToken] = useState(null);
  const [isLinking, setIsLinking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // On OAuth redirect, automatically start linking
  useEffect(() => {
    if (isOAuthRedirect) {
      const storedToken = localStorage.getItem('link_token');
      if (storedToken) {
        setLinkToken(storedToken);
        setIsLinking(true);
      }
    }
  }, []);

  const handleClick = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Check for cached token first
      const cachedToken = localStorage.getItem('link_token');
      if (cachedToken) {
        setLinkToken(cachedToken);
        setIsLinking(true);
        setLoading(false);
        return;
      }
      
      const data = await api.createLinkToken();
      console.log('Link token data:', data);
      
      if (data.error) {
        console.error('Link token error:', data);
        setError(data.error);
        setLoading(false);
        return;
      }
      
      // Store the link token for OAuth redirect
      localStorage.setItem('link_token', data.link_token);
      setLinkToken(data.link_token);
      setIsLinking(true);
    } catch (err) {
      console.error('Error creating link token:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkExit = () => {
    setIsLinking(false);
    setLinkToken(null);
  };

  const handleLinkSuccess = () => {
    setIsLinking(false);
    setLinkToken(null);
    if (onSuccess) {
      onSuccess();
    }
  };

  return (
    <>
      <button 
        className="btn btn-primary" 
        onClick={handleClick} 
        disabled={loading || isLinking}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        {loading ? 'Loading...' : 'Link Account'}
      </button>
      
      {error && (
        <span style={{ color: 'var(--accent-red)', marginLeft: '12px', fontSize: '14px' }}>
          {error}
        </span>
      )}
      
      {/* Only mount Plaid Link when we're actively linking */}
      {isLinking && linkToken && (
        <PlaidLinkHandler
          linkToken={linkToken}
          onSuccess={handleLinkSuccess}
          onExit={handleLinkExit}
          isOAuth={isOAuthRedirect}
          shouldOpen={true}
        />
      )}
    </>
  );
}

export default LinkAccount;
