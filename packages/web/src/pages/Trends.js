import React, { useState, useEffect, useCallback } from 'react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import api from '../api';

const TIME_PERIODS = [
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: 'YTD', days: null, ytd: true },
  { label: '1Y', days: 365 },
  { label: 'All', days: null }
];

const ACCOUNT_COLORS = {
  asset: ['#00d09c', '#00b88a', '#009973', '#007a5c', '#005c45'],
  liability: ['#ff6b6b', '#ff5252', '#ff3838', '#e82d2d', '#cc2929']
};

function Trends() {
  const [compositionData, setCompositionData] = useState({ data: [], changes: {} });
  const [accountTrendsData, setAccountTrendsData] = useState({ data: [], accounts: [] });
  const [selectedPeriod, setSelectedPeriod] = useState('3M');
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
  const [useCustomRange, setUseCustomRange] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [loading, setLoading] = useState(true);

  const getDateParams = useCallback(() => {
    if (useCustomRange && customDateRange.start && customDateRange.end) {
      return {
        start_date: customDateRange.start,
        end_date: customDateRange.end
      };
    }

    const period = TIME_PERIODS.find(p => p.label === selectedPeriod);
    if (!period) return {};

    if (period.ytd) {
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      return {
        start_date: startOfYear.toISOString().split('T')[0],
        end_date: now.toISOString().split('T')[0]
      };
    }

    if (period.days) {
      return { days: period.days };
    }

    return {}; // All time
  }, [selectedPeriod, useCustomRange, customDateRange]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = getDateParams();
      const accountParams = selectedAccount !== 'all' 
        ? { ...params, account_id: selectedAccount }
        : params;

      const [composition, accountTrends] = await Promise.all([
        api.getTrendsComposition(params),
        api.getAccountTrends(accountParams)
      ]);

      setCompositionData(composition);
      setAccountTrendsData(accountTrends);
    } catch (error) {
      console.error('Error fetching trends data:', error);
    } finally {
      setLoading(false);
    }
  }, [getDateParams, selectedAccount]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
    setUseCustomRange(false);
  };

  const handleCustomDateChange = (field, value) => {
    setCustomDateRange(prev => ({ ...prev, [field]: value }));
  };

  const applyCustomRange = () => {
    if (customDateRange.start && customDateRange.end) {
      setUseCustomRange(true);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatCurrencyFull = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercent = (value) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const formatChange = (value) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${formatCurrency(value)}`;
  };

  // Prepare composition chart data
  const compositionChartData = compositionData.data.map(d => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    assets: d.assets,
    liabilities: d.liabilities,
    netWorth: d.net_worth
  }));

  // Prepare account trends chart data
  const accountChartData = accountTrendsData.data.map(d => {
    const entry = {
      date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    };
    accountTrendsData.accounts.forEach(acc => {
      if (d[acc.id] !== undefined) {
        entry[acc.id] = d[acc.id];
      }
    });
    return entry;
  });

  // Get color for account based on type
  const getAccountColor = (account, index) => {
    const isAsset = ['depository', 'investment', 'brokerage'].includes(account.type);
    const colors = isAsset ? ACCOUNT_COLORS.asset : ACCOUNT_COLORS.liability;
    return colors[index % colors.length];
  };

  // Group accounts by type for display
  const assetAccounts = accountTrendsData.accounts.filter(a => 
    ['depository', 'investment', 'brokerage'].includes(a.type)
  );
  const liabilityAccounts = accountTrendsData.accounts.filter(a => 
    ['credit', 'loan'].includes(a.type)
  );

  const { changes } = compositionData;

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>Trends</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Time Period Buttons */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {TIME_PERIODS.map(period => (
              <button
                key={period.label}
                className={`btn btn-sm ${selectedPeriod === period.label && !useCustomRange ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => handlePeriodChange(period.label)}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Custom Date Range */}
      <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Custom Range:</span>
          <input
            type="date"
            className="input"
            style={{ width: '160px' }}
            value={customDateRange.start}
            onChange={(e) => handleCustomDateChange('start', e.target.value)}
          />
          <span style={{ color: 'var(--text-muted)' }}>to</span>
          <input
            type="date"
            className="input"
            style={{ width: '160px' }}
            value={customDateRange.end}
            onChange={(e) => handleCustomDateChange('end', e.target.value)}
          />
          <button 
            className={`btn btn-sm ${useCustomRange ? 'btn-primary' : 'btn-secondary'}`}
            onClick={applyCustomRange}
            disabled={!customDateRange.start || !customDateRange.end}
          >
            Apply
          </button>
        </div>
      </div>

      {/* Change Summary Cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-label">Asset Change</div>
          <div className={`stat-value ${changes.asset_change >= 0 ? 'positive' : 'negative'}`}>
            {formatChange(changes.asset_change || 0)}
          </div>
          <div style={{ 
            fontSize: '14px', 
            color: changes.asset_change_percent >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
            marginTop: '4px'
          }}>
            {formatPercent(changes.asset_change_percent || 0)} this period
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Liability Change</div>
          <div className={`stat-value ${changes.liability_change <= 0 ? 'positive' : 'negative'}`}>
            {formatChange(changes.liability_change || 0)}
          </div>
          <div style={{ 
            fontSize: '14px', 
            color: changes.liability_change_percent <= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
            marginTop: '4px'
          }}>
            {formatPercent(changes.liability_change_percent || 0)} this period
          </div>
        </div>
      </div>

      {/* Stacked Area Chart - Assets vs Liabilities */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <span className="card-title">Assets vs Liabilities Over Time</span>
        </div>
        {compositionChartData.length === 0 ? (
          <div className="empty-state">
            <h3>No trend data yet</h3>
            <p>Save snapshots from the Net Worth page to start tracking trends</p>
          </div>
        ) : (
          <div className="chart-container" style={{ height: '350px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={compositionChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorAssets" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-green)" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="var(--accent-green)" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorLiabilities" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-red)" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="var(--accent-red)" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={12} />
                <YAxis 
                  stroke="var(--text-secondary)" 
                  fontSize={12}
                  tickFormatter={(value) => formatCurrency(value)}
                />
                <Tooltip
                  contentStyle={{ 
                    background: 'var(--bg-card)', 
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                  }}
                  formatter={(value) => formatCurrencyFull(value)}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="assets" 
                  name="Assets"
                  stroke="var(--accent-green)" 
                  fillOpacity={1}
                  fill="url(#colorAssets)"
                  strokeWidth={2}
                />
                <Area 
                  type="monotone" 
                  dataKey="liabilities" 
                  name="Liabilities"
                  stroke="var(--accent-red)" 
                  fillOpacity={1}
                  fill="url(#colorLiabilities)"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="netWorth" 
                  name="Net Worth"
                  stroke="var(--accent-blue)" 
                  strokeWidth={3}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Account Trends Chart */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Account Balance Trends</span>
          <select
            className="input"
            style={{ width: '200px' }}
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
          >
            <option value="all">All Accounts</option>
            {assetAccounts.length > 0 && (
              <optgroup label="Assets">
                {assetAccounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </optgroup>
            )}
            {liabilityAccounts.length > 0 && (
              <optgroup label="Liabilities">
                {liabilityAccounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
        {accountChartData.length === 0 || accountTrendsData.accounts.length === 0 ? (
          <div className="empty-state">
            <h3>No account trend data yet</h3>
            <p>Save snapshots from the Net Worth page to start tracking individual account trends</p>
          </div>
        ) : (
          <>
            <div className="chart-container" style={{ height: '350px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={accountChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={12} />
                  <YAxis 
                    stroke="var(--text-secondary)" 
                    fontSize={12}
                    tickFormatter={(value) => formatCurrency(value)}
                  />
                  <Tooltip
                    contentStyle={{ 
                      background: 'var(--bg-card)', 
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                    }}
                    formatter={(value, name) => {
                      const account = accountTrendsData.accounts.find(a => a.id === name);
                      return [formatCurrencyFull(value), account?.name || name];
                    }}
                  />
                  <Legend 
                    formatter={(value) => {
                      const account = accountTrendsData.accounts.find(a => a.id === value);
                      return account?.name || value;
                    }}
                  />
                  {accountTrendsData.accounts.map((account, index) => (
                    <Line
                      key={account.id}
                      type="monotone"
                      dataKey={account.id}
                      name={account.id}
                      stroke={getAccountColor(account, index)}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Account Legend with current values */}
            <div style={{ 
              marginTop: '16px', 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
              gap: '12px' 
            }}>
              {accountTrendsData.accounts.map((account, index) => {
                const latestData = accountTrendsData.data[accountTrendsData.data.length - 1];
                const currentBalance = latestData ? latestData[account.id] : 0;
                const isAsset = ['depository', 'investment', 'brokerage'].includes(account.type);
                
                return (
                  <div 
                    key={account.id}
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      padding: '12px',
                      background: 'var(--bg-secondary)',
                      borderRadius: '8px',
                      borderLeft: `4px solid ${getAccountColor(account, index)}`
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '14px' }}>{account.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {account.type}
                      </div>
                    </div>
                    <div style={{ 
                      fontWeight: 600, 
                      color: isAsset ? 'var(--accent-green)' : 'var(--accent-red)'
                    }}>
                      {formatCurrencyFull(Math.abs(currentBalance || 0))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Trends;
