/**
 * Keyword enhancement service
 * Handles keyword enhancement, MeSH term generation, and search string creation
 * Now uses ScholarFinder external API via fileService
 */

import { fileService } from './fileService';
import type { KeywordEnhancementResponse } from '../features/scholarfinder/types/api';

/**
 * Enhanced keywords interface for internal use
 */
export interface EnhancedKeywords {
  original: string[];
  enhanced: string[];
  meshTerms: string[];
  broaderTerms: string[];
  primaryFocus: string[];
  secondaryFocus: string[];
  searchStrings?: {
    pubmed?: string;
    elsevier?: string;
    wiley?: string;
    taylorFrancis?: string;
  };
}

/**
 * Keyword service class for keyword enhancement and management
 */
class KeywordService {
  /**
   * Enhance keywords for a process using ScholarFinder API
   */
  async enhanceKeywords(processId: string): Promise<EnhancedKeywords> {
    try {
      // fileService.enhanceKeywords returns response.data directly
      const data = await fileService.enhanceKeywords(processId);
      
      // Check if data exists
      if (!data) {
        throw new Error('No data received from keyword enhancement API');
      }
      
      console.log('Keyword enhancement API response:', data);
      
      // Transform API response to internal format
      // The data object contains the fields directly
      const transformedKeywords: EnhancedKeywords = {
        original: data.primary_focus || [],
        enhanced: data.additional_primary_keywords || [],
        meshTerms: data.mesh_terms || [],
        broaderTerms: data.broader_terms || [],
        primaryFocus: data.all_primary_focus_list || [],
        secondaryFocus: data.all_secondary_focus_list || [],
        // Search strings will be generated separately
        searchStrings: {}
      };
      
      // Cache the transformed keywords for later retrieval
      const key = `process_${processId}_keywords`;
      localStorage.setItem(key, JSON.stringify(transformedKeywords));
      
      return transformedKeywords;
    } catch (error) {
      console.error('Keyword enhancement error:', error);
      throw error;
    }
  }

  /**
   * Get enhanced keywords for a process
   * Note: This retrieves cached keywords from localStorage
   */
  async getKeywords(processId: string): Promise<EnhancedKeywords> {
    const key = `process_${processId}_keywords`;
    const cached = localStorage.getItem(key);
    
    if (!cached) {
      throw new Error('Keywords have not been enhanced yet. Please enhance keywords first.');
    }
    
    return JSON.parse(cached);
  }

  /**
   * Get enhanced keywords for a process without localStorage dependency
   * This method directly calls the API to enhance keywords
   */
  async enhanceKeywordsDirectly(processId: string): Promise<EnhancedKeywords> {
    try {
      // Call the API directly without checking localStorage
      const data = await fileService.enhanceKeywords(processId);
      
      // Check if data exists
      if (!data) {
        throw new Error('No data received from keyword enhancement API');
      }
      
      console.log('Direct keyword enhancement API response:', data);
      
      // Transform API response to internal format
      const transformedKeywords: EnhancedKeywords = {
        original: data.primary_focus || [],
        enhanced: data.additional_primary_keywords || [],
        meshTerms: data.mesh_terms || [],
        broaderTerms: data.broader_terms || [],
        primaryFocus: data.all_primary_focus_list || [],
        secondaryFocus: data.all_secondary_focus_list || [],
        searchStrings: {}
      };
      
      // Cache the transformed keywords for later retrieval
      const key = `process_${processId}_keywords`;
      localStorage.setItem(key, JSON.stringify(transformedKeywords));
      
      return transformedKeywords;
    } catch (error) {
      console.error('Direct keyword enhancement error:', error);
      throw error;
    }
  }

  /**
   * Update keyword selection for a process
   * Stores selection in localStorage
   */
  async updateKeywordSelection(processId: string, selection: string[]): Promise<void> {
    const key = `process_${processId}_keyword_selection`;
    localStorage.setItem(key, JSON.stringify(selection));
  }

  /**
   * Get keyword selection for a process
   */
  async getKeywordSelection(processId: string): Promise<string[]> {
    const key = `process_${processId}_keyword_selection`;
    const cached = localStorage.getItem(key);
    return cached ? JSON.parse(cached) : [];
  }

  /**
   * Generate keyword search string
   */
  async generateSearchString(processId: string, primaryKeywords: string[], secondaryKeywords: string[]): Promise<{
    search_string: string;
    primary_keywords_used: string[];
    secondary_keywords_used: string[];
  }> {
    const response = await fileService.generateKeywordString(processId, {
      primary_keywords_input: primaryKeywords.join(', '),
      secondary_keywords_input: secondaryKeywords.join(', ')
    });
    
    return response;
  }
}

// Create and export service instance
export const keywordService = new KeywordService();
export default keywordService;