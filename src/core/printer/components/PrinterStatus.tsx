import { Printer } from 'lucide-react';
import { useAppStore } from '@/core/store/appStore';

interface PrinterStatusProps {
  onNavigate: () => void;
}

export function PrinterStatus({ onNavigate }: PrinterStatusProps) {
  const status = useAppStore((s) => s.printerStatus);
  const isConnected = status === 'connected';
  const tooltip = isConnected ? 'Impresora conectada' : 'Impresora desconectada';

  return (
    <button
      onClick={onNavigate}
      title={tooltip}
      className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
        isConnected ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500 hover:bg-red-600'
      }`}
    >
      <Printer size={16} className="text-white" strokeWidth={2} />
    </button>
  );
}
