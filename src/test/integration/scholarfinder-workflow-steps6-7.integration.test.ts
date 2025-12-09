/**
 * Integration Test: ScholarFinder Workflow Steps 6-7
 * Tests: Manual Author Addition → Validation
 * 
 * Requirements: 12-13
 * 
 * This test verifies:
 * - Manual author search and addition
 * - Author validation initiation
 * - Validation progress polling
 * - Validation scores and criteria
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse, delay } from 'msw';

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

const mockManualAuthorResponse = {
  message: 'Authors found',
  job_id: mockJobId,
  data: {
    found_authors: [
      {
        name: 'Dr. Michael Chen',
        email: 'm.chen@university.edu',
        affiliation: 'Department of Biology, Example University',
        country: 'USA',
        publications: 45
      },
      {
        name: 'Michael Chen',
        email: 'chen.m@research.org',
        affiliation: 'Research Institute of Environmental Science',
        country: 'Canada',
        publications: 32
      }
    ],
    search_term: 'Dr. Michael Chen',
    total_found: 2
  }
};

const mockValidationInitiateResponse = {
  message: 'Validation in progress',
  job_id: mockJobId,
  data: {
    validation_status: 'in_progress' as const,
    progress_percentage: 0,
    estimated_completion_time: '5 minutes',
    total_authors_processed: 0,
    validation_criteria: [
      'Publications (last 10 years) ≥ 8',
      'Relevant Publications (last 5 years) ≥ 3',
      'Publications (last 2 years) ≥ 1',
      'English Publications > 50%',
      'No Coauthorship',
      'Different Affiliation',
      'Same Country',
      'No Retracted Publications'
    ]
  }
};

const mockValidationProgressResponse = {
  message: 'Validation in progress',
  job_id: mockJobId,
  data: {
    validation_status: 'in_progress' as const,
    progress_percentage: 45,
    estimated_completion_time: '2 minutes',
    total_authors_processed: 68,
    validation_criteria: [
      'Publications (last 10 years) ≥ 8',
      'Relevant Publications (last 5 years) ≥ 3',
      'Publications (last 2 years) ≥ 1',
      'English Publications > 50%',
      'No Coauthorship',
      'Different Affiliation',
      'Same Country',
      'No Retracted Publications'
    ]
  }
};

const mockValidationCompletedResponse = {
  message: 'Validation completed',
  job_id: mockJobId,
  data: {
    validation_status: 'completed' as const,
    progress_percentage: 100,
    total_authors_processed: 150,
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
      total_authors: 150,
      authors_validated: 150,
      conditions_applied: [
        'Publications (last 10 years) ≥ 8',
        'Relevant Publications (last 5 years) ≥ 3',
        'Publications (last 2 years) ≥ 1',
        'English Publications > 50%',
        'No Coauthorship',
        'Different Affiliation',
        'Same Country',
        'No Retracted Publications'
      ],
      average_conditions_met: 6.2
    }
  }
};

// Setup MSW server for mocking external API
const server = setupServer(
  // Step 6: Manual Author Addition
  http.post('https://192.168.61.60:8000/manual_authors', async ({ request }) => {
    const body = await request.json();
    
    if (!body.job_id) {
      return HttpResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }
    
    if (!body.author_name || body.author_name.trim().length < 2) {
      return HttpResponse.json(
        { error: 'Author name must be at least 2 characters' },
        { status: 400 }
      );
    }
    
    // Simulate no results for specific search
    if (body.author_name === 'NonExistentAuthor') {
      return HttpResponse.json({
        message: 'No authors found',
        job_id: mockJobId,
        data: {
          found_authors: [],
          search_term: body.author_name,
          total_found: 0
        }
      });
    }
    
    return HttpResponse.json(mockManualAuthorResponse);
  }),

  // Step 7: Validate Authors (Initiate)
  http.post('https://192.168.61.60:8000/validate_authors', async ({ request }) => {
    const body = await request.json();
    
    if (!body.job_id) {
      return HttpResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }
    
    return HttpResponse.json(mockValidationInitiateResponse);
  }),

  // Step 7b: Get Validation Status (Polling)
  http.get('https://192.168.61.60:8000/validation_status/:jobId', ({ params }) => {
    const { jobId } = params;
    
    if (jobId !== mockJobId) {
      return HttpResponse.json(
        { error: 'Invalid job ID' },
        { status: 404 }
      );
    }
    
    // Return progress response by default
    return HttpResponse.json(mockValidationProgressResponse);
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

describe('ScholarFinder Workflow Integration: Steps 6-7 (Validation)', () => {
  describe('Step 6: Manual Author Addition', () => {
    it('should search for manual author by name', async () => {
      const authorName = 'Dr. Michael Chen';

      const response = await scholarFinderApiService.addManualAuthor(mockJobId, authorName);

      // Verify response structure
      expect(response).toBeDefined();
      expect(response.message).toBe('Authors found');
      expect(response.job_id).toBe(mockJobId);
      expect(response.data.found_authors).toBeDefined();
      expect(response.data.found_authors.length).toBe(2);
      expect(response.data.search_term).toBe(authorName);
      expect(response.data.total_found).toBe(2);
    });

    it('should return author details in search results', async () => {
      const authorName = 'Dr. Michael Chen';

      const response = await scholarFinderApiService.addManualAuthor(mockJobId, authorName);

      const author = response.data.found_authors[0];
      expect(author.name).toBeDefined();
      expect(author.email).toBeDefined();
      expect(author.affiliation).toBeDefined();
      expect(author.country).toBeDefined();
      expect(author.publications).toBeDefined();
      expect(typeof author.publications).toBe('number');
    });

    it('should handle no results found', async () => {
      const authorName = 'NonExistentAuthor';

      const response = await scholarFinderApiService.addManualAuthor(mockJobId, authorName);

      expect(response.data.found_authors).toEqual([]);
      expect(response.data.total_found).toBe(0);
    });

    it('should reject author search with name less than 2 characters', async () => {
      const authorName = 'A';

      await expect(
        scholarFinderApiService.addManualAuthor(mockJobId, authorName)
      ).rejects.toMatchObject({
        type: 'SEARCH_ERROR',
        message: expect.stringContaining('Author name must be at least 2 characters'),
        retryable: false
      });
    });

    it('should reject author search without job_id', async () => {
      const authorName = 'Dr. Michael Chen';

      await expect(
        scholarFinderApiService.addManualAuthor('', authorName)
      ).rejects.toMatchObject({
        type: 'SEARCH_ERROR',
        message: expect.stringContaining('Job ID is required'),
        retryable: false
      });
    });

    it('should trim whitespace from author name', async () => {
      const authorName = '  Dr. Michael Chen  ';

      const response = await scholarFinderApiService.addManualAuthor(mockJobId, authorName);

      expect(response).toBeDefined();
      expect(response.data.found_authors.length).toBeGreaterThan(0);
    });
  });

  describe('Step 7: Author Validation', () => {
    it('should initiate author validation', async () => {
      const response = await scholarFinderApiService.validateAuthors(mockJobId);

      // Verify response structure
      expect(response).toBeDefined();
      expect(response.message).toBe('Validation in progress');
      expect(response.job_id).toBe(mockJobId);
      expect(response.data.validation_status).toBe('in_progress');
      expect(response.data.progress_percentage).toBe(0);
      expect(response.data.estimated_completion_time).toBeDefined();
      expect(response.data.total_authors_processed).toBe(0);
      expect(response.data.validation_criteria).toBeDefined();
      expect(response.data.validation_criteria.length).toBe(8);
    });

    it('should include all 8 validation criteria', async () => {
      const response = await scholarFinderApiService.validateAuthors(mockJobId);

      const expectedCriteria = [
        'Publications (last 10 years) ≥ 8',
        'Relevant Publications (last 5 years) ≥ 3',
        'Publications (last 2 years) ≥ 1',
        'English Publications > 50%',
        'No Coauthorship',
        'Different Affiliation',
        'Same Country',
        'No Retracted Publications'
      ];

      expect(response.data.validation_criteria).toEqual(expectedCriteria);
    });

    it('should reject validation without job_id', async () => {
      await expect(
        scholarFinderApiService.validateAuthors('')
      ).rejects.toMatchObject({
        type: 'VALIDATION_ERROR',
        message: expect.stringContaining('Job ID is required'),
        retryable: false
      });
    });
  });

  describe('Step 7b: Validation Progress Polling', () => {
    it('should retrieve validation progress', async () => {
      const response = await scholarFinderApiService.getValidationStatus(mockJobId);

      // Verify response structure
      expect(response).toBeDefined();
      expect(response.job_id).toBe(mockJobId);
      expect(response.data.validation_status).toBe('in_progress');
      expect(response.data.progress_percentage).toBe(45);
      expect(response.data.estimated_completion_time).toBe('2 minutes');
      expect(response.data.total_authors_processed).toBe(68);
    });

    it('should track progress percentage', async () => {
      const response = await scholarFinderApiService.getValidationStatus(mockJobId);

      expect(response.data.progress_percentage).toBeGreaterThanOrEqual(0);
      expect(response.data.progress_percentage).toBeLessThanOrEqual(100);
    });

    it('should reject validation status check without job_id', async () => {
      await expect(
        scholarFinderApiService.getValidationStatus('')
      ).rejects.toMatchObject({
        type: 'VALIDATION_ERROR',
        message: expect.stringContaining('Job ID is required'),
        retryable: false
      });
    });
  });

  describe('Validation Completion', () => {
    it('should handle validation completion', async () => {
      // Override the validation status endpoint to return completed status
      server.use(
        http.get('https://192.168.61.60:8000/validation_status/:jobId', () => {
          return HttpResponse.json(mockValidationCompletedResponse);
        })
      );

      const response = await scholarFinderApiService.getValidationStatus(mockJobId);

      expect(response.data.validation_status).toBe('completed');
      expect(response.data.progress_percentage).toBe(100);
      expect(response.data.summary).toBeDefined();
      expect(response.data.summary?.total_authors).toBe(150);
      expect(response.data.summary?.authors_validated).toBe(150);
      expect(response.data.summary?.average_conditions_met).toBe(6.2);
    });

    it('should include validation summary on completion', async () => {
      // Override the validation status endpoint to return completed status
      server.use(
        http.get('https://192.168.61.60:8000/validation_status/:jobId', () => {
          return HttpResponse.json(mockValidationCompletedResponse);
        })
      );

      const response = await scholarFinderApiService.getValidationStatus(mockJobId);

      expect(response.data.summary).toBeDefined();
      expect(response.data.summary?.total_authors).toBeGreaterThan(0);
      expect(response.data.summary?.authors_validated).toBeGreaterThan(0);
      expect(response.data.summary?.conditions_applied.length).toBe(8);
      expect(response.data.summary?.average_conditions_met).toBeGreaterThanOrEqual(0);
      expect(response.data.summary?.average_conditions_met).toBeLessThanOrEqual(8);
    });
  });

  describe('Complete Workflow: Steps 6-7 Integration', () => {
    it('should complete manual author addition → validation workflow', async () => {
      // Step 6: Add manual author
      const authorName = 'Dr. Michael Chen';
      const authorResponse = await scholarFinderApiService.addManualAuthor(mockJobId, authorName);
      expect(authorResponse.job_id).toBe(mockJobId);
      expect(authorResponse.data.found_authors.length).toBeGreaterThan(0);

      // Step 7: Initiate validation
      const validationResponse = await scholarFinderApiService.validateAuthors(mockJobId);
      expect(validationResponse.job_id).toBe(mockJobId);
      expect(validationResponse.data.validation_status).toBe('in_progress');

      // Step 7b: Check validation progress
      const progressResponse = await scholarFinderApiService.getValidationStatus(mockJobId);
      expect(progressResponse.job_id).toBe(mockJobId);
      expect(progressResponse.data.progress_percentage).toBeGreaterThanOrEqual(0);

      // Verify job ID consistency
      expect(authorResponse.job_id).toBe(validationResponse.job_id);
      expect(validationResponse.job_id).toBe(progressResponse.job_id);
    });

    it('should maintain validation criteria throughout workflow', async () => {
      // Add manual author
      await scholarFinderApiService.addManualAuthor(mockJobId, 'Dr. Michael Chen');

      // Initiate validation
      const validationResponse = await scholarFinderApiService.validateAuthors(mockJobId);
      const initiationCriteria = validationResponse.data.validation_criteria;

      // Check validation progress
      const progressResponse = await scholarFinderApiService.getValidationStatus(mockJobId);
      const progressCriteria = progressResponse.data.validation_criteria;

      // Verify criteria consistency
      expect(initiationCriteria).toEqual(progressCriteria);
      expect(initiationCriteria.length).toBe(8);
    });

    it('should track validation progress over time', async () => {
      // Initiate validation
      const initiationResponse = await scholarFinderApiService.validateAuthors(mockJobId);
      expect(initiationResponse.data.progress_percentage).toBe(0);
      expect(initiationResponse.data.total_authors_processed).toBe(0);

      // Check progress
      const progressResponse = await scholarFinderApiService.getValidationStatus(mockJobId);
      expect(progressResponse.data.progress_percentage).toBeGreaterThan(0);
      expect(progressResponse.data.total_authors_processed).toBeGreaterThan(0);

      // Verify progress is increasing
      expect(progressResponse.data.progress_percentage).toBeGreaterThan(
        initiationResponse.data.progress_percentage
      );
      expect(progressResponse.data.total_authors_processed).toBeGreaterThan(
        initiationResponse.data.total_authors_processed
      );
    });
  });
});
