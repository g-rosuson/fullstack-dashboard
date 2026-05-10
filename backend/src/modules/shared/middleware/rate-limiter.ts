import rateLimit, { Options as RateLimitOptions } from 'express-rate-limit';

import config from 'config';

const rateLimiter = (options: Partial<RateLimitOptions>) => {
    return rateLimit({
        // windowMs: 300 * 60 * 1000, // 5 hrs in ms,
        // limit: 8, // Max 8 attempts per IP address and window,
        ...options,
        skip: () => config.enableHttpRateLimit === false,
        // Don't show rate limit info in the `RateLimit-*` headers
        standardHeaders: false,
        // Disable the `X-RateLimit-*` headers
        legacyHeaders: false,
    });
};

const loginLimiter = rateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 5,
    message: 'Too many login attempts. Please try again in 15 minutes.',
});

const registerLimiter = rateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    limit: 3,
    message: 'Too many accounts created from this IP. Try again in an hour.',
});

const refreshLimiter = rateLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    limit: 15,
    message: 'Too many token refresh attempts. Please slow down.',
});

export { registerLimiter, refreshLimiter, loginLimiter };
