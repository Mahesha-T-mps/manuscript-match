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

  // Define CSV headers - matching the exact field names from the API
  const headers = [
    'author',
    'email', 
    'aff',
    'city',
    'country',
    'Total_Publications',
    'Total_Publications_first',
    'Total_Publications_last',
    'Publications_10_years',
    'Publications_10_years_first',
    'Publications_10_years_last',
    'Publications_5_years',
    'Publications_5_years_first',
    'Publications_5_years_last',
    'Relevant_Publications_5_years',
    'Relevant_Publications_5_years_first',
    'Relevant_Publications_5_years_last',
    'Relevant_Primary_Pub_2_years',
    'Relevant_Secondary_Pub_2_years',
    'Publications_2_years',
    'Publications_2_years_first',
    'Publications_2_years_last',
    'Publications_last_year',
    'Publications_last_year_first',
    'Publications_last_year_last',
    'Clinical_Trials_no',
    'Retracted_Pubs_no',
    'Clinical_study_no',
    'Case_reports_no',
    'TF_Publications_last_year',
    'English_Pubs',
    'coauthor',
    'country_match',
    'aff_match',
    'no_of_pub_condition_10_years',
    'no_of_pub_condition_5_years',
    'no_of_pub_condition_2_years',
    'english_ratio',
    'english_condition',
    'coauthor_condition',
    'aff_condition',
    'country_match_condition',
    'retracted_condition',
    'conditions_met',
    'conditions_satisfied'
  ];

  // Create CSV rows - matching the exact field structure from the API
  const rows = reviewers.map(reviewer => [
    escapeCSVField(reviewer.reviewer),
    escapeCSVField(reviewer.email),
    escapeCSVField(reviewer.aff),
    escapeCSVField(reviewer.city),
    escapeCSVField(reviewer.country),
    reviewer.Total_Publications || 0,
    reviewer.Total_Publications_first || 0,
    reviewer.Total_Publications_last || 0,
    reviewer.Publications_10_years || reviewer['Publications (last 10 years)'] || 0,
    reviewer.Publications_10_years_first || 0,
    reviewer.Publications_10_years_last || 0,
    reviewer.Publications_5_years || 0,
    reviewer.Publications_5_years_first || 0,
    reviewer.Publications_5_years_last || 0,
    reviewer.Relevant_Publications_5_years || reviewer['Relevant Publications (last 5 years)'] || 0,
    reviewer.Relevant_Publications_5_years_first || 0,
    reviewer.Relevant_Publications_5_years_last || 0,
    reviewer.Relevant_Primary_Pub_2_years || 0,
    reviewer.Relevant_Secondary_Pub_2_years || 0,
    reviewer.Publications_2_years || reviewer['Publications (last 2 years)'] || 0,
    reviewer.Publications_2_years_first || 0,
    reviewer.Publications_2_years_last || 0,
    reviewer.Publications_last_year || reviewer['Publications (last year)'] || 0,
    reviewer.Publications_last_year_first || 0,
    reviewer.Publications_last_year_last || 0,
    reviewer.Clinical_Trials_no || 0,
    reviewer.Retracted_Pubs_no || 0,
    reviewer.Clinical_study_no || 0,
    reviewer.Case_reports_no || 0,
    reviewer.TF_Publications_last_year || 0,
    reviewer.English_Pubs || 0,
    reviewer.coauthor ? 'Yes' : 'No',
    reviewer.country_match || '',
    reviewer.aff_match || '',
    reviewer.no_of_pub_condition_10_years || 0,
    reviewer.no_of_pub_condition_5_years || 0,
    reviewer.no_of_pub_condition_2_years || 0,
    reviewer.english_ratio || 0,
    reviewer.english_condition || 0,
    reviewer.coauthor_condition || 0,
    reviewer.aff_condition || 0,
    reviewer.country_match_condition || 0,
    reviewer.retracted_condition || 0,
    reviewer.conditions_met || 0,
    escapeCSVField(reviewer.conditions_satisfied || '')
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
