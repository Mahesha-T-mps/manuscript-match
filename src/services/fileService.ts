/**
 * File upload and metadata service
 * Now uses ScholarFinder external API for all operations
 */

import { apiService } from './apiService';
import { scholarFinderApiService } from '../features/scholarfinder/services/ScholarFinderApiService';
import type { 
  UploadResponse, 
  ExtractedMetadata, 
  UpdateMetadataRequest,
  ApiResponse 
} from '../types/api';

// Store job_id mapping for processes
const processJobIdMap = new Map<string, string>();

/**
 * File service class for file operations and metadata management
 * Now integrated with ScholarFinder external API
 */
class FileService {
  /**
   * Set job ID for a process (called after upload)
   */
  setJobId(processId: string, jobId: string): void {
    processJobIdMap.set(processId, jobId);
    // Also store in localStorage for persistence
    localStorage.setItem(`process_${processId}_jobId`, jobId);
  }

  /**
   * Get job ID for a process
   */
  getJobId(processId: string): string | null {
    // Try memory first
    let jobId = processJobIdMap.get(processId);
    if (!jobId) {
      // Try localStorage
      jobId = localStorage.getItem(`process_${processId}_jobId`) || null;
      if (jobId) {
        processJobIdMap.set(processId, jobId);
      }
    }
    return jobId;
  }

  /**
   * Upload a file for a specific process - uses ScholarFinder API
   */
  async uploadFile(processId: string, file: File, onProgress?: (progress: number) => void): Promise<UploadResponse> {
    // Use ScholarFinder API with processId and pass progress callback
    const response = await scholarFinderApiService.uploadManuscript(file, processId, onProgress);
    
    // Handle response structure - backend returns {message, data}
    const rawData: any = response.data || response;
    
    // Store the job_id for this process
    this.setJobId(processId, rawData.job_id);
    
    // Transform response to match UploadResponse format with safe defaults
    // Backend returns keywords as a string, convert to array
    const keywordsArray = rawData.keywords 
      ? (typeof rawData.keywords === 'string' 
          ? rawData.keywords.split(',').map((k: string) => k.trim()).filter((k: string) => k.length > 0)
          : rawData.keywords)
      : [];
    
    const uploadResponse: UploadResponse = {
      fileId: rawData.job_id,
      fileName: rawData.file_name,
      fileSize: file.size,
      uploadedAt: rawData.timestamp,
      metadata: {
        title: rawData.heading || '',
        authors: rawData.authors || [],
        affiliations: rawData.affiliations || [],
        keywords: keywordsArray,
        abstract: rawData.abstract || '',
        authorAffiliationMap: rawData.author_aff_map || {}
      }
    };
    
    // Cache the metadata immediately for later retrieval
    const key = `process_${processId}_metadata`;
    localStorage.setItem(key, JSON.stringify(uploadResponse.metadata));
    
    return uploadResponse;
  }

  /**
   * Get extracted metadata for a process - uses ScholarFinder API
   */
  async getMetadata(processId: string): Promise<ExtractedMetadata> {
    console.log('[fileService.getMetadata] Called with processId:', processId);
    
    const jobId = this.getJobId(processId);
    console.log('[fileService.getMetadata] Retrieved jobId:', jobId);
    
    if (!jobId) {
      console.error('[fileService.getMetadata] No job ID found for processId:', processId);
      throw new Error('No job ID found for this process. Please upload a file first.');
    }

    // Check if we have cached metadata from upload, but verify it matches current job ID
    const cachedKey = `process_${processId}_metadata`;
    const cachedJobIdKey = `process_${processId}_metadata_jobId`;
    const cachedMetadata = localStorage.getItem(cachedKey);
    const cachedJobId = localStorage.getItem(cachedJobIdKey);
    
    if (cachedMetadata && cachedJobId === jobId) {
      try {
        const parsed = JSON.parse(cachedMetadata);
        // If cached metadata has the expected structure and matches current job ID, return it
        if (parsed && parsed.title !== undefined && parsed.keywords !== undefined) {
          console.log('[fileService.getMetadata] Returning cached metadata for jobId:', jobId, parsed);
          return parsed as ExtractedMetadata;
        }
      } catch (e) {
        console.warn('Failed to parse cached metadata, fetching from API');
      }
    } else if (cachedJobId !== jobId) {
      console.log('[fileService.getMetadata] Job ID changed, clearing old cached metadata. Old:', cachedJobId, 'New:', jobId);
      // Clear old cached metadata if job ID has changed
      localStorage.removeItem(cachedKey);
      localStorage.removeItem(cachedJobIdKey);
    }

    console.log('[fileService.getMetadata] Calling scholarFinderApiService.getMetadata with jobId:', jobId);
    const response = await scholarFinderApiService.getMetadata(jobId);
    
    // Debug logging
    console.log('[fileService.getMetadata] Raw response:', response);
    
    // Handle the response structure from your backend API
    // Response: { job_id, total_manuscripts, results: [{ file_name, data: {...} }] }
    if (!response.results || response.results.length === 0) {
      console.error('[fileService.getMetadata] No results found in response:', response);
      throw new Error('No metadata found in the response');
    }
    
    // Process all files, not just the first one
    const allFilesMetadata = response.results.map((result, fileIndex) => {
      const fileMetadata = result.data;
      console.log(`[fileService.getMetadata] Processing file ${fileIndex + 1}:`, result.file_name, fileMetadata);
      
      // Clean the file name
      const cleanFileName = result.file_name
        .replace(/_metadata\.json$/, '')  // Remove _metadata.json
        .replace(/_keywords\.json$/, '')  // Remove _keywords.json  
        .replace(/\.json$/, '')           // Remove any remaining .json
        .replace(/_metadata$/, '')        // Remove _metadata suffix
        .replace(/_keywords$/, '');       // Remove _keywords suffix
      
      console.log(`[fileService.getMetadata] Original fileName: "${result.file_name}" -> Cleaned: "${cleanFileName}"`);
      
      if (!fileMetadata) {
        console.error(`[fileService.getMetadata] Invalid metadata structure for file ${result.file_name}:`, result);
        return null;
      }
      
      // Transform response to match ExtractedMetadata format
      // Convert keywords string to array if needed
      const keywordsArray = typeof fileMetadata.keywords === 'string' 
        ? fileMetadata.keywords.split(',').map(k => k.trim()).filter(k => k.length > 0)
        : Array.isArray(fileMetadata.keywords) 
        ? fileMetadata.keywords
        : [];
      
      // Transform authors array from strings to Author objects
      const authorsArray = Array.isArray(fileMetadata.authors) 
        ? fileMetadata.authors.map((authorName: string, index: number) => ({
            id: `author-${fileIndex}-${index}`,
            name: authorName,
            affiliation: fileMetadata.author_aff_map?.[authorName] || 
                        (Array.isArray(fileMetadata.affiliations) ? fileMetadata.affiliations[index] : '') || '',
            country: '',
            publicationCount: 0,
            recentPublications: [],
            expertise: [],
            database: 'manuscript',
            matchScore: 0
          }))
        : [];
      
      // Transform affiliations array from strings to Affiliation objects
      const affiliationsArray = Array.isArray(fileMetadata.affiliations)
        ? fileMetadata.affiliations.map((affName: string, index: number) => ({
            id: `aff-${fileIndex}-${index}`,
            name: affName,
            country: '',
            type: 'university'
          }))
        : [];
      
      return {
        fileName: cleanFileName,
        title: fileMetadata.heading || fileMetadata.title || 'Untitled',
        authors: authorsArray,
        affiliations: affiliationsArray,
        keywords: keywordsArray,
        abstract: fileMetadata.abstract || ''
      };
    }).filter(Boolean); // Remove any null entries
    
    // For backward compatibility, if there's only one file, return it as a single object
    // If multiple files, return the array structure
    const metadata = allFilesMetadata.length === 1 
      ? allFilesMetadata[0] 
      : {
          title: `${allFilesMetadata.length} Manuscripts`,
          files: allFilesMetadata,
          // Aggregate data for compatibility
          authors: allFilesMetadata.flatMap(file => file.authors),
          affiliations: allFilesMetadata.flatMap(file => file.affiliations),
          keywords: [...new Set(allFilesMetadata.flatMap(file => file.keywords))], // Unique keywords
          abstract: allFilesMetadata.map(file => `${file.title}: ${file.abstract}`).join('\n\n')
        };
    
    console.log('[fileService.getMetadata] Transformed metadata:', metadata);
    
    // Cache the metadata for future use along with the job ID
    // Reuse the cachedKey and cachedJobIdKey variables from earlier
    localStorage.setItem(cachedKey, JSON.stringify(metadata));
    localStorage.setItem(cachedJobIdKey, jobId);
    
    return metadata;
  }

  /**
   * Update metadata for a process
   * Note: The external API doesn't support metadata updates, so this stores locally
   */
  async updateMetadata(processId: string, metadata: UpdateMetadataRequest): Promise<ExtractedMetadata> {
    // Store updated metadata locally
    const key = `process_${processId}_metadata`;
    localStorage.setItem(key, JSON.stringify(metadata));
    
    // Return the updated metadata
    return metadata as ExtractedMetadata;
  }

  /**
   * Enhance keywords using AI - uses ScholarFinder API
   */
  async enhanceKeywords(processId: string): Promise<any> {
    const jobId = this.getJobId(processId);
    if (!jobId) {
      throw new Error('No job ID found for this process. Please upload a file first.');
    }

    console.log('[fileService] Calling enhanceKeywords with jobId:', jobId);
    const response = await scholarFinderApiService.enhanceKeywords(jobId);
    console.log('[fileService] Full API response:', response);
    
    // For keyword enhancement, we need the full response because combined keywords are at the top level
    // Don't extract just response.data as it doesn't contain combined_primary_keywords and combined_secondary_keywords
    console.log('[fileService] Returning full response for keyword enhancement');
    
    // Cache the enhanced keywords for later retrieval
    const key = `process_${processId}_keywords`;
    localStorage.setItem(key, JSON.stringify(response));
    
    return response;
  }

  /**
   * Generate keyword string - uses ScholarFinder API
   */
  async generateKeywordString(processId: string, keywords: {
    primary_keywords_input?: string;
    secondary_keywords_input?: string;
  }): Promise<{ search_string: string; primary_keywords_used: string[]; secondary_keywords_used: string[] }> {
    const jobId = this.getJobId(processId);
    if (!jobId) {
      throw new Error('No job ID found for this process. Please upload a file first.');
    }

    // Ensure required fields are present
    const keywordSelection = {
      primary_keywords_input: keywords.primary_keywords_input || '',
      secondary_keywords_input: keywords.secondary_keywords_input || ''
    };

    const response = await scholarFinderApiService.generateKeywordString(jobId, keywordSelection);
    return response.data;
  }

  /**
   * Search databases for reviewers - uses ScholarFinder API
   */
  async searchDatabases(processId: string, databases: {
    selected_websites: string[];
  }): Promise<any> {
    const jobId = this.getJobId(processId);
    if (!jobId) {
      throw new Error('No job ID found for this process. Please upload a file first.');
    }

    const response = await scholarFinderApiService.searchDatabases(jobId, databases);
    
    // Cache the search results for status tracking
    localStorage.setItem(`process_${processId}_searchResults`, JSON.stringify(response));
    
    return response;
  }

  // Track ongoing manual author searches to prevent duplicates
  private ongoingManualAuthorSearches = new Map<string, Promise<any>>();

  /**
   * Add manual author - uses ScholarFinder API
   */
  async addManualAuthor(processId: string, authorName: string): Promise<any> {
    console.log('[fileService.addManualAuthor] 🔍 Called with:', { processId, authorName });
    console.log('[fileService.addManualAuthor] ⏰ Timestamp:', new Date().toISOString());
    
    const jobId = this.getJobId(processId);
    console.log('[fileService.addManualAuthor] 📋 Retrieved jobId:', jobId);
    
    if (!jobId) {
      console.error('[fileService.addManualAuthor] ❌ No job ID found for process:', processId);
      throw new Error('No job ID found for this process. Please upload a file first.');
    }

    // Create a unique key for this search to prevent duplicates
    const searchKey = `${jobId}-${authorName.trim().toLowerCase()}`;
    
    // Check if this exact search is already in progress
    if (this.ongoingManualAuthorSearches.has(searchKey)) {
      console.log('[fileService.addManualAuthor] 🚫 Duplicate search detected, returning existing promise');
      console.log('[fileService.addManualAuthor] 🔑 Search key:', searchKey);
      return this.ongoingManualAuthorSearches.get(searchKey)!;
    }

    console.log('[fileService.addManualAuthor] 🚀 Starting new search, calling scholarFinderApiService.addManualAuthor');
    
    // Create the search promise
    const searchPromise = scholarFinderApiService.addManualAuthor(jobId, authorName)
      .then(response => {
        console.log('[fileService.addManualAuthor] ✅ Response received:', response);
        console.log('[fileService.addManualAuthor] 📊 Response type:', typeof response);
        console.log('[fileService.addManualAuthor] 📊 Response keys:', response ? Object.keys(response) : 'response is null/undefined');
        return response;
      })
      .finally(() => {
        // Remove from ongoing searches when complete
        this.ongoingManualAuthorSearches.delete(searchKey);
        console.log('[fileService.addManualAuthor] 🧹 Cleaned up search key:', searchKey);
      });
    
    // Store the promise to prevent duplicates
    this.ongoingManualAuthorSearches.set(searchKey, searchPromise);
    
    return searchPromise;
  }

  /**
   * Search for manual author by name - uses ScholarFinder API
   * Returns author data with name, email, affiliation, city, country
   */
  async searchManualAuthor(processId: string, authorName: string): Promise<any> {
    console.log('[fileService] searchManualAuthor called:', { processId, authorName });
    
    const jobId = this.getJobId(processId);
    console.log('[fileService] Retrieved jobId:', jobId);
    
    if (!jobId) {
      throw new Error('No job ID found for this process. Please upload a file first.');
    }

    const response = await scholarFinderApiService.searchManualAuthor(jobId, authorName);
    console.log('[fileService] searchManualAuthor response:', response);
    
    return response.author_data;
  }

  /**
   * Validate authors - uses ScholarFinder API
   */
  async validateAuthors(processId: string): Promise<any> {
    const jobId = this.getJobId(processId);
    if (!jobId) {
      throw new Error('No job ID found for this process. Please upload a file first.');
    }

    const response = await scholarFinderApiService.validateAuthors(jobId);
    return response.data;
  }

  /**
   * Get validation status - uses ScholarFinder API
   */
  async getValidationStatus(processId: string): Promise<any> {
    const jobId = this.getJobId(processId);
    if (!jobId) {
      throw new Error('No job ID found for this process. Please upload a file first.');
    }

    const response = await scholarFinderApiService.getValidationStatus(jobId);
    return response.data;
  }

  /**
   * Get recommended reviewers - uses ScholarFinder API
   */
  async getRecommendations(processId: string): Promise<any> {
    const jobId = this.getJobId(processId);
    if (!jobId) {
      throw new Error('No job ID found for this process. Please upload a file first.');
    }

    const response = await scholarFinderApiService.getRecommendations(jobId);
    return response.data;
  }

  /**
   * Fetch all authors after validation - uses ScholarFinder API
   */
  async fetchAllAuthors(processId: string): Promise<any> {
    const jobId = this.getJobId(processId);
    if (!jobId) {
      throw new Error('No job ID found for this process. Please upload a file first.');
    }

    // Note: This endpoint might not exist in ScholarFinderApiService yet
    // You may need to add it there first
    const response = await scholarFinderApiService.getRecommendations(jobId);
    return response.data;
  }
}

// Create and export service instance
export const fileService = new FileService();
export default fileService;