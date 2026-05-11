import { useState, useEffect, useCallback } from 'react';
import { tallerMedidaApi } from '../api/tallerMedidaApi';
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TRANSITIONS,
  PAYMENT_TYPES,
  PAYMENT_TYPE_LABELS,
  type OrderStatus,
  type PaymentType,
  type TallerOrder,
  type TallerOrderPayment,
} from '../types';

type OrderDetail = TallerOrder & {
  paidAmount:    number;
  pendingAmount: number;
  payments:      TallerOrderPayment[];
};

interface Props {
  orderId: number;
  onBack:  () => void;
}

const STATUS_COLORS: Record<OrderStatus, string> = {
  presupuestado: 'bg-gray-100 text-gray-600',
  confirmado:    'bg-blue-100 text-blue-700',
  en_confeccion: 'bg-purple-100 text-purple-700',
  en_prueba:     'bg-orange-100 text-orange-700',
  listo:         'bg-green-100 text-green-700',
  entregado:     'bg-gray-100 text-gray-400',
  cancelado:     'bg-red-100 text-red-400',
};

export function OrderDetailScreen({ orderId, onBack }: Props) {
  const [order, setOrder]       = useState<OrderDetail | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [statusError, setStatusError]   = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Payment form
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentType, setPaymentType]     = useState<PaymentType>('saldo');
  const [paymentNotes, setPaymentNotes]   = useState('');
  const [addingPayment, setAddingPayment] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await tallerMedidaApi.getOrder(orderId);
      setOrder(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => { void load(); }, [load]);

  const handleStatusChange = async (status: OrderStatus) => {
    setStatusError(null);
    try {
      await tallerMedidaApi.updateStatus(orderId, { status });
      await load();
    } catch (e) {
      setStatusError((e as Error).message);
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError(null);
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) { setPaymentError('Monto inválido'); return; }

    setAddingPayment(true);
    try {
      await tallerMedidaApi.addPayment(orderId, {
        amount,
        paymentType,
        notes: paymentNotes.trim() || undefined,
      });
      setPaymentAmount('');
      setPaymentNotes('');
      setShowPaymentForm(false);
      await load();
    } catch (e) {
      setPaymentError((e as Error).message);
    } finally {
      setAddingPayment(false);
    }
  };

  if (loading) return <p className="text-gray-400 text-sm">Cargando pedido...</p>;
  if (error)   return <p className="text-red-500 text-sm">{error}</p>;
  if (!order)  return null;

  const nextStatuses = ORDER_STATUS_TRANSITIONS[order.status];
  const isClosed = order.status === 'entregado' || order.status === 'cancelado';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-700 text-sm">
          ← Volver
        </button>
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          Pedido #{order.id}
          <span className={`text-sm font-medium px-2.5 py-0.5 rounded-full ${STATUS_COLORS[order.status]}`}>
            {ORDER_STATUS_LABELS[order.status]}
          </span>
        </h2>
      </div>

      {/* Info principal */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
        <div className="flex justify-between items-start">
          <div>
            <p className="font-medium text-gray-900">{order.customerName}</p>
            <p className="text-sm text-gray-500 mt-0.5">{order.description}</p>
            {order.notes && <p className="text-xs text-gray-400 mt-1">Nota: {order.notes}</p>}
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Total</p>
            <p className="text-xl font-bold text-gray-900">${order.totalAmount.toLocaleString('es-AR')}</p>
          </div>
        </div>
        {order.estimatedDelivery && (
          <p className="text-sm text-gray-500">
            Entrega estimada: <strong>{new Date(order.estimatedDelivery + 'T12:00:00').toLocaleDateString('es-AR', { dateStyle: 'long' })}</strong>
          </p>
        )}
        <p className="text-xs text-gray-400">
          Creado el {new Date(order.createdAt).toLocaleDateString('es-AR', { dateStyle: 'long' })}
        </p>
      </div>

      {/* Resumen de pagos */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <p className="text-xs text-blue-600 font-medium">Total</p>
          <p className="text-lg font-bold text-blue-700">${order.totalAmount.toLocaleString('es-AR')}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-3 text-center">
          <p className="text-xs text-green-600 font-medium">Pagado</p>
          <p className="text-lg font-bold text-green-700">${order.paidAmount.toLocaleString('es-AR')}</p>
        </div>
        <div className={`rounded-lg p-3 text-center ${order.pendingAmount > 0 ? 'bg-orange-50' : 'bg-gray-50'}`}>
          <p className={`text-xs font-medium ${order.pendingAmount > 0 ? 'text-orange-600' : 'text-gray-400'}`}>Pendiente</p>
          <p className={`text-lg font-bold ${order.pendingAmount > 0 ? 'text-orange-700' : 'text-gray-400'}`}>
            ${order.pendingAmount.toLocaleString('es-AR')}
          </p>
        </div>
      </div>

      {/* Historial de pagos */}
      {order.payments.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Historial de pagos</h3>
          <div className="space-y-1.5">
            {order.payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm bg-gray-50 rounded px-3 py-2">
                <span className="text-gray-500">
                  {PAYMENT_TYPE_LABELS[p.paymentType]}
                  {p.notes && <span className="text-gray-400 ml-1">— {p.notes}</span>}
                </span>
                <div className="text-right">
                  <span className="font-medium text-gray-900">${p.amount.toLocaleString('es-AR')}</span>
                  <span className="text-gray-400 text-xs ml-2">
                    {new Date(p.paidAt).toLocaleDateString('es-AR')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agregar pago */}
      {!isClosed && order.pendingAmount > 0 && (
        <div>
          {!showPaymentForm ? (
            <button
              onClick={() => setShowPaymentForm(true)}
              className="w-full py-2 border-2 border-dashed border-gray-300 text-sm text-gray-500 rounded-lg hover:border-blue-400 hover:text-blue-600 transition-colors"
            >
              + Registrar pago
            </button>
          ) : (
            <form onSubmit={(e) => void handleAddPayment(e)} className="bg-blue-50 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-medium text-blue-900">Registrar pago</h3>
              {paymentError && <p className="text-sm text-red-600">{paymentError}</p>}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Monto ($)</label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    max={order.pendingAmount}
                    min="0.01"
                    step="0.01"
                    placeholder={`Máx $${order.pendingAmount}`}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Tipo</label>
                  <select
                    value={paymentType}
                    onChange={(e) => setPaymentType(e.target.value as PaymentType)}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {PAYMENT_TYPES.map((t) => (
                      <option key={t} value={t}>{PAYMENT_TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Notas (opcional)</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Ej: transferencia, efectivo..."
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={addingPayment}
                  className="flex-1 bg-blue-600 text-white text-sm py-2 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {addingPayment ? 'Guardando...' : 'Registrar'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowPaymentForm(false); setPaymentError(null); }}
                  className="px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded hover:bg-gray-100"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Cambio de estado */}
      {!isClosed && nextStatuses.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Avanzar estado</h3>
          {statusError && <p className="text-sm text-red-600 mb-2">{statusError}</p>}
          <div className="flex gap-2 flex-wrap">
            {nextStatuses.map((s) => (
              <button
                key={s}
                onClick={() => void handleStatusChange(s)}
                className={`text-sm px-4 py-2 rounded-lg font-medium transition-colors ${
                  s === 'cancelado'
                    ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                }`}
              >
                → {ORDER_STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
