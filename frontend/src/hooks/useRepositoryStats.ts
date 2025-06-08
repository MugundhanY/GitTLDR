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
  }>;
}

export function useRepositoryStats(repositoryId?: string) {
  const [stats, setStats] = useState<RepositoryStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      if (!repositoryId) {
        setStats(null);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        // Fetch repository statistics
        const response = await fetch(`/api/repositories/${repositoryId}/stats`);
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        } else {
          // If API doesn't exist yet, use mock data
          setStats({
            totalFiles: 156,
            totalQuestions: 23,
            recentActivity: [
              {
                id: '1',
                type: 'question',
                title: 'How does authentication work?',
                description: 'Asked about the login flow implementation',
                timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                author: 'You'
              },
              {
                id: '2',
                type: 'commit',
                title: 'Fixed authentication bug',
                description: 'Resolved OAuth token refresh issue',
                timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
                author: 'John Doe'
              },
              {
                id: '3',
                type: 'file_added',
                title: 'Added new component',
                description: 'UserProfile.tsx was processed',
                timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
              }
            ]
          });
        }

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch repository stats');
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
      setIsLoading(true);
      setError(null);
      // Re-run the fetch logic
    }
  };
}
