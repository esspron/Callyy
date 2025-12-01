import React from 'react';

interface ChartData {
    label: string;
    value: number;
    color?: string;
}

interface SimpleBarChartProps {
    data: ChartData[];
    height?: number;
    showLabels?: boolean;
    showValues?: boolean;
    valueFormatter?: (value: number) => string;
    barColor?: string;
    animate?: boolean;
}

const SimpleBarChart: React.FC<SimpleBarChartProps> = ({
    data,
    height = 200,
    showLabels = true,
    showValues = true,
    valueFormatter = (v) => v.toString(),
    barColor = 'bg-primary',
    animate = true,
}) => {
    const maxValue = Math.max(...data.map(d => d.value), 1);

    return (
        <div className="w-full" style={{ height }}>
            <div className="flex items-end justify-between gap-2 h-full">
                {data.map((item, idx) => {
                    const barHeight = (item.value / maxValue) * 100;
                    return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                            {showValues && (
                                <span className="text-xs text-textMuted font-medium">
                                    {valueFormatter(item.value)}
                                </span>
                            )}
                            <div className="w-full flex-1 flex items-end">
                                <div
                                    className={`w-full rounded-t-lg ${item.color || barColor} transition-all duration-500 ${animate ? 'animate-growUp' : ''}`}
                                    style={{ 
                                        height: `${barHeight}%`,
                                        animationDelay: `${idx * 50}ms`,
                                    }}
                                />
                            </div>
                            {showLabels && (
                                <span className="text-[10px] text-textMuted truncate max-w-full px-1">
                                    {item.label}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

interface SimpleLineChartProps {
    data: ChartData[];
    height?: number;
    showLabels?: boolean;
    lineColor?: string;
    fillColor?: string;
    showDots?: boolean;
    valueFormatter?: (value: number) => string;
}

const SimpleLineChart: React.FC<SimpleLineChartProps> = ({
    data,
    height = 200,
    showLabels = true,
    lineColor = '#14b8a6',
    fillColor = 'rgba(20, 184, 166, 0.1)',
    showDots = true,
    valueFormatter = (v) => v.toString(),
}) => {
    if (data.length === 0) return null;
    
    const maxValue = Math.max(...data.map(d => d.value), 1);
    const minValue = Math.min(...data.map(d => d.value), 0);
    const range = maxValue - minValue || 1;
    
    const width = 100;
    const chartHeight = 100;
    const padding = 10;
    
    const points = data.map((item, idx) => {
        const x = padding + (idx / (data.length - 1 || 1)) * (width - padding * 2);
        const y = chartHeight - padding - ((item.value - minValue) / range) * (chartHeight - padding * 2);
        return { x, y, value: item.value, label: item.label };
    });
    
    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight - padding} L ${padding} ${chartHeight - padding} Z`;

    return (
        <div className="w-full" style={{ height }}>
            <svg viewBox={`0 0 ${width} ${chartHeight + 20}`} className="w-full h-full" preserveAspectRatio="none">
                {/* Gradient fill */}
                <defs>
                    <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor={lineColor} stopOpacity="0.3" />
                        <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
                    </linearGradient>
                </defs>
                
                {/* Area */}
                <path d={areaPath} fill="url(#areaGradient)" />
                
                {/* Line */}
                <path
                    d={linePath}
                    fill="none"
                    stroke={lineColor}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="animate-drawLine"
                />
                
                {/* Dots */}
                {showDots && points.map((p, idx) => (
                    <circle
                        key={idx}
                        cx={p.x}
                        cy={p.y}
                        r="3"
                        fill={lineColor}
                        className="animate-fadeIn"
                        style={{ animationDelay: `${idx * 50}ms` }}
                    />
                ))}
            </svg>
            
            {/* Labels */}
            {showLabels && (
                <div className="flex justify-between px-2 -mt-4">
                    {data.map((item, idx) => (
                        <span key={idx} className="text-[10px] text-textMuted">
                            {item.label}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
};

interface DonutChartProps {
    data: ChartData[];
    size?: number;
    strokeWidth?: number;
    showLegend?: boolean;
    showTotal?: boolean;
    totalLabel?: string;
    valueFormatter?: (value: number) => string;
}

const DonutChart: React.FC<DonutChartProps> = ({
    data,
    size = 160,
    strokeWidth = 24,
    showLegend = true,
    showTotal = true,
    totalLabel = 'Total',
    valueFormatter = (v) => v.toString(),
}) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    
    const defaultColors = [
        '#14b8a6', // primary/teal
        '#8b5cf6', // violet
        '#f59e0b', // amber
        '#ef4444', // rose
        '#3b82f6', // blue
        '#10b981', // emerald
    ];
    
    let currentOffset = 0;
    const segments = data.map((item, idx) => {
        const percentage = item.value / (total || 1);
        const dashLength = percentage * circumference;
        const dashOffset = -currentOffset;
        currentOffset += dashLength;
        
        return {
            ...item,
            color: item.color || defaultColors[idx % defaultColors.length],
            dashLength,
            dashOffset,
            percentage,
        };
    });

    return (
        <div className="flex items-center gap-6">
            {/* Chart */}
            <div className="relative" style={{ width: size, height: size }}>
                <svg width={size} height={size} className="transform -rotate-90">
                    {/* Background circle */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke="rgba(255,255,255,0.05)"
                        strokeWidth={strokeWidth}
                    />
                    
                    {/* Segments */}
                    {segments.map((segment, idx) => (
                        <circle
                            key={idx}
                            cx={size / 2}
                            cy={size / 2}
                            r={radius}
                            fill="none"
                            stroke={segment.color}
                            strokeWidth={strokeWidth}
                            strokeDasharray={`${segment.dashLength} ${circumference}`}
                            strokeDashoffset={segment.dashOffset}
                            strokeLinecap="round"
                            className="animate-drawDonut"
                            style={{ animationDelay: `${idx * 100}ms` }}
                        />
                    ))}
                </svg>
                
                {/* Center text */}
                {showTotal && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold text-textMain">{valueFormatter(total)}</span>
                        <span className="text-xs text-textMuted">{totalLabel}</span>
                    </div>
                )}
            </div>
            
            {/* Legend */}
            {showLegend && (
                <div className="flex flex-col gap-2">
                    {segments.map((segment, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: segment.color }}
                            />
                            <span className="text-sm text-textMuted">{segment.label}</span>
                            <span className="text-sm font-medium text-textMain ml-auto">
                                {valueFormatter(segment.value)}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export { SimpleBarChart, SimpleLineChart, DonutChart };
