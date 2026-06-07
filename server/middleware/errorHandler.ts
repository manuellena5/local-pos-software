import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors';

interface ZodIssue { path: (string | number)[]; message: string; }

function formatZodDetails(details: unknown): string[] | null {
  if (!Array.isArray(details)) return null;
  const issues = details as ZodIssue[];
  if (!issues.length || typeof issues[0].message !== 'string') return null;
  return issues.map((i) => {
    const field = i.path.length ? i.path.join('.') : null;
    return field ? `${field}: ${i.message}` : i.message;
  });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    const details = (err as AppError & { details?: unknown }).details;
    // Formatear detalles de Zod en mensajes legibles
    const humanDetails = formatZodDetails(details);
    console.error(`[Server] ${err.code}: ${err.message}`, humanDetails ?? details ?? '');
    res.status(err.statusCode).json({
      data: null,
      error: { code: err.code, message: err.message, details: humanDetails ?? details },
    });
    return;
  }

  console.error('[Server] Unhandled error:', err);
  res.status(500).json({
    data: null,
    error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor', details: null },
  });
}
