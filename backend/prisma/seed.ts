import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing tables in reverse dependency order
  await prisma.stockMovement.deleteMany();
  await prisma.returnItem.deleteMany();
  await prisma.return.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.purchaseItem.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.batch.deleteMany();
  await prisma.medicine.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  // 1. Seed Users
  const passwordHash = await bcrypt.hash('Password@123', 10);

  const admin = await prisma.user.create({
    data: {
      name: 'Dr. Ananya Roy',
      email: 'admin@pharmacy.com',
      password: passwordHash,
      role: 'ADMIN',
    },
  });

  const pharmacist = await prisma.user.create({
    data: {
      name: 'Vikram Mehta',
      email: 'pharmacist@pharmacy.com',
      password: passwordHash,
      role: 'PHARMACIST',
    },
  });

  const cashier = await prisma.user.create({
    data: {
      name: 'Priya Nair',
      email: 'cashier@pharmacy.com',
      password: passwordHash,
      role: 'CASHIER',
    },
  });

  console.log('✅ Users seeded (Admin, Pharmacist, Cashier)');

  // 2. Seed Categories
  const categoriesData = [
    { name: 'Antibiotics', description: 'Bacterial infection medications and cephalosporins' },
    { name: 'Analgesics & Antipyretics', description: 'Pain relief and fever reduction drugs' },
    { name: 'Cardiovascular & Hypertension', description: 'Heart health, BP regulators, and statins' },
    { name: 'Antidiabetic', description: 'Blood sugar control and insulin sensitizers' },
    { name: 'Gastrointestinal', description: 'Antacids, PPIs, and digestion regulation' },
    { name: 'Respiratory & Antiallergic', description: 'Antihistamines, bronchodilators, and cough syrups' },
    { name: 'Vitamins & Minerals', description: 'Daily supplements and deficiency treatments' },
  ];

  const categoryMap = new Map<string, string>();
  for (const cat of categoriesData) {
    const created = await prisma.category.create({ data: cat });
    categoryMap.set(cat.name, created.id);
  }
  console.log('✅ Categories seeded');

  // 3. Seed Suppliers
  const suppliersData = [
    {
      name: 'MedSource National Distributors',
      contactPerson: 'Rajesh Verma',
      email: 'orders@medsource.com',
      phone: '+91 98201 12345',
      address: 'Plot 42, Okhla Industrial Area Phase-III, New Delhi',
      taxId: '07AAACM1234F1Z5',
    },
    {
      name: 'Apex Healthcare Logistics',
      contactPerson: 'Neha Patel',
      email: 'supply@apexhealth.in',
      phone: '+91 97123 45678',
      address: 'B-12, MIDC Andheri East, Mumbai',
      taxId: '27AABCA5678G2Z1',
    },
    {
      name: 'Sunrise LifeSciences Supplies',
      contactPerson: 'Amit Gupta',
      email: 'contact@sunriselife.com',
      phone: '+91 94480 98765',
      address: '15th Cross, Peenya Industrial Area, Bengaluru',
      taxId: '29AABCS9012H3Z7',
    },
  ];

  const supplierMap = new Map<string, string>();
  for (const sup of suppliersData) {
    const created = await prisma.supplier.create({ data: sup });
    supplierMap.set(sup.name, created.id);
  }
  console.log('✅ Suppliers seeded');

  // 4. Seed Medicines and Batches
  // Dates relative to current time
  const now = new Date();
  const pastDate = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const futureDate = (days: number) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const sup1 = supplierMap.get('MedSource National Distributors')!;
  const sup2 = supplierMap.get('Apex Healthcare Logistics')!;
  const sup3 = supplierMap.get('Sunrise LifeSciences Supplies')!;

  const medicinesData = [
    {
      name: 'Amoxicillin 500mg',
      genericName: 'Amoxicillin Trihydrate',
      sku: 'MED-AMOX-500',
      category: 'Antibiotics',
      dosageForm: 'Capsule',
      strength: '500mg',
      manufacturer: 'Cipla Ltd',
      reorderLevel: 50,
      description: 'Broad-spectrum beta-lactam antibiotic for bacterial infections.',
      batches: [
        {
          batchNumber: 'AMX-2024-B1',
          quantity: 120,
          initialQuantity: 150,
          purchasePrice: 42.5,
          sellingPrice: 75.0,
          mfgDate: pastDate(180),
          expiryDate: futureDate(45), // Near expiry (45 days)
          supplierId: sup1,
        },
        {
          batchNumber: 'AMX-2024-B2',
          quantity: 200,
          initialQuantity: 200,
          purchasePrice: 44.0,
          sellingPrice: 75.0,
          mfgDate: pastDate(60),
          expiryDate: futureDate(365), // Fresh batch (1 year)
          supplierId: sup1,
        },
      ],
    },
    {
      name: 'Dolo 650mg Paracetamol',
      genericName: 'Paracetamol / Acetaminophen',
      sku: 'MED-DOLO-650',
      category: 'Analgesics & Antipyretics',
      dosageForm: 'Tablet',
      strength: '650mg',
      manufacturer: 'Micro Labs Ltd',
      reorderLevel: 100,
      description: 'Standard antipyretic and analgesic tablet for fever and moderate pain.',
      batches: [
        {
          batchNumber: 'DOL-2024-EARLY',
          quantity: 80,
          initialQuantity: 100,
          purchasePrice: 15.0,
          sellingPrice: 32.0,
          mfgDate: pastDate(200),
          expiryDate: futureDate(25), // Very near expiry (25 days) - FEFO first choice!
          supplierId: sup2,
        },
        {
          batchNumber: 'DOL-2024-LATE',
          quantity: 350,
          initialQuantity: 400,
          purchasePrice: 15.5,
          sellingPrice: 32.0,
          mfgDate: pastDate(30),
          expiryDate: futureDate(500),
          supplierId: sup2,
        },
      ],
    },
    {
      name: 'Azithromycin 500mg (Azee)',
      genericName: 'Azithromycin',
      sku: 'MED-AZEE-500',
      category: 'Antibiotics',
      dosageForm: 'Tablet',
      strength: '500mg',
      manufacturer: 'Sun Pharma',
      reorderLevel: 40,
      description: 'Macrolide antibiotic used for respiratory and soft tissue infections.',
      batches: [
        {
          batchNumber: 'AZI-EXP-OCT',
          quantity: 25,
          initialQuantity: 50,
          purchasePrice: 65.0,
          sellingPrice: 119.0,
          mfgDate: pastDate(400),
          expiryDate: pastDate(15), // EXPIRED! Must be blocked from sale.
          status: 'EXPIRED',
          supplierId: sup1,
        },
        {
          batchNumber: 'AZI-FRESH-01',
          quantity: 110,
          initialQuantity: 120,
          purchasePrice: 68.0,
          sellingPrice: 125.0,
          mfgDate: pastDate(40),
          expiryDate: futureDate(420),
          supplierId: sup1,
        },
      ],
    },
    {
      name: 'Metformin 500mg SR',
      genericName: 'Metformin Hydrochloride',
      sku: 'MED-MET-500',
      category: 'Antidiabetic',
      dosageForm: 'Tablet',
      strength: '500mg',
      manufacturer: 'USV Pvt Ltd',
      reorderLevel: 60,
      description: 'First-line biguanide antidiabetic medication for Type 2 Diabetes.',
      batches: [
        {
          batchNumber: 'MET-2024-A1',
          quantity: 180,
          initialQuantity: 200,
          purchasePrice: 18.0,
          sellingPrice: 38.0,
          mfgDate: pastDate(90),
          expiryDate: futureDate(300),
          supplierId: sup3,
        },
      ],
    },
    {
      name: 'Pantoprazole 40mg (Pan 40)',
      genericName: 'Pantoprazole Sodium',
      sku: 'MED-PAN-40',
      category: 'Gastrointestinal',
      dosageForm: 'Tablet',
      strength: '40mg',
      manufacturer: 'Alkem Laboratories',
      reorderLevel: 75,
      description: 'Proton-pump inhibitor that decreases stomach acid production.',
      batches: [
        {
          batchNumber: 'PAN-2024-B1',
          quantity: 140,
          initialQuantity: 150,
          purchasePrice: 52.0,
          sellingPrice: 95.0,
          mfgDate: pastDate(60),
          expiryDate: futureDate(240),
          supplierId: sup2,
        },
      ],
    },
    {
      name: 'Atorvastatin 20mg (Atorva)',
      genericName: 'Atorvastatin Calcium',
      sku: 'MED-ATOR-20',
      category: 'Cardiovascular & Hypertension',
      dosageForm: 'Tablet',
      strength: '20mg',
      manufacturer: 'Zydus Cadila',
      reorderLevel: 40,
      description: 'HMG-CoA reductase inhibitor (statin) used to lower cholesterol and reduce cardiovascular risk.',
      batches: [
        {
          batchNumber: 'ATV-2024-C1',
          quantity: 12, // LOW STOCK! Reorder level is 40.
          initialQuantity: 100,
          purchasePrice: 85.0,
          sellingPrice: 160.0,
          mfgDate: pastDate(120),
          expiryDate: futureDate(180),
          supplierId: sup3,
        },
      ],
    },
    {
      name: 'Montelukast & Levocetirizine (Montair LC)',
      genericName: 'Montelukast 10mg + Levocetirizine 5mg',
      sku: 'MED-MNTR-LC',
      category: 'Respiratory & Antiallergic',
      dosageForm: 'Tablet',
      strength: '10mg/5mg',
      manufacturer: 'Cipla Ltd',
      reorderLevel: 30,
      description: 'Combination medication for seasonal allergic rhinitis and chronic asthma.',
      batches: [
        {
          batchNumber: 'MLC-2024-X1',
          quantity: 75,
          initialQuantity: 100,
          purchasePrice: 95.0,
          sellingPrice: 178.0,
          mfgDate: pastDate(80),
          expiryDate: futureDate(280),
          supplierId: sup1,
        },
      ],
    },
    {
      name: 'Becosules Z Capsules',
      genericName: 'B-Complex with Vitamin C & Zinc',
      sku: 'MED-BECO-Z',
      category: 'Vitamins & Minerals',
      dosageForm: 'Capsule',
      strength: 'Standard Formula',
      manufacturer: 'Pfizer India',
      reorderLevel: 50,
      description: 'Multivitamin and mineral supplement for energy, tissue repair and immunity.',
      batches: [
        {
          batchNumber: 'BCS-2024-Z9',
          quantity: 90,
          initialQuantity: 100,
          purchasePrice: 28.0,
          sellingPrice: 52.0,
          mfgDate: pastDate(100),
          expiryDate: futureDate(360),
          supplierId: sup2,
        },
      ],
    },
    {
      name: 'Telmisartan 40mg (Telma 40)',
      genericName: 'Telmisartan',
      sku: 'MED-TELM-40',
      category: 'Cardiovascular & Hypertension',
      dosageForm: 'Tablet',
      strength: '40mg',
      manufacturer: 'Glenmark Pharmaceuticals',
      reorderLevel: 30,
      description: 'Angiotensin II receptor blocker used in the management of hypertension.',
      batches: [
        {
          batchNumber: 'TEL-2024-T1',
          quantity: 8, // CRITICAL LOW STOCK (reorder: 30)
          initialQuantity: 60,
          purchasePrice: 48.0,
          sellingPrice: 98.0,
          mfgDate: pastDate(150),
          expiryDate: futureDate(190),
          supplierId: sup3,
        },
      ],
    },
  ];

  for (const med of medicinesData) {
    const createdMed = await prisma.medicine.create({
      data: {
        name: med.name,
        genericName: med.genericName,
        sku: med.sku,
        categoryId: categoryMap.get(med.category)!,
        dosageForm: med.dosageForm,
        strength: med.strength,
        manufacturer: med.manufacturer,
        reorderLevel: med.reorderLevel,
        description: med.description,
      },
    });

    for (const b of med.batches) {
      const createdBatch = await prisma.batch.create({
        data: {
          batchNumber: b.batchNumber,
          medicineId: createdMed.id,
          supplierId: b.supplierId,
          quantity: b.quantity,
          initialQuantity: b.initialQuantity,
          purchasePrice: b.purchasePrice,
          sellingPrice: b.sellingPrice,
          mfgDate: b.mfgDate,
          expiryDate: b.expiryDate,
          status: b.status || (b.expiryDate < now ? 'EXPIRED' : 'ACTIVE'),
        },
      });

      // Log initial stock movement
      await prisma.stockMovement.create({
        data: {
          timestamp: b.mfgDate,
          movementType: 'PURCHASE',
          medicineId: createdMed.id,
          batchId: createdBatch.id,
          quantityDelta: b.initialQuantity,
          balanceAfter: b.initialQuantity,
          reason: `Initial Stock-in for Batch ${b.batchNumber}`,
          performedById: pharmacist.id,
        },
      });

      // If initial != current quantity, record the past sale deduction
      if (b.initialQuantity > b.quantity) {
        const soldQty = b.initialQuantity - b.quantity;
        await prisma.stockMovement.create({
          data: {
            timestamp: pastDate(5),
            movementType: 'SALE',
            medicineId: createdMed.id,
            batchId: createdBatch.id,
            quantityDelta: -soldQty,
            balanceAfter: b.quantity,
            reason: `Past dispensing & sales settlement`,
            performedById: cashier.id,
          },
        });
      }
    }
  }

  console.log('✅ Medicines, Batches, and Stock Movements seeded');

  // 5. Seed sample completed sales invoice
  const amox = await prisma.medicine.findUnique({ where: { sku: 'MED-AMOX-500' }, include: { batches: true } });
  const dolo = await prisma.medicine.findUnique({ where: { sku: 'MED-DOLO-650' }, include: { batches: true } });

  if (amox && dolo && amox.batches[0] && dolo.batches[0]) {
    const sale1 = await prisma.sale.create({
      data: {
        invoiceNumber: 'INV-20241108-001',
        customerName: 'Sunil Verma',
        customerPhone: '+91 98765 43210',
        doctorName: 'Dr. S. K. Gupta (MD)',
        paymentMethod: 'UPI',
        subtotal: 367.0,
        taxPercent: 5.0,
        taxAmount: 18.35,
        discount: 10.0,
        totalAmount: 375.35,
        amountPaid: 375.35,
        changeReturned: 0.0,
        status: 'COMPLETED',
        cashierId: cashier.id,
        createdAt: pastDate(2),
        items: {
          create: [
            {
              medicineId: amox.id,
              batchId: amox.batches[0].id,
              quantity: 3,
              unitPrice: 75.0,
              lineTotal: 225.0,
            },
            {
              medicineId: dolo.id,
              batchId: dolo.batches[0].id,
              quantity: 4,
              unitPrice: 32.0,
              lineTotal: 128.0,
            },
          ],
        },
      },
    });

    console.log(`✅ Sample Sale Invoice seeded: ${sale1.invoiceNumber}`);
  }

  console.log('\n🚀 Database seeding complete!');
  console.log('----------------------------------------------------');
  console.log('Demo Credentials:');
  console.log('Admin:      admin@pharmacy.com      | Password@123');
  console.log('Pharmacist: pharmacist@pharmacy.com | Password@123');
  console.log('Cashier:    cashier@pharmacy.com    | Password@123');
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Error during database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
