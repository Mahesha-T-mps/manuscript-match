/**
 * Manual Search Component
 * Allows users to search for specific reviewers by name
 */

import React, { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Search, Loader2, CheckCircle, AlertCircle, User, Mail, Building, MapPin, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAddManualAuthor } from "@/hooks/useSearch";

interface ManualSearchProps {
  processId: string;
  onSearchComplete?: (result: any) => void;
}

export const ManualSearch = ({ processId, onSearchComplete }: ManualSearchProps) => {
  const [authorName, setAuthorName] = useState("");
  const [foundAuthor, setFoundAuthor] = useState<any>(null);
  const { toast } = useToast();
  const isSearchingRef = useRef(false);

  const addManualAuthorMutation = useAddManualAuthor();

  const handleSearch = async () => {
    // Generate unique call ID for debugging
    const callId = Math.random().toString(36).substr(2, 9);
    console.log(`[ManualSearch][${callId}] handleSearch called`);
    
    // Double protection: check both ref and mutation state
    if (isSearchingRef.current || addManualAuthorMutation.isPending) {
      console.log(`[ManualSearch][${callId}] ❌ BLOCKED - already in progress`);
      return;
    }
    
    // Set lock immediately
    isSearchingRef.current = true;
    console.log(`[ManualSearch][${callId}] ✅ LOCK ACQUIRED`);

    // Validate author name is at least 2 characters
    if (!authorName.trim() || authorName.trim().length < 2) {
      toast({
        title: "Invalid name",
        description: "Please enter at least 2 characters for the author name.",
        variant: "destructive",
      });
      isSearchingRef.current = false;
      console.log(`[ManualSearch][${callId}] ❌ VALIDATION FAILED - lock released`);
      return;
    }

    console.log(`[ManualSearch][${callId}] Starting search for:`, authorName.trim());

    try {
      const result = await addManualAuthorMutation.mutateAsync({
        processId,
        authorName: authorName.trim()
      });
      
      console.log(`[ManualSearch][${callId}] ✅ Search successful, result:`, result);
      
      // Store the found author for display
      setFoundAuthor(result);
      
      toast({
        title: "Author added successfully",
        description: `${result.author} has been added to the potential reviewers list.`,
      });
      
      if (onSearchComplete) {
        onSearchComplete(result);
      }
      
      // Clear input field after successful search
      setAuthorName("");
    } catch (error: any) {
      console.error(`[ManualSearch][${callId}] ❌ Search failed:`, error);
      
      // Extract error message from multiple possible locations
      const errorMessage = error.message || error.error || "An error occurred during the search";
      
      console.log(`[ManualSearch][${callId}] Displaying error message:`, errorMessage);
      
      // Clear any previously displayed success state
      setFoundAuthor(null);
      
      // Check for "not found" or "missing" error cases
      if (errorMessage.toLowerCase().includes('not found') || errorMessage.toLowerCase().includes('missing')) {
        toast({
          title: "Author not found",
          description: errorMessage,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Search failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      // Always release lock when done
      isSearchingRef.current = false;
      console.log(`[ManualSearch][${callId}] 🔓 LOCK RELEASED`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !addManualAuthorMutation.isPending) {
      handleSearch();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Search className="w-5 h-5 text-primary" />
          <span>Manual Search</span>
        </CardTitle>
        <CardDescription>
          Search for specific authors by name to add them to the potential reviewers list
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search Input */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Author Name</Label>
          <div className="flex gap-3">
            <Input
              placeholder="Enter author name (e.g., Dr. John Smith)..."
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1"
              disabled={addManualAuthorMutation.isPending}
            />
            <Button 
              onClick={handleSearch}
              disabled={addManualAuthorMutation.isPending || !authorName.trim() || authorName.trim().length < 2}
              size="default"
            >
              {addManualAuthorMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </div>
          
          {/* Loading State */}
          {addManualAuthorMutation.isPending && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>
                Searching PubMed for author details... This may take up to 60 seconds.
              </AlertDescription>
            </Alert>
          )}
          
          {/* Error State */}
          {addManualAuthorMutation.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {addManualAuthorMutation.error.message || "Failed to search for author"}
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Found Author Details */}
        {foundAuthor && (
          <Alert>
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription>
              <div className="space-y-2">
                <div className="font-medium text-green-600">Author added successfully!</div>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span className="font-medium">Name:</span>
                    <span>{foundAuthor.author}</span>
                  </div>
                  {foundAuthor.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <span className="font-medium">Email:</span>
                      <span>{foundAuthor.email}</span>
                    </div>
                  )}
                  {foundAuthor.aff && (
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4" />
                      <span className="font-medium">Affiliation:</span>
                      <span>{foundAuthor.aff}</span>
                    </div>
                  )}
                  {foundAuthor.city && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span className="font-medium">City:</span>
                      <span>{foundAuthor.city}</span>
                    </div>
                  )}
                  {foundAuthor.country && (
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      <span className="font-medium">Country:</span>
                      <span>{foundAuthor.country}</span>
                    </div>
                  )}
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Usage Tips */}
        <div className="text-sm text-muted-foreground space-y-2">
          <div className="font-medium">Search Tips:</div>
          <ul className="list-disc list-inside space-y-1">
            <li>Use full names for better results (e.g., "John Smith" instead of "J. Smith")</li>
            <li>Include titles if known (e.g., "Dr. Jane Doe" or "Prof. Michael Chen")</li>
            <li>Try variations of names if no results are found</li>
            <li>The search uses PubMed database and may take up to 60 seconds</li>
            <li>Manual authors complement database searches and help find specific reviewers</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
