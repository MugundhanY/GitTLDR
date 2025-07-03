import React from 'react';
import { 
  DocumentTextIcon,
  PencilIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

interface MeetingSummaryProps {
  meeting: any;
  searchQuery: string;
  editingSummary: boolean;
  setEditingSummary: (editing: boolean) => void;
  editedSummary: string;
  setEditedSummary: (summary: string) => void;
  meetingId: string;
  highlightText: (text: string, query: string) => string;
}

export default function MeetingSummary({
  meeting,
  searchQuery,
  editingSummary,
  setEditingSummary,
  editedSummary,
  setEditedSummary,
  meetingId,
  highlightText
}: MeetingSummaryProps) {
  const saveSummary = async () => {
    try {
      const response = await fetch(`/api/meetings/${meetingId}/summary`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary: editedSummary, type: 'user' })
      });
      
      if (response.ok) {
        setEditingSummary(false);
      } else {
        throw new Error('Failed to save summary');
      }
    } catch (error) {
      console.error('Error saving summary:', error);
    }
  };

  const cancelEditing = () => {
    setEditedSummary(meeting.summary || '');
    setEditingSummary(false);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <DocumentTextIcon className="w-5 h-5 text-blue-500"/>
          Meeting Summary
        </h2>
        {!editingSummary && (
          <button
            onClick={() => setEditingSummary(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800/30 rounded-lg text-sm font-medium transition-colors"
          >
            <PencilIcon className="w-4 h-4" />
            Edit Summary
          </button>
        )}
      </div>
      
      {editingSummary ? (
        <div className="space-y-3">
          <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2 flex items-center">
            <span className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded mr-2">User-Edited</span>
            Your custom summary will be saved for others to view.
          </div>
          <textarea
            value={editedSummary}
            onChange={(e) => setEditedSummary(e.target.value)}
            rows={6}
            className="w-full border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={saveSummary}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
            >
              Save
            </button>
            <button
              onClick={cancelEditing}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
          
          {/* Original AI Summary */}
          {meeting.summary && meeting.summary !== editedSummary && (
            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">
                <span className="inline-block px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded mr-2">AI-Generated</span>
                Original summary for reference
              </div>
              <div 
                className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg"
              >
                {meeting.summary}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          {meeting.user_edited_summary ? (
            <div>
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2 flex items-center">
                <span className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded mr-2">User-Edited</span>
              </div>
              <div 
                className="text-slate-600 dark:text-slate-300 leading-relaxed"
                dangerouslySetInnerHTML={{ 
                  __html: highlightText(meeting.user_edited_summary, searchQuery) 
                }}
              />
              
              {/* Show AI version toggle */}
              {meeting.summary && (
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <details className="group">
                    <summary className="list-none flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 cursor-pointer">
                      <span className="inline-block w-4 h-4 text-slate-400 group-open:rotate-90 transition-transform">
                        <ChevronRightIcon className="w-4 h-4" />
                      </span>
                      <span className="inline-block px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">AI-Generated</span>
                      View original AI summary
                    </summary>
                    <div 
                      className="mt-3 pl-6 text-slate-600 dark:text-slate-400 text-sm leading-relaxed"
                      dangerouslySetInnerHTML={{ 
                        __html: highlightText(meeting.summary, searchQuery) 
                      }}
                    />
                  </details>
                </div>
              )}
            </div>
          ) : (
            <div 
              className="text-slate-600 dark:text-slate-300 leading-relaxed"
              dangerouslySetInnerHTML={{ 
                __html: highlightText(meeting.summary || 'No summary available', searchQuery) 
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
