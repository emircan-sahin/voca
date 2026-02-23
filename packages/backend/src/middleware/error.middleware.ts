import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import multer from 'multer';
import { sendError } from '~/utils/response';

export const errorMiddleware = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof ZodError) {
    const message = err.errors.map((e) => e.message).join(', ');
    return sendError(res, message, 400);
  }

  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? 'File too large (max 25 MB)'
      : err.message;
    return sendError(res, message, 400);
  }

  if (err.message?.startsWith('Unsupported audio format')) {
    return sendError(res, err.message, 400);
  }

  if (err.name === 'CastError') {
    return sendError(res, 'Invalid ID format', 400);
  }

  console.error('[Error]', err.message);
  if (err.stack) console.error(err.stack);
  sendError(res, 'Internal server error', 500);
};
