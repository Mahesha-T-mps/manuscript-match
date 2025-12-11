/**
 * Shortlist management service
 * Handles creating, managing, and exporting reviewer shortlists
 * Uses localStorage for ScholarFinder workflow
 */

import { apiService } from './apiService';
import type { 
  Shortlist, 
  CreateShortlistRequest, 
  UpdateShortlistRequest,
  ApiResponse 
} from '../types/api';

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
   * Export a shortlist in the specified format
   */
  async exportShortlist(processId: string, shortlistId: string, format: 'csv' | 'xlsx' | 'docx'): Promise<void> {
    try {
      const shortlist = await this.getShortlist(processId, shortlistId);
      
      // For now, just download as JSON - can be enhanced later
      const dataStr = JSON.stringify(shortlist, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${shortlist.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log('[ShortlistService] Exported shortlist:', shortlist.name);
    } catch (error) {
      console.error('Failed to export shortlist:', error);
      throw error;
    }
  }
}

// Create and export service instance
export const shortlistService = new ShortlistService();
export default shortlistService;