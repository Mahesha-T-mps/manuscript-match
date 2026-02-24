/**
 * Shortlist management service
 * Handles creating, managing, and exporting reviewer shortlists
 * Uses localStorage for ScholarFinder workflow
 */

import { apiService } from './apiService';
import * as XLSX from 'xlsx';
import { fileService } from './fileService';
import type { 
  Shortlist, 
  CreateShortlistRequest, 
  UpdateShortlistRequest,
  ApiResponse 
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
  private async getReviewerDetails(processId: string, reviewerEmails: string[]): Promise<Reviewer[]> {
    try {
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
            return selectedReviewers;
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
            return selectedReviewers;
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
          return selectedReviewers;
        }
      }

      throw new Error('No reviewer data found. Please ensure validation has been completed.');
    } catch (error) {
      console.error('Failed to get reviewer details:', error);
      throw error;
    }
  }

  /**
   * Export shortlist as CSV
   */
  private exportAsCSV(shortlist: Shortlist, reviewers: Reviewer[]): void {
    // Use the same headers as exportUtils.ts for consistency
    const headers = [
      'author',
      'email', 
      'aff',
      'city',
      'country',
      'Total_Publications',
      'Total_Publications_first',
      'Total_Publications_last',
      'Publications_10_years',
      'Publications_10_years_first',
      'Publications_10_years_last',
      'Publications_5_years',
      'Publications_5_years_first',
      'Publications_5_years_last',
      'Relevant_Publications_5_years',
      'Relevant_Publications_5_years_first',
      'Relevant_Publications_5_years_last',
      'Relevant_Primary_Pub_2_years',
      'Relevant_Secondary_Pub_2_years',
      'Publications_2_years',
      'Publications_2_years_first',
      'Publications_2_years_last',
      'Publications_last_year',
      'Publications_last_year_first',
      'Publications_last_year_last',
      'Clinical_Trials_no',
      'Retracted_Pubs_no',
      'Clinical_study_no',
      'Case_reports_no',
      'TF_Publications_last_year',
      'English_Pubs',
      'coauthor',
      'country_match',
      'aff_match',
      'sanction_country',
      'no_of_pub_condition_10_years',
      'no_of_pub_condition_5_years',
      'no_of_pub_condition_2_years',
      'english_ratio',
      'english_condition',
      'coauthor_condition',
      'aff_condition',
      'country_match_condition',
      'retracted_condition',
      'conditions_met',
      'conditions_satisfied'
    ];

    const rows = reviewers.map(reviewer => [
      reviewer.reviewer || '',
      reviewer.email || '',
      reviewer.aff || '',
      reviewer.city || '',
      reviewer.country || '',
      reviewer.Total_Publications || 0,
      reviewer.Total_Publications_first || 0,
      reviewer.Total_Publications_last || 0,
      reviewer.Publications_10_years || reviewer['Publications (last 10 years)'] || 0,
      reviewer.Publications_10_years_first || 0,
      reviewer.Publications_10_years_last || 0,
      reviewer.Publications_5_years || 0,
      reviewer.Publications_5_years_first || 0,
      reviewer.Publications_5_years_last || 0,
      reviewer.Relevant_Publications_5_years || reviewer['Relevant Publications (last 5 years)'] || 0,
      reviewer.Relevant_Publications_5_years_first || 0,
      reviewer.Relevant_Publications_5_years_last || 0,
      reviewer.Relevant_Primary_Pub_2_years || 0,
      reviewer.Relevant_Secondary_Pub_2_years || 0,
      reviewer.Publications_2_years || reviewer['Publications (last 2 years)'] || 0,
      reviewer.Publications_2_years_first || 0,
      reviewer.Publications_2_years_last || 0,
      reviewer.Publications_last_year || reviewer['Publications (last year)'] || 0,
      reviewer.Publications_last_year_first || 0,
      reviewer.Publications_last_year_last || 0,
      reviewer.Clinical_Trials_no || 0,
      reviewer.Retracted_Pubs_no || 0,
      reviewer.Clinical_study_no || 0,
      reviewer.Case_reports_no || 0,
      reviewer.TF_Publications_last_year || 0,
      reviewer.English_Pubs || 0,
      reviewer.coauthor ? 'Yes' : 'No',
      reviewer.country_match || '',
      reviewer.aff_match || '',
      reviewer.sanction_country || 'no',
      reviewer.no_of_pub_condition_10_years || 0,
      reviewer.no_of_pub_condition_5_years || 0,
      reviewer.no_of_pub_condition_2_years || 0,
      reviewer.english_ratio || 0,
      reviewer.english_condition || 0,
      reviewer.coauthor_condition || 0,
      reviewer.aff_condition || 0,
      reviewer.country_match_condition || 0,
      reviewer.retracted_condition || 0,
      reviewer.conditions_met || 0,
      reviewer.conditions_satisfied || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => {
        const cellStr = String(cell);
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${shortlist.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Export shortlist as Excel
   */
  private exportAsExcel(shortlist: Shortlist, reviewers: Reviewer[]): void {
    const worksheetData = [
      // Headers - matching exportUtils.ts
      [
        'author',
        'email', 
        'aff',
        'city',
        'country',
        'Total_Publications',
        'Total_Publications_first',
        'Total_Publications_last',
        'Publications_10_years',
        'Publications_10_years_first',
        'Publications_10_years_last',
        'Publications_5_years',
        'Publications_5_years_first',
        'Publications_5_years_last',
        'Relevant_Publications_5_years',
        'Relevant_Publications_5_years_first',
        'Relevant_Publications_5_years_last',
        'Relevant_Primary_Pub_2_years',
        'Relevant_Secondary_Pub_2_years',
        'Publications_2_years',
        'Publications_2_years_first',
        'Publications_2_years_last',
        'Publications_last_year',
        'Publications_last_year_first',
        'Publications_last_year_last',
        'Clinical_Trials_no',
        'Retracted_Pubs_no',
        'Clinical_study_no',
        'Case_reports_no',
        'TF_Publications_last_year',
        'English_Pubs',
        'coauthor',
        'country_match',
        'aff_match',
        'sanction_country',
        'no_of_pub_condition_10_years',
        'no_of_pub_condition_5_years',
        'no_of_pub_condition_2_years',
        'english_ratio',
        'english_condition',
        'coauthor_condition',
        'aff_condition',
        'country_match_condition',
        'retracted_condition',
        'conditions_met',
        'conditions_satisfied'
      ],
      // Data rows
      ...reviewers.map(reviewer => [
        reviewer.reviewer || '',
        reviewer.email || '',
        reviewer.aff || '',
        reviewer.city || '',
        reviewer.country || '',
        reviewer.Total_Publications || 0,
        reviewer.Total_Publications_first || 0,
        reviewer.Total_Publications_last || 0,
        reviewer.Publications_10_years || reviewer['Publications (last 10 years)'] || 0,
        reviewer.Publications_10_years_first || 0,
        reviewer.Publications_10_years_last || 0,
        reviewer.Publications_5_years || 0,
        reviewer.Publications_5_years_first || 0,
        reviewer.Publications_5_years_last || 0,
        reviewer.Relevant_Publications_5_years || reviewer['Relevant Publications (last 5 years)'] || 0,
        reviewer.Relevant_Publications_5_years_first || 0,
        reviewer.Relevant_Publications_5_years_last || 0,
        reviewer.Relevant_Primary_Pub_2_years || 0,
        reviewer.Relevant_Secondary_Pub_2_years || 0,
        reviewer.Publications_2_years || reviewer['Publications (last 2 years)'] || 0,
        reviewer.Publications_2_years_first || 0,
        reviewer.Publications_2_years_last || 0,
        reviewer.Publications_last_year || reviewer['Publications (last year)'] || 0,
        reviewer.Publications_last_year_first || 0,
        reviewer.Publications_last_year_last || 0,
        reviewer.Clinical_Trials_no || 0,
        reviewer.Retracted_Pubs_no || 0,
        reviewer.Clinical_study_no || 0,
        reviewer.Case_reports_no || 0,
        reviewer.TF_Publications_last_year || 0,
        reviewer.English_Pubs || 0,
        reviewer.coauthor ? 'Yes' : 'No',
        reviewer.country_match || '',
        reviewer.aff_match || '',
        reviewer.sanction_country || 'no',
        reviewer.no_of_pub_condition_10_years || 0,
        reviewer.no_of_pub_condition_5_years || 0,
        reviewer.no_of_pub_condition_2_years || 0,
        reviewer.english_ratio || 0,
        reviewer.english_condition || 0,
        reviewer.coauthor_condition || 0,
        reviewer.aff_condition || 0,
        reviewer.country_match_condition || 0,
        reviewer.retracted_condition || 0,
        reviewer.conditions_met || 0,
        reviewer.conditions_satisfied || ''
      ])
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reviewers');

    // Generate Excel file
    XLSX.writeFile(workbook, `${shortlist.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.xlsx`);
  }

  /**
   * Export shortlist as Word document (HTML-based)
   */
  private exportAsWord(shortlist: Shortlist, reviewers: Reviewer[]): void {
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
  </style>
</head>
<body>
  <h1>Reviewer Shortlist: ${shortlist.name}</h1>
  <p><strong>Created:</strong> ${new Date(shortlist.createdAt).toLocaleDateString()}</p>
  <p><strong>Total Reviewers:</strong> ${reviewers.length}</p>
  
  <h2>Reviewer Details</h2>
  ${reviewers.map((reviewer, index) => `
    <div class="reviewer-section">
      <h3>${index + 1}. ${reviewer.reviewer || 'Unknown'}</h3>
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
          <td>${reviewer.aff || 'N/A'}</td>
        </tr>
        <tr>
          <td class="info-label">Location</td>
          <td>${reviewer.city || 'N/A'}, ${reviewer.country || 'N/A'}</td>
        </tr>
        <tr>
          <th colspan="2">Publication Metrics</th>
        </tr>
        <tr>
          <td class="info-label">Total Publications</td>
          <td>${reviewer.Total_Publications || 0}</td>
        </tr>
        <tr>
          <td class="info-label">Total Publications (First Author)</td>
          <td>${reviewer.Total_Publications_first || 0}</td>
        </tr>
        <tr>
          <td class="info-label">Total Publications (Last Author)</td>
          <td>${reviewer.Total_Publications_last || 0}</td>
        </tr>
        <tr>
          <td class="info-label">Publications (10 years)</td>
          <td>${reviewer['Publications (last 10 years)'] || reviewer.Publications_10_years || 0}</td>
        </tr>
        <tr>
          <td class="info-label">Publications (10 years, First Author)</td>
          <td>${reviewer.Publications_10_years_first || 0}</td>
        </tr>
        <tr>
          <td class="info-label">Publications (10 years, Last Author)</td>
          <td>${reviewer.Publications_10_years_last || 0}</td>
        </tr>
        <tr>
          <td class="info-label">Publications (5 years)</td>
          <td>${reviewer.Publications_5_years || 0}</td>
        </tr>
        <tr>
          <td class="info-label">Publications (5 years, First Author)</td>
          <td>${reviewer.Publications_5_years_first || 0}</td>
        </tr>
        <tr>
          <td class="info-label">Publications (5 years, Last Author)</td>
          <td>${reviewer.Publications_5_years_last || 0}</td>
        </tr>
        <tr>
          <td class="info-label">Relevant Publications (5 years)</td>
          <td>${reviewer['Relevant Publications (last 5 years)'] || reviewer.Relevant_Publications_5_years || 0}</td>
        </tr>
        <tr>
          <td class="info-label">Relevant Publications (5 years, First Author)</td>
          <td>${reviewer.Relevant_Publications_5_years_first || 0}</td>
        </tr>
        <tr>
          <td class="info-label">Relevant Publications (5 years, Last Author)</td>
          <td>${reviewer.Relevant_Publications_5_years_last || 0}</td>
        </tr>
        <tr>
          <td class="info-label">Publications (2 years)</td>
          <td>${reviewer['Publications (last 2 years)'] || reviewer.Publications_2_years || 0}</td>
        </tr>
        <tr>
          <td class="info-label">Publications (2 years, First Author)</td>
          <td>${reviewer.Publications_2_years_first || 0}</td>
        </tr>
        <tr>
          <td class="info-label">Publications (2 years, Last Author)</td>
          <td>${reviewer.Publications_2_years_last || 0}</td>
        </tr>
        <tr>
          <td class="info-label">Relevant Primary Publications (2 years)</td>
          <td>${reviewer.Relevant_Primary_Pub_2_years || 0}</td>
        </tr>
        <tr>
          <td class="info-label">Relevant Secondary Publications (2 years)</td>
          <td>${reviewer.Relevant_Secondary_Pub_2_years || 0}</td>
        </tr>
        <tr>
          <td class="info-label">Publications (last year)</td>
          <td>${reviewer['Publications (last year)'] || reviewer.Publications_last_year || 0}</td>
        </tr>
        <tr>
          <td class="info-label">Publications (last year, First Author)</td>
          <td>${reviewer.Publications_last_year_first || 0}</td>
        </tr>
        <tr>
          <td class="info-label">Publications (last year, Last Author)</td>
          <td>${reviewer.Publications_last_year_last || 0}</td>
        </tr>
        <tr>
          <td class="info-label">English Publications</td>
          <td>${reviewer.English_Pubs || 0}</td>
        </tr>
        <tr>
          <td class="info-label">English Ratio</td>
          <td>${reviewer.english_ratio || 0}</td>
        </tr>
        <tr>
          <th colspan="2">Research Focus</th>
        </tr>
        <tr>
          <td class="info-label">Clinical Trials</td>
          <td>${reviewer.Clinical_Trials_no || 0}</td>
        </tr>
        <tr>
          <td class="info-label">Clinical Studies</td>
          <td>${reviewer.Clinical_study_no || 0}</td>
        </tr>
        <tr>
          <td class="info-label">Case Reports</td>
          <td>${reviewer.Case_reports_no || 0}</td>
        </tr>
        <tr>
          <td class="info-label">Retracted Publications</td>
          <td>${reviewer.Retracted_Pubs_no || 0}</td>
        </tr>
        <tr>
          <td class="info-label">T&F Publications (last year)</td>
          <td>${reviewer.TF_Publications_last_year || 0}</td>
        </tr>
        <tr>
          <th colspan="2">Validation Status</th>
        </tr>
        <tr>
          <td class="info-label">Coauthor</td>
          <td>${reviewer.coauthor ? 'Yes' : 'No'}</td>
        </tr>
        <tr>
          <td class="info-label">Affiliation Match</td>
          <td>${reviewer.aff_match || 'N/A'}</td>
        </tr>
        <tr>
          <td class="info-label">Country Match</td>
          <td>${reviewer.country_match || 'N/A'}</td>
        </tr>
        <tr>
          <td class="info-label">Sanction Country</td>
          <td>${reviewer.sanction_country || 'no'}</td>
        </tr>
        <tr>
          <td class="info-label">Conditions Met</td>
          <td>${reviewer.conditions_met || 0}/9</td>
        </tr>
        <tr>
          <td class="info-label">Conditions Satisfied</td>
          <td>${reviewer.conditions_satisfied || 'N/A'}</td>
        </tr>
        <tr>
          <th colspan="2">Validation Conditions</th>
        </tr>
        <tr>
          <td class="info-label">Publications (10 years) Condition</td>
          <td>${reviewer.no_of_pub_condition_10_years || 0}</td>
        </tr>
        <tr>
          <td class="info-label">Publications (5 years) Condition</td>
          <td>${reviewer.no_of_pub_condition_5_years || 0}</td>
        </tr>
        <tr>
          <td class="info-label">Publications (2 years) Condition</td>
          <td>${reviewer.no_of_pub_condition_2_years || 0}</td>
        </tr>
        <tr>
          <td class="info-label">English Condition</td>
          <td>${reviewer.english_condition || 0}</td>
        </tr>
        <tr>
          <td class="info-label">Coauthor Condition</td>
          <td>${reviewer.coauthor_condition || 0}</td>
        </tr>
        <tr>
          <td class="info-label">Affiliation Condition</td>
          <td>${reviewer.aff_condition || 0}</td>
        </tr>
        <tr>
          <td class="info-label">Country Match Condition</td>
          <td>${reviewer.country_match_condition || 0}</td>
        </tr>
        <tr>
          <td class="info-label">Retracted Condition</td>
          <td>${reviewer.retracted_condition || 0}</td>
        </tr>
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
  }

  /**
   * Export a shortlist in the specified format
   */
  async exportShortlist(processId: string, shortlistId: string, format: 'csv' | 'xlsx' | 'docx'): Promise<void> {
    try {
      const shortlist = await this.getShortlist(processId, shortlistId);
      const reviewers = await this.getReviewerDetails(processId, shortlist.selectedReviewers);

      if (reviewers.length === 0) {
        throw new Error('No reviewer details found for export');
      }

      console.log('[ShortlistService] Exporting shortlist:', shortlist.name, 'Format:', format, 'Reviewers:', reviewers.length);

      switch (format) {
        case 'csv':
          this.exportAsCSV(shortlist, reviewers);
          break;
        case 'xlsx':
          this.exportAsExcel(shortlist, reviewers);
          break;
        case 'docx':
          this.exportAsWord(shortlist, reviewers);
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