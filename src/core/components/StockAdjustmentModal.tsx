import { useState } from 'react';
import { stockApi } from '@/lib/api/stock';

interface StockAdjustmentModalProps {
  productId: number;
  businessUnitId: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function StockAdjustmentModal({
  productId,
  businessUnitId,
  onClose,
  onSuccess,
}: StockAdjustmentModalProps) {
  const [quantity, setQuantity] = useState<number>(0);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!quantity || quantity === 0) {
      setError('Debe ingresar una cantidad');
      return;
    }

    if (!reason.trim() || reason.length < 5) {
      setError('El motivo debe tener al menos 5 caracteres');
      return;
    }

    try {
      setIsSubmitting(true);
      await stockApi.adjust(productId, businessUnitId, quantity, reason);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al ajustar stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-bold mb-4">Ajustar stock</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cantidad</label>
            <input
              type="text"
              value={quantity === 0 && !reason ? '' : quantity}
              onChange={(e) => {
                const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                if (!isNaN(val) || e.target.value === '') {
                  setQuantity(val);
                  setError(null);
                }
              }}
              placeholder="Ej: 5 (entrada) o -3 (salida)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">Positivo = entrada, Negativo = salida</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Motivo *</label>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError(null);
              }}
              placeholder="Ej: Compra a proveedor X, Venta manifiesto #123, Ajuste por rotura..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm h-20 resize-none"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
