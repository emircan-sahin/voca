import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import multer from 'multer';
import { sendError } from '~/utils/response';
import { logger } from '~/config/logger';

export const errorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof ZodError) {
    const message = err.errors.map((e) => e.message).join(', ');
    return sendError(res, message, 400);
  }

  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? req.t('error.fileTooLarge')
      : err.message;
    return sendError(res, message, 400);
  }

  if (err.message?.startsWith('Unsupported audio format')) {
    const format = err.message.split(': ')[1] ?? '';
    return sendError(res, req.t('error.unsupportedFormat', { format }), 400);
  }

  if (err.name === 'CastError') {
    return sendError(res, req.t('error.invalidId'), 400);
  }

  logger.error('Error', err.message);
  if (err.stack) logger.local('Error', err.stack);
  logger.flush();
  sendError(res, req.t('error.internal'), 500);
};
