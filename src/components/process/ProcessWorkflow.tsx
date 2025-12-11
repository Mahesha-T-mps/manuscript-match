/**
 * Process Workflow Component
 * Main workflow component that manages the entire manuscript analysis process
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { ArrowLeft, Save, User, Mail, MapPin, BookOpen, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  const { data: recommendations, isLoading: recommendationsLoading, refetch: refetchRecommendations } = useRecommendations(processId);
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
  const [isValidating, setIsValidating] = useState(false);
  const [validationCompleted, setValidationCompleted] = useState(false);
  const [validationRecommendations, setValidationRecommendations] = useState<any>(null);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  
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
        title: 'Results Loaded',
        description: `Found ${response.data?.reviewers?.length || 0} recommended reviewers.`,
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
                  No reviewer recommendations found.
                </p>
                <Button 
                  onClick={() => refetchRecommendations?.()}
                  variant="outline"
                >
                  Retry Loading Recommendations
                </Button>
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
              {!validationCompleted ? (
                <div className="flex flex-col items-center space-y-4">
                  <div className="text-center text-muted-foreground">
                    <p>Click the button below to start author validation.</p>
                    <p className="text-sm">This process may take several minutes to complete.</p>
                  </div>
                  <Button 
                    onClick={async () => {
                      try {
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

                        // Call the validate authors API
                        const response = await scholarFinderApiService.validateAuthors(jobId);
                        
                        setValidationCompleted(true);
                        toast({
                          title: 'Validation Started',
                          description: 'Author validation has been initiated successfully.',
                        });
                        
                        console.log('Validation response:', response);
                      } catch (error: any) {
                        console.error('Validation error:', error);
                        toast({
                          title: 'Validation Failed',
                          description: error.message || 'Failed to start author validation.',
                          variant: 'destructive',
                        });
                      } finally {
                        setIsValidating(false);
                      }
                    }}
                    size="lg"
                    className="px-8"
                    disabled={isValidating}
                  >
                    {isValidating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Validating Authors...
                      </>
                    ) : (
                      'Validate Authors'
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center text-green-600">
                    <p className="font-medium">✅ Author validation has been initiated successfully!</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      The validation process is running in the background.
                    </p>
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
                        {validationRecommendations.data?.reviewers?.map((reviewer: any, index: number) => (
                          <div key={index} className="p-4 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                            <div className="flex justify-between items-start">
                              <div className="space-y-2 flex-1">
                                <h4 className="font-medium text-lg">{reviewer.name || 'Unknown Author'}</h4>
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
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <Button 
                      onClick={fetchValidationRecommendations}
                      variant="outline"
                      size="lg"
                      disabled={isLoadingRecommendations}
                    >
                      {isLoadingRecommendations ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                          Loading Results...
                        </>
                      ) : (
                        'View Results'
                      )}
                    </Button>
                    <Button 
                      onClick={() => handleStepChange('RECOMMENDATIONS')}
                      size="lg"
                    >
                      Next: Recommendations
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );

      case "SHORTLIST":
        return (
          <div className="space-y-6">
            <ShortlistManager processId={processId} />
            <div className="flex justify-between pt-4">
              <Button 
                variant="outline"
                onClick={() => handleStepChange('RECOMMENDATIONS')}
              >
                Back to Recommendations
              </Button>
              <div className="text-sm text-muted-foreground">
                Shortlist management complete. Use the shortlist tools above to manage your selected reviewers.
              </div>
            </div>
          </div>
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