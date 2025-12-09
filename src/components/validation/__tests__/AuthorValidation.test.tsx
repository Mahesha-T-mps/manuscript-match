/**
 * Tests for AuthorValidation component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthorValidation } from '../AuthorValidation';
import { useValidation, useAddManualAuthor } from '@/hooks/useValidation';
import type { ValidationResults } from '@/types/api';

// Mock config
vi.mock('@/lib/config', () => ({
  config: {
    apiBaseUrl: 'http://localhost:3000',
    apiTimeout: 30000,
    enableDebugLogging: false,
  },
}));

// Mock the validation hooks
vi.mock('@/hooks/useValidation');
const mockUseValidation = useValidation as any;
const mockUseAddManualAuthor = useAddManualAuthor as any;

// Mock ValidationResponse type
interface ValidationStatusData {
  validation_status: 'in_progress' | 'completed' | 'failed';
  progress_percentage: number;
  estimated_completion_time?: string;
  total_authors_processed: number;
  validation_criteria: string[];
  summary?: {
    total_authors: number;
    authors_validated: number;
    conditions_applied: string[];
    average_conditions_met: number;
  };
}

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const mockValidationStatus: ValidationStatusData = {
  validation_status: 'completed',
  progress_percentage: 100,
  total_authors_processed: 75,
  validation_criteria: [
    'Publications (last 10 years) ≥ 8',
    'Relevant Publications (last 5 years) ≥ 3',
    'Publications (last 2 years) ≥ 1',
    'English Publications > 50%',
    'No Coauthorship',
    'Different Affiliation',
    'Same Country',
    'No Retracted Publications'
  ],
  summary: {
    total_authors: 100,
    authors_validated: 75,
    conditions_applied: [
      'Publications (last 10 years) ≥ 8',
      'Relevant Publications (last 5 years) ≥ 3',
    ],
    average_conditions_met: 6.5,
  },
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('AuthorValidation', () => {
  const mockValidateAuthors = vi.fn();
  const mockRefetchStatus = vi.fn();
  const mockMutateAsync = vi.fn();
  const onValidationComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseValidation.mockReturnValue({
      validateAuthors: mockValidateAuthors,
      refetchStatus: mockRefetchStatus,
      isValidating: false,
      validationError: null,
      validationStatus: null,
      isLoadingStatus: false,
      statusError: null,
      hasValidationStarted: false,
      isPolling: false,
      isLoading: false,
    });

    mockUseAddManualAuthor.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      isError: false,
      error: null,
      data: undefined,
      isSuccess: false,
      isIdle: true,
      mutate: vi.fn(),
      reset: vi.fn(),
      status: 'idle',
      variables: undefined,
      context: undefined,
      failureCount: 0,
      failureReason: null,
      isPaused: false,
      submittedAt: 0,
    } as any);
  });

  it('should render validation form', () => {
    render(
      <AuthorValidation 
        processId="process-1" 
        onValidationComplete={onValidationComplete}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Author Validation')).toBeInTheDocument();
    expect(screen.getByText('Validate potential reviewers against conflict of interest rules and publication criteria.')).toBeInTheDocument();
    expect(screen.getByText('Start Validation')).toBeInTheDocument();
  });

  it('should handle validation button click', async () => {
    mockValidateAuthors.mockResolvedValue(mockValidationStatus);

    render(
      <AuthorValidation 
        processId="process-1" 
        onValidationComplete={onValidationComplete}
      />,
      { wrapper: createWrapper() }
    );

    const validateButton = screen.getByText('Start Validation');
    fireEvent.click(validateButton);

    await waitFor(() => {
      expect(mockValidateAuthors).toHaveBeenCalled();
    });
  });

  it('should show loading state during validation', () => {
    mockUseValidation.mockReturnValue({
      validateAuthors: mockValidateAuthors,
      refetchStatus: mockRefetchStatus,
      isValidating: true,
      validationError: null,
      validationStatus: null,
      isLoadingStatus: false,
      statusError: null,
      hasValidationStarted: false,
      isPolling: false,
      isLoading: true,
    });

    render(
      <AuthorValidation 
        processId="process-1" 
        onValidationComplete={onValidationComplete}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Start Validation')).toBeDisabled();
  });

  it('should display validation error', () => {
    const error = new Error('Validation failed');
    mockUseValidation.mockReturnValue({
      validateAuthors: mockValidateAuthors,
      refetchStatus: mockRefetchStatus,
      isValidating: false,
      validationError: error,
      validationStatus: null,
      isLoadingStatus: false,
      statusError: null,
      hasValidationStarted: false,
      isPolling: false,
      isLoading: false,
    });

    render(
      <AuthorValidation 
        processId="process-1" 
        onValidationComplete={onValidationComplete}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getAllByText('Validation failed').length).toBeGreaterThan(0);
    expect(screen.getByText('Retry Validation')).toBeInTheDocument();
  });

  it('should display validation progress when in progress', () => {
    const inProgressStatus: ValidationStatusData = {
      validation_status: 'in_progress',
      progress_percentage: 45,
      estimated_completion_time: '2 minutes',
      total_authors_processed: 45,
      validation_criteria: [
        'Publications (last 10 years) ≥ 8',
        'Relevant Publications (last 5 years) ≥ 3',
      ],
    };

    mockUseValidation.mockReturnValue({
      validateAuthors: mockValidateAuthors,
      refetchStatus: mockRefetchStatus,
      isValidating: false,
      validationError: null,
      validationStatus: inProgressStatus,
      isLoadingStatus: false,
      statusError: null,
      hasValidationStarted: true,
      isPolling: true,
      isLoading: false,
    });

    render(
      <AuthorValidation 
        processId="process-1" 
        onValidationComplete={onValidationComplete}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Validation in progress...')).toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();
    expect(screen.getByText('2 minutes')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
  });

  it('should display validation completion message', () => {
    mockUseValidation.mockReturnValue({
      validateAuthors: mockValidateAuthors,
      refetchStatus: mockRefetchStatus,
      isValidating: false,
      validationError: null,
      validationStatus: mockValidationStatus,
      isLoadingStatus: false,
      statusError: null,
      hasValidationStarted: true,
      isPolling: false,
      isLoading: false,
    });

    render(
      <AuthorValidation 
        processId="process-1" 
        onValidationComplete={onValidationComplete}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Validation completed successfully!')).toBeInTheDocument();
    expect(screen.getByText(/Total authors validated: 75 of 100/)).toBeInTheDocument();
    expect(screen.getByText(/Average conditions met: 6.5 of 8/)).toBeInTheDocument();
  });

  it('should show re-validate button when validation is complete', () => {
    mockUseValidation.mockReturnValue({
      validateAuthors: mockValidateAuthors,
      refetchStatus: mockRefetchStatus,
      isValidating: false,
      validationError: null,
      validationStatus: mockValidationStatus,
      isLoadingStatus: false,
      statusError: null,
      hasValidationStarted: true,
      isPolling: false,
      isLoading: false,
    });

    render(
      <AuthorValidation 
        processId="process-1" 
        onValidationComplete={onValidationComplete}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Re-validate Authors')).toBeInTheDocument();
    expect(screen.getByText('Validate Again')).toBeInTheDocument();
  });

  // Manual Author Addition Tests
  describe('Manual Author Addition', () => {
    it('should render manual author search UI', () => {
      render(
        <AuthorValidation 
          processId="process-1" 
          onValidationComplete={onValidationComplete}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Add Manual Author')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter author name (minimum 2 characters)')).toBeInTheDocument();
      expect(screen.getByText('Search Author')).toBeInTheDocument();
    });

    it('should validate author name input - minimum 2 characters', () => {
      render(
        <AuthorValidation 
          processId="process-1" 
          onValidationComplete={onValidationComplete}
        />,
        { wrapper: createWrapper() }
      );

      const input = screen.getByPlaceholderText('Enter author name (minimum 2 characters)');
      const searchButton = screen.getByText('Search Author');

      // Initially button should be disabled
      expect(searchButton).toBeDisabled();

      // Type 1 character - should show error
      fireEvent.change(input, { target: { value: 'A' } });
      expect(screen.getByText('Author name must be at least 2 characters')).toBeInTheDocument();
      expect(searchButton).toBeDisabled();

      // Type 2 characters - should enable button
      fireEvent.change(input, { target: { value: 'Ab' } });
      expect(screen.queryByText('Author name must be at least 2 characters')).not.toBeInTheDocument();
      expect(searchButton).not.toBeDisabled();
    });

    it('should call search API when search button is clicked', async () => {
      const mockResults = {
        found_authors: [
          {
            name: 'Dr. John Smith',
            email: 'john@example.com',
            affiliation: 'University of Example',
            country: 'USA',
            publications: 50,
          },
        ],
        search_term: 'John Smith',
        total_found: 1,
      };

      mockMutateAsync.mockResolvedValue(mockResults);

      render(
        <AuthorValidation 
          processId="process-1" 
          onValidationComplete={onValidationComplete}
        />,
        { wrapper: createWrapper() }
      );

      const input = screen.getByPlaceholderText('Enter author name (minimum 2 characters)');
      const searchButton = screen.getByText('Search Author');

      fireEvent.change(input, { target: { value: 'John Smith' } });
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith('John Smith');
      });
    });

    it('should display search results', async () => {
      const mockResults = {
        found_authors: [
          {
            name: 'Dr. John Smith',
            email: 'john@example.com',
            affiliation: 'University of Example',
            country: 'USA',
            publications: 50,
          },
          {
            name: 'Dr. Jane Smith',
            email: 'jane@example.com',
            affiliation: 'Another University',
            country: 'UK',
            publications: 30,
          },
        ],
        search_term: 'Smith',
        total_found: 2,
      };

      mockMutateAsync.mockResolvedValue(mockResults);

      render(
        <AuthorValidation 
          processId="process-1" 
          onValidationComplete={onValidationComplete}
        />,
        { wrapper: createWrapper() }
      );

      const input = screen.getByPlaceholderText('Enter author name (minimum 2 characters)');
      const searchButton = screen.getByText('Search Author');

      fireEvent.change(input, { target: { value: 'Smith' } });
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText('Found 2 author(s) matching "Smith"')).toBeInTheDocument();
        expect(screen.getByText('Dr. John Smith')).toBeInTheDocument();
        expect(screen.getByText('Dr. Jane Smith')).toBeInTheDocument();
        expect(screen.getByText('University of Example')).toBeInTheDocument();
        expect(screen.getByText('Another University')).toBeInTheDocument();
      });
    });

    it('should handle author selection', async () => {
      const mockResults = {
        found_authors: [
          {
            name: 'Dr. John Smith',
            email: 'john@example.com',
            affiliation: 'University of Example',
            country: 'USA',
            publications: 50,
          },
        ],
        search_term: 'John Smith',
        total_found: 1,
      };

      mockMutateAsync.mockResolvedValue(mockResults);

      render(
        <AuthorValidation 
          processId="process-1" 
          onValidationComplete={onValidationComplete}
        />,
        { wrapper: createWrapper() }
      );

      const input = screen.getByPlaceholderText('Enter author name (minimum 2 characters)');
      const searchButton = screen.getByText('Search Author');

      fireEvent.change(input, { target: { value: 'John Smith' } });
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText('Dr. John Smith')).toBeInTheDocument();
      });

      // Click select button
      const selectButtons = screen.getAllByText('Select');
      fireEvent.click(selectButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Selected Authors (1)')).toBeInTheDocument();
        expect(screen.getByText('1 author(s) added to potential reviewers list. These authors will be included in the validation process.')).toBeInTheDocument();
      });
    });

    it('should handle no results case', async () => {
      const mockResults = {
        found_authors: [],
        search_term: 'NonexistentAuthor',
        total_found: 0,
      };

      mockMutateAsync.mockResolvedValue(mockResults);

      render(
        <AuthorValidation 
          processId="process-1" 
          onValidationComplete={onValidationComplete}
        />,
        { wrapper: createWrapper() }
      );

      const input = screen.getByPlaceholderText('Enter author name (minimum 2 characters)');
      const searchButton = screen.getByText('Search Author');

      fireEvent.change(input, { target: { value: 'NonexistentAuthor' } });
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText(/No authors found matching "NonexistentAuthor"/)).toBeInTheDocument();
        expect(screen.getByText('Suggestions:')).toBeInTheDocument();
        expect(screen.getByText(/Check the spelling/)).toBeInTheDocument();
      });
    });

    it('should show loading state during search', () => {
      mockUseAddManualAuthor.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: true,
        isError: false,
        error: null,
        data: undefined,
        isSuccess: false,
        isIdle: false,
        mutate: vi.fn(),
        reset: vi.fn(),
        status: 'pending',
        variables: undefined,
        context: undefined,
        failureCount: 0,
        failureReason: null,
        isPaused: false,
        submittedAt: Date.now(),
      } as any);

      render(
        <AuthorValidation 
          processId="process-1" 
          onValidationComplete={onValidationComplete}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Searching for authors...')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter author name (minimum 2 characters)')).toBeDisabled();
    });

    it('should allow removing selected authors', async () => {
      const mockResults = {
        found_authors: [
          {
            name: 'Dr. John Smith',
            email: 'john@example.com',
            affiliation: 'University of Example',
            country: 'USA',
            publications: 50,
          },
        ],
        search_term: 'John Smith',
        total_found: 1,
      };

      mockMutateAsync.mockResolvedValue(mockResults);

      render(
        <AuthorValidation 
          processId="process-1" 
          onValidationComplete={onValidationComplete}
        />,
        { wrapper: createWrapper() }
      );

      const input = screen.getByPlaceholderText('Enter author name (minimum 2 characters)');
      const searchButton = screen.getByText('Search Author');

      fireEvent.change(input, { target: { value: 'John Smith' } });
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText('Dr. John Smith')).toBeInTheDocument();
      });

      // Select author
      const selectButtons = screen.getAllByText('Select');
      fireEvent.click(selectButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Selected Authors (1)')).toBeInTheDocument();
      });

      // Remove author
      const removeButton = screen.getByText('Remove');
      fireEvent.click(removeButton);

      await waitFor(() => {
        expect(screen.queryByText('Selected Authors (1)')).not.toBeInTheDocument();
      });
    });
  });
});