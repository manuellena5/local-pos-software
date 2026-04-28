import path from 'path';
import type { AFIPCredentials } from '../core/types';

/**
 * Configuración AFIP leída desde variables de entorno.
 *
 * Variables requeridas en producción:
 *   AFIP_CUIT         — CUIT del emisor (sin guiones)
 *   AFIP_CERT_PATH    — Ruta absoluta al certificado .crt
 *   AFIP_KEY_PATH     — Ruta absoluta a la clave privada .key
 *   AFIP_ENVIRONMENT  — "testing" | "production" | "mock" (default: "mock")
 *   AFIP_POINT_OF_SALE — Número de punto de venta (default: 1)
 */

export function getAFIPConfig(): AFIPCredentials {
  const env = (process.env.AFIP_ENVIRONMENT ?? 'mock') as AFIPCredentials['environment'];

  return {
    cuit: process.env.AFIP_CUIT ?? '20000000000',
    certPath:
      process.env.AFIP_CERT_PATH ??
      path.join(process.cwd(), 'certs', 'afip.crt'),
    keyPath:
      process.env.AFIP_KEY_PATH ??
      path.join(process.cwd(), 'certs', 'afip.key'),
    environment: env,
  };
}

export function getPointOfSale(): number {
  return parseInt(process.env.AFIP_POINT_OF_SALE ?? '1', 10);
}

export function isMockMode(): boolean {
  return (process.env.AFIP_ENVIRONMENT ?? 'mock') === 'mock';
}
