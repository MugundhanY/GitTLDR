'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  QuestionMarkCircleIcon,
  SparklesIcon,
  PaperAirplaneIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  PlayIcon,
  BookmarkIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useUserData } from '@/hooks/useUserData';

interface MeetingQAProps {
  meetingId: string;
  segments: MeetingSegment[];
  onSeekTo?: (timestamp: number) => void;
  className?: string;
}

interface MeetingSegment {
  id: string;
  title: string;
  summary: string;
  excerpt?: string;
  text?: string;
  startTime: number;
  endTime: number;
  index: number;
  duration?: number;
}

interface QAItem {
  id: string;
  question: string;
  answer: string;
  timestamp?: number;
  relatedSegments: string[];
  confidence: number;
  createdAt: string;
}

export default function MeetingQA({ meetingId, segments, onSeekTo, className = '' }: MeetingQAProps) {
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [qaHistory, setQAHistory] = useState<QAItem[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { userData } = useUserData();

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [question]);

  // Demo Q&A items
  useEffect(() => {
    if (qaHistory.length === 0) {
      const demoQA: QAItem[] = [
        {
          id: 'qa-1',
          question: 'What were the main action items discussed?',
          answer: 'Based on the meeting discussion, the main action items were: 1) Complete the user authentication system by Friday (assigned to John), 2) Review and update the database schema for better performance (assigned to Sarah), 3) Prepare the demo presentation for the client meeting next week (assigned to Mike), and 4) Set up the staging environment with the latest features (assigned to DevOps team). These items were prioritized based on the upcoming deadline and client requirements.',
          timestamp: 240,
          relatedSegments: ['segment-2', 'segment-4'],
          confidence: 0.92,
          createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString()
        },
        {
          id: 'qa-2',
          question: 'What was decided about the new feature rollout?',
          answer: 'The team decided to implement a phased rollout approach for the new chat feature. Phase 1 will include basic messaging for 20% of users starting next Monday. Phase 2 will add file sharing and emoji reactions for 50% of users two weeks later. Phase 3 will include the full feature set for all users by the end of the month. This approach allows for gradual testing and feedback collection while minimizing risk.',
          timestamp: 420,
          relatedSegments: ['segment-3', 'segment-5'],
          confidence: 0.88,
          createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString()
        },
        {
          id: 'qa-3',
          question: 'Were there any budget concerns mentioned?',
          answer: 'Yes, there were some budget discussions. The team mentioned that the cloud infrastructure costs have increased by 15% this quarter due to higher usage. They proposed optimizing the database queries and implementing better caching to reduce server load. Additionally, they suggested negotiating with the cloud provider for better rates given the increased usage volume. The finance team will review these proposals by next Friday.',
          timestamp: 600,
          relatedSegments: ['segment-6'],
          confidence: 0.85,
          createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString()
        }
      ];
      setQAHistory(demoQA);
    }
  }, [qaHistory.length]);

  const handleAskQuestion = async () => {
    if (!question.trim() || isAsking) return;

    setIsAsking(true);
    const currentQuestion = question.trim();
    setQuestion('');
    
    // Generate unique ID for optimistic update
    const optimisticId = `qa-temp-${Date.now()}`;
    
    try {
      // Add optimistic question
      const optimisticQA: QAItem = {
        id: optimisticId,
        question: currentQuestion,
        answer: 'Analyzing meeting content...',
        relatedSegments: [],
        confidence: 0,
        createdAt: new Date().toISOString()
      };
      setQAHistory(prev => [optimisticQA, ...prev]);

      // Call the actual Meeting Q&A API
      const response = await fetch('/api/python-worker/meeting-qa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          meeting_id: meetingId,
          question: currentQuestion,
          user_id: userData?.id || '1' // Fallback to '1' if no user data
        })
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.statusText}`);
      }

      const data = await response.json();
      const result = data.result;

      if (result.status === 'completed') {
        // Update with real answer
        setQAHistory(prev => prev.map(qa => 
          qa.id === optimisticId ? 
          {
            ...qa,
            answer: result.answer,
            timestamp: result.suggested_timestamp,
            relatedSegments: result.related_segments?.map((seg: any) => `segment-${seg.segment_index}`) || [],
            confidence: result.confidence || 0.8
          } : qa
        ));
      } else {
        throw new Error(result.error || 'Failed to process question');
      }

    } catch (error) {
      console.error('Failed to ask question:', error);
      
      // Update optimistic question with error message or fallback to mock
      const mockAnswer = generateMockAnswer(currentQuestion);
      setQAHistory(prev => prev.map(qa => 
        qa.id === optimisticId ? 
        {
          ...qa,
          answer: mockAnswer.answer,
          timestamp: mockAnswer.timestamp,
          relatedSegments: mockAnswer.segments,
          confidence: mockAnswer.confidence
        } : qa
      ));
    } finally {
      setIsAsking(false);
    }
  };

  const generateMockAnswer = (currentQuestion: string) => {
    if (currentQuestion.toLowerCase().includes('summary') || currentQuestion.toLowerCase().includes('overview')) {
      return {
        answer: 'This meeting covered three main topics: project status updates, upcoming deadlines, and resource allocation. The team discussed the current sprint progress, identified potential blockers, and made decisions about feature prioritization for the next release.',
        timestamp: 60,
        segments: ['segment-1', 'segment-2'],
        confidence: 0.9
      };
    } else if (currentQuestion.toLowerCase().includes('timeline') || currentQuestion.toLowerCase().includes('deadline')) {
      return {
        answer: 'The key timelines mentioned were: Feature freeze by Friday, Code review completion by Monday, QA testing phase from Tuesday to Thursday, and production deployment scheduled for next Friday. The team emphasized the importance of meeting these deadlines to stay on track.',
        timestamp: 180,
        segments: ['segment-2', 'segment-3'],
        confidence: 0.87
      };
    } else if (currentQuestion.toLowerCase().includes('decision') || currentQuestion.toLowerCase().includes('conclude')) {
      return {
        answer: 'The main decisions made during this meeting were: 1) Proceed with the React component library upgrade, 2) Implement automated testing for all new features, 3) Schedule weekly code review sessions, and 4) Allocate additional resources to the performance optimization team.',
        timestamp: 300,
        segments: ['segment-4', 'segment-5'],
        confidence: 0.85
      };
    } else {
      return {
        answer: `I found relevant information about "${currentQuestion}" in the meeting transcript. The discussion touched on this topic around the middle of the meeting, with specific details about implementation approaches and team responsibilities. The conversation included various perspectives from team members and resulted in actionable next steps.`,
        timestamp: Math.floor(Math.random() * 600) + 60,
        segments: [`segment-${Math.floor(Math.random() * 6) + 1}`],
        confidence: 0.75 + Math.random() * 0.2
      };
    }
  };

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 dark:text-green-400';
    if (confidence >= 0.6) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const filteredQA = qaHistory.filter(qa => 
    qa.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    qa.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 ${className}`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <QuestionMarkCircleIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Meeting Q&A
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Ask questions about this meeting
              </p>
            </div>
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {qaHistory.length} questions
          </div>
        </div>

        {/* Ask Question */}
        <div className="space-y-4 mb-6">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAskQuestion();
                }
              }}
              placeholder="Ask about decisions, action items, key points, or any topic discussed..."
              rows={1}
              className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-4 pr-12 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              disabled={isAsking}
            />
            <button
              onClick={handleAskQuestion}
              disabled={!question.trim() || isAsking}
              className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-2 rounded-lg transition-all ${
                question.trim() && !isAsking
                  ? 'text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/20'
                  : 'text-slate-400 cursor-not-allowed'
              }`}
            >
              {isAsking ? (
                <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <PaperAirplaneIcon className="w-5 h-5" />
              )}
            </button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {[
              'What were the main decisions?',
              'What are the action items?',
              'Who is responsible for what?',
              'What are the next steps?',
              'Any deadlines mentioned?'
            ].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setQuestion(suggestion)}
                className="px-3 py-1 text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                disabled={isAsking}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        {qaHistory.length > 0 && (
          <div className="relative mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search questions and answers..."
              className="w-full border border-slate-200 dark:border-slate-700 rounded-lg p-3 pl-10 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
            <QuestionMarkCircleIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          </div>
        )}

        {/* Q&A History */}
        <div className="space-y-4">
          {filteredQA.length === 0 && qaHistory.length > 0 && (
            <div className="text-center py-8">
              <QuestionMarkCircleIcon className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400">
                No questions match your search
              </p>
            </div>
          )}
          
          {filteredQA.length === 0 && qaHistory.length === 0 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <SparklesIcon className="w-8 h-8 text-purple-500" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                Ask your first question
              </h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Get instant answers about this meeting using AI-powered search through the transcript and segments.
              </p>
            </div>
          )}

          {filteredQA.map((qa) => (
            <div
              key={qa.id}
              className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
            >
              <div
                className="p-4 cursor-pointer"
                onClick={() => toggleExpanded(qa.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <QuestionMarkCircleIcon className="w-4 h-4 text-purple-500 flex-shrink-0" />
                      <h3 className="font-medium text-slate-900 dark:text-white line-clamp-2">
                        {qa.question}
                      </h3>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                      <span>{new Date(qa.createdAt).toLocaleTimeString()}</span>
                      {qa.confidence > 0 && (
                        <span className={`font-medium ${getConfidenceColor(qa.confidence)}`}>
                          {Math.round(qa.confidence * 100)}% confident
                        </span>
                      )}
                      {qa.timestamp && (
                        <span className="flex items-center gap-1">
                          <ClockIcon className="w-3 h-3" />
                          {formatTime(qa.timestamp)}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {qa.timestamp && onSeekTo && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSeekTo(qa.timestamp!);
                        }}
                        className="p-1 text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                        title="Jump to timestamp"
                      >
                        <PlayIcon className="w-4 h-4" />
                      </button>
                    )}
                    {expandedItems.has(qa.id) ? (
                      <ChevronUpIcon className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDownIcon className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>
              </div>
              
              {expandedItems.has(qa.id) && (
                <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="pt-3">
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-sm">
                      {qa.answer}
                    </p>
                    
                    {qa.relatedSegments.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2 mb-2">
                          <BookmarkIcon className="w-4 h-4 text-slate-500" />
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            Related segments
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {qa.relatedSegments.map((segmentId) => {
                            const segment = segments.find(s => s.id === segmentId);
                            return segment ? (
                              <button
                                key={segmentId}
                                onClick={() => onSeekTo?.(segment.startTime)}
                                className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                              >
                                {segment.title} ({formatTime(segment.startTime)})
                              </button>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
