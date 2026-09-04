import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { UserReportService } from '../services/UserReportService';
import { ApiResponse } from '../types';
import Joi from 'joi';

const prisma = new PrismaClient();

const dateSchema = Joi.date().iso();
const uuidSchema = Joi.string().uuid();

export class UserReportController {
  private userReportService: UserReportService;

  constructor() {
    this.userReportService = new UserReportService(prisma);
  }

  /**
   * GET /api/reports/my-reports
   * Get current user's reports with optional date filtering
   */
  getUserReports = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user || !req.user.id) {
        res.status(401).json({
          success: false,
          error: {
            type: 'AUTHENTICATION_ERROR',
            message: 'User not authenticated',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      // Check if a specific userId is requested (admin filtering)
      const requestedUserId = req.query.userId as string | undefined;
      
      // Determine the userId to filter by:
      // 1. If userId parameter provided and user is admin → use that userId
      // 2. If user is admin and no userId specified → show all (empty string)
      // 3. If user is not admin → always use their own userId
      let userId: string;
      
      if (req.user.role === 'ADMIN') {
        userId = requestedUserId || ''; // Empty string means all users
        console.log('[getUserReports] Admin requesting reports for:', userId || 'ALL USERS');
      } else {
        userId = req.user.id; // Regular users always see only their own
        console.log('[getUserReports] User requesting their own reports:', userId);
      }

      // Parse query parameters
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;
      const processId = req.query.processId as string | undefined;

      console.log('[getUserReports] Filters:', { userId, dateFrom, dateTo, processId });

      const summary = await this.userReportService.getUserReports(userId, {
        dateFrom,
        dateTo,
        processId,
      });

      console.log('[getUserReports] Summary:', {
        totalProcesses: summary.totalProcesses,
        totalRecommendations: summary.totalRecommendations,
        totalShortlisted: summary.totalShortlisted,
        reportsCount: summary.reports.length
      });

      const response: ApiResponse = {
        success: true,
        data: summary,
      };

      res.json(response);
    } catch (error) {
      console.error('Error fetching user reports:', error);
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to fetch user reports',
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  /**
   * GET /api/reports/all
   * Get all reports (admin only)
   */
  getAllReports = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user || req.user.role !== 'ADMIN') {
        res.status(403).json({
          success: false,
          error: {
            type: 'AUTHORIZATION_ERROR',
            message: 'Admin access required',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      // Parse query parameters
      const userId = req.query.userId as string | undefined;
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;
      const processId = req.query.processId as string | undefined;

      const reports = await this.userReportService.getAllReports({
        userId,
        dateFrom,
        dateTo,
        processId,
      });

      const response: ApiResponse = {
        success: true,
        data: reports,
      };

      res.json(response);
    } catch (error) {
      console.error('Error fetching all reports:', error);
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to fetch reports',
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  /**
   * POST /api/reports/generate/:processId
   * Generate or update report for a specific process
   */
  generateReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const processId = req.params.id;

      if (!processId) {
        res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Process ID is required',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const { error } = uuidSchema.validate(processId);
      if (error) {
        res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Invalid process ID',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const report = await this.userReportService.generateReportForProcess(processId);

      if (!report) {
        res.status(404).json({
          success: false,
          error: {
            type: 'NOT_FOUND',
            message: 'Process not found',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: report,
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Error generating report:', error);
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to generate report',
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  /**
   * GET /api/reports/date-range
   * Get reports grouped by date
   */
  getReportsByDateRange = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user || !req.user.id) {
        res.status(401).json({
          success: false,
          error: {
            type: 'AUTHENTICATION_ERROR',
            message: 'User not authenticated',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const userId = req.user.id;
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;

      if (!dateFrom || !dateTo) {
        res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Both dateFrom and dateTo are required',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const reports = await this.userReportService.getReportsByDateRange(userId, dateFrom, dateTo);

      const response: ApiResponse = {
        success: true,
        data: reports,
      };

      res.json(response);
    } catch (error) {
      console.error('Error fetching reports by date range:', error);
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to fetch reports by date range',
          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  /**
   * DELETE /api/reports/:id
   * Delete a report by ID
   */
  deleteReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const reportId = req.params.id;

      if (!reportId) {
        res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Report ID is required',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const { error } = uuidSchema.validate(reportId);
      if (error) {
        res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Invalid report ID',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const deleted = await this.userReportService.deleteReport(reportId);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: {
            type: 'NOT_FOUND',
            message: 'Report not found',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: { message: 'Report deleted successfully' },
      };

      res.json(response);
    } catch (error) {
      console.error('Error deleting report:', error);
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to delete report',
          timestamp: new Date().toISOString(),
        },
      });
    }
  };
}
