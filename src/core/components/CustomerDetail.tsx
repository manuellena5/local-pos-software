import { useState, useEffect } from 'react';
import { customersApi, type CustomerHistory } from '@/lib/api/customers';
import type { Customer } from '@shared/types';

interface Props {
  customer: Customer;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export function CustomerDetail({ customer, onEdit, onDelete, onClose }: Props) {
  const [history, setHistory] = useState<CustomerHistory | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    customersApi.getHistory(customer.id)
      .then(setHistory)
      .catch(() => setHistory(null))
      .finally(() => setLoadingHistory(false));
  }, [customer.id]);

  const creditAvailable = customer.creditLimit - customer.creditUsed;
  const creditPercent = customer.creditLimit > 0
    ? Math.min(100, Math.round((customer.creditUsed / customer.creditLimit) * 100))
    : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-start px-6 py-4 border-b sticky top-0 bg-white">
          <div>
            <h2 className="font-semibold text-gray-900 text-lg">{customer.name}</h2>
            {customer.documentType && customer.document && (
              <p className="text-xs text-gray-500">{customer.documentType}: {customer.document}</p>
            )}
          </div>
          <div className="flex gap-2 items-center">
            <button
              onClick={onEdit}
              className="px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium"
            >
              Editar
            </button>
            <button
              onClick={onDelete}
              className="px-3 py-1.5 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium"
            >
              Eliminar
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl ml-1">×</button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Datos de contacto */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            {customer.email && (
              <div>
                <span className="text-gray-500">Email</span>
                <p className="font-medium text-gray-800">{customer.email}</p>
              </div>
            )}
            {customer.phone && (
              <div>
                <span className="text-gray-500">Teléfono</span>
                <p className="font-medium text-gray-800">{customer.phone}</p>
              </div>
            )}
            {customer.address && (
              <div className="col-span-2">
                <span className="text-gray-500">Dirección</span>
                <p className="font-medium text-gray-800">{customer.address}</p>
              </div>
            )}
          </div>

          {/* Crédito */}
          {customer.creditLimit > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 mb-3">Crédito</p>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500">Usado: <strong>${customer.creditUsed.toFixed(2)}</strong></span>
                <span className="text-gray-500">Límite: <strong>${customer.creditLimit.toFixed(2)}</strong></span>
                <span className={creditAvailable > 0 ? 'text-green-600' : 'text-red-600'}>
                  Disponible: <strong>${creditAvailable.toFixed(2)}</strong>
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${creditPercent > 80 ? 'bg-red-500' : creditPercent > 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                  style={{ width: `${creditPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Historial de compras */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <p className="text-sm font-medium text-gray-700">Historial de compras</p>
              {history && (
                <span className="text-sm text-gray-500">
                  Total gastado: <strong className="text-gray-900">${history.totalSpent.toFixed(2)}</strong>
                </span>
              )}
            </div>

            {loadingHistory ? (
              <p className="text-sm text-gray-400 text-center py-4">Cargando historial...</p>
            ) : !history || history.purchases.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Sin compras registradas</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {history.purchases.slice(0, 10).map(({ sale }) => (
                  <div key={sale.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                    <div>
                      <span className="font-medium text-gray-800">Venta #{sale.saleNumber}</span>
                      <span className="text-gray-400 ml-2 text-xs">
                        {new Date(sale.createdAt).toLocaleDateString('es-AR')}
                      </span>
                    </div>
                    <span className="font-semibold text-gray-900">${sale.totalAmount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {customer.notes && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Notas</p>
              <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{customer.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
