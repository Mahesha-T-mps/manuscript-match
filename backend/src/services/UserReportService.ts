import { PrismaClient } from '@prisma/client';

export interface UserReportData {
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
  reportDate: Date;
  createdAt: Date;
}

export interface CreateUserReportInput {
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
  reportDate?: Date;
}

export interface UserReportFilters {
  userId?: string;
  processId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface UserReportSummary {
  totalProcesses: number;
  totalReviewers: number;
  totalShortlisted: number;
  averageReviewers: number;
  averageShortlisted: number;
  reports: UserReportData[];
}

export class UserReportService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create or update user report for a process
   */
  async createOrUpdateReport(input: CreateUserReportInput): Promise<UserReportData> {
    // Check if report already exists for this process
    const existing = await this.prisma.userReport.findFirst({
      where: {
        processId: input.processId,
      },
    });

    const reportDate = input.reportDate || new Date();

    if (existing) {
      // Update existing report
      const updated = await this.prisma.userReport.update({
        where: { id: existing.id },
        data: {
          processTitle: input.processTitle,
          recommendationsCount: input.recommendationsCount,
          shortlistedCount: input.shortlistedCount,
          reviewersCount: input.reviewersCount,
          shortlistedAuthors: input.shortlistedAuthors ? JSON.stringify(input.shortlistedAuthors) : null,
          reportDate,
        },
      });

      return this.mapToUserReportData(updated);
    } else {
      // Create new report
      const created = await this.prisma.userReport.create({
        data: {
          userId: input.userId,
          processId: input.processId,
          processTitle: input.processTitle,
          recommendationsCount: input.recommendationsCount,
          shortlistedCount: input.shortlistedCount,
          reviewersCount: input.reviewersCount,
          shortlistedAuthors: input.shortlistedAuthors ? JSON.stringify(input.shortlistedAuthors) : null,
          reportDate,
        },
      });

      return this.mapToUserReportData(created);
    }
  }

  /**
   * Get reports for a specific user with optional filters
   * If userId is empty string, returns all reports (for admin)
   */
  async getUserReports(
    userId: string,
    filters: UserReportFilters = {}
  ): Promise<UserReportSummary> {
    const where: any = {};

    // Only filter by userId if provided (non-empty)
    if (userId && userId.trim() !== '') {
      where.userId = userId;
    }

    if (filters.processId) {
      where.processId = filters.processId;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.reportDate = {};
      if (filters.dateFrom) {
        where.reportDate.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.reportDate.lte = filters.dateTo;
      }
    }

    const reports = await this.prisma.userReport.findMany({
      where,
      orderBy: { reportDate: 'desc' },
    });

    const mappedReports = reports.map(r => this.mapToUserReportData(r));

    // Calculate summary statistics
    const totalProcesses = mappedReports.length;
    const totalReviewers = mappedReports.reduce((sum, r) => sum + r.reviewersCount, 0);
    const totalShortlisted = mappedReports.reduce((sum, r) => sum + r.shortlistedCount, 0);

    return {
      totalProcesses,
      totalReviewers,
      totalShortlisted,
      averageReviewers: totalProcesses > 0 ? totalReviewers / totalProcesses : 0,
      averageShortlisted: totalProcesses > 0 ? totalShortlisted / totalProcesses : 0,
      reports: mappedReports,
    };
  }

  /**
   * Get all reports (admin only) with optional filters
   */
  async getAllReports(filters: UserReportFilters = {}): Promise<UserReportData[]> {
    const where: any = {};

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.processId) {
      where.processId = filters.processId;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.reportDate = {};
      if (filters.dateFrom) {
        where.reportDate.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.reportDate.lte = filters.dateTo;
      }
    }

    const reports = await this.prisma.userReport.findMany({
      where,
      orderBy: { reportDate: 'desc' },
    });

    return reports.map(r => this.mapToUserReportData(r));
  }

  /**
   * Generate report for a specific process
   * This calculates the counts from actual data
   */
  async generateReportForProcess(processId: string): Promise<UserReportData | null> {
    // Get process details including metadata
    const process = await this.prisma.process.findUnique({
      where: { id: processId },
      include: {
        processAuthors: {
          include: {
            author: {
              include: {
                affiliations: {
                  include: {
                    affiliation: true,
                  },
                },
              },
            },
          },
        },
        shortlists: true,
      },
    });

    if (!process) {
      return null;
    }

    // Count candidates (authors that appeared in Recommendations step)
    const candidateCount = process.processAuthors.filter(
      pa => pa.role === 'CANDIDATE'
    ).length;

    // Count shortlisted authors (final selection)
    const shortlistedCount = process.processAuthors.filter(
      pa => pa.role === 'SHORTLISTED'
    ).length;

    // Total reviewers = candidates OR shortlisted if no candidates exist
    // This handles cases where authors were added directly to shortlist
    // or where CANDIDATE entries were removed after shortlisting
    const reviewersCount = candidateCount > 0 ? candidateCount : shortlistedCount;

    // For backwards compatibility
    const recommendationsCount = reviewersCount;

    // Parse metadata to get author affiliations
    let authorsMetadata: any[] = [];
    try {
      if (process.metadata) {
        const metadata = typeof process.metadata === 'string' 
          ? JSON.parse(process.metadata) 
          : process.metadata;
        authorsMetadata = metadata?.authors || [];
      }
    } catch (error) {
      console.error(`[generateReportForProcess] Error parsing metadata:`, error);
    }

    // Get shortlisted author details
    const shortlistedAuthorsData = process.processAuthors
      .filter(pa => pa.role === 'SHORTLISTED')
      .map(pa => {
        // Try to get affiliation from metadata first, then from author field
        const authorMeta = authorsMetadata.find(
          a => a.email === pa.author.email || a.name === pa.author.name
        );
        
        const affiliation = pa.author.affiliation ||
                           authorMeta?.affiliations?.[0]?.institutionName ||
                           pa.author.affiliations?.[0]?.affiliation?.institutionName;
        
        return {
          name: pa.author.name,
          email: pa.author.email || undefined,
          affiliation: affiliation || undefined,
        };
      });

    console.log(`[generateReportForProcess] Process ${processId}:`);
    console.log(`  - CANDIDATE role: ${candidateCount}`);
    console.log(`  - SHORTLISTED role: ${shortlistedCount}`);
    console.log(`  - Total Reviewers (reported): ${reviewersCount}`);
    console.log(`  - Shortlisted authors details: ${shortlistedAuthorsData.length} authors`);
    if (shortlistedAuthorsData.length > 0) {
      console.log(`  - Sample author:`, JSON.stringify(shortlistedAuthorsData[0]));
    }

    // Create or update the report
    const report = await this.createOrUpdateReport({
      userId: process.userId,
      processId: process.id,
      processTitle: process.title,
      recommendationsCount,
      shortlistedCount,
      reviewersCount,
      shortlistedAuthors: shortlistedAuthorsData,
    });

    return report;
  }

  /**
   * Get report summary grouped by date
   */
  async getReportsByDateRange(
    userId: string,
    dateFrom: Date,
    dateTo: Date
  ): Promise<{ date: string; recommendationsCount: number; shortlistedCount: number }[]> {
    const reports = await this.prisma.userReport.findMany({
      where: {
        userId,
        reportDate: {
          gte: dateFrom,
          lte: dateTo,
        },
      },
      orderBy: { reportDate: 'asc' },
    });

    // Group by date
    const groupedByDate = new Map<string, { recommendationsCount: number; shortlistedCount: number }>();

    reports.forEach(report => {
      const dateStr = report.reportDate.toISOString().split('T')[0];
      const existing = groupedByDate.get(dateStr);

      if (existing) {
        existing.recommendationsCount += report.recommendationsCount;
        existing.shortlistedCount += report.shortlistedCount;
      } else {
        groupedByDate.set(dateStr, {
          recommendationsCount: report.recommendationsCount,
          shortlistedCount: report.shortlistedCount,
        });
      }
    });

    return Array.from(groupedByDate.entries()).map(([date, counts]) => ({
      date,
      ...counts,
    }));
  }

  /**
   * Delete report by ID
   */
  async deleteReport(reportId: string): Promise<boolean> {
    try {
      await this.prisma.userReport.delete({
        where: { id: reportId },
      });
      return true;
    } catch {
      return false;
    }
  }

  private mapToUserReportData(report: any): UserReportData {
    let shortlistedAuthors;
    try {
      if (report.shortlistedAuthors) {
        shortlistedAuthors = typeof report.shortlistedAuthors === 'string'
          ? JSON.parse(report.shortlistedAuthors)
          : report.shortlistedAuthors;
        console.log(`[mapToUserReportData] Parsed ${shortlistedAuthors?.length || 0} authors for report ${report.id}`);
      }
    } catch (error) {
      console.error('Error parsing shortlistedAuthors:', error);
      shortlistedAuthors = undefined;
    }

    return {
      id: report.id,
      userId: report.userId,
      processId: report.processId,
      processTitle: report.processTitle,
      recommendationsCount: report.recommendationsCount,
      shortlistedCount: report.shortlistedCount,
      reviewersCount: report.reviewersCount || 0,
      shortlistedAuthors,
      reportDate: report.reportDate,
      createdAt: report.createdAt,
    };
  }
}
