/**
 * Cliente Supabase — opcional.
 * Si SUPABASE_URL y SUPABASE_ANON_KEY no están en el entorno,
 * isSupabaseConfigured() devuelve false y el sync no se ejecuta.
 * La app funciona 100% sin estas variables.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return !!(process.env['SUPABASE_URL'] && process.env['SUPABASE_ANON_KEY']);
}

export function getSupabaseClient(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase no está configurado. Definí SUPABASE_URL y SUPABASE_ANON_KEY en .env');
  }
  if (!_client) {
    _client = createClient(
      process.env['SUPABASE_URL']!,
      process.env['SUPABASE_ANON_KEY']!,
      {
        auth: { persistSession: false },
      },
    );
  }
  return _client;
}
