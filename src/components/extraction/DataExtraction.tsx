import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Users, Hash, Building, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMetadata } from "@/hooks/useFiles";
import type { Author, Affiliation } from "@/types/api";

interface DataExtractionProps {
  processId: string;
  fileName?: string;
}

export const DataExtraction = ({ processId, fileName }: DataExtractionProps) => {
  const { toast } = useToast();
  const { data: metadata, isLoading, error, refetch } = useMetadata(processId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-primary" />
            <span>Manuscript Metadata</span>
          </CardTitle>
          <CardDescription>
            Extracting information from {fileName || "your manuscript"}...
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-full" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-32 w-full" />
          </div>
          <Separator />
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Skeleton className="h-4 w-32" />
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            </div>
            <div className="space-y-3">
              <Skeleton className="h-4 w-32" />
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-16" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <span>Extraction Error</span>
          </CardTitle>
          <CardDescription>
            Failed to extract metadata from {fileName || "your manuscript"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              {error.type === 'NETWORK_ERROR' 
                ? "Network error. Please check your connection and try again."
                : error.message || "An error occurred while extracting metadata."
              }
            </p>
            <Button variant="outline" onClick={() => refetch()}>
              Retry Extraction
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metadata) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-muted-foreground" />
            <span>No Metadata Available</span>
          </CardTitle>
          <CardDescription>
            No extracted data found for this process. Please upload a file first.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Upload a manuscript file to extract metadata automatically.
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
          <div>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-primary" />
              <span>Manuscript Metadata</span>
            </CardTitle>
            <CardDescription>
              Automatically extracted information from {fileName || "your manuscript"}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Title Section */}
          <div role="region" aria-label="Manuscript title">
            <h4 className="font-medium text-sm text-muted-foreground mb-2">TITLE</h4>
            <p className="text-lg font-semibold leading-relaxed">
              {metadata.title || "No title extracted"}
            </p>
          </div>

          {/* Abstract Section */}
          <div role="region" aria-label="Manuscript abstract">
            <h4 className="font-medium text-sm text-muted-foreground mb-2">ABSTRACT</h4>
            <p className="text-sm leading-relaxed text-foreground/90 bg-muted/30 p-4 rounded-lg">
              {metadata.abstract || "No abstract extracted"}
            </p>
          </div>

          <Separator />

          {/* Keywords Section */}
          <div role="region" aria-label="Extracted keywords">
            <h4 className="font-medium text-sm text-muted-foreground mb-3 flex items-center">
              <Hash className="w-4 h-4 mr-1" aria-hidden="true" />
              KEYWORDS
            </h4>
            <div className="flex flex-wrap gap-2">
              {metadata.keywords && metadata.keywords.length > 0 ? (
                metadata.keywords.map((keyword, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {keyword}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No keywords extracted</p>
              )}
            </div>
          </div>

          {/* Authors & Affiliations Section */}
          {metadata.authors && metadata.authors.length > 0 && (
            <div role="region" aria-label="Authors and affiliations">
              <h4 className="font-medium text-sm text-muted-foreground mb-3 flex items-center">
                <Users className="w-4 h-4 mr-1" aria-hidden="true" />
                AUTHORS & AFFILIATIONS
              </h4>
              <div className="space-y-3">
                {metadata.authors.map((author, index) => {
                  const authorName = typeof author === 'string' ? author : author.name;
                  
                  // Get affiliations from authorAffiliationMap or fallback to author.affiliation
                  let affiliations: string[] = [];
                  if (metadata.authorAffiliationMap?.[authorName]) {
                    const affData = metadata.authorAffiliationMap[authorName];
                    affiliations = Array.isArray(affData) ? affData : [affData];
                  } else if (typeof author !== 'string' && author.affiliation) {
                    affiliations = [author.affiliation];
                  }
                  
                  return (
                    <div key={index} className="p-3 bg-card border rounded-lg">
                      <p className="font-medium text-sm">
                        {index + 1}. {authorName}
                      </p>
                      {affiliations.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {affiliations.map((affiliation, affIndex) => (
                            <p key={affIndex} className="text-xs text-muted-foreground flex items-start">
                              <Building className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                              <span>{affiliation}</span>
                            </p>
                          ))}
                        </div>
                      )}
                      {typeof author !== 'string' && author.email && (
                        <p className="text-xs text-primary mt-2">{author.email}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};