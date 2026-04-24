import { eq } from 'drizzle-orm';
import { db } from '../../db/connection';
import { users } from '../../db/schema';
import type { UserRow } from '../../db/schemas/core/installation';

interface CreateUserData {
  installationId: number;
  email: string;
  passwordHash: string;
  role: 'admin' | 'cashier';
}

export class UserRepository {
  /** Busca un usuario por email. Retorna la fila completa (con passwordHash) para uso interno. */
  getByEmail(email: string): UserRow | null {
    const rows = db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)
      .all();
    return rows[0] ?? null;
  }

  create(data: CreateUserData): UserRow {
    const rows = db.insert(users).values(data).returning().all();
    return rows[0];
  }
}
