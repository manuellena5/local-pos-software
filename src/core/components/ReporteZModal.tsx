import { useState, useEffect } from 'react';
import { cashboxApi } from '@/lib/api/cashbox';
import { formatDateTime } from '@/lib/utils/dateFormat';
import type { ReporteZData } from '@shared/types';

interface Props {
  auditId: number;
  businessUnitId: number;
  onClose: () => void;
}

function fmtMoney(n: number): string {
  return `$${Math.abs(n)
    .toFixed(2)
    .replace('.', ',')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  debit: 'Tarjeta débito',
  credit: 'Tarjeta crédito',
  mercadopago: 'Mercado Pago',
  modo: 'Modo / Ualá',
  other: 'Otro',
};

function methodLabel(method: string): string {
  return PAYMENT_METHOD_LABEL[method.toLowerCase()] ?? method;
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between gap-2 ${bold ? 'font-bold' : ''}`}>
      <span className="text-left">{label}</span>
      <span className="text-right tabular-nums">{value}</span>
    </div>
  );
}

function Separator() {
  return <div className="border-t border-dashed border-gray-300 my-1" />;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="font-bold text-center mt-1">{children}</p>;
}

export function ReporteZModal({ auditId, businessUnitId, onClose }: Props) {
  const [data, setData] = useState<ReporteZData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);
  const [printResult, setPrintResult] = useState<{ success: boolean; error?: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    cashboxApi
      .getReporteZ(auditId, businessUnitId)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error al cargar el reporte');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [auditId, businessUnitId]);

  async function handlePrint() {
    if (!data) return;
    setPrinting(true);
    setPrintResult(null);
    try {
      const result = await cashboxApi.printReporteZ(data);
      setPrintResult(result);
    } catch (err) {
      setPrintResult({ success: false, error: err instanceof Error ? err.message : 'Error al imprimir' });
    } finally {
      setPrinting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Reporte Z</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Contenido */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          {loading && <p className="text-center text-gray-400 py-8 text-sm">Cargando reporte...</p>}
          {error && <p className="text-center text-red-600 py-8 text-sm">{error}</p>}

          {data && (
            <div className="font-mono text-xs space-y-0.5 leading-snug">
              {/* Header */}
              <p className="text-center font-bold text-sm">{data.businessName}</p>
              <p className="text-center text-gray-600">{data.businessUnitName}</p>
              <p className="text-center font-bold">*** REPORTE Z ***</p>

              <Separator />

              <p>Apertura: {formatDateTime(data.openedAt)}</p>
              <p>Cierre:   {formatDateTime(data.closedAt)}</p>
              {data.operatorEmail && <p className="truncate">Operador: {data.operatorEmail}</p>}

              <Separator />

              <SectionTitle>VENTAS DEL PERÍODO</SectionTitle>
              <Row label="Cantidad de ventas:" value={String(data.sales.count)} />
              <Row label="Ventas anuladas:" value={String(data.sales.cancelledCount)} />
              <Row label="Ticket promedio:" value={fmtMoney(data.sales.averageTicket)} />
              <Row label="TOTAL VENTAS" value={fmtMoney(data.sales.total)} bold />

              {data.sales.byPaymentMethod.length > 0 && (
                <>
                  <Separator />
                  <SectionTitle>DESGLOSE POR MEDIO DE PAGO</SectionTitle>
                  {data.sales.byPaymentMethod.map((pm) => (
                    <Row key={pm.method} label={methodLabel(pm.method)} value={fmtMoney(pm.amount)} />
                  ))}
                </>
              )}

              <Separator />

              <SectionTitle>MOVIMIENTOS DE CAJA</SectionTitle>
              <Row label="Saldo inicial:" value={fmtMoney(data.cash.openingBalance)} />
              <Row label="Ingresos manuales:" value={fmtMoney(data.cash.manualIncome)} />
              <Row label="Egresos manuales:" value={fmtMoney(data.cash.manualExpense)} />
              <Row label="Cobros en efectivo:" value={fmtMoney(data.cash.cashSalesTotal)} />
              <Separator />
              <Row label="Saldo teórico:" value={fmtMoney(data.cash.theoreticalBalance)} />
              <Row label="Saldo declarado:" value={fmtMoney(data.cash.declaredBalance)} />
              <Row
                label="Diferencia:"
                value={`${data.cash.difference >= 0 ? '+' : ''}${fmtMoney(Math.abs(data.cash.difference))}`}
                bold
              />

              {(data.afip.emitted > 0 || data.afip.pending > 0) && (
                <>
                  <Separator />
                  <SectionTitle>FACTURACIÓN AFIP</SectionTitle>
                  <Row label="Comprobantes emitidos:" value={String(data.afip.emitted)} />
                  <Row label="Comprobantes pendientes:" value={String(data.afip.pending)} />
                </>
              )}

              <Separator />
              <p className="text-center text-gray-500">{data.generatedAt}</p>
            </div>
          )}

          {printResult && (
            <div
              className={`mt-3 text-xs rounded px-3 py-2 ${
                printResult.success
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {printResult.success
                ? '✓ Impresión enviada correctamente'
                : `✗ Error: ${printResult.error ?? 'Error desconocido'}`}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={handlePrint}
            disabled={!data || printing}
            className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {printing ? 'Imprimiendo...' : 'Imprimir'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
