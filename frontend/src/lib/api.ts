export const API_BASE = 'http://34.235.116.7:5000';

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

const AUTH_TOKEN_KEY = 'caritasAuthToken';

function parseErrorMessage(payload: unknown, fallback: string): string {
  if (typeof payload === 'object' && payload !== null && 'error' in payload) {
    const err = (payload as { error?: unknown }).error;
    if (typeof err === 'string' && err.trim()) return err;
  }
  return fallback;
}

async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit, fallbackError = 'Error de servidor'): Promise<T> {
  const res = await fetch(input, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(parseErrorMessage(data, fallbackError));
  }
  return data as T;
}

export function saveAuthToken(token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function getAuthToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function clearAuthToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTH_TOKEN_KEY);
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
