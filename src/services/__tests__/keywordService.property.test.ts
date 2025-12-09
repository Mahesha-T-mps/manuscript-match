/**
 * Property-based tests for keyword enhancement
 * Feature: scholarfinder-api-integration, Property 21: Keyword enhancement API call
 * Validates: Requirements 9.2
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { keywordService } from '../keywordService';
import { fileService } from '../fileService';

// Mock fileService
vi.mock('../fileService', () => ({
  fileService: {
    enhanceKeywords: vi.fn(),
    getJobId: vi.fn(),
    generateKeywordString: vi.fn(),
  },
}));

// Create a proper localStorage implementation for tests
class LocalStorageMock {
  private store: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.store.get(key) || null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get length(): number {
    return this.store.size;
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] || null;
  }
}

describe('Property 21: Keyword enhancement API call', () => {
  let localStorageMock: LocalStorageMock;

  beforeEach(() => {
    vi.clearAllMocks();
    // Create a fresh localStorage mock for each test
    localStorageMock = new LocalStorageMock();
    global.localStorage = localStorageMock as any;
  });

  /**
   * Property 21: Keyword enhancement API call
   * For any valid job_id, calling the keyword enhancement API should return enhanced keywords 
   * including MeSH terms, broader terms, primary focus, and secondary focus keywords.
   */
  it('should return enhanced keywords with all required fields for any valid job_id', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random job_id
        fc.string({ minLength: 10, maxLength: 50 }),
        // Generate random process_id
        fc.string({ minLength: 5, maxLength: 20 }),
        // Generate random keyword arrays
        fc.array(fc.string({ minLength: 3, maxLength: 20 }), { minLength: 1, maxLength: 10 }),
        fc.array(fc.string({ minLength: 3, maxLength: 20 }), { minLength: 1, maxLength: 10 }),
        fc.array(fc.string({ minLength: 3, maxLength: 20 }), { minLength: 0, maxLength: 10 }),
        fc.array(fc.string({ minLength: 3, maxLength: 20 }), { minLength: 0, maxLength: 10 }),
        fc.array(fc.string({ minLength: 3, maxLength: 20 }), { minLength: 1, maxLength: 10 }),
        fc.array(fc.string({ minLength: 3, maxLength: 20 }), { minLength: 1, maxLength: 10 }),
        async (
          jobId,
          processId,
          meshTerms,
          broaderTerms,
          additionalPrimary,
          additionalSecondary,
          allPrimaryFocus,
          allSecondaryFocus
        ) => {
          // Setup: Mock the API response
          const mockApiResponse = {
            mesh_terms: meshTerms,
            broader_terms: broaderTerms,
            primary_focus: allPrimaryFocus.slice(0, Math.ceil(allPrimaryFocus.length / 2)),
            secondary_focus: allSecondaryFocus.slice(0, Math.ceil(allSecondaryFocus.length / 2)),
            additional_primary_keywords: additionalPrimary,
            additional_secondary_keywords: additionalSecondary,
            all_primary_focus_list: allPrimaryFocus,
            all_secondary_focus_list: allSecondaryFocus,
          };

          vi.mocked(fileService.getJobId).mockReturnValue(jobId);
          vi.mocked(fileService.enhanceKeywords).mockResolvedValue(mockApiResponse);

          // Execute: Call the keyword enhancement
          const result = await keywordService.enhanceKeywords(processId);

          // Verify: Result should contain all required fields
          expect(result).toBeDefined();
          expect(result).toHaveProperty('meshTerms');
          expect(result).toHaveProperty('broaderTerms');
          expect(result).toHaveProperty('primaryFocus');
          expect(result).toHaveProperty('secondaryFocus');
          expect(result).toHaveProperty('original');
          expect(result).toHaveProperty('enhanced');

          // Verify: All fields should be arrays
          expect(Array.isArray(result.meshTerms)).toBe(true);
          expect(Array.isArray(result.broaderTerms)).toBe(true);
          expect(Array.isArray(result.primaryFocus)).toBe(true);
          expect(Array.isArray(result.secondaryFocus)).toBe(true);
          expect(Array.isArray(result.original)).toBe(true);
          expect(Array.isArray(result.enhanced)).toBe(true);

          // Verify: MeSH terms should match the API response
          expect(result.meshTerms).toEqual(meshTerms);
          expect(result.broaderTerms).toEqual(broaderTerms);
          expect(result.primaryFocus).toEqual(allPrimaryFocus);
          expect(result.secondaryFocus).toEqual(allSecondaryFocus);
        }
      ),
      { numRuns: 100 } // Run 100 iterations as specified in design
    );
  });

  it('should transform API response correctly for any valid keyword data', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate non-whitespace process IDs
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        // Generate non-whitespace keywords
        fc.array(
          fc.string({ minLength: 3, maxLength: 20 }).filter(s => s.trim().length > 0),
          { minLength: 1, maxLength: 5 }
        ),
        fc.array(
          fc.string({ minLength: 3, maxLength: 20 }).filter(s => s.trim().length > 0),
          { minLength: 1, maxLength: 5 }
        ),
        async (processId, primaryKeywords, secondaryKeywords) => {
          // Setup: Mock the API response
          const mockApiResponse = {
            mesh_terms: primaryKeywords,
            broader_terms: secondaryKeywords,
            primary_focus: primaryKeywords.slice(0, 2),
            secondary_focus: secondaryKeywords.slice(0, 2),
            additional_primary_keywords: primaryKeywords.slice(2),
            additional_secondary_keywords: secondaryKeywords.slice(2),
            all_primary_focus_list: primaryKeywords,
            all_secondary_focus_list: secondaryKeywords,
          };

          vi.mocked(fileService.getJobId).mockReturnValue('test-job-id');
          vi.mocked(fileService.enhanceKeywords).mockResolvedValue(mockApiResponse);

          // Execute: Enhance keywords
          const result = await keywordService.enhanceKeywords(processId);

          // Verify: Transformation is correct
          expect(result.meshTerms).toEqual(primaryKeywords);
          expect(result.broaderTerms).toEqual(secondaryKeywords);
          expect(result.primaryFocus).toEqual(primaryKeywords);
          expect(result.secondaryFocus).toEqual(secondaryKeywords);
          expect(result.original).toEqual(primaryKeywords.slice(0, 2));
          expect(result.enhanced).toEqual(primaryKeywords.slice(2));
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should retrieve and transform cached keywords for any process_id that has been enhanced', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate non-whitespace process IDs
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        // Generate non-whitespace keywords
        fc.array(
          fc.string({ minLength: 3, maxLength: 20 }).filter(s => s.trim().length > 0),
          { minLength: 1, maxLength: 5 }
        ),
        async (processId, keywords) => {
          // Setup: Store raw API response format in localStorage (as fileService would)
          const mockData = {
            mesh_terms: keywords,
            broader_terms: keywords,
            primary_focus: keywords,
            secondary_focus: keywords,
            additional_primary_keywords: keywords,
            additional_secondary_keywords: keywords,
            all_primary_focus_list: keywords,
            all_secondary_focus_list: keywords,
          };

          const cachedKey = `process_${processId}_keywords`;
          localStorage.setItem(cachedKey, JSON.stringify(mockData));

          // Execute: Get keywords (this should transform the cached data)
          const result = await keywordService.getKeywords(processId);

          // Verify: Result should be the raw cached data (getKeywords returns it as-is)
          expect(result).toBeDefined();
          expect(result).toEqual(mockData);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should throw error when getting keywords for process_id without enhancement', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 20 }),
        async (processId) => {
          // Ensure no cached data exists
          localStorage.clear();

          // Execute & Verify: Should throw error
          await expect(keywordService.getKeywords(processId)).rejects.toThrow(
            'Keywords have not been enhanced yet'
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle empty keyword arrays gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 20 }),
        async (processId) => {
          // Setup: Mock API response with empty arrays
          const mockApiResponse = {
            mesh_terms: [],
            broader_terms: [],
            primary_focus: [],
            secondary_focus: [],
            additional_primary_keywords: [],
            additional_secondary_keywords: [],
            all_primary_focus_list: [],
            all_secondary_focus_list: [],
          };

          vi.mocked(fileService.getJobId).mockReturnValue('test-job-id');
          vi.mocked(fileService.enhanceKeywords).mockResolvedValue(mockApiResponse);

          // Execute: Enhance keywords
          const result = await keywordService.enhanceKeywords(processId);

          // Verify: Should return valid structure with empty arrays
          expect(result).toBeDefined();
          expect(result.meshTerms).toEqual([]);
          expect(result.broaderTerms).toEqual([]);
          expect(result.primaryFocus).toEqual([]);
          expect(result.secondaryFocus).toEqual([]);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 22: Search string generation
 * Feature: scholarfinder-api-integration, Property 22: Search string generation
 * Validates: Requirements 10.3
 */
describe('Property 22: Search string generation', () => {
  let localStorageMock: LocalStorageMock;

  beforeEach(() => {
    vi.clearAllMocks();
    // Create a fresh localStorage mock for each test
    localStorageMock = new LocalStorageMock();
    global.localStorage = localStorageMock as any;
  });

  /**
   * Property 22: Search string generation
   * For any set of selected primary and secondary keywords, the keyword string generator 
   * should return a formatted Boolean query string.
   */
  it('should return a formatted Boolean query string for any set of primary and secondary keywords', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random process_id
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        // Generate random primary keywords (at least 1)
        fc.array(
          fc.string({ minLength: 3, maxLength: 20 }).filter(s => s.trim().length > 0),
          { minLength: 1, maxLength: 5 }
        ),
        // Generate random secondary keywords (at least 1)
        fc.array(
          fc.string({ minLength: 3, maxLength: 20 }).filter(s => s.trim().length > 0),
          { minLength: 1, maxLength: 5 }
        ),
        async (processId, primaryKeywords, secondaryKeywords) => {
          // Setup: Mock the API response
          const mockSearchString = `(${primaryKeywords.join(' OR ')}) AND (${secondaryKeywords.join(' OR ')})`;
          const mockApiResponse = {
            search_string: mockSearchString,
            primary_keywords_used: primaryKeywords,
            secondary_keywords_used: secondaryKeywords,
          };

          vi.mocked(fileService.getJobId).mockReturnValue('test-job-id');
          vi.mocked(fileService.generateKeywordString).mockResolvedValue(mockApiResponse);

          // Execute: Generate search string
          const result = await keywordService.generateSearchString(
            processId,
            primaryKeywords,
            secondaryKeywords
          );

          // Verify: Result should contain all required fields
          expect(result).toBeDefined();
          expect(result).toHaveProperty('search_string');
          expect(result).toHaveProperty('primary_keywords_used');
          expect(result).toHaveProperty('secondary_keywords_used');

          // Verify: search_string should be a non-empty string
          expect(typeof result.search_string).toBe('string');
          expect(result.search_string.length).toBeGreaterThan(0);

          // Verify: Keywords used should match input
          expect(result.primary_keywords_used).toEqual(primaryKeywords);
          expect(result.secondary_keywords_used).toEqual(secondaryKeywords);

          // Verify: Search string should contain the keywords
          primaryKeywords.forEach(keyword => {
            expect(result.search_string).toContain(keyword);
          });
          secondaryKeywords.forEach(keyword => {
            expect(result.search_string).toContain(keyword);
          });
        }
      ),
      { numRuns: 100 } // Run 100 iterations as specified in design
    );
  });

  it('should handle primary keywords only', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.array(
          fc.string({ minLength: 3, maxLength: 20 }).filter(s => s.trim().length > 0),
          { minLength: 1, maxLength: 5 }
        ),
        async (processId, primaryKeywords) => {
          // Setup: Mock the API response with only primary keywords
          const mockSearchString = `(${primaryKeywords.join(' OR ')})`;
          const mockApiResponse = {
            search_string: mockSearchString,
            primary_keywords_used: primaryKeywords,
            secondary_keywords_used: [],
          };

          vi.mocked(fileService.getJobId).mockReturnValue('test-job-id');
          vi.mocked(fileService.generateKeywordString).mockResolvedValue(mockApiResponse);

          // Execute: Generate search string with only primary keywords
          const result = await keywordService.generateSearchString(
            processId,
            primaryKeywords,
            []
          );

          // Verify: Result should be valid
          expect(result).toBeDefined();
          expect(result.search_string.length).toBeGreaterThan(0);
          expect(result.primary_keywords_used).toEqual(primaryKeywords);
          expect(result.secondary_keywords_used).toEqual([]);

          // Verify: All primary keywords should be in the search string
          primaryKeywords.forEach(keyword => {
            expect(result.search_string).toContain(keyword);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle secondary keywords only', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.array(
          fc.string({ minLength: 3, maxLength: 20 }).filter(s => s.trim().length > 0),
          { minLength: 1, maxLength: 5 }
        ),
        async (processId, secondaryKeywords) => {
          // Setup: Mock the API response with only secondary keywords
          const mockSearchString = `(${secondaryKeywords.join(' OR ')})`;
          const mockApiResponse = {
            search_string: mockSearchString,
            primary_keywords_used: [],
            secondary_keywords_used: secondaryKeywords,
          };

          vi.mocked(fileService.getJobId).mockReturnValue('test-job-id');
          vi.mocked(fileService.generateKeywordString).mockResolvedValue(mockApiResponse);

          // Execute: Generate search string with only secondary keywords
          const result = await keywordService.generateSearchString(
            processId,
            [],
            secondaryKeywords
          );

          // Verify: Result should be valid
          expect(result).toBeDefined();
          expect(result.search_string.length).toBeGreaterThan(0);
          expect(result.primary_keywords_used).toEqual([]);
          expect(result.secondary_keywords_used).toEqual(secondaryKeywords);

          // Verify: All secondary keywords should be in the search string
          secondaryKeywords.forEach(keyword => {
            expect(result.search_string).toContain(keyword);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve keyword order in the response', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.array(
          fc.string({ minLength: 3, maxLength: 20 }).filter(s => s.trim().length > 0),
          { minLength: 2, maxLength: 5 }
        ),
        fc.array(
          fc.string({ minLength: 3, maxLength: 20 }).filter(s => s.trim().length > 0),
          { minLength: 2, maxLength: 5 }
        ),
        async (processId, primaryKeywords, secondaryKeywords) => {
          // Setup: Mock the API response
          const mockSearchString = `(${primaryKeywords.join(' OR ')}) AND (${secondaryKeywords.join(' OR ')})`;
          const mockApiResponse = {
            search_string: mockSearchString,
            primary_keywords_used: primaryKeywords,
            secondary_keywords_used: secondaryKeywords,
          };

          vi.mocked(fileService.getJobId).mockReturnValue('test-job-id');
          vi.mocked(fileService.generateKeywordString).mockResolvedValue(mockApiResponse);

          // Execute: Generate search string
          const result = await keywordService.generateSearchString(
            processId,
            primaryKeywords,
            secondaryKeywords
          );

          // Verify: Keywords order should be preserved
          expect(result.primary_keywords_used).toEqual(primaryKeywords);
          expect(result.secondary_keywords_used).toEqual(secondaryKeywords);

          // Verify: The order should match the input exactly
          for (let i = 0; i < primaryKeywords.length; i++) {
            expect(result.primary_keywords_used[i]).toBe(primaryKeywords[i]);
          }
          for (let i = 0; i < secondaryKeywords.length; i++) {
            expect(result.secondary_keywords_used[i]).toBe(secondaryKeywords[i]);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
