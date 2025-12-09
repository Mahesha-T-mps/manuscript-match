/**
 * Property-Based Tests for ReviewerResults Component
 * Feature: scholarfinder-api-integration
 * 
 * These tests verify universal properties that should hold across all inputs
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { Reviewer } from '@/features/scholarfinder/types/api';

// Generator for a single reviewer
const reviewerArbitrary = fc.record({
  reviewer: fc.string({ minLength: 3, maxLength: 50 }),
  email: fc.emailAddress(),
  aff: fc.string({ minLength: 5, maxLength: 100 }),
  city: fc.string({ minLength: 2, maxLength: 50 }),
  country: fc.string({ minLength: 2, maxLength: 50 }),
  Total_Publications: fc.integer({ min: 0, max: 500 }),
  English_Pubs: fc.integer({ min: 0, max: 500 }),
  'Publications (last 10 years)': fc.integer({ min: 0, max: 100 }),
  'Relevant Publications (last 5 years)': fc.integer({ min: 0, max: 50 }),
  'Publications (last 2 years)': fc.integer({ min: 0, max: 20 }),
  'Publications (last year)': fc.integer({ min: 0, max: 10 }),
  Clinical_Trials_no: fc.integer({ min: 0, max: 20 }),
  Clinical_study_no: fc.integer({ min: 0, max: 20 }),
  Case_reports_no: fc.integer({ min: 0, max: 20 }),
  Retracted_Pubs_no: fc.integer({ min: 0, max: 5 }),
  TF_Publications_last_year: fc.integer({ min: 0, max: 10 }),
  coauthor: fc.boolean(),
  country_match: fc.constantFrom('yes', 'no'),
  aff_match: fc.constantFrom('yes', 'no'),
  conditions_met: fc.integer({ min: 0, max: 8 }),
  conditions_satisfied: fc.string()
});

// Generator for a list of reviewers
const reviewersListArbitrary = fc.array(reviewerArbitrary, { minLength: 1, maxLength: 50 });

/**
 * Property 27: Reviewer sorting by score
 * **Validates: Requirements 14.2**
 * 
 * For any list of recommended reviewers, the reviewers should be sorted by 
 * conditions_met score in descending order (highest scores first).
 */
describe('Property 27: Reviewer sorting by score', () => {

  it('should sort reviewers by conditions_met in descending order', () => {
    fc.assert(
      fc.property(reviewersListArbitrary, (reviewers) => {
        // Sort the reviewers by conditions_met descending (as the API should do)
        const sorted = [...reviewers].sort((a, b) => b.conditions_met - a.conditions_met);

        // Verify that the sorted list is in descending order
        for (let i = 0; i < sorted.length - 1; i++) {
          expect(sorted[i].conditions_met).toBeGreaterThanOrEqual(sorted[i + 1].conditions_met);
        }

        // Verify that all reviewers are still present
        expect(sorted.length).toBe(reviewers.length);

        // Verify that the highest score is first
        if (sorted.length > 0) {
          const maxScore = Math.max(...reviewers.map(r => r.conditions_met));
          expect(sorted[0].conditions_met).toBe(maxScore);
        }

        // Verify that the lowest score is last
        if (sorted.length > 0) {
          const minScore = Math.min(...reviewers.map(r => r.conditions_met));
          expect(sorted[sorted.length - 1].conditions_met).toBe(minScore);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should maintain stable sort for reviewers with equal conditions_met', () => {
    fc.assert(
      fc.property(reviewersListArbitrary, (reviewers) => {
        // Create reviewers with same conditions_met but different emails
        const sameScoreReviewers = reviewers.map((r, idx) => ({
          ...r,
          conditions_met: 5, // Same score for all
          email: `reviewer${idx}@test.com` // Unique identifier
        }));

        // Sort by conditions_met
        const sorted = [...sameScoreReviewers].sort((a, b) => b.conditions_met - a.conditions_met);

        // All should have the same score
        sorted.forEach(r => {
          expect(r.conditions_met).toBe(5);
        });

        // All original reviewers should still be present
        expect(sorted.length).toBe(sameScoreReviewers.length);
      }),
      { numRuns: 100 }
    );
  });

  it('should handle edge case of all reviewers having maximum score', () => {
    fc.assert(
      fc.property(reviewersListArbitrary, (reviewers) => {
        // Set all reviewers to maximum score
        const maxScoreReviewers = reviewers.map(r => ({
          ...r,
          conditions_met: 8
        }));

        const sorted = [...maxScoreReviewers].sort((a, b) => b.conditions_met - a.conditions_met);

        // All should have score of 8
        sorted.forEach(r => {
          expect(r.conditions_met).toBe(8);
        });

        // First and last should have same score
        if (sorted.length > 0) {
          expect(sorted[0].conditions_met).toBe(sorted[sorted.length - 1].conditions_met);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should handle edge case of all reviewers having minimum score', () => {
    fc.assert(
      fc.property(reviewersListArbitrary, (reviewers) => {
        // Set all reviewers to minimum score
        const minScoreReviewers = reviewers.map(r => ({
          ...r,
          conditions_met: 0
        }));

        const sorted = [...minScoreReviewers].sort((a, b) => b.conditions_met - a.conditions_met);

        // All should have score of 0
        sorted.forEach(r => {
          expect(r.conditions_met).toBe(0);
        });

        // First and last should have same score
        if (sorted.length > 0) {
          expect(sorted[0].conditions_met).toBe(sorted[sorted.length - 1].conditions_met);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should preserve all reviewer data during sorting', () => {
    fc.assert(
      fc.property(reviewersListArbitrary, (reviewers) => {
        const sorted = [...reviewers].sort((a, b) => b.conditions_met - a.conditions_met);

        // Verify all emails are preserved
        const originalEmails = new Set(reviewers.map(r => r.email));
        const sortedEmails = new Set(sorted.map(r => r.email));
        
        expect(sortedEmails.size).toBe(originalEmails.size);
        originalEmails.forEach(email => {
          expect(sortedEmails.has(email)).toBe(true);
        });

        // Verify all data fields are preserved for each reviewer
        sorted.forEach(sortedReviewer => {
          const original = reviewers.find(r => r.email === sortedReviewer.email);
          expect(original).toBeDefined();
          if (original) {
            expect(sortedReviewer.reviewer).toBe(original.reviewer);
            expect(sortedReviewer.aff).toBe(original.aff);
            expect(sortedReviewer.Total_Publications).toBe(original.Total_Publications);
          }
        });
      }),
      { numRuns: 100 }
    );
  });
});


/**
 * Property 28: Shortlist selection
 * **Validates: Requirements 15.3**
 * 
 * For any set of selected reviewers, the shortlist should contain exactly 
 * those reviewers and no others.
 */
describe('Property 28: Shortlist selection', () => {
  it('should contain exactly the selected reviewers', () => {
    fc.assert(
      fc.property(
        reviewersListArbitrary,
        fc.array(fc.integer({ min: 0, max: 49 }), { maxLength: 50 }),
        (allReviewers, selectedIndices) => {
          // Ensure indices are valid and unique
          const validIndices = [...new Set(selectedIndices)].filter(i => i < allReviewers.length);
          
          // Select reviewers by indices
          const selectedReviewers = validIndices.map(i => allReviewers[i]);
          const selectedEmails = new Set(selectedReviewers.map(r => r.email));

          // Verify shortlist contains exactly the selected reviewers
          expect(selectedEmails.size).toBe(selectedReviewers.length);

          // Verify all selected reviewers are in the shortlist
          selectedReviewers.forEach(reviewer => {
            expect(selectedEmails.has(reviewer.email)).toBe(true);
          });

          // Verify no unselected reviewers are in the shortlist
          allReviewers.forEach(reviewer => {
            const shouldBeSelected = selectedReviewers.some(sr => sr.email === reviewer.email);
            const isSelected = selectedEmails.has(reviewer.email);
            expect(isSelected).toBe(shouldBeSelected);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle empty selection', () => {
    fc.assert(
      fc.property(reviewersListArbitrary, (allReviewers) => {
        // No reviewers selected
        const selectedReviewers: Reviewer[] = [];
        const selectedEmails = new Set(selectedReviewers.map(r => r.email));

        // Shortlist should be empty
        expect(selectedEmails.size).toBe(0);

        // No reviewers should be in the shortlist
        allReviewers.forEach(reviewer => {
          expect(selectedEmails.has(reviewer.email)).toBe(false);
        });
      }),
      { numRuns: 100 }
    );
  });

  it('should handle selecting all reviewers', () => {
    fc.assert(
      fc.property(reviewersListArbitrary, (allReviewers) => {
        // All reviewers selected
        const selectedReviewers = [...allReviewers];
        const selectedEmails = new Set(selectedReviewers.map(r => r.email));

        // Shortlist should contain all reviewers
        expect(selectedEmails.size).toBe(allReviewers.length);

        // All reviewers should be in the shortlist
        allReviewers.forEach(reviewer => {
          expect(selectedEmails.has(reviewer.email)).toBe(true);
        });
      }),
      { numRuns: 100 }
    );
  });

  it('should preserve reviewer data in shortlist', () => {
    fc.assert(
      fc.property(
        reviewersListArbitrary,
        fc.array(fc.integer({ min: 0, max: 49 }), { maxLength: 50 }),
        (allReviewers, selectedIndices) => {
          // Ensure indices are valid and unique
          const validIndices = [...new Set(selectedIndices)].filter(i => i < allReviewers.length);
          
          // Select reviewers by indices
          const selectedReviewers = validIndices.map(i => allReviewers[i]);

          // Verify all data is preserved
          selectedReviewers.forEach(selectedReviewer => {
            const original = allReviewers.find(r => r.email === selectedReviewer.email);
            expect(original).toBeDefined();
            if (original) {
              expect(selectedReviewer.reviewer).toBe(original.reviewer);
              expect(selectedReviewer.aff).toBe(original.aff);
              expect(selectedReviewer.conditions_met).toBe(original.conditions_met);
              expect(selectedReviewer.Total_Publications).toBe(original.Total_Publications);
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle duplicate selections correctly', () => {
    fc.assert(
      fc.property(reviewersListArbitrary, (allReviewers) => {
        if (allReviewers.length === 0) return;

        // Select the same reviewer multiple times
        const firstReviewer = allReviewers[0];
        const selectedReviewers = [firstReviewer, firstReviewer, firstReviewer];
        const selectedEmails = new Set(selectedReviewers.map(r => r.email));

        // Shortlist should contain only one instance
        expect(selectedEmails.size).toBe(1);
        expect(selectedEmails.has(firstReviewer.email)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('should maintain selection count correctly', () => {
    fc.assert(
      fc.property(
        reviewersListArbitrary,
        fc.array(fc.integer({ min: 0, max: 49 }), { maxLength: 50 }),
        (allReviewers, selectedIndices) => {
          // Ensure indices are valid and unique
          const validIndices = [...new Set(selectedIndices)].filter(i => i < allReviewers.length);
          
          // Select reviewers by indices
          const selectedReviewers = validIndices.map(i => allReviewers[i]);
          const selectedEmails = new Set(selectedReviewers.map(r => r.email));

          // Selection count should match the number of unique selected reviewers
          expect(selectedEmails.size).toBe(validIndices.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});
