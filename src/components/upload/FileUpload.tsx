import React, { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FileUploadSkeleton } from "@/components/ui/skeleton-components";
import { FileUploadProgress } from "@/components/ui/progress-indicators";
import { Upload, FileText, X, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFileUpload } from "@/hooks/useFiles";
import { scholarFinderApiService } from "@/features/scholarfinder/services/ScholarFinderApiService";
import { useRenderPerformance } from "@/hooks/usePerformance";
import { config } from "@/lib/config";
import { cn } from "@/lib/utils";
import type { UploadResponse } from "@/types/api";

// Simple file utilities
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileTypeDescription = (extension: string): string => {
  const descriptions: Record<string, string> = {
    'pdf': 'PDF Document',
    'doc': 'Word Document',
    'docx': 'Word Document'
  };
  return descriptions[extension.toLowerCase()] || extension.toUpperCase() + ' File';
};

const supportsMetadataExtraction = (fileName: string): boolean => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  return ['pdf', 'doc', 'docx'].includes(extension || '');
};

interface FileUploadProps {
  processId: string;
  processTitle?: string;
  onFileUpload: (uploadResponse: UploadResponse | UploadResponse[] | null) => void;
  uploadedFiles?: File[];
  uploadedFile?: File | null; // Backward compatibility
  uploadResponse?: UploadResponse | UploadResponse[]; // Upload response data for display
}

export const FileUpload = ({ processId, processTitle, onFileUpload, uploadedFiles = [], uploadedFile, uploadResponse }: FileUploadProps) => {
  useRenderPerformance('FileUpload');

  // Debug logging to track uploadedFiles prop
  console.log('[FileUpload] Rendered with uploadedFiles:', uploadedFiles);
  console.log('[FileUpload] Rendered with uploadedFile (legacy):', uploadedFile);
  console.log('[FileUpload] uploadResponse prop:', uploadResponse);

  // Initialize state from localStorage if available
  const getUploadState = () => {
    const saved = localStorage.getItem(`upload_progress_${processId}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  };

  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(() => getUploadState()?.progress || 0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'completed' | 'error' | 'interrupted'>(
    () => getUploadState()?.status || 'idle'
  );
  const [currentFileNames, setCurrentFileNames] = useState<string[]>(() => getUploadState()?.fileNames || []);
  const [uploadResponseData, setUploadResponseData] = useState<UploadResponse[]>([]);
  const [progressInterval, setProgressInterval] = useState<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const uploadMutation = useFileUpload();

  // Cleanup progress interval on unmount or when starting new upload
  useEffect(() => {
    return () => {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
    };
  }, [progressInterval]);

  // Handle backward compatibility - convert single file to array
  // Priority: uploadResponseData state > uploadResponse prop > legacy uploadedFile/uploadedFiles
  const getEffectiveUploadedFiles = () => {
    // Debug logging
    console.log('[FileUpload] uploadResponseData state:', uploadResponseData);
    
    // If we have uploadResponseData state (from recent upload or restored), use that first
    if (uploadResponseData.length > 0) {
      console.log('[FileUpload] Processing uploadResponseData:', uploadResponseData);
      return uploadResponseData.map(response => {
        // Handle ScholarFinder API format (has data array)
        if (response.data && Array.isArray(response.data)) {
          return response.data.map(item => ({
            name: item.file_name || 'Unknown file',
            size: 0 // ScholarFinder API doesn't provide file size
          }));
        }
        
        // Handle standard format
        return {
          name: response.fileName || response.filename || response.name || response.file_name || 'Unknown file',
          size: response.fileSize || response.file_size || response.size || 0
        };
      }).flat(); // Flatten in case of nested arrays
    }
    
    // If we have uploadResponse prop (from parent), use that
    if (uploadResponse && Array.isArray(uploadResponse) && uploadResponse.length > 0) {
      const responseArray = Array.isArray(uploadResponse) ? uploadResponse : [uploadResponse];
      console.log('[FileUpload] Processing uploadResponse array:', responseArray);
      return responseArray.map(response => {
        console.log('[FileUpload] Processing response item:', response);
        
        // Handle ScholarFinder API format (has data array)
        if (response.data && Array.isArray(response.data)) {
          return response.data.map(item => ({
            name: item.file_name || 'Unknown file',
            size: 0 // ScholarFinder API doesn't provide file size
          }));
        }
        
        // Handle standard format
        return {
          name: response.fileName || response.filename || response.name || response.file_name || 'Unknown file',
          size: response.fileSize || response.file_size || response.size || 0
        };
      }).flat(); // Flatten in case of nested arrays
    }
    
    // Fall back to legacy props
    return uploadedFile ? [uploadedFile] : uploadedFiles;
  };
  
  const effectiveUploadedFiles = getEffectiveUploadedFiles();

  // Save upload state to localStorage
  const saveUploadState = (progress: number, status: string, fileNames: string[]) => {
    localStorage.setItem(`upload_progress_${processId}`, JSON.stringify({
      progress,
      status,
      fileNames,
      timestamp: Date.now()
    }));
  };

  // Clear upload state from localStorage
  const clearUploadState = () => {
    localStorage.removeItem(`upload_progress_${processId}`);
  };

  // Check if upload completed - clear progress state when effectiveUploadedFiles are present
  useEffect(() => {
    console.log('[FileUpload] Effect check - effectiveUploadedFiles:', effectiveUploadedFiles, 'uploadProgress:', uploadProgress);
    if (effectiveUploadedFiles.length > 0 && uploadProgress > 0) {
      // Upload completed - clear the progress state
      console.log('[FileUpload] Upload completed, clearing progress state');
      clearUploadState();
      setUploadProgress(0);
      setUploadStatus('idle');
      setCurrentFileNames([]);
    }
  }, [effectiveUploadedFiles, uploadProgress]);

  // Listen for upload completion via localStorage changes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `process_${processId}_uploadResponse` && e.newValue) {
        try {
          const uploadResponse = JSON.parse(e.newValue);
          console.log('[FileUpload] Detected upload completion via storage event:', uploadResponse);
          
          // Clear progress state and update local state
          clearUploadState();
          setUploadProgress(0);
          setUploadStatus('completed');
          setCurrentFileNames([]);
          
          // Update uploadResponseData to trigger re-render
          const responseArray = Array.isArray(uploadResponse) ? uploadResponse : [uploadResponse];
          setUploadResponseData(responseArray);
        } catch (e) {
          console.warn('[FileUpload] Failed to parse upload response from storage event:', e);
        }
      }
    };

    // Listen for storage changes (when upload completes in another component)
    window.addEventListener('storage', handleStorageChange);
    
    // Also check localStorage on component mount/processId change
    const checkForCompletedUpload = () => {
      const savedUploadResponse = localStorage.getItem(`process_${processId}_uploadResponse`);
      const savedProgressState = localStorage.getItem(`upload_progress_${processId}`);
      
      console.log('[FileUpload] Checking for completed upload - response:', savedUploadResponse ? 'present' : 'null', 'progress:', savedProgressState ? 'present' : 'null');
      
      if (savedUploadResponse && savedProgressState) {
        try {
          const uploadResponse = JSON.parse(savedUploadResponse);
          const progressState = JSON.parse(savedProgressState);
          
          // If we have both upload response and progress state, the upload completed
          // while we were away, so clear progress and show completed state
          console.log('[FileUpload] Found completed upload while away, updating state');
          clearUploadState();
          setUploadProgress(0);
          setUploadStatus('completed');
          setCurrentFileNames([]);
          
          // Update uploadResponseData to trigger re-render
          const responseArray = Array.isArray(uploadResponse) ? uploadResponse : [uploadResponse];
          setUploadResponseData(responseArray);
        } catch (e) {
          console.warn('[FileUpload] Failed to parse saved upload data:', e);
        }
      }
    };

    checkForCompletedUpload();

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [processId]);

  const validateFileForUpload = (file: File): { isValid: boolean; error?: string } => {
    try {
      // Simple inline validation as fallback
      const allowedTypes = ['pdf', 'doc', 'docx'];
      const maxSize = 100 * 1024 * 1024; // 100MB

      const extension = file.name.split('.').pop()?.toLowerCase();

      if (!extension || !allowedTypes.includes(extension)) {
        return {
          isValid: false,
          error: 'Please upload a PDF or Word document (.pdf, .doc, .docx)'
        };
      }

      if (file.size > maxSize) {
        return {
          isValid: false,
          error: 'File size must be less than 100MB'
        };
      }

      if (file.size === 0) {
        return {
          isValid: false,
          error: 'File appears to be empty'
        };
      }

      return { isValid: true };
    } catch (error) {
      console.error('File validation error:', error);
      return {
        isValid: false,
        error: 'File validation failed. Please try again.'
      };
    }
  };

  const handleFiles = useCallback(async (files: File[]) => {
    const validFiles: File[] = [];
    const errors: string[] = [];

    // Validate each file
    for (const file of files) {
      const validation = validateFileForUpload(file);
      if (!validation.isValid) {
        errors.push(`${file.name}: ${validation.error}`);
      } else {
        validFiles.push(file);
      }
    }

    if (errors.length > 0) {
      toast({
        title: "Invalid files",
        description: errors.join('\n'),
        variant: "destructive",
      });
      return;
    }

    if (validFiles.length === 0) return;

    // Check if files support metadata extraction
    const unsupportedFiles = validFiles.filter(file => !supportsMetadataExtraction(file.name));
    if (unsupportedFiles.length > 0) {
      toast({
        title: "Limited metadata extraction",
        description: `Some files may have limited metadata extraction capabilities: ${unsupportedFiles.map(f => f.name).join(', ')}`,
        variant: "default",
      });
    }

    try {
      setUploadProgress(0);
      setUploadStatus('uploading');
      const fileNames = validFiles.map(f => f.name);
      setCurrentFileNames(fileNames);
      saveUploadState(0, 'uploading', fileNames);

      // Create realistic progress simulation
      let currentProgress = 0;
      
      // Clear any existing interval
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      
      // Start gradual progress simulation
      const simulateProgress = () => {
        const interval = setInterval(() => {
          if (currentProgress < 60) {
            // Gradual increase for upload phase (0-60%)
            const increment = Math.random() * 8 + 2; // Random increment between 2-10%
            currentProgress = Math.min(currentProgress + increment, 60);
            setUploadProgress(Math.round(currentProgress));
            saveUploadState(Math.round(currentProgress), 'uploading', fileNames);
          }
        }, 300 + Math.random() * 400); // Random interval between 300-700ms
        
        setProgressInterval(interval);
        return interval;
      };

      const currentInterval = simulateProgress();

      try {
        // Upload all files together using ScholarFinder API
        const response = await scholarFinderApiService.uploadManuscripts(validFiles, processId, (actualProgress) => {
          // When we get actual progress from the API, we can use it to adjust our simulation
          // But we'll still maintain a minimum realistic pace
          if (actualProgress >= 90 && currentProgress < 65) {
            // If API reports near completion but our simulation is still low, speed up
            currentProgress = Math.max(currentProgress, 65);
            setUploadProgress(Math.round(currentProgress));
            saveUploadState(Math.round(currentProgress), 'uploading', fileNames);
          }
        });

        // Clear the progress interval
        if (currentInterval) {
          clearInterval(currentInterval);
          setProgressInterval(null);
        }

        // Upload completed, move to processing phase
        setUploadStatus('processing');
        currentProgress = Math.max(currentProgress, 70); // Ensure we're at least at 70%
        setUploadProgress(currentProgress);
        saveUploadState(currentProgress, 'processing', fileNames);
        
        // Gradually increase progress from current to 95% over processing phase
        const processingSteps = [75, 80, 85, 90, 95];
        for (let i = 0; i < processingSteps.length; i++) {
          await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 400)); // 400-800ms delay
          if (processingSteps[i] > currentProgress) {
            currentProgress = processingSteps[i];
            setUploadProgress(currentProgress);
            saveUploadState(currentProgress, 'processing', fileNames);
          }
        }

        // Final completion
        await new Promise(resolve => setTimeout(resolve, 300)); // Brief pause before completion
        setUploadStatus('completed');
        setUploadProgress(100);
        
        // Handle both single response and array response
        const responseArray = Array.isArray(response) ? response : [response];
        setUploadResponseData(responseArray);
        clearUploadState();
        
        // Call the callback with response
        onFileUpload(response);

        // Success toast notification
        const totalSize = validFiles.reduce((sum, file) => sum + file.size, 0);
        toast({
          title: processTitle || 'Process',
          description: `${validFiles.length} file(s) uploaded successfully\nTotal size: ${formatFileSize(totalSize)}`,
        });
      } catch (uploadError) {
        // Clear the progress interval on upload error
        if (currentInterval) {
          clearInterval(currentInterval);
          setProgressInterval(null);
        }
        throw uploadError; // Re-throw to be caught by outer catch
      }
    } catch (error: any) {
      setUploadStatus('error');
      saveUploadState(uploadProgress, 'error', currentFileNames);
      console.error('File upload error:', error);

      // Map error types to specific user-friendly messages
      let errorMessage = "There was an error uploading your files. Please try again.";

      if (error.type === 'FILE_FORMAT_ERROR') {
        errorMessage = "Please upload Word documents (.doc, .docx)";
      } else if (error.type === 'NETWORK_ERROR') {
        errorMessage = "Network error. Please check your connection and try again.";
      } else if (error.type === 'TIMEOUT_ERROR') {
        errorMessage = "The upload operation timed out. This may be due to large file processing or high server load. Please try again.";
      } else if (error.type === 'EXTERNAL_API_ERROR') {
        errorMessage = "ScholarFinder API is temporarily unavailable. Please try again in a few minutes.";
      } else if (error.type === 'VALIDATION_ERROR') {
        errorMessage = error.message;
      } else if (error.type === 'SERVER_ERROR') {
        errorMessage = "Server error. Please try again later.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive",
      });

      // Reset error state to allow user to retry immediately
      setTimeout(() => {
        setUploadProgress(0);
        setUploadStatus('idle');
        setCurrentFileNames([]);
        clearUploadState();
      }, 3000);
    }
  }, [processId, onFileUpload, toast, uploadMutation, uploadProgress, currentFileNames]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFiles(files);
    }
  }, [handleFiles]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(Array.from(files));
    }
  };

  const removeFiles = () => {
    // Reset upload state
    setUploadProgress(0);
    setUploadStatus('idle');
    setCurrentFileNames([]);
    setUploadResponseData([]);
    clearUploadState();
    
    // Notify parent component to clear the uploaded files
    onFileUpload(null);
  };

  const handleCancelUpload = () => {
    // Cancel the upload mutation if possible
    if (progressInterval) {
      clearInterval(progressInterval);
      setProgressInterval(null);
    }
    setUploadStatus('idle');
    setUploadProgress(0);
    setCurrentFileNames([]);
    clearUploadState();
  };

  const handleRetryUpload = () => {
    // Clear interrupted state and allow user to upload again
    if (progressInterval) {
      clearInterval(progressInterval);
      setProgressInterval(null);
    }
    setUploadStatus('idle');
    setUploadProgress(0);
    setCurrentFileNames([]);
    clearUploadState();
  };

  const isUploading = uploadMutation.isPending;
  const hasError = uploadMutation.isError;
  
  // Check if there's a saved upload in progress (not completed)
  // Show progress if: progress > 0 AND (progress < 100 OR status is not completed) AND no effectiveUploadedFiles AND no uploadResponseData
  const hasSavedProgress = uploadProgress > 0 && 
                          (uploadProgress < 100 || uploadStatus === 'processing' || uploadStatus === 'uploading') && 
                          uploadStatus !== 'completed' && 
                          effectiveUploadedFiles.length === 0 &&
                          uploadResponseData.length === 0;

  // Show upload in progress state if there's saved progress and upload is incomplete
  if (hasSavedProgress && !isUploading) {
    return (
      <Card className="border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/20">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
              <Upload className="w-5 h-5 text-blue-600 dark:text-blue-500 animate-pulse" />
            </div>
            <div>
              <CardTitle className="text-lg">Upload In Progress</CardTitle>
              <CardDescription>Processing your manuscript</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {currentFileNames.length > 0 ? `${currentFileNames.length} files` : 'Processing files...'}
              </span>
              <span className="font-medium">{Math.round(uploadProgress)}%</span>
            </div>
            <Progress value={uploadProgress} className="w-full" />
            <p className="text-sm text-muted-foreground">
              {uploadStatus === 'processing' 
                ? (uploadProgress < 80 
                    ? 'Processing files and extracting metadata...' 
                    : 'Finalizing metadata extraction...')
                : (uploadProgress < 30 
                    ? 'Uploading your manuscripts...' 
                    : uploadProgress < 70 
                    ? 'Upload in progress...' 
                    : 'Upload complete, processing...')}
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleRetryUpload} variant="outline" className="flex-1">
              Cancel & Upload New File
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (effectiveUploadedFiles.length > 0) {
    return (
      <Card className="border-accent/20 bg-gradient-to-br from-card to-accent/5">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-accent/10 rounded-lg" aria-hidden="true">
                <CheckCircle className="w-5 h-5 text-accent" />
              </div>
              <div>
                <CardTitle className="text-lg">{effectiveUploadedFiles.length} File(s) Uploaded</CardTitle>
                <CardDescription>Manuscripts uploaded successfully</CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={removeFiles} aria-label="Remove uploaded files">
              <X className="w-4 h-4" aria-hidden="true" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {effectiveUploadedFiles.map((file, index) => (
            <div key={index} className="flex items-center space-x-3 p-3 bg-background/50 rounded-lg">
              <FileText className="w-5 h-5 text-primary" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{file.name}</p>
                {file.size > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(file.size)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-dashed border-2">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Upload className="w-5 h-5" aria-hidden="true" />
          <span>Upload Manuscripts</span>
        </CardTitle>
        <CardDescription>
          Upload your .doc or .docx manuscript files for peer reviewer analysis
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            "relative border-2 border-dashed rounded-lg p-8 text-center transition-colors",
            isDragOver ? "border-primary bg-primary/5" : "border-border",
            isUploading && "pointer-events-none opacity-50",
            hasError && "border-destructive/50 bg-destructive/5"
          )}
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          role="region"
          aria-label="File upload area"
        >
          <div className="flex flex-col items-center space-y-4">
            <div className={cn(
              "flex items-center justify-center w-16 h-16 rounded-full",
              hasError ? "bg-destructive/10" : "bg-primary/10"
            )}>
              {hasError ? (
                <AlertCircle className="w-8 h-8 text-destructive" />
              ) : (
                <FileText className="w-8 h-8 text-primary" />
              )}
            </div>

            {isUploading ? (
              <div className="space-y-3 w-full max-w-xs">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm font-medium">
                  {uploadStatus === 'uploading' 
                    ? (uploadProgress < 30 
                        ? 'Uploading manuscripts...' 
                        : uploadProgress < 70 
                        ? 'Upload in progress...' 
                        : 'Upload complete, processing...')
                    : uploadStatus === 'processing' 
                    ? (uploadProgress < 80 
                        ? 'Processing and extracting metadata...' 
                        : 'Finalizing metadata extraction...')
                    : 'Uploading manuscripts...'}
                </p>
                <div className="space-y-2">
                  <Progress value={uploadProgress} className="w-full" />
                  <p className="text-xs text-muted-foreground">
                    {uploadStatus === 'uploading' ? `${Math.round(uploadProgress)}% uploaded` :
                     uploadStatus === 'processing' ? 'Processing document...' :
                     `${Math.round(uploadProgress)}% complete`}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <p className="text-lg font-medium">
                    {isDragOver ? "Drop your files here" : "Drag & drop your manuscripts"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    or click to browse files
                  </p>
                  {hasError && (
                    <p className="text-sm text-destructive">
                      Upload failed. Please try again.
                    </p>
                  )}
                </div>

                <input
                  type="file"
                  accept={config.supportedFileTypes.map(type => `.${type}`).join(',')}
                  onChange={handleFileInput}
                  multiple
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isUploading}
                  aria-label="Choose manuscript files to upload"
                  aria-describedby="file-requirements"
                />

                <Button variant="secondary" disabled={isUploading}>
                  Choose Files
                </Button>
              </>
            )}
          </div>

          <div id="file-requirements" className="mt-6 text-xs text-muted-foreground">
            <p>Supported formats: {config.supportedFileTypes.join(', ')}</p>
            <p>Maximum file size: {Math.round(config.maxFileSize / (1024 * 1024))}MB per file</p>
            <p>Maximum files: 5</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FileUpload;