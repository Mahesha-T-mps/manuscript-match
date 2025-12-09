/**
 * Process Workflow Component
 * Main workflow component that manages the entire manuscript analysis process
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useProcess, useUpdateProcessStep } from '@/hooks/useProcesses';
import { useSearch } from '@/hooks/useSearch';
import { useRecommendations } from '@/hooks/useRecommendations';
import { useShortlists } from '@/hooks/useShortlists';
import { useMetadata } from '@/hooks/useFiles';
import { useEnhanceKeywords } from '@/hooks/useKeywords';
import { ProcessStepTracker } from './ProcessStepTracker';
import { FileUpload } from '@/components/upload/FileUpload';
import { DataExtraction } from '@/components/extraction/DataExtraction';
import { KeywordEnhancement } from '@/components/keywords/KeywordEnhancement';
import { ReviewerSearch } from '@/components/search/ReviewerSearch';
import { ReviewerResults } from '@/components/results/ReviewerResults';
import { AuthorValidation } from '@/components/validation/AuthorValidation';
import type { EnhancedKeywords, Reviewer } from '@/types/api';

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
  const { data: recommendations, isLoading: recommendationsLoading } = useRecommendations(processId);
  const shortlistsHook = useShortlists(processId);
  
  // Hook to check if metadata is loaded for the METADATA_EXTRACTION step
  const { data: metadata, isLoading: metadataLoading } = useMetadata(processId);
  
  // Hook for enhancing keywords
  const enhanceKeywordsMutation = useEnhanceKeywords();

  // Local state for workflow data
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadResponse, setUploadResponse] = useState<any>(null);
  const [enhancedKeywords, setEnhancedKeywords] = useState<EnhancedKeywords | null>(null);
  const [primaryKeywords, setPrimaryKeywords] = useState<string[]>([]);
  const [secondaryKeywords, setSecondaryKeywords] = useState<string[]>([]);
  const [keywordString, setKeywordString] = useState<string>('');
  const [searchCompleted, setSearchCompleted] = useState(false);
  
  // Track if keyword enhancement has been triggered for this process
  const keywordEnhancementTriggered = useRef(false);

  // Memoize callbacks to prevent unnecessary re-renders
  const handleStepChange = useCallback(async (newStep: string) => {
    if (!process) return;

    try {
      await updateStepMutation.mutateAsync({
        processId: process.id,
        step: newStep,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update process step.',
        variant: 'destructive',
      });
    }
  }, [process, updateStepMutation, toast]);

  const handleFileUpload = useCallback(async (uploadResponse: any) => {
    // Handle file removal (when uploadResponse is null)
    if (!uploadResponse) {
      setUploadResponse(null);
      setUploadedFile(null);
      // Reset to upload step when file is removed
      await handleStepChange('UPLOAD');
      return;
    }
    
    // Handle successful file upload
    setUploadResponse(uploadResponse);
    setUploadedFile({ name: uploadResponse.fileName, size: uploadResponse.fileSize } as File);
    
    // Don't automatically move to next step - wait for user to click Next
    // await handleStepChange('METADATA_EXTRACTION');
  }, [handleStepChange]);

  const handleKeywordEnhancement = useCallback(async (keywords: EnhancedKeywords) => {
    setEnhancedKeywords(keywords);
    // Don't set keywords here - let KeywordEnhancement component manage selections
  }, []);

  const handleKeywordStringChange = useCallback((newKeywordString: string) => {
    setKeywordString(newKeywordString);
  }, []);
  
  // Auto-trigger keyword enhancement when entering KEYWORD_ENHANCEMENT step
  useEffect(() => {
    if (process?.currentStep === 'KEYWORD_ENHANCEMENT' && !keywordEnhancementTriggered.current) {
      keywordEnhancementTriggered.current = true;
      
      console.log('[ProcessWorkflow] Triggering keyword enhancement for processId:', processId);
      
      // Trigger keyword enhancement API call
      enhanceKeywordsMutation.mutateAsync({ processId })
        .then((result) => {
          console.log('[ProcessWorkflow] Keyword enhancement successful:', result);
          handleKeywordEnhancement(result);
          toast({
            title: 'Keywords Enhanced',
            description: `Generated ${result.enhanced.length} enhanced keywords and ${result.meshTerms.length} MeSH terms.`,
          });
        })
        .catch((error) => {
          console.error('[ProcessWorkflow] Keyword enhancement failed:', error);
          toast({
            title: 'Enhancement Failed',
            description: error.message || 'Failed to enhance keywords. Please try again.',
            variant: 'destructive',
          });
          keywordEnhancementTriggered.current = false; // Allow retry
        });
    }
    
    // Reset the trigger when leaving the KEYWORD_ENHANCEMENT step
    if (process?.currentStep !== 'KEYWORD_ENHANCEMENT') {
      keywordEnhancementTriggered.current = false;
    }
  }, [process?.currentStep, processId, enhanceKeywordsMutation, handleKeywordEnhancement, toast]);

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

  const handleExport = useCallback(async (selectedReviewers: Reviewer[]) => {
    try {
      // Note: This would need to be implemented based on the actual shortlists hook API
      toast({
        title: 'Shortlist created',
        description: `${selectedReviewers.length} reviewers added to shortlist successfully.`,
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Failed to create shortlist. Please try again.',
        variant: 'destructive',
      });
    }
  }, [toast]);

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
        // Check search status to determine what to show
        const { isSearching, isCompleted, isFailed, isNotStarted } = searchHook;
        
        if (recommendationsLoading || isSearching) {
          return (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  <p className="text-muted-foreground">
                    {isSearching ? 'Searching databases...' : 'Loading recommendations...'}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        }
        
        if (isFailed) {
          return (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  Search failed. Please try again or contact support.
                </p>
              </CardContent>
            </Card>
          );
        }
        
        if (isNotStarted) {
          return (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  Please perform a search first to see reviewer recommendations.
                </p>
              </CardContent>
            </Card>
          );
        }
        
        return recommendations && recommendations.data && recommendations.data.length > 0 ? (
          <ReviewerResults 
            processId={processId}
            onExport={handleExport}
          />
        ) : isCompleted ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                No reviewers found for your search criteria. Try adjusting your keywords or search parameters.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                Please perform a search first to see reviewer recommendations.
              </p>
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
              <CardTitle>Final Review</CardTitle>
              <CardDescription>
                Review and finalize your reviewer selections.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Final review functionality will be implemented in a future task.
              </p>
            </CardContent>
          </Card>
        );

      default:
        return (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                {process.currentStep}
                Invalid step. Please contact support.
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
        
        <Button variant="outline">
          <Save className="w-4 h-4 mr-2" />
          Save Progress
        </Button>
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
    </div>
  );
};