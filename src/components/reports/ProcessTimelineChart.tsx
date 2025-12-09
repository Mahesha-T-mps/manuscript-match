import { TimelineDataPoint } from '../../hooks/useReports';

interface ProcessTimelineChartProps {
  data: TimelineDataPoint[];
  detailed?: boolean;
}

export function ProcessTimelineChart({ data, detailed = false }: ProcessTimelineChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[350px] text-muted-foreground">
        <div className="text-center">
          <div className="text-lg font-medium">No timeline data available</div>
          <div className="text-sm mt-1">Process data will appear here once available</div>
        </div>
      </div>
    );
  }

  const maxValue = Math.max(
    ...data.map(d => Math.max(d.created, d.completed)),
    1
  );

  const height = detailed ? 450 : 350; // Increased height for better label visibility
  const chartHeight = height - 120; // More space for labels
  const barWidth = Math.max(8, Math.min(32, Math.floor(800 / data.length) - 4));
  
  // Better label spacing logic
  const labelInterval = detailed ? Math.max(1, Math.ceil(data.length / 12)) : Math.max(1, Math.ceil(data.length / 6));

  return (
    <div className="w-full overflow-hidden">
      <div className="space-y-6">
        {/* Chart Container with proper overflow handling */}
        <div className="w-full overflow-x-auto pb-4">
          <div 
            className="flex items-end gap-2" 
            style={{ 
              height: `${height}px`,
              minWidth: `${Math.max(600, data.length * 40)}px`, // More space per data point
              paddingBottom: '60px' // Extra padding for labels
            }}
          >
            {data.map((point, index) => {
              const createdHeight = (point.created / maxValue) * chartHeight;
              const completedHeight = (point.completed / maxValue) * chartHeight;
              const showLabel = index % labelInterval === 0 || index === data.length - 1; // Always show first and last
              
              return (
                <div key={point.date} className="flex flex-col items-center flex-1 min-w-[30px] relative">
                  {/* Chart bars */}
                  <div className="flex items-end gap-1 w-full justify-center" style={{ height: `${chartHeight}px` }}>
                    <div
                      className="bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-pointer"
                      style={{ 
                        height: `${createdHeight}px`,
                        width: `${barWidth}px`,
                        minHeight: point.created > 0 ? '3px' : '0'
                      }}
                      title={`${new Date(point.date).toLocaleDateString()}: Created ${point.created}`}
                    />
                    <div
                      className="bg-green-500 rounded-t hover:bg-green-600 transition-colors cursor-pointer"
                      style={{ 
                        height: `${completedHeight}px`,
                        width: `${barWidth}px`,
                        minHeight: point.completed > 0 ? '3px' : '0'
                      }}
                      title={`${new Date(point.date).toLocaleDateString()}: Completed ${point.completed}`}
                    />
                  </div>
                  
                  {/* X-axis labels with better visibility */}
                  {showLabel && (
                    <div className="absolute top-full mt-2 flex flex-col items-center">
                      <div className="w-px h-2 bg-border"></div>
                      <span className="text-xs font-medium text-foreground mt-1 transform -rotate-45 origin-top whitespace-nowrap">
                        {new Date(point.date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          ...(detailed && { year: '2-digit' })
                        })}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-8 pt-4 border-t">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded" />
            <span className="text-sm font-medium">Created</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded" />
            <span className="text-sm font-medium">Completed</span>
          </div>
        </div>
      </div>
    </div>
  );
}
