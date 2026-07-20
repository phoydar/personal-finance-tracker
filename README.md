# Personal Finance Tracker

A personal finance application that connects to bank and credit-card accounts through Plaid and tracks accounts, transactions, income, spending, liabilities, and net worth.

## Deployment status

The repository is configured for the target single-service Railway architecture, but the production cutover from Netlify has not happened yet.

- [Current Railway project](https://railway.com/project/1fd1d53d-1905-430c-b0fe-1f9d1c8279f8): API and PostgreSQL today; target host for the combined application
- [Current Netlify project](https://app.netlify.com/projects/pshfinances): production frontend during the transition

`netlify.toml` remains in the repository so the existing frontend can continue to deploy until the combined Railway service is smoke-tested and intentionally cut over. Do not remove the Netlify project or configuration as part of an ordinary Railway deploy.

## Architecture

### Target production architecture

```text
Browser
  |
  | HTTPS (one Railway domain)
  v
NestJS application service
  |-- /api/*          API controllers
  |-- /api/health     Railway health check
  `-- /*              React static files and SPA fallback
          |
          v
Railway PostgreSQL service

NestJS API ----> Plaid API
```

Both applications live in this npm workspace monorepo:

- `packages/web`: React frontend. Its production build is written to `packages/web/build`.
- `packages/api`: NestJS API. In production it serves the React build as well as the `/api` routes.
- Railway PostgreSQL remains a separate database service connected through `DATABASE_URL`.

The root `npm run build` command builds both workspaces. Railway then runs `npm start` from the repository root. The browser uses same-origin `/api` requests in production, so `REACT_APP_API_URL` should be unset.

The SPA fallback explicitly excludes `/api/*`. A browser refresh on a client route such as `/accounts` receives `index.html`, while an unknown API route remains a JSON 404.

### Current transitional architecture

Until cutover, Netlify serves the React build and proxies `/api/*` to the existing Railway API. This transitional path is defined in `netlify.toml` and can also be used for rollback.

## Prerequisites

- Node.js 18 or newer (Railway and Netlify use Node.js 20)
- Docker for local PostgreSQL
- [Plaid API credentials](https://dashboard.plaid.com/team/keys)

## Local development

1. Install dependencies from the repository root:

   ```bash
   npm install
   ```

2. Start PostgreSQL on port 5433:

   ```bash
   npm run db:start
   ```

3. Copy `packages/api/.env.example` to `packages/api/.env` and set the local API values:

   ```env
   DATABASE_URL=postgresql://finance:finance_local@localhost:5433/finance_tracker
   PLAID_CLIENT_ID=your_client_id
   PLAID_SECRET=your_secret
   PLAID_ENV=sandbox
   PLAID_REDIRECT_URI=http://localhost:3000/
   FRONTEND_URL=http://localhost:3000
   PORT=3001
   NODE_ENV=development
   ```

4. Leave `REACT_APP_API_URL` unset. The React development server proxies `/api` to `http://localhost:3001`.

5. Start both development servers:

   ```bash
   npm run dev
   ```

   - React: <http://localhost:3000>
   - NestJS API: <http://localhost:3001/api>
   - Health check: <http://localhost:3001/api/health>

## Railway configuration

Configure the application service in the [current Railway project](https://railway.com/project/1fd1d53d-1905-430c-b0fe-1f9d1c8279f8) with the repository root (`/`) as its source root. Railway reads `railway.toml`, runs the root build, starts the combined app with `npm start`, and checks `/api/health`.

Keep PostgreSQL as a separate Railway service and reference its connection variable from the application service.

### Required application variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Railway PostgreSQL connection; use a Railway variable reference rather than copying the value |
| `PLAID_CLIENT_ID` | Plaid client identifier |
| `PLAID_SECRET` | Plaid secret for the selected environment |
| `PLAID_ENV` | Plaid environment, normally `production` after cutover |
| `PLAID_REDIRECT_URI` | Public Railway application URL, including the expected trailing slash |
| `NODE_ENV` | Set to `production` |

Railway supplies `PORT`; do not hard-code it. `FRONTEND_URL` and `REACT_APP_API_URL` are not required for the same-origin production deployment.

When Google authentication is merged, the combined Railway build/runtime also requires:

| Variable | Scope | Purpose |
| --- | --- | --- |
| `GOOGLE_CLIENT_ID` | API runtime | Expected Google token audience |
| `REACT_APP_GOOGLE_CLIENT_ID` | Web build | Google Identity Services client ID compiled into React |
| `JWT_SECRET` | API runtime | Strong, randomly generated signing secret |

`GOOGLE_CLIENT_SECRET` is not required by the browser-issued ID-token flow currently proposed for this application. Never expose secrets through a `REACT_APP_*` variable.

## Staging and OAuth

Use a persistent Railway `staging` environment with a stable public domain for end-to-end authentication testing. Railway pull-request environments receive changing domains, while Google OAuth Authorized JavaScript origins must match exactly.

For staging:

1. Add the staging Railway origin, for example `https://staging.example.up.railway.app`, to the Google OAuth client's **Authorized JavaScript origins**.
2. Set both `GOOGLE_CLIENT_ID` and `REACT_APP_GOOGLE_CLIENT_ID` to that client ID in the staging Railway environment.
3. Set a staging-only `JWT_SECRET`.
4. Add the staging URL to Plaid's allowed redirect URIs and set `PLAID_REDIRECT_URI` to the exact value.
5. Redeploy after changing any `REACT_APP_*` variable because Create React App embeds those values at build time.

Do not add every ephemeral pull-request domain to the production OAuth client. PR environments can still validate builds, health checks, database connectivity, and non-OAuth routes.

## Cutover and rollback

The hosting change should be released deliberately; merging this code does not mean production has already moved.

### Cutover checklist

1. Point the Railway application service at the repository root and confirm it uses the root `railway.toml`.
2. Connect the existing Railway PostgreSQL service through a `DATABASE_URL` reference. Do not create or migrate to a second production database.
3. Configure the required variables in a persistent staging environment and deploy there first.
4. Verify `/`, a direct client-route refresh, static assets, `/api/health`, an unknown `/api/*` JSON 404, Plaid Link, sync, and authentication when present.
5. Configure the production Railway domain in Plaid and Google before directing users to it.
6. Deploy the combined service to production and repeat the smoke tests.
7. Keep the Netlify site available until the Railway deployment has been stable and data operations have been verified.
8. In a later cleanup PR, remove `netlify.toml`, disconnect Netlify deploys, and update any custom DNS.

### Rollback

This change does not alter the database schema or move PostgreSQL, so rollback is limited to application routing:

1. Direct users back to the last known-good Netlify production deploy.
2. Restore the previous Railway API-only deployment if the combined service itself is unhealthy.
3. Restore the Netlify and API origins in Plaid/Google configuration if they were removed during cutover.
4. Leave the existing Railway PostgreSQL service and its data in place.

## Project structure

```text
personal-finance-tracker/
├── package.json                 Workspace build, start, and test scripts
├── railway.toml                 Combined Railway application service
├── netlify.toml                 Transitional frontend deployment
├── docker-compose.yml           Local PostgreSQL
└── packages/
    ├── api/
    │   ├── src/
    │   │   ├── accounts/
    │   │   ├── database/
    │   │   ├── networth/
    │   │   ├── plaid/
    │   │   ├── transactions/
    │   │   └── web.module.ts    Static React serving and SPA fallback
    │   └── test/
    └── web/
        ├── public/
        └── src/
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the API and React development server |
| `npm run dev:api` | Start only the API in watch mode |
| `npm run dev:web` | Start only the React development server |
| `npm run build` | Build the API and production React assets |
| `npm start` | Start the built combined production application |
| `npm test` | Build both workspaces and verify API/static route separation |
| `npm run db:start` | Start local PostgreSQL |
| `npm run db:stop` | Stop local PostgreSQL |
| `npm run db:reset` | Recreate the local database and delete its data |

## API endpoints

| Endpoint | Method | Description |
| --- | --- | --- |
| `/api/health` | GET | Health check |
| `/api/create_link_token` | GET | Create a Plaid Link token |
| `/api/exchange_public_token` | POST | Exchange a Plaid public token |
| `/api/items` | GET | List linked institutions |
| `/api/items/:id` | DELETE | Remove an institution |
| `/api/accounts` | GET | List accounts |
| `/api/accounts/:id` | PATCH | Update an account name |
| `/api/liabilities` | GET | List liabilities |
| `/api/transactions` | GET | List transactions with filters |
| `/api/spending_by_category` | GET | Summarize spending by category |
| `/api/income` | GET | Summarize income |
| `/api/sync` | POST | Sync transactions from Plaid |
| `/api/refresh_balances` | POST | Refresh account balances |
| `/api/sync_liabilities` | POST | Sync liabilities |
| `/api/networth` | GET | Get current net worth |
| `/api/networth/history` | GET | Get net-worth history |
| `/api/networth/snapshot` | POST | Save a net-worth snapshot |
| `/api/trends/composition` | GET | Get net-worth composition trends |
| `/api/trends/accounts` | GET | Get account balance trends |

## Tech stack

- React, React Router, Recharts, and react-plaid-link
- NestJS, TypeORM, and the Plaid Node SDK
- PostgreSQL
- Railway application service and Railway PostgreSQL
