/**
 * ValidationStep Component
 * Step 6 of the ScholarFinder workflow - Author validation against conflict rules
 */

import React, { useEffect, useState } from 'react';
import { StepComponentProps } from '../../types/workflow';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield, Users, AlertCircle, Settings, Play, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useProcess } from '../../hooks/useProcessManagement';
import { ScholarFinderApiService } from '../../services/ScholarFinderApiService';

interface ValidationStepProps extends StepComponentProps {}

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

export const ValidationStep: React.FC<ValidationStepProps> = ({
  processId,
  jobId,
  onNext,
  onPrevious,
  isLoading: externalLoading = false,
  stepData
}) => {
  console.log('[ValidationStep] ===== COMPONENT RENDER =====');
  console.log('[ValidationStep] Props:', { processId, jobId, stepData });
  
  const { toast } = useToast();
  const { data: process } = useProcess(processId);
  
  const [potentialReviewers, setPotentialReviewers] = useState<any[]>([]);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([
    'Publications',
    'Conflict of Interest',
    'Retraction History'
  ]); // Pre-select some common conditions
  const [isValidating, setIsValidating] = useState(false);
  const [validationResults, setValidationResults] = useState<any>(null);
  const [showConditionSelection, setShowConditionSelection] = useState(true);

  console.log('[ValidationStep] Potential reviewers state:', potentialReviewers);
  console.log('[ValidationStep] showConditionSelection:', showConditionSelection);
  console.log('[ValidationStep] selectedConditions:', selectedConditions);
  console.log('[ValidationStep] validationResults:', validationResults);

  // Load potential reviewers from Database Search step
  useEffect(() => {
    console.log('[ValidationStep] useEffect triggered');
    console.log('[ValidationStep] Process data:', process);
    
    loadPotentialReviewers();
  }, [process, stepData, jobId]);

  const loadPotentialReviewers = () => {
    try {
      console.log('[ValidationStep] Loading potential reviewers...');
      
      let reviewers: any[] = [];
      
      // 1. Try to load from stepData prop (passed from previous step)
      if (stepData?.searchResults?.author_email_affiliation_preview) {
        console.log('[ValidationStep] Found in stepData:', stepData.searchResults.author_email_affiliation_preview);
        reviewers = stepData.searchResults.author_email_affiliation_preview;
      }
      // 2. Try to load from process step data
      else if (process?.stepData?.search?.searchResults?.author_email_affiliation_preview) {
        console.log('[ValidationStep] Found in process.stepData.search:', process.stepData.search.searchResults.author_email_affiliation_preview);
        reviewers = process.stepData.search.searchResults.author_email_affiliation_preview;
      }
      // 3. Try localStorage as fallback
      else if (jobId && typeof window !== 'undefined') {
        console.log('[ValidationStep] Trying localStorage with jobId:', jobId);
        const storedData = localStorage.getItem(`search_results_${jobId}`);
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          console.log('[ValidationStep] Found in localStorage:', parsedData);
          if (parsedData.author_email_affiliation_preview) {
            reviewers = parsedData.author_email_affiliation_preview;
          }
        }
      }
      
      // 4. Add manual authors if any
      const manualData = process?.stepData?.manual as any;
      if (manualData?.addedAuthors && Array.isArray(manualData.addedAuthors)) {
        console.log('[ValidationStep] Found manual authors:', manualData.addedAuthors);
        const manualReviewers = manualData.addedAuthors.map((author: any) => ({
          author: author.name,
          email: author.email || '',
          aff: author.affiliation || '',
          city: author.city || '',
          country: author.country || '',
          source: 'Manual Search'
        }));
        reviewers = [...reviewers, ...manualReviewers];
      }
      
      console.log('[ValidationStep] Total reviewers loaded:', reviewers.length);
      console.log('[ValidationStep] Reviewers:', reviewers);
      
      setPotentialReviewers(reviewers);
      
      if (reviewers.length === 0) {
        console.log('[ValidationStep] No reviewers found!');
      }
    } catch (error) {
      console.error('[ValidationStep] Error loading reviewers:', error);
    }
  };

  const handleConditionToggle = (conditionId: string, checked: boolean) => {
    setSelectedConditions(prev => {
      if (checked) {
        return [...prev, conditionId];
      } else {
        return prev.filter(id => id !== conditionId);
      }
    });
  };

  const handleSelectAll = () => {
    setSelectedConditions(VALIDATION_CONDITIONS.map(c => c.id));
  };

  const handleSelectNone = () => {
    setSelectedConditions([]);
  };

  const handleRunValidation = async () => {
    if (!jobId) {
      toast({
        title: 'Error',
        description: 'Job ID is required for validation',
        variant: 'destructive'
      });
      return;
    }

    if (selectedConditions.length === 0) {
      toast({
        title: 'No Conditions Selected',
        description: 'Please select at least one validation condition to run.',
        variant: 'destructive'
      });
      return;
    }

    setIsValidating(true);
    
    try {
      const apiService = new ScholarFinderApiService();
      const response = await apiService.validateAuthorsWithConditions(jobId, selectedConditions);
      
      setValidationResults(response);
      setShowConditionSelection(false);
      
      toast({
        title: 'Validation Complete',
        description: `Successfully validated ${response.total_authors} authors with ${selectedConditions.length} conditions.`,
      });
    } catch (error: any) {
      console.error('[ValidationStep] Validation error:', error);
      toast({
        title: 'Validation Failed',
        description: error.message || 'Failed to run author validation. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleNext = () => {
    if (!validationResults) {
      toast({
        title: 'Validation Required',
        description: 'Please run author validation before proceeding to the next step.',
        variant: 'destructive'
      });
      return;
    }
    
    onNext({
      validationResults,
      selectedConditions,
      totalAuthorsValidated: validationResults.total_authors
    });
  };

  const handleBackToSelection = () => {
    setShowConditionSelection(true);
    setValidationResults(null);
  };

  return (
    <div className="space-y-6">
      {/* EMERGENCY DEBUG - Remove after testing */}
      <div style={{
        backgroundColor: '#ff0000',
        color: 'white',
        padding: '20px',
        border: '3px solid #000',
        fontSize: '18px',
        fontWeight: 'bold',
        textAlign: 'center'
      }}>
        🚨 VALIDATION STEP IS RENDERING! 🚨
        <br />
        showConditionSelection: {showConditionSelection ? 'TRUE' : 'FALSE'}
        <br />
        selectedConditions: {selectedConditions.length}
        <br />
        VALIDATION_CONDITIONS: {VALIDATION_CONDITIONS.length}
      </div>

      {/* Step Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Author Validation</CardTitle>
              <CardDescription>
                {showConditionSelection 
                  ? 'Select validation conditions and run author validation'
                  : 'Review validation results'
                }
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Potential Reviewers Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-blue-600" />
            <span>Potential Reviewers</span>
          </CardTitle>
          <CardDescription>
            Reviewers found from database search and manual additions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {potentialReviewers.length > 0 ? (
            <div className="flex items-center justify-between p-4 border rounded-lg bg-blue-50 border-blue-200">
              <span className="text-sm font-medium text-blue-900">
                Total Potential Reviewers: {potentialReviewers.length}
              </span>
              <span className="text-xs text-muted-foreground">
                Ready for validation
              </span>
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No potential reviewers found. Please go back and run the database search first.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Validation Conditions Selection - ALWAYS SHOW FOR DEBUG */}
      <Card style={{ border: '2px solid red' }}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5 text-green-600" />
            <span>Validation Conditions (DEBUG: Always Visible)</span>
          </CardTitle>
          <CardDescription>
            Select which validation conditions to apply to the authors
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Debug info */}
          <div style={{ backgroundColor: 'yellow', padding: '10px', border: '1px solid orange' }}>
            DEBUG INFO:
            <br />
            showConditionSelection: {showConditionSelection ? 'TRUE' : 'FALSE'}
            <br />
            selectedConditions.length: {selectedConditions.length}
            <br />
            selectedConditions: {JSON.stringify(selectedConditions)}
            <br />
            VALIDATION_CONDITIONS.length: {VALIDATION_CONDITIONS.length}
          </div>

          {/* Select All/None buttons */}
          <div className="flex gap-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              disabled={isValidating}
            >
              Select All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectNone}
              disabled={isValidating}
            >
              Select None
            </Button>
            <div className="ml-auto text-sm text-muted-foreground">
              {selectedConditions.length} of {VALIDATION_CONDITIONS.length} selected
            </div>
          </div>

          {/* Condition checkboxes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {VALIDATION_CONDITIONS.map((condition) => (
              <div
                key={condition.id}
                className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50"
                style={{ backgroundColor: '#f0f8ff', border: '1px solid blue' }}
              >
                <Checkbox
                  id={condition.id}
                  checked={selectedConditions.includes(condition.id)}
                  onCheckedChange={(checked) => 
                    handleConditionToggle(condition.id, checked as boolean)
                  }
                  disabled={isValidating}
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

          {/* Validate Authors Button */}
          <div className="pt-4 border-t">
            <Button
              onClick={handleRunValidation}
              disabled={isValidating || selectedConditions.length === 0}
              className="w-full"
              size="lg"
              style={{ backgroundColor: 'green', color: 'white' }}
            >
              {isValidating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Validating Authors...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Validate Authors ({selectedConditions.length} conditions selected)
                </>
              )}
            </Button>
            {selectedConditions.length === 0 && (
              <p className="text-sm text-muted-foreground text-center mt-2">
                Please select at least one validation condition to proceed
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Validation Results */}
      {validationResults && !showConditionSelection && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span>Validation Results</span>
            </CardTitle>
            <CardDescription>
              Author validation completed successfully
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg bg-green-50 border-green-200">
                <div className="text-2xl font-bold text-green-900">
                  {validationResults.total_authors}
                </div>
                <div className="text-sm text-green-700">Total Authors Validated</div>
              </div>
              <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
                <div className="text-2xl font-bold text-blue-900">
                  {selectedConditions.length}
                </div>
                <div className="text-sm text-blue-700">Conditions Applied</div>
              </div>
              <div className="p-4 border rounded-lg bg-purple-50 border-purple-200">
                <div className="text-2xl font-bold text-purple-900">
                  {validationResults.top_5_preview?.length || 0}
                </div>
                <div className="text-sm text-purple-700">Top Candidates</div>
              </div>
            </div>

            {/* Applied Conditions */}
            <div className="space-y-2">
              <h4 className="font-medium">Applied Validation Conditions:</h4>
              <div className="flex flex-wrap gap-2">
                {selectedConditions.map((conditionId) => {
                  const condition = VALIDATION_CONDITIONS.find(c => c.id === conditionId);
                  return (
                    <span
                      key={conditionId}
                      className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                    >
                      {condition?.label || conditionId}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Top Candidates Preview */}
            {validationResults.top_5_preview && validationResults.top_5_preview.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Top 5 Candidates:</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {validationResults.top_5_preview.map((reviewer: any, index: number) => (
                    <div
                      key={index}
                      className="p-3 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="font-medium text-gray-900">
                            {reviewer.reviewer || reviewer.author || 'Unknown Author'}
                          </div>
                          {reviewer.aff && (
                            <div className="text-sm text-gray-600">
                              {reviewer.aff}
                            </div>
                          )}
                          {reviewer.country && (
                            <div className="text-sm text-gray-500">
                              {reviewer.country}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-green-600">
                            {reviewer.conditions_satisfied || `${reviewer.conditions_met || 0} conditions met`}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Back to Selection Button */}
            <div className="pt-4 border-t">
              <Button
                variant="outline"
                onClick={handleBackToSelection}
                disabled={isValidating}
              >
                <Settings className="h-4 w-4 mr-2" />
                Modify Conditions
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <Button
          variant="outline"
          onClick={onPrevious}
          disabled={externalLoading || isValidating}
        >
          Previous
        </Button>

        <Button
          onClick={handleNext}
          disabled={externalLoading || isValidating || !validationResults}
        >
          Continue to Next Step
        </Button>
      </div>
    </div>
  );
};

export default ValidationStep;
