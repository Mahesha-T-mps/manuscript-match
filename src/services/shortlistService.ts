/**
 * Shortlist management service
 * Handles creating, managing, and exporting reviewer shortlists
 * Uses localStorage for ScholarFinder workflow
 */

import * as XLSX from 'xlsx';
import { fileService } from './fileService';
import { generateCSV, generateJSON } from '../utils/exportUtils';
import type { 
  Shortlist, 
  CreateShortlistRequest, 
  UpdateShortlistRequest
} from '../types/api';
import type { Reviewer } from '../features/scholarfinder/types/api';

/**
 * Shortlist service class for shortlist management
 * Uses localStorage for ScholarFinder workflow
 */
class ShortlistService {
  private getStorageKey(processId: string): string {
    return `shortlists_${processId}`;
  }

  private generateId(): string {
    return `shortlist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get all shortlists for a process from localStorage
   */
  async getShortlists(processId: string): Promise<Shortlist[]> {
    try {
      const key = this.getStorageKey(processId);
      const stored = localStorage.getItem(key);
      if (!stored) {
        return [];
      }
      const shortlists = JSON.parse(stored) as Shortlist[];
      return shortlists;
    } catch (error) {
      console.error('Failed to get shortlists from localStorage:', error);
      return [];
    }
  }

  /**
   * Get a specific shortlist
   */
  async getShortlist(processId: string, shortlistId: string): Promise<Shortlist> {
    const shortlists = await this.getShortlists(processId);
    const shortlist = shortlists.find(s => s.id === shortlistId);
    if (!shortlist) {
      throw new Error(`Shortlist with id ${shortlistId} not found`);
    }
    return shortlist;
  }

  /**
   * Create a new shortlist
   */
  async createShortlist(processId: string, data: CreateShortlistRequest): Promise<Shortlist> {
    try {
      const shortlists = await this.getShortlists(processId);
      
      const newShortlist: Shortlist = {
        id: this.generateId(),
        name: data.name,
        processId,
        selectedReviewers: data.selectedReviewers || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      shortlists.push(newShortlist);
      
      const key = this.getStorageKey(processId);
      localStorage.setItem(key, JSON.stringify(shortlists));
      
      console.log('[ShortlistService] Created shortlist:', newShortlist);
      return newShortlist;
    } catch (error) {
      console.error('Failed to create shortlist:', error);
      throw error;
    }
  }

  /**
   * Update a shortlist
   */
  async updateShortlist(processId: string, shortlistId: string, data: UpdateShortlistRequest): Promise<Shortlist> {
    try {
      const shortlists = await this.getShortlists(processId);
      const index = shortlists.findIndex(s => s.id === shortlistId);
      
      if (index === -1) {
        throw new Error(`Shortlist with id ${shortlistId} not found`);
      }

      const updatedShortlist: Shortlist = {
        ...shortlists[index],
        ...data,
        updatedAt: new Date().toISOString()
      };

      shortlists[index] = updatedShortlist;
      
      const key = this.getStorageKey(processId);
      localStorage.setItem(key, JSON.stringify(shortlists));
      
      console.log('[ShortlistService] Updated shortlist:', updatedShortlist);
      return updatedShortlist;
    } catch (error) {
      console.error('Failed to update shortlist:', error);
      throw error;
    }
  }

  /**
   * Delete a shortlist
   */
  async deleteShortlist(processId: string, shortlistId: string): Promise<void> {
    try {
      const shortlists = await this.getShortlists(processId);
      const filteredShortlists = shortlists.filter(s => s.id !== shortlistId);
      
      const key = this.getStorageKey(processId);
      localStorage.setItem(key, JSON.stringify(filteredShortlists));
      
      console.log('[ShortlistService] Deleted shortlist:', shortlistId);
    } catch (error) {
      console.error('Failed to delete shortlist:', error);
      throw error;
    }
  }

  /**
   * Get reviewer details for shortlist export
   */
  private async getReviewerDetails(processId: string, reviewerEmails: string[]): Promise<{ reviewers: Reviewer[], selectedValidationConditions?: string[] }> {
    try {
      // First, always try to get selected validation conditions regardless of data source
      let selectedValidationConditions: string[] | undefined;
      const selectedConditionsKey = `process_${processId}_selectedValidationConditions`;
      const selectedConditionsData = localStorage.getItem(selectedConditionsKey);
      
      console.log('[ShortlistService] Checking for validation conditions with key:', selectedConditionsKey);
      console.log('[ShortlistService] Raw localStorage data:', selectedConditionsData);
      
      if (selectedConditionsData) {
        try {
          selectedValidationConditions = JSON.parse(selectedConditionsData);
          console.log('[ShortlistService] Successfully parsed selected validation conditions:', selectedValidationConditions);
          console.log('[ShortlistService] Conditions count:', selectedValidationConditions?.length || 0);
          
          // Validate that we have actual conditions
          if (Array.isArray(selectedValidationConditions) && selectedValidationConditions.length > 0) {
            console.log('[ShortlistService] Valid conditions array found');
          } else {
            console.log('[ShortlistService] Conditions array is empty or invalid, will use all columns');
            selectedValidationConditions = undefined;
          }
        } catch (error) {
          console.warn('[ShortlistService] Failed to parse selected validation conditions:', error);
          selectedValidationConditions = undefined;
        }
      } else {
        console.log('[ShortlistService] No selected validation conditions found in localStorage');
        
        // Try to check if there are any validation-related keys at all
        const allKeys = Object.keys(localStorage);
        const validationKeys = allKeys.filter(key => key.includes('selectedValidationConditions'));
        console.log('[ShortlistService] All validation condition keys in localStorage:', validationKeys);
        
        selectedValidationConditions = undefined;
      }

      // Now try to get reviewer data from different sources
      // Try to get data from validationRecommendations first (primary source)
      const validationKey = `process_${processId}_validationRecommendations`;
      const validationData = localStorage.getItem(validationKey);
      
      if (validationData) {
        const parsedData = JSON.parse(validationData);
        const allReviewers = parsedData.data?.reviewers || [];
        
        if (allReviewers.length > 0) {
          // Filter reviewers by email
          const selectedReviewers = allReviewers.filter((reviewer: any) => 
            reviewerEmails.includes(reviewer.email)
          );
          
          if (selectedReviewers.length > 0) {
            console.log('[ShortlistService] Found reviewers from validationRecommendations:', selectedReviewers.length);
            
            // Normalize reviewer data to ensure all fields are properly mapped
            const normalizedReviewers = selectedReviewers.map((reviewer: any) => 
              this.normalizeReviewerData(reviewer)
            );
            
            return { reviewers: normalizedReviewers, selectedValidationConditions };
          }
        }
      }

      // Fallback: Try to get from recommendations API response cache
      const recommendationsKey = `process_${processId}_recommendations`;
      const recommendationsData = localStorage.getItem(recommendationsKey);
      
      if (recommendationsData) {
        const parsedData = JSON.parse(recommendationsData);
        const allReviewers = parsedData.reviewers || parsedData.data?.reviewers || [];
        
        if (allReviewers.length > 0) {
          // Filter reviewers by email
          const selectedReviewers = allReviewers.filter((reviewer: any) => 
            reviewerEmails.includes(reviewer.email)
          );
          
          if (selectedReviewers.length > 0) {
            console.log('[ShortlistService] Found reviewers from recommendations cache:', selectedReviewers.length);
            
            // Normalize reviewer data to ensure all fields are properly mapped
            const normalizedReviewers = selectedReviewers.map((reviewer: any) => 
              this.normalizeReviewerData(reviewer)
            );
            
            return { reviewers: normalizedReviewers, selectedValidationConditions };
          }
        }
      }

      // Last resort: Try to fetch from API
      const jobId = fileService.getJobId(processId);
      if (jobId) {
        console.log('[ShortlistService] Fetching reviewers from API for jobId:', jobId);
        const response = await fileService.getRecommendations(processId);
        const allReviewers = response.reviewers || [];
        
        // Filter reviewers by email
        const selectedReviewers = allReviewers.filter((reviewer: any) => 
          reviewerEmails.includes(reviewer.email)
        );
        
        if (selectedReviewers.length > 0) {
          console.log('[ShortlistService] Found reviewers from API:', selectedReviewers.length);
          console.log('[ShortlistService] API data does not include validation conditions, but using stored conditions:', selectedValidationConditions);
          
          // Transform API data to ensure all fields are properly mapped
          const transformedReviewers = selectedReviewers.map((reviewer: any) => {
            console.log('[ShortlistService] Transforming reviewer data for:', reviewer.email);
            return this.normalizeReviewerData(reviewer);
          });
          
          return { reviewers: transformedReviewers, selectedValidationConditions };
        }
      }

      throw new Error('No reviewer data found. Please ensure validation has been completed.');
    } catch (error) {
      console.error('Failed to get reviewer details:', error);
      throw error;
    }
  }

  /**
   * Normalize reviewer data to ensure all fields are properly mapped
   */
  private normalizeReviewerData(reviewer: any): Reviewer {
    console.log('[ShortlistService] Normalizing reviewer data for:', reviewer.email);
    console.log('[ShortlistService] Original reviewer keys:', Object.keys(reviewer));
    console.log('[ShortlistService] Original reviewer sample data:', {
      name: reviewer.name,
      reviewer: reviewer.reviewer,
      Total_Publications: reviewer.Total_Publications,
      publications: reviewer.publications,
      'Publications (last 10 years)': reviewer['Publications (last 10 years)'],
      Publications_10_years: reviewer.Publications_10_years,
      English_Pubs: reviewer.English_Pubs,
      english_pubs: reviewer.english_pubs,
      Clinical_Trials_no: reviewer.Clinical_Trials_no,
      clinical_trials: reviewer.clinical_trials
    });
    
    // Ensure all expected fields exist with proper values
    const normalized: any = {
      // Basic info
      reviewer: reviewer.reviewer || reviewer.name || 'Unknown',
      email: reviewer.email || '',
      aff: reviewer.aff || reviewer.affiliation || '',
      city: reviewer.city || '',
      country: reviewer.country || '',
      
      // Conditions
      conditions_met: reviewer.conditions_met || 0,
      conditions_satisfied: reviewer.conditions_satisfied || '',
      
      // Total publications
      Total_Publications: reviewer.Total_Publications || reviewer.publications || 0,
      Total_Publications_first: reviewer.Total_Publications_first || 0,
      Total_Publications_last: reviewer.Total_Publications_last || 0,
      
      // 10 years publications
      'Publications (last 10 years)': reviewer['Publications (last 10 years)'] || reviewer.Publications_10_years || 0,
      Publications_10_years: reviewer.Publications_10_years || reviewer['Publications (last 10 years)'] || 0,
      Publications_10_years_first: reviewer.Publications_10_years_first || 0,
      Publications_10_years_last: reviewer.Publications_10_years_last || 0,
      
      // 5 years publications
      Publications_5_years: reviewer.Publications_5_years || 0,
      Publications_5_years_first: reviewer.Publications_5_years_first || 0,
      Publications_5_years_last: reviewer.Publications_5_years_last || 0,
      'Relevant Publications (last 5 years)': reviewer['Relevant Publications (last 5 years)'] || reviewer.Relevant_Publications_5_years || 0,
      Relevant_Publications_5_years: reviewer.Relevant_Publications_5_years || reviewer['Relevant Publications (last 5 years)'] || 0,
      Relevant_Publications_5_years_first: reviewer.Relevant_Publications_5_years_first || 0,
      Relevant_Publications_5_years_last: reviewer.Relevant_Publications_5_years_last || 0,
      Relevant_Primary_Pub_2_years: reviewer.Relevant_Primary_Pub_2_years || 0,
      Relevant_Secondary_Pub_2_years: reviewer.Relevant_Secondary_Pub_2_years || 0,
      
      // 2 years publications
      'Publications (last 2 years)': reviewer['Publications (last 2 years)'] || reviewer.Publications_2_years || 0,
      Publications_2_years: reviewer.Publications_2_years || reviewer['Publications (last 2 years)'] || 0,
      Publications_2_years_first: reviewer.Publications_2_years_first || 0,
      Publications_2_years_last: reviewer.Publications_2_years_last || 0,
      
      // Last year publications
      'Publications (last year)': reviewer['Publications (last year)'] || reviewer.Publications_last_year || 0,
      Publications_last_year: reviewer.Publications_last_year || reviewer['Publications (last year)'] || 0,
      Publications_last_year_first: reviewer.Publications_last_year_first || 0,
      Publications_last_year_last: reviewer.Publications_last_year_last || 0,
      
      // Specialized publications
      Clinical_Trials_no: reviewer.Clinical_Trials_no || reviewer.clinical_trials || 0,
      Clinical_study_no: reviewer.Clinical_study_no || reviewer.clinical_studies || 0,
      Case_reports_no: reviewer.Case_reports_no || reviewer.case_reports || 0,
      Retracted_Pubs_no: reviewer.Retracted_Pubs_no || reviewer.retracted_pubs || 0,
      TF_Publications_last_year: reviewer.TF_Publications_last_year || reviewer.tf_publications_last_year || 0,
      
      // Language and quality
      English_Pubs: reviewer.English_Pubs || reviewer.english_pubs || 0,
      english_ratio: reviewer.english_ratio || 0,
      
      // Validation fields
      coauthor: reviewer.coauthor || false,
      coi_coauthor: reviewer.coi_coauthor || false,
      aff_match: reviewer.aff_match || 'no',
      country_match: reviewer.country_match || 'yes',
      sanction_country: reviewer.sanction_country || 'no',
      
      // Condition flags
      no_of_pub_condition_10_years: reviewer.no_of_pub_condition_10_years || 0,
      no_of_pub_condition_5_years: reviewer.no_of_pub_condition_5_years || 0,
      no_of_pub_condition_2_years: reviewer.no_of_pub_condition_2_years || 0,
      english_condition: reviewer.english_condition || 0,
      coauthor_condition: reviewer.coauthor_condition || 0,
      aff_condition: reviewer.aff_condition || 0,
      country_match_condition: reviewer.country_match_condition || 0,
      retracted_condition: reviewer.retracted_condition || 0,
      coi_condition: reviewer.coi_condition || 0
    };
    
    console.log('[ShortlistService] Normalized reviewer data keys:', Object.keys(normalized).length);
    console.log('[ShortlistService] Normalized reviewer sample data:', {
      reviewer: normalized.reviewer,
      Total_Publications: normalized.Total_Publications,
      Publications_10_years: normalized.Publications_10_years,
      English_Pubs: normalized.English_Pubs,
      Clinical_Trials_no: normalized.Clinical_Trials_no,
      coauthor: normalized.coauthor,
      conditions_met: normalized.conditions_met
    });
    return normalized as Reviewer;
  }

  /**
   * Export shortlist as CSV
   */
  private exportAsCSV(shortlist: Shortlist, reviewers: Reviewer[], selectedValidationConditions?: string[]): void {
    try {
      console.log('[ShortlistService] Exporting CSV with conditions:', selectedValidationConditions);
      console.log('[ShortlistService] Reviewers being exported:', reviewers.length);
      console.log('[ShortlistService] First reviewer data being exported:', {
        reviewer: reviewers[0]?.reviewer,
        email: reviewers[0]?.email,
        Total_Publications: reviewers[0]?.Total_Publications,
        Publications_10_years: reviewers[0]?.Publications_10_years,
        English_Pubs: reviewers[0]?.English_Pubs,
        Clinical_Trials_no: reviewers[0]?.Clinical_Trials_no,
        coauthor: reviewers[0]?.coauthor,
        conditions_met: reviewers[0]?.conditions_met
      });
      
      const csvContent = generateCSV(reviewers, selectedValidationConditions);
      console.log('[ShortlistService] Generated CSV headers:', csvContent.split('\n')[0]);
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${shortlist.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export shortlist as CSV:', error);
      throw error;
    }
  }

  /**
   * Export shortlist as JSON
   */
  private exportAsJSON(shortlist: Shortlist, reviewers: Reviewer[], selectedValidationConditions?: string[]): void {
    try {
      const jsonContent = generateJSON(reviewers, selectedValidationConditions);
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${shortlist.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export shortlist as JSON:', error);
      throw error;
    }
  }
  /**
   * Export shortlist as Excel
   */
  private exportAsExcel(shortlist: Shortlist, reviewers: Reviewer[], selectedValidationConditions?: string[]): void {
    try {
      console.log('[ShortlistService] Exporting Excel with conditions:', selectedValidationConditions);
      console.log('[ShortlistService] Reviewers being exported to Excel:', reviewers.length);
      
      // Generate CSV content using the same filtering logic
      const csvContent = generateCSV(reviewers, selectedValidationConditions);
      console.log('[ShortlistService] Generated CSV for Excel conversion');
      
      // Parse CSV more carefully to handle escaped fields
      const lines = csvContent.split('\n');
      const headers = this.parseCSVLine(lines[0]);
      console.log('[ShortlistService] Parsed Excel headers:', headers);
      
      const dataRows = lines.slice(1).map((line, index) => {
        const parsedRow = this.parseCSVLine(line);
        console.log(`[ShortlistService] Parsed Excel row ${index + 1}:`, parsedRow);
        return parsedRow;
      });

      console.log('[ShortlistService] Excel data structure:');
      console.log('- Headers count:', headers.length);
      console.log('- First row count:', dataRows[0]?.length || 0);
      console.log('- Headers vs Row match:', headers.length === (dataRows[0]?.length || 0));

      const worksheetData = [headers, ...dataRows];
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Reviewers');

      // Generate Excel file
      XLSX.writeFile(workbook, `${shortlist.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.xlsx`);
      console.log('[ShortlistService] Excel file generated successfully');
    } catch (error) {
      console.error('Failed to export shortlist as Excel:', error);
      throw error;
    }
  }

  /**
   * Parse a CSV line properly handling escaped fields
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i += 2;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator
        result.push(current);
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }
    
    // Add the last field
    result.push(current);
    
    return result;
  }

  /**
   * Export shortlist as Word document (HTML-based)
   */
  private exportAsWord(shortlist: Shortlist, reviewers: Reviewer[], selectedValidationConditions?: string[]): void {
    try {
      // Generate filtered data using JSON export logic to get structured data
      const jsonContent = generateJSON(reviewers, selectedValidationConditions);
      const exportData = JSON.parse(jsonContent);
      
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${shortlist.name}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
    h2 { color: #666; margin-top: 30px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background-color: #f2f2f2; font-weight: bold; }
    tr:nth-child(even) { background-color: #f9f9f9; }
    .reviewer-section { margin-bottom: 40px; page-break-inside: avoid; }
    .info-label { font-weight: bold; color: #555; }
    .conditions-info { background-color: #e8f4fd; padding: 10px; border-radius: 5px; margin-bottom: 20px; }
  </style>
</head>
<body>
  <h1>Reviewer Shortlist: ${shortlist.name}</h1>
  <p><strong>Created:</strong> ${new Date(shortlist.createdAt).toLocaleDateString()}</p>
  <p><strong>Total Reviewers:</strong> ${reviewers.length}</p>
  
  ${selectedValidationConditions && selectedValidationConditions.length > 0 ? `
  <div class="conditions-info">
    <h3>Selected Validation Conditions</h3>
    <p>This export includes data only for the following validation conditions that were selected during the validation process:</p>
    <ul>
      ${selectedValidationConditions.map(condition => `<li>${condition}</li>`).join('')}
    </ul>
  </div>
  ` : ''}
  
  <h2>Reviewer Details</h2>
  ${exportData.reviewers.map((reviewer: any, index: number) => `
    <div class="reviewer-section">
      <h3>${index + 1}. ${reviewer.name || 'Unknown'}</h3>
      <table>
        <tr>
          <th colspan="2">Contact Information</th>
        </tr>
        <tr>
          <td class="info-label">Email</td>
          <td>${reviewer.email || 'N/A'}</td>
        </tr>
        <tr>
          <td class="info-label">Affiliation</td>
          <td>${reviewer.affiliation || 'N/A'}</td>
        </tr>
        <tr>
          <td class="info-label">Location</td>
          <td>${reviewer.location?.city || 'N/A'}, ${reviewer.location?.country || 'N/A'}</td>
        </tr>
        <tr>
          <th colspan="2">Validation Status</th>
        </tr>
        <tr>
          <td class="info-label">Conditions Met</td>
          <td>${reviewer.validation?.conditionsMet || 0}/9</td>
        </tr>
        <tr>
          <td class="info-label">Conditions Satisfied</td>
          <td>${reviewer.validation?.conditionsSatisfied || 'N/A'}</td>
        </tr>
        ${Object.keys(reviewer).filter(key => 
          !['name', 'email', 'affiliation', 'location', 'validation'].includes(key)
        ).map(key => `
        <tr>
          <td class="info-label">${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</td>
          <td>${reviewer[key] || 'N/A'}</td>
        </tr>
        `).join('')}
      </table>
    </div>
  `).join('')}
</body>
</html>
      `;

      const blob = new Blob([htmlContent], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${shortlist.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.doc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export shortlist as Word:', error);
      throw error;
    }
  }

  /**
   * Export a shortlist in the specified format
   */
  async exportShortlist(processId: string, shortlistId: string, format: 'csv' | 'xlsx' | 'docx' | 'json'): Promise<void> {
    try {
      console.log('[ShortlistService] Starting export for process:', processId, 'shortlist:', shortlistId, 'format:', format);
      
      const shortlist = await this.getShortlist(processId, shortlistId);
      const { reviewers, selectedValidationConditions } = await this.getReviewerDetails(processId, shortlist.selectedReviewers);

      if (reviewers.length === 0) {
        throw new Error('No reviewer details found for export');
      }

      console.log('[ShortlistService] Export details:');
      console.log('- Shortlist name:', shortlist.name);
      console.log('- Format:', format);
      console.log('- Reviewers count:', reviewers.length);
      console.log('- Selected validation conditions:', selectedValidationConditions);
      console.log('- Conditions count:', selectedValidationConditions?.length || 0);

      switch (format) {
        case 'csv':
          this.exportAsCSV(shortlist, reviewers, selectedValidationConditions);
          break;
        case 'xlsx':
          this.exportAsExcel(shortlist, reviewers, selectedValidationConditions);
          break;
        case 'docx':
          this.exportAsWord(shortlist, reviewers, selectedValidationConditions);
          break;
        case 'json':
          this.exportAsJSON(shortlist, reviewers, selectedValidationConditions);
          break;
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      console.log('[ShortlistService] Successfully exported shortlist as', format);
    } catch (error) {
      console.error('Failed to export shortlist:', error);
      throw error;
    }
  }
}

// Create and export service instance
export const shortlistService = new ShortlistService();
export default shortlistService;