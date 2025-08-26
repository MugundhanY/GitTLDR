'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import SmoothScrollProvider from '../SmoothScrollProvider';
import Navbar from '@/components/landing/Navbar';

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get error from URL if present
  useEffect(() => {
    const errorMessage = searchParams?.get('error');
    if (errorMessage) {
      setError(errorMessage);
    }
  }, [searchParams]);

  // Handle GitHub login
  const handleGitHubLogin = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/github');
      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Failed to get GitHub authentication URL');
      }
    } catch (error) {
      setError('Failed to start GitHub authentication process');
      setIsLoading(false);
    }
  };

  return (
    <SmoothScrollProvider>
      <div style={{ background: '#07090E', minHeight: '100vh', width: '100vw', scrollBehavior: 'smooth' }}>
        <Navbar />
        <section className="w-full flex flex-col items-center justify-center md:pt-44 pt-32 pb-16 px-4" style={{ position: 'relative' }}>
          {/* Content Wrapper */}
          <div className="relative z-10 w-full flex flex-col items-center">

            {/* Auth Card */}
            <div className="w-full max-w-md mx-auto">
              <div 
                className="bg-[#0c0e13] p-8 rounded-2xl w-full text-white space-y-6"
                style={{
                  boxShadow: 'rgba(255, 255, 255, 0.2) 0px 1px 1px 0px inset, rgba(255, 255, 255, 0.05) 0px -1px 2px 0px inset',
                }}
              >
                {/* Logo and Title */}
                <div className="text-center mb-6">
                  <Image
                    src="/GitTLDR_logo.png"
                    alt="GitTLDR Logo"
                    width={48}
                    height={48}
                    className="mx-auto mb-4"
                    draggable={false}
                  />
                  <h3 className="text-xl font-medium text-white mb-2">Continue with GitHub</h3>
                  <p className="text-white/60 text-sm">
                    Connect your GitHub account to access repository insights
                  </p>
                </div>

                {/* Error Display */}
                {error && (
                  <div 
                    className="p-4 rounded-xl mb-4"
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                    }}
                  >
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                {/* GitHub Login Button */}
                <button
                  onClick={handleGitHubLogin}
                  disabled={isLoading}
                  className="w-full py-3 px-4 font-medium text-base flex items-center justify-center rounded-xl transition-all duration-300"
                  style={{
                    backgroundColor: '#14161a',
                    color: isLoading ? '#9ca3af' : '#ffffff',
                    boxShadow: 'rgba(255,255,255,0.235) 0px 0.6px 3px -1.6px inset, rgba(255,255,255,0.192) 0px 2.2px 11.4px -3.3px inset',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                  }}
                  onMouseEnter={(e) => !isLoading && ((e.target as HTMLButtonElement).style.backgroundColor = '#1a1d23')}
                  onMouseLeave={(e) => !isLoading && ((e.target as HTMLButtonElement).style.backgroundColor = '#14161a')}
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Connecting...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24">
                        <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                      </svg>
                      Continue with GitHub
                    </span>
                  )}
                </button>

                {/* Privacy and Terms */}
                <div className="text-center pt-4">
                  <p className="text-xs text-white/40 mb-2">
                    By continuing, you agree to our
                  </p>
                  <div className="flex items-center justify-center gap-2 text-xs">
                    <Link 
                      href="/terms" 
                      className="text-white/60 hover:text-white transition-colors underline underline-offset-2"
                    >
                      Terms of Service
                    </Link>
                    <span className="text-white/30">•</span>
                    <Link 
                      href="/privacy" 
                      className="text-white/60 hover:text-white transition-colors underline underline-offset-2"
                    >
                      Privacy Policy
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Notice */}
            <div className="mt-8 text-center max-w-md">
              <div className="flex items-center justify-center gap-2 text-white/40 text-xs">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 4v5c0 5.25-3.5 9.25-7 10-3.5-.75-7-4.75-7-10V7l7-4z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 12.5l2 2 3-3"/>
                </svg>
                <span>Secure authentication via GitHub OAuth</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </SmoothScrollProvider>
  );
}