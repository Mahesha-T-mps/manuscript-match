/**
 * Validation hooks for author validation functionality
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { validationService } from '@/services/validationService';
import { fileService } from '@/services/fileService';
import { useErrorHandling } from './useErrorHandling';
import { useToast } from './use-toast';
import type { ValidationRequest, ValidationResults } from '@/types/api';

/**
 * Hook for validating authors
 */
export const useValidateAuthors = (processId: string) => {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandling();

  return useMutation({
    mutationFn: (request: ValidationRequest) => 
      validationService.validateAuthors(processId, request),
    onSuccess: (data) => {
      // Invalidate and refetch validation results
      queryClient.invalidateQueries({ queryKey: ['validation-results', processId] });
      queryClient.setQueryData(['validation-results', processId], data);
    },
    onError: handleError,
  });
};

/**
 * Hook for fetching validation results
 */
export const useValidationResults = (processId: string, enabled = true) => {
  const { handleError } = useErrorHandling();

  return useQuery({
    queryKey: ['validation-results', processId],
    queryFn: () => validationService.getValidationResults(processId),
    enabled: enabled && !!processId,
    onError: handleError,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry if validation hasn't been run yet (404)
      if (error?.response?.status === 404) {
        return false;
      }
      return failureCount < 3;
    },
  });
};

/**
 * Hook for adding manual authors
 */
export const useAddManualAuthor = (processId: string) => {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandling();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (authorName: string) => {
      console.log('[useAddManualAuthor] 🔍 Mutation called with author:', authorName);
      console.log('[useAddManualAuthor] 📋 Process ID:', processId);
      console.log('[useAddManualAuthor] ⏰ Timestamp:', new Date().toISOString());
      console.log('[useAddManualAuthor] 📊 Stack trace:', new Error().stack);
      return fileService.addManualAuthor(processId, authorName);
    },
    // Disable automatic retries for manual author search
    // Users should manually retry with different search terms if needed
    retry: false,
    onMutate: (authorName) => {
      console.log('[useAddManualAuthor] 🚀 onMutate - Starting mutation for:', authorName);
    },
    onSuccess: (data) => {
      console.log('[useAddManualAuthor] ✅ onSuccess - Search successful:', data);
      console.log('[useAddManualAuthor] 📊 Data type:', typeof data);
      console.log('[useAddManualAuthor] 📊 Data keys:', data ? Object.keys(data) : 'data is null/undefined');
      
      // Defensive programming - handle undefined/null data
      if (!data) {
        console.warn('[useAddManualAuthor] ⚠️ Success callback received undefined/null data');
        toast({
          title: 'Search Completed',
          description: 'Author search completed, but no data was returned.',
          variant: 'destructive',
        });
        return;
      }
      
      // Handle different possible data structures
      // The API returns: { message, job_id, author_data: {...} }
      const totalFound = data.total_found || (data.author_data ? 1 : 0);
      const searchTerm = data.search_term || (data.author_data?.author) || 'unknown';
      
      // Show success toast only if author was found
      if (data.author_data && data.author_data.author) {
        toast({
          title: 'Author Found',
          description: `Found "${data.author_data.author}" in PubMed database${data.warning ? ' (with limited information)' : ''}`,
        });
      } else {
        toast({
          title: 'No Author Found',
          description: `No author found matching "${searchTerm}"`,
          variant: 'destructive',
        });
      }
      
      // Invalidate potential reviewers cache if it exists
      queryClient.invalidateQueries({ queryKey: ['potential-reviewers', processId] });
    },
    onError: (error) => {
      console.log('[useAddManualAuthor] ❌ onError - Search failed:', error);
      console.log('[useAddManualAuthor] 📝 Error details:', {
        message: error?.message,
        response: error?.response,
        status: error?.response?.status,
      });
      handleError(error);
      toast({
        title: 'Search Failed',
        description: 'Failed to search for author. Please try again.',
        variant: 'destructive',
      });
    },
    onSettled: (data, error, variables) => {
      console.log('[useAddManualAuthor] 🏁 onSettled - Mutation completed');
      console.log('[useAddManualAuthor] 📊 Final state:', { data, error, variables });
    },
  });
};

/**
 * Hook for validation status with polling
 */
export const useValidationStatus = (processId: string, enabled = true) => {
  const { handleError } = useErrorHandling();

  return useQuery({
    queryKey: ['validation-status', processId],
    queryFn: () => fileService.getValidationStatus(processId),
    enabled: enabled && !!processId,
    refetchInterval: (query) => {
      // Poll every 5 seconds if validation is in progress
      const data = query.state.data;
      if (data?.validation_status === 'in_progress') {
        return 5000;
      }
      return false;
    },
    onError: (error: any) => {
      // Don't show error if validation hasn't been started yet (404)
      if (error?.response?.status !== 404) {
        handleError(error);
      }
    },
    retry: (failureCount, error: any) => {
      // Don't retry if validation hasn't been run yet (404)
      if (error?.response?.status === 404) {
        return false;
      }
      return failureCount < 3;
    },
  });
};

/**
 * Hook for initiating validation
 */
export const useInitiateValidation = (processId: string) => {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandling();
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => fileService.validateAuthors(processId),
    onSuccess: (data) => {
      // Set initial validation status
      queryClient.setQueryData(['validation-status', processId], data);
      
      toast({
        title: 'Validation Started',
        description: 'Author validation is now in progress. This may take a few minutes.',
      });
    },
    onError: (error) => {
      handleError(error);
      toast({
        title: 'Validation Failed',
        description: 'Failed to start validation. Please try again.',
        variant: 'destructive',
      });
    },
  });
};

/**
 * Hook for managing validation state and operations
 */
export const useValidation = (processId: string) => {
  const queryClient = useQueryClient();
  const initiateMutation = useInitiateValidation(processId);
  
  // Check if validation has been started by looking for cached data
  const hasValidationData = queryClient.getQueryData(['validation-status', processId]);
  
  // Only enable status polling if validation has been initiated
  const validationStatus = useValidationStatus(processId, !!hasValidationData || initiateMutation.isSuccess);

  const validateAuthors = () => {
    return initiateMutation.mutateAsync();
  };

  const refetchStatus = () => {
    return validationStatus.refetch();
  };

  return {
    // Validation operations
    validateAuthors,
    refetchStatus,
    
    // Validation state
    isValidating: initiateMutation.isPending,
    validationError: initiateMutation.error,
    
    // Status state
    validationStatus: validationStatus.data,
    isLoadingStatus: validationStatus.isLoading,
    statusError: validationStatus.error,
    hasValidationStarted: !!validationStatus.data || !!hasValidationData,
    isPolling: validationStatus.isFetching && !validationStatus.isLoading,
    
    // Combined loading state
    isLoading: initiateMutation.isPending || validationStatus.isLoading,
  };
};