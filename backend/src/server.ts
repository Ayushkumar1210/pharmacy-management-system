import app from './app';
import { config } from './config';

const server = app.listen(config.port, () => {
  console.log(`====================================================`);
  console.log(`🏥 Pharmacy Management API Server running`);
  console.log(`🌐 Base URL:      http://localhost:${config.port}`);
  console.log(`📖 Swagger Docs:  http://localhost:${config.port}/api-docs`);
  console.log(`🩺 Health Check:  http://localhost:${config.port}/health`);
  console.log(`====================================================`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
