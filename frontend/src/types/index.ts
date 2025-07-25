

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
    githubLogin?: string
    publicRepos?: number
    followers?: number
    following?: number
    githubCreatedAt?: string | Date
    joinedAt: string | Date
  }
  stats: {
    repositoryCount: number
    totalCreditsUsed: number
    currentCredits: number
    recentTransactions: number
  }
  preferences: {
    theme: 'light' | 'dark' | 'system'
    language: string
    dateFormat: string
    timeFormat: string
    notifications: boolean
    autoSave: boolean
    compactMode: boolean
  }
  security: {
    twoFactorEnabled: boolean
    sessionTimeout: number
    loginNotifications: boolean
    deviceTracking: boolean
    lastLogin?: string | Date
  }
  notifications: {
    email: {
      repositoryProcessing: boolean
      creditUpdates: boolean
      securityAlerts: boolean
      weeklyDigest: boolean
    }
    push: {
      repositoryProcessing: boolean
      creditLow: boolean
      mentions: boolean
    }
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
