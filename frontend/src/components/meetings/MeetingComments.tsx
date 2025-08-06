'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { 
  ChatBubbleLeftIcon, 
  XMarkIcon, 
  ClockIcon, 
  PlusIcon,
  TrashIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { useUserData } from '@/hooks/useUserData';

interface Comment {
  id: string;
  text: string;
  timestamp: number;
  segmentId?: string;
  createdAt: string;
  user: {
    name: string;
    avatarUrl?: string;
  };
}

interface MeetingCommentsProps {
  meetingId: string;
  currentTime: number;
  onSeekTo?: (timestamp: number) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function MeetingComments({ 
  meetingId, 
  currentTime, 
  onSeekTo, 
  isOpen, 
  onClose 
}: MeetingCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentTimestamp, setCommentTimestamp] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { userData } = useUserData();

  useEffect(() => {
    setCommentTimestamp(currentTime);
  }, [currentTime]);

  useEffect(() => {
    if (isOpen && meetingId) {
      fetchComments();
    }
  }, [isOpen, meetingId]);

  const fetchComments = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/meetings/${meetingId}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addComment = async () => {
    if (!newComment.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      
      // Create an optimistic comment
      const optimisticComment: Comment = {
        id: `temp-${Date.now()}`,
        text: newComment,
        timestamp: commentTimestamp || currentTime,
        createdAt: new Date().toISOString(),
        user: {
          name: 'You',
          avatarUrl: undefined
        }
      };
      
      // Add optimistically to the UI
      setComments(prev => [optimisticComment, ...prev]);
      setNewComment('');
      
      const response = await fetch(`/api/meetings/${meetingId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: newComment,
          timestamp: commentTimestamp || currentTime,
          userId: userData?.id || 'anonymous'
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Replace our optimistic comment with the real one
        setComments(prev => prev.map(c => 
          c.id === optimisticComment.id ? data.comment : c
        ));
      } else {
        // Remove the optimistic comment on error
        setComments(prev => prev.filter(c => c.id !== optimisticComment.id));
        throw new Error('Failed to add comment');
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteComment = async (commentId: string) => {
    try {
      const response = await fetch(`/api/meetings/${meetingId}/comments/${commentId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setComments(prev => prev.filter(c => c.id !== commentId));
      }
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
    const totalSeconds = Math.floor(seconds);
    const minutes = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-2xl max-h-[80vh] mx-4 flex flex-col animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
              <ChatBubbleLeftIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Meeting Comments
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {comments.length} comment{comments.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            aria-label="Close comments"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-500 dark:text-slate-400">Loading comments...</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8">
              <ChatBubbleLeftIcon className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-500 dark:text-slate-400">No comments yet</p>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                Be the first to add a comment!
              </p>
            </div>
          ) : (
            comments.map((comment, index) => (
              <div key={comment.id} className="group relative premium-comment premium-hover" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-800/60 rounded-xl hover:shadow-md transition-all">
                  <div className="w-9 h-9 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0 ring-2 ring-white dark:ring-slate-700">
                    {comment.user.avatarUrl ? (
                      <Image 
                        src={comment.user.avatarUrl} 
                        alt={comment.user.name}
                        width={36}
                        height={36}
                        className="rounded-full"
                      />
                    ) : (
                      <UserIcon className="w-4 h-4 text-white" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {comment.user.name}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {new Date(comment.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <button
                        onClick={() => deleteComment(comment.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                      {comment.text}
                    </p>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onSeekTo?.(comment.timestamp)}
                        className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                      >
                        <ClockIcon className="w-3 h-3" />
                        {formatTime(comment.timestamp)}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add Comment */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-700">
          <div className="space-y-4">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              rows={3}
              className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={commentTimestamp || currentTime}
                  onChange={(e) => setCommentTimestamp(Number(e.target.value))}
                  className="w-20 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  step="1"
                  min="0"
                />
                <span className="text-sm text-slate-500 dark:text-slate-400">seconds</span>
              </div>
              
              <button
                onClick={addComment}
                disabled={!newComment.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <PlusIcon className="w-4 h-4" />
                Add Comment
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
