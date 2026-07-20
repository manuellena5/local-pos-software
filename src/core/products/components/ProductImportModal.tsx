import { useState, useRef } from 'react';
import { productsApi } from '@/lib/api/products';
import type { ProductImportResult } from '@shared/types';

interface ProductImportModalProps {
  businessUnitId: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function ProductImportModal({ businessUnitId, onClose, onSuccess }: ProductImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ProductImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleImport(): Promise<void> {
    if (!selectedFile) return;
    setIsImporting(true);
    setError(null);
    try {
      const data = await productsApi.importCsv(businessUnitId, selectedFile);
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al importar');
    } finally {
      setIsImporting(false);
    }
  }

  function handleClose(): void {
    if (result) onSuccess();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="p-6 space-y-4">
          <h3 className="text-base font-bold text-gray-900">Importar productos</h3>

          {!result && (
            <>
              <p className="text-sm text-gray-500">
                El archivo debe tener columnas <strong>nombre</strong> y <strong>precio</strong>.
                Para variantes (color, talle, fragancia, etc.), repetí el mismo nombre en varias
                filas — una fila por variante, con <strong>tipo_variante</strong> y{' '}
                <strong>valor_variante</strong> completos.
              </p>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
              >
                <p className="text-3xl mb-2">📄</p>
                {selectedFile ? (
                  <p className="text-sm font-medium text-blue-600">{selectedFile.name}</p>
                ) : (
                  <>
                    <p className="text-sm font-medium text-gray-700">Arrastrá o hacé clic para seleccionar</p>
                    <p className="text-xs text-gray-400 mt-1">.xlsx, .xls, .csv — máximo 10 MB</p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                />
              </div>

              <a
                href={productsApi.getImportTemplateUrl()}
                download="plantilla-productos.xlsx"
                className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
              >
                ⬇️ Descargar plantilla Excel
              </a>

              {error && (
                <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleClose}
                  disabled={isImporting}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => void handleImport()}
                  disabled={!selectedFile || isImporting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {isImporting ? 'Procesando archivo…' : 'Importar'}
                </button>
              </div>
            </>
          )}

          {result && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-700">Resultado de la importación</p>
              <div className="space-y-1.5 text-sm">
                <p>✅ <span className="font-medium">{result.productsCreated}</span> productos nuevos</p>
                <p>➖ <span className="font-medium">{result.productsExisting}</span> ya existían (actualizados)</p>
                <p>🧩 <span className="font-medium">{result.variantsWritten}</span> variantes procesadas</p>
                <p className="text-xs text-gray-400">{result.totalRows} filas leídas del archivo</p>
              </div>
              <button
                onClick={handleClose}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                Cerrar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
