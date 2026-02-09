/**
 * COI Publications Modal Component
 * Displays COI publication details for a specific author
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  BookOpen, 
  Users, 
  Building, 
  Calendar,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { scholarFinderApiService } from '@/features/scholarfinder/services/ScholarFinderApiService';

interface COIPublication {
  title: string;
  authors: string;
  affiliation: string; // This will be mapped from 'affiliations' in the API response
  publication_date: string;
  searched_author: string;
  author_id: string;
}

interface COIPublicationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  authorId: string;
  authorName: string;
  processId: string;
}

export const COIPublicationsModal: React.FC<COIPublicationsModalProps> = ({
  isOpen,
  onClose,
  authorId,
  authorName,
  processId
}) => {
  // Fetch COI publications for the specific author
  const { 
    data: coiPublications, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['coi-publications', processId, authorId],
    queryFn: () => scholarFinderApiService.getCOIPublications(processId, authorId),
    enabled: isOpen && !!authorId && !!processId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const publications = coiPublications?.data?.publications || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold text-red-800">
                Conflict of Interest Publications
              </DialogTitle>
              <DialogDescription className="text-red-600">
                Publications causing conflict of interest for {authorName}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Separator className="flex-shrink-0" />

        <div className="flex-1 overflow-y-auto">
          {/* Author Information */}
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-red-600" />
              <span className="font-medium text-red-800">Author Details</span>
            </div>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div>
                <span className="font-medium text-red-700">Name:</span> {authorName}
              </div>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600"></div>
                <span className="text-red-600">Loading COI publications...</span>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-red-800 mb-2">
                    Failed to Load COI Publications
                  </h3>
                  <p className="text-red-600 mb-4">
                    {error instanceof Error ? error.message : 'An error occurred while fetching COI publication data.'}
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => window.location.reload()}
                    className="text-red-700 border-red-300 hover:bg-red-100"
                  >
                    Retry
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Publications List */}
          {!isLoading && !error && (
            <>
              {publications.length === 0 ? (
                <Card className="border-yellow-200 bg-yellow-50">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <FileText className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                        No COI Publications Found
                      </h3>
                      <p className="text-yellow-600">
                        No publications were found in the COI report for this author.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">
                      COI Publications ({publications.length})
                    </h3>
                    <Badge variant="destructive" className="bg-red-100 text-red-800">
                      Conflict Detected
                    </Badge>
                  </div>

                  {publications.map((publication: COIPublication, index: number) => (
                    <Card key={index} className="border-red-200 hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-1">
                            <BookOpen className="w-4 h-4 text-red-600" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-base font-semibold text-gray-800 leading-tight">
                              {publication.title || 'Untitled Publication'}
                            </CardTitle>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          {/* Authors */}
                          <div className="flex items-start gap-2">
                            <Users className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <span className="text-sm font-medium text-gray-700">Authors:</span>
                              <p className="text-sm text-gray-600 mt-1">
                                {publication.authors || 'Not available'}
                              </p>
                            </div>
                          </div>

                          {/* Affiliation */}
                          <div className="flex items-start gap-2">
                            <Building className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <span className="text-sm font-medium text-gray-700">Affiliation:</span>
                              <p className="text-sm text-gray-600 mt-1">
                                {publication.affiliation || 'Not available'}
                              </p>
                            </div>
                          </div>

                          {/* Publication Date */}
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
                            <div>
                              <span className="text-sm font-medium text-gray-700">Publication Date:</span>
                              <span className="text-sm text-gray-600 ml-2">
                                {publication.publication_date || 'Not available'}
                              </span>
                            </div>
                          </div>

                          {/* Searched Author (COI Source) */}
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <span className="text-sm font-medium text-red-700">COI Source Author:</span>
                              <p className="text-sm text-red-600 mt-1 font-medium">
                                {publication.searched_author || 'Not available'}
                              </p>
                              <p className="text-xs text-red-500 mt-1">
                                This author appears in the publication, causing the conflict of interest
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <Separator className="flex-shrink-0" />
        <div className="flex-shrink-0 flex justify-end items-center pt-4">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};