import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import i18nextMiddleware from 'i18next-http-middleware';
import i18n from '~/i18n/config';
import { env } from '~/config/env';
import authRoutes from '~/routes/auth.routes';
import transcriptRoutes from '~/routes/transcript.routes';
import billingRoutes from '~/routes/billing.routes';
import { webhook as paddleWebhook } from '~/controllers/billing.controller';
import { errorMiddleware } from '~/middleware/error.middleware';
import { sendError, sendSuccess } from '~/utils/response';
import { globalLimiter, webhookLimiter } from '~/middleware/rateLimit.middleware';
import { redis, clearTranscriptionLocks } from '~/config/redis';
import { ensureAppConfig, getAppConfig } from '~/models/appConfig.model';

const app = express();

app.use(cors({ origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()) }));

// Paddle webhook needs raw body BEFORE express.json() parses it
app.post('/api/billing/webhook', webhookLimiter, express.text({ type: 'application/json' }), paddleWebhook);

app.use(express.json({ limit: '1mb' }));
app.use(i18nextMiddleware.handle(i18n));
app.use(globalLimiter);

// Request/Response logging
app.use((req, res, next) => {
  const start = Date.now();
  const { method, originalUrl } = req;
  console.log(`→ ${method} ${originalUrl}`);
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(`← ${method} ${originalUrl} ${res.statusCode} (${ms}ms)`);
  });
  next();
});

app.get('/api/health', (req, res) => {
  const config = getAppConfig();
  sendSuccess(res, req.t('general.ok'), { latestVersion: config.latestVersion });
});

app.use('/api/auth', authRoutes);
app.use('/api/transcripts', transcriptRoutes);
app.use('/api/billing', billingRoutes);

app.use((req, res) => sendError(res, req.t('error.routeNotFound'), 404));

app.use(errorMiddleware);

mongoose
  .connect(env.MONGODB_URI)
  .then(async () => {
    console.log('[MongoDB] Connected');
    await clearTranscriptionLocks();
    await ensureAppConfig();

    // Purge leftover audio files from previous sessions
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (fs.existsSync(uploadDir)) {
      for (const file of fs.readdirSync(uploadDir)) {
        fs.unlinkSync(path.join(uploadDir, file));
      }
      console.log('[Startup] Cleared uploads directory');
    }
    const server = app.listen(env.PORT, () => {
      console.log(`[Server] Running on http://localhost:${env.PORT}`);
    });

    const shutdown = () => {
      console.log('[Server] Shutting down...');
      server.close(() => {
        Promise.all([mongoose.disconnect(), redis.quit()]).then(() => {
          console.log('[MongoDB] Disconnected');
          console.log('[Redis] Disconnected');
          process.exit(0);
        });
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  })
  .catch((err) => {
    console.error('[MongoDB] Connection failed:', err.message);
    process.exit(1);
  });
