import { db } from '../../db/connection';
import { customers, sales, saleItems } from '../../db/schema';
import { eq, desc } from 'drizzle-orm';
import type { Customer, Sale, SaleItem } from '../../../shared/types';
import type { CreateCustomerRequest, UpdateCustomerRequest } from '../types';

function rowToCustomer(row: typeof customers.$inferSelect): Customer {
  return {
    id: row.id,
    name: row.name,
    documentType: row.documentType as Customer['documentType'],
    document: row.document,
    email: row.email,
    phone: row.phone,
    address: row.address,
    locality: row.locality ?? null,
    province: row.province ?? null,
    notes: row.notes,
    creditLimit: row.creditLimit,
    creditUsed: row.creditUsed,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class CustomerRepository {
  getAll(): Customer[] {
    return db
      .select()
      .from(customers)
      .where(eq(customers.isActive, true))
      .orderBy(customers.name)
      .all()
      .map(rowToCustomer);
  }

  getById(id: number): Customer | null {
    const row = db.select().from(customers).where(eq(customers.id, id)).get();
    return row ? rowToCustomer(row) : null;
  }

  getByDocument(document: string): Customer | null {
    const row = db.select().from(customers).where(eq(customers.document, document)).get();
    return row ? rowToCustomer(row) : null;
  }

  getByEmail(email: string): Customer | null {
    const row = db.select().from(customers).where(eq(customers.email, email)).get();
    return row ? rowToCustomer(row) : null;
  }

  create(data: CreateCustomerRequest): Customer {
    const row = db
      .insert(customers)
      .values({
        name: data.name,
        documentType: data.documentType ?? null,
        document: data.document ?? null,
        email: data.email && data.email !== '' ? data.email : null,
        phone: data.phone ?? null,
        address: data.address ?? null,
        locality: data.locality ?? null,
        province: data.province ?? null,
        notes: data.notes ?? null,
        creditLimit: data.creditLimit ?? 0,
        creditUsed: 0,
        isActive: true,
      })
      .returning()
      .get();
    return rowToCustomer(row);
  }

  update(id: number, data: UpdateCustomerRequest): Customer | null {
    const now = new Date().toISOString();
    const row = db
      .update(customers)
      .set({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.documentType !== undefined && { documentType: data.documentType }),
        ...(data.document !== undefined && { document: data.document }),
        ...(data.email !== undefined && { email: data.email && data.email !== '' ? data.email : null }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.address !== undefined && { address: data.address ?? null }),
        ...(data.locality !== undefined && { locality: data.locality ?? null }),
        ...(data.province !== undefined && { province: data.province ?? null }),
        ...(data.notes !== undefined && { notes: data.notes ?? null }),
        ...(data.creditLimit !== undefined && { creditLimit: data.creditLimit }),
        updatedAt: now,
      })
      .where(eq(customers.id, id))
      .returning()
      .get();
    return row ? rowToCustomer(row) : null;
  }

  softDelete(id: number): void {
    db.update(customers)
      .set({ isActive: false, updatedAt: new Date().toISOString() })
      .where(eq(customers.id, id))
      .run();
  }

  search(query: string): Customer[] {
    const all = this.getAll();
    const strip = /\p{Mn}/gu;
    const normalize = (s: string) => s.normalize('NFD').replace(strip, '').toLowerCase();
    const q = normalize(query);
    return all.filter(
      (c) =>
        normalize(c.name).includes(q) ||
        (c.document ?? '').toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q) ||
        (c.phone ?? '').toLowerCase().includes(q),
    );
  }

  getWithPurchaseHistory(id: number): {
    customer: Customer;
    purchases: Array<{ sale: Sale; items: SaleItem[] }>;
    totalSpent: number;
  } | null {
    const customer = this.getById(id);
    if (!customer) return null;

    const saleRows = db
      .select()
      .from(sales)
      .where(eq(sales.customerId, id))
      .orderBy(desc(sales.createdAt))
      .limit(50)
      .all();

    const purchases = saleRows.map((saleRow) => {
      const itemRows = db
        .select()
        .from(saleItems)
        .where(eq(saleItems.saleId, saleRow.id))
        .all();
      return {
        sale: {
          ...saleRow,
          paymentMethods: JSON.parse(saleRow.paymentMethods),
        } as Sale,
        items: itemRows as SaleItem[],
      };
    });

    const totalSpent = purchases.reduce((sum, p) => sum + p.sale.totalAmount, 0);

    return { customer, purchases, totalSpent };
  }

  updateCreditUsed(id: number, delta: number): void {
    const row = db.select().from(customers).where(eq(customers.id, id)).get();
    if (!row) return;
    const newUsed = Math.max(0, row.creditUsed + delta);
    db.update(customers)
      .set({ creditUsed: newUsed, updatedAt: new Date().toISOString() })
      .where(eq(customers.id, id))
      .run();
  }
}
