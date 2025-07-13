'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon, ClockIcon, CodeBracketIcon, UserIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { useUserData } from '@/hooks/useUserData';
import AuthGuard from '@/components/auth/AuthGuard';

interface CommitAuthor {
  name: string;
  email: string;
  date: string;
}

interface CommitData {
  sha: string;
  message: string;
  author: CommitAuthor;
  html_url: string;
  stats?: {
    additions: number;
    deletions: number;
    total: number;
  };
}

interface CommitSummary {
  commit_id: string;
  commit_sha: string;
  summary: string;
  generated_at: string;
}

interface Repository {
  id: string;
  name: string;
  fullName: string;
  owner: string;
  url: string;
  description?: string;
  language?: string;
  stars: number;
  forks: number;
}

export default function CommitsPage() {
  const params = useParams();
  const router = useRouter();
  const { userData } = useUserData();
  const repositoryId = params?.id as string;

  const [repository, setRepository] = useState<Repository | null>(null);
  const [commits, setCommits] = useState<CommitData[]>([]);
  const [commitSummaries, setCommitSummaries] = useState<Map<string, CommitSummary>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCommits, setIsLoadingCommits] = useState(false);
  const [loadingSummaries, setLoadingSummaries] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState('');

  // Load repository data
  useEffect(() => {
    const loadRepository = async () => {
      try {
        const response = await fetch(`/api/repositories/${repositoryId}`);
        if (!response.ok) {
          throw new Error('Failed to load repository');
        }
        const data = await response.json();
        setRepository(data);
      } catch (error) {
        console.error('Error loading repository:', error);
        setError('Failed to load repository');
      } finally {
        setIsLoading(false);
      }
    };

    if (repositoryId) {
      loadRepository();
    }
  }, [repositoryId]);

  // Load commits with pagination
  const loadCommits = async (pageNum: number = 1, append: boolean = false) => {
    if (!repository) return;

    setIsLoadingCommits(true);
    try {
      const response = await fetch(
        `/api/repositories/${repositoryId}/commits?page=${pageNum}&per_page=15`
      );
      
      if (!response.ok) {
        throw new Error('Failed to load commits');
      }

      const data = await response.json();
      const newCommits: CommitData[] = data.commits || [];
      
      if (append) {
        setCommits(prev => [...prev, ...newCommits]);
      } else {
        setCommits(newCommits);
      }
      
      setHasMore(newCommits.length === 15);
      setPage(pageNum);
    } catch (error) {
      console.error('Error loading commits:', error);
      setError('Failed to load commits');
    } finally {
      setIsLoadingCommits(false);
    }
  };

  // Load commits when repository is available
  useEffect(() => {
    if (repository) {
      loadCommits(1, false);
    }
  }, [repository]);

  // Generate commit summary
  const generateCommitSummary = async (commit: CommitData) => {
    if (loadingSummaries.has(commit.sha)) return;

    setLoadingSummaries(prev => new Set(prev.add(commit.sha)));
    
    try {
      const response = await fetch('/api/repositories/commits/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repositoryId,
          commitSha: commit.sha,
          commitData: commit,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate summary');
      }

      const summary: CommitSummary = await response.json();
      setCommitSummaries(prev => new Map(prev.set(commit.sha, summary)));
    } catch (error) {
      console.error('Error generating summary:', error);
    } finally {
      setLoadingSummaries(prev => {
        const newSet = new Set(prev);
        newSet.delete(commit.sha);
        return newSet;
      });
    }
  };

  // Load more commits
  const loadMoreCommits = () => {
    if (!isLoadingCommits && hasMore) {
      loadCommits(page + 1, true);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get commit message preview
  const getCommitPreview = (message: string) => {
    const firstLine = message.split('\n')[0];
    return firstLine.length > 80 ? firstLine.substring(0, 80) + '...' : firstLine;
  };

  if (isLoading) {
    return (
      <AuthGuard requireAuth={true}>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Loading repository...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  if (error) {
    return (
      <AuthGuard requireAuth={true}>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
            <Link
              href="/dashboard"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requireAuth={true}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        {/* Header */}
        <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <Link 
                  href={`/repositories/${repositoryId}`}
                  className="inline-flex items-center space-x-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors group"
                >
                  <ArrowLeftIcon className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                  <span className="text-sm font-medium">Back to Repository</span>
                </Link>
                <div className="h-4 w-px bg-slate-300 dark:bg-slate-600"></div>
                <div>
                  <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
                    Commit History
                  </h1>
                  {repository && (
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {repository.fullName}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                  <ClockIcon className="h-4 w-4 text-slate-500" />
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {commits.length} commits loaded
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            {/* Commits List */}
            <div className="space-y-4">
              {commits.map((commit) => {
                const summary = commitSummaries.get(commit.sha);
                const isGeneratingSummary = loadingSummaries.has(commit.sha);

                return (
                  <div key={commit.sha} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                    {/* Commit Header */}
                    <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3 mb-2">
                            <div className="flex items-center space-x-2">
                              <UserIcon className="h-4 w-4 text-slate-400" />
                              <span className="text-sm font-medium text-slate-900 dark:text-white">
                                {commit.author.name}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400">
                              <CalendarIcon className="h-4 w-4" />
                              <span className="text-sm">
                                {formatDate(commit.author.date)}
                              </span>
                            </div>
                          </div>
                          
                          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                            {getCommitPreview(commit.message)}
                          </h3>
                          
                          <div className="flex items-center space-x-4 text-sm text-slate-600 dark:text-slate-400">
                            <div className="flex items-center space-x-1">
                              <CodeBracketIcon className="h-4 w-4" />
                              <span className="font-mono text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                                {commit.sha.substring(0, 8)}
                              </span>
                            </div>
                            
                            {commit.stats && (
                              <div className="flex items-center space-x-3">
                                <span className="text-green-600 dark:text-green-400">
                                  +{commit.stats.additions}
                                </span>
                                <span className="text-red-600 dark:text-red-400">
                                  -{commit.stats.deletions}
                                </span>
                              </div>
                            )}
                            
                            <a
                              href={commit.html_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              View on GitHub
                            </a>
                          </div>
                        </div>
                        
                        <div className="ml-4">
                          {!summary && !isGeneratingSummary && (
                            <button
                              onClick={() => generateCommitSummary(commit)}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                              Generate Summary
                            </button>
                          )}
                          
                          {isGeneratingSummary && (
                            <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                              <span className="text-sm">Generating...</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* AI Summary */}
                    {summary && (
                      <div className="p-6 bg-blue-50 dark:bg-blue-900/20">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 dark:text-blue-400 text-sm font-medium">AI</span>
                            </div>
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                              AI Summary
                            </h4>
                            <p className="text-blue-800 dark:text-blue-200 text-sm leading-relaxed">
                              {summary.summary}
                            </p>
                            <p className="text-blue-600 dark:text-blue-400 text-xs mt-2">
                              Generated {formatDate(summary.generated_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Full Commit Message (if longer) */}
                    {commit.message.includes('\n') && (
                      <div className="p-6 border-t border-slate-200 dark:border-slate-700">
                        <pre className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-mono">
                          {commit.message}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Load More Button */}
            {hasMore && (
              <div className="text-center">
                <button
                  onClick={loadMoreCommits}
                  disabled={isLoadingCommits}
                  className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                >
                  {isLoadingCommits ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-600"></div>
                      <span>Loading commits...</span>
                    </div>
                  ) : (
                    'Load More Commits'
                  )}
                </button>
              </div>
            )}

            {!hasMore && commits.length > 0 && (
              <div className="text-center py-8">
                <p className="text-slate-600 dark:text-slate-400">
                  No more commits to load
                </p>
              </div>
            )}

            {commits.length === 0 && !isLoadingCommits && (
              <div className="text-center py-12">
                <ClockIcon className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600 dark:text-slate-400">
                  No commits found for this repository
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
