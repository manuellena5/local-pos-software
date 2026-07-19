import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { DashboardDTO } from '@shared/types';

interface SalesChartProps {
  data: DashboardDTO['last7Days'];
  isLoading?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatTooltip(value: any): string {
  const num = typeof value === 'number' ? value : 0;
  return '$' + num.toLocaleString('es-AR');
}

function formatYAxis(v: number) {
  return '$' + Math.round(v / 1000) + 'k';
}

export function SalesChart({ data, isLoading }: SalesChartProps) {
  if (isLoading) {
    return <div className="h-48 bg-gray-100 rounded animate-pulse" />;
  }

  return (
    <ResponsiveContainer width="100%" height={192}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: '#6b7280' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatYAxis}
          tick={{ fontSize: 11, fill: '#6b7280' }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip formatter={formatTooltip} />
        <Bar dataKey="total" radius={[4, 4, 0, 0]}>
          {data.map((entry) => (
            <Cell
              key={entry.date}
              fill={entry.label === 'Hoy' ? '#2563EB' : '#93C5FD'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
