import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { env } from '~/config/env';
import authRoutes from '~/routes/auth.routes';
import transcriptRoutes from '~/routes/transcript.routes';
import { errorMiddleware } from '~/middleware/error.middleware';
import { sendError } from '~/utils/response';

const app = express();

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174'] }));
app.use(express.json());

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

app.use('/api/auth', authRoutes);
app.use('/api/transcripts', transcriptRoutes);

app.use((_req, res) => sendError(res, 'Route not found', 404));

app.use(errorMiddleware);

mongoose
  .connect(env.MONGODB_URI)
  .then(() => {
    console.log('[MongoDB] Connected');
    const server = app.listen(env.PORT, () => {
      console.log(`[Server] Running on http://localhost:${env.PORT}`);
    });

    const shutdown = () => {
      console.log('[Server] Shutting down...');
      server.close(() => {
        mongoose.disconnect().then(() => {
          console.log('[MongoDB] Disconnected');
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
