import type { ApiResponse, ApiErrorResponse } from '@shared/types';
import { logError } from '@/lib/errorLog';

// En Electron usa puerto absoluto; en browser/preview usa ruta relativa (proxy Vite)
const BASE_URL = window.location.protocol === 'file:' ? 'http://localhost:3001' : '';

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: string[] | unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

  if (!res.ok) {
    try {
      const errBody = (await res.json()) as ApiErrorResponse & { error: { details?: unknown } };
      if (errBody.error?.message) {
        const err = new ApiError(errBody.error.code ?? 'HTTP_ERROR', errBody.error.message, errBody.error.details);
        logError(err, path);
        throw err;
      }
    } catch (inner) {
      if (inner instanceof ApiError) throw inner;
    }
    const err = new ApiError('HTTP_ERROR', `Error ${res.status}: ${res.statusText}`);
    logError(err, path);
    throw err;
  }

  let body: ApiResponse<T> | ApiErrorResponse;
  try {
    body = (await res.json()) as ApiResponse<T> | ApiErrorResponse;
  } catch {
    const err = new ApiError('PARSE_ERROR', `Respuesta inválida del servidor (${path})`);
    logError(err, path);
    throw err;
  }

  if (body.error !== null) {
    const errBody = body as ApiErrorResponse & { error: { details?: unknown } };
    const err = new ApiError(errBody.error.code, errBody.error.message, errBody.error.details);
    logError(err, path);
    throw err;
  }
  return (body as ApiResponse<T>).data;
}

export const apiClient = {
  get<T>(path: string): Promise<T> {
    return request<T>(path);
  },
  post<T>(path: string, body: unknown): Promise<T> {
    return request<T>(path, { method: 'POST', body: JSON.stringify(body) });
  },
  put<T>(path: string, body: unknown): Promise<T> {
    return request<T>(path, { method: 'PUT', body: JSON.stringify(body) });
  },
  patch<T>(path: string, body: unknown): Promise<T> {
    return request<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
  },
  delete<T>(path: string): Promise<T> {
    return request<T>(path, { method: 'DELETE' });
  },
};
