

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
