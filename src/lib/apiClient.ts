import { tokenStore } from './tokenStore';

export const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

let _refreshing: Promise<string | null> | null = null;

async function performRefresh(): Promise<string | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.status === 401 || response.status === 403) {
      tokenStore.clear();
      return null;
    }

    if (!response.ok) {
      tokenStore.clear();
      return null;
    }

    const data = await response.json();
    const newAccessToken = data?.data?.access_token;
    const user = data?.data?.user;

    if (newAccessToken) {
      tokenStore.setToken(newAccessToken);
      if (user && user.id) {
        tokenStore.setCachedUser({
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
        });
      }
      return newAccessToken;
    }

    return null;
  } catch (error) {
    console.error('Refresh failed:', error);
    tokenStore.clear();
    return null;
  }
}

async function ensureToken(): Promise<string | null> {
  const currentToken = tokenStore.getToken();

  if (!currentToken || tokenStore.shouldRefresh()) {
    if (!_refreshing) {
      _refreshing = performRefresh().finally(() => {
        _refreshing = null;
      });
    }
    return _refreshing;
  }

  return currentToken;
}

export interface FetchApiOptions extends RequestInit {
  skipAuth?: boolean;
}

export async function fetchApi(
  endpoint: string,
  options: FetchApiOptions = {}
): Promise<any> {
  const headers: Record<string, string> = {};
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (options.headers && typeof options.headers === 'object') {
    Object.assign(headers, options.headers);
  }

  if (!options.skipAuth) {
    const token = await ensureToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  // Inject CSRF token if this is a state-changing auth request
  const isAuthPost = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method?.toUpperCase() || '') &&
    endpoint.startsWith('/auth/');

  if (isAuthPost) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/csrf-token`, {
        method: 'GET',
        credentials: 'include',
      });
      if (response.ok) {
        const body = await response.json();
        const csrfToken = body?.data?.csrfToken;
        if (csrfToken) {
          headers['X-CSRF-Token'] = csrfToken;
        }
      }
    } catch (err) {
      console.error('Failed to inject CSRF token:', err);
    }
  }

  const { skipAuth: _skipAuth, ...fetchOptions } = options;
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...fetchOptions,
    credentials: 'include',
    headers,
  });

  if (response.status === 204) {
    return null;
  }

  let data: any = null;
  try {
    data = await response.json();
  } catch (e) {
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    return null;
  }

  if (response.status === 401) {
    tokenStore.clear();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('auth-expired'));
    }
    throw new Error(data?.msg || data?.message || 'Session expired');
  }

  if (!response.ok) {
    throw new Error(data?.msg || data?.message || `API error: ${response.statusText}`);
  }

  let result = data;
  if (data && typeof data === 'object' && 'data' in data) {
    result = data.data;
  }

  // If the response contains a user profile object, merge the cached firstName/lastName if IDs match
  if (result && typeof result === 'object' && result.user && result.user.id) {
    const cached = tokenStore.getCachedUser();
    if (cached && cached.id === result.user.id) {
      result.user = {
        ...result.user,
        firstName: cached.firstName || result.user.firstName,
        lastName: cached.lastName || result.user.lastName,
      };
    }
  }

  return result;
}