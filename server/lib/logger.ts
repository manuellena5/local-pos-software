/**
 * Logger estructurado para LocalPosSoftware.
 * Formato: [timestamp] [LEVEL] [context] message {meta}
 * En producción podría reemplazarse por winston/pino sin cambiar la interfaz.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogMeta {
  [key: string]: unknown;
}

function formatMeta(meta?: LogMeta): string {
  if (!meta || Object.keys(meta).length === 0) return '';
  return ' ' + JSON.stringify(meta);
}

function log(level: LogLevel, context: string, message: string, meta?: LogMeta): void {
  const ts = new Date().toISOString();
  const line = `[${ts}] [${level.toUpperCase()}] [${context}] ${message}${formatMeta(meta)}`;
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug: (context: string, message: string, meta?: LogMeta) =>
    log('debug', context, message, meta),
  info: (context: string, message: string, meta?: LogMeta) =>
    log('info', context, message, meta),
  warn: (context: string, message: string, meta?: LogMeta) =>
    log('warn', context, message, meta),
  error: (context: string, message: string, meta?: LogMeta) =>
    log('error', context, message, meta),
};
