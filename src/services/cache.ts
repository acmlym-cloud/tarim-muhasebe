import AsyncStorage from '@react-native-async-storage/async-storage';

// Cache configuration
const CACHE_PREFIX = '@cache_';
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const STALE_WHILE_REVALIDATE_TTL = 30 * 60 * 1000; // 30 minutes

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  forceRefresh?: boolean;
  staleWhileRevalidate?: boolean;
}

class CacheService {
  private memoryCache: Map<string, CacheItem<any>> = new Map();
  private pendingRequests: Map<string, Promise<any>> = new Map();

  // Generate cache key
  private getCacheKey(key: string): string {
    return `${CACHE_PREFIX}${key}`;
  }

  // Check if cache is valid
  private isValid<T>(item: CacheItem<T> | null, options?: CacheOptions): boolean {
    if (!item) return false;
    const now = Date.now();
    const age = now - item.timestamp;
    
    if (options?.staleWhileRevalidate) {
      return age < STALE_WHILE_REVALIDATE_TTL;
    }
    
    return age < item.ttl;
  }

  // Check if cache is stale but usable
  private isStale<T>(item: CacheItem<T> | null): boolean {
    if (!item) return true;
    const now = Date.now();
    const age = now - item.timestamp;
    return age >= item.ttl && age < STALE_WHILE_REVALIDATE_TTL;
  }

  // Get from memory cache
  private getFromMemory<T>(key: string): CacheItem<T> | null {
    return this.memoryCache.get(key) || null;
  }

  // Set to memory cache
  private setToMemory<T>(key: string, item: CacheItem<T>): void {
    this.memoryCache.set(key, item);
  }

  // Get from AsyncStorage
  private async getFromStorage<T>(key: string): Promise<CacheItem<T> | null> {
    try {
      const cacheKey = this.getCacheKey(key);
      const stored = await AsyncStorage.getItem(cacheKey);
      if (stored) {
        const item = JSON.parse(stored) as CacheItem<T>;
        // Also update memory cache
        this.setToMemory(key, item);
        return item;
      }
    } catch (error) {
      console.log('Cache read error:', error);
    }
    return null;
  }

  // Set to AsyncStorage
  private async setToStorage<T>(key: string, item: CacheItem<T>): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(key);
      await AsyncStorage.setItem(cacheKey, JSON.stringify(item));
    } catch (error) {
      console.log('Cache write error:', error);
    }
  }

  // Get cached data
  async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    if (options?.forceRefresh) return null;

    // Check memory cache first
    let item = this.getFromMemory<T>(key);
    
    // If not in memory, check storage
    if (!item) {
      item = await this.getFromStorage<T>(key);
    }

    if (this.isValid(item, options)) {
      return item!.data;
    }

    return null;
  }

  // Set cached data
  async set<T>(key: string, data: T, ttl: number = DEFAULT_TTL): Promise<void> {
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };

    // Update both caches
    this.setToMemory(key, item);
    await this.setToStorage(key, item);
  }

  // Fetch with cache (stale-while-revalidate pattern)
  async fetchWithCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const { ttl = DEFAULT_TTL, forceRefresh = false, staleWhileRevalidate = true } = options;

    // Check if there's already a pending request for this key
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!;
    }

    // Try to get from cache
    if (!forceRefresh) {
      const cached = await this.get<T>(key, { staleWhileRevalidate });
      if (cached !== null) {
        // Check if we should revalidate in background
        const item = this.getFromMemory<T>(key) || await this.getFromStorage<T>(key);
        if (staleWhileRevalidate && this.isStale(item)) {
          // Revalidate in background
          this.revalidateInBackground(key, fetcher, ttl);
        }
        return cached;
      }
    }

    // Fetch fresh data
    const fetchPromise = fetcher()
      .then(async (data) => {
        await this.set(key, data, ttl);
        return data;
      })
      .finally(() => {
        this.pendingRequests.delete(key);
      });

    this.pendingRequests.set(key, fetchPromise);
    return fetchPromise;
  }

  // Revalidate cache in background
  private async revalidateInBackground<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number
  ): Promise<void> {
    try {
      const data = await fetcher();
      await this.set(key, data, ttl);
    } catch (error) {
      console.log('Background revalidation failed:', error);
    }
  }

  // Invalidate cache
  async invalidate(key: string): Promise<void> {
    this.memoryCache.delete(key);
    try {
      const cacheKey = this.getCacheKey(key);
      await AsyncStorage.removeItem(cacheKey);
    } catch (error) {
      console.log('Cache invalidate error:', error);
    }
  }

  // Invalidate all cache with prefix
  async invalidateByPrefix(prefix: string): Promise<void> {
    // Clear from memory cache
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(prefix)) {
        this.memoryCache.delete(key);
      }
    }

    // Clear from storage
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(k => k.startsWith(`${CACHE_PREFIX}${prefix}`));
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
    } catch (error) {
      console.log('Cache invalidate by prefix error:', error);
    }
  }

  // Clear all cache
  async clearAll(): Promise<void> {
    this.memoryCache.clear();
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
    } catch (error) {
      console.log('Cache clear all error:', error);
    }
  }

  // Get cache stats
  async getStats(): Promise<{ memoryItems: number; storageItems: number }> {
    const memoryItems = this.memoryCache.size;
    let storageItems = 0;
    try {
      const keys = await AsyncStorage.getAllKeys();
      storageItems = keys.filter(k => k.startsWith(CACHE_PREFIX)).length;
    } catch (error) {
      console.log('Cache stats error:', error);
    }
    return { memoryItems, storageItems };
  }
}

export const cacheService = new CacheService();
export default cacheService;
