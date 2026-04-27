/**
 * Process Workflow Component
 * Main workflow component that manages the entire manuscript analysis process
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { ArrowLeft, User, Mail, MapPin, BookOpen, Award, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
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
import { AuthorSelectionStep } from '@/components/validation/AuthorSelectionStep';
import { ShortlistManager } from '@/components/shortlist/ShortlistManager';
import { COIPublicationsModal } from '@/components/coi/COIPublicationsModal';
import type { Reviewer } from '@/types/api';
import type { EnhancedKeywords } from '@/services/keywordService';
import { useWorkflowNotifications } from '@/hooks/useGlobalNotifications';

// Available validation conditions from backend
const VALIDATION_CONDITIONS = [
  {
    id: 'Publications',
    label: 'Publications',
    description: 'Check publication count in last 10 years and last 5 years, last 2 years and last 12 months'
  },
  {
    id: 'First/Last Author in publications',
    label: 'First/Last Author Publications',
    description: 'Analyze first and last author publications'
  },
  {
    id: 'Relevant Publications',
    label: 'Relevant Publications',
    description: 'Check relevant publications in last 5 years, last 2 years and last 12 months'
  },
  {
    id: 'Publication Types',
    label: 'Publication Types',
    description: 'Analyze publication types of Clinical Trial, Clinical Study and Case Report if any'
  },
  {
    id: 'T&F Publications last year',
    label: 'Taylor & Francis Publications',
    description: 'Check Taylor & Francis publications in the last 12 months'
  },
  {
    id: 'Conflict of Interest',
    label: 'Conflict of Interest',
    description: 'Detect potential conflicts of interest with manuscript authors'
  },
  {
    id: 'Retraction History',
    label: 'Retraction History',
    description: 'Check for any retracted publications in author history'
  },
  {
    id: 'Study Type Detection',
    label: 'Study Type Detection',
    description: 'Analyze study types (In Vivo, In Vitro, In Silico)'
  },
  {
    id: 'Sanction Country',
    label: 'Sanction Country Check',
    description: 'Check if author is from a sanctioned country'
  }
];

interface ProcessWorkflowProps {
  processId: string;
  onBack?: () => void;
}

export const ProcessWorkflow: React.FC<ProcessWorkflowProps> = ({
  processId,
  onBack,
}) => {
  console.log('[ProcessWorkflow] Component rendered with processId:', processId);
  
  // Track mount/unmount
  useEffect(() => {
    const storageKey = `process_${processId}_uploadResponse`;
    const savedOnMount = localStorage.getItem(storageKey);
    console.log('[ProcessWorkflow] ===== COMPONENT MOUNTED =====');
    console.log('[ProcessWorkflow] localStorage on mount:', savedOnMount);
    return () => {
      const savedOnUnmount = localStorage.getItem(storageKey);
      console.log('[ProcessWorkflow] ===== COMPONENT UNMOUNTING =====');
      console.log('[ProcessWorkflow] localStorage on unmount:', savedOnUnmount);
    };
  }, [processId]);
  
  const { toast } = useToast();
  const { user } = useAuth(); // Get current user for userType
  const { data: process, isLoading, error } = useProcess(processId);
  
  console.log('[ProcessWorkflow] Process data:', process);
  
  // Explicitly store process title for global notifications
  useEffect(() => {
    if (process?.title) {
      console.log('[ProcessWorkflow] Storing process title for notifications:', process.title);
      
      // Store in multiple keys to ensure notification system finds it
      localStorage.setItem(`process_${processId}_title`, process.title);
      localStorage.setItem(`process_title_${processId}`, process.title);
      localStorage.setItem(`processTitle_${processId}`, process.title);
      
      // Also store with process data for backup
      const processData = {
        id: processId,
        title: process.title,
        description: process.description,
        status: process.status,
        userId: process.userId
      };
      localStorage.setItem(`processData_${processId}`, JSON.stringify(processData));
      
      console.log('[ProcessWorkflow] Process title stored in multiple keys for notifications');
    }
  }, [process?.title, processId]);
  
  // Initialize workflow notifications with dynamic title
  // Ensure we always use the most current process title, preferring the real title over fallback
  const processTitle = process?.title || `Process ${processId}`;
  
  console.log('[ProcessWorkflow] Using process title for notifications:', processTitle, 'isRealTitle:', !!process?.title);
  
  const { 
    notifyValidationComplete, 
    notifyKeywordsComplete,
    notifyStepError 
  } = useWorkflowNotifications(processId, processTitle);
  
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
  
  // Helper function to extract file info from upload response
  const extractFileInfo = (uploadResponse: any) => {
    if (!uploadResponse) return null;
    
    // Handle new multiple file format
    if (Array.isArray(uploadResponse.data) && uploadResponse.data.length > 0) {
      const firstFile = uploadResponse.data[0];
      return {
        name: firstFile.file_name || 'uploaded_file',
        size: 0 // API doesn't return file size, use 0 as placeholder
      };
    }
    
    // Handle old single file format (backward compatibility)
    if (uploadResponse.fileName && uploadResponse.fileSize) {
      return {
        name: uploadResponse.fileName,
        size: uploadResponse.fileSize
      };
    }
    
    // Fallback
    return {
      name: 'uploaded_file',
      size: 0
    };
  };

  // Helper function to extract job ID from upload response
  const extractJobId = (uploadResponse: any): string | null => {
    if (!uploadResponse) return null;
    
    // Handle array format (multiple files)
    if (Array.isArray(uploadResponse)) {
      const firstFile = uploadResponse[0];
      return firstFile?.job_id || null;
    }
    
    // Handle object with data array
    if (uploadResponse.data && Array.isArray(uploadResponse.data) && uploadResponse.data.length > 0) {
      const firstFile = uploadResponse.data[0];
      return firstFile.job_id || null;
    }
    
    // Handle single file format
    if (uploadResponse.job_id) {
      return uploadResponse.job_id;
    }
    
    // Handle legacy format
    if (uploadResponse.fileId) {
      return uploadResponse.fileId;
    }
    
    return null;
  };
  
  const [uploadedFile, setUploadedFile] = useState<File | null>(() => {
    // Initialize uploadedFile from localStorage if available
    const storageKey = `process_${processId}_uploadResponse`;
    const saved = localStorage.getItem(storageKey);
    console.log('[ProcessWorkflow] Initializing uploadedFile - checking localStorage key:', storageKey);
    console.log('[ProcessWorkflow] localStorage value:', saved);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const fileInfo = extractFileInfo(parsed);
        if (fileInfo) {
          console.log('[ProcessWorkflow] Initializing uploadedFile from localStorage:', fileInfo.name);
          return { name: fileInfo.name, size: fileInfo.size } as File;
        }
      } catch (e) {
        console.warn('[ProcessWorkflow] Failed to parse uploadResponse for uploadedFile:', e);
      }
    }
    console.log('[ProcessWorkflow] No uploadedFile data in localStorage, initializing as null');
    return null;
  });
  
  const [uploadResponse, setUploadResponse] = useState<any>(() => {
    const storageKey = `process_${processId}_uploadResponse`;
    const saved = localStorage.getItem(storageKey);
    console.log('[ProcessWorkflow] Initializing uploadResponse from localStorage:', saved);
    return saved ? JSON.parse(saved) : null;
  });

  // Derive uploadedFile - always check localStorage to handle rapid re-renders
  // Don't use useMemo since we need to read fresh localStorage on every render
  const getUploadedFileFromStorage = () => {
    try {
      const saved = localStorage.getItem(`process_${processId}_uploadResponse`);
      if (saved) {
        const parsed = JSON.parse(saved);
        const fileInfo = extractFileInfo(parsed);
        if (fileInfo) {
          return { name: fileInfo.name, size: fileInfo.size } as File;
        }
      }
    } catch (e) {
      console.warn('[ProcessWorkflow] Failed to read from localStorage:', e);
    }
    return null;
  };

  const getUploadResponseFromStorage = () => {
    try {
      const saved = localStorage.getItem(`process_${processId}_uploadResponse`);
      if (saved) {
        const uploadResponse = JSON.parse(saved);
        
        // Extract and store job ID if not already stored
        const existingJobId = fileService.getJobId(processId);
        if (!existingJobId) {
          const jobId = extractJobId(uploadResponse);
          if (jobId) {
            console.log('[ProcessWorkflow] Restoring job ID from localStorage:', jobId);
            fileService.setJobId(processId, jobId);
          }
        }
        
        return uploadResponse;
      }
    } catch (e) {
      console.warn('[ProcessWorkflow] Failed to read uploadResponse from localStorage:', e);
    }
    return null;
  };

  const memoizedUploadedFile = uploadedFile || 
    (uploadResponse ? (() => {
      const fileInfo = extractFileInfo(uploadResponse);
      return fileInfo ? { name: fileInfo.name, size: fileInfo.size } as File : null;
    })() : null) ||
    getUploadedFileFromStorage();
  
  const effectiveUploadResponse = uploadResponse || getUploadResponseFromStorage();
  
  console.log('[ProcessWorkflow] memoizedUploadedFile:', memoizedUploadedFile ? memoizedUploadedFile.name : 'null');
  console.log('[ProcessWorkflow] effectiveUploadResponse:', effectiveUploadResponse ? 'present' : 'null');
  console.log('[ProcessWorkflow] uploadResponse state:', uploadResponse);
  console.log('[ProcessWorkflow] getUploadResponseFromStorage():', getUploadResponseFromStorage());
  
  // Restore state when processId changes (switching between processes)
  useEffect(() => {
    console.log('[ProcessWorkflow] ProcessId changed, restoring state for:', processId);
    
    // Restore uploadResponse
    const savedUploadResponse = localStorage.getItem(`process_${processId}_uploadResponse`);
    if (savedUploadResponse) {
      try {
        const parsed = JSON.parse(savedUploadResponse);
        console.log('[ProcessWorkflow] Restoring uploadResponse for new processId:', parsed);
        setUploadResponse(parsed);
        
        // Also restore uploadedFile
        const fileInfo = extractFileInfo(parsed);
        if (fileInfo) {
          setUploadedFile({ 
            name: fileInfo.name, 
            size: fileInfo.size 
          } as File);
        }
      } catch (e) {
        console.warn('[ProcessWorkflow] Failed to parse saved uploadResponse:', e);
      }
    }
    // Note: Don't clear state if no data found - it might be in the process of being set
    // The state will be cleared explicitly when needed (e.g., file removal, step changes)
    
    // Restore other workflow state
    const savedKeywords = localStorage.getItem(`process_${processId}_keywords`);
    if (savedKeywords) {
      try {
        const parsed = JSON.parse(savedKeywords);
        console.log('[ProcessWorkflow] Restoring enhancedKeywords for new processId:', parsed);
        setEnhancedKeywords(parsed);
      } catch (e) {
        console.warn('[ProcessWorkflow] Failed to parse saved keywords:', e);
      }
    }
    
    const savedPrimaryKeywords = localStorage.getItem(`process_${processId}_primaryKeywords`);
    if (savedPrimaryKeywords) {
      try {
        setPrimaryKeywords(JSON.parse(savedPrimaryKeywords));
      } catch (e) {
        console.warn('[ProcessWorkflow] Failed to parse saved primaryKeywords:', e);
      }
    }
    
    const savedSecondaryKeywords = localStorage.getItem(`process_${processId}_secondaryKeywords`);
    if (savedSecondaryKeywords) {
      try {
        setSecondaryKeywords(JSON.parse(savedSecondaryKeywords));
      } catch (e) {
        console.warn('[ProcessWorkflow] Failed to parse saved secondaryKeywords:', e);
      }
    }
    
    const savedKeywordString = localStorage.getItem(`process_${processId}_keywordString`);
    if (savedKeywordString) {
      setKeywordString(savedKeywordString);
    }
    
    const savedSearchCompleted = localStorage.getItem(`process_${processId}_searchCompleted`);
    if (savedSearchCompleted) {
      try {
        setSearchCompleted(JSON.parse(savedSearchCompleted));
      } catch (e) {
        console.warn('[ProcessWorkflow] Failed to parse saved searchCompleted:', e);
      }
    }
    
    const savedValidationCompleted = localStorage.getItem(`process_${processId}_validationCompleted`);
    if (savedValidationCompleted) {
      try {
        setValidationCompleted(JSON.parse(savedValidationCompleted));
      } catch (e) {
        console.warn('[ProcessWorkflow] Failed to parse saved validationCompleted:', e);
      }
    }
    
    const savedValidationProgress = localStorage.getItem(`process_${processId}_validationProgress`);
    if (savedValidationProgress) {
      try {
        setValidationProgress(JSON.parse(savedValidationProgress));
      } catch (e) {
        console.warn('[ProcessWorkflow] Failed to parse saved validationProgress:', e);
      }
    }
    
    const savedValidationRecommendations = localStorage.getItem(`process_${processId}_validationRecommendations`);
    if (savedValidationRecommendations) {
      try {
        setValidationRecommendations(JSON.parse(savedValidationRecommendations));
      } catch (e) {
        console.warn('[ProcessWorkflow] Failed to parse saved validationRecommendations:', e);
      }
    }
  }, [processId]); // Only run when processId changes
  
  const [enhancedKeywords, setEnhancedKeywords] = useState<EnhancedKeywords | null>(() => {
    const storageKey = `process_${processId}_keywords`;
    const saved = localStorage.getItem(storageKey);
    console.log('[ProcessWorkflow] Initializing enhancedKeywords from localStorage key:', storageKey, 'value:', saved ? 'present' : 'null');
    return saved ? JSON.parse(saved) : null;
  });
  
  // Always check localStorage on every render (don't use useMemo)
  const getEnhancedKeywordsFromStorage = () => {
    if (enhancedKeywords) return enhancedKeywords;
    try {
      const saved = localStorage.getItem(`process_${processId}_keywords`);
      if (saved) {
        const parsed = JSON.parse(saved);
        console.log('[ProcessWorkflow] Found enhancedKeywords in localStorage (fallback)');
        return parsed;
      }
    } catch (e) {
      console.warn('[ProcessWorkflow] Failed to read keywords from localStorage:', e);
    }
    return null;
  };
  
  const enhancedKeywordsFromStorage = getEnhancedKeywordsFromStorage();
  console.log('[ProcessWorkflow] enhancedKeywordsFromStorage:', enhancedKeywordsFromStorage ? 'present' : 'null');
  
  const [isEnhancingKeywords, setIsEnhancingKeywords] = useState(() => {
    const saved = localStorage.getItem(`process_${processId}_isEnhancingKeywords`);
    return saved ? JSON.parse(saved) : false;
  });
  
  // Clear the enhancing flag if we already have enhanced keywords
  useEffect(() => {
    console.log('[ProcessWorkflow] Checking if should clear enhancing flag - enhancedKeywordsFromStorage:', enhancedKeywordsFromStorage ? 'present' : 'null', 'isEnhancingKeywords:', isEnhancingKeywords);
    if (enhancedKeywordsFromStorage && isEnhancingKeywords) {
      console.log('[ProcessWorkflow] Enhanced keywords exist, clearing enhancing flag');
      setIsEnhancingKeywords(false);
      localStorage.removeItem(`process_${processId}_isEnhancingKeywords`);
    }
  }, [enhancedKeywordsFromStorage, isEnhancingKeywords, processId]);
  
  const [primaryKeywords, setPrimaryKeywords] = useState<string[]>(() => {
    const saved = localStorage.getItem(`process_${processId}_primaryKeywords`);
    return saved ? JSON.parse(saved) : [];
  });
  const [secondaryKeywords, setSecondaryKeywords] = useState<string[]>(() => {
    const saved = localStorage.getItem(`process_${processId}_secondaryKeywords`);
    return saved ? JSON.parse(saved) : [];
  });
  const [keywordString, setKeywordString] = useState<string>(() => {
    const saved = localStorage.getItem(`process_${processId}_keywordString`);
    return saved || '';
  });
  const [searchCompleted, setSearchCompleted] = useState(() => {
    const saved = localStorage.getItem(`process_${processId}_searchCompleted`);
    return saved ? JSON.parse(saved) : false;
  });
  const [isValidating, setIsValidating] = useState(false);
  const [validationCompleted, setValidationCompleted] = useState(() => {
    const saved = localStorage.getItem(`process_${processId}_validationCompleted`);
    return saved ? JSON.parse(saved) : false;
  });
  
  // Persistent validation loading state - read from localStorage on every render
  const isValidatingFromStorage = (() => {
    try {
      const stored = localStorage.getItem(`process_${processId}_isValidating`);
      return stored ? JSON.parse(stored) : false;
    } catch {
      return false;
    }
  })();
  
  // Combined validation loading state
  const isActuallyValidating = isValidating || isValidatingFromStorage;
  
  // Persistent validation completed state - read from localStorage on every render
  // But only if it matches the current validation ID (to avoid showing old results)
  const validationCompletedFromStorage = (() => {
    try {
      const stored = localStorage.getItem(`process_${processId}_validationCompleted`);
      const storedId = localStorage.getItem(`process_${processId}_validationId`);
      const isValidatingStored = localStorage.getItem(`process_${processId}_isValidating`);
      
      // If validation is currently in progress, don't show old completion state
      if (isValidatingStored && JSON.parse(isValidatingStored)) {
        return false;
      }
      
      // Otherwise, return the stored completion state
      return stored ? JSON.parse(stored) : false;
    } catch {
      return false;
    }
  })();
  
  const [validationProgress, setValidationProgress] = useState(() => {
    const saved = localStorage.getItem(`process_${processId}_validationProgress`);
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
    const saved = localStorage.getItem(`process_${processId}_validationRecommendations`);
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  
  // Validation conditions state
  const [selectedValidationConditions, setSelectedValidationConditions] = useState<string[]>(() => {
    const saved = localStorage.getItem(`process_${processId}_selectedValidationConditions`);
    const initialConditions = saved ? JSON.parse(saved) : [
      'Publications',
      'Conflict of Interest',
      'Retraction History'
    ]; // Pre-select common conditions
    
    // Filter out any invalid condition IDs that don't exist in VALIDATION_CONDITIONS
    const validConditions = initialConditions.filter((id: string) => 
      VALIDATION_CONDITIONS.some(c => c.id === id)
    );
    
    // If we filtered out invalid conditions, save the cleaned array
    if (validConditions.length !== initialConditions.length) {
      localStorage.setItem(`process_${processId}_selectedValidationConditions`, JSON.stringify(validConditions));
    }
    
    return validConditions;
  });

  // Get user type from logged-in user (no longer need state)
  const userType = user?.userType || 'SPRINGER'; // Default to SPRINGER if not available

  const [showConditionSelection, setShowConditionSelection] = useState(() => {
    const saved = localStorage.getItem(`process_${processId}_showConditionSelection`);
    return saved ? JSON.parse(saved) : true;
  });
  
  // Ref to prevent auto-check after manual reset
  const validationResetTimestampRef = useRef(0);
  
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
      
      // Check if validation was started recently (within last 30 seconds)
      // If so, skip recommendations check to avoid getting old cached results
      const validationIdStored = localStorage.getItem(`process_${processId}_validationId`);
      const validationStartTime = validationIdStored ? parseInt(validationIdStored) : 0;
      const timeSinceStart = Date.now() - validationStartTime;
      const skipRecommendationsCheck = timeSinceStart < 30000; // Skip for first 30 seconds
      
      if (skipRecommendationsCheck) {
        console.log('[ProcessWorkflow] Validation started recently, skipping recommendations check to avoid old cache');
      }
      
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
            title: process?.title || 'Process',
            description: `Validation Completed Successfully! 🎉\n${description}`,
            duration: 8000,
          });
          
          // Notify global completion
          notifyValidationComplete(validationRecommendations?.data?.reviewers?.length);
          
          return true; // Stop polling
        }
        
        // Handle failure
        if (statusResponse.data.validation_status === 'failed') {
          console.error('[ProcessWorkflow] Validation failed');
          setValidationProgress(prev => ({ ...prev, status: 'failed' }));
          
          toast({
            title: `${process?.title || 'Process'} - Validation Failed`,
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
      
      // Check recommendations only if enough time has passed since validation started
      // This avoids getting old cached results from a previous validation
      if (!skipRecommendationsCheck) {
        console.log('[ProcessWorkflow] Checking recommendations to verify completion status');
        try {
          const recommendations = await scholarFinderApiService.getRecommendations(jobId);
          if (recommendations.data?.reviewers && recommendations.data.reviewers.length > 0) {
            console.log('[ProcessWorkflow] Found recommendations - validation is complete!');
            setValidationCompleted(true);
            setValidationProgress(prev => ({ ...prev, status: 'completed', percentage: 100 }));
            
            // Clear validating state and set completed flag in localStorage
            localStorage.setItem(`process_${processId}_isValidating`, JSON.stringify(false));
            localStorage.setItem(`process_${processId}_validationCompleted`, JSON.stringify(true));
            console.log('[ProcessWorkflow] Set isValidating to false and validationCompleted to true in localStorage');
            
            toast({
              title: `${process?.title || 'Process'} - Validation Completed Successfully! 🎉`,
              description: `Found ${recommendations.data.reviewers.length} recommended reviewers. Results are now available.`,
              duration: 8000,
            });
            
            // Notify global completion
            notifyValidationComplete(recommendations.data.reviewers.length);
            
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
      }
      
      return false; // Continue polling
    } catch (error) {
      console.error('[ProcessWorkflow] Error polling validation progress:', error);
      
      // Don't show error toast for polling failures - validation might still be running
      // Just log the error and continue polling
      return false; // Continue polling despite error
    }
  }, [toast, validationProgress.percentage, validationProgress.processed, processId]);
  
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

  // Check if validation completed while user was away
  useEffect(() => {
    const checkValidationCompletion = async () => {
      // Skip check if we just manually reset (within last 2 seconds)
      const timeSinceReset = Date.now() - validationResetTimestampRef.current;
      if (timeSinceReset < 2000) {
        console.log('[ProcessWorkflow] Skipping validation check after recent manual reset (first useEffect)');
        return;
      }
      
      // Only check if we're in VALIDATION step and validation is not marked as completed
      if (
        process?.currentStep === 'VALIDATION' &&
        !validationCompleted &&
        !isValidating &&
        !isPollingValidation
      ) {
        const jobId = fileService.getJobId(processId);
        if (jobId) {
          // Check if validation was started recently
          const validationIdStored = localStorage.getItem(`process_${processId}_validationId`);
          const validationStartTime = validationIdStored ? parseInt(validationIdStored) : 0;
          const timeSinceStart = Date.now() - validationStartTime;
          
          // If validation was started recently (within 30 seconds), don't check yet
          if (timeSinceStart < 30000) {
            console.log('[ProcessWorkflow] Validation started recently, will not check completion yet');
            return;
          }
          
          try {
            console.log('[ProcessWorkflow] Checking if validation completed while user was away');
            const recommendations = await scholarFinderApiService.getRecommendations(jobId);
            
            if (recommendations.data?.reviewers && recommendations.data.reviewers.length > 0) {
              console.log('[ProcessWorkflow] Validation was completed while away - updating state');
              setValidationCompleted(true);
              setValidationProgress(prev => ({ ...prev, status: 'completed', percentage: 100 }));
              
              toast({
                title: `${process?.title || 'Process'} - Validation Completed! 🎉`,
                description: `Found ${recommendations.data.reviewers.length} recommended reviewers. Results are now available.`,
                duration: 8000,
              });
              
              // Notify global completion
              notifyValidationComplete(recommendations.data.reviewers.length);
            } else if (recommendations.message?.includes('not ready')) {
              console.log('[ProcessWorkflow] Validation still in progress');
              // If validation is still in progress, ensure we're polling
              if (validationProgress.status === 'in_progress' && !isPollingValidation) {
                console.log('[ProcessWorkflow] Resuming polling for in-progress validation');
                startValidationPolling(jobId);
              }
            }
          } catch (error) {
            console.log('[ProcessWorkflow] Could not check validation completion:', error);
            // If we get an error but validation was marked as in progress, resume polling
            if (validationProgress.status === 'in_progress' && !isPollingValidation) {
              console.log('[ProcessWorkflow] Error checking completion, resuming polling');
              startValidationPolling(jobId);
            }
          }
        }
      }
    };

    checkValidationCompletion();
  }, [process?.currentStep, validationCompleted, isValidating, isPollingValidation, validationProgress.status, processId, toast, startValidationPolling, notifyValidationComplete]);
  
  // Monitor for validation completion from localStorage when navigating back
  useEffect(() => {
    const checkValidationCompletionFromStorage = () => {
      // Skip check if we just manually reset (within last 2 seconds)
      const timeSinceReset = Date.now() - validationResetTimestampRef.current;
      if (timeSinceReset < 2000) {
        console.log('[ProcessWorkflow] Skipping validation check after recent manual reset (second useEffect)');
        return;
      }
      
      const isValidatingStored = localStorage.getItem(`process_${processId}_isValidating`);
      const validationCompletedStored = localStorage.getItem(`process_${processId}_validationCompleted`);
      const validationIdStored = localStorage.getItem(`process_${processId}_validationId`);
      
      // If validation is currently in progress, don't load old completion state
      if (isValidatingStored && JSON.parse(isValidatingStored)) {
        console.log('[ProcessWorkflow] Validation in progress from localStorage, restarting polling');
        
        // Clear any stale completion flag since we're validating again
        if (validationCompleted) {
          console.log('[ProcessWorkflow] Clearing stale validationCompleted state');
          setValidationCompleted(false);
        }
        
        // Restart polling if not already active
        if (!isPollingValidation) {
          const jobId = fileService.getJobId(processId);
          if (jobId) {
            // Check if this validation was started recently (within last 30 seconds)
            // If so, don't check recommendations immediately - wait for polling
            const validationStartTime = validationIdStored ? parseInt(validationIdStored) : 0;
            const timeSinceStart = Date.now() - validationStartTime;
            
            if (timeSinceStart < 30000) {
              console.log('[ProcessWorkflow] Validation started recently, will wait before checking recommendations');
              // Just start polling, don't check recommendations yet
              startValidationPolling(jobId);
            } else {
              // Validation has been running for a while, safe to check recommendations
              startValidationPolling(jobId);
            }
          }
        }
        return;
      }
      
      // If validation completed flag is set in storage and validation is NOT in progress, update state
      if (validationCompletedStored && JSON.parse(validationCompletedStored) && !validationCompleted) {
        console.log('[ProcessWorkflow] Validation completed flag found in localStorage, updating state');
        setValidationCompleted(true);
        setValidationProgress(prev => ({ ...prev, status: 'completed', percentage: 100 }));
        return;
      }
    };
    
    // Check immediately on mount
    checkValidationCompletionFromStorage();
  }, [processId, validationCompleted, isPollingValidation, startValidationPolling]);

  // Track the current step for navigation direction detection
  // This updates whenever we view the step, not just when changing steps
  useEffect(() => {
    if (process?.currentStep) {
      const existingPreviousStep = localStorage.getItem(`process_${processId}_previousStep`);
      
      // Always update the previous step to current when viewing a step
      // This ensures proper tracking even when navigating away and back
      console.log('[ProcessWorkflow] Viewing step:', process.currentStep, 'previous was:', existingPreviousStep);
      localStorage.setItem(`process_${processId}_previousStep`, process.currentStep);
    }
  }, [process?.currentStep, processId]);

  // Restore uploadedFile state from uploadResponse when component loads or step changes
  useEffect(() => {
    console.log('[ProcessWorkflow] Restoration check - uploadedFile:', uploadedFile, 'currentStep:', process?.currentStep, 'uploadResponse:', uploadResponse);
    
    // Only restore if uploadedFile is not already set
    if (!uploadedFile && process?.currentStep) {
      // Try to restore from uploadResponse first (most reliable source)
      if (uploadResponse) {
        const fileInfo = extractFileInfo(uploadResponse);
        if (fileInfo) {
          console.log('[ProcessWorkflow] Restoring uploadedFile from uploadResponse:', fileInfo.name);
          setUploadedFile({ 
            name: fileInfo.name, 
            size: fileInfo.size 
          } as File);
        }
      }
      // Fallback: Try to get file info from localStorage if uploadResponse is missing
      else {
        const savedUploadResponse = localStorage.getItem(`process_${processId}_uploadResponse`);
        console.log('[ProcessWorkflow] Checking localStorage for uploadResponse:', savedUploadResponse);
        if (savedUploadResponse) {
          try {
            const parsed = JSON.parse(savedUploadResponse);
            const fileInfo = extractFileInfo(parsed);
            if (fileInfo) {
              console.log('[ProcessWorkflow] Restoring uploadedFile from localStorage:', fileInfo.name);
              setUploadedFile({ 
                name: fileInfo.name, 
                size: fileInfo.size 
              } as File);
              // Also restore uploadResponse state if it's missing
              if (!uploadResponse) {
                console.log('[ProcessWorkflow] Also restoring uploadResponse state from localStorage');
                setUploadResponse(parsed);
              }
            }
          } catch (e) {
            console.warn('[ProcessWorkflow] Failed to parse saved uploadResponse:', e);
          }
        }
      }
    }
  }, [uploadResponse, process?.currentStep, processId]);

  // Check for completed uploads that haven't been notified yet (when user navigates back)
  useEffect(() => {
    // Note: Upload and search completion notifications are now handled by GlobalNotificationProvider
    // This ensures notifications work even when ProcessWorkflow is unmounted (e.g., when on home page)
  }, [processId]);

  // Auto-save workflow state to localStorage
  useEffect(() => {
    if (uploadResponse) {
      console.log('[ProcessWorkflow] Saving uploadResponse to localStorage:', uploadResponse);
      localStorage.setItem(getStorageKey('uploadResponse'), JSON.stringify(uploadResponse));
      
      // Note: Upload completion notification will be triggered by GlobalNotificationProvider
    }
  }, [uploadResponse, processId]);

  // Trigger search completion notification when searchCompleted changes
  useEffect(() => {
    // Note: Search completion notifications are now handled by GlobalNotificationProvider
    // This ensures notifications work even when ProcessWorkflow is unmounted
  }, [searchCompleted, processId]);

  useEffect(() => {
    if (enhancedKeywords) {
      console.log('[ProcessWorkflow] Saving enhancedKeywords to localStorage:', enhancedKeywords);
      localStorage.setItem(getStorageKey('keywords'), JSON.stringify(enhancedKeywords));
    }
  }, [enhancedKeywords, processId]);



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

  useEffect(() => {
    localStorage.setItem(getStorageKey('selectedValidationConditions'), JSON.stringify(selectedValidationConditions));
  }, [selectedValidationConditions, processId]);

  // No longer need to save userType to localStorage since it comes from user profile

  useEffect(() => {
    localStorage.setItem(getStorageKey('showConditionSelection'), JSON.stringify(showConditionSelection));
  }, [showConditionSelection, processId]);

  // Cleanup function to clear localStorage when component unmounts
  useEffect(() => {
    return () => {
      // Optional: Clear localStorage when navigating away (uncomment if desired)
      // const keys = [
      //   'uploadResponse', 'keywords', 'primaryKeywords', 'secondaryKeywords',
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
      'keywords', 'primaryKeywords', 'secondaryKeywords', 'keywordString', 
      'searchCompleted', 'validationCompleted', 'validationProgress', 'validationRecommendations'
    ];
    keys.forEach(key => localStorage.removeItem(getStorageKey(key)));
    
    // Clear notification flags
    localStorage.removeItem(`process_${processId}_uploadNotified`);
    localStorage.removeItem(`process_${processId}_searchNotified`);
  }, [stopValidationPolling, getStorageKey]);

  // Validation condition handlers
  const handleConditionToggle = useCallback((conditionId: string, checked: boolean) => {
    setSelectedValidationConditions(prev => {
      const newConditions = checked 
        ? [...prev, conditionId]
        : prev.filter(id => id !== conditionId);
      
      // Filter out any invalid condition IDs
      const validConditions = newConditions.filter(id => 
        VALIDATION_CONDITIONS.some(c => c.id === id)
      );
      
      // Save to localStorage
      localStorage.setItem(`process_${processId}_selectedValidationConditions`, JSON.stringify(validConditions));
      return validConditions;
    });
  }, [processId]);

  const handleSelectAllConditions = useCallback(() => {
    const allConditions = VALIDATION_CONDITIONS.map(c => c.id);
    setSelectedValidationConditions(allConditions);
    localStorage.setItem(`process_${processId}_selectedValidationConditions`, JSON.stringify(allConditions));
  }, [processId]);

  const handleSelectNoConditions = useCallback(() => {
    setSelectedValidationConditions([]);
    localStorage.setItem(`process_${processId}_selectedValidationConditions`, JSON.stringify([]));
  }, [processId]);

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
      
      // Generate a unique validation ID for this validation run
      const validationId = Date.now().toString();
      
      // Set validating state in localStorage before starting with validation ID
      localStorage.setItem(`process_${processId}_isValidating`, JSON.stringify(true));
      localStorage.setItem(`process_${processId}_validationCompleted`, JSON.stringify(false));
      localStorage.setItem(`process_${processId}_validationId`, validationId);
      console.log('[ProcessWorkflow] Set isValidating to true in localStorage with validationId:', validationId);
      
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
      console.log('[ProcessWorkflow] Selected validation conditions:', selectedValidationConditions);

      // Filter to only valid conditions
      const validConditions = selectedValidationConditions.filter(id => 
        VALIDATION_CONDITIONS.some(c => c.id === id)
      );
      
      console.log('[ProcessWorkflow] Valid validation conditions:', validConditions);

      // Validate that conditions are selected
      if (validConditions.length === 0) {
        toast({
          title: 'No Conditions Selected',
          description: 'Please select at least one validation condition to run.',
          variant: 'destructive',
        });
        return;
      }

      // Check if Sanction Country is selected (user type comes from user profile)
      if (validConditions.includes('Sanction Country') && !userType) {
        toast({
          title: 'User Type Missing',
          description: 'Your user profile is missing a user type. Please contact an administrator.',
          variant: 'destructive',
        });
        return;
      }

      // Call the validate authors API with selected conditions and user's type
      const userTypeForValidation = validConditions.includes('Sanction Country') ? userType : undefined;
      const response = await scholarFinderApiService.validateAuthorsWithConditions(jobId, validConditions, userTypeForValidation);
      
      console.log('[ProcessWorkflow] Validation API response:', response);
      
      // Check if validation completed successfully (our new API returns results immediately)
      if (response.total_authors !== undefined) {
        console.log('[ProcessWorkflow] Validation completed successfully');
        setValidationCompleted(true);
        
        // Clear validating state and set completed flag in localStorage
        localStorage.setItem(`process_${processId}_isValidating`, JSON.stringify(false));
        localStorage.setItem(`process_${processId}_validationCompleted`, JSON.stringify(true));
        console.log('[ProcessWorkflow] Set isValidating to false and validationCompleted to true in localStorage');
        
        // Set validation progress to completed
        setValidationProgress({
          percentage: 100,
          processed: response.total_authors || 0,
          total: response.total_authors || 0,
          criteria: validConditions,
          status: 'completed',
          estimatedCompletion: null
        });
        
        const processedCount = response.total_authors || 0;
        const criteriaCount = validConditions.length;
        
        let description = `Processed ${processedCount} authors against ${criteriaCount} validation criteria.`;
        description += ' Results are now available.';
        
        toast({
          title: `${process?.title || 'Process'} - Validation Completed Successfully! 🎉`,
          description,
          duration: 8000,
        });
        
        // Notify global completion
        notifyValidationComplete();
      } else {
        // Fallback: If response doesn't have total_authors, assume it's still processing
        console.log('[ProcessWorkflow] Validation response unclear, assuming still processing');
        
        // Initialize progress tracking for polling
        setValidationProgress({
          percentage: 0,
          processed: 0,
          total: 0,
          criteria: validConditions,
          status: 'in_progress',
          estimatedCompletion: null
        });
        
        // Start polling for completion
        console.log('[ProcessWorkflow] Starting validation polling');
        
        toast({
          title: 'Validation Started',
          description: `Author validation has started with ${validConditions.length} conditions. This may take several minutes.`,
          duration: 5000,
        });
        
        // Start polling
        startValidationPolling(jobId);
      }
      
    } catch (error: any) {
      console.error('[ProcessWorkflow] Validation error:', error);
      
      // Stop any ongoing polling
      stopValidationPolling();
      
      // Clear validating state in localStorage on error
      localStorage.setItem(`process_${processId}_isValidating`, JSON.stringify(false));
      console.log('[ProcessWorkflow] Set isValidating to false in localStorage after error');
      
      toast({
        title: `${process?.title || 'Process'} - Validation Failed`,
        description: error.message || 'Failed to start author validation. Please try again.',
        variant: 'destructive',
        duration: 8000,
      });
    } finally {
      setIsValidating(false);
      validationInProgressRef.current = false;
    }
  }, [processId, isValidating, isPollingValidation, toast, startValidationPolling, stopValidationPolling, selectedValidationConditions]);

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
        
        // Set timestamp to skip auto-check after reset
        validationResetTimestampRef.current = Date.now();
        
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
        
        // Clear validation-related localStorage keys to prevent stale state
        localStorage.removeItem(`process_${processId}_validationCompleted`);
        localStorage.removeItem(`process_${processId}_isValidating`);
        localStorage.removeItem(`process_${processId}_validationId`);
        localStorage.removeItem(`process_${processId}_validationProgress`);
        localStorage.removeItem(`process_${processId}_validationRecommendations`);
        console.log('[ProcessWorkflow] Cleared validation localStorage keys');
      }
      
      await updateStepMutation.mutateAsync({
        processId: process.id,
        step: newStep,
      });
      
      // Show progress saved notification
      toast({
        title: process.title || 'Process',
        description: `Progress Saved\nMoved to ${newStep.replace('_', ' ').toLowerCase()} step.`,
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
    // Handle file removal (when uploadResponse is null, undefined, or empty array)
    if (!uploadResponse || (Array.isArray(uploadResponse) && uploadResponse.length === 0)) {
      console.log('[ProcessWorkflow] File removal detected, clearing state');
      setUploadResponse(null);
      setUploadedFile(null);
      localStorage.removeItem(getStorageKey('uploadResponse'));
      localStorage.removeItem(`process_${processId}_uploadNotified`); // Clear notification flag
      // Reset all workflow state when file is removed
      resetWorkflowState();
      // Reset to upload step when file is removed
      await handleStepChange('UPLOAD');
      return;
    }
    
    // Handle successful file upload
    console.log('[ProcessWorkflow] File uploaded, saving to state and localStorage:', uploadResponse);
    
    // Save to localStorage FIRST, before setting state
    const storageKey = getStorageKey('uploadResponse');
    console.log('[ProcessWorkflow] Saving to localStorage with key:', storageKey);
    localStorage.setItem(storageKey, JSON.stringify(uploadResponse));
    
    // Verify it was saved
    const saved = localStorage.getItem(storageKey);
    console.log('[ProcessWorkflow] Verified localStorage save:', saved ? 'SUCCESS' : 'FAILED');
    
    // Extract and store job ID from upload response
    const jobId = extractJobId(uploadResponse);
    if (jobId) {
      console.log('[ProcessWorkflow] Extracted job ID:', jobId);
      fileService.setJobId(processId, jobId);
    } else {
      console.warn('[ProcessWorkflow] No job ID found in upload response');
    }
    
    // Extract file info from the response - handle both old and new formats
    const fileInfo = extractFileInfo(uploadResponse);
    
    // Use flushSync to force immediate state updates before any re-renders
    // This prevents React Query refetches from causing renders with stale state
    flushSync(() => {
      console.log('[ProcessWorkflow] Setting uploadResponse state:', uploadResponse);
      setUploadResponse(uploadResponse);
      
      console.log('[ProcessWorkflow] Setting uploadedFile state:', fileInfo);
      setUploadedFile({ name: fileInfo.name, size: fileInfo.size } as File);
    });
    
    // Clear notification flag for new upload
    localStorage.removeItem(`process_${processId}_uploadNotified`);
    
    // Only reset workflow state for steps AFTER upload (keywords, search, validation)
    // Don't clear the upload data itself
    console.log('[ProcessWorkflow] New file uploaded - resetting downstream workflow state');
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
    
    // Clear localStorage for downstream steps only (not upload data)
    const keys = [
      'keywords', 'primaryKeywords', 'secondaryKeywords', 'keywordString', 
      'searchCompleted', 'validationCompleted', 'validationProgress', 'validationRecommendations'
    ];
    keys.forEach(key => localStorage.removeItem(getStorageKey(key)));
    
    // Clear notification flags for downstream steps
    localStorage.removeItem(`process_${processId}_searchNotified`);
    
    // Show notification about workflow reset
      toast({
        title: process?.title || 'Process',
        description: `File Uploaded Successfully\nYou can now proceed with metadata extraction.`,
        duration: 5000,
      });
    
    // Don't automatically move to next step - wait for user to click Next
    // await handleStepChange('METADATA_EXTRACTION');
  }, [handleStepChange, toast, processId, resetWorkflowState, process]);

  const handleKeywordEnhancement = useCallback((keywords: any) => {
    console.log('[ProcessWorkflow] handleKeywordEnhancement called with:', keywords);
    setEnhancedKeywords(keywords);
    // Don't set keywords here - let KeywordEnhancement component manage selections
    
    // Show progress saved notification
    toast({
      title: process?.title || 'Process',
      description: 'Progress Saved\nEnhanced keywords have been saved automatically.',
    });
  }, [toast]);

  const handleKeywordStringChange = useCallback((newKeywordString: string) => {
    console.log('[ProcessWorkflow] Keyword string changed, clearing old search results');
    
    // Update the keyword string
    setKeywordString(newKeywordString);
    
    // Clear search results since keyword string has changed
    // Old search results are no longer valid with new keyword string
    setSearchCompleted(false);
    localStorage.removeItem(`process_${processId}_searchCompleted`);
    localStorage.removeItem(`process_${processId}_searchNotified`); // Clear notification flag
    localStorage.removeItem(`process_${processId}_searchResults`);
    localStorage.removeItem(`process_${processId}_isSearching`);
    localStorage.removeItem(`process_${processId}_searchId`);
    
    // Also clear validation and downstream results since they depend on search
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
    localStorage.removeItem(`process_${processId}_validationCompleted`);
    localStorage.removeItem(`process_${processId}_validationProgress`);
    localStorage.removeItem(`process_${processId}_validationRecommendations`);
    localStorage.removeItem(`process_${processId}_isValidating`);
    localStorage.removeItem(`process_${processId}_validationId`);
  }, [processId]);
  
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
    
    // Set flag and save to localStorage
    setIsEnhancingKeywords(true);
    localStorage.setItem(`process_${processId}_isEnhancingKeywords`, JSON.stringify(true));
    
    try {
      const result = await enhanceKeywordsMutation.mutateAsync({ processId });
      console.log('[ProcessWorkflow] Keyword enhancement successful:', result);
      
      // Save to localStorage immediately
      const keywordsStorageKey = `process_${processId}_keywords`;
      localStorage.setItem(keywordsStorageKey, JSON.stringify(result));
      console.log('[ProcessWorkflow] Saved enhancedKeywords to localStorage with key:', keywordsStorageKey);
      
      // Set state to trigger memo recalculation and UI update
      setEnhancedKeywords(result);
      console.log('[ProcessWorkflow] Set enhancedKeywords state, this should trigger memo recalculation');
      
      // Clear search results since keywords have changed
      // Old search results are no longer valid with new keywords
      console.log('[ProcessWorkflow] Clearing old search results due to new keyword enhancement');
      setSearchCompleted(false);
      localStorage.removeItem(`process_${processId}_searchCompleted`);
      localStorage.removeItem(`process_${processId}_searchNotified`); // Clear notification flag
      localStorage.removeItem(`process_${processId}_searchResults`);
      localStorage.removeItem(`process_${processId}_isSearching`);
      localStorage.removeItem(`process_${processId}_searchId`);
      
      // Also clear validation and downstream results since they depend on search
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
      localStorage.removeItem(`process_${processId}_validationCompleted`);
      localStorage.removeItem(`process_${processId}_validationProgress`);
      localStorage.removeItem(`process_${processId}_validationRecommendations`);
      localStorage.removeItem(`process_${processId}_isValidating`);
      localStorage.removeItem(`process_${processId}_validationId`);
      
      // Clear the enhancing flag
      setIsEnhancingKeywords(false);
      localStorage.removeItem(`process_${processId}_isEnhancingKeywords`);
      
      toast({
        title: process?.title || 'Process',
        description: `Keywords Enhanced\nGenerated ${result.enhanced.length} enhanced keywords and ${result.meshTerms.length} MeSH terms.\nPrevious search results have been cleared.`,
      });
      
      // Notify global completion
      notifyKeywordsComplete();
    } catch (error: any) {
      console.error('[ProcessWorkflow] Keyword enhancement failed:', error);
      
      // Clear the enhancing flag on error
      setIsEnhancingKeywords(false);
      localStorage.removeItem(`process_${processId}_isEnhancingKeywords`);
      
      toast({
        title: 'Enhancement Failed',
        description: error.message || 'Failed to enhance keywords. Please try again.',
        variant: 'destructive',
      });
    }
  }, [processId, enhanceKeywordsMutation, handleKeywordEnhancement, toast, notifyKeywordsComplete]);

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
      
      // Note: Search completion notification will be triggered by GlobalNotificationProvider
    } catch (error) {
      toast({
        title: 'Search failed',
        description: 'Failed to initiate database search. Please try again.',
        variant: 'destructive',
      });
    }
  }, [toast]);

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
        title: process?.title || 'Process',
        description: `Results Loaded & Saved\nFound ${response.data?.reviewers?.length || 0} recommended reviewers.`,
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
        console.log('[ProcessWorkflow] Rendering UPLOAD step with uploadedFile:', memoizedUploadedFile, 'uploadResponse:', effectiveUploadResponse);
        console.log('[ProcessWorkflow] uploadedFile type:', typeof memoizedUploadedFile, 'is null?', memoizedUploadedFile === null);
        return (
          <div className="space-y-4">
            <FileUpload 
              processId={processId}
              processTitle={process.title}
              onFileUpload={handleFileUpload}
              uploadedFile={memoizedUploadedFile}
              uploadResponse={effectiveUploadResponse}
            />
            {memoizedUploadedFile && effectiveUploadResponse && (
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
        // Get file names from upload response for better display
        const fileNames = effectiveUploadResponse 
          ? (Array.isArray(effectiveUploadResponse) 
              ? effectiveUploadResponse.map(file => file.file_name).join(', ')
              : effectiveUploadResponse.file_name || uploadedFile?.name)
          : uploadedFile?.name;
          
        return (
          <div className="space-y-4">
            <DataExtraction 
              processId={processId}
              fileName={fileNames}
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
              isEnhancing={enhanceKeywordsMutation.isPending || isEnhancingKeywords}
              hasEnhanced={!!enhancedKeywordsFromStorage}
              enhancedKeywords={enhancedKeywordsFromStorage}
            />
            {enhancedKeywordsFromStorage && (
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
                console.log('[ProcessWorkflow] onSearchComplete callback called, searchCompleted:', searchCompleted);
                
                // Always ensure searchCompleted is true
                if (!searchCompleted) {
                  console.log('[ProcessWorkflow] Setting searchCompleted to true');
                  setSearchCompleted(true);
                  toast({
                    title: process?.title || 'Process',
                    description: 'Search Completed & Saved\nDatabase search results have been saved automatically.',
                  });
                }
                
                // Note: Search completion notification will be triggered by GlobalNotificationProvider
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
              selectedValidationConditions={selectedValidationConditions}
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
            </CardHeader>
            <CardContent className="space-y-4">
              {!validationCompleted && !validationCompletedFromStorage ? (
                <div className="space-y-6">
                  {/* Validation Conditions Selection */}
                  {showConditionSelection && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <span>Validation Conditions</span>
                        </CardTitle>
                        <CardDescription>
                          Select which validation conditions to apply to the authors
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Select All/None buttons */}
                        <div className="flex gap-2 mb-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSelectAllConditions}
                            disabled={isActuallyValidating || isPollingValidation}
                          >
                            Select All
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSelectNoConditions}
                            disabled={isActuallyValidating || isPollingValidation}
                          >
                            Select None
                          </Button>
                          <div className="ml-auto text-sm text-muted-foreground">
                            {(() => {
                              const validCount = selectedValidationConditions.filter(id => VALIDATION_CONDITIONS.some(c => c.id === id)).length;
                              const totalCount = VALIDATION_CONDITIONS.length;
                              
                              // Debug log to help identify the issue
                              if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
                                console.log('[ValidationConditions] Selected conditions:', selectedValidationConditions);
                                console.log('[ValidationConditions] Valid conditions:', selectedValidationConditions.filter(id => VALIDATION_CONDITIONS.some(c => c.id === id)));
                                console.log('[ValidationConditions] Invalid conditions:', selectedValidationConditions.filter(id => !VALIDATION_CONDITIONS.some(c => c.id === id)));
                              }
                              
                              return `${validCount} of ${totalCount} selected`;
                            })()}
                          </div>
                        </div>

                        {/* Condition checkboxes */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {VALIDATION_CONDITIONS.map((condition) => (
                            <div
                              key={condition.id}
                              className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50"
                            >
                              <Checkbox
                                id={condition.id}
                                checked={selectedValidationConditions.includes(condition.id)}
                                onCheckedChange={(checked) => 
                                  handleConditionToggle(condition.id, checked as boolean)
                                }
                                disabled={isActuallyValidating || isPollingValidation}
                              />
                              <div className="flex-1 space-y-1">
                                <label
                                  htmlFor={condition.id}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                >
                                  {condition.label}
                                </label>
                                <p className="text-xs text-muted-foreground">
                                  {condition.description}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>


                      </CardContent>
                    </Card>
                  )}

                  {/* Validate Authors Button */}
                  <div className="flex flex-col items-center space-y-4">
                    <div className="text-center text-muted-foreground">
                      <p>Click the button below to start author validation with selected conditions.</p>
                      <p className="text-sm">This process may take several minutes to complete.</p>
                    </div>
                    <Button 
                      onClick={handleValidateAuthors}
                      size="lg"
                      className="px-8"
                      disabled={
                        isActuallyValidating || 
                        isPollingValidation || 
                        validationInProgressRef.current || 
                        validationProgress.status === 'in_progress' || 
                        selectedValidationConditions.filter(id => VALIDATION_CONDITIONS.some(c => c.id === id)).length === 0 ||
                        (selectedValidationConditions.includes('Sanction Country') && !userType)
                      }
                    >
                      {isActuallyValidating || isPollingValidation || validationProgress.status === 'in_progress' ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Validating Authors...
                        </>
                      ) : (
                        `Validate Authors (${selectedValidationConditions.filter(id => VALIDATION_CONDITIONS.some(c => c.id === id)).length} conditions selected)`
                      )}
                    </Button>
                    {selectedValidationConditions.filter(id => VALIDATION_CONDITIONS.some(c => c.id === id)).length === 0 && (
                      <p className="text-sm text-muted-foreground text-center">
                        Please select at least one validation condition to proceed
                      </p>
                    )}
                  </div>
                </div>
              ) : null}
              
              {(validationCompleted || validationCompletedFromStorage) ? (
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
                          
                          // Set timestamp to skip auto-check
                          validationResetTimestampRef.current = Date.now();
                          
                          // Reset all validation states
                          setValidationCompleted(false);
                          setIsValidating(false);
                          setValidationProgress({
                            percentage: 0,
                            processed: 0,
                            total: 0,
                            criteria: [],
                            status: 'pending',
                            estimatedCompletion: null
                          });
                          setValidationRecommendations(null);
                          stopValidationPolling();
                          // Reset the validation in progress ref
                          validationInProgressRef.current = false;
                          
                          // Clear from localStorage including validation flags
                          localStorage.removeItem(getStorageKey('validationCompleted'));
                          localStorage.removeItem(getStorageKey('validationProgress'));
                          localStorage.removeItem(getStorageKey('validationRecommendations'));
                          localStorage.removeItem(`process_${processId}_isValidating`);
                          localStorage.removeItem(`process_${processId}_validationCompleted`);
                          localStorage.removeItem(`process_${processId}_validationId`);
                          
                          console.log('[ProcessWorkflow] Validation state reset complete');
                          
                          toast({
                            title: process?.title || 'Process',
                            description: 'Validation Reset\nYou can now start a new validation process.',
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
                          // COI is "Yes" with clickable link when coi_coauthor contains author ID format (A followed by numbers)
                          // COI is "Yes" without clickable link when coi_coauthor is TRUE or True
                          const hasAuthorId = (value: any) => {
                            if (typeof value === 'string') {
                              // Check if string contains author ID pattern: A followed by numbers
                              return /A\d+/.test(value);
                            }
                            return false;
                          };
                          
                          const isTrue = reviewer.coi_coauthor === true || 
                                        reviewer.coi_coauthor === 'TRUE' || 
                                        reviewer.coi_coauthor === 'True' || 
                                        reviewer.coi_coauthor === 'true';
                          
                          const isFalse = reviewer.coi_coauthor === false || 
                                         reviewer.coi_coauthor === 'FALSE' || 
                                         reviewer.coi_coauthor === 'False' || 
                                         reviewer.coi_coauthor === 'false';
                          
                          const coiStatus = isFalse 
                            ? 'No' 
                            : hasAuthorId(reviewer.coi_coauthor) 
                              ? 'Yes' 
                              : isTrue 
                                ? 'Yes' 
                                : 'No';
                          
                          const isClickable = hasAuthorId(reviewer.coi_coauthor);
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
                                    {isClickable ? (
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