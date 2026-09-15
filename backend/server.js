import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import app from './app.js';
import { env } from './config/env.config.js';
import { initializeOraclePool, closeOraclePool } from './config/oracle.js';
import { initializeMySQLPool } from './config/mysql.js';
import { startQueueWorkers } from './queues/queueWorker.js';
import { verifyTransporter } from './services/emailService.js';
import { handleDatabaseDisconnect, handleApplicationCrash, handleServerShutdown } from './services/alertService.js';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 3000;

// Catch unhandled errors and uncaught exceptions to alert admin before fatal exits
process.on('uncaughtException', async (err) => {
  console.error('[FATAL UNCAUGHT EXCEPTION]:', err);
  try {
    await handleApplicationCrash(err, 'uncaughtException');
  } catch (alertErr) {
    console.error('Failed sending crash alert:', alertErr);
  }
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('[FATAL UNHANDLED REJECTION]:', reason);
  try {
    const errorObj = reason instanceof Error ? reason : new Error(String(reason));
    await handleApplicationCrash(errorObj, 'unhandledRejection');
  } catch (alertErr) {
    console.error('Failed sending rejection alert:', alertErr);
  }
});

async function bootstrapServer() {
  console.log('====================================================');
  console.log('Starting StudyPulse AI PSMS Server...');
  console.log('Stack: Node.js + Express.js + Oracle SQL + Nodemailer');
  console.log('====================================================');

  // 1. Initialize Oracle Database Pool
  try {
    const dbPool = await initializeOraclePool();
    if (!dbPool && process.env.ORACLE_PASSWORD) {
      handleDatabaseDisconnect(new Error('Failed to initialize Oracle Database connection pool. Resilient fallback activated.'));
    }
  } catch (dbErr) {
    console.warn('[Server Startup] Oracle DB initialization warning:', dbErr.message);
    handleDatabaseDisconnect(dbErr);
  }

  // 1b. Initialize Oracle MySQL Pool (BLOB File Storage)
  try {
    await initializeMySQLPool();
  } catch (mysqlErr) {
    console.warn('[Server Startup] MySQL initialization notice:', mysqlErr.message);
  }

  // 2. Start Background Queue Workers (Email & Tasks)
  try {
    startQueueWorkers();
  } catch (qErr) {
    console.warn('[Server Startup] Queue worker warning:', qErr.message);
  }

  // 3. Verify Nodemailer Transporter
  try {
    await verifyTransporter();
  } catch (emailErr) {
    console.warn('[Server Startup] Nodemailer verification notice:', emailErr.message);
  }

  // 4. Mount Vite Middleware for Dev or Static files in Production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, '..', 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // 5. Start HTTP Listener on 0.0.0.0:3000
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(`PSMS Server is actively running on http://0.0.0.0:${PORT}`);
    console.log(`Oracle Database: Ready (Thin mode SQL execution)`);
    console.log(`Async Queue Worker: Running`);
    console.log(`====================================================`);
  });

  // Graceful Shutdown with Admin Alert
  const shutdown = async (signal) => {
    console.log(`\n[Server] Gracefully shutting down on signal: ${signal}...`);
    try {
      await handleServerShutdown(signal);
    } catch (e) {
      console.error('Failed to dispatch shutdown alert email:', e);
    }
    server.close(async () => {
      await closeOraclePool();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  return server;
}

// Start server if run directly
bootstrapServer().catch(err => {
  console.error('[Server Fatal] Startup error:', err);
  handleApplicationCrash(err, 'bootstrapServer');
});

export default bootstrapServer;
