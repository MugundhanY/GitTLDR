// Client-side cache for user data and other frequently accessed data
interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class ClientCache {
  private cache = new Map<string, CacheItem<any>>();

  set<T>(key: string, data: T, ttlSeconds: number = 300): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // Check if item has expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Check if an item exists and is not expired
  has(key: string): boolean {
    return this.get(key) !== null;
  }
}

export const clientCache = new ClientCache();

// Predefined cache keys
export const CACHE_KEYS = {
  USER_DATA: 'user_data',
  BILLING_DATA: 'billing_data',
  REPOSITORIES: 'repositories'
} as const;
