import { useState, useEffect } from "react";
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

  const toggleDatabase = (databaseId: string) => {
    setDatabases(prev => 
      prev.map(db => 
        db.id === databaseId 
          ? { ...db, enabled: !db.enabled }
          : db
      )
    );
  };

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

    if (!keywordString) {
      toast({
        title: "No keyword string",
        description: "Please generate a keyword string in the previous step before searching.",
        variant: "destructive",
      });
      return;
    }

    try {
      // First, save the keyword string to the API
      // Parse the keyword string to extract primary and secondary keywords
      const { fileService } = await import('@/services/fileService');
      
      // Extract keywords from the generated string
      // Format: (keyword1 OR keyword2) AND (keyword3 OR keyword4)
      const primaryMatch = keywordString.match(/^\(([^)]+)\)/);
      const secondaryMatch = keywordString.match(/AND \(([^)]+)\)$/);
      
      const primaryKeywordsStr = primaryMatch ? primaryMatch[1].replace(/ OR /g, ', ') : '';
      const secondaryKeywordsStr = secondaryMatch ? secondaryMatch[1].replace(/ OR /g, ', ') : '';
      
      console.log('[ReviewerSearch] Keyword string:', keywordString);
      console.log('[ReviewerSearch] Parsed primary keywords:', primaryKeywordsStr);
      console.log('[ReviewerSearch] Parsed secondary keywords:', secondaryKeywordsStr);
      
      // Validate that we have at least some keywords
      if (!primaryKeywordsStr && !secondaryKeywordsStr) {
        toast({
          title: "Invalid keyword string",
          description: "Could not parse keywords from the search string. Please regenerate the keyword string.",
          variant: "destructive",
        });
        return;
      }
      
      // Save keyword string to API first
      await fileService.generateKeywordString(processId, {
        primary_keywords_input: primaryKeywordsStr,
        secondary_keywords_input: secondaryKeywordsStr
      });
      
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
      
      // Save the search results to display in the table
      if (searchResponse?.author_email_affiliation_preview && Array.isArray(searchResponse.author_email_affiliation_preview)) {
        console.log('[ReviewerSearch] Setting search results, count:', searchResponse.author_email_affiliation_preview.length);
        setSearchResults(searchResponse.author_email_affiliation_preview);
      } else {
        console.log('[ReviewerSearch] No author_email_affiliation_preview found in response');
      }
      
      toast({
        title: "Search completed",
        description: `Found ${searchResponse?.reviewers_count || searchResponse?.total_reviewers || 0} potential reviewers from ${enabledDatabases.length} databases.`,
      });
    } catch (error: any) {
      console.error('[ReviewerSearch] Search error:', error);
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
          <CardTitle className="flex items-center space-x-2">
            <Search className="w-5 h-5 text-primary" />
            <span>Search Query</span>
          </CardTitle>
          <CardDescription>
            Keyword string generated from your selected keywords
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <code className="text-sm text-purple-900 font-mono break-all">
              {keywordString || 'No keyword string provided'}
            </code>
          </div>
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
            disabled={isSearching || initiateSearchMutation.isPending}
            size="lg"
          >
            {isSearching || initiateSearchMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                {isSearching ? "Searching databases..." : "Initiating search..."}
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



      {/* Search Results Table */}
      {searchResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span>Potential Reviewers</span>
            </CardTitle>
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
                  {searchResults.map((result, index) => (
                    <tr key={index} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-3">{result.author}</td>
                      <td className="p-3 text-sm text-muted-foreground">{result.email}</td>
                      <td className="p-3 text-sm">{result.aff}</td>
                      <td className="p-3 text-sm">{result.city || '-'}</td>
                      <td className="p-3 text-sm">{result.country || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};