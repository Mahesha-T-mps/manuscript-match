/**
 * Property-based tests for export utilities
 * Feature: scholarfinder-api-integration, Property 29: Export format generation
 * Validates: Requirements 16.2, 16.3
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { generateCSV, generateJSON } from '../exportUtils';
import type { Reviewer } from '@/features/scholarfinder/types/api';

// Arbitrary generator for Reviewer objects
const reviewerArbitrary = fc.record({
  reviewer: fc.string({ minLength: 1, maxLength: 100 }),
  email: fc.emailAddress(),
  aff: fc.string({ minLength: 1, maxLength: 200 }),
  city: fc.string({ minLength: 1, maxLength: 100 }),
  country: fc.string({ minLength: 1, maxLength: 100 }),
  Total_Publications: fc.nat({ max: 1000 }),
  English_Pubs: fc.nat({ max: 1000 }),
  'Publications (last 10 years)': fc.nat({ max: 500 }),
  'Relevant Publications (last 5 years)': fc.nat({ max: 200 }),
  'Publications (last 2 years)': fc.nat({ max: 100 }),
  'Publications (last year)': fc.nat({ max: 50 }),
  Clinical_Trials_no: fc.nat({ max: 50 }),
  Clinical_study_no: fc.nat({ max: 50 }),
  Case_reports_no: fc.nat({ max: 50 }),
  Retracted_Pubs_no: fc.nat({ max: 10 }),
  TF_Publications_last_year: fc.nat({ max: 50 }),
  coauthor: fc.boolean(),
  country_match: fc.constantFrom('yes', 'no'),
  aff_match: fc.constantFrom('yes', 'no'),
  conditions_met: fc.integer({ min: 0, max: 8 }),
  conditions_satisfied: fc.string({ minLength: 1, maxLength: 50 })
}) as fc.Arbitrary<Reviewer>;

describe('Export Utils - Property Tests', () => {
  describe('Property 29: Export format generation', () => {
    it('should generate valid CSV for any list of reviewers', () => {
      fc.assert(
        fc.property(
          fc.array(reviewerArbitrary, { minLength: 1, maxLength: 50 }),
          (reviewers) => {
            // Generate CSV
            const csv = generateCSV(reviewers);

            // Property 1: CSV should not be empty
            expect(csv.length).toBeGreaterThan(0);

            // Property 2: CSV should have header row
            const lines = csv.split('\n');
            expect(lines.length).toBeGreaterThan(0);
            
            // Property 3: CSV should have header + data rows
            expect(lines.length).toBe(reviewers.length + 1); // header + data rows

            // Property 4: Header should contain expected columns
            const header = lines[0];
            expect(header).toContain('Name');
            expect(header).toContain('Email');
            expect(header).toContain('Affiliation');
            expect(header).toContain('Conditions Met');

            // Property 5: Each data row should have same number of columns as header
            const headerColumns = header.split(',').length;
            for (let i = 1; i < lines.length; i++) {
              if (lines[i].trim()) {
                // Count columns accounting for quoted fields
                const row = lines[i];
                const columns = parseCSVRow(row);
                expect(columns.length).toBe(headerColumns);
              }
            }

            // Property 6: All reviewer names should appear in CSV (accounting for escaping)
            reviewers.forEach(reviewer => {
              // If name contains quotes, they will be escaped as ""
              const escapedName = reviewer.reviewer.replace(/"/g, '""');
              // CSV should contain either the original or escaped version
              const containsName = csv.includes(reviewer.reviewer) || csv.includes(escapedName);
              expect(containsName).toBe(true);
            });

            // Property 7: All reviewer emails should appear in CSV
            reviewers.forEach(reviewer => {
              expect(csv).toContain(reviewer.email);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate valid JSON for any list of reviewers', () => {
      fc.assert(
        fc.property(
          fc.array(reviewerArbitrary, { minLength: 1, maxLength: 50 }),
          (reviewers) => {
            // Generate JSON
            const jsonString = generateJSON(reviewers);

            // Property 1: JSON should not be empty
            expect(jsonString.length).toBeGreaterThan(0);

            // Property 2: JSON should be valid and parseable
            const parsed = JSON.parse(jsonString);
            expect(parsed).toBeDefined();

            // Property 3: Parsed JSON should have expected structure
            expect(parsed).toHaveProperty('exportDate');
            expect(parsed).toHaveProperty('totalReviewers');
            expect(parsed).toHaveProperty('reviewers');

            // Property 4: totalReviewers should match input length
            expect(parsed.totalReviewers).toBe(reviewers.length);

            // Property 5: reviewers array should have same length as input
            expect(parsed.reviewers).toHaveLength(reviewers.length);

            // Property 6: Each reviewer should have required fields
            parsed.reviewers.forEach((reviewer: any) => {
              expect(reviewer).toHaveProperty('name');
              expect(reviewer).toHaveProperty('email');
              expect(reviewer).toHaveProperty('affiliation');
              expect(reviewer).toHaveProperty('location');
              expect(reviewer).toHaveProperty('publications');
              expect(reviewer).toHaveProperty('validation');
            });

            // Property 7: All reviewer names should be preserved
            reviewers.forEach((reviewer, index) => {
              expect(parsed.reviewers[index].name).toBe(reviewer.reviewer);
            });

            // Property 8: All reviewer emails should be preserved
            reviewers.forEach((reviewer, index) => {
              expect(parsed.reviewers[index].email).toBe(reviewer.email);
            });

            // Property 9: Validation scores should be preserved
            reviewers.forEach((reviewer, index) => {
              expect(parsed.reviewers[index].validation.conditionsMet).toBe(reviewer.conditions_met);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle reviewers with special characters in CSV', () => {
      fc.assert(
        fc.property(
          fc.array(reviewerArbitrary, { minLength: 1, maxLength: 20 }),
          (reviewers) => {
            // Generate CSV
            const csv = generateCSV(reviewers);

            // Property: CSV should be generated without errors
            expect(csv).toBeDefined();
            expect(csv.length).toBeGreaterThan(0);

            // Property: Should have correct number of lines
            const lines = csv.split('\n');
            expect(lines.length).toBe(reviewers.length + 1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve all publication metrics in both formats', () => {
      fc.assert(
        fc.property(
          fc.array(reviewerArbitrary, { minLength: 1, maxLength: 20 }),
          (reviewers) => {
            // Generate both formats
            const csv = generateCSV(reviewers);
            const jsonString = generateJSON(reviewers);
            const json = JSON.parse(jsonString);

            // Property: All publication counts should be present in CSV
            reviewers.forEach(reviewer => {
              expect(csv).toContain(String(reviewer.Total_Publications));
              expect(csv).toContain(String(reviewer['Publications (last 10 years)']));
            });

            // Property: All publication counts should be present in JSON
            reviewers.forEach((reviewer, index) => {
              expect(json.reviewers[index].publications.total).toBe(reviewer.Total_Publications);
              expect(json.reviewers[index].publications.last10Years).toBe(reviewer['Publications (last 10 years)']);
              expect(json.reviewers[index].publications.relevantLast5Years).toBe(reviewer['Relevant Publications (last 5 years)']);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should throw error for empty reviewer list', () => {
      // Property: Both functions should throw for empty input
      expect(() => generateCSV([])).toThrow('No reviewers to export');
      expect(() => generateJSON([])).toThrow('No reviewers to export');
    });

    it('should handle single reviewer correctly', () => {
      fc.assert(
        fc.property(
          reviewerArbitrary,
          (reviewer) => {
            // Generate both formats with single reviewer
            const csv = generateCSV([reviewer]);
            const jsonString = generateJSON([reviewer]);
            const json = JSON.parse(jsonString);

            // Property: CSV should have exactly 2 lines (header + 1 data row)
            const lines = csv.split('\n');
            expect(lines.length).toBe(2);

            // Property: JSON should have exactly 1 reviewer
            expect(json.totalReviewers).toBe(1);
            expect(json.reviewers).toHaveLength(1);

            // Property: Data should match input
            expect(json.reviewers[0].name).toBe(reviewer.reviewer);
            expect(json.reviewers[0].email).toBe(reviewer.email);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

/**
 * Helper function to parse CSV row accounting for quoted fields
 */
function parseCSVRow(row: string): string[] {
  const columns: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const char = row[i];

    if (char === '"') {
      if (inQuotes && row[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of column
      columns.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  // Add last column
  columns.push(current);

  return columns;
}
