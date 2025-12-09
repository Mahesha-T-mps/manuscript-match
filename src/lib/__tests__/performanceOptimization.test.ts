/**
 * Performance Optimization Tests
 * Tests for request deduplication, caching, and performance utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import {
  requestDeduplicator,
  optimizedCacheConfig,
  WorkflowPrefetcher,
  SelectiveCacheInvalidator,
  DataPaginator,
  debounce,
  throttle,
  MemoCache,
  performanceMonitor,
} from '../performanceOptimization';

describe('RequestDeduplicator', () => {
  beforeEach(() => {
    requestDeduplicator.clearAll();
  });

  it('should deduplicate concurrent requests with same key', async () => {
    const mockFn = vi.fn().mockResolvedValue('result');
    
    // Make two concurrent requests with same key
    const [result1, result2] = await Promise.all([
      requestDeduplicator.deduplicate('test-key', mockFn),
      requestDeduplicator.deduplicate('test-key', mockFn),
    ]);

    // Should only call the function once
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(result1).toBe('result');
    expect(result2).toBe('result');
  });

  it('should not deduplicate requests with different keys', async () => {
    const mockFn = vi.fn().mockResolvedValue('result');
    
    // Make two concurrent requests with different keys
    await Promise.all([
      requestDeduplicator.deduplicate('key-1', mockFn),
      requestDeduplicator.deduplicate('key-2', mockFn),
    ]);

    // Should call the function twice
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it('should handle request failures', async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error('Request failed'));
    
    await expect(
      requestDeduplicator.deduplicate('test-key', mockFn)
    ).rejects.toThrow('Request failed');

    // Should allow retry after failure
    mockFn.mockResolvedValue('success');
    const result = await requestDeduplicator.deduplicate('test-key', mockFn);
    expect(result).toBe('success');
  });

  it('should clear specific key', async () => {
    const mockFn = vi.fn().mockResolvedValue('result');
    
    await requestDeduplicator.deduplicate('test-key', mockFn);
    requestDeduplicator.clear('test-key');
    
    await requestDeduplicator.deduplicate('test-key', mockFn);
    
    // Should call function twice (once before clear, once after)
    expect(mockFn).toHaveBeenCalledTimes(2);
  });
});

describe('optimizedCacheConfig', () => {
  it('should have appropriate stale times for different data types', () => {
    // Stable data should have longer stale times
    expect(optimizedCacheConfig.metadata.staleTime).toBeGreaterThan(
      optimizedCacheConfig.processes.staleTime
    );
    expect(optimizedCacheConfig.recommendations.staleTime).toBeGreaterThan(
      optimizedCacheConfig.shortlists.staleTime
    );
  });

  it('should have GC times greater than stale times', () => {
    Object.values(optimizedCacheConfig).forEach(config => {
      expect(config.gcTime).toBeGreaterThan(config.staleTime);
    });
  });
});

describe('WorkflowPrefetcher', () => {
  let queryClient: QueryClient;
  let prefetcher: WorkflowPrefetcher;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    prefetcher = new WorkflowPrefetcher(queryClient);
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('should prefetch metadata after upload', async () => {
    const prefetchSpy = vi.spyOn(queryClient, 'prefetchQuery');
    
    await prefetcher.prefetchNextStep('UPLOAD', 'process-123');
    
    expect(prefetchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['metadata', 'process-123'],
      })
    );
  });

  it('should prefetch keywords after metadata extraction', async () => {
    const prefetchSpy = vi.spyOn(queryClient, 'prefetchQuery');
    
    await prefetcher.prefetchNextStep('METADATA_EXTRACTION', 'process-123');
    
    expect(prefetchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['keywords', 'process-123'],
      })
    );
  });
});

describe('SelectiveCacheInvalidator', () => {
  let queryClient: QueryClient;
  let invalidator: SelectiveCacheInvalidator;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    invalidator = new SelectiveCacheInvalidator(queryClient);
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('should invalidate metadata and processes after upload', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    
    await invalidator.invalidateAfterUpload('process-123');
    
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['metadata', 'process-123'],
      })
    );
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['processes', 'process-123'],
      })
    );
  });

  it('should invalidate only keywords after enhancement', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    
    await invalidator.invalidateAfterKeywordEnhancement('process-123');
    
    expect(invalidateSpy).toHaveBeenCalledTimes(1);
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['keywords', 'process-123'],
      })
    );
  });
});

describe('DataPaginator', () => {
  const testData = Array.from({ length: 100 }, (_, i) => ({ id: i, name: `Item ${i}` }));

  it('should paginate data correctly', () => {
    const paginator = new DataPaginator(testData, 20);
    
    const page1 = paginator.getPage(1);
    const page2 = paginator.getPage(2);
    
    expect(page1).toHaveLength(20);
    expect(page2).toHaveLength(20);
    expect(page1[0].id).toBe(0);
    expect(page2[0].id).toBe(20);
  });

  it('should calculate total pages correctly', () => {
    const paginator = new DataPaginator(testData, 20);
    
    expect(paginator.getTotalPages()).toBe(5);
  });

  it('should handle last page with fewer items', () => {
    const paginator = new DataPaginator(testData, 30);
    
    const lastPage = paginator.getPage(4);
    
    expect(lastPage).toHaveLength(10); // 100 items, 30 per page, last page has 10
  });

  it('should return pagination info', () => {
    const paginator = new DataPaginator(testData, 20);
    
    const info = paginator.getPaginationInfo(2);
    
    expect(info).toEqual({
      pageSize: 20,
      currentPage: 2,
      totalItems: 100,
    });
  });
});

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should debounce function calls', () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 300);
    
    debouncedFn();
    debouncedFn();
    debouncedFn();
    
    expect(mockFn).not.toHaveBeenCalled();
    
    vi.advanceTimersByTime(300);
    
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should reset timer on subsequent calls', () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 300);
    
    debouncedFn();
    vi.advanceTimersByTime(200);
    debouncedFn();
    vi.advanceTimersByTime(200);
    
    expect(mockFn).not.toHaveBeenCalled();
    
    vi.advanceTimersByTime(100);
    
    expect(mockFn).toHaveBeenCalledTimes(1);
  });
});

describe('throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should throttle function calls', () => {
    const mockFn = vi.fn();
    const throttledFn = throttle(mockFn, 300);
    
    throttledFn();
    throttledFn();
    throttledFn();
    
    expect(mockFn).toHaveBeenCalledTimes(1);
    
    vi.advanceTimersByTime(300);
    throttledFn();
    
    expect(mockFn).toHaveBeenCalledTimes(2);
  });
});

describe('MemoCache', () => {
  it('should cache computed values', () => {
    const cache = new MemoCache<string, number>(5000);
    const computeFn = vi.fn(() => 42);
    
    const result1 = cache.getOrCompute('key', computeFn);
    const result2 = cache.getOrCompute('key', computeFn);
    
    expect(result1).toBe(42);
    expect(result2).toBe(42);
    expect(computeFn).toHaveBeenCalledTimes(1);
  });

  it('should recompute after TTL expires', () => {
    vi.useFakeTimers();
    
    const cache = new MemoCache<string, number>(1000);
    const computeFn = vi.fn(() => 42);
    
    cache.getOrCompute('key', computeFn);
    
    vi.advanceTimersByTime(1100);
    
    cache.getOrCompute('key', computeFn);
    
    expect(computeFn).toHaveBeenCalledTimes(2);
    
    vi.restoreAllMocks();
  });

  it('should clear cache', () => {
    const cache = new MemoCache<string, number>(5000);
    const computeFn = vi.fn(() => 42);
    
    cache.getOrCompute('key', computeFn);
    cache.clear();
    cache.getOrCompute('key', computeFn);
    
    expect(computeFn).toHaveBeenCalledTimes(2);
  });
});

describe('PerformanceMonitor', () => {
  beforeEach(() => {
    performanceMonitor.clear();
  });

  it('should track operation timings', () => {
    const endTiming = performanceMonitor.startTiming('test-operation');
    
    // Simulate some work
    for (let i = 0; i < 1000; i++) {
      Math.sqrt(i);
    }
    
    endTiming();
    
    const average = performanceMonitor.getAverageTiming('test-operation');
    
    expect(average).toBeGreaterThan(0);
  });

  it('should calculate average of multiple timings', () => {
    const endTiming1 = performanceMonitor.startTiming('test-operation');
    endTiming1();
    
    const endTiming2 = performanceMonitor.startTiming('test-operation');
    endTiming2();
    
    const metrics = performanceMonitor.getAllMetrics();
    
    expect(metrics['test-operation'].count).toBe(2);
    expect(metrics['test-operation'].average).toBeGreaterThan(0);
  });

  it('should return null for unknown operations', () => {
    const average = performanceMonitor.getAverageTiming('unknown-operation');
    
    expect(average).toBeNull();
  });
});
