// API base URL from environment variable
const API_URL = process.env.REACT_APP_API_URL || '/api';

// Helper function to make API requests
async function apiRequest(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || error.message || 'Request failed');
  }
  
  return response.json();
}

// API methods
export const api = {
  // Plaid
  createLinkToken: () => apiRequest('/create_link_token'),
  exchangePublicToken: (data) => apiRequest('/exchange_public_token', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  sync: () => apiRequest('/sync', { method: 'POST' }),
  refreshBalances: () => apiRequest('/refresh_balances', { method: 'POST' }),
  syncLiabilities: () => apiRequest('/sync_liabilities', { method: 'POST' }),
  
  // Items
  getItems: () => apiRequest('/items'),
  deleteItem: (id) => apiRequest(`/items/${id}`, { method: 'DELETE' }),
  
  // Accounts
  getAccounts: () => apiRequest('/accounts'),
  getLiabilities: () => apiRequest('/liabilities'),
  
  // Transactions
  getTransactions: (params) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/transactions?${query}`);
  },
  getSpendingByCategory: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/spending_by_category?${query}`);
  },
  getIncome: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/income?${query}`);
  },
  
  // Net Worth
  getNetWorth: () => apiRequest('/networth'),
  saveNetWorthSnapshot: () => apiRequest('/networth/snapshot', { method: 'POST' }),
  getNetWorthHistory: (days = 90) => apiRequest(`/networth/history?days=${days}`),
};

export default api;
