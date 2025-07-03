import React from 'react';
import { 
  ArrowLeftIcon, 
  HeartIcon, 
  ChatBubbleLeftIcon, 
  ArrowDownTrayIcon, 
  ShareIcon,
  EllipsisHorizontalIcon 
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';

interface MeetingHeaderProps {
  meeting: any;
  router: any;
  isFavorite: boolean;
  toggleFavorite: () => void;
  setShowComments: (show: boolean) => void;
  showComments: boolean;
  setShowExportModal: (show: boolean) => void;
  setShowShareModal: (show: boolean) => void;
  getStatusColor: (status: string) => string;
}

export default function MeetingHeader({
  meeting,
  router,
  isFavorite,
  toggleFavorite,
  setShowComments,
  showComments,
  setShowExportModal,
  setShowShareModal,
  getStatusColor
}: MeetingHeaderProps) {
  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50 sticky top-0 z-40 animate-slideDown">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          {/* Back Button & Title */}
          <div className="flex items-center space-x-4 min-w-0 flex-1">
            <button
              onClick={() => router.push('/meetings')}
              className="flex items-center justify-center h-10 w-10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all duration-200 hover:scale-105"
              aria-label="Back to Meetings"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-4 mb-2">
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 dark:text-white truncate">
                  {meeting.title}
                </h1>
                <span className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 ${getStatusColor(meeting.status)}`}>
                  {meeting.status}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                <span className="hidden sm:inline">{new Date(meeting.createdAt).toLocaleDateString()}</span>
                <span className="hidden sm:inline">•</span>
                <span className="hidden sm:inline">{meeting.segments.length} segments</span>
                {meeting.language && (
                  <>
                    <span className="hidden md:inline">•</span>
                    <span className="hidden md:inline">{meeting.language}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center">
            {/* Desktop Actions */}
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={toggleFavorite}
                className="flex items-center justify-center h-10 w-10 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all duration-200 hover:scale-105"
                aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
              >
                {isFavorite ? (
                  <HeartSolidIcon className="w-5 h-5 text-red-500 animate-pulse" />
                ) : (
                  <HeartIcon className="w-5 h-5 text-slate-400 hover:text-red-500 transition-colors" />
                )}
              </button>
              <button
                onClick={() => setShowComments(!showComments)}
                className={`flex items-center justify-center h-10 w-10 rounded-xl transition-all duration-200 hover:scale-105 ${
                  showComments ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                aria-label="Toggle comments"
              >
                <ChatBubbleLeftIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              </button>
              <button
                onClick={() => setShowExportModal(true)}
                className="flex items-center justify-center h-10 w-10 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all duration-200 hover:scale-105"
                aria-label="Export meeting"
              >
                <ArrowDownTrayIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              </button>
              <button
                onClick={() => setShowShareModal(true)}
                className="flex items-center justify-center h-10 w-10 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all duration-200 hover:scale-105"
                aria-label="Share meeting"
              >
                <ShareIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              </button>
            </div>

            {/* Mobile Actions */}
            <div className="sm:hidden">
              <div className="flex items-center gap-1">
                <button
                  onClick={toggleFavorite}
                  className="flex items-center justify-center h-10 w-10 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all duration-200"
                  aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                >
                  {isFavorite ? (
                    <HeartSolidIcon className="w-5 h-5 text-red-500" />
                  ) : (
                    <HeartIcon className="w-5 h-5 text-slate-400" />
                  )}
                </button>
                <button
                  onClick={() => setShowComments(!showComments)}
                  className={`flex items-center justify-center h-10 w-10 rounded-xl transition-all duration-200 ${
                    showComments ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  aria-label="Toggle comments"
                >
                  <ChatBubbleLeftIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                </button>
                <div className="relative">
                  <button
                    onClick={() => {
                      // Toggle mobile menu
                      const menu = document.getElementById('mobile-actions-menu');
                      if (menu) {
                        menu.classList.toggle('hidden');
                      }
                    }}
                    className="flex items-center justify-center h-10 w-10 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all duration-200"
                    aria-label="More actions"
                  >
                    <EllipsisHorizontalIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                  </button>
                  <div
                    id="mobile-actions-menu"
                    className="hidden absolute right-0 top-12 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-50 min-w-[150px]"
                  >
                    <button
                      onClick={() => {
                        setShowExportModal(true);
                        document.getElementById('mobile-actions-menu')?.classList.add('hidden');
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                    >
                      <ArrowDownTrayIcon className="w-4 h-4" />
                      Export
                    </button>
                    <button
                      onClick={() => {
                        setShowShareModal(true);
                        document.getElementById('mobile-actions-menu')?.classList.add('hidden');
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                    >
                      <ShareIcon className="w-4 h-4" />
                      Share
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
