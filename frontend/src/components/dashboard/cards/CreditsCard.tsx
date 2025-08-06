'use client';

import React from 'react';
import { BoltIcon } from '@heroicons/react/24/outline';
import { DashboardStats } from '@/types/dashboard';

interface CreditsCardProps {
  stats: DashboardStats;
}

export default function CreditsCard({ stats }: CreditsCardProps) {
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-orange-500/5"></div>
      <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-amber-400/20 to-transparent rounded-full blur-2xl"></div>
      
      <div className="relative p-6 h-full">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl shadow-lg">
              <BoltIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Credits</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Available balance</p>
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="text-4xl font-black text-slate-900 dark:text-white">{stats.creditsRemaining.toLocaleString()}</div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400 font-medium">Usage this month</span>
              <span className="text-slate-900 dark:text-white font-bold">{stats.creditsUsed}</span>
            </div>
            <div className="relative w-full bg-slate-200/60 dark:bg-slate-700/60 rounded-full h-3 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 rounded-full"></div>
              <div 
                className="relative bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all duration-1000 shadow-lg" 
                style={{width: `${Math.min(100, Math.max(10, (stats.creditsUsed / (stats.creditsUsed + stats.creditsRemaining)) * 100))}%`}}
              ></div>
            </div>
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <BoltIcon className="w-4 h-4" />
              <span className="text-sm font-semibold">{((stats.creditsUsed / (stats.creditsUsed + stats.creditsRemaining)) * 100).toFixed(1)}% utilized</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
