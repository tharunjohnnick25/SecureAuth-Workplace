import { supabase } from './supabase/client';

export class ApiError extends Error {
  public status: number;
  public data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = 'ApiError';
  }
}

interface RequestOptions extends RequestInit {
  timeout?: number;
}

const DEFAULT_TIMEOUT = 15000;

async function fetchWithTimeout(resource: string, options: RequestOptions = {}) {
  const { timeout = DEFAULT_TIMEOUT } = options;
  
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  const response = await fetch(resource, {
    ...options,
    signal: controller.signal  
  });
  
  clearTimeout(id);
  return response;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  // 1. Get Supabase Session Token
  const { data: { session } } = await supabase.auth.getSession();
  
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  headers.set('Accept', 'application/json');
  
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }

  // 2. Logging Request (dev only)
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[API Request] ${options.method || 'GET'} ${endpoint}`);
  }

  try {
    const response = await fetchWithTimeout(endpoint, {
      ...options,
      headers,
    });

    // 3. Handle Responses
    if (response.status === 204) {
      return {} as T;
    }

    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    const data = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const errorMessage = (data as any)?.error || response.statusText || 'API request failed';
      throw new ApiError(response.status, errorMessage, data);
    }

    return data as T;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new ApiError(408, 'Request timed out');
    }
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, error.message || 'Network error occurred');
  }
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestOptions) => 
    request<T>(endpoint, { ...options, method: 'GET' }),
    
  post: <T>(endpoint: string, body?: any, options?: RequestOptions) => 
    request<T>(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }),
    
  put: <T>(endpoint: string, body?: any, options?: RequestOptions) => 
    request<T>(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) }),
    
  delete: <T>(endpoint: string, options?: RequestOptions) => 
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};
