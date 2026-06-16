import { useState, useMemo, useCallback, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { ReviewerResultsSkeleton } from "@/components/ui/skeleton-components";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Users, 
  Download, 
  Filter, 
  Mail, 
  Building, 
  BookOpen, 
  CheckCircle2,
  XCircle,
  AlertCircle,
  ListPlus
} from "lucide-react";
import { useRecommendations } from "@/hooks/useFiles";
import { useCreateShortlist } from "@/hooks/useShortlists";
import { ActivityLogger } from "@/services/activityLogger";
import { toast } from "sonner";
import { ExportReviewersDialog } from "./ExportReviewersDialog";
import { exportReviewersAsCSV, exportReviewersAsJSON } from "@/utils/exportUtils";
import { COIPublicationsModal } from "@/components/coi/COIPublicationsModal";
import type { Reviewer } from "@/features/scholarfinder/types/api";

interface ReviewerResultsProps {
  processId: string;
  onShortlistCreated?: () => void;
  validationData?: any; // Optional validation data to display instead of fetching
  selectedValidationConditions?: string[]; // Selected validation conditions for export filtering
}

export const ReviewerResults = ({ processId, onShortlistCreated, validationData, selectedValidationConditions }: ReviewerResultsProps) => {
  // State for filtering and search
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [minConditionsMet, setMinConditionsMet] = useState(0);
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  
  // State for selection
  const [selectedReviewerIds, setSelectedReviewerIds] = useState<Set<string>>(new Set());
  
  // Ref to prevent race conditions in selection
  const selectionInProgressRef = useRef(false);
  
  // State for shortlist dialog
  const [showShortlistDialog, setShowShortlistDialog] = useState(false);
  const [shortlistName, setShortlistName] = useState("");
  
  // State for export dialog
  const [showExportDialog, setShowExportDialog] = useState(false);

  // COI Publications Modal state
  const [coiModalOpen, setCOIModalOpen] = useState(false);
  const [selectedCOIAuthor, setSelectedCOIAuthor] = useState<{
    authorId: string;
    authorName: string;
  } | null>(null);

  // Fetch recommendations from ScholarFinder API (only if no validation data provided)
  const { 
    data: apiResponse, 
    isLoading, 
    error,
    refetch
  } = useRecommendations(processId, !validationData);
  
  // Shortlist creation mutation
  const createShortlistMutation = useCreateShortlist();

  // Extract reviewers from API response or validation data
  // API returns: { reviewers: Reviewer[], total_count: number, validation_summary: {...} }
  // Validation data returns: { data: { reviewers: [...] } }
  const dataSource = validationData || apiResponse;
  
  // Transform validation data to match expected reviewer format
  const rawReviewers = validationData ? (validationData.data?.reviewers || []) : (apiResponse?.reviewers || []);
  const allReviewers = validationData ? rawReviewers.map((reviewer: any, index: number) => {
    // Extract name using the same logic as ProcessWorkflow
    let name = reviewer.name;
    if (!name || name === 'Unknown Author' || name.trim() === '') {
      if (reviewer.email) {
        const emailParts = reviewer.email.split('@')[0];
        name = emailParts
          .replace(/[._-]/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
      } else {
        name = `Reviewer ${index + 1}`;
      }
    }
    
    return {
      reviewer: name,
      email: reviewer.email || `reviewer-${index}@example.com`,
      aff: reviewer.affiliation || reviewer.aff || 'Unknown affiliation',
      country: reviewer.country || 'Unknown',
      city: reviewer.city || 'Unknown',
      conditions_met: reviewer.conditions_met || 0,
      conditions_satisfied: reviewer.conditions_satisfied || `${reviewer.conditions_met || 0} of ${selectedValidationConditions && selectedValidationConditions.length > 0 ? selectedValidationConditions.length : 9}`,
      
      // Total publications
      Total_Publications: reviewer.publications || reviewer.Total_Publications || 0,
      Total_Publications_first: reviewer.Total_Publications_first || 0,
      Total_Publications_last: reviewer.Total_Publications_last || 0,
      
      // 10 years publications
      'Publications (last 10 years)': reviewer.publications_10y || reviewer['Publications (last 10 years)'] || reviewer.Publications_10_years || 0,
      Publications_10_years: reviewer.Publications_10_years || reviewer.publications_10y || reviewer['Publications (last 10 years)'] || 0,
      Publications_10_years_first: reviewer.Publications_10_years_first || 0,
      Publications_10_years_last: reviewer.Publications_10_years_last || 0,
      
      // 5 years publications
      Publications_5_years: reviewer.Publications_5_years || 0,
      Publications_5_years_first: reviewer.Publications_5_years_first || 0,
      Publications_5_years_last: reviewer.Publications_5_years_last || 0,
      'Relevant Publications (last 5 years)': reviewer.publications_5y || reviewer['Relevant Publications (last 5 years)'] || reviewer.Relevant_Publications_5_years || 0,
      Relevant_Publications_5_years: reviewer.Relevant_Publications_5_years || reviewer.publications_5y || reviewer['Relevant Publications (last 5 years)'] || 0,
      Relevant_Publications_5_years_first: reviewer.Relevant_Publications_5_years_first || 0,
      Relevant_Publications_5_years_last: reviewer.Relevant_Publications_5_years_last || 0,
      
      // 2 years publications
      'Publications (last 2 years)': reviewer.publications_2y || reviewer['Publications (last 2 years)'] || reviewer.Publications_2_years || 0,
      Publications_2_years: reviewer.Publications_2_years || reviewer.publications_2y || reviewer['Publications (last 2 years)'] || 0,
      Publications_2_years_first: reviewer.Publications_2_years_first || 0,
      Publications_2_years_last: reviewer.Publications_2_years_last || 0,
      Relevant_Primary_Pub_2_years: reviewer.Relevant_Primary_Pub_2_years || 0,
      Relevant_Secondary_Pub_2_years: reviewer.Relevant_Secondary_Pub_2_years || 0,
      
      // Last year publications
      'Publications (last year)': reviewer.publications_1y || reviewer['Publications (last year)'] || reviewer.Publications_last_year || 0,
      Publications_last_year: reviewer.Publications_last_year || reviewer.publications_1y || reviewer['Publications (last year)'] || 0,
      Publications_last_year_first: reviewer.Publications_last_year_first || 0,
      Publications_last_year_last: reviewer.Publications_last_year_last || 0,
      
      // Specialized publications
      Clinical_Trials_no: reviewer.clinical_trials || reviewer.Clinical_Trials_no || 0,
      Clinical_study_no: reviewer.clinical_studies || reviewer.Clinical_study_no || 0,
      Case_reports_no: reviewer.case_reports || reviewer.Case_reports_no || 0,
      Retracted_Pubs_no: reviewer.retracted_pubs || reviewer.Retracted_Pubs_no || 0,
      TF_Publications_last_year: reviewer.tf_publications_last_year || reviewer.TF_Publications_last_year || 0,
      
      // Language and quality
      English_Pubs: reviewer.english_pubs || reviewer.English_Pubs || 0,
      english_ratio: reviewer.english_ratio || 0,
      
      // Validation fields
      coauthor: reviewer.coauthor || false,
      coi_coauthor: reviewer.coi_coauthor || false,
      aff_match: reviewer.aff_match || 'no',
      country_match: reviewer.country_match || 'yes',
      sanction_country: reviewer.sanction_country || 'no',
      
      // Condition flags
      no_of_pub_condition_10_years: reviewer.no_of_pub_condition_10_years || 0,
      no_of_pub_condition_5_years: reviewer.no_of_pub_condition_5_years || 0,
      no_of_pub_condition_2_years: reviewer.no_of_pub_condition_2_years || 0,
      english_condition: reviewer.english_condition || 0,
      coauthor_condition: reviewer.coauthor_condition || 0,
      aff_condition: reviewer.aff_condition || 0,
      country_match_condition: reviewer.country_match_condition || 0,
      retracted_condition: reviewer.retracted_condition || 0,
      coi_condition: reviewer.coi_condition || 0
    };
  }) : rawReviewers;
  
  // Debug logging for reviewer data
  console.log('🔍 [DEBUG] Reviewer data:', {
    totalReviewers: allReviewers.length,
    reviewerEmails: allReviewers.map(r => r.email),
    duplicateEmails: allReviewers.map(r => r.email).filter((email, index, arr) => arr.indexOf(email) !== index),
    sampleReviewer: allReviewers[0]
  });
  
  const totalCount = validationData ? allReviewers.length : (apiResponse?.total_count || 0);
  const validationSummary = validationData ? {
    total_authors: allReviewers.length,
    authors_validated: allReviewers.length,
    average_conditions_met: allReviewers.reduce((sum: number, r: any) => sum + (r.conditions_met || 0), 0) / Math.max(allReviewers.length, 1)
  } : apiResponse?.validation_summary;

  // Client-side filtering and sorting
  // Reviewers are already sorted by conditions_met (descending) from the API
  const filteredReviewers = useMemo(() => {
    let filtered = [...allReviewers];

    // Filter by minimum conditions_met score
    if (minConditionsMet > 0) {
      filtered = filtered.filter(r => r.conditions_met >= minConditionsMet);
    }

    // Filter by country
    if (selectedCountry && selectedCountry !== "all") {
      filtered = filtered.filter(r => r.country === selectedCountry);
    }

    // Filter by search term (name, affiliation, country)
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        r.reviewer.toLowerCase().includes(search) ||
        r.aff.toLowerCase().includes(search) ||
        r.country.toLowerCase().includes(search)
      );
    }

    return filtered;
  }, [allReviewers, minConditionsMet, selectedCountry, searchTerm]);

  // Get unique countries for filter dropdown
  const availableCountries = useMemo(() => {
    const countries = [...new Set(allReviewers.map(r => r.country))];
    return countries.sort();
  }, [allReviewers]);

  // Get color for conditions_met score badge
  const getConditionsMetColor = (score: number) => {
    if (score >= 8) return "bg-green-500 text-white";
    if (score >= 6) return "bg-blue-500 text-white";
    if (score >= 4) return "bg-yellow-500 text-white";
    return "bg-gray-500 text-white";
  };

  // Get validation criteria icon
  const getValidationIcon = (satisfied: boolean) => {
    return satisfied ? (
      <CheckCircle2 className="w-4 h-4 text-green-500" />
    ) : (
      <XCircle className="w-4 h-4 text-gray-400" />
    );
  };

  // Calculate actual conditions met for selected conditions only
  const calculateSelectedConditionsMet = (reviewer: any): number => {
    if (!selectedValidationConditions || selectedValidationConditions.length === 0) {
      return 0;
    }

    let metCount = 0;

    selectedValidationConditions.forEach(conditionId => {
      let isMet = false;

      switch (conditionId) {
        case 'Publications':
          isMet = reviewer.Publications_10_years >= 8;
          break;
        case 'Relevant Publications':
          isMet = reviewer['Relevant Publications (last 5 years)'] >= 3;
          break;
        case 'Publication Types':
          isMet = reviewer.Publications_2_years >= 1 && reviewer.English_Pubs > reviewer.Total_Publications / 2;
          break;
        case 'Coauthor':
          isMet = !reviewer.coauthor;
          break;
        case 'Affiliation/Country match':
          isMet = reviewer.aff_match === 'no' && reviewer.country_match === 'yes';
          break;
        case 'Conflict of Interest':
          isMet = (() => {
            const hasAuthorId = (value: any) => {
              if (typeof value === 'string') {
                return /A\d+/.test(value);
              }
              return false;
            };
            const isTrue = reviewer.coi_coauthor === true || 
                          reviewer.coi_coauthor === 'TRUE' || 
                          reviewer.coi_coauthor === 'True' || 
                          reviewer.coi_coauthor === 'true';
            const isFalse = reviewer.coi_coauthor === false || 
                           reviewer.coi_coauthor === 'FALSE' || 
                           reviewer.coi_coauthor === 'False' || 
                           reviewer.coi_coauthor === 'false';
            return isFalse || (!hasAuthorId(reviewer.coi_coauthor) && !isTrue);
          })();
          break;
        case 'First/Last Author in publications':
          isMet = (reviewer.Total_Publications_first || 0) > 0 || (reviewer.Total_Publications_last || 0) > 0;
          break;
        case 'T&F Publications last year':
          isMet = (reviewer.TF_Publications_last_year || 0) > 0;
          break;
        case 'Study Type Detection':
          isMet = reviewer.study_type ? true : false;
          break;
        case 'Sanction Country':
          isMet = (reviewer.sanction_country || 'no').toLowerCase() !== 'yes';
          break;
        case 'Retraction History':
          isMet = (reviewer.Retracted_Pubs_no || 0) === 0;
          break;
      }

      if (isMet) {
        metCount++;
      }
    });

    return metCount;
  };

  const handleSelectReviewer = useCallback((reviewerEmail: string, checked: boolean) => {
    console.log('🔍 [DEBUG] handleSelectReviewer called:', { 
      reviewerEmail, 
      checked, 
      currentSelectedCount: selectedReviewerIds.size,
      selectionInProgress: selectionInProgressRef.current 
    });
    
    // Prevent race conditions
    if (selectionInProgressRef.current) {
      console.log('🚫 [DEBUG] Selection in progress, ignoring call');
      return;
    }
    
    selectionInProgressRef.current = true;
    
    setSelectedReviewerIds(prevSelected => {
      console.log('🔄 [DEBUG] State update function called:', {
        prevSelectedSize: prevSelected.size,
        prevSelectedEmails: Array.from(prevSelected),
        reviewerEmail,
        checked
      });
      
      const newSelectedIds = new Set(prevSelected);
      if (checked) {
        newSelectedIds.add(reviewerEmail);
        console.log('✅ [DEBUG] Added reviewer:', reviewerEmail);
      } else {
        newSelectedIds.delete(reviewerEmail);
        console.log('❌ [DEBUG] Removed reviewer:', reviewerEmail);
      }
      
      console.log('📊 [DEBUG] New selection state:', {
        newSelectedSize: newSelectedIds.size,
        newSelectedEmails: Array.from(newSelectedIds)
      });
      
      // Reset the flag after a short delay
      setTimeout(() => {
        selectionInProgressRef.current = false;
        console.log('🔓 [DEBUG] Selection flag reset');
      }, 100);
      
      return newSelectedIds;
    });
  }, [selectedReviewerIds.size]);

  const handleSelectAll = useCallback((checked: boolean) => {
    console.log('🔍 [DEBUG] handleSelectAll called:', { 
      checked, 
      filteredCount: filteredReviewers.length,
      currentSelectedCount: selectedReviewerIds.size,
      selectionInProgress: selectionInProgressRef.current 
    });
    
    // Prevent race conditions
    if (selectionInProgressRef.current) {
      console.log('🚫 [DEBUG] Select All - Selection in progress, ignoring call');
      return;
    }
    
    selectionInProgressRef.current = true;
    
    if (checked) {
      const allEmails = filteredReviewers.map(r => r.email);
      console.log('✅ [DEBUG] Selecting all reviewers:', allEmails);
      setSelectedReviewerIds(new Set(allEmails));
    } else {
      console.log('❌ [DEBUG] Deselecting all reviewers');
      setSelectedReviewerIds(new Set());
    }
    
    // Reset the flag after a short delay
    setTimeout(() => {
      selectionInProgressRef.current = false;
      console.log('🔓 [DEBUG] Select All flag reset');
    }, 100);
  }, [filteredReviewers, selectedReviewerIds.size]);

  const handleOpenExportDialog = () => {
    const selectedReviewers = filteredReviewers.filter(r => selectedReviewerIds.has(r.email));
    
    if (selectedReviewers.length === 0) {
      toast.error("Please select at least one reviewer to export");
      return;
    }

    setShowExportDialog(true);
  };

  const handleExport = async (format: 'csv' | 'json') => {
    const selectedReviewers = filteredReviewers.filter(r => selectedReviewerIds.has(r.email));
    
    if (selectedReviewers.length === 0) {
      throw new Error("No reviewers selected");
    }

    try {
      // Export based on format, passing selected validation conditions
      if (format === 'csv') {
        exportReviewersAsCSV(selectedReviewers, selectedValidationConditions);
      } else {
        exportReviewersAsJSON(selectedReviewers, selectedValidationConditions);
      }

      // Log the export activity
      const logger = ActivityLogger.getInstance();
      await logger.logActivity(
        'EXPORT',
        `Exported ${selectedReviewers.length} reviewers as ${format.toUpperCase()}${selectedValidationConditions ? ` with ${selectedValidationConditions.length} selected conditions` : ''}`,
        JSON.stringify({
          processId,
          format,
          reviewerCount: selectedReviewers.length,
          reviewerNames: selectedReviewers.map(r => r.reviewer),
          averageConditionsMet: selectedReviewers.reduce((sum, r) => sum + r.conditions_met, 0) / selectedReviewers.length,
          selectedValidationConditions: selectedValidationConditions || []
        })
      );
    } catch (error) {
      console.error('Export error:', error);
      throw error;
    }
  };

  // COI click handler
  const handleCOIClick = useCallback((reviewer: any) => {
    // Extract author ID from coi_coauthor field
    const extractAuthorId = (coiValue: any): string | null => {
      if (typeof coiValue === 'string') {
        // Look for author ID pattern (A followed by numbers)
        const match = coiValue.match(/A\d+/);
        return match ? match[0] : null;
      }
      return null;
    };
    
    const authorId = extractAuthorId(reviewer.coi_coauthor);
    if (authorId) {
      setSelectedCOIAuthor({
        authorId,
        authorName: reviewer.reviewer
      });
      setCOIModalOpen(true);
    }
  }, []);

  const handleAddToShortlist = () => {
    const selectedReviewers = filteredReviewers.filter(r => selectedReviewerIds.has(r.email));
    
    if (selectedReviewers.length === 0) {
      toast.error("Please select at least one reviewer to add to shortlist");
      return;
    }

    // Open the shortlist dialog
    setShowShortlistDialog(true);
  };

  const handleCreateShortlist = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!shortlistName.trim()) {
      toast.error("Please enter a shortlist name");
      return;
    }

    const selectedReviewers = filteredReviewers.filter(r => selectedReviewerIds.has(r.email));
    
    if (selectedReviewers.length === 0) {
      toast.error("Please select at least one reviewer");
      return;
    }

    try {
      // Create shortlist with reviewer emails as IDs
      await createShortlistMutation.mutateAsync({
        processId,
        data: {
          name: shortlistName,
          selectedReviewers: selectedReviewers.map(r => r.email)
        }
      });

      // Log the activity
      const logger = ActivityLogger.getInstance();
      await logger.logActivity(
        'SHORTLIST_CREATED',
        `Created shortlist "${shortlistName}" with ${selectedReviewers.length} reviewers`,
        JSON.stringify({
          processId,
          shortlistName,
          reviewerCount: selectedReviewers.length,
          reviewerNames: selectedReviewers.map(r => r.reviewer),
          averageConditionsMet: selectedReviewers.reduce((sum, r) => sum + r.conditions_met, 0) / selectedReviewers.length
        })
      );

      toast.success(`Shortlist "${shortlistName}" created with ${selectedReviewers.length} reviewers`);
      
      // Reset state
      setShowShortlistDialog(false);
      setShortlistName("");
      setSelectedReviewerIds(new Set());
      
      // Navigate to shortlist step if callback provided
      if (onShortlistCreated) {
        onShortlistCreated();
      }
    } catch (error) {
      console.error('Shortlist creation error:', error);
      toast.error("Failed to create shortlist. Please try again.");
    }
  };

  const handleCloseShortlistDialog = () => {
    setShowShortlistDialog(false);
    setShortlistName("");
  };

  // Handle loading state (only if not using validation data)
  if (!validationData && isLoading) {
    return <ReviewerResultsSkeleton />;
  }

  // Handle error state (only if not using validation data)
  if (!validationData && error) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive mb-2 font-semibold">Failed to load recommendations</p>
            <p className="text-sm text-muted-foreground mb-4">
              {error instanceof Error ? error.message : "An error occurred while fetching reviewer recommendations"}
            </p>
            <Button 
              variant="outline" 
              onClick={() => refetch()}
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Handle no data state
  if (!allReviewers || allReviewers.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">No reviewer recommendations available</p>
            <p className="text-sm text-muted-foreground">
              Please complete the validation step first to generate recommendations.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-primary" />
                <span>{validationData ? 'Reviewer Recommendations from Validation' : 'Reviewer Recommendations'}</span>
              </CardTitle>
              <CardDescription>
                Showing {filteredReviewers.length} of {totalCount} validated reviewers
                {validationSummary && (
                  <span className="ml-2">
                    • Average score: {validationSummary.average_conditions_met.toFixed(1)}/{selectedValidationConditions && selectedValidationConditions.length > 0 ? selectedValidationConditions.length : 9}
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
              <Button 
                onClick={handleAddToShortlist} 
                variant="default"
                disabled={selectedReviewerIds.size === 0}
              >
                <ListPlus className="w-4 h-4 mr-2" />
                Add to Shortlist ({selectedReviewerIds.size})
              </Button>
              <Button 
                onClick={handleOpenExportDialog} 
                variant="outline"
                disabled={selectedReviewerIds.size === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                Export ({selectedReviewerIds.size})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Quick Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Search reviewers by name, affiliation, or country..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Select
                value={selectedCountry}
                onValueChange={setSelectedCountry}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  {availableCountries.map((country: string) => (
                    <SelectItem key={country} value={country}>{country}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Advanced Filters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  {/* Minimum Conditions Met Filter */}
                  <div className="space-y-2">
                    <Label>Minimum Validation Score: {minConditionsMet}/{selectedValidationConditions && selectedValidationConditions.length > 0 ? selectedValidationConditions.length : 9}</Label>
                    <div className="px-3">
                      <Slider
                        value={[minConditionsMet]}
                        onValueChange={([value]) => setMinConditionsMet(value)}
                        max={selectedValidationConditions && selectedValidationConditions.length > 0 ? selectedValidationConditions.length : 9}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>0 (All)</span>
                        <span>{selectedValidationConditions && selectedValidationConditions.length > 0 ? selectedValidationConditions.length : 9} (Perfect)</span>
                      </div>
                    </div>
                  </div>

                  {/* Validation Summary */}
                  {validationSummary && (
                    <div className="p-4 bg-muted rounded-lg">
                      <h4 className="text-sm font-medium mb-2">Validation Summary</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>Total Authors: {validationSummary.total_authors}</div>
                        <div>Validated: {validationSummary.authors_validated}</div>
                        <div className="col-span-2">
                          Average Score: {validationSummary.average_conditions_met.toFixed(2)}/{selectedValidationConditions && selectedValidationConditions.length > 0 ? selectedValidationConditions.length : 9}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setMinConditionsMet(0);
                      setSelectedCountry("all");
                      setSearchTerm("");
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Selection Controls */}
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-muted-foreground">
              Sorted by validation score (highest first)
            </div>
            
            {filteredReviewers.length > 0 && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-all"
                  checked={
                    selectedReviewerIds.size > 0 && 
                    filteredReviewers.every(r => selectedReviewerIds.has(r.email))
                  }
                  ref={(el) => {
                    if (el) {
                      const someSelected = selectedReviewerIds.size > 0 && 
                        !filteredReviewers.every(r => selectedReviewerIds.has(r.email));
                      el.indeterminate = someSelected;
                    }
                  }}
                  onCheckedChange={(checked) => {
                    console.log('🔍 [DEBUG] Select All checkbox changed:', { checked, typeof: typeof checked });
                    // Prevent automatic triggering by ensuring this is a user action
                    if (typeof checked === 'boolean') {
                      handleSelectAll(checked);
                    } else {
                      console.log('🚫 [DEBUG] Select All - Non-boolean value ignored:', checked);
                    }
                  }}
                />
                <label
                  htmlFor="select-all"
                  className="text-sm font-medium cursor-pointer"
                >
                  Select All ({filteredReviewers.length})
                </label>
              </div>
            )}
          </div>

          {/* Reviewers List */}
          <div className="space-y-4">
            {filteredReviewers.map((reviewer, index) => (
              <Card key={`reviewer-card-${reviewer.email}-${index}`} className="border-l-4 border-l-primary/30" role="article" aria-label={`Reviewer: ${reviewer.reviewer}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start space-x-3 flex-1">
                      <Checkbox
                        id={`reviewer-checkbox-${reviewer.email}-${index}`}
                        checked={selectedReviewerIds.has(reviewer.email)}
                        onCheckedChange={(checked) => {
                          console.log('🔍 [DEBUG] Individual checkbox changed:', { 
                            reviewerEmail: reviewer.email, 
                            reviewerName: reviewer.reviewer,
                            index,
                            checked, 
                            typeof: typeof checked,
                            currentSelected: Array.from(selectedReviewerIds)
                          });
                          // Ensure we only handle boolean values to prevent unintended triggers
                          if (typeof checked === 'boolean') {
                            handleSelectReviewer(reviewer.email, checked);
                          } else {
                            console.log('🚫 [DEBUG] Individual - Non-boolean value ignored:', checked);
                          }
                        }}
                        aria-label={`Select reviewer ${reviewer.reviewer}`}
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-semibold text-lg">{reviewer.reviewer}</h3>
                          <Badge className={getConditionsMetColor(calculateSelectedConditionsMet(reviewer))} aria-label={`Validation score: ${calculateSelectedConditionsMet(reviewer)} out of ${selectedValidationConditions && selectedValidationConditions.length > 0 ? selectedValidationConditions.length : 9} criteria met`}>
                            {calculateSelectedConditionsMet(reviewer)}/{selectedValidationConditions && selectedValidationConditions.length > 0 ? selectedValidationConditions.length : 9} criteria met
                          </Badge>
                        </div>
                        
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center">
                            <Building className="w-4 h-4 mr-2" aria-hidden="true" />
                            <span aria-label="Affiliation">{reviewer.aff}</span>
                          </div>
                          <div className="flex items-center">
                            <Mail className="w-4 h-4 mr-2" aria-hidden="true" />
                            <span aria-label="Email">{reviewer.email}</span>
                          </div>
                          <div className="flex items-center">
                            <BookOpen className="w-4 h-4 mr-2" aria-hidden="true" />
                            <span aria-label="Location">{reviewer.city}, {reviewer.country}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  <div className="space-y-4">
                    {/* Publication Metrics */}
                    <div role="region" aria-label="Publication metrics">
                      <h4 className="text-sm font-medium mb-4 flex items-center">
                        <BookOpen className="w-4 h-4 mr-2 text-primary" />
                        Publication Portfolio
                      </h4>
                      
                      {/* Career Overview */}
                      <div className="mb-6">
                        <div className="flex items-center mb-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                          <h5 className="text-sm font-medium text-gray-700">Career Overview</h5>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-blue-700">Total Publications</span>
                              <BookOpen className="w-3 h-3 text-blue-600" />
                            </div>
                            <div className="text-lg font-bold text-blue-900">{reviewer.Total_Publications || 0}</div>
                            <div className="text-xs text-blue-600 mt-1">
                              {reviewer.Total_Publications_first || 0} as first • {reviewer.Total_Publications_last || 0} as last
                            </div>
                          </div>
                          
                          <div className="p-3 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg border border-emerald-200">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-emerald-700">English Publications</span>
                              <span className="text-xs bg-emerald-200 text-emerald-800 px-1 rounded">EN</span>
                            </div>
                            <div className="text-lg font-bold text-emerald-900">{reviewer.English_Pubs || 0}</div>
                            <div className="text-xs text-emerald-600 mt-1">
                              {reviewer.english_ratio ? 
                                `${Math.round(reviewer.english_ratio * 100)}% ratio` : 
                                reviewer.Total_Publications > 0 ? 
                                  `${Math.round((reviewer.English_Pubs || 0) / reviewer.Total_Publications * 100)}% of total` : 
                                  'No publications'
                              }
                            </div>
                          </div>

                          <div className="p-3 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg border border-amber-200">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-amber-700">Recent Activity</span>
                              <span className="text-xs bg-amber-200 text-amber-800 px-1 rounded">2Y</span>
                            </div>
                            <div className="text-lg font-bold text-amber-900">{reviewer.Publications_2_years || 0}</div>
                            <div className="text-xs text-amber-600 mt-1">
                              {reviewer.Publications_last_year || 0} in last year
                            </div>
                          </div>

                          <div className="p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-purple-700">Quality Score</span>
                              <span className="text-xs bg-purple-200 text-purple-800 px-1 rounded">QS</span>
                            </div>
                            <div className="text-lg font-bold text-purple-900">
                              {reviewer.Retracted_Pubs_no === 0 ? '✓' : '⚠'}
                            </div>
                            <div className="text-xs text-purple-600 mt-1">
                              {reviewer.Retracted_Pubs_no || 0} retractions
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Publication Timeline */}
                      <div className="mb-6">
                        <div className="flex items-center mb-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                          <h5 className="text-sm font-medium text-gray-700">Publication Timeline</h5>
                          <span className="text-xs text-gray-500 ml-2">(Total • First Author • Last Author)</span>
                        </div>
                        
                        <div className="space-y-3">
                          {/* 10 Years Timeline */}
                          <div className="relative">
                            <div className="flex items-center mb-2">
                              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                                <span className="text-xs font-bold text-green-700">10Y</span>
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-gray-700">Last 10 Years</span>
                                  <div className="flex items-center space-x-4 text-sm">
                                    <span className="font-semibold text-green-700">{reviewer.Publications_10_years || 0}</span>
                                    <span className="text-green-600">({reviewer.Publications_10_years_first || 0} • {reviewer.Publications_10_years_last || 0})</span>
                                  </div>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                  <div 
                                    className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                                    style={{
                                      width: `${Math.min(100, ((reviewer.Publications_10_years || 0) / Math.max(reviewer.Total_Publications || 1, 1)) * 100)}%`
                                    }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* 5 Years Timeline */}
                          <div className="relative">
                            <div className="flex items-center mb-2">
                              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center mr-3">
                                <span className="text-xs font-bold text-yellow-700">5Y</span>
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-medium text-gray-700">Last 5 Years</span>
                                  <div className="flex items-center space-x-4 text-sm">
                                    <span className="font-semibold text-yellow-700">{reviewer.Publications_5_years || 0}</span>
                                    <span className="text-yellow-600">({reviewer.Publications_5_years_first || 0} • {reviewer.Publications_5_years_last || 0})</span>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-gray-600">Relevant to keywords:</span>
                                  <div className="flex items-center space-x-2">
                                    <span className="font-semibold text-purple-700">{reviewer['Relevant Publications (last 5 years)'] || 0}</span>
                                    <span className="text-purple-600">({reviewer.Relevant_Publications_5_years_first || 0} • {reviewer.Relevant_Publications_5_years_last || 0})</span>
                                  </div>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                  <div 
                                    className="bg-yellow-500 h-2 rounded-full transition-all duration-300" 
                                    style={{
                                      width: `${Math.min(100, ((reviewer.Publications_5_years || 0) / Math.max(reviewer.Total_Publications || 1, 1)) * 100)}%`
                                    }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Recent Activity */}
                          <div className="relative">
                            <div className="flex items-center mb-2">
                              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                                <span className="text-xs font-bold text-orange-700">2Y</span>
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-medium text-gray-700">Last 2 Years</span>
                                  <div className="flex items-center space-x-4 text-sm">
                                    <span className="font-semibold text-orange-700">{reviewer.Publications_2_years || 0}</span>
                                    <span className="text-orange-600">({reviewer.Publications_2_years_first || 0} • {reviewer.Publications_2_years_last || 0})</span>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between text-xs mb-1">
                                  <span className="text-gray-600">Relevant (Primary/Secondary):</span>
                                  <div className="flex items-center space-x-2">
                                    <span className="font-semibold text-purple-700">{reviewer.Relevant_Primary_Pub_2_years || 0}</span>
                                    <span className="text-purple-600">/ {reviewer.Relevant_Secondary_Pub_2_years || 0}</span>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-gray-600">Last year only:</span>
                                  <div className="flex items-center space-x-2">
                                    <span className="font-semibold text-red-700">{reviewer.Publications_last_year || 0}</span>
                                    <span className="text-red-600">({reviewer.Publications_last_year_first || 0} • {reviewer.Publications_last_year_last || 0})</span>
                                  </div>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                  <div 
                                    className="bg-orange-500 h-2 rounded-full transition-all duration-300" 
                                    style={{
                                      width: `${Math.min(100, ((reviewer.Publications_2_years || 0) / Math.max(reviewer.Total_Publications || 1, 1)) * 100)}%`
                                    }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Research Focus Areas - Show different parts based on selected conditions */}
                      {selectedValidationConditions && selectedValidationConditions.length > 0 && (
                        selectedValidationConditions.includes('Publication Types') || 
                        selectedValidationConditions.includes('T&F Publications last year') ||
                        selectedValidationConditions.includes('Retraction History')
                      ) && (
                        <div>
                          <div className="flex items-center mb-3">
                            <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                            <h5 className="text-sm font-medium text-gray-700">Research Focus Areas</h5>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                            {/* Publication Types related items - only show if Publication Types is selected */}
                            {selectedValidationConditions && selectedValidationConditions.includes('Publication Types') && (
                              <>
                                <div className="p-3 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg border border-indigo-200 text-center">
                                  <div className="text-xs font-medium text-indigo-700 mb-1">Clinical Trials</div>
                                  <div className="text-lg font-bold text-indigo-900">{reviewer.Clinical_Trials_no || 0}</div>
                                  <div className="text-xs text-indigo-600">Research studies</div>
                                </div>
                                
                                <div className="p-3 bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-lg border border-cyan-200 text-center">
                                  <div className="text-xs font-medium text-cyan-700 mb-1">Clinical Studies</div>
                                  <div className="text-lg font-bold text-cyan-900">{reviewer.Clinical_study_no || 0}</div>
                                  <div className="text-xs text-cyan-600">Clinical research</div>
                                </div>
                                
                                <div className="p-3 bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg border border-teal-200 text-center">
                                  <div className="text-xs font-medium text-teal-700 mb-1">Case Reports</div>
                                  <div className="text-lg font-bold text-teal-900">{reviewer.Case_reports_no || 0}</div>
                                  <div className="text-xs text-teal-600">Case studies</div>
                                </div>
                              </>
                            )}
                            
                            {/* Retractions - only show if Retraction History is selected */}
                            {selectedValidationConditions && selectedValidationConditions.includes('Retraction History') && (
                              <div className="p-3 bg-gradient-to-br from-red-50 to-red-100 rounded-lg border border-red-200 text-center">
                                <div className="text-xs font-medium text-red-700 mb-1">Retractions</div>
                                <div className="text-lg font-bold text-red-900">{reviewer.Retracted_Pubs_no || 0}</div>
                                <div className="text-xs text-red-600">Quality indicator</div>
                              </div>
                            )}
                            
                            {/* T&F Publications - controlled by T&F Publications last year condition */}
                            {selectedValidationConditions && selectedValidationConditions.includes('T&F Publications last year') && (
                              <div className="p-3 bg-gradient-to-br from-violet-50 to-violet-100 rounded-lg border border-violet-200 text-center">
                                <div className="text-xs font-medium text-violet-700 mb-1">T&F Publications</div>
                                <div className="text-lg font-bold text-violet-900">{reviewer.TF_Publications_last_year || 0}</div>
                                <div className="text-xs text-violet-600">Last year</div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Study Type Distribution - Only show if Study Type Detection is selected */}
                      {selectedValidationConditions && selectedValidationConditions.includes('Study Type Detection') && (
                        <div className="mt-6">
                          <div className="flex items-center mb-3">
                            <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                            <h5 className="text-sm font-medium text-gray-700">Study Type Distribution</h5>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            {(() => {
                              // Parse the study_type JSON string
                              let studyTypeCounts = { in_vivo: 0, in_vitro: 0, in_silico: 0 };
                              try {
                                if (reviewer.study_type) {
                                  const parsedStudyType = JSON.parse(reviewer.study_type.replace(/'/g, '"'));
                                  studyTypeCounts = parsedStudyType.study_type_counts || studyTypeCounts;
                                }
                              } catch (error) {
                                console.log('Error parsing study_type for reviewer:', reviewer.reviewer, error);
                              }
                              
                              return (
                                <>
                                  <div className="p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200 text-center">
                                    <div className="text-xs font-medium text-green-700 mb-1">In Vivo</div>
                                    <div className="text-lg font-bold text-green-900">{studyTypeCounts.in_vivo}</div>
                                    <div className="text-xs text-green-600">Animal studies</div>
                                  </div>
                                  
                                  <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200 text-center">
                                    <div className="text-xs font-medium text-blue-700 mb-1">In Vitro</div>
                                    <div className="text-lg font-bold text-blue-900">{studyTypeCounts.in_vitro}</div>
                                    <div className="text-xs text-blue-600">Lab studies</div>
                                  </div>
                                  
                                  <div className="p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200 text-center">
                                    <div className="text-xs font-medium text-purple-700 mb-1">In Silico</div>
                                    <div className="text-lg font-bold text-purple-900">{studyTypeCounts.in_silico}</div>
                                    <div className="text-xs text-purple-600">Computational</div>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Validation Criteria - Only show selected conditions */}
                    {selectedValidationConditions && selectedValidationConditions.length > 0 && (
                      <div role="region" aria-label="Validation criteria">
                        {(() => {
                          const actualConditionsMet = calculateSelectedConditionsMet(reviewer);
                          
                          return (
                            <>
                              <h4 className="text-sm font-medium mb-2">
                                Validation Criteria ({actualConditionsMet} conditions met)
                                <span className="text-xs text-muted-foreground ml-2">
                                  (Showing {selectedValidationConditions.length} selected conditions)
                                </span>
                              </h4>
                            </>
                          );
                        })()}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm" role="list">
                          {/* Show only selected validation conditions */}
                          {selectedValidationConditions.map(conditionId => {
                            switch (conditionId) {
                              case 'Publications':
                                return (
                                  <div key="publications" className="flex items-center space-x-2">
                                    {getValidationIcon(reviewer.Publications_10_years >= 8)}
                                    <span>Publications (last 10 years) ≥ 8</span>
                                  </div>
                                );
                              case 'Relevant Publications':
                                return (
                                  <div key="relevant-publications" className="flex items-center space-x-2">
                                    {getValidationIcon(reviewer['Relevant Publications (last 5 years)'] >= 3)}
                                    <span>Relevant Publications (last 5 years) ≥ 3</span>
                                  </div>
                                );
                              case 'Publication Types':
                                return (
                                  <div key="publication-types" className="flex items-center space-x-2">
                                    {getValidationIcon(reviewer.Publications_2_years >= 1 && reviewer.English_Pubs > reviewer.Total_Publications / 2)}
                                    <span>Publication Types Criteria Met</span>
                                  </div>
                                );
                              case 'Coauthor':
                                return (
                                  <div key="coauthor" className="flex items-center space-x-2">
                                    {getValidationIcon(!reviewer.coauthor)}
                                    <span>No Coauthorship</span>
                                  </div>
                                );
                              case 'Affiliation/Country match':
                                return (
                                  <div key="affiliation-country" className="flex items-center space-x-2">
                                    {getValidationIcon(reviewer.aff_match === 'no' && reviewer.country_match === 'yes')}
                                    <span>Affiliation/Country Requirements Met</span>
                                  </div>
                                );
                              case 'Conflict of Interest':
                                return (
                                  <div key="coi" className="flex items-center space-x-2">
                                    {getValidationIcon((() => {
                                      const hasAuthorId = (value: any) => {
                                        if (typeof value === 'string') {
                                          // Check if string contains author ID pattern: A followed by numbers
                                          return /A\d+/.test(value);
                                        }
                                        return false;
                                      };
                                      
                                      const isTrue = reviewer.coi_coauthor === true || 
                                                    reviewer.coi_coauthor === 'TRUE' || 
                                                    reviewer.coi_coauthor === 'True' || 
                                                    reviewer.coi_coauthor === 'true';
                                      
                                      const isFalse = reviewer.coi_coauthor === false || 
                                                     reviewer.coi_coauthor === 'FALSE' || 
                                                     reviewer.coi_coauthor === 'False' || 
                                                     reviewer.coi_coauthor === 'false';
                                      
                                      // No COI if FALSE/False, or if no author ID detected and not TRUE
                                      return isFalse || (!hasAuthorId(reviewer.coi_coauthor) && !isTrue);
                                    })())}
                                    <span>No Conflict of Interest</span>
                                  </div>
                                );
                              case 'First/Last Author in publications':
                                return (
                                  <div key="first-last-author" className="flex items-center space-x-2">
                                    {getValidationIcon((reviewer.Total_Publications_first || 0) > 0 || (reviewer.Total_Publications_last || 0) > 0)}
                                    <span>First/Last Author Publications</span>
                                  </div>
                                );
                              case 'T&F Publications last year':
                                return (
                                  <div key="tf-publications" className="flex items-center space-x-2">
                                    {getValidationIcon((reviewer.TF_Publications_last_year || 0) > 0)}
                                    <span>Taylor & Francis Publications (last year)</span>
                                  </div>
                                );
                              case 'Study Type Detection':
                                return (
                                  <div key="study-type" className="flex items-center space-x-2">
                                    {getValidationIcon(reviewer.study_type ? true : false)}
                                    <span>Study Type Analysis Available</span>
                                  </div>
                                );
                              case 'Sanction Country':
                                return (
                                  <div key="sanction-country" className="flex items-center space-x-2">
                                    {getValidationIcon((reviewer.sanction_country || 'no').toLowerCase() !== 'yes')}
                                    <span>Not from Sanctioned Country</span>
                                  </div>
                                );
                              case 'Retraction History':
                                return (
                                  <div key="retraction-history" className="flex items-center space-x-2">
                                    {getValidationIcon((reviewer.Retracted_Pubs_no || 0) === 0)}
                                    <span>No Retracted Publications</span>
                                  </div>
                                );
                              default:
                                return null;
                            }
                          }).filter(Boolean)}
                        </div>
                      </div>
                    )}

                    {/* COI Container for this reviewer - Only show if Conflict of Interest is selected */}
                    {selectedValidationConditions && selectedValidationConditions.includes('Conflict of Interest') && (
                      <div role="region" aria-label="Conflict of Interest details">
                        {(() => {
                          // Determine COI status based on coi_coauthor column
                          // COI is "No" if coi_coauthor is FALSE or False
                          // COI is "Yes" with clickable link when coi_coauthor contains author ID format (A followed by numbers)
                          // COI is "Yes" without clickable link when coi_coauthor is TRUE or True
                          const hasAuthorId = (value: any) => {
                            if (typeof value === 'string') {
                              // Check if string contains author ID pattern: A followed by numbers
                              return /A\d+/.test(value);
                            }
                            return false;
                          };
                          
                          const isTrue = reviewer.coi_coauthor === true || 
                                        reviewer.coi_coauthor === 'TRUE' || 
                                        reviewer.coi_coauthor === 'True' || 
                                        reviewer.coi_coauthor === 'true';
                          
                          const isFalse = reviewer.coi_coauthor === false || 
                                         reviewer.coi_coauthor === 'FALSE' || 
                                         reviewer.coi_coauthor === 'False' || 
                                         reviewer.coi_coauthor === 'false';
                          
                          const coiStatus = isFalse 
                            ? 'No' 
                            : hasAuthorId(reviewer.coi_coauthor) 
                              ? 'Yes' 
                              : isTrue 
                                ? 'Yes' 
                                : 'No';
                          
                          const isClickable = hasAuthorId(reviewer.coi_coauthor);
                          const coiColor = coiStatus === 'No' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';
                          const coiTextColor = coiStatus === 'No' ? 'text-green-800' : 'text-red-800';
                          const coiBadgeColor = coiStatus === 'No' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
                          const coiIcon = coiStatus === 'No' ? '✓' : '⚠';
                          
                          return (
                            <div className={`p-4 rounded-lg border ${coiColor} text-center`}>
                              {isClickable ? (
                                <button
                                  onClick={() => handleCOIClick(reviewer)}
                                  className={`flex items-center justify-center gap-3 w-full hover:opacity-80 transition-opacity cursor-pointer`}
                                >
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${coiStatus === 'No' ? 'bg-green-100' : 'bg-red-100'}`}>
                                    <span className={`text-sm font-bold ${coiTextColor}`}>{coiIcon}</span>
                                  </div>
                                  <div>
                                    <h4 className={`text-sm font-medium ${coiTextColor} underline`}>
                                      Conflict of Interest: {coiStatus}
                                    </h4>
                                  </div>
                                </button>
                              ) : (
                                <div className="flex items-center justify-center gap-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${coiStatus === 'No' ? 'bg-green-100' : 'bg-red-100'}`}>
                                    <span className={`text-sm font-bold ${coiTextColor}`}>{coiIcon}</span>
                                  </div>
                                  <div>
                                    <h4 className={`text-sm font-medium ${coiTextColor}`}>
                                      Conflict of Interest: {coiStatus}
                                    </h4>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* Sanction Country Container - Only show if Sanction Country is selected */}
                    {selectedValidationConditions && selectedValidationConditions.includes('Sanction Country') && (
                      <div role="region" aria-label="Sanction Country status">
                        {(() => {
                          // Determine Sanction Country status
                          // Convert to lowercase for comparison, default to "no"
                          const sanctionStatus = (reviewer.sanction_country || 'no').toLowerCase() === 'yes' ? 'Yes' : 'No';
                          const sanctionColor = sanctionStatus === 'No' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';
                          const sanctionTextColor = sanctionStatus === 'No' ? 'text-green-800' : 'text-red-800';
                          const sanctionIcon = sanctionStatus === 'No' ? '✓' : '⚠';
                          
                          return (
                            <div className={`p-4 rounded-lg border ${sanctionColor} text-center`}>
                              <div className="flex items-center justify-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${sanctionStatus === 'No' ? 'bg-green-100' : 'bg-red-100'}`}>
                                  <span className={`text-sm font-bold ${sanctionTextColor}`}>{sanctionIcon}</span>
                                </div>
                                <div>
                                  <h4 className={`text-sm font-medium ${sanctionTextColor}`}>
                                    Sanction Country: {sanctionStatus}
                                  </h4>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Empty State */}
          {filteredReviewers.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">No reviewers found matching your criteria.</p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setMinConditionsMet(0);
                  setSelectedCountry("all");
                  setSearchTerm("");
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shortlist Creation Dialog */}
      <Dialog open={showShortlistDialog} onOpenChange={handleCloseShortlistDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Shortlist</DialogTitle>
            <DialogDescription>
              Create a new shortlist with {selectedReviewerIds.size} selected reviewer{selectedReviewerIds.size !== 1 ? 's' : ''}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateShortlist} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="shortlist-name">Shortlist Name</Label>
              <Input
                id="shortlist-name"
                placeholder="e.g., Primary Reviewers, Top Candidates"
                value={shortlistName}
                onChange={(e) => setShortlistName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Selected Reviewers</Label>
              <div className="max-h-48 overflow-y-auto border rounded-md p-3 space-y-2">
                {filteredReviewers
                  .filter(r => selectedReviewerIds.has(r.email))
                  .map(reviewer => (
                    <div key={reviewer.email} className="text-sm">
                      <div className="font-medium">{reviewer.reviewer}</div>
                      <div className="text-xs text-muted-foreground">{reviewer.email}</div>
                      <div className="text-xs text-muted-foreground">
                        Score: {reviewer.conditions_met}/9 • {reviewer.aff}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseShortlistDialog}
                disabled={createShortlistMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createShortlistMutation.isPending || !shortlistName.trim()}
              >
                {createShortlistMutation.isPending ? 'Creating...' : 'Create Shortlist'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Export Reviewers Dialog */}
      <ExportReviewersDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        reviewers={filteredReviewers.filter(r => selectedReviewerIds.has(r.email))}
        onExport={handleExport}
        selectedValidationConditions={selectedValidationConditions}
      />
      {/* COI Publications Modal */}
      {selectedCOIAuthor && (
        <COIPublicationsModal
          isOpen={coiModalOpen}
          onClose={() => {
            setCOIModalOpen(false);
            setSelectedCOIAuthor(null);
          }}
          authorId={selectedCOIAuthor.authorId}
          authorName={selectedCOIAuthor.authorName}
          processId={processId}
        />
      )}
    </div>
  );
};