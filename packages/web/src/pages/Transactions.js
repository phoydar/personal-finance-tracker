import React, { useState, useEffect, useCallback } from 'react';
import { format, subDays } from 'date-fns';
import api from '../api';

function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  
  // Filters
  const [search, setSearch] = useState('');
  const [accountId, setAccountId] = useState('');
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);

  const fetchTransactions = useCallback(async () => {
    try {
      const params = {
        limit: limit.toString(),
        offset: offset.toString(),
      };
      
      if (search) params.search = search;
      if (accountId) params.account_id = accountId;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const data = await api.getTransactions(params);
      
      setTransactions(data.transactions || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  }, [search, accountId, startDate, endDate, limit, offset]);

  const fetchAccounts = useCallback(async () => {
    try {
      const data = await api.getAccounts();
      setAccounts(data);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      fetchTransactions();
    }, 300); // Debounce search
    
    return () => clearTimeout(timer);
  }, [fetchTransactions]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await api.sync();
      alert(`Sync complete: ${result.added} added, ${result.modified} modified, ${result.removed} removed`);
      fetchTransactions();
    } catch (error) {
      console.error('Error syncing:', error);
    } finally {
      setSyncing(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Math.abs(amount));
  };

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div>
      <div className="page-header">
        <h1>Transactions</h1>
        <button 
          className="btn btn-primary" 
          onClick={handleSync}
          disabled={syncing}
        >
          {syncing ? 'Syncing...' : 'Sync Transactions'}
        </button>
      </div>

      {/* Filters */}
      <div className="filters">
        <input
          type="text"
          className="input"
          placeholder="Search transactions..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
          style={{ maxWidth: '250px' }}
        />
        <select
          className="input"
          value={accountId}
          onChange={(e) => { setAccountId(e.target.value); setOffset(0); }}
          style={{ maxWidth: '200px' }}
        >
          <option value="">All Accounts</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name} ({account.institution_name})
            </option>
          ))}
        </select>
        <input
          type="date"
          className="input"
          value={startDate}
          onChange={(e) => { setStartDate(e.target.value); setOffset(0); }}
          style={{ maxWidth: '160px' }}
        />
        <input
          type="date"
          className="input"
          value={endDate}
          onChange={(e) => { setEndDate(e.target.value); setOffset(0); }}
          style={{ maxWidth: '160px' }}
        />
      </div>

      {/* Transactions Table */}
      <div className="card">
        {loading ? (
          <div className="loading">Loading...</div>
        ) : transactions.length === 0 ? (
          <div className="empty-state">
            <h3>No transactions found</h3>
            <p>Try adjusting your filters or sync your transactions</p>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Account</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((txn) => (
                    <tr key={txn.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{txn.date}</td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{txn.merchant_name || txn.name}</div>
                        {txn.merchant_name && txn.name !== txn.merchant_name && (
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{txn.name}</div>
                        )}
                      </td>
                      <td>
                        {txn.pending ? (
                          <span className="pending-badge">Pending</span>
                        ) : (
                          <span className="category-badge">{txn.category || 'Uncategorized'}</span>
                        )}
                      </td>
                      <td>
                        <div style={{ fontSize: '13px' }}>{txn.account_name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{txn.institution_name}</div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className={`transaction-amount ${txn.amount < 0 ? 'income' : 'expense'}`}>
                          {txn.amount < 0 ? '+' : '-'}{formatCurrency(txn.amount)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', padding: '0 16px' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                  Showing {offset + 1}-{Math.min(offset + limit, total)} of {total} transactions
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => setOffset(Math.max(0, offset - limit))}
                    disabled={offset === 0}
                  >
                    Previous
                  </button>
                  <span style={{ padding: '8px 16px', color: 'var(--text-secondary)' }}>
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => setOffset(offset + limit)}
                    disabled={offset + limit >= total}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Transactions;
