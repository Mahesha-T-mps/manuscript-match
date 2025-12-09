/**
 * Unit tests for KeywordEnhancement component
 * Tests keyword selection state management and UI interactions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { KeywordEnhancement } from '../KeywordEnhancement';
import * as useKeywordsHooks from '@/hooks/useKeywords';
import * as useFilesHooks from '@/hooks/useFiles';

// Mock the config
vi.mock('@/lib/config', () => ({
  config: {
    apiBaseUrl: 'http://localhost:3001',
    apiTimeout: 30000,
    maxFileSize: 10485760,
    supportedFileTypes: ['pdf', 'docx', 'doc'],
    enableDevTools: true,
    enableDebugLogging: false,
  },
}));

// Mock the hooks
vi.mock('@/hooks/useKeywords');
vi.mock('@/hooks/useFiles');

// Create a mock toast function that we can track
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

describe('KeywordEnhancement', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
    mockToast.mockClear();
    
    // Set up default mocks for all hooks
    vi.mocked(useKeywordsHooks.useGenerateKeywordString).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);
  });

  const renderComponent = (processId: string = 'test-process-id') => {
    return render(
      <QueryClientProvider client={queryClient}>
        <KeywordEnhancement processId={processId} />
      </QueryClientProvider>
    );
  };

  describe('Keyword Selection State Management', () => {
    it('should initialize with no keywords selected when enhanced keywords are not loaded', () => {
      // Setup: No enhanced keywords
      vi.mocked(useKeywordsHooks.useKeywords).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useKeywordsHooks.useEnhanceKeywords).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any);

      vi.mocked(useKeywordsHooks.useUpdateKeywordSelection).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any);

      vi.mocked(useFilesHooks.useMetadata).mockReturnValue({
        data: { keywords: ['test'] },
      } as any);

      // Execute
      renderComponent();

      // Verify: Enhance button should be visible
      expect(screen.getByText('Enhance Keywords')).toBeInTheDocument();
    });

    it('should default to selecting all primary and secondary keywords when loaded', async () => {
      // Setup: Mock enhanced keywords
      const mockKeywords = {
        meshTerms: ['MeSH1', 'MeSH2'],
        broaderTerms: ['Broader1'],
        primaryFocus: ['Primary1', 'Primary2'],
        secondaryFocus: ['Secondary1', 'Secondary2'],
        original: ['Original1'],
        enhanced: ['Enhanced1'],
      };

      vi.mocked(useKeywordsHooks.useKeywords).mockReturnValue({
        data: mockKeywords,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useKeywordsHooks.useEnhanceKeywords).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any);

      vi.mocked(useKeywordsHooks.useUpdateKeywordSelection).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any);

      vi.mocked(useFilesHooks.useMetadata).mockReturnValue({
        data: { keywords: [] },
      } as any);

      // Execute
      renderComponent();

      // Verify: Should show selected count
      await waitFor(() => {
        expect(screen.getByText(/primary and.*secondary keywords selected/)).toBeInTheDocument();
      });
    });

    it('should update selection when primary keyword is toggled', async () => {
      const user = userEvent.setup();
      
      // Setup
      const mockKeywords = {
        meshTerms: [],
        broaderTerms: [],
        primaryFocus: ['Primary1', 'Primary2'],
        secondaryFocus: [],
        original: [],
        enhanced: [],
      };

      vi.mocked(useKeywordsHooks.useKeywords).mockReturnValue({
        data: mockKeywords,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useKeywordsHooks.useEnhanceKeywords).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any);

      vi.mocked(useKeywordsHooks.useUpdateKeywordSelection).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any);

      vi.mocked(useFilesHooks.useMetadata).mockReturnValue({
        data: { keywords: [] },
      } as any);

      // Execute
      renderComponent();

      // Find and uncheck a primary keyword
      await waitFor(() => {
        expect(screen.getByText('Primary1')).toBeInTheDocument();
      });

      const checkbox = screen.getAllByRole('checkbox')[0];
      await user.click(checkbox);

      // Verify: Selection count should update
      await waitFor(() => {
        expect(screen.getByText(/1 primary and 0 secondary keywords selected/)).toBeInTheDocument();
      });
    });

    it('should update selection when secondary keyword is toggled', async () => {
      const user = userEvent.setup();
      
      // Setup
      const mockKeywords = {
        meshTerms: [],
        broaderTerms: [],
        primaryFocus: [],
        secondaryFocus: ['Secondary1', 'Secondary2'],
        original: [],
        enhanced: [],
      };

      vi.mocked(useKeywordsHooks.useKeywords).mockReturnValue({
        data: mockKeywords,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useKeywordsHooks.useEnhanceKeywords).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any);

      vi.mocked(useKeywordsHooks.useUpdateKeywordSelection).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any);

      vi.mocked(useFilesHooks.useMetadata).mockReturnValue({
        data: { keywords: [] },
      } as any);

      // Execute
      renderComponent();

      // Find and uncheck a secondary keyword
      await waitFor(() => {
        expect(screen.getByText('Secondary1')).toBeInTheDocument();
      });

      const checkbox = screen.getAllByRole('checkbox')[0];
      await user.click(checkbox);

      // Verify: Selection count should update
      await waitFor(() => {
        expect(screen.getByText(/0 primary and 1 secondary keywords selected/)).toBeInTheDocument();
      });
    });
  });

  describe('Save Selection Button Logic', () => {
    it('should disable save button when no keywords are selected', async () => {
      // Setup: Mock keywords with nothing selected
      const mockKeywords = {
        meshTerms: [],
        broaderTerms: [],
        primaryFocus: ['Primary1'],
        secondaryFocus: [],
        original: [],
        enhanced: [],
      };

      vi.mocked(useKeywordsHooks.useKeywords).mockReturnValue({
        data: mockKeywords,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useKeywordsHooks.useEnhanceKeywords).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any);

      vi.mocked(useKeywordsHooks.useUpdateKeywordSelection).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any);

      vi.mocked(useFilesHooks.useMetadata).mockReturnValue({
        data: { keywords: [] },
      } as any);

      const user = userEvent.setup();

      // Execute
      renderComponent();

      // Unselect all keywords
      await waitFor(() => {
        expect(screen.getByText('Primary1')).toBeInTheDocument();
      });

      const checkbox = screen.getAllByRole('checkbox')[0];
      await user.click(checkbox);

      // Verify: Save button should be disabled
      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /Save Selection/i });
        expect(saveButton).toBeDisabled();
      });
    });

    it('should enable save button when at least one keyword is selected', async () => {
      // Setup
      const mockKeywords = {
        meshTerms: [],
        broaderTerms: [],
        primaryFocus: ['Primary1'],
        secondaryFocus: [],
        original: [],
        enhanced: [],
      };

      vi.mocked(useKeywordsHooks.useKeywords).mockReturnValue({
        data: mockKeywords,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useKeywordsHooks.useEnhanceKeywords).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any);

      vi.mocked(useKeywordsHooks.useUpdateKeywordSelection).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any);

      vi.mocked(useFilesHooks.useMetadata).mockReturnValue({
        data: { keywords: [] },
      } as any);

      // Execute
      renderComponent();

      // Verify: Save button should be enabled (default selection includes all)
      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /Save Selection/i });
        expect(saveButton).not.toBeDisabled();
      });
    });

    it('should call updateKeywordSelection with correct data when save is clicked', async () => {
      const user = userEvent.setup();
      const mockMutateAsync = vi.fn().mockResolvedValue(undefined);

      // Setup
      const mockKeywords = {
        meshTerms: [],
        broaderTerms: [],
        primaryFocus: ['Primary1', 'Primary2'],
        secondaryFocus: ['Secondary1'],
        original: [],
        enhanced: [],
      };

      vi.mocked(useKeywordsHooks.useKeywords).mockReturnValue({
        data: mockKeywords,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useKeywordsHooks.useEnhanceKeywords).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any);

      vi.mocked(useKeywordsHooks.useUpdateKeywordSelection).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as any);

      vi.mocked(useFilesHooks.useMetadata).mockReturnValue({
        data: { keywords: [] },
      } as any);

      // Execute
      renderComponent('test-process');

      // Click save button
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Save Selection/i })).toBeInTheDocument();
      });

      const saveButton = screen.getByRole('button', { name: /Save Selection/i });
      await user.click(saveButton);

      // Verify: Should call mutation with all selected keywords
      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          processId: 'test-process',
          selection: expect.arrayContaining(['Primary1', 'Primary2', 'Secondary1']),
        });
      });
    });
  });

  describe('Selected Keywords Display', () => {
    it('should display correct count of selected primary and secondary keywords', async () => {
      // Setup
      const mockKeywords = {
        meshTerms: [],
        broaderTerms: [],
        primaryFocus: ['P1', 'P2', 'P3'],
        secondaryFocus: ['S1', 'S2'],
        original: [],
        enhanced: [],
      };

      vi.mocked(useKeywordsHooks.useKeywords).mockReturnValue({
        data: mockKeywords,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useKeywordsHooks.useEnhanceKeywords).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any);

      vi.mocked(useKeywordsHooks.useUpdateKeywordSelection).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any);

      vi.mocked(useFilesHooks.useMetadata).mockReturnValue({
        data: { keywords: [] },
      } as any);

      // Execute
      renderComponent();

      // Verify: Should show correct counts
      await waitFor(() => {
        expect(screen.getByText('3 primary and 2 secondary keywords selected')).toBeInTheDocument();
      });
    });

    it('should update display when keywords are deselected', async () => {
      const user = userEvent.setup();

      // Setup
      const mockKeywords = {
        meshTerms: [],
        broaderTerms: [],
        primaryFocus: ['P1', 'P2'],
        secondaryFocus: [],
        original: [],
        enhanced: [],
      };

      vi.mocked(useKeywordsHooks.useKeywords).mockReturnValue({
        data: mockKeywords,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useKeywordsHooks.useEnhanceKeywords).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any);

      vi.mocked(useKeywordsHooks.useUpdateKeywordSelection).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any);

      vi.mocked(useFilesHooks.useMetadata).mockReturnValue({
        data: { keywords: [] },
      } as any);

      // Execute
      renderComponent();

      // Initial state
      await waitFor(() => {
        expect(screen.getByText('2 primary and 0 secondary keywords selected')).toBeInTheDocument();
      });

      // Deselect one keyword
      const checkbox = screen.getAllByRole('checkbox')[0];
      await user.click(checkbox);

      // Verify: Count should update
      await waitFor(() => {
        expect(screen.getByText('1 primary and 0 secondary keywords selected')).toBeInTheDocument();
      });
    });
  });

  describe('Search String Generation', () => {
    it('should display generated search string with correct formatting', async () => {
      const user = userEvent.setup();
      const mockGenerateMutateAsync = vi.fn().mockResolvedValue({
        search_string: '(keyword1 OR keyword2) AND (secondary1 OR secondary2)',
        primary_keywords_used: ['keyword1', 'keyword2'],
        secondary_keywords_used: ['secondary1', 'secondary2'],
      });

      // Setup
      const mockKeywords = {
        meshTerms: [],
        broaderTerms: [],
        primaryFocus: ['keyword1', 'keyword2'],
        secondaryFocus: ['secondary1', 'secondary2'],
        original: [],
        enhanced: [],
      };

      vi.mocked(useKeywordsHooks.useKeywords).mockReturnValue({
        data: mockKeywords,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useKeywordsHooks.useEnhanceKeywords).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any);

      vi.mocked(useKeywordsHooks.useUpdateKeywordSelection).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any);

      vi.mocked(useKeywordsHooks.useGenerateKeywordString).mockReturnValue({
        mutateAsync: mockGenerateMutateAsync,
        isPending: false,
      } as any);

      vi.mocked(useFilesHooks.useMetadata).mockReturnValue({
        data: { keywords: [] },
      } as any);

      // Execute
      renderComponent('test-process');

      // Click generate button
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Generate Search String/i })).toBeInTheDocument();
      });

      const generateButton = screen.getByRole('button', { name: /Generate Search String/i });
      await user.click(generateButton);

      // Verify: Search string should be displayed
      await waitFor(() => {
        expect(screen.getByText('(keyword1 OR keyword2) AND (secondary1 OR secondary2)')).toBeInTheDocument();
      });
    });

    it('should display keywords used in search string generation', async () => {
      const user = userEvent.setup();
      const mockGenerateMutateAsync = vi.fn().mockResolvedValue({
        search_string: '(primary1 OR primary2) AND (secondary1)',
        primary_keywords_used: ['primary1', 'primary2'],
        secondary_keywords_used: ['secondary1'],
      });

      // Setup
      const mockKeywords = {
        meshTerms: [],
        broaderTerms: [],
        primaryFocus: ['primary1', 'primary2'],
        secondaryFocus: ['secondary1'],
        original: [],
        enhanced: [],
      };

      vi.mocked(useKeywordsHooks.useKeywords).mockReturnValue({
        data: mockKeywords,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useKeywordsHooks.useEnhanceKeywords).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any);

      vi.mocked(useKeywordsHooks.useUpdateKeywordSelection).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any);

      vi.mocked(useKeywordsHooks.useGenerateKeywordString).mockReturnValue({
        mutateAsync: mockGenerateMutateAsync,
        isPending: false,
      } as any);

      vi.mocked(useFilesHooks.useMetadata).mockReturnValue({
        data: { keywords: [] },
      } as any);

      // Execute
      renderComponent('test-process');

      // Click generate button
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Generate Search String/i })).toBeInTheDocument();
      });

      const generateButton = screen.getByRole('button', { name: /Generate Search String/i });
      await user.click(generateButton);

      // Verify: Keywords used should be displayed
      await waitFor(() => {
        expect(screen.getByText(/Primary keywords used:/)).toBeInTheDocument();
        expect(screen.getByText(/primary1, primary2/)).toBeInTheDocument();
        expect(screen.getByText(/Secondary keywords used:/)).toBeInTheDocument();
        // Use getAllByText since "secondary1" appears in multiple places (badge and search string display)
        const secondary1Elements = screen.getAllByText(/secondary1/);
        expect(secondary1Elements.length).toBeGreaterThan(0);
      });
    });

    it('should disable generate button when no keywords are selected', async () => {
      const user = userEvent.setup();

      // Setup
      const mockKeywords = {
        meshTerms: [],
        broaderTerms: [],
        primaryFocus: ['keyword1'],
        secondaryFocus: [],
        original: [],
        enhanced: [],
      };

      vi.mocked(useKeywordsHooks.useKeywords).mockReturnValue({
        data: mockKeywords,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useKeywordsHooks.useEnhanceKeywords).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any);

      vi.mocked(useKeywordsHooks.useUpdateKeywordSelection).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any);

      vi.mocked(useKeywordsHooks.useGenerateKeywordString).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any);

      vi.mocked(useFilesHooks.useMetadata).mockReturnValue({
        data: { keywords: [] },
      } as any);

      // Execute
      renderComponent();

      // Deselect all keywords
      await waitFor(() => {
        expect(screen.getByText('keyword1')).toBeInTheDocument();
      });

      const checkbox = screen.getAllByRole('checkbox')[0];
      await user.click(checkbox);

      // Verify: Generate button should be disabled
      await waitFor(() => {
        const generateButton = screen.getByRole('button', { name: /Generate Search String/i });
        expect(generateButton).toBeDisabled();
      });
    });

    it('should display error toast when search string generation fails', async () => {
      const user = userEvent.setup();
      const mockGenerateMutateAsync = vi.fn().mockRejectedValue(new Error('API Error'));

      // Setup
      const mockKeywords = {
        meshTerms: [],
        broaderTerms: [],
        primaryFocus: ['keyword1'],
        secondaryFocus: ['keyword2'],
        original: [],
        enhanced: [],
      };

      vi.mocked(useKeywordsHooks.useKeywords).mockReturnValue({
        data: mockKeywords,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useKeywordsHooks.useEnhanceKeywords).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any);

      vi.mocked(useKeywordsHooks.useUpdateKeywordSelection).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any);

      vi.mocked(useKeywordsHooks.useGenerateKeywordString).mockReturnValue({
        mutateAsync: mockGenerateMutateAsync,
        isPending: false,
      } as any);

      vi.mocked(useFilesHooks.useMetadata).mockReturnValue({
        data: { keywords: [] },
      } as any);

      // Execute
      renderComponent();

      // Click generate button
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Generate Search String/i })).toBeInTheDocument();
      });

      const generateButton = screen.getByRole('button', { name: /Generate Search String/i });
      await user.click(generateButton);

      // Verify: Error toast should be displayed
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Generation Failed',
            variant: 'destructive',
          })
        );
      });
    });

    it('should allow retry after error by keeping button enabled', async () => {
      const user = userEvent.setup();
      let callCount = 0;
      const mockGenerateMutateAsync = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('First attempt failed'));
        }
        return Promise.resolve({
          search_string: '(keyword1) AND (keyword2)',
          primary_keywords_used: ['keyword1'],
          secondary_keywords_used: ['keyword2'],
        });
      });

      // Setup
      const mockKeywords = {
        meshTerms: [],
        broaderTerms: [],
        primaryFocus: ['keyword1'],
        secondaryFocus: ['keyword2'],
        original: [],
        enhanced: [],
      };

      vi.mocked(useKeywordsHooks.useKeywords).mockReturnValue({
        data: mockKeywords,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useKeywordsHooks.useEnhanceKeywords).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any);

      vi.mocked(useKeywordsHooks.useUpdateKeywordSelection).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any);

      vi.mocked(useKeywordsHooks.useGenerateKeywordString).mockReturnValue({
        mutateAsync: mockGenerateMutateAsync,
        isPending: false,
      } as any);

      vi.mocked(useFilesHooks.useMetadata).mockReturnValue({
        data: { keywords: [] },
      } as any);

      // Execute
      renderComponent();

      // First attempt - should fail
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Generate Search String/i })).toBeInTheDocument();
      });

      const generateButton = screen.getByRole('button', { name: /Generate Search String/i });
      await user.click(generateButton);

      // Wait for error
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Generation Failed',
          })
        );
      });

      // Verify: Button should still be enabled for retry
      expect(generateButton).not.toBeDisabled();

      // Second attempt - should succeed
      await user.click(generateButton);

      // Verify: Search string should be displayed
      await waitFor(() => {
        expect(screen.getByText('(keyword1) AND (keyword2)')).toBeInTheDocument();
      });
    });

    it('should call generateKeywordString with correct parameters', async () => {
      const user = userEvent.setup();
      const mockGenerateMutateAsync = vi.fn().mockResolvedValue({
        search_string: '(p1 OR p2) AND (s1)',
        primary_keywords_used: ['p1', 'p2'],
        secondary_keywords_used: ['s1'],
      });

      // Setup
      const mockKeywords = {
        meshTerms: [],
        broaderTerms: [],
        primaryFocus: ['p1', 'p2'],
        secondaryFocus: ['s1'],
        original: [],
        enhanced: [],
      };

      vi.mocked(useKeywordsHooks.useKeywords).mockReturnValue({
        data: mockKeywords,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(useKeywordsHooks.useEnhanceKeywords).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any);

      vi.mocked(useKeywordsHooks.useUpdateKeywordSelection).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      } as any);

      vi.mocked(useKeywordsHooks.useGenerateKeywordString).mockReturnValue({
        mutateAsync: mockGenerateMutateAsync,
        isPending: false,
      } as any);

      vi.mocked(useFilesHooks.useMetadata).mockReturnValue({
        data: { keywords: [] },
      } as any);

      // Execute
      renderComponent('test-process-123');

      // Click generate button
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Generate Search String/i })).toBeInTheDocument();
      });

      const generateButton = screen.getByRole('button', { name: /Generate Search String/i });
      await user.click(generateButton);

      // Verify: Should call mutation with correct parameters
      await waitFor(() => {
        expect(mockGenerateMutateAsync).toHaveBeenCalledWith({
          processId: 'test-process-123',
          primaryKeywords: ['p1', 'p2'],
          secondaryKeywords: ['s1'],
        });
      });
    });
  });
});
