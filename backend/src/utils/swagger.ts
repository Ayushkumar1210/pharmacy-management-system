export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Pharmacy Management System API',
    version: '1.0.0',
    description:
      'Robust enterprise REST API for Pharmacy Inventory, FEFO Sales Invoicing, Stock Adjustments, Audit Trail, and Real-Time Reporting.',
  },
  servers: [
    {
      url: 'http://localhost:5001/api',
      description: 'Local development server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/auth/login': {
      post: {
        summary: 'User Login',
        description: 'Authenticates user and returns JWT bearer token along with role details',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'admin@pharmacy.com' },
                  password: { type: 'string', example: 'Password@123' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Authenticated successfully' },
          401: { description: 'Invalid credentials' },
        },
      },
    },
    '/auth/me': {
      get: {
        summary: 'Current User Profile',
        responses: {
          200: { description: 'Current authenticated user object' },
        },
      },
    },
    '/medicines': {
      get: {
        summary: 'List medicines',
        description: 'Returns medicines with calculated total stock, low stock alert status, and active batches',
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'categoryId', in: 'query', schema: { type: 'string' } },
          { name: 'lowStockOnly', in: 'query', schema: { type: 'boolean' } },
        ],
        responses: { 200: { description: 'List of medicines' } },
      },
      post: {
        summary: 'Create new medicine',
        responses: { 201: { description: 'Medicine created' } },
      },
    },
    '/batches/fefo-recommendation': {
      get: {
        summary: 'Calculate FEFO Batch Allocation',
        description: 'Calculates the optimal batch allocation for a medicine based on First-Expiry-First-Out',
        parameters: [
          { name: 'medicineId', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'quantity', in: 'query', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          200: { description: 'FEFO batch breakdown' },
          400: { description: 'Insufficient non-expired stock' },
        },
      },
    },
    '/sales': {
      post: {
        summary: 'Create Sale / Dispense Invoice',
        description: 'Atomically deducts batch inventory using FEFO or specified batch, records invoice and stock movements',
        responses: {
          201: { description: 'Sale completed with invoice details' },
          400: { description: 'Validation failed or expired batch rejection' },
        },
      },
      get: {
        summary: 'List sales invoices',
        responses: { 200: { description: 'Sales invoices list' } },
      },
    },
    '/returns/adjust': {
      post: {
        summary: 'Stock Adjustment or Return with mandatory reason',
        description: 'Updates batch stock, records reason and inserts audit movement',
        responses: {
          201: { description: 'Adjustment successful' },
          400: { description: 'Validation failed (missing reason or negative stock prevention)' },
        },
      },
    },
    '/reports/reconciliation': {
      get: {
        summary: 'Stock Reconciliation Audit Report',
        description: 'Reconciles: Purchases - Sales + Returns + Adjustments = Actual Batch Stock',
        responses: { 200: { description: 'Full reconciliation report' } },
      },
    },
    '/reports/alerts': {
      get: {
        summary: 'Low Stock and Near-Expiry Alerts',
        responses: { 200: { description: 'Near-expiry and low-stock alerts' } },
      },
    },
    '/audit': {
      get: {
        summary: 'Complete Stock Movement Audit Ledger',
        responses: { 200: { description: 'Chronological stock movement logs' } },
      },
    },
  },
};
