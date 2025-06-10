'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Repository {
  id: string;
  name: string;
  full_name: string;
  private: boolean;
  language?: string;
  description?: string;
  html_url?: string;
  stargazers_count?: number;
  open_issues_count?: number;
  default_branch?: string;
  created_at?: string;
  updated_at?: string;
  owner?: {
    login: string;
    avatar_url: string;
  };
}

interface RepositoryContextType {
  selectedRepository: Repository | null;
  repositories: Repository[];
  isLoading: boolean;
  error: string | null;
  selectRepository: (repository: Repository) => void;
  refreshRepositories: () => Promise<void>;
  addRepository: (repoUrl: string) => Promise<Repository>;
  addRepositoryFromData: (repoData: any) => Repository;
}

const RepositoryContext = createContext<RepositoryContextType | undefined>(undefined);

export const useRepository = () => {
  const context = useContext(RepositoryContext);
  if (context === undefined) {
    throw new Error('useRepository must be used within a RepositoryProvider');
  }
  return context;
};

interface RepositoryProviderProps {
  children: ReactNode;
}

export const RepositoryProvider: React.FC<RepositoryProviderProps> = ({ children }) => {
  const [selectedRepository, setSelectedRepository] = useState<Repository | null>(null);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load repositories on mount
  useEffect(() => {
    refreshRepositories();
  }, []);
  // Load selected repository from localStorage on mount
  useEffect(() => {
    const savedRepoId = localStorage.getItem('selectedRepositoryId');
    if (savedRepoId && repositories.length > 0) {
      const repo = repositories.find(r => r.id === savedRepoId);
      if (repo) {
        setSelectedRepository(repo);
        return;
      }
    }
    
    // Auto-select first repository if none selected and repositories are available
    if (repositories.length > 0 && !selectedRepository) {
      const firstRepo = repositories[0];
      setSelectedRepository(firstRepo);
      localStorage.setItem('selectedRepositoryId', firstRepo.id);
    }
  }, [repositories, selectedRepository]);
  const refreshRepositories = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/repositories');
      if (!response.ok) {
        throw new Error('Failed to fetch repositories');
      }
      
      const data = await response.json();
      const apiRepositories = data.repositories || [];
      
      // Transform API data to match Repository interface
      const repositories: Repository[] = apiRepositories.map((repo: any) => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.fullName,
        private: repo.isPrivate,
        language: repo.language,
        description: repo.description,
        html_url: repo.url,
        stargazers_count: repo.stars || 0,
        open_issues_count: 0, // Not available from our API
        default_branch: 'main', // Default value
        created_at: repo.createdAt,
        updated_at: repo.updatedAt,
        owner: {
          login: repo.owner,
          avatar_url: 'https://github.com/github.png' // Default avatar
        }
      }));
      
      setRepositories(repositories);
    } catch (err) {
      // For now, use mock data if API fails
      console.warn('Failed to fetch repositories, using mock data:', err);
      const mockRepositories: Repository[] = [
        {
          id: '1',
          name: 'my-awesome-project',
          full_name: 'user/my-awesome-project',
          private: false,
          language: 'TypeScript',
          description: 'A really awesome project built with Next.js and TypeScript',
          stargazers_count: 42,
          open_issues_count: 3,
          default_branch: 'main',
          owner: {
            login: 'user',
            avatar_url: 'https://github.com/github.png'
          }
        },
        {
          id: '2',
          name: 'data-processing-pipeline',
          full_name: 'company/data-processing-pipeline',
          private: true,
          language: 'Python',
          description: 'ETL pipeline for processing large datasets',
          stargazers_count: 15,
          open_issues_count: 8,
          default_branch: 'main',
          owner: {
            login: 'company',
            avatar_url: 'https://github.com/github.png'
          }
        },
        {
          id: '3',
          name: 'mobile-app',
          full_name: 'team/mobile-app',
          private: true,
          language: 'Swift',
          description: 'iOS mobile application with React Native',
          stargazers_count: 28,
          open_issues_count: 12,
          default_branch: 'develop',
          owner: {
            login: 'team',
            avatar_url: 'https://github.com/github.png'
          }
        }
      ];
      setRepositories(mockRepositories);
      setError(null);
    } finally {
      setIsLoading(false);
    }
  };

  const selectRepository = (repository: Repository) => {
    setSelectedRepository(repository);
    localStorage.setItem('selectedRepositoryId', repository.id);
  };
  const addRepository = async (repoUrl: string) => {
    try {
      setError(null);
      
      // TODO: Replace with actual API call
      const response = await fetch('/api/repositories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: repoUrl }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to add repository');
      }
      
      const newRepo = await response.json();
      
      // Add to repositories list
      setRepositories(prev => [...prev, newRepo]);
      
      // Always select the newly added repository
      setSelectedRepository(newRepo);
      localStorage.setItem('selectedRepositoryId', newRepo.id);
      
      return newRepo;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add repository');
      throw err;
    }  };

  const addRepositoryFromData = (repoData: any): Repository => {
    // Convert repository data from API response to our Repository format
    const newRepo: Repository = {
      id: repoData.repository?.id || repoData.id,
      name: repoData.repository?.name || repoData.name,
      full_name: repoData.repository?.fullName || repoData.fullName || repoData.full_name,
      private: repoData.repository?.isPrivate || repoData.isPrivate || repoData.private || false,
      language: repoData.repository?.language || repoData.language,
      description: repoData.repository?.description || repoData.description,
      html_url: repoData.repository?.url || repoData.url || repoData.html_url,
      stargazers_count: repoData.repository?.stars || repoData.stars || repoData.stargazers_count || 0,
      open_issues_count: repoData.repository?.openIssues || repoData.openIssues || repoData.open_issues_count || 0,
      created_at: repoData.repository?.createdAt || repoData.createdAt || repoData.created_at,
      updated_at: repoData.repository?.updatedAt || repoData.updatedAt || repoData.updated_at,
      owner: {
        login: repoData.repository?.owner || repoData.owner?.login || repoData.owner || 'unknown',
        avatar_url: repoData.owner?.avatar_url || 'https://github.com/github.png'
      }
    };
    
    // Add to repositories list
    setRepositories(prev => [...prev, newRepo]);
    
    // Always select the newly added repository
    setSelectedRepository(newRepo);
    localStorage.setItem('selectedRepositoryId', newRepo.id);
    
    return newRepo;
  };
  const value: RepositoryContextType = {
    selectedRepository,
    repositories,
    isLoading,
    error,
    selectRepository,
    refreshRepositories,
    addRepository,
    addRepositoryFromData,
  };

  return (
    <RepositoryContext.Provider value={value}>
      {children}
    </RepositoryContext.Provider>
  );
};
