'use client';

import React from 'react';
import { GlobeAltIcon, CodeBracketIcon } from '@heroicons/react/24/outline';
import { TabType } from './types';

interface TabNavigationProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export default function TabNavigation({ activeTab, setActiveTab }: TabNavigationProps) {
  return (
    <div className="relative mb-8">
      {/* Background with gradient and patterns */}
      <div className="absolute inset-0 bg-gradient-to-r from-white via-blue-50/50 to-emerald-50/50 dark:from-slate-800 dark:via-slate-800/90 dark:to-slate-800/90 rounded-xl"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/30 to-transparent dark:via-slate-700/30 rounded-xl"></div>
      
      <div className="relative bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-xl border border-slate-200/60 dark:border-slate-700/60 shadow-lg overflow-hidden">
        {/* Active tab indicator background */}
        <div 
          className={`absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-emerald-500/10 via-emerald-400/20 to-emerald-500/10 dark:from-emerald-600/20 dark:via-emerald-500/30 dark:to-emerald-600/20 transition-transform duration-300 ease-in-out ${
            activeTab === 'browse' ? 'translate-x-full' : 'translate-x-0'
          }`}
        ></div>
        
        <div className="relative flex">
          <button
            onClick={() => setActiveTab('url')}
            className={`flex-1 px-8 py-6 text-sm font-semibold transition-all duration-300 relative group ${
              activeTab === 'url'
                ? 'text-emerald-700 dark:text-emerald-300'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {/* Active tab border */}
            {activeTab === 'url' && (
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-t-full"></div>
            )}
            
            <div className="flex items-center justify-center space-x-3">
              <div className={`p-2 rounded-lg transition-all duration-300 ${
                activeTab === 'url' 
                  ? 'bg-emerald-100 dark:bg-emerald-900/40 scale-110' 
                  : 'bg-slate-100 dark:bg-slate-700 group-hover:bg-slate-200 dark:group-hover:bg-slate-600'
              }`}>
                <GlobeAltIcon className={`h-5 w-5 transition-transform duration-300 ${
                  activeTab === 'url' ? 'text-emerald-600 dark:text-emerald-400 rotate-12' : ''
                }`} />
              </div>
              <div className="text-left">
                <div className="font-semibold">Add by URL</div>
                <div className={`text-xs transition-colors duration-300 ${
                  activeTab === 'url' 
                    ? 'text-emerald-600/80 dark:text-emerald-400/80' 
                    : 'text-slate-500 dark:text-slate-500'
                }`}>
                  Direct repository link
                </div>
              </div>
            </div>
          </button>
          
          {/* Separator */}
          <div className="w-px bg-gradient-to-b from-transparent via-slate-300 to-transparent dark:via-slate-600"></div>
          
          <button
            onClick={() => setActiveTab('browse')}
            className={`flex-1 px-8 py-6 text-sm font-semibold transition-all duration-300 relative group ${
              activeTab === 'browse'
                ? 'text-emerald-700 dark:text-emerald-300'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {/* Active tab border */}
            {activeTab === 'browse' && (
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-t-full"></div>
            )}
            
            <div className="flex items-center justify-center space-x-3">
              <div className={`p-2 rounded-lg transition-all duration-300 ${
                activeTab === 'browse' 
                  ? 'bg-emerald-100 dark:bg-emerald-900/40 scale-110' 
                  : 'bg-slate-100 dark:bg-slate-700 group-hover:bg-slate-200 dark:group-hover:bg-slate-600'
              }`}>
                <CodeBracketIcon className={`h-5 w-5 transition-transform duration-300 ${
                  activeTab === 'browse' ? 'text-emerald-600 dark:text-emerald-400 rotate-12' : ''
                }`} />
              </div>
              <div className="text-left">
                <div className="font-semibold">Browse GitHub</div>
                <div className={`text-xs transition-colors duration-300 ${
                  activeTab === 'browse' 
                    ? 'text-emerald-600/80 dark:text-emerald-400/80' 
                    : 'text-slate-500 dark:text-slate-500'
                }`}>
                  Your repositories
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
