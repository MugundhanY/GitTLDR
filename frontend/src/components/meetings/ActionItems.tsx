import React from 'react';
import { 
  CheckCircleIcon 
} from '@heroicons/react/24/outline';

interface ActionItemsProps {
  actionItems: any[];
  extractActionItems: () => void;
  toggleActionItem: (itemId: string) => void;
}

export default function ActionItems({
  actionItems,
  extractActionItems,
  toggleActionItem
}: ActionItemsProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900 dark:text-white">Action Items</h3>
        <button
          onClick={extractActionItems}
          className="text-xs px-3 py-1 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
        >
          Extract
        </button>
      </div>
      
      <div className="space-y-2">
        {actionItems.map((item) => (
          <div key={item.id} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <button
              onClick={() => toggleActionItem(item.id)}
              className="mt-0.5"
            >
              <CheckCircleIcon className={`w-4 h-4 ${
                item.completed ? 'text-green-500' : 'text-slate-300 dark:text-slate-600'
              }`} />
            </button>
            <div className="flex-1">
              <p className={`text-sm ${
                item.completed 
                  ? 'text-slate-400 line-through' 
                  : 'text-slate-700 dark:text-slate-300'
              }`}>
                {item.text}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
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
        
        {actionItems.length === 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
            No action items extracted yet
          </p>
        )}
      </div>
    </div>
  );
}
