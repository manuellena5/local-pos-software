import { useState, useRef, useEffect } from 'react';
import { useProductColumns } from '../hooks/useProductColumns';

export function ColumnSelector() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { allColumns, isVisible, toggleColumn } = useProductColumns();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 px-2.5 py-1 border border-gray-200 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
      >
        <span>Columnas</span>
        <span>⚙️</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-30 py-1">
          {allColumns.map((col) => (
            <label
              key={col.id}
              className={`flex items-center gap-2 px-2.5 py-1.5 text-xs cursor-pointer hover:bg-gray-50 transition-colors
                ${col.alwaysVisible ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input
                type="checkbox"
                checked={isVisible(col.id)}
                disabled={col.alwaysVisible}
                onChange={() => !col.alwaysVisible && toggleColumn(col.id)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-700">{col.label}</span>
              {col.alwaysVisible && <span className="text-xs text-gray-400 ml-auto">fija</span>}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
