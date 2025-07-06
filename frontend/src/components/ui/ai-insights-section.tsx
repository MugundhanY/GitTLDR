'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  SparklesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  LightBulbIcon,
  ClockIcon,
  UsersIcon,
  ChatBubbleLeftRightIcon,
  CodeBracketIcon
} from '@heroicons/react/24/outline';

interface InsightProps {
  insight: any;
  index: number;
}

const InsightCard: React.FC<InsightProps> = ({ insight, index }) => {
  if (typeof insight === 'string') {
    // Simple string insight
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 + index * 0.1 }}
        className="group relative overflow-hidden bg-gradient-to-r from-slate-50 via-white to-blue-50 dark:from-slate-800 dark:via-slate-800 dark:to-blue-900/20 rounded-xl border border-slate-200/50 dark:border-slate-700/50 p-4 hover:shadow-lg hover:scale-[1.02] transition-all duration-300"
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
            <SparklesIcon className="w-4 h-4 text-white" />
          </div>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-sm">{insight}</p>
        </div>
        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-full transform translate-x-6 -translate-y-6"></div>
      </motion.div>
    );
  }

  // Object insight with structured data
  const getIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'growth':
      case 'positive':
        return <ArrowTrendingUpIcon className="w-5 h-5 text-green-500" />;
      case 'decline':
      case 'negative':
        return <ArrowTrendingDownIcon className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />;
      case 'success':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'suggestion':
        return <LightBulbIcon className="w-5 h-5 text-yellow-500" />;
      case 'time':
        return <ClockIcon className="w-5 h-5 text-blue-500" />;
      case 'team':
        return <UsersIcon className="w-5 h-5 text-purple-500" />;
      case 'communication':
        return <ChatBubbleLeftRightIcon className="w-5 h-5 text-indigo-500" />;
      case 'code':
        return <CodeBracketIcon className="w-5 h-5 text-orange-500" />;
      default:
        return <SparklesIcon className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBorderColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'growth':
      case 'positive':
      case 'success':
        return 'border-green-200 dark:border-green-800';
      case 'decline':
      case 'negative':
        return 'border-red-200 dark:border-red-800';
      case 'warning':
        return 'border-amber-200 dark:border-amber-800';
      case 'suggestion':
        return 'border-yellow-200 dark:border-yellow-800';
      default:
        return 'border-blue-200 dark:border-blue-800';
    }
  };

  const getBackgroundGradient = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'growth':
      case 'positive':
      case 'success':
        return 'from-green-50 via-white to-emerald-50 dark:from-green-900/20 dark:via-slate-800 dark:to-emerald-900/20';
      case 'decline':
      case 'negative':
        return 'from-red-50 via-white to-rose-50 dark:from-red-900/20 dark:via-slate-800 dark:to-rose-900/20';
      case 'warning':
        return 'from-amber-50 via-white to-yellow-50 dark:from-amber-900/20 dark:via-slate-800 dark:to-yellow-900/20';
      case 'suggestion':
        return 'from-yellow-50 via-white to-orange-50 dark:from-yellow-900/20 dark:via-slate-800 dark:to-orange-900/20';
      default:
        return 'from-blue-50 via-white to-indigo-50 dark:from-blue-900/20 dark:via-slate-800 dark:to-indigo-900/20';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2 + index * 0.1 }}
      className={`group relative overflow-hidden bg-gradient-to-r ${getBackgroundGradient(insight.type)} rounded-xl border ${getBorderColor(insight.type)} p-5 hover:shadow-lg hover:scale-[1.02] transition-all duration-300`}
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-10 h-10 bg-white dark:bg-slate-700 rounded-xl shadow-sm flex items-center justify-center border border-slate-200/50 dark:border-slate-600/50">
          {getIcon(insight.type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-semibold text-slate-900 dark:text-white text-sm">
              {insight.title || 'Insight'}
            </h4>
            {insight.metric && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                insight.type === 'positive' || insight.type === 'growth' || insight.type === 'success'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                  : insight.type === 'negative' || insight.type === 'decline'
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                  : insight.type === 'warning'
                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
              }`}>
                {insight.metric}
              </span>
            )}
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-2">
            {insight.description}
          </p>
          {insight.action && (
            <p className="text-xs text-slate-500 dark:text-slate-500 italic">
              💡 {insight.action}
            </p>
          )}
        </div>
      </div>
      
      {/* Decorative gradient overlay */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-white/20 to-transparent rounded-full transform translate-x-8 -translate-y-8 group-hover:scale-110 transition-transform duration-300"></div>
    </motion.div>
  );
};

interface AIInsightsSectionProps {
  insights: any[];
  className?: string;
}

export const AIInsightsSection: React.FC<AIInsightsSectionProps> = ({ insights, className = '' }) => {
  if (!insights || insights.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`relative overflow-hidden bg-gradient-to-r from-slate-100 via-white to-slate-100 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 rounded-3xl p-8 border border-slate-200/50 dark:border-slate-700/50 ${className}`}
      >
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-slate-400 to-slate-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <SparklesIcon className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
            Generating Insights...
          </h3>
          <p className="text-slate-600 dark:text-slate-400">
            AI is analyzing your data to provide actionable insights.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.1 }}
      className={`relative overflow-hidden bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-3xl p-[1px] ${className}`}
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
            <SparklesIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">AI-Powered Insights</h2>
            <p className="text-slate-600 dark:text-slate-400">Actionable recommendations from your data</p>
          </div>
        </div>
        
        <div className="grid gap-4">
          {insights.slice(0, 6).map((insight, index) => (
            <InsightCard key={index} insight={insight} index={index} />
          ))}
        </div>
        
        {insights.length > 6 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-4 text-center"
          >
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Showing top 6 insights • {insights.length - 6} more available
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};
