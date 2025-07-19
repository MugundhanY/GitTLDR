'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useRepository } from '@/contexts/RepositoryContext';
import { MagnifyingGlassIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

interface SearchResult {
  type: 'file' | 'question' | 'meeting';
  title: string;
  href: string;
  description: string;
  path?: string;
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { selectedRepository } = useRepository();
  const [query, setQuery] = useState(searchParams?.get('q') || '');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (query.trim()) {
      performSearch(query);
    } else {
      setResults([]);
    }
  }, [query, selectedRepository?.id]);

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim() || !selectedRepository?.id) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Search in multiple areas
      const [filesRes, questionsRes, meetingsRes] = await Promise.allSettled([
        fetch(`/api/repositories/${selectedRepository.id}/files?search=${encodeURIComponent(searchQuery)}`),
        fetch(`/api/qna?repositoryId=${selectedRepository.id}&search=${encodeURIComponent(searchQuery)}`),
        fetch(`/api/meetings?repositoryId=${selectedRepository.id}&search=${encodeURIComponent(searchQuery)}`)
      ]);

      const searchResults: SearchResult[] = [];

      // Add file results
      if (filesRes.status === 'fulfilled' && filesRes.value.ok) {
        const filesData = await filesRes.value.json();
        if (filesData.files) {
          searchResults.push(...filesData.files.map((file: any) => ({
            type: 'file' as const,
            title: file.name,
            path: file.path,
            href: `/files?file=${file.id}`,
            description: file.summary || `${file.language} file`
          })));
        }
      }

      // Add Q&A results
      if (questionsRes.status === 'fulfilled' && questionsRes.value.ok) {
        const questionsData = await questionsRes.value.json();
        if (questionsData.questions) {
          searchResults.push(...questionsData.questions.map((question: any) => ({
            type: 'question' as const,
            title: question.query,
            href: `/qna#question-${question.id}`,
            description: question.answer ? question.answer.substring(0, 100) + '...' : 'Q&A'
          })));
        }
      }

      // Add meeting results
      if (meetingsRes.status === 'fulfilled' && meetingsRes.value.ok) {
        const meetingsData = await meetingsRes.value.json();
        if (meetingsData.meetings) {
          searchResults.push(...meetingsData.meetings.map((meeting: any) => ({
            type: 'meeting' as const,
            title: meeting.title,
            href: `/meetings/${meeting.id}`,
            description: meeting.summary || 'Meeting recording'
          })));
        }
      }

      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    
    // Update URL without causing navigation
    const url = new URL(window.location.href);
    if (newQuery.trim()) {
      url.searchParams.set('q', newQuery);
    } else {
      url.searchParams.delete('q');
    }
    window.history.replaceState({}, '', url.toString());
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'file':
        return (
          <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'question':
        return (
          <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'meeting':
        return (
          <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50">
        <div className="px-4 py-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={handleInputChange}
                placeholder="Search files, meetings, Q&A..."
                className="w-full pl-10 pr-4 py-3 text-base border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
                autoFocus
              />
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="px-4 py-6">
        {!selectedRepository ? (
          <div className="text-center py-12">
            <p className="text-slate-500 dark:text-slate-400">
              Please select a repository to search
            </p>
          </div>
        ) : !query.trim() ? (
          <div className="text-center py-12">
            <MagnifyingGlassIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400">
              Start typing to search through files, meetings, and Q&A
            </p>
          </div>
        ) : isSearching ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-500 dark:text-slate-400">Searching...</p>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500 dark:text-slate-400">
              No results found for &quot;{query}&quot;
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              Found {results.length} result{results.length !== 1 ? 's' : ''} for &quot;{query}&quot;
            </p>
            
            {results.map((result, index) => (
              <Link
                key={index}
                href={result.href}
                className="block bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mt-1">
                    {getResultIcon(result.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-slate-900 dark:text-white truncate">
                        {result.title}
                      </h3>
                      <span className="flex-shrink-0 px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs font-medium rounded capitalize">
                        {result.type}
                      </span>
                    </div>
                    
                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-2">
                      {result.description}
                    </p>
                    
                    {result.path && (
                      <p className="text-xs text-slate-400 dark:text-slate-500 font-mono truncate">
                        {result.path}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
