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
}

export const ReviewerResults = ({ processId, onShortlistCreated }: ReviewerResultsProps) => {
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

  // Fetch recommendations from ScholarFinder API
  const { 
    data: apiResponse, 
    isLoading, 
    error,
    refetch
  } = useRecommendations(processId, true);
  
  // Shortlist creation mutation
  const createShortlistMutation = useCreateShortlist();

  // Extract reviewers from API response
  // API returns: { reviewers: Reviewer[], total_count: number, validation_summary: {...} }
  const allReviewers = apiResponse?.reviewers || [];
  const totalCount = apiResponse?.total_count || 0;
  const validationSummary = apiResponse?.validation_summary;

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

  // Handle loading state
  if (isLoading) {
    return <ReviewerResultsSkeleton />;
  }

  // Handle error state
  if (error) {
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
                <span>Reviewer Recommendations</span>
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
                      <h4 className="text-sm font-medium mb-2">Publication Metrics</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div className="p-2 bg-muted rounded">
                          <div className="text-xs text-muted-foreground">Total</div>
                          <div className="font-semibold">{reviewer.Total_Publications}</div>
                        </div>
                        <div className="p-2 bg-muted rounded">
                          <div className="text-xs text-muted-foreground">Last 10 years</div>
                          <div className="font-semibold">{reviewer['Publications (last 10 years)']}</div>
                        </div>
                        <div className="p-2 bg-muted rounded">
                          <div className="text-xs text-muted-foreground">Last 5 years</div>
                          <div className="font-semibold">{reviewer['Relevant Publications (last 5 years)']}</div>
                        </div>
                        <div className="p-2 bg-muted rounded">
                          <div className="text-xs text-muted-foreground">Last 2 years</div>
                          <div className="font-semibold">{reviewer['Publications (last 2 years)']}</div>
                        </div>
                        <div className="p-2 bg-muted rounded">
                          <div className="text-xs text-muted-foreground">English</div>
                          <div className="font-semibold">{reviewer.English_Pubs}</div>
                        </div>
                        <div className="p-2 bg-muted rounded">
                          <div className="text-xs text-muted-foreground">Retractions</div>
                          <div className="font-semibold">{reviewer.Retracted_Pubs_no}</div>
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