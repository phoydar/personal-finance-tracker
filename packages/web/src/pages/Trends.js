import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarBlank } from '@phosphor-icons/react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api from '../api';

const TIME_PERIODS = [
  { label: '1M', days: 30 }, { label: '3M', days: 90 }, { label: '6M', days: 180 },
  { label: 'YTD', ytd: true }, { label: '1Y', days: 365 }, { label: 'All' },
];
const ACCOUNT_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)'];
const ASSET_TYPES = new Set(['depository', 'investment', 'brokerage']);

function Trends() {
  const [composition, setComposition] = useState({ data: [], changes: {} });
  const [accountTrends, setAccountTrends] = useState({ data: [], accounts: [] });
  const [selectedPeriod, setSelectedPeriod] = useState('3M');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [customRange, setCustomRange] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const dateParams = useMemo(() => {
    if (customRange && dateRange.start && dateRange.end) return { start_date: dateRange.start, end_date: dateRange.end };
    const period = TIME_PERIODS.find((option) => option.label === selectedPeriod);
    if (period?.ytd) {
      const now = new Date();
      return { start_date: `${now.getFullYear()}-01-01`, end_date: now.toISOString().split('T')[0] };
    }
    return period?.days ? { days: period.days } : {};
  }, [customRange, dateRange, selectedPeriod]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const accountParams = selectedAccount === 'all' ? dateParams : { ...dateParams, account_id: selectedAccount };
      const [compositionData, accountData] = await Promise.all([
        api.getTrendsComposition(dateParams), api.getAccountTrends(accountParams),
      ]);
      setComposition(compositionData || { data: [], changes: {} });
      setAccountTrends(accountData || { data: [], accounts: [] });
    } catch (fetchError) {
      console.error('Error fetching trends data:', fetchError);
      setError('Trend data could not be loaded. Try a different range or refresh the page.');
    } finally {
      setLoading(false);
    }
  }, [dateParams, selectedAccount]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const currency = (amount, digits = 0) => new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: digits, maximumFractionDigits: digits,
  }).format(Number(amount) || 0);
  const percent = (value) => `${Number(value) >= 0 ? '+' : ''}${Number(value || 0).toFixed(1)}%`;

  const compositionData = (composition.data || []).map((entry) => ({
    date: new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    assets: Number(entry.assets), liabilities: Number(entry.liabilities), netWorth: Number(entry.net_worth),
  }));
  const accountData = (accountTrends.data || []).map((entry) => {
    const point = { date: new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) };
    (accountTrends.accounts || []).forEach((account) => { if (entry[account.id] !== undefined) point[account.id] = Number(entry[account.id]); });
    return point;
  });
  const assets = (accountTrends.accounts || []).filter((account) => ASSET_TYPES.has(account.type));
  const liabilities = (accountTrends.accounts || []).filter((account) => !ASSET_TYPES.has(account.type));
  const changes = composition.changes || {};

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Patterns over time</p>
          <h1>Trends</h1>
          <p>See how your balance sheet and individual accounts are changing.</p>
        </div>
        <div className="segmented-control" aria-label="Trend timeframe">
          {TIME_PERIODS.map((period) => (
            <button
              key={period.label}
              className={selectedPeriod === period.label && !customRange ? 'active' : ''}
              onClick={() => { setSelectedPeriod(period.label); setCustomRange(false); }}
              aria-pressed={selectedPeriod === period.label && !customRange}
            >{period.label}</button>
          ))}
        </div>
      </header>

      <section className="trend-controls" aria-label="Custom trend range">
        <div className="trend-date-label"><CalendarBlank size={17} aria-hidden="true" /><span>Custom range</span></div>
        <label><span className="sr-only">Start date</span><input type="date" value={dateRange.start} onChange={(event) => setDateRange((range) => ({ ...range, start: event.target.value }))} /></label>
        <span aria-hidden="true">to</span>
        <label><span className="sr-only">End date</span><input type="date" value={dateRange.end} onChange={(event) => setDateRange((range) => ({ ...range, end: event.target.value }))} /></label>
        <button className="btn btn-sm btn-secondary" disabled={!dateRange.start || !dateRange.end} onClick={() => setCustomRange(true)}>Apply range</button>
      </section>

      {error && <div className="inline-notice inline-notice-error" role="alert">{error}</div>}

      <section className="trend-summary" aria-label="Period changes">
        <div><span>Asset change</span><strong className={Number(changes.asset_change) >= 0 ? 'positive' : 'negative'}>{Number(changes.asset_change) >= 0 ? '+' : '−'}{currency(Math.abs(changes.asset_change || 0))}</strong><small>{percent(changes.asset_change_percent)} this period</small></div>
        <div><span>Liability change</span><strong className={Number(changes.liability_change) <= 0 ? 'positive' : 'negative'}>{Number(changes.liability_change) >= 0 ? '+' : '−'}{currency(Math.abs(changes.liability_change || 0))}</strong><small>{percent(changes.liability_change_percent)} this period</small></div>
      </section>

      <section className="panel trend-panel">
        <div className="panel-header"><div><h2>Financial composition</h2><span>Assets, liabilities, and net worth</span></div></div>
        {loading ? <div className="loading-state">Loading trends…</div> : compositionData.length < 2 ? (
          <div className="chart-empty">Save more net worth snapshots to see your financial trend.</div>
        ) : (
          <div className="large-chart" role="img" aria-label="Financial composition trend">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={compositionData} margin={{ top: 12, right: 16, left: 4, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} width={72} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={(value) => currency(value)} />
                <Tooltip formatter={(value, name) => [currency(value), name]} contentStyle={{ borderColor: 'var(--border)', borderRadius: 8, fontSize: 12 }} />
                <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="netWorth" name="Net worth" stroke="var(--chart-1)" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="assets" name="Assets" stroke="var(--chart-2)" strokeWidth={1.75} dot={false} />
                <Line type="monotone" dataKey="liabilities" name="Liabilities" stroke="var(--negative)" strokeDasharray="5 4" strokeWidth={1.75} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="panel trend-panel">
        <div className="panel-header trend-account-header">
          <div><h2>Account balances</h2><span>Compare the accounts behind your totals</span></div>
          <label><span className="sr-only">Choose account</span><select value={selectedAccount} onChange={(event) => setSelectedAccount(event.target.value)}>
            <option value="all">All accounts</option>
            {assets.length > 0 && <optgroup label="Assets">{assets.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</optgroup>}
            {liabilities.length > 0 && <optgroup label="Liabilities">{liabilities.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</optgroup>}
          </select></label>
        </div>
        {loading ? <div className="loading-state">Loading account trends…</div> : accountData.length < 2 || !(accountTrends.accounts || []).length ? (
          <div className="chart-empty">Account history will appear after you save more snapshots.</div>
        ) : (
          <>
            <div className="large-chart" role="img" aria-label="Account balance trends">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={accountData} margin={{ top: 12, right: 16, left: 4, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} width={72} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={(value) => currency(value)} />
                  <Tooltip formatter={(value, id) => [currency(Math.abs(value), 2), (accountTrends.accounts || []).find((account) => account.id === id)?.name || id]} contentStyle={{ borderColor: 'var(--border)', borderRadius: 8, fontSize: 12 }} />
                  <Legend formatter={(id) => (accountTrends.accounts || []).find((account) => account.id === id)?.name || id} iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
                  {(accountTrends.accounts || []).map((account, index) => (
                    <Line key={account.id} type="monotone" dataKey={account.id} name={account.id} stroke={ACCOUNT_COLORS[index % ACCOUNT_COLORS.length]} strokeWidth={1.9} strokeDasharray={ASSET_TYPES.has(account.type) ? undefined : '5 4'} dot={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <ul className="account-trend-list">
              {(accountTrends.accounts || []).map((account, index) => {
                const latest = accountTrends.data?.[accountTrends.data.length - 1]?.[account.id];
                return <li key={account.id}><span className="legend-dot" style={{ background: ACCOUNT_COLORS[index % ACCOUNT_COLORS.length] }} /><div><strong>{account.name}</strong><span>{account.type}</span></div><strong>{currency(Math.abs(latest || 0), 2)}</strong></li>;
              })}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}

export default Trends;
