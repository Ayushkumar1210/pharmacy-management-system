import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { swaggerDocument } from './utils/swagger';
import authRoutes from './routes/auth.routes';
import medicineRoutes from './routes/medicine.routes';
import batchRoutes from './routes/batch.routes';
import supplierRoutes from './routes/supplier.routes';
import purchaseRoutes from './routes/purchase.routes';
import saleRoutes from './routes/sale.routes';
import returnRoutes from './routes/return.routes';
import auditRoutes from './routes/audit.routes';
import reportRoutes from './routes/report.routes';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';

const app = express();

// Middlewares
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// API Documentation (OpenAPI / Swagger)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'pharmacy-management-api', timestamp: new Date() });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/reports', reportRoutes);

// Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
