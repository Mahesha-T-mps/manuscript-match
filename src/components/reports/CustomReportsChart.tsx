/**
 * Custom Reports Chart Component
 * Displays recommendations and shortlisted authors count per process
 */

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

export interface CustomReportData {
  id: string;
  processTitle: string;
  recommendationsCount: number;
  shortlistedCount: number;
  reportDate: string;
}

interface CustomReportsChartProps {
  data: CustomReportData[];
}

export function CustomReportsChart({ data }: CustomReportsChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Custom Reports</CardTitle>
          <CardDescription>No report data available</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No custom reports found. Reports are automatically generated when you create shortlists.
          </div>
        </CardContent>
      </Card>
    );
  }

  // Format data for the chart
  const chartData = data.map(report => ({
    name: report.processTitle.length > 30 
      ? `${report.processTitle.substring(0, 30)}...` 
      : report.processTitle,
    fullName: report.processTitle,
    recommendations: report.recommendationsCount,
    shortlisted: report.shortlistedCount,
    date: new Date(report.reportDate).toLocaleDateString(),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recommendations vs Shortlisted Authors</CardTitle>
        <CardDescription>
          Comparison of total recommendations and shortlisted authors per process
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="name" 
              angle={-45} 
              textAnchor="end" 
              height={100}
              interval={0}
            />
            <YAxis />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                      <p className="font-semibold mb-2">{payload[0].payload.fullName}</p>
                      <p className="text-sm text-muted-foreground mb-1">
                        Date: {payload[0].payload.date}
                      </p>
                      <p className="text-sm text-blue-600">
                        Recommendations: {payload[0].value}
                      </p>
                      <p className="text-sm text-green-600">
                        Shortlisted: {payload[1].value}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Conversion Rate: {((Number(payload[1].value) / Number(payload[0].value)) * 100).toFixed(1)}%
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend />
            <Bar 
              dataKey="recommendations" 
              fill="hsl(var(--primary))" 
              name="Recommendations"
              radius={[4, 4, 0, 0]}
            />
            <Bar 
              dataKey="shortlisted" 
              fill="hsl(var(--chart-2))" 
              name="Shortlisted"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
