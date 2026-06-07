import { useEffect, useState } from 'react';
import type { ProductWithStock, PurchaseHistoryEntry } from '@shared/types';
import { ApiError } from '@/lib/api/client';
import type { ProductModalTab } from '../types';
import { useProductsStore } from '../store/productsStore';
import { productsApi } from '@/lib/api/products';
import { DatosBaseTab } from './tabs/DatosBaseTab';
import { PreciosTab } from './tabs/PreciosTab';
import { AtributosTab } from './tabs/AtributosTab';
import { CatalogoWebTab } from './tabs/CatalogoWebTab';
import { EstadisticasTab } from './tabs/EstadisticasTab';

interface ProductEditModalProps {
  businessUnitId: number;
  onRefetch: () => void;
  onToast: (msg: string, type?: 'ok' | 'error') => void;
}

const TABS: { id: ProductModalTab; label: string }[] = [
  { id: 'base',       label: '🏷️ Datos base' },
  { id: 'precios',    label: '💰 Precios' },
  { id: 'atributos',  label: '🎨 Atributos' },
  { id: 'catalogo',   label: '🌐 Catálogo web' },
  { id: 'estadisticas', label: '📊 Estadísticas' },
];

export function ProductEditModal({ businessUnitId, onRefetch, onToast }: ProductEditModalProps) {
  const product        = useProductsStore((s) => s.activeProduct);
  const isOpen         = useProductsStore((s) => s.editModalOpen);
  const tab            = useProductsStore((s) => s.editModalTab);
  const closeModal     = useProductsStore((s) => s.closeEditModal);
  const setTab         = useProductsStore((s) => s.setEditModalTab);
  const openDrawer     = useProductsStore((s) => s.openDrawer);

  const [formData, setFormData] = useState<Partial<ProductWithStock>>({});
  const [saving, setSaving]     = useState(false);
  const [txCount, setTxCount]   = useState(0);
  const [purchaseHistory, setPurchaseHistory] = useState<PurchaseHistoryEntry[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    // Cargar proveedores siempre (necesario tanto al crear como al editar)
    fetch(`/api/suppliers?businessUnitId=${businessUnitId}`)
      .then((r) => r.json())
      .then((data: { id: number; name: string }[]) => setSuppliers(data))
      .catch(() => {});

    if (!product) {
      setFormData({});
      setTxCount(0);
      setPurchaseHistory([]);
      return;
    }

    setFormData(product);
    setTxCount(0);
    setPurchaseHistory([]);

    productsApi.countTransactions(product.id, businessUnitId)
      .then((r) => setTxCount(r.count))
      .catch(() => {});

    productsApi.getPurchaseHistory(product.id, businessUnitId)
      .then(setPurchaseHistory)
      .catch(() => {});
  }, [product?.id, isOpen, businessUnitId]);

  const isCreating = !product;

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      if (isCreating) {
        await productsApi.create(businessUnitId, formData);
        onToast(`✅ ${formData.name ?? 'Producto'} creado`);
      } else {
        await productsApi.update(product.id, businessUnitId, formData);
        onToast(`✅ ${formData.name ?? product.name} guardado`);
      }
      onRefetch();
      closeModal();
    } catch (err) {
      if (err instanceof ApiError && Array.isArray(err.details) && err.details.length) {
        onToast(`❌ ${(err.details as string[]).join(' · ')}`, 'error');
      } else {
        onToast(err instanceof Error ? err.message : 'Error al guardar', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!product) return;
    try {
      await productsApi.archive(product.id, businessUnitId);
      onToast('🗄️ Producto archivado');
      onRefetch();
      closeModal();
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Error al archivar', 'error');
    }
  };

  if (!isOpen) return null;

  // Tabs disponibles según modo: al crear, solo base/precios/atributos/catalogo
  const visibleTabs = isCreating
    ? TABS.filter((t) => t.id !== 'estadisticas')
    : TABS;

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center pt-12 pb-6 px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={closeModal} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[88vh] z-10">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <div className="font-bold text-gray-900 text-lg leading-tight">
              {isCreating ? 'Nuevo producto' : product.name}
            </div>
            {!isCreating && (
              <div className="text-xs text-gray-400 font-mono mt-0.5">SKU: {product.sku}</div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isCreating && (
              <button
                onClick={() => { closeModal(); openDrawer(product.id); }}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-violet-600 hover:bg-violet-50"
              >
                📊 Ver historial
              </button>
            )}
            <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 text-lg">✕</button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-gray-100 shrink-0 px-2 overflow-x-auto">
          {visibleTabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {tab === 'base' && (
            <DatosBaseTab
              product={product ?? undefined}
              formData={formData}
              onChange={setFormData}
              onOpenHistoryDrawer={!isCreating ? () => { closeModal(); openDrawer(product!.id); } : undefined}
              onArchive={!isCreating ? handleArchive : undefined}
              transactionCount={txCount}
              suppliers={suppliers}
              purchaseHistory={purchaseHistory.map((h) => ({
                date: h.date,
                supplierName: h.supplierName,
                quantity: h.quantity,
                unitCost: h.unitCost,
              }))}
            />
          )}
          {tab === 'precios' && (
            <PreciosTab product={product ?? undefined} formData={formData} onChange={setFormData} />
          )}
          {tab === 'atributos' && (
            <AtributosTab formData={formData} />
          )}
          {tab === 'catalogo' && (
            <CatalogoWebTab formData={formData} onChange={setFormData} />
          )}
          {tab === 'estadisticas' && product && (
            <EstadisticasTab
              productId={product.id}
              businessUnitId={businessUnitId}
              onOpenHistoryDrawer={() => { closeModal(); openDrawer(product.id); }}
            />
          )}
        </div>

        {/* Footer */}
        {tab !== 'estadisticas' && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl shrink-0">
            <button
              onClick={closeModal}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Guardando…' : isCreating ? '✅ Crear producto' : '💾 Guardar cambios'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
