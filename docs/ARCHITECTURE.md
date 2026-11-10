# System Architecture & Technical Specifications
## PharmaCore ERP — Pharmacy Management System

### 1. High-Level Modular Monolith Architecture

The system is constructed as a clean, modular monolith separating the user presentation layer, business rules & transaction management layer, and database persistence layer.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER (React 18 + Vite)                  │
│                                                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │ Dashboard    │  │ POS Billing  │  │ Inventory    │  │ Reports    │  │
│  │ (KPIs/Alerts)│  │ (FEFO/Cart)  │  │ (Batches)    │  │ (Reconcile)│  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └─────┬──────┘  │
│         └─────────────────┴────────┬────────┴────────────────┘         │
│                                    ▼                                   │
│                 Axios Client + JWT Bearer Interceptors                 │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ HTTP / REST API (Port 5001)
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        API & BUSINESS LOGIC LAYER                      │
│                           (Express + TypeScript)                       │
│                                                                        │
│  [Auth Middleware (JWT Verify)] ──► [Server-side RBAC (Role Enforce)]  │
│                                  │                                     │
│  ┌───────────────────────────────┴──────────────────────────────┐      │
│  ▼                                                              ▼      │
│  Controllers (Auth, Medicine, Sale, Batch, Return, Report)             │
│  │                                                                     │
│  ▼                                                                     │
│  Services (FefoService, SaleService, InventoryService, ReportService)  │
│  • FEFO Batch Sorting & Stock Allocation Algorithm                     │
│  • Expired Batch Safety Validator (Blocks Sales where Expiry <= Today) │
│  • Negative Stock Invariant Guard (Rejects deltas where stock < 0)     │
│  • Mandatory Reason Validator for Returns & Adjustments                │
│  • Double-entry Stock Movement Ledger Writer                           │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ Prisma Client (ACID Transactions)
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         PERSISTENCE LAYER (SQLite)                     │
│                                                                        │
│  • SQLite Single-File Engine (pharmacy.db) with WAL Journal Mode       │
│  • ACID Compliant Transactions via `prisma.$transaction()`             │
│  • Granular Batch Tables with Composite Unique & Expiry Indexes        │
│  • Complete Stock Movement Audit Ledger Table                          │
└────────────────────────────────────────────────────────────────────────┘
```

---

### 2. FEFO (First-Expiry-First-Out) Dispensing Flow

When a cashier or pharmacist enters a sale at the Point of Sale (POS), the system guarantees that medication is dispensed strictly from the earliest-expiring active batch:

```mermaid
sequenceDiagram
    autonumber
    actor Cashier as Cashier / Pharmacist
    participant UI as POS Billing Screen
    participant API as Sale Controller
    participant FEFO as FefoService
    participant TX as Prisma $transaction
    participant DB as SQLite Database

    Cashier->>UI: Select Medicine (e.g., Dolo 650mg, Qty: 5)
    UI->>API: POST /api/sales { items: [{ medicineId, quantity: 5 }] }
    API->>FEFO: allocateFefo(medicineId, 5)
    FEFO->>DB: Query batches WHERE medicineId AND quantity > 0 AND expiryDate > now() ORDER BY expiryDate ASC
    DB-->>FEFO: Returns Batch A (Exp: 25 days, Qty: 80), Batch B (Exp: 500 days, Qty: 350)
    FEFO-->>API: Allocates 5 units to Batch A (Earliest Expiry)

    API->>TX: Begin Atomic Transaction
    TX->>DB: Lock Batch A record
    TX->>TX: Check: Expiry > now() AND currentQty (80) >= requested (5)
    TX->>DB: UPDATE Batch A SET quantity = 75
    TX->>DB: INSERT Sale (Invoice INV-YYYYMMDD-XXXX, Subtotal, Tax, Total)
    TX->>DB: INSERT SaleItem (Medicine, Batch A, Qty: 5, Price: 32)
    TX->>DB: INSERT StockMovement (SALE, Delta: -5, BalanceAfter: 75, Reason: "Sale INV-...")
    TX->>DB: Commit Transaction
    DB-->>API: Sale Committed with All Line Items
    API-->>UI: HTTP 201 Created (Sale Data)
    UI-->>Cashier: Display Invoice Print Modal & Thermal Receipt
```

---

### 3. Concurrency, Race Condition & Negative Stock Protection

#### Problem:
In high-throughput pharmacies, two cashiers at different terminals might attempt to sell the last 10 units of an antibiotic simultaneously. A naive implementation without transaction isolation would allow both sales to proceed, causing stock to silently drop to $-10$.

#### Solution Implemented:
1. **Prisma `$transaction` Wrapper**: All stock deductions (sales, breakage disposals, audit write-offs) are executed inside an atomic database transaction.
2. **Pre-check inside Transaction**: Within the transaction boundary, the current batch row is freshly queried:
   ```typescript
   const currentBatch = await tx.batch.findUnique({ where: { id: batchId } });
   if (currentBatch.quantity < deductionQuantity) {
     throw new Error(`Insufficient stock for batch ${currentBatch.batchNumber}. Available: ${currentBatch.quantity}, Required: ${deductionQuantity}`);
   }
   ```
3. **Application Invariant Guard**:
   If `currentBatch.quantity - deductionQuantity < 0`, the transaction is immediately aborted and rolled back. SQLite rolls back the dirty write, ensuring stock **never silently or explicitly becomes negative**.

---

### 4. Role-Based Access Control (RBAC) Matrix

| Endpoint / Action | Minimum Required Role | ADMIN | PHARMACIST | CASHIER |
|:---|:---|:---:|:---:|:---:|
| User Login (`/api/auth/login`) | Any Active Staff | ✅ | ✅ | ✅ |
| Current Profile (`/api/auth/me`) | Any Active Staff | ✅ | ✅ | ✅ |
| Create User Account (`/api/auth/register`) | `ADMIN` | ✅ | ❌ | ❌ |
| Browse Medicines & Batches (`/api/medicines`, `/api/batches`) | Any Active Staff | ✅ | ✅ | ✅ |
| Add/Edit Medicine Catalogue | `ADMIN`, `PHARMACIST` | ✅ | ✅ | ❌ |
| Create Batch Manually (`/api/batches`) | `ADMIN`, `PHARMACIST` | ✅ | ✅ | ❌ |
| Create Point-of-Sale Sale (`/api/sales`) | `ADMIN`, `PHARMACIST`, `CASHIER` | ✅ | ✅ | ✅ |
| View & Reprint Invoices (`/api/sales/:id`) | `ADMIN`, `PHARMACIST`, `CASHIER` | ✅ | ✅ | ✅ |
| Ingest Supplier Purchase Orders (`/api/purchases`) | `ADMIN`, `PHARMACIST` | ✅ | ✅ | ❌ |
| Record Returns & Adjustments (`/api/returns/adjust`) | `ADMIN`, `PHARMACIST` | ✅ | ✅ | ❌ |
| View Stock Movement Audit Ledger (`/api/audit`) | `ADMIN`, `PHARMACIST` | ✅ | ✅ | ❌ |
| View Inventory Reconciliation Report (`/api/reports/reconciliation`) | `ADMIN`, `PHARMACIST` | ✅ | ✅ | ❌ |
| View Financial Valuation Report (`/api/reports/valuation`) | `ADMIN`, `PHARMACIST` | ✅ | ✅ | ❌ |
| Manage Suppliers (`/api/suppliers`) | `ADMIN`, `PHARMACIST` | ✅ | ✅ | ❌ |

---

### 5. API Documentation & OpenAPI Specification

The backend serves an interactive OpenAPI 3.0 / Swagger UI documentation explorer directly at:
```
http://localhost:5001/api-docs
```
Reviewers can test each API endpoint interactively using the pre-seeded JWT tokens.
