# Drug Inventory & Supply Chain Tracking App

A full-stack MERN application for tracking pharmaceutical inventory across
suppliers, batches, and orders — built for a Full Stack Development subject.

## Features

- **Role-based auth** (JWT): Admin, Pharmacist, Supplier roles
- **Drug catalog**: CRUD with category, manufacturer, unit price, reorder threshold
- **Batch tracking**: batch number, manufacture/expiry dates, warehouse location,
  full traceability from supplier → batch → dispatch
- **Expiry alerts**: batches expiring within N days, and expired stock still on shelf
- **Low-stock alerts**: drugs at or below their reorder threshold
- **Purchase orders**: order stock from a supplier, then "receive" it into new batches
- **Dispatch orders**: send stock to a buyer, auto-deducted using FEFO
  (first-expiry-first-out) allocation across batches
- **Audit log**: every create/update/delete/dispatch is recorded with the acting user
- **Dashboard**: stock value, unit counts, expiry/low-stock counts, category
  breakdown pie chart, orders-by-status bar chart
- **Advanced workflows**: supplier portal and scorecards, stock incidents,
  expiry notifications, customer demand requests, supplier inquiries, and
  demand/reorder insights
- **Operations tools**: searchable paginated lists, saved filters, CSV exports,
  printable dispatch invoices, user management, and audit history

## Tech Stack

- **Backend**: Node.js, Express, MongoDB (Mongoose), JWT, bcrypt
- **Frontend**: React (Vite), React Router, Axios, Recharts, Lucide, Inter, React Hot Toast

## Frontend UI

The frontend uses a responsive pharmacy operations workspace with inventory alerts,
role-aware actions, and local Inter font assets. Pharmaceutical illustrations are
custom inline SVG/CSS artwork; no external image assets are used or hotlinked.
**Image credit:** Original MediStock capsule and medicine-bottle illustrations;
no third-party photographs.

## Project Structure

```
drug-inventory-app/
├── backend/
│   ├── config/db.js
│   ├── models/            # User, Drug, Supplier, Batch, Order, AuditLog
│   ├── middleware/         # auth (JWT), role (RBAC)
│   ├── controllers/
│   ├── routes/
│   ├── utils/              # generateToken, logAction, seed.js
│   └── server.js
└── frontend/
    ├── src/
    │   ├── api/axios.js
    │   ├── context/AuthContext.jsx
    │   ├── components/     # Navbar, ProtectedRoute
    │   └── pages/          # Login, Register, Dashboard, Drugs, Batches, Suppliers, Orders
    └── index.html
```

## Setup

### Prerequisites
- Node.js 18.11+ (the backend dev script uses Node's built-in file watcher)
- MongoDB running locally (or a MongoDB Atlas connection string)

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# edit .env if your Mongo URI / JWT secret differ from defaults
npm run seed      # WARNING: clears and rebuilds all app data with base demo records
npm run seed:sample # adds sample inventory, incidents, unavailable-drug requests, supplier replies, and dispatch history
npm run dev        # starts on http://localhost:5000
```

Seeded demo logins (after `npm run seed`):
- `admin@example.com` / `password123` (admin)
- `pharmacist@example.com` / `password123` (pharmacist)

Public registration creates Pharmacist accounts only. Never run `npm run seed`
against production: it deletes existing application data and creates accounts
with published demo passwords. `npm run seed:sample` adds fictional inventory
and order examples; use it only in an isolated demo database, not real stock.

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env   # defaults to http://localhost:5000/api, adjust if needed
npm run dev             # starts on http://localhost:5173
```

Open http://localhost:5173 and log in.

## Key Design Notes (useful for your project report/viva)

- **FEFO dispatch**: `createDispatchOrder` in `orderController.js` sorts a
  drug's active, unexpired batches by `expiryDate` ascending and deducts from
  the soonest-to-expire batch first — this is standard pharma inventory practice
  and a good talking point for why this isn't just generic CRUD.
- **Demand forecast**: `GET /api/dashboard/demand` estimates average daily and
  30-day medicine demand from dispatch orders in the previous 30 days, compares
  it with sellable stock, and suggests a reorder amount allowing for a 7-day
  supplier lead time. It is a planning estimate, not a stockout guarantee.
- **Safe sample data**: `npm run seed:sample` is additive and repeatable; it
  requires an existing active pharmacist or admin, then adds inventory,
  expiry/stock alerts, incident examples, unavailable-drug requests with
  supplier availability replies, and 30-day dispatch history without clearing
  existing records. The original `npm run seed` command clears existing users,
  suppliers, drugs, batches, orders, and audit logs before rebuilding the base
  demo dataset.
- **Batch uniqueness**: `{ drug, batchNumber }` is a compound unique index —
  a supplier's batch number is unique per drug, not globally.
- **Role-based access**: `admin` can delete records; `admin`/`pharmacist` can
  create/edit; `supplier` is read-mostly (extend as needed for your use case).
- **Supplier scoping**: supplier logins are linked to one supplier, and the API
  scopes their batches, incidents, inquiries, notifications, orders, and scorecard.
- **Audit trail**: every mutating action writes to `AuditLog` with the acting
  user, so you can demo "who changed what" traceability.
- **Purchase vs. dispatch orders**: a purchase order has no stock effect until
  you call `POST /orders/:id/receive` (which creates the actual Batch
  documents) — this models the real gap between *ordering* stock and
  *receiving* it.

## API Overview

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login, get JWT |
| GET | `/api/drugs` | List drugs (with live stock totals) |
| POST | `/api/drugs` | Create drug |
| GET | `/api/batches` | List batches (filter by drug/status/expiringWithinDays) |
| POST | `/api/batches` | Receive a new batch |
| GET | `/api/batches/alerts/expiry` | Expiring soon + expired batches |
| GET | `/api/batches/alerts/low-stock` | Drugs at/below reorder threshold |
| GET | `/api/dashboard/demand` | 30-day dispatch demand and stock coverage estimates |
| POST | `/api/orders/purchase` | Create a purchase order |
| POST | `/api/orders/:id/receive` | Convert a purchase order into batches |
| POST | `/api/orders/dispatch` | Dispatch stock to a buyer (FEFO deduction) |
| GET | `/api/dashboard` | Aggregated stats for the dashboard |

## Possible Extensions

- Multi-warehouse transfer orders

## Extended inventory and supplier workflows

The app also supports soft-deleted catalog records, batch quality and damage
tracking, FEFO dispatch with atomic conditional decrements, deduplicated
stock/expiry incidents, supplier in-app/email notifications, customer demand
aggregation, supplier quote inquiries, a supplier portal, drug/batch insights,
supplier reliability scorecards, reorder suggestions, and admin audit/user
pages. The frontend adds React Query caching, detail pages, incident tracking,
notifications, supplier quote responses, and a supplier portal.

Drug, batch, and order lists can be exported as CSV. Dispatch orders can be
printed as an invoice or saved to PDF through the browser print dialog. Named
filters are stored in the current browser, and the light/dark appearance
preference persists locally. Barcode scanning is not included.
Drugs, batches, suppliers, and orders support server-side search and paginated
lists. CSV exports contain the rows on the current page.

The expiry check runs once at backend startup and daily at 08:00 server time.
Admins can also trigger it with `POST /api/jobs/run-expiry-check`. Swagger UI is
available at `/api/docs`; the detailed reference is in [docs/API.md](./docs/API.md).
Architecture and Mermaid diagrams are in [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

## Windows setup and commands

Use a standalone local MongoDB server; multi-document transactions are not
required. Copy `backend/.env.example` to `backend/.env`, then set a private
`JWT_SECRET` with at least 24 characters. For Windows Command Prompt:

```cmd
cd backend
copy .env.example .env
npm install
npm run migrate
npm run seed
npm run dev
```

In another Command Prompt window:

```cmd
cd frontend
copy .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173`. Demo credentials (password `password123`):

- `admin@example.com` — admin management and audit viewer
- `pharmacist@example.com` — pharmacy operations
- `supplier1@example.com` — MedSource Pharma
- `supplier2@example.com` — HealWell Distributors
- `supplier3@example.com` — QualityFirst Medical
- `supplier4@example.com` — ValueMed Wholesale

`npm run seed` clears and recreates demo data. To preserve existing data, use
`npm run migrate` only; it is idempotent and backfills new batch fields and
soft-delete flags. `npm run seed:sample` is additive but creates fictional
records, so reserve it for an isolated demo database.

### Environment variables

| Variable | Required | Purpose |
|---|---:|---|
| `MONGO_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | JWT signing secret, minimum 24 characters |
| `JWT_EXPIRES_IN` | No | Token lifetime; defaults to `7d` |
| `PORT` | No | Backend port; defaults to `5000` |
| `CLIENT_URL` | No | Comma-separated allowed browser origins |
| `NODE_ENV` | No | `development`, `test`, or `production` |
| `LOG_LEVEL` | No | Pino level; defaults by environment |
| `SMTP_HOST`, `SMTP_PORT` | No | SMTP server and port for supplier mail |
| `SMTP_USER`, `SMTP_PASSWORD` | No | Optional SMTP authentication |
| `SMTP_FROM` | No | Sender address; without SMTP, development logs an email preview |
| `BACKUP_DIR` | No | Output root for `npm run backup`; defaults to `backend/backups` |

### Validation and operations

```cmd
cd backend
npm run lint
npm test
npm run test:coverage
npm run migrate
npm run backup
npm start
```

```cmd
cd frontend
npm run lint
npm test
npm run build
```

`npm run backup` requires MongoDB Database Tools (`mongodump`) on `PATH`.
`docker compose up --build` starts MongoDB, the API, and the static frontend;
set `JWT_SECRET` in the shell first. Import the collection at
[docs/postman_collection.json](./docs/postman_collection.json).

## API overview additions

See the [complete API reference](./docs/API.md). New endpoint groups include:
`/api/incidents`, `/api/notifications`, `/api/requests`,
`/api/requests/analytics/top-demand`, `/api/inquiries`, `/api/portal/inbox`,
`/api/drugs/:id/insights`, `/api/batches/:id/details`,
`/api/suppliers/:id/scorecard`, `/api/suppliers/leaderboard`,
`/api/reports/reorder-suggestions`, `/api/users`, `/api/audit-logs`, and
`/api/jobs/run-expiry-check`.
