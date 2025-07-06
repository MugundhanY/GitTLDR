'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  LightBulbIcon,
  TrophyIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  UsersIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface Recommendation {
  type: 'success' | 'warning' | 'info' | 'suggestion';
  title: string;
  description: string;
  action?: string;
  metric?: string;
  priority: 'high' | 'medium' | 'low';
}

interface SmartRecommendationsProps {
  analytics: any;
  className?: string;
}

export const SmartRecommendations: React.FC<SmartRecommendationsProps> = ({ analytics, className = '' }) => {
  const generateRecommendations = (): Recommendation[] => {
    const recommendations: Recommendation[] = [];
    
    if (!analytics) return recommendations;

    const completionRate = analytics.meetingStats?.completionRate || 0;
    const confidence = (analytics.qaStats?.averageConfidence || 0) * 100;
    const growthRate = analytics.overview?.growthRate || 0;
    const avgDuration = analytics.meetingStats?.averageDuration || 0;
    const totalMeetings = analytics.overview?.totalMeetings || 0;
    const activeUsers = analytics.overview?.activeUsers || 0;
    const totalUsers = analytics.overview?.totalUsers || 1;

    // Meeting completion recommendations
    if (completionRate >= 85) {
      recommendations.push({
        type: 'success',
        title: 'Excellent Meeting Efficiency',
        description: `Your team has a ${completionRate.toFixed(1)}% meeting completion rate, indicating strong follow-through and engagement.`,
        metric: `${completionRate.toFixed(1)}%`,
        priority: 'low'
      });
    } else if (completionRate >= 60) {
      recommendations.push({
        type: 'warning',
        title: 'Meeting Completion Needs Attention',
        description: `Meeting completion rate is ${completionRate.toFixed(1)}%. Consider implementing better action item tracking.`,
        action: 'Set up automated follow-ups for meeting action items',
        metric: `${completionRate.toFixed(1)}%`,
        priority: 'medium'
      });
    } else {
      recommendations.push({
        type: 'warning',
        title: 'Low Meeting Completion Rate',
        description: `Only ${completionRate.toFixed(1)}% of meetings are being completed effectively. This needs immediate attention.`,
        action: 'Review meeting structure and implement stricter follow-up processes',
        metric: `${completionRate.toFixed(1)}%`,
        priority: 'high'
      });
    }

    // Duration recommendations
    if (avgDuration > 90) {
      recommendations.push({
        type: 'suggestion',
        title: 'Optimize Meeting Duration',
        description: `Average meeting duration is ${Math.round(avgDuration)} minutes. Consider shorter, more focused sessions.`,
        action: 'Implement time-boxed agendas and meeting facilitation best practices',
        metric: `${Math.round(avgDuration)}min`,
        priority: 'medium'
      });
    } else if (avgDuration > 0 && avgDuration <= 30) {
      recommendations.push({
        type: 'success',
        title: 'Efficient Meeting Duration',
        description: `Excellent! Average meeting duration of ${Math.round(avgDuration)} minutes shows efficient time management.`,
        metric: `${Math.round(avgDuration)}min`,
        priority: 'low'
      });
    }

    // Q&A confidence recommendations
    if (confidence >= 80) {
      recommendations.push({
        type: 'success',
        title: 'High-Quality Knowledge Base',
        description: `Q&A confidence score of ${confidence.toFixed(1)}% indicates excellent documentation and knowledge sharing.`,
        metric: `${confidence.toFixed(1)}%`,
        priority: 'low'
      });
    } else if (confidence >= 60) {
      recommendations.push({
        type: 'info',
        title: 'Improve Documentation Quality',
        description: `Q&A confidence score is ${confidence.toFixed(1)}%. Consider enhancing documentation and training materials.`,
        action: 'Review and update documentation, provide additional training',
        metric: `${confidence.toFixed(1)}%`,
        priority: 'medium'
      });
    } else {
      recommendations.push({
        type: 'warning',
        title: 'Knowledge Base Needs Improvement',
        description: `Low Q&A confidence score of ${confidence.toFixed(1)}% suggests gaps in documentation or training.`,
        action: 'Conduct knowledge audit and implement comprehensive documentation strategy',
        metric: `${confidence.toFixed(1)}%`,
        priority: 'high'
      });
    }

    // Growth recommendations
    if (growthRate > 10) {
      recommendations.push({
        type: 'success',
        title: 'Strong Growth Trajectory',
        description: `${growthRate.toFixed(1)}% growth rate shows excellent team expansion and adoption.`,
        metric: `+${growthRate.toFixed(1)}%`,
        priority: 'low'
      });
    } else if (growthRate < -5) {
      recommendations.push({
        type: 'warning',
        title: 'Declining Activity',
        description: `${Math.abs(growthRate).toFixed(1)}% decline in activity. Investigate potential causes.`,
        action: 'Conduct team survey and identify engagement barriers',
        metric: `${growthRate.toFixed(1)}%`,
        priority: 'high'
      });
    }

    // Team engagement recommendations
    const engagementRate = (activeUsers / totalUsers) * 100;
    if (engagementRate >= 75) {
      recommendations.push({
        type: 'success',
        title: 'High Team Engagement',
        description: `${engagementRate.toFixed(1)}% of team members are actively participating. Great collaboration!`,
        metric: `${engagementRate.toFixed(1)}%`,
        priority: 'low'
      });
    } else if (engagementRate >= 50) {
      recommendations.push({
        type: 'info',
        title: 'Moderate Team Engagement',
        description: `${engagementRate.toFixed(1)}% engagement rate. Consider strategies to increase participation.`,
        action: 'Implement team building activities and participation incentives',
        metric: `${engagementRate.toFixed(1)}%`,
        priority: 'medium'
      });
    } else {
      recommendations.push({
        type: 'warning',
        title: 'Low Team Engagement',
        description: `Only ${engagementRate.toFixed(1)}% of team members are actively engaged. This needs attention.`,
        action: 'Review team dynamics and implement engagement improvement plan',
        metric: `${engagementRate.toFixed(1)}%`,
        priority: 'high'
      });
    }

    return recommendations.slice(0, 5); // Limit to top 5 recommendations
  };

  const recommendations = generateRecommendations();

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />;
      case 'info':
        return <InformationCircleIcon className="w-5 h-5 text-blue-500" />;
      case 'suggestion':
        return <LightBulbIcon className="w-5 h-5 text-purple-500" />;
      default:
        return <InformationCircleIcon className="w-5 h-5 text-blue-500" />;
    }
  };

  const getColors = (type: string) => {
    switch (type) {
      case 'success':
        return {
          bg: 'from-green-50 via-white to-emerald-50 dark:from-green-900/10 dark:via-slate-900 dark:to-emerald-900/10',
          border: 'border-green-200 dark:border-green-800',
          accent: 'bg-green-500'
        };
      case 'warning':
        return {
          bg: 'from-amber-50 via-white to-orange-50 dark:from-amber-900/10 dark:via-slate-900 dark:to-orange-900/10',
          border: 'border-amber-200 dark:border-amber-800',
          accent: 'bg-amber-500'
        };
      case 'info':
        return {
          bg: 'from-blue-50 via-white to-cyan-50 dark:from-blue-900/10 dark:via-slate-900 dark:to-cyan-900/10',
          border: 'border-blue-200 dark:border-blue-800',
          accent: 'bg-blue-500'
        };
      case 'suggestion':
        return {
          bg: 'from-purple-50 via-white to-violet-50 dark:from-purple-900/10 dark:via-slate-900 dark:to-violet-900/10',
          border: 'border-purple-200 dark:border-purple-800',
          accent: 'bg-purple-500'
        };
      default:
        return {
          bg: 'from-slate-50 via-white to-slate-50 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800',
          border: 'border-slate-200 dark:border-slate-700',
          accent: 'bg-slate-500'
        };
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <span className="text-xs px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full font-medium">High Priority</span>;
      case 'medium':
        return <span className="text-xs px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full font-medium">Medium</span>;
      case 'low':
        return <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full font-medium">Good</span>;
      default:
        return null;
    }
  };

  if (recommendations.length === 0) {
    return (
      <div className={`bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-8 text-center ${className}`}>
        <TrophyIcon className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
          Excellent Performance!
        </h3>
        <p className="text-slate-600 dark:text-slate-400">
          Your team is performing exceptionally well across all metrics.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-8 shadow-xl ${className}`}
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
          <ChartBarIcon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Smart Recommendations</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">AI-powered insights for your team</p>
        </div>
      </div>

      <div className="space-y-4">
        {recommendations.map((rec, index) => {
          const colors = getColors(rec.type);
          
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative overflow-hidden bg-gradient-to-r ${colors.bg} rounded-xl border ${colors.border} p-5 group hover:shadow-lg transition-all duration-300`}
            >
              {/* Priority indicator */}
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${colors.accent}`} />
              
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center shadow-sm border border-slate-200/50 dark:border-slate-700/50">
                  {getIcon(rec.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold text-slate-900 dark:text-white text-sm">
                      {rec.title}
                    </h4>
                    {rec.metric && (
                      <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full font-mono">
                        {rec.metric}
                      </span>
                    )}
                    {getPriorityBadge(rec.priority)}
                  </div>
                  
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-2">
                    {rec.description}
                  </p>
                  
                  {rec.action && (
                    <div className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-500">
                      <ArrowTrendingUpIcon className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span className="italic">{rec.action}</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};
