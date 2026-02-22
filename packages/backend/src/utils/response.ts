import { Response } from 'express';

export const sendSuccess = <T>(res: Response, message: string, data: T) =>
  res.json({ success: true, message, data });

export const sendError = (res: Response, message: string, status = 400) =>
  res.status(status).json({ success: false, message, data: null });
