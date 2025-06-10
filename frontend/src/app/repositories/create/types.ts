export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  stargazers_count: number;
  watchers_count: number;
  forks_count?: number;
  language: string | null;
  default_branch: string;
  updated_at: string;
  size?: number;
  owner: {
    login: string;
    avatar_url: string;
  };
}

export interface CreditCheck {
  fileCount: number;
  creditsNeeded: number;
  hasEnoughCredits: boolean;
  userCredits: number;
  isEstimate?: boolean;
  isEmpty?: boolean;
  isPrivateOrNotFound?: boolean;
}

export interface RepositoryItemProps {
  repo: GitHubRepo;
  onAddRepository: (repo: GitHubRepo, creditsNeeded?: number) => Promise<void>;
  checkCreditsForRepo: (repo: GitHubRepo) => Promise<CreditCheck>;
  checkedRepos: Map<string, CreditCheck>;
  isCheckingCredits: boolean;
  isAdding: boolean;
  isExisting?: boolean;
  onOpenRepository?: (repo: GitHubRepo) => void;
}

export type TabType = 'url' | 'browse';
