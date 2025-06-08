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
  addRepository: (repoUrl: string) => Promise<void>;
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
      }
    } else if (repositories.length > 0 && !selectedRepository) {
      // Auto-select first repository if none selected
      setSelectedRepository(repositories[0]);
    }
  }, [repositories]);

  const refreshRepositories = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // TODO: Replace with actual API call
      const response = await fetch('/api/repositories');
      if (!response.ok) {
        throw new Error('Failed to fetch repositories');
      }
        const data = await response.json();
      setRepositories(data.repositories || []);
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
      setRepositories(prev => [...prev, newRepo]);
      setSelectedRepository(newRepo);
      localStorage.setItem('selectedRepositoryId', newRepo.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add repository');
      throw err;
    }
  };

  const value: RepositoryContextType = {
    selectedRepository,
    repositories,
    isLoading,
    error,
    selectRepository,
    refreshRepositories,
    addRepository,
  };

  return (
    <RepositoryContext.Provider value={value}>
      {children}
    </RepositoryContext.Provider>
  );
};
