/**
 * Author Validation Component
 * Main component for author validation with configurable rules
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle, Search, UserPlus, Info } from 'lucide-react';
import { useValidation, useAddManualAuthor } from '@/hooks/useValidation';

interface ManualAuthor {
  name: string;
  email?: string;
  affiliation: string;
  country?: string;
  publications?: number;
}

interface AuthorValidationProps {
  processId: string;
  onValidationComplete?: () => void;
}

export const AuthorValidation: React.FC<AuthorValidationProps> = ({
  processId,
  onValidationComplete,
}) => {
  const {
    validateAuthors,
    validationStatus,
    isValidating,
    validationError,
    hasValidationStarted,
    isPolling,
  } = useValidation(processId);

  const addManualAuthorMutation = useAddManualAuthor(processId);



  // Manual author search state
  const [authorName, setAuthorName] = useState('');
  const [authorNameError, setAuthorNameError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<ManualAuthor[] | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [lastSearchWarning, setLastSearchWarning] = useState<string | null>(null);

  const handleValidate = async () => {
    try {
      await validateAuthors();
    } catch (error) {
      // Error is handled by the hook
      console.error('Validation failed:', error);
    }
  };

  const handleRevalidate = () => {
    handleValidate();
  };

  // Check if validation is complete
  const status = validationStatus as any;
  const isValidationComplete = status?.validation_status === 'completed';
  const isValidationFailed = status?.validation_status === 'failed';
  const isValidationInProgress = status?.validation_status === 'in_progress';

  // Trigger onValidationComplete callback when validation completes
  React.useEffect(() => {
    if (isValidationComplete && onValidationComplete) {
      onValidationComplete();
    }
  }, [isValidationComplete, onValidationComplete]);

  const handleAuthorNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAuthorName(value);
    
    // Validate name length
    if (value.trim().length > 0 && value.trim().length < 2) {
      setAuthorNameError('Author name must be at least 2 characters');
    } else {
      setAuthorNameError(null);
    }
  };

  const handleSearchAuthor = async () => {
    if (authorName.trim().length < 2) {
      setAuthorNameError('Author name must be at least 2 characters');
      return;
    }
    
    try {
      const result = await addManualAuthorMutation.mutateAsync(authorName.trim());
      console.log('[AuthorValidation] Search result:', result);
      
      // Handle the actual API response structure - just display results
      if (result.author_data) {
        // Convert the single author_data to the expected array format
        const author: ManualAuthor = {
          name: result.author_data.author || authorName.trim(),
          email: result.author_data.email || undefined,
          affiliation: result.author_data.aff || 'Unknown affiliation',
          country: result.author_data.country || undefined,
          publications: undefined // Not provided by this API
        };
        
        // Just display the search results (no automatic addition)
        setSearchResults([author]);
        setSearchTerm(authorName.trim());
        setLastSearchWarning(result.warning || null);
        
        // Clear the search input after successful search
        setAuthorName('');
      } else {
        // No author data found
        setSearchResults([]);
        setSearchTerm(authorName.trim());
        setLastSearchWarning(null);
      }
    } catch (error: any) {
      // Handle specific error cases
      console.error('[AuthorValidation] Search error:', error);
      
      // Set empty results for author not found
      setSearchResults([]);
      setSearchTerm(authorName.trim());
      setLastSearchWarning(null);
      
      // Clear the search input
      setAuthorName('');
    }
  };



  return (
    <div className="space-y-6">
      {/* Manual Author Addition */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" aria-hidden="true" />
            Add Authors Manually
          </CardTitle>
          <CardDescription>
            Search for specific authors to view their information from PubMed database.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Enter author name (minimum 2 characters)"
                value={authorName}
                onChange={handleAuthorNameChange}
                className={authorNameError ? 'border-red-500' : ''}
                disabled={addManualAuthorMutation.isPending}
                aria-label="Author name"
                aria-describedby={authorNameError ? "author-name-error" : undefined}
                aria-invalid={!!authorNameError}
              />
              {authorNameError && (
                <p id="author-name-error" className="text-sm text-red-500 mt-1" role="alert">{authorNameError}</p>
              )}
            </div>
            <Button
              onClick={handleSearchAuthor}
              disabled={!authorName.trim() || authorName.trim().length < 2 || !!authorNameError || addManualAuthorMutation.isPending}
              className="flex items-center gap-2"
              aria-label="Search for author"
            >
              {addManualAuthorMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Search className="h-4 w-4" aria-hidden="true" />
              )}
              Search Author
            </Button>
          </div>

          {/* Loading state */}
          {addManualAuthorMutation.isPending && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span className="text-sm text-muted-foreground">Searching for authors...</span>
            </div>
          )}

          {/* Search results - display only */}
          {searchResults && searchResults.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Info className="h-4 w-4" />
                <span>Found {searchResults.length} author(s) matching "{searchTerm}"</span>
              </div>
              {lastSearchWarning && (
                <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800 dark:text-amber-200">
                    {lastSearchWarning}
                  </AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                {searchResults.map((author, index) => (
                  <div
                    key={index}
                    className="p-3 border rounded-lg bg-muted/30"
                  >
                    <div className="space-y-2">
                      <h4 className="font-medium">{author.name}</h4>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium">Affiliation:</span> {author.affiliation}
                        </p>
                        {author.email ? (
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium">Email:</span> {author.email}
                          </p>
                        ) : (
                          <p className="text-sm text-amber-600">
                            <span className="font-medium">Email:</span> Not available
                          </p>
                        )}
                        {author.country ? (
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium">Country:</span> {author.country}
                          </p>
                        ) : (
                          <p className="text-sm text-amber-600">
                            <span className="font-medium">Country:</span> Not available
                          </p>
                        )}
                        {author.publications !== undefined && (
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium">Publications:</span> {author.publications}
                          </p>
                        )}
                      </div>
                      {(!author.email || !author.country || author.affiliation === 'Unknown affiliation') && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-amber-600">
                          <AlertTriangle className="h-3 w-3" />
                          <span>Limited information available</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}



          {/* No results */}
          {searchResults && searchResults.length === 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p>No authors found matching "{searchTerm}".</p>
                  <p className="text-sm">Suggestions:</p>
                  <ul className="text-sm list-disc list-inside space-y-1">
                    <li>Check the spelling of the author's name</li>
                    <li>Try using just the last name</li>
                    <li>Try using the full name with middle initial</li>
                    <li>Ensure the author has publications in the selected databases</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}


        </CardContent>
      </Card>

      {/* Navigation buttons */}
      <div className="flex justify-end">
        <Button
          onClick={onValidationComplete}
          disabled={!onValidationComplete}
        >
          Continue to Validation
        </Button>
      </div>
    </div>
  );
};