/**
 * Tests for ScholarFinder API Service
 * Comprehensive test suite covering all API operations, error handling, and validation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ScholarFinderApiService, ScholarFinderErrorType } from '../ScholarFinderApiService';
import type {
  UploadResponse,
  MetadataResponse,
  KeywordEnhancementResponse,
  KeywordStringResponse,
  DatabaseSearchResponse,
  ManualAuthorResponse,
  ValidationResponse,
  RecommendationsResponse,
} from '../../types/api';

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

// Mock the config
vi.mock('../../../../lib/config', () => ({
  config: {
    apiBaseUrl: 'http://localhost:3002',
    scholarFinderApiUrl: 'http://192.168.61.60:8000',
    enableDebugLogging: false,
  },
}));

describe('ScholarFinderApiService', () => {
  let apiService: ScholarFinderApiService;
  let mockApiInstance: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Create new service instance
    apiService = new ScholarFinderApiService();
    
    // Get the mocked API instance
    mockApiInstance = (apiService as any).apiService;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('uploadManuscript', () => {
    it('should successfully upload a valid manuscript file', async () => {
      // Arrange
      const mockFile = new File(['test content'], 'test.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      
      const mockResponse: UploadResponse = {
        message: 'Upload successful',
        data: {
          job_id: 'test-job-123',
          file_name: 'test.docx',
          timestamp: '2024-01-01T00:00:00Z',
          heading: 'Test Manuscript Title',
          authors: ['John Doe', 'Jane Smith'],
          affiliations: ['University A', 'University B'],
          keywords: 'machine learning, artificial intelligence',
          abstract: 'This is a test abstract.',
          author_aff_map: { 'John Doe': 'University A', 'Jane Smith': 'University B' },
        },
      };

      mockApiInstance.uploadFile.mockResolvedValue(mockResponse);

      // Act
      const result = await apiService.uploadManuscript(mockFile);

      // Assert
      expect(mockApiInstance.uploadFile).toHaveBeenCalledWith(
        '/upload_extract_metadata',
        mockFile
      );
      expect(result).toEqual(mockResponse);
    });

    it('should reject files with invalid format', async () => {
      // Arrange
      const mockFile = new File(['test content'], 'test.pdf', {
        type: 'application/pdf',
      });

      // Act & Assert
      await expect(apiService.uploadManuscript(mockFile)).rejects.toMatchObject({
        type: ScholarFinderErrorType.FILE_FORMAT_ERROR,
        message: expect.stringContaining('Unsupported file format'),
        retryable: false,
      });

      expect(mockApiInstance.uploadFile).not.toHaveBeenCalled();
    });

    it('should reject files that are too large', async () => {
      // Arrange
      const largeFile = new File(['x'.repeat(101 * 1024 * 1024)], 'large.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      // Act & Assert
      await expect(apiService.uploadManuscript(largeFile)).rejects.toMatchObject({
        type: ScholarFinderErrorType.FILE_FORMAT_ERROR,
        message: expect.stringContaining('File size too large'),
        retryable: false,
      });

      expect(mockApiInstance.uploadFile).not.toHaveBeenCalled();
    });

    it('should handle network errors during upload', async () => {
      // Arrange
      const mockFile = new File(['test content'], 'test.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      const networkError = new Error('Network Error');
      (networkError as any).response = undefined;
      mockApiInstance.uploadFile.mockRejectedValue(networkError);

      // Act & Assert
      await expect(apiService.uploadManuscript(mockFile)).rejects.toMatchObject({
        type: ScholarFinderErrorType.EXTERNAL_API_ERROR,
        message: expect.stringContaining('Failed to connect to ScholarFinder API'),
        retryable: true,
      });
    });
  });

  describe('getMetadata', () => {
    it('should successfully retrieve metadata', async () => {
      // Arrange
      const jobId = 'test-job-123';
      const mockResponse: MetadataResponse = {
        message: 'Metadata retrieved',
        job_id: jobId,
        data: {
          heading: 'Test Manuscript Title',
          authors: ['John Doe', 'Jane Smith'],
          affiliations: ['University A', 'University B'],
          keywords: 'machine learning, artificial intelligence',
          abstract: 'This is a test abstract.',
          author_aff_map: { 'John Doe': 'University A', 'Jane Smith': 'University B' },
        },
      };

      mockApiInstance.get.mockResolvedValue(mockResponse);

      // Act
      const result = await apiService.getMetadata(jobId);

      // Assert
      expect(mockApiInstance.get).toHaveBeenCalledWith(`/metadata_extraction?job_id=${jobId}`, undefined);
      expect(result).toEqual(mockResponse);
    });

    it('should reject empty job ID', async () => {
      // Act & Assert
      await expect(apiService.getMetadata('')).rejects.toMatchObject({
        type: ScholarFinderErrorType.METADATA_ERROR,
        message: 'Job ID is required to retrieve metadata',
        retryable: false,
      });

      expect(mockApiInstance.get).not.toHaveBeenCalled();
    });
  });

  describe('enhanceKeywords', () => {
    it('should successfully enhance keywords', async () => {
      // Arrange
      const jobId = 'test-job-123';
      const mockResponse: KeywordEnhancementResponse = {
        message: 'Keywords enhanced',
        job_id: jobId,
        data: {
          mesh_terms: ['Machine Learning', 'Artificial Intelligence'],
          broader_terms: ['Computer Science', 'Technology'],
          primary_focus: ['Deep Learning', 'Neural Networks'],
          secondary_focus: ['Data Mining', 'Pattern Recognition'],
          additional_primary_keywords: ['CNN', 'RNN'],
          additional_secondary_keywords: ['Classification', 'Regression'],
          all_primary_focus_list: ['Deep Learning', 'Neural Networks', 'CNN', 'RNN'],
          all_secondary_focus_list: ['Data Mining', 'Pattern Recognition', 'Classification', 'Regression'],
        },
      };

      mockApiInstance.post.mockResolvedValue(mockResponse);

      // Act
      const result = await apiService.enhanceKeywords(jobId);

      // Assert
      expect(mockApiInstance.post).toHaveBeenCalledWith('/keyword_enhancement', { job_id: jobId });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('generateKeywordString', () => {
    it('should successfully generate keyword string', async () => {
      // Arrange
      const jobId = 'test-job-123';
      const keywords = {
        primary_keywords_input: 'machine learning, deep learning',
        secondary_keywords_input: 'neural networks, AI',
      };
      const mockResponse: KeywordStringResponse = {
        message: 'Search string generated',
        job_id: jobId,
        data: {
          search_string: '("machine learning" OR "deep learning") AND ("neural networks" OR "AI")',
          primary_keywords_used: ['machine learning', 'deep learning'],
          secondary_keywords_used: ['neural networks', 'AI'],
        },
      };

      mockApiInstance.post.mockResolvedValue(mockResponse);

      // Act
      const result = await apiService.generateKeywordString(jobId, keywords);

      // Assert
      expect(mockApiInstance.post).toHaveBeenCalledWith('/keyword_string_generator', {
        job_id: jobId,
        ...keywords,
      });
      expect(result).toEqual(mockResponse);
    });

    it('should reject empty keywords', async () => {
      // Arrange
      const jobId = 'test-job-123';
      const emptyKeywords = {
        primary_keywords_input: '',
        secondary_keywords_input: '',
      };

      // Act & Assert
      await expect(apiService.generateKeywordString(jobId, emptyKeywords)).rejects.toMatchObject({
        type: ScholarFinderErrorType.KEYWORD_ERROR,
        message: 'At least one primary or secondary keyword must be selected',
        retryable: false,
      });

      expect(mockApiInstance.post).not.toHaveBeenCalled();
    });
  });

  describe('searchDatabases', () => {
    it('should successfully search databases', async () => {
      // Arrange
      const jobId = 'test-job-123';
      const databases = {
        selected_websites: ['pubmed', 'sciencedirect'],
      };
      const mockResponse: DatabaseSearchResponse = {
        message: 'Search completed',
        job_id: jobId,
        data: {
          total_reviewers: 150,
          databases_searched: ['pubmed', 'sciencedirect'],
          search_status: {
            pubmed: 'success',
            sciencedirect: 'success',
          },
          preview_reviewers: [],
        },
      };

      mockApiInstance.post.mockResolvedValue(mockResponse);

      // Act
      const result = await apiService.searchDatabases(jobId, databases);

      // Assert
      expect(mockApiInstance.post).toHaveBeenCalledWith('/database_search', {
        job_id: jobId,
        ...databases,
      });
      expect(result).toEqual(mockResponse);
    });

    it('should reject empty database selection', async () => {
      // Arrange
      const jobId = 'test-job-123';
      const emptyDatabases = {
        selected_websites: [],
      };

      // Act & Assert
      await expect(apiService.searchDatabases(jobId, emptyDatabases)).rejects.toMatchObject({
        type: ScholarFinderErrorType.SEARCH_ERROR,
        message: 'At least one database must be selected for search',
        retryable: false,
      });

      expect(mockApiInstance.post).not.toHaveBeenCalled();
    });
  });

  describe('addManualAuthor', () => {
    it('should successfully search for manual author', async () => {
      // Arrange
      const jobId = 'test-job-123';
      const authorName = 'John Smith';
      const mockResponse: ManualAuthorResponse = {
        message: 'Authors found',
        job_id: jobId,
        data: {
          found_authors: [
            {
              name: 'John Smith',
              email: 'john.smith@university.edu',
              affiliation: 'University of Science',
              country: 'USA',
              publications: 45,
            },
          ],
          search_term: authorName,
          total_found: 1,
        },
      };

      mockApiInstance.post.mockResolvedValue(mockResponse);

      // Act
      const result = await apiService.addManualAuthor(jobId, authorName);

      // Assert
      expect(mockApiInstance.post).toHaveBeenCalledWith('/manual_authors', {
        job_id: jobId,
        author_name: authorName,
      });
      expect(result).toEqual(mockResponse);
    });

    it('should reject short author names', async () => {
      // Arrange
      const jobId = 'test-job-123';
      const shortName = 'A';

      // Act & Assert
      await expect(apiService.addManualAuthor(jobId, shortName)).rejects.toMatchObject({
        type: ScholarFinderErrorType.SEARCH_ERROR,
        message: 'Author name must be at least 2 characters long',
        retryable: false,
      });

      expect(mockApiInstance.post).not.toHaveBeenCalled();
    });
  });

  describe('validateAuthors', () => {
    it('should successfully start author validation', async () => {
      // Arrange
      const jobId = 'test-job-123';
      const mockResponse: ValidationResponse = {
        message: 'Validation started',
        job_id: jobId,
        data: {
          validation_status: 'in_progress',
          progress_percentage: 0,
          estimated_completion_time: '2024-01-01T00:05:00Z',
          total_authors_processed: 0,
          validation_criteria: [
            'No co-authorship',
            'Different affiliation',
            'Sufficient publications',
          ],
        },
      };

      mockApiInstance.post.mockResolvedValue(mockResponse);

      // Act
      const result = await apiService.validateAuthors(jobId);

      // Assert
      expect(mockApiInstance.post).toHaveBeenCalledWith('/validate_authors', { job_id: jobId });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getValidationStatus', () => {
    it('should successfully get validation status', async () => {
      // Arrange
      const jobId = 'test-job-123';
      const mockResponse: ValidationResponse = {
        message: 'Validation in progress',
        job_id: jobId,
        data: {
          validation_status: 'in_progress',
          progress_percentage: 75,
          estimated_completion_time: '2024-01-01T00:01:00Z',
          total_authors_processed: 120,
          validation_criteria: [
            'No co-authorship',
            'Different affiliation',
            'Sufficient publications',
          ],
        },
      };

      mockApiInstance.get.mockResolvedValue(mockResponse);

      // Act
      const result = await apiService.getValidationStatus(jobId);

      // Assert
      expect(mockApiInstance.get).toHaveBeenCalledWith(`/validation_status/${jobId}`, undefined);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getRecommendations', () => {
    it('should successfully get recommendations', async () => {
      // Arrange
      const jobId = 'test-job-123';
      const mockResponse: RecommendationsResponse = {
        message: 'Recommendations ready',
        job_id: jobId,
        data: {
          reviewers: [
            {
              reviewer: 'Dr. Jane Doe',
              email: 'jane.doe@university.edu',
              aff: 'University of Technology',
              city: 'Boston',
              country: 'USA',
              Total_Publications: 85,
              English_Pubs: 80,
              'Publications (last 10 years)': 45,
              'Relevant Publications (last 5 years)': 25,
              'Publications (last 2 years)': 8,
              'Publications (last year)': 3,
              Clinical_Trials_no: 2,
              Clinical_study_no: 5,
              Case_reports_no: 1,
              Retracted_Pubs_no: 0,
              TF_Publications_last_year: 2,
              coauthor: false,
              country_match: 'different',
              aff_match: 'different',
              conditions_met: 8,
              conditions_satisfied: '8 of 8',
            },
          ],
          total_count: 1,
          validation_summary: {
            total_authors: 150,
            authors_validated: 150,
            conditions_applied: [
              'No co-authorship',
              'Different affiliation',
              'Sufficient publications',
            ],
            average_conditions_met: 7.2,
          },
        },
      };

      mockApiInstance.get.mockResolvedValue(mockResponse);

      // Act
      const result = await apiService.getRecommendations(jobId);

      // Assert
      expect(mockApiInstance.get).toHaveBeenCalledWith(`/recommended_reviewers?job_id=${jobId}`, undefined);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('checkJobStatus', () => {
    it('should successfully check job status', async () => {
      // Arrange
      const jobId = 'test-job-123';
      const mockResponse = { exists: true, status: 'completed' };

      mockApiInstance.get.mockResolvedValue(mockResponse);

      // Act
      const result = await apiService.checkJobStatus(jobId);

      // Assert
      expect(mockApiInstance.get).toHaveBeenCalledWith(`/job_status/${jobId}`, undefined);
      expect(result).toEqual(mockResponse);
    });

    it('should handle non-existent job', async () => {
      // Arrange
      const jobId = 'non-existent-job';
      const notFoundError = new Error('Not Found');
      (notFoundError as any).response = { status: 404 };
      (notFoundError as any).type = ScholarFinderErrorType.EXTERNAL_API_ERROR;
      (notFoundError as any).details = { status: 404 };

      mockApiInstance.get.mockRejectedValue(notFoundError);

      // Act
      const result = await apiService.checkJobStatus(jobId);

      // Assert
      expect(result).toEqual({ exists: false, status: 'not_found' });
    });
  });

  describe('error handling', () => {
    it('should handle timeout errors', async () => {
      // Arrange
      const jobId = 'test-job-123';
      const timeoutError = new Error('Timeout');
      (timeoutError as any).code = 'ECONNABORTED';
      mockApiInstance.get.mockRejectedValue(timeoutError);

      // Act & Assert
      await expect(apiService.getMetadata(jobId)).rejects.toMatchObject({
        type: ScholarFinderErrorType.TIMEOUT_ERROR,
        message: expect.stringContaining('timed out'),
        retryable: true,
      });
    });

    it('should handle rate limiting errors', async () => {
      // Arrange
      const jobId = 'test-job-123';
      const rateLimitError = new Error('Too Many Requests');
      (rateLimitError as any).response = {
        status: 429,
        headers: { 'retry-after': '60' },
        data: { message: 'Rate limit exceeded' },
      };
      mockApiInstance.get.mockRejectedValue(rateLimitError);

      // Act & Assert
      await expect(apiService.getMetadata(jobId)).rejects.toMatchObject({
        type: ScholarFinderErrorType.EXTERNAL_API_ERROR,
        message: expect.stringContaining('Too many requests'),
        retryable: true,
        retryAfter: 60000,
      });
    });

    it('should handle server errors', async () => {
      // Arrange
      const jobId = 'test-job-123';
      const serverError = new Error('Internal Server Error');
      (serverError as any).response = {
        status: 500,
        data: { message: 'Internal server error' },
      };
      mockApiInstance.get.mockRejectedValue(serverError);

      // Act & Assert
      await expect(apiService.getMetadata(jobId)).rejects.toMatchObject({
        type: ScholarFinderErrorType.EXTERNAL_API_ERROR,
        message: expect.stringContaining('temporarily unavailable'),
        retryable: true,
      });
    });
  });

  describe('configuration', () => {
    it('should return current configuration', () => {
      // Act
      const config = apiService.getConfig();

      // Assert
      expect(config).toHaveProperty('baseURL');
      expect(config).toHaveProperty('timeout');
      expect(config).toHaveProperty('retries');
      expect(config).toHaveProperty('retryDelay');
    });

    it('should update configuration', () => {
      // Arrange
      const newConfig = {
        timeout: 180000,
        retries: 5,
      };

      // Act
      apiService.updateConfig(newConfig);
      const updatedConfig = apiService.getConfig();

      // Assert
      expect(updatedConfig.timeout).toBe(180000);
      expect(updatedConfig.retries).toBe(5);
    });

    // Tests for Requirements 1.1, 1.2, 2.1, 2.2, 2.3
    describe('ScholarFinderApiService configuration integration', () => {
      it('should use config.scholarFinderApiUrl as default baseURL', () => {
        // Arrange & Act
        const service = new ScholarFinderApiService();
        const config = service.getConfig();

        // Assert - Should use the configured URL from environment
        expect(config.baseURL).toBe('http://192.168.61.60:8000');
      });

      it('should allow custom configuration to override default', () => {
        // Arrange
        const customUrl = 'https://custom-api.example.com:9000';

        // Act
        const service = new ScholarFinderApiService({ baseURL: customUrl });
        const config = service.getConfig();

        // Assert - Custom URL should override default
        expect(config.baseURL).toBe(customUrl);
      });

      it('should successfully instantiate service with default config', () => {
        // Act
        const service = new ScholarFinderApiService();

        // Assert - Service should be created successfully
        expect(service).toBeDefined();
        expect(service.getConfig).toBeDefined();
        expect(typeof service.uploadManuscript).toBe('function');
      });

      it('should successfully instantiate service with custom config', () => {
        // Arrange
        const customConfig = {
          baseURL: 'https://custom.example.com',
          timeout: 90000,
          retries: 5,
          retryDelay: 3000,
        };

        // Act
        const service = new ScholarFinderApiService(customConfig);
        const config = service.getConfig();

        // Assert - Service should be created with custom config
        expect(service).toBeDefined();
        expect(config.baseURL).toBe(customConfig.baseURL);
        expect(config.timeout).toBe(customConfig.timeout);
        expect(config.retries).toBe(customConfig.retries);
        expect(config.retryDelay).toBe(customConfig.retryDelay);
      });

      it('should merge partial custom config with defaults', () => {
        // Arrange
        const partialConfig = {
          timeout: 150000,
        };

        // Act
        const service = new ScholarFinderApiService(partialConfig);
        const config = service.getConfig();

        // Assert - Custom timeout, default other values
        expect(config.baseURL).toBe('http://192.168.61.60:8000'); // Default from config
        expect(config.timeout).toBe(150000); // Custom
        expect(config.retries).toBe(3); // Default
        expect(config.retryDelay).toBe(2000); // Default
      });
    });

    it('should have correct timeout configured', () => {
      // Act
      const config = apiService.getConfig();

      // Assert
      expect(config.timeout).toBe(120000); // 2 minutes
    });

    it('should have correct retry configuration', () => {
      // Act
      const config = apiService.getConfig();

      // Assert
      expect(config.retries).toBe(3);
      expect(config.retryDelay).toBe(2000);
    });
  });

  describe('API endpoints verification', () => {
    it('should have all 9 required API endpoints implemented', () => {
      // Verify all methods exist
      expect(typeof apiService.uploadManuscript).toBe('function');
      expect(typeof apiService.getMetadata).toBe('function');
      expect(typeof apiService.enhanceKeywords).toBe('function');
      expect(typeof apiService.generateKeywordString).toBe('function');
      expect(typeof apiService.searchDatabases).toBe('function');
      expect(typeof apiService.addManualAuthor).toBe('function');
      expect(typeof apiService.validateAuthors).toBe('function');
      expect(typeof apiService.getValidationStatus).toBe('function');
      expect(typeof apiService.getRecommendations).toBe('function');
    });
  });

  describe('error type coverage', () => {
    it('should have all required error types defined', () => {
      // Verify all error types exist
      expect(ScholarFinderErrorType.UPLOAD_ERROR).toBeDefined();
      expect(ScholarFinderErrorType.METADATA_ERROR).toBeDefined();
      expect(ScholarFinderErrorType.KEYWORD_ERROR).toBeDefined();
      expect(ScholarFinderErrorType.SEARCH_ERROR).toBeDefined();
      expect(ScholarFinderErrorType.VALIDATION_ERROR).toBeDefined();
      expect(ScholarFinderErrorType.EXTERNAL_API_ERROR).toBeDefined();
      expect(ScholarFinderErrorType.TIMEOUT_ERROR).toBeDefined();
      expect(ScholarFinderErrorType.FILE_FORMAT_ERROR).toBeDefined();
      expect(ScholarFinderErrorType.NETWORK_ERROR).toBeDefined();
      expect(ScholarFinderErrorType.AUTHENTICATION_ERROR).toBeDefined();
    });
  });
});