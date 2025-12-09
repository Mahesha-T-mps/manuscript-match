/**
 * Unit tests for ManualSearch component
 * Verifies toast notification styling and error message display
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ManualSearch } from '../ManualSearch';
import * as useSearchHook from '@/hooks/useSearch';
import * as useToastHook from '@/hooks/use-toast';

// Mock config
vi.mock('@/lib/config', () => ({
  config: {
    apiBaseUrl: 'http://localhost:3001',
    apiTimeout: 30000,
    maxFileSize: 10485760,
    supportedFileTypes: ['pdf', 'docx', 'doc'],
    enableDevTools: true,
  }
}));

// Mock the hooks
vi.mock('@/hooks/useSearch');
vi.mock('@/hooks/use-toast');

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

describe('ManualSearch - Toast Notification Styling', () => {
  const mockToast = vi.fn();
  const mockMutateAsync = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock useToast
    vi.mocked(useToastHook.useToast).mockReturnValue({
      toast: mockToast,
      dismiss: vi.fn(),
      toasts: [],
    });
    
    // Default mock for useAddManualAuthor
    vi.mocked(useSearchHook.useAddManualAuthor).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      error: null,
      isError: false,
      isSuccess: false,
      data: undefined,
      mutate: vi.fn(),
      reset: vi.fn(),
      status: 'idle',
      variables: undefined,
      context: undefined,
      failureCount: 0,
      failureReason: null,
      isIdle: true,
      isPaused: false,
      submittedAt: 0,
    } as any);
  });

  it('should use destructive variant for 404 not found errors', async () => {
    const user = userEvent.setup();
    const errorMessage = "Author 'John Doe' not found or missing email/affiliation.";
    
    mockMutateAsync.mockRejectedValueOnce(new Error(errorMessage));
    
    render(<ManualSearch processId="test-process-id" />, { wrapper: createWrapper() });
    
    const input = screen.getByPlaceholderText(/Enter author name/i);
    const searchButton = screen.getByRole('button');
    
    await user.type(input, 'John Doe');
    await user.click(searchButton);
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'destructive',
          title: 'Author not found',
          description: errorMessage,
        })
      );
    });
  });

  it('should use destructive variant for missing information errors', async () => {
    const user = userEvent.setup();
    const errorMessage = "Author 'Jane Smith' is missing required email information.";
    
    mockMutateAsync.mockRejectedValueOnce(new Error(errorMessage));
    
    render(<ManualSearch processId="test-process-id" />, { wrapper: createWrapper() });
    
    const input = screen.getByPlaceholderText(/Enter author name/i);
    const searchButton = screen.getByRole('button');
    
    await user.type(input, 'Jane Smith');
    await user.click(searchButton);
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'destructive',
          title: 'Author not found',
          description: errorMessage,
        })
      );
    });
  });

  it('should use destructive variant for general search failures', async () => {
    const user = userEvent.setup();
    const errorMessage = "Network error occurred during search";
    
    mockMutateAsync.mockRejectedValueOnce(new Error(errorMessage));
    
    render(<ManualSearch processId="test-process-id" />, { wrapper: createWrapper() });
    
    const input = screen.getByPlaceholderText(/Enter author name/i);
    const searchButton = screen.getByRole('button');
    
    await user.type(input, 'Test Author');
    await user.click(searchButton);
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'destructive',
          title: 'Search failed',
          description: errorMessage,
        })
      );
    });
  });

  it('should display the full error message from API', async () => {
    const user = userEvent.setup();
    const longErrorMessage = "Author 'Dr. Alexander Montgomery-Richardson III' not found in PubMed database. Please verify the spelling or try alternative name formats such as 'A. Montgomery-Richardson' or 'Alexander Montgomery Richardson'.";
    
    mockMutateAsync.mockRejectedValueOnce(new Error(longErrorMessage));
    
    render(<ManualSearch processId="test-process-id" />, { wrapper: createWrapper() });
    
    const input = screen.getByPlaceholderText(/Enter author name/i);
    const searchButton = screen.getByRole('button');
    
    await user.type(input, 'Dr. Alexander Montgomery-Richardson III');
    await user.click(searchButton);
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          description: longErrorMessage,
        })
      );
    });
  });

  it('should use destructive variant for validation errors when triggered programmatically', async () => {
    const user = userEvent.setup();
    
    // Mock the mutation to not be pending so button is enabled
    vi.mocked(useSearchHook.useAddManualAuthor).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      error: null,
      isError: false,
      isSuccess: false,
      data: undefined,
      mutate: vi.fn(),
      reset: vi.fn(),
      status: 'idle',
      variables: undefined,
      context: undefined,
      failureCount: 0,
      failureReason: null,
      isIdle: true,
      isPaused: false,
      submittedAt: 0,
    } as any);
    
    render(<ManualSearch processId="test-process-id" />, { wrapper: createWrapper() });
    
    const input = screen.getByPlaceholderText(/Enter author name/i);
    
    // Type a single character and press Enter to trigger validation
    await user.type(input, 'A{Enter}');
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'destructive',
          title: 'Invalid name',
          description: 'Please enter at least 2 characters for the author name.',
        })
      );
    });
  });

  it('should handle error objects with error property instead of message', async () => {
    const user = userEvent.setup();
    const errorMessage = "API returned an error without standard message property";
    
    // Mock an error object with 'error' property instead of 'message'
    mockMutateAsync.mockRejectedValueOnce({ error: errorMessage });
    
    render(<ManualSearch processId="test-process-id" />, { wrapper: createWrapper() });
    
    const input = screen.getByPlaceholderText(/Enter author name/i);
    const searchButton = screen.getByRole('button');
    
    await user.type(input, 'Test Author');
    await user.click(searchButton);
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'destructive',
          description: errorMessage,
        })
      );
    });
  });

  it('should display default error message when no message is available', async () => {
    const user = userEvent.setup();
    
    // Mock an error with no message or error property
    mockMutateAsync.mockRejectedValueOnce({});
    
    render(<ManualSearch processId="test-process-id" />, { wrapper: createWrapper() });
    
    const input = screen.getByPlaceholderText(/Enter author name/i);
    const searchButton = screen.getByRole('button');
    
    await user.type(input, 'Test Author');
    await user.click(searchButton);
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'destructive',
          description: 'An error occurred during the search',
        })
      );
    });
  });
});

describe('ManualSearch - UI State Management', () => {
  const mockToast = vi.fn();
  const mockMutateAsync = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock useToast
    vi.mocked(useToastHook.useToast).mockReturnValue({
      toast: mockToast,
      dismiss: vi.fn(),
      toasts: [],
    });
  });

  it('should display loading indicator during search', async () => {
    const user = userEvent.setup();
    
    // Mock pending state
    vi.mocked(useSearchHook.useAddManualAuthor).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: true,
      error: null,
      isError: false,
      isSuccess: false,
      data: undefined,
      mutate: vi.fn(),
      reset: vi.fn(),
      status: 'pending',
      variables: undefined,
      context: undefined,
      failureCount: 0,
      failureReason: null,
      isIdle: false,
      isPaused: false,
      submittedAt: Date.now(),
    } as any);
    
    render(<ManualSearch processId="test-process-id" />, { wrapper: createWrapper() });
    
    // Verify loading indicator is present
    expect(screen.getByText(/Searching PubMed for author details/i)).toBeInTheDocument();
    
    // Verify loading spinner is present by checking for the animate-spin class
    const loadingAlert = screen.getByRole('alert');
    const spinner = loadingAlert.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('should disable button during search', async () => {
    const user = userEvent.setup();
    
    // Mock pending state
    vi.mocked(useSearchHook.useAddManualAuthor).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: true,
      error: null,
      isError: false,
      isSuccess: false,
      data: undefined,
      mutate: vi.fn(),
      reset: vi.fn(),
      status: 'pending',
      variables: undefined,
      context: undefined,
      failureCount: 0,
      failureReason: null,
      isIdle: false,
      isPaused: false,
      submittedAt: Date.now(),
    } as any);
    
    render(<ManualSearch processId="test-process-id" />, { wrapper: createWrapper() });
    
    const searchButton = screen.getByRole('button');
    
    // Verify button is disabled
    expect(searchButton).toBeDisabled();
  });

  it('should disable input field during search', async () => {
    const user = userEvent.setup();
    
    // Mock pending state
    vi.mocked(useSearchHook.useAddManualAuthor).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: true,
      error: null,
      isError: false,
      isSuccess: false,
      data: undefined,
      mutate: vi.fn(),
      reset: vi.fn(),
      status: 'pending',
      variables: undefined,
      context: undefined,
      failureCount: 0,
      failureReason: null,
      isIdle: false,
      isPaused: false,
      submittedAt: Date.now(),
    } as any);
    
    render(<ManualSearch processId="test-process-id" />, { wrapper: createWrapper() });
    
    const input = screen.getByPlaceholderText(/Enter author name/i);
    
    // Verify input is disabled
    expect(input).toBeDisabled();
  });

  it('should display success feedback on completion', async () => {
    const user = userEvent.setup();
    const successData = {
      author: 'Dr. John Smith',
      email: 'john.smith@university.edu',
      aff: 'University of Example',
      city: 'Example City',
      country: 'Example Country'
    };
    
    mockMutateAsync.mockResolvedValueOnce(successData);
    
    // Start with idle state
    vi.mocked(useSearchHook.useAddManualAuthor).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      error: null,
      isError: false,
      isSuccess: false,
      data: undefined,
      mutate: vi.fn(),
      reset: vi.fn(),
      status: 'idle',
      variables: undefined,
      context: undefined,
      failureCount: 0,
      failureReason: null,
      isIdle: true,
      isPaused: false,
      submittedAt: 0,
    } as any);
    
    render(<ManualSearch processId="test-process-id" />, { wrapper: createWrapper() });
    
    const input = screen.getByPlaceholderText(/Enter author name/i);
    const searchButton = screen.getByRole('button');
    
    await user.type(input, 'Dr. John Smith');
    await user.click(searchButton);
    
    // Wait for success toast
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Author added successfully',
          description: `${successData.author} has been added to the potential reviewers list.`,
        })
      );
    });
    
    // Wait for success feedback to appear in the component
    await waitFor(() => {
      expect(screen.getByText(/Author added successfully!/i)).toBeInTheDocument();
    });
    
    // Verify author details are displayed
    expect(screen.getByText(successData.author)).toBeInTheDocument();
    expect(screen.getByText(successData.email)).toBeInTheDocument();
    expect(screen.getByText(successData.aff)).toBeInTheDocument();
  });

  it('should display error feedback and re-enable button on failure', async () => {
    const user = userEvent.setup();
    const errorMessage = "Author 'Jane Doe' not found or missing email/affiliation.";
    
    mockMutateAsync.mockRejectedValueOnce(new Error(errorMessage));
    
    // Start with idle state
    vi.mocked(useSearchHook.useAddManualAuthor).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      error: null,
      isError: false,
      isSuccess: false,
      data: undefined,
      mutate: vi.fn(),
      reset: vi.fn(),
      status: 'idle',
      variables: undefined,
      context: undefined,
      failureCount: 0,
      failureReason: null,
      isIdle: true,
      isPaused: false,
      submittedAt: 0,
    } as any);
    
    render(<ManualSearch processId="test-process-id" />, { wrapper: createWrapper() });
    
    const input = screen.getByPlaceholderText(/Enter author name/i);
    
    await user.type(input, 'Jane Doe');
    
    const searchButton = screen.getByRole('button');
    
    // Verify button is enabled after typing valid input
    expect(searchButton).not.toBeDisabled();
    
    await user.click(searchButton);
    
    // Wait for error toast
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'destructive',
          title: 'Author not found',
          description: errorMessage,
        })
      );
    });
    
    // Verify button is re-enabled after error (since isPending is false in mock)
    expect(searchButton).not.toBeDisabled();
    
    // Verify input is re-enabled after error
    expect(input).not.toBeDisabled();
  });

  it('should clear success state when error occurs', async () => {
    const user = userEvent.setup();
    const successData = {
      author: 'Dr. John Smith',
      email: 'john.smith@university.edu',
      aff: 'University of Example'
    };
    const errorMessage = "Author 'Jane Doe' not found.";
    
    // First search succeeds
    mockMutateAsync.mockResolvedValueOnce(successData);
    
    vi.mocked(useSearchHook.useAddManualAuthor).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      error: null,
      isError: false,
      isSuccess: false,
      data: undefined,
      mutate: vi.fn(),
      reset: vi.fn(),
      status: 'idle',
      variables: undefined,
      context: undefined,
      failureCount: 0,
      failureReason: null,
      isIdle: true,
      isPaused: false,
      submittedAt: 0,
    } as any);
    
    render(<ManualSearch processId="test-process-id" />, { wrapper: createWrapper() });
    
    const input = screen.getByPlaceholderText(/Enter author name/i);
    const searchButton = screen.getByRole('button');
    
    // First search
    await user.type(input, 'Dr. John Smith');
    await user.click(searchButton);
    
    // Wait for success toast to be called
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Author added successfully',
        })
      );
    });
    
    // Verify success feedback appears in component
    await waitFor(() => {
      expect(screen.getByText(/Author added successfully!/i)).toBeInTheDocument();
    });
    
    // Second search fails
    mockMutateAsync.mockRejectedValueOnce(new Error(errorMessage));
    
    await user.clear(input);
    await user.type(input, 'Jane Doe');
    await user.click(searchButton);
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'destructive',
          title: 'Author not found',
        })
      );
    });
    
    // Verify success state is cleared
    await waitFor(() => {
      expect(screen.queryByText(/Author added successfully!/i)).not.toBeInTheDocument();
    });
  });

  it('should show loading spinner in button during search', async () => {
    const user = userEvent.setup();
    
    // Mock pending state
    vi.mocked(useSearchHook.useAddManualAuthor).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: true,
      error: null,
      isError: false,
      isSuccess: false,
      data: undefined,
      mutate: vi.fn(),
      reset: vi.fn(),
      status: 'pending',
      variables: undefined,
      context: undefined,
      failureCount: 0,
      failureReason: null,
      isIdle: false,
      isPaused: false,
      submittedAt: Date.now(),
    } as any);
    
    render(<ManualSearch processId="test-process-id" />, { wrapper: createWrapper() });
    
    const searchButton = screen.getByRole('button');
    
    // Verify button contains loading spinner
    const buttonSpinner = searchButton.querySelector('.animate-spin');
    expect(buttonSpinner).toBeInTheDocument();
  });

  it('should clear input field after successful search', async () => {
    const user = userEvent.setup();
    const successData = {
      author: 'Dr. John Smith',
      email: 'john.smith@university.edu',
      aff: 'University of Example'
    };
    
    mockMutateAsync.mockResolvedValueOnce(successData);
    
    vi.mocked(useSearchHook.useAddManualAuthor).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      error: null,
      isError: false,
      isSuccess: false,
      data: undefined,
      mutate: vi.fn(),
      reset: vi.fn(),
      status: 'idle',
      variables: undefined,
      context: undefined,
      failureCount: 0,
      failureReason: null,
      isIdle: true,
      isPaused: false,
      submittedAt: 0,
    } as any);
    
    render(<ManualSearch processId="test-process-id" />, { wrapper: createWrapper() });
    
    const input = screen.getByPlaceholderText(/Enter author name/i) as HTMLInputElement;
    const searchButton = screen.getByRole('button');
    
    await user.type(input, 'Dr. John Smith');
    expect(input.value).toBe('Dr. John Smith');
    
    await user.click(searchButton);
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalled();
    });
    
    // Verify input is cleared
    await waitFor(() => {
      expect(input.value).toBe('');
    });
  });
});
