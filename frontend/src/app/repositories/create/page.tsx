'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthGuard from '@/components/auth/AuthGuard';
import { ArrowLeftIcon, CodeBracketIcon } from '@heroicons/react/24/outline';
import { useUserData } from '@/hooks/useUserData';
import { useRepository } from '@/contexts/RepositoryContext';

// Import all components
import CreditWarning from './CreditWarning';
import TabNavigation from './TabNavigation';
import URLTab from './URLTab';
import { BrowseTab } from './BrowseTab';
import { GitHubRepo, CreditCheck, TabType } from './types';

export default function CreateRepositoryPage() {
  const router = useRouter();
  const { userData, isLoading: userLoading } = useUserData();  const { addRepositoryFromData, repositories: existingRepositories, selectRepository } = useRepository();
  
  // State management
  const [githubUrl, setGithubUrl] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [repoData, setRepoData] = useState<GitHubRepo | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isCheckingCredits, setIsCheckingCredits] = useState(false);
  const [creditCheck, setCreditCheck] = useState<CreditCheck | null>(null);
  const [checkedRepos, setCheckedRepos] = useState<Map<string, CreditCheck>>(new Map());
  const [searchTerm, setSearchTerm] = useState('');
  const [githubRepos, setGithubRepos] = useState<GitHubRepo[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [hasAccessToken, setHasAccessToken] = useState(false);
  const [publicOnly, setPublicOnly] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('url');
  // Handle opening existing repository
  const handleOpenRepository = (repo: GitHubRepo) => {
    // Find the existing repository and navigate to its page
    const existingRepo = existingRepositories.find(existing => 
      existing.full_name.toLowerCase() === repo.full_name.toLowerCase()
    );
    if (existingRepo) {
      // Select this repository in the context
      selectRepository(existingRepo);
      // Navigate to dashboard with the selected repository
      router.push('/dashboard');
    }
  };

  // Credit checking functions
  const checkCreditsForRepo = useCallback(async (repo: GitHubRepo) => {
    const repoKey = `${repo.owner.login}/${repo.name}`;
    
    // If already checked, return cached result
    if (checkedRepos.has(repoKey)) {
      return checkedRepos.get(repoKey)!;
    }

    setIsCheckingCredits(true);
    try {
      const response = await fetch('/api/repositories/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          owner: repo.owner.login,
          repo: repo.name,
        }),
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Handle 404 as a special case - try to get the error response
          try {
            const errorData = await response.json();
            if (errorData.fileCount !== undefined) {
              // API returned structured error data, use it
              const result = {
                fileCount: errorData.fileCount,
                creditsNeeded: errorData.creditsNeeded,
                hasEnoughCredits: errorData.hasEnoughCredits,
                userCredits: errorData.userCredits,
                isPrivateOrNotFound: true
              };
              setCheckedRepos(prev => new Map(prev.set(repoKey, result)));
              return result;
            }
          } catch (e) {
            // Fallback if parsing fails
          }
          
          throw new Error('Repository not found or is private and requires authentication');
        }
        throw new Error(`Failed to check repository: ${response.status}`);
      }

      const result = await response.json();
      
      // Cache the result
      setCheckedRepos(prev => new Map(prev.set(repoKey, result)));
      
      return result;
    } catch (error) {
      console.error('Error checking credits:', error);
      // Return conservative fallback values
      const fallbackResult = {
        fileCount: 20,
        creditsNeeded: 20,
        hasEnoughCredits: (userData?.credits || 0) >= 20,
        userCredits: userData?.credits || 0,
        isEstimate: true
      };
      setCheckedRepos(prev => new Map(prev.set(repoKey, fallbackResult)));
      return fallbackResult;
    } finally {
      setIsCheckingCredits(false);
    }
  }, [userData?.credits, checkedRepos]);
  const checkCreditsForUrl = useCallback(async (repoData: GitHubRepo) => {
    // Check if repository already exists
    const isExisting = existingRepositories.some(existing => 
      existing.full_name.toLowerCase() === repoData.full_name.toLowerCase()
    );
    
    // Skip credit checking for existing repositories
    if (isExisting) {
      setCreditCheck(null);
      return null;
    }
    
    setCreditCheck(null);
    setIsCheckingCredits(true);
    
    try {
      const response = await fetch('/api/repositories/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          githubUrl: repoData.html_url,
        }),
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Repository not found or is private and requires authentication');
        }
        throw new Error(`Failed to check repository: ${response.status}`);
      }

      const result = await response.json();
      setCreditCheck(result);
      return result;
    } catch (error) {
      console.error('Error checking credits:', error);
      const fallbackResult = {
        fileCount: 20,
        creditsNeeded: 20,
        hasEnoughCredits: (userData?.credits || 0) >= 20,
        userCredits: userData?.credits || 0,
        isEstimate: true
      };
      setCreditCheck(fallbackResult);
      return fallbackResult;    } finally {
      setIsCheckingCredits(false);
    }
  }, [userData?.credits, existingRepositories]);

  // GitHub URL validation
  const validateGitHubUrl = useCallback(async (url: string) => {
    if (!url.trim()) {
      setValidationError('');
      setRepoData(null);
      return;
    }

    // Basic URL validation
    const githubUrlPattern = /^https:\/\/github\.com\/([^\/]+)\/([^\/]+)\/?$/;
    const match = url.match(githubUrlPattern);
    
    if (!match) {
      setValidationError('Please enter a valid GitHub repository URL (e.g., https://github.com/owner/repo)');
      setRepoData(null);
      return;
    }

    setIsValidating(true);
    setValidationError('');

    try {
      const [, owner, repo] = match;
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setValidationError('Repository not found or is private');
        } else {
          setValidationError('Failed to fetch repository information');
        }
        setRepoData(null);
        return;
      }

      const data: GitHubRepo = await response.json();
      setRepoData(data);
      setValidationError('');
    } catch (error) {
      setValidationError('Failed to validate repository URL');
      setRepoData(null);
    } finally {
      setIsValidating(false);
    }
  }, []);

  // Load user repositories from GitHub
  const loadUserRepositories = useCallback(async () => {
    if (!userData?.githubLogin) {
      return;
    }

    setIsLoadingRepos(true);
    try {
      const response = await fetch(`/api/github/repos`);
      
      if (response.ok) {
        const data = await response.json();
        
        // Handle new response format
        if (data.repositories) {
          setGithubRepos(data.repositories);
          setHasAccessToken(data.hasAccessToken);
          setPublicOnly(data.publicOnly);
        } else {
          // Fallback for old format
          setGithubRepos(data);
          setHasAccessToken(false);
          setPublicOnly(true);
        }
      } else {
        console.error('GitHub API error:', response.status, response.statusText);
        setGithubRepos([]);
        setHasAccessToken(false);
        setPublicOnly(true);
      }
    } catch (error) {
      console.error('Failed to load GitHub repositories:', error);
      setGithubRepos([]);
      setHasAccessToken(false);
      setPublicOnly(true);
    } finally {
      setIsLoadingRepos(false);
    }
  }, [userData?.githubLogin]);

  // Effects
  React.useEffect(() => {
    if (activeTab === 'browse' && userData?.githubLogin) {
      loadUserRepositories();
    }
  }, [activeTab, userData?.githubLogin, loadUserRepositories]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setCreditCheck(null);
      validateGitHubUrl(githubUrl);
    }, 500);

    return () => clearTimeout(timer);
  }, [githubUrl, validateGitHubUrl]);

  // Repository addition handler
  const handleAddRepository = async (repo: GitHubRepo, creditsNeeded?: number) => {
    // Get credits needed - either from parameter or check the repo
    let actualCreditsNeeded = creditsNeeded ?? 0;
    if (actualCreditsNeeded === 0) {
      const creditCheck = await checkCreditsForRepo(repo);
      actualCreditsNeeded = creditCheck.creditsNeeded;
    }

    // Allow empty repositories (0 credits needed)
    if (actualCreditsNeeded > 0 && (!userData?.credits || userData.credits < actualCreditsNeeded)) {
      setValidationError(`Insufficient credits. You need ${actualCreditsNeeded} credits to add this repository.`);
      return;
    }

    setIsAdding(true);
    try {
      const response = await fetch('/api/repositories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },        body: JSON.stringify({
          name: repo.name,
          fullName: repo.full_name,
          owner: repo.owner.login,
          url: repo.html_url,
          description: repo.description,
          language: repo.language,
          stars: repo.stargazers_count,
          forks: repo.forks_count || 0,
          watchers_count: repo.watchers_count || 0,
          avatar_url: repo.owner.avatar_url || '',
          isPrivate: repo.private,
          creditsNeeded: actualCreditsNeeded,
        }),
      });      if (response.ok) {
        const result = await response.json();
        // Add the repository to context and select it
        const newRepo = addRepositoryFromData(result);
        selectRepository(newRepo);
        // Navigate to dashboard with the selected repository
        router.push('/dashboard');
      } else {
        const error = await response.json();
        setValidationError(error.error || 'Failed to add repository');
      }
    } catch (error) {
      setValidationError('Failed to add repository');
    } finally {
      setIsAdding(false);
    }
  };

  // Filtered repositories for search
  const filteredRepos = githubRepos.filter(repo =>
    repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (repo.description && repo.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  if (userLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          {/* Professional loading indicator */}
          <div className="relative mx-auto mb-6 w-16 h-16">
            <div className="absolute inset-0 border-[3px] border-slate-200 dark:border-slate-700 rounded-full"></div>
            <div className="absolute inset-0 border-[3px] border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            
            {/* Inner pulsing circle */}
            <div className="absolute inset-3 bg-emerald-500/20 rounded-full animate-pulse"></div>
            
            {/* Repository icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <CodeBracketIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Initializing GitTLDR
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Preparing your workspace for repository analysis...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard requireAuth={true}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">        {/* Enhanced Header */}
        <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">              <div className="flex items-center space-x-4">
                <Link 
                  href="/dashboard"
                  className="inline-flex items-center space-x-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors group"
                >
                  <ArrowLeftIcon className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                  <span className="text-sm font-medium">Back to Dashboard</span>
                </Link>
                <div className="h-4 w-px bg-slate-300 dark:bg-slate-600"></div>
                <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
                  Add Repository
                </h1>
              </div>
              
              {/* Credits Display */}
              <div className="flex items-center space-x-3">
                <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-slate-600 dark:text-slate-400">Credits:</span>
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    {userData?.credits || 0}
                  </span>
                </div>
                
                {/* Mobile Credits */}
                <div className="sm:hidden flex items-center space-x-2 px-2 py-1 bg-slate-50 dark:bg-slate-700 rounded-md">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  <span className="text-xs font-medium text-slate-900 dark:text-white">
                    {userData?.credits || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">          {/* Credit Warning */}
          <CreditWarning credits={userData?.credits || 0} setActiveTab={setActiveTab} />

          {/* Tab Navigation */}
          <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />

          {/* Tab Content */}
          <div className="space-y-8">            {activeTab === 'url' ? (
              <URLTab
                githubUrl={githubUrl}
                setGithubUrl={setGithubUrl}
                isValidating={isValidating}
                validationError={validationError}
                repoData={repoData}
                isCheckingCredits={isCheckingCredits}
                creditCheck={creditCheck}
                checkCreditsForUrl={checkCreditsForUrl}
                handleAddRepository={handleAddRepository}
                isAdding={isAdding}
                existingRepositories={existingRepositories}
                onOpenRepository={handleOpenRepository}
              />
            ) : (<BrowseTab
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                publicOnly={publicOnly}
                isLoadingRepos={isLoadingRepos}
                githubRepos={githubRepos}
                filteredRepos={filteredRepos}
                handleAddRepository={handleAddRepository}
                checkCreditsForRepo={checkCreditsForRepo}
                checkedRepos={checkedRepos}
                isCheckingCredits={isCheckingCredits}
                isAdding={isAdding}
                setActiveTab={setActiveTab}
                existingRepositories={existingRepositories}
                onOpenRepository={handleOpenRepository}
              />
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
