import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

// For Vercel Serverless deployment: initialize SQLite in writable /tmp directory
if (process.env.VERCEL) {
  const tmpDb = '/tmp/pharmacy.db';
  const localDb = path.resolve(__dirname, '../prisma/pharmacy.db');
  try {
    if (!fs.existsSync(tmpDb) && fs.existsSync(localDb)) {
      fs.copyFileSync(localDb, tmpDb);
      console.log('✅ SQLite database copied to /tmp/pharmacy.db for Vercel');
    }
  } catch (err) {
    console.error('Failed to copy database to /tmp:', err);
  }
}

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'test' ? [] : ['warn', 'error'],
  datasources: process.env.VERCEL
    ? {
        db: {
          url: 'file:/tmp/pharmacy.db',
        },
      }
    : undefined,
});

export default prisma;
