/**
 * Author Validation Component
 * Main component for author validation with configurable rules
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, AlertTriangle, CheckCircle, Search, UserPlus, Info } from 'lucide-react';
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
  const [selectedAuthors, setSelectedAuthors] = useState<ManualAuthor[]>([]);

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
      setSearchResults(result.found_authors);
      setSearchTerm(result.search_term);
    } catch (error) {
      // Error is handled by the mutation's onError
      setSearchResults(null);
    }
  };

  const handleSelectAuthor = (author: ManualAuthor) => {
    // Add author to selected list
    setSelectedAuthors(prev => [...prev, author]);
    
    // Remove from search results
    setSearchResults(prev => prev ? prev.filter(a => a.name !== author.name) : null);
    
    // Show confirmation message
    // Toast is already shown by the mutation, but we can add a specific selection message
    console.log('Author selected:', author);
  };

  return (
    <div className="space-y-6">
      {/* Manual Author Addition */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" aria-hidden="true" />
            Add Manual Author
          </CardTitle>
          <CardDescription>
            Search for and add specific authors as potential reviewers who may not appear in database searches.
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

          {/* Search results */}
          {searchResults && searchResults.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Info className="h-4 w-4" />
                <span>Found {searchResults.length} author(s) matching "{searchTerm}"</span>
              </div>
              <div className="space-y-2">
                {searchResults.map((author, index) => (
                  <div
                    key={index}
                    className="p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium">{author.name}</h4>
                        <p className="text-sm text-muted-foreground">{author.affiliation}</p>
                        {author.country && (
                          <p className="text-sm text-muted-foreground">{author.country}</p>
                        )}
                        {author.email && (
                          <p className="text-sm text-muted-foreground">{author.email}</p>
                        )}
                        {author.publications !== undefined && (
                          <p className="text-sm text-muted-foreground">
                            Publications: {author.publications}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSelectAuthor(author)}
                      >
                        Select
                      </Button>
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

          {/* Selected authors */}
          {selectedAuthors.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <h4 className="font-medium">
                  Selected Authors ({selectedAuthors.length})
                </h4>
              </div>
              <div className="space-y-2">
                {selectedAuthors.map((author, index) => (
                  <div
                    key={index}
                    className="p-3 border rounded-lg bg-green-50 dark:bg-green-950/20"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-green-900 dark:text-green-100">
                          {author.name}
                        </h4>
                        <p className="text-sm text-green-700 dark:text-green-300">
                          {author.affiliation}
                        </p>
                        {author.country && (
                          <p className="text-sm text-green-700 dark:text-green-300">
                            {author.country}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedAuthors(prev => prev.filter((_, i) => i !== index));
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  {selectedAuthors.length} author(s) added to potential reviewers list. 
                  These authors will be included in the validation process.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>


    </div>
  );
};