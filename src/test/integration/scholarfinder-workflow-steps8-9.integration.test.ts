/**
 * Integration Test: ScholarFinder Workflow Steps 8-9
 * Tests: Recommendations Retrieval → Shortlist → Export
 * 
 * Requirements: 14-16
 * 
 * This test verifies:
 * - Recommendations retrieval with sorting
 * - Reviewer filtering and searching
 * - Shortlist creation and management
 * - Export file generation (CSV and JSON)
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
import { generateCSV, generateJSON } from '../../utils/exportUtils';

// Mock data for testing
const mockJobId = 'job_20250115_1430_a1b2c3';

const mockReviewers = [
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
  },
  {
    reviewer: 'Dr. John Doe',
    email: 'j.doe@research.org',
    aff: 'Research Institute of Biology',
    city: 'New York',
    country: 'USA',
    Total_Publications: 95,
    English_Pubs: 90,
    'Publications (last 10 years)': 38,
    'Relevant Publications (last 5 years)': 10,
    'Publications (last 2 years)': 4,
    'Publications (last year)': 1,
    Clinical_Trials_no: 0,
    Clinical_study_no: 0,
    Case_reports_no: 0,
    Retracted_Pubs_no: 0,
    TF_Publications_last_year: 1,
    coauthor: false,
    country_match: 'yes',
    aff_match: 'no',
    conditions_met: 7,
    conditions_satisfied: '7 of 8'
  },
  {
    reviewer: 'Dr. Alice Johnson',
    email: 'a.johnson@university.ca',
    aff: 'Department of Ecology, Canadian University',
    city: 'Toronto',
    country: 'Canada',
    Total_Publications: 78,
    English_Pubs: 75,
    'Publications (last 10 years)': 32,
    'Relevant Publications (last 5 years)': 8,
    'Publications (last 2 years)': 3,
    'Publications (last year)': 1,
    Clinical_Trials_no: 0,
    Clinical_study_no: 0,
    Case_reports_no: 0,
    Retracted_Pubs_no: 0,
    TF_Publications_last_year: 1,
    coauthor: false,
    country_match: 'no',
    aff_match: 'no',
    conditions_met: 6,
    conditions_satisfied: '6 of 8'
  }
];

const mockRecommendationsResponse = {
  message: 'Recommendations retrieved',
  job_id: mockJobId,
  data: {
    reviewers: mockReviewers,
    total_count: 3,
    validation_summary: {
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
      average_conditions_met: 7.0
    }
  }
};

// Setup MSW server for mocking external API
const server = setupServer(
  // Step 8: Get Recommendations
  http.get('https://192.168.61.60:8000/recommended_reviewers', ({ request }) => {
    const url = new URL(request.url);
    const jobId = url.searchParams.get('job_id');
    
    if (jobId !== mockJobId) {
      return HttpResponse.json(
        { error: 'Invalid job ID' },
        { status: 404 }
      );
    }
    
    return HttpResponse.json(mockRecommendationsResponse);
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

describe('ScholarFinder Workflow Integration: Steps 8-9 (Recommendations & Export)', () => {
  describe('Step 8: Recommendations Retrieval', () => {
    it('should retrieve recommended reviewers', async () => {
      const response = await scholarFinderApiService.getRecommendations(mockJobId);

      // Verify response structure
      expect(response).toBeDefined();
      expect(response.message).toBe('Recommendations retrieved');
      expect(response.job_id).toBe(mockJobId);
      expect(response.data.reviewers).toBeDefined();
      expect(response.data.reviewers.length).toBe(3);
      expect(response.data.total_count).toBe(3);
      expect(response.data.validation_summary).toBeDefined();
    });

    it('should sort reviewers by conditions_met in descending order', async () => {
      const response = await scholarFinderApiService.getRecommendations(mockJobId);

      const reviewers = response.data.reviewers;
      
      // Verify sorting (highest scores first)
      for (let i = 0; i < reviewers.length - 1; i++) {
        expect(reviewers[i].conditions_met).toBeGreaterThanOrEqual(reviewers[i + 1].conditions_met);
      }

      // Verify specific order
      expect(reviewers[0].conditions_met).toBe(8);
      expect(reviewers[1].conditions_met).toBe(7);
      expect(reviewers[2].conditions_met).toBe(6);
    });

    it('should include complete reviewer details', async () => {
      const response = await scholarFinderApiService.getRecommendations(mockJobId);

      const reviewer = response.data.reviewers[0];
      
      // Verify all required fields
      expect(reviewer.reviewer).toBeDefined();
      expect(reviewer.email).toBeDefined();
      expect(reviewer.aff).toBeDefined();
      expect(reviewer.city).toBeDefined();
      expect(reviewer.country).toBeDefined();
      expect(reviewer.Total_Publications).toBeDefined();
      expect(reviewer.English_Pubs).toBeDefined();
      expect(reviewer['Publications (last 10 years)']).toBeDefined();
      expect(reviewer['Relevant Publications (last 5 years)']).toBeDefined();
      expect(reviewer['Publications (last 2 years)']).toBeDefined();
      expect(reviewer['Publications (last year)']).toBeDefined();
      expect(reviewer.conditions_met).toBeDefined();
      expect(reviewer.conditions_satisfied).toBeDefined();
    });

    it('should include validation summary', async () => {
      const response = await scholarFinderApiService.getRecommendations(mockJobId);

      const summary = response.data.validation_summary;
      
      expect(summary.total_authors).toBe(150);
      expect(summary.authors_validated).toBe(150);
      expect(summary.conditions_applied.length).toBe(8);
      expect(summary.average_conditions_met).toBe(7.0);
    });

    it('should validate conditions_met scores are within range', async () => {
      const response = await scholarFinderApiService.getRecommendations(mockJobId);

      response.data.reviewers.forEach(reviewer => {
        expect(reviewer.conditions_met).toBeGreaterThanOrEqual(0);
        expect(reviewer.conditions_met).toBeLessThanOrEqual(8);
      });
    });

    it('should reject recommendations retrieval without job_id', async () => {
      await expect(
        scholarFinderApiService.getRecommendations('')
      ).rejects.toMatchObject({
        type: 'EXTERNAL_API_ERROR',
        message: expect.stringContaining('Job ID is required'),
        retryable: false
      });
    });
  });

  describe('Step 9: Reviewer Filtering and Selection', () => {
    it('should filter reviewers by minimum conditions_met score', async () => {
      const response = await scholarFinderApiService.getRecommendations(mockJobId);
      const allReviewers = response.data.reviewers;

      // Filter reviewers with conditions_met >= 7
      const filteredReviewers = allReviewers.filter(r => r.conditions_met >= 7);

      expect(filteredReviewers.length).toBe(2);
      expect(filteredReviewers[0].conditions_met).toBe(8);
      expect(filteredReviewers[1].conditions_met).toBe(7);
    });

    it('should search reviewers by name', async () => {
      const response = await scholarFinderApiService.getRecommendations(mockJobId);
      const allReviewers = response.data.reviewers;

      // Search for "Jane"
      const searchResults = allReviewers.filter(r => 
        r.reviewer.toLowerCase().includes('jane')
      );

      expect(searchResults.length).toBe(1);
      expect(searchResults[0].reviewer).toBe('Dr. Jane Smith');
    });

    it('should search reviewers by affiliation', async () => {
      const response = await scholarFinderApiService.getRecommendations(mockJobId);
      const allReviewers = response.data.reviewers;

      // Search for "University"
      const searchResults = allReviewers.filter(r => 
        r.aff.toLowerCase().includes('university')
      );

      expect(searchResults.length).toBe(2);
    });

    it('should search reviewers by country', async () => {
      const response = await scholarFinderApiService.getRecommendations(mockJobId);
      const allReviewers = response.data.reviewers;

      // Search for "USA"
      const searchResults = allReviewers.filter(r => 
        r.country.toLowerCase().includes('usa')
      );

      expect(searchResults.length).toBe(2);
    });
  });

  describe('Step 9: Shortlist Management', () => {
    it('should create shortlist from selected reviewers', async () => {
      const response = await scholarFinderApiService.getRecommendations(mockJobId);
      const allReviewers = response.data.reviewers;

      // Select top 2 reviewers for shortlist
      const selectedReviewers = allReviewers.slice(0, 2);

      expect(selectedReviewers.length).toBe(2);
      expect(selectedReviewers[0].conditions_met).toBe(8);
      expect(selectedReviewers[1].conditions_met).toBe(7);
    });

    it('should maintain shortlist selection', async () => {
      const response = await scholarFinderApiService.getRecommendations(mockJobId);
      const allReviewers = response.data.reviewers;

      // Create shortlist
      const shortlist = new Set<string>();
      shortlist.add(allReviewers[0].email);
      shortlist.add(allReviewers[2].email);

      // Verify shortlist contains exactly selected reviewers
      expect(shortlist.size).toBe(2);
      expect(shortlist.has(allReviewers[0].email)).toBe(true);
      expect(shortlist.has(allReviewers[2].email)).toBe(true);
      expect(shortlist.has(allReviewers[1].email)).toBe(false);
    });

    it('should allow removal from shortlist', async () => {
      const response = await scholarFinderApiService.getRecommendations(mockJobId);
      const allReviewers = response.data.reviewers;

      // Create shortlist
      const shortlist = new Set<string>();
      shortlist.add(allReviewers[0].email);
      shortlist.add(allReviewers[1].email);

      expect(shortlist.size).toBe(2);

      // Remove one reviewer
      shortlist.delete(allReviewers[1].email);

      expect(shortlist.size).toBe(1);
      expect(shortlist.has(allReviewers[0].email)).toBe(true);
      expect(shortlist.has(allReviewers[1].email)).toBe(false);
    });
  });

  describe('Step 9: Export Functionality', () => {
    it('should generate CSV export from reviewers', async () => {
      const response = await scholarFinderApiService.getRecommendations(mockJobId);
      const reviewers = response.data.reviewers;

      // Generate CSV
      const csv = generateCSV(reviewers);

      // Verify CSV structure
      expect(csv).toBeDefined();
      expect(typeof csv).toBe('string');
      expect(csv).toContain('reviewer');
      expect(csv).toContain('email');
      expect(csv).toContain('conditions_met');
      expect(csv).toContain('Dr. Jane Smith');
      expect(csv).toContain('j.smith@university.edu');
    });

    it('should generate JSON export from reviewers', async () => {
      const response = await scholarFinderApiService.getRecommendations(mockJobId);
      const reviewers = response.data.reviewers;

      // Generate JSON
      const json = generateJSON(reviewers);

      // Verify JSON structure
      expect(json).toBeDefined();
      expect(typeof json).toBe('string');
      
      // Parse and verify
      const parsed = JSON.parse(json);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(3);
      expect(parsed[0].reviewer).toBe('Dr. Jane Smith');
      expect(parsed[0].conditions_met).toBe(8);
    });

    it('should include all reviewer fields in CSV export', async () => {
      const response = await scholarFinderApiService.getRecommendations(mockJobId);
      const reviewers = response.data.reviewers;

      const csv = generateCSV(reviewers);

      // Verify all important fields are in CSV
      expect(csv).toContain('reviewer');
      expect(csv).toContain('email');
      expect(csv).toContain('aff');
      expect(csv).toContain('country');
      expect(csv).toContain('Total_Publications');
      expect(csv).toContain('conditions_met');
      expect(csv).toContain('conditions_satisfied');
    });

    it('should include all reviewer fields in JSON export', async () => {
      const response = await scholarFinderApiService.getRecommendations(mockJobId);
      const reviewers = response.data.reviewers;

      const json = generateJSON(reviewers);
      const parsed = JSON.parse(json);

      const reviewer = parsed[0];
      expect(reviewer.reviewer).toBeDefined();
      expect(reviewer.email).toBeDefined();
      expect(reviewer.aff).toBeDefined();
      expect(reviewer.country).toBeDefined();
      expect(reviewer.Total_Publications).toBeDefined();
      expect(reviewer.conditions_met).toBeDefined();
      expect(reviewer.conditions_satisfied).toBeDefined();
    });
  });

  describe('Complete Workflow: Steps 8-9 Integration', () => {
    it('should complete recommendations → shortlist → export workflow', async () => {
      // Step 8: Get recommendations
      const response = await scholarFinderApiService.getRecommendations(mockJobId);
      expect(response.job_id).toBe(mockJobId);
      expect(response.data.reviewers.length).toBe(3);

      // Verify sorting
      const reviewers = response.data.reviewers;
      expect(reviewers[0].conditions_met).toBeGreaterThanOrEqual(reviewers[1].conditions_met);
      expect(reviewers[1].conditions_met).toBeGreaterThanOrEqual(reviewers[2].conditions_met);

      // Step 9a: Create shortlist (select top 2)
      const shortlist = reviewers.slice(0, 2);
      expect(shortlist.length).toBe(2);

      // Step 9b: Export to CSV
      const csv = generateCSV(shortlist);
      expect(csv).toBeDefined();
      expect(csv).toContain('Dr. Jane Smith');
      expect(csv).toContain('Dr. John Doe');

      // Step 9c: Export to JSON
      const json = generateJSON(shortlist);
      expect(json).toBeDefined();
      const parsed = JSON.parse(json);
      expect(parsed.length).toBe(2);
    });

    it('should maintain reviewer sorting throughout workflow', async () => {
      // Get recommendations
      const response = await scholarFinderApiService.getRecommendations(mockJobId);
      const reviewers = response.data.reviewers;

      // Verify initial sorting
      expect(reviewers[0].conditions_met).toBe(8);
      expect(reviewers[1].conditions_met).toBe(7);
      expect(reviewers[2].conditions_met).toBe(6);

      // Filter by minimum score
      const filtered = reviewers.filter(r => r.conditions_met >= 7);
      
      // Verify sorting is maintained after filtering
      expect(filtered[0].conditions_met).toBe(8);
      expect(filtered[1].conditions_met).toBe(7);

      // Export filtered list
      const csv = generateCSV(filtered);
      expect(csv).toContain('Dr. Jane Smith');
      expect(csv).toContain('Dr. John Doe');
    });

    it('should handle complete workflow with filtering and export', async () => {
      // Get recommendations
      const response = await scholarFinderApiService.getRecommendations(mockJobId);
      const allReviewers = response.data.reviewers;

      // Filter by country
      const usaReviewers = allReviewers.filter(r => r.country === 'USA');
      expect(usaReviewers.length).toBe(2);

      // Filter by minimum score
      const highScoreReviewers = usaReviewers.filter(r => r.conditions_met >= 7);
      expect(highScoreReviewers.length).toBe(2);

      // Create shortlist
      const shortlist = highScoreReviewers;

      // Export to both formats
      const csv = generateCSV(shortlist);
      const json = generateJSON(shortlist);

      expect(csv).toBeDefined();
      expect(json).toBeDefined();

      const parsed = JSON.parse(json);
      expect(parsed.length).toBe(2);
      expect(parsed.every((r: any) => r.country === 'USA')).toBe(true);
      expect(parsed.every((r: any) => r.conditions_met >= 7)).toBe(true);
    });
  });
});
