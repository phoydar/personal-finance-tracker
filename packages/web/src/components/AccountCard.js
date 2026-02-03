import React from 'react';

function AccountCard({ account, onDelete }) {
  const formatCurrency = (amount) => {
    if (amount == null) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: account.iso_currency_code || 'USD',
    }).format(amount);
  };

  const isPositive = account.current_balance >= 0 && 
    !['credit', 'loan'].includes(account.type);

  return (
    <div className="account-card">
      <div className="account-card-header">
        <div>
          <div className="account-name">
            {account.name}
            {account.mask && <span style={{ color: 'var(--text-muted)' }}> ••{account.mask}</span>}
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
