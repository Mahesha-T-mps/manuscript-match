/**
 * Integration Test: ScholarFinder Workflow Steps 1-3
 * Tests: Upload → Metadata Extraction → Keyword Enhancement
 * 
 * Requirements: 1-10
 * 
 * This test verifies:
 * - File upload and metadata extraction
 * - Job ID persistence across steps
 * - Data flow between upload and keyword enhancement
 * - Proper error handling and state management
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

// Mock data for testing
const mockJobId = 'job_20250115_1430_a1b2c3';
const mockProcessId = 'process-123';

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

const mockMetadataResponse = {
  message: 'Metadata retrieved successfully',
  job_id: mockJobId,
  data: {
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
    broader_terms: ['Environmental Science', 'Ecology', 'Conservation Biology'],
    primary_focus: ['climate change', 'global warming', 'temperature rise'],
    secondary_focus: ['biodiversity', 'species diversity', 'habitat loss'],
    additional_primary_keywords: ['carbon emissions', 'greenhouse gases'],
    additional_secondary_keywords: ['extinction', 'endangered species'],
    all_primary_focus_list: ['climate change', 'global warming', 'temperature rise', 'carbon emissions', 'greenhouse gases'],
    all_secondary_focus_list: ['biodiversity', 'species diversity', 'habitat loss', 'extinction', 'endangered species']
  }
};

// Setup MSW server for mocking external API
const server = setupServer(
  // Step 1: Upload & Extract Metadata
  http.post('https://192.168.61.60:8000/upload_extract_metadata', async ({ request }) => {
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file) {
      return HttpResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    return HttpResponse.json(mockUploadResponse);
  }),

  // Step 2: Get Metadata
  http.get('https://192.168.61.60:8000/metadata_extraction', ({ request }) => {
    const url = new URL(request.url);
    const jobId = url.searchParams.get('job_id');
    
    if (jobId !== mockJobId) {
      return HttpResponse.json(
        { error: 'Invalid job ID' },
        { status: 404 }
      );
    }
    
    return HttpResponse.json(mockMetadataResponse);
  }),

  // Step 3: Keyword Enhancement
  http.post('https://192.168.61.60:8000/keyword_enhancement', async ({ request }) => {
    const body = await request.json();
    
    if (body.job_id !== mockJobId) {
      return HttpResponse.json(
        { error: 'Invalid job ID' },
        { status: 404 }
      );
    }
    
    return HttpResponse.json(mockKeywordEnhancementResponse);
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
  // Clear localStorage before each test
  localStorage.clear();
  // Clear fileService job ID cache
  fileService['jobIdMap'] = new Map();
});

describe('ScholarFinder Workflow Integration: Steps 1-3 (Upload to Keywords)', () => {
  describe('Step 1: File Upload and Metadata Extraction', () => {
    it('should upload a valid Word document and extract metadata', async () => {
      // Create a mock Word document file
      const file = new File(
        ['mock docx content'],
        'test-manuscript.docx',
        { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
      );

      // Upload the file
      const response = await scholarFinderApiService.uploadManuscript(file, mockProcessId);

      // Verify response structure
      expect(response).toBeDefined();
      expect(response.message).toBe('Metadata extracted successfully.');
      expect(response.data).toBeDefined();
      expect(response.data.job_id).toBe(mockJobId);
      expect(response.data.file_name).toBe('test-manuscript.docx');
      expect(response.data.heading).toBe('Impact of Climate Change on Biodiversity');
      expect(response.data.authors).toEqual(['John Smith', 'Jane Doe']);
      expect(response.data.affiliations).toEqual(['Department of Biology, University of Example']);
      expect(response.data.keywords).toBe('climate change, biodiversity, ecosystem');
      expect(response.data.abstract).toContain('This study examines');
      expect(response.data.author_aff_map).toBeDefined();
    });

    it('should reject invalid file formats', async () => {
      // Create a mock PDF file (invalid format)
      const file = new File(
        ['mock pdf content'],
        'test-manuscript.pdf',
        { type: 'application/pdf' }
      );

      // Attempt to upload - should throw error
      await expect(
        scholarFinderApiService.uploadManuscript(file, mockProcessId)
      ).rejects.toMatchObject({
        type: 'FILE_FORMAT_ERROR',
        message: expect.stringContaining('Unsupported file format'),
        retryable: false
      });
    });

    it('should reject files larger than 100MB', async () => {
      // Create a mock file larger than 100MB
      const largeContent = new Array(101 * 1024 * 1024).fill('a').join('');
      const file = new File(
        [largeContent],
        'large-manuscript.docx',
        { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
      );

      // Attempt to upload - should throw error
      await expect(
        scholarFinderApiService.uploadManuscript(file, mockProcessId)
      ).rejects.toMatchObject({
        type: 'FILE_FORMAT_ERROR',
        message: expect.stringContaining('File size too large'),
        retryable: false
      });
    });
  });

  describe('Step 2: Job ID Persistence', () => {
    it('should store job_id after successful upload', async () => {
      // Create and upload a file
      const file = new File(
        ['mock docx content'],
        'test-manuscript.docx',
        { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
      );

      const response = await scholarFinderApiService.uploadManuscript(file, mockProcessId);
      const jobId = response.data.job_id;

      // Store the job ID using fileService
      fileService.setJobId(mockProcessId, jobId);

      // Verify job ID is stored in memory
      const retrievedJobId = fileService.getJobId(mockProcessId);
      expect(retrievedJobId).toBe(jobId);
      expect(retrievedJobId).toBe(mockJobId);
    });

    it('should persist job_id to localStorage', async () => {
      // Create and upload a file
      const file = new File(
        ['mock docx content'],
        'test-manuscript.docx',
        { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
      );

      const response = await scholarFinderApiService.uploadManuscript(file, mockProcessId);
      const jobId = response.data.job_id;

      // Store the job ID
      fileService.setJobId(mockProcessId, jobId);

      // Verify job ID is in localStorage
      const localStorageKey = `process_${mockProcessId}_jobId`;
      const storedJobId = localStorage.getItem(localStorageKey);
      expect(storedJobId).toBe(jobId);
    });

    it('should retrieve job_id from localStorage after memory clear', async () => {
      // Create and upload a file
      const file = new File(
        ['mock docx content'],
        'test-manuscript.docx',
        { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
      );

      const response = await scholarFinderApiService.uploadManuscript(file, mockProcessId);
      const jobId = response.data.job_id;

      // Store the job ID
      fileService.setJobId(mockProcessId, jobId);

      // Clear memory cache (simulating page refresh)
      fileService['jobIdMap'].clear();

      // Retrieve job ID - should come from localStorage
      const retrievedJobId = fileService.getJobId(mockProcessId);
      expect(retrievedJobId).toBe(jobId);
    });
  });

  describe('Step 3: Metadata Retrieval', () => {
    it('should retrieve metadata using stored job_id', async () => {
      // First, upload a file to get job_id
      const file = new File(
        ['mock docx content'],
        'test-manuscript.docx',
        { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
      );

      const uploadResponse = await scholarFinderApiService.uploadManuscript(file, mockProcessId);
      const jobId = uploadResponse.data.job_id;

      // Store job ID
      fileService.setJobId(mockProcessId, jobId);

      // Retrieve metadata using job_id
      const metadataResponse = await scholarFinderApiService.getMetadata(jobId);

      // Verify metadata response
      expect(metadataResponse).toBeDefined();
      expect(metadataResponse.job_id).toBe(jobId);
      expect(metadataResponse.data.heading).toBe('Impact of Climate Change on Biodiversity');
      expect(metadataResponse.data.authors).toEqual(['John Smith', 'Jane Doe']);
    });

    it('should fail to retrieve metadata with invalid job_id', async () => {
      const invalidJobId = 'invalid-job-id';

      // Attempt to retrieve metadata with invalid job_id
      await expect(
        scholarFinderApiService.getMetadata(invalidJobId)
      ).rejects.toBeDefined();
    });
  });

  describe('Step 4: Keyword Enhancement', () => {
    it('should enhance keywords using stored job_id', async () => {
      // First, upload a file to get job_id
      const file = new File(
        ['mock docx content'],
        'test-manuscript.docx',
        { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
      );

      const uploadResponse = await scholarFinderApiService.uploadManuscript(file, mockProcessId);
      const jobId = uploadResponse.data.job_id;

      // Store job ID
      fileService.setJobId(mockProcessId, jobId);

      // Enhance keywords
      const keywordResponse = await scholarFinderApiService.enhanceKeywords(jobId);

      // Verify keyword enhancement response
      expect(keywordResponse).toBeDefined();
      expect(keywordResponse.job_id).toBe(jobId);
      expect(keywordResponse.data.mesh_terms).toContain('Climate Change');
      expect(keywordResponse.data.mesh_terms).toContain('Biodiversity');
      expect(keywordResponse.data.primary_focus).toContain('climate change');
      expect(keywordResponse.data.secondary_focus).toContain('biodiversity');
      expect(keywordResponse.data.all_primary_focus_list.length).toBeGreaterThan(0);
      expect(keywordResponse.data.all_secondary_focus_list.length).toBeGreaterThan(0);
    });

    it('should fail keyword enhancement with invalid job_id', async () => {
      const invalidJobId = 'invalid-job-id';

      // Attempt to enhance keywords with invalid job_id
      await expect(
        scholarFinderApiService.enhanceKeywords(invalidJobId)
      ).rejects.toBeDefined();
    });
  });

  describe('Complete Workflow: Steps 1-3 Integration', () => {
    it('should complete upload → metadata → keyword enhancement workflow', async () => {
      // Step 1: Upload file
      const file = new File(
        ['mock docx content'],
        'test-manuscript.docx',
        { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
      );

      const uploadResponse = await scholarFinderApiService.uploadManuscript(file, mockProcessId);
      expect(uploadResponse.data.job_id).toBe(mockJobId);

      // Store job ID
      const jobId = uploadResponse.data.job_id;
      fileService.setJobId(mockProcessId, jobId);

      // Step 2: Retrieve metadata
      const metadataResponse = await scholarFinderApiService.getMetadata(jobId);
      expect(metadataResponse.job_id).toBe(jobId);
      expect(metadataResponse.data.heading).toBe(uploadResponse.data.heading);
      expect(metadataResponse.data.authors).toEqual(uploadResponse.data.authors);

      // Step 3: Enhance keywords
      const keywordResponse = await scholarFinderApiService.enhanceKeywords(jobId);
      expect(keywordResponse.job_id).toBe(jobId);
      expect(keywordResponse.data.mesh_terms.length).toBeGreaterThan(0);
      expect(keywordResponse.data.primary_focus.length).toBeGreaterThan(0);

      // Verify job ID persistence throughout workflow
      const retrievedJobId = fileService.getJobId(mockProcessId);
      expect(retrievedJobId).toBe(jobId);
    });

    it('should maintain data consistency across workflow steps', async () => {
      // Upload file
      const file = new File(
        ['mock docx content'],
        'test-manuscript.docx',
        { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
      );

      const uploadResponse = await scholarFinderApiService.uploadManuscript(file, mockProcessId);
      const jobId = uploadResponse.data.job_id;
      fileService.setJobId(mockProcessId, jobId);

      // Get metadata
      const metadataResponse = await scholarFinderApiService.getMetadata(jobId);

      // Verify data consistency
      expect(metadataResponse.data.heading).toBe(uploadResponse.data.heading);
      expect(metadataResponse.data.authors).toEqual(uploadResponse.data.authors);
      expect(metadataResponse.data.affiliations).toEqual(uploadResponse.data.affiliations);
      expect(metadataResponse.data.keywords).toBe(uploadResponse.data.keywords);
      expect(metadataResponse.data.abstract).toBe(uploadResponse.data.abstract);

      // Enhance keywords
      const keywordResponse = await scholarFinderApiService.enhanceKeywords(jobId);

      // Verify job ID consistency
      expect(keywordResponse.job_id).toBe(jobId);
      expect(keywordResponse.job_id).toBe(uploadResponse.data.job_id);
      expect(keywordResponse.job_id).toBe(metadataResponse.job_id);
    });
  });
});
