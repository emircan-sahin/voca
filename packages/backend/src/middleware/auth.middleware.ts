import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '~/services/auth.service';
import { sendError } from '~/utils/response';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string };
    }
  }
}

function extractUser(req: Request): { id: string; email: string } | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;

  try {
    const { sub, email } = verifyToken(header.slice(7));
    return { id: sub, email };
  } catch {
    return null;
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const user = extractUser(req);
  if (!user) return sendError(res, 'Unauthorized', 401);
  req.user = user;
  next();
};

