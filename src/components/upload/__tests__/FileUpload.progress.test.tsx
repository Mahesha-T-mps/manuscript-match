/**
 * Test file for FileUpload progress bar functionality
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FileUpload } from '../FileUpload';
import { useFileUpload } from '@/hooks/useFiles';

// Mock the hooks
jest.mock('@/hooks/useFiles');
jest.mock('@/hooks/use-toast');
jest.mock('@/hooks/usePerformance');

const mockUseFileUpload = useFileUpload as jest.MockedFunction<typeof useFileUpload>;

describe('FileUpload Progress Bar', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Mock the toast hook
    jest.mocked(require('@/hooks/use-toast').useToast).mockReturnValue({
      toast: jest.fn(),
    });

    // Mock performance hook
    jest.mocked(require('@/hooks/usePerformance').useRenderPerformance).mockReturnValue(undefined);
  });

  const renderFileUpload = (props = {}) => {
    const defaultProps = {
      processId: 'test-process',
      onFileUpload: jest.fn(),
    };

    return render(
      <QueryClientProvider client={queryClient}>
        <FileUpload {...defaultProps} {...props} />
      </QueryClientProvider>
    );
  };

  it('should show correct progress during upload phases', async () => {
    let progressCallback: ((progress: number) => void) | undefined;

    const mockMutateAsync = jest.fn().mockImplementation(({ onProgress }) => {
      progressCallback = onProgress;
      return new Promise((resolve) => {
        // Simulate upload progress
        setTimeout(() => {
          if (progressCallback) {
            progressCallback(50); // 50% upload progress
          }
        }, 100);

        setTimeout(() => {
          if (progressCallback) {
            progressCallback(100); // Upload complete, should trigger processing
          }
        }, 200);

        setTimeout(() => {
          resolve({
            fileId: 'test-file-id',
            fileName: 'test.docx',
            fileSize: 1024,
            uploadedAt: new Date().toISOString(),
            metadata: {
              title: 'Test Document',
              authors: [],
              affiliations: [],
              keywords: [],
              abstract: '',
              authorAffiliationMap: {}
            }
          });
        }, 300);
      });
    });

    mockUseFileUpload.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: true,
      isError: false,
    } as any);

    renderFileUpload();

    // Create a test file
    const file = new File(['test content'], 'test.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

    // Find file input and upload file
    const fileInput = screen.getByLabelText(/choose manuscript file/i);
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Should show uploading status initially
    await waitFor(() => {
      expect(screen.getByText('Uploading manuscript...')).toBeInTheDocument();
    });

    // After 50% upload progress, should show adjusted progress (45% = 50% * 0.9)
    await waitFor(() => {
      expect(screen.getByText(/45% uploaded/)).toBeInTheDocument();
    }, { timeout: 150 });

    // After 100% upload, should switch to processing
    await waitFor(() => {
      expect(screen.getByText('Processing and extracting metadata...')).toBeInTheDocument();
      expect(screen.getByText('Processing document...')).toBeInTheDocument();
    }, { timeout: 250 });

    // After completion, should show success
    await waitFor(() => {
      expect(screen.getByText(/file uploaded successfully/i)).toBeInTheDocument();
    }, { timeout: 350 });
  });

  it('should cap upload progress at 90% and show processing at 95%', async () => {
    let progressCallback: ((progress: number) => void) | undefined;

    const mockMutateAsync = jest.fn().mockImplementation(({ onProgress }) => {
      progressCallback = onProgress;
      
      // Simulate immediate 100% upload progress
      setTimeout(() => {
        if (progressCallback) {
          progressCallback(100);
        }
      }, 50);

      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            fileId: 'test-file-id',
            fileName: 'test.docx',
            fileSize: 1024,
            uploadedAt: new Date().toISOString(),
            metadata: {
              title: 'Test Document',
              authors: [],
              affiliations: [],
              keywords: [],
              abstract: '',
              authorAffiliationMap: {}
            }
          });
        }, 200);
      });
    });

    mockUseFileUpload.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: true,
      isError: false,
    } as any);

    renderFileUpload();

    const file = new File(['test content'], 'test.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const fileInput = screen.getByLabelText(/choose manuscript file/i);
    fireEvent.change(fileInput, { target: { files: [file] } });

    // After upload completes, should show processing at 95%
    await waitFor(() => {
      expect(screen.getByText('Processing and extracting metadata...')).toBeInTheDocument();
    }, { timeout: 100 });
  });
});