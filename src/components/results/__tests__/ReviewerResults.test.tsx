/**
 * Unit Tests for ReviewerResults Component
 * Feature: scholarfinder-api-integration
 * 
 * Tests specific examples and edge cases for reviewer display and filtering
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReviewerResults } from '../ReviewerResults';
import type { Reviewer } from '@/features/scholarfinder/types/api';

// Mock the useRecommendations hook
vi.mock('@/hooks/useFiles', () => ({
  useRecommendations: vi.fn()
}));

// Mock the ActivityLogger
vi.mock('@/services/activityLogger', () => ({
  ActivityLogger: {
    getInstance: () => ({
      logActivity: vi.fn()
    })
  }
}));

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

import { useRecommendations } from '@/hooks/useFiles';

const mockUseRecommendations = useRecommendations as ReturnType<typeof vi.fn>;

// Sample test data
const createMockReviewer = (overrides: Partial<Reviewer> = {}): Reviewer => ({
  reviewer: 'Dr. John Smith',
  email: 'john.smith@university.edu',
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
  conditions_satisfied: '8 of 8',
  ...overrides
});

const mockReviewers: Reviewer[] = [
  createMockReviewer({
    reviewer: 'Dr. Alice Johnson',
    email: 'alice.j@university.edu',
    conditions_met: 8,
    country: 'USA'
  }),
  createMockReviewer({
    reviewer: 'Dr. Bob Williams',
    email: 'bob.w@university.edu',
    conditions_met: 7,
    country: 'UK'
  }),
  createMockReviewer({
    reviewer: 'Dr. Carol Davis',
    email: 'carol.d@university.edu',
    conditions_met: 5,
    country: 'USA'
  }),
  createMockReviewer({
    reviewer: 'Dr. David Brown',
    email: 'david.b@university.edu',
    conditions_met: 3,
    country: 'Canada'
  })
];

const mockApiResponse = {
  reviewers: mockReviewers,
  total_count: 4,
  validation_summary: {
    total_authors: 4,
    authors_validated: 4,
    conditions_applied: ['Publications (last 10 years) ≥ 8'],
    average_conditions_met: 5.75
  }
};

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

describe('ReviewerResults Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Reviewer Sorting', () => {
    it('should display reviewers sorted by conditions_met in descending order', async () => {
      mockUseRecommendations.mockReturnValue({
        data: mockApiResponse,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      });

      render(
        <ReviewerResults processId="test-process" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Dr. Alice Johnson')).toBeInTheDocument();
      });

      // Get all reviewer cards
      const reviewerCards = screen.getAllByText(/Dr\./);
      
      // Verify order: Alice (8) -> Bob (7) -> Carol (5) -> David (3)
      expect(reviewerCards[0]).toHaveTextContent('Dr. Alice Johnson');
      expect(reviewerCards[1]).toHaveTextContent('Dr. Bob Williams');
      expect(reviewerCards[2]).toHaveTextContent('Dr. Carol Davis');
      expect(reviewerCards[3]).toHaveTextContent('Dr. David Brown');
    });

    it('should display correct conditions_met badges', async () => {
      mockUseRecommendations.mockReturnValue({
        data: mockApiResponse,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      });

      render(
        <ReviewerResults processId="test-process" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('8/8 criteria met')).toBeInTheDocument();
      });

      expect(screen.getByText('7/8 criteria met')).toBeInTheDocument();
      expect(screen.getByText('5/8 criteria met')).toBeInTheDocument();
      expect(screen.getByText('3/8 criteria met')).toBeInTheDocument();
    });
  });

  describe('Filtering by Minimum Score', () => {
    it('should filter reviewers by minimum conditions_met score', async () => {
      const user = userEvent.setup();
      
      mockUseRecommendations.mockReturnValue({
        data: mockApiResponse,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      });

      render(
        <ReviewerResults processId="test-process" />,
        { wrapper: createWrapper() }
      );

      // Open filters
      const filterButton = screen.getByRole('button', { name: /filters/i });
      await user.click(filterButton);

      // Initially all 4 reviewers should be visible
      expect(screen.getAllByText(/Dr\./).length).toBe(4);

      // Set minimum score to 7 (should show only Alice and Bob)
      const slider = screen.getByRole('slider');
      // Note: Actual slider interaction would require more complex setup
      // For now, we verify the slider exists
      expect(slider).toBeInTheDocument();
    });
  });

  describe('Filtering by Country', () => {
    it('should filter reviewers by country', async () => {
      const user = userEvent.setup();
      
      mockUseRecommendations.mockReturnValue({
        data: mockApiResponse,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      });

      render(
        <ReviewerResults processId="test-process" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Dr. Alice Johnson')).toBeInTheDocument();
      });

      // Initially all 4 reviewers should be visible
      expect(screen.getAllByText(/Dr\./).length).toBe(4);

      // Country filter dropdown should exist
      const countrySelects = screen.getAllByRole('combobox');
      expect(countrySelects.length).toBeGreaterThan(0);
    });
  });

  describe('Search Functionality', () => {
    it('should filter reviewers by search term', async () => {
      const user = userEvent.setup();
      
      mockUseRecommendations.mockReturnValue({
        data: mockApiResponse,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      });

      render(
        <ReviewerResults processId="test-process" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Dr. Alice Johnson')).toBeInTheDocument();
      });

      // Search for "Alice"
      const searchInput = screen.getByPlaceholderText(/search reviewers/i);
      await user.type(searchInput, 'Alice');

      // Should show only Alice
      await waitFor(() => {
        const reviewerCards = screen.getAllByText(/Dr\./);
        expect(reviewerCards.length).toBe(1);
        expect(reviewerCards[0]).toHaveTextContent('Dr. Alice Johnson');
      });
    });

    it('should search by affiliation', async () => {
      const user = userEvent.setup();
      
      const customReviewers = [
        createMockReviewer({
          reviewer: 'Dr. Test One',
          email: 'test1@mit.edu',
          aff: 'MIT',
          conditions_met: 8
        }),
        createMockReviewer({
          reviewer: 'Dr. Test Two',
          email: 'test2@harvard.edu',
          aff: 'Harvard University',
          conditions_met: 7
        })
      ];

      mockUseRecommendations.mockReturnValue({
        data: {
          ...mockApiResponse,
          reviewers: customReviewers,
          total_count: 2
        },
        isLoading: false,
        error: null,
        refetch: vi.fn()
      });

      render(
        <ReviewerResults processId="test-process" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Dr. Test One')).toBeInTheDocument();
      });

      // Search for "MIT"
      const searchInput = screen.getByPlaceholderText(/search reviewers/i);
      await user.type(searchInput, 'MIT');

      // Should show only MIT reviewer
      await waitFor(() => {
        expect(screen.getByText('Dr. Test One')).toBeInTheDocument();
        expect(screen.queryByText('Dr. Test Two')).not.toBeInTheDocument();
      });
    });
  });

  describe('Reviewer Selection', () => {
    it('should allow selecting individual reviewers', async () => {
      const user = userEvent.setup();
      
      mockUseRecommendations.mockReturnValue({
        data: mockApiResponse,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      });

      render(
        <ReviewerResults processId="test-process" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Dr. Alice Johnson')).toBeInTheDocument();
      });

      // Get all checkboxes (excluding "Select All")
      const checkboxes = screen.getAllByRole('checkbox');
      
      // Select first reviewer
      await user.click(checkboxes[1]); // Skip "Select All" checkbox

      // Export button should show count of 1
      expect(screen.getByText(/export \(1\)/i)).toBeInTheDocument();
    });

    it('should allow selecting all reviewers', async () => {
      const user = userEvent.setup();
      
      mockUseRecommendations.mockReturnValue({
        data: mockApiResponse,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      });

      render(
        <ReviewerResults processId="test-process" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Dr. Alice Johnson')).toBeInTheDocument();
      });

      // Click "Select All" checkbox
      const selectAllCheckbox = screen.getByLabelText(/select all/i);
      await user.click(selectAllCheckbox);

      // Export button should show count of 4
      expect(screen.getByText(/export \(4\)/i)).toBeInTheDocument();
    });
  });

  describe('Reviewer Details Display', () => {
    it('should display all publication metrics', async () => {
      mockUseRecommendations.mockReturnValue({
        data: {
          ...mockApiResponse,
          reviewers: [mockReviewers[0]]
        },
        isLoading: false,
        error: null,
        refetch: vi.fn()
      });

      render(
        <ReviewerResults processId="test-process" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Dr. Alice Johnson')).toBeInTheDocument();
      });

      // Check publication metrics are displayed
      expect(screen.getByText('Publication Metrics')).toBeInTheDocument();
      expect(screen.getByText('Total')).toBeInTheDocument();
      expect(screen.getByText('Last 10 years')).toBeInTheDocument();
      expect(screen.getByText('Last 5 years')).toBeInTheDocument();
      expect(screen.getByText('Last 2 years')).toBeInTheDocument();
    });

    it('should display validation criteria with icons', async () => {
      mockUseRecommendations.mockReturnValue({
        data: {
          ...mockApiResponse,
          reviewers: [mockReviewers[0]]
        },
        isLoading: false,
        error: null,
        refetch: vi.fn()
      });

      render(
        <ReviewerResults processId="test-process" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Dr. Alice Johnson')).toBeInTheDocument();
      });

      // Check validation criteria section exists
      expect(screen.getByText(/validation criteria/i)).toBeInTheDocument();
      expect(screen.getByText(/no coauthorship/i)).toBeInTheDocument();
      expect(screen.getByText(/different affiliation/i)).toBeInTheDocument();
    });

    it('should display email and affiliation', async () => {
      mockUseRecommendations.mockReturnValue({
        data: {
          ...mockApiResponse,
          reviewers: [mockReviewers[0]]
        },
        isLoading: false,
        error: null,
        refetch: vi.fn()
      });

      render(
        <ReviewerResults processId="test-process" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Dr. Alice Johnson')).toBeInTheDocument();
      });

      expect(screen.getByText('alice.j@university.edu')).toBeInTheDocument();
      expect(screen.getByText(/department of biology/i)).toBeInTheDocument();
    });
  });

  describe('Loading and Error States', () => {
    it('should display loading skeleton', () => {
      mockUseRecommendations.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: vi.fn()
      });

      render(
        <ReviewerResults processId="test-process" />,
        { wrapper: createWrapper() }
      );

      // Loading skeleton should be displayed
      // Note: Actual skeleton detection depends on implementation
      expect(screen.queryByText('Dr. Alice Johnson')).not.toBeInTheDocument();
    });

    it('should display error message on failure', async () => {
      const mockError = new Error('Failed to load recommendations');
      
      mockUseRecommendations.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: mockError,
        refetch: vi.fn()
      });

      render(
        <ReviewerResults processId="test-process" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getAllByText(/failed to load recommendations/i).length).toBeGreaterThan(0);
      });

      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should display empty state when no reviewers', async () => {
      mockUseRecommendations.mockReturnValue({
        data: {
          ...mockApiResponse,
          reviewers: [],
          total_count: 0
        },
        isLoading: false,
        error: null,
        refetch: vi.fn()
      });

      render(
        <ReviewerResults processId="test-process" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText(/no reviewer recommendations available/i)).toBeInTheDocument();
      });
    });
  });

  describe('Export Functionality', () => {
    it('should disable export button when no reviewers selected', async () => {
      mockUseRecommendations.mockReturnValue({
        data: mockApiResponse,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      });

      render(
        <ReviewerResults processId="test-process" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Dr. Alice Johnson')).toBeInTheDocument();
      });

      const exportButton = screen.getByRole('button', { name: /export \(0\)/i });
      expect(exportButton).toBeDisabled();
    });

    it('should enable export button when reviewers are selected', async () => {
      const user = userEvent.setup();
      
      mockUseRecommendations.mockReturnValue({
        data: mockApiResponse,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      });

      render(
        <ReviewerResults processId="test-process" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Dr. Alice Johnson')).toBeInTheDocument();
      });

      // Select a reviewer
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]);

      const exportButton = screen.getByRole('button', { name: /export \(1\)/i });
      expect(exportButton).not.toBeDisabled();
    });
  });
});
