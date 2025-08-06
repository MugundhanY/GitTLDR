'use client';

import React from 'react';
import { ChartPieIcon } from '@heroicons/react/24/outline';
import { Doughnut } from 'react-chartjs-2';
import { ChartOptions } from 'chart.js';
import { Repository } from '@/types/dashboard';

interface AnalyticsCardProps {
  repositories: Repository[];
  usageChartData: any;
}

const doughnutOptions: ChartOptions<'doughnut'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        usePointStyle: true,
        padding: 15,
        color: 'rgb(100, 116, 139)',
        font: {
          size: 11,
          weight: 500
        }
      }
    },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      titleColor: 'white',
      bodyColor: 'white',
      borderColor: 'rgba(148, 163, 184, 0.2)',
      borderWidth: 1,
      cornerRadius: 8
    }
  },
  cutout: '65%'
};

export default function AnalyticsCard({ repositories, usageChartData }: AnalyticsCardProps) {
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 via-transparent to-emerald-500/5"></div>
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-teal-400/20 to-transparent rounded-full blur-xl"></div>
      
      <div className="relative p-6 h-full">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-2xl shadow-lg">
              <ChartPieIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Usage</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Credit distribution</p>
            </div>
          </div>
        </div>
        
        <div className="h-48">
          <Doughnut data={usageChartData} options={doughnutOptions} />
          {/* Repo breakdown list for better space usage */}
          <div className="mt-6 space-y-2">
            {repositories.length > 0 ? (
              repositories.map((repo, i) => (
                <div key={repo.id} className="flex items-center justify-between px-4 py-2 bg-slate-100/60 dark:bg-slate-700/60 rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-full mr-2" style={{backgroundColor: usageChartData.datasets[0].backgroundColor[i]}}></span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{repo.name}</span>
                  </div>
                  <span className="text-sm text-slate-600 dark:text-slate-400">{repo.creditsUsed !== undefined ? repo.creditsUsed : 8} credits</span>
                </div>
              ))
            ) : (
              <div className="text-center text-slate-500 dark:text-slate-400 py-4">No repositories yet</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
