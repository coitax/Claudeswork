/**
 * Thin fetch wrapper for the JSON API. Cookies (session) are sent automatically
 * because requests are same-origin (dev uses a Vite proxy to the API).
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public issues?: unknown,
  ) {
    super(message);
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new ApiError(res.status, data?.error ?? res.statusText, data?.issues);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  del: <T>(path: string) => request<T>('DELETE', path),
};

import type { ActivityPhoto } from '@cbt/shared';

export async function uploadPhoto(weekId: string, file: File): Promise<ActivityPhoto> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`/api/activity-weeks/${weekId}/photos`, { method: 'POST', body: form, credentials: 'same-origin' });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError(res.status, (data as { error?: string })?.error ?? res.statusText);
  }
  return res.json() as Promise<ActivityPhoto>;
}
