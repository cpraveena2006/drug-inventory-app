# Architecture

## System

```mermaid
flowchart LR
  Browser[React + Vite] -->|JWT / JSON| API[Express API]
  API --> Auth[Auth / RBAC / Zod]
  Auth --> Controllers[Thin route controllers]
  Controllers --> Services[Inventory / incident / expiry services]
  Services --> Mongo[(MongoDB standalone)]
  Services --> Mail[Optional SMTP]
  Services --> Audit[AuditLog + Notification]
  Cron[node-cron 08:00] --> Services
```

## Core data model

```mermaid
erDiagram
  USER }o--|| SUPPLIER : "supplier role links to"
  DRUG ||--o{ BATCH : contains
  SUPPLIER ||--o{ BATCH : supplies
  ORDER ||--o{ BATCH : "purchase order"
  ORDER ||--|{ ORDER_ITEM : contains
  BATCH ||--o{ ORDER_ITEM : dispatched-from
  DRUG ||--o{ INCIDENT : affects
  BATCH ||--o{ INCIDENT : traceability
  SUPPLIER ||--o{ INCIDENT : notified
  DRUG_REQUEST ||--o{ SUPPLIER_INQUIRY : sourced-by
  SUPPLIER_INQUIRY ||--o{ SUPPLIER_RESPONSE : collects
  SUPPLIER ||--o{ SUPPLIER_RESPONSE : answers
  SUPPLIER ||--o{ NOTIFICATION : receives
  USER ||--o{ AUDIT_LOG : performs
```

## Dispatch to supplier notification

```mermaid
sequenceDiagram
  participant P as Pharmacist
  participant API as Express API
  participant S as Dispatch service
  participant DB as MongoDB
  participant I as Incident / notification service
  P->>API: POST /orders/dispatch
  API->>S: Validate and allocate FEFO batches
  loop For each FEFO batch
    S->>DB: findOneAndUpdate with stock >= quantity; decrement
  end
  S->>DB: Create dispatch order
  S->>DB: Aggregate remaining sellable stock
  alt Stockout or low stock
    S->>I: Create deduplicated incident
    I->>DB: Save incident and in-app notification
    I->>I: Attempt optional supplier email
  end
  S-->>API: Order and allocations
  API-->>P: 201 response
```

The implementation does not use multi-document transactions, so it conditionally
decrements each batch and compensates already-applied decrements if later work
fails. This is suitable for the project's standalone MongoDB setup.

## Customer demand to purchase-order draft

```mermaid
sequenceDiagram
  participant P as Pharmacist
  participant API as Express API
  participant DB as MongoDB
  participant S as Supplier portal
  P->>API: POST /requests
  API->>DB: Increment matching open request or create it
  P->>API: POST /inquiries with supplier IDs
  API->>DB: Create inquiry with pending supplier responses
  API->>DB: Create supplier notifications
  S->>API: POST /inquiries/:id/respond
  API->>DB: Update only this supplier's response
  P->>API: POST /inquiries/:id/choose
  API->>DB: Close inquiry and mark request sourced
  API-->>P: Prefilled purchase-order payload
```
