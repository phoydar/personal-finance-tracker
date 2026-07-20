import React from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Dashboard from './pages/Dashboard';
import Accounts from './pages/Accounts';
import Transactions from './pages/Transactions';
import NetWorth from './pages/NetWorth';
import Trends from './pages/Trends';
import Login from './pages/Login';

function App() {
  const { isAuthenticated, loading, user, logout } = useAuth();

  if (loading) {
    return (
      <div className="login-page">
        <div className="login-loading">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>Finance<span>Tracker</span></h1>
        </div>
        <nav>
          <ul className="sidebar-nav">
            <li>
              <NavLink to="/" end>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
                Dashboard
              </NavLink>
            </li>
            <li>
              <NavLink to="/accounts">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                  <line x1="1" y1="10" x2="23" y2="10"></line>
                </svg>
                Accounts
              </NavLink>
            </li>
            <li>
              <NavLink to="/transactions">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="1" x2="12" y2="23"></line>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
                Transactions
              </NavLink>
            </li>
            <li>
              <NavLink to="/networth">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="20" x2="18" y2="10"></line>
                  <line x1="12" y1="20" x2="12" y2="4"></line>
                  <line x1="6" y1="20" x2="6" y2="14"></line>
                </svg>
                Net Worth
              </NavLink>
            </li>
            <li>
              <NavLink to="/trends">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                </svg>
                Trends
              </NavLink>
            </li>
          </ul>
        </nav>

        <div className="sidebar-user">
          <div className="sidebar-user-info">
            {user?.picture && (
              <img src={user.picture} alt="" className="sidebar-user-avatar" referrerPolicy="no-referrer" />
            )}
            <div className="sidebar-user-details">
              <span className="sidebar-user-name">{user?.name || user?.email}</span>
            </div>
          </div>
          <button className="btn btn-sm btn-secondary sidebar-logout" onClick={logout}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            Sign out
          </button>
        </div>
      </aside>
      
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/networth" element={<NetWorth />} />
          <Route path="/trends" element={<Trends />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
