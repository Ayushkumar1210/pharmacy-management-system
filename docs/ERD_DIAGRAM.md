# Entity Relationship Diagram (ERD) & Database Schema
## Pharmacy Management System (PharmaCore ERP)

### 1. Conceptual & Relational Data Model (Mermaid ERD)

```mermaid
erDiagram
    USER ||--o{ SALE : "bills"
    USER ||--o{ PURCHASE : "ingests"
    USER ||--o{ RETURN : "processes"
    USER ||--o{ STOCK_MOVEMENT : "authorizes"

    CATEGORY ||--o{ MEDICINE : "classifies"
    SUPPLIER ||--o{ BATCH : "supplies"
    SUPPLIER ||--o{ PURCHASE : "invoices"

    MEDICINE ||--o{ BATCH : "holds stock in"
    MEDICINE ||--o{ PURCHASE_ITEM : "ordered in"
    MEDICINE ||--o{ SALE_ITEM : "dispensed in"
    MEDICINE ||--o{ RETURN_ITEM : "returned in"
    MEDICINE ||--o{ STOCK_MOVEMENT : "tracks movement"

    BATCH ||--o{ PURCHASE_ITEM : "created/received by"
    BATCH ||--o{ SALE_ITEM : "deducted by"
    BATCH ||--o{ RETURN_ITEM : "restocked/disposed by"
    BATCH ||--o{ STOCK_MOVEMENT : "ledger history"

    PURCHASE ||--|{ PURCHASE_ITEM : "contains"
    SALE ||--|{ SALE_ITEM : "contains"
    SALE ||--o{ RETURN : "originates"
    RETURN ||--|{ RETURN_ITEM : "contains"

    USER {
        string id PK
        string name
        string email UK
        string password
        string role "ADMIN | PHARMACIST | CASHIER"
        boolean isActive
        datetime createdAt
    }

    CATEGORY {
        string id PK
        string name UK
        string description
    }

    SUPPLIER {
        string id PK
        string name
        string contactPerson
        string email
        string phone
        string address
        string taxId "GSTIN / Drug License"
    }

    MEDICINE {
        string id PK
        string name
        string genericName
        string sku UK
        string categoryId FK
        string dosageForm "Tablet | Capsule | Syrup | etc"
        string strength "500mg | 650mg"
        string manufacturer
        int reorderLevel "Threshold for low-stock warning"
        string description
    }

    BATCH {
        string id PK
        string batchNumber
        string medicineId FK
        string supplierId FK
        int quantity "Must be >= 0 (Zero Negative Stock Invariant)"
        int initialQuantity
        float purchasePrice "Cost per unit"
        float sellingPrice "MRP per unit"
        datetime mfgDate
        datetime expiryDate "Indexed for FEFO ordering ASC"
        string status "ACTIVE | EXPIRED | DEPLETED"
    }

    PURCHASE {
        string id PK
        string invoiceNumber UK
        string supplierId FK
        datetime receivedDate
        float totalAmount
        string notes
        string createdById FK
    }

    PURCHASE_ITEM {
        string id PK
        string purchaseId FK
        string medicineId FK
        string batchId FK
        int quantity
        float unitCost
        float sellingPrice
        datetime mfgDate
        datetime expiryDate
        float totalCost
    }

    SALE {
        string id PK
        string invoiceNumber UK
        string customerName
        string customerPhone
        string doctorName "Doctor prescription reference"
        string paymentMethod "CASH | CARD | UPI"
        float subtotal
        float taxPercent
        float taxAmount
        float discount
        float totalAmount
        float amountPaid
        float changeReturned
        string status "COMPLETED | PARTIALLY_RETURNED"
        string cashierId FK
        datetime createdAt
    }

    SALE_ITEM {
        string id PK
        string saleId FK
        string medicineId FK
        string batchId FK
        int quantity
        float unitPrice
        float lineTotal
    }

    RETURN {
        string id PK
        string returnNumber UK
        string saleId FK "Nullable (if linked to sale)"
        string type "CUSTOMER_RETURN | DAMAGE_BREAKAGE | EXPIRED_DISPOSAL | AUDIT_ADJUSTMENT"
        string reason "Mandatory business audit reason"
        float refundAmount
        string createdById FK
        datetime createdAt
    }

    RETURN_ITEM {
        string id PK
        string returnId FK
        string medicineId FK
        string batchId FK
        int quantity
        float refundUnitPrice
    }

    STOCK_MOVEMENT {
        string id PK
        datetime timestamp
        string movementType "PURCHASE | SALE | CUSTOMER_RETURN | DAMAGE_BREAKAGE | EXPIRED_DISPOSAL | AUDIT_ADJUSTMENT_ADD | AUDIT_ADJUSTMENT_SUB"
        string medicineId FK
        string batchId FK
        int quantityDelta "Positive for in, negative for out"
        int balanceAfter "Snapshot of batch stock"
        string reason "Mandatory context"
        string referenceId "Foreign ID of Sale, Purchase, or Return"
        string performedById FK
    }
```

---

### 2. Relational Schema Integrity & Constraint Design

| Table Name | Primary Key | Foreign Keys | Unique Constraints | Indexes | Invariant Enforced |
|:---|:---|:---|:---|:---|:---|
| `User` | `id` (cuid) | None | `email` | `email` | Authenticated staff identity & RBAC role |
| `Category` | `id` (cuid) | None | `name` | `name` | Medical drug classification taxonomy |
| `Supplier` | `id` (cuid) | None | None | `name` | Licensed distributor contact & GSTIN |
| `Medicine` | `id` (cuid) | `categoryId` | `sku` | `[categoryId]`, `[name]` | Pharmaceutical catalogue & reorder thresholds |
| `Batch` | `id` (cuid) | `medicineId`, `supplierId` | `[medicineId, batchNumber]` | `[medicineId]`, `[expiryDate]`, `[batchNumber]` | Granular inventory; `quantity >= 0`; `expiryDate` for FEFO |
| `Purchase` | `id` (cuid) | `supplierId`, `createdById` | `invoiceNumber` | `invoiceNumber` | Supplier stock-in procurement records |
| `PurchaseItem` | `id` (cuid) | `purchaseId`, `medicineId`, `batchId` | None | `[purchaseId]`, `[batchId]` | Ingested batch quantities and unit costs |
| `Sale` | `id` (cuid) | `cashierId` | `invoiceNumber` | `[invoiceNumber]`, `[createdAt]` | Point-of-sale customer receipts & tax collection |
| `SaleItem` | `id` (cuid) | `saleId`, `medicineId`, `batchId` | None | `[saleId]`, `[batchId]` | Specific batch deductions & line pricing |
| `Return` | `id` (cuid) | `saleId`, `createdById` | `returnNumber` | `[returnNumber]`, `[saleId]` | Mandatory audited returns and write-offs |
| `ReturnItem` | `id` (cuid) | `returnId`, `medicineId`, `batchId` | None | `[returnId]`, `[batchId]` | Quantities returned or written off |
| `StockMovement` | `id` (cuid) | `medicineId`, `batchId`, `performedById` | None | `[medicineId]`, `[batchId]`, `[timestamp]`, `[movementType]` | Immutable chronological inventory ledger |

---

### 3. Mathematical Reconciliation Formula

For any medicine $M$ across all its batches $B_1, B_2, \dots, B_n$, the system ensures the closing balance is strictly derived from the audit log:

$$\text{Calculated Stock} = \sum \Delta Q_{\text{PURCHASE}} - \sum |\Delta Q_{\text{SALE}}| + \sum \Delta Q_{\text{RETURN}} + \sum \Delta Q_{\text{AUDIT\_ADD}} - \sum |\Delta Q_{\text{AUDIT\_SUB}}|$$

$$\text{Actual Batch Stock} = \sum_{i=1}^{n} \text{quantity}(B_i)$$

$$\text{Discrepancy} = \text{Calculated Stock} - \text{Actual Batch Stock} \equiv 0$$
