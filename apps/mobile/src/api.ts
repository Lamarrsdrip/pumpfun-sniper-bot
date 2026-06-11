import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const configuredBaseUrl = String(process.env.EXPO_PUBLIC_API_URL || Constants.expoConfig?.extra?.apiUrl || 'http://127.0.0.1:8790');
const webHostname = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.hostname : '';
const baseUrl = webHostname === 'localhost' || webHostname === '127.0.0.1'
  ? `http://${webHostname}:8790`
  : configuredBaseUrl;

async function getSessionValue(key: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') return window.localStorage.getItem(key);
  return SecureStore.getItemAsync(key);
}

async function setSessionValue(key: string, value: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export class ApiError extends Error {
  constructor(message: string, public status: number, public code = 'API_ERROR') {
    super(message);
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getSessionValue('access_token');
  const mode = (await getSessionValue('app_mode')) || 'DEMO';
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
  await setSessionValue('access_token', token);
  await setSessionValue('app_mode', mode);
}

export async function setAppMode(mode: 'DEMO' | 'LIVE') {
  await setSessionValue('app_mode', mode);
}
