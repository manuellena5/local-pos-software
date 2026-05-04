import { useState, useCallback } from 'react';
import { useCustomers } from '@/core/hooks/useCustomers';
import { customersApi } from '@/lib/api/customers';
import { CustomerForm } from './CustomerForm';
import { CustomerDetail } from './CustomerDetail';
import type { Customer } from '@shared/types';

export function CustomerList() {
  const [search, setSearch] = useState('');
  const { customers, loading, error, refetch } = useCustomers(search || undefined);
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);

  const handleCreated = useCallback((customer: Customer) => {
    setShowForm(false);
    setEditingCustomer(null);
    refetch();
    setViewingCustomer(customer);
  }, [refetch]);

  const handleDelete = useCallback(async (customer: Customer) => {
    if (!confirm(`¿Eliminar cliente "${customer.name}"?`)) return;
    try {
      await customersApi.delete(customer.id);
      setViewingCustomer(null);
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar');
    }
  }, [refetch]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex gap-3 items-center">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, documento, email, teléfono..."
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={() => { setEditingCustomer(null); setShowForm(true); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 whitespace-nowrap"
        >
          + Nuevo cliente
        </button>
      </div>

      {/* Tabla */}
      {loading ? (
        <p className="text-center text-gray-400 py-8">Cargando clientes...</p>
      ) : error ? (
        <p className="text-center text-red-500 py-8">{error}</p>
      ) : customers.length === 0 ? (
        <p className="text-center text-gray-400 py-8">
          {search ? 'Sin resultados para esa búsqueda' : 'No hay clientes cargados'}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs text-gray-500 font-medium py-2 px-3">Nombre</th>
                <th className="text-left text-xs text-gray-500 font-medium py-2 px-3">Documento</th>
                <th className="text-left text-xs text-gray-500 font-medium py-2 px-3">Teléfono</th>
                <th className="text-left text-xs text-gray-500 font-medium py-2 px-3">Email</th>
                <th className="text-right text-xs text-gray-500 font-medium py-2 px-3">Crédito</th>
                <th className="py-2 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => setViewingCustomer(c)}
                >
                  <td className="py-2.5 px-3 font-medium text-gray-900">{c.name}</td>
                  <td className="py-2.5 px-3 text-gray-500">
                    {c.documentType && c.document ? `${c.documentType} ${c.document}` : '—'}
                  </td>
                  <td className="py-2.5 px-3 text-gray-500">{c.phone ?? '—'}</td>
                  <td className="py-2.5 px-3 text-gray-500">{c.email ?? '—'}</td>
                  <td className="py-2.5 px-3 text-right">
                    {c.creditLimit > 0 ? (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        c.creditUsed >= c.creditLimit
                          ? 'bg-red-100 text-red-700'
                          : c.creditUsed > c.creditLimit * 0.5
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        ${(c.creditLimit - c.creditUsed).toFixed(0)} disp.
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">Sin crédito</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingCustomer(c); setShowForm(true); }}
                      className="text-xs text-blue-600 hover:underline mr-2"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-gray-400 mt-2 px-3">{customers.length} cliente{customers.length !== 1 ? 's' : ''}</p>
        </div>
      )}

      {/* Modal crear/editar */}
      {showForm && (
        <CustomerForm
          customer={editingCustomer ?? undefined}
          onSuccess={handleCreated}
          onCancel={() => { setShowForm(false); setEditingCustomer(null); }}
        />
      )}

      {/* Modal detalle */}
      {viewingCustomer && !showForm && (
        <CustomerDetail
          customer={viewingCustomer}
          onEdit={() => { setEditingCustomer(viewingCustomer); setShowForm(true); }}
          onDelete={() => handleDelete(viewingCustomer)}
          onClose={() => setViewingCustomer(null)}
        />
      )}
    </div>
  );
}
