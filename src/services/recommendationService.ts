/**
 * Reviewer recommendation service
 * Handles fetching, filtering, and sorting reviewer recommendations from ScholarFinder API
 */

import { apiService } from './apiService';
import { scholarFinderApiService } from '../features/scholarfinder/services/ScholarFinderApiService';
import { fileService } from './fileService';
import type { 
  Reviewer, 
  RecommendationRequest,
  RecommendationFilters,
  RecommendationSort,
  PaginatedResponse,
  ApiResponse 
} from '../types/api';
import type { Reviewer as ScholarFinderReviewer } from '../features/scholarfinder/types/api';

/**
 * Recommendation service class for reviewer recommendations
 */
class RecommendationService {
  /**
   * Convert ScholarFinder Reviewer to internal Reviewer format
   */
  private mapScholarFinderReviewer(sfReviewer: ScholarFinderReviewer): Reviewer {
    return {
      // Author properties
      id: `reviewer-${sfReviewer.email}`, // Generate unique ID
      name: sfReviewer.reviewer,
      email: sfReviewer.email,
      affiliation: sfReviewer.aff,
      country: sfReviewer.country,
      publicationCount: sfReviewer.Total_Publications,
      recentPublications: [], // Not available in ScholarFinder data
      expertise: [], // Could be derived from publications
      database: 'ScholarFinder', // All come from ScholarFinder
      matchScore: sfReviewer.conditions_met, // Use conditions_met as match score
      
      // Reviewer-specific validation status
      validationStatus: {
        excludedAsManuscriptAuthor: !sfReviewer.coauthor, // Not a coauthor = not excluded
        excludedAsCoAuthor: sfReviewer.coauthor, // Is a coauthor = excluded as coauthor
        hasMinimumPublications: sfReviewer.Total_Publications >= 8, // Based on validation criteria
        hasAcceptableRetractions: sfReviewer.Retracted_Pubs_no <= 1, // Based on validation criteria
        hasInstitutionalConflict: sfReviewer.aff_match !== 'NO' // Affiliation match indicates conflict
      }
    };
  }
  /**
   * Get reviewer recommendations for a process using ScholarFinder API
   */
  async getRecommendations(processId: string, request?: RecommendationRequest): Promise<PaginatedResponse<Reviewer>> {
    // Get job ID for this process
    const jobId = fileService.getJobId(processId);
    if (!jobId) {
      throw new Error('No job ID found for this process. Please complete validation first.');
    }

    console.log('[RecommendationService] Getting recommendations for processId:', processId, 'jobId:', jobId);
    
    // Call ScholarFinder API to get recommendations
    const response = await scholarFinderApiService.getRecommendations(jobId);
    
    console.log('[RecommendationService] ScholarFinder API response:', response);
    
    // Transform ScholarFinder API response to match expected format
    const sfReviewers = response.data.reviewers || [];
    const reviewers = sfReviewers.map(sfReviewer => this.mapScholarFinderReviewer(sfReviewer));
    
    // Apply client-side filtering if requested (since ScholarFinder API doesn't support filtering)
    let filteredReviewers = reviewers;
    
    if (request?.filters) {
      const filters = request.filters;
      
      filteredReviewers = reviewers.filter(reviewer => {
        // Filter by minimum publications
        if (filters.minPublications !== undefined && reviewer.publicationCount < filters.minPublications) {
          return false;
        }
        
        // Filter by maximum publications
        if (filters.maxPublications !== undefined && reviewer.publicationCount > filters.maxPublications) {
          return false;
        }
        
        // Filter by countries
        if (filters.countries && filters.countries.length > 0 && !filters.countries.includes(reviewer.country)) {
          return false;
        }
        
        // Filter by search term (name, email, affiliation)
        if (filters.search) {
          const searchTerm = filters.search.toLowerCase();
          const matchesSearch = 
            reviewer.name.toLowerCase().includes(searchTerm) ||
            reviewer.email.toLowerCase().includes(searchTerm) ||
            reviewer.affiliation.toLowerCase().includes(searchTerm);
          if (!matchesSearch) {
            return false;
          }
        }
        
        return true;
      });
    }
    
    // Apply client-side sorting if requested
    if (request?.sort) {
      const { field, direction } = request.sort;
      filteredReviewers.sort((a, b) => {
        let aValue: any, bValue: any;
        
        switch (field) {
          case 'name':
            aValue = a.name;
            bValue = b.name;
            break;
          case 'publicationCount':
            aValue = a.publicationCount;
            bValue = b.publicationCount;
            break;
          case 'matchScore':
            aValue = a.matchScore;
            bValue = b.matchScore;
            break;
          case 'country':
            aValue = a.country;
            bValue = b.country;
            break;
          default:
            aValue = a.matchScore; // Default sort by score
            bValue = b.matchScore;
        }
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
        } else {
          return direction === 'asc' ? aValue - bValue : bValue - aValue;
        }
      });
    }
    
    // Apply client-side pagination if requested
    const page = request?.page || 1;
    const limit = request?.limit || 20;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedReviewers = filteredReviewers.slice(startIndex, endIndex);
    
    // Return in expected format
    return {
      data: paginatedReviewers,
      pagination: {
        page,
        limit,
        total: filteredReviewers.length,
        totalPages: Math.ceil(filteredReviewers.length / limit),
        hasNextPage: endIndex < filteredReviewers.length,
        hasPreviousPage: page > 1
      }
    };
  }

  /**
   * Get available filter options for recommendations from ScholarFinder API data
   */
  async getFilterOptions(processId: string): Promise<{
    countries: string[];
    affiliationTypes: string[];
    expertise: string[];
    databases: string[];
    publicationRange: { min: number; max: number };
  }> {
    // Get all recommendations first
    const allRecommendations = await this.getRecommendations(processId, { limit: 1000 });
    const reviewers = allRecommendations.data;
    
    // Extract unique values for filters
    const countries = [...new Set(reviewers.map(r => r.country).filter(Boolean))].sort();
    const affiliationTypes = [...new Set(reviewers.map(r => {
      // Extract affiliation type from affiliation string (simplified)
      const aff = r.affiliation.toLowerCase();
      if (aff.includes('university') || aff.includes('college')) return 'University';
      if (aff.includes('hospital') || aff.includes('medical')) return 'Hospital';
      if (aff.includes('institute') || aff.includes('research')) return 'Research Institute';
      return 'Other';
    }))].sort();
    
    // For expertise, we could extract from recent publications or use a default set
    const expertise = ['Medical Research', 'Clinical Studies', 'Academic Research', 'Pharmaceutical'];
    
    // Databases are not directly available in ScholarFinder data, use default
    const databases = ['PubMed', 'ScienceDirect', 'TandFonline', 'WileyLibrary'];
    
    // Calculate publication range
    const publications = reviewers.map(r => r.publicationCount).filter(p => p > 0);
    const publicationRange = {
      min: publications.length > 0 ? Math.min(...publications) : 0,
      max: publications.length > 0 ? Math.max(...publications) : 100
    };
    
    return {
      countries,
      affiliationTypes,
      expertise,
      databases,
      publicationRange
    };
  }

  /**
   * Get recommendation statistics from ScholarFinder API data
   */
  async getRecommendationStats(processId: string): Promise<{
    total: number;
    byDatabase: Record<string, number>;
    byCountry: Record<string, number>;
    averageMatchScore: number;
    averagePublications: number;
  }> {
    // Get all recommendations from ScholarFinder API
    const response = await this.getRecommendations(processId, { limit: 1000 });
    const reviewers = response.data;
    
    const stats = {
      total: response.pagination.total,
      byDatabase: {} as Record<string, number>,
      byCountry: {} as Record<string, number>,
      averageMatchScore: 0,
      averagePublications: 0,
    };
    
    if (reviewers.length > 0) {
      // Group by country (database info not available in ScholarFinder response)
      reviewers.forEach(reviewer => {
        stats.byCountry[reviewer.country] = (stats.byCountry[reviewer.country] || 0) + 1;
        // Use a default database grouping since it's not in the ScholarFinder response
        stats.byDatabase['ScholarFinder'] = (stats.byDatabase['ScholarFinder'] || 0) + 1;
      });
      
      // Calculate averages using mapped reviewer data
      stats.averageMatchScore = reviewers.reduce((sum, r) => sum + r.matchScore, 0) / reviewers.length;
      stats.averagePublications = reviewers.reduce((sum, r) => sum + r.publicationCount, 0) / reviewers.length;
    }
    
    return stats;
  }
}

// Create and export service instance
export const recommendationService = new RecommendationService();
export default recommendationService;