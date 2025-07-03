import React from 'react';
import { 
  MagnifyingGlassIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface MeetingSearchProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredSegments: any[];
}

export default function MeetingSearch({
  searchQuery,
  setSearchQuery,
  filteredSegments
}: MeetingSearchProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <MagnifyingGlassIcon className="w-5 h-5 text-blue-500"/>
          Search Meeting Content
        </h2>
      </div>
      
      <div className="relative mt-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search in transcript, summary, segments..."
          className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
        />
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
        
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        )}
      </div>
      
      {searchQuery && (
        <div className="mt-3 text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
          <span className="font-medium text-blue-500">{filteredSegments.length}</span> results found for 
          <span className="font-medium ml-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
            {searchQuery}
          </span>
        </div>
      )}
    </div>
  );
}
