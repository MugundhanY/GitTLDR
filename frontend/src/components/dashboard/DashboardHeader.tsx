'use client';

import React from 'react';
import Link from 'next/link';
import {
  ChartBarIcon,
  LinkIcon,
  AdjustmentsHorizontalIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

interface DashboardHeaderProps {
  editMode: boolean;
  setEditMode: (editMode: boolean) => void;
}

export default function DashboardHeader({ editMode, setEditMode }: DashboardHeaderProps) {
  return (
    <div className="mb-4 sm:mb-6 md:mb-8">
      <div className="relative overflow-hidden bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-2xl shadow-blue-500/10 dark:shadow-blue-500/5">
        {/* Animated background elements */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-teal-500/5 dark:from-blue-500/10 dark:via-purple-500/10 dark:to-teal-500/10"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-blue-400/10 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-gradient-to-tr from-purple-400/10 to-transparent rounded-full blur-3xl"></div>
        
        {/* Header content */}
        <div className="relative flex flex-col gap-4 sm:gap-0 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
                <ChartBarIcon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-black bg-gradient-to-r from-slate-900 via-blue-700 to-purple-700 dark:from-white dark:via-blue-300 dark:to-purple-300 bg-clip-text text-transparent mb-1">
                  Dashboard
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                  All your code, team, and insights at a glance
                </p>
              </div>
            </div>
          </div>
          <div className="mt-4 sm:mt-6 lg:mt-0 flex flex-wrap items-center gap-2 sm:gap-4">
            <Link 
              href="/webhooks/setup" 
              className="group px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold rounded-2xl transition-all duration-300 shadow-xl shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-105 flex items-center gap-2"
            >
              <LinkIcon className="w-4 h-4 group-hover:rotate-12 transition-transform duration-300" />
              <span className="hidden sm:inline">Setup Webhooks</span>
              <span className="sm:hidden">Webhooks</span>
            </Link>
            <button
              onClick={() => setEditMode(!editMode)}
              className={`px-4 py-3 rounded-2xl font-semibold transition-all duration-300 shadow-lg flex items-center gap-2 ${
                editMode 
                  ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/25' 
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 shadow-slate-500/10'
              }`}
            >
              <AdjustmentsHorizontalIcon className="w-4 h-4" />
              {editMode ? 'Exit Edit' : 'Edit Layout'}
            </button>
            <Link 
              href="/repositories/create" 
              className="group px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-2xl transition-all duration-300 shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105 flex items-center gap-2"
            >
              <PlusIcon className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
              New Repository
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
