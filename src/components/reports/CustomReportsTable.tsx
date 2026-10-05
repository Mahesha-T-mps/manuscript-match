/**
 * Custom Reports Table Component
 * Displays detailed list of custom reports with recommendations and shortlist counts
 */

import { useState } from 'react';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ChevronDown, ChevronRight, Mail, Building2, Tag, BookOpen } from 'lucide-react';

export interface CustomReportData {
  id: string;
  processTitle: string;
  recommendationsCount: number;
  shortlistedCount: number;
  reviewersCount: number;
  shortlistedAuthors?: Array<{
    name: string;
    email?: string;
    affiliation?: string;
    keywords?: string;
    subject_area?: string;
  }>;
  recommendedAuthors?: Array<{
    name: string;
    email?: string;
    affiliation?: string;
  }>;
  keywords?: string;
  reportDate: string;
}

interface CustomReportsTableProps {
  reports: CustomReportData[];
}

export function CustomReportsTable({ reports }: CustomReportsTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  if (!reports || reports.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground">
        No custom reports available. Reports are generated automatically when you create shortlists.
      </div>
    );
  }

  const toggleRow = (reportId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(reportId)) {
      newExpanded.delete(reportId);
    } else {
      newExpanded.add(reportId);
    }
    setExpandedRows(newExpanded);
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]"></TableHead>
            <TableHead className="min-w-[200px]">Process Title</TableHead>
            <TableHead className="text-center w-[180px]"># Recommended Reviewers</TableHead>
            <TableHead className="text-center w-[180px]"># Reviewers Shortlisted</TableHead>
            <TableHead className="text-center w-[150px]">Date Shortlisted</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reports.map((report) => {
            const isExpanded = expandedRows.has(report.id);
            const hasShortlistedAuthors = report.shortlistedAuthors && report.shortlistedAuthors.length > 0;

            return (
              <>
                <TableRow key={report.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell>
                    {hasShortlistedAuthors && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => toggleRow(report.id)}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </TableCell>
                  <TableCell className="font-medium max-w-md" onClick={() => hasShortlistedAuthors && toggleRow(report.id)}>
                    <div className="truncate" title={report.processTitle}>
                      {report.processTitle}
                    </div>
                  </TableCell>
                  <TableCell className="text-center" onClick={() => hasShortlistedAuthors && toggleRow(report.id)}>
                    <Badge variant="outline">
                      {report.reviewersCount}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center" onClick={() => hasShortlistedAuthors && toggleRow(report.id)}>
                    <Badge variant="default">
                      {report.shortlistedCount}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center" onClick={() => hasShortlistedAuthors && toggleRow(report.id)}>
                    {format(new Date(report.reportDate), 'MMM dd, yyyy')}
                  </TableCell>
                </TableRow>
                
                {/* Expanded Row - Shortlisted Authors Only */}
                {isExpanded && hasShortlistedAuthors && (
                  <TableRow key={`${report.id}-expanded`}>
                    <TableCell colSpan={5} className="bg-muted/30">
                      <div className="py-4 px-6">
                        <div className="mb-3">
                          <h4 className="text-sm font-semibold text-muted-foreground">
                            Shortlisted Authors ({report.shortlistedAuthors!.length})
                          </h4>
                          {report.keywords && (
                            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                              <Tag className="h-3 w-3" />
                              <span className="font-medium">Keywords:</span>
                              <span className="italic">{report.keywords}</span>
                            </div>
                          )}
                        </div>
                        <div className="grid gap-3">
                          {report.shortlistedAuthors!.map((author, idx) => (
                            <div
                              key={idx}
                              className="flex items-start gap-3 p-3 bg-background rounded-md border"
                            >
                              <div className="flex-1">
                                <div className="font-medium text-sm mb-1">
                                  {author.name}
                                </div>
                                <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                                  {author.email && (
                                    <div className="flex items-center gap-1">
                                      <Mail className="h-3 w-3" />
                                      <span>{author.email}</span>
                                    </div>
                                  )}
                                  {author.affiliation && (
                                    <div className="flex items-center gap-1">
                                      <Building2 className="h-3 w-3" />
                                      <span>{author.affiliation}</span>
                                    </div>
                                  )}
                                  {author.keywords && (
                                    <div className="flex items-center gap-1">
                                      <Tag className="h-3 w-3" />
                                      <span className="font-medium">Keywords:</span>
                                      <span>{author.keywords}</span>
                                    </div>
                                  )}
                                  {author.subject_area && (
                                    <div className="flex items-center gap-1">
                                      <BookOpen className="h-3 w-3" />
                                      <span className="font-medium">Subject Area:</span>
                                      <span>{author.subject_area}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
