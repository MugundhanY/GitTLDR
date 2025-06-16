'use client';

import { useState, useEffect } from 'react';
import { clientCache, CACHE_KEYS } from '@/lib/client-cache';

interface UserData {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  githubLogin?: string;
  credits: number;
}

interface BillingData {
  subscription: {
    id: string;
    status: 'active' | 'cancelled' | 'inactive';
    plan: 'free' | 'pro';
    currentPeriodEnd: string;
    credits: number;
    usageThisMonth: number;
  };
  invoices: Array<{
    id: string;
    amount: number;
    status: 'paid' | 'pending' | 'failed';
    date: string;
    downloadUrl: string;
  }>;
}

export function useUserData() {  
  // Initialize with cached data if available
  const [userData, setUserData] = useState<UserData | null>(() => {
    return clientCache.get<UserData>(CACHE_KEYS.USER_DATA);
  });
  const [billingData, setBillingData] = useState<BillingData | null>(() => {
    return clientCache.get<BillingData>(CACHE_KEYS.BILLING_DATA);
  });
  const [isLoading, setIsLoading] = useState(() => {
    return !clientCache.has(CACHE_KEYS.USER_DATA); // Only load if no cached data
  });
  const [error, setError] = useState<string | null>(null);  useEffect(() => {
    // If we have cached user data, don't fetch again
    if (userData) {
      console.log('[CACHE] Using cached user data');
      return;
    }

    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Only fetch user data from API - simplified single call
        console.log('[USER] Fetching user data from /api/user...');
        const userResponse = await fetch('/api/user', {
          // Add cache control for better performance
          headers: {
            'Cache-Control': 'max-age=300' // 5 minutes
          }
        });        
        console.log('[API] User API response status:', userResponse.status);
        
        if (!userResponse.ok) {
          console.log('[ERROR] User API failed:', userResponse.status, userResponse.statusText);
          if (userResponse.status === 401) {
            console.log('[AUTH] Unauthorized - user needs to login');
            setUserData(null);
            clientCache.delete(CACHE_KEYS.USER_DATA);
            setIsLoading(false);
            return;
          }
          throw new Error(`API error: ${userResponse.status}`);
        }

        const userResult = await userResponse.json();
        console.log('✅ User API response data:', userResult);          
        
        if (userResult && userResult.user && userResult.user.id) {
          const user = {
            id: userResult.user.id,
            name: userResult.user.name || 'Unknown User',
            email: userResult.user.email || 'No email',
            avatarUrl: userResult.user.avatarUrl,
            githubLogin: userResult.user.githubLogin,
            credits: userResult.user.credits || 0
          };
          
          console.log('👤 Setting user data:', user);
          setUserData(user);
          
          // Cache user data for 5 minutes
          clientCache.set(CACHE_KEYS.USER_DATA, user, 300);
          
          // Fetch billing data in background (non-blocking)
          fetchBillingData();
        } else {
          console.log('⚠️ Invalid user data format');
          setUserData(null);
          clientCache.delete(CACHE_KEYS.USER_DATA);
        }

      } catch (err) {        
        console.error('💥 Error fetching user data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch user data');
        setUserData(null);
        clientCache.delete(CACHE_KEYS.USER_DATA);
      } finally {        
        setIsLoading(false);
        console.log('[SUCCESS] User data fetch completed');
      }
    };

    // Background billing data fetch (non-blocking)
    const fetchBillingData = async () => {
      try {
        // Check if we have cached billing data
        const cachedBilling = clientCache.get<BillingData>(CACHE_KEYS.BILLING_DATA);
        if (cachedBilling) {
          setBillingData(cachedBilling);
          return;
        }

        console.log('[BILLING] Fetching billing data in background...');
        const billingResponse = await fetch('/api/billing');
        
        if (billingResponse.ok) {
          const billing = await billingResponse.json();
          console.log('✅ Billing API response data:', billing);
          setBillingData(billing);
          
          // Cache billing data for 10 minutes
          clientCache.set(CACHE_KEYS.BILLING_DATA, billing, 600);
          
          // Update user credits from billing data if available and different
          if (billing?.subscription?.credits !== undefined) {
            console.log('💰 Updating credits from billing data:', billing.subscription.credits);
            setUserData(prev => {
              if (prev) {
                const updated = { ...prev, credits: billing.subscription.credits };
                clientCache.set(CACHE_KEYS.USER_DATA, updated, 300);
                return updated;
              }
              return prev;
            });
          }
        }
      } catch (err) {
        console.log('⚠️ Billing API failed, keeping user credits from user API');
        // Don't set error state for billing failures - it's non-critical
      }
    };

    fetchUserData();
  }, [userData]); // Only depend on userData to prevent unnecessary refetches

  const refetch = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Clear cache before refetching
      clientCache.delete(CACHE_KEYS.USER_DATA);
      clientCache.delete(CACHE_KEYS.BILLING_DATA);
      
      // Fetch user data from API
      const userResponse = await fetch('/api/user');
      if (userResponse.ok) {
        const userResult = await userResponse.json();        
        if (userResult && userResult.user && userResult.user.id) {
          const user = {
            id: userResult.user.id,
            name: userResult.user.name || 'Unknown User',
            email: userResult.user.email || 'No email',
            avatarUrl: userResult.user.avatarUrl,
            githubLogin: userResult.user.githubLogin,
            credits: userResult.user.credits || 0
          };
          setUserData(user);
          clientCache.set(CACHE_KEYS.USER_DATA, user, 300);
        }
      } else {
        // If user API fails, no fallback data
        console.warn('User API failed');
        setUserData(null);
      }

      // Fetch billing data which includes credits
      const billingResponse = await fetch('/api/billing');
      if (billingResponse.ok) {
        const billing = await billingResponse.json();
        setBillingData(billing);
        clientCache.set(CACHE_KEYS.BILLING_DATA, billing, 600);
        
        // Update user credits from billing data if available
        if (billing?.subscription?.credits !== undefined) {
          setUserData(prev => {
            if (prev) {
              const updated = { ...prev, credits: billing.subscription.credits };
              clientCache.set(CACHE_KEYS.USER_DATA, updated, 300);
              return updated;
            }
            return prev;
          });
        }
      }
    } catch (err) {
      console.error('Error refetching user data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch user data');
      setUserData(null);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    userData,
    billingData,
    isLoading,
    error,
    refetch
  };
}
