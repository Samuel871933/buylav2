import { API_URL } from './constants';

let csrfToken: string | null = null;

function getCsrfFromCookie(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)__csrf=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function ensureCsrfToken(): Promise<string | null> {
  if (csrfToken) return csrfToken;
  // Check cookie first
  const fromCookie = getCsrfFromCookie();
  if (fromCookie) {
    csrfToken = fromCookie;
    return csrfToken;
  }
  // Fetch from API
  try {
    const res = await fetch(`${API_URL}/api/auth/csrf-token`, {
      credentials: 'include',
    });
    const json = await res.json();
    csrfToken = json.data?.csrfToken || null;
    return csrfToken;
  } catch {
    return null;
  }
}

/**
 * Fetch wrapper that automatically attaches CSRF token for mutations.
 */
export async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  const method = (options?.method || 'GET').toUpperCase();
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string>),
  };

  // Add auth token
  const token = typeof window !== 'undefined' ? localStorage.getItem('buyla_token') : null;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Add Content-Type if body present
  if (options?.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  // Add CSRF token for mutations
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    const csrf = await ensureCsrfToken();
    if (csrf) {
      headers['x-csrf-token'] = csrf;
    }
  }

  return fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });
}

/** Reset cached CSRF token (call on logout) */
export function resetCsrfToken() {
  csrfToken = null;
}
