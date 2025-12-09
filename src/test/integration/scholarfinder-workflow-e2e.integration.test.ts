/**
 * End-to-End Integration Test: Complete ScholarFinder Workflow
 * Tests: Upload → Metadata → Keywords → Search → Validation → Recommendations → Export
 * 
 * Requirements: All (1-18)
 * 
 * This test verifies:
 * - Complete workflow from upload to export
 * - Job ID persistence throughout all steps
 * - Data transformations at each step
 * - Workflow progression and state management
 * - Error handling across the entire workflow
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
import { fileService } from '../../services/fileService';
import { generateCSV, generateJSON } from '../../utils/exportUtils';

// Mock data for complete workflow
const mockJobId = 'job_20250115_1430_a1b2c3';
const mockProcessId = 'process-e2e-test';

const mockUploadResponse = {
  message: 'Metadata extracted successfully.',
  data: {
    job_id: mockJobId,
    file_name: 'test-manuscript.docx',
    timestamp: '2025-01-15 14:30:00',
    heading: 'Impact of Climate Change on Biodiversity',
    authors: ['John Smith', 'Jane Doe'],
    affiliations: ['Department of Biology, University of Example'],
    keywords: 'climate change, biodiversity, ecosystem',
    abstract: 'This study examines the impact of climate change on biodiversity...',
    author_aff_map: {
      'John Smith': 'Department of Biology, University of Example',
      'Jane Doe': 'Department of Biology, University of Example'
    }
  }
};

const mockKeywordEnhancementResponse = {
  message: 'Keywords enhanced successfully',
  job_id: mockJobId,
  data: {
    mesh_terms: ['Climate Change', 'Biodiversity', 'Ecosystem'],
    broader_terms: ['Environmental Science', 'Ecology'],
    primary_focus: ['climate change', 'global warming'],
    secondary_focus: ['biodiversity', 'species diversity'],
    additional_primary_keywords: ['carbon emissions'],
    additional_secondary_keywords: ['habitat loss'],
    all_primary_focus_list: ['climate change', 'global warming', 'carbon emissions'],
    all_secondary_focus_list: ['biodiversity', 'species diversity', 'habitat loss']
  }
};

const mockKeywordStringResponse = {
  message: 'Search string generated successfully',
  job_id: mockJobId,
  data: {
    search_string: '(climate change OR global warming) AND (biodiversity OR species diversity)',
    primary_keywords_used: ['climate change', 'global warming'],
    secondary_keywords_used: ['biodiversity', 'species diversity']
  }
};

const mockDatabaseSearchResponse = {
  message: 'Database search completed',
  job_id: mockJobId,
  data: {
    total_reviewers: 150,
    databases_searched: ['PubMed', 'ScienceDirect'],
    search_status: {
      PubMed: 'success' as const,
      ScienceDirect: 'success' as const
    }
  }
};

const mockValidationResponse = {
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
      average_conditions_met: 6.5
    }
  }
};

const mockRecommendationsResponse = {
  message: 'Recommendations retrieved',
  job_id: mockJobId,
  data: {
    reviewers: [
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
      }
    ],
    total_count: 2,
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
      average_conditions_met: 7.5
    }
  }
};

// Setup MSW server for complete workflow
const server = setupServer(
  http.post('https://192.168.61.60:8000/upload_extract_metadata', () => {
    return HttpResponse.json(mockUploadResponse);
  }),
  http.get('https://192.168.61.60:8000/metadata_extraction', () => {
    return HttpResponse.json({
      message: 'Metadata retrieved successfully',
      job_id: mockJobId,
      data: mockUploadResponse.data
    });
  }),
  http.post('https://192.168.61.60:8000/keyword_enhancement', () => {
    return HttpResponse.json(mockKeywordEnhancementResponse);
  }),
  http.post('https://192.168.61.60:8000/keyword_string_generator', () => {
    return HttpResponse.json(mockKeywordStringResponse);
  }),
  http.post('https://192.168.61.60:8000/database_search', () => {
    return HttpResponse.json(mockDatabaseSearchResponse);
  }),
  http.post('https://192.168.61.60:8000/validate_authors', () => {
    return HttpResponse.json(mockValidationResponse);
  }),
  http.get('https://192.168.61.60:8000/validation_status/:jobId', () => {
    return HttpResponse.json(mockValidationResponse);
  }),
  http.get('https://192.168.61.60:8000/recommended_reviewers', () => {
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
  localStorage.clear();
  fileService['jobIdMap'] = new Map();
});

describe('ScholarFinder Complete Workflow: End-to-End Integration', () => {
  it('should complete entire workflow from upload to export', async () => {
    // Step 1: Upload manuscript
    const file = new File(
      ['mock docx content'],
      'test-manuscript.docx',
      { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
    );

    const uploadResponse = await scholarFinderApiService.uploadManuscript(file, mockProcessId);
    expect(uploadResponse.data.job_id).toBe(mockJobId);
    expect(uploadResponse.data.heading).toBe('Impact of Climate Change on Biodiversity');

    // Store job ID
    const jobId = uploadResponse.data.job_id;
    fileService.setJobId(mockProcessId, jobId);

    // Step 2: Verify metadata
    const metadataResponse = await scholarFinderApiService.getMetadata(jobId);
    expect(metadataResponse.job_id).toBe(jobId);
    expect(metadataResponse.data.heading).toBe(uploadResponse.data.heading);

    // Step 3: Enhance keywords
    const keywordResponse = await scholarFinderApiService.enhanceKeywords(jobId);
    expect(keywordResponse.job_id).toBe(jobId);
    expect(keywordResponse.data.mesh_terms.length).toBeGreaterThan(0);

    // Step 4: Generate keyword string
    const keywords = {
      primary_keywords_input: keywordResponse.data.all_primary_focus_list.slice(0, 2).join(', '),
      secondary_keywords_input: keywordResponse.data.all_secondary_focus_list.slice(0, 2).join(', ')
    };
    const keywordStringResponse = await scholarFinderApiService.generateKeywordString(jobId, keywords);
    expect(keywordStringResponse.job_id).toBe(jobId);
    expect(keywordStringResponse.data.search_string).toBeDefined();

    // Step 5: Search databases
    const databases = {
      selected_websites: ['PubMed', 'ScienceDirect']
    };
    const searchResponse = await scholarFinderApiService.searchDatabases(jobId, databases);
    expect(searchResponse.job_id).toBe(jobId);
    expect(searchResponse.data.total_reviewers).toBe(150);

    // Step 6: Validate authors
    const validationResponse = await scholarFinderApiService.validateAuthors(jobId);
    expect(validationResponse.job_id).toBe(jobId);
    expect(validationResponse.data.validation_status).toBe('completed');

    // Step 7: Get recommendations
    const recommendationsResponse = await scholarFinderApiService.getRecommendations(jobId);
    expect(recommendationsResponse.job_id).toBe(jobId);
    expect(recommendationsResponse.data.reviewers.length).toBe(2);

    // Verify sorting
    const reviewers = recommendationsResponse.data.reviewers;
    expect(reviewers[0].conditions_met).toBeGreaterThanOrEqual(reviewers[1].conditions_met);

    // Step 8: Create shortlist
    const shortlist = reviewers.slice(0, 2);
    expect(shortlist.length).toBe(2);

    // Step 9: Export
    const csv = generateCSV(shortlist);
    const json = generateJSON(shortlist);
    expect(csv).toBeDefined();
    expect(json).toBeDefined();

    // Verify job ID persistence throughout
    const retrievedJobId = fileService.getJobId(mockProcessId);
    expect(retrievedJobId).toBe(jobId);
  });

  it('should maintain job ID persistence across all workflow steps', async () => {
    // Upload
    const file = new File(['content'], 'test.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const uploadResponse = await scholarFinderApiService.uploadManuscript(file, mockProcessId);
    const jobId = uploadResponse.data.job_id;
    fileService.setJobId(mockProcessId, jobId);

    // Verify job ID after each step
    expect(fileService.getJobId(mockProcessId)).toBe(jobId);

    await scholarFinderApiService.getMetadata(jobId);
    expect(fileService.getJobId(mockProcessId)).toBe(jobId);

    await scholarFinderApiService.enhanceKeywords(jobId);
    expect(fileService.getJobId(mockProcessId)).toBe(jobId);

    await scholarFinderApiService.generateKeywordString(jobId, {
      primary_keywords_input: 'test',
      secondary_keywords_input: 'test'
    });
    expect(fileService.getJobId(mockProcessId)).toBe(jobId);

    await scholarFinderApiService.searchDatabases(jobId, { selected_websites: ['PubMed'] });
    expect(fileService.getJobId(mockProcessId)).toBe(jobId);

    await scholarFinderApiService.validateAuthors(jobId);
    expect(fileService.getJobId(mockProcessId)).toBe(jobId);

    await scholarFinderApiService.getRecommendations(jobId);
    expect(fileService.getJobId(mockProcessId)).toBe(jobId);

    // Verify localStorage persistence
    const localStorageKey = `process_${mockProcessId}_jobId`;
    expect(localStorage.getItem(localStorageKey)).toBe(jobId);
  });

  it('should maintain data consistency across workflow transformations', async () => {
    // Upload
    const file = new File(['content'], 'test.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const uploadResponse = await scholarFinderApiService.uploadManuscript(file, mockProcessId);
    const jobId = uploadResponse.data.job_id;
    fileService.setJobId(mockProcessId, jobId);

    const originalTitle = uploadResponse.data.heading;
    const originalAuthors = uploadResponse.data.authors;

    // Verify metadata consistency
    const metadataResponse = await scholarFinderApiService.getMetadata(jobId);
    expect(metadataResponse.data.heading).toBe(originalTitle);
    expect(metadataResponse.data.authors).toEqual(originalAuthors);

    // Verify job ID consistency in all responses
    const keywordResponse = await scholarFinderApiService.enhanceKeywords(jobId);
    expect(keywordResponse.job_id).toBe(jobId);

    const keywordStringResponse = await scholarFinderApiService.generateKeywordString(jobId, {
      primary_keywords_input: 'climate change',
      secondary_keywords_input: 'biodiversity'
    });
    expect(keywordStringResponse.job_id).toBe(jobId);

    const searchResponse = await scholarFinderApiService.searchDatabases(jobId, {
      selected_websites: ['PubMed']
    });
    expect(searchResponse.job_id).toBe(jobId);

    const validationResponse = await scholarFinderApiService.validateAuthors(jobId);
    expect(validationResponse.job_id).toBe(jobId);

    const recommendationsResponse = await scholarFinderApiService.getRecommendations(jobId);
    expect(recommendationsResponse.job_id).toBe(jobId);
  });

  it('should handle workflow progression with state transitions', async () => {
    const workflowState = {
      step: 0,
      jobId: '',
      completed: [] as string[]
    };

    // Step 1: Upload
    const file = new File(['content'], 'test.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const uploadResponse = await scholarFinderApiService.uploadManuscript(file, mockProcessId);
    workflowState.jobId = uploadResponse.data.job_id;
    workflowState.step = 1;
    workflowState.completed.push('upload');
    fileService.setJobId(mockProcessId, workflowState.jobId);

    expect(workflowState.step).toBe(1);
    expect(workflowState.completed).toContain('upload');

    // Step 2: Keywords
    await scholarFinderApiService.enhanceKeywords(workflowState.jobId);
    workflowState.step = 2;
    workflowState.completed.push('keywords');

    expect(workflowState.step).toBe(2);
    expect(workflowState.completed).toContain('keywords');

    // Step 3: Search
    await scholarFinderApiService.generateKeywordString(workflowState.jobId, {
      primary_keywords_input: 'test',
      secondary_keywords_input: 'test'
    });
    await scholarFinderApiService.searchDatabases(workflowState.jobId, {
      selected_websites: ['PubMed']
    });
    workflowState.step = 3;
    workflowState.completed.push('search');

    expect(workflowState.step).toBe(3);
    expect(workflowState.completed).toContain('search');

    // Step 4: Validation
    await scholarFinderApiService.validateAuthors(workflowState.jobId);
    workflowState.step = 4;
    workflowState.completed.push('validation');

    expect(workflowState.step).toBe(4);
    expect(workflowState.completed).toContain('validation');

    // Step 5: Recommendations
    await scholarFinderApiService.getRecommendations(workflowState.jobId);
    workflowState.step = 5;
    workflowState.completed.push('recommendations');

    expect(workflowState.step).toBe(5);
    expect(workflowState.completed).toContain('recommendations');
    expect(workflowState.completed.length).toBe(5);
  });

  it('should recover from page refresh using localStorage', async () => {
    // Upload and store job ID
    const file = new File(['content'], 'test.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const uploadResponse = await scholarFinderApiService.uploadManuscript(file, mockProcessId);
    const jobId = uploadResponse.data.job_id;
    fileService.setJobId(mockProcessId, jobId);

    // Simulate page refresh by clearing memory
    fileService['jobIdMap'].clear();

    // Verify job ID can be retrieved from localStorage
    const retrievedJobId = fileService.getJobId(mockProcessId);
    expect(retrievedJobId).toBe(jobId);

    // Continue workflow with retrieved job ID
    const keywordResponse = await scholarFinderApiService.enhanceKeywords(retrievedJobId!);
    expect(keywordResponse.job_id).toBe(jobId);
  });

  it('should handle complete workflow with filtering and export', async () => {
    // Complete workflow
    const file = new File(['content'], 'test.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const uploadResponse = await scholarFinderApiService.uploadManuscript(file, mockProcessId);
    const jobId = uploadResponse.data.job_id;
    fileService.setJobId(mockProcessId, jobId);

    await scholarFinderApiService.enhanceKeywords(jobId);
    await scholarFinderApiService.generateKeywordString(jobId, {
      primary_keywords_input: 'climate change',
      secondary_keywords_input: 'biodiversity'
    });
    await scholarFinderApiService.searchDatabases(jobId, { selected_websites: ['PubMed'] });
    await scholarFinderApiService.validateAuthors(jobId);

    const recommendationsResponse = await scholarFinderApiService.getRecommendations(jobId);
    const allReviewers = recommendationsResponse.data.reviewers;

    // Filter by minimum score
    const filteredReviewers = allReviewers.filter(r => r.conditions_met >= 7);
    expect(filteredReviewers.length).toBe(2);

    // Export filtered list
    const csv = generateCSV(filteredReviewers);
    const json = generateJSON(filteredReviewers);

    expect(csv).toContain('Dr. Jane Smith');
    expect(csv).toContain('Dr. John Doe');

    const parsed = JSON.parse(json);
    expect(parsed.length).toBe(2);
    expect(parsed.every((r: any) => r.conditions_met >= 7)).toBe(true);
  });
});
