import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import * as XLSX from 'xlsx';
import { useSalesReport } from '@/core/hooks/useReports';
import { reportsApi } from '@/lib/api/reports';

interface Props {
  businessUnitId: number;
}

type Preset = 'today' | 'week' | 'month' | 'custom';

function getToday() {
  return new Date().toISOString().slice(0, 10);
}
function getWeekStart() {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  return d.toISOString().slice(0, 10);
}
function getMonthStart() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

const METHOD_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  mercadopago: 'Mercado Pago',
  transfer: 'Transferencia',
  modo: 'Modo / Ualá',
};

export function SalesReportPage({ businessUnitId }: Props) {
  const [preset, setPreset] = useState<Preset>('today');
  const [customFrom, setCustomFrom] = useState(getToday());
  const [customTo, setCustomTo] = useState(getToday());

  const fromDate = preset === 'today' ? getToday()
    : preset === 'week' ? getWeekStart()
    : preset === 'month' ? getMonthStart()
    : customFrom;
  const toDate = preset === 'custom' ? customTo : getToday();

  const { data, loading, error, load } = useSalesReport(businessUnitId);

  useEffect(() => {
    load(fromDate, toDate);
  }, [fromDate, toDate, load]);

  const totals = data.reduce(
    (acc, r) => ({
      sales: acc.sales + r.totalSales,
      amount: acc.amount + r.totalAmount,
    }),
    { sales: 0, amount: 0 },
  );

  function handleExportCSV() {
    const url = reportsApi.getExportURL(businessUnitId, 'sales', { fromDate, toDate });
    window.open(url, '_blank');
  }

  function handleExportExcel() {
    const rows = data.map((r) => ({
      Fecha: r.date,
      Ventas: r.totalSales,
      Total: r.totalAmount,
      'Ticket promedio': r.avgTicket,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ventas');
    XLSX.writeFile(wb, `ventas-${fromDate}-${toDate}.xlsx`);
  }

  const chartData = data.map((r) => ({
    date: new Date(r.date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }),
    total: r.totalAmount,
    ventas: r.totalSales,
  }));

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        {(['today', 'week', 'month', 'custom'] as Preset[]).map((p) => (
          <button
            key={p}
            onClick={() => setPreset(p)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              preset === p ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {p === 'today' ? 'Hoy' : p === 'week' ? 'Últimos 7 días' : p === 'month' ? 'Este mes' : 'Rango custom'}
          </button>
        ))}

        {preset === 'custom' && (
          <div className="flex gap-2 items-center">
            <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm" />
            <span className="text-gray-400">→</span>
            <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm" />
          </div>
        )}

        <div className="ml-auto flex gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
          >
            ↓ CSV
          </button>
          <button
            onClick={handleExportExcel}
            disabled={data.length === 0}
            className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
          >
            ↓ Excel
          </button>
        </div>
      </div>

      {/* Resumen */}
      {data.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-blue-700">{totals.sales}</p>
            <p className="text-xs text-blue-500 mt-0.5">Ventas totales</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-700">${totals.amount.toFixed(2)}</p>
            <p className="text-xs text-green-500 mt-0.5">Monto total</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-purple-700">
              ${totals.sales > 0 ? (totals.amount / totals.sales).toFixed(2) : '0.00'}
            </p>
            <p className="text-xs text-purple-500 mt-0.5">Ticket promedio</p>
          </div>
        </div>
      )}

      {/* Gráfico de barras */}
      {!loading && chartData.length > 1 && (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={60} tickFormatter={(v: number) => `$${v.toFixed(0)}`} />
              <Tooltip formatter={(v) => [`$${Number(v).toFixed(2)}`, 'Total']} />
              <Bar dataKey="total" fill="#2563eb" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabla */}
      {loading ? (
        <p className="text-center text-gray-400 py-8 text-sm">Cargando reporte...</p>
      ) : error ? (
        <p className="text-center text-red-500 py-8 text-sm">{error}</p>
      ) : data.length === 0 ? (
        <p className="text-center text-gray-400 py-8 text-sm">Sin ventas en el período seleccionado</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs text-gray-500 font-medium py-2 px-3">Fecha</th>
                <th className="text-right text-xs text-gray-500 font-medium py-2 px-3">Ventas</th>
                <th className="text-right text-xs text-gray-500 font-medium py-2 px-3">Total</th>
                <th className="text-right text-xs text-gray-500 font-medium py-2 px-3">Ticket prom.</th>
                <th className="text-left text-xs text-gray-500 font-medium py-2 px-3">Medios de pago</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.date} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2.5 px-3 font-medium text-gray-900">
                    {new Date(r.date + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                  </td>
                  <td className="py-2.5 px-3 text-right text-gray-700">{r.totalSales}</td>
                  <td className="py-2.5 px-3 text-right font-semibold text-gray-900">${r.totalAmount.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right text-gray-500">${r.avgTicket.toFixed(2)}</td>
                  <td className="py-2.5 px-3">
                    <div className="flex flex-wrap gap-1">
                      {r.paymentBreakdown.map((pb) => (
                        <span key={pb.method} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                          {METHOD_LABELS[pb.method] ?? pb.method}: ${pb.amount.toFixed(0)}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
