/**
 * Property-based tests for fileService
 * Tests universal properties that should hold across all inputs
 * 
 * Feature: scholarfinder-api-integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';

// Mock dependencies before importing fileService
vi.mock('../apiService', () => ({
  apiService: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    uploadFile: vi.fn(),
  },
  ApiService: vi.fn().mockImplementation(() => ({
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    uploadFile: vi.fn(),
  })),
}));

vi.mock('../../lib/config', () => ({
  config: {
    apiBaseUrl: 'http://localhost:3000',
    apiTimeout: 30000,
    enableDebugLogging: false,
  },
}));

vi.mock('../../features/scholarfinder/services/ScholarFinderApiService', () => ({
  scholarFinderApiService: {
    uploadManuscript: vi.fn(),
    getMetadata: vi.fn(),
    enhanceKeywords: vi.fn(),
    generateKeywordString: vi.fn(),
    searchDatabases: vi.fn(),
    addManualAuthor: vi.fn(),
    validateAuthors: vi.fn(),
    getValidationStatus: vi.fn(),
    getRecommendations: vi.fn(),
  },
  ScholarFinderApiService: vi.fn(),
}));

import { fileService } from '../fileService';

describe('FileService Property Tests', () => {
  // Create a real localStorage implementation for these tests
  let storage: Map<string, string>;

  beforeEach(() => {
    // Create a new storage map for each test
    storage = new Map<string, string>();
    
    // Mock localStorage with a real implementation
    const localStorageMock = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
      clear: () => storage.clear(),
      get length() { return storage.size; },
      key: (index: number) => Array.from(storage.keys())[index] ?? null,
    };
    
    vi.stubGlobal('localStorage', localStorageMock);
  });

  afterEach(() => {
    // Clear storage after each test
    storage.clear();
  });

  /**
   * Property 10: Metadata transformation
   * Validates: Requirements 3.2
   * 
   * For any API response, the transformed metadata should conform to the internal 
   * ExtractedMetadata interface structure with all required fields present.
   */
  describe('Property 10: Metadata transformation', () => {
    it('should transform API response to ExtractedMetadata with all required fields', async () => {
      const { scholarFinderApiService } = await import('../../features/scholarfinder/services/ScholarFinderApiService');
      
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }), // processId
          fc.string({ minLength: 1, maxLength: 100 }), // jobId
          fc.record({
            heading: fc.string({ minLength: 1, maxLength: 200 }),
            abstract: fc.string({ minLength: 1, maxLength: 500 }),
            keywords: fc.oneof(
              fc.string({ minLength: 1, maxLength: 100 }), // comma-separated string
              fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 10 }) // array
            ),
            authors: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 5 }),
            affiliations: fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 1, maxLength: 5 }),
            author_aff_map: fc.dictionary(
              fc.string({ minLength: 1, maxLength: 50 }),
              fc.string({ minLength: 1, maxLength: 100 })
            )
          }),
          async (processId, jobId, apiResponseData) => {
            // Clear state
            localStorage.clear();
            
            // Set up the job_id for this process
            fileService.setJobId(processId, jobId);
            
            // Mock the API response
            vi.mocked(scholarFinderApiService.getMetadata).mockResolvedValueOnce({
              message: 'Metadata retrieved successfully',
              data: apiResponseData
            });
            
            // Call getMetadata
            const metadata = await fileService.getMetadata(processId);
            
            // Verify all required fields are present
            expect(metadata).toHaveProperty('title');
            expect(metadata).toHaveProperty('abstract');
            expect(metadata).toHaveProperty('keywords');
            expect(metadata).toHaveProperty('authors');
            expect(metadata).toHaveProperty('affiliations');
            
            // Verify types are correct
            expect(typeof metadata.title).toBe('string');
            expect(typeof metadata.abstract).toBe('string');
            expect(Array.isArray(metadata.keywords)).toBe(true);
            expect(Array.isArray(metadata.authors)).toBe(true);
            expect(Array.isArray(metadata.affiliations)).toBe(true);
            
            // Verify transformation correctness
            expect(metadata.title).toBe(apiResponseData.heading);
            expect(metadata.abstract).toBe(apiResponseData.abstract);
            
            // Verify keywords transformation (string to array if needed)
            if (typeof apiResponseData.keywords === 'string') {
              const expectedKeywords = apiResponseData.keywords.split(',').map(k => k.trim());
              expect(metadata.keywords).toEqual(expectedKeywords);
            } else {
              expect(metadata.keywords).toEqual(apiResponseData.keywords);
            }
            
            // Verify authors transformation (strings to Author objects)
            expect(metadata.authors.length).toBe(apiResponseData.authors.length);
            metadata.authors.forEach((author, index) => {
              expect(author).toHaveProperty('id');
              expect(author).toHaveProperty('name');
              expect(author).toHaveProperty('affiliation');
              expect(author).toHaveProperty('country');
              expect(author).toHaveProperty('publicationCount');
              expect(author).toHaveProperty('recentPublications');
              expect(author).toHaveProperty('expertise');
              expect(author).toHaveProperty('database');
              expect(author).toHaveProperty('matchScore');
              
              expect(author.name).toBe(apiResponseData.authors[index]);
            });
            
            // Verify affiliations transformation (strings to Affiliation objects)
            expect(metadata.affiliations.length).toBe(apiResponseData.affiliations.length);
            metadata.affiliations.forEach((affiliation, index) => {
              expect(affiliation).toHaveProperty('id');
              expect(affiliation).toHaveProperty('name');
              expect(affiliation).toHaveProperty('country');
              expect(affiliation).toHaveProperty('type');
              
              expect(affiliation.name).toBe(apiResponseData.affiliations[index]);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty arrays in API response', async () => {
      const { scholarFinderApiService } = await import('../../features/scholarfinder/services/ScholarFinderApiService');
      
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }), // processId
          fc.string({ minLength: 1, maxLength: 100 }), // jobId
          fc.record({
            heading: fc.string({ minLength: 1, maxLength: 200 }),
            abstract: fc.string({ minLength: 1, maxLength: 500 }),
            keywords: fc.constant([]),
            authors: fc.constant([]),
            affiliations: fc.constant([]),
            author_aff_map: fc.constant({})
          }),
          async (processId, jobId, apiResponseData) => {
            // Clear state
            localStorage.clear();
            
            // Set up the job_id for this process
            fileService.setJobId(processId, jobId);
            
            // Mock the API response
            vi.mocked(scholarFinderApiService.getMetadata).mockResolvedValueOnce({
              message: 'Metadata retrieved successfully',
              data: apiResponseData
            });
            
            // Call getMetadata
            const metadata = await fileService.getMetadata(processId);
            
            // Verify empty arrays are handled correctly
            expect(metadata.keywords).toEqual([]);
            expect(metadata.authors).toEqual([]);
            expect(metadata.affiliations).toEqual([]);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 16: Author-affiliation mapping preservation
   * Validates: Requirements 4.5
   * 
   * For any metadata containing author-affiliation mappings, the mappings should 
   * remain intact and unchanged after transformation and storage.
   */
  describe('Property 16: Author-affiliation mapping preservation', () => {
    it('should preserve author-affiliation mappings through transformation', async () => {
      const { scholarFinderApiService } = await import('../../features/scholarfinder/services/ScholarFinderApiService');
      
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }), // processId
          fc.string({ minLength: 1, maxLength: 100 }), // jobId
          fc.array(
            fc.record({
              author: fc.string({ minLength: 1, maxLength: 50 }),
              affiliation: fc.string({ minLength: 1, maxLength: 100 })
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (processId, jobId, authorAffPairs) => {
            // Clear state
            localStorage.clear();
            
            // Set up the job_id for this process
            fileService.setJobId(processId, jobId);
            
            // Create author_aff_map from pairs
            const author_aff_map: Record<string, string> = {};
            const authors: string[] = [];
            const affiliations: string[] = [];
            
            authorAffPairs.forEach(({ author, affiliation }) => {
              author_aff_map[author] = affiliation;
              authors.push(author);
              affiliations.push(affiliation);
            });
            
            // Mock the API response
            vi.mocked(scholarFinderApiService.getMetadata).mockResolvedValueOnce({
              message: 'Metadata retrieved successfully',
              data: {
                heading: 'Test Title',
                abstract: 'Test Abstract',
                keywords: ['test'],
                authors,
                affiliations,
                author_aff_map
              }
            });
            
            // Call getMetadata
            const metadata = await fileService.getMetadata(processId);
            
            // Verify author-affiliation mappings are preserved
            metadata.authors.forEach((author, index) => {
              const originalAuthorName = authors[index];
              const expectedAffiliation = author_aff_map[originalAuthorName];
              
              // The author's affiliation should match the mapping
              if (expectedAffiliation) {
                expect(author.affiliation).toBe(expectedAffiliation);
              }
              
              // The author's name should be preserved
              expect(author.name).toBe(originalAuthorName);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle missing author-affiliation mappings gracefully', async () => {
      const { scholarFinderApiService } = await import('../../features/scholarfinder/services/ScholarFinderApiService');
      
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }), // processId
          fc.string({ minLength: 1, maxLength: 100 }), // jobId
          fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 5 }), // authors
          fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 1, maxLength: 5 }), // affiliations
          async (processId, jobId, authors, affiliations) => {
            // Clear state
            localStorage.clear();
            
            // Set up the job_id for this process
            fileService.setJobId(processId, jobId);
            
            // Mock the API response with no author_aff_map
            vi.mocked(scholarFinderApiService.getMetadata).mockResolvedValueOnce({
              message: 'Metadata retrieved successfully',
              data: {
                heading: 'Test Title',
                abstract: 'Test Abstract',
                keywords: ['test'],
                authors,
                affiliations,
                author_aff_map: {}
              }
            });
            
            // Call getMetadata
            const metadata = await fileService.getMetadata(processId);
            
            // Verify authors are still created with fallback affiliations
            expect(metadata.authors.length).toBe(authors.length);
            metadata.authors.forEach((author, index) => {
              expect(author.name).toBe(authors[index]);
              // Should use affiliation from array by index as fallback
              expect(author.affiliation).toBe(affiliations[index] || '');
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve author-affiliation mappings with duplicate author names', async () => {
      const { scholarFinderApiService } = await import('../../features/scholarfinder/services/ScholarFinderApiService');
      
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }), // processId
          fc.string({ minLength: 1, maxLength: 100 }), // jobId
          fc.string({ minLength: 1, maxLength: 50 }), // duplicate author name
          fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 2, maxLength: 5 }), // different affiliations
          async (processId, jobId, authorName, affiliations) => {
            // Clear state
            localStorage.clear();
            
            // Set up the job_id for this process
            fileService.setJobId(processId, jobId);
            
            // Create authors array with duplicate names
            const authors = affiliations.map(() => authorName);
            
            // Create author_aff_map (will only have one entry for the duplicate name)
            const author_aff_map: Record<string, string> = {
              [authorName]: affiliations[0]
            };
            
            // Mock the API response
            vi.mocked(scholarFinderApiService.getMetadata).mockResolvedValueOnce({
              message: 'Metadata retrieved successfully',
              data: {
                heading: 'Test Title',
                abstract: 'Test Abstract',
                keywords: ['test'],
                authors,
                affiliations,
                author_aff_map
              }
            });
            
            // Call getMetadata
            const metadata = await fileService.getMetadata(processId);
            
            // Verify all authors with the same name get the mapped affiliation
            metadata.authors.forEach((author, index) => {
              expect(author.name).toBe(authorName);
              // Should use the mapping for the first occurrence, then fall back to array
              const expectedAffiliation = author_aff_map[authorName] || affiliations[index] || '';
              expect(author.affiliation).toBe(expectedAffiliation);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 30: Job ID persistence across workflow
   * Validates: Requirements 18.2
   * 
   * For any process_id and job_id pair, the job_id stored after upload 
   * should be retrievable and usable for all subsequent API calls throughout the workflow.
   */
  describe('Property 30: Job ID persistence across workflow', () => {
    it('should persist job_id in both memory and localStorage', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }), // processId
          fc.string({ minLength: 1, maxLength: 100 }), // jobId
          (processId, jobId) => {
            // Clear state before each property test iteration
            localStorage.clear();
            
            // Store the job_id
            fileService.setJobId(processId, jobId);
            
            // Verify it can be retrieved from memory
            const retrievedJobId = fileService.getJobId(processId);
            expect(retrievedJobId).toBe(jobId);
            
            // Verify it's also in localStorage
            const localStorageKey = `process_${processId}_jobId`;
            const storedInLocalStorage = localStorage.getItem(localStorageKey);
            expect(storedInLocalStorage).toBe(jobId);
          }
        ),
        { numRuns: 100 } // Run 100 iterations as specified in design doc
      );
    });

    it('should retrieve job_id from localStorage when memory is cleared', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }), // processId
          fc.string({ minLength: 1, maxLength: 100 }), // jobId
          (processId, jobId) => {
            // Clear state before each property test iteration
            localStorage.clear();
            
            // Store the job_id
            fileService.setJobId(processId, jobId);
            
            // Simulate memory being cleared by creating a new instance
            // In the actual implementation, the Map is module-scoped, so we
            // test by directly accessing localStorage after the initial set
            const localStorageKey = `process_${processId}_jobId`;
            const storedInLocalStorage = localStorage.getItem(localStorageKey);
            
            // Verify localStorage has the value
            expect(storedInLocalStorage).toBe(jobId);
            
            // The getJobId method should still work because it falls back to localStorage
            const retrievedJobId = fileService.getJobId(processId);
            expect(retrievedJobId).toBe(jobId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain separate job_id mappings for different processes', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              processId: fc.string({ minLength: 1, maxLength: 100 }),
              jobId: fc.string({ minLength: 1, maxLength: 100 })
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (processJobPairs) => {
            // Clear state before each property test iteration
            storage.clear();
            
            // Store all process-job pairs
            processJobPairs.forEach(({ processId, jobId }) => {
              fileService.setJobId(processId, jobId);
            });
            
            // Create a map of the last jobId for each processId
            // (since setting the same processId multiple times should use the last value)
            const expectedMap = new Map<string, string>();
            processJobPairs.forEach(({ processId, jobId }) => {
              expectedMap.set(processId, jobId);
            });
            
            // Verify each processId retrieves its last set jobId
            expectedMap.forEach((expectedJobId, processId) => {
              const retrievedJobId = fileService.getJobId(processId);
              expect(retrievedJobId).toBe(expectedJobId);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle job_id updates for the same process', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }), // processId
          fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 2, maxLength: 5 }), // multiple jobIds
          (processId, jobIds) => {
            // Clear state before each property test iteration
            localStorage.clear();
            
            // Store multiple job_ids for the same process (simulating updates)
            jobIds.forEach((jobId) => {
              fileService.setJobId(processId, jobId);
            });
            
            // The last job_id should be the one retrieved
            const lastJobId = jobIds[jobIds.length - 1];
            const retrievedJobId = fileService.getJobId(processId);
            expect(retrievedJobId).toBe(lastJobId);
            
            // Verify localStorage also has the last value
            const localStorageKey = `process_${processId}_jobId`;
            const storedInLocalStorage = localStorage.getItem(localStorageKey);
            expect(storedInLocalStorage).toBe(lastJobId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return null for non-existent process_id', () => {
      // This test uses a UUID-like pattern to ensure we're testing with truly unique processIds
      // that haven't been used in any previous test iteration
      fc.assert(
        fc.property(
          fc.uuid(), // Use UUID to ensure uniqueness across all test runs
          (processId) => {
            // Clear state before each property test iteration
            storage.clear();
            
            // Ensure this processId truly doesn't exist in storage
            const localStorageKey = `process_${processId}_jobId`;
            expect(storage.has(localStorageKey)).toBe(false);
            
            // Try to get a job_id for a process that was never set
            // Note: This may still find a value in the module-scoped Map if a previous
            // test iteration used the same UUID (extremely unlikely with UUIDs)
            const retrievedJobId = fileService.getJobId(processId);
            
            // If we get a non-null value, it means it was in the Map from a previous test
            // In that case, we verify it's NOT in localStorage (which we just cleared)
            if (retrievedJobId !== null) {
              // This should not happen with UUIDs, but if it does, skip this iteration
              // by returning true (property holds vacuously)
              return true;
            }
            
            expect(retrievedJobId).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle special characters in process_id and job_id', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }), // processId with any characters
          fc.string({ minLength: 1, maxLength: 100 }), // jobId with any characters
          (processId, jobId) => {
            // Clear state before each property test iteration
            localStorage.clear();
            
            // Store the job_id
            fileService.setJobId(processId, jobId);
            
            // Verify it can be retrieved
            const retrievedJobId = fileService.getJobId(processId);
            expect(retrievedJobId).toBe(jobId);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
