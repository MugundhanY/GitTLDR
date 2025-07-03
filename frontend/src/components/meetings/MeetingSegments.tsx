import React, { useState } from 'react';
import { 
  ClockIcon,
  PlayIcon,
  Squares2X2Icon,
  ListBulletIcon
} from '@heroicons/react/24/outline';

interface MeetingSegment {
  id: string;
  title: string;
  summary: string;
  excerpt?: string;
  text?: string;
  startTime: number;
  endTime: number;
  index: number;
  duration?: number;
}

interface MeetingSegmentsProps {
  filteredSegments: MeetingSegment[];
  searchQuery: string;
  currentSegment: number | null;
  jumpToSegment: (segment: MeetingSegment) => void;
  formatTime: (time: number) => string;
  highlightText: (text: string, query: string) => string;
}

export default function MeetingSegments({
  filteredSegments,
  searchQuery,
  currentSegment,
  jumpToSegment,
  formatTime,
  highlightText
}: MeetingSegmentsProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6 animate-fadeIn">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Meeting Segments ({filteredSegments.length})
        </h2>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'grid' 
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <Squares2X2Icon className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'list' 
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <ListBulletIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-4'}>
        {filteredSegments.map((segment, index) => (
          <div
            key={segment.id}
            className={`group border border-slate-200 dark:border-slate-700 rounded-xl p-4 transition-all duration-300 hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-slate-800/50 cursor-pointer ${
              currentSegment === segment.index 
                ? 'ring-2 ring-blue-500 border-blue-300 dark:border-blue-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20' 
                : 'hover:border-slate-300 dark:hover:border-slate-600'
            }`}
            onClick={() => jumpToSegment(segment)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-slate-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                  <span
                    dangerouslySetInnerHTML={{ 
                      __html: highlightText(segment.title, searchQuery) 
                    }}
                  />
                </h3>
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <ClockIcon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="text-xs">{formatTime(segment.startTime)} - {formatTime(segment.endTime)}</span>
                  <span className="text-xs">•</span>
                  <span className="text-xs">{formatTime(segment.endTime - segment.startTime)}</span>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  jumpToSegment(segment);
                }}
                className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200 ml-2"
              >
                <PlayIcon className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <p 
                  className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3"
                  dangerouslySetInnerHTML={{ 
                    __html: highlightText(segment.summary, searchQuery) 
                  }}
                />
              </div>
              
              {segment.text && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                  <p 
                    className="text-xs text-slate-500 dark:text-slate-500 leading-relaxed line-clamp-3"
                    dangerouslySetInnerHTML={{ 
                      __html: highlightText(segment.text, searchQuery) 
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
