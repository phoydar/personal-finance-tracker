import React, { useState, useRef, useEffect } from 'react';

function AccountCard({ account, onUpdateName }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(account.name || '');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const formatCurrency = (amount) => {
    if (amount == null) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: account.iso_currency_code || 'USD',
    }).format(amount);
  };

  const isPositive = account.current_balance >= 0 && 
    !['credit', 'loan'].includes(account.type);

  const handleNameClick = () => {
    setEditedName(account.name || '');
    setIsEditing(true);
  };

  const handleSave = async () => {
    const trimmedName = editedName.trim();
    if (!trimmedName || trimmedName === account.name) {
      setIsEditing(false);
      setEditedName(account.name || '');
      return;
    }

    setIsSaving(true);
    try {
      if (onUpdateName) {
        await onUpdateName(account.id, trimmedName);
      }
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating account name:', error);
      setEditedName(account.name || '');
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditedName(account.name || '');
    }
  };

  const handleBlur = () => {
    handleSave();
  };

  return (
    <div className="account-card">
      <div className="account-card-header">
        <div>
          <div className="account-name">
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                disabled={isSaving}
                className="account-name-input"
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--accent-primary)',
                  borderRadius: '4px',
                  color: 'var(--text-primary)',
                  fontSize: 'inherit',
                  fontWeight: 'inherit',
                  padding: '2px 6px',
                  width: '100%',
                  maxWidth: '200px',
                  outline: 'none',
                }}
              />
            ) : (
              <span 
                onClick={handleNameClick}
                style={{ 
                  cursor: 'pointer',
                  borderBottom: '1px dashed transparent',
                  transition: 'border-color 0.2s',
                }}
                onMouseEnter={(e) => e.target.style.borderBottomColor = 'var(--text-muted)'}
                onMouseLeave={(e) => e.target.style.borderBottomColor = 'transparent'}
                title="Click to edit name"
              >
                {account.name}
              </span>
            )}
            {account.mask && !isEditing && (
              <span style={{ color: 'var(--text-muted)' }}> ••{account.mask}</span>
            )}
          </div>
          <div className="account-institution">{account.institution_name}</div>
        </div>
        <span className="account-type">{account.subtype || account.type}</span>
      </div>
      <div className={`account-balance ${isPositive ? 'positive' : 'negative'}`}>
        {formatCurrency(Math.abs(account.current_balance))}
      </div>
      {account.available_balance != null && account.type === 'depository' && (
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px' }}>
          Available: {formatCurrency(account.available_balance)}
        </div>
      )}
      {account.credit_limit && (
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px' }}>
          Credit Limit: {formatCurrency(account.credit_limit)}
        </div>
      )}
    </div>
  );
}

export default AccountCard;
