'use client';

import React from 'react';
import Link from 'next/link';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { TabType } from './types';

interface CreditWarningProps {
  credits: number;
  setActiveTab: (tab: TabType) => void;
}

export default function CreditWarning({ credits, setActiveTab }: CreditWarningProps) {
  if (credits >= 1) return null;

  return (
    <div className="mb-8 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-amber-100 via-orange-50 to-amber-100 dark:from-amber-900/30 dark:via-orange-900/20 dark:to-amber-900/30 animate-pulse"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-amber-200/20 to-orange-200/20 dark:via-amber-800/10 dark:to-orange-800/10"></div>
      
      {/* Border with gradient */}
      <div className="relative border-2 border-gradient-to-r from-amber-300 via-orange-300 to-amber-300 dark:from-amber-600 dark:via-orange-600 dark:to-amber-600 rounded-xl p-6 backdrop-blur-sm">
        <div className="flex items-start space-x-4">
          <div className="relative">
            <div className="absolute inset-0 bg-amber-400 rounded-full blur-sm opacity-50 animate-pulse"></div>
            <div className="relative bg-gradient-to-br from-amber-500 to-orange-600 p-3 rounded-full">
              <ExclamationTriangleIcon className="h-7 w-7 text-white" />
            </div>
          </div>
          
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-3">
              <h3 className="text-xl font-bold bg-gradient-to-r from-amber-800 via-orange-700 to-amber-800 dark:from-amber-200 dark:via-orange-200 dark:to-amber-200 bg-clip-text text-transparent">
                Ready to Supercharge Your Coding?
              </h3>
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
            
            <p className="text-amber-900 dark:text-amber-100 mb-4 text-base leading-relaxed">
              You currently have <span className="font-bold text-orange-700 dark:text-orange-300">{credits} credits</span> remaining. 
              Each repository file requires 1 credit to unlock its AI-powered insights and summaries. 
              <span className="block mt-2 text-amber-800 dark:text-amber-200">
                💡 Get more credits to explore unlimited repositories and accelerate your development workflow!
              </span>
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Link 
                href="/billing"
                className="group relative overflow-hidden px-6 py-3 bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-600 hover:from-emerald-700 hover:via-emerald-800 hover:to-teal-700 text-white font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                <div className="relative flex items-center space-x-2">
                  <span>🚀 Get More Credits</span>
                </div>
              </Link>
              
              <button
                onClick={() => setActiveTab('url')}
                className="px-6 py-3 bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 text-amber-800 dark:text-amber-200 font-medium rounded-lg border-2 border-amber-300 dark:border-amber-600 hover:border-amber-400 dark:hover:border-amber-500 transition-all duration-200 backdrop-blur-sm"
              >
                ✨ Explore Demo Mode
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
