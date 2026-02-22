import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { env } from '~/config/env';
import transcriptRoutes from '~/routes/transcript.routes';
import { errorMiddleware } from '~/middleware/error.middleware';

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

app.use('/api/transcripts', transcriptRoutes);

app.use(errorMiddleware);

mongoose
  .connect(env.MONGODB_URI)
  .then(() => {
    console.log('[MongoDB] Connected');
    app.listen(Number(env.PORT), () => {
      console.log(`[Server] Running on http://localhost:${env.PORT}`);
    });
  })
  .catch((err) => {
    console.error('[MongoDB] Connection failed:', err.message);
    process.exit(1);
  });
