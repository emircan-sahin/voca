import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
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

  console.error('[Error]', err.message);
  sendError(res, 'Internal server error', 500);
};
