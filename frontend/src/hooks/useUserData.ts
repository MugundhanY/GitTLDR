'use client';

import { useState, useEffect } from 'react';

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

export function useUserData() {  const [userData, setUserData] = useState<UserData | null>(null);
  const [billingData, setBillingData] = useState<BillingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch user data from API        console.log('🔍 Fetching user data from /api/user...');
        const userResponse = await fetch('/api/user');
        console.log('📡 User API response status:', userResponse.status);
        
        if (!userResponse.ok) {
          console.log('❌ User API failed:', userResponse.status, userResponse.statusText);
          if (userResponse.status === 401) {
            console.log('🚨 Unauthorized - user needs to login');
            setUserData(null);
            setIsLoading(false);
            return;
          }
        }if (userResponse.ok) {
          const userResult = await userResponse.json();
          console.log('✅ User API response data:', userResult);          if (userResult && userResult.user && userResult.user.id) {
            console.log('👤 Setting user data:', userResult.user);
            setUserData({
              id: userResult.user.id,
              name: userResult.user.name || 'Unknown User',
              email: userResult.user.email || 'No email',
              avatarUrl: userResult.user.avatarUrl,
              githubLogin: userResult.user.githubLogin,
              credits: userResult.user.credits || 0
            });          } else {
            console.log('⚠️ Invalid user data format, no fallback provided');
            setUserData(null);
          }        } else {
          // If user API fails, no fallback data
          console.warn('❌ User API failed. Status:', userResponse.status);
          const errorText = await userResponse.text();
          console.warn('❌ Error response:', errorText);
          setUserData(null);
        }

        // Fetch billing data which includes credits
        console.log('🔍 Fetching billing data from /api/billing...');
        const billingResponse = await fetch('/api/billing');
        console.log('📡 Billing API response status:', billingResponse.status);
          if (billingResponse.ok) {
          const billing = await billingResponse.json();
          console.log('✅ Billing API response data:', billing);
          setBillingData(billing);
          
          // Update user credits from billing data if available and different
          if (billing?.subscription?.credits !== undefined) {
            console.log('💰 Updating credits from billing data:', billing.subscription.credits);
            setUserData(prev => prev ? { ...prev, credits: billing.subscription.credits } : prev);
          }
        } else {
          console.log('⚠️ Billing API failed, keeping user credits from user API');
        }

      } catch (err) {        console.error('💥 Error fetching user data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch user data');
        setUserData(null);
      } finally {
        setIsLoading(false);
        console.log('✅ User data fetch completed');
      }
    };

    fetchUserData();
  }, []);
  const refetch = async () => {
    try {
      setIsLoading(true);
      setError(null);      // Fetch user data from API
      const userResponse = await fetch('/api/user');
      if (userResponse.ok) {
        const userResult = await userResponse.json();        if (userResult && userResult.user && userResult.user.id) {
          setUserData({
            id: userResult.user.id,
            name: userResult.user.name || 'Unknown User',
            email: userResult.user.email || 'No email',
            avatarUrl: userResult.user.avatarUrl,
            githubLogin: userResult.user.githubLogin,
            credits: userResult.user.credits || 0
          });
        }} else {
        // If user API fails, no fallback data
        console.warn('User API failed');
        setUserData(null);
      }// Fetch billing data which includes credits
      const billingResponse = await fetch('/api/billing');
      if (billingResponse.ok) {
        const billing = await billingResponse.json();
        setBillingData(billing);
        
        // Update user credits from billing data if available
        if (billing?.subscription?.credits !== undefined) {
          setUserData(prev => prev ? { ...prev, credits: billing.subscription.credits } : prev);
        }
      }    } catch (err) {
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
