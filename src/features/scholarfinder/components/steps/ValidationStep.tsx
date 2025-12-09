/**
 * ValidationStep Component
 * Step 6 of the ScholarFinder workflow - Author validation against conflict rules
 */

import React, { useEffect, useState } from 'react';
import { StepComponentProps } from '../../types/workflow';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Users, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useProcess } from '../../hooks/useProcessManagement';

interface ValidationStepProps extends StepComponentProps {}

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

  console.log('[ValidationStep] Potential reviewers state:', potentialReviewers);

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

  const handleNext = () => {
    if (potentialReviewers.length === 0) {
      toast({
        title: 'No Reviewers',
        description: 'No potential reviewers found. Please go back and run the database search.',
        variant: 'destructive'
      });
      return;
    }
    
    onNext({
      potentialReviewers,
      totalReviewers: potentialReviewers.length
    });
  };

  return (
    <div className="space-y-6">
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
                Review potential reviewers before validation
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Potential Reviewers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-blue-600" />
            <span>Potential Reviewers</span>
          </CardTitle>
          <CardDescription>
            Reviewers found from database search (PubMed, ScienceDirect, Taylor & Francis, Wiley)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {potentialReviewers.length > 0 ? (
            <>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {potentialReviewers.map((reviewer, index) => (
                  <div
                    key={index}
                    className="flex items-start justify-between p-4 border rounded-lg bg-blue-50 border-blue-200 hover:bg-blue-100 transition-colors"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="font-semibold text-blue-900">
                        {reviewer.author || 'Unknown Author'}
                      </div>
                      {reviewer.email && (
                        <div className="text-sm text-blue-700 flex items-center gap-1">
                          <span className="font-medium">Email:</span>
                          <span>{reviewer.email}</span>
                        </div>
                      )}
                      {reviewer.aff && (
                        <div className="text-sm text-blue-700 flex items-center gap-1">
                          <span className="font-medium">Affiliation:</span>
                          <span>{reviewer.aff}</span>
                        </div>
                      )}
                      {reviewer.city && (
                        <div className="text-sm text-blue-700 flex items-center gap-1">
                          <span className="font-medium">City:</span>
                          <span>{reviewer.city}</span>
                        </div>
                      )}
                      {reviewer.country && (
                        <div className="text-sm text-blue-700 flex items-center gap-1">
                          <span className="font-medium">Country:</span>
                          <span>{reviewer.country}</span>
                        </div>
                      )}
                      {reviewer.source && (
                        <div className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                          <span className="font-medium">Source:</span>
                          <span className="bg-blue-200 px-2 py-0.5 rounded">{reviewer.source}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t flex items-center justify-between">
                <span className="text-sm font-medium text-blue-900">
                  Total Potential Reviewers: {potentialReviewers.length}
                </span>
                <span className="text-xs text-muted-foreground">
                  Ready for validation
                </span>
              </div>
            </>
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

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <Button
          variant="outline"
          onClick={onPrevious}
          disabled={externalLoading}
        >
          Previous
        </Button>

        <Button
          onClick={handleNext}
          disabled={externalLoading || potentialReviewers.length === 0}
        >
          Continue to Next Step
        </Button>
      </div>
    </div>
  );
};

export default ValidationStep;
