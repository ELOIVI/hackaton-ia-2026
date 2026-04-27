export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export type AuthRole = 'voluntari' | 'empresa' | 'treballador';

export interface AuthUser {
  id: string;
  email: string;
  role: AuthRole;
  nom?: string;
  companyName?: string;
  location?: string;
}

interface AuthResponse {
  token: string;
  user: AuthUser;
}

interface ErrorPayload {
  error?: unknown;
  code?: unknown;
  retry_after_seconds?: unknown;
}

export class ApiRequestError extends Error {
  status: number;
  code?: string;
  retryAfterSeconds?: number;
  isTokenExpired: boolean;

  constructor(
    message: string,
    options: {
      status: number;
      code?: string;
      retryAfterSeconds?: number;
      isTokenExpired?: boolean;
    }
  ) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = options.status;
    this.code = options.code;
    this.retryAfterSeconds = options.retryAfterSeconds;
    this.isTokenExpired = Boolean(options.isTokenExpired);
  }
}

const AUTH_TOKEN_KEY = 'caritasAuthToken';

function safeLocalStorageGet(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    // localStorage may be blocked or unavailable in some environments.
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLocalStorageSet(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore quota or blocked storage errors.
  }
}

function safeLocalStorageRemove(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore quota or blocked storage errors.
  }
}

function parseErrorMessage(payload: unknown, fallback: string): string {
  if (typeof payload === 'object' && payload !== null && 'error' in payload) {
    const err = (payload as { error?: unknown }).error;
    if (typeof err === 'string' && err.trim()) return err;
  }
  return fallback;
}

function parseRetryAfterSeconds(payload: unknown): number | undefined {
  if (typeof payload !== 'object' || payload === null || !('retry_after_seconds' in payload)) return undefined;
  const value = (payload as ErrorPayload).retry_after_seconds;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function parseErrorCode(payload: unknown): string | undefined {
  if (typeof payload !== 'object' || payload === null || !('code' in payload)) return undefined;
  const value = (payload as ErrorPayload).code;
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function buildApiError(status: number, payload: unknown, fallbackError: string): ApiRequestError {
  const code = parseErrorCode(payload);
  const retryAfterSeconds = parseRetryAfterSeconds(payload);

  // 401 always means token/session must be renewed on client side.
  if (status === 401) {
    clearAuthToken();
    return new ApiRequestError('Sessió expirada o no vàlida. Torna a iniciar sessió.', {
      status,
      code,
      retryAfterSeconds,
      isTokenExpired: true,
    });
  }

  // 429 maps to explicit rate-limit feedback with optional retry-after.
  if (status === 429) {
    return new ApiRequestError(parseErrorMessage(payload, 'Massa peticions. Torna-ho a provar en uns segons.'), {
      status,
      code,
      retryAfterSeconds,
    });
  }

  // 5xx keeps a safe generic message while preserving details for logging paths.
  if (status >= 500) {
    return new ApiRequestError(parseErrorMessage(payload, 'Servei temporalment no disponible. Torna-ho a provar.'), {
      status,
      code,
      retryAfterSeconds,
    });
  }

  return new ApiRequestError(parseErrorMessage(payload, fallbackError), {
    status,
    code,
    retryAfterSeconds,
  });
}

export function isApiRequestError(error: unknown): error is ApiRequestError {
  return error instanceof ApiRequestError;
}

async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit, fallbackError = 'Error de servidor'): Promise<T> {
  const res = await fetch(input, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw buildApiError(res.status, data, fallbackError);
  }
  return data as T;
}

export function saveAuthToken(token: string) {
  safeLocalStorageSet(AUTH_TOKEN_KEY, token);
}

export function getAuthToken() {
  return safeLocalStorageGet(AUTH_TOKEN_KEY);
}

export function clearAuthToken() {
  safeLocalStorageRemove(AUTH_TOKEN_KEY);
}

export function getAuthHeaders(extra: Record<string, string> = {}) {
  const token = getAuthToken();
  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function authRegister(payload: {
  email: string;
  password: string;
  role: AuthRole;
  nom?: string;
  companyName?: string;
  location?: string;
}) {
  return requestJson<AuthResponse>(
    `${API_BASE}/auth/register`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'No s\'ha pogut completar el registre'
  );
}

export async function authLogin(email: string, password: string) {
  return requestJson<AuthResponse>(
    `${API_BASE}/auth/login`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    },
    'Credencials incorrectes'
  );
}

export async function authMe(token?: string) {
  const bearer = token || getAuthToken();
  if (!bearer) throw new Error('No hi ha token de sessió');

  return requestJson<{ user: AuthUser }>(
    `${API_BASE}/auth/me`,
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${bearer}` },
    },
    'Sessió no vàlida'
  );
}

export async function matchText(text: string) {
  const res = await fetch(`${API_BASE}/match/text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error('Error connectant amb el servidor');
  return res.json();
}

export async function chatPersona(history: {role:string;content:string}[], message: string) {
  return requestJson<{response:string;ready:boolean;match:unknown}>(
    `${API_BASE}/chat/persona`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ history, message }),
    },
    'No hem pogut processar la consulta'
  );
}

export async function chatVoluntari(history: {role:string;content:string}[], message: string) {
  return requestJson<{response:string;ready:boolean;match:unknown}>(
    `${API_BASE}/chat/voluntari`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ history, message }),
    },
    'No hem pogut processar la consulta'
  );
}
