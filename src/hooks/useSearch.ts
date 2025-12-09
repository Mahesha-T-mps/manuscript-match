/**
 * Database search React Query hooks
 * Provides hooks for database searches, status tracking, and manual searches
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { searchService } from '../services/searchService';
import { queryKeys } from '../lib/queryClient';
import type { 
  SearchRequest, 
  SearchStatus, 
  Author,
  ManualSearchRequest 
} from '../types/api';

/**
 * Hook for initiating database search
 */
export const useInitiateSearch = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ processId, request }: { 
      processId: string; 
      request: { selected_websites: string[] };
    }) => {
      console.log('[useInitiateSearch] Starting search for processId:', processId);
      // Use fileService which wraps ScholarFinderApiService
      const { fileService } = await import('../services/fileService');
      const result = await fileService.searchDatabases(processId, request);
      console.log('[useInitiateSearch] Search completed:', result);
      return result;
    },
    retry: false, // Disable retries - search is long-running and should not be retried
    onSuccess: (_, { processId }) => {
      console.log('[useInitiateSearch] Search successful, invalidating queries');
      // Invalidate search status to start polling
      queryClient.invalidateQueries({ queryKey: queryKeys.search.status(processId) });
      
      // Invalidate process cache to update status
      queryClient.invalidateQueries({ queryKey: queryKeys.processes.detail(processId) });
    },
    onError: (error) => {
      console.error('[useInitiateSearch] Search failed:', error);
    },
  });
};

/**
 * Hook for fetching search status with polling
 * Note: ScholarFinder API returns results immediately, so this is simplified
 */
export const useSearchStatus = (processId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: queryKeys.search.status(processId),
    queryFn: async (): Promise<SearchStatus> => {
      // Check localStorage for cached search results
      const cachedResults = localStorage.getItem(`process_${processId}_searchResults`);
      if (cachedResults) {
        const results = JSON.parse(cachedResults);
        return {
          status: 'COMPLETED',
          progress: results.search_status || {},
          totalFound: results.total_reviewers || 0
        };
      }
      
      // If no cached results, return NOT_STARTED
      return {
        status: 'NOT_STARTED',
        progress: {},
        totalFound: 0
      };
    },
    enabled: !!processId && enabled,
    staleTime: Infinity, // Don't refetch - search completes immediately
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchInterval: false, // Disable polling - search is synchronous
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnReconnect: false, // Don't refetch on reconnect
  });
};

/**
 * Hook for manual search by name
 * @deprecated Use useAddManualAuthor instead - this hook uses an outdated API endpoint
 */
export const useSearchByName = () => {
  return useMutation({
    mutationFn: ({ processId, name }: { 
      processId: string; 
      name: string;
    }): Promise<Author[]> => 
      searchService.searchByName(processId, name),
    onError: (error) => {
      console.error('Manual name search failed:', error);
    },
  });
};

/**
 * Hook for manual search by email
 * @deprecated Use useAddManualAuthor instead - this hook uses an outdated API endpoint
 */
export const useSearchByEmail = () => {
  return useMutation({
    mutationFn: ({ processId, email }: { 
      processId: string; 
      email: string;
    }): Promise<Author[]> => 
      searchService.searchByEmail(processId, email),
    onError: (error) => {
      console.error('Manual email search failed:', error);
    },
  });
};

/**
 * Hook for cached manual search by name
 */
export const useCachedSearchByName = (processId: string, name: string, enabled: boolean = false) => {
  return useQuery({
    queryKey: queryKeys.search.manual.name(processId, name),
    queryFn: (): Promise<Author[]> => searchService.searchByName(processId, name),
    enabled: !!processId && !!name && enabled,
    staleTime: 5 * 60 * 1000, // Cache manual search results for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });
};

/**
 * Hook for cached manual search by email
 */
export const useCachedSearchByEmail = (processId: string, email: string, enabled: boolean = false) => {
  return useQuery({
    queryKey: queryKeys.search.manual.email(processId, email),
    queryFn: (): Promise<Author[]> => searchService.searchByEmail(processId, email),
    enabled: !!processId && !!email && enabled,
    staleTime: 5 * 60 * 1000, // Cache manual search results for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });
};

/**
 * Hook for search progress tracking
 */
export const useSearchProgress = (processId: string, enabled: boolean = true) => {
  const { data: status, isLoading, error } = useSearchStatus(processId, enabled);
  
  const isSearching = status?.status === 'IN_PROGRESS' || status?.status === 'PENDING';
  const isCompleted = status?.status === 'COMPLETED';
  const isFailed = status?.status === 'FAILED';
  const isNotStarted = status?.status === 'NOT_STARTED';
  
  const progress = status?.progress || {};
  const totalFound = status?.totalFound || 0;
  
  // Transform search_status from API format to progress format
  const transformedProgress: Record<string, { status: string; count: number }> = {};
  Object.entries(progress).forEach(([db, statusValue]) => {
    if (typeof statusValue === 'string') {
      // API returns { "PubMed": "success", "ScienceDirect": "failed" }
      transformedProgress[db] = {
        status: statusValue === 'success' ? 'COMPLETED' : statusValue === 'failed' ? 'FAILED' : 'IN_PROGRESS',
        count: 0 // Count not available in immediate response
      };
    } else if (typeof statusValue === 'object' && statusValue !== null) {
      // Already in correct format
      transformedProgress[db] = statusValue as { status: string; count: number };
    }
  });
  
  // Calculate overall progress percentage
  const databases = Object.keys(transformedProgress);
  const completedDatabases = databases.filter(db => 
    transformedProgress[db]?.status === 'COMPLETED'
  ).length;
  const progressPercentage = databases.length > 0 ? (completedDatabases / databases.length) * 100 : 0;
  
  return {
    status: status?.status,
    progress: transformedProgress,
    totalFound,
    progressPercentage,
    isSearching,
    isCompleted,
    isFailed,
    isNotStarted,
    isLoading,
    error,
  };
};

/**
 * Hook for adding manual author (new correct API)
 * Uses the /manual_authors endpoint that returns author_data
 */
export const useAddManualAuthor = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    // Add mutation key to prevent duplicate mutations
    mutationKey: ['addManualAuthor'],
    mutationFn: async ({ processId, authorName }: { 
      processId: string; 
      authorName: string;
    }) => {
      console.log('[useAddManualAuthor] API call starting for:', authorName);
      const { fileService } = await import('../services/fileService');
      const result = await fileService.searchManualAuthor(processId, authorName);
      console.log('[useAddManualAuthor] API call completed for:', authorName);
      return result;
    },
    // Explicitly disable all retries - manual search should never be retried automatically
    retry: 0,
    retryDelay: 0,
    onSuccess: (_, { processId }) => {
      // Invalidate relevant caches
      queryClient.invalidateQueries({ queryKey: queryKeys.search.status(processId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.processes.detail(processId) });
    },
    onError: (error) => {
      console.error('[useAddManualAuthor] Manual author addition failed:', error);
    },
  });
};

/**
 * Main search hook (alias for useSearchProgress)
 */
export const useSearch = useSearchProgress;