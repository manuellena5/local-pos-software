import { useState } from 'react';
import { SalesReportPage } from './SalesReportPage';
import { TopProductsReport } from './TopProductsReport';
import { TopCustomersReport } from './TopCustomersReport';
import { StockMovementReport } from './StockMovementReport';
import { getRegisteredReports } from '@/core/api';

type CoreTab = 'sales' | 'products' | 'customers' | 'stock';

interface Props {
  businessUnitId: number;
}

const CORE_TABS: { key: CoreTab; label: string; icon: string }[] = [
  { key: 'sales',     label: 'Ventas',    icon: '📊' },
  { key: 'products',  label: 'Productos', icon: '📦' },
  { key: 'customers', label: 'Clientes',  icon: '👥' },
  { key: 'stock',     label: 'Stock',     icon: '🗂️' },
];

export function ReportsPage({ businessUnitId }: Props) {
  const customReports = getRegisteredReports();
  const [tab, setTab] = useState<string>('sales');

  const allTabs = [
    ...CORE_TABS,
    ...customReports.map((r) => ({ key: r.id, label: r.name, icon: '🧵' })),
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-gray-200 flex-wrap">
        {allTabs.map((t) => (
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
        {tab === 'sales'     && <SalesReportPage businessUnitId={businessUnitId} />}
        {tab === 'products'  && <TopProductsReport businessUnitId={businessUnitId} />}
        {tab === 'customers' && <TopCustomersReport businessUnitId={businessUnitId} />}
        {tab === 'stock'     && <StockMovementReport businessUnitId={businessUnitId} />}
        {customReports.map((r) => tab === r.id && <r.component key={r.id} />)}
      </div>
    </div>
  );
}
