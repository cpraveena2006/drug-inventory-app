# API Reference

Base URL: `http://localhost:5000/api`. Except for `/auth/register`, `/auth/login`,
`/health`, and `/docs`, API endpoints require `Authorization: Bearer <JWT>`.
Errors use `{ "message": "...", "code": "..." }`, with optional `details`.

## Authentication and health

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/auth/register` | Public | Creates a pharmacist account; client-supplied roles are ignored |
| POST | `/auth/login` | Public | Returns a JWT and safe user profile |
| GET | `/auth/me` | Authenticated | Returns the current user |
| GET | `/health` | Public | Returns uptime and database connection state |
| GET | `/docs` | Public | Swagger UI |
| GET | `/docs.json` | Public | OpenAPI JSON |

## Inventory and orders

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET/POST | `/drugs` | Authenticated / Admin, Pharmacist | List and create drugs |
| GET/PUT/DELETE | `/drugs/:id` | Authenticated / Admin, Pharmacist / Admin | Read, update, and soft-delete |
| PATCH | `/drugs/:id/restore` | Admin | Restore soft-deleted drug |
| GET | `/drugs/:id/insights` | Admin, Pharmacist | Purchase, dispatch, quality, demand, and supplier statistics |
| GET/POST | `/batches` | Authenticated / Admin, Pharmacist | List batches and receive stock |
| GET/PUT/DELETE | `/batches/:id` | Authenticated / Admin, Pharmacist / Admin | Read, update, and soft-delete |
| PATCH | `/batches/:id/restore` | Admin | Restore soft-deleted batch |
| GET | `/batches/:id/details` | Authenticated | Batch quantity breakdown and traceability |
| POST | `/batches/:id/report-damage` | Admin, Pharmacist | Atomically reduce stock, create an incident, and notify the supplier |
| PATCH | `/batches/:id/quality` | Admin, Pharmacist | Save rating, notes, and quality tags |
| GET | `/batches/alerts/expiry` | Authenticated | Expired and near-expiry stock |
| GET | `/batches/alerts/low-stock` | Authenticated | Low-stock alerts |
| POST | `/orders/purchase` | Admin, Pharmacist | Create a purchase order |
| POST | `/orders/:id/receive` | Admin, Pharmacist | Receive a purchase order as batches |
| POST | `/orders/dispatch` | Admin, Pharmacist | FEFO dispatch with conditional atomic batch decrements |
| GET | `/orders`, `/orders/:id` | Authenticated | List and read orders; suppliers see only their own |

The drug, batch, supplier, and order list endpoints accept `page` and `limit`
for server-side pagination (`limit` is capped at 100). They return
`{ "items": [], "pagination": { "page": 1, "limit": 25, "total": 0, "pages": 0 } }`
when pagination is requested; omitting both parameters retains the legacy array
response. `search` is server-side on these lists. Drugs also accept `category`,
batches accept `expiryState=active|expiringSoon|expired`, and orders accept
`orderType=purchase|dispatch`.

## Incidents, notifications, and demand

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET/POST | `/incidents` | Authenticated / Admin, Pharmacist | Filter incidents or create a manual incident |
| GET | `/incidents/:id` | Authenticated | Read a supplier-scoped incident |
| PATCH | `/incidents/:id/status` | Admin, Pharmacist | Update incident status |
| POST | `/incidents/:id/notify` | Admin, Pharmacist | Re-send the supplier notification |
| POST | `/incidents/:id/respond` | Supplier | Acknowledge and respond to an owned incident |
| GET | `/notifications` | Authenticated | List recipient-scoped notifications |
| GET | `/notifications/unread-count` | Authenticated | Get unread count |
| PATCH | `/notifications/:id/read`, `/notifications/read-all` | Authenticated | Mark notifications read |
| POST/GET | `/requests` | Admin, Pharmacist | Log and list customer requests |
| GET | `/requests/:id` | Admin, Pharmacist | Read request entries |
| PATCH | `/requests/:id/status` | Admin, Pharmacist | Update demand request status |
| GET | `/requests/analytics/top-demand?days=30` | Admin, Pharmacist | Top requested unavailable drugs, 30 or 90 days |
| POST/GET | `/inquiries` | Admin, Pharmacist | Request quotes from multiple suppliers and list inquiries |
| POST | `/inquiries/:id/respond` | Supplier | Submit an availability and price response |
| POST | `/inquiries/:id/choose` | Admin, Pharmacist | Select an available supplier and return a purchase-order draft |
| GET | `/portal/inbox` | Supplier | Read own inquiries, incidents, notifications, and batches |

## Reporting and administration

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/suppliers` | Authenticated | List suppliers; supplier users receive only their own record |
| GET | `/suppliers/:id/scorecard` | Authenticated | Supplier scorecard; supplier users are forced to their own ID |
| GET | `/suppliers/leaderboard` | Authenticated | Reliability ranking; supplier users see their own score only |
| GET | `/reports/reorder-suggestions` | Admin, Pharmacist | Stock suggestions and best available supplier |
| GET | `/audit-logs` | Admin | Filtered, paginated audit history |
| GET/POST | `/users` | Admin | List and create users |
| PATCH | `/users/:id` | Admin | Update profile, role, supplier link, or active state |
| POST | `/jobs/run-expiry-check` | Admin | Run the expiry job on demand |

Query filters and pagination are available on incident, request, and audit lists.
The server validates mutation payloads with Zod and enforces role/supplier scope
regardless of frontend visibility.
