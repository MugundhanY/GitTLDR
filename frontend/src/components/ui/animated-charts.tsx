'use client';

import React, { useEffect, useRef } from 'react';
import { motion, useInView, useAnimation } from 'framer-motion';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  duration = 2,
  prefix = '',
  suffix = '',
  decimals = 0,
  className = ''
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const controls = useAnimation();

  useEffect(() => {
    if (inView) {
      controls.start({
        opacity: 1,
        y: 0,
        transition: { duration: 0.5 }
      });

      // Animate the counter
      const startTime = Date.now();
      const startValue = 0;
      const endValue = value;

      const updateCounter = () => {
        const now = Date.now();
        const elapsed = (now - startTime) / 1000;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function for smooth animation
        const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
        const easedProgress = easeOutCubic(progress);

        const currentValue = startValue + (endValue - startValue) * easedProgress;
        const displayValue = decimals > 0 ? currentValue.toFixed(decimals) : Math.floor(currentValue);

        if (ref.current) {
          ref.current.textContent = `${prefix}${displayValue}${suffix}`;
        }

        if (progress < 1) {
          requestAnimationFrame(updateCounter);
        }
      };

      updateCounter();
    }
  }, [inView, value, duration, prefix, suffix, decimals, controls]);

  return (
    <motion.span
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={controls}
      className={className}
    >
      {prefix}0{suffix}
    </motion.span>
  );
};

interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  showPercentage?: boolean;
  color?: string;
  height?: string;
}

export const AnimatedProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  className = '',
  showPercentage = true,
  color = 'bg-gradient-to-r from-blue-500 to-purple-600',
  height = 'h-2'
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div ref={ref} className={`w-full ${className}`}>
      <div className={`relative bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden ${height}`}>
        <motion.div
          className={`${height} ${color} rounded-full`}
          initial={{ width: 0 }}
          animate={inView ? { width: `${percentage}%` } : { width: 0 }}
          transition={{ duration: 1.5, ease: 'easeOut', delay: 0.2 }}
        />
      </div>
      {showPercentage && (
        <div className="flex justify-between mt-1 text-sm text-gray-600 dark:text-gray-400">
          <span>{value}</span>
          <span>{percentage.toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
};

interface ChartBarProps {
  data: Array<{ label: string; value: number; color?: string }>;
  maxHeight?: number;
  className?: string;
}

export const AnimatedBarChart: React.FC<ChartBarProps> = ({
  data,
  maxHeight = 200,
  className = ''
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const maxValue = Math.max(...data.map(item => item.value));

  return (
    <div ref={ref} className={`flex items-end space-x-2 ${className}`} style={{ height: maxHeight }}>
      {data.map((item, index) => {
        const height = (item.value / maxValue) * (maxHeight - 40);
        const color = item.color || `hsl(${(index * 137.5) % 360}, 70%, 60%)`;
        
        return (
          <div key={item.label} className="flex flex-col items-center flex-1">
            <motion.div
              className="w-full rounded-t-lg min-w-[20px] relative group"
              style={{ backgroundColor: color }}
              initial={{ height: 0 }}
              animate={inView ? { height } : { height: 0 }}
              transition={{ duration: 1, delay: index * 0.1, ease: 'easeOut' }}
            >
              {/* Tooltip */}
              <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                {item.label}: {item.value}
              </div>
            </motion.div>
            <motion.span
              className="text-xs mt-2 text-center text-gray-600 dark:text-gray-400 leading-tight"
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 + 0.5 }}
            >
              {item.label}
            </motion.span>
          </div>
        );
      })}
    </div>
  );
};

interface DonutChartProps {
  data: Array<{ label: string; value: number; color: string }>;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export const AnimatedDonutChart: React.FC<DonutChartProps> = ({
  data,
  size = 200,
  strokeWidth = 20,
  className = ''
}) => {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true });
  
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const center = size / 2;
  const radius = center - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  
  let cumulativePercentage = 0;

  return (
    <div className={`relative ${className}`}>
      <svg
        ref={ref}
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-200 dark:text-gray-700"
        />
        
        {/* Data segments */}
        {data.map((item, index) => {
          const percentage = (item.value / total) * 100;
          const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
          const strokeDashoffset = -((cumulativePercentage / 100) * circumference);
          
          const segment = (
            <motion.circle
              key={`${item.label}-${index}`}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={item.color}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              initial={{ strokeDasharray: `0 ${circumference}` }}
              animate={inView ? {
                strokeDasharray: strokeDasharray
              } : { strokeDasharray: `0 ${circumference}` }}
              transition={{ duration: 1.5, delay: index * 0.2, ease: 'easeOut' }}
            />
          );
          
          cumulativePercentage += percentage;
          return segment;
        })}
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <motion.div
            className="text-2xl font-bold text-gray-900 dark:text-white"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            {total}
          </motion.div>
          <motion.div
            className="text-sm text-gray-600 dark:text-gray-400"
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
          >
            Total
          </motion.div>
        </div>
      </div>
    </div>
  );
};

interface LineChartProps {
  data: Array<{ x: string; y: number }>;
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

export const AnimatedLineChart: React.FC<LineChartProps> = ({
  data,
  width = 400,
  height = 200,
  color = '#3b82f6',
  className = ''
}) => {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true });
  
  const padding = 20;
  const chartWidth = width - 2 * padding;
  const chartHeight = height - 2 * padding;
  
  const maxY = Math.max(...data.map(d => d.y));
  const minY = Math.min(...data.map(d => d.y));
  const range = maxY - minY || 1;
  
  // Create path
  const pathData = data.map((point, index) => {
    const x = padding + (index / (data.length - 1)) * chartWidth;
    const y = padding + ((maxY - point.y) / range) * chartHeight;
    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');
  
  const pathLength = useRef<SVGPathElement>(null);
  const totalLength = pathLength.current?.getTotalLength() || 0;

  return (
    <div className={className}>
      <svg width={width} height={height} ref={ref}>
        {/* Grid lines */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-gray-200 dark:text-gray-700" />
          </pattern>
        </defs>
        <rect width={width} height={height} fill="url(#grid)" />
        
        {/* Area under curve */}
        <motion.path
          d={`${pathData} L ${padding + chartWidth} ${padding + chartHeight} L ${padding} ${padding + chartHeight} Z`}
          fill={color}
          fillOpacity={0.1}
          initial={{ pathLength: 0 }}
          animate={inView ? { pathLength: 1 } : { pathLength: 0 }}
          transition={{ duration: 2, ease: 'easeOut' }}
        />
        
        {/* Main line */}
        <motion.path
          ref={pathLength}
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={inView ? { pathLength: 1 } : { pathLength: 0 }}
          transition={{ duration: 2, ease: 'easeOut' }}
        />
        
        {/* Data points */}
        {data.map((point, index) => {
          const x = padding + (index / (data.length - 1)) * chartWidth;
          const y = padding + ((maxY - point.y) / range) * chartHeight;
          
          return (
            <motion.circle
              key={index}
              cx={x}
              cy={y}
              r={4}
              fill={color}
              initial={{ scale: 0, opacity: 0 }}
              animate={inView ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
              transition={{ duration: 0.3, delay: 1.5 + index * 0.1 }}
              className="cursor-pointer hover:r-6 transition-all"
            >
              <title>{`${point.x}: ${point.y}`}</title>
            </motion.circle>
          );
        })}
      </svg>
    </div>
  );
};
