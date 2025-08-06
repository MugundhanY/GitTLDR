'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

export default function AuthPage() {
  const { theme, setTheme, actualTheme } = useTheme();
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-emerald-100 dark:from-slate-900 dark:via-slate-800 dark:to-emerald-950 relative overflow-hidden">
      {/* Theme Toggle Button */}
      <div className="absolute top-6 right-6 z-20">
        <div className="flex items-center gap-2 bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 rounded-full px-3 py-1 shadow-md">
          <button
            aria-label="Light theme"
            className={`p-1 rounded-full transition-colors ${theme === 'light' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : 'text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-300'}`}
            onClick={() => theme !== 'light' && setTheme('light')}
          >
            <SunIcon className="w-5 h-5" />
          </button>
          <button
            aria-label="Dark theme"
            className={`p-1 rounded-full transition-colors ${theme === 'dark' ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300' : 'text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-300'}`}
            onClick={() => theme !== 'dark' && setTheme('dark')}
          >
            <MoonIcon className="w-5 h-5" />
          </button>
          <button
            aria-label="System theme"
            className={`p-1 rounded-full transition-colors ${theme === 'system' ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300' : 'text-slate-400 dark:text-slate-500 hover:text-purple-600 dark:hover:text-purple-300'}`}
            onClick={() => theme !== 'system' && setTheme('system')}
          >
            <ComputerDesktopIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
      {/* Animated background blobs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-gradient-to-br from-blue-400/30 via-purple-400/20 to-emerald-400/20 rounded-full blur-3xl animate-pulse-slow z-0" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-gradient-to-tr from-emerald-400/20 via-blue-400/10 to-purple-400/10 rounded-full blur-2xl animate-pulse-slower z-0" />
      <div className="max-w-md w-full space-y-8 p-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-slate-700/40 relative z-10">
        <div className="flex flex-col items-center text-center">
          <Image
            src="/GitTLDR_logo.png"
            alt="GitTLDR Logo"
            width={60}
            height={64}
            className="mb-4 drop-shadow-xl animate-fade-in"
            draggable={false}
          />
          <h2 className="text-4xl font-extrabold bg-gradient-to-r from-blue-700 via-purple-700 to-emerald-600 bg-clip-text text-transparent mb-2 animate-fade-in">
            Welcome to GitTLDR
          </h2>
          <p className="text-base text-slate-600 dark:text-slate-300 font-medium animate-fade-in delay-100">
            AI-powered repository summarization, code insights, and team collaboration
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 animate-fade-in">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="mt-8 space-y-6">
          <button
            onClick={handleGitHubLogin}
            disabled={isLoading}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-base font-semibold rounded-xl text-white bg-gradient-to-r from-black via-gray-900 to-gray-800 hover:from-gray-900 hover:to-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 shadow-lg transition-all duration-200 animate-fade-in delay-200"
          >
            {isLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : (
              <span className="flex items-center">
                <svg className="w-5 h-5 mr-2" aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
                Continue with GitHub
              </span>
            )}
          </button>
        </div>

        <div className="mt-6 animate-fade-in delay-300">
          <div className="relative">
            <div className="absolute inset-15 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
            </div>
            <div className="relative flex justify-center">
              <div className="flex items-center gap-3 px-3 py-2 rounded-full bg-gradient-to-r from-blue-100/60 via-purple-100/40 to-emerald-100/60 dark:from-blue-900/30 dark:via-purple-900/20 dark:to-emerald-900/30 shadow border border-slate-200 dark:border-slate-800">
                <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 4v5c0 5.25-3.5 9.25-7 10-3.5-.75-7-4.75-7-10V7l7-4z"/><path strokeLinecap="round" strokeLinejoin="round" d="M9.5 12.5l2 2 3-3"/></svg>
                <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">By continuing, you agree to our</span>
                <span className="flex items-center gap-1">
                  <Link href="/terms" className="font-semibold text-xs sm:text-sm text-blue-700 dark:text-blue-300 hover:text-emerald-600 underline underline-offset-2 transition-colors">Terms</Link>
                  <span className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />
                  <Link href="/privacy" className="font-semibold text-xs sm:text-sm text-blue-700 dark:text-blue-300 hover:text-emerald-600 underline underline-offset-2 transition-colors">Privacy</Link>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center animate-fade-in delay-500">
          <p className="text-xs text-slate-400 dark:text-slate-500">&copy; {new Date().getFullYear()} GitTLDR. All rights reserved.</p>
        </div>
      </div>
      {/* Custom CSS for subtle fade-in and pulse animations */}
      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: none; }
        }
        .animate-fade-in {
          animation: fade-in 0.7s cubic-bezier(0.4,0,0.2,1) both;
        }
        .animate-fade-in.delay-100 { animation-delay: 0.1s; }
        .animate-fade-in.delay-200 { animation-delay: 0.2s; }
        .animate-fade-in.delay-300 { animation-delay: 0.3s; }
        .animate-fade-in.delay-500 { animation-delay: 0.5s; }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 6s ease-in-out infinite;
        }
        @keyframes pulse-slower {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.8; }
        }
        .animate-pulse-slower {
          animation: pulse-slower 12s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}