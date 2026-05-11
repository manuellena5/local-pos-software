import { useState, useEffect } from 'react';
import { tallerMedidaApi } from '../api/tallerMedidaApi';
import { PAYMENT_TYPES, PAYMENT_TYPE_LABELS, type PaymentType } from '../types';

interface Customer { id: number; name: string; }

interface Props {
  businessUnitId: number;
  onCreated: (orderId: number) => void;
  onCancel: () => void;
}

const EMPTY_MEASUREMENT_KEYS = [
  'Talle',
  'Busto',
  'Cintura',
  'Cadera',
  'Largo total',
  'Largo de falda',
  'Hombros',
  'Manga',
];

export function NewOrderForm({ businessUnitId, onCreated, onCancel }: Props) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState<number | ''>('');
  const [customerName, setCustomerName] = useState('');
  const [description, setDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [estimatedDelivery, setEstimatedDelivery] = useState('');
  const [notes, setNotes] = useState('');

  // Seña inicial
  const [addPayment, setAddPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentType, setPaymentType] = useState<PaymentType>('sena');

  // Medidas
  const [measurements, setMeasurements] = useState<Record<string, string>>({});
  const [customKey, setCustomKey] = useState('');
  const [customVal, setCustomVal] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/customers')
      .then((r) => r.json() as Promise<{ data: Customer[] }>)
      .then((j) => setCustomers(j.data ?? []))
      .catch(() => {});
  }, []);

  // Al seleccionar cliente, cargar sus medidas guardadas
  useEffect(() => {
    if (!customerId) return;
    void tallerMedidaApi
      .getMeasurements(Number(customerId), businessUnitId)
      .then((m) => { if (m) setMeasurements(m.fields); })
      .catch(() => {});
  }, [customerId, businessUnitId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customerName.trim()) { setError('El nombre del cliente es requerido'); return; }
    if (!description.trim())  { setError('La descripción es requerida'); return; }
    const total = parseFloat(totalAmount);
    if (isNaN(total) || total < 0) { setError('El monto total es inválido'); return; }

    const payment = addPayment && paymentAmount
      ? { amount: parseFloat(paymentAmount), paymentType, notes: undefined }
      : undefined;

    if (payment && isNaN(payment.amount)) { setError('El monto de la seña es inválido'); return; }
    if (payment && payment.amount > total) { setError('La seña no puede superar el total'); return; }

    setSubmitting(true);
    try {
      const order = await tallerMedidaApi.createOrder(businessUnitId, {
        customerId:        customerId ? Number(customerId) : undefined,
        customerName:      customerName.trim(),
        description:       description.trim(),
        totalAmount:       total,
        estimatedDelivery: estimatedDelivery || undefined,
        notes:             notes.trim() || undefined,
        initialPayment:    payment,
      });

      // Guardar medidas si hay cliente registrado y se completaron medidas
      if (customerId && Object.keys(measurements).length > 0) {
        await tallerMedidaApi.upsertMeasurements(Number(customerId), businessUnitId, { fields: measurements });
      }

      onCreated(order.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const setMeasurement = (key: string, value: string) => {
    setMeasurements((prev) => ({ ...prev, [key]: value }));
  };

  const addCustomMeasurement = () => {
    if (!customKey.trim()) return;
    setMeasurement(customKey.trim(), customVal);
    setCustomKey('');
    setCustomVal('');
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Nuevo pedido</h2>
        <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-sm">
          Cancelar
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Datos del cliente */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-gray-700 mb-2">Cliente</legend>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Buscar cliente registrado</label>
          <select
            value={customerId}
            onChange={(e) => {
              const val = e.target.value;
              setCustomerId(val ? Number(val) : '');
              if (val) {
                const c = customers.find((c) => c.id === Number(val));
                if (c) setCustomerName(c.name);
              }
            }}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">— Sin cliente registrado —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Nombre del cliente *</label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Ej: María García"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
      </fieldset>

      {/* Descripción y monto */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-gray-700 mb-2">Pedido</legend>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Descripción *</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Ej: Vestido largo de novia con bordado floral, tela satén blanca..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Precio total ($) *</label>
            <input
              type="number"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              min="0"
              step="0.01"
              placeholder="0.00"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Fecha estimada de entrega</label>
            <input
              type="date"
              value={estimatedDelivery}
              onChange={(e) => setEstimatedDelivery(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Notas internas</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Ej: cliente prefiere cierre invisible, tela a confirmar..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
      </fieldset>

      {/* Seña inicial */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-gray-700 mb-2">Cobro inicial</legend>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={addPayment}
            onChange={(e) => setAddPayment(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-gray-700">Registrar seña o pago inicial</span>
        </label>
        {addPayment && (
          <div className="grid grid-cols-2 gap-3 pl-5">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Monto ($)</label>
              <input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                min="0"
                step="0.01"
                placeholder="0.00"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tipo</label>
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value as PaymentType)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PAYMENT_TYPES.map((t) => (
                  <option key={t} value={t}>{PAYMENT_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </fieldset>

      {/* Ficha de medidas */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-gray-700 mb-2">
          Medidas del cliente
          {!customerId && <span className="text-xs text-gray-400 ml-2">(seleccionar cliente para guardar)</span>}
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {EMPTY_MEASUREMENT_KEYS.map((key) => (
            <div key={key}>
              <label className="block text-xs text-gray-500 mb-1">{key}</label>
              <input
                type="text"
                value={measurements[key] ?? ''}
                onChange={(e) => setMeasurement(key, e.target.value)}
                placeholder="—"
                className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          ))}
        </div>
        {/* Medidas personalizadas adicionales */}
        {Object.entries(measurements)
          .filter(([k]) => !EMPTY_MEASUREMENT_KEYS.includes(k))
          .map(([key, val]) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-32 shrink-0">{key}</span>
              <input
                type="text"
                value={val}
                onChange={(e) => setMeasurement(key, e.target.value)}
                className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setMeasurements((prev) => { const copy = { ...prev }; delete copy[key]; return copy; })}
                className="text-red-400 hover:text-red-600 text-xs"
              >
                ✕
              </button>
            </div>
          ))}
        <div className="flex gap-2 mt-1">
          <input
            type="text"
            value={customKey}
            onChange={(e) => setCustomKey(e.target.value)}
            placeholder="Medida adicional"
            className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <input
            type="text"
            value={customVal}
            onChange={(e) => setCustomVal(e.target.value)}
            placeholder="Valor"
            className="w-24 border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={addCustomMeasurement}
            className="text-sm text-blue-600 hover:underline whitespace-nowrap"
          >
            + Agregar
          </button>
        </div>
      </fieldset>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 bg-blue-600 text-white font-medium py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {submitting ? 'Guardando...' : 'Crear pedido'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
