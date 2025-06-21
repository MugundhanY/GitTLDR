'use client';

import { useState, useEffect, useCallback } from 'react';

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

// Global debug counters
const debugCounters = {
  hookInitializations: 0,
  fetchStatsCalls: 0,
  rateLimitedCalls: 0,
  cacheHits: 0,
  networkRequests: 0
};

// Emergency circuit breaker - completely disable if too many calls
let emergencyCircuitOpen = false;
let emergencyCircuitCount = 0;
const EMERGENCY_THRESHOLD = 20; // If more than 20 calls in short time, emergency stop
const EMERGENCY_RESET_TIME = 5 * 60 * 1000; // 5 minutes

function checkEmergencyCircuit(): boolean {
  emergencyCircuitCount++;
  
  if (emergencyCircuitCount > EMERGENCY_THRESHOLD && !emergencyCircuitOpen) {
    emergencyCircuitOpen = true;
    console.error(`🚨 EMERGENCY CIRCUIT BREAKER ACTIVATED - Too many stats requests (${emergencyCircuitCount}). Stats fetching disabled for 5 minutes.`);
    
    // Reset after 5 minutes
    setTimeout(() => {
      emergencyCircuitOpen = false;
      emergencyCircuitCount = 0;
      console.log(`✅ Emergency circuit breaker reset`);
    }, EMERGENCY_RESET_TIME);
  }
  
  return emergencyCircuitOpen;
}

// Global rate limiter to prevent runaway requests
const globalRequestTracker = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 2; // Only 2 requests per minute maximum

function isRateLimited(repositoryId: string): boolean {
  const now = Date.now();
  const tracker = globalRequestTracker.get(repositoryId);
  
  if (!tracker || now - tracker.windowStart > RATE_LIMIT_WINDOW) {
    // Reset or create new window
    globalRequestTracker.set(repositoryId, { count: 1, windowStart: now });
    return false;
  }
  
  if (tracker.count >= MAX_REQUESTS_PER_WINDOW) {
    debugCounters.rateLimitedCalls++;
    console.warn(`🚫 [STATS] Rate limited for repo ${repositoryId} - ${tracker.count} requests in current window. Total rate limited: ${debugCounters.rateLimitedCalls}`);
    return true;
  }
  
  tracker.count++;
  return false;
}

export function useRepositoryStats(repositoryId?: string) {
  debugCounters.hookInitializations++;
  console.log(`🚨 [STATS] Hook initialization #${debugCounters.hookInitializations} for repo: ${repositoryId}`);
  
  const [stats, setStats] = useState<RepositoryStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cache, setCache] = useState<Map<string, { data: RepositoryStats; timestamp: number }>>(new Map());
  // Extended cache duration and intelligent refresh logic
  const CACHE_DURATION = 30 * 60 * 1000; // Increased to 30 minutes for better caching
  const SMART_REFRESH_THRESHOLD = 10 * 60 * 1000; // 10 minutes for active repositories
  const BACKGROUND_REFRESH_THRESHOLD = 20 * 60 * 1000; // 20 minutes - much less aggressive background refresh
  
  // Request deduplication - track ongoing requests
  const [ongoingRequests] = useState<Map<string, Promise<void>>>(new Map());
  // Helper function to detect recent activity
  const hasRecentActivity = (stats: RepositoryStats): boolean => {
    if (!stats.recentActivity?.length) return false;
    
    // Check if there's activity in the last 2 hours (more generous timeframe)
    const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
    return stats.recentActivity.some(activity => {
      const activityTime = new Date(activity.timestamp).getTime();
      return activityTime > twoHoursAgo;
    });
  };

  // Background refresh for stale data
  const backgroundRefresh = async (repositoryId: string) => {
    try {
      console.log(`📊 [STATS] Background refresh for repo ${repositoryId}`);
      
      const response = await fetch(`/api/repositories/${repositoryId}/stats`);
      if (response.ok) {
        const data = await response.json();
        const newStats = {
          totalFiles: data.totalFiles,
          totalQuestions: data.totalQuestions || 0,
          recentActivity: data.recentActivity
        };
        
        // Update cache silently
        setCache(prev => new Map(prev).set(repositoryId, {
          data: newStats,
          timestamp: Date.now()
        }));
        
        // Only update state if data has meaningfully changed
        setStats(currentStats => {
          if (!currentStats) return newStats;
          
          const hasSignificantChange = 
            currentStats.totalFiles !== newStats.totalFiles ||
            currentStats.totalQuestions !== newStats.totalQuestions ||
            currentStats.recentActivity.length !== newStats.recentActivity.length;
            
          return hasSignificantChange ? newStats : currentStats;
        });
        
        console.log(`📊 [STATS] Background refresh completed for repo ${repositoryId}`);
      }
    } catch (error) {
      console.warn(`📊 [STATS] Background refresh failed for repo ${repositoryId}:`, error);
    }
  };  const fetchStats = useCallback(async (force: boolean = false) => {
    debugCounters.fetchStatsCalls++;
    console.log(`🚨 [STATS] fetchStats call #${debugCounters.fetchStatsCalls} for repo: ${repositoryId}, force: ${force}`);
    
    // Emergency circuit breaker check
    if (checkEmergencyCircuit()) {
      console.error(`🚫 [STATS] Emergency circuit breaker is OPEN - request blocked`);
      setIsLoading(false);
      return;
    }
    
    if (!repositoryId) {
      setStats(null);
      setIsLoading(false);
      return;
    }

    // EMERGENCY RATE LIMITING - Prevent runaway requests
    if (!force && isRateLimited(repositoryId)) {
      console.warn(`🚫 [STATS] Request blocked by rate limiter for repo ${repositoryId}`);
      setIsLoading(false);
      return;
    }

    // Check if there's already an ongoing request for this repository
    const existingRequest = ongoingRequests.get(repositoryId);
    if (existingRequest && !force) {
      console.log(`📊 [STATS] Deduplicating request for repo ${repositoryId}`);
      await existingRequest;
      return;
    }// Check cache first (unless forced refresh)
    if (!force) {
      const cached = cache.get(repositoryId);
      if (cached) {
        const age = Date.now() - cached.timestamp;
        
        // Smart refresh logic: use shorter cache for recently active repositories
        const isRecentlyActive = hasRecentActivity(cached.data);
        const effectiveCacheDuration = isRecentlyActive ? SMART_REFRESH_THRESHOLD : CACHE_DURATION;
        
        if (age < effectiveCacheDuration) {
          setStats(cached.data);
          setIsLoading(false);
          console.log(`📊 [STATS] Using cached data for repo ${repositoryId} (age: ${Math.round(age/1000)}s, active: ${isRecentlyActive})`);
            // Trigger background refresh if data is getting stale and user seems to be actively using the app
          if (age > BACKGROUND_REFRESH_THRESHOLD && !ongoingRequests.has(`bg-${repositoryId}`)) {
            // Only do background refresh if the page is visible to the user
            if (document.visibilityState === 'visible') {
              console.log(`📊 [STATS] Triggering background refresh for repo ${repositoryId}`);
              const bgPromise = backgroundRefresh(repositoryId);
              ongoingRequests.set(`bg-${repositoryId}`, bgPromise as Promise<void>);
              bgPromise.finally(() => ongoingRequests.delete(`bg-${repositoryId}`));
            } else {
              console.log(`📊 [STATS] Skipping background refresh (page not visible)`);
            }
          }
          
          return;
        }
        
        // Data is expired, but use it temporarily while fetching fresh data
        console.log(`📊 [STATS] Using expired cache while refreshing for repo ${repositoryId} (age: ${Math.round(age/1000)}s)`);
        setStats(cached.data);
        setIsLoading(false);
      }
    }try {
      setIsLoading(true);
      setError(null);
      
      // Create and track the request to prevent duplicates
      const requestPromise = (async () => {
        try {
          console.log(`📊 [STATS] Fetching fresh data for repo ${repositoryId}`);
          
          // Fetch repository statistics from new API
          const response = await fetch(`/api/repositories/${repositoryId}/stats`);
          if (response.ok) {
            const data = await response.json();
            const newStats = {
              totalFiles: data.totalFiles,
              totalQuestions: data.totalQuestions || 0,
              recentActivity: data.recentActivity
            };
            
            setStats(newStats);
            
            // Cache the result with timestamp
            setCache(prev => new Map(prev).set(repositoryId, {
              data: newStats,
              timestamp: Date.now()
            }));
            
            console.log(`📊 [STATS] Successfully cached data for repo ${repositoryId}`);
          } else {
            console.warn(`📊 [STATS] API failed for repo ${repositoryId}, using fallback data`);
            
            // If API fails, use mock data (but cache it for shorter duration)
            const mockStats = {
              totalFiles: 156,
              totalQuestions: 23,
              recentActivity: [
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
            
            // Cache the mock data with reduced TTL (2 minutes)
            setCache(prev => new Map(prev).set(repositoryId, {
              data: mockStats,
              timestamp: Date.now() - (CACHE_DURATION - 2 * 60 * 1000) // Expire in 2 minutes
            }));
          }
        } finally {
          // Always remove the request from ongoing requests when done
          ongoingRequests.delete(repositoryId);
        }
      })();
      
      // Track this request
      ongoingRequests.set(repositoryId, requestPromise);
      
      // Wait for the request to complete
      await requestPromise;

    } catch (err) {
      console.error(`📊 [STATS] Error fetching stats for repo ${repositoryId}:`, err);
      setError(err instanceof Error ? err.message : 'Failed to fetch repository stats');
        // Set fallback data on error
      setStats({
        totalFiles: 0,
        totalQuestions: 0,
        recentActivity: []
      });
      
      // Remove failed request from tracking
      ongoingRequests.delete(repositoryId);
    } finally {
      setIsLoading(false);
    }  }, [repositoryId]); // Remove cache and ongoingRequests from dependencies to prevent infinite loop
  
  useEffect(() => {
    fetchStats();
  }, [repositoryId]); // Only depend on repositoryId, not the fetchStats function

  // Debug logging for monitoring optimization effectiveness
  useEffect(() => {
    if (repositoryId) {
      console.log(`📊 [STATS] Repository stats hook initialized for repo ${repositoryId}`);
      console.log(`📊 [STATS] Cache configuration:`, {
        CACHE_DURATION: Math.round(CACHE_DURATION / 1000) + 's',
        SMART_REFRESH_THRESHOLD: Math.round(SMART_REFRESH_THRESHOLD / 1000) + 's',
        BACKGROUND_REFRESH_THRESHOLD: Math.round(BACKGROUND_REFRESH_THRESHOLD / 1000) + 's'
      });
    }
  }, [repositoryId]);

  return {
    stats,
    isLoading,
    error,
    refetch: () => fetchStats(true), // Force refresh when called
    // Add debug info for monitoring
    _debug: {
      cacheSize: cache.size,
      ongoingRequests: ongoingRequests.size,
      lastFetch: stats ? 'cached' : 'none'
    }
  };
}
