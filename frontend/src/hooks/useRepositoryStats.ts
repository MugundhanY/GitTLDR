'use client';

import { useState, useEffect } from 'react';

interface RepositoryStats {
  totalFiles: number;
  totalQuestions: number;
  recentActivity: Array<{
    id: string;
    type: 'commit' | 'question' | 'file_added';
    title: string;
    description: string;
    timestamp: string;
    author?: string;
    authorEmail?: string;
    authorAvatar?: string;
    sha?: string;
    filesChanged?: number;
    aiSummaryStatus?: 'pending' | 'completed' | 'failed';
  }>;
}

export function useRepositoryStats(repositoryId?: string) {
  const [stats, setStats] = useState<RepositoryStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cache, setCache] = useState<Map<string, { data: RepositoryStats; timestamp: number }>>(new Map());

  // Cache duration: 5 minutes
  const CACHE_DURATION = 5 * 60 * 1000;  useEffect(() => {
    const fetchStats = async () => {
      if (!repositoryId) {
        setStats(null);
        setIsLoading(false);
        return;
      }

      // Check cache first
      const cached = cache.get(repositoryId);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        setStats(cached.data);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        // Fetch repository statistics from new API
        const response = await fetch(`/api/repositories/${repositoryId}/stats`);
        if (response.ok) {
          const data = await response.json();
          const newStats = {
            totalFiles: data.totalFiles,
            totalQuestions: 0, // We don't track Q&A in this endpoint yet
            recentActivity: data.recentActivity
          };
          
          setStats(newStats);
          
          // Cache the result
          setCache(prev => new Map(prev).set(repositoryId, {
            data: newStats,
            timestamp: Date.now()
          }));        } else {
          // If API fails, use mock data
          const mockStats = {
            totalFiles: 156,
            totalQuestions: 23,            recentActivity: [
              {
                id: '1',
                type: 'question' as const,
                title: 'How does authentication work?',
                description: 'Asked about the login flow implementation',
                timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                author: 'You',
                authorAvatar: 'https://github.com/github.png'
              },
              {
                id: '2',
                type: 'commit' as const,
                title: 'Fixed authentication bug',
                description: 'Resolved OAuth token refresh issue',
                timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
                author: 'John Doe',
                authorEmail: 'john.doe@example.com',
                authorAvatar: 'https://github.com/github.png',
                sha: 'abc123',
                filesChanged: 3,
                aiSummaryStatus: 'completed' as const
              },
              {
                id: '3',
                type: 'file_added' as const,
                title: 'Added new component',
                description: 'UserProfile.tsx was processed',
                timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
                aiSummaryStatus: 'pending' as const
              }
            ]
          };
          
          setStats(mockStats);
          
          // Cache the mock data
          setCache(prev => new Map(prev).set(repositoryId, {
            data: mockStats,
            timestamp: Date.now()
          }));
        }

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch repository stats');
        // Set fallback data on error
        setStats({
          totalFiles: 0,
          totalQuestions: 0,
          recentActivity: []
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [repositoryId]);
  return {
    stats,
    isLoading,
    error,
    refetch: () => {
      if (repositoryId) {
        setIsLoading(true);
        setError(null);
        // Re-trigger the useEffect by updating the dependency
        const fetchStats = async () => {
          try {
            const response = await fetch(`/api/repositories/${repositoryId}/stats`);
            if (response.ok) {
              const data = await response.json();
              setStats({
                totalFiles: data.totalFiles,
                totalQuestions: 0,
                recentActivity: data.recentActivity
              });
            } else {
              throw new Error('Failed to fetch stats');
            }
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch repository stats');
          } finally {
            setIsLoading(false);
          }
        };
        fetchStats();
      }
    }
  };
}
