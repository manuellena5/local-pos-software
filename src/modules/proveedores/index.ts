/**
 * Módulo proveedores.
 * Disponible para todas las BUs (availableForAllBUs: true).
 * Se importa una sola vez en App.tsx.
 */
import { registerScreen, registerMenuItem } from '@/core/api';
import { SuppliersView } from './components/SuppliersView';
import { ComparatorView } from './components/ComparatorView';

export function initProveedoresModule(): void {
  registerScreen({
    path:      '/proveedores',
    name:      'Proveedores',
    component: SuppliersView,
  });

  registerScreen({
    path:      '/proveedores/comparador',
    name:      'Comparador',
    component: ComparatorView,
  });

  registerMenuItem({
    id:       'proveedores:suppliers',
    label:    'Proveedores',
    path:     '/proveedores',
    moduleId: 'proveedores',
    icon:     '🏭',
  });

  registerMenuItem({
    id:       'proveedores:comparador',
    label:    'Comparador',
    path:     '/proveedores/comparador',
    moduleId: 'proveedores',
    icon:     '📊',
  });
}
