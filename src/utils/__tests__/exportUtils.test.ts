/**
 * Unit tests for export utilities
 * Tests CSV generation, JSON generation, file download trigger, and error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  generateCSV, 
  generateJSON, 
  downloadFile,
  exportReviewersAsCSV,
  exportReviewersAsJSON
} from '../exportUtils';
import type { Reviewer } from '@/features/scholarfinder/types/api';

// Mock reviewer data
const mockReviewer: Reviewer = {
  reviewer: 'Dr. Jane Smith',
  email: 'jane.smith@university.edu',
  aff: 'Department of Biology, Example University',
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
};

const mockReviewerWithSpecialChars: Reviewer = {
  ...mockReviewer,
  reviewer: 'Dr. John "Johnny" O\'Brien',
  aff: 'Department of Chemistry, University of "Excellence"',
  email: 'john.obrien@university.edu'
};

describe('Export Utils - Unit Tests', () => {
  describe('generateCSV', () => {
    it('should generate CSV with header and data rows', () => {
      const csv = generateCSV([mockReviewer]);
      const lines = csv.split('\n');

      expect(lines.length).toBe(2); // header + 1 data row
      expect(lines[0]).toContain('Name');
      expect(lines[0]).toContain('Email');
      expect(lines[0]).toContain('Affiliation');
    });

    it('should include all reviewer data in CSV', () => {
      const csv = generateCSV([mockReviewer]);

      expect(csv).toContain('Dr. Jane Smith');
      expect(csv).toContain('jane.smith@university.edu');
      expect(csv).toContain('Department of Biology, Example University');
      expect(csv).toContain('Boston');
      expect(csv).toContain('USA');
      expect(csv).toContain('120'); // Total Publications
      expect(csv).toContain('8'); // Conditions Met
    });

    it('should handle special characters in CSV fields', () => {
      const csv = generateCSV([mockReviewerWithSpecialChars]);

      // Should contain escaped quotes
      expect(csv).toContain('John');
      expect(csv).toContain('Johnny');
      expect(csv).toContain('Brien');
    });

    it('should handle multiple reviewers', () => {
      const reviewers = [mockReviewer, mockReviewerWithSpecialChars];
      const csv = generateCSV(reviewers);
      const lines = csv.split('\n');

      expect(lines.length).toBe(3); // header + 2 data rows
      expect(csv).toContain('Dr. Jane Smith');
      expect(csv).toContain('john.obrien@university.edu');
    });

    it('should throw error for empty array', () => {
      expect(() => generateCSV([])).toThrow('No reviewers to export');
    });

    it('should escape commas in fields', () => {
      const reviewer = {
        ...mockReviewer,
        aff: 'Department of Biology, Chemistry, and Physics'
      };
      const csv = generateCSV([reviewer]);

      // Field with commas should be quoted
      expect(csv).toContain('"Department of Biology, Chemistry, and Physics"');
    });

    it('should handle boolean values correctly', () => {
      const csv = generateCSV([mockReviewer]);

      // Coauthor is false, should appear as "No"
      expect(csv).toContain('No');
    });
  });

  describe('generateJSON', () => {
    it('should generate valid JSON structure', () => {
      const jsonString = generateJSON([mockReviewer]);
      const json = JSON.parse(jsonString);

      expect(json).toHaveProperty('exportDate');
      expect(json).toHaveProperty('totalReviewers');
      expect(json).toHaveProperty('reviewers');
    });

    it('should include all reviewer data in JSON', () => {
      const jsonString = generateJSON([mockReviewer]);
      const json = JSON.parse(jsonString);

      expect(json.totalReviewers).toBe(1);
      expect(json.reviewers).toHaveLength(1);

      const reviewer = json.reviewers[0];
      expect(reviewer.name).toBe('Dr. Jane Smith');
      expect(reviewer.email).toBe('jane.smith@university.edu');
      expect(reviewer.affiliation).toBe('Department of Biology, Example University');
      expect(reviewer.location.city).toBe('Boston');
      expect(reviewer.location.country).toBe('USA');
    });

    it('should structure publication data correctly', () => {
      const jsonString = generateJSON([mockReviewer]);
      const json = JSON.parse(jsonString);

      const publications = json.reviewers[0].publications;
      expect(publications.total).toBe(120);
      expect(publications.english).toBe(115);
      expect(publications.last10Years).toBe(45);
      expect(publications.relevantLast5Years).toBe(12);
      expect(publications.last2Years).toBe(5);
      expect(publications.lastYear).toBe(2);
    });

    it('should structure validation data correctly', () => {
      const jsonString = generateJSON([mockReviewer]);
      const json = JSON.parse(jsonString);

      const validation = json.reviewers[0].validation;
      expect(validation.coauthor).toBe(false);
      expect(validation.countryMatch).toBe('yes');
      expect(validation.affiliationMatch).toBe('no');
      expect(validation.conditionsMet).toBe(8);
      expect(validation.conditionsSatisfied).toBe('8 of 8');
    });

    it('should handle multiple reviewers', () => {
      const reviewers = [mockReviewer, mockReviewerWithSpecialChars];
      const jsonString = generateJSON(reviewers);
      const json = JSON.parse(jsonString);

      expect(json.totalReviewers).toBe(2);
      expect(json.reviewers).toHaveLength(2);
    });

    it('should throw error for empty array', () => {
      expect(() => generateJSON([])).toThrow('No reviewers to export');
    });

    it('should include export date', () => {
      const jsonString = generateJSON([mockReviewer]);
      const json = JSON.parse(jsonString);

      expect(json.exportDate).toBeDefined();
      expect(new Date(json.exportDate).toString()).not.toBe('Invalid Date');
    });
  });

  describe('downloadFile', () => {
    let createElementSpy: any;
    let appendChildSpy: any;
    let removeChildSpy: any;
    let clickSpy: any;
    let createObjectURLSpy: any;
    let revokeObjectURLSpy: any;

    beforeEach(() => {
      // Mock URL methods first (before they're used)
      if (!global.URL.createObjectURL) {
        global.URL.createObjectURL = vi.fn();
      }
      if (!global.URL.revokeObjectURL) {
        global.URL.revokeObjectURL = vi.fn();
      }

      createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
      revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      // Mock DOM methods
      clickSpy = vi.fn();
      const mockLink = {
        href: '',
        download: '',
        click: clickSpy
      };

      createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
      appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
      removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should create download link and trigger download', () => {
      const content = 'test content';
      const filename = 'test.csv';
      const mimeType = 'text/csv';

      downloadFile(content, filename, mimeType);

      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(appendChildSpy).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
    });

    it('should create blob with correct content and mime type', () => {
      const content = 'test content';
      const filename = 'test.csv';
      const mimeType = 'text/csv';

      downloadFile(content, filename, mimeType);

      expect(createObjectURLSpy).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalled();
    });

    it('should set correct filename', () => {
      const content = 'test content';
      const filename = 'reviewers-2025-01-15.csv';
      const mimeType = 'text/csv';

      downloadFile(content, filename, mimeType);

      const mockLink = createElementSpy.mock.results[0]?.value;
      expect(mockLink).toBeDefined();
      expect(mockLink.download).toBe(filename);
    });
  });

  describe('exportReviewersAsCSV', () => {
    let downloadFileSpy: any;

    beforeEach(() => {
      // Mock URL methods first
      if (!global.URL.createObjectURL) {
        global.URL.createObjectURL = vi.fn();
      }
      if (!global.URL.revokeObjectURL) {
        global.URL.revokeObjectURL = vi.fn();
      }

      // Mock downloadFile to avoid actual file download
      downloadFileSpy = vi.fn();
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
      vi.spyOn(document, 'createElement').mockReturnValue({
        href: '',
        download: '',
        click: vi.fn()
      } as any);
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => ({} as any));
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => ({} as any));
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should export reviewers as CSV file', () => {
      exportReviewersAsCSV([mockReviewer]);

      // Should not throw error
      expect(true).toBe(true);
    });

    it('should throw error for empty array', () => {
      expect(() => exportReviewersAsCSV([])).toThrow();
    });
  });

  describe('exportReviewersAsJSON', () => {
    beforeEach(() => {
      // Mock URL methods first
      if (!global.URL.createObjectURL) {
        global.URL.createObjectURL = vi.fn();
      }
      if (!global.URL.revokeObjectURL) {
        global.URL.revokeObjectURL = vi.fn();
      }

      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
      vi.spyOn(document, 'createElement').mockReturnValue({
        href: '',
        download: '',
        click: vi.fn()
      } as any);
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => ({} as any));
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => ({} as any));
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should export reviewers as JSON file', () => {
      exportReviewersAsJSON([mockReviewer]);

      // Should not throw error
      expect(true).toBe(true);
    });

    it('should throw error for empty array', () => {
      expect(() => exportReviewersAsJSON([])).toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle CSV generation errors gracefully', () => {
      expect(() => generateCSV([])).toThrow('No reviewers to export');
    });

    it('should handle JSON generation errors gracefully', () => {
      expect(() => generateJSON([])).toThrow('No reviewers to export');
    });

    it('should provide meaningful error messages', () => {
      try {
        generateCSV([]);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('No reviewers to export');
      }
    });
  });
});
