/**
 * Reports Page
 * Interactive dashboard with reports on processes and status
 * Admin sees all users' data, individual users see only their own data
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Button } from '../components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Calendar } from '../components/ui/calendar';
import { RefreshCw, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { useReports } from '../hooks/useReports';
import { useCustomReports } from '../hooks/useCustomReports';
import { 
  ProcessStatusChart, 
  ProcessTimelineChart, 
  UserActivityChart, 
  ProcessTable, 
  StatsCards,
  CustomReportsChart,
  CustomReportsTable
} from '../components/reports';
import { Skeleton } from '../components/ui/skeleton';
import { useToast } from '../hooks/use-toast';

export default function Reports() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === 'ADMIN';
  
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'custom'>('30d');
  const [selectedUserId, setSelectedUserId] = useState<string | 'all'>(isAdmin ? 'all' : user?.id || '');
  const [customDateFrom, setCustomDateFrom] = useState<Date | undefined>(undefined);
  const [customDateTo, setCustomDateTo] = useState<Date | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [exportValue, setExportValue] = useState<string>('');
  
  // Clear custom dates when switching away from custom range
  useEffect(() => {
    if (dateRange !== 'custom') {
      setCustomDateFrom(undefined);
      setCustomDateTo(undefined);
    }
  }, [dateRange]);
  
  const { 
    stats, 
    processData, 
    timelineData, 
    userActivityData,
    users,
    isLoading, 
    isError,
    refetch 
  } = useReports({
    userId: selectedUserId === 'all' ? undefined : selectedUserId,
    dateRange,
    customDateFrom,
    customDateTo,
  });

  // Fetch custom reports
  const {
    reports: customReports,
    totalProcesses,
    totalReviewers,
    totalShortlisted,
    averageReviewers,
    averageShortlisted,
    isLoading: customReportsLoading,
    isError: customReportsError,
    refetch: refetchCustomReports,
  } = useCustomReports({
    userId: selectedUserId === 'all' ? undefined : selectedUserId,
    dateFrom: customDateFrom,
    dateTo: customDateTo,
  });

  // Debug logging
  console.log('[Reports] Current state:', {
    isAdmin,
    selectedUserId,
    userActivityDataLength: userActivityData?.length,
    usersLength: users?.length,
    isLoading,
    isError
  });
  console.log('[Reports] User activity data:', userActivityData);
  console.log('[Reports] Users list:', users);
  console.log('[Reports] Users array details:', users?.map(u => ({ id: u.id, email: u.email })));

  const handleExport = async (format: 'csv' | 'xlsx' | 'pdf') => {
    try {
      toast({
        title: 'Exporting Report',
        description: `Preparing ${format.toUpperCase()} export...`,
      });

      // Export different data based on active tab
      let exportData: any;
      let exportTitle: string;

      switch (activeTab) {
        case 'overview':
          exportTitle = 'Overview Report';
          exportData = {
            type: 'overview',
            stats,
            processData,
            exportDate: new Date().toISOString()
          };
          break;
        case 'custom':
          exportTitle = 'Custom Reports';
          exportData = {
            type: 'custom',
            customReports,
            totalProcesses,
            totalShortlisted,
            averageShortlisted,
            exportDate: new Date().toISOString()
          };
          break;
        case 'processes':
          exportTitle = 'Processes Report';
          exportData = {
            type: 'processes',
            processData: processData?.processes || [],
            exportDate: new Date().toISOString()
          };
          break;
        case 'timeline':
          exportTitle = 'Timeline Report';
          exportData = {
            type: 'timeline',
            timelineData,
            exportDate: new Date().toISOString()
          };
          break;
        case 'users':
          exportTitle = 'User Activity Report';
          exportData = {
            type: 'users',
            userActivityData,
            exportDate: new Date().toISOString()
          };
          break;
        default:
          exportTitle = 'Report';
          exportData = { type: 'unknown' };
      }

      if (format === 'csv') {
        const csvContent = generateReportsCSV(exportData, exportTitle);
        downloadFile(csvContent, `${exportTitle.toLowerCase().replace(/\s/g, '_')}_${Date.now()}.csv`, 'text/csv');
      } else if (format === 'xlsx') {
        const XLSX = await import('xlsx');
        const wb = XLSX.utils.book_new();
        
        if (exportData.type === 'custom') {
          // Custom Reports format
          const summaryData = [
            ['Metric', 'Value'],
            ['Total Processes', totalProcesses],
            ['Total Shortlisted', totalShortlisted],
            ['Average Shortlisted', averageShortlisted.toFixed(2)]
          ];
          const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
          XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');
          
          if (customReports && customReports.length > 0) {
            const reportsData = [
              ['Process', 'Shortlisted', 'Report Date'],
              ...customReports.map(r => [
                r.processTitle,
                r.shortlistedCount,
                new Date(r.reportDate).toLocaleDateString()
              ])
            ];
            const reportsWs = XLSX.utils.aoa_to_sheet(reportsData);
            XLSX.utils.book_append_sheet(wb, reportsWs, 'Report Details');
            
            // Add Shortlisted Authors sheet
            const authorsData = [['Process', 'Author Name', 'Email', 'Affiliation']];
            customReports.forEach(r => {
              if (r.shortlistedAuthors && r.shortlistedAuthors.length > 0) {
                r.shortlistedAuthors.forEach(author => {
                  authorsData.push([
                    r.processTitle,
                    author.name,
                    author.email || '-',
                    author.affiliation || '-'
                  ]);
                });
              }
            });
            if (authorsData.length > 1) {
              const authorsWs = XLSX.utils.aoa_to_sheet(authorsData);
              XLSX.utils.book_append_sheet(wb, authorsWs, 'Shortlisted Authors');
            }
          }
        } else if (exportData.type === 'overview') {
          // Overview format
          const statsData = [
            ['Metric', 'Value'],
            ['Total Processes', stats?.totalProcesses || 0],
            ['Active Processes', stats?.activeProcesses || 0],
            ['Completed Processes', stats?.completedProcesses || 0],
            ['Pending Processes', stats?.pendingProcesses || 0]
          ];
          const statsWs = XLSX.utils.aoa_to_sheet(statsData);
          XLSX.utils.book_append_sheet(wb, statsWs, 'Overview');
          
          if (processData && processData.length > 0) {
            const processHeaders = Object.keys(processData[0]);
            const processRows = processData.map(p => processHeaders.map(h => p[h]));
            const processWs = XLSX.utils.aoa_to_sheet([processHeaders, ...processRows]);
            XLSX.utils.book_append_sheet(wb, processWs, 'Processes');
          }
        } else if (exportData.type === 'processes' && exportData.processData && exportData.processData.length > 0) {
          const processHeaders = Object.keys(exportData.processData[0]);
          const processRows = exportData.processData.map(p => processHeaders.map(h => p[h]));
          const processWs = XLSX.utils.aoa_to_sheet([processHeaders, ...processRows]);
          XLSX.utils.book_append_sheet(wb, processWs, 'Processes');
        } else if (exportData.type === 'timeline' && timelineData && timelineData.length > 0) {
          const timelineHeaders = Object.keys(timelineData[0]);
          const timelineRows = timelineData.map(t => timelineHeaders.map(h => t[h]));
          const timelineWs = XLSX.utils.aoa_to_sheet([timelineHeaders, ...timelineRows]);
          XLSX.utils.book_append_sheet(wb, timelineWs, 'Timeline');
        } else if (exportData.type === 'users' && userActivityData && userActivityData.length > 0) {
          const userHeaders = Object.keys(userActivityData[0]);
          const userRows = userActivityData.map(u => userHeaders.map(h => u[h]));
          const userWs = XLSX.utils.aoa_to_sheet([userHeaders, ...userRows]);
          XLSX.utils.book_append_sheet(wb, userWs, 'User Activity');
        }
        
        XLSX.writeFile(wb, `${exportTitle.toLowerCase().replace(/\s/g, '_')}_${Date.now()}.xlsx`);
      } else if (format === 'pdf') {
        const htmlContent = generateReportsHTML(exportData, exportTitle);
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(htmlContent);
          printWindow.document.close();
          // Give the browser a moment to render before printing
          setTimeout(() => {
            printWindow.print();
          }, 250);
        } else {
          throw new Error('Unable to open print window. Please check if popups are blocked.');
        }
      }
      
      toast({
        title: 'Export Complete',
        description: `${exportTitle} exported as ${format.toUpperCase()}`,
      });
      
      // Reset the select value to allow re-exporting the same format
      setExportValue('');
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export report. Please try again.',
        variant: 'destructive',
      });
      
      // Reset the select value even on error
      setExportValue('');
    }
  };

  // Helper function to generate CSV
  const generateReportsCSV = (data: any, title: string): string => {
    let csv = `${title}\n\n`;
    
    if (data.type === 'custom') {
      csv += 'Summary\n';
      csv += 'Metric,Value\n';
      csv += `Total Processes,${data.totalProcesses}\n`;
      csv += `Total Shortlisted,${data.totalShortlisted}\n`;
      csv += `Average Shortlisted,${data.averageShortlisted.toFixed(2)}\n\n`;
      
      if (data.customReports && data.customReports.length > 0) {
        csv += 'Report Details\n';
        csv += 'Process,Shortlisted,Report Date\n';
        data.customReports.forEach((r: any) => {
          csv += `"${r.processTitle}",${r.shortlistedCount},${new Date(r.reportDate).toLocaleDateString()}\n`;
        });
        
        // Add Shortlisted Authors section
        csv += '\n\nShortlisted Authors\n';
        csv += 'Process,Author Name,Email,Affiliation\n';
        data.customReports.forEach((r: any) => {
          if (r.shortlistedAuthors && r.shortlistedAuthors.length > 0) {
            r.shortlistedAuthors.forEach((author: any) => {
              csv += `"${r.processTitle}","${author.name}","${author.email || '-'}","${author.affiliation || '-'}"\n`;
            });
          }
        });
      }
    } else if (data.type === 'overview') {
      csv += 'Statistics\n';
      csv += 'Metric,Value\n';
      csv += `Total Processes,${data.stats?.totalProcesses || 0}\n`;
      csv += `Active Processes,${data.stats?.activeProcesses || 0}\n`;
      csv += `Completed Processes,${data.stats?.completedProcesses || 0}\n`;
      csv += `Pending Processes,${data.stats?.pendingProcesses || 0}\n\n`;
      
      if (data.processData && data.processData.length > 0) {
        csv += 'Processes\n';
        const headers = Object.keys(data.processData[0]);
        csv += headers.join(',') + '\n';
        data.processData.forEach((p: any) => {
          csv += headers.map(h => `"${p[h] || ''}"`).join(',') + '\n';
        });
      }
    } else if (data.type === 'processes') {
      if (data.processData && data.processData.length > 0) {
        const headers = Object.keys(data.processData[0]);
        csv += headers.join(',') + '\n';
        data.processData.forEach((p: any) => {
          csv += headers.map(h => `"${p[h] || ''}"`).join(',') + '\n';
        });
      } else {
        csv += 'No process data available\n';
      }
    } else if (data.type === 'timeline') {
      if (data.timelineData && data.timelineData.length > 0) {
        const headers = Object.keys(data.timelineData[0]);
        csv += headers.join(',') + '\n';
        data.timelineData.forEach((t: any) => {
          csv += headers.map(h => `"${t[h] || ''}"`).join(',') + '\n';
        });
      } else {
        csv += 'No timeline data available\n';
      }
    } else if (data.type === 'users') {
      if (data.userActivityData && data.userActivityData.length > 0) {
        const headers = Object.keys(data.userActivityData[0]);
        csv += headers.join(',') + '\n';
        data.userActivityData.forEach((u: any) => {
          csv += headers.map(h => `"${u[h] || ''}"`).join(',') + '\n';
        });
      } else {
        csv += 'No user activity data available\n';
      }
    }
    
    return csv;
  };

  // Helper function to generate HTML for PDF
  const generateReportsHTML = (data: any, title: string): string => {
    let content = '';
    
    if (data.type === 'custom') {
      content = `
        <div class="summary">
          <h2>Summary</h2>
          <div class="summary-item"><strong>Total Processes:</strong> ${data.totalProcesses}</div>
          <div class="summary-item"><strong>Total Shortlisted:</strong> ${data.totalShortlisted}</div>
          <div class="summary-item"><strong>Average Shortlisted:</strong> ${data.averageShortlisted.toFixed(2)}</div>
        </div>
        
        ${data.customReports && data.customReports.length > 0 ? `
          <h2>Report Details</h2>
          <table>
            <thead>
              <tr>
                <th>Process</th>
                <th>Shortlisted</th>
                <th>Report Date</th>
              </tr>
            </thead>
            <tbody>
              ${data.customReports.map((r: any) => `
                <tr>
                  <td>${r.processTitle}</td>
                  <td>${r.shortlistedCount}</td>
                  <td>${new Date(r.reportDate).toLocaleDateString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <h2 style="margin-top: 30px;">Shortlisted Authors</h2>
          ${data.customReports.map((r: any) => {
            if (r.shortlistedAuthors && r.shortlistedAuthors.length > 0) {
              return `
                <div style="margin-bottom: 30px; page-break-inside: avoid;">
                  <h3 style="color: #1e40af; margin-bottom: 15px;">${r.processTitle}</h3>
                  <table style="margin-bottom: 20px;">
                    <thead>
                      <tr>
                        <th>Author Name</th>
                        <th>Email</th>
                        <th>Affiliation</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${r.shortlistedAuthors.map((author: any) => `
                        <tr>
                          <td>${author.name}</td>
                          <td>${author.email || '-'}</td>
                          <td>${author.affiliation || '-'}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              `;
            }
            return '';
          }).join('')}
        ` : '<p>No reports available</p>'}
      `;
    } else if (data.type === 'overview') {
      content = `
        <div class="summary">
          <h2>Statistics</h2>
          <div class="summary-item"><strong>Total Processes:</strong> ${data.stats?.totalProcesses || 0}</div>
          <div class="summary-item"><strong>Active Processes:</strong> ${data.stats?.activeProcesses || 0}</div>
          <div class="summary-item"><strong>Completed Processes:</strong> ${data.stats?.completedProcesses || 0}</div>
          <div class="summary-item"><strong>Pending Processes:</strong> ${data.stats?.pendingProcesses || 0}</div>
        </div>
      `;
    } else if (data.type === 'processes') {
      content = `
        ${data.processData && data.processData.length > 0 ? `
          <table>
            <thead>
              <tr>
                ${Object.keys(data.processData[0]).map(key => `<th>${key}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${data.processData.map((p: any) => `
                <tr>
                  ${Object.values(p).map((val: any) => `<td>${val || '-'}</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : '<p>No process data available</p>'}
      `;
    } else if (data.type === 'timeline') {
      content = `
        ${data.timelineData && data.timelineData.length > 0 ? `
          <table>
            <thead>
              <tr>
                ${Object.keys(data.timelineData[0]).map(key => `<th>${key}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${data.timelineData.map((t: any) => `
                <tr>
                  ${Object.values(t).map((val: any) => `<td>${val || '-'}</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : '<p>No timeline data available</p>'}
      `;
    } else if (data.type === 'users') {
      content = `
        ${data.userActivityData && data.userActivityData.length > 0 ? `
          <table>
            <thead>
              <tr>
                ${Object.keys(data.userActivityData[0]).map(key => `<th>${key}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${data.userActivityData.map((u: any) => `
                <tr>
                  ${Object.values(u).map((val: any) => `<td>${val || '-'}</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : '<p>No user activity data available</p>'}
      `;
    }
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <meta charset="UTF-8">
          <style>
            @media print {
              @page { margin: 1cm; }
              body { margin: 0; }
              table { page-break-inside: auto; }
              tr { page-break-inside: avoid; page-break-after: auto; }
            }
            body { 
              font-family: Arial, sans-serif; 
              margin: 40px;
              color: #333;
            }
            h1 { 
              color: #2563eb;
              border-bottom: 2px solid #2563eb;
              padding-bottom: 10px;
            }
            h2 {
              color: #1e40af;
              margin-top: 30px;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 20px 0;
              font-size: 14px;
            }
            th, td { 
              border: 1px solid #ddd; 
              padding: 10px; 
              text-align: left;
            }
            th { 
              background-color: #f3f4f6;
              font-weight: 600;
              color: #1f2937;
            }
            tr:nth-child(even) {
              background-color: #f9fafb;
            }
            .summary { 
              margin: 20px 0;
              background-color: #f0f9ff;
              padding: 20px;
              border-radius: 8px;
            }
            .summary-item { 
              margin: 10px 0;
              font-size: 16px;
            }
            .meta {
              color: #6b7280;
              font-size: 14px;
              margin-bottom: 20px;
            }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <p class="meta">Generated: ${new Date().toLocaleString()}</p>
          ${content}
        </body>
      </html>
    `;
  };

  // Helper to download file
  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleRefresh = () => {
    refetch();
    refetchCustomReports();
    toast({
      title: 'Refreshing Data',
      description: 'Report data is being updated...',
    });
  };

  if (isError) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              <p className="text-lg font-semibold">Failed to load reports</p>
              <p className="text-sm text-muted-foreground mt-2">Please try again later</p>
              <Button onClick={handleRefresh} className="mt-4">
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            {isAdmin 
              ? 'System-wide process analytics and insights' 
              : 'Your process analytics and insights'}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          
          <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {dateRange === 'custom' && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-[240px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {customDateFrom && customDateTo ? (
                    <>
                      {format(customDateFrom, 'MMM dd, yyyy')} - {format(customDateTo, 'MMM dd, yyyy')}
                    </>
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="flex flex-col gap-2 p-3">
                  <div className="text-sm font-medium">From Date</div>
                  <Calendar
                    mode="single"
                    selected={customDateFrom}
                    onSelect={setCustomDateFrom}
                    initialFocus
                  />
                  <div className="text-sm font-medium mt-2">To Date</div>
                  <Calendar
                    mode="single"
                    selected={customDateTo}
                    onSelect={setCustomDateTo}
                    disabled={(date) => customDateFrom ? date < customDateFrom : false}
                  />
                </div>
              </PopoverContent>
            </Popover>
          )}

          {isAdmin && (
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {users?.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          <Select 
            value={exportValue} 
            onValueChange={(value: any) => {
              setExportValue(value);
              handleExport(value);
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Export" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">Export CSV</SelectItem>
              <SelectItem value="xlsx">Export Excel</SelectItem>
              <SelectItem value="pdf">Export PDF</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Cards */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <StatsCards stats={stats} />
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="custom">Custom Reports</TabsTrigger>
          <TabsTrigger value="processes">Processes</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          {isAdmin && <TabsTrigger value="users">User Activity</TabsTrigger>}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Workflow Stage Distribution</CardTitle>
                <CardDescription>
                  Breakdown of processes by current workflow stage
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ProcessStatusChart data={processData} />
                )}
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle>Process Timeline</CardTitle>
                <CardDescription>
                  Process creation and completion over time
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 overflow-hidden">
                {isLoading ? (
                  <Skeleton className="h-[350px] w-full" />
                ) : (
                  <ProcessTimelineChart data={timelineData} />
                )}
              </CardContent>
            </Card>
          </div>

          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle>User Activity</CardTitle>
                <CardDescription>
                  Process activity by user
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <UserActivityChart data={userActivityData} />
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Custom Reports Tab */}
        <TabsContent value="custom" className="space-y-4">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Processes</CardDescription>
              </CardHeader>
              <CardContent>
                {customReportsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">{totalProcesses}</div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Shortlisted</CardDescription>
              </CardHeader>
              <CardContent>
                {customReportsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">{totalShortlisted}</div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Avg. Shortlisted per Process</CardDescription>
              </CardHeader>
              <CardContent>
                {customReportsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">
                    {averageShortlisted.toFixed(1)}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Table */}
          <Card>
            <CardHeader>
              <CardTitle>Report Details</CardTitle>
              <CardDescription>
                Detailed breakdown of shortlisted authors per process
              </CardDescription>
            </CardHeader>
            <CardContent>
              {customReportsLoading ? (
                <div className="space-y-2">
                  {[...new Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <CustomReportsTable reports={customReports} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Processes Tab */}
        <TabsContent value="processes">
          <Card>
            <CardHeader>
              <CardTitle>Process Details</CardTitle>
              <CardDescription>
                Detailed list of all processes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <ProcessTable 
                  processes={processData?.processes || []} 
                  isAdmin={isAdmin}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline">
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Process Timeline Analysis</CardTitle>
              <CardDescription>
                Detailed timeline view of process creation and completion
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 overflow-hidden">
              {isLoading ? (
                <Skeleton className="h-[450px] w-full" />
              ) : (
                <ProcessTimelineChart data={timelineData} detailed />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Activity Tab (Admin Only) */}
        {isAdmin && (
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Activity Analysis</CardTitle>
                <CardDescription>
                  Detailed breakdown of user activity and process ownership
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[400px] w-full" />
                ) : (
                  <UserActivityChart data={userActivityData} detailed />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
