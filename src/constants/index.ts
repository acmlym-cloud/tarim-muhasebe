export * from './theme';

import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Production Backend URL
const PRODUCTION_URL = 'https://tarim-muhasebe.onrender.com';

// API Configuration - Use expo config extra or env or fallback
export const API_URL = (() => {
  try {
    // First try expo-constants extra (works in standalone apps)
    const extraUrl = Constants.expoConfig?.extra?.backendUrl;
    if (extraUrl) {
      console.log('Using backend URL from expo config:', extraUrl);
      return extraUrl;
    }
    
    // Then try process.env (works in development)
    const envUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
    if (envUrl) {
      console.log('Using backend URL from env:', envUrl);
      return envUrl;
    }
    
    // For web in production, use the production URL
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      console.log('Using production URL for web:', PRODUCTION_URL);
      return PRODUCTION_URL;
    }
  } catch (e) {
    console.log('Error getting backend URL:', e);
  }
  // Fallback to empty string - will use relative URLs (for web)
  console.log('Using relative URLs (empty base)');
  return '';
})();

// Cache Configuration
export const CACHE_CONFIG = {
  STALE_TIME: 5 * 60 * 1000, // 5 minutes
  CACHE_TIME: 30 * 60 * 1000, // 30 minutes
  RETRY_COUNT: 3,
  RETRY_DELAY: 1000, // 1 second base delay
} as const;

// Debounce Configuration
export const DEBOUNCE_CONFIG = {
  SEARCH: 300,
  FILTER: 300,
  INPUT: 500,
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;
