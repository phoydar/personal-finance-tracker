import React, { useState, useEffect, useCallback } from 'react';
import LinkAccount from '../components/LinkAccount';
import AccountCard from '../components/AccountCard';
import api from '../api';

function Accounts() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchItems = useCallback(async () => {
    try {
      const data = await api.getItems();
      setItems(data);
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await api.refreshBalances();
      await fetchItems();
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRemoveItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to remove this institution? All associated accounts and transactions will be deleted.')) {
      return;
    }
    
    try {
      await api.deleteItem(itemId);
      await fetchItems();
    } catch (error) {
      console.error('Error removing item:', error);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  // Group accounts by type
  const accountsByType = items.reduce((acc, item) => {
    (item.accounts || []).forEach(account => {
      const type = account.type || 'other';
      if (!acc[type]) acc[type] = [];
      acc[type].push({ ...account, institution_name: item.institution_name, item_id: item.id });
    });
    return acc;
  }, {});

  const typeLabels = {
    depository: 'Bank Accounts',
    credit: 'Credit Cards',
    loan: 'Loans',
    investment: 'Investments',
    brokerage: 'Brokerage',
    other: 'Other',
  };

  const typeOrder = ['depository', 'credit', 'investment', 'brokerage', 'loan', 'other'];

  return (
    <div>
      <div className="page-header">
        <h1>Accounts</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            className="btn btn-secondary" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing...' : 'Refresh Balances'}
          </button>
          <LinkAccount onSuccess={fetchItems} />
        </div>
      </div>

      {items.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <h3>No accounts linked</h3>
            <p>Click "Link Account" to connect your bank accounts, credit cards, and loans.</p>
          </div>
        </div>
      ) : (
        <>
          {/* Linked Institutions */}
          <div className="card" style={{ marginBottom: '32px' }}>
            <div className="card-header">
              <span className="card-title">Linked Institutions</span>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Institution</th>
                    <th>Accounts</th>
                    <th>Connected</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 500 }}>{item.institution_name || 'Unknown Institution'}</td>
                      <td>{item.accounts?.filter(a => a.id).length || 0} accounts</td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {new Date(item.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          className="btn btn-sm btn-danger"
                          onClick={() => handleRemoveItem(item.id)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Accounts by Type */}
          {typeOrder.map((type) => {
            const accounts = accountsByType[type];
            if (!accounts || accounts.length === 0) return null;

            const total = accounts.reduce((sum, acc) => sum + (acc.current_balance || 0), 0);

            return (
              <div key={type} style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 600 }}>{typeLabels[type] || type}</h2>
                  <span style={{ 
                    fontSize: '18px', 
                    fontWeight: 600, 
                    color: ['credit', 'loan'].includes(type) ? 'var(--accent-red)' : 'var(--accent-green)'
                  }}>
                    {formatCurrency(Math.abs(total))}
                  </span>
                </div>
                <div className="accounts-grid">
                  {accounts.map((account) => (
                    <AccountCard key={account.id} account={account} />
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

export default Accounts;
