import React, { useState, useCallback, useEffect, useRef } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { Plus, SpinnerGap } from '@phosphor-icons/react';
import api from '../api';

// Check if we're returning from OAuth redirect
const isOAuthRedirect = window.location.href.includes('oauth_state_id=');

// Component that handles Plaid Link - only mounts when we have a token AND want to open
function PlaidLinkHandler({ linkToken, onSuccess, onExit, isOAuth, shouldOpen }) {
  const hasOpened = useRef(false);
  
  const handleSuccess = useCallback(async (publicToken, metadata) => {
    try {
      const payload = {
        public_token: publicToken,
        institution: metadata.institution,
      };
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
    
    let userMessage = '';
    if (err) {
      console.error('Plaid Link error:', err);
      console.error('Error metadata:', metadata);

      if (err.error_code === 'INSTITUTION_NOT_RESPONDING') {
        userMessage = 'The institution is not responding. Please try again later.';
      } else if (err.error_code === 'INSTITUTION_DOWN') {
        userMessage = 'This institution is temporarily unavailable. Please try again later.';
      } else if (err.error_message) {
        userMessage = err.error_message;
      }
    }

    if (onExit) onExit(userMessage);
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

  const handleLinkExit = (message = '') => {
    setIsLinking(false);
    setLinkToken(null);
    if (message) setError(message);
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
        {loading ? <SpinnerGap size={16} className="spin" aria-hidden="true" /> : <Plus size={16} weight="bold" aria-hidden="true" />}
        {loading ? 'Preparing…' : 'Link account'}
      </button>
      
      {error && (
        <span className="inline-error" role="alert">
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
