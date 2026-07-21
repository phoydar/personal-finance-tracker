# Personal Finance Tracker

A personal finance tracking app that connects to your bank accounts and credit cards via Plaid to help you monitor your income, expenses, and net worth. This project is currently being extended to include advanced debt payoff modeling, aiming to fully replace commercial subscriptions like Monarch Money.

## Current Architecture

- **Frontend**: React app (`packages/web`) — deployed to Netlify
- **Backend**: NestJS API (`packages/api`) — deployed to Railway
- **Database**: PostgreSQL — Railway or local Docker

## Roadmap: Replacing Monarch Money

Based on the July 2026 session, the app is being expanded to handle custom debt payoff strategies (Avalanche vs. Snowball vs. Minimums). Monarch lacks manual APR overrides when data isn't provided by the institution, which breaks its internal calculators. This app will solve that by allowing manual APR entries and custom payment strategies.

### Upcoming Features
1. **Manual APR Overrides**: Ability to set and store APRs for credit cards when Plaid doesn't provide them.
2. **Debt Payoff Calculator Module**: A new NestJS service to run projections based on balances, APRs, and extra monthly payment amounts.
3. **Promo Rate Handling**: Support for 0% promotional rates with expiration dates (e.g., Citi Diamond, WF Reflect).
4. **Visualizations**: React components (via Recharts) to plot debt balance over time and total interest paid by strategy.

---

## Prerequisites

- Node.js 18+
- Docker (for local PostgreSQL)
- Plaid API credentials ([Get them here](https://dashboard.plaid.com/team/keys))

## Local Development

### 1. Install Dependencies

```bash
npm install
```

### 2. Start the Database

```bash
npm run db:start
```

This starts a PostgreSQL container on port 5433.

### 3. Configure Environment Variables

**API** (`packages/api/.env`):
```env
DATABASE_URL=postgresql://finance:finance_local@localhost:5433/finance_tracker
PLAID_CLIENT_ID=your_client_id
PLAID_SECRET=your_secret
PLAID_ENV=sandbox
PLAID_REDIRECT_URI=http://localhost:3000/
FRONTEND_URL=http://localhost:3000
PORT=3001
```

**Web** (`packages/web/.env`):
```env
REACT_APP_API_URL=http://localhost:3001/api
```

### 4. Start Development Servers

```bash
npm run dev
```

- Frontend: http://localhost:3000
- API: http://localhost:3001

## Deployment

### Railway (API + PostgreSQL)

1. Create a new project in [Railway](https://railway.app)
2. Add a PostgreSQL database
3. Deploy from the `packages/api` directory
4. Set environment variables:
   - `DATABASE_URL` (auto-set by Railway PostgreSQL)
   - `PLAID_CLIENT_ID`
   - `PLAID_SECRET`
   - `PLAID_ENV=production`
   - `PLAID_REDIRECT_URI=https://your-app.netlify.app/`
   - `FRONTEND_URL=https://your-app.netlify.app`
   - `NODE_ENV=production`

### Netlify (Frontend)

1. Create a new site in [Netlify](https://netlify.com)
2. Connect your repository
3. Configure build settings:
   - Base directory: `packages/web`
   - Build command: `npm run build`
   - Publish directory: `packages/web/build`
4. Set environment variable:
   - `REACT_APP_API_URL=https://your-api.railway.app/api`

### Plaid Dashboard

Update the redirect URI in [Plaid Dashboard](https://dashboard.plaid.com/developers/api):
- Add `https://your-app.netlify.app/` to Allowed redirect URIs

## Project Structure

```
personal-finance-tracker/
├── package.json              # Workspace root
├── docker-compose.yml        # Local PostgreSQL
├── packages/
│   ├── api/                  # NestJS backend
│   │   ├── src/
│   │   │   ├── plaid/        # Plaid integration
│   │   │   ├── accounts/     # Accounts module
│   │   │   ├── transactions/ # Transactions module
│   │   │   ├── networth/     # Net worth module
│   │   │   └── database/     # TypeORM entities
│   │   └── package.json
│   │
│   └── web/                  # React frontend
│       ├── src/
│       │   ├── components/
│       │   ├── pages/
│       │   └── api.js        # API client
│       ├── netlify.toml
│       └── package.json
```

## Scripts

| Command            | Description                                |
| ------------------ | ------------------------------------------ |
| `npm run dev`      | Start both API and web in development mode |
| `npm run dev:api`  | Start only the API                         |
| `npm run dev:web`  | Start only the web frontend                |
| `npm run build`    | Build both packages                        |
| `npm run db:start` | Start local PostgreSQL                     |
| `npm run db:stop`  | Stop local PostgreSQL                      |
| `npm run db:reset` | Reset database (deletes all data)          |

## API Endpoints

| Endpoint                     | Method | Description                     |
| ---------------------------- | ------ | ------------------------------- |
| `/api/health`                | GET    | Health check                    |
| `/api/create_link_token`     | GET    | Create Plaid Link token         |
| `/api/exchange_public_token` | POST   | Exchange token for access       |
| `/api/items`                 | GET    | List linked institutions        |
| `/api/items/:id`             | DELETE | Remove institution              |
| `/api/accounts`              | GET    | Get all accounts                |
| `/api/transactions`          | GET    | Get transactions (with filters) |
| `/api/sync`                  | POST   | Sync transactions from Plaid    |
| `/api/refresh_balances`      | POST   | Refresh account balances        |
| `/api/networth`              | GET    | Get current net worth           |
| `/api/networth/history`      | GET    | Get net worth history           |
| `/api/networth/snapshot`     | POST   | Save net worth snapshot         |

## Tech Stack

- **Frontend**: React, React Router, Recharts, react-plaid-link
- **Backend**: NestJS, TypeORM, Plaid Node SDK
- **Database**: PostgreSQL
- **Deployment**: Netlify (frontend), Railway (API + database)
