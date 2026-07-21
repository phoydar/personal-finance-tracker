import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowsClockwise, Bank, Trash } from '@phosphor-icons/react';
import LinkAccount from '../components/LinkAccount';
import AccountCard from '../components/AccountCard';
import api from '../api';

const LIABILITY_TYPES = new Set(['credit', 'loan']);

function Accounts() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmingItemId, setConfirmingItemId] = useState(null);
  const [notice, setNotice] = useState(null);

  const fetchItems = useCallback(async () => {
    try {
      const data = await api.getItems();
      setItems(data);
    } catch (error) {
      console.error('Error fetching items:', error);
      setNotice({ type: 'error', text: 'We could not load your linked accounts. Try again in a moment.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const summary = useMemo(() => {
    return items.reduce((totals, item) => {
      (item.accounts || []).forEach((account) => {
        const balance = Math.abs(Number(account.current_balance) || 0);
        if (LIABILITY_TYPES.has(account.type)) totals.liabilities += balance;
        else totals.assets += balance;
      });
      return totals;
    }, { assets: 0, liabilities: 0 });
  }, [items]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setNotice(null);
    try {
      await api.refreshBalances();
      await fetchItems();
      setNotice({ type: 'success', text: 'Balances are up to date.' });
    } catch (error) {
      console.error('Error refreshing:', error);
      setNotice({ type: 'error', text: 'Balances could not be refreshed. Your existing data is still available.' });
    } finally {
      setRefreshing(false);
    }
  };

  const handleRemoveItem = async (itemId) => {
    setNotice(null);
    try {
      await api.deleteItem(itemId);
      setConfirmingItemId(null);
      await fetchItems();
      setNotice({ type: 'success', text: 'The institution and its imported data were removed.' });
    } catch (error) {
      console.error('Error removing item:', error);
      setNotice({ type: 'error', text: 'We could not remove that institution. Please try again.' });
    }
  };

  const handleUpdateAccountName = async (accountId, newName) => {
    await api.updateAccountName(accountId, newName);
    setItems((previousItems) => previousItems.map((item) => ({
      ...item,
      accounts: item.accounts?.map((account) => (
        account.id === accountId ? { ...account, name: newName } : account
      )),
    })));
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount || 0);

  if (loading) {
    return <div className="loading-state">Loading accounts…</div>;
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Your money</p>
          <h1>Accounts</h1>
          <p>Everything you own and owe, organized by institution.</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={handleRefresh} disabled={refreshing}>
            <ArrowsClockwise size={17} className={refreshing ? 'spin' : ''} aria-hidden="true" />
            {refreshing ? 'Refreshing…' : 'Refresh balances'}
          </button>
          <LinkAccount onSuccess={fetchItems} />
        </div>
      </header>

      {notice && (
        <div className={`inline-notice inline-notice-${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>
          {notice.text}
        </div>
      )}

      {items.length === 0 ? (
        <section className="panel empty-state">
          <div className="empty-icon"><Bank size={24} aria-hidden="true" /></div>
          <h2>No accounts linked yet</h2>
          <p>Connect a bank, credit card, loan, or investment account to see your full financial picture.</p>
          <LinkAccount onSuccess={fetchItems} />
        </section>
      ) : (
        <>
          <section className="account-summary" aria-label="Account totals">
            <div className="summary-cell">
              <span>Assets</span>
              <strong>{formatCurrency(summary.assets)}</strong>
            </div>
            <div className="summary-cell">
              <span>Liabilities</span>
              <strong>{formatCurrency(summary.liabilities)}</strong>
            </div>
            <div className="summary-cell summary-cell-emphasis">
              <span>Net worth</span>
              <strong>{formatCurrency(summary.assets - summary.liabilities)}</strong>
            </div>
          </section>

          <div className="institution-list">
            {items.map((item) => {
              const accounts = (item.accounts || []).filter((account) => account.id);
              const institutionTotal = accounts.reduce((sum, account) => {
                const balance = Math.abs(Number(account.current_balance) || 0);
                return sum + (LIABILITY_TYPES.has(account.type) ? -balance : balance);
              }, 0);
              const institutionName = item.institution_name || 'Linked institution';

              return (
                <section className="panel institution-panel" key={item.id}>
                  <div className="institution-header">
                    <div className="institution-identity">
                      <span className="institution-mark" aria-hidden="true">{institutionName.charAt(0).toUpperCase()}</span>
                      <div>
                        <h2>{institutionName}</h2>
                        <p>{accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}</p>
                      </div>
                    </div>
                    <div className="institution-total">
                      <strong>{formatCurrency(institutionTotal)}</strong>
                      <button
                        className="icon-button icon-button-danger"
                        onClick={() => setConfirmingItemId(item.id)}
                        aria-label={`Remove ${institutionName}`}
                        title={`Remove ${institutionName}`}
                      >
                        <Trash size={17} aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {confirmingItemId === item.id && (
                    <div className="confirm-strip" role="alert">
                      <p><strong>Remove {institutionName}?</strong> Its accounts and imported transactions will be deleted.</p>
                      <div>
                        <button className="btn btn-quiet btn-sm" onClick={() => setConfirmingItemId(null)}>Cancel</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleRemoveItem(item.id)}>Remove institution</button>
                      </div>
                    </div>
                  )}

                  <div className="account-rows">
                    {accounts.map((account) => (
                      <AccountCard
                        key={account.id}
                        account={account}
                        onUpdateName={handleUpdateAccountName}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default Accounts;
