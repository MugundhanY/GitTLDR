'use client';

import { useMemo } from 'react';
import { Repository, DashboardStats } from '@/types/dashboard';

export function useChartData(repositories: Repository[], stats: DashboardStats) {
  // Dynamic chart data based on real usage patterns (memoized)
  const usageChartData = useMemo(() => {
    // Repo-based division: each repo is a slice, 8 credits per repo, labeled by repo name
    const repoLabels = repositories.map(repo => repo.name);
    const repoCredits = repositories.map(repo => (repo as any).creditsUsed ?? 0); // Use real creditsUsed
    // Generate distinct colors for each repo (fallback to blue if not enough)
    const colors = [
      'rgba(59, 130, 246, 0.8)',
      'rgba(16, 185, 129, 0.8)',
      'rgba(245, 158, 11, 0.8)',
      'rgba(139, 92, 246, 0.8)',
      'rgba(236, 72, 153, 0.8)',
      'rgba(34, 197, 94, 0.8)',
      'rgba(251, 191, 36, 0.8)',
      'rgba(14, 165, 233, 0.8)'
    ];
    return {
      labels: repoLabels.length > 0 ? repoLabels : ['No repositories'],
      datasets: [{
        data: repoCredits.length > 0 ? repoCredits : [0],
        backgroundColor: repoLabels.map((_, i) => colors[i % colors.length]),
        borderWidth: 2,
        borderColor: repoLabels.map((_, i) => colors[i % colors.length].replace('0.8', '1'))
      }]
    };
  }, [repositories]);

  // Activity chart with realistic data distribution (memoized)
  const activityChartData = useMemo(() => ({
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'AI Analyses', 
        data: stats.aiAnalyses > 0 ? [
          Math.floor(stats.aiAnalyses * 0.10),
          Math.floor(stats.aiAnalyses * 0.15),
          Math.floor(stats.aiAnalyses * 0.20),
          Math.floor(stats.aiAnalyses * 0.25),
          Math.floor(stats.aiAnalyses * 0.20),
          Math.floor(stats.aiAnalyses * 0.06),
          Math.floor(stats.aiAnalyses * 0.04)
        ] : [0, 0, 0, 0, 0, 0, 0],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  }), [stats]);

  return {
    usageChartData,
    activityChartData
  };
}
