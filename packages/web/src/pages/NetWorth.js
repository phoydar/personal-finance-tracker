import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Camera, TrendDown, TrendUp } from '@phosphor-icons/react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api from '../api';

function NetWorth() {
  const [netWorth, setNetWorth] = useState({ total_assets: 0, total_liabilities: 0, net_worth: 0 });
  const [history, setHistory] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snapshotSaving, setSnapshotSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [netWorthData, historyData, accountsData] = await Promise.all([
        api.getNetWorth(), api.getNetWorthHistory(365), api.getAccounts(),
      ]);
      setNetWorth(netWorthData);
      setHistory(historyData || []);
      setAccounts(accountsData || []);
    } catch (error) {
      console.error('Error fetching net worth data:', error);
      setNotice({ type: 'error', text: 'Your net worth data could not be loaded.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSaveSnapshot = async () => {
    setSnapshotSaving(true);
    setNotice(null);
    try {
      await api.saveNetWorthSnapshot();
      await fetchData();
      setNotice({ type: 'success', text: 'Today’s net worth snapshot was saved.' });
    } catch (error) {
      console.error('Error saving snapshot:', error);
      setNotice({ type: 'error', text: 'The snapshot could not be saved. Please try again.' });
    } finally {
      setSnapshotSaving(false);
    }
  };

  const currency = (amount, digits = 0) => new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: digits, maximumFractionDigits: digits,
  }).format(Number(amount) || 0);

  const assets = accounts.filter((account) => ['depository', 'investment', 'brokerage'].includes(account.type));
  const liabilities = accounts.filter((account) => ['credit', 'loan'].includes(account.type));
  const chartData = useMemo(() => [...history]
    .sort((a, b) => new Date(a.snapshot_date) - new Date(b.snapshot_date))
    .map((entry) => ({
      date: new Date(entry.snapshot_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      fullDate: new Date(entry.snapshot_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      netWorth: Number(entry.net_worth),
      assets: Number(entry.total_assets),
      liabilities: Number(entry.total_liabilities),
    })), [history]);

  if (loading) return <div className="page-skeleton" aria-label="Loading net worth"><span /><span /><span /></div>;

  const firstValue = chartData[0]?.netWorth;
  const latestValue = chartData[chartData.length - 1]?.netWorth;
  const change = firstValue != null && latestValue != null ? latestValue - firstValue : null;

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Financial position</p>
          <h1>Net worth</h1>
          <p>Track the relationship between what you own and what you owe.</p>
        </div>
        <button className="btn btn-primary" onClick={handleSaveSnapshot} disabled={snapshotSaving}>
          <Camera size={17} aria-hidden="true" />
          {snapshotSaving ? 'Saving…' : 'Save snapshot'}
        </button>
      </header>

      {notice && <div className={`inline-notice inline-notice-${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>{notice.text}</div>}

      <section className="panel networth-history-panel" aria-labelledby="networth-history-heading">
        <div className="networth-focal">
          <span>Current net worth</span>
          <strong>{currency(netWorth.net_worth)}</strong>
          {change == null ? (
            <p>Save snapshots to measure your progress.</p>
          ) : (
            <p className={change >= 0 ? 'positive' : 'negative'}>
              {change >= 0 ? <TrendUp size={16} aria-hidden="true" /> : <TrendDown size={16} aria-hidden="true" />}
              {change >= 0 ? '+' : '−'}{currency(Math.abs(change))} in this period
            </p>
          )}
        </div>
        <div className="chart-title-row">
          <div><h2 id="networth-history-heading">Your financial position</h2><p>Assets, liabilities, and net worth over time</p></div>
        </div>
        {chartData.length < 2 ? (
          <div className="chart-empty">Save at least two snapshots to build your net worth chart.</div>
        ) : (
          <div className="large-chart" role="img" aria-label="Net worth, asset, and liability history">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 12, right: 16, left: 4, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} width={72} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={(value) => currency(value)} />
                <Tooltip labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate} formatter={(value, name) => [currency(value), name]} contentStyle={{ borderColor: 'var(--border)', borderRadius: 8, fontSize: 12 }} />
                <Legend iconType="plainline" wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
                <Line type="monotone" dataKey="netWorth" name="Net worth" stroke="var(--chart-1)" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="assets" name="Assets" stroke="var(--chart-2)" strokeWidth={1.75} dot={false} />
                <Line type="monotone" dataKey="liabilities" name="Liabilities" stroke="var(--negative)" strokeWidth={1.75} strokeDasharray="5 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <div className="balance-breakdown-grid">
        <BalancePanel title="Assets" total={netWorth.total_assets} accounts={assets} tone="positive" currency={currency} />
        <BalancePanel title="Liabilities" total={netWorth.total_liabilities} accounts={liabilities} tone="negative" currency={currency} />
      </div>

      {chartData.length > 0 && (
        <section className="panel snapshot-panel">
          <div className="panel-header"><div><h2>Snapshot history</h2><span>Your most recent saved positions</span></div></div>
          <div className="table-container">
            <table className="snapshot-table">
              <thead><tr><th>Date</th><th>Assets</th><th>Liabilities</th><th>Net worth</th></tr></thead>
              <tbody>
                {[...chartData].reverse().slice(0, 12).map((entry) => (
                  <tr key={entry.fullDate}><td>{entry.fullDate}</td><td>{currency(entry.assets)}</td><td>{currency(entry.liabilities)}</td><td><strong>{currency(entry.netWorth)}</strong></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function BalancePanel({ title, total, accounts, tone, currency }) {
  return (
    <section className="panel balance-panel">
      <div className="panel-header">
        <div><h2>{title}</h2><span>{accounts.length} linked {accounts.length === 1 ? 'account' : 'accounts'}</span></div>
        <strong className={tone}>{currency(Math.abs(total))}</strong>
      </div>
      {accounts.length === 0 ? <div className="empty-state compact"><p>No {title.toLowerCase()} linked.</p></div> : (
        <ul className="balance-list">
          {accounts.map((account) => (
            <li key={account.id}>
              <div><strong>{account.name}</strong><span>{account.institution_name} · {account.subtype || account.type}</span></div>
              <strong>{currency(Math.abs(account.current_balance), 2)}</strong>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default NetWorth;
