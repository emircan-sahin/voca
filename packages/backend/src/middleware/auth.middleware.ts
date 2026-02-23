import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '~/services/auth.service';
import { UserModel } from '~/models/user.model';
import { sendError } from '~/utils/response';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string };
    }
  }
}

async function extractUser(req: Request): Promise<{ id: string; email: string } | null> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;

  try {
    const decoded = verifyToken(header.slice(7));
    const user = await UserModel.findById(decoded.sub).select('email').lean();
    if (!user) return null;
    return { id: decoded.sub, email: user.email };
  } catch {
    return null;
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const user = await extractUser(req);
  if (!user) return sendError(res, 'Unauthorized', 401);
  req.user = user;
  next();
};

export const optionalAuth = async (req: Request, _res: Response, next: NextFunction) => {
  req.user = (await extractUser(req)) ?? undefined;
  next();
};
