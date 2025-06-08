// User types
export interface User {
  id: string
  email: string
  name: string
  avatar_url?: string
  github_id: string
  credits: number
  created_at: string
  updated_at: string
}

// Repository types
export interface Repository {
  id: string
  name: string
  full_name: string
  owner: string
  url: string
  description?: string
  language?: string
  stars: number
  forks: number
  is_private: boolean
  processed: boolean
  summary?: string
  embedding_status: 'pending' | 'processing' | 'completed' | 'failed'
  created_at: string
  updated_at: string
}

// Commit types
export interface Commit {
  id: string
  sha: string
  message: string
  author: {
    name: string
    email: string
    avatar_url?: string
  }
  timestamp: string
  url: string
  summary?: string
  files_changed: number
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

// Q&A types
export interface Question {
  id: string
  query: string
  answer: string
  relevant_files: RepositoryFile[]
  confidence_score: number
  created_at: string
}

// Embedding types
export interface Embedding {
  id: string
  file_id: string
  vector: number[]
  metadata: Record<string, any>
  created_at: string
}

// API Response types
export interface APIResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Billing types
export interface CreditPack {
  id: string
  name: string
  credits: number
  price: number
  description: string
  popular?: boolean
}

export interface Transaction {
  id: string
  user_id: string
  type: 'purchase' | 'usage'
  credits: number
  description: string
  created_at: string
}

// Meeting types
export interface Meeting {
  id: string
  title: string
  transcript?: string
  audio_url?: string
  summary?: string
  status: 'uploaded' | 'processing' | 'completed' | 'failed'
  created_at: string
}

// Component Props types
export interface ButtonProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  onClick?: () => void
  className?: string
}

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

// Form types
export interface LoginForm {
  email: string
  password: string
}

export interface SignupForm {
  email: string
  password: string
  confirmPassword: string
  name: string
}
