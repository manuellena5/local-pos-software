import type { ApiResponse, ApiErrorResponse } from '@shared/types';

// En Electron usa puerto absoluto; en browser/preview usa ruta relativa (proxy Vite)
const BASE_URL = window.location.protocol === 'file:' ? 'http://localhost:3001' : '';

class ApiError extends Error {
  constructor(
    public code: string,
    message: string
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
    // Intentar leer el mensaje del servidor antes de lanzar el error
    try {
      const errBody = (await res.json()) as ApiErrorResponse;
      if (errBody.error?.message) {
        throw new ApiError(errBody.error.code ?? 'HTTP_ERROR', errBody.error.message);
      }
    } catch (inner) {
      if (inner instanceof ApiError) throw inner;
    }
    throw new ApiError('HTTP_ERROR', `Error ${res.status}: ${res.statusText}`);
  }

  let body: ApiResponse<T> | ApiErrorResponse;
  try {
    body = (await res.json()) as ApiResponse<T> | ApiErrorResponse;
  } catch (err) {
    throw new ApiError(
      'PARSE_ERROR',
      `Failed to parse JSON response from ${path}`
    );
  }

  if (body.error !== null) {
    throw new ApiError(body.error.code, body.error.message);
  }
  return body.data;
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
