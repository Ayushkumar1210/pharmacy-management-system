# 3–5 Minute Video Walkthrough Script & Interview Guide
## Pharmacy Management System (PharmaCore ERP)
**Candidate Presentation Guide for Algions AI Labs Evaluation**

---

### Timing Breakdown (Total: ~3 minutes 45 seconds)

| Timestamp | Section | Key Screen | What to Say & Demonstrate |
|:---|:---|:---|:---|
| **0:00 - 0:35** | **Introduction & Architecture** | Login / Dashboard | • Introduce yourself and project title: *Pharmacy Management System (PharmaCore ERP)*.<br>• State the stack: React 18 frontend with Tailwind, Express/TypeScript backend, Prisma ORM with SQLite, and strict ACID transaction locking.<br>• Note that demo accounts for Admin, Pharmacist, and Cashier are pre-configured for role-based testing. |
| **0:35 - 1:15** | **Acceptance Test 1: FEFO Dispensing** | POS Billing (`/pos`) | • Navigate to POS Billing terminal.<br>• Select **Dolo 650mg**.<br>• Explain the **FEFO (First-Expiry-First-Out)** algorithm: show how the system automatically selects `DOL-2024-EARLY` (expiring in 25 days) rather than `DOL-2024-LATE` (expiring in 500 days).<br>• Complete a sale for 5 units, tender cash, and click **Settle & Print Invoice**.<br>• Show the printable invoice modal with batch number, tax calculation, and receipt layout. |
| **1:15 - 1:50** | **Acceptance Test 2: Expired Batch Blocking** | POS / Medicine Catalog | • Open the medicine catalog and highlight **Azithromycin 500mg** batch `AZI-EXP-OCT`, which expired last month.<br>• Demonstrate that attempting to dispense or sell this expired batch is strictly rejected by the server with HTTP 400 Bad Request: *"Batch expired and cannot be sold"*. |
| **1:50 - 2:30** | **Acceptance Test 3: Low-Stock & Expiry Alerts** | Dashboard & Reports Tab | • Show the Dashboard alert badges and navigate to **Reports -> Near-Expiry & Safety Alerts**.<br>• Show the near-expiry table (batches expiring within 60 days) with remaining days and at-risk values.<br>• Show the low-stock table for medicines whose active stock is below their configured reorder threshold (e.g. Atorvastatin 20mg). |
| **2:30 - 3:05** | **Acceptance Test 4: Returns with Mandatory Reason** | Returns & Adjustments (`/adjustments`) | • Navigate to Returns & Adjustments.<br>• Click **Record Adjustment / Return**.<br>• Attempt to submit without a reason: show the validation block.<br>• Enter a valid audit reason (*"Customer returned sealed box with intact bill"*), adjust quantity, and submit.<br>• Switch to the **Stock Movement Ledger (`/audit`)** to show the newly created immutable audit log with staff operator ID, timestamp, $\Delta Q$, and balance snapshot. |
| **3:05 - 3:35** | **Acceptance Test 5: Full Stock Reconciliation** | Reports (`/reports?tab=reconciliation`) | • Navigate to **Stock Reconciliation Report**.<br>• Explain the mathematical formula: $\text{Purchases} - \text{Sales} + \text{Returns} \pm \text{Adjustments} \equiv \text{Actual Batch Stock}$.<br>• Point out that the discrepancy across all medicines is **0**, confirmed by the green *Matched* badge. |
| **3:35 - 3:55** | **Automated Tests & Wrap-up** | Terminal | • Open terminal and run `npm test` inside `backend`.<br>• Show all 8 acceptance and RBAC tests passing in ~1.3 seconds.<br>• Conclude with a brief summary of how the architecture enforces safety and zero negative stock. |

---

### Cheat-Sheet for the 15-Minute Technical Interview

#### Q1: "Why did you choose FEFO over FIFO?"
> *"FIFO dispenses the oldest stock received in the store. But in pharmaceuticals, a newer shipment might arrive from a distributor with an earlier expiration date. Selling strictly by FIFO could let medicine expire on the shelf. FEFO sorts active batches by `expiryDate ASC`, ensuring patient safety and minimizing pharmacy inventory loss."*

#### Q2: "How do you guarantee stock never becomes negative during concurrent sales?"
> *"All stock mutations run inside `prisma.$transaction()`. Within the transaction boundary, we query the target batch row and assert `batch.quantity >= requestedQuantity`. If another transaction deducted the remaining stock first, the assertion fails, throwing an exception that rolls back the transaction. The database state remains consistent and stock never drops below zero."*

#### Q3: "How is your audit trail implemented?"
> *"Every state change (purchase, sale, customer return, breakage, or expired disposal) writes a record to the `StockMovement` table in the same transaction that updates the batch. We record the movement type, quantity delta, post-movement balance snapshot, user ID, and mandatory reason. The reconciliation report aggregates these movements to prove that the ledger sum equals current batch inventory."*
