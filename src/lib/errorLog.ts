const STORAGE_KEY = 'localpos.errorlog';
const MAX_ENTRIES = 100;

export interface ErrorLogEntry {
  id: string;
  timestamp: string;
  code: string;
  message: string;
  details?: string[] | null;
  context?: string;
}

function load(): ErrorLogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ErrorLogEntry[]) : [];
  } catch { return []; }
}

function persist(entries: ErrorLogEntry[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); } catch { /* ignore */ }
}

export function logError(err: { code?: string; message: string; details?: unknown }, context?: string): void {
  const entries = load();
  const entry: ErrorLogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    code: err.code ?? 'UNKNOWN',
    message: err.message,
    details: Array.isArray(err.details) ? (err.details as string[]) : null,
    context,
  };
  entries.unshift(entry);
  persist(entries.slice(0, MAX_ENTRIES));
}

export function getErrorLog(): ErrorLogEntry[] {
  return load();
}

export function clearErrorLog(): void {
  persist([]);
}
