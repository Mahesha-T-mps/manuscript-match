/**
 * Author Selection Step Component
 * Wrapper component that shows database search results and allows selection before validation
 */

import React, { useState, useEffect } from 'react';
import { AuthorSelection } from './AuthorSelection';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Info } from 'lucide-react';
import { fileService } from '@/services/fileService';
import { scholarFinderApiService } from '@/features/scholarfinder/services/ScholarFinderApiService';
import { useToast } from '@/hooks/use-toast';

interface Author {
  author: string;
  email: string;
  aff: string;
  city?: string;
  country?: string;
}

interface AuthorSelectionStepProps {
  processId: string;
  onSelectionComplete: (selectedAuthors: string[]) => void;
  onBack?: () => void;
}

export const AuthorSelectionStep: React.FC<AuthorSelectionStepProps> = ({
  processId,
  onSelectionComplete,
  onBack,
}) => {
  const { toast } = useToast();
  const [authors, setAuthors] = useState<Author[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAuthors = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Try to load from localStorage first (from database search results)
        const cachedResults = localStorage.getItem(`process_${processId}_searchResults`);
        
        if (cachedResults) {
          const results = JSON.parse(cachedResults);
          
          // Extract authors from various possible formats
          let authorList: Author[] = [];
          
          if (results.author_email_affiliation_preview && Array.isArray(results.author_email_affiliation_preview)) {
            authorList = results.author_email_affiliation_preview;
          } else if (results.data?.preview_reviewers && Array.isArray(results.data.preview_reviewers)) {
            authorList = results.data.preview_reviewers.map((reviewer: any) => ({
              author: reviewer.reviewer || reviewer.author || 'Unknown',
              email: reviewer.email || '',
              aff: reviewer.aff || reviewer.affiliation || '',
              city: reviewer.city || '',
              country: reviewer.country || ''
            }));
          } else if (results.data?.author_email_affiliation_preview && Array.isArray(results.data.author_email_affiliation_preview)) {
            authorList = results.data.author_email_affiliation_preview;
          }
          
          if (authorList.length > 0) {
            setAuthors(authorList);
            setIsLoading(false);
            return;
          }
        }

        // If no cached results, show error
        setError('No authors found from database search. Please complete the database search step first.');
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading authors:', err);
        setError('Failed to load authors from database search results.');
        setIsLoading(false);
      }
    };

    loadAuthors();
  }, [processId]);

  const handleSelectionComplete = async (selectedAuthors: string[]) => {
    try {
      setIsFiltering(true);
      
      // Get job ID
      const jobId = fileService.getJobId(processId);
      if (!jobId) {
        toast({
          title: 'Error',
          description: 'No job ID found. Please upload a file first.',
          variant: 'destructive',
        });
        return;
      }

      // Call the filter API
      const response = await scholarFinderApiService.filterSelectedAuthors(jobId, selectedAuthors);
      
      console.log('Authors filtered successfully:', response);
      
      toast({
        title: 'Authors Selected',
        description: `${response.selected_count} authors have been selected for validation.`,
      });
      
      // Call the parent callback
      onSelectionComplete(selectedAuthors);
      
    } catch (error: any) {
      console.error('Error filtering authors:', error);
      toast({
        title: 'Selection Failed',
        description: error.message || 'Failed to save author selection. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsFiltering(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <p className="text-muted-foreground">Loading authors from database search...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Author Selection</CardTitle>
          <CardDescription>Select authors to validate</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <Info className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (authors.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Author Selection</CardTitle>
          <CardDescription>Select authors to validate</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              No authors found from database search. Please complete the database search step first.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <AuthorSelection
        processId={processId}
        authors={authors}
        onSelectionComplete={handleSelectionComplete}
        onBack={onBack}
      />
      
      {isFiltering && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <p className="text-muted-foreground">Saving author selection...</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
