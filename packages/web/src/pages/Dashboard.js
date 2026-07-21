import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowsClockwise, ArrowUp, Info, Warning } from '@phosphor-icons/react';
import { LineChart, Line, XAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import LinkAccount from '../components/LinkAccount';
import api from '../api';

const CATEGORY_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-6)',
  'var(--text-muted)',
];

function Dashboard() {
  const [netWorth, setNetWorth] = useState({ total_assets: 0, total_liabilities: 0, net_worth: 0 });
  const [history, setHistory] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [spending, setSpending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [networthData, historyData, accountsData, transactionsData, spendingData] = await Promise.all([
        api.getNetWorth(),
        api.getNetWorthHistory(365),
        api.getAccounts(),
        api.getTransactions({ limit: 5 }),
        api.getSpendingByCategory(),
      ]);
      setNetWorth(networthData);
      setHistory(historyData || []);
      setAccounts(accountsData || []);
      setTransactions(transactionsData.transactions || []);
      setSpending((spendingData || []).slice(0, 6));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setNotice({ type: 'error', message: 'Some financial data could not be loaded. Try syncing again.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSync = async () => {
    setSyncing(true);
    setNotice(null);
    try {
      await api.refreshBalances();
      await api.sync();
      await fetchData();
      setNotice({ type: 'success', message: 'Balances and transactions are up to date.' });
    } catch (error) {
      console.error('Error syncing:', error);
      setNotice({ type: 'error', message: 'Sync failed. Please try again shortly.' });
    } finally {
      setSyncing(false);
    }
  };

  const currency = (amount, digits = 0) => new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: digits, maximumFractionDigits: digits,
  }).format(amount || 0);

  if (loading) return <div className="page-skeleton" aria-label="Loading overview"><span /><span /><span /></div>;

  const historyData = [...history]
    .sort((a, b) => new Date(a.snapshot_date) - new Date(b.snapshot_date))
    .map((entry) => ({
      date: new Date(entry.snapshot_date).toLocaleDateString('en-US', { month: 'short' }),
      value: Number(entry.net_worth),
    }));
  const firstValue = historyData[0]?.value;
  const latestValue = historyData[historyData.length - 1]?.value;
  const change = firstValue != null && latestValue != null ? latestValue - firstValue : null;
  const changePercent = change != null && firstValue ? (change / Math.abs(firstValue)) * 100 : null;
  const maxSpending = Math.max(...spending.map((item) => Number(item.total) || 0), 1);
  const spendingTotal = spending.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  const pendingCount = transactions.filter((transaction) => transaction.pending).length;

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Overview</h1>
          <p>Where you stand and what changed</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={handleSync} disabled={syncing}>
            <ArrowsClockwise size={16} className={syncing ? 'spin' : ''} aria-hidden="true" />
            {syncing ? 'Syncing…' : 'Sync data'}
          </button>
          <LinkAccount onSuccess={fetchData} />
        </div>
      </header>

      {notice && <div className={`inline-notice ${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>{notice.message}</div>}

      <section className="position-panel" aria-labelledby="position-title">
        <h2 id="position-title" className="sr-only">Where you stand</h2>
        <div className="position-summary">
          <span className="metric-label">Net worth</span>
          <strong className="display-value">{currency(netWorth.net_worth)}</strong>
          {change == null ? (
            <span className="metric-helper">Save another snapshot to track change.</span>
          ) : (
            <span className={`delta-pill ${change >= 0 ? 'positive' : 'negative'}`}>
              <ArrowUp size={13} weight="bold" className={change < 0 ? 'rotate-down' : ''} aria-hidden="true" />
              {change >= 0 ? '+' : '−'}{currency(Math.abs(change))} ({changePercent == null ? 'n/a' : `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(1)}%`})
              <span>since {historyData[0]?.date}</span>
            </span>
          )}
          <div className="position-divider" />
          <dl className="position-details">
            <div><dt>Assets</dt><dd>{currency(netWorth.total_assets)}</dd></div>
            <div><dt>Liabilities</dt><dd>−{currency(Math.abs(netWorth.total_liabilities))}</dd></div>
            <div><dt>Accounts</dt><dd>{accounts.length} linked</dd></div>
          </dl>
        </div>

        <div className="position-chart" role="img" aria-label="Net worth history over the last twelve months">
          <div className="chart-heading"><span>Last 12 months</span><span>{historyData.length ? `${currency(Math.min(...historyData.map((item) => item.value)))} – ${currency(Math.max(...historyData.map((item) => item.value)))}` : 'No history yet'}</span></div>
          {historyData.length >= 2 ? (
            <ResponsiveContainer width="100%" height={165}>
              <LineChart data={historyData} margin={{ top: 12, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <Tooltip formatter={(value) => currency(value)} contentStyle={{ borderColor: 'var(--border)', borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="value" stroke="var(--chart-1)" strokeWidth={2.25} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <div className="chart-empty">Save snapshots to build your trend.</div>}
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="panel recent-activity" aria-labelledby="recent-heading">
          <div className="panel-header"><h2 id="recent-heading">Recent activity</h2><Link to="/transactions">View all</Link></div>
          {transactions.length === 0 ? (
            <div className="empty-state compact"><h3>No activity yet</h3><p>Link an account to see recent transactions.</p></div>
          ) : (
            <ul className="activity-list">
              {transactions.map((transaction) => (
                <li key={transaction.id}>
                  <span className="activity-monogram" aria-hidden="true">{(transaction.merchant_name || transaction.name || '?').charAt(0).toUpperCase()}</span>
                  <div className="activity-copy">
                    <strong>{transaction.merchant_name || transaction.name}</strong>
                    <span>{transaction.category || 'Uncategorized'} · {transaction.account_name}</span>
                  </div>
                  {transaction.pending && <span className="pending-badge">Pending</span>}
                  <span className={`transaction-amount ${transaction.amount < 0 ? 'income' : ''}`}>
                    {transaction.amount < 0 ? '+' : '−'}{currency(Math.abs(transaction.amount), 2)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="dashboard-side">
          <section className="panel spending-panel" aria-labelledby="spending-heading">
            <div className="panel-header"><h2 id="spending-heading">Spending this month</h2><strong>{currency(spendingTotal)}</strong></div>
            {spending.length === 0 ? <div className="empty-state compact"><p>Sync transactions to see spending.</p></div> : (
              <ul className="spending-list">
                {spending.map((category, index) => (
                  <li key={category.category || index}>
                    <div><span>{category.category || 'Other'}</span><strong>{currency(category.total)}</strong></div>
                    <span className="spending-track" aria-hidden="true"><span style={{ width: `${Math.max(5, (Number(category.total) / maxSpending) * 100)}%`, background: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }} /></span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="panel attention-panel" aria-labelledby="attention-heading">
            <h2 id="attention-heading">Worth a look</h2>
            <ul>
              <li><Warning size={16} weight="fill" aria-hidden="true" /><div><strong>{pendingCount} transaction{pendingCount === 1 ? '' : 's'} pending</strong><span>These charges have not cleared yet.</span></div></li>
              <li><Info size={16} weight="fill" aria-hidden="true" /><div><strong>{spending[0]?.category || 'Spending'} is your largest category</strong><span>{spending[0] ? `${currency(spending[0].total)} posted in this period.` : 'More detail appears after your next sync.'}</span></div></li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
