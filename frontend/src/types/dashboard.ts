export interface Repository {
  id: string;
  name: string;
  fullName: string;
  owner: string;
  url: string;
  description?: string;
  language?: string;
  stars: number;
  forks: number;
  isPrivate: boolean;
  processed: boolean;
  status: string;
  summary?: string;
  fileCount: number;
  commitCount: number;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
  isShared: boolean;
  permission: 'OWNER' | 'READ' | 'WRITE';
  creditsUsed?: number;
}

export interface DraggedCard {
  id: string;
  size: 'small' | 'medium' | 'large' | 'wide';
  order: number;
}

export interface CardPosition {
  id: string;
  row: number;
  col: number;
  width: number;
  height: number;
}

export interface DashboardStats {
  repositories: number;
  totalCommits: number;
  activeProjects: number;
  aiAnalyses: number;
  meetings: number;
  questions: number;
  creditsUsed: number;
  creditsRemaining: number;
}

export interface RecentActivity {
  id: string;
  type: 'commit' | 'analysis' | 'meeting' | 'question' | 'webhook';
  title: string;
  description: string;
  details: string;
  timestamp: string;
  time: string;
  status: 'completed' | 'processing' | 'failed';
  repository?: string;
  author?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar: string;
  avatarUrl?: string;
  role: string;
  repositories: number;
  commits: number;
  lastActivity: string;
  status: 'online' | 'offline' | 'away';
}

export interface SharedRepository {
  id: string;
  name: string;
  fullName: string;
  description?: string;
  language?: string;
  stars: number;
  forks: number;
  isPrivate: boolean;
  processed: boolean;
  status: string;
  summary?: string;
  fileCount: number;
  commitCount: number;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
  isShared: boolean;
  permission: 'OWNER' | 'READ' | 'WRITE';
  creditsUsed?: number;
  sharedBy: string;
  sharedAt: string;
  owner: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
  stats: {
    files: number;
    meetings: number;
    questions: number;
  };
}
