import { useState, useEffect } from 'react';
import { salesApi } from '@/lib/api/sales';
import { cashboxApi } from '@/lib/api/cashbox';
import { formatDate as fmtDate, formatTime as fmtTime } from '@/lib/utils/dateFormat';
import { useAppStore } from '@/core/store/appStore';
import type { SaleListEntry, CashSessionSummary } from '@shared/types';
import type { UseSalesFilters } from '../hooks/useSales';

interface Props {
  sales: SaleListEntry[];
  loading: boolean;
  filters: UseSalesFilters;
  onFiltersChange: (filters: UseSalesFilters) => void;
  selectedId: number | null;
  onSelect: (sale: SaleListEntry) => void;
  businessUnitId: number;
}

const PAYMENT_BADGE: Record<string, string> = {
  cash: 'bg-green-100 text-green-700',
  transfer: 'bg-blue-100 text-blue-700',
  card: 'bg-gray-100 text-gray-700',
  mercadopago: 'bg-yellow-100 text-yellow-700',
  modo: 'bg-indigo-100 text-indigo-700',
  other: 'bg-gray-100 text-gray-600',
};

const PAYMENT_LABEL: Record<string, string> = {
  cash: 'Efectivo',
  transfer: 'Transfer.',
  card: 'Tarjeta',
  mercadopago: 'MP',
  modo: 'Modo',
  other: 'Otro',
};

function paymentBadge(method: string): string {
  return PAYMENT_BADGE[method.toLowerCase()] ?? 'bg-gray-100 text-gray-600';
}
function paymentLabel(method: string): string {
  return PAYMENT_LABEL[method.toLowerCase()] ?? method;
}

const DATE_PRESETS = [
  { label: 'Hoy', days: 0 },
  { label: 'Ayer', days: 1 },
  { label: '7 días', days: 7 },
  { label: 'Este mes', days: 30 },
] as const;

// sales.createdAt se guarda en UTC — estos cálculos deben ser en hora LOCAL,
// o "Hoy" pediría el día siguiente apenas UTC cruza medianoche (~21:00 ART).
function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getTodayLocal(): string {
  return formatLocalDate(new Date());
}

function presetDateFrom(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return formatLocalDate(d);
}

export function SalesList({
  sales,
  loading,
  filters,
  onFiltersChange,
  selectedId,
  onSelect,
  businessUnitId,
}: Props) {
  const [reprinting, setReprinting] = useState<number | null>(null);
  const [reprintMsg, setReprintMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [sessions, setSessions] = useState<CashSessionSummary[]>([]);
  const printerStatus = useAppStore((s) => s.printerStatus);

  useEffect(() => {
    cashboxApi.getSessions(businessUnitId)
      .then(setSessions)
      .catch(() => { /* sessions son opcionales, ignorar error */ });
  }, [businessUnitId]);

  const completed = sales.filter((s) => s.status === 'completed');
  const cancelled = sales.filter((s) => s.status === 'cancelled');
  const total = completed.reduce((s, v) => s + v.totalAmount, 0);
  const avgTicket = completed.length > 0 ? total / completed.length : 0;

  function updateFilter<K extends keyof UseSalesFilters>(key: K, value: UseSalesFilters[K]) {
    onFiltersChange({ ...filters, [key]: value });
  }

  function applyPreset(days: number) {
    onFiltersChange({ ...filters, dateFrom: presetDateFrom(days), dateTo: getTodayLocal() });
  }

  function isPresetActive(days: number): boolean {
    return filters.dateFrom === presetDateFrom(days) && filters.dateTo === getTodayLocal();
  }

  async function handleReprint(e: React.MouseEvent, saleId: number) {
    e.stopPropagation();
    if (reprinting !== null) return;
    setReprintMsg(null);

    if (printerStatus !== 'connected') {
      setReprintMsg({ text: 'Impresora no disponible. Verificá la conexión en Configuración.', ok: false });
      return;
    }

    setReprinting(saleId);
    try {
      const result = await salesApi.reprint(saleId, businessUnitId);
      if (result.success) {
        setReprintMsg({ text: 'Ticket enviado a la impresora.', ok: true });
      } else {
        setReprintMsg({ text: result.error ?? 'No se pudo imprimir. Verificá la impresora.', ok: false });
      }
    } catch {
      setReprintMsg({ text: 'No se pudo reimprimir. Verificá la impresora.', ok: false });
    } finally {
      setReprinting(null);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* CAMBIO 1 — Barra de métricas */}
      <div
        className="flex items-center shrink-0 border-b"
        style={{ height: '52px', background: '#fafafa', borderColor: '#e2e8f0' }}
      >
        <div className="flex flex-col justify-center px-4 border-r h-full" style={{ borderColor: '#e2e8f0' }}>
          <span className="text-[10px] uppercase text-gray-400 tracking-wide leading-none mb-1">Total período</span>
          <span className="text-base font-bold leading-none" style={{ color: '#2563eb' }}>
            ${total.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex flex-col justify-center px-4 border-r h-full" style={{ borderColor: '#e2e8f0' }}>
          <span className="text-[10px] uppercase text-gray-400 tracking-wide leading-none mb-1">Ventas</span>
          <span className="text-base font-bold text-gray-700 leading-none">{completed.length}</span>
        </div>
        <div className="flex flex-col justify-center px-4 border-r h-full" style={{ borderColor: '#e2e8f0' }}>
          <span className="text-[10px] uppercase text-gray-400 tracking-wide leading-none mb-1">Ticket prom.</span>
          <span className="text-base font-bold text-gray-700 leading-none">
            ${avgTicket.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex flex-col justify-center px-4 h-full">
          <span className="text-[10px] uppercase text-gray-400 tracking-wide leading-none mb-1">Anuladas</span>
          <span
            className="text-base font-bold leading-none"
            style={{ color: cancelled.length > 0 ? '#dc2626' : '#9ca3af' }}
          >
            {cancelled.length}
          </span>
        </div>
      </div>

      {/* CAMBIO 2 — Filtros compactos 2 filas */}
      <div className="shrink-0 border-b py-1.5 flex flex-col gap-1.5" style={{ borderColor: '#e2e8f0' }}>
        {/* Fila 1: presets + rango de fechas */}
        <div className="flex items-center gap-1.5 px-1">
          {DATE_PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => applyPreset(p.days)}
              className="px-2.5 text-xs font-medium border transition-colors shrink-0"
              style={{
                height: '26px',
                borderRadius: '13px',
                background: isPresetActive(p.days) ? '#2563eb' : 'white',
                color: isPresetActive(p.days) ? 'white' : '#6b7280',
                borderColor: isPresetActive(p.days) ? '#2563eb' : '#d1d5db',
              }}
            >
              {p.label}
            </button>
          ))}
          <div className="flex items-center gap-1 ml-1">
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => updateFilter('dateFrom', e.target.value)}
              className="border border-gray-200 rounded text-xs px-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
              style={{ width: '110px', height: '26px' }}
            />
            <span className="text-gray-400 text-xs">→</span>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => updateFilter('dateTo', e.target.value)}
              className="border border-gray-200 rounded text-xs px-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
              style={{ width: '110px', height: '26px' }}
            />
          </div>
        </div>

        {/* Fila 2: búsqueda + estado + medio de pago */}
        <div className="flex items-center gap-1.5 px-1">
          <input
            type="text"
            placeholder="Buscar N°, cliente, producto..."
            value={filters.search ?? ''}
            onChange={(e) => updateFilter('search', e.target.value || undefined)}
            className="flex-1 border border-gray-200 rounded text-xs px-2 focus:outline-none focus:ring-1 focus:ring-blue-400"
            style={{ height: '26px' }}
          />
          <select
            value={filters.status ?? 'all'}
            onChange={(e) => updateFilter('status', e.target.value as UseSalesFilters['status'])}
            className="border border-gray-200 rounded text-xs px-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 shrink-0"
            style={{ height: '26px' }}
          >
            <option value="all">Todos estados</option>
            <option value="completed">Completadas</option>
            <option value="cancelled">Anuladas</option>
          </select>
          <select
            value={filters.paymentMethod ?? ''}
            onChange={(e) => updateFilter('paymentMethod', e.target.value || undefined)}
            className="border border-gray-200 rounded text-xs px-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 shrink-0"
            style={{ height: '26px' }}
          >
            <option value="">Todos medios</option>
            <option value="cash">Efectivo</option>
            <option value="transfer">Transferencia</option>
            <option value="card">Tarjeta</option>
            <option value="mercadopago">Mercado Pago</option>
            <option value="modo">Modo/Ualá</option>
          </select>
          {sessions.length > 0 && (
            <select
              value={filters.cashSessionId ?? ''}
              onChange={(e) =>
                updateFilter('cashSessionId', e.target.value ? Number(e.target.value) : undefined)
              }
              className="border border-gray-200 rounded text-xs px-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 shrink-0 font-mono"
              style={{ height: '26px' }}
            >
              <option value="">Todas sesiones</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Feedback de reimpresión */}
      {reprintMsg && (
        <div className="shrink-0 flex items-center justify-between px-3 py-1.5 text-xs border-b"
          style={{
            background: reprintMsg.ok ? '#f0fdf4' : '#fef2f2',
            borderColor: reprintMsg.ok ? '#bbf7d0' : '#fecaca',
            color: reprintMsg.ok ? '#16a34a' : '#dc2626',
          }}
        >
          <span>{reprintMsg.text}</span>
          <button onClick={() => setReprintMsg(null)} className="ml-3 opacity-60 hover:opacity-100">×</button>
        </div>
      )}

      {/* CAMBIO 3 — Tabla 6 columnas */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <p className="text-center text-gray-400 text-sm py-8">Cargando ventas...</p>
        ) : sales.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-8">
            No hay ventas en el período seleccionado.
          </p>
        ) : (
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b" style={{ borderColor: '#e2e8f0' }}>
                <th className="text-left py-2 px-3 text-[10px] uppercase text-gray-400 font-medium tracking-wide whitespace-nowrap">Venta</th>
                <th className="text-left py-2 px-3 text-[10px] uppercase text-gray-400 font-medium tracking-wide">Cliente</th>
                <th className="text-left py-2 px-3 text-[10px] uppercase text-gray-400 font-medium tracking-wide">Productos</th>
                <th className="text-right py-2 px-3 text-[10px] uppercase text-gray-400 font-medium tracking-wide whitespace-nowrap">Total</th>
                <th className="text-center py-2 px-3 text-[10px] uppercase text-gray-400 font-medium tracking-wide">Pago</th>
                <th className="py-2 px-3 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => {
                const isSelected = sale.id === selectedId;
                const isCancelled = sale.status === 'cancelled';
                const primaryPayment = sale.paymentMethods[0];
                const productNames = sale.items.map((i) => i.productName).join(', ');

                return (
                  <tr
                    key={sale.id}
                    onClick={() => onSelect(sale)}
                    className="border-b cursor-pointer"
                    style={{
                      borderColor: '#f1f5f9',
                      background: isSelected ? '#eff6ff' : undefined,
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background = '#f8fafc';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background = '';
                    }}
                  >
                    {/* Col 1 — Venta */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className="font-bold"
                        style={{
                          color: isCancelled ? '#9ca3af' : '#2563eb',
                          textDecoration: isCancelled ? 'line-through' : undefined,
                        }}
                      >
                        #{sale.saleNumber}
                      </span>
                      <div className="text-gray-400 mt-0.5" style={{ fontSize: '11px' }}>
                        {fmtDate(sale.createdAt)} {fmtTime(sale.createdAt)}
                      </div>
                    </td>

                    {/* Col 2 — Cliente */}
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-gray-800 truncate max-w-[140px]">
                        {sale.customerName ?? 'Consumidor final'}
                      </div>
                      {sale.customerDocument && (
                        <div className="text-gray-400 mt-0.5 truncate max-w-[140px]" style={{ fontSize: '11px' }}>
                          {sale.customerDocumentType} {sale.customerDocument}
                        </div>
                      )}
                    </td>

                    {/* Col 3 — Productos */}
                    <td className="py-2.5 px-3 max-w-[200px]">
                      <div className="text-gray-700 truncate" title={productNames}>
                        {productNames || '—'}
                      </div>
                      <div className="text-gray-400 mt-0.5" style={{ fontSize: '11px' }}>
                        {sale.totalItems} {sale.totalItems === 1 ? 'artículo' : 'artículos'} · {sale.totalUnits}{' '}
                        {sale.totalUnits === 1 ? 'unidad' : 'unidades'}
                      </div>
                    </td>

                    {/* Col 4 — Total */}
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <span
                        className="font-bold"
                        style={{ color: isCancelled ? '#9ca3af' : '#111827' }}
                      >
                        ${sale.totalAmount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      {sale.roundingAdjustment < 0 && (
                        <div className="text-orange-600" style={{ fontSize: '10px' }}>
                          redondeo −${Math.abs(sale.roundingAdjustment).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      )}
                    </td>

                    {/* Col 5 — Pago */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      {primaryPayment && (
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${paymentBadge(primaryPayment.method)}`}
                        >
                          {paymentLabel(primaryPayment.method)}
                          {sale.paymentMethods.length > 1 && ` +${sale.paymentMethods.length - 1}`}
                        </span>
                      )}
                    </td>

                    {/* Col 6 — Acciones */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelect(sale);
                          }}
                          title="Ver detalle"
                          className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                        >
                          👁
                        </button>
                        <button
                          onClick={(e) => handleReprint(e, sale.id)}
                          title="Reimprimir ticket"
                          className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors disabled:opacity-40"
                          disabled={reprinting === sale.id}
                        >
                          🖨
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
