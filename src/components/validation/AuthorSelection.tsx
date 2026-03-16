/**
 * Author Selection Component
 * Allows users to select which authors to validate from database search results
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, Search, CheckCircle2, XCircle, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Author {
  author: string;
  email: string;
  aff: string;
  city?: string;
  country?: string;
}

interface AuthorSelectionProps {
  processId: string;
  authors: Author[];
  onSelectionComplete: (selectedAuthors: string[]) => void;
  onBack?: () => void;
}

export const AuthorSelection: React.FC<AuthorSelectionProps> = ({
  processId,
  authors,
  onSelectionComplete,
  onBack,
}) => {
  const { toast } = useToast();
  const [selectedAuthors, setSelectedAuthors] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredAuthors, setFilteredAuthors] = useState<Author[]>(authors);

  // Load saved selection from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`process_${processId}_selectedAuthors`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSelectedAuthors(new Set(parsed));
      } catch (e) {
        console.warn('Failed to parse saved author selection:', e);
      }
    }
  }, [processId]);

  // Save selection to localStorage
  useEffect(() => {
    localStorage.setItem(
      `process_${processId}_selectedAuthors`,
      JSON.stringify(Array.from(selectedAuthors))
    );
  }, [selectedAuthors, processId]);

  // Filter authors based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredAuthors(authors);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = authors.filter(
      (author) =>
        author.author.toLowerCase().includes(term) ||
        author.email.toLowerCase().includes(term) ||
        author.aff.toLowerCase().includes(term) ||
        author.country?.toLowerCase().includes(term)
    );
    setFilteredAuthors(filtered);
  }, [searchTerm, authors]);

  const toggleAuthor = (email: string) => {
    setSelectedAuthors((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(email)) {
        newSet.delete(email);
      } else {
        newSet.add(email);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedAuthors(new Set(filteredAuthors.map((a) => a.email)));
    toast({
      title: 'All Authors Selected',
      description: `Selected ${filteredAuthors.length} authors for validation.`,
    });
  };

  const deselectAll = () => {
    setSelectedAuthors(new Set());
    toast({
      title: 'Selection Cleared',
      description: 'All authors have been deselected.',
    });
  };

  const handleContinue = () => {
    if (selectedAuthors.size === 0) {
      toast({
        title: 'No Authors Selected',
        description: 'Please select at least one author to validate.',
        variant: 'destructive',
      });
      return;
    }

    onSelectionComplete(Array.from(selectedAuthors));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Select Authors for Validation
          </CardTitle>
          <CardDescription>
            Choose which authors from the database search you want to validate. Only selected authors will be processed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by name, email, affiliation, or country..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAll}
                className="flex items-center gap-1"
              >
                <CheckCircle2 className="h-4 w-4" />
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={deselectAll}
                className="flex items-center gap-1"
              >
                <XCircle className="h-4 w-4" />
                Clear
              </Button>
            </div>
          </div>

          {/* Selection Summary */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Showing {filteredAuthors.length} of {authors.length} authors
              </span>
            </div>
            <Badge variant={selectedAuthors.size > 0 ? 'default' : 'secondary'}>
              {selectedAuthors.size} selected
            </Badge>
          </div>

          {/* Author List */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto border rounded-lg p-4">
            {filteredAuthors.length === 0 ? (
              <Alert>
                <AlertDescription>
                  No authors found matching your search criteria.
                </AlertDescription>
              </Alert>
            ) : (
              filteredAuthors.map((author, index) => (
                <div
                  key={author.email || index}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                    selectedAuthors.has(author.email)
                      ? 'bg-primary/5 border-primary'
                      : 'bg-background hover:bg-muted/50'
                  }`}
                >
                  <Checkbox
                    checked={selectedAuthors.has(author.email)}
                    onCheckedChange={() => toggleAuthor(author.email)}
                    className="mt-1"
                  />
                  <div className="flex-1 space-y-1">
                    <div className="font-medium">{author.author}</div>
                    <div className="text-sm text-muted-foreground space-y-0.5">
                      <div>
                        <span className="font-medium">Email:</span> {author.email || 'Not available'}
                      </div>
                      <div>
                        <span className="font-medium">Affiliation:</span> {author.aff || 'Not available'}
                      </div>
                      {author.country && (
                        <div>
                          <span className="font-medium">Country:</span> {author.country}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4">
            {onBack && (
              <Button variant="outline" onClick={onBack}>
                Back
              </Button>
            )}
            <Button
              onClick={handleContinue}
              disabled={selectedAuthors.size === 0}
              className="ml-auto"
            >
              Continue with {selectedAuthors.size} Author{selectedAuthors.size !== 1 ? 's' : ''}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
