'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
  UsersIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface MetricCardProps {
  title: string;
  value: number | string;
  previousValue?: number;
  trend?: 'up' | 'down' | 'neutral';
  icon: React.ElementType;
  color: string;
  suffix?: string;
  description?: string;
  className?: string;
}

export const AdvancedMetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  previousValue,
  trend,
  icon: Icon,
  color,
  suffix = '',
  description,
  className = ''
}) => {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <ArrowTrendingUpIcon className="w-4 h-4 text-green-500" />;
      case 'down':
        return <ArrowTrendingDownIcon className="w-4 h-4 text-red-500" />;
      default:
        return <MinusIcon className="w-4 h-4 text-slate-400" />;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-green-600 dark:text-green-400';
      case 'down':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-slate-600 dark:text-slate-400';
    }
  };

  const calculatePercentageChange = () => {
    if (typeof value === 'number' && typeof previousValue === 'number' && previousValue > 0) {
      const change = ((value - previousValue) / previousValue) * 100;
      return Math.abs(change).toFixed(1);
    }
    return null;
  };

  const percentageChange = calculatePercentageChange();

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -5 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={`relative overflow-hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6 shadow-xl shadow-black/5 group ${className}`}
    >
      {/* Background gradient decoration */}
      <div 
        className="absolute top-0 right-0 w-32 h-32 opacity-10 rounded-full transform translate-x-16 -translate-y-16 group-hover:scale-110 transition-transform duration-500"
        style={{ backgroundColor: color }}
      />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
            style={{ backgroundColor: color }}
          >
            <Icon className="w-6 h-6 text-white" />
          </div>
          
          {trend && percentageChange && (
            <div className={`flex items-center gap-1 ${getTrendColor()}`}>
              {getTrendIcon()}
              <span className="text-sm font-medium">{percentageChange}%</span>
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
            {title}
          </h3>
          
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </span>
            {suffix && (
              <span className="text-lg text-slate-500 dark:text-slate-400 font-medium">
                {suffix}
              </span>
            )}
          </div>
          
          {description && (
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </div>
      
      {/* Hover effect border */}
      <div 
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ 
          boxShadow: `0 0 0 1px ${color}20, 0 4px 20px ${color}30`
        }}
      />
    </motion.div>
  );
};

interface ActivityHeatmapProps {
  data: Array<{ date: string; value: number }>;
  className?: string;
}

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({ data, className = '' }) => {
  if (!data || data.length === 0) {
    return (
      <div className={`flex items-center justify-center h-32 ${className}`}>
        <p className="text-slate-500 dark:text-slate-400">No activity data available</p>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value));
  
  const getIntensity = (value: number) => {
    if (maxValue === 0) return 0;
    return value / maxValue;
  };

  const getColorIntensity = (intensity: number) => {
    if (intensity === 0) return 'bg-slate-100 dark:bg-slate-800';
    if (intensity < 0.25) return 'bg-green-200 dark:bg-green-900/40';
    if (intensity < 0.5) return 'bg-green-300 dark:bg-green-700/60';
    if (intensity < 0.75) return 'bg-green-400 dark:bg-green-600/80';
    return 'bg-green-500 dark:bg-green-500';
  };

  // Generate last 12 weeks of data
  const weeks = 12;
  const daysPerWeek = 7;
  const today = new Date();
  const startDate = new Date(today.getTime() - (weeks * daysPerWeek * 24 * 60 * 60 * 1000));

  const heatmapData = [];
  for (let week = 0; week < weeks; week++) {
    const weekData = [];
    for (let day = 0; day < daysPerWeek; day++) {
      const currentDate = new Date(startDate.getTime() + ((week * daysPerWeek + day) * 24 * 60 * 60 * 1000));
      const dateStr = currentDate.toISOString().split('T')[0];
      const dataPoint = data.find(d => d.date === dateStr);
      const value = dataPoint ? dataPoint.value : 0;
      weekData.push({ date: dateStr, value, intensity: getIntensity(value) });
    }
    heatmapData.push(weekData);
  }

  return (
    <div className={`${className}`}>
      <div className="space-y-1">
        {heatmapData.map((week, weekIndex) => (
          <div key={weekIndex} className="flex gap-1">
            {week.map((day, dayIndex) => (
              <motion.div
                key={`${weekIndex}-${dayIndex}`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: (weekIndex * 7 + dayIndex) * 0.01 }}
                className={`w-3 h-3 rounded-sm cursor-pointer transition-all duration-200 hover:scale-125 ${getColorIntensity(day.intensity)}`}
                title={`${day.date}: ${day.value} activities`}
              />
            ))}
          </div>
        ))}
      </div>
      
      <div className="flex items-center justify-between mt-4 text-xs text-slate-500 dark:text-slate-400">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 rounded-sm bg-slate-100 dark:bg-slate-800" />
          <div className="w-3 h-3 rounded-sm bg-green-200 dark:bg-green-900/40" />
          <div className="w-3 h-3 rounded-sm bg-green-300 dark:bg-green-700/60" />
          <div className="w-3 h-3 rounded-sm bg-green-400 dark:bg-green-600/80" />
          <div className="w-3 h-3 rounded-sm bg-green-500 dark:bg-green-500" />
        </div>
        <span>More</span>
      </div>
    </div>
  );
};

interface PerformanceIndicatorProps {
  title: string;
  current: number;
  target: number;
  unit?: string;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export const PerformanceIndicator: React.FC<PerformanceIndicatorProps> = ({
  title,
  current,
  target,
  unit = '',
  trend = 'neutral',
  className = ''
}) => {
  const percentage = target > 0 ? (current / target) * 100 : 0;
  const isOnTarget = percentage >= 95 && percentage <= 105;
  const isAboveTarget = percentage > 105;
  
  const getStatusIcon = () => {
    if (isAboveTarget) return <ArrowTrendingUpIcon className="w-5 h-5 text-green-500" />;
    if (isOnTarget) return <CheckCircleIcon className="w-5 h-5 text-blue-500" />;
    return <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />;
  };

  const getStatusColor = () => {
    if (isAboveTarget) return 'from-green-500 to-emerald-500';
    if (isOnTarget) return 'from-blue-500 to-cyan-500';
    return 'from-amber-500 to-orange-500';
  };

  const getStatusText = () => {
    if (isAboveTarget) return 'Exceeding Target';
    if (isOnTarget) return 'On Target';
    return 'Below Target';
  };

  return (
    <div className={`bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6 shadow-xl shadow-black/5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-slate-900 dark:text-white">{title}</h4>
        {getStatusIcon()}
      </div>
      
      <div className="space-y-4">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-slate-900 dark:text-white">
            {current.toLocaleString()}{unit}
          </span>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            / {target.toLocaleString()}{unit}
          </span>
        </div>
        
        {/* Progress bar */}
        <div className="relative h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <motion.div
            className={`absolute top-0 left-0 h-full bg-gradient-to-r ${getStatusColor()} rounded-full`}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(percentage, 100)}%` }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          />
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600 dark:text-slate-400">
            {percentage.toFixed(1)}% of target
          </span>
          <span className={`font-medium ${
            isAboveTarget ? 'text-green-600 dark:text-green-400' :
            isOnTarget ? 'text-blue-600 dark:text-blue-400' :
            'text-amber-600 dark:text-amber-400'
          }`}>
            {getStatusText()}
          </span>
        </div>
      </div>
    </div>
  );
};
