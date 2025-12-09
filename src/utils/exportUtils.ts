/**
 * Export utility functions for generating CSV and JSON files from reviewer data
 */

import type { Reviewer } from '@/features/scholarfinder/types/api';

/**
 * Generate CSV content from reviewer data
 * Includes all reviewer fields in a spreadsheet-compatible format
 */
export function generateCSV(reviewers: Reviewer[]): string {
  if (reviewers.length === 0) {
    throw new Error('No reviewers to export');
  }

  // Define CSV headers
  const headers = [
    'Name',
    'Email',
    'Affiliation',
    'City',
    'Country',
    'Total Publications',
    'English Publications',
    'Publications (last 10 years)',
    'Relevant Publications (last 5 years)',
    'Publications (last 2 years)',
    'Publications (last year)',
    'Clinical Trials',
    'Clinical Studies',
    'Case Reports',
    'Retracted Publications',
    'TF Publications (last year)',
    'Coauthor',
    'Country Match',
    'Affiliation Match',
    'Conditions Met',
    'Conditions Satisfied'
  ];

  // Create CSV rows
  const rows = reviewers.map(reviewer => [
    escapeCSVField(reviewer.reviewer),
    escapeCSVField(reviewer.email),
    escapeCSVField(reviewer.aff),
    escapeCSVField(reviewer.city),
    escapeCSVField(reviewer.country),
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
    reviewer.aff_match,
    reviewer.conditions_met,
    escapeCSVField(reviewer.conditions_satisfied)
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  return csvContent;
}

/**
 * Escape CSV field to handle commas, quotes, and newlines
 */
function escapeCSVField(field: string | number | boolean | undefined): string {
  // Handle undefined, null, or empty values
  if (field === undefined || field === null) {
    return '';
  }

  if (typeof field === 'number' || typeof field === 'boolean') {
    return String(field);
  }

  // Convert to string if not already
  const stringField = String(field);

  // If field contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
    return `"${stringField.replace(/"/g, '""')}"`;
  }

  return stringField;
}

/**
 * Generate JSON content from reviewer data
 * Includes structured reviewer data with all fields
 */
export function generateJSON(reviewers: Reviewer[]): string {
  if (reviewers.length === 0) {
    throw new Error('No reviewers to export');
  }

  // Create structured export object
  const exportData = {
    exportDate: new Date().toISOString(),
    totalReviewers: reviewers.length,
    reviewers: reviewers.map(reviewer => ({
      name: reviewer.reviewer,
      email: reviewer.email,
      affiliation: reviewer.aff,
      location: {
        city: reviewer.city,
        country: reviewer.country
      },
      publications: {
        total: reviewer.Total_Publications,
        english: reviewer.English_Pubs,
        last10Years: reviewer['Publications (last 10 years)'],
        relevantLast5Years: reviewer['Relevant Publications (last 5 years)'],
        last2Years: reviewer['Publications (last 2 years)'],
        lastYear: reviewer['Publications (last year)'],
        clinicalTrials: reviewer.Clinical_Trials_no,
        clinicalStudies: reviewer.Clinical_study_no,
        caseReports: reviewer.Case_reports_no,
        retracted: reviewer.Retracted_Pubs_no,
        tfLastYear: reviewer.TF_Publications_last_year
      },
      validation: {
        coauthor: reviewer.coauthor,
        countryMatch: reviewer.country_match,
        affiliationMatch: reviewer.aff_match,
        conditionsMet: reviewer.conditions_met,
        conditionsSatisfied: reviewer.conditions_satisfied
      }
    }))
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Trigger file download in the browser
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  // Create blob from content
  const blob = new Blob([content], { type: mimeType });
  
  // Create download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  
  // Trigger download
  document.body.appendChild(link);
  link.click();
  
  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export reviewers as CSV file
 */
export function exportReviewersAsCSV(reviewers: Reviewer[]): void {
  try {
    const csvContent = generateCSV(reviewers);
    const filename = `reviewers-${new Date().toISOString().split('T')[0]}.csv`;
    downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
  } catch (error) {
    console.error('CSV export error:', error);
    throw new Error('Failed to generate CSV file');
  }
}

/**
 * Export reviewers as JSON file
 */
export function exportReviewersAsJSON(reviewers: Reviewer[]): void {
  try {
    const jsonContent = generateJSON(reviewers);
    const filename = `reviewers-${new Date().toISOString().split('T')[0]}.json`;
    downloadFile(jsonContent, filename, 'application/json;charset=utf-8;');
  } catch (error) {
    console.error('JSON export error:', error);
    throw new Error('Failed to generate JSON file');
  }
}
