import React from 'react';
import { 
  CheckCircleIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

interface ActionItemsProps {
  actionItems: any[];
  extractActionItems: () => void;
  toggleActionItem: (itemId: string) => void;
  isExtracting?: boolean;
}

export default function ActionItems({
  actionItems,
  extractActionItems,
  toggleActionItem,
  isExtracting = false
}: ActionItemsProps) {
  const hasActionItems = actionItems.length > 0;
  const isLoading = actionItems.some(item => item.id === 'loading');
  
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6 animate-slideIn">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <SparklesIcon className="w-5 h-5 text-blue-500" />
          Action Items
        </h3>
        <button
          onClick={extractActionItems}
          disabled={isLoading}
          className={`text-xs px-3 py-1 rounded-full transition-all duration-200 ${
            isLoading 
              ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600 hover:scale-105'
          }`}
        >
          {isLoading ? 'Extracting...' : 'Extract'}
        </button>
      </div>
      
      <div className="space-y-2">
        {hasActionItems && !isLoading && actionItems.map((item) => (
          <div key={item.id} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-200">
            <button
              onClick={() => toggleActionItem(item.id)}
              className="mt-0.5 hover:scale-110 transition-transform duration-200"
            >
              <CheckCircleIcon className={`w-4 h-4 transition-colors duration-200 ${
                item.completed ? 'text-green-500' : 'text-slate-300 dark:text-slate-600 hover:text-green-400'
              }`} />
            </button>
            <div className="flex-1">
              <p className={`text-sm transition-all duration-200 ${
                item.completed 
                  ? 'text-slate-400 line-through' 
                  : 'text-slate-700 dark:text-slate-300'
              }`}>
                {item.text}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full transition-all duration-200 ${
                  item.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' :
                  item.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400' :
                  'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                }`}>
                  {item.priority}
                </span>
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-sm text-slate-500 dark:text-slate-400">
              Analyzing meeting content...
            </span>
          </div>
        )}
        
        {!hasActionItems && !isLoading && (
          <div className="text-center py-8">
            <SparklesIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
              No action items found yet
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Click &quot;Extract&quot; to analyze the meeting for action items
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
