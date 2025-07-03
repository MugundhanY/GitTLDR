import React, { useState } from 'react';
import { 
  ClockIcon,
  PlayIcon,
  Squares2X2Icon,
  ListBulletIcon,
  MagnifyingGlassIcon,
  XMarkIcon
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
  const [selectedSegment, setSelectedSegment] = useState<MeetingSegment | null>(null);

  const openSegmentModal = (segment: MeetingSegment) => {
    setSelectedSegment(segment);
  };

  const closeSegmentModal = () => {
    setSelectedSegment(null);
  };

  return (
    <>
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
              className={`group border border-slate-200 dark:border-slate-700 rounded-xl p-4 transition-all duration-300 hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-slate-800/50 cursor-pointer premium-segment premium-hover ${
                currentSegment === segment.index 
                  ? 'ring-2 ring-blue-500 border-blue-300 dark:border-blue-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20' 
                  : 'hover:border-slate-300 dark:hover:border-slate-600'
              }`}
              onClick={() => jumpToSegment(segment)}
              style={{ animationDelay: `${index * 0.1}s` }}
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
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openSegmentModal(segment);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-all duration-200"
                    title="View full content"
                  >
                    <MagnifyingGlassIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      jumpToSegment(segment);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200"
                    title="Jump to segment"
                  >
                    <PlayIcon className="w-4 h-4" />
                  </button>
                </div>
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
                        __html: highlightText(segment.text.slice(0, 200) + (segment.text.length > 200 ? '...' : ''), searchQuery) 
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Full Content Modal */}
      {selectedSegment && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-slideIn">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <ClockIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    {selectedSegment.title}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {formatTime(selectedSegment.startTime)} - {formatTime(selectedSegment.endTime)}
                    {' • '}
                    {formatTime(selectedSegment.endTime - selectedSegment.startTime)}
                  </p>
                </div>
              </div>
              <button
                onClick={closeSegmentModal}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-3">Summary</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {selectedSegment.summary}
                  </p>
                </div>
                
                {selectedSegment.text && (
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                    <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-3">Full Transcript</h4>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">
                        {selectedSegment.text}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-end gap-3">
              <button
                onClick={closeSegmentModal}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  jumpToSegment(selectedSegment);
                  closeSegmentModal();
                }}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white text-sm font-medium rounded-lg transition-all duration-200 hover:scale-105"
              >
                Jump to Segment
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
