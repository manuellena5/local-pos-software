/**
 * Logger estructurado para LocalPosSoftware.
 * Formato: [timestamp] [LEVEL] [context] message {meta}
 * En producción podría reemplazarse por winston/pino sin cambiar la interfaz.
 *
 * Dentro de la app empaquetada (Electron), además de la consola, cada línea
 * se persiste a userData/logs/main.log vía electron-log, para poder pedirle
 * el archivo al usuario si algo falla. En dev/tests (proceso Node normal,
 * sin Electron) solo se usa console — electron-log ni se carga.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogMeta {
  [key: string]: unknown;
}

interface FileLogger {
  debug(message: string): void;
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

const isElectron = !!process.versions.electron;

let fileLogger: FileLogger | null = null;
if (isElectron) {
  try {
    // Require condicional: electron-log asume que corre dentro de Electron
    // (usa app.getPath internamente) — importarlo fuera de Electron podría
    // fallar, por eso el require queda detrás del check de isElectron.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const electronLog = require('electron-log') as FileLogger & {
      transports: { file: { level: string }; console: { level: boolean | string } };
    };
    electronLog.transports.file.level = 'debug';
    electronLog.transports.console.level = false; // la consola la maneja este módulo
    fileLogger = electronLog;
  } catch {
    fileLogger = null;
  }
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
  fileLogger?.[level](line);
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
