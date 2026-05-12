import { useState, useRef, useEffect } from 'react';
import { categoriesApi } from '@/lib/api/categories';
import type { Category } from '@shared/types';

interface CategorySelectorProps {
  businessUnitId: number;
  value: string;
  onChange: (value: string) => void;
  categories: Category[];
  onCategoryCreated: (category: Category) => void;
}

const NEW_CATEGORY_VALUE = '__new__';

export function CategorySelector({
  businessUnitId,
  value,
  onChange,
  categories,
  onCategoryCreated,
}: CategorySelectorProps) {
  const [showInline, setShowInline] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showInline) {
      inputRef.current?.focus();
    }
  }, [showInline]);

  function handleSelectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const selected = e.target.value;
    if (selected === NEW_CATEGORY_VALUE) {
      setShowInline(true);
      setNewName('');
      setCreateError(null);
    } else {
      onChange(selected);
    }
  }

  async function handleConfirm() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setCreating(true);
    setCreateError(null);
    try {
      const created = await categoriesApi.create({ name: trimmed, businessUnitId });
      onCategoryCreated(created);
      onChange(created.name);
      setShowInline(false);
      setNewName('');
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Error al crear la categoría');
    } finally {
      setCreating(false);
    }
  }

  function handleCancel() {
    setShowInline(false);
    setNewName('');
    setCreateError(null);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      void handleConfirm();
    }
    if (e.key === 'Escape') {
      handleCancel();
    }
  }

  return (
    <div className="space-y-1.5">
      <select
        value={showInline ? NEW_CATEGORY_VALUE : value}
        onChange={handleSelectChange}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
      >
        <option value="">— Sin categoría —</option>
        {categories.map((c) => (
          <option key={c.id} value={c.name}>
            {c.name}
          </option>
        ))}
        <option value={NEW_CATEGORY_VALUE}>+ Nueva categoría…</option>
      </select>

      {showInline && (
        <div className="flex items-center gap-1.5">
          <input
            ref={inputRef}
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nombre de la nueva categoría"
            disabled={creating}
            className="flex-1 px-3 py-1.5 border border-blue-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={creating || !newName.trim()}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {creating ? '…' : 'Crear'}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={creating}
            className="px-3 py-1.5 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            ✕
          </button>
        </div>
      )}

      {createError && (
        <p className="text-xs text-red-500">{createError}</p>
      )}
    </div>
  );
}
