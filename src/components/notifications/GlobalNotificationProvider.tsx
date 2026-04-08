/**
 * Global Notification Provider
 * Initializes and manages the global notification service across the entire app
 */

import { useEffect } from 'react';
import { useGlobalNotifications } from '@/hooks/useGlobalNotifications';
import { globalNotificationService } from '@/services/globalNotificationService';
import { processManagementService } from '@/features/scholarfinder/services/processManagementService';

export const GlobalNotificationProvider: React.FC = () => {
  // Initialize global notifications
  useGlobalNotifications();

  useEffect(() => {
    console.log('[GlobalNotificationProvider] Global notification system initialized');
    
    // Helper function to get process title using the same API as useProcess hook
    const getProcessTitle = async (processId: string): Promise<string> => {
      console.log('[GlobalNotificationProvider] getProcessTitle called for:', processId);
      
      // First try the special process title keys (stored by ProcessWorkflow)
      let cachedTitle = localStorage.getItem(`process_title_${processId}`) || 
                       localStorage.getItem(`processTitle_${processId}`);
      
      if (cachedTitle) {
        console.log('[GlobalNotificationProvider] Found process title from ProcessWorkflow:', cachedTitle);
        return cachedTitle;
      }
      
      // Check for process data backup
      const processDataKey = `processData_${processId}`;
      const processDataStr = localStorage.getItem(processDataKey);
      if (processDataStr) {
        try {
          const processData = JSON.parse(processDataStr);
          if (processData?.title && processData?.id === processId) {
            console.log('[GlobalNotificationProvider] Found process title from stored process data:', processData.title);
            return processData.title;
          }
        } catch (e) {
          console.log('[GlobalNotificationProvider] Error parsing process data:', e);
        }
      }
      
      // Fallback to regular cache (but validate it)
      cachedTitle = localStorage.getItem(`process_${processId}_title`);
      
      // If we have a cached title, validate it's not a document title
      if (cachedTitle) {
        // Check if this looks like a document title
        const isLikelyDocumentTitle = cachedTitle.length > 80 || 
          cachedTitle.includes('Enhanced') || 
          cachedTitle.includes('Analysis') || 
          cachedTitle.includes('Control') ||
          cachedTitle.includes('Microstructural') ||
          cachedTitle.includes('Investigation') ||
          cachedTitle.includes('Study') ||
          cachedTitle.includes(':') || // Academic papers often have colons
          cachedTitle.includes('Effect') ||
          cachedTitle.includes('Evaluation') ||
          cachedTitle.includes('Ultrasound') ||
          cachedTitle.includes('Clinical') ||
          cachedTitle.includes('Defect');
          
        if (isLikelyDocumentTitle) {
          console.log('[GlobalNotificationProvider] Cached title appears to be document title, clearing:', cachedTitle.substring(0, 50) + '...');
          localStorage.removeItem(`process_${processId}_title`);
          cachedTitle = null;
        } else {
          console.log('[GlobalNotificationProvider] Found valid cached title for process:', processId, ':', cachedTitle);
          return cachedTitle;
        }
      }
      
      console.log('[GlobalNotificationProvider] No direct cached title found, checking all localStorage keys for process:', processId);
      
      // Since FastAPI doesn't return process titles, we need to rely on frontend data
      // Skip the API call entirely and focus on finding cached frontend data
      console.log('[GlobalNotificationProvider] Skipping API call since backend does not provide process titles');
      
      // Look for any cached process data in localStorage
      const allKeys = Object.keys(localStorage);
      const processDataKeys = allKeys.filter(key => 
        key.includes(processId) && (key.includes('_process') || key.includes('Process') || key.includes('process'))
      );
      
      // Also search for React Query cache that might contain process data
      const queryKeys = allKeys.filter(key => 
        key.includes('query') && key.includes(processId.substring(0, 8))
      );
      
      const allPossibleKeys = [...processDataKeys, ...queryKeys];
      
      console.log('[GlobalNotificationProvider] Searching for cached process data, found keys:', allPossibleKeys);
      
      for (const key of allPossibleKeys) {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            const parsed = JSON.parse(data);
            console.log('[GlobalNotificationProvider] Checking cached data from key:', key, parsed);
            
            // Check various possible data structures, prioritizing actual process data over document data
            let title = null;
            let isProcessData = false;
            
            // First, check if this looks like actual process data (has id, userId, status fields)
            if (parsed?.id === processId && parsed?.userId && parsed?.status) {
              title = parsed.title;
              isProcessData = true;
              console.log('[GlobalNotificationProvider] Found process data with title:', title);
            }
            // Check nested structures for process data
            else if (parsed?.data?.id === processId && parsed?.data?.userId && parsed?.data?.status) {
              title = parsed.data.title;
              isProcessData = true;
              console.log('[GlobalNotificationProvider] Found process data in parsed.data with title:', title);
            }
            // Check state nested structures
            else if (parsed?.state?.data?.id === processId && parsed?.state?.data?.userId) {
              title = parsed.state.data.title;
              isProcessData = true;
              console.log('[GlobalNotificationProvider] Found process data in parsed.state.data with title:', title);
            }
            // Only as last resort, check for generic title fields (might be document data)
            else if (parsed?.title && !parsed?.heading && !parsed?.abstract) {
              title = parsed.title;
              console.log('[GlobalNotificationProvider] Found generic title (not document):', title);
            }
            else if (parsed?.data?.title && !parsed?.data?.heading) {
              title = parsed.data.title;
              console.log('[GlobalNotificationProvider] Found generic title in data:', title);
            }
            // Skip document data (has heading, abstract, authors, etc.)
            else if (parsed?.heading || parsed?.abstract || parsed?.authors || (Array.isArray(parsed) && parsed[0]?.heading)) {
              console.log('[GlobalNotificationProvider] Skipping document data, not process data');
              continue;
            }
            
            if (title && isProcessData) {
              console.log('[GlobalNotificationProvider] Found valid process title from actual process data:', title);
              // Cache it for future use
              localStorage.setItem(`process_${processId}_title`, title);
              return title;
            } else if (title) {
              console.log('[GlobalNotificationProvider] Found potential title but not confirmed as process data:', title);
              // Don't cache uncertain titles, but consider using them if no better option found
            }
          }
        } catch (e) {
          console.log('[GlobalNotificationProvider] Error parsing cached data from key:', key, e);
        }
      }
      
      // Also check React Query cache if available (it might be in sessionStorage or memory)
      try {
        // Check if there's any global process data available
        const allKeys = Object.keys(localStorage);
        const potentialKeys = allKeys.filter(key => 
          key.toLowerCase().includes('process') && key.includes(processId.substring(0, 8))
        );
        console.log('[GlobalNotificationProvider] Also checking potential process keys:', potentialKeys);
        
        for (const key of potentialKeys) {
          const data = localStorage.getItem(key);
          if (data) {
            try {
              const parsed = JSON.parse(data);
              if (parsed?.title) {
                console.log('[GlobalNotificationProvider] Found title in potential key:', key, parsed.title);
                localStorage.setItem(`process_${processId}_title`, parsed.title);
                return parsed.title;
              }
            } catch (e) {
              // Ignore
            }
          }
        }
      } catch (e) {
        // Ignore
      }
      
      console.log('[GlobalNotificationProvider] No cached title found, trying API for process:', processId);
      
      // If not in localStorage, try to fetch from API (same as useProcess hook)
      // Since FastAPI backend doesn't provide process titles, skip API call
      console.log('[GlobalNotificationProvider] Backend API does not provide process titles, using fallback');
      
      // If API call fails, use a more readable fallback
      const fallbackTitle = `Process ${processId.slice(0, 8)}`;
      console.log('[GlobalNotificationProvider] Using fallback title:', fallbackTitle);
      
      // Cache the fallback so we don't keep searching
      localStorage.setItem(`process_${processId}_title`, fallbackTitle);
      return fallbackTitle;
    };
    
    // Monitor for upload completions across all processes
    const monitorUploadCompletions = async () => {
      try {
        // Small delay to allow ProcessWorkflow to load and cache process data
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Get all localStorage keys that match upload response pattern
        const uploadResponseKeys = Object.keys(localStorage).filter(key => 
          key.includes('_uploadResponse') && key.startsWith('process_')
        );
        
        console.log('[GlobalNotificationProvider] Checking upload completions, found keys:', uploadResponseKeys);
        
        for (const uploadResponseKey of uploadResponseKeys) {
          // Extract process ID from key (e.g., "process_123_uploadResponse" -> "123")
          const processIdMatch = uploadResponseKey.match(/^process_(.+)_uploadResponse$/);
          if (!processIdMatch) continue;
          
          const processId = processIdMatch[1];
          const uploadNotifiedKey = `process_${processId}_uploadNotified`;
          
          const savedUploadResponse = localStorage.getItem(uploadResponseKey);
          const uploadNotified = localStorage.getItem(uploadNotifiedKey);
          
          console.log(`[GlobalNotificationProvider] Process ${processId}: hasUploadResponse=${!!savedUploadResponse}, uploadNotified=${!!uploadNotified}`);
          
          // If we have an upload response but haven't notified yet
          if (savedUploadResponse && !uploadNotified) {
            try {
              const uploadResponse = JSON.parse(savedUploadResponse);
              
              console.log(`[GlobalNotificationProvider] Process ${processId}: uploadResponse type=${Array.isArray(uploadResponse) ? 'array' : typeof uploadResponse}, length=${Array.isArray(uploadResponse) ? uploadResponse.length : 'N/A'}`);
              
              // Check if upload response is valid (any array or non-null object indicates completion)
              const isValidUploadResponse = uploadResponse && (
                Array.isArray(uploadResponse) ||
                (typeof uploadResponse === 'object' && uploadResponse !== null)
              );
              
              console.log(`[GlobalNotificationProvider] Process ${processId}: isValidUploadResponse=${isValidUploadResponse}, uploadResponse=${JSON.stringify(uploadResponse)}`);
              
              if (isValidUploadResponse) {
                console.log('[GlobalNotificationProvider] Upload completed for process:', processId);
                
                // Get process title with detailed logging
                console.log('[GlobalNotificationProvider] About to fetch title for process:', processId);
                const processTitle = await getProcessTitle(processId);
                console.log('[GlobalNotificationProvider] Got title for process:', processId, ':', processTitle);
                console.log('[GlobalNotificationProvider] Title type:', typeof processTitle, 'Length:', processTitle?.length);
                console.log('[GlobalNotificationProvider] Creating notification with title:', processTitle);
                
                // Verify this is actually the process title, not document title
                if (processTitle && processTitle.length > 50) {
                  console.warn('[GlobalNotificationProvider] WARNING: Title seems too long for a process title, might be document title:', processTitle);
                }
                
                // Determine if upload had data or was empty
                const hasData = (Array.isArray(uploadResponse) && uploadResponse.length > 0) ||
                               (typeof uploadResponse === 'object' && uploadResponse !== null && Object.keys(uploadResponse).length > 0);
                
                const description = hasData 
                  ? 'Document uploaded and metadata extracted successfully.'
                  : 'Document uploaded successfully. No metadata was extracted.';
                
                const notificationMessage = `${processTitle} - Upload Completed`;
                console.log('[GlobalNotificationProvider] Final notification message:', notificationMessage);
                
                // Add notification directly to the service
                globalNotificationService.addNotification({
                  processId,
                  processTitle,
                  step: 'UPLOAD',
                  type: 'completion',
                  message: notificationMessage,
                  description
                });
                
                // Mark as notified to prevent duplicate notifications
                localStorage.setItem(uploadNotifiedKey, 'true');
                console.log('[GlobalNotificationProvider] Upload notification sent for process:', processId);
              }
            } catch (e) {
              console.warn('[GlobalNotificationProvider] Failed to parse upload response for notification:', e);
            }
          }
        }
      } catch (e) {
        console.warn('[GlobalNotificationProvider] Error in monitorUploadCompletions:', e);
      }
    };

    // Monitor for search completions across all processes (both database and author search)
    const monitorSearchCompletions = async () => {
      try {
        // Get all localStorage keys that match search results pattern
        const searchResultsKeys = Object.keys(localStorage).filter(key => 
          key.includes('_searchResults') && key.startsWith('process_')
        );
        
        console.log('[GlobalNotificationProvider] Checking search completions, found keys:', searchResultsKeys);
        
        for (const searchResultsKey of searchResultsKeys) {
          // Extract process ID from key (e.g., "process_123_searchResults" -> "123")
          const processIdMatch = searchResultsKey.match(/^process_(.+)_searchResults$/);
          if (!processIdMatch) continue;
          
          const processId = processIdMatch[1];
          const searchNotifiedKey = `process_${processId}_searchNotified`;
          const isSearchingKey = `process_${processId}_isSearching`;
          
          const savedSearchResults = localStorage.getItem(searchResultsKey);
          const searchNotified = localStorage.getItem(searchNotifiedKey);
          const isSearching = localStorage.getItem(isSearchingKey);
          
          console.log(`[GlobalNotificationProvider] Process ${processId}: hasResults=${!!savedSearchResults}, notified=${!!searchNotified}, isSearching=${isSearching}`);
          
          // If we have search results, search is not active, and we haven't notified yet
          if (savedSearchResults && !searchNotified) {
            try {
              const searchResults = JSON.parse(savedSearchResults);
              const isSearchingValue = isSearching ? JSON.parse(isSearching) : false;
              
              console.log(`[GlobalNotificationProvider] Process ${processId}: searchResults type=${Array.isArray(searchResults) ? 'array' : typeof searchResults}, isSearchingValue=${isSearchingValue}`);
              
              // Only notify if search is not currently active (completed)
              if (!isSearchingValue && searchResults) {
                console.log(`[GlobalNotificationProvider] Process ${processId}: searchResults structure:`, Object.keys(searchResults));
                
                // Get process title
                const processTitle = await getProcessTitle(processId);
                
                // Check if it's database search results or author search results
                // Both have the same structure: {message, job_id, data, searchId, timestamp}
                // We need to look at the data content to distinguish them
                if (searchResults.message && searchResults.job_id && searchResults.data !== undefined) {
                  console.log('[GlobalNotificationProvider] Search completed (API response format) for process:', processId);
                  
                  // Try to determine if it's database search or author search based on data content
                  let isDatabase = false;
                  let resultCount = 0;
                  
                  if (searchResults.data) {
                    // Database search typically has reviewers_count or total_reviewers in the data
                    if (searchResults.data.reviewers_count !== undefined || searchResults.data.total_reviewers !== undefined) {
                      isDatabase = true;
                      resultCount = searchResults.data.reviewers_count || searchResults.data.total_reviewers || 0;
                    }
                    // Author search typically has preview_reviewers array or similar
                    else if (searchResults.data.preview_reviewers && Array.isArray(searchResults.data.preview_reviewers)) {
                      isDatabase = false;
                      resultCount = searchResults.data.preview_reviewers.length;
                    }
                    else if (Array.isArray(searchResults.data)) {
                      isDatabase = false;
                      resultCount = searchResults.data.length;
                    }
                    else if (searchResults.data.reviewers && Array.isArray(searchResults.data.reviewers)) {
                      isDatabase = false;
                      resultCount = searchResults.data.reviewers.length;
                    }
                    else if (searchResults.data.results && Array.isArray(searchResults.data.results)) {
                      isDatabase = false;
                      resultCount = searchResults.data.results.length;
                    }
                  }
                  
                  if (isDatabase) {
                    console.log('[GlobalNotificationProvider] Database search completed for process:', processId);
                    
                    // Add notification directly to the service
                    globalNotificationService.addNotification({
                      processId,
                      processTitle,
                      step: 'DATABASE_SEARCH',
                      type: 'completion',
                      message: `${processTitle} - Database Search Completed`,
                      description: 'Automated database search finished successfully.'
                    });
                    
                    // Mark as notified to prevent duplicate notifications
                    localStorage.setItem(searchNotifiedKey, 'true');
                    console.log('[GlobalNotificationProvider] Database search notification sent for process:', processId);
                  } else {
                    console.log('[GlobalNotificationProvider] Author search completed for process:', processId);
                    
                    const description = resultCount > 0 
                      ? `Found ${resultCount} potential reviewers.`
                      : 'No potential reviewers found for the current search criteria.';
                    
                    // Add notification directly to the service
                    globalNotificationService.addNotification({
                      processId,
                      processTitle,
                      step: 'AUTHOR_SEARCH',
                      type: 'completion',
                      message: `${processTitle} - Author Search Completed`,
                      description
                    });
                    
                    // Mark as notified to prevent duplicate notifications
                    localStorage.setItem(searchNotifiedKey, 'true');
                    console.log('[GlobalNotificationProvider] Author search notification sent for process:', processId);
                  }
                }
              }
            } catch (e) {
              console.warn('[GlobalNotificationProvider] Failed to parse search results for notification:', e);
            }
          }
        }
      } catch (e) {
        console.warn('[GlobalNotificationProvider] Error in monitorSearchCompletions:', e);
      }
    };

    // Check immediately
    monitorUploadCompletions();
    monitorSearchCompletions();

    // Set up periodic checking every 2 seconds
    const uploadMonitorInterval = setInterval(() => {
      monitorUploadCompletions();
      monitorSearchCompletions();
    }, 2000);

    // Listen for storage changes (when upload, search completes, or search state changes)
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key && event.key.includes('_uploadResponse') && event.newValue) {
        console.log('[GlobalNotificationProvider] Upload response detected via storage event:', event.key);
        setTimeout(() => monitorUploadCompletions(), 100); // Small delay to ensure storage is updated
      } else if (event.key && event.key.includes('_searchResults') && event.newValue) {
        console.log('[GlobalNotificationProvider] Search results detected via storage event:', event.key);
        setTimeout(() => monitorSearchCompletions(), 100); // Small delay to ensure storage is updated
      } else if (event.key && event.key.includes('_isSearching') && event.newValue === 'false') {
        console.log('[GlobalNotificationProvider] Search completion detected via storage event:', event.key);
        setTimeout(() => monitorSearchCompletions(), 100); // Small delay to ensure storage is updated
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(uploadMonitorInterval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // This component doesn't render anything visible
  return null;
};