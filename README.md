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

## Tech Stack

- **Backend**: Node.js, Express, MongoDB (Mongoose), JWT, bcrypt
- **Frontend**: React (Vite), React Router, Axios, Recharts

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
- Node.js 18+
- MongoDB running locally (or a MongoDB Atlas connection string)

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# edit .env if your Mongo URI / JWT secret differ from defaults
npm run seed      # optional: creates demo users, suppliers, drugs, batches
npm run dev        # starts on http://localhost:5000
```

Seeded demo logins (after `npm run seed`):
- `admin@example.com` / `password123` (admin)
- `pharmacist@example.com` / `password123` (pharmacist)

Public registration only allows Pharmacist and Supplier accounts. Do not run the
demo seed script against a public production database; it creates accounts with
known demo passwords.

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
  drug's batches by `expiryDate` ascending and deducts from the
  soonest-to-expire batch first — this is standard pharma inventory practice
  and a good talking point for why this isn't just generic CRUD.
- **Batch uniqueness**: `{ drug, batchNumber }` is a compound unique index —
  a supplier's batch number is unique per drug, not globally.
- **Role-based access**: `admin` can delete records; `admin`/`pharmacist` can
  create/edit; `supplier` is read-mostly (extend as needed for your use case).
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
| POST | `/api/orders/purchase` | Create a purchase order |
| POST | `/api/orders/:id/receive` | Convert a purchase order into batches |
| POST | `/api/orders/dispatch` | Dispatch stock to a buyer (FEFO deduction) |
| GET | `/api/dashboard` | Aggregated stats for the dashboard |

## Possible Extensions

- Barcode/QR scanning for batches
- Email/SMS notifications for expiry and low-stock alerts
- Multi-warehouse transfer orders
- PDF invoice generation for dispatch orders
