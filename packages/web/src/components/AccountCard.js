import React, { useEffect, useRef, useState } from 'react';
import { Check, PencilSimple, X } from '@phosphor-icons/react';

function AccountCard({ account, onUpdateName }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(account.name || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const formatCurrency = (amount) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: account.iso_currency_code || 'USD',
  }).format(Number(amount) || 0);

  const balance = Math.abs(Number(account.current_balance) || 0);
  const isLiability = ['credit', 'loan'].includes(account.type);

  const cancelEdit = () => {
    setIsEditing(false);
    setEditedName(account.name || '');
    setError('');
  };

  const handleSave = async () => {
    const trimmedName = editedName.trim();
    if (!trimmedName) {
      setError('Enter a name for this account.');
      return;
    }
    if (trimmedName === account.name) {
      cancelEdit();
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      await onUpdateName?.(account.id, trimmedName);
      setIsEditing(false);
    } catch (saveError) {
      console.error('Error updating account name:', saveError);
      setError('Could not save that name. Try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSave();
    }
    if (event.key === 'Escape') cancelEdit();
  };

  return (
    <div className="account-row">
      <div className="account-row-main">
        {isEditing ? (
          <div className="account-edit">
            <label className="sr-only" htmlFor={`account-name-${account.id}`}>Account name</label>
            <input
              id={`account-name-${account.id}`}
              ref={inputRef}
              value={editedName}
              onChange={(event) => setEditedName(event.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSaving}
              aria-invalid={Boolean(error)}
            />
            <button className="icon-button" onClick={handleSave} disabled={isSaving} aria-label="Save account name">
              <Check size={16} aria-hidden="true" />
            </button>
            <button className="icon-button" onClick={cancelEdit} disabled={isSaving} aria-label="Cancel editing">
              <X size={16} aria-hidden="true" />
            </button>
            {error && <span className="field-error" role="alert">{error}</span>}
          </div>
        ) : (
          <div className="account-title-line">
            <h3>{account.name || 'Unnamed account'}</h3>
            <button className="edit-account-button" onClick={() => setIsEditing(true)} aria-label={`Rename ${account.name || 'account'}`}>
              <PencilSimple size={14} aria-hidden="true" />
            </button>
          </div>
        )}
        {!isEditing && (
          <p>
            <span className="account-type-label">{account.subtype || account.type || 'Account'}</span>
            {account.mask && <span> ···· {account.mask}</span>}
          </p>
        )}
      </div>
      <div className="account-row-balance">
        <strong className={isLiability ? 'negative' : ''}>{formatCurrency(balance)}</strong>
        {account.available_balance != null && account.type === 'depository' && (
          <span>{formatCurrency(account.available_balance)} available</span>
        )}
        {account.credit_limit && <span>{formatCurrency(account.credit_limit)} limit</span>}
      </div>
    </div>
  );
}

export default AccountCard;
