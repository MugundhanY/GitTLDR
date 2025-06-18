'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface QnAContextType {
  questionCount: number;
  updateQuestionCount: (count: number) => void;
  incrementQuestionCount: () => void;
  triggerStatsRefresh: () => void;
  triggerStatsRefreshOnCompletion: () => void;
  statsRefreshTrigger: number;
}

const QnAContext = createContext<QnAContextType | undefined>(undefined);

export function QnAProvider({ children }: { children: ReactNode }) {
  const [questionCount, setQuestionCount] = useState(0);
  const [statsRefreshTrigger, setStatsRefreshTrigger] = useState(0);

  const updateQuestionCount = (count: number) => {
    setQuestionCount(count);
  };
  const incrementQuestionCount = () => {
    setQuestionCount(prev => prev + 1);
    // Only trigger stats refresh when a question is actually completed, not during polling
  };
  const triggerStatsRefresh = () => {
    setStatsRefreshTrigger(prev => prev + 1);
  };  const triggerStatsRefreshOnCompletion = () => {
    // Throttle stats refresh triggers to prevent excessive API calls
    const now = Date.now();
    const lastRefresh = (triggerStatsRefreshOnCompletion as any)._lastTrigger || 0;
    const MIN_TRIGGER_INTERVAL = 120 * 1000; // Increased to 2 minutes minimum between triggers
    
    if (now - lastRefresh >= MIN_TRIGGER_INTERVAL) {
      console.log('📊 [QNA_CONTEXT] Triggering stats refresh (throttled)');
      setStatsRefreshTrigger(prev => prev + 1);
      (triggerStatsRefreshOnCompletion as any)._lastTrigger = now;
    } else {
      console.log(`📊 [QNA_CONTEXT] Skipping stats refresh trigger (too recent: ${Math.round((now - lastRefresh)/1000)}s ago)`);
    }
  };

  return (
    <QnAContext.Provider
      value={{
        questionCount,
        updateQuestionCount,
        incrementQuestionCount,
        triggerStatsRefresh,
        triggerStatsRefreshOnCompletion,
        statsRefreshTrigger,
      }}
    >
      {children}
    </QnAContext.Provider>
  );
}

export function useQnA() {
  const context = useContext(QnAContext);
  if (context === undefined) {
    throw new Error('useQnA must be used within a QnAProvider');
  }
  return context;
}
