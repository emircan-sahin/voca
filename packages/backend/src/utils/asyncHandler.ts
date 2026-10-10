import { Request, Response, NextFunction, RequestHandler } from 'express';

// Express 4 does not forward rejected promises to errorMiddleware; an async throw
// would otherwise be an unhandled rejection (process crash on Node 20) and hang the request.
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };
