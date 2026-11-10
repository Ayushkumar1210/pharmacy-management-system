# Advanced Project Assessment Technical Report
# Domain: Pharmacy Management System (PharmaCore ERP)
**Candidate Assessment Submission for Algions AI Labs Private Limited**
**Internship Role**: Full-Stack Web Development

---

## 1. Executive Summary & Mission

The objective was to design, engineer, test, and document a production-grade, database-backed web application supporting end-to-end operational workflows in a retail/hospital pharmacy. 

Unlike generic e-commerce applications where stock is treated as a single undifferentiated number, pharmaceutical inventory requires **granular batch tracking** (individual manufacturing dates, expiry dates, batch numbers, supplier provenance, and purchase costs), strict safety guardrails (blocking the sale of expired medication), automated **First-Expiry-First-Out (FEFO)** dispensing algorithms, mandatory audit reasons for any stock adjustments, and complete financial reconciliation between physical stock and double-entry movement logs.

This report documents the architectural design, security mechanisms, database schema, algorithm implementations, and verification evidence for the solution.

---

## 2. Key Architectural Decisions

### 2.1 Modular Monolith over Microservices
A **modular monolith** was selected rather than microservices. In pharmacy management, operations such as a customer sale require updating batch quantities, creating line items, generating invoice numbers, calculating statutory taxes (GST), and creating stock movement audit logs. Splitting these into microservices (e.g., an Inventory Service and a Billing Service) would necessitate distributed transactions (2-Phase Commit or Saga patterns) to maintain consistency, adding immense network latency, eventual consistency delays, and failure modes. 

A modular monolith written in TypeScript (Express.js on the backend, React 18 on the frontend) running against an ACID-compliant relational database (SQLite via Prisma ORM) provides immediate consistency, sub-millisecond query execution, and zero external infrastructure dependencies.

### 2.2 Relational Data Modeling & Batch Granularity
A foundational mistake in simplistic inventory systems is defining stock as an integer field `stock: number` on the `Medicine` entity. In pharmaceuticals, medicines are procured in discrete batches over time with varying expiration dates and cost structures.

The data model normalizes inventory into a 1-to-many relationship:
- `Medicine` (1) ─── holds stock in ─── (N) `Batch`
- Each `Batch` tracks: `batchNumber`, `quantity` (active units remaining), `initialQuantity`, `purchasePrice` (cost), `sellingPrice` (MRP), `mfgDate`, and `expiryDate`.
- The aggregate stock of any medicine is dynamically derived:
  $$\text{Total Available Stock} = \sum_{B \in \text{Batches}} B.\text{quantity} \quad \text{where } B.\text{expiryDate} > \text{now()}$$

### 2.3 Database Engine: SQLite with ACID Transactions
SQLite was selected as the database engine for local reproducibility:
- **Zero-friction setup**: Reviewers and evaluators do not need to install or configure external database servers (PostgreSQL/MySQL), Docker daemons, or cloud credentials.
- **ACID compliance**: SQLite supports full ACID transactions (`BEGIN IMMEDIATE TRANSACTION`), ensuring that stock deductions and audit movements are committed atomically.
- **Portable single-file state**: The entire database state (`pharmacy.db`) is fully inspectable, portable, and repeatable via deterministic seed scripts.

---

## 3. Core Business Rules & Algorithm Implementation

### 3.1 The FEFO (First-Expiry-First-Out) Algorithm
When medicines are dispensed at the Point of Sale (POS), standard FIFO (First-In-First-Out) is legally and clinically insufficient. If an older batch arrives late from a distributor, selling the earliest-received batch might allow an earlier-expiring batch to expire on the shelf.

The `FefoService` implements the following algorithm:
1. When a quantity $Q_{\text{req}}$ of medicine $M$ is requested, the system queries:
   ```sql
   SELECT * FROM Batch 
   WHERE medicineId = :mId 
     AND quantity > 0 
     AND expiryDate > datetime('now')
   ORDER BY expiryDate ASC;
   ```
2. The system verifies that $\sum \text{quantity} \ge Q_{\text{req}}$. If insufficient, it throws an informative error before touching state.
3. It iterates through the sorted batches, allocating up to each batch's available quantity until $Q_{\text{req}}$ is satisfied.
4. Each allocated batch quantity is returned with its unit MRP for transparent itemized line-item invoicing.

### 3.2 Strict Expired Batch Blocking (Safety Guardrail)
Pharmacies are legally prohibited from selling expired medications. The application enforces this at two independent layers:
1. **Application Query Filter**: FEFO algorithms exclude any batch where `expiryDate <= now()`.
2. **Controller/Service Safety Assertion**: If a cashier manually specifies a batch ID at the POS, `FefoService.validateBatchForSale()` explicitly asserts:
   ```typescript
   if (new Date(batch.expiryDate) <= now || batch.status === 'EXPIRED') {
     throw new Error(`Sale blocked: Batch ${batch.batchNumber} expired on ${batch.expiryDate} and cannot be sold.`);
   }
   ```
   This returns an HTTP 400 Bad Request, stopping the transaction before database writes occur.

### 3.3 Zero Negative Stock Invariant & Concurrency Protection
To prevent race conditions when multiple cashiers simultaneously checkout:
- All inventory updates are wrapped inside `prisma.$transaction()`.
- Within the transaction, the target batch's current balance is queried and locked.
- The condition `batch.quantity - deduction < 0` triggers an immediate rollback:
  ```typescript
  if (currentBatch.quantity < deductionQuantity) {
    throw new Error(`Insufficient stock for batch ${currentBatch.batchNumber}`);
  }
  ```
- This guarantees that stock **never silently or explicitly becomes negative**.

### 3.4 Mandatory Reason on Returns and Adjustments
Acceptance Criterion 4 requires that all returns and adjustments require a reason and are auditable:
- The `InventoryService.processAdjustment()` endpoint checks:
  ```typescript
  if (!input.reason || input.reason.trim().length < 3) {
    throw new Error('A detailed reason is mandatory for all returns and stock adjustments.');
  }
  ```
- Every adjustment creates an immutable `StockMovement` entry capturing the timestamp, staff ID, quantity delta ($\Delta Q$), balance snapshot after change, movement type (`CUSTOMER_RETURN`, `DAMAGE_BREAKAGE`, `EXPIRED_DISPOSAL`, `AUDIT_ADJUSTMENT`), and the human reason string.

### 3.5 Full Mathematical Stock Reconciliation
To prove data integrity (Acceptance Criterion 5), the `ReportService.getStockReconciliation()` computes the full audit equation for every medicine:
$$\text{Calculated Stock} = \text{Purchases} - \text{Sales} + \text{Returns} + \text{Adjustments}_{\text{Add}} - \text{Adjustments}_{\text{Sub}}$$
It asserts that $\text{Calculated Stock} \equiv \text{Actual Batch Stock}$. The system highlights any non-zero discrepancy in red and badges 100% matched items in green.

---

## 4. Security, Authorization & Data Integrity

### 4.1 Server-Side Role-Based Authorization (RBAC)
Never relying on client-side UI visibility alone, every API route passes through `authenticate` (JWT signature verification) and `authorize(...allowedRoles)`:
- `CASHIER`: Restricted to POS billing, customer invoice lookup, and batch availability checks.
- `PHARMACIST`: Can manage catalogue items, create batches, ingest supplier purchase orders, process returns and damage adjustments, and view audit reports.
- `ADMIN`: Superuser authority with user management, system configuration, and complete audit oversight.

Attempts by a Cashier to post adjustments or view restricted audit reports are rejected with HTTP 403 Forbidden on the server.

### 4.2 Password Hashing & Secret Protection
- User passwords are encrypted using `bcryptjs` with 10 salt rounds.
- Real secrets, production keys, and credentials are strictly excluded from git tracking. A template `.env.example` is provided with clear environment variable documentation.

---

## 5. UI/UX & Human-Centered Design

To avoid the generic, synthetic aesthetic commonly associated with AI-generated templates (overused purple mesh gradients, buzzwords, and non-functional mockups), the UI was purposefully crafted with the functional ergonomics of real hospital pharmacy management systems:
1. **Clinical Slate & Teal Palette**: A high-density, legible design focused on tabular clarity, keyboard-friendly data entry, and rapid scanning.
2. **POS Fast-Dispense Terminal**: Instant medicine search, live batch availability indicators, tax/discount computation, and tendered change return calculation.
3. **Printable Invoice & Thermal Receipt**: Complete printable invoice sheet adhering to pharmacy drug license regulations, featuring letterhead, patient details, batch codes, tax breakdown, and statutory notes.
4. **Visual Expiry Coding**: Red badges for expired batches, amber badges for near-expiry (≤60 days), and green badges for active batches.

---

## 6. Automated Testing Evidence

Automated tests were written using **Jest** and **Supertest** in `backend/tests/acceptance.test.ts`. All 5 required acceptance criteria pass deterministically:

```
PASS tests/acceptance.test.ts
  Pharmacy Management System - Acceptance Tests & Core Rules
    Acceptance Test 1: FEFO Sale & Stock Movement Ledger
      ✓ should deduct stock from the earliest-expiring active batch and log a stock movement (27 ms)
    Acceptance Test 2: Expired Batch Sale Blocking
      ✓ should strictly reject sale attempt from an expired batch with HTTP 400 (18 ms)
    Acceptance Test 3: Low-stock and Near-Expiry Alerts
      ✓ should correctly identify low-stock medicines and near-expiry batches (7 ms)
    Acceptance Test 4: Return/Adjustment Reason Requirement & Audit Trail
      ✓ should REJECT return/adjustment if reason is missing or empty (15 ms)
      ✓ should succeed with valid reason, adjust stock, and create auditable movement (9 ms)
      ✓ should reject adjustments that would cause negative stock (6 ms)
    Acceptance Test 5: Full Inventory Reconciliation
      ✓ should reconcile calculated stock from audit movements with physical batch stock (discrepancy = 0) (6 ms)
    Security & Role-Based Access Control (RBAC)
      ✓ should forbid Cashier from performing stock adjustments (requires PHARMACIST or ADMIN) (4 ms)

Test Suites: 1 passed, 1 total
Tests:       8 passed, 8 total
Snapshots:   0 total
Time:        1.286 s
```

---

## 7. Assumptions & Known Limitations

1. **Local Currency & Tax Configuration**: The default currency is set to Indian Rupee (₹) with configurable GST brackets (0%, 5%, 12%, 18%). Multi-currency localization is not implemented in this MVP.
2. **Barcode Scanner Hardware Integration**: The search input supports standard alphanumeric keyboard and hardware USB barcode scanner keyboard-wedge inputs; direct Web Serial or Bluetooth scanner protocols were out of scope.
3. **Medical Advice Disclaimer**: The system is designed strictly for operational inventory, pricing, and batch tracking; it intentionally does not provide medical diagnosis, drug-drug interaction screening, or clinical advice.
