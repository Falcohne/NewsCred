import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const getApiBaseUrl = (): string => {
  if (!__DEV__) {
    return 'https://api.newscred.com/api';
  }

  // Works across Expo SDK versions: find the Metro host (your PC's LAN IP)
  const hostUri: string =
    (Constants as any).expoConfig?.hostUri ||
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ||
    (Constants as any).manifest?.debuggerHost ||
    (Constants as any).manifest?.hostUri ||
    '';

  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip) {
      return `http://${ip}:8080/api`;
    }
  }

  if (Platform.OS === 'web') return 'http://localhost:8080/api';
  // Android emulator reaches host machine via 10.0.2.2.
  // On a physical device, Expo's hostUri branch above resolves your PC's LAN IP.
  if (Platform.OS === 'android') return 'http://10.0.2.2:8080/api';
  return 'http://localhost:8080/api';
};

const API_BASE_URL = getApiBaseUrl();
console.log(`API Base URL: ${API_BASE_URL}`);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 30000,
});

// Attach the JWT. NOTE: we deliberately do NOT send user id or premium
// status - the backend derives both from the token. Anything the client
// sends can be spoofed, so the server no longer trusts such headers.
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    } catch {
      return config;
    }
  },
  (error) => Promise.reject(error)
);

const clearSession = async () => {
  await AsyncStorage.multiRemove([
    'token',
    'refreshToken',
    'userId',
    'userName',
    'userEmail',
    'isPremium',
    'analysisCount',
  ]);
};

// Response interceptor: on 401, try the refresh token ONCE before logging out.
let isRefreshing = false;
let refreshWaiters: Array<(token: string | null) => void> = [];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        // Queue this request until the in-flight refresh finishes
        return new Promise((resolve, reject) => {
          refreshWaiters.push((token) => {
            if (!token) return reject(error);
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      isRefreshing = true;
      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        // Plain axios (not `api`) to avoid interceptor recursion
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const newToken = data.token;
        if (!newToken) throw new Error('Refresh failed');

        await AsyncStorage.setItem('token', newToken);
        if (data.refreshToken) {
          await AsyncStorage.setItem('refreshToken', data.refreshToken);
        }

        refreshWaiters.forEach((cb) => cb(newToken));
        refreshWaiters = [];

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        refreshWaiters.forEach((cb) => cb(null));
        refreshWaiters = [];
        await clearSession();
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
export { API_BASE_URL, clearSession };
