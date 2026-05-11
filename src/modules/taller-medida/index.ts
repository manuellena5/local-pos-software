/**
 * Módulo taller-medida.
 * Se importa una sola vez en App.tsx.
 * Registra pantalla y ítem de menú propios (no extiende formularios del core).
 */
import { registerScreen, registerMenuItem, registerReport } from '@/core/api';
import { TallerMedidaPage } from './components/TallerMedidaPage';
import { OrderReportWrapper } from './components/OrderReportWrapper';

export function initTallerMedidaModule(): void {
  registerScreen({
    path:      '/taller-medida',
    name:      'Pedidos',
    component: TallerMedidaPage,
  });

  registerMenuItem({
    id:       'taller-medida:pedidos',
    label:    'Pedidos',
    path:     '/taller-medida',
    moduleId: 'taller-medida',
    icon:     '🧵',
  });

  registerReport({
    id:        'taller-medida:pedidos',
    name:      'Pedidos por estado',
    component: OrderReportWrapper,
  });
}
