'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface AnalyticsSkeletonProps {
  className?: string;
}

const SkeletonCard: React.FC<{ className?: string; height?: string }> = ({ 
  className = '', 
  height = 'h-32' 
}) => (
  <div className={`animate-pulse bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 rounded-2xl ${height} ${className}`}>
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-slate-300 dark:bg-slate-600 rounded-xl" />
        <div className="space-y-2 flex-1">
          <div className="h-3 bg-slate-300 dark:bg-slate-600 rounded w-1/3" />
          <div className="h-6 bg-slate-300 dark:bg-slate-600 rounded w-1/2" />
        </div>
      </div>
    </div>
  </div>
);

const SkeletonChart: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 rounded-2xl p-8 ${className}`}>
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-slate-300 dark:bg-slate-600 rounded-lg" />
        <div className="h-6 bg-slate-300 dark:bg-slate-600 rounded w-1/3" />
      </div>
      <div className="h-64 bg-slate-300 dark:bg-slate-600 rounded-xl" />
    </div>
  </div>
);

const SkeletonInsights: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-3xl p-[1px] ${className}`}>
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-8">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-300 dark:bg-slate-600 rounded-xl" />
          <div className="space-y-2">
            <div className="h-6 bg-slate-300 dark:bg-slate-600 rounded w-32" />
            <div className="h-4 bg-slate-300 dark:bg-slate-600 rounded w-48" />
          </div>
        </div>
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-4 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <div className="space-y-2">
                <div className="h-4 bg-slate-300 dark:bg-slate-600 rounded w-full" />
                <div className="h-4 bg-slate-300 dark:bg-slate-600 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export const AnalyticsLoadingSkeleton: React.FC<AnalyticsSkeletonProps> = ({ className = '' }) => {
  return (
    <div className={`space-y-8 ${className}`}>
      {/* AI Insights Skeleton */}
      <SkeletonInsights />
      
      {/* Quick Stats Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <SkeletonCard height="h-24" />
          </motion.div>
        ))}
      </div>
      
      {/* Overview Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 + i * 0.1 }}
          >
            <SkeletonCard height="h-40" />
          </motion.div>
        ))}
      </div>
      
      {/* Charts Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1 + i * 0.1 }}
          >
            <SkeletonChart />
          </motion.div>
        ))}
      </div>
      
      {/* Advanced Analytics Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <SkeletonChart />
        <div className="space-y-6">
          <SkeletonCard height="h-32" />
          <SkeletonCard height="h-32" />
        </div>
      </div>
      
      {/* Performance Metrics Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5 + i * 0.1 }}
          >
            <SkeletonCard height="h-48" />
          </motion.div>
        ))}
      </div>
    </div>
  );
};

interface AnalyticsErrorProps {
  error: Error;
  retry?: () => void;
  className?: string;
}

export const AnalyticsError: React.FC<AnalyticsErrorProps> = ({ 
  error, 
  retry,
  className = '' 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`bg-gradient-to-br from-red-50 via-white to-rose-50 dark:from-red-900/20 dark:via-slate-900 dark:to-rose-900/20 rounded-2xl border border-red-200/50 dark:border-red-700/50 p-12 text-center shadow-xl ${className}`}
    >
      <div className="max-w-md mx-auto">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg 
            className="w-8 h-8 text-red-600 dark:text-red-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
            />
          </svg>
        </div>
        
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
          Failed to Load Analytics
        </h2>
        
        <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
          We encountered an error while fetching your analytics data. This might be due to a 
          network issue or server problem.
        </p>
        
        <div className="space-y-3">
          <details className="text-left">
            <summary className="text-sm text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-700 dark:hover:text-slate-300">
              Error Details
            </summary>
            <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm text-red-700 dark:text-red-300 font-mono">
              {error.message}
            </div>
          </details>
          
          {retry && (
            <motion.button
              onClick={retry}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-medium transition-all duration-200 shadow-lg shadow-blue-500/25"
            >
              Try Again
            </motion.button>
          )}
          
          <button
            onClick={() => window.location.reload()}
            className="w-full px-6 py-3 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    </motion.div>
  );
};

interface EmptyAnalyticsProps {
  className?: string;
}

export const EmptyAnalytics: React.FC<EmptyAnalyticsProps> = ({ className = '' }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-800 dark:via-slate-900 dark:to-blue-950 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-12 text-center shadow-xl ${className}`}
    >
      <div className="max-w-md mx-auto">
        <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-blue-500/25">
          <svg 
            className="w-12 h-12 text-white" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" 
            />
          </svg>
        </div>
        
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
          Welcome to Analytics!
        </h2>
        
        <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
          Start using GitTLDR to generate meaningful analytics and insights. 
          Add repositories, conduct meetings, and ask questions to see your data here.
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm"
          >
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center mx-auto mb-3">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Add Repository</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">Connect your code repositories</p>
          </motion.div>
          
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm"
          >
            <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center mx-auto mb-3">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Start Meeting</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">Record and analyze meetings</p>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};
