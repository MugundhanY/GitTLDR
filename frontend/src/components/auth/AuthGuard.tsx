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
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    // Only redirect if we're sure the user is not authenticated
    if (!isLoading && requireAuth && !userData && !hasRedirected) {
      console.log('🚨 AuthGuard: User not authenticated, redirecting to /auth');
      setHasRedirected(true);
      router.push('/auth');
    }
  }, [userData, isLoading, requireAuth, router, hasRedirected]);

  // Show optimistic loading only for a short time
  if (isLoading && !hasRedirected) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-3"></div>
          <p className="text-slate-600 dark:text-slate-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // If authentication is required and user is not authenticated, show loading until redirect
  if (requireAuth && !userData && !hasRedirected) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-3"></div>
          <p className="text-slate-600 dark:text-slate-400 text-sm">Authenticating...</p>
        </div>
      </div>
    );
  }

  // If we've redirected, don't render anything
  if (hasRedirected) {
    return null;
  }

  // If authentication is not required or user is authenticated, render children
  return <>{children}</>;
}
