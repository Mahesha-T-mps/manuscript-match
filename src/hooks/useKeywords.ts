/**
 * Keyword enhancement React Query hooks
 * Provides hooks for keyword enhancement, MeSH terms, and search string generation
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { keywordService, type EnhancedKeywords } from '../services/keywordService';
import { queryKeys } from '../lib/queryClient';

/**
 * Hook for enhancing keywords
 */
export const useEnhanceKeywords = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ processId }: { 
      processId: string;
    }): Promise<EnhancedKeywords> => 
      keywordService.enhanceKeywords(processId),
    onSuccess: (enhancedKeywords, { processId }) => {
      // Cache the enhanced keywords
      queryClient.setQueryData(
        queryKeys.keywords.enhanced(processId),
        enhancedKeywords
      );
      
      // Invalidate process cache to update status
      queryClient.invalidateQueries({ queryKey: queryKeys.processes.detail(processId) });
    },
    onError: (error) => {
      console.error('Keyword enhancement failed:', error);
    },
  });
};

/**
 * Hook for fetching enhanced keywords
 */
export const useKeywords = (processId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: queryKeys.keywords.enhanced(processId),
    queryFn: (): Promise<EnhancedKeywords> => keywordService.getKeywords(processId),
    enabled: !!processId && enabled, // Only run query if processId is provided and explicitly enabled
    staleTime: 15 * 60 * 1000, // Keywords are stable for 15 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    retry: (failureCount, error: any) => {
      // Don't retry if keywords haven't been enhanced yet
      if (error?.message?.includes('Keywords have not been enhanced yet')) {
        return false;
      }
      if (error?.response?.status === 404) {
        return false;
      }
      return failureCount < 2;
    },
  });
};

/**
 * Hook for updating keyword selection
 */
export const useUpdateKeywordSelection = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ processId, selection }: { 
      processId: string; 
      selection: string[];
    }): Promise<void> => 
      keywordService.updateKeywordSelection(processId, selection),
    onSuccess: (_, { processId }) => {
      // Invalidate keywords cache to refetch updated selection
      queryClient.invalidateQueries({ queryKey: queryKeys.keywords.all(processId) });
      
      // Invalidate search cache as keyword selection affects search
      queryClient.invalidateQueries({ queryKey: queryKeys.search.all(processId) });
      
      // Invalidate process cache to update status
      queryClient.invalidateQueries({ queryKey: queryKeys.processes.detail(processId) });
    },
    onError: (error) => {
      console.error('Failed to update keyword selection:', error);
    },
  });
};

/**
 * Hook for generating keyword search string
 */
export const useGenerateKeywordString = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      processId, 
      primaryKeywords, 
      secondaryKeywords 
    }: { 
      processId: string; 
      primaryKeywords: string[];
      secondaryKeywords: string[];
    }): Promise<{
      search_string: string;
      primary_keywords_used: string[];
      secondary_keywords_used: string[];
    }> => 
      keywordService.generateSearchString(processId, primaryKeywords, secondaryKeywords),
    onSuccess: (data, { processId }) => {
      // Cache the generated search string
      queryClient.setQueryData(
        queryKeys.keywords.searchString(processId),
        data
      );
      
      // Invalidate process cache to update status
      queryClient.invalidateQueries({ queryKey: queryKeys.processes.detail(processId) });
    },
    onError: (error) => {
      console.error('Keyword string generation failed:', error);
    },
  });
};

/**
 * Hook for optimistic keyword selection updates
 */
export const useOptimisticKeywordSelection = () => {
  const queryClient = useQueryClient();
  
  const updateSelectionOptimistically = (processId: string, selectedKeywords: string[]) => {
    queryClient.setQueryData<EnhancedKeywords>(
      queryKeys.keywords.enhanced(processId),
      (oldData) => {
        if (!oldData) return undefined;
        
        // Update the selection in the cached data
        // Note: This assumes the backend returns selection info in the keywords response
        return {
          ...oldData,
          // Add selection tracking if needed by the UI
        };
      }
    );
  };
  
  const revertOptimisticUpdate = (processId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.keywords.enhanced(processId) });
  };
  
  return {
    updateSelectionOptimistically,
    revertOptimisticUpdate,
  };
};