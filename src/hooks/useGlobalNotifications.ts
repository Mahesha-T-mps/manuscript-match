/**
 * React hook for global process notifications
 * Provides easy integration with the global notification service
 */

import { useEffect, useCallback } from 'react';
import { 
  globalNotificationService, 
  notifyStepCompletion, 
  notifyStepError, 
  notifyStepProgress,
  type ProcessNotification 
} from '@/services/globalNotificationService';

export const useGlobalNotifications = () => {
  // Start monitoring when hook is used
  useEffect(() => {
    const initializeNotifications = async () => {
      await globalNotificationService.start();
      
      // Clean up old notifications on start
      globalNotificationService.clearOldNotifications();
    };
    
    initializeNotifications();
    
    return () => {
      // Don't stop the service when component unmounts
      // as we want it to run globally across the app
    };
  }, []);

  const addCompletion = useCallback((
    processId: string, 
    processTitle: string, 
    step: string, 
    customMessage?: string
  ) => {
    notifyStepCompletion(processId, processTitle, step, customMessage);
  }, []);

  const addError = useCallback((
    processId: string, 
    processTitle: string, 
    step: string, 
    error: string
  ) => {
    notifyStepError(processId, processTitle, step, error);
  }, []);

  const addProgress = useCallback((
    processId: string, 
    processTitle: string, 
    step: string, 
    progress: string
  ) => {
    notifyStepProgress(processId, processTitle, step, progress);
  }, []);

  const getProcessNotifications = useCallback((processId: string): ProcessNotification[] => {
    return globalNotificationService.getProcessNotifications(processId);
  }, []);

  const clearProcessNotifications = useCallback((processId: string) => {
    globalNotificationService.clearProcessNotifications(processId);
  }, []);

  return {
    addCompletion,
    addError,
    addProgress,
    getProcessNotifications,
    clearProcessNotifications
  };
};

/**
 * Hook specifically for workflow components to notify completions
 */
export const useWorkflowNotifications = (processId: string, processTitle: string) => {
  const { addCompletion, addError, addProgress } = useGlobalNotifications();

  const notifyUploadComplete = useCallback(() => {
    addCompletion(processId, processTitle, 'UPLOAD', 'Document upload completed');
  }, [processId, processTitle, addCompletion]);

  const notifyMetadataComplete = useCallback(() => {
    addCompletion(processId, processTitle, 'METADATA_EXTRACTION', 'Metadata extraction completed');
  }, [processId, processTitle, addCompletion]);

  const notifyKeywordsComplete = useCallback(() => {
    addCompletion(processId, processTitle, 'KEYWORD_ENHANCEMENT', 'Keyword enhancement completed');
  }, [processId, processTitle, addCompletion]);

  const notifySearchComplete = useCallback(() => {
    addCompletion(processId, processTitle, 'DATABASE_SEARCH', 'Database search completed');
  }, [processId, processTitle, addCompletion]);

  const notifyValidationComplete = useCallback((reviewerCount?: number) => {
    const message = reviewerCount 
      ? `Validation completed - ${reviewerCount} reviewers found`
      : 'Validation completed';
    addCompletion(processId, processTitle, 'VALIDATION', message);
  }, [processId, processTitle, addCompletion]);

  const notifyManualSearchComplete = useCallback((authorName?: string) => {
    const message = authorName 
      ? `Manual search completed - ${authorName} added`
      : 'Manual search completed';
    addCompletion(processId, processTitle, 'MANUAL_SEARCH', message);
  }, [processId, processTitle, addCompletion]);

  const notifyRecommendationsComplete = useCallback(() => {
    addCompletion(processId, processTitle, 'RECOMMENDATIONS', 'Recommendations ready');
  }, [processId, processTitle, addCompletion]);

  const notifyStepError = useCallback((step: string, error: string) => {
    addError(processId, processTitle, step, error);
  }, [processId, processTitle, addError]);

  const notifyStepProgress = useCallback((step: string, progress: string) => {
    addProgress(processId, processTitle, step, progress);
  }, [processId, processTitle, addProgress]);

  return {
    notifyUploadComplete,
    notifyMetadataComplete,
    notifyKeywordsComplete,
    notifySearchComplete,
    notifyValidationComplete,
    notifyManualSearchComplete,
    notifyRecommendationsComplete,
    notifyStepError,
    notifyStepProgress
  };
};