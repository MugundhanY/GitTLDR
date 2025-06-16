'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface QnAContextType {
  questionCount: number;
  updateQuestionCount: (count: number) => void;
  incrementQuestionCount: () => void;
  triggerStatsRefresh: () => void;
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
    triggerStatsRefresh();
  };

  const triggerStatsRefresh = () => {
    setStatsRefreshTrigger(prev => prev + 1);
  };

  return (
    <QnAContext.Provider
      value={{
        questionCount,
        updateQuestionCount,
        incrementQuestionCount,
        triggerStatsRefresh,
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
