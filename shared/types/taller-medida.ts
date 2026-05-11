export const ORDER_STATUSES = [
  'presupuestado',
  'confirmado',
  'en_confeccion',
  'en_prueba',
  'listo',
  'entregado',
  'cancelado',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  presupuestado: 'Presupuestado',
  confirmado:    'Confirmado',
  en_confeccion: 'En confección',
  en_prueba:     'En prueba',
  listo:         'Listo',
  entregado:     'Entregado',
  cancelado:     'Cancelado',
};

// Transiciones válidas de estado
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  presupuestado: ['confirmado', 'cancelado'],
  confirmado:    ['en_confeccion', 'cancelado'],
  en_confeccion: ['en_prueba', 'listo', 'cancelado'],
  en_prueba:     ['en_confeccion', 'listo', 'cancelado'],
  listo:         ['entregado', 'cancelado'],
  entregado:     [],
  cancelado:     [],
};

export const PAYMENT_TYPES = ['sena', 'saldo', 'parcial'] as const;
export type PaymentType = (typeof PAYMENT_TYPES)[number];

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  sena:    'Seña',
  saldo:   'Saldo',
  parcial: 'Pago parcial',
};

export interface TallerOrder {
  id:               number;
  buId:             number;
  customerId:       number | null;
  customerName:     string;
  description:      string;
  status:           OrderStatus;
  totalAmount:      number;
  estimatedDelivery: string | null;
  notes:            string | null;
  createdAt:        string;
  updatedAt:        string;
  // Calculados en join
  paidAmount?:      number;
  pendingAmount?:   number;
}

export interface TallerOrderPayment {
  id:          number;
  orderId:     number;
  amount:      number;
  paymentType: PaymentType;
  notes:       string | null;
  paidAt:      string;
}

export interface TallerClientMeasurements {
  id:         number;
  customerId: number;
  buId:       number;
  fields:     Record<string, string>;
  updatedAt:  string;
}

// DTOs para requests
export interface CreateOrderDto {
  customerId?:       number;
  customerName:      string;
  description:       string;
  totalAmount:       number;
  estimatedDelivery?: string;
  notes?:            string;
  initialPayment?:   { amount: number; paymentType: PaymentType; notes?: string };
}

export interface UpdateOrderStatusDto {
  status: OrderStatus;
}

export interface AddPaymentDto {
  amount:      number;
  paymentType: PaymentType;
  notes?:      string;
}

export interface UpsertMeasurementsDto {
  fields: Record<string, string>;
}
