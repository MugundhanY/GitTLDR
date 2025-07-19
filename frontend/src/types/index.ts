

// User and Settings types
export interface UserSettings {
  profile: {
    id: string
    name: string
    email: string
    avatar?: string
    bio?: string
    location?: string
    company?: string
    website?: string
    github?: string
    githubLogin?: string
    publicRepos?: number
    followers?: number
    following?: number
    githubCreatedAt?: string
    twitter?: string
    linkedin?: string
    joinedAt: string
  }
  stats: {
    repositories: number
    repositoryCount?: number
    meetings: number
    qaQuestions: number
    credits: number
    currentCredits?: number
    totalCreditsUsed?: number
    recentTransactions?: number
    lastActive: string
  }
  preferences: {
    theme: 'light' | 'dark' | 'system'
    language: string
    timezone: string
    notifications: {
      email: boolean
      push: boolean
      meetings: boolean
      qa: boolean
      system: boolean
    }
  }
  security: {
    twoFactorEnabled: boolean
    lastPasswordChange: string
    lastLogin?: string
    activeSessions: number
  }
}

// File types
export interface RepositoryFile {
  id: string
  path: string
  name: string
  type: 'file' | 'directory'
  size: number
  content?: string
  summary?: string
  language?: string
  embedding_id?: string
}
