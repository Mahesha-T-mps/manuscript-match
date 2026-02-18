import React, { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FileUploadSkeleton } from "@/components/ui/skeleton-components";
import { FileUploadProgress } from "@/components/ui/progress-indicators";
import { Upload, FileText, X, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFileUpload } from "@/hooks/useFiles";
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
  onFileUpload: (uploadResponse: UploadResponse) => void;
  uploadedFile?: File | null;
}

export const FileUpload = ({ processId, processTitle, onFileUpload, uploadedFile }: FileUploadProps) => {
  useRenderPerformance('FileUpload');

  // Debug logging to track uploadedFile prop
  console.log('[FileUpload] Rendered with uploadedFile:', uploadedFile);

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
  const [currentFileName, setCurrentFileName] = useState<string>(() => getUploadState()?.fileName || '');
  const [uploadResponseData, setUploadResponseData] = useState<UploadResponse | null>(null);
  const { toast } = useToast();
  const uploadMutation = useFileUpload();

  // Save upload state to localStorage
  const saveUploadState = (progress: number, status: string, fileName: string) => {
    localStorage.setItem(`upload_progress_${processId}`, JSON.stringify({
      progress,
      status,
      fileName,
      timestamp: Date.now()
    }));
  };

  // Clear upload state from localStorage
  const clearUploadState = () => {
    localStorage.removeItem(`upload_progress_${processId}`);
  };

  // Check if upload completed - clear progress state when uploadedFile is present
  useEffect(() => {
    console.log('[FileUpload] Effect check - uploadedFile:', uploadedFile, 'uploadProgress:', uploadProgress);
    if (uploadedFile && uploadProgress > 0) {
      // Upload completed - clear the progress state
      console.log('[FileUpload] Upload completed, clearing progress state');
      clearUploadState();
      setUploadProgress(0);
      setUploadStatus('idle');
      setCurrentFileName('');
    }
  }, [uploadedFile]);

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

  const handleFile = useCallback(async (file: File) => {
    const validation = validateFileForUpload(file);
    if (!validation.isValid) {
      toast({
        title: "Invalid file",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }

    // Check if file supports metadata extraction
    if (!supportsMetadataExtraction(file.name)) {
      toast({
        title: "Limited metadata extraction",
        description: `${getFileTypeDescription(file.name.split('.').pop() || '')} files may have limited metadata extraction capabilities.`,
        variant: "default",
      });
    }

    try {
      setUploadProgress(0);
      setUploadStatus('uploading');
      setCurrentFileName(file.name);
      saveUploadState(0, 'uploading', file.name);

      const uploadResponse = await uploadMutation.mutateAsync({
        processId,
        file,
        onProgress: (progress) => {
          // Cap upload progress at 90% to leave room for processing
          const adjustedProgress = Math.min(progress * 0.9, 90);
          setUploadProgress(adjustedProgress);
          saveUploadState(adjustedProgress, 'uploading', file.name);
          
          // Only switch to processing when upload is complete (original progress >= 100)
          if (progress >= 100) {
            setUploadStatus('processing');
            setUploadProgress(65); // Show 65% during processing (more realistic for long processing)
            saveUploadState(65, 'processing', file.name);
            
            // If processing takes too long, gradually increase to 75%
            setTimeout(() => {
              if (uploadStatus === 'processing') {
                setUploadProgress(75);
                saveUploadState(75, 'processing', file.name);
              }
            }, 5000);
          }
        }
      });

      setUploadStatus('completed');
      setUploadProgress(100); // Set to 100% only when completely done
      setUploadResponseData(uploadResponse);
      clearUploadState(); // Clear progress state on successful completion
      onFileUpload(uploadResponse);

      // Success toast notification with metadata information
      const metadataInfo = uploadResponse?.metadata?.title
        ? `Metadata extracted successfully: ${uploadResponse.metadata.title}`
        : 'File uploaded successfully';
      
      toast({
        title: processTitle || 'Process',
        description: `File Uploaded Successfully\n${file.name} (${formatFileSize(file.size)})\n${metadataInfo}`,
      });
    } catch (error: any) {
      setUploadStatus('error');
      saveUploadState(uploadProgress, 'error', file.name);
      console.error('File upload error:', error);

      // Map error types to specific user-friendly messages
      let errorMessage = "There was an error uploading your file. Please try again.";

      if (error.type === 'FILE_FORMAT_ERROR') {
        errorMessage = "Please upload a Word document (.doc, .docx)";
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
      // Clear progress indicator and reset to idle state
      setTimeout(() => {
        setUploadProgress(0);
        setUploadStatus('idle');
        setCurrentFileName('');
        clearUploadState();
      }, 3000);
    }
  }, [processId, onFileUpload, toast, uploadMutation, uploadProgress, uploadStatus]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const removeFile = () => {
    // Reset upload state
    setUploadProgress(0);
    setUploadStatus('idle');
    setCurrentFileName('');
    setUploadResponseData(null);
    clearUploadState();
    
    // Notify parent component to clear the uploaded file
    // Pass null or undefined to indicate file removal
    onFileUpload(null as any);
  };

  const handleCancelUpload = () => {
    // Cancel the upload mutation if possible
    setUploadStatus('idle');
    setUploadProgress(0);
    setCurrentFileName('');
    clearUploadState();
  };

  const handleRetryUpload = () => {
    // Clear interrupted state and allow user to upload again
    setUploadStatus('idle');
    setUploadProgress(0);
    setCurrentFileName('');
    clearUploadState();
  };

  const isUploading = uploadMutation.isPending;
  const hasError = uploadMutation.isError;
  
  // Check if there's a saved upload in progress (not completed)
  // Show progress if: progress > 0 AND (progress < 100 OR status is not completed) AND no uploadedFile
  const hasSavedProgress = uploadProgress > 0 && 
                          (uploadProgress < 100 || uploadStatus === 'processing' || uploadStatus === 'uploading') && 
                          uploadStatus !== 'completed' && 
                          !uploadedFile;

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
              <span className="text-muted-foreground">{currentFileName}</span>
              <span className="font-medium">{Math.round(uploadProgress)}%</span>
            </div>
            <Progress value={uploadProgress} className="w-full" />
            <p className="text-sm text-muted-foreground">
              {uploadStatus === 'processing' 
                ? 'Processing and extracting metadata...' 
                : 'Uploading your manuscript...'}
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

  if (uploadedFile) {
    return (
      <Card className="border-accent/20 bg-gradient-to-br from-card to-accent/5">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-accent/10 rounded-lg" aria-hidden="true">
                <CheckCircle className="w-5 h-5 text-accent" />
              </div>
              <div>
                <CardTitle className="text-lg">File Uploaded</CardTitle>
                <CardDescription>Manuscript uploaded successfully</CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={removeFile} aria-label="Remove uploaded file">
              <X className="w-4 h-4" aria-hidden="true" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-3 p-3 bg-background/50 rounded-lg">
            <FileText className="w-5 h-5 text-primary" />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{uploadedFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {formatFileSize(uploadedFile.size)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-dashed border-2">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Upload className="w-5 h-5" aria-hidden="true" />
          <span>Upload Manuscript</span>
        </CardTitle>
        <CardDescription>
          Upload your .doc or .docx manuscript file for peer reviewer analysis
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
                  {uploadStatus === 'uploading' ? 'Uploading manuscript...' : 
                   uploadStatus === 'processing' ? 'Processing and extracting metadata...' : 
                   'Uploading manuscript...'}
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
                    {isDragOver ? "Drop your file here" : "Drag & drop your manuscript"}
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
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isUploading}
                  aria-label="Choose manuscript file to upload"
                  aria-describedby="file-requirements"
                />

                <Button variant="secondary" disabled={isUploading}>
                  Choose File
                </Button>
              </>
            )}
          </div>

          <div id="file-requirements" className="mt-6 text-xs text-muted-foreground">
            <p>Supported formats: {config.supportedFileTypes.join(', ')}</p>
            <p>Maximum file size: {Math.round(config.maxFileSize / (1024 * 1024))}MB</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FileUpload;