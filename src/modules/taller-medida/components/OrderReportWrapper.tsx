import { useAppStore } from '@/core/store/appStore';
import { OrderReportScreen } from './OrderReportScreen';

export function OrderReportWrapper() {
  const activeBU = useAppStore((s) => s.activeBU);
  if (!activeBU) return null;
  return <OrderReportScreen businessUnitId={activeBU.id} />;
}
