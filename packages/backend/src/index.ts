import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { env } from '~/config/env';
import authRoutes from '~/routes/auth.routes';
import transcriptRoutes from '~/routes/transcript.routes';
import billingRoutes from '~/routes/billing.routes';
import { errorMiddleware } from '~/middleware/error.middleware';
import { sendError, sendSuccess } from '~/utils/response';
import { globalLimiter } from '~/middleware/rateLimit.middleware';
import { redis, clearTranscriptionLocks } from '~/config/redis';
import { ensureAppConfig, getAppConfig } from '~/models/appConfig.model';

const app = express();

app.use(cors({ origin: env.CORS_ORIGIN.split(',') }));
app.use(express.json());
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

app.get('/api/health', (_req, res) => {
  const config = getAppConfig();
  sendSuccess(res, 'OK', { latestVersion: config.latestVersion });
});

app.use('/api/auth', authRoutes);
app.use('/api/transcripts', transcriptRoutes);
app.use('/api/billing', billingRoutes);

app.use((_req, res) => sendError(res, 'Route not found', 404));

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
