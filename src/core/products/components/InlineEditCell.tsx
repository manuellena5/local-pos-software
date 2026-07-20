import { useRef, useState } from 'react';

interface InlineEditCellProps {
  value: string;
  displayValue: React.ReactNode;
  subValue?: string;
  onConfirm: (raw: string) => Promise<void>;
}

export function InlineEditCell({
  value,
  displayValue,
  subValue,
  onConfirm,
}: InlineEditCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(value);
  const [saving, setSaving]   = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const activate = () => {
    setDraft(value);
    setEditing(true);
    setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select(); }, 10);
  };

  const cancel = () => { setEditing(false); setDraft(value); };

  const confirm = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onConfirm(draft);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); confirm(); }
    if (e.key === 'Escape') cancel();
  };

  if (editing) {
    return (
      <div className="inline-flex items-center gap-1 px-1.5 py-1 rounded-md bg-white shadow-[0_0_0_2px_#2563eb] min-w-[76px]">
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={confirm}
          className="w-20 text-sm font-semibold bg-transparent outline-none border-none text-gray-900"
        />
        <button
          onMouseDown={(e) => { e.preventDefault(); confirm(); }}
          className="w-5 h-5 rounded flex items-center justify-center bg-green-100 text-green-700 hover:bg-green-200 text-xs font-bold shrink-0"
          title="Confirmar"
        >✓</button>
        <button
          onMouseDown={(e) => { e.preventDefault(); cancel(); }}
          className="w-5 h-5 rounded flex items-center justify-center bg-red-100 text-red-600 hover:bg-red-200 text-xs font-bold shrink-0"
          title="Cancelar"
        >✕</button>
      </div>
    );
  }

  return (
    <div
      className="group inline-flex items-center gap-1.5 px-1.5 py-1 rounded-md cursor-text hover:bg-slate-100 transition-colors min-w-[76px]"
      onDoubleClick={activate}
    >
      <div>
        <div>{displayValue}</div>
        {subValue && <div className="text-xs text-gray-400 mt-0.5">{subValue}</div>}
      </div>
      <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
        ✏️ doble click
      </span>
    </div>
  );
}
