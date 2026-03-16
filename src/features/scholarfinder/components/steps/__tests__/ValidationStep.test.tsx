import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ValidationStep } from '../ValidationStep';
import { ScholarFinderApiService } from '../../services/ScholarFinderApiService';

// Mock the API service
jest.mock('../../services/ScholarFinderApiService');
const mockApiService = ScholarFinderApiService as jest.MockedClass<typeof ScholarFinderApiService>;

// Mock hooks
jest.mock('../../hooks/useProcessManagement', () => ({
  useProcess: () => ({ data: null })
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: jest.fn() })
}));

describe('ValidationStep', () => {
  const defaultProps = {
    processId: 'test-process',
    jobId: 'test-job',
    onNext: jest.fn(),
    onPrevious: jest.fn(),
    isLoading: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders validation conditions selection', () => {
    render(<ValidationStep {...defaultProps} />);
    
    expect(screen.getByText('Author Validation')).toBeInTheDocument();
    expect(screen.getByText('Validation Conditions')).toBeInTheDocument();
    expect(screen.getByText('Publications')).toBeInTheDocument();
    expect(screen.getByText('Coauthor Analysis')).toBeInTheDocument();
    expect(screen.getByText('Conflict of Interest')).toBeInTheDocument();
  });

  it('allows selecting and deselecting conditions', () => {
    render(<ValidationStep {...defaultProps} />);
    
    const publicationsCheckbox = screen.getByLabelText('Publications');
    const coauthorCheckbox = screen.getByLabelText('Coauthor Analysis');
    
    // Initially unchecked
    expect(publicationsCheckbox).not.toBeChecked();
    expect(coauthorCheckbox).not.toBeChecked();
    
    // Select conditions
    fireEvent.click(publicationsCheckbox);
    fireEvent.click(coauthorCheckbox);
    
    expect(publicationsCheckbox).toBeChecked();
    expect(coauthorCheckbox).toBeChecked();
    
    // Check counter
    expect(screen.getByText('2 of 10 selected')).toBeInTheDocument();
  });

  it('handles select all and select none', () => {
    render(<ValidationStep {...defaultProps} />);
    
    const selectAllButton = screen.getByText('Select All');
    const selectNoneButton = screen.getByText('Select None');
    
    // Select all
    fireEvent.click(selectAllButton);
    expect(screen.getByText('10 of 10 selected')).toBeInTheDocument();
    
    // Select none
    fireEvent.click(selectNoneButton);
    expect(screen.getByText('0 of 10 selected')).toBeInTheDocument();
  });

  it('calls API when running validation', async () => {
    const mockValidateAuthorsWithConditions = jest.fn().mockResolvedValue({
      message: 'Success',
      job_id: 'test-job',
      total_authors: 5,
      top_5_preview: []
    });

    mockApiService.prototype.validateAuthorsWithConditions = mockValidateAuthorsWithConditions;

    render(<ValidationStep {...defaultProps} />);
    
    // Select a condition
    const publicationsCheckbox = screen.getByLabelText('Publications');
    fireEvent.click(publicationsCheckbox);
    
    // Run validation
    const runButton = screen.getByText(/Run Validation/);
    fireEvent.click(runButton);
    
    await waitFor(() => {
      expect(mockValidateAuthorsWithConditions).toHaveBeenCalledWith('test-job', ['Publications']);
    });
  });

  it('shows validation results after successful validation', async () => {
    const mockValidateAuthorsWithConditions = jest.fn().mockResolvedValue({
      message: 'Success',
      job_id: 'test-job',
      total_authors: 5,
      top_5_preview: [
        {
          reviewer: 'Dr. Test Author',
          aff: 'Test University',
          country: 'Test Country',
          conditions_satisfied: '3 conditions met'
        }
      ]
    });

    mockApiService.prototype.validateAuthorsWithConditions = mockValidateAuthorsWithConditions;

    render(<ValidationStep {...defaultProps} />);
    
    // Select a condition and run validation
    const publicationsCheckbox = screen.getByLabelText('Publications');
    fireEvent.click(publicationsCheckbox);
    
    const runButton = screen.getByText(/Run Validation/);
    fireEvent.click(runButton);
    
    await waitFor(() => {
      expect(screen.getByText('Validation Results')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument(); // Total authors
      expect(screen.getByText('Dr. Test Author')).toBeInTheDocument();
    });
  });
});