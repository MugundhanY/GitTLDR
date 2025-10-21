'use client'

import { memo, useState, useEffect, useRef } from 'react'
import { Question, FileContent } from '@/hooks/useQnAFiltering'
import { Repository } from '@/contexts/RepositoryContext'
import QuestionCard from './QuestionCard'

interface OptimizedQuestionListProps {
  questions: Question[]
  selectedRepository: Repository
  expandedFiles: { [key: string]: boolean }
  loadingFiles: { [key: string]: boolean }
  fileContents: { [key: string]: FileContent }
  copiedStates: { [key: string]: boolean }
  languageMap: { [key: string]: string }
  getStatusIcon: (status: string) => React.ReactElement
  getStatusColor: (status: string) => string
  toggleFileExpansion: (filePath: string) => void
  copyToClipboard: (text: string, filePath: string) => void
  formatCodeContent: (content: string, language: string) => string
  getLanguageColor: (language: string) => string
  onQuestionUpdate: (question: Question) => void
  getFollowUpSuggestions: (question: Question) => string[]
  handleSelectFollowUp: (originalQuestion: Question, followUpText: string, onQuestionChange: (text: string) => void) => void
  isPageVisible: boolean
  useConfidenceFilter: boolean
  refetchQuestions: () => Promise<void>
}

// ✅ OPTIMIZATION: Memoized QuestionCard wrapper to prevent unnecessary re-renders
const MemoizedQuestionCard = memo(QuestionCard, (prevProps, nextProps) => {
  // Custom comparison - only re-render if these specific props change
  return (
    prevProps.question.id === nextProps.question.id &&
    prevProps.question.answer === nextProps.question.answer &&
    prevProps.question.status === nextProps.question.status &&
    prevProps.question.isFavorite === nextProps.question.isFavorite &&
    prevProps.question.feedback === nextProps.question.feedback &&
    prevProps.isPageVisible === nextProps.isPageVisible &&
    prevProps.expandedFiles === nextProps.expandedFiles &&
    prevProps.copiedStates === nextProps.copiedStates
  );
});

MemoizedQuestionCard.displayName = 'MemoizedQuestionCard';

// ✅ FIX 2: Question item with Intersection Observer for smooth scroll
const QuestionItem = memo(({ 
  question, 
  cardProps 
}: { 
  question: Question
  cardProps: Omit<OptimizedQuestionListProps, 'questions'>
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            // Once visible, stop observing to improve performance
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '100px', // Load 100px before entering viewport
        threshold: 0.01
      }
    );

    if (itemRef.current) {
      observer.observe(itemRef.current);
    }

    return () => {
      if (itemRef.current) {
        observer.unobserve(itemRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={itemRef}
      id={`question-${question.id}`}
      className={`transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      tabIndex={-1}
    >
      {isVisible ? (
        <MemoizedQuestionCard
          question={question}
          {...cardProps}
        />
      ) : (
        // Placeholder to maintain scroll position
        <div className="h-32 bg-slate-50 dark:bg-slate-800 rounded-xl animate-pulse" />
      )}
    </div>
  );
});

QuestionItem.displayName = 'QuestionItem';

// ✅ OPTIMIZATION: Optimized list with Intersection Observer (no animation delays)
const OptimizedQuestionList = (props: OptimizedQuestionListProps) => {
  const { questions, ...cardProps } = props;
  
  return (
    <div className="space-y-4">
      {questions.map((question: Question) => (
        <QuestionItem
          key={question.id}
          question={question}
          cardProps={cardProps}
        />
      ))}
    </div>
  );
};

export default memo(OptimizedQuestionList);
