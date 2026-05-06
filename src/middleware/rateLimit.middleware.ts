import rateLimit from 'express-rate-limit';

// Tier 1: Global — 100 requests per minute per IP
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: parseInt(process.env.RATE_LIMIT_GLOBAL || '100'),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Too many requests',
    message: 'Please try again in a minute.',
  },
});

// Tier 2: Auth — 5 requests per minute per IP (login/register only)
export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: parseInt(process.env.RATE_LIMIT_AUTH || '5'),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Too many login attempts',
    message: 'Please wait a minute before trying again.',
  },
});

// Tier 3: AI — 10 requests per minute per user (by userId from JWT, IP fallback)
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: parseInt(process.env.RATE_LIMIT_AI || '10'),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: req => {
    // Prefer user ID from JWT if available, fall back to socket address
    return (req as any).user?.userId || req.headers['x-forwarded-for']?.toString() || req.socket?.remoteAddress || 'unknown';
  },
  message: {
    error: 'AI rate limit exceeded',
    message: 'You can generate up to 10 dashboards per minute. Please wait.',
  },
});