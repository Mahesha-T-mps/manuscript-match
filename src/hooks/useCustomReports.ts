/**
 * Custom Reports hook for fetching user custom reports
 */

import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

export interface CustomReportData {
  id: string;
  userId: string;
  processId: string;
  processTitle: string;
  recommendationsCount: number;
  shortlistedCount: number;
  reviewersCount: number;
  shortlistedAuthors?: Array<{
    name: string;
    email?: string;
    affiliation?: string;
  }>;
  reportDate: string;
  createdAt: string;
}

export interface CustomReportSummary {
  totalProcesses: number;
  totalReviewers: number;
  totalShortlisted: number;
  averageReviewers: number;
  averageShortlisted: number;
  reports: CustomReportData[];
}

interface UseCustomReportsOptions {
  userId?: string;  // NEW: For admin to filter by specific user
  dateFrom?: Date;
  dateTo?: Date;
  processId?: string;
}

export function useCustomReports(options: UseCustomReportsOptions = {}) {
  const { token } = useAuth();
  const { userId, dateFrom, dateTo, processId } = options;

  const { data, isLoading, isError, error, refetch } = useQuery<CustomReportSummary>({
    queryKey: ['customReports', userId, dateFrom, dateTo, processId],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (userId) {
        params.append('userId', userId);
      }
      if (dateFrom) {
        params.append('dateFrom', dateFrom.toISOString());
      }
      if (dateTo) {
        params.append('dateTo', dateTo.toISOString());
      }
      if (processId) {
        params.append('processId', processId);
      }

      const url = `${import.meta.env.VITE_API_BASE_URL}/api/reports/my-reports?${params.toString()}`;
      console.log('[useCustomReports] Fetching from:', url);
      console.log('[useCustomReports] Filters:', { userId, dateFrom, dateTo, processId });

      try {
        const response = await axios.get(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        console.log('[useCustomReports] Response:', response.data);
        console.log('[useCustomReports] Response.data:', response.data.data);
        console.log('[useCustomReports] Total Processes:', response.data.data?.totalProcesses);
        console.log('[useCustomReports] Total Reviewers:', response.data.data?.totalReviewers);
        console.log('[useCustomReports] Total Shortlisted:', response.data.data?.totalShortlisted);
        console.log('[useCustomReports] Reports array:', response.data.data?.reports);
        
        // Ensure we always return a valid structure
        const data = response.data.data || {
          totalProcesses: 0,
          totalReviewers: 0,
          totalShortlisted: 0,
          averageReviewers: 0,
          averageShortlisted: 0,
          reports: [],
        };
        
        return data;
      } catch (err: any) {
        console.error('[useCustomReports] Error:', err.response?.status, err.response?.data || err.message);
        
        // Return empty structure instead of throwing
        // This prevents the "data cannot be undefined" error
        return {
          totalProcesses: 0,
          totalReviewers: 0,
          totalShortlisted: 0,
          averageReviewers: 0,
          averageShortlisted: 0,
          reports: [],
        };
      }
    },
    enabled: !!token,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: false, // Don't retry on error, just show empty data
    refetchOnWindowFocus: false, // Don't refetch when switching tabs
  });

  return {
    summary: data,
    reports: data?.reports || [],
    totalProcesses: data?.totalProcesses || 0,
    totalReviewers: data?.totalReviewers || 0,
    totalShortlisted: data?.totalShortlisted || 0,
    averageReviewers: data?.averageReviewers || 0,
    averageShortlisted: data?.averageShortlisted || 0,
    isLoading,
    isError,
    error,
    refetch,
  };
}

/**
 * Hook for generating a report for a specific process
 */
export function useGenerateReport() {
  const { token } = useAuth();

  const generateReport = async (processId: string): Promise<CustomReportData> => {
    const response = await axios.post(
      `${import.meta.env.VITE_API_BASE_URL}/api/reports/generate/${processId}`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data.data;
  };

  return { generateReport };
}
