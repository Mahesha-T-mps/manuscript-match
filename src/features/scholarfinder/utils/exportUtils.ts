import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Reviewer } from '../types/api';
import { ExportFormat } from '../components/steps/export/ExportOptions';

export interface ExportMetadata {
  exportDate: string;
  totalReviewers: number;
  exportFormat: ExportFormat;
  manuscriptTitle?: string;
  processId?: string;
}

// CSV Export Functions
export const generateCSV = (reviewers: Reviewer[], metadata: ExportMetadata): string => {
  const headers = [
    'Name',
    'Email',
    'Affiliation',
    'City',
    'Country',
    'Total Publications',
    'English Publications',
    'Publications (Last 10 Years)',
    'Relevant Publications (Last 5 Years)',
    'Publications (Last 2 Years)',
    'Publications (Last Year)',
    'Clinical Trials',
    'Clinical Studies',
    'Case Reports',
    'Retracted Publications',
    'TF Publications Last Year',
    'Co-author',
    'Country Match',
    'Affiliation Match'
  ];

  const rows = reviewers.map(reviewer => [
    reviewer.reviewer,
    reviewer.email,
    reviewer.aff,
    reviewer.city,
    reviewer.country,
    reviewer.Total_Publications,
    reviewer.English_Pubs,
    reviewer['Publications (last 10 years)'],
    reviewer['Relevant Publications (last 5 years)'],
    reviewer['Publications (last 2 years)'],
    reviewer['Publications (last year)'],
    reviewer.Clinical_Trials_no,
    reviewer.Clinical_study_no,
    reviewer.Case_reports_no,
    reviewer.Retracted_Pubs_no,
    reviewer.TF_Publications_last_year,
    reviewer.coauthor ? 'Yes' : 'No',
    reviewer.country_match,
    reviewer.aff_match
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  return csvContent;
};

export const downloadCSV = (reviewers: Reviewer[], metadata: ExportMetadata): void => {
  const csvContent = generateCSV(reviewers, metadata);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const fileName = `reviewer-shortlist-${metadata.exportDate}.csv`;
  saveAs(blob, fileName);
};

// Excel Export Functions
export const generateExcel = (reviewers: Reviewer[], metadata: ExportMetadata): XLSX.WorkBook => {
  const workbook = XLSX.utils.book_new();

  // Summary Sheet
  const summaryData = [
    ['Reviewer Shortlist Export Summary'],
    [''],
    ['Export Date:', metadata.exportDate],
    ['Total Reviewers:', metadata.totalReviewers],
    ['Manuscript Title:', metadata.manuscriptTitle || 'N/A'],
    ['Process ID:', metadata.processId || 'N/A'],
    [''],
    ['Publication Summary:'],
    ['Countries Represented:', [...new Set(reviewers.map(r => r.country))].length],
    ['Total Publications:', reviewers.reduce((sum, r) => sum + r.Total_Publications, 0)]
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // Detailed Data Sheet
  const detailedHeaders = [
    'Name', 'Email', 'Affiliation', 'City', 'Country',
    'Total Publications', 'English Publications', 'Publications (Last 10 Years)',
    'Relevant Publications (Last 5 Years)', 'Publications (Last 2 Years)',
    'Publications (Last Year)', 'Clinical Trials', 'Clinical Studies',
    'Case Reports', 'Retracted Publications', 'TF Publications Last Year',
    'Co-author', 'Country Match', 'Affiliation Match'
  ];

  const detailedData = [
    detailedHeaders,
    ...reviewers.map(reviewer => [
      reviewer.reviewer,
      reviewer.email,
      reviewer.aff,
      reviewer.city,
      reviewer.country,
      reviewer.Total_Publications,
      reviewer.English_Pubs,
      reviewer['Publications (last 10 years)'],
      reviewer['Relevant Publications (last 5 years)'],
      reviewer['Publications (last 2 years)'],
      reviewer['Publications (last year)'],
      reviewer.Clinical_Trials_no,
      reviewer.Clinical_study_no,
      reviewer.Case_reports_no,
      reviewer.Retracted_Pubs_no,
      reviewer.TF_Publications_last_year,
      reviewer.coauthor ? 'Yes' : 'No',
      reviewer.country_match,
      reviewer.aff_match
    ])
  ];

  const detailedSheet = XLSX.utils.aoa_to_sheet(detailedData);
  
  // Apply formatting to headers
  const headerRange = XLSX.utils.decode_range(detailedSheet['!ref'] || 'A1');
  for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!detailedSheet[cellAddress]) continue;
    detailedSheet[cellAddress].s = {
      font: { bold: true },
      fill: { fgColor: { rgb: 'E3F2FD' } }
    };
  }

  XLSX.utils.book_append_sheet(workbook, detailedSheet, 'Detailed Data');

  return workbook;
};

export const downloadExcel = (reviewers: Reviewer[], metadata: ExportMetadata): void => {
  const workbook = generateExcel(reviewers, metadata);
  const fileName = `reviewer-shortlist-${metadata.exportDate}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};

// Report Export Functions
export const generateReport = (reviewers: Reviewer[], metadata: ExportMetadata): string => {
  const sortedReviewers = [...reviewers].sort((a, b) => b.Total_Publications - a.Total_Publications);
  
  const report = `
# Reviewer Shortlist Report

**Export Date:** ${metadata.exportDate}  
**Total Reviewers:** ${metadata.totalReviewers}  
**Manuscript Title:** ${metadata.manuscriptTitle || 'N/A'}  

## Executive Summary

This report contains a curated list of ${metadata.totalReviewers} potential peer reviewers identified through systematic database searches and validation processes. All reviewers have been screened against conflict of interest criteria and publication requirements.

### Key Statistics
- **Countries Represented:** ${[...new Set(reviewers.map(r => r.country))].length}
- **Total Combined Publications:** ${reviewers.reduce((sum, r) => sum + r.Total_Publications, 0).toLocaleString()}
- **Recent Publications (Last 2 Years):** ${reviewers.reduce((sum, r) => sum + r['Publications (last 2 years)'], 0).toLocaleString()}

## Reviewer Profiles

${sortedReviewers.map((reviewer, index) => `
### ${index + 1}. ${reviewer.reviewer}

**Contact Information:**
- Email: ${reviewer.email}
- Affiliation: ${reviewer.aff}
- Location: ${reviewer.city}, ${reviewer.country}

**Publication Profile:**
- Total Publications: ${reviewer.Total_Publications}
- English Publications: ${reviewer.English_Pubs}
- Recent Publications (Last 2 Years): ${reviewer['Publications (last 2 years)']}
- Relevant Publications (Last 5 Years): ${reviewer['Relevant Publications (last 5 years)']}

**Research Activity:**
- Clinical Trials: ${reviewer.Clinical_Trials_no}
- Clinical Studies: ${reviewer.Clinical_study_no}
- Case Reports: ${reviewer.Case_reports_no}
- Retracted Publications: ${reviewer.Retracted_Pubs_no}

**Co-author Status:** ${reviewer.coauthor ? 'Yes' : 'No'}

---
`).join('')}

## Export Information

- **Generated by:** ScholarFinder System
- **Export Format:** Formatted Report
- **Process ID:** ${metadata.processId || 'N/A'}
- **Export Date:** ${metadata.exportDate}

---

*This report was automatically generated by the ScholarFinder peer reviewer identification system. Please verify reviewer availability and willingness to review before making formal invitations.*
`;

  return report.trim();
};

export const downloadReport = (reviewers: Reviewer[], metadata: ExportMetadata): void => {
  const reportContent = generateReport(reviewers, metadata);
  const blob = new Blob([reportContent], { type: 'text/markdown;charset=utf-8;' });
  const fileName = `reviewer-report-${metadata.exportDate}.md`;
  saveAs(blob, fileName);
};

// Main export function
export const exportReviewers = async (
  reviewers: Reviewer[],
  format: ExportFormat,
  metadata: ExportMetadata
): Promise<void> => {
  switch (format) {
    case 'csv':
      downloadCSV(reviewers, metadata);
      break;
    case 'excel':
      downloadExcel(reviewers, metadata);
      break;
    case 'report':
      downloadReport(reviewers, metadata);
      break;
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
};

// Utility function to generate export metadata
export const createExportMetadata = (
  reviewers: Reviewer[],
  format: ExportFormat,
  manuscriptTitle?: string,
  processId?: string
): ExportMetadata => {
  return {
    exportDate: new Date().toISOString().split('T')[0],
    totalReviewers: reviewers.length,
    exportFormat: format,
    manuscriptTitle,
    processId
  };
};