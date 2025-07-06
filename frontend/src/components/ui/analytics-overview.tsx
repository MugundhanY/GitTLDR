'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChartBarIcon,
  TrophyIcon,
  SparklesIcon,
  BoltIcon,
  FireIcon,
  StarIcon,
  LightBulbIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

interface QuickStatProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  color: string;
  description?: string;
}

const QuickStat: React.FC<QuickStatProps> = ({ icon: Icon, label, value, trend, color, description }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      className="relative group cursor-pointer"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ scale: 1.05 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <div 
        className="relative overflow-hidden bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-4 shadow-lg"
        style={{ boxShadow: isHovered ? `0 20px 25px -5px ${color}20, 0 10px 10px -5px ${color}30` : undefined }}
      >
        {/* Animated background */}
        <motion.div
          className="absolute inset-0 opacity-5"
          style={{ backgroundColor: color }}
          animate={{ 
            scale: isHovered ? 1.1 : 1,
            opacity: isHovered ? 0.1 : 0.05
          }}
          transition={{ duration: 0.3 }}
        />
        
        <div className="relative z-10 flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
            style={{ backgroundColor: color }}
          >
            <Icon className="w-5 h-5 text-white" />
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
              {label}
            </p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            {description && (
              <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                {description}
              </p>
            )}
          </div>
          
          {trend && (
            <div className={`text-xs px-2 py-1 rounded-full font-medium ${
              trend === 'up' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
              trend === 'down' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
              'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}>
              {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

interface AnalyticsQuickStatsProps {
  analytics: any;
  className?: string;
}

export const AnalyticsQuickStats: React.FC<AnalyticsQuickStatsProps> = ({ analytics, className = '' }) => {
  const quickStats = [
    {
      icon: ChartBarIcon,
      label: 'Total Users',
      value: analytics?.overview?.totalUsers || 0,
      color: '#3B82F6',
      trend: 'up' as const,
      description: 'Active team members'
    },
    {
      icon: TrophyIcon,
      label: 'Completion Rate',
      value: `${(analytics?.meetingStats?.completionRate || 0).toFixed(1)}%`,
      color: '#10B981',
      trend: analytics?.meetingStats?.completionRate >= 80 ? 'up' as const : 'down' as const,
      description: 'Meeting success'
    },
    {
      icon: SparklesIcon,
      label: 'AI Confidence',
      value: `${((analytics?.qaStats?.averageConfidence || 0) * 100).toFixed(1)}%`,
      color: '#8B5CF6',
      trend: analytics?.qaStats?.averageConfidence >= 0.75 ? 'up' as const : 'down' as const,
      description: 'Q&A accuracy'
    },
    {
      icon: BoltIcon,
      label: 'Growth Rate',
      value: `${(analytics?.overview?.growthRate || 0).toFixed(1)}%`,
      color: '#F59E0B',
      trend: analytics?.overview?.growthRate > 0 ? 'up' as const : analytics?.overview?.growthRate < 0 ? 'down' as const : 'neutral' as const,
      description: 'vs last period'
    },
    {
      icon: FireIcon,
      label: 'Active Today',
      value: analytics?.overview?.activeUsers || 0,
      color: '#EF4444',
      trend: 'up' as const,
      description: 'Current activity'
    },
    {
      icon: StarIcon,
      label: 'Total Files',
      value: analytics?.overview?.totalFiles || 0,
      color: '#EC4899',
      trend: 'neutral' as const,
      description: 'In repositories'
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ staggerChildren: 0.1 }}
      className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 ${className}`}
    >
      {quickStats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <QuickStat {...stat} />
        </motion.div>
      ))}
    </motion.div>
  );
};

interface TrendIndicatorProps {
  title: string;
  value: number;
  change: number;
  prefix?: string;
  suffix?: string;
  color: string;
  icon: React.ElementType;
  className?: string;
}

export const TrendIndicator: React.FC<TrendIndicatorProps> = ({
  title,
  value,
  change,
  prefix = '',
  suffix = '',
  color,
  icon: Icon,
  className = ''
}) => {
  const isPositive = change > 0;
  
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`relative overflow-hidden bg-gradient-to-br from-white via-white to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6 shadow-xl ${className}`}
    >
      {/* Decorative gradient */}
      <div 
        className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 transform translate-x-8 -translate-y-8"
        style={{ backgroundColor: color }}
      />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: color }}
          >
            <Icon className="w-5 h-5 text-white" />
          </div>
          
          <div className={`flex items-center gap-1 text-sm font-medium ${
            isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`}>
            <span>{isPositive ? '↗' : '↘'}</span>
            <span>{Math.abs(change).toFixed(1)}%</span>
          </div>
        </div>
        
        <div className="space-y-1">
          <h4 className="text-sm font-medium text-slate-600 dark:text-slate-400">
            {title}
          </h4>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {prefix}{value.toLocaleString()}{suffix}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

interface AnalyticsOverviewProps {
  analytics: any;
  className?: string;
}

export const AnalyticsOverview: React.FC<AnalyticsOverviewProps> = ({ analytics, className = '' }) => {
  const trends = [
    {
      title: 'Total Meetings',
      value: analytics?.overview?.totalMeetings || 0,
      change: 12.5,
      icon: ChartBarIcon,
      color: '#3B82F6'
    },
    {
      title: 'Questions Asked',
      value: analytics?.overview?.totalQuestions || 0,
      change: 8.3,
      icon: LightBulbIcon,
      color: '#10B981'
    },
    {
      title: 'Action Items',
      value: analytics?.overview?.totalActionItems || 0,
      change: -2.1,
      icon: BoltIcon,
      color: '#F59E0B'
    },
    {
      title: 'Team Engagement',
      value: Math.round(((analytics?.overview?.activeUsers || 0) / (analytics?.overview?.totalUsers || 1)) * 100),
      change: 15.7,
      suffix: '%',
      icon: EyeIcon,
      color: '#8B5CF6'
    }
  ];

  return (
    <div className={className}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {trends.map((trend, index) => (
          <motion.div
            key={trend.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <TrendIndicator {...trend} />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};
