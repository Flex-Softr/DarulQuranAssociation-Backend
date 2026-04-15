import { Request, Response, NextFunction } from 'express';
import { ApiError } from './error.middleware';
import { HTTP_STATUS } from '../../../constants';
import { logger } from '../utils/logger';
import { config } from '../../../config';

/**
 * Origin validation middleware
 * Only allows requests from specified origins
 * Uses CORS_ORIGIN from config, with fallback to hardcoded origins
 */
export const originMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Allow OPTIONS requests (CORS preflight) - CORS middleware handles these
  if (req.method === 'OPTIONS') {
    return next();
  }

  // Get allowed origins from config (supports '*' for development)
  const configOrigins = config.cors.origin;
  
  // Fallback hardcoded origins if config doesn't have specific ones
  const hardcodedOrigins = [
    'https://darulquranfoundation.org',
    'https://api.darulquranfoundation.org',
    'http://localhost:3000',
    'https://localhost:3000',
    'http://127.0.0.1:3000',
    'https://127.0.0.1:3000',
  ];

  // Combine config origins with hardcoded ones, remove duplicates
  const allowedOrigins = [
    ...new Set([...configOrigins, ...hardcodedOrigins])
  ];

  // If '*' is in allowed origins, allow all requests (development mode)
  // Also bypass in development environment
  if (allowedOrigins.includes('*') || config.nodeEnv === 'development') {
    logger.debug('Origin check bypassed', {
      path: req.path,
      method: req.method,
      reason: allowedOrigins.includes('*') ? 'CORS_ORIGIN is *' : 'Development mode',
    });
    return next();
  }

  // Get origin from Origin header or extract from Referer header
  let origin: string | null = req.headers.origin || null;
  
  if (!origin && req.headers.referer) {
    try {
      origin = new URL(req.headers.referer).origin;
    } catch (error) {
      logger.warn('Invalid referer URL', { 
        referer: req.headers.referer,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      origin = null;
    }
  }

  // Log request details for debugging
  logger.debug('Origin validation check', {
    path: req.path,
    method: req.method,
    origin,
    referer: req.headers.referer,
    allowedOrigins,
    userAgent: req.headers['user-agent'],
  });

  // For server-side requests (like Next.js server components), be more lenient
  // If there's a Referer header but no Origin, and it's from an allowed domain, allow it
  if (!origin && req.headers.referer) {
    try {
      const refererUrl = new URL(req.headers.referer);
      const refererOrigin = refererUrl.origin;
      
      // Check if referer origin matches any allowed origin
      if (allowedOrigins.some(allowed => {
        try {
          const allowedUrl = new URL(allowed);
          return allowedUrl.origin === refererOrigin;
        } catch {
          // If allowed is not a full URL, use strict equality
          return allowed === refererOrigin;
        }
      })) {
        logger.debug('Origin validation passed via Referer', {
          path: req.path,
          refererOrigin,
        });
        return next();
      }
    } catch (error) {
      // Invalid referer, continue to check origin
    }
  }

  // If no origin is present, reject the request
  if (!origin) {
    logger.warn('Request rejected: No origin header', {
      path: req.path,
      method: req.method,
      referer: req.headers.referer,
      headers: {
        origin: req.headers.origin,
        referer: req.headers.referer,
        'user-agent': req.headers['user-agent'],
      },
    });
    throw new ApiError(
      HTTP_STATUS.FORBIDDEN,
      'You are not allowed to access this resource. Origin header is required.'
    );
  }

  // Normalize origin for comparison (remove trailing slashes, ensure protocol consistency)
  const normalizedOrigin = origin.trim().replace(/\/$/, '');
  const normalizedAllowed = allowedOrigins.map(o => o.trim().replace(/\/$/, ''));

  // Check if origin is in allowed list (strict match only)
  const isAllowed = normalizedAllowed.some(allowed => {
    if (allowed === '*') return true;
    return normalizedOrigin === allowed;
  });

  if (!isAllowed) {
    logger.warn('Request rejected: Origin not allowed', {
      path: req.path,
      method: req.method,
      origin: normalizedOrigin,
      allowedOrigins: normalizedAllowed,
      headers: {
        origin: req.headers.origin,
        referer: req.headers.referer,
      },
    });
    throw new ApiError(
      HTTP_STATUS.FORBIDDEN,
      "You are not allowed to access this resource from this origin."
    );
  }

  logger.debug('Origin validation passed', {
    path: req.path,
    origin: normalizedOrigin,
  });

  next();
};

