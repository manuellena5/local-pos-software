/**
 * Módulo proveedores.
 * Disponible para todas las BUs (availableForAllBUs: true).
 * Se importa una sola vez en App.tsx.
 */
import { registerScreen, registerMenuItem } from '@/core/api';
import { SuppliersView } from './components/SuppliersView';

export function initProveedoresModule(): void {
  registerScreen({
    path:      '/proveedores',
    name:      'Proveedores',
    component: SuppliersView,
  });

  registerMenuItem({
    id:       'proveedores:suppliers',
    label:    'Proveedores',
    path:     '/proveedores',
    moduleId: 'proveedores',
    icon:     '🏭',
  });
}
