import React, { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import api from '../api';

function NetWorth() {
  const [netWorth, setNetWorth] = useState({ total_assets: 0, total_liabilities: 0, net_worth: 0 });
  const [history, setHistory] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snapshotSaving, setSnapshotSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [networthData, historyData, accountsData] = await Promise.all([
        api.getNetWorth(),
        api.getNetWorthHistory(365),
        api.getAccounts(),
      ]);

      setNetWorth(networthData);
      setHistory(historyData);
      setAccounts(accountsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveSnapshot = async () => {
    setSnapshotSaving(true);
    try {
      await api.saveNetWorthSnapshot();
      await fetchData();
    } catch (error) {
      console.error('Error saving snapshot:', error);
    } finally {
      setSnapshotSaving(false);
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

  // Group accounts by type
  const assets = accounts.filter(a => ['depository', 'investment', 'brokerage'].includes(a.type));
  const liabilities = accounts.filter(a => ['credit', 'loan'].includes(a.type));

  // Prepare chart data
  const chartData = history.map(h => ({
    date: new Date(h.snapshot_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    netWorth: parseFloat(h.net_worth),
    assets: parseFloat(h.total_assets),
    liabilities: parseFloat(h.total_liabilities),
  }));

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>Net Worth</h1>
        <button 
          className="btn btn-primary" 
          onClick={handleSaveSnapshot}
          disabled={snapshotSaving}
        >
          {snapshotSaving ? 'Saving...' : 'Save Snapshot'}
        </button>
      </div>

      {/* Net Worth Summary */}
      <div className="networth-summary">
        <div className="card networth-card">
          <div className="stat-label">Total Assets</div>
          <div className="stat-value positive">{formatCurrency(netWorth.total_assets)}</div>
        </div>
        <div className="card networth-card">
          <div className="stat-label">Net Worth</div>
          <div className={`stat-value ${netWorth.net_worth >= 0 ? 'positive' : 'negative'}`}>
            {formatCurrency(netWorth.net_worth)}
          </div>
        </div>
        <div className="card networth-card">
          <div className="stat-label">Total Liabilities</div>
          <div className="stat-value negative">{formatCurrency(netWorth.total_liabilities)}</div>
        </div>
      </div>

      {/* Net Worth History Chart */}
      <div className="card" style={{ marginBottom: '32px' }}>
        <div className="card-header">
          <span className="card-title">Net Worth Over Time</span>
        </div>
        {chartData.length === 0 ? (
          <div className="empty-state">
            <h3>No history yet</h3>
            <p>Click "Save Snapshot" to start tracking your net worth over time</p>
          </div>
        ) : (
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
                <Line 
                  type="monotone" 
                  dataKey="netWorth" 
                  name="Net Worth"
                  stroke="var(--accent-green)" 
                  strokeWidth={3}
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="assets" 
                  name="Assets"
                  stroke="var(--accent-blue)" 
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="5 5"
                />
                <Line 
                  type="monotone" 
                  dataKey="liabilities" 
                  name="Liabilities"
                  stroke="var(--accent-red)" 
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="5 5"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Assets Breakdown */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Assets</span>
            <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>
              {formatCurrency(netWorth.total_assets)}
            </span>
          </div>
          {assets.length === 0 ? (
            <div className="empty-state">
              <p>No asset accounts linked</p>
            </div>
          ) : (
            <>
              <div style={{ height: '200px', marginBottom: '16px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={assets} layout="vertical" margin={{ left: 100 }}>
                    <XAxis type="number" hide />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      stroke="var(--text-secondary)"
                      fontSize={12}
                      width={100}
                    />
                    <Tooltip
                      contentStyle={{ 
                        background: 'var(--bg-card)', 
                        border: '1px solid var(--border-color)',
                      }}
                      formatter={(value) => formatCurrencyFull(value)}
                    />
                    <Bar dataKey="current_balance" name="Balance">
                      {assets.map((entry, index) => (
                        <Cell key={entry.id} fill={`hsl(${160 + index * 20}, 70%, 50%)`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="table-container">
                <table>
                  <tbody>
                    {assets.map((account) => (
                      <tr key={account.id}>
                        <td>
                          <div style={{ fontWeight: 500 }}>{account.name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{account.institution_name}</div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span className="transaction-amount income">
                            {formatCurrencyFull(account.current_balance)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Liabilities Breakdown */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Liabilities</span>
            <span style={{ color: 'var(--accent-red)', fontWeight: 600 }}>
              {formatCurrency(netWorth.total_liabilities)}
            </span>
          </div>
          {liabilities.length === 0 ? (
            <div className="empty-state">
              <p>No liability accounts linked</p>
            </div>
          ) : (
            <>
              <div style={{ height: '200px', marginBottom: '16px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={liabilities} layout="vertical" margin={{ left: 100 }}>
                    <XAxis type="number" hide />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      stroke="var(--text-secondary)"
                      fontSize={12}
                      width={100}
                    />
                    <Tooltip
                      contentStyle={{ 
                        background: 'var(--bg-card)', 
                        border: '1px solid var(--border-color)',
                      }}
                      formatter={(value) => formatCurrencyFull(Math.abs(value))}
                    />
                    <Bar dataKey="current_balance" name="Balance">
                      {liabilities.map((entry, index) => (
                        <Cell key={entry.id} fill={`hsl(${0 + index * 15}, 70%, 60%)`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="table-container">
                <table>
                  <tbody>
                    {liabilities.map((account) => (
                      <tr key={account.id}>
                        <td>
                          <div style={{ fontWeight: 500 }}>{account.name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{account.institution_name}</div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span className="transaction-amount expense">
                            {formatCurrencyFull(Math.abs(account.current_balance))}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default NetWorth;
