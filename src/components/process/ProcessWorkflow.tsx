/**
 * Process Workflow Component
 * Main workflow component that manages the entire manuscript analysis process
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { ArrowLeft, User, Mail, MapPin, BookOpen, Award, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useProcess, useUpdateProcessStep } from '@/hooks/useProcesses';
import { useSearch } from '@/hooks/useSearch';
import { useRecommendations } from '@/hooks/useFiles';
import { useShortlists } from '@/hooks/useShortlists';
import { useMetadata } from '@/hooks/useFiles';
import { useEnhanceKeywords } from '@/hooks/useKeywords';
import { fileService } from '@/services/fileService';
import { scholarFinderApiService } from '@/features/scholarfinder/services/ScholarFinderApiService';
import { ProcessStepTracker } from './ProcessStepTracker';
import { FileUpload } from '@/components/upload/FileUpload';
import { DataExtraction } from '@/components/extraction/DataExtraction';
import { KeywordEnhancement } from '@/components/keywords/KeywordEnhancement';
import { ReviewerSearch } from '@/components/search/ReviewerSearch';
import { ReviewerResults } from '@/components/results/ReviewerResults';
import { AuthorValidation } from '@/components/validation/AuthorValidation';
import { ShortlistManager } from '@/components/shortlist/ShortlistManager';
import { COIPublicationsModal } from '@/components/coi/COIPublicationsModal';
import type { Reviewer } from '@/types/api';
import type { EnhancedKeywords } from '@/services/keywordService';

interface ProcessWorkflowProps {
  processId: string;
  onBack?: () => void;
}

export const ProcessWorkflow: React.FC<ProcessWorkflowProps> = ({
  processId,
  onBack,
}) => {
  const { toast } = useToast();
  const { data: process, isLoading, error } = useProcess(processId);
  const updateStepMutation = useUpdateProcessStep();
  
  // API hooks for search and recommendations
  // Only enable search status polling if we're in a search-related step
  const shouldPollSearch = process?.currentStep === 'DATABASE_SEARCH' || 
                          process?.currentStep === 'RECOMMENDATIONS' ||
                          process?.currentStep === 'MANUAL_SEARCH';
  const searchHook = useSearch(processId, shouldPollSearch);
  
  // Only enable recommendations hook when we're in RECOMMENDATIONS step or later
  // This prevents premature API calls during database search
  const shouldFetchRecommendations = process?.currentStep === 'RECOMMENDATIONS' || 
                                   process?.currentStep === 'SHORTLIST';
  const { data: recommendations, isLoading: recommendationsLoading, refetch: refetchRecommendations } = useRecommendations(processId, shouldFetchRecommendations);
  const shortlistsHook = useShortlists(processId);
  
  // Hook to check if metadata is loaded for the METADATA_EXTRACTION step
  const { data: metadata, isLoading: metadataLoading } = useMetadata(processId);
  
  // Hook for enhancing keywords
  const enhanceKeywordsMutation = useEnhanceKeywords();

  // Local state for workflow data with localStorage persistence
  const getStorageKey = (key: string) => `process_${processId}_${key}`;
  
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadResponse, setUploadResponse] = useState<any>(() => {
    const saved = localStorage.getItem(getStorageKey('uploadResponse'));
    return saved ? JSON.parse(saved) : null;
  });
  const [enhancedKeywords, setEnhancedKeywords] = useState<EnhancedKeywords | null>(null);
  const [primaryKeywords, setPrimaryKeywords] = useState<string[]>(() => {
    const saved = localStorage.getItem(getStorageKey('primaryKeywords'));
    return saved ? JSON.parse(saved) : [];
  });
  const [secondaryKeywords, setSecondaryKeywords] = useState<string[]>(() => {
    const saved = localStorage.getItem(getStorageKey('secondaryKeywords'));
    return saved ? JSON.parse(saved) : [];
  });
  const [keywordString, setKeywordString] = useState<string>(() => {
    const saved = localStorage.getItem(getStorageKey('keywordString'));
    return saved || '';
  });
  const [searchCompleted, setSearchCompleted] = useState(() => {
    const saved = localStorage.getItem(getStorageKey('searchCompleted'));
    return saved ? JSON.parse(saved) : false;
  });
  const [isValidating, setIsValidating] = useState(false);
  const [validationCompleted, setValidationCompleted] = useState(() => {
    const saved = localStorage.getItem(getStorageKey('validationCompleted'));
    return saved ? JSON.parse(saved) : false;
  });
  const [validationProgress, setValidationProgress] = useState(() => {
    const saved = localStorage.getItem(getStorageKey('validationProgress'));
    return saved ? JSON.parse(saved) : { 
      percentage: 0, 
      processed: 0, 
      total: 0, 
      criteria: [],
      status: 'pending',
      estimatedCompletion: null
    };
  });
  const [validationRecommendations, setValidationRecommendations] = useState<any>(() => {
    const saved = localStorage.getItem(getStorageKey('validationRecommendations'));
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  
  // COI Publications Modal state
  const [coiModalOpen, setCOIModalOpen] = useState(false);
  const [selectedCOIAuthor, setSelectedCOIAuthor] = useState<{
    authorId: string;
    authorName: string;
  } | null>(null);
  
  // Validation progress polling with proper completion tracking
  const pollValidationProgress = useCallback(async (jobId: string): Promise<boolean> => {
    try {
      console.log('[ProcessWorkflow] Polling validation progress for jobId:', jobId);
      
      // First, try to get validation status
      let statusResponse;
      let statusAvailable = true;
      
      try {
        statusResponse = await scholarFinderApiService.getValidationStatus(jobId);
        console.log('[ProcessWorkflow] Validation status response:', statusResponse);
      } catch (statusError) {
        console.log('[ProcessWorkflow] Validation status API not available, will check recommendations directly');
        statusAvailable = false;
      }
      
      // If status API is available, use it
      if (statusAvailable && statusResponse) {
        // Update progress state with more comprehensive tracking
        setValidationProgress(prev => {
          const newProgress = {
            ...prev,
            percentage: statusResponse.data.progress_percentage || 0,
            processed: statusResponse.data.total_authors_processed || 0,
            total: Math.max(statusResponse.data.total_authors_processed || 0, prev.total),
            criteria: statusResponse.data.validation_criteria || prev.criteria,
            status: statusResponse.data.validation_status,
            estimatedCompletion: statusResponse.data.estimated_completion_time || null
          };
          
          console.log('[ProcessWorkflow] Updated validation progress:', newProgress);
          return newProgress;
        });
        
        // Handle completion
        if (statusResponse.data.validation_status === 'completed') {
          console.log('[ProcessWorkflow] Validation completed via status API!');
          setValidationCompleted(true);
          
          // Show enhanced completion notification with detailed stats
          const processedCount = statusResponse.data.total_authors_processed || 0;
          const criteriaCount = statusResponse.data.validation_criteria?.length || 0;
          const summary = statusResponse.data.summary;
          
          let description = `Processed ${processedCount} authors against ${criteriaCount} validation criteria.`;
          if (summary) {
            description += ` Found ${summary.authors_validated} validated authors with average score of ${summary.average_conditions_met.toFixed(1)}.`;
          }
          description += ' Results are now available.';
          
          toast({
            title: 'Validation Completed Successfully! 🎉',
            description,
            duration: 8000,
          });
          
          return true; // Stop polling
        }
        
        // Handle failure
        if (statusResponse.data.validation_status === 'failed') {
          console.error('[ProcessWorkflow] Validation failed');
          setValidationProgress(prev => ({ ...prev, status: 'failed' }));
          
          toast({
            title: 'Validation Failed',
            description: 'Author validation process encountered an error. Please try again.',
            variant: 'destructive',
            duration: 8000,
          });
          
          return true; // Stop polling
        }
        
        // Still in progress - show progress update for larger batches
        if (statusResponse.data.total_authors_processed > 0) {
          const processed = statusResponse.data.total_authors_processed;
          const percentage = statusResponse.data.progress_percentage || 0;
          
          // Show progress notifications for every 25% completion or every 100 authors processed
          const shouldShowProgress = (
            percentage > 0 && percentage % 25 === 0 && percentage !== validationProgress.percentage
          ) || (
            processed > 0 && processed % 100 === 0 && processed !== validationProgress.processed
          );
          
          if (shouldShowProgress) {
            toast({
              title: 'Validation Progress Update',
              description: `Processed ${processed} authors (${percentage}% complete). ${statusResponse.data.estimated_completion_time || 'Continuing...'}`,
              duration: 4000,
            });
          }
        }
      }
      
      // Always check recommendations as a fallback or primary method
      // Do this check more frequently to catch completion quickly
      console.log('[ProcessWorkflow] Checking recommendations to verify completion status');
      try {
        const recommendations = await scholarFinderApiService.getRecommendations(jobId);
        if (recommendations.data?.reviewers && recommendations.data.reviewers.length > 0) {
          console.log('[ProcessWorkflow] Found recommendations - validation is complete!');
          setValidationCompleted(true);
          setValidationProgress(prev => ({ ...prev, status: 'completed', percentage: 100 }));
          
          toast({
            title: 'Validation Completed Successfully! 🎉',
            description: `Found ${recommendations.data.reviewers.length} recommended reviewers. Results are now available.`,
            duration: 8000,
          });
          
          return true; // Stop polling
        } else if (recommendations.message?.includes('not ready')) {
          console.log('[ProcessWorkflow] Recommendations explicitly not ready, validation still in progress');
        } else {
          console.log('[ProcessWorkflow] No recommendations yet, validation still in progress');
        }
      } catch (recError) {
        // Check if it's a 404 (not ready) vs other errors
        if (recError?.response?.status === 404) {
          console.log('[ProcessWorkflow] Recommendations not ready yet (404), continuing to poll');
        } else {
          console.log('[ProcessWorkflow] Error checking recommendations:', recError?.message);
        }
      }
      
      return false; // Continue polling
    } catch (error) {
      console.error('[ProcessWorkflow] Error polling validation progress:', error);
      
      // Don't show error toast for polling failures - validation might still be running
      // Just log the error and continue polling
      return false; // Continue polling despite error
    }
  }, [toast, validationProgress.percentage, validationProgress.processed]);
  
  // Validation polling state and control
  const validationPollingRef = useRef<NodeJS.Timeout | null>(null);
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isPollingValidation, setIsPollingValidation] = useState(false);
  const [pollingStartTime, setPollingStartTime] = useState<number | null>(null);
  
  // Ref to prevent duplicate validation calls
  const validationInProgressRef = useRef(false);

  // Start validation polling
  const startValidationPolling = useCallback(async (jobId: string) => {
    console.log('[ProcessWorkflow] Starting validation polling for jobId:', jobId);
    
    // Clear any existing polling
    if (validationPollingRef.current) {
      clearTimeout(validationPollingRef.current);
    }
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }
    
    setIsPollingValidation(true);
    setPollingStartTime(Date.now());
    
    // Set a timeout to stop polling after 30 minutes and suggest manual check
    validationTimeoutRef.current = setTimeout(() => {
      console.log('[ProcessWorkflow] Polling timeout reached - stopping automatic polling');
      setIsPollingValidation(false);
      validationPollingRef.current = null;
      
      toast({
        title: 'Validation Taking Longer Than Expected',
        description: 'The validation process is taking longer than usual. You can check results manually or wait for completion.',
        duration: 10000,
      });
    }, 30 * 60 * 1000); // 30 minutes
    
    const poll = async () => {
      try {
        const shouldStop = await pollValidationProgress(jobId);
        
        if (shouldStop) {
          console.log('[ProcessWorkflow] Stopping validation polling - process completed or failed');
          setIsPollingValidation(false);
          validationPollingRef.current = null;
          if (validationTimeoutRef.current) {
            clearTimeout(validationTimeoutRef.current);
            validationTimeoutRef.current = null;
          }
          return;
        }
        
        // Use more frequent polling initially (every 10 seconds for first 5 minutes, then 15 seconds)
        const elapsedTime = Date.now() - (pollingStartTime || Date.now());
        const pollInterval = elapsedTime < 5 * 60 * 1000 ? 10000 : 15000; // 10s for first 5 minutes, then 15s
        
        validationPollingRef.current = setTimeout(poll, pollInterval);
      } catch (error) {
        console.error('[ProcessWorkflow] Validation polling error:', error);
        // Continue polling even on error - validation might still be running
        validationPollingRef.current = setTimeout(poll, 30000); // Longer interval on error
      }
    };
    
    // Start first poll immediately
    validationPollingRef.current = setTimeout(poll, 1000);
  }, [pollValidationProgress, toast]);

  // Stop validation polling
  const stopValidationPolling = useCallback(() => {
    console.log('[ProcessWorkflow] Stopping validation polling');
    if (validationPollingRef.current) {
      clearTimeout(validationPollingRef.current);
      validationPollingRef.current = null;
    }
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
      validationTimeoutRef.current = null;
    }
    setIsPollingValidation(false);
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (validationPollingRef.current) {
        clearTimeout(validationPollingRef.current);
      }
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
      // Reset validation in progress flag on unmount
      validationInProgressRef.current = false;
    };
  }, []);

  // Track if keyword enhancement has been triggered for this process
  const keywordEnhancementTriggered = useRef(false);

  // Auto-resume validation polling if validation was in progress
  useEffect(() => {
    // Only auto-resume if we're in the VALIDATION step and validation is marked as in progress
    if (
      process?.currentStep === 'VALIDATION' && 
      validationProgress.status === 'in_progress' && 
      !validationCompleted && 
      !isPollingValidation
    ) {
      const jobId = fileService.getJobId(processId);
      if (jobId) {
        console.log('[ProcessWorkflow] Auto-resuming validation polling for in-progress validation');
        startValidationPolling(jobId);
      }
    }
  }, [process?.currentStep, validationProgress.status, validationCompleted, isPollingValidation, processId, startValidationPolling]);

  // Track the current step for navigation direction detection
  useEffect(() => {
    if (process?.currentStep) {
      // Only set initial previous step if none exists (first load)
      const existingPreviousStep = localStorage.getItem(`process_${processId}_previousStep`);
      if (!existingPreviousStep) {
        console.log('[ProcessWorkflow] Setting initial previous step to current step:', process.currentStep);
        localStorage.setItem(`process_${processId}_previousStep`, process.currentStep);
      }
    }
  }, [process?.currentStep, processId]);

  // Auto-save workflow state to localStorage
  useEffect(() => {
    if (uploadResponse) {
      localStorage.setItem(getStorageKey('uploadResponse'), JSON.stringify(uploadResponse));
    }
  }, [uploadResponse, processId]);



  useEffect(() => {
    localStorage.setItem(getStorageKey('primaryKeywords'), JSON.stringify(primaryKeywords));
  }, [primaryKeywords, processId]);

  useEffect(() => {
    localStorage.setItem(getStorageKey('secondaryKeywords'), JSON.stringify(secondaryKeywords));
  }, [secondaryKeywords, processId]);

  useEffect(() => {
    localStorage.setItem(getStorageKey('keywordString'), keywordString);
  }, [keywordString, processId]);

  useEffect(() => {
    localStorage.setItem(getStorageKey('searchCompleted'), JSON.stringify(searchCompleted));
  }, [searchCompleted, processId]);

  useEffect(() => {
    localStorage.setItem(getStorageKey('validationCompleted'), JSON.stringify(validationCompleted));
  }, [validationCompleted, processId]);

  useEffect(() => {
    localStorage.setItem(getStorageKey('validationProgress'), JSON.stringify(validationProgress));
  }, [validationProgress, processId]);

  useEffect(() => {
    if (validationRecommendations) {
      localStorage.setItem(getStorageKey('validationRecommendations'), JSON.stringify(validationRecommendations));
    }
  }, [validationRecommendations, processId]);

  // Cleanup function to clear localStorage when component unmounts
  useEffect(() => {
    return () => {
      // Optional: Clear localStorage when navigating away (uncomment if desired)
      // const keys = [
      //   'uploadResponse', 'primaryKeywords', 'secondaryKeywords',
      //   'keywordString', 'searchCompleted', 'validationCompleted', 'validationRecommendations'
      // ];
      // keys.forEach(key => localStorage.removeItem(getStorageKey(key)));
    };
  }, [processId]);

  // Helper function to reset all workflow state
  const resetWorkflowState = useCallback(() => {
    console.log('[ProcessWorkflow] Resetting all workflow state');
    
    // Reset all state variables
    setEnhancedKeywords(null);
    setPrimaryKeywords([]);
    setSecondaryKeywords([]);
    setKeywordString('');
    setSearchCompleted(false);
    setValidationCompleted(false);
    setValidationProgress({
      percentage: 0,
      processed: 0,
      total: 0,
      criteria: [],
      status: 'pending',
      estimatedCompletion: null
    });
    setValidationRecommendations(null);
    
    // Stop any ongoing polling
    stopValidationPolling();
    
    // Clear localStorage for this process
    const keys = [
      'primaryKeywords', 'secondaryKeywords', 'keywordString', 
      'searchCompleted', 'validationCompleted', 'validationProgress', 'validationRecommendations'
    ];
    keys.forEach(key => localStorage.removeItem(getStorageKey(key)));
  }, [stopValidationPolling, getStorageKey]);

  // Memoize the validation handler to prevent recreation on every render
  const handleValidateAuthors = useCallback(async () => {
    // Prevent duplicate calls
    if (validationInProgressRef.current || isValidating || isPollingValidation) {
      console.log('[ProcessWorkflow] Validation already in progress, ignoring duplicate call');
      console.log('[ProcessWorkflow] State check:', {
        validationInProgressRef: validationInProgressRef.current,
        isValidating,
        isPollingValidation,
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    console.log('[ProcessWorkflow] Starting validation - setting flags');
    console.log('[ProcessWorkflow] Pre-validation state:', {
      validationInProgressRef: validationInProgressRef.current,
      isValidating,
      isPollingValidation,
      timestamp: new Date().toISOString()
    });
    
    try {
      validationInProgressRef.current = true;
      setIsValidating(true);
      
      // Get the job ID for this process
      const jobId = fileService.getJobId(processId);
      if (!jobId) {
        toast({
          title: 'Error',
          description: 'No job ID found. Please upload a file first.',
          variant: 'destructive',
        });
        return;
      }

      console.log('[ProcessWorkflow] Starting validation for jobId:', jobId);

      // Call the validate authors API
      const response = await scholarFinderApiService.validateAuthors(jobId);
      
      console.log('[ProcessWorkflow] Validation API response:', response);
      
      // Initialize progress tracking
      setValidationProgress({
        percentage: response.data?.progress_percentage || 0,
        processed: response.data?.total_authors_processed || 0,
        total: response.data?.total_authors_processed || 0,
        criteria: response.data?.validation_criteria || [],
        status: response.data?.validation_status || 'in_progress',
        estimatedCompletion: response.data?.estimated_completion_time || null
      });
      
      // Check if validation completed immediately (small number of authors)
      if (response.data?.validation_status === 'completed') {
        console.log('[ProcessWorkflow] Validation completed immediately');
        setValidationCompleted(true);
        
        const processedCount = response.data.total_authors_processed || 0;
        const criteriaCount = response.data.validation_criteria?.length || 0;
        const summary = response.data.summary;
        
        let description = `Processed ${processedCount} authors against ${criteriaCount} validation criteria.`;
        if (summary) {
          description += ` Found ${summary.authors_validated} validated authors with average score of ${summary.average_conditions_met.toFixed(1)}.`;
        }
        description += ' Results are now available.';
        
        toast({
          title: 'Validation Completed Successfully! 🎉',
          description,
          duration: 8000,
        });
      } else {
        // Validation is running in background - start polling for completion
        console.log('[ProcessWorkflow] Validation started, beginning polling');
        
        const processedCount = response.data?.total_authors_processed || 0;
        const estimatedTime = response.data?.estimated_completion_time;
        
        let description = 'Author validation has been initiated successfully and is running in the background.';
        if (processedCount > 0) {
          description += ` Processing ${processedCount} authors.`;
        }
        if (estimatedTime) {
          description += ` ${estimatedTime}`;
        }
        
        toast({
          title: 'Validation Started & Saved',
          description,
          duration: 6000,
        });
        
        // Start polling for validation completion
        await startValidationPolling(jobId);
        
        // Also do an immediate check after a short delay in case validation completes quickly
        setTimeout(async () => {
          try {
            console.log('[ProcessWorkflow] Doing immediate completion check after validation start');
            const recommendations = await scholarFinderApiService.getRecommendations(jobId);
            if (recommendations.data?.reviewers && recommendations.data.reviewers.length > 0) {
              console.log('[ProcessWorkflow] Validation completed quickly - found recommendations immediately!');
              setValidationCompleted(true);
              setValidationProgress(prev => ({ ...prev, status: 'completed', percentage: 100 }));
              stopValidationPolling();
              
              toast({
                title: 'Validation Completed Successfully! 🎉',
                description: `Found ${recommendations.data.reviewers.length} recommended reviewers. Results are now available.`,
                duration: 8000,
              });
            }
          } catch (immediateCheckError) {
            console.log('[ProcessWorkflow] Immediate check - validation still in progress');
          }
        }, 3000); // Check after 3 seconds
      }
      
    } catch (error: any) {
      console.error('[ProcessWorkflow] Validation error:', error);
      
      // Stop any ongoing polling
      stopValidationPolling();
      
      toast({
        title: 'Validation Failed',
        description: error.message || 'Failed to start author validation. Please try again.',
        variant: 'destructive',
        duration: 8000,
      });
    } finally {
      setIsValidating(false);
      validationInProgressRef.current = false;
    }
  }, [processId, isValidating, isPollingValidation, toast, startValidationPolling, stopValidationPolling]);

  // Memoize callbacks to prevent unnecessary re-renders
  const handleStepChange = useCallback(async (newStep: string) => {
    if (!process) return;

    try {
      // Store the current step as the previous step before changing
      const previousStep = process.currentStep;
      localStorage.setItem(`process_${processId}_previousStep`, previousStep);
      console.log('[ProcessWorkflow] Storing previous step:', previousStep, 'before moving to:', newStep);
      
      // Clear enhanced keywords when going back to upload or metadata extraction step
      if (newStep === 'UPLOAD' || newStep === 'METADATA_EXTRACTION') {
        resetWorkflowState();
      }
      
      // Reset validation state when moving from MANUAL_SEARCH back to VALIDATION
      // This ensures the user can start a fresh validation if needed
      if (previousStep === 'MANUAL_SEARCH' && newStep === 'VALIDATION') {
        console.log('[ProcessWorkflow] Moving from MANUAL_SEARCH to VALIDATION - resetting validation state');
        setValidationCompleted(false);
        setValidationProgress({
          percentage: 0,
          processed: 0,
          total: 0,
          criteria: [],
          status: 'pending',
          estimatedCompletion: null
        });
        // Stop any ongoing polling
        stopValidationPolling();
      }
      
      await updateStepMutation.mutateAsync({
        processId: process.id,
        step: newStep,
      });
      
      // Show progress saved notification
      toast({
        title: 'Progress Saved',
        description: `Moved to ${newStep.replace('_', ' ').toLowerCase()} step.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update process step.',
        variant: 'destructive',
      });
    }
  }, [process, processId, updateStepMutation, toast, stopValidationPolling]);

  const handleFileUpload = useCallback(async (uploadResponse: any) => {
    // Handle file removal (when uploadResponse is null)
    if (!uploadResponse) {
      setUploadResponse(null);
      setUploadedFile(null);
      // Reset all workflow state when file is removed
      resetWorkflowState();
      // Reset to upload step when file is removed
      await handleStepChange('UPLOAD');
      return;
    }
    
    // Handle successful file upload
    setUploadResponse(uploadResponse);
    setUploadedFile({ name: uploadResponse.fileName, size: uploadResponse.fileSize } as File);
    
    // Reset all workflow state when a new file is uploaded
    // This ensures fresh validation for the new file
    console.log('[ProcessWorkflow] New file uploaded - resetting workflow state for fresh start');
    resetWorkflowState();
    
    // Show notification about workflow reset
    toast({
      title: 'File Uploaded Successfully',
      description: 'Workflow has been reset for the new file. You can now proceed with metadata extraction.',
      duration: 5000,
    });
    
    // Don't automatically move to next step - wait for user to click Next
    // await handleStepChange('METADATA_EXTRACTION');
  }, [handleStepChange, resetWorkflowState, toast]);

  const handleKeywordEnhancement = useCallback((keywords: any) => {
    setEnhancedKeywords(keywords);
    // Don't set keywords here - let KeywordEnhancement component manage selections
    
    // Show progress saved notification
    toast({
      title: 'Progress Saved',
      description: 'Enhanced keywords have been saved automatically.',
    });
  }, [toast]);

  const handleKeywordStringChange = useCallback((newKeywordString: string) => {
    setKeywordString(newKeywordString);
  }, []);
  
  // COI click handler
  const handleCOIClick = useCallback((reviewer: any) => {
    // Extract author ID from coi_coauthor field
    const extractAuthorId = (coiValue: any): string | null => {
      if (typeof coiValue === 'string') {
        // Look for author ID pattern (A followed by numbers)
        const match = coiValue.match(/A\d+/);
        return match ? match[0] : null;
      }
      return null;
    };
    
    const authorId = extractAuthorId(reviewer.coi_coauthor);
    if (authorId) {
      setSelectedCOIAuthor({
        authorId,
        authorName: reviewer.name || 'Unknown Author'
      });
      setCOIModalOpen(true);
    }
  }, []);
  
  // Manual keyword enhancement trigger function
  const triggerKeywordEnhancement = useCallback(async () => {
    console.log('[ProcessWorkflow] Triggering keyword enhancement for processId:', processId);
    
    try {
      const result = await enhanceKeywordsMutation.mutateAsync({ processId });
      console.log('[ProcessWorkflow] Keyword enhancement successful:', result);
      handleKeywordEnhancement(result);
      toast({
        title: 'Keywords Enhanced',
        description: `Generated ${result.enhanced.length} enhanced keywords and ${result.meshTerms.length} MeSH terms.`,
      });
    } catch (error: any) {
      console.error('[ProcessWorkflow] Keyword enhancement failed:', error);
      toast({
        title: 'Enhancement Failed',
        description: error.message || 'Failed to enhance keywords. Please try again.',
        variant: 'destructive',
      });
    }
  }, [processId, enhanceKeywordsMutation, handleKeywordEnhancement, toast]);

  // Reset the trigger when leaving the KEYWORD_ENHANCEMENT step
  useEffect(() => {
    if (process?.currentStep !== 'KEYWORD_ENHANCEMENT') {
      keywordEnhancementTriggered.current = false;
    }
  }, [process?.currentStep]);

  // Auto-fetch recommendations when entering RECOMMENDATIONS step
  useEffect(() => {
    if (process?.currentStep === 'RECOMMENDATIONS') {
      console.log('[ProcessWorkflow] Entered RECOMMENDATIONS step, processId:', processId);
      console.log('[ProcessWorkflow] Recommendations data:', recommendations);
      console.log('[ProcessWorkflow] Recommendations loading:', recommendationsLoading);
      
      if (refetchRecommendations) {
        console.log('[ProcessWorkflow] Refetching recommendations...');
        refetchRecommendations();
      }
    }
  }, [process?.currentStep, processId, refetchRecommendations, recommendations, recommendationsLoading]);

  const handleKeywordsChange = useCallback((primary: string[], secondary: string[]) => {
    setPrimaryKeywords(primary);
    setSecondaryKeywords(secondary);
  }, []);

  const handleSearch = useCallback(async (keywords: string[], databases: string[]) => {
    try {
      // Note: useSearch hook doesn't have mutateAsync, it's a query hook
      // This would need to be implemented differently based on the actual hook API
      setSearchCompleted(true);
      // Don't automatically move to next step - wait for user to click Next
      // await handleStepChange('DATABASE_SEARCH');
      
      toast({
        title: 'Search completed',
        description: 'Database search has been initiated. Results will be available shortly.',
      });
    } catch (error) {
      toast({
        title: 'Search failed',
        description: 'Failed to initiate database search. Please try again.',
        variant: 'destructive',
      });
    }
  }, [handleStepChange, toast]);

  const fetchValidationRecommendations = useCallback(async () => {
    try {
      setIsLoadingRecommendations(true);
      
      // Get the job ID for this process
      const jobId = fileService.getJobId(processId);
      if (!jobId) {
        toast({
          title: 'Error',
          description: 'No job ID found. Please upload a file first.',
          variant: 'destructive',
        });
        return;
      }

      // Call the recommended_reviewers API
      const response = await scholarFinderApiService.getRecommendations(jobId);
      
      setValidationRecommendations(response);
      toast({
        title: 'Results Loaded & Saved',
        description: `Found ${response.data?.reviewers?.length || 0} recommended reviewers. Progress saved automatically.`,
      });
      
      console.log('Validation recommendations:', response);
    } catch (error: any) {
      console.error('Failed to fetch recommendations:', error);
      toast({
        title: 'Failed to Load Results',
        description: error.message || 'Failed to fetch recommended reviewers.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingRecommendations(false);
    }
  }, [processId, toast]);

  const renderCurrentStep = () => {
    if (!process) return null;

    switch (process.currentStep) {
      case "UPLOAD":
        return (
          <div className="space-y-4">
            <FileUpload 
              processId={processId}
              onFileUpload={handleFileUpload}
              uploadedFile={uploadedFile}
            />
            {uploadedFile && uploadResponse && (
              <div className="flex justify-end">
                <Button 
                  onClick={() => handleStepChange('METADATA_EXTRACTION')}
                  size="lg"
                >
                  Next: Review Metadata
                </Button>
              </div>
            )}
          </div>
        );

      case "METADATA_EXTRACTION":
        return (
          <div className="space-y-4">
            <DataExtraction 
              processId={processId}
              fileName={uploadedFile?.name}
            />
            {metadata && !metadataLoading && (
              <div className="flex justify-end">
                <Button 
                  onClick={() => handleStepChange('KEYWORD_ENHANCEMENT')}
                  size="lg"
                >
                  Next: Enhance Keywords
                </Button>
              </div>
            )}
          </div>
        );

      case "KEYWORD_ENHANCEMENT":
        return (
          <div className="space-y-8">
            <KeywordEnhancement
              processId={processId}
              onEnhancementComplete={handleKeywordEnhancement}
              onKeywordStringChange={handleKeywordStringChange}
              onTriggerEnhancement={triggerKeywordEnhancement}
              isEnhancing={enhanceKeywordsMutation.isPending}
              hasEnhanced={!!enhancedKeywords}
              enhancedKeywords={enhancedKeywords}
            />
            {enhancedKeywords && (
              <div className="flex justify-end">
                <Button 
                  onClick={() => handleStepChange('DATABASE_SEARCH')}
                  size="lg"
                >
                  Next: Search Databases
                </Button>
              </div>
            )}
          </div>
        );
      
      case "DATABASE_SEARCH":
        return (
          <div className="space-y-4">
            <ReviewerSearch
              processId={processId}
              keywordString={keywordString}
              onSearchComplete={() => {
                console.log('[ProcessWorkflow] Search completed, setting searchCompleted to true');
                setSearchCompleted(true);
                toast({
                  title: 'Search Completed & Saved',
                  description: 'Database search results have been saved automatically.',
                });
              }}
            />
            {searchCompleted && (
              <div className="flex justify-end">
                <Button 
                  onClick={() => handleStepChange('MANUAL_SEARCH')}
                  size="lg"
                >
                  Next Step
                </Button>
              </div>
            )}
          </div>
        );

      case "RECOMMENDATIONS":
        // Show loading state while fetching recommendations
        if (recommendationsLoading) {
          return (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  <p className="text-muted-foreground">Loading recommendations...</p>
                </div>
              </CardContent>
            </Card>
          );
        }
        
        // Show recommendations if available
        if (recommendations && recommendations.reviewers && recommendations.reviewers.length > 0) {
          return (
            <ReviewerResults 
              processId={processId}
              onShortlistCreated={() => handleStepChange('SHORTLIST')}
            />
          );
        }
        
        // Show empty state or error
        return (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <p className="text-muted-foreground">
                  {recommendations && recommendations.reviewers && recommendations.reviewers.length === 0 && recommendations.message?.includes('not ready') 
                    ? "Recommendations are not ready yet. The validation process may still be running in the background."
                    : "No reviewer recommendations found."
                  }
                </p>
                <div className="flex gap-2 justify-center">
                  <Button 
                    onClick={() => refetchRecommendations?.()}
                    variant="outline"
                  >
                    {recommendations && recommendations.message?.includes('not ready') 
                      ? "Check Again" 
                      : "Retry Loading Recommendations"
                    }
                  </Button>
                  {recommendations && recommendations.message?.includes('not ready') && (
                    <Button 
                      variant="outline"
                      onClick={() => handleStepChange('VALIDATION')}
                    >
                      Back to Validation
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case "MANUAL_SEARCH":
        return (
          <AuthorValidation
            processId={processId}
            onValidationComplete={() => handleStepChange('VALIDATION')}
          />
        );

      case "VALIDATION":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Validate Authors</CardTitle>
              <CardDescription>
                Validate reviewers against conflict of interest rules and eligibility criteria
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Validation Progress Display */}
              {(isPollingValidation || validationProgress.status === 'in_progress') && !validationCompleted && (
                <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-blue-900">Validation in Progress</h4>
                    <span className="text-sm text-blue-700">
                      {validationProgress.percentage > 0 ? `${validationProgress.percentage}%` : 'Processing...'}
                    </span>
                  </div>
                  
                  {/* Progress Bar */}
                  {validationProgress.percentage > 0 && (
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${validationProgress.percentage}%` }}
                      ></div>
                    </div>
                  )}
                  
                  {/* Progress Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {validationProgress.processed > 0 && (
                      <div className="text-blue-700">
                        <span className="font-medium">Authors Processed:</span> {validationProgress.processed}
                        {validationProgress.total > validationProgress.processed && ` of ${validationProgress.total}`}
                      </div>
                    )}
                    
                    {validationProgress.criteria.length > 0 && (
                      <div className="text-blue-700">
                        <span className="font-medium">Validation Criteria:</span> {validationProgress.criteria.length} rules
                      </div>
                    )}
                    
                    {validationProgress.estimatedCompletion && (
                      <div className="text-blue-700 md:col-span-2">
                        <span className="font-medium">Estimated Completion:</span> {validationProgress.estimatedCompletion}
                      </div>
                    )}
                    
                    {pollingStartTime && (
                      <div className="text-blue-700 md:col-span-2">
                        <span className="font-medium">Running for:</span> {Math.floor((Date.now() - pollingStartTime) / 60000)} minutes
                      </div>
                    )}
                  </div>
                  
                  {/* Status Message */}
                  <div className="text-sm text-blue-600">
                    {validationProgress.status === 'in_progress' 
                      ? 'Validation is running in the background. You can continue with other tasks while waiting.'
                      : 'Checking validation status...'
                    }
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex justify-between items-center">
                    {/* Check Results Button */}
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={async () => {
                        try {
                          const jobId = fileService.getJobId(processId);
                          if (jobId) {
                            console.log('[ProcessWorkflow] Manually checking validation results');
                            const recommendations = await scholarFinderApiService.getRecommendations(jobId);
                            if (recommendations.data?.reviewers && recommendations.data.reviewers.length > 0) {
                              console.log('[ProcessWorkflow] Found recommendations - validation is complete!');
                              setValidationCompleted(true);
                              setValidationProgress(prev => ({ ...prev, status: 'completed', percentage: 100 }));
                              stopValidationPolling();
                              
                              toast({
                                title: 'Validation Completed! 🎉',
                                description: `Found ${recommendations.data.reviewers.length} recommended reviewers. Results are now available.`,
                                duration: 8000,
                              });
                            } else {
                              toast({
                                title: 'Still Processing',
                                description: 'Validation is still in progress. Please wait a bit longer.',
                                duration: 4000,
                              });
                            }
                          }
                        } catch (error) {
                          console.error('[ProcessWorkflow] Error checking results:', error);
                          toast({
                            title: 'Check Failed',
                            description: 'Unable to check validation results. Please try again.',
                            variant: 'destructive',
                            duration: 4000,
                          });
                        }
                      }}
                      className="text-blue-700 border-blue-300 hover:bg-blue-100"
                    >
                      Check Results
                    </Button>
                    
                    {/* Stop Polling Button */}
                    {isPollingValidation && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={stopValidationPolling}
                        className="text-blue-700 border-blue-300 hover:bg-blue-100"
                      >
                        Stop Checking Progress
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {!validationCompleted && !isPollingValidation && validationProgress.status !== 'in_progress' ? (
                <div className="flex flex-col items-center space-y-4">
                  <div className="text-center text-muted-foreground">
                    <p>Click the button below to start author validation.</p>
                    <p className="text-sm">This process may take several minutes to complete.</p>
                  </div>
                  <Button 
                    onClick={handleValidateAuthors}
                    size="lg"
                    className="px-8"
                    disabled={isValidating || isPollingValidation || validationInProgressRef.current}
                  >
                    {isValidating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Starting Validation...
                      </>
                    ) : isPollingValidation ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Validating Authors... ({validationProgress.percentage}%)
                      </>
                    ) : (
                      'Validate Authors'
                    )}
                  </Button>
                </div>
              ) : validationProgress.status === 'in_progress' && !isPollingValidation ? (
                // Show resume polling option if validation is in progress but polling stopped
                <div className="space-y-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="text-center">
                    <h4 className="font-medium text-yellow-900 mb-2">Validation May Still Be Running</h4>
                    <p className="text-sm text-yellow-700 mb-4">
                      The validation process was started but progress checking was stopped. 
                      Click below to check the current status.
                    </p>
                    <div className="flex gap-2 justify-center">
                      <Button 
                        onClick={async () => {
                          const jobId = fileService.getJobId(processId);
                          if (jobId) {
                            await startValidationPolling(jobId);
                          }
                        }}
                        size="sm"
                        className="bg-yellow-600 hover:bg-yellow-700"
                      >
                        Check Progress
                      </Button>
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setValidationProgress(prev => ({ ...prev, status: 'pending' }));
                        }}
                      >
                        Reset Status
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
              
              {validationCompleted ? (
                <div className="space-y-6">
                  <div className="text-center p-6 bg-green-50 border border-green-200 rounded-lg">
                    <div className="text-green-600 mb-4">
                      <div className="flex items-center justify-center mb-2">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-2xl">✅</span>
                        </div>
                      </div>
                      <h3 className="text-lg font-semibold text-green-800">Validation Completed Successfully!</h3>
                      <p className="text-sm text-green-700 mt-2">
                        The validation process has finished processing all authors against the eligibility criteria.
                      </p>
                    </div>
                    
                    {/* Validation Statistics */}
                    {validationProgress.processed > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 p-4 bg-white rounded-lg border border-green-200">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">{validationProgress.processed}</div>
                          <div className="text-sm text-green-700">Authors Processed</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">{validationProgress.criteria.length}</div>
                          <div className="text-sm text-green-700">Validation Rules</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">100%</div>
                          <div className="text-sm text-green-700">Complete</div>
                        </div>
                      </div>
                    )}
                    
                    {/* Re-validate option */}
                    <div className="mt-4 pt-4 border-t border-green-200">
                      <p className="text-sm text-green-700 mb-3">
                        Need to run validation again with updated criteria?
                      </p>
                      <Button 
                        onClick={() => {
                          console.log('[ProcessWorkflow] User requested re-validation');
                          setValidationCompleted(false);
                          setValidationProgress({
                            percentage: 0,
                            processed: 0,
                            total: 0,
                            criteria: [],
                            status: 'pending',
                            estimatedCompletion: null
                          });
                          stopValidationPolling();
                          toast({
                            title: 'Validation Reset',
                            description: 'You can now start a new validation process.',
                          });
                        }}
                        variant="outline"
                        size="sm"
                        className="text-green-700 border-green-300 hover:bg-green-100"
                      >
                        Re-validate Authors
                      </Button>
                    </div>
                  </div>
                  
                  {/* Show recommendations if loaded */}
                  {validationRecommendations && (
                    <div className="mt-6">
                      <div className="flex items-center gap-2 mb-4">
                        <User className="h-5 w-5" />
                        <h3 className="text-lg font-semibold">Recommended Reviewers</h3>
                        <span className="text-sm text-muted-foreground">
                          ({validationRecommendations.data?.reviewers?.length || 0} found)
                        </span>
                      </div>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {validationRecommendations.data?.reviewers?.map((reviewer: any, index: number) => {
                          // Determine COI status based on coi_coauthor column
                          // COI is "No" if coi_coauthor is FALSE or False
                          // COI is "Yes" only when coi_coauthor contains author ID format (A followed by numbers)
                          const hasAuthorId = (value: any) => {
                            if (typeof value === 'string') {
                              // Check if string contains author ID pattern: A followed by numbers
                              return /A\d+/.test(value);
                            }
                            return false;
                          };
                          
                          const coiStatus = (reviewer.coi_coauthor === false || reviewer.coi_coauthor === 'FALSE' || reviewer.coi_coauthor === 'False') 
                            ? 'No' 
                            : hasAuthorId(reviewer.coi_coauthor) 
                              ? 'Yes' 
                              : 'No';
                          const coiColor = coiStatus === 'No' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';
                          const coiTextColor = coiStatus === 'No' ? 'text-green-800' : 'text-red-800';
                          const coiBadgeColor = coiStatus === 'No' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
                          
                          return (
                            <div key={index} className="p-4 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                              <div className="flex justify-between items-start">
                                <div className="space-y-2 flex-1">
                                  <div className="flex items-center gap-3">
                                    <h4 className="font-medium text-lg">{reviewer.name || 'Unknown Author'}</h4>
                                    {/* COI Container for this author */}
                                    <div className={`px-3 py-1 rounded-full border ${coiColor}`}>
                                      <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${coiStatus === 'No' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                        <span className={`text-xs font-medium ${coiTextColor}`}>
                                          COI: {coiStatus}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                      <BookOpen className="h-4 w-4" />
                                      <span><span className="font-medium">Affiliation:</span> {reviewer.affiliation || 'Not available'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Mail className="h-4 w-4" />
                                      <span><span className="font-medium">Email:</span> {reviewer.email || 'Not available'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <MapPin className="h-4 w-4" />
                                      <span><span className="font-medium">Country:</span> {reviewer.country || 'Not available'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <BookOpen className="h-4 w-4" />
                                      <span><span className="font-medium">Publications:</span> {reviewer.publications || 'Not available'}</span>
                                    </div>
                                  </div>
                                  
                                  {/* Study Type Distribution for this reviewer */}
                                  <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
                                    <h5 className="text-sm font-medium text-gray-700 mb-2">Study Type Distribution</h5>
                                    <div className="grid grid-cols-3 gap-2">
                                      {(() => {
                                        // Parse the study_type JSON string
                                        let studyTypeCounts = { in_vivo: 0, in_vitro: 0, in_silico: 0 };
                                        try {
                                          if (reviewer.study_type) {
                                            const parsedStudyType = JSON.parse(reviewer.study_type.replace(/'/g, '"'));
                                            studyTypeCounts = parsedStudyType.study_type_counts || studyTypeCounts;
                                          }
                                        } catch (error) {
                                          console.log('Error parsing study_type for reviewer:', reviewer.name, error);
                                        }
                                        
                                        return (
                                          <>
                                            <div className="text-center p-2 bg-green-100 rounded border border-green-200">
                                              <div className="text-xs font-medium text-green-700">In Vivo</div>
                                              <div className="text-sm font-bold text-green-900">{studyTypeCounts.in_vivo}</div>
                                            </div>
                                            <div className="text-center p-2 bg-blue-100 rounded border border-blue-200">
                                              <div className="text-xs font-medium text-blue-700">In Vitro</div>
                                              <div className="text-sm font-bold text-blue-900">{studyTypeCounts.in_vitro}</div>
                                            </div>
                                            <div className="text-center p-2 bg-purple-100 rounded border border-purple-200">
                                              <div className="text-xs font-medium text-purple-700">In Silico</div>
                                              <div className="text-sm font-bold text-purple-900">{studyTypeCounts.in_silico}</div>
                                            </div>
                                          </>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                  
                                  {/* Clickable COI Display */}
                                  <div className={`mt-3 p-3 rounded-lg border ${coiColor} text-center`}>
                                    {coiStatus === 'Yes' ? (
                                      <button
                                        onClick={() => handleCOIClick(reviewer)}
                                        className={`flex items-center justify-center gap-2 w-full hover:opacity-80 transition-opacity cursor-pointer`}
                                      >
                                        <AlertCircle className="h-4 w-4" />
                                        <span className={`text-sm font-medium ${coiTextColor} underline`}>
                                          Conflict of Interest: {coiStatus}
                                        </span>
                                      </button>
                                    ) : (
                                      <div className="flex items-center justify-center gap-2">
                                        <AlertCircle className="h-4 w-4" />
                                        <span className={`text-sm font-medium ${coiTextColor}`}>
                                          Conflict of Interest: {coiStatus}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right ml-4">
                                  <div className="flex items-center gap-1 text-sm font-medium text-green-600">
                                    <Award className="h-4 w-4" />
                                    <span>{reviewer.conditions_met || 0}</span>
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Conditions Met
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-end">
                    <Button 
                      onClick={() => handleStepChange('RECOMMENDATIONS')}
                      size="lg"
                    >
                      Next: Recommendations
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        );

      case "SHORTLIST":
        // Prepare available reviewers from validation results and recommendations
        let availableReviewers: any[] = [];
        
        console.log('[ProcessWorkflow] SHORTLIST step - Available data:', {
          validationRecommendations,
          recommendations,
          validationReviewersCount: validationRecommendations?.data?.reviewers?.length || 0,
          recommendationsReviewersCount: recommendations?.reviewers?.length || 0
        });
        
        // First, try to get reviewers from validation results
        if (validationRecommendations?.data?.reviewers) {
          console.log('[ProcessWorkflow] Raw validation reviewers:', validationRecommendations.data.reviewers);
          
          availableReviewers = validationRecommendations.data.reviewers.map((reviewer: any, index: number) => {
            console.log(`[ProcessWorkflow] Processing reviewer ${index}:`, reviewer);
            
            // Extract name more carefully - use the same logic as the validation display
            let name = reviewer.name;
            if (!name || name === 'Unknown Author' || name.trim() === '') {
              // Try to extract name from email if available
              if (reviewer.email) {
                const emailParts = reviewer.email.split('@')[0];
                // Convert email username to a readable name format
                name = emailParts
                  .replace(/[._-]/g, ' ')
                  .split(' ')
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                  .join(' ');
              } else {
                name = `Reviewer ${index + 1}`;
              }
            }
            
            const mappedReviewer = {
              id: reviewer.email || reviewer.name || `reviewer-${index}`,
              name: name,
              email: reviewer.email,
              affiliation: reviewer.affiliation,
              country: reviewer.country,
              publications: reviewer.publications,
              conditions_met: reviewer.conditions_met
            };
            
            console.log(`[ProcessWorkflow] Mapped reviewer ${index}:`, mappedReviewer);
            return mappedReviewer;
          });
          console.log('[ProcessWorkflow] Using validation results:', availableReviewers.length, 'reviewers');
        }
        
        // If no validation results, fall back to recommendations data
        if (availableReviewers.length === 0 && recommendations?.reviewers) {
          console.log('[ProcessWorkflow] Raw recommendations reviewers:', recommendations.reviewers);
          
          availableReviewers = recommendations.reviewers.map((reviewer: any, index: number) => {
            // Extract name more carefully - use the same logic as the validation display
            let name = reviewer.name;
            if (!name || name === 'Unknown Author' || name.trim() === '') {
              // Try to extract name from email if available
              if (reviewer.email) {
                const emailParts = reviewer.email.split('@')[0];
                // Convert email username to a readable name format
                name = emailParts
                  .replace(/[._-]/g, ' ')
                  .split(' ')
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                  .join(' ');
              } else {
                name = `Reviewer ${index + 1}`;
              }
            }
            
            return {
              id: reviewer.email || reviewer.name || `reviewer-${index}`,
              name: name,
              email: reviewer.email,
              affiliation: reviewer.affiliation,
              country: reviewer.country,
              publications: reviewer.publications
            };
          });
          console.log('[ProcessWorkflow] Using recommendations fallback:', availableReviewers.length, 'reviewers');
        }
        
        console.log('[ProcessWorkflow] Final availableReviewers:', availableReviewers);

        return (
          <div className="space-y-6">
            {availableReviewers.length === 0 && (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center space-y-4">
                    <p className="text-muted-foreground">
                      No validated reviewers available for shortlisting.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Load validation results from the Author Validation step to see recommended reviewers.
                    </p>
                    <div className="flex gap-2 justify-center">
                      <Button 
                        onClick={fetchValidationRecommendations}
                        disabled={isLoadingRecommendations}
                        size="lg"
                      >
                        {isLoadingRecommendations ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                            Loading Validation Results...
                          </>
                        ) : (
                          'Load Validation Results'
                        )}
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => handleStepChange('VALIDATION')}
                      >
                        Back to Validation
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => handleStepChange('RECOMMENDATIONS')}
                      >
                        Back to Recommendations
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Shortlist Management Section */}
            <ShortlistManager 
              processId={processId} 
              availableReviewers={availableReviewers}
            />
            
            <div className="flex justify-start pt-4">
              <Button 
                variant="outline"
                onClick={() => handleStepChange('RECOMMENDATIONS')}
              >
                Back to Recommendations
              </Button>
            </div>
          </div>
        );

      default:
        return (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                Invalid step: {process.currentStep}. Please contact support.
              </p>
            </CardContent>
          </Card>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" disabled>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <div className="h-96 bg-muted animate-pulse rounded-lg" />
          </div>
          <div className="lg:col-span-2">
            <div className="h-96 bg-muted animate-pulse rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !process) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <p className="mb-4">Failed to load process. Please try again.</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Processes
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{process.title}</h1>
            <p className="text-muted-foreground">{process.description}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="px-3 py-1 bg-muted rounded-md text-sm">
            <span className="text-muted-foreground">Job ID:</span>{' '}
            <span className="font-mono font-medium">{fileService.getJobId(processId) || 'Not assigned'}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Step Tracker */}
        <div className="lg:col-span-1">
          <ProcessStepTracker 
            process={process}
            onStepChange={handleStepChange}
            allowStepNavigation={true}
          />
        </div>

        {/* Current Step Content */}
        <div className="lg:col-span-2">
          {renderCurrentStep()}
        </div>
      </div>

      {/* COI Publications Modal */}
      {selectedCOIAuthor && (
        <COIPublicationsModal
          isOpen={coiModalOpen}
          onClose={() => {
            setCOIModalOpen(false);
            setSelectedCOIAuthor(null);
          }}
          authorId={selectedCOIAuthor.authorId}
          authorName={selectedCOIAuthor.authorName}
          processId={processId}
        />
      )}
    </div>
  );
};