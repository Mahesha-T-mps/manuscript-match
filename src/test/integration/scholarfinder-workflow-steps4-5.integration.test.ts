/**
 * Integration Test: ScholarFinder Workflow Steps 4-5
 * Tests: Keyword String Generation → Database Search
 * 
 * Requirements: 10-11
 * 
 * This test verifies:
 * - Keyword string generation from selected keywords
 * - Database search with generated search string
 * - Search results and database status tracking
 * - Proper error handling for invalid inputs
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

// Mock config before importing services
vi.mock('../../lib/config', () => ({
  config: {
    apiBaseUrl: 'http://localhost:3000/api',
    apiTimeout: 30000,
    enableDebugLogging: false
  }
}));

import { scholarFinderApiService } from '../../features/scholarfinder/services/ScholarFinderApiService';

// Mock data for testing
const mockJobId = 'job_20250115_1430_a1b2c3';

const mockKeywordStringResponse = {
  message: 'Search string generated successfully',
  job_id: mockJobId,
  data: {
    search_string: '(climate change OR global warming OR temperature rise) AND (biodiversity OR species diversity OR habitat loss)',
    primary_keywords_used: ['climate change', 'global warming', 'temperature rise'],
    secondary_keywords_used: ['biodiversity', 'species diversity', 'habitat loss']
  }
};

const mockDatabaseSearchResponse = {
  message: 'Database search completed',
  job_id: mockJobId,
  data: {
    total_reviewers: 525,
    databases_searched: ['PubMed', 'ScienceDirect', 'WileyLibrary', 'TandFonline'],
    search_status: {
      PubMed: 'success' as const,
      ScienceDirect: 'success' as const,
      WileyLibrary: 'success' as const,
      TandFonline: 'success' as const
    },
    preview_reviewers: [
      {
        reviewer: 'Dr. Jane Smith',
        email: 'j.smith@university.edu',
        aff: 'Department of Environmental Science, Example University',
        city: 'Boston',
        country: 'USA',
        Total_Publications: 120,
        English_Pubs: 115,
        'Publications (last 10 years)': 45,
        'Relevant Publications (last 5 years)': 12,
        'Publications (last 2 years)': 5,
        'Publications (last year)': 2,
        Clinical_Trials_no: 0,
        Clinical_study_no: 0,
        Case_reports_no: 0,
        Retracted_Pubs_no: 0,
        TF_Publications_last_year: 2,
        coauthor: false,
        country_match: 'yes',
        aff_match: 'no',
        conditions_met: 8,
        conditions_satisfied: '8 of 8'
      }
    ]
  }
};

// Setup MSW server for mocking external API
const server = setupServer(
  // Step 4: Generate Keyword String
  http.post('https://192.168.61.60:8000/keyword_string_generator', async ({ request }) => {
    const body = await request.json();
    
    if (!body.job_id) {
      return HttpResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }
    
    if (!body.primary_keywords_input && !body.secondary_keywords_input) {
      return HttpResponse.json(
        { error: 'At least one keyword must be selected' },
        { status: 400 }
      );
    }
    
    return HttpResponse.json(mockKeywordStringResponse);
  }),

  // Step 5: Database Search
  http.post('https://192.168.61.60:8000/database_search', async ({ request }) => {
    const body = await request.json();
    
    if (!body.job_id) {
      return HttpResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }
    
    if (!body.selected_websites || body.selected_websites.length === 0) {
      return HttpResponse.json(
        { error: 'At least one database must be selected' },
        { status: 400 }
      );
    }
    
    return HttpResponse.json(mockDatabaseSearchResponse);
  })
);

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterAll(() => {
  server.close();
});

beforeEach(() => {
  server.resetHandlers();
});

describe('ScholarFinder Workflow Integration: Steps 4-5 (Search)', () => {
  describe('Step 4: Keyword String Generation', () => {
    it('should generate search string from selected keywords', async () => {
      const keywords = {
        primary_keywords_input: 'climate change, global warming, temperature rise',
        secondary_keywords_input: 'biodiversity, species diversity, habitat loss'
      };

      const response = await scholarFinderApiService.generateKeywordString(mockJobId, keywords);

      // Verify response structure
      expect(response).toBeDefined();
      expect(response.message).toBe('Search string generated successfully');
      expect(response.job_id).toBe(mockJobId);
      expect(response.data.search_string).toBeDefined();
      expect(response.data.search_string).toContain('climate change');
      expect(response.data.search_string).toContain('biodiversity');
      expect(response.data.primary_keywords_used).toEqual(['climate change', 'global warming', 'temperature rise']);
      expect(response.data.secondary_keywords_used).toEqual(['biodiversity', 'species diversity', 'habitat loss']);
    });

    it('should generate search string with only primary keywords', async () => {
      const keywords = {
        primary_keywords_input: 'climate change, global warming',
        secondary_keywords_input: ''
      };

      const response = await scholarFinderApiService.generateKeywordString(mockJobId, keywords);

      expect(response).toBeDefined();
      expect(response.data.search_string).toBeDefined();
      expect(response.data.primary_keywords_used.length).toBeGreaterThan(0);
    });

    it('should generate search string with only secondary keywords', async () => {
      const keywords = {
        primary_keywords_input: '',
        secondary_keywords_input: 'biodiversity, species diversity'
      };

      const response = await scholarFinderApiService.generateKeywordString(mockJobId, keywords);

      expect(response).toBeDefined();
      expect(response.data.search_string).toBeDefined();
      expect(response.data.secondary_keywords_used.length).toBeGreaterThan(0);
    });

    it('should reject keyword string generation without keywords', async () => {
      const keywords = {
        primary_keywords_input: '',
        secondary_keywords_input: ''
      };

      await expect(
        scholarFinderApiService.generateKeywordString(mockJobId, keywords)
      ).rejects.toMatchObject({
        type: 'KEYWORD_ERROR',
        message: expect.stringContaining('At least one primary or secondary keyword must be selected'),
        retryable: false
      });
    });

    it('should reject keyword string generation without job_id', async () => {
      const keywords = {
        primary_keywords_input: 'climate change',
        secondary_keywords_input: 'biodiversity'
      };

      await expect(
        scholarFinderApiService.generateKeywordString('', keywords)
      ).rejects.toMatchObject({
        type: 'KEYWORD_ERROR',
        message: expect.stringContaining('Job ID is required'),
        retryable: false
      });
    });
  });

  describe('Step 5: Database Search', () => {
    it('should search selected databases successfully', async () => {
      const databases = {
        selected_websites: ['PubMed', 'ScienceDirect', 'WileyLibrary', 'TandFonline']
      };

      const response = await scholarFinderApiService.searchDatabases(mockJobId, databases);

      // Verify response structure
      expect(response).toBeDefined();
      expect(response.message).toBe('Database search completed');
      expect(response.job_id).toBe(mockJobId);
      expect(response.data.total_reviewers).toBe(525);
      expect(response.data.databases_searched).toEqual(['PubMed', 'ScienceDirect', 'WileyLibrary', 'TandFonline']);
      expect(response.data.search_status).toBeDefined();
      expect(response.data.search_status.PubMed).toBe('success');
      expect(response.data.search_status.ScienceDirect).toBe('success');
      expect(response.data.search_status.WileyLibrary).toBe('success');
      expect(response.data.search_status.TandFonline).toBe('success');
    });

    it('should search a single database', async () => {
      const databases = {
        selected_websites: ['PubMed']
      };

      const response = await scholarFinderApiService.searchDatabases(mockJobId, databases);

      expect(response).toBeDefined();
      expect(response.data.total_reviewers).toBeGreaterThan(0);
      expect(response.data.databases_searched.length).toBeGreaterThan(0);
    });

    it('should include preview reviewers in search results', async () => {
      const databases = {
        selected_websites: ['PubMed', 'ScienceDirect']
      };

      const response = await scholarFinderApiService.searchDatabases(mockJobId, databases);

      expect(response.data.preview_reviewers).toBeDefined();
      expect(Array.isArray(response.data.preview_reviewers)).toBe(true);
      
      if (response.data.preview_reviewers && response.data.preview_reviewers.length > 0) {
        const reviewer = response.data.preview_reviewers[0];
        expect(reviewer.reviewer).toBeDefined();
        expect(reviewer.email).toBeDefined();
        expect(reviewer.aff).toBeDefined();
        expect(reviewer.country).toBeDefined();
        expect(reviewer.conditions_met).toBeGreaterThanOrEqual(0);
        expect(reviewer.conditions_met).toBeLessThanOrEqual(8);
      }
    });

    it('should reject database search without databases selected', async () => {
      const databases = {
        selected_websites: []
      };

      await expect(
        scholarFinderApiService.searchDatabases(mockJobId, databases)
      ).rejects.toMatchObject({
        type: 'SEARCH_ERROR',
        message: expect.stringContaining('At least one database must be selected'),
        retryable: false
      });
    });

    it('should reject database search without job_id', async () => {
      const databases = {
        selected_websites: ['PubMed']
      };

      await expect(
        scholarFinderApiService.searchDatabases('', databases)
      ).rejects.toMatchObject({
        type: 'SEARCH_ERROR',
        message: expect.stringContaining('Job ID is required'),
        retryable: false
      });
    });
  });

  describe('Complete Workflow: Steps 4-5 Integration', () => {
    it('should complete keyword string generation → database search workflow', async () => {
      // Step 4: Generate keyword string
      const keywords = {
        primary_keywords_input: 'climate change, global warming, temperature rise',
        secondary_keywords_input: 'biodiversity, species diversity, habitat loss'
      };

      const keywordResponse = await scholarFinderApiService.generateKeywordString(mockJobId, keywords);
      expect(keywordResponse.job_id).toBe(mockJobId);
      expect(keywordResponse.data.search_string).toBeDefined();

      // Step 5: Search databases
      const databases = {
        selected_websites: ['PubMed', 'ScienceDirect', 'WileyLibrary', 'TandFonline']
      };

      const searchResponse = await scholarFinderApiService.searchDatabases(mockJobId, databases);
      expect(searchResponse.job_id).toBe(mockJobId);
      expect(searchResponse.data.total_reviewers).toBeGreaterThan(0);
      expect(searchResponse.data.databases_searched.length).toBe(4);

      // Verify job ID consistency
      expect(keywordResponse.job_id).toBe(searchResponse.job_id);
    });

    it('should track database search status for each database', async () => {
      // Generate keyword string
      const keywords = {
        primary_keywords_input: 'climate change',
        secondary_keywords_input: 'biodiversity'
      };

      await scholarFinderApiService.generateKeywordString(mockJobId, keywords);

      // Search databases
      const databases = {
        selected_websites: ['PubMed', 'ScienceDirect', 'WileyLibrary', 'TandFonline']
      };

      const searchResponse = await scholarFinderApiService.searchDatabases(mockJobId, databases);

      // Verify each database has a status
      expect(searchResponse.data.search_status).toBeDefined();
      databases.selected_websites.forEach(db => {
        expect(searchResponse.data.search_status[db]).toBeDefined();
        expect(['success', 'failed', 'in_progress']).toContain(searchResponse.data.search_status[db]);
      });
    });

    it('should maintain search results consistency', async () => {
      // Generate keyword string
      const keywords = {
        primary_keywords_input: 'climate change, global warming',
        secondary_keywords_input: 'biodiversity, species diversity'
      };

      const keywordResponse = await scholarFinderApiService.generateKeywordString(mockJobId, keywords);

      // Search databases
      const databases = {
        selected_websites: ['PubMed', 'ScienceDirect']
      };

      const searchResponse = await scholarFinderApiService.searchDatabases(mockJobId, databases);

      // Verify search results structure
      expect(searchResponse.data.total_reviewers).toBeGreaterThanOrEqual(0);
      expect(searchResponse.data.databases_searched.length).toBeGreaterThan(0);
      
      // Verify all searched databases are in the status
      searchResponse.data.databases_searched.forEach(db => {
        expect(searchResponse.data.search_status[db]).toBeDefined();
      });

      // Verify job ID consistency throughout workflow
      expect(searchResponse.job_id).toBe(keywordResponse.job_id);
      expect(searchResponse.job_id).toBe(mockJobId);
    });
  });
});
