'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { useQnA } from '@/contexts/QnAContext'
import { useQuery } from '@tanstack/react-query'

interface Repository {
  id: string
  name: string
  url: string
  description?: string
  language?: string
  embeddingStatus: 'pending' | 'processing' | 'completed' | 'failed'
  summary?: string
  createdAt: string
  stats?: {
    totalFiles: number
    totalLines: number
    languages: Record<string, number>
  }
}

interface Question {
  id: string
  query: string
  answer?: string
  createdAt: string
  status: 'pending' | 'completed' | 'failed'
  confidence?: number
  relevantFiles?: (string | any)[] // Can be strings or objects with path properties
}

export default function RepositoryPage() {
  const params = useParams()
  const router = useRouter()
  const repositoryId = params?.id as string
  const { incrementQuestionCount, triggerStatsRefreshOnCompletion } = useQnA()

  // React Query: Fetch repository details
  const {
    data: repositoryData,
    isLoading: isRepositoryLoading,
    error: repositoryError
  } = useQuery<Repository>({
    queryKey: ['repository', repositoryId],
    queryFn: async () => {
      const response = await fetch(`/api/repositories/${repositoryId}`)
      if (!response.ok) throw new Error('Repository not found')
      return (await response.json()).repository
    },
    enabled: !!repositoryId
  })

  // React Query: Fetch questions
  const {
    data: questionsData,
    isLoading: isQuestionsLoading,
    error: questionsError,
    refetch: refetchQuestions
  } = useQuery<Question[]>({
    queryKey: ['questions', repositoryId],
    queryFn: async () => {
      const response = await fetch(`/api/qna?repositoryId=${repositoryId}&userId=1`)
      if (!response.ok) throw new Error('Failed to fetch questions')
      return (await response.json()).questions || []
    },
    enabled: !!repositoryId
  })

  const [newQuestion, setNewQuestion] = useState('')
  const [isAsking, setIsAsking] = useState(false)

  const handleAskQuestion = async () => {
    if (!newQuestion.trim() || !repositoryData) return

    setIsAsking(true)
    try {
      const response = await fetch('/api/qna', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repositoryId: repositoryData.id,
          question: newQuestion.trim(),
          userId: '1' // Mock user ID
        }),
      })

      if (response.ok) {
        // Immediately increment the question count for sidebar update
        incrementQuestionCount()
        setNewQuestion('')
        
        // Refresh questions after a delay to get the answer
        setTimeout(() => {
          refetchQuestions()
        }, 5000) // Check for answer after 5 seconds
      } else {
        throw new Error('Failed to ask question')
      }
    } catch (error) {
      console.error('Error asking question:', error)
      alert('Failed to ask question. Please try again.')
    } finally {
      setIsAsking(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-secondary-100 text-secondary-700'
      case 'processing': return 'bg-accent-100 text-accent-700'
      case 'failed': return 'bg-red-100 text-red-700'
      default: return 'bg-neutral-100 text-neutral-700'
    }
  }

  const getLanguageColor = (language: string) => {
    const colors: Record<string, string> = {
      TypeScript: '#3178c6',
      JavaScript: '#f1e05a',
      Python: '#3572A5',
      Java: '#b07219',
      'C++': '#f34b7d',
      Go: '#00ADD8',
      Rust: '#dea584',
    }
    return colors[language] || '#6b7280'
  }

  if (isRepositoryLoading || isQuestionsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading repository...</p>
        </div>
      </div>
    )
  }

  if (!repositoryData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold text-neutral-800 mb-2">Repository not found</h2>
          <p className="text-neutral-600 mb-4">The repository you&apos;re looking for doesn&apos;t exist.</p>
          <Link href="/dashboard">
            <Button className="bg-primary-500 hover:bg-primary-600 text-white">
              Back to Dashboard
            </Button>
          </Link>
        </Card>
      </div>
    )
  }

  const repository = repositoryData
  const questions = questionsData || []

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="mr-4">
                <Button variant="ghost" className="p-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </Button>
              </Link>
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              </div>
              <h1 className="text-xl font-bold text-neutral-800">{repository.name}</h1>
            </div>
            
            <div className="flex items-center gap-4">
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(repository.embeddingStatus)}`}>
                {repository.embeddingStatus}
              </span>
              <a 
                href={repository.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary-500 hover:text-primary-600 font-medium"
              >
                View on GitHub
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Repository Info */}
          <div className="lg:col-span-1">
            <Card className="p-6 bg-white mb-6">
              <h3 className="text-lg font-semibold text-neutral-800 mb-4">Repository Details</h3>
              
              {repository.description && (
                <div className="mb-4">
                  <label className="text-sm font-medium text-neutral-600">Description</label>
                  <p className="text-neutral-800 mt-1">{repository.description}</p>
                </div>
              )}
              
              {repository.language && (
                <div className="mb-4">
                  <label className="text-sm font-medium text-neutral-600">Primary Language</label>
                  <div className="flex items-center gap-2 mt-1">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getLanguageColor(repository.language) }}
                    ></div>
                    <span className="text-neutral-800">{repository.language}</span>
                  </div>
                </div>
              )}
              
              <div className="mb-4">
                <label className="text-sm font-medium text-neutral-600">Added</label>
                <p className="text-neutral-800 mt-1">
                  {new Date(repository.createdAt).toLocaleDateString()}
                </p>
              </div>
              
              <div className="mb-4">
                <label className="text-sm font-medium text-neutral-600">URL</label>
                <a 
                  href={repository.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary-500 hover:text-primary-600 break-all mt-1 block"
                >
                  {repository.url}
                </a>              </div>
            </Card>

            {/* Navigation */}
            <Card className="p-6 bg-white mb-6">
              <h3 className="text-lg font-semibold text-neutral-800 mb-4">Navigation</h3>
              <div className="space-y-3">
                <Link href={`/repositories/${repository.id}/commits`}>
                  <Button variant="outline" className="w-full justify-start">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    View Commits
                  </Button>
                </Link>
              </div>
            </Card>

            {/* Stats */}
            {repository.stats && (
              <Card className="p-6 bg-white">
                <h3 className="text-lg font-semibold text-neutral-800 mb-4">Statistics</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Total Files</span>
                    <span className="font-medium text-neutral-800">{repository.stats.totalFiles}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Total Lines</span>
                    <span className="font-medium text-neutral-800">{repository.stats.totalLines.toLocaleString()}</span>
                  </div>
                </div>
                
                {Object.keys(repository.stats.languages).length > 0 && (
                  <div className="mt-4">
                    <label className="text-sm font-medium text-neutral-600 mb-2 block">Languages</label>
                    <div className="space-y-2">
                      {Object.entries(repository.stats.languages).map(([language, percentage]) => (
                        <div key={language} className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: getLanguageColor(language) }}
                          ></div>
                          <span className="text-sm text-neutral-700 flex-1">{language}</span>
                          <span className="text-sm text-neutral-600">{percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            )}
          </div>

          {/* Q&A Section */}
          <div className="lg:col-span-2">
            {/* Summary */}
            {repository.summary && (
              <Card className="p-6 bg-gradient-to-r from-primary-50 to-secondary-50 border-primary-200 mb-6">
                <h3 className="text-lg font-semibold text-neutral-800 mb-3">AI Summary</h3>
                <p className="text-neutral-700 leading-relaxed">{repository.summary}</p>
              </Card>
            )}

            {/* Ask Question */}
            <Card className="p-6 bg-white mb-6">
              <h3 className="text-lg font-semibold text-neutral-800 mb-4">Ask a Question</h3>
              <div className="flex gap-3">
                <Input
                  type="text"
                  placeholder="What does this repository do? How does the authentication work?"
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  className="flex-1"
                  onKeyPress={(e) => e.key === 'Enter' && handleAskQuestion()}
                />
                <Button
                  onClick={handleAskQuestion}
                  disabled={isAsking || !newQuestion.trim() || repository.embeddingStatus !== 'completed'}
                  className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-2 font-medium whitespace-nowrap"
                >
                  {isAsking ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Asking...
                    </div>
                  ) : (
                    'Ask'
                  )}
                </Button>
              </div>
              
              {repository.embeddingStatus !== 'completed' && (
                <p className="text-sm text-neutral-500 mt-2">
                  Questions will be available once the repository processing is completed.
                </p>
              )}
            </Card>

            {/* Questions & Answers */}
            <Card className="p-6 bg-white">
              <h3 className="text-lg font-semibold text-neutral-800 mb-4">Previous Questions</h3>
              
              {questions.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-neutral-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-medium text-neutral-800 mb-2">No questions yet</h4>
                  <p className="text-neutral-600">Ask your first question about this repository!</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {questions.map((question: Question) => (
                    <div key={question.id} className="border-l-4 border-primary-200 pl-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-neutral-800">{question.query}</h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ml-4 whitespace-nowrap ${getStatusColor(question.status)}`}>
                          {question.status}
                        </span>
                      </div>
                        {question.answer ? (
                        <div className="bg-neutral-50 rounded-lg p-4 mt-3">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="text-neutral-700 leading-relaxed whitespace-pre-wrap flex-1">{question.answer}</p>
                            {question.confidence && (
                              <span className="text-xs text-neutral-500 bg-neutral-200 px-2 py-1 rounded">
                                {Math.round(question.confidence * 100)}% confidence
                              </span>
                            )}
                          </div>
                          {question.relevantFiles && question.relevantFiles.length > 0 && (
                            <div className="border-t border-neutral-200 pt-3 mt-3">
                              <h6 className="text-xs font-medium text-neutral-600 mb-2">Related Files:</h6>
                              <div className="flex flex-wrap gap-1">
                                {question.relevantFiles.map((filePath: string | any, index: number) => {
                                  // Handle different possible formats of filePath
                                  let pathString: string
                                  if (typeof filePath === 'string') {
                                    pathString = filePath
                                  } else if (filePath && typeof filePath === 'object') {
                                    pathString = (filePath as any).path || (filePath as any).name || (filePath as any).fileName || String(filePath)
                                  } else {
                                    pathString = String(filePath)
                                  }
                                  
                                  return (
                                    <span 
                                      key={index}
                                      className="text-xs bg-neutral-200 text-neutral-600 px-2 py-1 rounded"
                                    >
                                      {pathString.split('/').pop() || pathString}
                                    </span>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : question.status === 'pending' ? (
                        <div className="bg-neutral-50 rounded-lg p-4 mt-3 flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-neutral-600">Generating answer...</span>
                        </div>
                      ) : (
                        <div className="bg-red-50 rounded-lg p-4 mt-3">
                          <p className="text-red-700">Failed to generate answer. Please try again.</p>
                        </div>
                      )}
                      
                      <span className="text-xs text-neutral-500 mt-2 block">
                        {new Date(question.createdAt).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
