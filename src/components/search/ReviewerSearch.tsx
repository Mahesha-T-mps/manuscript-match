import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Search, Database, AlertCircle, Loader2, CheckCircle, XCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useInitiateSearch, useSearchProgress } from "@/hooks/useSearch";

interface SearchDatabase {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

interface ReviewerSearchProps {
  processId: string;
  keywordString?: string; // Keyword string from KeywordEnhancement
  onSearchComplete?: () => void;
}

interface SearchResult {
  author: string;
  email: string;
  aff: string;
  city?: string;
  country?: string;
}

export const ReviewerSearch = ({ 
  processId,
  keywordString,
  onSearchComplete 
}: ReviewerSearchProps) => {
  const { toast } = useToast();
  
  // Search mutations and status
  const initiateSearchMutation = useInitiateSearch();
  const { 
    status: searchStatus, 
    progress, 
    totalFound, 
    progressPercentage, 
    isSearching, 
    isCompleted, 
    isFailed,
    isLoading: isLoadingStatus,
    error: searchError 
  } = useSearchProgress(processId);

  const [databases, setDatabases] = useState<SearchDatabase[]>([
    {
      id: "PubMed",
      name: "PubMed",
      description: "Medical and biomedical literature",
      enabled: true,
    },
    {
      id: "TandFonline",
      name: "Taylor & Francis Online",
      description: "Academic journals and books",
      enabled: true,
    },
    {
      id: "ScienceDirect",
      name: "ScienceDirect",
      description: "Scientific and academic research",
      enabled: true,
    },
    {
      id: "WileyLibrary",
      name: "Wiley Online Library",
      description: "Scientific research and journals",
      enabled: true,
    },
  ]);

  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  
  // Editable keyword string state
  const [isEditingKeywordString, setIsEditingKeywordString] = useState(false);
  const [editableKeywordString, setEditableKeywordString] = useState('');
  const [savedKeywordString, setSavedKeywordString] = useState<string | null>(null);
  
  // Track if search was performed in current session
  const [searchPerformedInSession, setSearchPerformedInSession] = useState(false);
  
  // Persistent search loading state - read from localStorage on every render
  const isSearchingFromStorage = (() => {
    try {
      const stored = localStorage.getItem(`process_${processId}_isSearching`);
      return stored ? JSON.parse(stored) : false;
    } catch {
      return false;
    }
  })();
  
  // Combined search loading state
  const isActuallySearching = isSearching || initiateSearchMutation.isPending || isSearchingFromStorage;
  
  // Read search results from localStorage on every render to ensure fresh data
  const searchResultsFromStorage = (() => {
    try {
      const cachedResults = localStorage.getItem(`process_${processId}_searchResults`);
      if (!cachedResults) return [];
      
      const results = JSON.parse(cachedResults);
      
      // Extract results based on available format
      if (results.author_email_affiliation_preview && Array.isArray(results.author_email_affiliation_preview)) {
        return results.author_email_affiliation_preview;
      } else if (results.data?.preview_reviewers && Array.isArray(results.data.preview_reviewers)) {
        return results.data.preview_reviewers.map(reviewer => ({
          author: reviewer.reviewer || reviewer.author || 'Unknown',
          email: reviewer.email || '',
          aff: reviewer.aff || reviewer.affiliation || '',
          city: reviewer.city || '',
          country: reviewer.country || ''
        }));
      } else if (results.data?.author_email_affiliation_preview && Array.isArray(results.data.author_email_affiliation_preview)) {
        return results.data.author_email_affiliation_preview;
      }
      
      return [];
    } catch {
      return [];
    }
  })();
  
  // Use storage results as fallback if state is empty
  const effectiveSearchResults = searchResults.length > 0 ? searchResults : searchResultsFromStorage;
  const hasSearchResults = effectiveSearchResults.length > 0;

  // Load cached search results on component mount, but only if coming from later steps
  useEffect(() => {
    const loadCachedResults = () => {
      try {
        // Check all localStorage keys for this process
        const allKeys = Object.keys(localStorage);
        const processKeys = allKeys.filter(key => key.includes(processId));
        console.log('[ReviewerSearch] All localStorage keys for this process:', processKeys);
        
        // Check if search was completed (from ProcessWorkflow state)
        const searchCompletedStr = localStorage.getItem(`process_${processId}_searchCompleted`);
        const searchCompleted = searchCompletedStr ? JSON.parse(searchCompletedStr) : false;
        console.log('[ReviewerSearch] Search completed from localStorage:', searchCompleted);
        
        // Get the previous step from localStorage to determine navigation direction
        const previousStep = localStorage.getItem(`process_${processId}_previousStep`);
        console.log('[ReviewerSearch] Previous step:', previousStep);
        
        // Define step order for comparison
        const stepOrder = [
          'UPLOAD',
          'METADATA_EXTRACTION', 
          'KEYWORD_ENHANCEMENT',
          'DATABASE_SEARCH',
          'MANUAL_SEARCH',
          'VALIDATION',
          'RECOMMENDATIONS',
          'SHORTLIST'
        ];
        
        const currentStepIndex = stepOrder.indexOf('DATABASE_SEARCH');
        const previousStepIndex = previousStep ? stepOrder.indexOf(previousStep) : -1;
        
        console.log('[ReviewerSearch] Step indices - Current:', currentStepIndex, 'Previous:', previousStepIndex);
        
        // Load results if:
        // 1. Search was completed (searchCompleted is true) - ALWAYS show if search completed
        // 2. Coming from a later step (higher index)
        // 3. No previous step recorded (first visit)
        // 4. Returning to the same step
        // IMPORTANT: If search was completed, ALWAYS load results regardless of navigation
        const shouldLoadResults = searchCompleted || 
                                 previousStepIndex === -1 || 
                                 previousStepIndex > currentStepIndex || 
                                 previousStep === 'DATABASE_SEARCH';
        
        console.log('[ReviewerSearch] Should load results:', shouldLoadResults);
        
        // Only clear results if coming from an earlier step AND search was NOT completed
        if (!shouldLoadResults && !searchCompleted) {
          console.log('[ReviewerSearch] Coming from earlier step and search not completed, clearing any cached results');
          // Clear the cached results since we're coming from an earlier step
          localStorage.removeItem(`process_${processId}_searchResults`);
          setSearchResults([]);
          setSearchPerformedInSession(false);
          return;
        }
        
        // If search was completed, always load results even if shouldLoadResults is false
        if (searchCompleted) {
          console.log('[ReviewerSearch] Search was completed, loading results regardless of navigation path');
        }
        
        const cachedResults = localStorage.getItem(`process_${processId}_searchResults`);
        console.log('[ReviewerSearch] Checking for cached results, processId:', processId);
        console.log('[ReviewerSearch] Raw cached data:', cachedResults);
        
        if (cachedResults) {
          const results = JSON.parse(cachedResults);
          console.log('[ReviewerSearch] Parsed cached results:', results);
          console.log('[ReviewerSearch] Available keys in results:', Object.keys(results || {}));
          
          // Check if we have author_email_affiliation_preview in cached results
          if (results.author_email_affiliation_preview && Array.isArray(results.author_email_affiliation_preview)) {
            console.log('[ReviewerSearch] Setting cached search results, count:', results.author_email_affiliation_preview.length);
            console.log('[ReviewerSearch] Sample result:', results.author_email_affiliation_preview[0]);
            setSearchResults(results.author_email_affiliation_preview);
            setSearchPerformedInSession(true); // Mark as performed to show results
          } else {
            console.log('[ReviewerSearch] No author_email_affiliation_preview found in cached results');
            
            // Check for alternative result formats
            if (results.reviewers && Array.isArray(results.reviewers)) {
              console.log('[ReviewerSearch] Found results.reviewers, count:', results.reviewers.length);
              setSearchResults(results.reviewers);
              setSearchPerformedInSession(true); // Mark as performed to show results
            } else if (results.data && results.data.reviewers && Array.isArray(results.data.reviewers)) {
              console.log('[ReviewerSearch] Found results.data.reviewers, count:', results.data.reviewers.length);
              setSearchResults(results.data.reviewers);
              setSearchPerformedInSession(true); // Mark as performed to show results
            } else if (results.data && results.data.preview_reviewers && Array.isArray(results.data.preview_reviewers)) {
              console.log('[ReviewerSearch] Found results.data.preview_reviewers, count:', results.data.preview_reviewers.length);
              // Transform the data to match our SearchResult interface
              const transformedResults = results.data.preview_reviewers.map(reviewer => ({
                author: reviewer.reviewer || reviewer.author || 'Unknown',
                email: reviewer.email || '',
                aff: reviewer.aff || reviewer.affiliation || '',
                city: reviewer.city || '',
                country: reviewer.country || ''
              }));
              setSearchResults(transformedResults);
              setSearchPerformedInSession(true); // Mark as performed to show results
              console.log('[ReviewerSearch] Loaded cached results and set search completion status');
            } else if (results.data && results.data.author_email_affiliation_preview && Array.isArray(results.data.author_email_affiliation_preview)) {
              console.log('[ReviewerSearch] Found results.data.author_email_affiliation_preview, count:', results.data.author_email_affiliation_preview.length);
              setSearchResults(results.data.author_email_affiliation_preview);
              setSearchPerformedInSession(true); // Mark as performed to show results
              console.log('[ReviewerSearch] Loaded cached results and set search completion status');
            } else {
              console.log('[ReviewerSearch] No recognizable results format found');
              console.log('[ReviewerSearch] Full results structure:', JSON.stringify(results, null, 2));
              
              // If we have a valid response structure but no results, set empty array
              // This indicates search was completed but no authors were found
              if (results.message && results.job_id && results.data) {
                console.log('[ReviewerSearch] Valid response structure but no results - search completed with no authors');
                setSearchResults([]);
                setSearchPerformedInSession(true); // Mark as performed even with no results
                console.log('[ReviewerSearch] Loaded cached empty results and set search completion status');
              }
            }
          }
        } else {
          console.log('[ReviewerSearch] No cached search results found for processId:', processId);
        }
      } catch (error) {
        console.error('[ReviewerSearch] Error loading cached search results:', error);
      }
    };

    loadCachedResults();
  }, [processId]);
  
  // Monitor for search completion when navigating back
  useEffect(() => {
    // Check if search is marked as searching but results are now available
    const checkSearchCompletion = () => {
      const isSearchingStored = localStorage.getItem(`process_${processId}_isSearching`);
      const currentSearchId = localStorage.getItem(`process_${processId}_searchId`);
      const cachedResults = localStorage.getItem(`process_${processId}_searchResults`);
      
      if (isSearchingStored && JSON.parse(isSearchingStored) && cachedResults) {
        console.log('[ReviewerSearch] Checking search completion, currentSearchId:', currentSearchId);
        
        try {
          const results = JSON.parse(cachedResults);
          
          // Check if the results match the current search ID
          // If searchId doesn't match or doesn't exist in results, don't clear the searching flag
          if (results.searchId && currentSearchId && results.searchId !== currentSearchId) {
            console.log('[ReviewerSearch] Results are from a different search, keeping searching flag');
            return;
          }
          
          console.log('[ReviewerSearch] Search completed while away, loading results');
          
          // Load results based on available format
          if (results.author_email_affiliation_preview && Array.isArray(results.author_email_affiliation_preview)) {
            setSearchResults(results.author_email_affiliation_preview);
            setSearchPerformedInSession(true);
          } else if (results.data?.preview_reviewers && Array.isArray(results.data.preview_reviewers)) {
            const transformedResults = results.data.preview_reviewers.map(reviewer => ({
              author: reviewer.reviewer || reviewer.author || 'Unknown',
              email: reviewer.email || '',
              aff: reviewer.aff || reviewer.affiliation || '',
              city: reviewer.city || '',
              country: reviewer.country || ''
            }));
            setSearchResults(transformedResults);
            setSearchPerformedInSession(true);
          } else if (results.data?.author_email_affiliation_preview && Array.isArray(results.data.author_email_affiliation_preview)) {
            setSearchResults(results.data.author_email_affiliation_preview);
            setSearchPerformedInSession(true);
          }
          
          // Clear the searching flag only if search IDs match
          localStorage.setItem(`process_${processId}_isSearching`, JSON.stringify(false));
          console.log('[ReviewerSearch] Cleared isSearching flag after loading results');
        } catch (error) {
          console.error('[ReviewerSearch] Error loading results after navigation:', error);
        }
      }
    };
    
    // Check immediately on mount
    checkSearchCompletion();
    
    // Also check periodically while the component is mounted and searching
    const interval = isSearchingFromStorage ? setInterval(checkSearchCompletion, 2000) : null;
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [processId, isSearchingFromStorage]);

  const toggleDatabase = (databaseId: string) => {
    setDatabases(prev => 
      prev.map(db => 
        db.id === databaseId 
          ? { ...db, enabled: !db.enabled }
          : db
      )
    );
  };

  // Handle starting edit of keyword string
  const handleStartEditKeywordString = useCallback(() => {
    const currentString = savedKeywordString || keywordString || '';
    setEditableKeywordString(currentString);
    setIsEditingKeywordString(true);
  }, [keywordString, savedKeywordString]);

  // Handle saving edited keyword string
  const handleSaveKeywordString = useCallback(() => {
    const trimmedString = editableKeywordString.trim();
    
    if (!trimmedString) {
      toast({
        title: 'Invalid Keyword String',
        description: 'Keyword string cannot be empty',
        variant: 'destructive',
      });
      return;
    }
    
    // Save the edited string to local state
    setSavedKeywordString(trimmedString);
    setIsEditingKeywordString(false);
    
    toast({
      title: 'Keyword String Updated',
      description: 'Search query has been updated successfully',
    });
    
    console.log('[ReviewerSearch] Updated keyword string:', trimmedString);
  }, [editableKeywordString, toast]);

  // Handle canceling edit
  const handleCancelEditKeywordString = useCallback(() => {
    const currentString = savedKeywordString || keywordString || '';
    setEditableKeywordString(currentString);
    setIsEditingKeywordString(false);
  }, [keywordString, savedKeywordString]);

  const handleSearch = async () => {
    const enabledDatabases = databases.filter(db => db.enabled).map(db => db.id);

    if (enabledDatabases.length === 0) {
      toast({
        title: "No databases selected",
        description: "Please enable at least one database to search.",
        variant: "destructive",
      });
      return;
    }

    // Get the current keyword string (saved edit or original prop)
    const currentKeywordString = savedKeywordString || keywordString;

    if (!currentKeywordString && !editableKeywordString) {
      toast({
        title: "No keyword string",
        description: "Please generate a keyword string in the previous step before searching.",
        variant: "destructive",
      });
      return;
    }

    // Use edited keyword string if in edit mode, otherwise use the current string
    const searchKeywordString = isEditingKeywordString ? editableKeywordString.trim() : currentKeywordString;

    try {
      // Generate a unique search ID for this search operation
      const searchId = Date.now().toString();
      
      // Set searching state in localStorage before starting with search ID
      localStorage.setItem(`process_${processId}_isSearching`, JSON.stringify(true));
      localStorage.setItem(`process_${processId}_searchId`, searchId);
      console.log('[ReviewerSearch] Set isSearching to true in localStorage with searchId:', searchId);
      
      // First, save the keyword string to the API
      // Parse the keyword string to extract primary and secondary keywords
      const { fileService } = await import('@/services/fileService');
      
      // Extract keywords from the generated string
      // Format: (keyword1 OR keyword2) AND (keyword3 OR keyword4)
      const primaryMatch = searchKeywordString.match(/^\(([^)]+)\)/);
      const secondaryMatch = searchKeywordString.match(/AND \(([^)]+)\)$/);
      
      const primaryKeywordsStr = primaryMatch ? primaryMatch[1].replace(/ OR /g, ', ') : '';
      const secondaryKeywordsStr = secondaryMatch ? secondaryMatch[1].replace(/ OR /g, ', ') : '';
      
      console.log('[ReviewerSearch] Keyword string:', searchKeywordString);
      console.log('[ReviewerSearch] Parsed primary keywords:', primaryKeywordsStr);
      console.log('[ReviewerSearch] Parsed secondary keywords:', secondaryKeywordsStr);
      
      // Validate that we have at least some keywords
      if (!primaryKeywordsStr && !secondaryKeywordsStr) {
        // If parsing fails, use the entire string as primary keywords
        console.log('[ReviewerSearch] Parsing failed, using entire string as primary keywords');
        const fallbackKeywords = searchKeywordString.replace(/[()]/g, '').replace(/ AND | OR /g, ', ');
        
        // Save keyword string to API first
        await fileService.generateKeywordString(processId, {
          primary_keywords_input: fallbackKeywords,
          secondary_keywords_input: ''
        });
      } else {
        // Save keyword string to API first
        await fileService.generateKeywordString(processId, {
          primary_keywords_input: primaryKeywordsStr,
          secondary_keywords_input: secondaryKeywordsStr
        });
      }
      
      // Then initiate the database search
      const searchResponse = await initiateSearchMutation.mutateAsync({
        processId,
        request: {
          selected_websites: enabledDatabases
        }
      });
      
      console.log('[ReviewerSearch] Search response:', searchResponse);
      console.log('[ReviewerSearch] Response keys:', Object.keys(searchResponse || {}));
      console.log('[ReviewerSearch] author_email_affiliation_preview:', searchResponse?.author_email_affiliation_preview);
      
      // Save the search results to display in the table with search ID
      const resultsWithMetadata = {
        ...searchResponse,
        searchId, // Add search ID to results
        timestamp: Date.now()
      };
      
      // Save the search results to display in the table
      if (searchResponse?.author_email_affiliation_preview && Array.isArray(searchResponse.author_email_affiliation_preview)) {
        console.log('[ReviewerSearch] Setting search results from author_email_affiliation_preview, count:', searchResponse.author_email_affiliation_preview.length);
        setSearchResults(searchResponse.author_email_affiliation_preview);
        
        // Also cache the results for persistence
        localStorage.setItem(`process_${processId}_searchResults`, JSON.stringify(resultsWithMetadata));
        console.log('[ReviewerSearch] Cached search results to localStorage');
      } else if (searchResponse?.data?.preview_reviewers && Array.isArray(searchResponse.data.preview_reviewers)) {
        console.log('[ReviewerSearch] Setting search results from data.preview_reviewers, count:', searchResponse.data.preview_reviewers.length);
        // Transform the data to match our SearchResult interface
        const transformedResults = searchResponse.data.preview_reviewers.map(reviewer => ({
          author: reviewer.reviewer || reviewer.author || 'Unknown',
          email: reviewer.email || '',
          aff: reviewer.aff || reviewer.affiliation || '',
          city: reviewer.city || '',
          country: reviewer.country || ''
        }));
        setSearchResults(transformedResults);
        
        // Also cache the results for persistence
        localStorage.setItem(`process_${processId}_searchResults`, JSON.stringify(resultsWithMetadata));
        console.log('[ReviewerSearch] Cached search results to localStorage');
      } else {
        console.log('[ReviewerSearch] No author_email_affiliation_preview or preview_reviewers found in response');
        console.log('[ReviewerSearch] Available response keys:', Object.keys(searchResponse || {}));
        
        // Set empty results array to indicate search completed with no results
        setSearchResults([]);
        
        // Still cache the response for status tracking
        localStorage.setItem(`process_${processId}_searchResults`, JSON.stringify(resultsWithMetadata));
        console.log('[ReviewerSearch] Cached empty search results to localStorage');
      }
      
      // Clear searching state in localStorage after completion
      localStorage.setItem(`process_${processId}_isSearching`, JSON.stringify(false));
      console.log('[ReviewerSearch] Set isSearching to false in localStorage');
      
      // Mark that search was performed in this session
      setSearchPerformedInSession(true);
      console.log('[ReviewerSearch] Search performed in current session, setting completion status');
      
      // Calculate the actual count of results found
      let resultsCount = 0;
      if (searchResponse?.author_email_affiliation_preview && Array.isArray(searchResponse.author_email_affiliation_preview)) {
        resultsCount = searchResponse.author_email_affiliation_preview.length;
      } else if (searchResponse?.data?.preview_reviewers && Array.isArray(searchResponse.data.preview_reviewers)) {
        resultsCount = searchResponse.data.preview_reviewers.length;
      } else if (searchResponse?.reviewers_count) {
        resultsCount = searchResponse.reviewers_count;
      } else if (searchResponse?.total_reviewers) {
        resultsCount = searchResponse.total_reviewers;
      }
      
      toast({
        title: "Search completed",
        description: `Found ${resultsCount} potential reviewers from ${enabledDatabases.length} databases.`,
      });
    } catch (error: any) {
      console.error('[ReviewerSearch] Search error:', error);
      
      // Clear searching state in localStorage on error
      localStorage.setItem(`process_${processId}_isSearching`, JSON.stringify(false));
      console.log('[ReviewerSearch] Set isSearching to false in localStorage after error');
      
      toast({
        title: "Search failed",
        description: error.message || "There was an error initiating the search. Please try again.",
        variant: "destructive",
      });
    }
  };



  // Handle search completion
  useEffect(() => {
    if (isCompleted && onSearchComplete) {
      onSearchComplete();
    }
  }, [isCompleted, onSearchComplete]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Search className="w-5 h-5 text-primary" />
                <span>Search Query</span>
              </CardTitle>
              <CardDescription>
                Keyword string generated from your selected keywords
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {!isEditingKeywordString && (savedKeywordString || keywordString) && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleStartEditKeywordString}
                    className="h-8 px-2 text-purple-700 hover:text-purple-900"
                    aria-label="Edit keyword string"
                  >
                    Edit
                  </Button>
                  {savedKeywordString && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSavedKeywordString(null);
                        toast({
                          title: 'Reset to Original',
                          description: 'Search query has been reset to the original keyword string',
                        });
                      }}
                      className="h-8 px-2 text-gray-600 hover:text-gray-800"
                      aria-label="Reset to original keyword string"
                    >
                      Reset
                    </Button>
                  )}
                </>
              )}
              {isEditingKeywordString && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSaveKeywordString}
                    className="h-8 px-2 text-green-700 hover:text-green-900"
                    aria-label="Save keyword string"
                  >
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelEditKeywordString}
                    className="h-8 px-2 text-gray-700 hover:text-gray-900"
                    aria-label="Cancel edit"
                  >
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isEditingKeywordString ? (
            <div className="space-y-3">
              <textarea
                value={editableKeywordString}
                onChange={(e) => setEditableKeywordString(e.target.value)}
                className="w-full p-4 text-sm font-mono bg-white border border-purple-200 rounded resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                rows={3}
                placeholder="Enter your search query..."
              />
              <div className="text-xs text-purple-700">
                <strong>Tip:</strong> Use Boolean operators like AND, OR, and parentheses for complex queries
              </div>
            </div>
          ) : (
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <code className="text-sm text-purple-900 font-mono break-all">
                {savedKeywordString || keywordString || 'No keyword string provided'}
              </code>
              {savedKeywordString && (
                <div className="mt-2 text-xs text-purple-600">
                  <span className="font-medium">✓ Edited</span> - Using custom search query
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-primary" aria-hidden="true" />
            <span>Search Databases</span>
          </CardTitle>
          <CardDescription>
            Select databases to search for potential reviewers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 mb-6" role="group" aria-label="Database selection">
            {databases.map((db) => (
              <div key={db.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                <Checkbox 
                  id={db.id} 
                  checked={db.enabled}
                  onCheckedChange={() => toggleDatabase(db.id)}
                  className="mt-0.5"
                  aria-describedby={`${db.id}-description`}
                />
                <div className="flex-1">
                  <Label htmlFor={db.id} className="font-medium cursor-pointer">
                    {db.name}
                  </Label>
                  <p id={`${db.id}-description`} className="text-xs text-muted-foreground mt-1">
                    {db.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <Button 
            onClick={handleSearch} 
            className="w-full" 
            disabled={isActuallySearching}
            size="lg"
          >
            {isActuallySearching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Searching databases...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Search for Reviewers
              </>
            )}
          </Button>
        </CardContent>
      </Card>



      {/* No results message when search is completed but no authors found */}
      {searchPerformedInSession && !hasSearchResults && !isActuallySearching && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <span>Search Completed</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="text-center py-4">
                  <p className="text-lg font-medium text-muted-foreground mb-2">
                    No authors data found
                  </p>
                  <p className="text-sm text-muted-foreground">
                    The database search completed successfully, but no potential reviewers were found matching your search criteria.
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Search Results Table */}
      {hasSearchResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span>Potential Reviewers</span>
              <Badge variant="secondary" className="ml-2">
                {effectiveSearchResults.length} found
              </Badge>
            </CardTitle>
            <CardDescription>
              Preview of potential reviewers found in the selected databases
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto max-h-[600px]">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-left font-semibold">Author</th>
                    <th className="p-3 text-left font-semibold">Email</th>
                    <th className="p-3 text-left font-semibold">Affiliation</th>
                    <th className="p-3 text-left font-semibold">City</th>
                    <th className="p-3 text-left font-semibold">Country</th>
                  </tr>
                </thead>
                <tbody>
                  {effectiveSearchResults.map((result, index) => (
                    <tr key={index} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-medium">{result.author}</td>
                      <td className="p-3 text-sm text-muted-foreground">{result.email || '-'}</td>
                      <td className="p-3 text-sm">{result.aff || '-'}</td>
                      <td className="p-3 text-sm">{result.city || '-'}</td>
                      <td className="p-3 text-sm">{result.country || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 text-sm text-muted-foreground">
              Showing preview of {effectiveSearchResults.length} potential reviewers. Complete results will be available in the validation step.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};