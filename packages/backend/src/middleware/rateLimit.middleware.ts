import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { Request } from 'express';
import { sendError } from '~/utils/response';
import { env } from '~/config/env';

const behindCloudflare = env.TRUST_PROXY === 'cloudflare';

// Cloudflare overwrites CF-Connecting-IP with the visitor's IP, so it can't be spoofed as long as
// the origin only accepts traffic through Cloudflare (tunnel or firewall).
const clientIp = (req: Request) => (behindCloudflare && req.get('cf-connecting-ip')) || req.ip!;

function createLimiter(limit: number, messageKey: string) {
  return rateLimit({
    windowMs: 60_000,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req: Request) => req.user?.id ?? ipKeyGenerator(clientIp(req)),
    // Cloudflare always adds X-Forwarded-For; we read CF-Connecting-IP instead of trusting it
    validate: { xForwardedForHeader: !behindCloudflare },
    handler: (req, res) => sendError(res, req.t(messageKey), 429),
  });
}

export const globalLimiter = createLimiter(60, 'error.tooManyRequests');
export const authLimiter = createLimiter(10, 'error.tooManyAuth');
export const transcriptLimiter = createLimiter(10, 'error.tooManyTranscripts');
export const webhookLimiter = createLimiter(100, 'error.tooManyRequests');
