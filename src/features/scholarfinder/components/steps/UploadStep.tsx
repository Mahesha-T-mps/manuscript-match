import React, { useState, useCallback } from 'react';
import { StepComponentProps } from '../../types/workflow';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileUpload } from '../common/FileUpload';
import { useScholarFinderApi } from '../../hooks/useScholarFinderApi';
import { useUpdateProcessStep } from '../../hooks/useProcessManagement';
import { ProcessStep } from '../../types/process';
import { cn } from '@/lib/utils';
import { FileText, AlertCircle, CheckCircle2, Upload } from 'lucide-react';
import type { UploadResponse } from '../../types/api';
import { useResponsive } from '../../hooks/useResponsive';
import { useAccessibilityContext } from '../accessibility/AccessibilityProvider';
import { responsiveText, responsiveSpacing, responsiveFormLayout } from '../../utils/responsive';
import { getButtonAria } from '../../utils/accessibility';

interface UploadStepProps extends StepComponentProps {}

export const UploadStep: React.FC<UploadStepProps> = ({
  processId,
  jobId,
  onNext,
  onPrevious,
  isLoading: externalLoading = false,
  stepData
}) => {
  const { isMobile, isTablet } = useResponsive();
  const { announceMessage } = useAccessibilityContext();
  
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(() => {
    // Initialize upload progress from localStorage if available
    const saved = localStorage.getItem(`upload_progress_${processId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.progress || 0;
      } catch (e) {
        return 0;
      }
    }
    return 0;
  });
  const [uploadResponses, setUploadResponses] = useState<UploadResponse[]>([]);
  
  const { uploadManuscripts } = useScholarFinderApi();
  const updateProcessStep = useUpdateProcessStep();
  
  const isUploading = uploadManuscripts.isPending;
  const isLoading = externalLoading || isUploading;

  // File validation configuration
  const acceptedTypes = ['.doc', '.docx'];
  const maxFileSize = 100 * 1024 * 1024; // 100MB

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

  // Check if we have completed upload data and clear progress state
  useEffect(() => {
    // If we have upload responses (completed upload) but still showing progress, clear it
    if (uploadResponses.length > 0 && uploadProgress > 0) {
      console.log('[UploadStep] Upload completed, clearing progress state');
      clearUploadState();
      setUploadProgress(0);
    }
  }, [uploadResponses, uploadProgress]);

  // Check for existing upload data from stepData on mount/processId change
  useEffect(() => {
    if (stepData?.files && stepData.files.length > 0) {
      console.log('[UploadStep] Found existing upload data in stepData:', stepData);
      // Clear any lingering progress state since we have completed data
      clearUploadState();
      setUploadProgress(0);
      setUploadError(null);
      
      // Create mock upload response from stepData for display
      const mockResponse = {
        data: stepData.files.map(file => ({
          file_name: file.fileName,
          heading: file.extractedMetadata?.title || '',
          authors: file.extractedMetadata?.authors || [],
          affiliations: file.extractedMetadata?.affiliations || [],
          keywords: file.extractedMetadata?.keywords || '',
          abstract: file.extractedMetadata?.abstract || '',
          author_aff_map: file.extractedMetadata?.authorAffiliationMap || {}
        }))
      };
      setUploadResponses([mockResponse]);
    }
  }, [stepData, processId]);

  // Listen for upload completion notifications and update state
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `process_${processId}_uploadResponse` && e.newValue) {
        try {
          const uploadResponse = JSON.parse(e.newValue);
          console.log('[UploadStep] Detected upload completion via storage event:', uploadResponse);
          
          // Clear progress state and show completed upload
          clearUploadState();
          setUploadProgress(0);
          setUploadError(null);
          setUploadResponses([uploadResponse]);
          
          // Announce completion
          announceMessage('Upload completed successfully', 'polite');
        } catch (e) {
          console.warn('[UploadStep] Failed to parse upload response from storage event:', e);
        }
      }
    };

    // Listen for storage changes (when upload completes on another tab/component)
    window.addEventListener('storage', handleStorageChange);
    
    // Also check localStorage on component mount in case upload completed while away
    const checkForCompletedUpload = () => {
      const savedUploadResponse = localStorage.getItem(`process_${processId}_uploadResponse`);
      const savedProgressState = localStorage.getItem(`upload_progress_${processId}`);
      
      if (savedUploadResponse && savedProgressState) {
        try {
          const uploadResponse = JSON.parse(savedUploadResponse);
          const progressState = JSON.parse(savedProgressState);
          
          // If we have both upload response and progress state, the upload completed
          // while we were away, so clear progress and show completed state
          console.log('[UploadStep] Found completed upload while away, updating state');
          clearUploadState();
          setUploadProgress(0);
          setUploadError(null);
          setUploadResponses([uploadResponse]);
        } catch (e) {
          console.warn('[UploadStep] Failed to parse saved upload data:', e);
        }
      }
    };

    checkForCompletedUpload();

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [processId, announceMessage]);

  const handleFileSelect = useCallback(async (files: File[]) => {
    console.log('[UploadStep] handleFileSelect called with files:', files.map(f => f.name));
    setUploadError(null);
    setUploadProgress(0);
    setUploadResponses([]);
    clearUploadState(); // Clear any previous progress state

    // Validate files
    for (const file of files) {
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!acceptedTypes.includes(fileExtension)) {
        setUploadError(`File type ${fileExtension} is not supported. Please upload .doc or .docx files.`);
        setSelectedFiles([]);
        return;
      }

      if (file.size > maxFileSize) {
        const maxSizeMB = (maxFileSize / 1024 / 1024).toFixed(1);
        const fileSizeMB = (file.size / 1024 / 1024).toFixed(1);
        setUploadError(`File ${file.name} size (${fileSizeMB}MB) exceeds maximum allowed size (${maxSizeMB}MB).`);
        setSelectedFiles([]);
        return;
      }
    }

    // Files are valid, set them
    setSelectedFiles(files);

    // Start uploading files
    try {
      // Update progress for uploading
      setUploadProgress(10);
      const fileNames = files.map(f => f.name);
      saveUploadState(10, 'uploading', fileNames);

      console.log('[UploadStep] About to call uploadManuscripts.mutateAsync with files:', files.map(f => f.name));
      const response = await uploadManuscripts.mutateAsync(files);
      
      // Complete progress
      setUploadProgress(100);
      setUploadResponses([response]);
      
      // Clear upload progress state since upload is complete
      clearUploadState();

      // All files uploaded successfully
      announceMessage(`${files.length} file(s) uploaded and processed successfully`, 'polite');

      // Update process with the combined data from all files
      // Use the first file's job_id as the primary one
      if (response.data.length > 0) {
        const primaryFile = response.data[0];
        await updateProcessStep.mutateAsync({
          processId,
          step: ProcessStep.UPLOAD,
          stepData: {
            jobId: primaryFile.job_id,
            files: response.data.map((fileData, index) => ({
              fileName: fileData.file_name,
              fileSize: files[index]?.size || 0,
              extractedMetadata: {
                title: fileData.heading,
                authors: fileData.authors,
                affiliations: fileData.affiliations,
                keywords: fileData.keywords,
                abstract: fileData.abstract,
                authorAffiliationMap: fileData.author_aff_map
              }
            }))
          }
        });
      }

    } catch (error: any) {
      setUploadProgress(0);
      clearUploadState(); // Clear progress state on error
      const errorMessage = error.message || 'Upload failed. Please try again.';
      setUploadError(errorMessage);
      announceMessage(`Upload failed: ${errorMessage}`, 'assertive');
      console.error('Upload error:', error);
    }
  }, [uploadManuscripts, updateProcessStep, processId, acceptedTypes, maxFileSize, announceMessage, saveUploadState, clearUploadState]);

  const handleFileRemove = useCallback((fileIndex?: number) => {
    if (typeof fileIndex === 'number') {
      // Remove specific file
      const newFiles = selectedFiles.filter((_, index) => index !== fileIndex);
      setSelectedFiles(newFiles);
    } else {
      // Remove all files
      setSelectedFiles([]);
    }
    setUploadError(null);
    setUploadProgress(0);
    setUploadResponses([]);
    clearUploadState(); // Clear any saved progress state
  }, [selectedFiles, clearUploadState]);

  const handleNext = useCallback(() => {
    if (uploadResponses.length > 0 && uploadResponses[0].data.length > 0) {
      const response = uploadResponses[0];
      const primaryFile = response.data[0];
      onNext({
        jobId: primaryFile.job_id,
        files: response.data.map((fileData, index) => ({
          fileName: fileData.file_name,
          extractedMetadata: {
            title: fileData.heading,
            authors: fileData.authors,
            affiliations: fileData.affiliations,
            keywords: fileData.keywords,
            abstract: fileData.abstract,
            authorAffiliationMap: fileData.author_aff_map
          }
        }))
      });
    }
  }, [uploadResponses, onNext]);

  const canProceed = uploadResponses.length > 0 && uploadResponses[0].data.length > 0 && !isLoading;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Step Header */}
      <Card>
        <CardHeader className={cn(
          responsiveSpacing({ xs: '4', sm: '6' }, 'p')
        )}>
          <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg self-start">
              <Upload className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className={cn(
                responsiveText({ xs: 'lg', sm: 'xl' })
              )}>
                Upload Manuscripts
              </CardTitle>
              <CardDescription className={cn(
                responsiveText({ xs: 'sm', sm: 'base' })
              )}>
                Upload your manuscript files to begin the reviewer identification process
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* File Upload Area */}
      <FileUpload
        onFileSelect={handleFileSelect}
        onFileRemove={handleFileRemove}
        acceptedTypes={acceptedTypes}
        maxSize={maxFileSize}
        maxFiles={5}
        isUploading={isUploading}
        uploadProgress={uploadProgress}
        error={uploadError}
        disabled={isLoading}
        selectedFiles={selectedFiles}
      />

      {/* Upload Success - Extracted Metadata Preview */}
      {uploadResponses.length > 0 && !isUploading && (
        <Card>
          <CardHeader className={cn(
            responsiveSpacing({ xs: '4', sm: '6' }, 'p')
          )}>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              <CardTitle className={cn(
                responsiveText({ xs: 'base', sm: 'lg' })
              )}>
                Upload Successful
              </CardTitle>
            </div>
            <CardDescription className={cn(
              responsiveText({ xs: 'sm', sm: 'base' })
            )}>
              Your manuscripts have been uploaded and processed. Here's what we extracted:
            </CardDescription>
          </CardHeader>
          <CardContent className={cn(
            "space-y-6",
            responsiveSpacing({ xs: '4', sm: '6' }, 'p')
          )}>
            {uploadResponses.length > 0 && uploadResponses[0].data.map((fileData, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center space-x-2 border-b pb-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <h4 className={cn(
                    "font-medium",
                    responsiveText({ xs: 'sm', sm: 'base' })
                  )}>
                    {fileData.file_name || `File ${index + 1}`}
                  </h4>
                </div>
                
                <div className={cn(
                  responsiveFormLayout({ xs: 1, lg: 2 }, { xs: '4', lg: '6' })
                )}>
                  {/* Title */}
                  <div>
                    <label className={cn(
                      "font-medium text-muted-foreground block mb-2",
                      responsiveText({ xs: 'xs', sm: 'sm' })
                    )}>
                      Title
                    </label>
                    <p className={cn(
                      "p-3 bg-muted rounded-md",
                      responsiveText({ xs: 'xs', sm: 'sm' })
                    )}>
                      {fileData.heading || 'No title extracted'}
                    </p>
                  </div>

                  {/* Authors */}
                  <div>
                    <label className={cn(
                      "font-medium text-muted-foreground block mb-2",
                      responsiveText({ xs: 'xs', sm: 'sm' })
                    )}>
                      Authors
                    </label>
                    <div className="p-3 bg-muted rounded-md">
                      {fileData.authors && fileData.authors.length > 0 ? (
                        <div className="space-y-1">
                          {fileData.authors.map((author, authorIndex) => (
                            <div key={authorIndex} className={cn(
                              responsiveText({ xs: 'xs', sm: 'sm' })
                            )}>
                              <span className="font-medium">{author}</span>
                              {fileData.author_aff_map[author] && (
                                <span className="text-muted-foreground ml-2 block sm:inline">
                                  {isMobile ? '' : '- '}{fileData.author_aff_map[author]}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className={cn(
                          "text-muted-foreground",
                          responsiveText({ xs: 'xs', sm: 'sm' })
                        )}>
                          No authors extracted
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Keywords */}
                  <div>
                    <label className={cn(
                      "font-medium text-muted-foreground block mb-2",
                      responsiveText({ xs: 'xs', sm: 'sm' })
                    )}>
                      Keywords
                    </label>
                    <p className={cn(
                      "p-3 bg-muted rounded-md",
                      responsiveText({ xs: 'xs', sm: 'sm' })
                    )}>
                      {fileData.keywords || 'No keywords extracted'}
                    </p>
                  </div>

                  {/* Abstract Preview */}
                  <div className="lg:col-span-2">
                    <label className={cn(
                      "font-medium text-muted-foreground block mb-2",
                      responsiveText({ xs: 'xs', sm: 'sm' })
                    )}>
                      Abstract
                    </label>
                    <div className="p-3 bg-muted rounded-md">
                      {fileData.abstract ? (
                        <p className={cn(
                          responsiveText({ xs: 'xs', sm: 'sm' })
                        )}>
                          {fileData.abstract.length > (isMobile ? 150 : 200)
                            ? `${fileData.abstract.substring(0, isMobile ? 150 : 200)}...`
                            : fileData.abstract
                          }
                        </p>
                      ) : (
                        <p className={cn(
                          "text-muted-foreground",
                          responsiveText({ xs: 'xs', sm: 'sm' })
                        )}>
                          No abstract extracted
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription className={cn(
                responsiveText({ xs: 'xs', sm: 'sm' })
              )}>
                You'll be able to review and edit this information in the next step.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Upload Error */}
      {uploadError && (
        <Alert variant="destructive" role="alert">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className={cn(
            responsiveText({ xs: 'xs', sm: 'sm' })
          )}>
            {uploadError}
          </AlertDescription>
        </Alert>
      )}

      {/* Navigation */}
      <div className={cn(
        "flex flex-col sm:flex-row sm:justify-between gap-4 sm:gap-0 pt-4 sm:pt-6"
      )}>
        <Button
          variant="outline"
          onClick={onPrevious}
          disabled={isLoading}
          className="min-h-[44px] order-2 sm:order-1"
          {...getButtonAria(
            'Go to previous step',
            undefined,
            undefined,
            undefined,
            isLoading
          )}
        >
          Previous
        </Button>

        <Button
          onClick={handleNext}
          disabled={!canProceed}
          className={cn(
            "min-h-[44px] order-1 sm:order-2",
            canProceed && "bg-green-600 hover:bg-green-700"
          )}
          {...getButtonAria(
            canProceed ? 'Continue to next step' : 'Upload file to continue',
            undefined,
            undefined,
            undefined,
            !canProceed
          )}
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              <span>{isUploading ? 'Uploading...' : 'Processing...'}</span>
            </>
          ) : canProceed ? (
            'Continue'
          ) : (
            isMobile ? 'Upload Files' : 'Upload Files to Continue'
          )}
        </Button>
      </div>
    </div>
  );
};

export default UploadStep;