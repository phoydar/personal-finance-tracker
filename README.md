# Personal Finance Tracker

A single-user personal finance dashboard that links bank and credit accounts through Plaid, stores account and transaction data in PostgreSQL, and tracks net worth and account-balance trends over time.

## Deployment status

The repository is configured for a target single-service Railway architecture, but the production cutover from Netlify has not happened yet.

- [Current Railway project](https://railway.com/project/1fd1d53d-1905-430c-b0fe-1f9d1c8279f8): API and PostgreSQL today; target host for the combined application
- [Current Netlify project](https://app.netlify.com/projects/pshfinances): production frontend during the transition

`netlify.toml` remains in the repository so the current frontend can continue to deploy until the combined Railway service is smoke-tested and intentionally cut over. Do not remove the Netlify project or configuration as part of an ordinary Railway deploy.

## Architecture

This repository is an npm workspaces monorepo:

- **Web (`packages/web`)**: React 18 single-page app built with Create React App. Google Identity Services handles sign-in, React Router provides Dashboard, Accounts, Transactions, Net Worth, and Trends views, Recharts renders financial charts, and `react-plaid-link` launches Plaid Link.
- **API (`packages/api`)**: NestJS 10 REST API. All routes use the `/api` prefix. The API verifies Google ID tokens, issues application JWTs, enforces an email allowlist, and owns Plaid operations, accounts and liabilities, transactions and aggregates, and net-worth snapshots and trends.
- **Database**: PostgreSQL accessed through TypeORM. Checked-in migrations run automatically when the API starts; schema synchronization is disabled.
- **External integration**: Plaid provides account linking, transaction sync, balance refreshes, and liability details.

### Target production architecture

The root `npm run build` command builds both workspaces. Railway runs `npm start`, which starts NestJS and serves the React production build from `packages/web/build`. The browser and API share one Railway origin, while PostgreSQL remains a separate Railway service.

```mermaid
flowchart LR
    Browser["React SPA"] -->|"same-origin /api/*"| App["NestJS application on Railway"]
    App -->|"static files and SPA fallback"| Browser
    App <--> DB["Railway PostgreSQL"]
    App <--> Plaid["Plaid API"]
    Browser <--> Link["Plaid Link"]
    Link --> Plaid
```

The SPA fallback explicitly excludes `/api/*`: refreshing a client route such as `/accounts` returns `index.html`, while an unknown API route remains a JSON 404. Same-origin production requests do not need `REACT_APP_API_URL`.

### Current transitional architecture

Until cutover, Netlify serves the React build and proxies `/api/*` to the Railway-hosted API. Local development has the same application boundary: the Create React App server proxies `/api` to the API on port 3001, while the API connects to PostgreSQL in Docker on port 5433.

The transitional Netlify build needs only `REACT_APP_GOOGLE_CLIENT_ID` for Google authentication. Leave `REACT_APP_API_URL` unset so `/api/*` uses the configured proxy. Remove `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from Netlify: the backend client ID belongs in Railway, and this authentication flow does not use a client secret.

The Google client ID is intentionally public and compiled into the React bundle. `netlify.toml` excludes only `GOOGLE_CLIENT_ID` and `REACT_APP_GOOGLE_CLIENT_ID` from Netlify's secret scan so expected build output is accepted; secret scanning remains enabled for every other variable, including `GOOGLE_CLIENT_SECRET`.

### Runtime and data flow

1. The web app requests a link token from the API and opens Plaid Link.
2. The API exchanges Plaid's public token, stores the Plaid item and access token, then imports the item's accounts.
3. User-triggered sync actions pull transaction changes with Plaid's cursor-based Transactions Sync API. Each item's cursor is persisted for its next sync.
4. Separate user-triggered actions refresh account balances or import liability details.
5. A net-worth snapshot stores both aggregate totals and each account's balance. The Trends page reads those snapshots for composition and per-account history.

Google sign-in restricts access to the configured email allowlist, but financial records are not partitioned by user or tenant. The application has no background workers, scheduled sync, or Plaid webhooks. Syncs, refreshes, and snapshots happen only when requested from the UI or API, so the deployment remains a private single-user application.

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

- Node.js 18 or newer; CI and the transitional Netlify build use Node.js 20
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

This starts PostgreSQL 16 on `localhost:5433` and persists its data in the `finance_data` Docker volume. The API runs pending TypeORM migrations when it starts.

### 3. Configure the API

Copy `packages/api/.env.example` to `packages/api/.env` and set:

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

`PLAID_REDIRECT_URI` is optional for non-OAuth Plaid flows. If set, add the exact URI to the allowed redirect URIs in the Plaid dashboard.

Copy `packages/web/.env.example` to `packages/web/.env` and set:

```env
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
```

Aside from the Google client ID, the web package needs no environment configuration for normal local development. If you set `REACT_APP_API_URL`, use an origin such as `http://localhost:3001`—do not include `/api`, because the client adds that prefix.

### 4. Start the applications

```bash
npm run dev
```

- Web: <http://localhost:3000>
- API: <http://localhost:3001/api>
- Health check: <http://localhost:3001/api/health>

## Deployment

### Target Railway application and PostgreSQL

Configure the application service in the [current Railway project](https://railway.com/project/1fd1d53d-1905-430c-b0fe-1f9d1c8279f8) with the repository root (`/`) as its source root. Railway reads `railway.toml`, runs the root build, starts the combined app with `npm start`, and checks `/api/health`.

Keep PostgreSQL as a separate Railway service and reference its connection variable from the application service.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Railway PostgreSQL connection; use a Railway variable reference rather than copying the value |
| `PLAID_CLIENT_ID` | Plaid client identifier |
| `PLAID_SECRET` | Plaid secret for the selected environment |
| `PLAID_ENV` | Plaid environment, normally `production` after cutover |
| `PLAID_REDIRECT_URI` | Public Railway application URL; it must exactly match the Plaid dashboard entry |
| `GOOGLE_CLIENT_ID` | Expected Google token audience at API runtime |
| `REACT_APP_GOOGLE_CLIENT_ID` | Google client ID compiled into the React build |
| `ALLOWED_GOOGLE_EMAILS` | Comma-separated Google accounts permitted to sign in |
| `JWT_SECRET` | Cryptographically random signing secret of at least 32 characters |
| `NODE_ENV` | Set to `production` |

Railway supplies `PORT`; do not hard-code it. `FRONTEND_URL` and `REACT_APP_API_URL` are not required for the same-origin production deployment. `GOOGLE_CLIENT_SECRET` is not required by this browser-issued ID-token flow and must never be exposed through a `REACT_APP_*` variable.

### Transitional Netlify frontend

The [current Netlify project](https://app.netlify.com/projects/pshfinances) is connected to the repository root. `netlify.toml` configures `packages/web` as the base, builds and publishes the React app, proxies `/api/*` to Railway, and falls back to `index.html` for client-side routes.

Set `REACT_APP_GOOGLE_CLIENT_ID` in Netlify. Because Create React App embeds it during the build, redeploy after changing it. If the API host changes before cutover, update the proxy target in `netlify.toml`.

### Staging and OAuth

Use a persistent Railway `staging` environment with a stable public domain for end-to-end authentication testing. Railway pull-request environments receive changing domains, while Google OAuth Authorized JavaScript origins must match exactly.

1. Add the staging Railway origin, for example `https://staging.example.up.railway.app`, to the Google OAuth client's **Authorized JavaScript origins**.
2. Set both `GOOGLE_CLIENT_ID` and `REACT_APP_GOOGLE_CLIENT_ID` to that client ID in staging.
3. Set a staging-only `JWT_SECRET` and the intended `ALLOWED_GOOGLE_EMAILS`.
4. Add the exact staging URL to Plaid's allowed redirect URIs and set `PLAID_REDIRECT_URI` to it.
5. Redeploy after changing any `REACT_APP_*` variable.

Do not add every ephemeral pull-request domain to the production OAuth client. PR environments can still validate builds, health checks, database connectivity, and non-OAuth routes.

### Cutover checklist

Merging the repository changes does not mean production has already moved.

1. Point the Railway application service at the repository root and confirm it uses the root `railway.toml`.
2. Connect the existing Railway PostgreSQL service through a `DATABASE_URL` reference. Do not create or migrate to a second production database.
3. Configure the required variables in a persistent staging environment and deploy there first.
4. Verify `/`, a direct client-route refresh, static assets, `/api/health`, an unknown `/api/*` JSON 404, Google sign-in, allowlist rejection, Plaid Link, sync, balances, liabilities, and trends.
5. Configure the production Railway domain in Plaid and Google before directing users to it.
6. Deploy the combined service to production and repeat the smoke tests.
7. Keep the Netlify site available until the Railway deployment has been stable and financial data operations have been verified.
8. In a later cleanup PR, remove `netlify.toml`, disconnect Netlify deploys, and update any custom DNS.

### Rollback

This hosting change does not alter the database schema or move PostgreSQL, so rollback is limited to application routing:

1. Direct users back to the last known-good Netlify production deploy.
2. Restore the previous Railway API-only deployment if the combined service is unhealthy.
3. Restore the Netlify and API origins in Plaid and Google configuration if they were removed during cutover.
4. Leave the existing Railway PostgreSQL service and its data in place.

## Project structure

```text
personal-finance-tracker/
├── package.json                         # Workspace build, start, and test scripts
├── docker-compose.yml                   # Local PostgreSQL 16
├── init.sql                             # Initial local database bootstrap
├── netlify.toml                         # Transitional web build, proxy, and SPA routing
├── railway.toml                         # Combined Railway application and health check
└── packages/
    ├── api/
    │   ├── src/
    │   │   ├── accounts/                # Institutions, accounts, liabilities
    │   │   ├── auth/                    # Google verification, allowlist, and JWT auth
    │   │   ├── database/
    │   │   │   ├── entities/            # TypeORM persistence model
    │   │   │   └── migrations/          # Versioned PostgreSQL schema
    │   │   ├── networth/                # Snapshots, history, and trends
    │   │   ├── plaid/                   # Plaid integration and sync
    │   │   ├── transactions/            # Queries and aggregates
    │   │   ├── app.module.ts            # Application composition and database config
    │   │   ├── main.ts                  # API bootstrap and /api prefix
    │   │   └── web.module.ts             # React static serving and SPA fallback
    │   ├── test/                         # Combined route/static-serving checks
    │   └── package.json
    └── web/
        ├── public/
        ├── src/
        │   ├── components/              # Shared account and Plaid Link UI
        │   ├── context/                 # Authentication state
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
| `npm start` | Start the built combined production application |
| `npm test` | Build both workspaces and verify API/static route separation |
| `npm run db:start` | Start local PostgreSQL |
| `npm run db:stop` | Stop local PostgreSQL |
| `npm run db:reset` | Delete the local database volume and recreate PostgreSQL |

## Continuous integration

GitHub Actions runs a clean `npm ci` install and builds both workspaces for pull requests targeting `main` and pushes to `main`.

## API endpoints

All endpoints are prefixed with `/api`. Google login and the health check are public. All finance endpoints and `/auth/me` require the JWT returned by `/auth/google`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Report API and database health |
| `POST` | `/auth/google` | Exchange an allowlisted Google ID token for an application JWT |
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
- **Target deployment**: one Railway application service plus Railway PostgreSQL
- **Transition**: Netlify frontend proxying to the Railway API until cutover
