import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * Determines the appropriate API base URL based on platform and environment
 */
const getApiBaseUrl = (): string => {
  // Production environment - use deployed API
  if (!__DEV__) {
    return 'https://api.newscred.com/api';
  }

  // Use the IP from ipconfig command output
  const localIp = '10.243.127.154';

  if (Platform.OS === 'web') {
    return 'http://localhost:8080/api';
  }

  if (Platform.OS === 'android') {
    return `http://10.151.67.154:8080/api`;
  }

  if (Platform.OS === 'ios') {
    return 'http://localhost:8080/api';
  }

  return 'http://localhost:8080/api';
};

const API_BASE_URL = getApiBaseUrl();

console.log(`API Base URL: ${API_BASE_URL}`);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 30000,
});

/**
 * Request interceptor that attaches the authentication token and user headers
 * to every outgoing request if they exist in storage.
 */
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      const userId = await AsyncStorage.getItem('userId');
      if (userId) {
        config.headers['X-User-Id'] = userId;
      }
      
      const isPremium = await AsyncStorage.getItem('isPremium');
      if (isPremium) {
        config.headers['X-User-Premium'] = isPremium;
      }
      
      return config;
    } catch (error) {
      console.error('Token retrieval error:', error);
      return config;
    }
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

/**
 * Response interceptor that handles token expiration and other errors.
 * When a 401 Unauthorized response is received, it clears the session
 * and prompts the user to log in again.
 */
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized - token expired or invalid
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Clear all authentication data from storage
        await AsyncStorage.multiRemove([
          'token',
          'refreshToken',
          'userId',
          'userName',
          'userEmail',
          'isPremium',
          'analysisCount'
        ]);

        console.warn('Session expired. Please login again.');
        return Promise.reject(error);
      } catch (refreshError) {
        console.error('Error handling token expiration:', refreshError);
        return Promise.reject(refreshError);
      }
    }

    // Log errors for debugging purposes
    if (error.response) {
      console.error(`API Error ${error.response.status}:`, error.response.data);
    } else if (error.request) {
      console.error('Network Error - No response from server');
    } else {
      console.error('API Request Error:', error.message);
    }

    return Promise.reject(error);
  }
);

export default api;

export const apiHelpers = {
  /**
   * Checks if the API server is reachable
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await api.get('/test');
      return response.status === 200;
    } catch {
      return false;
    }
  },

  /**
   * Checks if the user has a valid token stored
   */
  async getTokenStatus(): Promise<{ hasToken: boolean; isValid?: boolean }> {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      return { hasToken: false };
    }
    return { hasToken: true };
  },

  /**
   * Clears all authentication data from storage
   */
  async clearAuth(): Promise<void> {
    await AsyncStorage.multiRemove([
      'token',
      'refreshToken',
      'userId',
      'userName',
      'userEmail',
      'isPremium',
      'analysisCount'
    ]);
  },

  /**
   * Stores authentication data in storage
   */
  async setAuthData(data: {
    token: string;
    userId: string;
    userName: string;
    userEmail: string;
    isPremium: boolean;
    analysisCount: number;
  }): Promise<void> {
    await AsyncStorage.multiSet([
      ['token', data.token],
      ['userId', data.userId],
      ['userName', data.userName],
      ['userEmail', data.userEmail],
      ['isPremium', String(data.isPremium)],
      ['analysisCount', String(data.analysisCount)]
    ]);
  }
};

export { getApiBaseUrl };