/**
 * Reports hook for fetching and managing report data
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { processService } from '../services/processService';
import { adminService } from '../services/adminService';
import type { Process, AdminProcess, UserProfile } from '../types/api';

export interface ReportStats {
  totalProcesses: number;
  activeProcesses: number;
  completedProcesses: number;
  pendingProcesses: number;
  averageCompletionTime?: number;
}

export interface ProcessStatusData {
  status: string;
  count: number;
  percentage: number;
}

export interface ProcessStageData {
  stage: string;
  count: number;
  percentage: number;
}

export interface TimelineDataPoint {
  date: string;
  created: number;
  completed: number;
}

export interface UserActivityData {
  userId: string;
  userEmail: string;
  processCount: number;
  activeCount: number;
  completedCount: number;
}

export interface ReportData {
  stats: ReportStats;
  processData: {
    byStatus: ProcessStatusData[];
    byStage: ProcessStageData[];
    processes: (Process | AdminProcess)[];
  };
  timelineData: TimelineDataPoint[];
  userActivityData: UserActivityData[];
  users?: UserProfile[];
}

interface UseReportsOptions {
  userId?: string;
  dateRange?: '7d' | '30d' | '90d' | 'all';
}

export function useReports(options: UseReportsOptions = {}) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const { userId, dateRange = '30d' } = options;

  // Fetch processes based on user role
  const { data: processes, isLoading: processesLoading, isError: processesError, refetch: refetchProcesses } = useQuery({
    queryKey: ['reports', 'processes', userId, dateRange, isAdmin],
    queryFn: async () => {
      try {
        console.log('[useReports] Starting to fetch processes...', { isAdmin, userId, dateRange });
        
        if (isAdmin) {
          try {
            // Check if adminService and its getProcesses method exist
            if (!adminService || typeof adminService.getProcesses !== 'function') {
              console.warn('[useReports] Admin service or getProcesses method not available, using fallback');
              throw new Error('Admin service not available');
            }
            
            // Try to get admin processes with user information
            console.log('[useReports] Attempting to fetch admin processes...');
            const response = await adminService.getProcesses({
              limit: 1000, // Get all processes for reporting
              userId: userId === 'all' ? undefined : userId,
            });
            
            console.log('[useReports] Admin processes fetched successfully:', response.data?.length || 0);
            // Filter by date range
            const processes = response.data || [];
            return filterProcessesByDateRange(processes, dateRange);
          } catch (adminError) {
            console.warn('[useReports] Admin service failed, falling back to regular process service:', adminError);
            // Fallback to regular process service for admin users
            const allProcesses = await processService.getProcesses();
            console.log('[useReports] Fallback processes fetched:', allProcesses?.length || 0);
            return filterProcessesByDateRange(allProcesses || [], dateRange);
          }
        } else {
          // Regular users get their own processes
          console.log('[useReports] Fetching regular user processes...');
          const allProcesses = await processService.getProcesses();
          console.log('[useReports] Regular processes fetched:', allProcesses?.length || 0);
          return filterProcessesByDateRange(allProcesses || [], dateRange);
        }
      } catch (error) {
        console.error('Error fetching processes for reports:', error);
        // Return empty array instead of throwing to prevent UI crash
        return [];
      }
    },
    staleTime: 2 * 60 * 1000,
    retry: (failureCount, error: any) => {
      console.error(`[useReports] Query failed (attempt ${failureCount + 1}):`, error);
      // Retry up to 2 times for network errors, but not for auth errors
      if (failureCount < 2 && error?.response?.status !== 401 && error?.response?.status !== 403) {
        return true;
      }
      return false;
    },
  });

  // Fetch users list (admin only)
  const { data: usersData, isLoading: usersLoading, isError: usersError } = useQuery({
    queryKey: ['reports', 'users'],
    queryFn: async () => {
      try {
        console.log('[useReports] Fetching users list for admin...');
        
        // Check if adminService and getUsers method exist
        if (!adminService || typeof adminService.getUsers !== 'function') {
          console.warn('[useReports] Admin service getUsers method not available');
          return [];
        }
        
        const response = await adminService.getUsers({ limit: 1000 });
        console.log('[useReports] Users fetched successfully:', response.data?.length || 0, 'users');
        console.log('[useReports] Users data:', response.data);
        return response.data || [];
      } catch (error) {
        console.error('Error fetching users for reports:', error);
        console.error('Error details:', {
          message: error?.message,
          status: error?.response?.status,
          statusText: error?.response?.statusText,
          data: error?.response?.data
        });
        // Return empty array on error so the UI doesn't break
        return [];
      }
    },
    enabled: isAdmin,
    staleTime: 5 * 60 * 1000,
    retry: false, // Don't retry failed admin requests
  });

  // Debug users data
  console.log('[useReports] Users query state:', {
    isAdmin,
    usersLoading,
    usersError,
    usersDataLength: usersData?.length,
    usersData
  });

  // Process the data
  const reportData = React.useMemo(() => {
    console.log('Processing report data:', { 
      processCount: processes?.length, 
      isAdmin, 
      dateRange,
      hasUsers: !!usersData,
      processes: processes
    });

    // Ensure we have a valid processes array
    const validProcesses = Array.isArray(processes) ? processes : [];
    const validUsers = Array.isArray(usersData) ? usersData : [];

    if (validProcesses.length === 0) {
      console.log('No processes available for reports');
      return {
        stats: {
          totalProcesses: 0,
          activeProcesses: 0,
          completedProcesses: 0,
          pendingProcesses: 0,
        },
        processData: {
          byStatus: [],
          byStage: [],
          processes: [],
        },
        timelineData: [],
        userActivityData: [],
        users: validUsers,
      };
    }

    // Calculate stats
    const stats = calculateStats(validProcesses);
    console.log('Calculated stats:', stats);
    
    // Process status distribution
    const byStatus = calculateStatusDistribution(validProcesses);
    console.log('Status distribution:', byStatus);
    
    // Process stage distribution
    const byStage = calculateStageDistribution(validProcesses);
    console.log('Stage distribution:', byStage);
    
    // Timeline data
    const timelineData = calculateTimelineData(validProcesses, dateRange);
    
    // User activity (admin only)
    const userActivityData = isAdmin ? calculateUserActivity(validProcesses) : [];

    return {
      stats,
      processData: {
        byStatus,
        byStage,
        processes: validProcesses,
      },
      timelineData,
      userActivityData,
      users: validUsers,
    };
  }, [processes, usersData, isAdmin, dateRange]);

  return {
    ...reportData,
    isLoading: processesLoading,
    isError: processesError,
    refetch: refetchProcesses,
  };
}

// Helper functions

function getDateFromRange(range: string): string | undefined {
  if (range === 'all') return undefined;
  
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function filterProcessesByDateRange(processes: (Process | AdminProcess)[], range: string): (Process | AdminProcess)[] {
  if (range === 'all') return processes;
  
  const cutoffDate = new Date();
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  return processes.filter(p => new Date(p.createdAt) >= cutoffDate);
}

// Helper functions for progress-based status
function getStepOrder(stepId: string): number {
  const stepMap: Record<string, number> = {
    'UPLOAD': 1,
    'METADATA_EXTRACTION': 2,
    'KEYWORD_ENHANCEMENT': 3,
    'DATABASE_SEARCH': 4,
    'MANUAL_SEARCH': 5,
    'VALIDATION': 6,
    'RECOMMENDATIONS': 7,
    'SHORTLIST': 8,
  };
  return stepMap[stepId] || 1;
}

function getStepProgress(currentStep: string): number {
  const stepOrder = getStepOrder(currentStep);
  return Math.min((stepOrder / 8) * 100, 100); // 8 total steps
}

function getProgressBasedStatus(currentStep: string): string {
  const progress = getStepProgress(currentStep);
  
  if (progress >= 100) {
    return 'Completed';
  } else if (progress <= 12.5) { // First step (UPLOAD) is 12.5%
    return 'Created';
  } else {
    return 'In Progress';
  }
}

function calculateStats(processes: (Process | AdminProcess)[]): ReportStats {
  if (!Array.isArray(processes)) {
    console.warn('calculateStats received non-array:', processes);
    return {
      totalProcesses: 0,
      activeProcesses: 0,
      completedProcesses: 0,
      pendingProcesses: 0,
    };
  }

  const total = processes.length;
  
  // Use progress-based status instead of backend status
  const completed = processes.filter(p => {
    const progressStatus = getProgressBasedStatus(p?.currentStep || 'UPLOAD');
    return progressStatus === 'Completed';
  }).length;
  
  const pending = processes.filter(p => {
    const progressStatus = getProgressBasedStatus(p?.currentStep || 'UPLOAD');
    return progressStatus === 'Created';
  }).length;
  
  // Active processes = all processes except completed ones (includes both Created and In Progress)
  const active = total - completed;

  // Calculate average completion time for completed processes (progress-based)
  const completedProcesses = processes.filter(p => {
    const progressStatus = getProgressBasedStatus(p?.currentStep || 'UPLOAD');
    return progressStatus === 'Completed' && p?.createdAt && p?.updatedAt;
  });
  let averageCompletionTime: number | undefined;
  
  if (completedProcesses.length > 0) {
    try {
      const totalTime = completedProcesses.reduce((sum, p) => {
        const created = new Date(p.createdAt).getTime();
        const updated = new Date(p.updatedAt).getTime();
        if (isNaN(created) || isNaN(updated)) {
          console.warn('Invalid date in process:', p);
          return sum;
        }
        return sum + (updated - created);
      }, 0);
      averageCompletionTime = totalTime / completedProcesses.length / (1000 * 60 * 60 * 24); // Convert to days
    } catch (error) {
      console.error('Error calculating average completion time:', error);
    }
  }

  const stats = {
    totalProcesses: total,
    activeProcesses: active,
    completedProcesses: completed,
    pendingProcesses: pending,
    averageCompletionTime,
  };

  console.log('Calculated stats:', stats);
  return stats;
}

function calculateStatusDistribution(processes: (Process | AdminProcess)[]): ProcessStatusData[] {
  if (!Array.isArray(processes) || processes.length === 0) {
    return [];
  }

  const statusCounts: Record<string, number> = {};
  
  processes.forEach(p => {
    if (p?.currentStep) {
      const progressStatus = getProgressBasedStatus(p.currentStep);
      statusCounts[progressStatus] = (statusCounts[progressStatus] || 0) + 1;
    }
  });

  const total = processes.length;
  
  return Object.entries(statusCounts).map(([status, count]) => ({
    status,
    count,
    percentage: (count / total) * 100,
  }));
}

function calculateStageDistribution(processes: (Process | AdminProcess)[]): ProcessStageData[] {
  if (!Array.isArray(processes) || processes.length === 0) {
    return [];
  }

  const stageCounts: Record<string, number> = {};
  
  processes.forEach(p => {
    if (p?.currentStep) {
      stageCounts[p.currentStep] = (stageCounts[p.currentStep] || 0) + 1;
    }
  });

  const total = processes.length;
  
  return Object.entries(stageCounts).map(([stage, count]) => ({
    stage,
    count,
    percentage: (count / total) * 100,
  }));
}

function calculateTimelineData(
  processes: (Process | AdminProcess)[],
  range: string
): TimelineDataPoint[] {
  const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 365;
  const dataPoints: TimelineDataPoint[] = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const created = processes.filter(p => 
      p.createdAt.startsWith(dateStr)
    ).length;
    
    const completed = processes.filter(p => 
      p.status === 'COMPLETED' && p.updatedAt.startsWith(dateStr)
    ).length;
    
    dataPoints.push({
      date: dateStr,
      created,
      completed,
    });
  }
  
  return dataPoints;
}

function calculateUserActivity(processes: (Process | AdminProcess)[]): UserActivityData[] {
  const userMap: Record<string, UserActivityData> = {};
  
  console.log('[calculateUserActivity] Processing', processes.length, 'processes');
  
  processes.forEach(p => {
    // Check if this is an AdminProcess with user information
    if ('userId' in p && 'userEmail' in p) {
      console.log('[calculateUserActivity] Found AdminProcess:', p.userId, p.userEmail);
      
      if (!userMap[p.userId]) {
        userMap[p.userId] = {
          userId: p.userId,
          userEmail: p.userEmail,
          processCount: 0,
          activeCount: 0,
          completedCount: 0,
        };
      }
      
      userMap[p.userId].processCount++;
      
      if (p.status === 'PROCESSING' || p.status === 'SEARCHING' || p.status === 'VALIDATING' || p.status === 'UPLOADING') {
        userMap[p.userId].activeCount++;
      }
      
      if (p.status === 'COMPLETED') {
        userMap[p.userId].completedCount++;
      }
    } else {
      // This is a regular Process without user info
      // Since we don't have user information, we can't create meaningful user activity data
      console.log('[calculateUserActivity] Regular Process (no user info), skipping for user activity:', p.id);
    }
  });
  
  const result = Object.values(userMap).sort((a, b) => b.processCount - a.processCount);
  console.log('[calculateUserActivity] Final user activity data:', result);
  
  return result;
}

// Add React import for useMemo
import React from 'react';
