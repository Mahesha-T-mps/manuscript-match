import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { Upload, File, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useResponsive } from '../../hooks/useResponsive';
import { useAccessibilityContext } from '../accessibility/AccessibilityProvider';
import { responsiveText, responsiveSpacing } from '../../utils/responsive';
import { getButtonAria, getProgressAria } from '../../utils/accessibility';

export interface FileUploadProps {
  onFileSelect: (files: File[]) => void;
  onFileRemove?: (fileIndex?: number) => void;
  acceptedTypes?: string[];
  maxSize?: number; // in bytes
  maxFiles?: number; // maximum number of files allowed
  isUploading?: boolean;
  uploadProgress?: number;
  error?: string | null;
  disabled?: boolean;
  selectedFiles?: File[];
  className?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  onFileRemove,
  acceptedTypes = ['.doc', '.docx'],
  maxSize = 100 * 1024 * 1024, // 100MB default
  maxFiles = 5, // Allow up to 5 files by default
  isUploading = false,
  uploadProgress = 0,
  error = null,
  disabled = false,
  selectedFiles = [],
  className
}) => {
  const { isMobile, isTablet } = useResponsive();
  const { announceMessage } = useAccessibilityContext();
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    // Check file size
    if (file.size > maxSize) {
      const maxSizeMB = (maxSize / 1024 / 1024).toFixed(1);
      const fileSizeMB = (file.size / 1024 / 1024).toFixed(1);
      return `File size (${fileSizeMB}MB) exceeds maximum allowed size (${maxSizeMB}MB)`;
    }

    // Check file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedTypes.includes(fileExtension)) {
      return `File type ${fileExtension} is not supported. Accepted types: ${acceptedTypes.join(', ')}`;
    }

    return null;
  }, [maxSize, acceptedTypes]);

  const handleFileSelect = useCallback((files: File[]) => {
    console.log('[ScholarFinder FileUpload] handleFileSelect called with files:', files.map(f => f.name));
    if (disabled || isUploading) return;

    const validFiles: File[] = [];
    const errors: string[] = [];

    // Check if adding these files would exceed the maximum
    if (selectedFiles.length + files.length > maxFiles) {
      announceMessage(`Cannot add ${files.length} files. Maximum ${maxFiles} files allowed. Currently have ${selectedFiles.length} files.`, 'assertive');
      return;
    }

    // Validate each file
    for (const file of files) {
      const validationError = validateFile(file);
      if (validationError) {
        errors.push(`${file.name}: ${validationError}`);
      } else {
        validFiles.push(file);
      }
    }

    if (errors.length > 0) {
      announceMessage(`File validation errors: ${errors.join('; ')}`, 'assertive');
      return;
    }

    if (validFiles.length > 0) {
      const newFiles = [...selectedFiles, ...validFiles];
      console.log('[ScholarFinder FileUpload] About to call onFileSelect with newFiles:', newFiles.map(f => f.name));
      announceMessage(`${validFiles.length} file(s) selected. Total: ${newFiles.length}`, 'polite');
      onFileSelect(newFiles);
    }
  }, [disabled, isUploading, validateFile, onFileSelect, announceMessage, selectedFiles, maxFiles]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (disabled || isUploading) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files);
    }
  }, [disabled, isUploading, handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !isUploading) {
      setIsDragOver(true);
    }
  }, [disabled, isUploading]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    // Only set drag over to false if we're leaving the drop zone entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    console.log('[ScholarFinder FileUpload] handleFileInputChange called with files:', files ? Array.from(files).map(f => f.name) : 'null');
    if (files && files.length > 0) {
      handleFileSelect(Array.from(files));
    }
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFileSelect]);

  const handleBrowseClick = useCallback(() => {
    if (!disabled && !isUploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled, isUploading]);

  const handleRemoveFile = useCallback((fileIndex?: number) => {
    if (!disabled && !isUploading && onFileRemove) {
      onFileRemove(fileIndex);
    }
  }, [disabled, isUploading, onFileRemove]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Show selected files if we have any
  if (selectedFiles && selectedFiles.length > 0) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className={cn(
          responsiveSpacing({ xs: '4', sm: '6' }, 'p')
        )}>
          <div className="space-y-4">
            {/* Files List */}
            <div className="space-y-3">
              <div className={cn(
                "flex items-center justify-between",
                responsiveText({ xs: 'sm', sm: 'base' })
              )}>
                <h3 className="font-medium">
                  Selected Files ({selectedFiles.length}/{maxFiles})
                </h3>
                {!isUploading && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveFile()}
                    disabled={disabled}
                    className="text-xs"
                    {...getButtonAria(
                      'Remove all files',
                      undefined,
                      undefined,
                      undefined,
                      disabled
                    )}
                  >
                    Clear All
                  </Button>
                )}
              </div>

              {selectedFiles.map((file, index) => (
                <div key={`${file.name}-${index}`} className={cn(
                  "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 p-4 bg-muted rounded-lg"
                )}>
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                      <File className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn(
                        "font-medium truncate",
                        responsiveText({ xs: 'xs', sm: 'sm' })
                      )}>
                        {file.name}
                      </p>
                      <p className={cn(
                        "text-muted-foreground",
                        responsiveText({ xs: 'xs', sm: 'xs' })
                      )}>
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  
                  {!isUploading && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveFile(index)}
                      disabled={disabled}
                      className="h-8 w-8 p-0 flex-shrink-0 self-start sm:self-center"
                      {...getButtonAria(
                        `Remove ${file.name}`,
                        undefined,
                        undefined,
                        undefined,
                        disabled
                      )}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Add More Files Button */}
            {!isUploading && selectedFiles.length < maxFiles && (
              <Button
                variant="outline"
                onClick={handleBrowseClick}
                disabled={disabled}
                className="w-full"
                {...getButtonAria('Add more files')}
              >
                <Upload className="h-4 w-4 mr-2" />
                Add More Files ({selectedFiles.length}/{maxFiles})
              </Button>
            )}

            {/* Upload Progress */}
            {isUploading && (
              <div className="space-y-2">
                <div className={cn(
                  "flex items-center justify-between",
                  responsiveText({ xs: 'xs', sm: 'sm' })
                )}>
                  <span>Uploading and processing files...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress 
                  value={uploadProgress} 
                  className="h-2 sm:h-3"
                  {...getProgressAria(
                    uploadProgress,
                    0,
                    100,
                    'Files upload progress',
                    `${uploadProgress}% uploaded`
                  )}
                />
              </div>
            )}

            {/* Success State */}
            {!isUploading && !error && (
              <div className={cn(
                "flex items-center space-x-2 text-green-600",
                responsiveText({ xs: 'xs', sm: 'sm' })
              )}>
                <CheckCircle2 className="h-4 w-4" />
                <span>{selectedFiles.length} file(s) ready for processing</span>
              </div>
            )}

            {/* Error State */}
            {error && (
              <Alert variant="destructive" role="alert">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className={cn(
                  responsiveText({ xs: 'xs', sm: 'sm' })
                )}>
                  {error}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show upload area if no file selected
  return (
    <Card className={cn("w-full", className)}>
      <CardContent className={cn(
        responsiveSpacing({ xs: '4', sm: '6' }, 'p')
      )}>
        <div
          className={cn(
            "relative border-2 border-dashed rounded-lg text-center transition-colors",
            responsiveSpacing({ xs: '6', sm: '8' }, 'p'),
            isDragOver && !disabled && !isUploading
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25",
            disabled || isUploading
              ? "opacity-50 cursor-not-allowed"
              : "cursor-pointer hover:border-primary/50 hover:bg-primary/5 focus-within:border-primary focus-within:bg-primary/5"
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleBrowseClick}
          role="button"
          tabIndex={disabled || isUploading ? -1 : 0}
          aria-label="File upload area. Click to browse or drag and drop files here."
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && !disabled && !isUploading) {
              e.preventDefault();
              handleBrowseClick();
            }
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedTypes.join(',')}
            onChange={handleFileInputChange}
            disabled={disabled || isUploading}
            multiple
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            aria-label="File upload input"
            aria-describedby="upload-instructions upload-requirements"
          />

          <div className="space-y-3 sm:space-y-4">
            <div className={cn(
              "mx-auto bg-primary/10 rounded-lg flex items-center justify-center",
              isMobile ? "w-10 h-10" : "w-12 h-12"
            )}>
              <Upload className={cn(
                "text-primary",
                isMobile ? "h-5 w-5" : "h-6 w-6"
              )} />
            </div>

            <div className="space-y-2">
              <h3 className={cn(
                "font-medium",
                responsiveText({ xs: 'base', sm: 'lg' })
              )}>
                {isDragOver ? 'Drop your files here' : 'Upload your manuscripts'}
              </h3>
              <p 
                id="upload-instructions"
                className={cn(
                  "text-muted-foreground",
                  responsiveText({ xs: 'xs', sm: 'sm' })
                )}
              >
                {isMobile ? (
                  <>Tap to select your files</>
                ) : (
                  <>
                    Drag and drop your files here, or{' '}
                    <span className="text-primary font-medium">browse</span> to select
                  </>
                )}
              </p>
            </div>

            <div 
              id="upload-requirements"
              className={cn(
                "space-y-1 text-muted-foreground",
                responsiveText({ xs: 'xs', sm: 'xs' })
              )}
            >
              <p>Supported formats: {acceptedTypes.join(', ')}</p>
              <p>Maximum file size: {(maxSize / 1024 / 1024).toFixed(0)}MB</p>
              <p>Maximum files: {maxFiles}</p>
            </div>

            {!disabled && !isUploading && !isMobile && (
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4 min-h-[44px]"
                tabIndex={-1} // Prevent double focus since parent div is focusable
                {...getButtonAria('Choose files to upload')}
              >
                <Upload className="h-4 w-4 mr-2" />
                Choose Files
              </Button>
            )}
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mt-4" role="alert">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className={cn(
              responsiveText({ xs: 'xs', sm: 'sm' })
            )}>
              {error}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default FileUpload;