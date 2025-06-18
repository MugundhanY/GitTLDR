'use client'

import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline'

interface EmptyStateProps {
  repositoryName: string
  className?: string
}

export default function QnAEmptyState({ 
  repositoryName, 
  className = "" 
}: EmptyStateProps) {
  return (
    <div className={`text-center py-12 ${className}`}>
      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center mx-auto mb-6">
        <QuestionMarkCircleIcon className="w-8 h-8 text-slate-400 dark:text-slate-500" />
      </div>
      <h4 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No questions yet</h4>
      <p className="text-slate-600 dark:text-slate-400">
        Ask your first question about {repositoryName} to get started!
      </p>
    </div>
  )
}
