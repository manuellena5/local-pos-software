/**
 * Utilidades para formatear timestamps que vienen del backend.
 *
 * `created_at` (y columnas similares) se guardan vía SQLite `datetime('now')`,
 * que devuelve UTC como "YYYY-MM-DD HH:MM:SS" — sin sufijo 'Z' ni offset.
 * Si se le pasa ese string tal cual a `new Date()`, el motor JS lo interpreta
 * como hora LOCAL (no UTC), mostrando ~3hs de más en Argentina (UTC-3).
 * Por eso toda lectura de un timestamp del backend debe pasar por
 * `parseUtcTimestamp` antes de mostrarse o compararse.
 */

/** Convierte un timestamp del backend (UTC, sin sufijo) a un Date correcto. */
export function parseUtcTimestamp(raw: string): Date {
  const hasOffset = raw.includes('Z') || /[+-]\d{2}:\d{2}$/.test(raw);
  const iso = hasOffset ? raw : raw.replace(' ', 'T') + 'Z';
  return new Date(iso);
}

/** Formatea como fecha local "dd/mm/aaaa". */
export function formatDate(raw: string): string {
  return parseUtcTimestamp(raw).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** Formatea como hora local "HH:MM". */
export function formatTime(raw: string): string {
  return parseUtcTimestamp(raw).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Formatea como fecha y hora local "dd/mm/aaaa HH:MM". */
export function formatDateTime(raw: string): string {
  return `${formatDate(raw)} ${formatTime(raw)}`;
}

/** Día calendario local en formato "YYYY-MM-DD" — para agrupar o comparar por día. */
export function formatLocalDayKey(raw: string): string {
  const d = parseUtcTimestamp(raw);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
