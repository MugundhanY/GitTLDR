import React from 'react';
import { 
  XMarkIcon,
  ShareIcon,
  UserIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

interface ShareModalProps {
  showShareModal: boolean;
  setShowShareModal: (show: boolean) => void;
  shareEmail: string;
  setShareEmail: (email: string) => void;
  sharePermission: 'VIEW' | 'EDIT';
  setSharePermission: (permission: 'VIEW' | 'EDIT') => void;
  shareMeeting: () => void;
  isSharing: boolean;
  shareError: string;
  sharedUsers: any[];
  meetingId: string;
}

interface ExportModalProps {
  showExportModal: boolean;
  setShowExportModal: (show: boolean) => void;
  exportToPDF: () => void;
  exportToWord: () => void;
  exportToJSON: () => void;
}

export function ShareModal({
  showShareModal,
  setShowShareModal,
  shareEmail,
  setShareEmail,
  sharePermission,
  setSharePermission,
  shareMeeting,
  isSharing,
  shareError,
  sharedUsers,
  meetingId
}: ShareModalProps) {
  if (!showShareModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md mx-4 p-6 animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
              <ShareIcon className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Share Meeting
            </h2>
          </div>
          <button
            onClick={() => setShowShareModal(false)}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-4">
          {/* Share Form */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Email Address
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                placeholder="colleague@example.com"
                className="flex-1 border border-slate-200 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
              />
              <select
                value={sharePermission}
                onChange={(e) => setSharePermission(e.target.value as 'VIEW' | 'EDIT')}
                className="border border-slate-200 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
              >
                <option value="VIEW">Can view</option>
                <option value="EDIT">Can edit</option>
              </select>
            </div>
            {shareError && (
              <p className="text-red-600 dark:text-red-400 text-sm">{shareError}</p>
            )}
          </div>
          
          <button
            onClick={shareMeeting}
            disabled={isSharing || !shareEmail}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSharing ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2 align-middle"></span>
                Sharing...
              </>
            ) : (
              "Share Meeting"
            )}
          </button>
          
          {/* Shared Users List */}
          {sharedUsers.length > 0 && (
            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                Shared with ({sharedUsers.length})
              </h3>
              <ul className="space-y-2">
                {sharedUsers.map(user => (
                  <li key={user.userId} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                        {user.avatarUrl ? (
                          <img 
                            src={user.avatarUrl} 
                            alt={user.name}
                            className="w-8 h-8 rounded-full"
                          />
                        ) : (
                          <UserIcon className="w-4 h-4 text-white" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{user.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      user.permission === 'EDIT' 
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' 
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                    }`}>
                      {user.permission === 'EDIT' ? 'Editor' : 'Viewer'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Copy Link */}
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
              Or share with a link
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/meetings/${meetingId}`}
                className="flex-1 border border-slate-200 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
              />
              <button
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    navigator.clipboard.writeText(`${window.location.origin}/meetings/${meetingId}`);
                  }
                }}
                className="px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-sm"
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ExportModal({
  showExportModal,
  setShowExportModal,
  exportToPDF,
  exportToWord,
  exportToJSON
}: ExportModalProps) {
  if (!showExportModal) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Export Meeting
        </h3>
        
        <div className="space-y-3">
          <button
            onClick={exportToPDF}
            className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <DocumentTextIcon className="w-5 h-5 text-red-500" />
            <div>
              <div className="font-medium text-slate-900 dark:text-white">Export as PDF</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Complete meeting with transcript and summary
              </div>
            </div>
          </button>
          
          <button
            onClick={exportToWord}
            className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <DocumentTextIcon className="w-5 h-5 text-blue-500" />
            <div>
              <div className="font-medium text-slate-900 dark:text-white">Export as Word</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Editable document format
              </div>
            </div>
          </button>
          
          <button
            onClick={exportToJSON}
            className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <DocumentTextIcon className="w-5 h-5 text-green-500" />
            <div>
              <div className="font-medium text-slate-900 dark:text-white">Export as JSON</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Raw data including comments and metadata
              </div>
            </div>
          </button>
        </div>
        
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => setShowExportModal(false)}
            className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
