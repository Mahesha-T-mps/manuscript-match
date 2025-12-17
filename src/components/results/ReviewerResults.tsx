import { useState, useMemo, useCallback } from "react";
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
import type { Reviewer } from "@/features/scholarfinder/types/api";

interface ReviewerResultsProps {
  processId: string;
  onShortlistCreated?: () => void;
  validationData?: any; // Optional validation data to display instead of fetching
}

export const ReviewerResults = ({ processId, onShortlistCreated, validationData }: ReviewerResultsProps) => {
  // State for filtering and search
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [minConditionsMet, setMinConditionsMet] = useState(0);
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  
  // State for selection
  const [selectedReviewerIds, setSelectedReviewerIds] = useState<Set<string>>(new Set());
  
  // State for shortlist dialog
  const [showShortlistDialog, setShowShortlistDialog] = useState(false);
  const [shortlistName, setShortlistName] = useState("");
  
  // State for export dialog
  const [showExportDialog, setShowExportDialog] = useState(false);

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
      conditions_satisfied: reviewer.conditions_satisfied || `${reviewer.conditions_met || 0} of 8`,
      
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
      aff_match: reviewer.aff_match || 'no',
      country_match: reviewer.country_match || 'yes',
      
      // Condition flags
      no_of_pub_condition_10_years: reviewer.no_of_pub_condition_10_years || 0,
      no_of_pub_condition_5_years: reviewer.no_of_pub_condition_5_years || 0,
      no_of_pub_condition_2_years: reviewer.no_of_pub_condition_2_years || 0,
      english_condition: reviewer.english_condition || 0,
      coauthor_condition: reviewer.coauthor_condition || 0,
      aff_condition: reviewer.aff_condition || 0,
      country_match_condition: reviewer.country_match_condition || 0,
      retracted_condition: reviewer.retracted_condition || 0
    };
  }) : rawReviewers;
  
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
    if (score >= 7) return "bg-green-500 text-white";
    if (score >= 5) return "bg-blue-500 text-white";
    if (score >= 3) return "bg-yellow-500 text-white";
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

  const handleSelectReviewer = useCallback((reviewerEmail: string, checked: boolean) => {
    const newSelectedIds = new Set(selectedReviewerIds);
    if (checked) {
      newSelectedIds.add(reviewerEmail);
    } else {
      newSelectedIds.delete(reviewerEmail);
    }
    setSelectedReviewerIds(newSelectedIds);
  }, [selectedReviewerIds]);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedReviewerIds(new Set(filteredReviewers.map(r => r.email)));
    } else {
      setSelectedReviewerIds(new Set());
    }
  }, [filteredReviewers]);

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
      // Export based on format
      if (format === 'csv') {
        exportReviewersAsCSV(selectedReviewers);
      } else {
        exportReviewersAsJSON(selectedReviewers);
      }

      // Log the export activity
      const logger = ActivityLogger.getInstance();
      await logger.logActivity(
        'EXPORT',
        `Exported ${selectedReviewers.length} reviewers as ${format.toUpperCase()}`,
        JSON.stringify({
          processId,
          format,
          reviewerCount: selectedReviewers.length,
          reviewerNames: selectedReviewers.map(r => r.reviewer),
          averageConditionsMet: selectedReviewers.reduce((sum, r) => sum + r.conditions_met, 0) / selectedReviewers.length
        })
      );
    } catch (error) {
      console.error('Export error:', error);
      throw error;
    }
  };

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
                    • Average score: {validationSummary.average_conditions_met.toFixed(1)}/8
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
                    <Label>Minimum Validation Score: {minConditionsMet}/8</Label>
                    <div className="px-3">
                      <Slider
                        value={[minConditionsMet]}
                        onValueChange={([value]) => setMinConditionsMet(value)}
                        max={8}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>0 (All)</span>
                        <span>8 (Perfect)</span>
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
                          Average Score: {validationSummary.average_conditions_met.toFixed(2)}/8
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
                  checked={filteredReviewers.every(r => selectedReviewerIds.has(r.email))}
                  onCheckedChange={handleSelectAll}
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
            {filteredReviewers.map((reviewer) => (
              <Card key={reviewer.email} className="border-l-4 border-l-primary/30" role="article" aria-label={`Reviewer: ${reviewer.reviewer}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start space-x-3 flex-1">
                      <Checkbox
                        id={`reviewer-${reviewer.email}`}
                        checked={selectedReviewerIds.has(reviewer.email)}
                        onCheckedChange={(checked) => handleSelectReviewer(reviewer.email, checked as boolean)}
                        aria-label={`Select reviewer ${reviewer.reviewer}`}
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-semibold text-lg">{reviewer.reviewer}</h3>
                          <Badge className={getConditionsMetColor(reviewer.conditions_met)} aria-label={`Validation score: ${reviewer.conditions_met} out of 8 criteria met`}>
                            {reviewer.conditions_met}/8 criteria met
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
                            <div className="text-lg font-bold text-amber-900">{reviewer['Publications (last 2 years)'] || 0}</div>
                            <div className="text-xs text-amber-600 mt-1">
                              {reviewer['Publications (last year)'] || 0} in last year
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
                                    <span className="font-semibold text-green-700">{reviewer['Publications (last 10 years)'] || 0}</span>
                                    <span className="text-green-600">({reviewer.Publications_10_years_first || 0} • {reviewer.Publications_10_years_last || 0})</span>
                                  </div>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                  <div 
                                    className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                                    style={{
                                      width: `${Math.min(100, ((reviewer['Publications (last 10 years)'] || 0) / Math.max(reviewer.Total_Publications || 1, 1)) * 100)}%`
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
                                    <span className="font-semibold text-orange-700">{reviewer['Publications (last 2 years)'] || 0}</span>
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
                                    <span className="font-semibold text-red-700">{reviewer['Publications (last year)'] || 0}</span>
                                    <span className="text-red-600">({reviewer.Publications_last_year_first || 0} • {reviewer.Publications_last_year_last || 0})</span>
                                  </div>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                  <div 
                                    className="bg-orange-500 h-2 rounded-full transition-all duration-300" 
                                    style={{
                                      width: `${Math.min(100, ((reviewer['Publications (last 2 years)'] || 0) / Math.max(reviewer.Total_Publications || 1, 1)) * 100)}%`
                                    }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Research Focus Areas */}
                      <div>
                        <div className="flex items-center mb-3">
                          <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                          <h5 className="text-sm font-medium text-gray-700">Research Focus Areas</h5>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
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
                          
                          <div className="p-3 bg-gradient-to-br from-red-50 to-red-100 rounded-lg border border-red-200 text-center">
                            <div className="text-xs font-medium text-red-700 mb-1">Retractions</div>
                            <div className="text-lg font-bold text-red-900">{reviewer.Retracted_Pubs_no || 0}</div>
                            <div className="text-xs text-red-600">Quality indicator</div>
                          </div>
                          
                          <div className="p-3 bg-gradient-to-br from-violet-50 to-violet-100 rounded-lg border border-violet-200 text-center">
                            <div className="text-xs font-medium text-violet-700 mb-1">T&F Publications</div>
                            <div className="text-lg font-bold text-violet-900">{reviewer.TF_Publications_last_year || 0}</div>
                            <div className="text-xs text-violet-600">Last year</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Validation Criteria */}
                    <div role="region" aria-label="Validation criteria">
                      <h4 className="text-sm font-medium mb-2">
                        Validation Criteria ({reviewer.conditions_satisfied})
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm" role="list">
                        <div className="flex items-center space-x-2">
                          {getValidationIcon(reviewer['Publications (last 10 years)'] >= 8)}
                          <span>Publications (last 10 years) ≥ 8</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getValidationIcon(reviewer['Relevant Publications (last 5 years)'] >= 3)}
                          <span>Relevant Publications (last 5 years) ≥ 3</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getValidationIcon(reviewer['Publications (last 2 years)'] >= 1)}
                          <span>Publications (last 2 years) ≥ 1</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getValidationIcon(reviewer.English_Pubs > reviewer.Total_Publications / 2)}
                          <span>English Publications &gt; 50%</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getValidationIcon(!reviewer.coauthor)}
                          <span>No Coauthorship</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getValidationIcon(reviewer.aff_match === 'no')}
                          <span>Different Affiliation</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getValidationIcon(reviewer.country_match === 'yes')}
                          <span>Same Country</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getValidationIcon(reviewer.Retracted_Pubs_no <= 1)}
                          <span>No Retracted Publications</span>
                        </div>
                      </div>
                    </div>
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
                        Score: {reviewer.conditions_met}/8 • {reviewer.aff}
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
      />
    </div>
  );
};