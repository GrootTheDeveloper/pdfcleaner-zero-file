import { ErrorCodes } from '@pdfcleaner/shared';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public errorCode: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ErrorPayload {
  errorCode?: string;
  message?: string;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const cleanPath = path.replace(/^\//, '');
  const url = `${BASE_URL}/${cleanPath}`;

  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Automatically send/receive secure httpOnly cookies
  });

  if (!response.ok) {
    let errorCode: string = ErrorCodes.UNKNOWN_ERROR;
    let message = 'An unexpected API error occurred';

    try {
      const data = (await response.json()) as ErrorPayload;
      errorCode = data.errorCode || errorCode;
      message = data.message || message;
    } catch {
      // Fail silent and use default status code mapping
    }

    throw new ApiError(response.status, errorCode, message);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

export const apiClient = {
  get<T>(path: string, options?: RequestInit): Promise<T> {
    return request<T>(path, { ...options, method: 'GET' });
  },
  post<T>(path: string, body?: unknown, options?: RequestInit): Promise<T> {
    return request<T>(path, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  },
  patch<T>(path: string, body?: unknown, options?: RequestInit): Promise<T> {
    return request<T>(path, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  },
  put<T>(path: string, body?: unknown, options?: RequestInit): Promise<T> {
    return request<T>(path, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  },
  delete<T>(path: string, options?: RequestInit): Promise<T> {
    return request<T>(path, { ...options, method: 'DELETE' });
  },
};
