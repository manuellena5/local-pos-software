import type { ApiResponse, ApiErrorResponse } from '@shared/types';

const BASE_URL = 'http://localhost:3001';

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
  const body = (await res.json()) as ApiResponse<T> | ApiErrorResponse;
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
  patch<T>(path: string, body: unknown): Promise<T> {
    return request<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
  },
};
