import React, { useEffect, useRef } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import {
  ArrowsLeftRight,
  ChartLineUp,
  House,
  SignOut,
  Wallet,
  Scales,
} from '@phosphor-icons/react';
import { useAuth } from './context/AuthContext';
import Dashboard from './pages/Dashboard';
import Accounts from './pages/Accounts';
import Transactions from './pages/Transactions';
import NetWorth from './pages/NetWorth';
import Trends from './pages/Trends';
import Login from './pages/Login';

const NAV_ITEMS = [
  { to: '/', label: 'Overview', icon: House, end: true },
  { to: '/accounts', label: 'Accounts', icon: Wallet },
  { to: '/transactions', label: 'Transactions', mobileLabel: 'Activity', icon: ArrowsLeftRight },
  { to: '/networth', label: 'Net worth', mobileLabel: 'Worth', icon: Scales },
  { to: '/trends', label: 'Trends', icon: ChartLineUp },
];

function App() {
  const { isAuthenticated, loading, user, logout } = useAuth();
  const location = useLocation();
  const mainRef = useRef(null);

  useEffect(() => {
    if (isAuthenticated) mainRef.current?.focus({ preventScroll: true });
  }, [location.pathname, isAuthenticated]);

  if (loading) {
    return (
      <div className="app-loading" role="status" aria-live="polite">
        <span className="brand-mark" aria-hidden="true">L</span>
        <span>Opening your finances</span>
        <span className="loading-track" aria-hidden="true"><span /></span>
      </div>
    );
  }

  if (!isAuthenticated) return <Login />;

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>

      <aside className="sidebar" aria-label="Primary navigation">
        <div className="sidebar-brand">
          <span className="brand-mark" aria-hidden="true">L</span>
          <span className="brand-name">Ledger</span>
        </div>

        <nav className="sidebar-navigation">
          <ul className="sidebar-nav">
            {NAV_ITEMS.map(({ to, label, mobileLabel, icon: Icon, end }) => (
              <li key={to}>
                <NavLink to={to} end={end} aria-label={label}>
                  <Icon size={19} weight="regular" aria-hidden="true" />
                  <span>{mobileLabel || label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div className="privacy-status" aria-label="Workspace status">
            <span className="status-dot" aria-hidden="true" />
            <span>Private workspace</span>
          </div>
          <div className="sidebar-user">
            {user?.picture ? (
              <img src={user.picture} alt="" className="sidebar-user-avatar" referrerPolicy="no-referrer" />
            ) : (
              <span className="sidebar-user-avatar sidebar-user-fallback" aria-hidden="true">
                {(user?.name || user?.email || 'P').charAt(0).toUpperCase()}
              </span>
            )}
            <div className="sidebar-user-details">
              <span className="sidebar-user-name">{user?.name || user?.email}</span>
              <span className="sidebar-user-email">{user?.email}</span>
            </div>
            <button className="icon-button sidebar-logout" onClick={logout} aria-label="Sign out" title="Sign out">
              <SignOut size={17} aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>

      <main id="main-content" className="main-content" ref={mainRef} tabIndex="-1">
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
