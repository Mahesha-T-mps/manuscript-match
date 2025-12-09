/**
 * Unit tests for ReviewerSearch component
 * Tests specific behaviors and UI interactions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReviewerSearch } from '../ReviewerSearch';

// Mock hooks
vi.mock('../../../hooks/useKeywords', () => ({
  useKeywords: vi.fn(() => ({
    data: {
      original: ['keyword1', 'keyword2'],
      enhanced: ['enhanced1', 'enhanced2'],
      meshTerms: ['mesh1', 'mesh2']
    },
    isLoading: false,
    error: null
  }))
}));

vi.mock('../../../hooks/useSearch', () => ({
  useInitiateSearch: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false
  })),
  useSearchProgress: vi.fn(() => ({
    status: 'NOT_STARTED',
    progress: {},
    totalFound: 0,
    progressPercentage: 0,
    isSearching: false,
    isCompleted: false,
    isFailed: false,
    isNotStarted: true,
    isLoading: false,
    error: null
  })),
  useSearchByName: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue([]),
    isPending: false,
    data: null
  })),
  useSearchByEmail: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue([]),
    isPending: false,
    data: null
  }))
}));

vi.mock('../../../hooks/use-toast', () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn()
  }))
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('ReviewerSearch Component', () => {
  const defaultProps = {
    processId: 'test-process-123',
    primaryKeywords: ['keyword1', 'keyword2'],
    secondaryKeywords: ['mesh1', 'mesh2'],
    onKeywordsChange: vi.fn(),
    onSearchComplete: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Database Selection Logic', () => {
    it('should display all four database checkboxes', () => {
      render(<ReviewerSearch {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByLabelText(/PubMed/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Taylor & Francis Online/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/ScienceDirect/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Wiley Online Library/i)).toBeInTheDocument();
    });

    it('should display database descriptions', () => {
      render(<ReviewerSearch {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByText(/Medical and biomedical literature/i)).toBeInTheDocument();
      expect(screen.getByText(/Academic journals and books/i)).toBeInTheDocument();
      expect(screen.getByText(/Scientific and academic research/i)).toBeInTheDocument();
      expect(screen.getByText(/Scientific research and journals/i)).toBeInTheDocument();
    });
  });

  describe('Search Initiation', () => {
    it('should display search button', () => {
      render(<ReviewerSearch {...defaultProps} />, { wrapper: createWrapper() });

      const searchButton = screen.getByRole('button', { name: /Search for Reviewers/i });
      expect(searchButton).toBeInTheDocument();
    });

    it('should display database search section', () => {
      render(<ReviewerSearch {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByText(/Search Databases/i)).toBeInTheDocument();
      expect(screen.getByText(/Select databases to search for potential reviewers/i)).toBeInTheDocument();
    });
  });

  describe('Results Display', () => {
    it('should not display search progress when search has not started', () => {
      render(<ReviewerSearch {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.queryByText(/Search Progress/i)).not.toBeInTheDocument();
    });
  });

  describe('Keyword String Display', () => {
    it('should display formatted keyword string', () => {
      render(<ReviewerSearch {...defaultProps} />, { wrapper: createWrapper() });

      // Should display the Boolean query format
      expect(screen.getByText(/\(keyword1 OR keyword2\) AND \(mesh1 OR mesh2\)/i)).toBeInTheDocument();
    });

    it('should display "No keywords selected" when no keywords are present', () => {
      const propsWithoutKeywords = {
        ...defaultProps,
        primaryKeywords: [],
        secondaryKeywords: []
      };

      render(<ReviewerSearch {...propsWithoutKeywords} />, { wrapper: createWrapper() });

      expect(screen.getByText(/No keywords selected/i)).toBeInTheDocument();
    });
  });
});
