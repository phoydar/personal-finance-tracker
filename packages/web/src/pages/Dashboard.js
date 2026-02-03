import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import LinkAccount from '../components/LinkAccount';
import api from '../api';

const COLORS = ['#00d09c', '#4a9eff', '#a855f7', '#fbbf24', '#ff6b6b', '#06b6d4', '#f97316', '#84cc16'];

function Dashboard() {
  const [netWorth, setNetWorth] = useState({ total_assets: 0, total_liabilities: 0, net_worth: 0 });
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [spending, setSpending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [networthData, accountsData, transactionsData, spendingData] = await Promise.all([
        api.getNetWorth(),
        api.getAccounts(),
        api.getTransactions({ limit: 5 }),
        api.getSpendingByCategory(),
      ]);

      setNetWorth(networthData);
      setAccounts(accountsData);
      setTransactions(transactionsData.transactions || []);
      setSpending(spendingData.slice(0, 8)); // Top 8 categories
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await api.refreshBalances();
      await api.sync();
      await fetchData();
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

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            className="btn btn-secondary" 
            onClick={handleSync} 
            disabled={syncing}
          >
            {syncing ? 'Syncing...' : 'Sync Data'}
          </button>
          <LinkAccount onSuccess={fetchData} />
        </div>
      </div>

      {/* Net Worth Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Net Worth</div>
          <div className={`stat-value ${netWorth.net_worth >= 0 ? 'positive' : 'negative'}`}>
            {formatCurrency(netWorth.net_worth)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Assets</div>
          <div className="stat-value positive">{formatCurrency(netWorth.total_assets)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Liabilities</div>
          <div className="stat-value negative">{formatCurrency(netWorth.total_liabilities)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Linked Accounts</div>
          <div className="stat-value">{accounts.length}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Recent Transactions */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Recent Transactions</span>
            <Link to="/transactions" className="btn btn-sm btn-secondary">View All</Link>
          </div>
          {transactions.length === 0 ? (
            <div className="empty-state">
              <h3>No transactions yet</h3>
              <p>Link an account to see your transactions</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <tbody>
                  {transactions.map((txn) => (
                    <tr key={txn.id}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{txn.merchant_name || txn.name}</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{txn.date}</div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className={`transaction-amount ${txn.amount < 0 ? 'income' : 'expense'}`}>
                          {txn.amount < 0 ? '+' : '-'}{formatCurrencyFull(Math.abs(txn.amount))}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Spending by Category */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Spending by Category</span>
          </div>
          {spending.length === 0 ? (
            <div className="empty-state">
              <h3>No spending data</h3>
              <p>Sync your transactions to see spending breakdown</p>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ width: '50%', height: '200px' }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={spending}
                      dataKey="total"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                    >
                      {spending.map((entry, index) => (
                        <Cell key={entry.category} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => formatCurrencyFull(value)}
                      contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ width: '50%' }}>
                {spending.map((cat, index) => (
                  <div key={cat.category} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '12px', height: '12px', borderRadius: '2px', background: COLORS[index % COLORS.length] }}></span>
                      {cat.category || 'Other'}
                    </span>
                    <span style={{ color: 'var(--text-secondary)' }}>{formatCurrencyFull(cat.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Accounts Overview */}
      <div className="card" style={{ marginTop: '24px' }}>
        <div className="card-header">
          <span className="card-title">Accounts Overview</span>
          <Link to="/accounts" className="btn btn-sm btn-secondary">Manage Accounts</Link>
        </div>
        {accounts.length === 0 ? (
          <div className="empty-state">
            <h3>No accounts linked</h3>
            <p>Click "Link Account" to connect your bank accounts</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Institution</th>
                  <th>Type</th>
                  <th style={{ textAlign: 'right' }}>Balance</th>
                </tr>
              </thead>
              <tbody>
                {accounts.slice(0, 5).map((account) => (
                  <tr key={account.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{account.name}</div>
                      {account.mask && <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>••{account.mask}</div>}
                    </td>
                    <td>{account.institution_name}</td>
                    <td><span className="category-badge">{account.subtype || account.type}</span></td>
                    <td style={{ textAlign: 'right' }}>
                      <span className={`transaction-amount ${['credit', 'loan'].includes(account.type) ? 'expense' : 'income'}`}>
                        {formatCurrencyFull(account.current_balance)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
