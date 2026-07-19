import { useState } from 'react';
import type { ProductWithStock } from '@shared/types';
import { CATEGORY_ATTRIBUTES } from '../../types';

interface AtributosTabProps {
  formData: Partial<ProductWithStock>;
}

function TagInput({
  label,
  values,
  suggestions,
  onAdd,
  onRemove,
}: {
  label: string;
  values: string[];
  suggestions: string[];
  onAdd: (v: string) => void;
  onRemove: (v: string) => void;
}) {
  const [input, setInput] = useState('');
  const [showSug, setShowSug] = useState(false);
  const filtered = suggestions.filter((s) => !values.includes(s) && s.toLowerCase().includes(input.toLowerCase()));

  const add = (v: string) => {
    const trimmed = v.trim();
    if (trimmed && !values.includes(trimmed)) onAdd(trimmed);
    setInput('');
    setShowSug(false);
  };

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-gray-700">{label}</label>
      <div className="flex flex-wrap gap-1.5 mb-1">
        {values.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
            {v}
            <button onClick={() => onRemove(v)} className="text-blue-400 hover:text-blue-700 leading-none" type="button">×</button>
          </span>
        ))}
      </div>
      <div className="relative">
        <input
          type="text"
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 w-full"
          placeholder="Escribir o seleccionar..."
          value={input}
          onChange={(e) => { setInput(e.target.value); setShowSug(true); }}
          onFocus={() => setShowSug(true)}
          onBlur={() => setTimeout(() => setShowSug(false), 150)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (input.trim()) add(input); } }}
        />
        {showSug && filtered.length > 0 && (
          <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 max-h-40 overflow-y-auto">
            {filtered.map((s) => (
              <button key={s} type="button" onMouseDown={() => add(s)} className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function AtributosTab({ formData }: AtributosTabProps) {
  const category = formData.category ?? '';
  const rawCategoryAttrs = CATEGORY_ATTRIBUTES[category] ?? {};
  // Convert object map to array of { key, label, options }
  const categoryAttrs = Object.entries(rawCategoryAttrs).map(([key, options]) => ({ key, label: key, options }));

  // Local state only — persisted in a future migration that adds an `attributes` column
  const [attrs, setAttrs] = useState<Record<string, string[]>>({});
  const [newKey, setNewKey] = useState('');
  const [newVal, setNewVal] = useState('');

  const getValues = (key: string) => attrs[key] ?? [];
  const setValues = (key: string, values: string[]) => setAttrs((prev) => ({ ...prev, [key]: values }));
  const addValue = (key: string, v: string) => setValues(key, [...getValues(key), v]);
  const removeValue = (key: string, v: string) => setValues(key, getValues(key).filter((x) => x !== v));

  const customKeys = Object.keys(attrs).filter((k) => !Object.prototype.hasOwnProperty.call(rawCategoryAttrs, k));

  const addCustom = () => {
    const k = newKey.trim(); const v = newVal.trim();
    if (!k || !v) return;
    setAttrs((prev) => ({ ...prev, [k]: [...(prev[k] ?? []), v] }));
    setNewKey(''); setNewVal('');
  };

  return (
    <div>
      {categoryAttrs.length > 0 ? (
        <div className="border border-gray-100 rounded-xl overflow-hidden mb-3">
          <div className="px-3.5 py-2.5 bg-gray-50 border-b border-gray-100">
            <span className="text-sm font-bold text-gray-700">🏷️ Atributos de {category}</span>
          </div>
          <div className="px-3.5 py-3 grid grid-cols-2 gap-4">
            {categoryAttrs.map((attr) => (
              <TagInput
                key={attr.key}
                label={attr.label}
                values={getValues(attr.key)}
                suggestions={attr.options}
                onAdd={(v) => addValue(attr.key, v)}
                onRemove={(v) => removeValue(attr.key, v)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="border border-dashed border-gray-200 rounded-xl p-4 mb-3 text-sm text-gray-400 text-center">
          {category
            ? `La categoría "${category}" no tiene atributos predefinidos.`
            : 'Seleccioná una categoría en la pestaña Datos Base para ver atributos sugeridos.'}
        </div>
      )}

      <div className="border border-gray-100 rounded-xl overflow-hidden">
        <div className="px-3.5 py-2.5 bg-gray-50 border-b border-gray-100">
          <span className="text-sm font-bold text-gray-700">➕ Atributos personalizados</span>
        </div>
        <div className="px-3.5 py-3">
          {customKeys.map((k) => (
            <div key={k} className="mb-3">
              <TagInput label={k} values={getValues(k)} suggestions={[]} onAdd={(v) => addValue(k, v)} onRemove={(v) => removeValue(k, v)} />
            </div>
          ))}
          <div className="flex gap-2 mt-2">
            <input type="text" placeholder="Nombre del atributo" className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-blue-500 w-40" value={newKey} onChange={(e) => setNewKey(e.target.value)} />
            <input type="text" placeholder="Valor" className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-blue-500 flex-1" value={newVal} onChange={(e) => setNewVal(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addCustom(); }} />
            <button type="button" onClick={addCustom} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">Agregar</button>
          </div>
          <p className="text-xs text-gray-400 mt-2">Los atributos se guardarán en una próxima actualización.</p>
        </div>
      </div>
    </div>
  );
}
