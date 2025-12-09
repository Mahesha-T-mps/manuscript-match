/**
 * Property-Based Tests for ScholarFinder API Service
 * Using fast-check for property-based testing
 * 
 * Feature: scholarfinder-api-integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { ScholarFinderApiService } from '../ScholarFinderApiService';
import type { RecommendationsResponse, Reviewer } from '../../types/api';

// Mock the API service dependency
vi.mock('../../../../services/apiService', () => ({
  ApiService: vi.fn().mockImplementation(() => ({
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    uploadFile: vi.fn(),
  })),
}));

// Mock the config with a getter to allow dynamic updates
vi.mock('../../../../lib/config', () => {
  const mockConfig = {
    apiBaseUrl: 'http://localhost:3002',
    scholarFinderApiUrl: 'http://192.168.61.60:8000',
    enableDebugLogging: false,
  };
  
  return {
    config: mockConfig,
    get mockConfigRef() {
      return mockConfig;
    }
  };
});

// Import the mocked config
import { config as mockConfig } from '../../../../lib/config';

describe('ScholarFinderApiService - Property-Based Tests', () => {
  let apiService: ScholarFinderApiService;
  let mockApiInstance: any;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock config to default
    (mockConfig as any).scholarFinderApiUrl = 'http://192.168.61.60:8000';
    apiService = new ScholarFinderApiService();
    mockApiInstance = (apiService as any).apiService;
  });

  /**
   * Property 1: Configuration consistency
   * Feature: scholarfinder-api-connection-fix, Property 1: Configuration consistency
   * Validates: Requirements 1.1, 1.2, 2.2, 3.1
   * 
   * For any ScholarFinderApiService instance created without custom configuration,
   * the baseURL should equal the application's configured ScholarFinder API URL
   * (config.scholarFinderApiUrl) from the config module.
   */
  describe('Property 1: Configuration consistency', () => {
    // Arbitrary generator for valid URLs
    const validUrlArbitrary = fc.oneof(
      fc.webUrl({ withFragments: false, withQueryParameters: false }),
      fc.tuple(
        fc.constantFrom('http', 'https'),
        fc.ipV4(),
        fc.integer({ min: 1, max: 65535 })
      ).map(([protocol, ip, port]) => `${protocol}://${ip}:${port}`)
    );

    it('should use config.scholarFinderApiUrl as default baseURL', async () => {
      await fc.assert(
        fc.asyncProperty(validUrlArbitrary, async (url) => {
          // Arrange - Set the config to a random URL
          (mockConfig as any).scholarFinderApiUrl = url;

          // Act - Create service without custom config
          const service = new ScholarFinderApiService();
          const serviceConfig = service.getConfig();

          // Assert - baseURL should match config.scholarFinderApiUrl
          expect(serviceConfig.baseURL).toBe(url);
        }),
        { numRuns: 100 }
      );
    });

    it('should consistently use config value across multiple instances', async () => {
      await fc.assert(
        fc.asyncProperty(validUrlArbitrary, async (url) => {
          // Arrange
          (mockConfig as any).scholarFinderApiUrl = url;

          // Act - Create multiple instances
          const service1 = new ScholarFinderApiService();
          const service2 = new ScholarFinderApiService();
          const service3 = new ScholarFinderApiService();

          // Assert - All should use the same config value
          expect(service1.getConfig().baseURL).toBe(url);
          expect(service2.getConfig().baseURL).toBe(url);
          expect(service3.getConfig().baseURL).toBe(url);
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 2: Configuration override preservation
   * Feature: scholarfinder-api-connection-fix, Property 2: Configuration override preservation
   * Validates: Requirements 2.3
   * 
   * For any custom ScholarFinderApiConfig provided to the constructor,
   * the custom baseURL should be used instead of the default, while other
   * unspecified properties should use default values.
   */
  describe('Property 2: Configuration override preservation', () => {
    // Arbitrary generator for valid URLs
    const validUrlArbitrary = fc.oneof(
      fc.webUrl({ withFragments: false, withQueryParameters: false }),
      fc.tuple(
        fc.constantFrom('http', 'https'),
        fc.ipV4(),
        fc.integer({ min: 1, max: 65535 })
      ).map(([protocol, ip, port]) => `${protocol}://${ip}:${port}`)
    );

    // Arbitrary generator for partial config
    const partialConfigArbitrary = fc.record({
      baseURL: fc.option(validUrlArbitrary, { nil: undefined }),
      timeout: fc.option(fc.integer({ min: 1000, max: 300000 }), { nil: undefined }),
      retries: fc.option(fc.integer({ min: 0, max: 10 }), { nil: undefined }),
      retryDelay: fc.option(fc.integer({ min: 0, max: 10000 }), { nil: undefined }),
    }, { requiredKeys: [] });

    it('should use custom baseURL when provided', async () => {
      await fc.assert(
        fc.asyncProperty(validUrlArbitrary, async (customUrl) => {
          // Arrange - Set a different default URL
          (mockConfig as any).scholarFinderApiUrl = 'http://default.example.com:8000';

          // Act - Create service with custom baseURL
          const service = new ScholarFinderApiService({ baseURL: customUrl });
          const serviceConfig = service.getConfig();

          // Assert - Should use custom URL, not default
          expect(serviceConfig.baseURL).toBe(customUrl);
          expect(serviceConfig.baseURL).not.toBe('http://default.example.com:8000');
        }),
        { numRuns: 100 }
      );
    });

    it('should merge custom config with defaults', async () => {
      await fc.assert(
        fc.asyncProperty(partialConfigArbitrary, async (customConfig) => {
          // Arrange
          (mockConfig as any).scholarFinderApiUrl = 'http://default.example.com:8000';
          const defaultTimeout = 120000;
          const defaultRetries = 3;
          const defaultRetryDelay = 2000;

          // Filter out undefined values to match JavaScript spread behavior
          const filteredConfig = Object.fromEntries(
            Object.entries(customConfig).filter(([_, v]) => v !== undefined)
          );

          // Act - Create service with partial custom config
          const service = new ScholarFinderApiService(filteredConfig);
          const serviceConfig = service.getConfig();

          // Assert - Custom values should be used where provided
          if (filteredConfig.baseURL !== undefined) {
            expect(serviceConfig.baseURL).toBe(filteredConfig.baseURL);
          } else {
            expect(serviceConfig.baseURL).toBe('http://default.example.com:8000');
          }

          if (filteredConfig.timeout !== undefined) {
            expect(serviceConfig.timeout).toBe(filteredConfig.timeout);
          } else {
            expect(serviceConfig.timeout).toBe(defaultTimeout);
          }

          if (filteredConfig.retries !== undefined) {
            expect(serviceConfig.retries).toBe(filteredConfig.retries);
          } else {
            expect(serviceConfig.retries).toBe(defaultRetries);
          }

          if (filteredConfig.retryDelay !== undefined) {
            expect(serviceConfig.retryDelay).toBe(filteredConfig.retryDelay);
          } else {
            expect(serviceConfig.retryDelay).toBe(defaultRetryDelay);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should preserve all custom config values', async () => {
      await fc.assert(
        fc.asyncProperty(
          validUrlArbitrary,
          fc.integer({ min: 1000, max: 300000 }),
          fc.integer({ min: 0, max: 10 }),
          fc.integer({ min: 0, max: 10000 }),
          async (baseURL, timeout, retries, retryDelay) => {
            // Arrange
            const customConfig = { baseURL, timeout, retries, retryDelay };

            // Act
            const service = new ScholarFinderApiService(customConfig);
            const serviceConfig = service.getConfig();

            // Assert - All custom values should be preserved
            expect(serviceConfig.baseURL).toBe(baseURL);
            expect(serviceConfig.timeout).toBe(timeout);
            expect(serviceConfig.retries).toBe(retries);
            expect(serviceConfig.retryDelay).toBe(retryDelay);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 27: Reviewer sorting by score
   * Feature: scholarfinder-api-integration, Property 27: Reviewer sorting by score
   * Validates: Requirements 14.2
   * 
   * For any list of recommended reviewers, the reviewers should be sorted by 
   * conditions_met score in descending order (highest scores first).
   */
  describe('Property 27: Reviewer sorting by score', () => {
    // Arbitrary generator for a single Reviewer
    const reviewerArbitrary = fc.record({
      reviewer: fc.string({ minLength: 3, maxLength: 50 }),
      email: fc.emailAddress(),
      aff: fc.string({ minLength: 5, maxLength: 100 }),
      city: fc.string({ minLength: 3, maxLength: 50 }),
      country: fc.string({ minLength: 2, maxLength: 50 }),
      Total_Publications: fc.integer({ min: 0, max: 500 }),
      English_Pubs: fc.integer({ min: 0, max: 500 }),
      'Publications (last 10 years)': fc.integer({ min: 0, max: 200 }),
      'Relevant Publications (last 5 years)': fc.integer({ min: 0, max: 100 }),
      'Publications (last 2 years)': fc.integer({ min: 0, max: 50 }),
      'Publications (last year)': fc.integer({ min: 0, max: 20 }),
      Clinical_Trials_no: fc.integer({ min: 0, max: 50 }),
      Clinical_study_no: fc.integer({ min: 0, max: 50 }),
      Case_reports_no: fc.integer({ min: 0, max: 50 }),
      Retracted_Pubs_no: fc.integer({ min: 0, max: 5 }),
      TF_Publications_last_year: fc.integer({ min: 0, max: 20 }),
      coauthor: fc.boolean(),
      country_match: fc.constantFrom('yes', 'no', 'different'),
      aff_match: fc.constantFrom('yes', 'no', 'different'),
      conditions_met: fc.integer({ min: 0, max: 8 }),
      conditions_satisfied: fc.string(),
    });

    // Arbitrary generator for a list of reviewers
    const reviewersListArbitrary = fc.array(reviewerArbitrary, { minLength: 1, maxLength: 50 });

    it('should return reviewers sorted by conditions_met in descending order', async () => {
      await fc.assert(
        fc.asyncProperty(reviewersListArbitrary, async (reviewers) => {
          // Arrange
          const jobId = 'test-job-123';
          const mockResponse: RecommendationsResponse = {
            message: 'Recommendations ready',
            job_id: jobId,
            data: {
              reviewers: reviewers,
              total_count: reviewers.length,
              validation_summary: {
                total_authors: reviewers.length,
                authors_validated: reviewers.length,
                conditions_applied: [
                  'Publications (last 10 years) ≥ 8',
                  'Relevant Publications (last 5 years) ≥ 3',
                  'Publications (last 2 years) ≥ 1',
                  'English Publications > 50%',
                  'No Coauthorship',
                  'Different Affiliation',
                  'Same Country',
                  'No Retracted Publications',
                ],
                average_conditions_met: 6.0,
              },
            },
          };

          mockApiInstance.get.mockResolvedValue({ data: mockResponse });

          // Act
          const result = await apiService.getRecommendations(jobId);

          // Assert - Property: reviewers should be sorted by conditions_met descending
          const returnedReviewers = result.data.reviewers;
          
          // Check that the list is sorted in descending order by conditions_met
          for (let i = 0; i < returnedReviewers.length - 1; i++) {
            const current = returnedReviewers[i].conditions_met;
            const next = returnedReviewers[i + 1].conditions_met;
            
            // Current reviewer's score should be >= next reviewer's score
            expect(current).toBeGreaterThanOrEqual(next);
          }
        }),
        { numRuns: 100 } // Run 100 iterations as specified in design doc
      );
    });

    it('should maintain sort order even with duplicate conditions_met scores', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.integer({ min: 0, max: 8 }), { minLength: 2, maxLength: 20 }),
          async (scores) => {
            // Arrange - Create reviewers with specific scores
            const reviewers: Reviewer[] = scores.map((score, index) => ({
              reviewer: `Reviewer ${index}`,
              email: `reviewer${index}@test.com`,
              aff: `University ${index}`,
              city: 'Test City',
              country: 'Test Country',
              Total_Publications: 100,
              English_Pubs: 90,
              'Publications (last 10 years)': 50,
              'Relevant Publications (last 5 years)': 30,
              'Publications (last 2 years)': 10,
              'Publications (last year)': 5,
              Clinical_Trials_no: 0,
              Clinical_study_no: 0,
              Case_reports_no: 0,
              Retracted_Pubs_no: 0,
              TF_Publications_last_year: 5,
              coauthor: false,
              country_match: 'yes',
              aff_match: 'different',
              conditions_met: score,
              conditions_satisfied: `${score} of 8`,
            }));

            const jobId = 'test-job-123';
            const mockResponse: RecommendationsResponse = {
              message: 'Recommendations ready',
              job_id: jobId,
              data: {
                reviewers: reviewers,
                total_count: reviewers.length,
                validation_summary: {
                  total_authors: reviewers.length,
                  authors_validated: reviewers.length,
                  conditions_applied: [],
                  average_conditions_met: 6.0,
                },
              },
            };

            mockApiInstance.get.mockResolvedValue({ data: mockResponse });

            // Act
            const result = await apiService.getRecommendations(jobId);

            // Assert - Property: list should be in descending order
            const returnedReviewers = result.data.reviewers;
            
            for (let i = 0; i < returnedReviewers.length - 1; i++) {
              expect(returnedReviewers[i].conditions_met).toBeGreaterThanOrEqual(
                returnedReviewers[i + 1].conditions_met
              );
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle edge case of all reviewers having same conditions_met score', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 8 }),
          fc.integer({ min: 1, max: 20 }),
          async (score, count) => {
            // Arrange - All reviewers have the same score
            const reviewers: Reviewer[] = Array.from({ length: count }, (_, index) => ({
              reviewer: `Reviewer ${index}`,
              email: `reviewer${index}@test.com`,
              aff: `University ${index}`,
              city: 'Test City',
              country: 'Test Country',
              Total_Publications: 100,
              English_Pubs: 90,
              'Publications (last 10 years)': 50,
              'Relevant Publications (last 5 years)': 30,
              'Publications (last 2 years)': 10,
              'Publications (last year)': 5,
              Clinical_Trials_no: 0,
              Clinical_study_no: 0,
              Case_reports_no: 0,
              Retracted_Pubs_no: 0,
              TF_Publications_last_year: 5,
              coauthor: false,
              country_match: 'yes',
              aff_match: 'different',
              conditions_met: score,
              conditions_satisfied: `${score} of 8`,
            }));

            const jobId = 'test-job-123';
            const mockResponse: RecommendationsResponse = {
              message: 'Recommendations ready',
              job_id: jobId,
              data: {
                reviewers: reviewers,
                total_count: reviewers.length,
                validation_summary: {
                  total_authors: reviewers.length,
                  authors_validated: reviewers.length,
                  conditions_applied: [],
                  average_conditions_met: score,
                },
              },
            };

            mockApiInstance.get.mockResolvedValue({ data: mockResponse });

            // Act
            const result = await apiService.getRecommendations(jobId);

            // Assert - All reviewers should have the same score
            const returnedReviewers = result.data.reviewers;
            const allScores = returnedReviewers.map(r => r.conditions_met);
            const uniqueScores = new Set(allScores);
            
            expect(uniqueScores.size).toBe(1);
            expect(uniqueScores.has(score)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle single reviewer case', async () => {
      await fc.assert(
        fc.asyncProperty(reviewerArbitrary, async (reviewer) => {
          // Arrange
          const jobId = 'test-job-123';
          const mockResponse: RecommendationsResponse = {
            message: 'Recommendations ready',
            job_id: jobId,
            data: {
              reviewers: [reviewer],
              total_count: 1,
              validation_summary: {
                total_authors: 1,
                authors_validated: 1,
                conditions_applied: [],
                average_conditions_met: reviewer.conditions_met,
              },
            },
          };

          mockApiInstance.get.mockResolvedValue({ data: mockResponse });

          // Act
          const result = await apiService.getRecommendations(jobId);

          // Assert - Single reviewer should be returned as-is
          expect(result.data.reviewers).toHaveLength(1);
          expect(result.data.reviewers[0]).toEqual(reviewer);
        }),
        { numRuns: 100 }
      );
    });
  });
});
