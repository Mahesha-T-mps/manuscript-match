/**
 * ScholarFinder External API Service
 * Handles all communication with the external AWS Lambda APIs for the 9-step workflow
 */

import { z } from 'zod';
import { ApiService } from '../../../services/apiService';
import { config } from '../../../lib/config';
import type {
  UploadResponse,
  MetadataResponse,
  KeywordEnhancementResponse,
  KeywordStringResponse,
  DatabaseSearchResponse,
  ManualAuthorResponse,
  ManualAuthorSearchResponse,
  ValidationResponse,
  RecommendationsResponse,
  KeywordSelection,
  DatabaseSelection,
  ManualAuthorRequest,
  ApiErrorResponse
} from '../types/api';

/**
 * Configuration for ScholarFinder external APIs
 */
interface ScholarFinderApiConfig {
  baseURL: string;
  timeout: number;
  retries: number;
  retryDelay: number;
}

/**
 * Error types specific to ScholarFinder API
 */
export enum ScholarFinderErrorType {
  UPLOAD_ERROR = 'UPLOAD_ERROR',
  METADATA_ERROR = 'METADATA_ERROR',
  KEYWORD_ERROR = 'KEYWORD_ERROR',
  SEARCH_ERROR = 'SEARCH_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  FILE_FORMAT_ERROR = 'FILE_FORMAT_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR'
}

export interface ScholarFinderError {
  type: ScholarFinderErrorType;
  message: string;
  details?: any;
  retryable: boolean;
  retryAfter?: number;
}

/**
 * Zod schemas for API response validation
 */
const UploadResponseSchema = z.object({
  message: z.string(),
  data: z.array(z.object({
    job_id: z.string(),
    file_name: z.string(),
    timestamp: z.string(),
    heading: z.string(),
    authors: z.array(z.string()),
    affiliations: z.array(z.string()),
    keywords: z.string(),
    abstract: z.string(),
    author_aff_map: z.record(z.string())
  }))
});

const MetadataResponseSchema = z.object({
  message: z.string(),
  job_id: z.string(),
  data: z.object({
    heading: z.string(),
    authors: z.array(z.string()),
    affiliations: z.array(z.string()),
    keywords: z.string(),
    abstract: z.string(),
    author_aff_map: z.record(z.string())
  })
});

const KeywordEnhancementResponseSchema = z.object({
  message: z.string(),
  job_id: z.string(),
  data: z.object({
    mesh_terms: z.array(z.string()),
    broader_terms: z.array(z.string()),
    primary_focus: z.array(z.string()),
    secondary_focus: z.array(z.string()),
    additional_primary_keywords: z.array(z.string()),
    additional_secondary_keywords: z.array(z.string()),
    all_primary_focus_list: z.array(z.string()),
    all_secondary_focus_list: z.array(z.string())
  })
});

const KeywordStringResponseSchema = z.object({
  message: z.string(),
  job_id: z.string(),
  data: z.object({
    search_string: z.string(),
    primary_keywords_used: z.array(z.string()),
    secondary_keywords_used: z.array(z.string())
  })
});

const ReviewerSchema = z.object({
  reviewer: z.string(),
  email: z.string(),
  aff: z.string(),
  city: z.string(),
  country: z.string(),
  Total_Publications: z.number(),
  English_Pubs: z.number(),
  'Publications (last 10 years)': z.number(),
  'Relevant Publications (last 5 years)': z.number(),
  'Publications (last 2 years)': z.number(),
  'Publications (last year)': z.number(),
  Clinical_Trials_no: z.number(),
  Clinical_study_no: z.number(),
  Case_reports_no: z.number(),
  Retracted_Pubs_no: z.number(),
  TF_Publications_last_year: z.number(),
  coauthor: z.boolean(),
  country_match: z.string(),
  aff_match: z.string(),
  conditions_met: z.number(),
  conditions_satisfied: z.string()
});

const DatabaseSearchResponseSchema = z.object({
  message: z.string(),
  job_id: z.string(),
  data: z.object({
    total_reviewers: z.number(),
    databases_searched: z.array(z.string()),
    search_status: z.record(z.enum(['success', 'failed', 'in_progress'])),
    preview_reviewers: z.array(ReviewerSchema).optional()
  })
});

const ManualAuthorSchema = z.object({
  name: z.string(),
  email: z.string().optional(),
  affiliation: z.string(),
  country: z.string().optional(),
  publications: z.number().optional()
});

const ManualAuthorResponseSchema = z.object({
  message: z.string(),
  job_id: z.string(),
  data: z.object({
    found_authors: z.array(ManualAuthorSchema),
    search_term: z.string(),
    total_found: z.number()
  })
});

const ValidationSummarySchema = z.object({
  total_authors: z.number(),
  authors_validated: z.number(),
  conditions_applied: z.array(z.string()),
  average_conditions_met: z.number()
});

const ValidationResponseSchema = z.object({
  message: z.string(),
  job_id: z.string(),
  data: z.object({
    validation_status: z.enum(['in_progress', 'completed', 'failed']),
    progress_percentage: z.number(),
    estimated_completion_time: z.string().optional(),
    total_authors_processed: z.number(),
    validation_criteria: z.array(z.string()),
    summary: ValidationSummarySchema.optional()
  })
});

const RecommendationsResponseSchema = z.object({
  message: z.string(),
  job_id: z.string(),
  data: z.object({
    reviewers: z.array(ReviewerSchema),
    total_count: z.number(),
    validation_summary: ValidationSummarySchema
  })
});

/**
 * ScholarFinder API Service Class
 * Handles all external API calls with proper error handling, validation, and retry logic
 */
export class ScholarFinderApiService {
  private apiService: ApiService;
  private config: ScholarFinderApiConfig;
  
  // Global singleton pattern to prevent duplicate manual author searches
  private static ongoingManualAuthorSearches = new Map<string, Promise<any>>();
  // Synchronous lock to prevent race conditions
  private static searchLocks = new Set<string>();

  constructor(apiConfig?: Partial<ScholarFinderApiConfig>) {
    // Use external API configuration pointing to the ScholarFinder Lambda API
    const defaultConfig: ScholarFinderApiConfig = {
      baseURL: config.scholarFinderApiUrl, // Use configured URL from environment
      timeout: config.apiTimeout * 6, // Use 6x the configured timeout for long-running operations (36 minutes for 600000ms config)
      retries: 3,
      retryDelay: 2000
    };

    this.config = { ...defaultConfig, ...apiConfig };
    
    // Create a separate API service instance for external calls
    this.apiService = new ApiService({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      retries: this.config.retries
    });
  }

  /**
   * Handle and transform API errors into ScholarFinder-specific errors
   */
  private handleApiError(error: any, operation: string): ScholarFinderError {
    // Network or connection errors
    if (!error.response) {
      if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
        return {
          type: ScholarFinderErrorType.NETWORK_ERROR,
          message: `Network connection failed during ${operation}. Please check your internet connection and try again.`,
          details: error.message,
          retryable: true,
          retryAfter: 5000
        };
      }
      
      return {
        type: ScholarFinderErrorType.EXTERNAL_API_ERROR,
        message: `Failed to connect to ScholarFinder API during ${operation}. Please check your internet connection and try again.`,
        details: error.message,
        retryable: true,
        retryAfter: 5000
      };
    }

    const { status, data } = error.response;

    // Timeout errors
    if (error.code === 'ECONNABORTED') {
      return {
        type: ScholarFinderErrorType.TIMEOUT_ERROR,
        message: `The ${operation} operation timed out. This may be due to large file processing or high server load.`,
        details: error.message,
        retryable: true,
        retryAfter: 10000
      };
    }

    // 504 Gateway Timeout - special handling for long-running operations
    if (status === 504) {
      return {
        type: ScholarFinderErrorType.TIMEOUT_ERROR,
        message: `${operation} is taking longer than expected but may still be processing in the background. You can try checking the results later or proceed to the next step.`,
        details: data,
        retryable: false // Don't retry 504s automatically
      };
    }

    // File format errors (400 with specific message)
    if (status === 400 && data?.message?.includes('file format')) {
      return {
        type: ScholarFinderErrorType.FILE_FORMAT_ERROR,
        message: 'Unsupported file format. Please upload a .doc or .docx file.',
        details: data,
        retryable: false
      };
    }

    // Rate limiting
    if (status === 429) {
      const retryAfter = parseInt(error.response.headers['retry-after'] || '60') * 1000;
      return {
        type: ScholarFinderErrorType.EXTERNAL_API_ERROR,
        message: `Too many requests to ScholarFinder API. Please wait ${retryAfter / 1000} seconds before trying again.`,
        details: data,
        retryable: true,
        retryAfter
      };
    }

    // Authentication errors
    if (status === 401 || status === 403) {
      return {
        type: ScholarFinderErrorType.AUTHENTICATION_ERROR,
        message: 'Authentication failed. Please log in again to continue.',
        details: data,
        retryable: false
      };
    }

    // Server errors
    if (status >= 500) {
      return {
        type: ScholarFinderErrorType.EXTERNAL_API_ERROR,
        message: `ScholarFinder API is temporarily unavailable during ${operation}. Please try again in a few minutes.`,
        details: data,
        retryable: true,
        retryAfter: 30000
      };
    }

    // Client errors
    return {
      type: ScholarFinderErrorType.EXTERNAL_API_ERROR,
      message: data?.message || `An error occurred during ${operation}. Please try again.`,
      details: data,
      retryable: status >= 500
    };
  }

  /**
   * Validate API response using Zod schema
   */
  private validateResponse<T>(data: any, schema: z.ZodSchema<any>, operation: string): T {
    try {
      // Validate the structure but return the original data with proper typing
      schema.parse(data);
      return data as T;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw {
          type: ScholarFinderErrorType.EXTERNAL_API_ERROR,
          message: `Invalid response format from ScholarFinder API during ${operation}`,
          details: error.errors,
          retryable: false
        } as ScholarFinderError;
      }
      throw error;
    }
  }

  /**
   * Make API request with retry logic and error handling
   */
  private async makeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any,
    schema?: z.ZodSchema<T>,
    operation?: string
  ): Promise<T> {
    const maxRetries = this.config.retries;
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        let response;
        
        switch (method) {
          case 'GET':
            response = await this.apiService.get(endpoint, data);
            break;
          case 'POST':
            response = await this.apiService.post(endpoint, data);
            break;
          case 'PUT':
            response = await this.apiService.put(endpoint, data);
            break;
          case 'DELETE':
            response = await this.apiService.delete(endpoint);
            break;
        }

        // Validate response if schema provided
        if (schema && operation) {
          return this.validateResponse(response.data || response, schema, operation);
        }

        return (response.data || response) as T;
      } catch (error) {
        lastError = error;
        
        // Don't retry on the last attempt
        if (attempt === maxRetries) {
          break;
        }

        // Check if we should retry this error
        const scholarFinderError = this.handleApiError(error, operation || 'API call');
        if (!scholarFinderError.retryable) {
          throw scholarFinderError;
        }

        // Wait before retrying with exponential backoff
        const delay = Math.min(
          this.config.retryDelay * Math.pow(2, attempt),
          30000 // Max 30 seconds
        );
        
        if (config.enableDebugLogging) {
          console.log(`[ScholarFinder API] Retrying ${operation} in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        }

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // All retries failed
    const scholarFinderError = this.handleApiError(lastError, operation || 'API call');
    throw scholarFinderError;
  }

  /**
   * Step 1: Upload manuscripts and extract metadata
   */
  async uploadManuscripts(files: File[], processId?: string, onProgress?: (progress: number) => void): Promise<UploadResponse> {
    console.log('[ScholarFinderAPI] uploadManuscripts called with files:', files.map(f => f.name));
    if (!files || files.length === 0) {
      throw {
        type: ScholarFinderErrorType.FILE_FORMAT_ERROR,
        message: 'No files provided for upload',
        retryable: false
      } as ScholarFinderError;
    }

    // Validate each file
    const allowedTypes = ['.doc', '.docx'];
    const maxSize = 100 * 1024 * 1024; // 100MB per file
    
    for (const file of files) {
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!allowedTypes.includes(fileExtension)) {
        throw {
          type: ScholarFinderErrorType.FILE_FORMAT_ERROR,
          message: `Unsupported file format: ${fileExtension} in file "${file.name}". Please upload .doc or .docx files only.`,
          retryable: false
        } as ScholarFinderError;
      }

      if (file.size > maxSize) {
        throw {
          type: ScholarFinderErrorType.FILE_FORMAT_ERROR,
          message: `File "${file.name}" size too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum allowed size is 100MB per file.`,
          retryable: false
        } as ScholarFinderError;
      }
    }

    try {
      // Calculate extended timeout for upload + metadata extraction
      // Base timeout: 10 minutes, plus 2 minutes per file, plus 2 minutes per 10MB total size
      const baseTimeout = 10 * 60 * 1000; // 10 minutes
      const totalSizeInMB = files.reduce((sum, file) => sum + file.size, 0) / (1024 * 1024);
      const fileCountTimeout = files.length * 2 * 60 * 1000; // 2 minutes per file
      const sizeTimeout = Math.ceil(totalSizeInMB / 10) * 2 * 60 * 1000; // 2 minutes per 10MB
      const uploadTimeout = baseTimeout + fileCountTimeout + sizeTimeout;

      console.log(`[ScholarFinderAPI] Upload timeout calculated: ${uploadTimeout}ms (${uploadTimeout/1000/60} minutes) for ${files.length} files (${totalSizeInMB.toFixed(1)}MB total)`);

      // Build URL with query parameter if processId is provided
      let url = '/upload_extract_metadata';
      if (processId) {
        url += `?process_id=${encodeURIComponent(processId)}`;
      }
      console.log("Upload URL:", url);

      // Create a temporary API service instance with extended timeout for this upload
      const uploadApiService = new ApiService({
        baseURL: this.config.baseURL,
        timeout: uploadTimeout, // Use calculated extended timeout
        retries: 0 // No retries for file uploads
      });

      // Use uploadFiles method with extended timeout for multiple files
      const response = await uploadApiService.uploadFiles<UploadResponse>(
        url,
        files,
        onProgress
      );

      return (response.data || response) as UploadResponse;
    } catch (error) {
      const scholarFinderError = this.handleApiError(error, 'manuscripts upload');
      throw scholarFinderError;
    }
  }

  /**
   * Step 1: Upload single manuscript and extract metadata (backward compatibility)
   */
  async uploadManuscript(file: File, processId?: string, onProgress?: (progress: number) => void): Promise<UploadResponse> {
    return this.uploadManuscripts([file], processId, onProgress);
  }

  /**
   * Step 2: Get extracted metadata for review
   */
  async getMetadata(jobId: string): Promise<MetadataResponse> {
    console.log('[ScholarFinderApiService.getMetadata] Called with jobId:', jobId);
    
    if (!jobId) {
      console.error('[ScholarFinderApiService.getMetadata] No jobId provided');
      throw {
        type: ScholarFinderErrorType.METADATA_ERROR,
        message: 'Job ID is required to retrieve metadata',
        retryable: false
      } as ScholarFinderError;
    }

    console.log('[ScholarFinderApiService.getMetadata] Making request to /metadata_extraction');
    const response = await this.makeRequest<MetadataResponse>(
      'GET',
      `/metadata_extraction?job_id=${jobId}`,
      undefined,
      undefined,
      'metadata retrieval'
    );
    
    console.log('[ScholarFinderApiService.getMetadata] Response received:', response);
    return response;
  }

  /**
   * Step 3: Enhance keywords using AI
   * Calls the /keyword_enhancement endpoint with job_id as query parameter
   */
  async enhanceKeywords(jobId: string): Promise<KeywordEnhancementResponse> {
    if (!jobId) {
      throw {
        type: ScholarFinderErrorType.KEYWORD_ERROR,
        message: 'Job ID is required for keyword enhancement',
        retryable: false
      } as ScholarFinderError;
    }

    // For keyword enhancement, we need the full response because combined keywords are at the top level
    // Don't use makeRequest as it extracts response.data which doesn't contain combined_primary_keywords
    try {
      const response = await this.apiService.post(
        `/keyword_enhancement?job_id=${encodeURIComponent(jobId)}`
      );
      
      console.log('[ScholarFinderAPI] Full keyword enhancement response:', response);
      
      // Return the full response data, not just response.data
      return response as any;
    } catch (error) {
      const scholarFinderError = this.handleApiError(error, 'keyword enhancement');
      throw scholarFinderError;
    }
  }

  /**
   * Step 3b: Generate search string from selected keywords
   */
  async generateKeywordString(jobId: string, keywords: KeywordSelection): Promise<KeywordStringResponse> {
    if (!jobId) {
      throw {
        type: ScholarFinderErrorType.KEYWORD_ERROR,
        message: 'Job ID is required for keyword string generation',
        retryable: false
      } as ScholarFinderError;
    }

    if (!keywords.primary_keywords_input && !keywords.secondary_keywords_input) {
      throw {
        type: ScholarFinderErrorType.KEYWORD_ERROR,
        message: 'At least one primary or secondary keyword must be selected',
        retryable: false
      } as ScholarFinderError;
    }

    // The API expects application/x-www-form-urlencoded format
    // Use URLSearchParams for proper form encoding
    const formData = new URLSearchParams();
    formData.append('primary_keywords_input', keywords.primary_keywords_input || '');
    formData.append('secondary_keywords_input', keywords.secondary_keywords_input || '');

    try {
      // Use request method directly to pass custom headers
      const response = await this.apiService.request<KeywordStringResponse>({
        method: 'POST',
        url: `/keyword_string_generator?job_id=${encodeURIComponent(jobId)}`,
        data: formData.toString(),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      return (response.data || response) as KeywordStringResponse;
    } catch (error) {
      const scholarFinderError = this.handleApiError(error, 'keyword string generation');
      throw scholarFinderError;
    }
  }

  /**
   * Step 4: Search academic databases (Async - starts background job)
   * This method initiates the search and returns immediately with job status
   */
  async searchDatabases(jobId: string, databases: DatabaseSelection): Promise<DatabaseSearchResponse> {
    if (!jobId) {
      throw {
        type: ScholarFinderErrorType.SEARCH_ERROR,
        message: 'Job ID is required for database search',
        retryable: false
      } as ScholarFinderError;
    }

    if (!databases.selected_websites || databases.selected_websites.length === 0) {
      throw {
        type: ScholarFinderErrorType.SEARCH_ERROR,
        message: 'At least one database must be selected for search',
        retryable: false
      } as ScholarFinderError;
    }

    // The API expects application/x-www-form-urlencoded format
    // job_id as query parameter, selected_websites as form data (comma-separated)
    const formData = new URLSearchParams();
    const websitesString = databases.selected_websites.join(',');
    formData.append('selected_websites', websitesString);

    console.log('[ScholarFinderAPI] Database search request:', {
      jobId,
      websites: databases.selected_websites,
      websitesString,
      formData: formData.toString()
    });

    try {
      // Use extended timeout for database search - this operation takes 20-30 minutes
      const response = await this.apiService.request<DatabaseSearchResponse>({
        method: 'POST',
        url: `/database_search?job_id=${encodeURIComponent(jobId)}`,
        data: formData.toString(),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 2400000, // 40 minutes timeout for database search (20-30 min typical + buffer)
        retries: 0 // No retries for long-running operations
      });
      
      console.log('[ScholarFinderAPI] Database search initiated:', response);
      
      // If we get a successful response, the search completed immediately
      const transformedResponse: DatabaseSearchResponse = {
        message: 'Database search completed successfully',
        job_id: jobId,
        data: {
          total_reviewers: response.reviewers_count || 0,
          databases_searched: databases.selected_websites,
          search_status: databases.selected_websites.reduce((acc, db) => {
            acc[db] = 'success';
            return acc;
          }, {} as Record<string, 'success' | 'failed' | 'in_progress'>),
          preview_reviewers: response.author_email_affiliation_preview?.slice(0, 5).map(author => ({
            reviewer: author.author || '',
            email: author.email || '',
            aff: author.aff || '',
            city: author.city || '',
            country: author.country || '',
            Total_Publications: 0,
            English_Pubs: 0,
            'Publications (last 10 years)': 0,
            'Relevant Publications (last 5 years)': 0,
            'Publications (last 2 years)': 0,
            'Publications (last year)': 0,
            Clinical_Trials_no: 0,
            Clinical_study_no: 0,
            Case_reports_no: 0,
            Retracted_Pubs_no: 0,
            TF_Publications_last_year: 0,
            coauthor: false,
            country_match: '',
            aff_match: '',
            conditions_met: 0,
            conditions_satisfied: ''
          })) || []
        }
      };
      
      return transformedResponse;
    } catch (error) {
      console.error('[ScholarFinderAPI] Database search error:', error);
      
      // Handle 504 Gateway Timeout specially - this means search is running in background
      const is504Timeout = (
        (error as any)?.userError?.type === 'GATEWAY_TIMEOUT' || 
        (error as any)?.type === 'GATEWAY_TIMEOUT' ||
        (error as any)?.type === 'TIMEOUT_ERROR' ||
        (error as any)?.details?.status === 504 ||
        (error as any)?.response?.status === 504 ||
        (error as any)?.status === 504 ||
        error?.message?.includes('504') ||
        error?.message?.includes('Gateway Timeout')
      );
      
      if (is504Timeout) {
        console.warn('[ScholarFinderAPI] 504 timeout - database search initiated and running in background');
        
        // Return a "processing" response - search was initiated successfully
        return {
          message: 'Database search initiated successfully and is running in background',
          job_id: jobId,
          data: {
            total_reviewers: 0,
            databases_searched: databases.selected_websites,
            search_status: databases.selected_websites.reduce((acc, db) => {
              acc[db] = 'in_progress';
              return acc;
            }, {} as Record<string, 'success' | 'failed' | 'in_progress'>),
            preview_reviewers: []
          }
        } as DatabaseSearchResponse;
      }
      
      const scholarFinderError = this.handleApiError(error, 'database search');
      throw scholarFinderError;
    }
  }

  /**
   * Step 4b: Get database search status (for polling)
   */
  async getDatabaseSearchStatus(jobId: string): Promise<DatabaseSearchResponse> {
    if (!jobId) {
      throw {
        type: ScholarFinderErrorType.SEARCH_ERROR,
        message: 'Job ID is required to check database search status',
        retryable: false
      } as ScholarFinderError;
    }

    try {
      const response = await this.apiService.request<DatabaseSearchResponse>({
        method: 'GET',
        url: `/database_search_status?job_id=${encodeURIComponent(jobId)}`,
        timeout: 10000 // 10 seconds for status check
      });
      
      return response as any;
    } catch (error) {
      const scholarFinderError = this.handleApiError(error, 'database search status check');
      throw scholarFinderError;
    }
  }

  /**
   * Step 5: Add manual author by name search
   */
  async addManualAuthor(jobId: string, authorName: string): Promise<ManualAuthorResponse> {
    console.log('[ScholarFinderApiService.addManualAuthor] 🔍 Called with:', { jobId, authorName });
    console.log('[ScholarFinderApiService.addManualAuthor] ⏰ Timestamp:', new Date().toISOString());
    console.log('[ScholarFinderApiService.addManualAuthor] 📊 Call stack:', new Error().stack);
    
    if (!jobId) {
      console.error('[ScholarFinderApiService.addManualAuthor] ❌ No job ID provided');
      throw {
        type: ScholarFinderErrorType.SEARCH_ERROR,
        message: 'Job ID is required for manual author addition',
        retryable: false
      } as ScholarFinderError;
    }

    if (!authorName || authorName.trim().length < 2) {
      console.error('[ScholarFinderApiService.addManualAuthor] ❌ Invalid author name:', authorName);
      throw {
        type: ScholarFinderErrorType.SEARCH_ERROR,
        message: 'Author name must be at least 2 characters long',
        retryable: false
      } as ScholarFinderError;
    }

    // Create a unique key for this search to prevent global duplicates
    const searchKey = `${jobId}-${authorName.trim().toLowerCase()}`;
    
    // SYNCHRONOUS LOCK CHECK - This happens immediately, no async operations
    if (ScholarFinderApiService.searchLocks.has(searchKey)) {
      console.log('[ScholarFinderApiService.addManualAuthor] 🚫 SYNCHRONOUS LOCK detected, rejecting immediately');
      console.log('[ScholarFinderApiService.addManualAuthor] 🔑 Locked key:', searchKey);
      console.log('[ScholarFinderApiService.addManualAuthor] 📊 All locks:', Array.from(ScholarFinderApiService.searchLocks));
      throw {
        type: ScholarFinderErrorType.SEARCH_ERROR,
        message: 'Duplicate search request blocked by synchronous lock',
        retryable: false
      } as ScholarFinderError;
    }
    
    // SET SYNCHRONOUS LOCK IMMEDIATELY
    ScholarFinderApiService.searchLocks.add(searchKey);
    console.log('[ScholarFinderApiService.addManualAuthor] 🔒 SYNCHRONOUS LOCK set for key:', searchKey);
    
    // Check if this exact search is already in progress globally
    if (ScholarFinderApiService.ongoingManualAuthorSearches.has(searchKey)) {
      console.log('[ScholarFinderApiService.addManualAuthor] 🚫 GLOBAL duplicate search detected, returning existing promise');
      console.log('[ScholarFinderApiService.addManualAuthor] 🔑 Search key:', searchKey);
      console.log('[ScholarFinderApiService.addManualAuthor] 📊 Ongoing searches:', Array.from(ScholarFinderApiService.ongoingManualAuthorSearches.keys()));
      // Remove the lock since we're returning existing promise
      ScholarFinderApiService.searchLocks.delete(searchKey);
      return ScholarFinderApiService.ongoingManualAuthorSearches.get(searchKey)!;
    }

    console.log('[ScholarFinderApiService.addManualAuthor] 🚀 Starting new GLOBAL search');
    console.log('[ScholarFinderApiService.addManualAuthor] 🔑 Search key:', searchKey);

    // The API expects application/x-www-form-urlencoded format
    const formData = new URLSearchParams();
    formData.append('author_name', authorName.trim());

    console.log('[ScholarFinderApiService.addManualAuthor] 📤 Making API request to /manual_authors');
    console.log('[ScholarFinderApiService.addManualAuthor] 🔗 URL:', `/manual_authors?job_id=${encodeURIComponent(jobId)}`);
    
    // Create the search promise
    const searchPromise = this.apiService.request<ManualAuthorResponse>({
      method: 'POST',
      url: `/manual_authors?job_id=${encodeURIComponent(jobId)}`,
      data: formData.toString(),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }).then(response => {
      console.log('[ScholarFinderApiService.addManualAuthor] ✅ API request successful:', response);
      return response as any;
    }).catch(error => {
      console.error('[ScholarFinderApiService.addManualAuthor] ❌ API request failed:', error);
      const scholarFinderError = this.handleApiError(error, 'manual author search');
      console.error('[ScholarFinderApiService.addManualAuthor] 🔥 Throwing error:', scholarFinderError);
      throw scholarFinderError;
    }).finally(() => {
      // Remove from global ongoing searches when complete
      ScholarFinderApiService.ongoingManualAuthorSearches.delete(searchKey);
      // Remove synchronous lock
      ScholarFinderApiService.searchLocks.delete(searchKey);
      console.log('[ScholarFinderApiService.addManualAuthor] 🧹 Cleaned up GLOBAL search key:', searchKey);
      console.log('[ScholarFinderApiService.addManualAuthor] 🔓 Released SYNCHRONOUS LOCK for key:', searchKey);
      console.log('[ScholarFinderApiService.addManualAuthor] 📊 Remaining searches:', Array.from(ScholarFinderApiService.ongoingManualAuthorSearches.keys()));
      console.log('[ScholarFinderApiService.addManualAuthor] 📊 Remaining locks:', Array.from(ScholarFinderApiService.searchLocks));
    });
    
    // Store the promise globally to prevent duplicates
    ScholarFinderApiService.ongoingManualAuthorSearches.set(searchKey, searchPromise);
    console.log('[ScholarFinderApiService.addManualAuthor] 💾 Stored GLOBAL search promise for key:', searchKey);
    
    return searchPromise;
  }

  /**
   * Step 5b: Search for manual author by name (new correct endpoint)
   * This method uses the actual /manual_authors endpoint that returns author_data
   * with name, email, aff, city, country fields
   */
  async searchManualAuthor(jobId: string, authorName: string): Promise<ManualAuthorSearchResponse> {
    if (!jobId) {
      const err = new Error('Job ID is required for manual author search');
      (err as any).type = ScholarFinderErrorType.SEARCH_ERROR;
      (err as any).retryable = false;
      throw err;
    }

    if (!authorName || authorName.trim().length < 2) {
      const err = new Error('Author name must be at least 2 characters long');
      (err as any).type = ScholarFinderErrorType.SEARCH_ERROR;
      (err as any).retryable = false;
      throw err;
    }

    // The API expects application/x-www-form-urlencoded format
    // job_id as query parameter, author_name as form data
    const formData = new URLSearchParams();
    formData.append('author_name', authorName.trim());

    console.log('[ScholarFinderAPI] Manual author search request:', {
      jobId,
      authorName: authorName.trim(),
      url: `/manual_authors?job_id=${encodeURIComponent(jobId)}`,
      formData: formData.toString(),
      retries: 0  // ← Verify this is being set
    });

    try {
      // Use extended timeout for PubMed search (60 seconds as per requirements)
      // IMPORTANT: Manual author search should NEVER retry automatically
      // Set retries: 0 to disable automatic retries at the HTTP level
      const requestConfig = {
        method: 'POST' as const,
        url: `/manual_authors?job_id=${encodeURIComponent(jobId)}`,
        data: formData.toString(),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 60000, // 60 seconds for PubMed search
        retries: 0 // Disable retries - manual search should only be attempted once
      };
      
      console.log('[ScholarFinderAPI] Request config retries:', requestConfig.retries);
      
      const response = await this.apiService.request<ManualAuthorSearchResponse>(requestConfig);
      
      console.log('[ScholarFinderAPI] Manual author search raw response:', response);
      console.log('[ScholarFinderAPI] Response type:', typeof response);
      console.log('[ScholarFinderAPI] Response keys:', Object.keys(response || {}));
      
      // The apiService.request returns response.data, which is the actual API response
      // So response should already be { message, job_id, author_data }
      return response as any;
    } catch (error) {
      console.error('[ScholarFinderAPI] Manual author search error:', error);
      
      // Handle 404 specifically for author not found
      if (error.response?.status === 404) {
        const errorMessage = error.response?.data?.error || `Author '${authorName}' not found in PubMed database. Please check the spelling or try a different name.`;
        
        // Create a proper Error instance with message property
        const err = new Error(errorMessage);
        // Preserve error type and details as additional properties
        (err as any).type = ScholarFinderErrorType.SEARCH_ERROR;
        (err as any).details = error.response?.data;
        (err as any).retryable = false;
        
        throw err;
      }
      
      const scholarFinderError = this.handleApiError(error, 'manual author search');
      
      // Convert ScholarFinderError to proper Error instance
      const err = new Error(scholarFinderError.message);
      (err as any).type = scholarFinderError.type;
      (err as any).details = scholarFinderError.details;
      (err as any).retryable = scholarFinderError.retryable;
      if (scholarFinderError.retryAfter) {
        (err as any).retryAfter = scholarFinderError.retryAfter;
      }
      
      throw err;
    }
  }

  /**
   * Step 6: Validate authors against conflict rules
   * Note: This is a long-running process (up to 1 hour). 504 timeouts are expected and should be treated as "still processing"
   */
  async validateAuthors(jobId: string, selectedAuthors?: string[]): Promise<ValidationResponse> {
    if (!jobId) {
      throw {
        type: ScholarFinderErrorType.VALIDATION_ERROR,
        message: 'Job ID is required for author validation',
        retryable: false
      } as ScholarFinderError;
    }

    // Use direct API call without retries for validation (long-running process)
    try {
      console.log('[ScholarFinderApiService.validateAuthors] 🚀 Starting validation for jobId:', jobId);
      console.log('[ScholarFinderApiService.validateAuthors] 📋 Selected authors:', selectedAuthors);
      
      // Prepare form data if selected authors are provided
      let requestData: any = undefined;
      let headers: any = undefined;
      
      if (selectedAuthors && selectedAuthors.length > 0) {
        const formData = new URLSearchParams();
        formData.append('job_id', jobId);
        formData.append('selected_authors', JSON.stringify(selectedAuthors));
        requestData = formData.toString();
        headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
        console.log('[ScholarFinderApiService.validateAuthors] 🎯 Validating only selected authors:', selectedAuthors.length);
      }
      
      // Send job_id as query parameter (as expected by the Python API)
      const response = await this.apiService.request<ValidationResponse>({
        method: 'POST',
        url: `/validate_authors${!requestData ? `?job_id=${encodeURIComponent(jobId)}` : ''}`,
        data: requestData,
        headers: headers,
        timeout: 3600000, // 1 hour timeout for validation
        retries: 0 // No retries for validation
      });
      
      console.log('[ScholarFinderApiService.validateAuthors] ✅ Validation successful:', response);
      return response as any;
    } catch (error) {
      console.error('[ScholarFinderApiService.validateAuthors] ❌ Validation failed:', error);
      console.error('[ScholarFinderApiService.validateAuthors] 📊 Error details:', {
        message: error?.message,
        type: (error as any)?.type,
        userError: (error as any)?.userError,
        details: (error as any)?.details,
        response: (error as any)?.response,
        status: (error as any)?.status
      });
      
      // Handle 504 Gateway Timeout specially - this means validation is still running in background
      // Check multiple possible error structures for 504 timeout
      const is504Timeout = (
        (error as any)?.userError?.type === 'GATEWAY_TIMEOUT' || 
        (error as any)?.type === 'GATEWAY_TIMEOUT' ||
        (error as any)?.type === 'TIMEOUT_ERROR' ||
        (error as any)?.details?.status === 504 ||
        (error as any)?.response?.status === 504 ||
        (error as any)?.status === 504 ||
        (error as any)?.originalError?.response?.status === 504 ||
        error?.message?.includes('504') ||
        error?.message?.includes('Gateway Timeout') ||
        error?.message?.includes('A server error occurred')
      );
      
      if (is504Timeout) {
        console.warn('[ScholarFinderApiService.validateAuthors] ⏳ 504 timeout - validation still running in backend');
        
        // Return a "still processing" response instead of throwing an error
        return {
          message: 'Validation started successfully and is running in background',
          job_id: jobId,
          data: {
            validation_status: 'in_progress' as const,
            progress_percentage: 0,
            estimated_completion_time: 'Processing may take up to 1 hour',
            total_authors_processed: 0,
            validation_criteria: ['Publications (10 years)', 'English publications', 'No coauthorship', 'Different affiliation', 'Same country', 'Relevant publications (5 years)', 'Recent publications (2 years)', 'Low retracted publications', 'Conflict of Interest']
          }
        } as ValidationResponse;
      }
      
      const scholarFinderError = this.handleApiError(error, 'author validation');
      console.error('[ScholarFinderApiService.validateAuthors] 🔥 Throwing processed error:', scholarFinderError);
      throw scholarFinderError;
    }
  }

  /**
   * Filter selected authors - calls the new /filter_selected_authors endpoint
   */
  async filterSelectedAuthors(jobId: string, selectedAuthors: string[]): Promise<{
    job_id: string;
    selected_count: number;
    preview: any[];
  }> {
    if (!jobId) {
      throw {
        type: ScholarFinderErrorType.SEARCH_ERROR,
        message: 'Job ID is required for author filtering',
        retryable: false
      } as ScholarFinderError;
    }

    if (!selectedAuthors || selectedAuthors.length === 0) {
      throw {
        type: ScholarFinderErrorType.SEARCH_ERROR,
        message: 'At least one author must be selected',
        retryable: false
      } as ScholarFinderError;
    }

    try {
      console.log('[ScholarFinderApiService.filterSelectedAuthors] 🎯 Filtering authors:', selectedAuthors);
      
      // Prepare form data
      const formData = new URLSearchParams();
      selectedAuthors.forEach(author => {
        formData.append('selected_authors', author);
      });

      const response = await this.apiService.request<{
        job_id: string;
        selected_count: number;
        preview: any[];
      }>({
        method: 'POST',
        url: `/filter_selected_authors?job_id=${encodeURIComponent(jobId)}`,
        data: formData.toString(),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 30000 // 30 seconds timeout
      });
      
      console.log('[ScholarFinderApiService.filterSelectedAuthors] ✅ Authors filtered successfully:', response);
      return response as any;
    } catch (error) {
      console.error('[ScholarFinderApiService.filterSelectedAuthors] ❌ Error filtering authors:', error);
      const scholarFinderError = this.handleApiError(error, 'author filtering');
      throw scholarFinderError;
    }
  }

  /**
   * Step 6b: Get validation status (for polling during long-running validation)
   */
  async getValidationStatus(jobId: string): Promise<ValidationResponse> {
    if (!jobId) {
      throw {
        type: ScholarFinderErrorType.VALIDATION_ERROR,
        message: 'Job ID is required to check validation status',
        retryable: false
      } as ScholarFinderError;
    }

    const response = await this.makeRequest<ValidationResponse>(
      'GET',
      `/validation_status/${jobId}`,
      undefined,
      undefined,
      'validation status check'
    );
    
    return response;
  }

  /**
   * Step 7: Get reviewer recommendations
   * Sorts reviewers by conditions_met score in descending order (highest first)
   * to satisfy Requirement 14.2
   */
  async getRecommendations(jobId: string): Promise<RecommendationsResponse> {
    if (!jobId) {
      throw {
        type: ScholarFinderErrorType.EXTERNAL_API_ERROR,
        message: 'Job ID is required to retrieve recommendations',
        retryable: false
      } as ScholarFinderError;
    }

    console.log('[ScholarFinderApiService.getRecommendations] 🚀 Getting recommendations for jobId:', jobId);

    try {
      // Call the Python API endpoint
      const response = await this.apiService.request<{
        job_id: string;
        reviewer_count: number;
        reviewers: any[]; // Use any[] since we'll validate the structure
      }>({
        method: 'GET',
        url: `/recommended_reviewers?job_id=${encodeURIComponent(jobId)}`,
        timeout: 60000, // 1 minute timeout
        retries: 0 // No retries for recommendations
      });

      console.log('[ScholarFinderApiService.getRecommendations] ✅ Raw API response:', response);

      // Extract data from response (apiService.request returns response.data)
      const responseData = (response as any).data || response;
      const reviewers = responseData.reviewers || [];
      
      // Sort reviewers by conditions_met in descending order (highest scores first)
      // This ensures Requirement 14.2 is satisfied: reviewers SHALL be sorted by score
      reviewers.sort((a, b) => b.conditions_met - a.conditions_met);

      const transformedResponse: RecommendationsResponse = {
        message: 'Recommendations retrieved successfully',
        job_id: responseData.job_id,
        data: {
          reviewers: reviewers,
          total_count: responseData.reviewer_count || reviewers.length,
          validation_summary: {
            total_authors: reviewers.length,
            authors_validated: reviewers.length,
            conditions_applied: [
              'Publications (last 10 years) >= 8',
              'English publications > 50%',
              'Not a coauthor',
              'No affiliation conflict',
              'Country match',
              'Relevant publications (last 5 years) >= 3',
              'Publications (last 2 years) >= 1',
              'Retracted publications <= 1'
            ],
            average_conditions_met: reviewers.length > 0 
              ? reviewers.reduce((sum, r) => sum + r.conditions_met, 0) / reviewers.length 
              : 0
          }
        }
      };

      console.log('[ScholarFinderApiService.getRecommendations] ✅ Transformed response:', transformedResponse);
      return transformedResponse;
    } catch (error) {
      console.error('[ScholarFinderApiService.getRecommendations] ❌ Failed to get recommendations:', error);
      
      // Handle 404 as "NOT READY" - validation process hasn't completed yet
      if (error.response?.status === 404) {
        console.log('[ScholarFinderApiService.getRecommendations] 📋 404 received - recommendations not ready yet');
        return {
          message: 'Recommendations not ready - validation still in progress',
          job_id: jobId,
          data: {
            reviewers: [],
            total_count: 0,
            validation_summary: {
              total_authors: 0,
              authors_validated: 0,
              conditions_applied: [],
              average_conditions_met: 0
            }
          }
        } as RecommendationsResponse;
      }
      
      const scholarFinderError = this.handleApiError(error, 'recommendations retrieval');
      throw scholarFinderError;
    }
  }

  /**
   * Utility method to check if a job exists and is valid
   */
  async checkJobStatus(jobId: string): Promise<{ exists: boolean; status: string }> {
    if (!jobId) {
      throw {
        type: ScholarFinderErrorType.EXTERNAL_API_ERROR,
        message: 'Job ID is required to check status',
        retryable: false
      } as ScholarFinderError;
    }

    try {
      const response = await this.makeRequest<{ exists: boolean; status: string }>(
        'GET',
        `/job_status/${jobId}`,
        undefined,
        undefined,
        'job status check'
      );
      
      return response;
    } catch (error) {
      // If job doesn't exist, return appropriate response
      if (error.type === ScholarFinderErrorType.EXTERNAL_API_ERROR && error.details?.status === 404) {
        return { exists: false, status: 'not_found' };
      }
      throw error;
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): ScholarFinderApiConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ScholarFinderApiConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update the underlying API service if needed
    this.apiService = new ApiService({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      retries: this.config.retries
    });
  }

  /**
   * Clear all ongoing manual author searches (for debugging/cleanup)
   */
  static clearOngoingSearches(): void {
    console.log('[ScholarFinderApiService] 🧹 Clearing all ongoing manual author searches');
    console.log('[ScholarFinderApiService] 📊 Clearing searches:', Array.from(ScholarFinderApiService.ongoingManualAuthorSearches.keys()));
    console.log('[ScholarFinderApiService] 📊 Clearing locks:', Array.from(ScholarFinderApiService.searchLocks));
    ScholarFinderApiService.ongoingManualAuthorSearches.clear();
    ScholarFinderApiService.searchLocks.clear();
  }

  /**
   * Get ongoing manual author searches (for debugging)
   */
  static getOngoingSearches(): string[] {
    return Array.from(ScholarFinderApiService.ongoingManualAuthorSearches.keys());
  }

  /**
   * Get active search locks (for debugging)
   */
  static getSearchLocks(): string[] {
    return Array.from(ScholarFinderApiService.searchLocks);
  }

  /**
   * Get COI Publications for a specific author
   * Fetches publication data from COI_Report.xlsx for the given author ID using FastAPI
   */
  async getCOIPublications(processId: string, authorId: string): Promise<{
    data: {
      publications: Array<{
        title: string;
        authors: string;
        affiliation: string;
        publication_date: string;
        searched_author: string;
        author_id: string;
      }>;
    };
  }> {
    if (!processId || !authorId) {
      throw {
        type: ScholarFinderErrorType.EXTERNAL_API_ERROR,
        message: 'Process ID and Author ID are required to fetch COI publications',
        retryable: false
      } as ScholarFinderError;
    }

    try {
      console.log('[ScholarFinderApiService.getCOIPublications] 🔍 Fetching COI publications for:', { processId, authorId });
      
      // Get the job ID for this process
      const { fileService } = await import('../../../services/fileService');
      const jobId = fileService.getJobId(processId);
      
      if (!jobId) {
        throw {
          type: ScholarFinderErrorType.EXTERNAL_API_ERROR,
          message: 'No job ID found for this process. Please upload a file first.',
          retryable: false
        } as ScholarFinderError;
      }
      
      // Call the FastAPI endpoint
      const response = await this.makeRequest<{
        job_id: string;
        author_id: string;
        coi_count: number;
        publications: Array<{
          title: string;
          authors: string;
          affiliations: string;
          publication_date: string;
          searched_author: string;
        }>;
      }>(
        'GET',
        `/coi_author_publications?job_id=${encodeURIComponent(jobId)}&author_id=${encodeURIComponent(authorId)}`,
        undefined,
        undefined,
        'COI publications retrieval'
      );
      
      console.log('[ScholarFinderApiService.getCOIPublications] ✅ COI publications retrieved successfully');
      
      // Transform the response to match the expected format
      const transformedPublications = response.publications.map(pub => ({
        title: pub.title,
        authors: pub.authors,
        affiliation: pub.affiliations, // Note: FastAPI returns 'affiliations', frontend expects 'affiliation'
        publication_date: pub.publication_date,
        searched_author: pub.searched_author,
        author_id: authorId
      }));
      
      return {
        data: {
          publications: transformedPublications
        }
      };
    } catch (error) {
      console.error('[ScholarFinderApiService.getCOIPublications] ❌ Error:', error);
      
      // Return empty publications array on error
      if (error.type === ScholarFinderErrorType.EXTERNAL_API_ERROR && error.details?.status === 404) {
        return {
          data: {
            publications: []
          }
        };
      }
      
      const scholarFinderError = this.handleApiError(error, 'COI publications retrieval');
      throw scholarFinderError;
    }
  }

  /**
   * Step 6: Validate authors with selected conditions
   */
  async validateAuthorsWithConditions(jobId: string, selectedConditions: string[]): Promise<{
    message: string;
    job_id: string;
    total_authors: number;
    top_5_preview: any[];
  }> {
    if (!jobId) {
      throw {
        type: ScholarFinderErrorType.VALIDATION_ERROR,
        message: 'Job ID is required for author validation',
        retryable: false
      } as ScholarFinderError;
    }

    if (!selectedConditions || selectedConditions.length === 0) {
      throw {
        type: ScholarFinderErrorType.VALIDATION_ERROR,
        message: 'At least one validation condition must be selected',
        retryable: false
      } as ScholarFinderError;
    }

    console.log('[ScholarFinderApiService.validateAuthorsWithConditions] 🔍 Starting validation with conditions:', selectedConditions);

    // The API expects application/x-www-form-urlencoded format
    const formData = new URLSearchParams();
    selectedConditions.forEach(condition => {
      formData.append('selected_conditions', condition);
    });

    try {
      // Use extended timeout for validation - this operation can take 10-20 minutes
      const response = await this.apiService.request<{
        message: string;
        job_id: string;
        total_authors: number;
        top_5_preview: any[];
      }>({
        method: 'POST',
        url: `/validate_authors?job_id=${encodeURIComponent(jobId)}`,
        data: formData.toString(),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 1800000, // 30 minutes timeout for validation
        retries: 0 // No retries for long-running operations
      });
      
      console.log('[ScholarFinderApiService.validateAuthorsWithConditions] ✅ Validation completed successfully');
      
      return response as any;
    } catch (error) {
      console.error('[ScholarFinderApiService.validateAuthorsWithConditions] ❌ Validation error:', error);
      
      // Handle 504 Gateway Timeout specially - validation might still be running
      const is504Timeout = (
        (error as any)?.userError?.type === 'GATEWAY_TIMEOUT' || 
        (error as any)?.type === 'GATEWAY_TIMEOUT' ||
        (error as any)?.type === 'TIMEOUT_ERROR' ||
        (error as any)?.details?.status === 504 ||
        (error as any)?.response?.status === 504 ||
        (error as any)?.status === 504 ||
        error?.message?.includes('504') ||
        error?.message?.includes('Gateway Timeout')
      );
      
      if (is504Timeout) {
        console.warn('[ScholarFinderApiService.validateAuthorsWithConditions] 504 timeout - validation may still be running');
        
        // Return a partial success response
        return {
          message: 'Author validation initiated successfully and may still be processing',
          job_id: jobId,
          total_authors: 0,
          top_5_preview: []
        };
      }
      
      const scholarFinderError = this.handleApiError(error, 'author validation');
      throw scholarFinderError;
    }
  }
}

// Create and export default instance
export const scholarFinderApiService = new ScholarFinderApiService();

export default scholarFinderApiService;