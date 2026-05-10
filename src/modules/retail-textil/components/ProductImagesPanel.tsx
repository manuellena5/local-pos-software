import { useState, useEffect, useRef } from 'react';
import { retailTextilApi } from '../api/retailTextilApi';
import type { ProductImage } from '../types';

interface Props {
  businessUnitId: number;
  productId: number;
}

export function ProductImagesPanel({ productId }: Props) {
  const [images, setImages]     = useState<ProductImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function load() {
    retailTextilApi.getImages(productId)
      .then(setImages)
      .catch(() => setImages([]));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [productId]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        await retailTextilApi.uploadImage(productId, file);
      }
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al subir');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(imageId: number) {
    if (!confirm('¿Eliminar esta imagen?')) return;
    try {
      await retailTextilApi.deleteImage(productId, imageId);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al eliminar');
    }
  }

  async function handleSetPrimary(imageId: number) {
    try {
      await retailTextilApi.setPrimaryImage(productId, imageId);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  }

  return (
    <div className="mt-4 border-t pt-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700">Imágenes del producto</h3>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
        >
          {uploading ? 'Subiendo...' : '+ Subir imagen'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />
      </div>

      {error && <p className="text-red-500 text-xs mb-2">{error}</p>}

      {images.length === 0 && !uploading && (
        <p className="text-xs text-gray-400">Sin imágenes. Máximo 20 por producto (JPG, PNG, WEBP, GIF · 5 MB c/u).</p>
      )}

      <div className="grid grid-cols-4 gap-2 mt-2">
        {images.map((img) => (
          <div key={img.id} className="relative group border rounded overflow-hidden bg-gray-50 aspect-square">
            <img
              src={retailTextilApi.imageUrl(img.filePath)}
              alt={img.altText ?? ''}
              className="w-full h-full object-cover"
            />
            {img.isPrimary && (
              <span className="absolute top-1 left-1 bg-blue-600 text-white text-[10px] px-1 rounded">
                Principal
              </span>
            )}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
              {!img.isPrimary && (
                <button
                  type="button"
                  onClick={() => void handleSetPrimary(img.id)}
                  title="Marcar como principal"
                  className="bg-white text-gray-700 text-[10px] px-1.5 py-0.5 rounded shadow"
                >
                  ★
                </button>
              )}
              <button
                type="button"
                onClick={() => void handleDelete(img.id)}
                title="Eliminar"
                className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded shadow"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
