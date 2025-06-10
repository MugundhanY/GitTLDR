'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

interface Repository {
  id: string;
  name: string;
  private: boolean;
  language: string;
  stars: number;
  issues: number;
}

interface HeaderProps {
  selectedRepo?: Repository;
  onRepoChange?: (repo: Repository) => void;
  repositories?: Repository[];
}

export function Header({ selectedRepo, onRepoChange, repositories = [] }: HeaderProps) {
  const [showRepoDropdown, setShowRepoDropdown] = useState(false);

  return (
    <header className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between border-b border-gray-800">
      {/* Left side - Logo and Project Selector */}
      <div className="flex items-center space-x-6">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
          </div>
          <span className="ml-3 text-xl font-bold">GitTLDR</span>
        </Link>

        {/* Repository Selector */}
        {selectedRepo && (
          <div className="relative">
            <button
              onClick={() => setShowRepoDropdown(!showRepoDropdown)}
              className="flex items-center space-x-3 bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors border border-gray-700"
            >
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${selectedRepo.private ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                <span className="font-medium">{selectedRepo.name}</span>
                {selectedRepo.private && (
                  <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown */}
            {showRepoDropdown && (
              <div className="absolute top-full left-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
                <div className="p-3 border-b border-gray-700">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-300">Switch repository</span>
                    <button 
                      onClick={() => setShowRepoDropdown(false)}
                      className="text-gray-400 hover:text-gray-200"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div className="max-h-64 overflow-y-auto">
                  {repositories.map((repo) => (
                    <button
                      key={repo.id}
                      onClick={() => {
                        onRepoChange?.(repo);
                        setShowRepoDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-700 transition-colors border-b border-gray-700 last:border-b-0 ${
                        selectedRepo.id === repo.id ? 'bg-gray-700' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${repo.private ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                          <div>
                            <div className="font-medium text-white">{repo.name}</div>                            <div className="text-sm text-gray-400 flex items-center space-x-3">
                              <span>{repo.language}</span>
                              <span>⭐ {repo.stars}</span>
                              <span>{repo.issues} issues</span>
                            </div>
                          </div>
                        </div>
                        {repo.private && (
                          <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
                
                <div className="p-3 border-t border-gray-700">
                  <Link href="/repositories">
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm">
                      + Add Repository
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right side - Search and User */}
      <div className="flex items-center space-x-4">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search repositories, files..."
            className="w-80 bg-gray-800 border border-gray-700 text-white px-4 py-2 pl-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="text-gray-400 text-xs absolute right-3 top-3">⌘K</span>
        </div>

        {/* Notifications */}
        <button className="relative p-2 text-gray-400 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 7h5l5-5v5z" />
          </svg>
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
        </button>

        {/* User Menu */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
            <span className="text-white font-medium text-sm">U</span>
          </div>
          <button className="text-gray-400 hover:text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
