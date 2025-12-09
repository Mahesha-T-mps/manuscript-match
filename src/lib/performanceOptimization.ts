/**
 * Performance Optimization Utilities
 * Provides utilities for optimizing API calls, caching, and component rendering
 */

import { QueryClient } from '@tanstack/react-query';

/**
 * Request deduplication cache
 * Prevents duplicate API calls for the same resource within a short time window
 */
class RequestDeduplicator {
  private pendingRequests: Map<string, Promise<any>> = new Map();
  private requestTimestamps: Map<string, number> = new Map();
  private readonly DEDUP_WINDOW = 1000; // 1 second window for deduplication

  /**
   * Deduplicate a request by key
   * If a request with the same key is already in flight, return the existing promise
   */
  async deduplicate<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const lastRequestTime = this.requestTimestamps.get(key);

    // Check if there's a pending request for this key
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key) as Promise<T>;
    }

    // Check if we recently completed a request for this key
    if (lastRequestTime && now - lastRequestTime < this.DEDUP_WINDOW) {
      // Request was made very recently, skip it
      return Promise.resolve(null as T);
    }

    // Create new request
    const promise = requestFn()
      .then((result) => {
        this.pendingRequests.delete(key);
        this.requestTimestamps.set(key, Date.now());
        return result;
      })
      .catch((error) => {
        this.pendingRequests.delete(key);
        this.requestTimestamps.delete(key);
        throw error;
      });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  /**
   * Clear deduplication cache for a specific key
   */
  clear(key: string): void {
    this.pendingRequests.delete(key);
    this.requestTimestamps.delete(key);
  }

  /**
   * Clear all deduplication cache
   */
  clearAll(): void {
    this.pendingRequests.clear();
    this.requestTimestamps.clear();
  }
}

export const requestDeduplicator = new RequestDeduplicator();

/**
 * Optimized cache configuration for React Query
 */
export const optimizedCacheConfig = {
  // Metadata is stable after extraction
  metadata: {
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  },
  
  // Keywords are stable after enhancement
  keywords: {
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  },
  
  // Search results are stable after completion
  searchResults: {
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 20 * 60 * 1000, // 20 minutes
  },
  
  // Validation results are stable after completion
  validation: {
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 20 * 60 * 1000, // 20 minutes
  },
  
  // Recommendations are stable after generation
  recommendations: {
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  },
  
  // Process data changes frequently
  processes: {
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  },
  
  // Shortlists change frequently
  shortlists: {
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  },
};

/**
 * Prefetch strategy for workflow steps
 * Prefetches data for the next likely step in the workflow
 */
export class WorkflowPrefetcher {
  constructor(private queryClient: QueryClient) {}

  /**
   * Prefetch data for the next workflow step
   */
  async prefetchNextStep(currentStep: string, processId: string): Promise<void> {
    switch (currentStep) {
      case 'UPLOAD':
        // After upload, prefetch metadata
        await this.queryClient.prefetchQuery({
          queryKey: ['metadata', processId],
          staleTime: optimizedCacheConfig.metadata.staleTime,
        });
        break;

      case 'METADATA_EXTRACTION':
        // After metadata, prefetch keywords
        await this.queryClient.prefetchQuery({
          queryKey: ['keywords', processId],
          staleTime: optimizedCacheConfig.keywords.staleTime,
        });
        break;

      case 'KEYWORD_ENHANCEMENT':
        // After keywords, prefetch search status
        await this.queryClient.prefetchQuery({
          queryKey: ['search', 'status', processId],
          staleTime: optimizedCacheConfig.searchResults.staleTime,
        });
        break;

      case 'DATABASE_SEARCH':
        // After search, prefetch validation status
        await this.queryClient.prefetchQuery({
          queryKey: ['validation', processId],
          staleTime: optimizedCacheConfig.validation.staleTime,
        });
        break;

      case 'VALIDATION':
        // After validation, prefetch recommendations
        await this.queryClient.prefetchQuery({
          queryKey: ['recommendations', processId],
          staleTime: optimizedCacheConfig.recommendations.staleTime,
        });
        break;
    }
  }
}

/**
 * Batch update utility for React Query cache
 * Allows batching multiple cache updates to reduce re-renders
 */
export class CacheBatcher {
  private updates: Array<() => void> = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly BATCH_DELAY = 50; // 50ms batch window

  constructor(private queryClient: QueryClient) {}

  /**
   * Add a cache update to the batch
   */
  addUpdate(updateFn: () => void): void {
    this.updates.push(updateFn);

    // Clear existing timeout
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    // Set new timeout to flush batch
    this.batchTimeout = setTimeout(() => {
      this.flush();
    }, this.BATCH_DELAY);
  }

  /**
   * Flush all pending updates
   */
  flush(): void {
    if (this.updates.length === 0) return;

    // Batch all updates in a single transaction
    this.queryClient.getQueryCache().batch(() => {
      this.updates.forEach(update => update());
    });

    // Clear updates
    this.updates = [];
    this.batchTimeout = null;
  }
}

/**
 * Selective cache invalidation
 * Invalidates only the caches that are affected by a specific action
 */
export class SelectiveCacheInvalidator {
  constructor(private queryClient: QueryClient) {}

  /**
   * Invalidate caches after file upload
   */
  async invalidateAfterUpload(processId: string): Promise<void> {
    await Promise.all([
      this.queryClient.invalidateQueries({ queryKey: ['metadata', processId] }),
      this.queryClient.invalidateQueries({ queryKey: ['processes', processId] }),
    ]);
  }

  /**
   * Invalidate caches after keyword enhancement
   */
  async invalidateAfterKeywordEnhancement(processId: string): Promise<void> {
    await this.queryClient.invalidateQueries({ queryKey: ['keywords', processId] });
  }

  /**
   * Invalidate caches after search
   */
  async invalidateAfterSearch(processId: string): Promise<void> {
    await Promise.all([
      this.queryClient.invalidateQueries({ queryKey: ['search', processId] }),
      this.queryClient.invalidateQueries({ queryKey: ['processes', processId] }),
    ]);
  }

  /**
   * Invalidate caches after validation
   */
  async invalidateAfterValidation(processId: string): Promise<void> {
    await Promise.all([
      this.queryClient.invalidateQueries({ queryKey: ['validation', processId] }),
      this.queryClient.invalidateQueries({ queryKey: ['recommendations', processId] }),
    ]);
  }

  /**
   * Invalidate caches after shortlist creation
   */
  async invalidateAfterShortlistCreation(processId: string): Promise<void> {
    await this.queryClient.invalidateQueries({ queryKey: ['shortlists', processId] });
  }
}

/**
 * Memory-efficient data pagination
 * Implements virtual scrolling for large lists
 */
export interface PaginationConfig {
  pageSize: number;
  currentPage: number;
  totalItems: number;
}

export class DataPaginator<T> {
  constructor(
    private data: T[],
    private pageSize: number = 20
  ) {}

  /**
   * Get a specific page of data
   */
  getPage(pageNumber: number): T[] {
    const startIndex = (pageNumber - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.data.slice(startIndex, endIndex);
  }

  /**
   * Get pagination metadata
   */
  getPaginationInfo(currentPage: number): PaginationConfig {
    return {
      pageSize: this.pageSize,
      currentPage,
      totalItems: this.data.length,
    };
  }

  /**
   * Get total number of pages
   */
  getTotalPages(): number {
    return Math.ceil(this.data.length / this.pageSize);
  }
}

/**
 * Debounce utility for search and filter operations
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle utility for scroll and resize events
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Memoization utility for expensive computations
 */
export class MemoCache<K, V> {
  private cache: Map<string, { value: V; timestamp: number }> = new Map();
  private readonly TTL: number;

  constructor(ttl: number = 5 * 60 * 1000) {
    this.TTL = ttl;
  }

  /**
   * Get or compute a value
   */
  getOrCompute(key: K, computeFn: () => V): V {
    const cacheKey = JSON.stringify(key);
    const cached = this.cache.get(cacheKey);

    // Check if cached value is still valid
    if (cached && Date.now() - cached.timestamp < this.TTL) {
      return cached.value;
    }

    // Compute new value
    const value = computeFn();
    this.cache.set(cacheKey, { value, timestamp: Date.now() });

    return value;
  }

  /**
   * Clear the cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Remove expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, { timestamp }] of this.cache.entries()) {
      if (now - timestamp >= this.TTL) {
        this.cache.delete(key);
      }
    }
  }
}

/**
 * Performance monitoring utility
 */
export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();

  /**
   * Start timing an operation
   */
  startTiming(label: string): () => void {
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;

      if (!this.metrics.has(label)) {
        this.metrics.set(label, []);
      }

      this.metrics.get(label)!.push(duration);
    };
  }

  /**
   * Get average timing for an operation
   */
  getAverageTiming(label: string): number | null {
    const timings = this.metrics.get(label);
    if (!timings || timings.length === 0) return null;

    const sum = timings.reduce((a, b) => a + b, 0);
    return sum / timings.length;
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Record<string, { average: number; count: number }> {
    const result: Record<string, { average: number; count: number }> = {};

    for (const [label, timings] of this.metrics.entries()) {
      const sum = timings.reduce((a, b) => a + b, 0);
      result[label] = {
        average: sum / timings.length,
        count: timings.length,
      };
    }

    return result;
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
  }
}

export const performanceMonitor = new PerformanceMonitor();
