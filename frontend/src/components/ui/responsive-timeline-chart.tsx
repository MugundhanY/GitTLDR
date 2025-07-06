'use client';

import React, { useRef, useState, useCallback } from 'react';
import { motion, useInView } from 'framer-motion';

interface TimelineDataPoint {
  date: string;
  count: number;
  duration?: number;
}

interface ResponsiveTimelineChartProps {
  data: TimelineDataPoint[];
  className?: string;
  color?: string;
  showDuration?: boolean;
}

export const ResponsiveTimelineChart: React.FC<ResponsiveTimelineChartProps> = ({
  data,
  className = '',
  color = '#8B5CF6',
  showDuration = false
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback((event: React.MouseEvent, index: number) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    });
    setHoveredPoint(index);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredPoint(null);
  }, []);

  if (!data || data.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <p className="text-slate-500 dark:text-slate-400">No timeline data available</p>
      </div>
    );
  }

  const maxCount = Math.max(...data.map(d => d.count));
  const maxDuration = showDuration ? Math.max(...data.map(d => d.duration || 0)) : 0;

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Format duration in minutes
  const formatDuration = (seconds: number) => {
    const minutes = Math.round(seconds / 60);
    return minutes > 60 ? `${Math.round(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`;
  };

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Mobile: Horizontal scrollable chart */}
      <div className="block md:hidden">
        <div className="overflow-x-auto pb-4">
          <div className="flex items-end gap-2 min-w-max px-4" style={{ height: '200px' }}>
            {data.map((point, index) => {
              const height = maxCount > 0 ? (point.count / maxCount) * 160 : 0;
              const isHovered = hoveredPoint === index;
              
              return (
                <motion.div
                  key={`${point.date}-${index}`}
                  className="relative flex flex-col items-center group min-w-[40px]"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  onMouseMove={(e) => handleMouseMove(e, index)}
                  onMouseLeave={handleMouseLeave}
                >
                  {/* Bar */}
                  <motion.div
                    className="w-8 rounded-t-lg cursor-pointer transition-all duration-200"
                    style={{ 
                      backgroundColor: color,
                      opacity: isHovered ? 1 : 0.8,
                      transform: isHovered ? 'scale(1.1)' : 'scale(1)'
                    }}
                    initial={{ height: 0 }}
                    animate={inView ? { height: `${height}px` } : { height: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                  />
                  
                  {/* Date label */}
                  <span className="text-xs mt-2 text-slate-600 dark:text-slate-400 text-center whitespace-nowrap">
                    {formatDate(point.date)}
                  </span>
                  
                  {/* Tooltip */}
                  {isHovered && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-slate-900 dark:bg-slate-800 text-white px-3 py-2 rounded-lg text-xs whitespace-nowrap z-10 shadow-lg"
                    >
                      <div className="font-semibold">{formatDate(point.date)}</div>
                      <div>Meetings: {point.count}</div>
                      {showDuration && point.duration && (
                        <div>Duration: {formatDuration(point.duration)}</div>
                      )}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900 dark:border-t-slate-800"></div>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Desktop: Full-width responsive chart */}
      <div className="hidden md:block">
        <svg width="100%" height="240" viewBox="0 0 800 240" className="overflow-visible">
          <defs>
            <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity={0.8} />
              <stop offset="100%" stopColor={color} stopOpacity={0.1} />
            </linearGradient>
          </defs>
          
          {/* Grid lines */}
          <g className="opacity-20">
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
              <line
                key={i}
                x1="40"
                y1={200 - ratio * 160}
                x2="760"
                y2={200 - ratio * 160}
                stroke="currentColor"
                strokeWidth="1"
                className="text-slate-300 dark:text-slate-600"
                strokeDasharray="2,2"
              />
            ))}
          </g>
          
          {/* Chart area and line */}
          {data.length > 1 && (
            <>
              {/* Area under curve */}
              <motion.path
                d={`M 40 200 ${data.map((point, index) => {
                  const x = 40 + (index / (data.length - 1)) * 720;
                  const y = 200 - (maxCount > 0 ? (point.count / maxCount) * 160 : 0);
                  return `L ${x} ${y}`;
                }).join(' ')} L 760 200 Z`}
                fill={`url(#gradient-${color.replace('#', '')})`}
                initial={{ pathLength: 0 }}
                animate={inView ? { pathLength: 1 } : { pathLength: 0 }}
                transition={{ duration: 2, ease: 'easeOut' }}
              />
              
              {/* Main line */}
              <motion.path
                d={`M ${data.map((point, index) => {
                  const x = 40 + (index / (data.length - 1)) * 720;
                  const y = 200 - (maxCount > 0 ? (point.count / maxCount) * 160 : 0);
                  return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
                }).join(' ')}`}
                fill="none"
                stroke={color}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={inView ? { pathLength: 1 } : { pathLength: 0 }}
                transition={{ duration: 2, ease: 'easeOut' }}
              />
            </>
          )}
          
          {/* Data points */}
          {data.map((point, index) => {
            const x = 40 + (index / Math.max(data.length - 1, 1)) * 720;
            const y = 200 - (maxCount > 0 ? (point.count / maxCount) * 160 : 0);
            const isHovered = hoveredPoint === index;
            
            return (
              <g key={`${point.date}-${index}`}>
                {/* Hit area for better touch/hover */}
                <circle
                  cx={x}
                  cy={y}
                  r="12"
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredPoint(index)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
                
                {/* Visible point */}
                <motion.circle
                  cx={x}
                  cy={y}
                  r={isHovered ? 6 : 4}
                  fill={color}
                  stroke="white"
                  strokeWidth="2"
                  className="drop-shadow-sm transition-all duration-200"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={inView ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
                  transition={{ duration: 0.3, delay: 1.5 + index * 0.1 }}
                />
                
                {/* Date label */}
                <text
                  x={x}
                  y="230"
                  textAnchor="middle"
                  className="text-xs fill-current text-slate-600 dark:text-slate-400"
                  fontFamily="system-ui, -apple-system, sans-serif"
                >
                  {formatDate(point.date)}
                </text>
              </g>
            );
          })}
          
          {/* Y-axis labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
            <text
              key={i}
              x="30"
              y={200 - ratio * 160 + 4}
              textAnchor="end"
              className="text-xs fill-current text-slate-500 dark:text-slate-400"
              fontFamily="system-ui, -apple-system, sans-serif"
            >
              {Math.round(maxCount * ratio)}
            </text>
          ))}
        </svg>
        
        {/* Desktop tooltip */}
        {hoveredPoint !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl p-3 pointer-events-none z-20"
            style={{
              left: `${40 + (hoveredPoint / Math.max(data.length - 1, 1)) * 720}px`,
              top: `${200 - (maxCount > 0 ? (data[hoveredPoint].count / maxCount) * 160 : 0) - 60}px`,
              transform: 'translateX(-50%)'
            }}
          >
            <div className="font-semibold text-slate-900 dark:text-white">
              {formatDate(data[hoveredPoint].date)}
            </div>
            <div className="text-slate-600 dark:text-slate-400">
              Meetings: {data[hoveredPoint].count}
            </div>
            {showDuration && data[hoveredPoint].duration && (
              <div className="text-slate-600 dark:text-slate-400">
                Duration: {formatDuration(data[hoveredPoint].duration)}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};
