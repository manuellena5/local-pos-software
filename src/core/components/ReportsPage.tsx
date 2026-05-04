import { useState } from 'react';
import { SalesReportPage } from './SalesReportPage';
import { TopProductsReport } from './TopProductsReport';
import { TopCustomersReport } from './TopCustomersReport';
import { StockMovementReport } from './StockMovementReport';

type ReportTab = 'sales' | 'products' | 'customers' | 'stock';

interface Props {
  businessUnitId: number;
}

const TABS: { key: ReportTab; label: string; icon: string }[] = [
  { key: 'sales', label: 'Ventas', icon: '📊' },
  { key: 'products', label: 'Productos', icon: '📦' },
  { key: 'customers', label: 'Clientes', icon: '👥' },
  { key: 'stock', label: 'Stock', icon: '🗂️' },
];

export function ReportsPage({ businessUnitId }: Props) {
  const [tab, setTab] = useState<ReportTab>('sales');

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg">
        {tab === 'sales' && <SalesReportPage businessUnitId={businessUnitId} />}
        {tab === 'products' && <TopProductsReport businessUnitId={businessUnitId} />}
        {tab === 'customers' && <TopCustomersReport businessUnitId={businessUnitId} />}
        {tab === 'stock' && <StockMovementReport businessUnitId={businessUnitId} />}
      </div>
    </div>
  );
}
