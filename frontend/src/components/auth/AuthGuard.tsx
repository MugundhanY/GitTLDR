'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserData } from '@/hooks/useUserData';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

export default function AuthGuard({ children, requireAuth = true }: AuthGuardProps) {
  const { userData, isLoading } = useUserData();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      if (requireAuth && !userData) {
        // User is not authenticated, redirect to login
        console.log('🚨 AuthGuard: User not authenticated, redirecting to /auth');
        router.push('/auth');
        return;
      }
      setIsChecking(false);
    }
  }, [userData, isLoading, requireAuth, router]);

  // Show loading state while checking authentication
  if (isLoading || isChecking) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // If authentication is required and user is not authenticated, don't render children
  if (requireAuth && !userData) {
    return null;
  }

  // If authentication is not required or user is authenticated, render children
  return <>{children}</>;
}
