import React, { useCallback, useEffect, useState } from 'react';
import { format, subDays } from 'date-fns';
import { ArrowsClockwise, MagnifyingGlass, Receipt } from '@phosphor-icons/react';
import api from '../api';

function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState(null);
  const [search, setSearch] = useState('');
  const [accountId, setAccountId] = useState('');
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const limit = 50;
  const [offset, setOffset] = useState(0);

  const fetchTransactions = useCallback(async () => {
    try {
      const params = { limit: limit.toString(), offset: offset.toString() };
      if (search) params.search = search;
      if (accountId) params.account_id = accountId;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      const data = await api.getTransactions(params);
      setTransactions(data.transactions || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setNotice({ type: 'error', text: 'Transactions could not be loaded. Try again shortly.' });
    } finally {
      setLoading(false);
    }
  }, [search, accountId, startDate, endDate, offset]);

  useEffect(() => {
    api.getAccounts()
      .then((data) => setAccounts(data || []))
      .catch((error) => console.error('Error fetching accounts:', error));
  }, []);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(fetchTransactions, 300);
    return () => clearTimeout(timer);
  }, [fetchTransactions]);

  const handleSync = async () => {
    setSyncing(true);
    setNotice(null);
    try {
      const result = await api.sync();
      await fetchTransactions();
      setNotice({
        type: 'success',
        text: `Sync complete: ${result.added || 0} added, ${result.modified || 0} updated, and ${result.removed || 0} removed.`,
      });
    } catch (error) {
      console.error('Error syncing:', error);
      setNotice({ type: 'error', text: 'Transactions could not be synced. Your existing history is unchanged.' });
    } finally {
      setSyncing(false);
    }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 2,
  }).format(Math.abs(Number(amount) || 0));

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Money movement</p>
          <h1>Transactions</h1>
          <p>Search and review activity across every linked account.</p>
        </div>
        <button className="btn btn-primary" onClick={handleSync} disabled={syncing}>
          <ArrowsClockwise size={17} className={syncing ? 'spin' : ''} aria-hidden="true" />
          {syncing ? 'Syncing…' : 'Sync transactions'}
        </button>
      </header>

      {notice && (
        <div className={`inline-notice inline-notice-${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>
          {notice.text}
        </div>
      )}

      <section className="transaction-filters" aria-label="Transaction filters">
        <label className="search-field">
          <span className="sr-only">Search transactions</span>
          <MagnifyingGlass size={17} aria-hidden="true" />
          <input
            type="search"
            placeholder="Search merchants or descriptions"
            value={search}
            onChange={(event) => { setSearch(event.target.value); setOffset(0); }}
          />
        </label>
        <label>
          <span className="sr-only">Filter by account</span>
          <select value={accountId} onChange={(event) => { setAccountId(event.target.value); setOffset(0); }}>
            <option value="">All accounts</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>{account.name} · {account.institution_name}</option>
            ))}
          </select>
        </label>
        <label className="date-filter">
          <span>From</span>
          <input type="date" value={startDate} onChange={(event) => { setStartDate(event.target.value); setOffset(0); }} />
        </label>
        <label className="date-filter">
          <span>To</span>
          <input type="date" value={endDate} onChange={(event) => { setEndDate(event.target.value); setOffset(0); }} />
        </label>
      </section>

      <section className="panel transaction-panel">
        <div className="panel-header transaction-panel-header">
          <div><h2>Activity</h2><span>{total.toLocaleString()} {total === 1 ? 'transaction' : 'transactions'}</span></div>
        </div>
        {loading ? (
          <div className="loading-state">Loading transactions…</div>
        ) : transactions.length === 0 ? (
          <div className="empty-state compact">
            <div className="empty-icon"><Receipt size={22} aria-hidden="true" /></div>
            <h3>No transactions found</h3>
            <p>Try a broader date range or clear one of your filters.</p>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table className="transaction-table">
                <thead><tr><th>Date</th><th>Merchant</th><th>Account</th><th>Amount</th></tr></thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td data-label="Date">{transaction.date}</td>
                      <td data-label="Merchant">
                        <strong>{transaction.merchant_name || transaction.name}</strong>
                        <span>
                          {transaction.category || 'Uncategorized'}
                          {transaction.pending && <span className="pending-badge">Pending</span>}
                        </span>
                      </td>
                      <td data-label="Account"><strong>{transaction.account_name}</strong><span>{transaction.institution_name}</span></td>
                      <td data-label="Amount">
                        <strong className={`transaction-amount ${transaction.amount < 0 ? 'income' : 'expense'}`}>
                          {transaction.amount < 0 ? '+' : '−'}{formatCurrency(transaction.amount)}
                        </strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <nav className="pagination" aria-label="Transaction pages">
                <span>Showing {offset + 1}–{Math.min(offset + limit, total)} of {total}</span>
                <div>
                  <button className="btn btn-sm btn-secondary" onClick={() => setOffset(Math.max(0, offset - limit))} disabled={offset === 0}>Previous</button>
                  <span>Page {currentPage} of {totalPages}</span>
                  <button className="btn btn-sm btn-secondary" onClick={() => setOffset(offset + limit)} disabled={offset + limit >= total}>Next</button>
                </div>
              </nav>
            )}
          </>
        )}
      </section>
    </div>
  );
}

export default Transactions;
