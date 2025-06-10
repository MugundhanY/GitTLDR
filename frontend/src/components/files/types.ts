// Types and interfaces for file components

export interface FileItem {
  id: string
  name: string
  type: 'file' | 'dir'
  path: string
  size?: number
  lastModified?: string
  language?: string
  summary?: string
  hasContent?: boolean
  downloadUrl?: string
}

export interface FileStats {
  totalFiles: number
  totalSize: number
  totalDirectories: number
  languages: Array<{ name: string; count: number }>
}

export interface RepositoryInfo {
  id: string
  name: string
  full_name: string
  description?: string
  status?: string
  processed?: boolean
  isProcessing?: boolean
}

export interface Breadcrumb {
  name: string
  path: string
}
