import type {
  TallerOrder,
  TallerOrderPayment,
  TallerClientMeasurements,
  CreateOrderDto,
  UpdateOrderStatusDto,
  AddPaymentDto,
  UpsertMeasurementsDto,
  OrderStatus,
} from '../types';

const BASE = `${window.location.protocol === 'file:' ? 'http://localhost:3001' : ''}/api/modules/taller-medida`;

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json() as { data: T; error: { message: string } | null };
  if (!res.ok || json.error) throw new Error(json.error?.message ?? 'Error desconocido');
  return json.data;
}

type OrderWithTotals = TallerOrder & { paidAmount: number; pendingAmount: number };
type OrderDetail = OrderWithTotals & { payments: TallerOrderPayment[] };

export const tallerMedidaApi = {
  // ── Pedidos ────────────────────────────────────────────────────────────────
  async listOrders(buId: number, status?: OrderStatus): Promise<OrderWithTotals[]> {
    const params = new URLSearchParams({ buId: String(buId) });
    if (status) params.set('status', status);
    const res = await fetch(`${BASE}/orders?${params}`);
    return handleResponse<OrderWithTotals[]>(res);
  },

  async getOrder(id: number): Promise<OrderDetail> {
    const res = await fetch(`${BASE}/orders/${id}`);
    return handleResponse<OrderDetail>(res);
  },

  async createOrder(buId: number, data: CreateOrderDto): Promise<OrderWithTotals> {
    const res = await fetch(`${BASE}/orders?buId=${buId}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data),
    });
    return handleResponse<OrderWithTotals>(res);
  },

  async updateStatus(id: number, data: UpdateOrderStatusDto): Promise<TallerOrder> {
    const res = await fetch(`${BASE}/orders/${id}/status`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data),
    });
    return handleResponse<TallerOrder>(res);
  },

  async addPayment(id: number, data: AddPaymentDto): Promise<TallerOrderPayment> {
    const res = await fetch(`${BASE}/orders/${id}/payments`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data),
    });
    return handleResponse<TallerOrderPayment>(res);
  },

  // ── Medidas ────────────────────────────────────────────────────────────────
  async getMeasurements(
    customerId: number,
    buId: number,
  ): Promise<(TallerClientMeasurements & { fields: Record<string, string> }) | null> {
    const res = await fetch(`${BASE}/customers/${customerId}/measurements?buId=${buId}`);
    return handleResponse<(TallerClientMeasurements & { fields: Record<string, string> }) | null>(res);
  },

  async upsertMeasurements(
    customerId: number,
    buId: number,
    data: UpsertMeasurementsDto,
  ): Promise<TallerClientMeasurements & { fields: Record<string, string> }> {
    const res = await fetch(`${BASE}/customers/${customerId}/measurements?buId=${buId}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data),
    });
    return handleResponse<TallerClientMeasurements & { fields: Record<string, string> }>(res);
  },
};
