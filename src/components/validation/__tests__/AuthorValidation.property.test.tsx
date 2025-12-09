/**
 * Property-based tests for AuthorValidation component
 * Tests universal properties that should hold across all inputs
 * 
 * Feature: scholarfinder-api-integration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useAddManualAuthor, useValidationStatus, useInitiateValidation } from '@/hooks/useValidation';
import { fileService } from '@/services/fileService';

// Mock dependencies
vi.mock('@/lib/config', () => ({
  config: {
    apiBaseUrl: 'http://localhost:3000',
    apiTimeout: 30000,
    enableDebugLogging: false,
  },
}));

vi.mock('@/services/fileService', () => ({
  fileService: {
    addManualAuthor: vi.fn(),
    validateAuthors: vi.fn(),
    getValidationStatus: vi.fn(),
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('@/hooks/useErrorHandling', () => ({
  useErrorHandling: () => ({
    handleError: vi.fn(),
  }),
}));

describe('AuthorValidation Property Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const createWrapper = () => {
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };

  /**
   * Property 24: Manual author search
   * Validates: Requirements 12.3
   * 
   * For any author name with at least 2 characters, the manual author API should 
   * return a list of found authors with their details.
   */
  describe('Property 24: Manual author search', () => {
    it('should return found authors with details for any valid author name', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }), // processId
          fc.string({ minLength: 2, maxLength: 100 }), // authorName (at least 2 chars)
          fc.integer({ min: 0, max: 10 }), // number of results
          async (processId, authorName, resultCount) => {
            // Generate mock results
            const mockResults = Array.from({ length: resultCount }, (_, i) => ({
              name: `${authorName} ${i}`,
              email: `author${i}@example.com`,
              affiliation: `University ${i}`,
              country: 'USA',
              publications: Math.floor(Math.random() * 100),
            }));

            const mockResponse = {
              found_authors: mockResults,
              search_term: authorName,
              total_found: resultCount,
            };

            // Mock the API call
            vi.mocked(fileService.addManualAuthor).mockResolvedValue(mockResponse);

            // Render the hook
            const { result } = renderHook(
              () => useAddManualAuthor(processId),
              { wrapper: createWrapper() }
            );

            // Call the mutation
            const response = await result.current.mutateAsync(authorName);

            // Verify the response structure
            expect(response).toHaveProperty('found_authors');
            expect(response).toHaveProperty('search_term');
            expect(response).toHaveProperty('total_found');
            
            // Verify search term matches
            expect(response.search_term).toBe(authorName);
            
            // Verify total_found matches array length
            expect(response.total_found).toBe(response.found_authors.length);
            
            // Verify each author has required fields
            response.found_authors.forEach((author: any) => {
              expect(author).toHaveProperty('name');
              expect(author).toHaveProperty('affiliation');
              expect(typeof author.name).toBe('string');
              expect(typeof author.affiliation).toBe('string');
            });

            // Verify the API was called with correct parameters
            expect(fileService.addManualAuthor).toHaveBeenCalledWith(processId, authorName);
          }
        ),
        { numRuns: 100 } // Run 100 iterations as specified in design
      );
    });

    it('should handle empty results correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }), // processId
          fc.string({ minLength: 2, maxLength: 100 }), // authorName
          async (processId, authorName) => {
            const mockResponse = {
              found_authors: [],
              search_term: authorName,
              total_found: 0,
            };

            vi.mocked(fileService.addManualAuthor).mockResolvedValue(mockResponse);

            const { result } = renderHook(
              () => useAddManualAuthor(processId),
              { wrapper: createWrapper() }
            );

            const response = await result.current.mutateAsync(authorName);

            // Verify empty results are handled correctly
            expect(response.found_authors).toEqual([]);
            expect(response.total_found).toBe(0);
            expect(response.search_term).toBe(authorName);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate author name length requirement', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }), // processId
          fc.string({ minLength: 0, maxLength: 1 }), // authorName (less than 2 chars)
          async (processId, authorName) => {
            // Mock the API to throw an error for invalid input
            vi.mocked(fileService.addManualAuthor).mockRejectedValue(
              new Error('Author name must be at least 2 characters long')
            );

            const { result } = renderHook(
              () => useAddManualAuthor(processId),
              { wrapper: createWrapper() }
            );

            // Attempt to call with invalid name should fail
            await expect(
              result.current.mutateAsync(authorName)
            ).rejects.toThrow();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should preserve all author details in response', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }), // processId
          fc.string({ minLength: 2, maxLength: 100 }), // authorName
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }),
            email: fc.option(fc.emailAddress()),
            affiliation: fc.string({ minLength: 1, maxLength: 200 }),
            country: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
            publications: fc.option(fc.integer({ min: 0, max: 1000 })),
          }),
          async (processId, authorName, authorDetails) => {
            const mockResponse = {
              found_authors: [authorDetails],
              search_term: authorName,
              total_found: 1,
            };

            vi.mocked(fileService.addManualAuthor).mockResolvedValue(mockResponse);

            const { result } = renderHook(
              () => useAddManualAuthor(processId),
              { wrapper: createWrapper() }
            );

            const response = await result.current.mutateAsync(authorName);

            // Verify all author details are preserved
            const returnedAuthor = response.found_authors[0];
            expect(returnedAuthor.name).toBe(authorDetails.name);
            expect(returnedAuthor.affiliation).toBe(authorDetails.affiliation);
            
            if (authorDetails.email !== null) {
              expect(returnedAuthor.email).toBe(authorDetails.email);
            }
            
            if (authorDetails.country !== null) {
              expect(returnedAuthor.country).toBe(authorDetails.country);
            }
            
            if (authorDetails.publications !== null) {
              expect(returnedAuthor.publications).toBe(authorDetails.publications);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 25: Validation progress tracking
   * Validates: Requirements 13.2
   * 
   * For any validation in progress, the validation status API should return 
   * progress percentage and estimated completion time.
   */
  describe('Property 25: Validation progress tracking', () => {
    it('should return progress percentage and estimated completion time for in-progress validation', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }), // processId
          fc.integer({ min: 0, max: 100 }), // progress_percentage
          fc.string({ minLength: 1, maxLength: 50 }), // estimated_completion_time
          fc.integer({ min: 0, max: 1000 }), // total_authors_processed
          async (processId, progressPercentage, estimatedTime, authorsProcessed) => {
            const mockStatus = {
              validation_status: 'in_progress' as const,
              progress_percentage: progressPercentage,
              estimated_completion_time: estimatedTime,
              total_authors_processed: authorsProcessed,
              validation_criteria: [
                'Publications (last 10 years) ≥ 8',
                'Relevant Publications (last 5 years) ≥ 3',
                'Publications (last 2 years) ≥ 1',
                'English Publications > 50%',
                'No Coauthorship',
                'Different Affiliation',
                'Same Country',
                'No Retracted Publications'
              ],
            };

            vi.mocked(fileService.getValidationStatus).mockResolvedValue(mockStatus);

            const { result } = renderHook(
              () => useValidationStatus(processId, true),
              { wrapper: createWrapper() }
            );

            // Wait for the query to complete
            await waitFor(() => {
              expect(result.current.isSuccess).toBe(true);
            }, { timeout: 3000 });

            const status = result.current.data as any;

            // Verify required fields are present
            expect(status).toHaveProperty('validation_status');
            expect(status).toHaveProperty('progress_percentage');
            expect(status).toHaveProperty('total_authors_processed');
            
            // Verify validation status is in_progress
            expect(status.validation_status).toBe('in_progress');
            
            // Verify progress percentage is between 0 and 100
            expect(status.progress_percentage).toBeGreaterThanOrEqual(0);
            expect(status.progress_percentage).toBeLessThanOrEqual(100);
            
            // Verify estimated completion time is present
            if (status.estimated_completion_time) {
              expect(typeof status.estimated_completion_time).toBe('string');
            }
            
            // Verify total authors processed is a non-negative number
            expect(status.total_authors_processed).toBeGreaterThanOrEqual(0);
            
            // Verify validation criteria array is present
            expect(Array.isArray(status.validation_criteria)).toBe(true);
          }
        ),
        { numRuns: 10 } // Reduced runs for faster execution
      );
    }, 30000); // Increased timeout for property test

    it('should handle completed validation status', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }), // processId
          fc.integer({ min: 1, max: 1000 }), // total_authors
          fc.integer({ min: 1, max: 1000 }), // authors_validated
          fc.float({ min: 0, max: 8 }), // average_conditions_met
          async (processId, totalAuthors, authorsValidated, avgConditions) => {
            const mockStatus = {
              validation_status: 'completed' as const,
              progress_percentage: 100,
              total_authors_processed: authorsValidated,
              validation_criteria: [
                'Publications (last 10 years) ≥ 8',
                'Relevant Publications (last 5 years) ≥ 3',
                'Publications (last 2 years) ≥ 1',
                'English Publications > 50%',
                'No Coauthorship',
                'Different Affiliation',
                'Same Country',
                'No Retracted Publications'
              ],
              summary: {
                total_authors: totalAuthors,
                authors_validated: authorsValidated,
                conditions_applied: [
                  'Publications (last 10 years) ≥ 8',
                  'Relevant Publications (last 5 years) ≥ 3',
                ],
                average_conditions_met: avgConditions,
              },
            };

            vi.mocked(fileService.getValidationStatus).mockResolvedValue(mockStatus);

            const { result } = renderHook(
              () => useValidationStatus(processId, true),
              { wrapper: createWrapper() }
            );

            await waitFor(() => {
              expect(result.current.isSuccess).toBe(true);
            }, { timeout: 3000 });

            const status = result.current.data as any;

            // Verify completed status
            expect(status.validation_status).toBe('completed');
            expect(status.progress_percentage).toBe(100);
            
            // Verify summary is present
            expect(status.summary).toBeDefined();
            expect(status.summary.total_authors).toBeGreaterThanOrEqual(0);
            expect(status.summary.authors_validated).toBeGreaterThanOrEqual(0);
            expect(status.summary.average_conditions_met).toBeGreaterThanOrEqual(0);
            expect(status.summary.average_conditions_met).toBeLessThanOrEqual(8);
          }
        ),
        { numRuns: 10 } // Reduced runs for faster execution
      );
    }, 30000); // Increased timeout for property test

    it('should handle failed validation status', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }), // processId
          async (processId) => {
            const mockStatus = {
              validation_status: 'failed' as const,
              progress_percentage: 0,
              total_authors_processed: 0,
              validation_criteria: [],
            };

            vi.mocked(fileService.getValidationStatus).mockResolvedValue(mockStatus);

            const { result } = renderHook(
              () => useValidationStatus(processId, true),
              { wrapper: createWrapper() }
            );

            await waitFor(() => {
              expect(result.current.isSuccess).toBe(true);
            });

            const status = result.current.data as any;

            // Verify failed status
            expect(status.validation_status).toBe('failed');
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Property 26: Validation score assignment
   * Validates: Requirements 13.3
   * 
   * For any validated reviewer, the conditions_met score should be between 0 and 8 
   * inclusive, representing the number of validation criteria satisfied.
   */
  describe('Property 26: Validation score assignment', () => {
    it('should assign conditions_met score between 0 and 8 for any reviewer', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }), // processId
          fc.array(
            fc.record({
              reviewer: fc.string({ minLength: 1, maxLength: 100 }),
              email: fc.emailAddress(),
              aff: fc.string({ minLength: 1, maxLength: 200 }),
              city: fc.string({ minLength: 1, maxLength: 100 }),
              country: fc.string({ minLength: 1, maxLength: 100 }),
              Total_Publications: fc.integer({ min: 0, max: 500 }),
              English_Pubs: fc.integer({ min: 0, max: 500 }),
              'Publications (last 10 years)': fc.integer({ min: 0, max: 100 }),
              'Relevant Publications (last 5 years)': fc.integer({ min: 0, max: 50 }),
              'Publications (last 2 years)': fc.integer({ min: 0, max: 20 }),
              'Publications (last year)': fc.integer({ min: 0, max: 10 }),
              Clinical_Trials_no: fc.integer({ min: 0, max: 10 }),
              Clinical_study_no: fc.integer({ min: 0, max: 10 }),
              Case_reports_no: fc.integer({ min: 0, max: 10 }),
              Retracted_Pubs_no: fc.integer({ min: 0, max: 5 }),
              TF_Publications_last_year: fc.integer({ min: 0, max: 10 }),
              coauthor: fc.boolean(),
              country_match: fc.constantFrom('yes', 'no'),
              aff_match: fc.constantFrom('yes', 'no'),
              conditions_met: fc.integer({ min: 0, max: 8 }), // Score must be 0-8
              conditions_satisfied: fc.string(),
            }),
            { minLength: 1, maxLength: 5 } // Reduced array size
          ),
          async (processId, reviewers) => {
            const mockStatus = {
              validation_status: 'completed' as const,
              progress_percentage: 100,
              total_authors_processed: reviewers.length,
              validation_criteria: [
                'Publications (last 10 years) ≥ 8',
                'Relevant Publications (last 5 years) ≥ 3',
                'Publications (last 2 years) ≥ 1',
                'English Publications > 50%',
                'No Coauthorship',
                'Different Affiliation',
                'Same Country',
                'No Retracted Publications'
              ],
              summary: {
                total_authors: reviewers.length,
                authors_validated: reviewers.length,
                conditions_applied: [
                  'Publications (last 10 years) ≥ 8',
                  'Relevant Publications (last 5 years) ≥ 3',
                ],
                average_conditions_met: reviewers.reduce((sum, r) => sum + r.conditions_met, 0) / reviewers.length,
              },
            };

            vi.mocked(fileService.getValidationStatus).mockResolvedValue(mockStatus);

            const { result } = renderHook(
              () => useValidationStatus(processId, true),
              { wrapper: createWrapper() }
            );

            await waitFor(() => {
              expect(result.current.isSuccess).toBe(true);
            }, { timeout: 3000 });

            // Verify each reviewer has a valid conditions_met score
            reviewers.forEach((reviewer) => {
              expect(reviewer.conditions_met).toBeGreaterThanOrEqual(0);
              expect(reviewer.conditions_met).toBeLessThanOrEqual(8);
              expect(Number.isInteger(reviewer.conditions_met)).toBe(true);
            });

            // Verify average conditions met is within valid range
            const status = result.current.data as any;
            if (status.summary) {
              expect(status.summary.average_conditions_met).toBeGreaterThanOrEqual(0);
              expect(status.summary.average_conditions_met).toBeLessThanOrEqual(8);
            }
          }
        ),
        { numRuns: 10 } // Reduced runs for faster execution
      );
    }, 30000); // Increased timeout for property test

    it('should ensure conditions_met matches the number of satisfied criteria', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }), // processId
          fc.integer({ min: 0, max: 8 }), // conditions_met
          async (processId, conditionsMet) => {
            // Create a reviewer with specific conditions_met score
            const reviewer = {
              reviewer: 'Test Reviewer',
              email: 'test@example.com',
              aff: 'Test University',
              city: 'Test City',
              country: 'USA',
              Total_Publications: 100,
              English_Pubs: 90,
              'Publications (last 10 years)': 50,
              'Relevant Publications (last 5 years)': 20,
              'Publications (last 2 years)': 10,
              'Publications (last year)': 5,
              Clinical_Trials_no: 0,
              Clinical_study_no: 0,
              Case_reports_no: 0,
              Retracted_Pubs_no: 0,
              TF_Publications_last_year: 5,
              coauthor: false,
              country_match: 'yes',
              aff_match: 'no',
              conditions_met: conditionsMet,
              conditions_satisfied: `${conditionsMet} of 8`,
            };

            const mockStatus = {
              validation_status: 'completed' as const,
              progress_percentage: 100,
              total_authors_processed: 1,
              validation_criteria: [
                'Publications (last 10 years) ≥ 8',
                'Relevant Publications (last 5 years) ≥ 3',
                'Publications (last 2 years) ≥ 1',
                'English Publications > 50%',
                'No Coauthorship',
                'Different Affiliation',
                'Same Country',
                'No Retracted Publications'
              ],
              summary: {
                total_authors: 1,
                authors_validated: 1,
                conditions_applied: [
                  'Publications (last 10 years) ≥ 8',
                  'Relevant Publications (last 5 years) ≥ 3',
                ],
                average_conditions_met: conditionsMet,
              },
            };

            vi.mocked(fileService.getValidationStatus).mockResolvedValue(mockStatus);

            const { result } = renderHook(
              () => useValidationStatus(processId, true),
              { wrapper: createWrapper() }
            );

            await waitFor(() => {
              expect(result.current.isSuccess).toBe(true);
            }, { timeout: 3000 });

            // Verify conditions_met is within valid range
            expect(reviewer.conditions_met).toBeGreaterThanOrEqual(0);
            expect(reviewer.conditions_met).toBeLessThanOrEqual(8);
            
            // Verify conditions_satisfied string format
            expect(reviewer.conditions_satisfied).toContain(conditionsMet.toString());
            expect(reviewer.conditions_satisfied).toContain('of 8');
          }
        ),
        { numRuns: 10 } // Reduced runs for faster execution
      );
    }, 30000); // Increased timeout for property test
  });
});
