import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
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

// Serve frontend static build in production (single-port deployment for Render / Railway)
const frontendDist = path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/api-docs') || req.path.startsWith('/health')) {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
