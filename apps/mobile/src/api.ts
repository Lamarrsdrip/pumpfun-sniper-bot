import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

const baseUrl = String(process.env.EXPO_PUBLIC_API_URL || Constants.expoConfig?.extra?.apiUrl || 'http://127.0.0.1:8790');

export class ApiError extends Error {
  constructor(message: string, public status: number, public code = 'API_ERROR') {
    super(message);
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await SecureStore.getItemAsync('access_token');
  const mode = (await SecureStore.getItemAsync('app_mode')) || 'DEMO';
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'X-App-Mode': mode,
      ...init.headers
    }
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(body?.message || 'Request failed', response.status, body?.code);
  return body as T;
}

export function apiBaseUrl() {
  return baseUrl;
}

export async function saveSession(token: string, mode: 'DEMO' | 'LIVE') {
  await SecureStore.setItemAsync('access_token', token);
  await SecureStore.setItemAsync('app_mode', mode);
}

export async function setAppMode(mode: 'DEMO' | 'LIVE') {
  await SecureStore.setItemAsync('app_mode', mode);
}
