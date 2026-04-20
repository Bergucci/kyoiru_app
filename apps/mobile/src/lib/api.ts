const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message);
  }
}

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  token?: string | null;
  body?: unknown;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {};

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const text = await response.text();
  const parsedBody = parseResponseBody(text);

  if (!response.ok) {
    throw new ApiError(resolveApiErrorMessage(parsedBody), response.status, parsedBody);
  }

  return parsedBody as T;
}

export function getApiUrl(): string {
  return API_URL;
}

export function resolveMediaUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${API_URL}${path}`;
}

export function toApiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return '不明なエラーが発生しました。';
}

function parseResponseBody(text: string): unknown {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function resolveApiErrorMessage(body: unknown): string {
  if (
    typeof body === 'object' &&
    body !== null &&
    'message' in body &&
    typeof body.message === 'string'
  ) {
    return body.message;
  }

  if (typeof body === 'string' && body.trim()) {
    return body;
  }

  return 'API の呼び出しに失敗しました。';
}
