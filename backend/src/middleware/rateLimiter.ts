import rateLimit from 'express-rate-limit';
import { config } from '@/config/environment';
import { ErrorType, CustomError } from './errorHandler';

// General API rate limiter
export const apiRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.env === 'development' ? config.rateLimit.maxRequests * 10 : config.rateLimit.maxRequests, // 10x more lenient in dev
  message: {
    success: false,
    error: {
      type: ErrorType.RATE_LIMIT_ERROR,
      message: 'Too many requests from this IP, please try again later.',
      timestamp: new Date().toISOString(),
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.env === 'test', // Skip rate limiting in test environment
  handler: (_req, _res, next) => {
    const error = new CustomError(
      ErrorType.RATE_LIMIT_ERROR,
      'Rate limit exceeded',
      429
    );
    next(error);
  },
});

// Stricter rate limiter for authentication endpoints
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.env === 'development' ? 50 : 5, // More lenient in development
  message: {
    success: false,
    error: {
      type: ErrorType.RATE_LIMIT_ERROR,
      message: 'Too many authentication attempts, please try again later.',
      timestamp: new Date().toISOString(),
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skip: () => config.env === 'test', // Skip rate limiting in test environment
  handler: (_req, _res, next) => {
    const error = new CustomError(
      ErrorType.RATE_LIMIT_ERROR,
      'Too many authentication attempts, please try again later.',
      429
    );
    next(error);
  },
});

// File upload rate limiter
export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 uploads per minute
  message: {
    success: false,
    error: {
      type: ErrorType.RATE_LIMIT_ERROR,
      message: 'Too many file uploads, please try again later.',
      timestamp: new Date().toISOString(),
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    const error = new CustomError(
      ErrorType.RATE_LIMIT_ERROR,
      'Too many file uploads, please try again later.',
      429
    );
    next(error);
  },
});