/**
 * Export utility functions for generating CSV and JSON files from reviewer data
 */

import type { Reviewer } from '@/features/scholarfinder/types/api';

// Mapping of validation conditions to their related data columns
const VALIDATION_CONDITION_COLUMNS: Record<string, string[]> = {
  'Publications': [
    'Total_Publications',
    'Total_Publications_first', 
    'Total_Publications_last',
    'Publications_10_years',
    'Publications_10_years_first',
    'Publications_10_years_last',
    'Publications_2_years',
    'Publications_2_years_first',
    'Publications_2_years_last',
    'no_of_pub_condition_10_years',
    'no_of_pub_condition_2_years'
  ],
  'First/Last Author in publications': [
    'Total_Publications_first',
    'Total_Publications_last',
    'Publications_10_years_first',
    'Publications_10_years_last',
    'Publications_5_years_first',
    'Publications_5_years_last',
    'Publications_2_years_first',
    'Publications_2_years_last',
    'Publications_last_year_first',
    'Publications_last_year_last',
    'Relevant_Publications_5_years_first',
    'Relevant_Publications_5_years_last'
  ],
  'Relevant Publications': [
    'Publications_5_years',
    'Publications_5_years_first',
    'Publications_5_years_last',
    'Relevant_Publications_5_years',
    'Relevant_Publications_5_years_first',
    'Relevant_Publications_5_years_last',
    'Relevant_Primary_Pub_2_years',
    'Relevant_Secondary_Pub_2_years',
    'Relevant_Primary_Pub_last_years',
    'Relevant_Secondary_Pub_last_years',
    'no_of_pub_condition_5_years'
  ],
  'Publication Types': [
    'English_Pubs',
    'english_ratio',
    'english_condition',
    'Clinical_Trials_no',
    'Clinical_study_no',
    'Case_reports_no',
    'Retracted_Pubs_no',
    'retracted_condition'
  ],
  'T&F Publications last year': [
    'TF_Publications_last_year',
    'Publications_last_year',
    'Publications_last_year_first',
    'Publications_last_year_last'
  ],
  'Coauthor': [
    'coauthor',
    'coauthor_condition'
  ],
  'Conflict of Interest': [
    'coi_coauthor',
    'coi_condition'
  ],
  'Affiliation/Country match': [
    'aff_match',
    'country_match',
    'sanction_country',
    'aff_condition',
    'country_match_condition'
  ],
  'Study Type Detection': [
    'study_type'
  ]
};

/**
 * Generate CSV content from reviewer data
 * Includes only columns related to selected validation conditions
 */
export function generateCSV(reviewers: Reviewer[], selectedConditions?: string[]): string {
  console.log('[generateCSV] Called with:', {
    reviewerCount: reviewers.length,
    selectedConditions: selectedConditions,
    conditionsCount: selectedConditions?.length || 0
  });

  if (reviewers.length === 0) {
    throw new Error('No reviewers to export');
  }

  // Base headers that are always included
  const baseHeaders = [
    'author',
    'email', 
    'aff',
    'city',
    'country',
    'conditions_met',
    'conditions_satisfied'
  ];

  // Get columns for selected validation conditions
  let conditionalHeaders: string[] = [];
  if (selectedConditions && selectedConditions.length > 0) {
    console.log('[generateCSV] Processing selected conditions:', selectedConditions);
    const selectedColumns = new Set<string>();
    selectedConditions.forEach(condition => {
      const columns = VALIDATION_CONDITION_COLUMNS[condition];
      console.log(`[generateCSV] Condition "${condition}" maps to columns:`, columns);
      if (columns) {
        columns.forEach(col => selectedColumns.add(col));
      }
    });
    conditionalHeaders = Array.from(selectedColumns);
    console.log('[generateCSV] Final conditional headers:', conditionalHeaders);
  } else {
    console.log('[generateCSV] No conditions specified, using all validation columns');
    // If no conditions specified, include all validation columns (backward compatibility)
    conditionalHeaders = [
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
      'Relevant_Primary_Pub_last_years',
      'Relevant_Secondary_Pub_last_years',
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
      'sanction_country',
      'no_of_pub_condition_10_years',
      'no_of_pub_condition_5_years',
      'no_of_pub_condition_2_years',
      'english_ratio',
      'english_condition',
      'coauthor_condition',
      'aff_condition',
      'country_match_condition',
      'retracted_condition'
    ];
  }

  const headers = [...baseHeaders, ...conditionalHeaders];
  console.log('[generateCSV] Final headers:', headers);
  console.log('[generateCSV] Total header count:', headers.length);

  // Create CSV rows - only include data for selected columns
  const rows = reviewers.map((reviewer, reviewerIndex) => {
    console.log(`[generateCSV] Processing reviewer ${reviewerIndex + 1}:`, reviewer.reviewer || reviewer.email);
    
    const baseData = [
      escapeCSVField(reviewer.reviewer),
      escapeCSVField(reviewer.email),
      escapeCSVField(reviewer.aff),
      escapeCSVField(reviewer.city),
      escapeCSVField(reviewer.country),
      reviewer.conditions_met || 0,
      escapeCSVField(reviewer.conditions_satisfied || '')
    ];
    
    console.log(`[generateCSV] Base data for reviewer ${reviewerIndex + 1}:`, baseData);

    const conditionalData = conditionalHeaders.map((header, headerIndex) => {
      const value = getReviewerFieldValue(reviewer, header);
      const escapedValue = escapeCSVField(value);
      console.log(`[generateCSV] Header ${headerIndex + 1} "${header}": ${value} -> "${escapedValue}"`);
      return escapedValue;
    });
    
    console.log(`[generateCSV] Conditional data for reviewer ${reviewerIndex + 1}:`, conditionalData);

    const fullRow = [...baseData, ...conditionalData];
    console.log(`[generateCSV] Full row for reviewer ${reviewerIndex + 1} (${fullRow.length} values):`, fullRow);
    
    return fullRow;
  });

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  console.log('[generateCSV] Final CSV structure:');
  console.log('[generateCSV] Headers count:', headers.length);
  console.log('[generateCSV] First row count:', rows[0]?.length || 0);
  console.log('[generateCSV] Headers vs Row length match:', headers.length === (rows[0]?.length || 0));
  
  // Show first few lines of CSV for debugging
  const csvLines = csvContent.split('\n');
  console.log('[generateCSV] First 3 lines of CSV:');
  csvLines.slice(0, 3).forEach((line, index) => {
    console.log(`Line ${index + 1}: ${line}`);
  });

  return csvContent;
}

/**
 * Helper function to get reviewer field value with fallback handling
 */
function getReviewerFieldValue(reviewer: Reviewer, fieldName: string): string | number {
  console.log(`[getReviewerFieldValue] Looking for field: ${fieldName}`);
  
  // Handle special field mappings
  const fieldMappings: Record<string, string[]> = {
    'Publications_10_years': ['Publications_10_years', 'Publications (last 10 years)'],
    'Publications_2_years': ['Publications_2_years', 'Publications (last 2 years)'],
    'Publications_last_year': ['Publications_last_year', 'Publications (last year)'],
    'Relevant_Publications_5_years': ['Relevant_Publications_5_years', 'Relevant Publications (last 5 years)'],
    'Relevant_Primary_Pub_2_years': ['Relevant_Primary_Pub_2_years', 'Relevant Primary Publications (last 2 years)'],
    'Relevant_Secondary_Pub_2_years': ['Relevant_Secondary_Pub_2_years', 'Relevant Secondary Publications (last 2 years)'],
    'Relevant_Primary_Pub_last_years': ['Relevant_Primary_Pub_last_years', 'Relevant Primary Publications (last year)'],
    'Relevant_Secondary_Pub_last_years': ['Relevant_Secondary_Pub_last_years', 'Relevant Secondary Publications (last year)']
  };

  // Try mapped field names first
  if (fieldMappings[fieldName]) {
    console.log(`[getReviewerFieldValue] Using field mappings for ${fieldName}:`, fieldMappings[fieldName]);
    for (const mappedField of fieldMappings[fieldName]) {
      const value = (reviewer as any)[mappedField];
      console.log(`[getReviewerFieldValue] Trying mapped field ${mappedField}:`, value);
      if (value !== undefined && value !== null) {
        console.log(`[getReviewerFieldValue] Found value for ${fieldName} via ${mappedField}:`, value);
        return value;
      }
    }
  }

  // Try direct field access
  const value = (reviewer as any)[fieldName];
  console.log(`[getReviewerFieldValue] Direct field access for ${fieldName}:`, value);
  if (value !== undefined && value !== null) {
    // Handle boolean values
    if (typeof value === 'boolean') {
      const result = value ? 'Yes' : 'No';
      console.log(`[getReviewerFieldValue] Boolean value for ${fieldName}:`, result);
      return result;
    }
    console.log(`[getReviewerFieldValue] Found direct value for ${fieldName}:`, value);
    return value;
  }

  // Default values for different field types
  if (fieldName.includes('condition') || fieldName.includes('_no') || fieldName.includes('Publications')) {
    console.log(`[getReviewerFieldValue] Using default value 0 for ${fieldName}`);
    return 0;
  }
  
  console.log(`[getReviewerFieldValue] Using default empty string for ${fieldName}`);
  return '';
}
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
 * Escape CSV field to handle commas, quotes, and newlines
 */
/**
 * Generate JSON content from reviewer data
 * Includes only data related to selected validation conditions
 */
export function generateJSON(reviewers: Reviewer[], selectedConditions?: string[]): string {
  if (reviewers.length === 0) {
    throw new Error('No reviewers to export');
  }

  // Create structured export object
  const exportData = {
    exportDate: new Date().toISOString(),
    totalReviewers: reviewers.length,
    selectedValidationConditions: selectedConditions || [],
    reviewers: reviewers.map(reviewer => {
      const baseData = {
        name: reviewer.reviewer,
        email: reviewer.email,
        affiliation: reviewer.aff,
        location: {
          city: reviewer.city,
          country: reviewer.country
        },
        validation: {
          conditionsMet: reviewer.conditions_met,
          conditionsSatisfied: reviewer.conditions_satisfied
        }
      };

      // Add condition-specific data based on selected conditions
      const conditionalData: any = {};
      
      if (!selectedConditions || selectedConditions.length === 0) {
        // Include all data if no conditions specified (backward compatibility)
        conditionalData.publications = {
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
        };
        conditionalData.validation.coauthor = reviewer.coauthor;
        conditionalData.validation.countryMatch = reviewer.country_match;
        conditionalData.validation.affiliationMatch = reviewer.aff_match;
        conditionalData.validation.sanctionCountry = reviewer.sanction_country || 'no';
      } else {
        // Include only data for selected conditions
        selectedConditions.forEach(condition => {
          const columns = VALIDATION_CONDITION_COLUMNS[condition];
          if (columns) {
            columns.forEach(column => {
              const value = getReviewerFieldValue(reviewer, column);
              if (value !== '' && value !== 0) {
                conditionalData[column] = value;
              }
            });
          }
        });
      }

      return { ...baseData, ...conditionalData };
    })
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
export function exportReviewersAsCSV(reviewers: Reviewer[], selectedConditions?: string[]): void {
  try {
    const csvContent = generateCSV(reviewers, selectedConditions);
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
export function exportReviewersAsJSON(reviewers: Reviewer[], selectedConditions?: string[]): void {
  try {
    const jsonContent = generateJSON(reviewers, selectedConditions);
    const filename = `reviewers-${new Date().toISOString().split('T')[0]}.json`;
    downloadFile(jsonContent, filename, 'application/json;charset=utf-8;');
  } catch (error) {
    console.error('JSON export error:', error);
    throw new Error('Failed to generate JSON file');
  }
}
