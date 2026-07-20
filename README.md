# Personal Finance Tracker

A single-user personal finance dashboard that links bank and credit accounts through Plaid, stores account and transaction data in PostgreSQL, and tracks net worth and account-balance trends over time.

## Architecture

This repository is an npm workspaces monorepo with two deployable packages:

- **Web (`packages/web`)**: React 18 single-page app built with Create React App. Google Identity Services handles sign-in, React Router provides Dashboard, Accounts, Transactions, Net Worth, and Trends views, Recharts renders financial charts, and `react-plaid-link` launches Plaid Link.
- **API (`packages/api`)**: NestJS 10 REST API. All routes use the `/api` prefix. The API verifies Google ID tokens, issues application JWTs, enforces an email allowlist, and owns Plaid operations, accounts and liabilities, transactions and aggregates, and net-worth snapshots and trends.
- **Database**: PostgreSQL accessed through TypeORM. Checked-in migrations run automatically when the API starts; schema synchronization is disabled.
- **External integration**: Plaid provides account linking, transaction sync, balance refreshes, and liability details.
- **Hosting**: Netlify serves the web build and proxies `/api/*` to the Railway-hosted API. Railway runs the API and PostgreSQL.

```mermaid
flowchart LR
    Browser["React SPA"] -->|"/api/*"| Netlify["Netlify CDN and API proxy"]
    Netlify --> API["NestJS API on Railway"]
    API <--> DB["PostgreSQL"]
    API <--> Plaid["Plaid API"]
    Browser <--> Link["Plaid Link"]
    Link --> Plaid
```

Local development has the same application boundaries: the Create React App development server proxies `/api` requests to the API on port 3001, while the API connects to PostgreSQL in Docker on port 5433.

### Runtime and data flow

1. The web app requests a link token from the API and opens Plaid Link.
2. The API exchanges Plaid's public token, stores the Plaid item and access token, then imports the item's accounts.
3. User-triggered sync actions pull transaction changes with Plaid's cursor-based Transactions Sync API. Each item's cursor is persisted for its next sync.
4. Separate user-triggered actions refresh account balances or import liability details.
5. A net-worth snapshot stores both aggregate totals and each account's balance. The Trends page reads those snapshots for composition and per-account history.

Google sign-in restricts access to the configured email allowlist, but financial records are not partitioned by user or tenant. The application also has no background workers, scheduled sync, or Plaid webhooks. Syncs, refreshes, and snapshots happen only when requested from the UI or API, so the deployment remains a private single-user application.

### API modules

| Module | Responsibility |
| --- | --- |
| `auth` | Verify Google ID tokens, enforce the email allowlist, issue JWTs, and protect finance routes |
| `plaid` | Link tokens, public-token exchange, account import, transaction sync, balance refresh, liability sync, and item removal |
| `accounts` | Read institutions, accounts, and liabilities; rename an account |
| `transactions` | Filtered transaction queries, spending-by-category aggregation, and income aggregation |
| `networth` | Current net-worth calculation, aggregate and per-account snapshots, history, and trend queries |
| `database` | TypeORM entities and migrations |

### Data model

- `items` stores one linked Plaid item per institution, including its access token and transaction cursor.
- `accounts` belongs to an item and stores the latest account metadata and balances.
- `transactions` belongs to an account.
- `liabilities` is an optional one-to-one record for an account.
- `net_worth_history` stores dated aggregate asset, liability, and net-worth snapshots.
- `account_balance_snapshots` stores the per-account balances associated with each net-worth snapshot.

Deleting an item cascades through its accounts and their transactions, liabilities, and account-balance snapshots. Deleting a net-worth snapshot cascades through its account-balance snapshots.

## Prerequisites

- Node.js 18 or newer
- Docker with Docker Compose
- Plaid API credentials ([Plaid dashboard](https://dashboard.plaid.com/team/keys))

## Local development

### 1. Install dependencies

```bash
npm install
```

### 2. Start PostgreSQL

```bash
npm run db:start
```

This starts PostgreSQL 16 on `localhost:5433` and persists its data in the `finance_data` Docker volume. The API runs any pending TypeORM migrations when it starts.

### 3. Configure the API

Create `packages/api/.env`:

```env
DATABASE_URL=postgresql://finance:finance_local@localhost:5433/finance_tracker
PLAID_CLIENT_ID=your_client_id
PLAID_SECRET=your_secret
PLAID_ENV=sandbox
PLAID_REDIRECT_URI=http://localhost:3000
FRONTEND_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your_google_client_id
ALLOWED_GOOGLE_EMAILS=you@example.com
JWT_SECRET=replace_with_a_random_value_of_at_least_32_characters
PORT=3001
NODE_ENV=development
```

`PLAID_REDIRECT_URI` is optional for non-OAuth Plaid flows. If it is set, add the exact URI to the allowed redirect URIs in the Plaid dashboard.

For Google sign-in, create `packages/web/.env`:

```env
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
```

Aside from the Google client ID, the web package needs no environment configuration for normal local development. Its development server proxies same-origin `/api` requests to `http://localhost:3001`. If you set `REACT_APP_API_URL`, use an origin such as `http://localhost:3001`—do not include `/api`, because the API client adds that prefix.

### 4. Start the applications

```bash
npm run dev
```

- Web: <http://localhost:3000>
- API: <http://localhost:3001/api>
- Health check: <http://localhost:3001/api/health>

## Deployment

### Railway: API and PostgreSQL

The current Railway project is [Personal Finance Tracker](https://railway.com/project/1fd1d53d-1905-430c-b0fe-1f9d1c8279f8). Railway deploys from the repository root using `railway.toml`. The production command starts the API workspace, and Railway checks `/api/health` before considering the deployment healthy.

Provision PostgreSQL and configure:

- `DATABASE_URL` (normally supplied by Railway PostgreSQL)
- `PLAID_CLIENT_ID`
- `PLAID_SECRET`
- `PLAID_ENV=production`
- `PLAID_REDIRECT_URI=https://your-site.netlify.app`
- `FRONTEND_URL=https://your-site.netlify.app`
- `GOOGLE_CLIENT_ID`
- `ALLOWED_GOOGLE_EMAILS` (comma-separated Google accounts permitted to sign in)
- `JWT_SECRET` (a cryptographically random value of at least 32 characters)
- `NODE_ENV=production`

Railway supplies `PORT` at runtime. On production startup, TypeORM connects with SSL and automatically runs pending migrations.

### Netlify: web

The current Netlify project is [pshfinances](https://app.netlify.com/projects/pshfinances). It is connected to the repository root. The root `netlify.toml` configures the `packages/web` base directory, installs and builds the React app, publishes `packages/web/build`, proxies `/api/*` to Railway, and falls back to `index.html` for client-side routes.

Set `REACT_APP_GOOGLE_CLIENT_ID` in Netlify for Google Identity Services. The browser flow uses only the client ID; keep `GOOGLE_CLIENT_SECRET` and all other OAuth secrets out of Netlify and browser environment variables.

The web app normally uses same-origin `/api` requests through that proxy, so `REACT_APP_API_URL` can remain unset. If the API host changes, update the proxy target in `netlify.toml`. If you bypass the proxy with `REACT_APP_API_URL`, set it to the API origin without a trailing `/api` and ensure that origin is allowed by the API's CORS configuration.

Finally, add the production `PLAID_REDIRECT_URI` to the allowed redirect URIs in the Plaid dashboard.

## Project structure

```text
personal-finance-tracker/
├── package.json                         # npm workspace scripts
├── docker-compose.yml                   # Local PostgreSQL 16
├── init.sql                             # Initial local database bootstrap
├── netlify.toml                         # Web build, API proxy, and SPA routing
├── railway.toml                         # API runtime and health check
└── packages/
    ├── api/
    │   ├── src/
    │   │   ├── accounts/                # Institutions, accounts, liabilities
    │   │   ├── auth/                    # Google token verification, allowlist, and JWT auth
    │   │   ├── database/
    │   │   │   ├── entities/            # TypeORM persistence model
    │   │   │   └── migrations/          # Versioned PostgreSQL schema
    │   │   ├── networth/                # Snapshots, history, and trends
    │   │   ├── plaid/                   # Plaid integration and sync
    │   │   ├── transactions/            # Queries and aggregates
    │   │   ├── app.module.ts            # Application composition and database config
    │   │   └── main.ts                  # API bootstrap, CORS, validation, /api prefix
    │   └── package.json
    └── web/
        ├── public/
        ├── src/
        │   ├── components/              # Shared account and Plaid Link UI
        │   ├── pages/                   # Dashboard, Accounts, Transactions, Net Worth, Trends
        │   ├── api.js                   # Browser-to-API adapter
        │   └── App.js                   # Navigation and routes
        └── package.json
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the API and web development servers |
| `npm run dev:api` | Start only the NestJS API in watch mode |
| `npm run dev:web` | Start only the React development server |
| `npm run build` | Build both workspaces |
| `npm run build:api` | Build only the API |
| `npm run build:web` | Build only the web app |
| `npm run db:start` | Start local PostgreSQL |
| `npm run db:stop` | Stop local PostgreSQL |
| `npm run db:reset` | Delete the local database volume and recreate PostgreSQL |

## Continuous Integration

GitHub Actions runs a clean `npm ci` install and builds both npm workspaces for pull requests targeting `main` and pushes to `main`.

## API endpoints

All endpoints are prefixed with `/api`. Google login and the health check are public. All finance endpoints and `/auth/me` require the JWT returned by `/auth/google`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Report API and database health |
| `POST` | `/auth/google` | Exchange a Google ID token for an application JWT |
| `GET` | `/auth/me` | Get the authenticated identity |
| `GET` | `/create_link_token` | Create a Plaid Link token |
| `POST` | `/exchange_public_token` | Exchange a Plaid public token and import accounts |
| `POST` | `/sync` | Sync transaction changes for all linked items |
| `POST` | `/refresh_balances` | Refresh balances for all linked items |
| `POST` | `/sync_liabilities` | Import liability details for all linked items |
| `GET` | `/items` | List linked institutions with their accounts |
| `DELETE` | `/items/:id` | Remove a linked item from Plaid and the database |
| `GET` | `/accounts` | List accounts |
| `PATCH` | `/accounts/:id` | Rename an account |
| `GET` | `/liabilities` | List liability details |
| `GET` | `/transactions` | List and filter transactions |
| `GET` | `/spending_by_category` | Aggregate posted spending by category |
| `GET` | `/income` | List and total posted income transactions |
| `GET` | `/networth` | Calculate current assets, liabilities, and net worth |
| `POST` | `/networth/snapshot` | Save aggregate and per-account balance snapshots |
| `GET` | `/networth/history` | Get aggregate snapshot history |
| `GET` | `/trends/composition` | Get asset, liability, and net-worth trends |
| `GET` | `/trends/accounts` | Get per-account balance trends |

`/transactions` accepts `account_id`, `start_date`, `end_date`, `search`, `category`, `limit`, and `offset`. Aggregate and trend endpoints accept their applicable `start_date`, `end_date`, or `days` filters; `/trends/accounts` also accepts `account_id`.

## Tech stack

- **Web**: React 18, React Router 7, Recharts, react-plaid-link, Create React App
- **API**: NestJS 10, TypeORM, Plaid Node SDK, class-validator
- **Database**: PostgreSQL 16 locally; Railway PostgreSQL in production
- **Deployment**: Netlify for the web app; Railway for the API and database
