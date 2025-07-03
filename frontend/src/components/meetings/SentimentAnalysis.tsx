import React from 'react';

interface SentimentAnalysisProps {
  sentiment: {
    positive: number;
    negative: number;
    neutral: number;
  };
}

export default function SentimentAnalysis({ sentiment }: SentimentAnalysisProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
      <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Sentiment Analysis</h3>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-green-600 dark:text-green-400">Positive</span>
          <span className="text-sm font-medium">{Math.round(sentiment.positive)}%</span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
          <div 
            className="bg-green-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${sentiment.positive}%` }}
          ></div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600 dark:text-slate-400">Neutral</span>
          <span className="text-sm font-medium">{Math.round(sentiment.neutral)}%</span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
          <div 
            className="bg-slate-400 h-2 rounded-full transition-all duration-500"
            style={{ width: `${sentiment.neutral}%` }}
          ></div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-red-600 dark:text-red-400">Negative</span>
          <span className="text-sm font-medium">{Math.round(sentiment.negative)}%</span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
          <div 
            className="bg-red-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${sentiment.negative}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}
