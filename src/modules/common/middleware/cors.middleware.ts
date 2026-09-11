import cors from 'cors';
import { Request, Response, NextFunction } from 'express';
import { config } from '../../../config';

/** Strip trailing slashes so https://a.com matches https://a.com/ in CORS_ORIGIN */
const normalizeOrigin = (value: string) => value.trim().replace(/\/+$/, '');

/**
 * Check if a path is a payment callback route
 */
const isPaymentCallbackRoute = (path: string): boolean => {
  return path.includes('/payment/success') || 
         path.includes('/payment/fail') || 
         path.includes('/payment/cancel');
};

/**
 * CORS middleware for payment callbacks - allows all origins
 */
const paymentCallbackCorsMiddleware = cors({
  origin: true, // Allow all origins
  credentials: false,
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
});

/**
 * Dynamic CORS middleware
 * Allows origins from config, supports credentials (cookies)
 * Also allows SSLCommerz domains for payment callbacks
 * Payment callback routes allow all origins (they're form POSTs from SSLCommerz)
 * In production, restrict to specific domains
 */
const standardCorsMiddleware = cors({
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) => {
    // Allow requests with no origin (mobile apps, Postman, server-to-server).
    // Payment callback routes are already handled by paymentCallbackCorsMiddleware.
    if (!origin) {
      return callback(null, true);
    }

    // Allow all origins in development (when CORS_ORIGIN is '*')
    if (config.cors.origin.includes('*')) {
      return callback(null, true);
    }

    // In non-production, automatically allow any localhost or 127.0.0.1 origin
    if (config.nodeEnv !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }

    const normalizedRequest = normalizeOrigin(origin);
    const allowed = config.cors.origin.some(
      (o) => normalizeOrigin(o) === normalizedRequest
    );
    if (allowed) {
      callback(null, true);
    } else {
      // Do not pass an Error: that hits errorMiddleware and responds without CORS headers,
      // so browsers report "No 'Access-Control-Allow-Origin'" on preflight.
      callback(null, false);
    }
  },
  credentials: true, // Allow cookies/auth headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'Accept-Language',
    'Origin',
    'Referer',
  ],
});

/**
 * Conditional CORS middleware that applies permissive CORS for payment callbacks
 */
export const corsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Check if this is a payment callback route
  if (isPaymentCallbackRoute(req.path)) {
    return paymentCallbackCorsMiddleware(req, res, next);
  }
  // Otherwise use standard CORS
  return standardCorsMiddleware(req, res, next);
};

/**
 * CORS middleware specifically for payment callbacks
 * Allows all origins since SSLCommerz redirects via form POST
 * This should be applied at the route level BEFORE the global CORS middleware
 */
export const paymentCallbackCors = cors({
  origin: true, // Allow all origins for payment callbacks
  credentials: false, // No credentials needed for payment callbacks
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
});

